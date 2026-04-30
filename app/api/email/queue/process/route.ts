export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, sanitizeEmailSendError } from '@/lib/email/sender';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 300;
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

function pickRandomItems<T>(items: T[], limit: number): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, limit);
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
  const { count, error } = await supabase
    .from('email_job_queue')
    .select('id', { count: 'exact', head: true })
    .eq('sending_account_id', sendingAccountId)
    .eq('status', 'failed')
    .gte('sent_at', from);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler — called by Vercel Cron every hour
// Auth: Authorization: Bearer <CRON_SECRET>
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const debug = [];
  const errors = [];
  const skippedAccounts: Array<{
    sending_account_id: string;
    reason: 'too_many_recent_failures';
    recent_failures: number;
  }> = [];
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let totalLimitPerRun = 0;
  let totalHourlyLimit = 0;
  // ── 1. Auth via CRON_SECRET ─────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient();

  const cronIntervalMinutesRaw = Number(process.env.CRON_INTERVAL_MINUTES);
  const cronIntervalMinutes =
    Number.isFinite(cronIntervalMinutesRaw) && cronIntervalMinutesRaw > 0
      ? cronIntervalMinutesRaw
      : DEFAULT_CRON_INTERVAL_MINUTES;

  const { data: eligibleJobs, error: eligibleJobsError } = await supabase
    .from('email_job_queue')
    .select('sending_account_id')
    .eq('status', 'pending')
    .or('next_attempt_at.is.null,next_attempt_at.lte.now()')
    .limit(BATCH_SIZE * MAX_SENDING_ACCOUNTS_PER_RUN);

  if (eligibleJobsError) {
    console.error('[queue-process] Erro ao identificar contas elegiveis:', eligibleJobsError.message);
    return NextResponse.json({ error: eligibleJobsError.message }, { status: 500 });
  }

  const randomizedEligibleSendingAccountIds = pickRandomItems(
    [...new Set((eligibleJobs ?? []).map((job) => job.sending_account_id).filter(Boolean))],
    (eligibleJobs ?? []).length,
  );

  const eligibleSendingAccountIds: string[] = [];
  const circuitBreakerWindowStart = new Date(
    Date.now() - CIRCUIT_BREAKER_FAILURE_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  for (const sendingAccountId of randomizedEligibleSendingAccountIds) {
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

  if (eligibleSendingAccountIds.length === 0) {
    return NextResponse.json({
      processed: 0,
      sent: 0,
      failed: 0,
      limit_per_run: 0,
      hourly_limit: 0,
      skipped_accounts: skippedAccounts,
    });
  }

  const { data: sendingAccounts, error: sendingAccountsError } = await supabase
    .from('email_sending_accounts')
    .select('id, hourly_limit')
    .in('id', eligibleSendingAccountIds);

  if (sendingAccountsError) {
    console.error('[queue-process] Erro ao buscar hourly_limit das contas:', sendingAccountsError.message);
    return NextResponse.json({ error: sendingAccountsError.message }, { status: 500 });
  }

  const sendingAccountLimits = new Map(
    (sendingAccounts ?? []).map((account) => [account.id, account.hourly_limit ?? 50]),
  );

  // ── 2. Atomically claim up to BATCH_SIZE pending jobs ───────────────────
  // UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *
  // guarantees two concurrent workers never claim the same job.
  const jobs: any[] = [];

  for (const sendingAccountId of eligibleSendingAccountIds) {
    const hourlyLimit = sendingAccountLimits.get(sendingAccountId) ?? 50;
    const limitPerRun = Math.min(
      BATCH_SIZE,
      Math.floor(hourlyLimit / (60 / cronIntervalMinutes)),
    );

    totalHourlyLimit += hourlyLimit;

    if (limitPerRun <= 0) {
      continue;
    }

    totalLimitPerRun += limitPerRun;

    const { data: claimedJobs, error: jobsError } = await supabase.rpc('claim_email_jobs', {
      p_limit: limitPerRun,
      p_sending_account_id: sendingAccountId,
    });

    if (jobsError) {
      console.error('[queue-process] Erro ao buscar jobs:', jobsError.message, {
        sendingAccountId,
      });
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }

    if (claimedJobs?.length) {
      jobs.push(...claimedJobs);
    }
  }

  if (jobs.length === 0) {
    return NextResponse.json({
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
      return NextResponse.json({ error: activateCampaignError.message }, { status: 500 });
    }
  }

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

  const accountMap = new Map((accounts ?? []).map((a) => [a.id, a]));
  const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const mayorMap = new Map<string, string>();
  const municipalityCities = [...new Set(jobs.map((j: Job) => j.municipality).filter(Boolean))];
  const municipalityStates = [...new Set(jobs.map((j: Job) => j.state).filter(Boolean))];

  if (municipalityCities.length > 0 && municipalityStates.length > 0) {
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
  }

  // ── 5. Process each job ──────────────────────────────────────────────────
  // Track per-campaign counts for updating sent_count
  const campaignSent = new Map<string, number>();
  const campaignFailed = new Map<string, number>();

  const accountQuota = new Map<string, { hourlySent: number; dailySent: number; hourlyLimit: number; dailyLimit: number }>();
  const accountPublicDomainCounts = new Map<string, Map<string, number>>();
  const inactiveAccountsLogged = new Set<string>();
  const hourlyLimitLogged = new Set<string>();
  const dailyLimitLogged = new Set<string>();
  const domainLimitLogged = new Set<string>();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

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

      if (isTemporaryFailure) {
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

        continue;
      }

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

      failed++;
      campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
    }
  }

  // ── 6. Update sent_count / failed_count on each campaign ────────────────
  const allCampaignIds = new Set([...campaignSent.keys(), ...campaignFailed.keys()]);

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

  return NextResponse.json({
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
