import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/server';
import { decryptEmailSettingSecret } from '@/lib/security/email-settings-crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 100;

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  'https://inteligencia-sooty.vercel.app';

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
): string {
  return template
    .replace(/\[Nome\]/gi, name || 'Prezado(a)')
    .replace(/\[Municipio\]/gi, municipality)
    .replace(/\[Estado\]/gi, state);
}

function sanitizeSmtpError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return msg
    .replace(/pass(wo)?rd\s*[:=]\s*[^\s]+/gi, 'password=[redacted]')
    .replace(/user(name)?\s*[:=]\s*[^\s]+/gi, 'username=[redacted]');
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

  // ── 2. Fetch up to BATCH_SIZE pending jobs ──────────────────────────────
  const { data: jobs, error: jobsError } = await supabase
    .from('email_job_queue')
    .select('id, campaign_id, company_id, sending_account_id, recipient_email, recipient_name, municipality, state')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (jobsError) {
    console.error('[queue-process] Erro ao buscar jobs:', jobsError.message);
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, failed: 0 });
  }

  // ── 3. Group jobs by sending_account_id to reuse transporters ──────────
  type Job = (typeof jobs)[number];

  const accountGroups = new Map<string, Job[]>();
  for (const job of jobs) {
    const list = accountGroups.get(job.sending_account_id) ?? [];
    list.push(job);
    accountGroups.set(job.sending_account_id, list);
  }

  // ── 4. Load all required accounts and campaigns in bulk ─────────────────
  const accountIds = [...accountGroups.keys()];
  const campaignIds = [...new Set(jobs.map((j) => j.campaign_id))];

  const [{ data: accounts }, { data: campaigns }] = await Promise.all([
    supabase
      .from('email_sending_accounts')
      .select('id, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password_encrypted')
      .in('id', accountIds),
    supabase
      .from('email_campaigns')
      .select('id, subject, preheader, html_content, text_content')
      .in('id', campaignIds),
  ]);

  const accountMap = new Map((accounts ?? []).map((a) => [a.id, a]));
  const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]));

  // ── 5. Process each job ──────────────────────────────────────────────────
  let sent = 0;
  let failed = 0;

  // Track per-campaign counts for updating sent_count
  const campaignSent = new Map<string, number>();
  const campaignFailed = new Map<string, number>();

  // Cache transporters per account
  const transporterCache = new Map<string, nodemailer.Transporter>();

  for (const job of jobs) {
    const account = accountMap.get(job.sending_account_id);
    const campaign = campaignMap.get(job.campaign_id);

    if (!account || !campaign) {
      // Mark as failed — missing config
      await supabase
        .from('email_job_queue')
        .update({ status: 'failed', sent_at: new Date().toISOString() })
        .eq('id', job.id);
      failed++;
      campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
      continue;
    }

    // Build transporter once per account
    if (!transporterCache.has(job.sending_account_id)) {
      try {
        const smtpPassword = decryptEmailSettingSecret(account.smtp_password_encrypted);
        const transporter = nodemailer.createTransport({
          host: account.smtp_host,
          port: Number(account.smtp_port),
          secure: Boolean(account.smtp_secure),
          auth: { user: account.smtp_username, pass: smtpPassword },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
          requireTLS: !account.smtp_secure,
          tls: { rejectUnauthorized: true },
        });
        transporterCache.set(job.sending_account_id, transporter);
      } catch (err) {
        console.error('[queue-process] Falha ao criar transporter:', sanitizeSmtpError(err));
        await supabase
          .from('email_job_queue')
          .update({ status: 'failed', sent_at: new Date().toISOString() })
          .eq('id', job.id);
        failed++;
        campaignFailed.set(job.campaign_id, (campaignFailed.get(job.campaign_id) ?? 0) + 1);
        continue;
      }
    }

    const transporter = transporterCache.get(job.sending_account_id)!;

    try {
      const personalizedHtml = injectTracking(
        substituteVars(campaign.html_content!, job.recipient_name, job.municipality, job.state),
        job.campaign_id,
        job.recipient_email,
      );

      await transporter.sendMail({
        from: `"${account.sender_name}" <${account.sender_email}>`,
        ...(account.reply_to_email ? { replyTo: account.reply_to_email } : {}),
        to: job.recipient_email,
        subject: substituteVars(campaign.subject!, job.recipient_name, job.municipality, job.state),
        html: personalizedHtml,
        ...(campaign.text_content
          ? { text: substituteVars(campaign.text_content, job.recipient_name, job.municipality, job.state) }
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
      campaignSent.set(job.campaign_id, (campaignSent.get(job.campaign_id) ?? 0) + 1);
    } catch (err) {
      console.error(`[queue-process] Falha para ${job.recipient_email}:`, sanitizeSmtpError(err));

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

    // Check if there are still pending jobs for this campaign
    const { count } = await supabase
      .from('email_job_queue')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', cid)
      .eq('status', 'pending');

    // Increment counters using RPC to avoid race conditions
    await supabase.rpc('increment_campaign_counts', {
      p_campaign_id: cid,
      p_sent: deltaSent,
      p_failed: deltaFailed,
    });

    // If no more pending jobs, mark campaign as 'Ativa'
    if ((count ?? 0) === 0) {
      await supabase
        .from('email_campaigns')
        .update({ status: 'Ativa', sent_at: new Date().toISOString() })
        .eq('id', cid)
        .eq('status', 'Agendada');
    }
  }

  return NextResponse.json({ processed: jobs.length, sent, failed });
}
