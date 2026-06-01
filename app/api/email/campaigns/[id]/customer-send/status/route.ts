import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type EligibleContact = {
  email_normalized: string;
};

type QueueJob = {
  status: string;
  recipient_email: string | null;
  next_attempt_at: string | null;
  sent_at: string | null;
  updated_at: string | null;
  failure_reason: string | null;
  failure_code: string | null;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: campaignId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 403 });
    }

    const companyId = profile.company_id as string;

    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, company_id, audience_source, customer_contact_list_id')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }

    console.log('[customer-send/status] campaign diagnostics', {
      campaignId,
      companyId,
      campaign_id: campaign.id,
      campaign_company_id: campaign.company_id,
      campaign_audience_source: campaign.audience_source,
      campaign_customer_contact_list_id: campaign.customer_contact_list_id,
      campaignError: campaignError ?? null,
    });

    if (campaign.audience_source !== 'customer_base') {
      return NextResponse.json({ error: 'Esta campanha não usa Bases Próprias.' }, { status: 400 });
    }

    if (!campaign.customer_contact_list_id) {
      return NextResponse.json(
        { error: 'A campanha não possui base própria vinculada.' },
        { status: 400 },
      );
    }

    const { data: customerList, error: customerListError } = await supabase
      .from('customer_contact_lists')
      .select('id, name, company_id, owner_user_id')
      .eq('id', campaign.customer_contact_list_id)
      .eq('company_id', companyId)
      .eq('owner_user_id', user.id)
      .single();

    if (customerListError || !customerList) {
      return NextResponse.json(
        { error: 'Base própria não encontrada para este usuário.' },
        { status: 403 },
      );
    }

    const [
      { count: totalContacts, error: totalContactsError },
      { data: eligibleContacts, error: eligibleContactsError },
      { data: queueJobs, error: queueJobsError },
    ] = await Promise.all([
      supabase
        .from('customer_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('owner_user_id', user.id)
        .eq('list_id', customerList.id),
      supabase
        .from('customer_contacts')
        .select('email_normalized')
        .eq('company_id', companyId)
        .eq('owner_user_id', user.id)
        .eq('list_id', customerList.id)
        .eq('is_valid_email', true)
        .not('email_normalized', 'is', null)
        .neq('email_normalized', ''),
      supabase
        .from('customer_email_job_queue')
        .select('status, recipient_email, next_attempt_at, sent_at, updated_at, failure_reason, failure_code')
        .eq('campaign_id', campaignId),
    ]);

    if (totalContactsError || eligibleContactsError || queueJobsError) {
      return NextResponse.json(
        {
          error:
            totalContactsError?.message ||
            eligibleContactsError?.message ||
            queueJobsError?.message ||
            'Erro ao carregar status da fila privada.',
        },
        { status: 500 },
      );
    }

    const eligibleRows = (eligibleContacts ?? []) as EligibleContact[];
    const uniqueEligibleEmails = new Set<string>();
    for (const contact of eligibleRows) {
      const normalizedEmail = contact.email_normalized.trim().toLowerCase();
      if (normalizedEmail) {
        uniqueEligibleEmails.add(normalizedEmail);
      }
    }

    const jobs = (queueJobs ?? []) as QueueJob[];
    const now = Date.now();
    let sentJobs = 0;
    let pendingJobs = 0;
    let processingJobs = 0;
    let failedJobs = 0;
    let skippedJobs = 0;
    let retryJobs = 0;
    let lastSentAt: string | null = null;
    let lastFailureAt: string | null = null;
    let lastFailureReason: string | null = null;
    let lastFailureCode: string | null = null;

    const sentEmails = new Set<string>();
    const activeEmails = new Set<string>();

    for (const job of jobs) {
      const normalizedEmail =
        typeof job.recipient_email === 'string' ? job.recipient_email.trim().toLowerCase() : '';

      if (job.status === 'sent') {
        sentJobs += 1;
        if (normalizedEmail) sentEmails.add(normalizedEmail);
        if (job.sent_at && (!lastSentAt || new Date(job.sent_at).getTime() > new Date(lastSentAt).getTime())) {
          lastSentAt = job.sent_at;
        }
      }

      if (job.status === 'pending') {
        pendingJobs += 1;
        if (normalizedEmail) activeEmails.add(normalizedEmail);
        if (job.next_attempt_at && new Date(job.next_attempt_at).getTime() > now) {
          retryJobs += 1;
        }
      }

      if (job.status === 'processing') {
        processingJobs += 1;
        if (normalizedEmail) activeEmails.add(normalizedEmail);
      }

      if (job.status === 'failed') {
        failedJobs += 1;
      }

      if (job.status === 'skipped') {
        skippedJobs += 1;
      }

      const hasFailureInfo = job.status === 'failed' || Boolean(job.failure_reason);
      if (hasFailureInfo && job.updated_at) {
        const updatedAt = new Date(job.updated_at).getTime();
        const currentLastFailure = lastFailureAt ? new Date(lastFailureAt).getTime() : 0;
        if (!lastFailureAt || updatedAt > currentLastFailure) {
          lastFailureAt = job.updated_at;
          lastFailureReason = job.failure_reason;
          lastFailureCode = job.failure_code;
        }
      }
    }

    const activeJobs = pendingJobs + processingJobs;
    let availableContacts = 0;

    for (const email of uniqueEligibleEmails) {
      if (!sentEmails.has(email) && !activeEmails.has(email)) {
        availableContacts += 1;
      }
    }

    return NextResponse.json({
      campaign_id: campaignId,
      list_id: customerList.id,
      list_name: customerList.name,
      total_contacts: totalContacts ?? 0,
      eligible_contacts: uniqueEligibleEmails.size,
      available_contacts: availableContacts,
      already_sent_contacts: sentEmails.size,
      sent_jobs: sentJobs,
      pending_jobs: pendingJobs,
      active_job_contacts: activeJobs,
      processing_jobs: processingJobs,
      failed_jobs: failedJobs,
      skipped_jobs: skippedJobs,
      retry_jobs: retryJobs,
      total_jobs: jobs.length,
      last_sent_at: lastSentAt,
      last_failure_at: lastFailureAt,
      last_failure_reason: lastFailureReason,
      last_failure_code: lastFailureCode,
      can_prepare_more: availableContacts > 0 && activeJobs === 0,
      has_active_jobs: activeJobs > 0,
      skipped_duplicates: Math.max(0, eligibleRows.length - uniqueEligibleEmails.size),
      message:
        activeJobs > 0
          ? 'Há uma fila privada em andamento.'
          : availableContacts > 0
            ? 'Pode preparar nova leva.'
            : 'Todos os contatos disponíveis já foram preparados ou enviados.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao consultar status da fila privada.' },
      { status: 500 },
    );
  }
}
