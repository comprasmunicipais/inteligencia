export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/sender';
import { createAdminClient } from '@/lib/supabase/server';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 5;
const INACTIVE_ACCOUNT_RETRY_MINUTES = 30;
const HOURLY_LIMIT_RETRY_MINUTES = 10;
const DAILY_LIMIT_RETRY_HOURS = 24;
const TEMPORARY_SMTP_RETRY_MINUTES = 10;
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  'https://app.comprasmunicipais.com.br';

type ClaimedJob = {
  id: string;
  campaign_id: string;
  company_id: string;
  sending_account_id: string;
  customer_contact_list_id: string;
  customer_contact_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  company_name: string | null;
  status: string;
  attempt_count: number;
  next_attempt_at: string | null;
  claimed_at: string | null;
};

type SendingAccount = {
  id: string;
  company_id: string;
  provider_type: 'smtp' | 'google_oauth' | null;
  sender_name: string;
  sender_email: string;
  reply_to_email: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_username: string | null;
  smtp_password_encrypted: string | null;
  oauth_access_token_encrypted: string | null;
  oauth_refresh_token_encrypted: string | null;
  oauth_token_expires_at: string | null;
  oauth_status: string | null;
  is_active: boolean;
  hourly_limit: number | null;
  daily_limit: number | null;
};

type Campaign = {
  id: string;
  company_id: string;
  subject: string | null;
  preheader: string | null;
  html_content: string | null;
  text_content: string | null;
};

type FailureDetails = {
  failure_reason: string | null;
  failure_code: string | null;
  smtp_response: string | null;
  smtp_response_code: number | null;
};

function getProcessingLimit(): number {
  const parsed = Number(process.env.CUSTOMER_EMAIL_QUEUE_PROCESS_LIMIT);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

function getDeferredAttemptIso(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

function isValidRecipientEmail(email: string | null | undefined): email is string {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

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

function applyPrivateVariables(
  template: string,
  job: Pick<ClaimedJob, 'recipient_email' | 'recipient_name' | 'company_name'>,
): string {
  const recipientName = job.recipient_name?.trim() || 'Prezado(a)';
  const companyName = job.company_name?.trim() || '';
  const recipientEmail = job.recipient_email.trim().toLowerCase();

  return template
    .replace(/\[Nome\]/gi, recipientName)
    .replace(/\[Empresa\]/gi, companyName)
    .replace(/\[Email\]/gi, recipientEmail)
    .replace(/\[Municipio\]/gi, '')
    .replace(/\[Estado\]/gi, '')
    .replace(/\[Prefeito\]/gi, '')
    .replace(/\{\{\s*recipient_name\s*\}\}/gi, recipientName)
    .replace(/\{\{\s*company_name\s*\}\}/gi, companyName)
    .replace(/\{\{\s*recipient_email\s*\}\}/gi, recipientEmail)
    .replace(/\{\{\s*municipality\s*\}\}/gi, '')
    .replace(/\{\{\s*state\s*\}\}/gi, '')
    .replace(/\{\{\s*mayor_name\s*\}\}/gi, '');
}

function extractFailureDetails(error: unknown): FailureDetails {
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
        : error instanceof Error && error.message.trim()
          ? error.message
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

function isTemporaryFailure(details: FailureDetails): boolean {
  if (
    details.smtp_response_code !== null &&
    details.smtp_response_code >= 400 &&
    details.smtp_response_code < 500
  ) {
    return true;
  }

  const code = details.failure_code?.toUpperCase();
  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET') {
    return true;
  }

  const combinedMessage = [details.failure_reason, details.smtp_response]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();

  return (
    combinedMessage.includes('temporar') ||
    combinedMessage.includes('try again later') ||
    combinedMessage.includes('timeout') ||
    combinedMessage.includes('rate limit')
  );
}

async function countSentForWindow(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  table: 'email_job_queue' | 'customer_email_job_queue',
  sendingAccountId: string,
  from: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('sending_account_id', sendingAccountId)
    .eq('status', 'sent')
    .gte('sent_at', from);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countTotalSentForWindow(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  sendingAccountId: string,
  from: string,
): Promise<number> {
  const [publicSent, privateSent] = await Promise.all([
    countSentForWindow(supabase, 'email_job_queue', sendingAccountId, from),
    countSentForWindow(supabase, 'customer_email_job_queue', sendingAccountId, from),
  ]);

  return publicSent + privateSent;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = (req.headers.get('authorization') ?? '').trim();

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        hasCronSecret: Boolean(cronSecret),
        authHeaderPresent: Boolean(authHeader),
        authHeaderStartsWithBearer: authHeader.startsWith('Bearer '),
        authHeaderLength: authHeader.length,
        expectedHeaderLength: cronSecret ? `Bearer ${cronSecret}`.length : null,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV ?? null,
      },
      { status: 401 },
    );
  }

  const supabase = await createAdminClient();
  const limit = getProcessingLimit();

  const { data: claimedJobs, error: claimError } = await supabase.rpc(
    'claim_customer_email_jobs',
    {
      p_limit: limit,
      p_sending_account_id: null,
    },
  );

  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  const jobs = (claimedJobs ?? []) as ClaimedJob[];
  const touchedCampaignIds = new Set<string>(jobs.map((job) => job.campaign_id));

  if (jobs.length === 0) {
    return NextResponse.json({
      claimed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      retried: 0,
      limit_used: limit,
      campaign_ids: [],
      message: 'Processor privado/manual executado. Nenhum job elegível foi encontrado.',
    });
  }

  for (const campaignId of touchedCampaignIds) {
    const { error: activateCampaignError } = await supabase
      .from('email_campaigns')
      .update({ status: 'Ativa' })
      .eq('id', campaignId)
      .eq('status', 'Agendada');

    if (activateCampaignError) {
      return NextResponse.json({ error: activateCampaignError.message }, { status: 500 });
    }
  }

  const accountIds = [...new Set(jobs.map((job) => job.sending_account_id))];
  const campaignIds = [...touchedCampaignIds];

  const [{ data: accounts, error: accountsError }, { data: campaigns, error: campaignsError }] =
    await Promise.all([
      supabase
        .from('email_sending_accounts')
        .select(
          'id, company_id, provider_type, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password_encrypted, oauth_access_token_encrypted, oauth_refresh_token_encrypted, oauth_token_expires_at, oauth_status, is_active, hourly_limit, daily_limit',
        )
        .in('id', accountIds),
      supabase
        .from('email_campaigns')
        .select('id, company_id, subject, preheader, html_content, text_content')
        .in('id', campaignIds),
    ]);

  if (accountsError || campaignsError) {
    return NextResponse.json(
      { error: accountsError?.message || campaignsError?.message || 'Erro ao carregar dependências da fila privada.' },
      { status: 500 },
    );
  }

  const accountMap = new Map((accounts ?? []).map((account) => [account.id, account as SendingAccount]));
  const campaignMap = new Map((campaigns ?? []).map((campaign) => [campaign.id, campaign as Campaign]));

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  const accountQuota = new Map<
    string,
    { hourlySent: number; dailySent: number; hourlyLimit: number; dailyLimit: number }
  >();

  for (const account of accounts ?? []) {
    const [hourlySent, dailySent] = await Promise.all([
      countTotalSentForWindow(supabase, account.id, oneHourAgo),
      countTotalSentForWindow(supabase, account.id, startOfDayIso),
    ]);

    accountQuota.set(account.id, {
      hourlySent,
      dailySent,
      hourlyLimit: account.hourly_limit ?? 50,
      dailyLimit: account.daily_limit ?? 500,
    });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let retried = 0;
  const campaignSent = new Map<string, number>();
  const campaignFailed = new Map<string, number>();

  for (const job of jobs) {
    const nowIso = new Date().toISOString();
    const account = accountMap.get(job.sending_account_id);
    const campaign = campaignMap.get(job.campaign_id);

    if (!isValidRecipientEmail(job.recipient_email)) {
      const { error } = await supabase
        .from('customer_email_job_queue')
        .update({
          status: 'skipped',
          claimed_at: null,
          next_attempt_at: null,
          failure_reason: 'Recipient email inválido para envio.',
          failure_code: 'INVALID_RECIPIENT_EMAIL',
          smtp_response: null,
          smtp_response_code: null,
          updated_at: nowIso,
        })
        .eq('id', job.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      skipped += 1;
      continue;
    }

    if (!account || !campaign) {
      const { error } = await supabase
        .from('customer_email_job_queue')
        .update({
          status: 'failed',
          failure_reason: 'Dependências do job não encontradas.',
          failure_code: 'MISSING_DEPENDENCY',
          updated_at: nowIso,
        })
        .eq('id', job.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      failed += 1;
      campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
      continue;
    }

    if (account.company_id !== job.company_id || campaign.company_id !== job.company_id) {
      const { error } = await supabase
        .from('customer_email_job_queue')
        .update({
          status: 'failed',
          failure_reason: 'Job com company_id incompatível.',
          failure_code: 'COMPANY_MISMATCH',
          updated_at: nowIso,
        })
        .eq('id', job.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      failed += 1;
      campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
      continue;
    }

    if (!account.is_active) {
      const { error } = await supabase
        .from('customer_email_job_queue')
        .update({
          status: 'pending',
          claimed_at: null,
          next_attempt_at: getDeferredAttemptIso(INACTIVE_ACCOUNT_RETRY_MINUTES),
          failure_reason: 'Conta de envio inativa.',
          failure_code: 'INACTIVE_SENDING_ACCOUNT',
          updated_at: nowIso,
        })
        .eq('id', job.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      retried += 1;
      continue;
    }

    const quota = accountQuota.get(job.sending_account_id);

    if (quota && quota.hourlySent >= quota.hourlyLimit) {
      const { error } = await supabase
        .from('customer_email_job_queue')
        .update({
          status: 'pending',
          claimed_at: null,
          next_attempt_at: getDeferredAttemptIso(HOURLY_LIMIT_RETRY_MINUTES),
          failure_reason: 'Limite horário da conta de envio atingido.',
          failure_code: 'HOURLY_LIMIT_REACHED',
          updated_at: nowIso,
        })
        .eq('id', job.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      retried += 1;
      continue;
    }

    if (quota && quota.dailySent >= quota.dailyLimit) {
      const { error } = await supabase
        .from('customer_email_job_queue')
        .update({
          status: 'pending',
          claimed_at: null,
          next_attempt_at: getDeferredAttemptIso(DAILY_LIMIT_RETRY_HOURS * 60),
          failure_reason: 'Limite diário da conta de envio atingido.',
          failure_code: 'DAILY_LIMIT_REACHED',
          updated_at: nowIso,
        })
        .eq('id', job.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      retried += 1;
      continue;
    }

    if (!campaign.subject?.trim() || (!campaign.html_content?.trim() && !campaign.text_content?.trim())) {
      const { error } = await supabase
        .from('customer_email_job_queue')
        .update({
          status: 'failed',
          failure_reason: 'Campanha sem conteúdo suficiente para envio.',
          failure_code: 'INVALID_CAMPAIGN_CONTENT',
          updated_at: nowIso,
        })
        .eq('id', job.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      failed += 1;
      campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
      continue;
    }

    const { error: attemptError } = await supabase
      .from('customer_email_job_queue')
      .update({
        attempt_count: (job.attempt_count ?? 0) + 1,
        updated_at: nowIso,
      })
      .eq('id', job.id);

    if (attemptError) {
      return NextResponse.json({ error: attemptError.message }, { status: 500 });
    }

    const subject = applyPrivateVariables(campaign.subject, job);
    const html = campaign.html_content?.trim()
      ? injectTracking(applyPrivateVariables(campaign.html_content, job), job.campaign_id, job.recipient_email)
      : `<p>${applyPrivateVariables(campaign.text_content || '', job)}</p>`;
    const text = campaign.text_content?.trim()
      ? applyPrivateVariables(campaign.text_content, job)
      : undefined;

    try {
      await sendEmail(supabase, account, {
        to: job.recipient_email.trim().toLowerCase(),
        subject,
        html,
        ...(text ? { text } : {}),
        ...(campaign.preheader ? { headers: { 'X-Preheader': campaign.preheader } } : {}),
      });

      const sentAt = new Date().toISOString();
      const { error: successError } = await supabase
        .from('customer_email_job_queue')
        .update({
          status: 'sent',
          sent_at: sentAt,
          next_attempt_at: null,
          failure_reason: null,
          failure_code: null,
          smtp_response: null,
          smtp_response_code: null,
          updated_at: sentAt,
        })
        .eq('id', job.id);

      if (successError) {
        return NextResponse.json({ error: successError.message }, { status: 500 });
      }

      const { error: creditError } = await supabase.rpc('increment_emails_used', {
        company_id_param: job.company_id,
      });

      if (creditError) {
        return NextResponse.json({ error: creditError.message }, { status: 500 });
      }

      sent += 1;
      if (quota) {
        quota.hourlySent += 1;
        quota.dailySent += 1;
      }
      campaignSent.set(job.campaign_id, (campaignSent.get(job.campaign_id) ?? 0) + 1);
    } catch (error: unknown) {
      const failureDetails = extractFailureDetails(error);

      if (isTemporaryFailure(failureDetails)) {
        const { error: retryError } = await supabase
          .from('customer_email_job_queue')
          .update({
            status: 'pending',
            claimed_at: null,
            next_attempt_at: getDeferredAttemptIso(TEMPORARY_SMTP_RETRY_MINUTES),
            failure_reason: failureDetails.failure_reason,
            failure_code: failureDetails.failure_code,
            smtp_response: failureDetails.smtp_response,
            smtp_response_code: failureDetails.smtp_response_code,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 });
        }

        retried += 1;
        continue;
      }

      const { error: failedError } = await supabase
        .from('customer_email_job_queue')
        .update({
          status: 'failed',
          failure_reason: failureDetails.failure_reason,
          failure_code: failureDetails.failure_code,
          smtp_response: failureDetails.smtp_response,
          smtp_response_code: failureDetails.smtp_response_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (failedError) {
        return NextResponse.json({ error: failedError.message }, { status: 500 });
      }

      failed += 1;
      campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
    }
  }

  for (const campaignId of touchedCampaignIds) {
    const deltaSent = campaignSent.get(campaignId) ?? 0;
    const deltaFailed = campaignFailed.get(campaignId) ?? 0;

    if (deltaSent > 0 || deltaFailed > 0) {
      const { error: countsError } = await supabase.rpc('increment_campaign_counts', {
        p_campaign_id: campaignId,
        p_sent: deltaSent,
        p_failed: deltaFailed,
      });

      if (countsError) {
        return NextResponse.json({ error: countsError.message }, { status: 500 });
      }
    }

    const { error: finalizeError } = await supabase.rpc(
      'finalize_customer_campaign_if_complete',
      {
        p_campaign_id: campaignId,
      },
    );

    if (finalizeError) {
      return NextResponse.json({ error: finalizeError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    claimed: jobs.length,
    sent,
    failed,
    skipped,
    retried,
    limit_used: limit,
    campaign_ids: [...touchedCampaignIds],
    message: 'Processor privado/manual executado. Esta rota processa apenas a customer_email_job_queue.',
  });
}
