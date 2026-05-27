import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type AudienceSource = 'cm_pro' | 'customer_base';

type AudienceFilters = {
  region?: string;
  state?: string;
  municipalityId?: string;
  populationRange?: string;
  department?: string;
  strategic?: 'all' | 'yes' | 'no';
  minScore?: string;
  emailSearch?: string;
  qualityGroups?: {
    green: boolean;
    yellow: boolean;
    white: boolean;
  };
  totalCount?: number;
};

function isValidAudienceSource(value: unknown): value is AudienceSource {
  return value === 'cm_pro' || value === 'customer_base';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: campaignId } = await params;
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
    const audienceSource = body?.audience_source;
    const customerContactListId =
      typeof body?.customer_contact_list_id === 'string' && body.customer_contact_list_id.trim()
        ? body.customer_contact_list_id.trim()
        : null;
    const audienceFilters = (body?.audience_filters ?? {}) as AudienceFilters;

    if (!isValidAudienceSource(audienceSource)) {
      return NextResponse.json({ error: 'Origem de audiência inválida.' }, { status: 400 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, company_id')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }

    if (audienceSource === 'customer_base') {
      if (!customerContactListId) {
        return NextResponse.json({ error: 'Selecione uma base própria válida.' }, { status: 400 });
      }

      const { data: customerList, error: customerListError } = await supabase
        .from('customer_contact_lists')
        .select('id, company_id, owner_user_id')
        .eq('id', customerContactListId)
        .eq('company_id', companyId)
        .eq('owner_user_id', user.id)
        .single();

      if (customerListError || !customerList) {
        return NextResponse.json({ error: 'Base própria não encontrada para este usuário.' }, { status: 403 });
      }
    }

    const { error: updateError } = await supabase
      .from('email_campaigns')
      .update({
        audience_source: audienceSource,
        customer_contact_list_id: audienceSource === 'customer_base' ? customerContactListId : null,
        audience_filters: audienceFilters,
      })
      .eq('id', campaignId)
      .eq('company_id', companyId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao salvar configuração da audiência.' },
      { status: 500 },
    );
  }
}
