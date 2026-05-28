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

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params;
  const supabase = await createClient();

  try {
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
    const body = await request.json();
    const sendingAccountId =
      typeof body?.sending_account_id === 'string' && body.sending_account_id.trim()
        ? body.sending_account_id.trim()
        : '';

    if (!sendingAccountId) {
      return NextResponse.json({ error: 'Informe a conta de envio (sending_account_id).' }, { status: 400 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, company_id, audience_source, customer_contact_list_id')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }

    if (campaign.audience_source !== 'customer_base') {
      return NextResponse.json({ error: 'Esta campanha não usa Bases Próprias.' }, { status: 400 });
    }

    if (!campaign.customer_contact_list_id) {
      return NextResponse.json({ error: 'A campanha não possui base própria vinculada.' }, { status: 400 });
    }

    const { data: customerList, error: customerListError } = await supabase
      .from('customer_contact_lists')
      .select('id, company_id, owner_user_id')
      .eq('id', campaign.customer_contact_list_id)
      .eq('company_id', companyId)
      .eq('owner_user_id', user.id)
      .single();

    if (customerListError || !customerList) {
      return NextResponse.json({ error: 'Base própria não encontrada para este usuário.' }, { status: 403 });
    }

    const { data: sendingAccount, error: sendingAccountError } = await supabase
      .from('email_sending_accounts')
      .select('id, company_id, is_active')
      .eq('id', sendingAccountId)
      .eq('company_id', companyId)
      .single();

    if (sendingAccountError || !sendingAccount) {
      return NextResponse.json({ error: 'Conta de envio não encontrada.' }, { status: 404 });
    }

    if (!sendingAccount.is_active) {
      return NextResponse.json({ error: 'A conta de envio está inativa.' }, { status: 400 });
    }

    const [{ count: totalContacts, error: totalContactsError }, { data: eligibleContacts, error: eligibleContactsError }, { data: existingJobs, error: existingJobsError }] =
      await Promise.all([
        supabase
          .from('customer_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('owner_user_id', user.id)
          .eq('list_id', customerList.id),
        supabase
          .from('customer_contacts')
          .select('id, email_normalized, name, company_name')
          .eq('company_id', companyId)
          .eq('owner_user_id', user.id)
          .eq('list_id', customerList.id)
          .eq('is_valid_email', true)
          .not('email_normalized', 'is', null)
          .neq('email_normalized', ''),
        supabase
          .from('customer_email_job_queue')
          .select('recipient_email')
          .eq('campaign_id', campaignId),
      ]);

    if (totalContactsError || eligibleContactsError || existingJobsError) {
      return NextResponse.json(
        {
          error:
            totalContactsError?.message ||
            eligibleContactsError?.message ||
            existingJobsError?.message ||
            'Erro ao preparar fila privada.',
        },
        { status: 500 },
      );
    }

    const eligibleRows = (eligibleContacts ?? []) as EligibleContact[];
    const totalEligible = eligibleRows.length;
    const existingEmails = new Set(
      (existingJobs ?? [])
        .map((job) => (typeof job.recipient_email === 'string' ? job.recipient_email.trim().toLowerCase() : ''))
        .filter(Boolean),
    );

    const seenEligibleEmails = new Set<string>();
    let skippedDuplicates = 0;

    const jobsToInsert = eligibleRows.reduce<Array<Record<string, unknown>>>((acc, contact) => {
      const normalizedEmail = contact.email_normalized.trim().toLowerCase();

      if (!normalizedEmail || existingEmails.has(normalizedEmail) || seenEligibleEmails.has(normalizedEmail)) {
        skippedDuplicates += 1;
        return acc;
      }

      seenEligibleEmails.add(normalizedEmail);
      acc.push({
        campaign_id: campaignId,
        company_id: companyId,
        sending_account_id: sendingAccountId,
        customer_contact_list_id: customerList.id,
        customer_contact_id: contact.id,
        recipient_email: normalizedEmail,
        recipient_name: contact.name,
        company_name: contact.company_name,
        status: 'pending',
        attempt_count: 0,
      });
      return acc;
    }, []);

    const CHUNK_SIZE = 500;

    for (let index = 0; index < jobsToInsert.length; index += CHUNK_SIZE) {
      const chunk = jobsToInsert.slice(index, index + CHUNK_SIZE);
      const { error: insertError } = await supabase
        .from('customer_email_job_queue')
        .upsert(chunk, {
          onConflict: 'campaign_id,recipient_email',
          ignoreDuplicates: true,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { error: updateCampaignError } = await supabase
      .from('email_campaigns')
      .update({
        status: 'Agendada',
        sending_account_id: sendingAccountId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('company_id', companyId);

    if (updateCampaignError) {
      return NextResponse.json({ error: updateCampaignError.message }, { status: 500 });
    }

    return NextResponse.json({
      created_jobs: jobsToInsert.length,
      skipped_duplicates: skippedDuplicates,
      eligible_contacts: totalEligible,
      total_contacts: totalContacts ?? 0,
      message: 'Jobs privados preparados com sucesso. Nenhum e-mail foi enviado nesta etapa.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao preparar fila privada.' },
      { status: 500 },
    );
  }
}
