export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, sanitizeEmailSendError } from '@/lib/email/sender';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 300;
const SAFE_MAX_PER_RUN = 2;
const MAX_SENDING_ACCOUNTS_PER_RUN = 5;
const DEFAULT_CRON_INTERVAL_MINUTES = 5;
const INACTIVE_ACCOUNT_RETRY_MINUTES = 30;
const HOURLY_LIMIT_RETRY_MINUTES = 10;
const DAILY_LIMIT_RETRY_HOURS = 24;
const DOMAIN_LIMIT_RETRY_MINUTES = 5;
const TEMPORARY_SMTP_RETRY_MINUTES = 10;
const CIRCUIT_BREAKER_FAILURE_WINDOW_MINUTES = 30;
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 10;
const PUBLIC_RECIPIENT_DOMAIN_LIMITS: Record<string, number> = {
  'gmail.com': 5,
  'outlook.com': 5,
  'hotmail.com': 5,
  'yahoo.com': 3,
};

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  'https://app.comprasmunicipais.com.br';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function injectTracking(html: string, campaignId: string, recipientEmail: string): string {
  const encodedEmail = encodeURIComponent(recipientEmail);

  const withClickTracking = html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_, url: string) => {
      const tracked = `${BASE_URL}/api/email/track/click?campaign_id=${campaignId}&email=${encodedEmail}&url=${encodeURIComponent(url)}`;
      return `href="${tracked}"`;
    },
  );

  const pixel = `<img src="${BASE_URL}/api/email/track/open?campaign_id=${campaignId}&email=${encodedEmail}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;

  if (withClickTracking.includes('</body>')) {
    return withClickTracking.replace('</body>', `${pixel}</body>`);
  }
  return withClickTracking + pixel;
}

function substituteVars(
  template: string,
  name: string,
  municipality: string,
  state: string,
  mayor: string,
): string {
  return template
    .replace(/\[Nome\]/gi, name || 'Prezado(a)')
    .replace(/\[Municipio\]/gi, municipality)
    .replace(/\[Estado\]/gi, state)
    .replace(/\[Prefeito\]/gi, mayor || '');
}

function sanitizeSmtpError(error: unknown): string {
  return sanitizeEmailSendError(error);
}

function extractSmtpFailureDetails(error: unknown) {
  const errorLike =
    error && typeof error === 'object'
      ? (error as {
          message?: unknown;
          code?: unknown;
          response?: unknown;
          responseCode?: unknown;
        })
      : null;

  return {
    failure_reason:
      typeof errorLike?.message === 'string' && errorLike.message.trim()
        ? errorLike.message
        : null,
    failure_code:
      typeof errorLike?.code === 'string' && errorLike.code.trim()
        ? errorLike.code
        : null,
    smtp_response:
      typeof errorLike?.response === 'string' && errorLike.response.trim()
        ? errorLike.response
        : null,
    smtp_response_code:
      typeof errorLike?.responseCode === 'number' && Number.isInteger(errorLike.responseCode)
        ? errorLike.responseCode
        : null,
  };
}

function isHardBounceFailure(details: {
  failure_reason: string | null;
  failure_code: string | null;
  smtp_response: string | null;
  smtp_response_code: number | null;
}): boolean {
  const transientResponseCodes = new Set([421, 450, 451, 452]);
  const permanentRecipientResponseCodes = new Set([550, 551, 552, 553, 554]);
  const excludedFailureCodes = new Set(['EAUTH', 'ECONNECTION', 'ETIMEDOUT']);
  const permanentRecipientMessages = [
    'user unknown',
    'mailbox unavailable',
    'no such user',
    'recipient rejected',
    'address rejected',
    'invalid recipient',
    'account disabled',
    'mailbox not found',
  ];

  if (details.failure_code && excludedFailureCodes.has(details.failure_code.toUpperCase())) {
    return false;
  }

  if (
    details.smtp_response_code !== null &&
    transientResponseCodes.has(details.smtp_response_code)
  ) {
    return false;
  }

  if (
    details.smtp_response_code === null ||
    !permanentRecipientResponseCodes.has(details.smtp_response_code)
  ) {
    return false;
  }

  const combinedMessage = [details.failure_reason, details.smtp_response]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();

  return permanentRecipientMessages.some((message) => combinedMessage.includes(message));
}

function isTemporarySmtpFailure(details: {
  failure_reason: string | null;
  failure_code: string | null;
  smtp_response: string | null;
  smtp_response_code: number | null;
}): boolean {
  if (details.smtp_response_code === 451 || details.smtp_response_code === 452) {
    return true;
  }

  if (details.failure_code?.toUpperCase() === 'ETIMEDOUT') {
    return true;
  }

  const temporaryMessages = ['slow down', 'queue file write error'];
  const combinedMessage = [details.failure_reason, details.smtp_response]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();

  return temporaryMessages.some((message) => combinedMessage.includes(message));
}

function isBlockedSendingAccountFailure(details: {
  failure_reason: string | null;
  failure_code: string | null;
  smtp_response: string | null;
  smtp_response_code: number | null;
}): boolean {
  if (details.smtp_response_code === 455) {
    return true;
  }

  const combinedMessage = [details.failure_reason, details.smtp_response]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();

  return combinedMessage.includes('user blocked') || combinedMessage.includes('conta foi bloqueada');
}

function maskEmail(email: string): string {
  const [localPart = '', domain = ''] = email.split('@');
  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal || '**'}***@${domain || 'redacted'}`;
}

function getRecipientDomain(email: string): string | null {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1 || atIndex === email.length - 1) {
    return null;
  }

  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  return domain || null;
}

function getDeferredAttemptIso(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

async function countSentForWindow(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  sendingAccountId: string,
  from: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('email_job_queue')
    .select('id', { count: 'exact', head: true })
    .eq('sending_account_id', sendingAccountId)
    .eq('status', 'sent')
    .gte('sent_at', from);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countFailedForWindow(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  sendingAccountId: string,
  from: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('email_job_queue')
    .select('failure_reason, failure_code, smtp_response, smtp_response_code')
    .eq('sending_account_id', sendingAccountId)
    .eq('status', 'failed')
    .gte('sent_at', from);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((job) => !isTemporarySmtpFailure({
    failure_reason: job.failure_reason,
    failure_code: job.failure_code,
    smtp_response: job.smtp_response,
    smtp_response_code: job.smtp_response_code,
  })).length;
}

async function isValidQStashRequest(req: NextRequest): Promise<boolean> {
  const signature = req.headers.get('upstash-signature');
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!signature || !currentSigningKey || !nextSigningKey) {
    return false;
  }

  try {
    const { Receiver } = await import('@upstash/qstash');
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    const body = await req.clone().text();
    return await receiver.verify({ signature, body, url: req.url });
  } catch (error) {
    console.error('[queue-process] Falha ao validar assinatura do QStash:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler — called by Vercel Cron every hour
// Auth: Authorization: Bearer <CRON_SECRET> OR valid QStash signature
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const routeStartedAt = Date.now();
  const debug = [];
  const errors = [];
  const perfDebug: Array<Record<string, unknown>> = [];
  const skippedAccounts: Array<{
    sending_account_id: string;
    reason: 'too_many_recent_failures' | 'account_blocked';
    recent_failures?: number;
  }> = [];
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let totalLimitPerRun = 0;
  let totalHourlyLimit = 0;
  const pushPerfEntry = (entry: Record<string, unknown>) => {
    perfDebug.push(entry);
    console.log('[queue-process][perf]', entry);
  };
  const logPerfDuration = (
    step: string,
    startedAt: number,
    extra: Record<string, unknown> = {},
  ) => {
    pushPerfEntry({
      step,
      duration_ms: Date.now() - startedAt,
      ...extra,
    });
  };
  const buildJsonResponse = (
    payload: Record<string, unknown>,
    init?: { status?: number },
  ) => {
    logPerfDuration('route_total', routeStartedAt, { processed, sent, failed });
    return NextResponse.json(
      {
        ...payload,
        perf_debug: perfDebug,
      },
      init,
    );
  };
  pushPerfEntry({ step: 'route_start', at: new Date().toISOString() });
  // ── 1. Auth via CRON_SECRET or QStash signature ─────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  const isCronSecretRequest =
    Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
  const isQStashRequest = !isCronSecretRequest && await isValidQStashRequest(req);

  if (!isCronSecretRequest && !isQStashRequest) {
    return buildJsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient();

  const cronIntervalMinutesRaw = Number(process.env.CRON_INTERVAL_MINUTES);
  const cronIntervalMinutes =
    Number.isFinite(cronIntervalMinutesRaw) && cronIntervalMinutesRaw > 0
      ? cronIntervalMinutesRaw
      : DEFAULT_CRON_INTERVAL_MINUTES;
  const staleClaimedAtIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const requestedSendingAccountId = req.nextUrl.searchParams.get('sending_account_id')?.trim() || null;

  const candidateSendingAccountIds = new Set<string>();
  const candidateAccountTarget = MAX_SENDING_ACCOUNTS_PER_RUN * 5;
  const eligibleJobPageSize = 250;
  const eligibleJobPageLimit = 20;
  const candidateSelectionStartedAt = Date.now();

  if (requestedSendingAccountId) {
    candidateSendingAccountIds.add(requestedSendingAccountId);
    pushPerfEntry({
      step: 'candidate_account_preselection_skipped',
      reason: 'sending_account_id_query_param',
      candidate_accounts: 1,
      requested_sending_account_id: requestedSendingAccountId,
    });
  } else {
    for (let page = 0; page < eligibleJobPageLimit; page += 1) {
      const fromIndex = page * eligibleJobPageSize;
      const toIndex = fromIndex + eligibleJobPageSize - 1;

      const { data: staleProcessingJobs, error: staleProcessingJobsError } = await supabase
        .from('email_job_queue')
        .select('sending_account_id')
        .eq('status', 'processing')
        .not('claimed_at', 'is', null)
        .lt('claimed_at', staleClaimedAtIso)
        .order('claimed_at', { ascending: true })
        .range(fromIndex, toIndex);

      if (staleProcessingJobsError) {
        console.error('[queue-process] Erro ao identificar contas elegiveis:', staleProcessingJobsError.message);
        return buildJsonResponse({ error: staleProcessingJobsError.message }, { status: 500 });
      }

      for (const job of staleProcessingJobs ?? []) {
        if (job.sending_account_id) {
          candidateSendingAccountIds.add(job.sending_account_id);
        }
      }

      if (
        (staleProcessingJobs?.length ?? 0) < eligibleJobPageSize ||
        candidateSendingAccountIds.size >= candidateAccountTarget
      ) {
        break;
      }
    }

    for (let page = 0; page < eligibleJobPageLimit; page += 1) {
      if (candidateSendingAccountIds.size >= candidateAccountTarget) {
        break;
      }

      const fromIndex = page * eligibleJobPageSize;
      const toIndex = fromIndex + eligibleJobPageSize - 1;

      const { data: eligiblePendingJobs, error: eligiblePendingJobsError } = await supabase
        .from('email_job_queue')
        .select('sending_account_id, created_at')
        .eq('status', 'pending')
        .or('next_attempt_at.is.null,next_attempt_at.lte.now()')
        .order('created_at', { ascending: true })
        .range(fromIndex, toIndex);

      if (eligiblePendingJobsError) {
        console.error('[queue-process] Erro ao identificar contas elegiveis:', eligiblePendingJobsError.message);
        return buildJsonResponse({ error: eligiblePendingJobsError.message }, { status: 500 });
      }

      const pendingAccountsByOldestJob = new Map<string, string>();

      for (const job of eligiblePendingJobs ?? []) {
        if (!job.sending_account_id || !job.created_at || candidateSendingAccountIds.has(job.sending_account_id)) {
          continue;
        }

        const currentOldestCreatedAt = pendingAccountsByOldestJob.get(job.sending_account_id);
        if (!currentOldestCreatedAt || job.created_at < currentOldestCreatedAt) {
          pendingAccountsByOldestJob.set(job.sending_account_id, job.created_at);
        }
      }

      const sortedPendingAccountIds = [...pendingAccountsByOldestJob.entries()]
        .sort(([, leftCreatedAt], [, rightCreatedAt]) => leftCreatedAt.localeCompare(rightCreatedAt))
        .map(([sendingAccountId]) => sendingAccountId);

      for (const sendingAccountId of sortedPendingAccountIds) {
        candidateSendingAccountIds.add(sendingAccountId);

        if (candidateSendingAccountIds.size >= candidateAccountTarget) {
          break;
        }
      }

      if (
        (eligiblePendingJobs?.length ?? 0) < eligibleJobPageSize ||
        candidateSendingAccountIds.size >= candidateAccountTarget
      ) {
        break;
      }
    }

    logPerfDuration('candidate_account_preselection', candidateSelectionStartedAt, {
      candidate_accounts: candidateSendingAccountIds.size,
      requested_sending_account_id: requestedSendingAccountId,
    });
  }

  const orderedEligibleSendingAccountIds = [...candidateSendingAccountIds];

  const activeAccountsLookupStartedAt = Date.now();
  const { data: candidateSendingAccounts, error: candidateSendingAccountsError } = await supabase
    .from('email_sending_accounts')
    .select('id, is_active')
    .in('id', orderedEligibleSendingAccountIds);

  if (candidateSendingAccountsError) {
    console.error('[queue-process] Erro ao buscar status das contas candidatas:', candidateSendingAccountsError.message);
    return buildJsonResponse({ error: candidateSendingAccountsError.message }, { status: 500 });
  }
  logPerfDuration('active_accounts_lookup', activeAccountsLookupStartedAt, {
    candidate_accounts: orderedEligibleSendingAccountIds.length,
    fetched_accounts: candidateSendingAccounts?.length ?? 0,
  });

  const candidateSendingAccountStatus = new Map(
    (candidateSendingAccounts ?? []).map((account) => [account.id, account.is_active]),
  );

  const eligibleSendingAccountIds: string[] = [];
  const circuitBreakerWindowStart = new Date(
    Date.now() - CIRCUIT_BREAKER_FAILURE_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();
  const circuitBreakerStartedAt = Date.now();

  for (const sendingAccountId of orderedEligibleSendingAccountIds) {
    if (candidateSendingAccountStatus.get(sendingAccountId) === false) {
      continue;
    }

    const recentFailures = await countFailedForWindow(
      supabase,
      sendingAccountId,
      circuitBreakerWindowStart,
    );

    if (recentFailures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      skippedAccounts.push({
        sending_account_id: sendingAccountId,
        reason: 'too_many_recent_failures',
        recent_failures: recentFailures,
      });
      continue;
    }

    eligibleSendingAccountIds.push(sendingAccountId);

    if (eligibleSendingAccountIds.length >= MAX_SENDING_ACCOUNTS_PER_RUN) {
      break;
    }
  }
  logPerfDuration('circuit_breaker_check', circuitBreakerStartedAt, {
    candidate_accounts: orderedEligibleSendingAccountIds.length,
    eligible_accounts: eligibleSendingAccountIds.length,
    skipped_accounts: skippedAccounts.length,
  });

  if (eligibleSendingAccountIds.length === 0) {
    return buildJsonResponse({
      processed: 0,
      sent: 0,
      failed: 0,
      limit_per_run: 0,
      hourly_limit: 0,
      skipped_accounts: skippedAccounts,
    });
  }

  const sendingAccountLimitsLookupStartedAt = Date.now();
  const { data: sendingAccounts, error: sendingAccountsError } = await supabase
    .from('email_sending_accounts')
    .select('id, hourly_limit')
    .in('id', eligibleSendingAccountIds);

  if (sendingAccountsError) {
    console.error('[queue-process] Erro ao buscar hourly_limit das contas:', sendingAccountsError.message);
    return buildJsonResponse({ error: sendingAccountsError.message }, { status: 500 });
  }
  logPerfDuration('sending_account_limits_lookup', sendingAccountLimitsLookupStartedAt, {
    eligible_accounts: eligibleSendingAccountIds.length,
  });

  const sendingAccountLimits = new Map(
    (sendingAccounts ?? []).map((account) => [account.id, account.hourly_limit ?? 50]),
  );

  // ── 2. Atomically claim up to BATCH_SIZE pending jobs ───────────────────
  // UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *
  // guarantees two concurrent workers never claim the same job.
  const jobs: any[] = [];
  const claimJobsStartedAt = Date.now();

  for (const sendingAccountId of eligibleSendingAccountIds) {
    const hourlyLimit = sendingAccountLimits.get(sendingAccountId) ?? 50;
    const limitPerRun = Math.min(
      BATCH_SIZE,
      Math.floor(hourlyLimit / (60 / cronIntervalMinutes)),
      SAFE_MAX_PER_RUN,
    );

    totalHourlyLimit += hourlyLimit;

    if (limitPerRun <= 0) {
      continue;
    }

    totalLimitPerRun += limitPerRun;

    const claimRpcStartedAt = Date.now();
    const { data: claimedJobs, error: jobsError } = await supabase.rpc('claim_email_jobs', {
      p_limit: limitPerRun,
      p_sending_account_id: sendingAccountId,
    });
    logPerfDuration('claim_email_jobs_rpc', claimRpcStartedAt, {
      sending_account_id: sendingAccountId,
      limit_per_run: limitPerRun,
      claimed_jobs: claimedJobs?.length ?? 0,
    });

    if (jobsError) {
      console.error('[queue-process] Erro ao buscar jobs:', jobsError.message, {
        sendingAccountId,
      });
      return buildJsonResponse({ error: jobsError.message }, { status: 500 });
    }

    if (claimedJobs?.length) {
      jobs.push(...claimedJobs);
    }
  }
  logPerfDuration('claim_jobs_total', claimJobsStartedAt, {
    eligible_accounts: eligibleSendingAccountIds.length,
    claimed_jobs: jobs.length,
  });

  if (jobs.length === 0) {
    return buildJsonResponse({
      processed: 0,
      sent: 0,
      failed: 0,
      limit_per_run: totalLimitPerRun,
      hourly_limit: totalHourlyLimit,
      skipped_accounts: skippedAccounts,
    });
  }

  processed = jobs.length;
  const claimedCampaignIds = [...new Set(jobs.map((job) => job.campaign_id).filter(Boolean))];

  const activateCampaignsStartedAt = Date.now();
  for (const campaignId of claimedCampaignIds) {
    const { error: activateCampaignError } = await supabase
      .from('email_campaigns')
      .update({ status: 'Ativa' })
      .eq('id', campaignId)
      .eq('status', 'Agendada');

    if (activateCampaignError) {
      console.error('[queue-process] Erro ao ativar campanha em processamento:', {
        campaignId,
        error: activateCampaignError.message,
      });
      return buildJsonResponse({ error: activateCampaignError.message }, { status: 500 });
    }
  }
  logPerfDuration('activate_claimed_campaigns', activateCampaignsStartedAt, {
    claimed_campaigns: claimedCampaignIds.length,
  });

  // ── 3. Group jobs by sending_account_id to reuse transporters ──────────
  type Job = {
    id: string;
    campaign_id: string;
    company_id: string;
    sending_account_id: string;
    municipality_email_id?: string | null;
    recipient_email: string;
    recipient_name: string;
    municipality: string;
    state: string;
  };

  const accountGroups = new Map<string, Job[]>();
  for (const job of jobs) {
    const list = accountGroups.get(job.sending_account_id) ?? [];
    list.push(job);
    accountGroups.set(job.sending_account_id, list);
  }

  // ── 4. Load all required accounts and campaigns in bulk ─────────────────
  const accountIds = [...accountGroups.keys()];
  const campaignIds = [...new Set(jobs.map((j: Job) => j.campaign_id))];

  const loadJobDependenciesStartedAt = Date.now();
  const [{ data: accounts }, { data: campaigns }] = await Promise.all([
    supabase
      .from('email_sending_accounts')
      .select('id, company_id, provider_type, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password_encrypted, oauth_access_token_encrypted, oauth_refresh_token_encrypted, oauth_token_expires_at, oauth_status, is_active, hourly_limit, daily_limit')
      .in('id', accountIds),
    supabase
      .from('email_campaigns')
      .select('id, subject, preheader, html_content, text_content')
      .in('id', campaignIds),
  ]);
  logPerfDuration('load_accounts_campaigns_content', loadJobDependenciesStartedAt, {
    account_ids: accountIds.length,
    campaign_ids: campaignIds.length,
  });

  const accountMap = new Map((accounts ?? []).map((a) => [a.id, a]));
  const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const mayorMap = new Map<string, string>();
  const municipalityCities = [...new Set(jobs.map((j: Job) => j.municipality).filter(Boolean))];
  const municipalityStates = [...new Set(jobs.map((j: Job) => j.state).filter(Boolean))];

  if (municipalityCities.length > 0 && municipalityStates.length > 0) {
    const municipalitiesLookupStartedAt = Date.now();
    const { data: municipalities, error: municipalitiesError } = await supabase
      .from('municipalities')
      .select('city, state, mayor_name')
      .in('city', municipalityCities)
      .in('state', municipalityStates);

    if (municipalitiesError) {
      console.warn('[queue-process] Falha ao buscar mayor_name; usando fallback vazio.', {
        error: municipalitiesError.message,
      });
    } else {
      for (const municipality of municipalities ?? []) {
        mayorMap.set(`${municipality.city ?? ''}::${municipality.state ?? ''}`, municipality.mayor_name ?? '');
      }
    }
    logPerfDuration('load_municipality_content', municipalitiesLookupStartedAt, {
      municipality_cities: municipalityCities.length,
      municipality_states: municipalityStates.length,
      fetched_municipalities: mayorMap.size,
    });
  }

  // ── 5. Process each job ──────────────────────────────────────────────────
  // Track per-campaign counts for updating sent_count
  const campaignSent = new Map<string, number>();
  const campaignFailed = new Map<string, number>();

  const accountQuota = new Map<string, { hourlySent: number; dailySent: number; hourlyLimit: number; dailyLimit: number }>();
  const accountPublicDomainCounts = new Map<string, Map<string, number>>();
  const inactiveAccountsLogged = new Set<string>();
  const blockedAccountsLogged = new Set<string>();
  const blockedSendingAccountIds = new Set<string>();
  const hourlyLimitLogged = new Set<string>();
  const dailyLimitLogged = new Set<string>();
  const domainLimitLogged = new Set<string>();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  const accountQuotaLoadStartedAt = Date.now();
  for (const account of accounts ?? []) {
    const [hourlySent, dailySent] = await Promise.all([
      countSentForWindow(supabase, account.id, oneHourAgo),
      countSentForWindow(supabase, account.id, startOfDayIso),
    ]);

    accountQuota.set(account.id, {
      hourlySent,
      dailySent,
      hourlyLimit: account.hourly_limit ?? 50,
      dailyLimit: account.daily_limit ?? 500,
    });
  }
  logPerfDuration('load_account_quota', accountQuotaLoadStartedAt, {
    accounts: accounts?.length ?? 0,
  });

  for (const job of jobs) {
    const account = accountMap.get(job.sending_account_id);
    const campaign = campaignMap.get(job.campaign_id);

    if (!account || !campaign) {
      debug.push('job_sem_account_ou_campaign');
      console.log('[EMAIL_DEBUG] job sem account ou campaign', {
        jobId: job.id,
        sending_account_id: job.sending_account_id,
        campaign_id: job.campaign_id
      });
      // Mark as failed — missing config (job was already claimed as 'processing')
      await supabase
        .from('email_job_queue')
        .update({ status: 'failed', sent_at: new Date().toISOString() })
        .eq('id', job.id);

      if (job.municipality_email_id) {
        try {
          await supabase
            .from('municipality_emails')
            .update({
              deliverability_status: 'failed',
              deliverability_last_event_at: new Date().toISOString(),
              deliverability_last_failure_at: new Date().toISOString(),
            })
            .eq('id', job.municipality_email_id)
            .is('deliverability_hard_bounced_at', null);
        } catch {}
      }
      failed++;
      campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
      continue;
    }

    if (!account.is_active) {
      debug.push('conta_inativa');
      console.log('[EMAIL_DEBUG] conta inativa', {
        jobId: job.id,
        sending_account_id: account?.id
      });
      if (!inactiveAccountsLogged.has(job.sending_account_id)) {
        console.warn('[queue-process] Conta SMTP inativa; jobs mantidos na fila.', {
          sendingAccountId: job.sending_account_id,
        });
        inactiveAccountsLogged.add(job.sending_account_id);
      }

      await supabase
        .from('email_job_queue')
        .update({
          status: 'pending',
          claimed_at: null,
          next_attempt_at: getDeferredAttemptIso(INACTIVE_ACCOUNT_RETRY_MINUTES),
        })
        .eq('id', job.id);

      continue;
    }

    if (blockedSendingAccountIds.has(job.sending_account_id)) {
      debug.push('conta_bloqueada');

      await supabase
        .from('email_job_queue')
        .update({
          status: 'pending',
          claimed_at: null,
          next_attempt_at: getDeferredAttemptIso(INACTIVE_ACCOUNT_RETRY_MINUTES),
        })
        .eq('id', job.id);

      continue;
    }

    const quota = accountQuota.get(job.sending_account_id);
    if (quota) {
      if (quota.hourlySent >= quota.hourlyLimit) {
        debug.push('limite_horario');
        console.log('[EMAIL_DEBUG] limite horario atingido', {
          jobId: job.id,
          sending_account_id: account.id
        });
        if (!hourlyLimitLogged.has(job.sending_account_id)) {
          console.warn('[queue-process] Limite horário da conta SMTP atingido; jobs mantidos na fila.', {
            sendingAccountId: job.sending_account_id,
            hourlySent: quota.hourlySent,
            hourlyLimit: quota.hourlyLimit,
          });
          hourlyLimitLogged.add(job.sending_account_id);
        }

        await supabase
          .from('email_job_queue')
          .update({
            status: 'pending',
            claimed_at: null,
            next_attempt_at: getDeferredAttemptIso(HOURLY_LIMIT_RETRY_MINUTES),
          })
          .eq('id', job.id);

        continue;
      }

      if (quota.dailySent >= quota.dailyLimit) {
        debug.push('limite_diario');
        console.log('[EMAIL_DEBUG] limite diario atingido', {
          jobId: job.id,
          sending_account_id: account.id
        });
        if (!dailyLimitLogged.has(job.sending_account_id)) {
          console.warn('[queue-process] Limite diário da conta SMTP atingido; jobs mantidos na fila.', {
            sendingAccountId: job.sending_account_id,
            dailySent: quota.dailySent,
            dailyLimit: quota.dailyLimit,
          });
          dailyLimitLogged.add(job.sending_account_id);
        }

        await supabase
          .from('email_job_queue')
          .update({
            status: 'pending',
            claimed_at: null,
            next_attempt_at: getDeferredAttemptIso(DAILY_LIMIT_RETRY_HOURS * 60),
          })
          .eq('id', job.id);

        continue;
      }
    }

    const recipientDomain = getRecipientDomain(job.recipient_email);
    const publicDomainLimit = recipientDomain ? PUBLIC_RECIPIENT_DOMAIN_LIMITS[recipientDomain] : undefined;

    if (recipientDomain && publicDomainLimit) {
      const accountDomainCounts = accountPublicDomainCounts.get(job.sending_account_id) ?? new Map<string, number>();
      const domainSendCount = accountDomainCounts.get(recipientDomain) ?? 0;

      if (domainSendCount >= publicDomainLimit) {
        debug.push('limite_dominio_destinatario');
        console.log('[EMAIL_DEBUG] limite dominio destinatario atingido', {
          jobId: job.id,
          sending_account_id: account.id,
          recipient_domain: recipientDomain,
        });

        const domainLogKey = `${job.sending_account_id}:${recipientDomain}`;
        if (!domainLimitLogged.has(domainLogKey)) {
          console.warn('[queue-process] Limite por dominio do destinatario atingido; job mantido na fila.', {
            sendingAccountId: job.sending_account_id,
            recipientDomain,
            domainSendCount,
            publicDomainLimit,
          });
          domainLimitLogged.add(domainLogKey);
        }

        await supabase
          .from('email_job_queue')
          .update({
            status: 'pending',
            claimed_at: null,
            next_attempt_at: getDeferredAttemptIso(DOMAIN_LIMIT_RETRY_MINUTES),
          })
          .eq('id', job.id);

        continue;
      }

      accountDomainCounts.set(recipientDomain, domainSendCount + 1);
      accountPublicDomainCounts.set(job.sending_account_id, accountDomainCounts);
    }

    try {
      const mayor = mayorMap.get(`${job.municipality}::${job.state}`) ?? '';
      const personalizedHtml = injectTracking(
        substituteVars(campaign.html_content!, job.recipient_name, job.municipality, job.state, mayor),
        job.campaign_id,
        job.recipient_email,
      );

      debug.push('tentando_enviar');
      console.log('[EMAIL_DEBUG] enviando email', {
        jobId: job.id,
        to: job.recipient_email
      });
      const smtpSendStartedAt = Date.now();
      await sendEmail(supabase, account, {
        to: job.recipient_email,
        subject: substituteVars(campaign.subject!, job.recipient_name, job.municipality, job.state, mayor),
        html: personalizedHtml,
        ...(campaign.text_content
          ? { text: substituteVars(campaign.text_content, job.recipient_name, job.municipality, job.state, mayor) }
          : {}),
        ...(campaign.preheader
          ? { headers: { 'X-Preheader': campaign.preheader } }
          : {}),
      });
      logPerfDuration('smtp_send_attempt', smtpSendStartedAt, {
        job_id: job.id,
        sending_account_id: job.sending_account_id,
      });

      const successDbUpdateStartedAt = Date.now();
      await supabase
        .from('email_job_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          next_attempt_at: null,
        })
        .eq('id', job.id);

      if (job.municipality_email_id) {
        try {
          await supabase
            .from('municipality_emails')
            .update({
              deliverability_status: 'delivered',
              deliverability_last_event_at: new Date().toISOString(),
              deliverability_last_success_at: new Date().toISOString(),
            })
            .eq('id', job.municipality_email_id)
            .is('deliverability_hard_bounced_at', null);
        } catch {}
      }
      logPerfDuration('post_send_db_updates', successDbUpdateStartedAt, {
        job_id: job.id,
        outcome: 'sent',
      });

      sent++;
      if (quota) {
        quota.hourlySent += 1;
        quota.dailySent += 1;
      }
      await supabase.rpc('increment_emails_used', { company_id_param: job.company_id });
      campaignSent.set(job.campaign_id, (campaignSent.get(job.campaign_id) ?? 0) + 1);
      } catch (error: any) {
        const failureDetails = extractSmtpFailureDetails(error);
        const isTemporaryFailure = isTemporarySmtpFailure(failureDetails);
        const isBlockedAccountFailure = isBlockedSendingAccountFailure(failureDetails);
        const isHardBounce = isHardBounceFailure(failureDetails);
        const failureTimestamp = new Date().toISOString();
        errors.push({
          jobId: job.id,
          email: job.recipient_email,
          error: error.message
        });
        console.error('[queue-process] Falha para destinatário:', {
          recipient: maskEmail(job.recipient_email),
          error: sanitizeSmtpError(error),
        });

      if (isBlockedAccountFailure) {
        blockedSendingAccountIds.add(job.sending_account_id);

        if (!blockedAccountsLogged.has(job.sending_account_id)) {
          skippedAccounts.push({
            sending_account_id: job.sending_account_id,
            reason: 'account_blocked',
          });
          console.warn('[queue-process] Conta SMTP bloqueada; interrompendo envio da conta nesta execução.', {
            sendingAccountId: job.sending_account_id,
            smtpResponseCode: failureDetails.smtp_response_code,
            failureReason: failureDetails.failure_reason,
          });
          blockedAccountsLogged.add(job.sending_account_id);
        }

        const blockedAccountDbUpdateStartedAt = Date.now();
        await supabase
          .from('email_job_queue')
          .update({
            status: 'pending',
            claimed_at: null,
            next_attempt_at: getDeferredAttemptIso(INACTIVE_ACCOUNT_RETRY_MINUTES),
            failure_reason: failureDetails.failure_reason,
            failure_code: failureDetails.failure_code,
            smtp_response: failureDetails.smtp_response,
            smtp_response_code: failureDetails.smtp_response_code,
          })
          .eq('id', job.id);
        logPerfDuration('post_send_db_updates', blockedAccountDbUpdateStartedAt, {
          job_id: job.id,
          outcome: 'account_blocked',
        });

        continue;
      }

      if (isTemporaryFailure) {
        const temporaryFailureDbUpdateStartedAt = Date.now();
        await supabase
          .from('email_job_queue')
          .update({
            status: 'pending',
            claimed_at: null,
            next_attempt_at: getDeferredAttemptIso(TEMPORARY_SMTP_RETRY_MINUTES),
            failure_reason: failureDetails.failure_reason,
            failure_code: failureDetails.failure_code,
            smtp_response: failureDetails.smtp_response,
            smtp_response_code: failureDetails.smtp_response_code,
          })
          .eq('id', job.id);
        logPerfDuration('post_send_db_updates', temporaryFailureDbUpdateStartedAt, {
          job_id: job.id,
          outcome: 'temporary_failure',
        });

        continue;
      }

      const failedDbUpdateStartedAt = Date.now();
      await supabase
        .from('email_job_queue')
        .update({
          status: 'failed',
          sent_at: failureTimestamp,
          failure_reason: failureDetails.failure_reason,
          failure_code: failureDetails.failure_code,
          smtp_response: failureDetails.smtp_response,
          smtp_response_code: failureDetails.smtp_response_code,
        })
        .eq('id', job.id);

      if (job.municipality_email_id) {
        try {
          await supabase
            .from('municipality_emails')
            .update({
              deliverability_status: isHardBounce ? 'hard_bounce' : 'failed',
              deliverability_last_event_at: failureTimestamp,
              deliverability_last_failure_at: failureTimestamp,
              ...(isHardBounce
                ? {
                    deliverability_last_failure_reason: failureDetails.failure_reason,
                    deliverability_hard_bounced_at: failureTimestamp,
                  }
                : {}),
            })
            .eq('id', job.municipality_email_id)
            .is('deliverability_hard_bounced_at', null);
        } catch {}
      }
      logPerfDuration('post_send_db_updates', failedDbUpdateStartedAt, {
        job_id: job.id,
        outcome: 'failed',
      });

      failed++;
      campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
    }
  }

  // ── 6. Update sent_count / failed_count on each campaign ────────────────
  const allCampaignIds = new Set([...campaignSent.keys(), ...campaignFailed.keys()]);
  const finalizeCampaignsStartedAt = Date.now();

  for (const cid of allCampaignIds) {
    const deltaSent = campaignSent.get(cid) ?? 0;
    const deltaFailed = campaignFailed.get(cid) ?? 0;

    // Increment counters atomically
    await supabase.rpc('increment_campaign_counts', {
      p_campaign_id: cid,
      p_sent: deltaSent,
      p_failed: deltaFailed,
    });

    // Atomically finalize campaign if no pending/processing jobs remain
    await supabase.rpc('finalize_campaign_if_complete', {
      p_campaign_id: cid,
    });
  }
  logPerfDuration('finalize_campaigns', finalizeCampaignsStartedAt, {
    campaigns: allCampaignIds.size,
  });

  return buildJsonResponse({
    processed,
    sent,
    failed,
    limit_per_run: totalLimitPerRun,
    hourly_limit: totalHourlyLimit,
    skipped_accounts: skippedAccounts,
    debug,
    errors,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
