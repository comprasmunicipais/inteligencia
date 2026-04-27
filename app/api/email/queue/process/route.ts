export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, sanitizeEmailSendError } from '@/lib/email/sender';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 300;

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

function maskEmail(email: string): string {
  const [localPart = '', domain = ''] = email.split('@');
  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal || '**'}***@${domain || 'redacted'}`;
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

// ─────────────────────────────────────────────────────────────────────────────
// Route handler — called by Vercel Cron every hour
// Auth: Authorization: Bearer <CRON_SECRET>
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── 1. Auth via CRON_SECRET ─────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient();

  // ── 2. Atomically claim up to BATCH_SIZE pending jobs ───────────────────
  // UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *
  // guarantees two concurrent workers never claim the same job.
  const { data: jobs, error: jobsError } = await supabase.rpc('claim_email_jobs', {
    p_limit: BATCH_SIZE,
  });

  if (jobsError) {
    console.error('[queue-process] Erro ao buscar jobs:', jobsError.message);
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, failed: 0 });
  }

  // ── 3. Group jobs by sending_account_id to reuse transporters ──────────
  type Job = {
    id: string;
    campaign_id: string;
    company_id: string;
    sending_account_id: string;
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
  let sent = 0;
  let failed = 0;

  // Track per-campaign counts for updating sent_count
  const campaignSent = new Map<string, number>();
  const campaignFailed = new Map<string, number>();

  const accountQuota = new Map<string, { hourlySent: number; dailySent: number; hourlyLimit: number; dailyLimit: number }>();
  const inactiveAccountsLogged = new Set<string>();
  const hourlyLimitLogged = new Set<string>();
  const dailyLimitLogged = new Set<string>();
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
      // Mark as failed — missing config (job was already claimed as 'processing')
      await supabase
        .from('email_job_queue')
        .update({ status: 'failed', sent_at: new Date().toISOString() })
        .eq('id', job.id);
      failed++;
      campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
      continue;
    }

    if (!account.is_active) {
      if (!inactiveAccountsLogged.has(job.sending_account_id)) {
        console.warn('[queue-process] Conta SMTP inativa; jobs mantidos na fila.', {
          sendingAccountId: job.sending_account_id,
        });
        inactiveAccountsLogged.add(job.sending_account_id);
      }

      await supabase
        .from('email_job_queue')
        .update({ status: 'pending', claimed_at: null })
        .eq('id', job.id);

      continue;
    }

    const quota = accountQuota.get(job.sending_account_id);
    if (quota) {
      if (quota.hourlySent >= quota.hourlyLimit) {
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
          .update({ status: 'pending', claimed_at: null })
          .eq('id', job.id);

        continue;
      }

      if (quota.dailySent >= quota.dailyLimit) {
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
          .update({ status: 'pending', claimed_at: null })
          .eq('id', job.id);

        continue;
      }
    }

    try {
      const mayor = mayorMap.get(`${job.municipality}::${job.state}`) ?? '';
      const personalizedHtml = injectTracking(
        substituteVars(campaign.html_content!, job.recipient_name, job.municipality, job.state, mayor),
        job.campaign_id,
        job.recipient_email,
      );

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
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', job.id);

      sent++;
      if (quota) {
        quota.hourlySent += 1;
        quota.dailySent += 1;
      }
      await supabase.rpc('increment_emails_used', { company_id_param: job.company_id });
      campaignSent.set(job.campaign_id, (campaignSent.get(job.campaign_id) ?? 0) + 1);
      } catch (err) {
        console.error('[queue-process] Falha para destinatário:', {
          recipient: maskEmail(job.recipient_email),
          error: sanitizeSmtpError(err),
        });

      await supabase
        .from('email_job_queue')
        .update({ status: 'failed', sent_at: new Date().toISOString() })
        .eq('id', job.id);

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

  return NextResponse.json({ processed: jobs.length, sent, failed });
}
