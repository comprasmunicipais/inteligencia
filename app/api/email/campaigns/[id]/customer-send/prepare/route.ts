import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type EligibleContact = {
  id: string;
  email_normalized: string;
  name: string | null;
  company_name: string | null;
};

type PreparationStats = {
  total_contacts: number;
  eligible_contacts: number;
  available_contacts: number;
  already_sent_contacts: number;
  active_job_contacts: number;
  skipped_duplicates: number;
  available_contacts_list: EligibleContact[];
};

async function triggerPrivateQueueQStash() {
  const qstashToken = process.env.QSTASH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  const cronSecret = process.env.CRON_SECRET;

  if (!qstashToken || !appUrl || !cronSecret) {
    return {
      triggered: false,
      error: 'QStash não configurado: verifique QSTASH_TOKEN, NEXT_PUBLIC_APP_URL e CRON_SECRET.',
    };
  }

  const destinationUrl = `${appUrl}/api/email/customer-queue/process`;

  try {
    const response = await fetch(`https://qstash.upstash.io/v2/publish/${destinationUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${qstashToken}`,
        'Upstash-Method': 'GET',
        'Upstash-Retries': '3',
        'Upstash-Forward-Authorization': `Bearer ${cronSecret}`,
      },
    });

    if (!response.ok) {
      return {
        triggered: false,
        error: (await response.text()) || `Falha ao publicar trigger QStash (${response.status}).`,
      };
    }

    return { triggered: true, error: null };
  } catch (error: any) {
    return {
      triggered: false,
      error: error?.message || 'Falha ao publicar trigger QStash.',
    };
  }
}

async function loadPreparationContext(context: RouteContext) {
  const { id: campaignId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      errorResponse: NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return {
      errorResponse: NextResponse.json({ error: 'Empresa não identificada.' }, { status: 403 }),
    };
  }

  const companyId = profile.company_id as string;

  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('id, company_id, audience_source, customer_contact_list_id')
    .eq('id', campaignId)
    .eq('company_id', companyId)
    .single();

  if (campaignError || !campaign) {
    return {
      errorResponse: NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 }),
    };
  }

  if (campaign.audience_source !== 'customer_base') {
    return {
      errorResponse: NextResponse.json({ error: 'Esta campanha não usa Bases Próprias.' }, { status: 400 }),
    };
  }

  if (!campaign.customer_contact_list_id) {
    return {
      errorResponse: NextResponse.json(
        { error: 'A campanha não possui base própria vinculada.' },
        { status: 400 },
      ),
    };
  }

  const { data: customerList, error: customerListError } = await supabase
    .from('customer_contact_lists')
    .select('id, company_id, owner_user_id')
    .eq('id', campaign.customer_contact_list_id)
    .eq('company_id', companyId)
    .eq('owner_user_id', user.id)
    .single();

  if (customerListError || !customerList) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Base própria não encontrada para este usuário.' },
        { status: 403 },
      ),
    };
  }

  return {
    supabase,
    campaignId,
    companyId,
    userId: user.id,
    customerListId: customerList.id,
  };
}

async function computePreparationStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    campaignId: string;
    companyId: string;
    userId: string;
    customerListId: string;
  },
): Promise<{ stats?: PreparationStats; errorResponse?: NextResponse }> {
  const [
    { count: totalContacts, error: totalContactsError },
    { data: eligibleContacts, error: eligibleContactsError },
    { data: sentJobs, error: sentJobsError },
    { data: activeJobs, error: activeJobsError },
  ] = await Promise.all([
    supabase
      .from('customer_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', input.companyId)
      .eq('owner_user_id', input.userId)
      .eq('list_id', input.customerListId),
    supabase
      .from('customer_contacts')
      .select('id, email_normalized, name, company_name')
      .eq('company_id', input.companyId)
      .eq('owner_user_id', input.userId)
      .eq('list_id', input.customerListId)
      .eq('is_valid_email', true)
      .not('email_normalized', 'is', null)
      .neq('email_normalized', ''),
    supabase
      .from('customer_email_job_queue')
      .select('recipient_email')
      .eq('campaign_id', input.campaignId)
      .eq('status', 'sent'),
    supabase
      .from('customer_email_job_queue')
      .select('recipient_email')
      .eq('campaign_id', input.campaignId)
      .in('status', ['pending', 'processing']),
  ]);

  if (totalContactsError || eligibleContactsError || sentJobsError || activeJobsError) {
    return {
      errorResponse: NextResponse.json(
        {
          error:
            totalContactsError?.message ||
            eligibleContactsError?.message ||
            sentJobsError?.message ||
            activeJobsError?.message ||
            'Erro ao calcular disponibilidade da fila privada.',
        },
        { status: 500 },
      ),
    };
  }

  const eligibleRows = (eligibleContacts ?? []) as EligibleContact[];
  const uniqueEligibleContacts = new Map<string, EligibleContact>();

  for (const contact of eligibleRows) {
    const normalizedEmail = contact.email_normalized.trim().toLowerCase();

    if (!normalizedEmail || uniqueEligibleContacts.has(normalizedEmail)) {
      continue;
    }

    uniqueEligibleContacts.set(normalizedEmail, {
      ...contact,
      email_normalized: normalizedEmail,
    });
  }

  const uniqueEligibleList = [...uniqueEligibleContacts.values()];
  const sentEmails = new Set(
    (sentJobs ?? [])
      .map((job) =>
        typeof job.recipient_email === 'string' ? job.recipient_email.trim().toLowerCase() : '',
      )
      .filter(Boolean),
  );
  const activeEmails = new Set(
    (activeJobs ?? [])
      .map((job) =>
        typeof job.recipient_email === 'string' ? job.recipient_email.trim().toLowerCase() : '',
      )
      .filter(Boolean),
  );

  const availableContactsList = uniqueEligibleList.filter((contact) => {
    return !sentEmails.has(contact.email_normalized) && !activeEmails.has(contact.email_normalized);
  });

  return {
    stats: {
      total_contacts: totalContacts ?? 0,
      eligible_contacts: uniqueEligibleList.length,
      available_contacts: availableContactsList.length,
      already_sent_contacts: sentEmails.size,
      active_job_contacts: activeEmails.size,
      skipped_duplicates: Math.max(0, eligibleRows.length - uniqueEligibleList.length),
      available_contacts_list: availableContactsList,
    },
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const loaded = await loadPreparationContext(context);

    if ('errorResponse' in loaded) {
      return loaded.errorResponse;
    }

    const statsResult = await computePreparationStats(loaded.supabase, {
      campaignId: loaded.campaignId,
      companyId: loaded.companyId,
      userId: loaded.userId,
      customerListId: loaded.customerListId,
    });

    if (statsResult.errorResponse) {
      return statsResult.errorResponse;
    }

    const stats = statsResult.stats!;

    return NextResponse.json({
      eligible_contacts: stats.eligible_contacts,
      available_contacts: stats.available_contacts,
      already_sent_contacts: stats.already_sent_contacts,
      active_job_contacts: stats.active_job_contacts,
      skipped_duplicates: stats.skipped_duplicates,
      total_contacts: stats.total_contacts,
      has_active_jobs: stats.active_job_contacts > 0,
      message:
        stats.active_job_contacts > 0
          ? 'Há uma fila privada em andamento. Conclua o processamento antes de preparar novos destinatários.'
          : 'Disponibilidade da fila privada carregada com sucesso.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao consultar fila privada.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const loaded = await loadPreparationContext(context);

    if ('errorResponse' in loaded) {
      return loaded.errorResponse;
    }

    const body = await request.json();
    const sendingAccountId =
      typeof body?.sending_account_id === 'string' && body.sending_account_id.trim()
        ? body.sending_account_id.trim()
        : '';
    const requestedSendLimit =
      typeof body?.send_limit === 'number'
        ? Math.floor(body.send_limit)
        : typeof body?.send_limit === 'string' && body.send_limit.trim()
          ? Math.floor(Number(body.send_limit))
          : null;

    if (!sendingAccountId) {
      return NextResponse.json(
        { error: 'Informe a conta de envio (sending_account_id).' },
        { status: 400 },
      );
    }

    const { data: sendingAccount, error: sendingAccountError } = await loaded.supabase
      .from('email_sending_accounts')
      .select('id, company_id, is_active')
      .eq('id', sendingAccountId)
      .eq('company_id', loaded.companyId)
      .single();

    if (sendingAccountError || !sendingAccount) {
      return NextResponse.json({ error: 'Conta de envio não encontrada.' }, { status: 404 });
    }

    if (!sendingAccount.is_active) {
      return NextResponse.json({ error: 'A conta de envio está inativa.' }, { status: 400 });
    }

    const statsResult = await computePreparationStats(loaded.supabase, {
      campaignId: loaded.campaignId,
      companyId: loaded.companyId,
      userId: loaded.userId,
      customerListId: loaded.customerListId,
    });

    if (statsResult.errorResponse) {
      return statsResult.errorResponse;
    }

    const stats = statsResult.stats!;

    if (stats.active_job_contacts > 0) {
      return NextResponse.json(
        {
          error:
            'Há uma fila privada em andamento. Conclua o processamento antes de preparar novos destinatários.',
          eligible_contacts: stats.eligible_contacts,
          available_contacts: stats.available_contacts,
          already_sent_contacts: stats.already_sent_contacts,
          active_job_contacts: stats.active_job_contacts,
          skipped_duplicates: stats.skipped_duplicates,
          total_contacts: stats.total_contacts,
        },
        { status: 409 },
      );
    }

    const safeRequestedLimit =
      requestedSendLimit !== null && Number.isFinite(requestedSendLimit) && requestedSendLimit > 0
        ? requestedSendLimit
        : null;
    const appliedSendLimit =
      safeRequestedLimit === null
        ? stats.available_contacts
        : Math.min(safeRequestedLimit, stats.available_contacts);
    const contactsToPrepare = stats.available_contacts_list.slice(0, appliedSendLimit);

    const jobsToInsert = contactsToPrepare.map((contact) => ({
      campaign_id: loaded.campaignId,
      company_id: loaded.companyId,
      sending_account_id: sendingAccountId,
      customer_contact_list_id: loaded.customerListId,
      customer_contact_id: contact.id,
      recipient_email: contact.email_normalized,
      recipient_name: contact.name,
      company_name: contact.company_name,
      status: 'pending',
      attempt_count: 0,
    }));

    if (jobsToInsert.length === 0) {
      return NextResponse.json({
        created_jobs: 0,
        skipped_duplicates: stats.skipped_duplicates,
        eligible_contacts: stats.eligible_contacts,
        available_contacts: stats.available_contacts,
        already_sent_contacts: stats.already_sent_contacts,
        requested_send_limit: safeRequestedLimit,
        applied_send_limit: 0,
        total_contacts: stats.total_contacts,
        qstash_triggered: false,
        qstash_trigger_error: null,
        message: 'Nenhum destinatário disponível para preparação nesta campanha.',
      });
    }

    const chunkSize = 500;

    for (let index = 0; index < jobsToInsert.length; index += chunkSize) {
      const chunk = jobsToInsert.slice(index, index + chunkSize);
      const { error: insertError } = await loaded.supabase
        .from('customer_email_job_queue')
        .upsert(chunk, {
          onConflict: 'campaign_id,recipient_email',
          ignoreDuplicates: true,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { error: updateCampaignError } = await loaded.supabase
      .from('email_campaigns')
      .update({
        status: 'Agendada',
        sending_account_id: sendingAccountId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loaded.campaignId)
      .eq('company_id', loaded.companyId);

    if (updateCampaignError) {
      return NextResponse.json({ error: updateCampaignError.message }, { status: 500 });
    }

    const qstashTrigger = await triggerPrivateQueueQStash();

    return NextResponse.json({
      created_jobs: jobsToInsert.length,
      skipped_duplicates: stats.skipped_duplicates,
      eligible_contacts: stats.eligible_contacts,
      available_contacts: stats.available_contacts,
      already_sent_contacts: stats.already_sent_contacts,
      requested_send_limit: safeRequestedLimit,
      applied_send_limit: appliedSendLimit,
      total_contacts: stats.total_contacts,
      qstash_triggered: qstashTrigger.triggered,
      qstash_trigger_error: qstashTrigger.error,
      message:
        'Jobs privados preparados com sucesso. Nenhum e-mail foi enviado nesta etapa.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao preparar fila privada.' },
      { status: 500 },
    );
  }
}
