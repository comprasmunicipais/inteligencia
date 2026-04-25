import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCompanyAccess } from '@/lib/billing-guard';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AudienceFilters = {
  region?: string;
  state?: string;
  municipalityId?: string;
  populationRange?: string;
  department?: string;
  strategic?: 'all' | 'yes' | 'no';
  minScore?: string;
  emailSearch?: string;
  totalCount?: number;
};

type EmailRow = {
  id: string;
  email: string;
  municipalities:
    | { name: string | null; city: string | null; state: string | null }
    | { name: string | null; city: string | null; state: string | null }[]
    | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Department term matching (mirrors /api/email/audiences/preview)
// ─────────────────────────────────────────────────────────────────────────────

const DEPARTMENT_RULES = [
  {
    label: 'Saúde',
    terms: ['saude', 'secsaude', 'sms', 'ubs', 'secretariadesaude', 'hospital', 'semus', 'semsa', 'sus', 'vigilancia'],
  },
  {
    label: 'Educação',
    terms: ['educacao', 'escola', 'creche', 'semed', 'sme', 'seceducacao', 'secretariadeeducacao', 'ensino'],
  },
  {
    label: 'Compras / Licitação',
    terms: ['compras', 'licitacao', 'licitacoes', 'contratos', 'cpl', 'pregao', 'pregoeiro', 'cotacao'],
  },
  {
    label: 'Administração',
    terms: ['administracao', 'gabinete', 'rh', 'semad', 'juridico', 'dp', 'pessoal', 'recursoshumanos'],
  },
  {
    label: 'Financeiro',
    terms: ['sefin', 'financas', 'fazenda', 'financeiro', 'arrecadacao', 'tributos', 'contabilidade', 'tesouraria'],
  },
  {
    label: 'Obras',
    terms: ['obras', 'engenharia', 'infra', 'infraestrutura', 'semob', 'semusp', 'urbanismo', 'seinfra'],
  },
  {
    label: 'Prefeito',
    terms: ['prefeito', 'viceprefeito', 'chefedegabinete'],
  },
  {
    label: 'Institucional',
    terms: ['prefeitura', 'contato'],
  },
  {
    label: 'Social',
    terms: ['assistenciasocial', 'social', 'cras', 'creas', 'acaosocial', 'fundosocial', 'bolsafamilia'],
  },
  {
    label: 'Meio Ambiente',
    terms: ['meioambiente', 'agricultura', 'defesacivil', 'ambiental', 'ambiente'],
  },
  {
    label: 'Comunicacao',
    terms: ['comunicacao', 'imprensa', 'ascom', 'secom'],
  },
  {
    label: 'Ouvidoria',
    terms: ['ouvidoria', 'procon', 'sic', 'faleconosco', 'atendimento'],
  },
  {
    label: 'Planejamento',
    terms: ['planejamento', 'seplan', 'projetos', 'convenios', 'desenvolvimento'],
  },
  {
    label: 'RH',
    terms: ['recursoshumanos', 'rh', 'pessoal', 'dp'],
  },
  {
    label: 'TI',
    terms: ['informatica', 'ti', 'cpd'],
  },
  {
    label: 'Esporte e Cultura',
    terms: ['esporte', 'esportes', 'cultura', 'turismo', 'biblioteca', 'lazer'],
  },
  {
    label: 'Juridico',
    terms: ['procuradoria', 'controleinterno', 'controladoria', 'fiscalizacao'],
  },
  {
    label: 'Camara Municipal',
    terms: ['camara', 'legislativo', 'vereador'],
  },
];

const REGIONS: Record<string, string[]> = {
  Norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  Sudeste: ['ES', 'MG', 'RJ', 'SP'],
  Sul: ['PR', 'RS', 'SC'],
};

function getDepartmentTerms(department: string): string[] {
  const rule = DEPARTMENT_RULES.find((r) => r.label === department);
  return rule ? rule.terms : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: extract municipality data from a row
// ─────────────────────────────────────────────────────────────────────────────

function getMuniData(row: EmailRow) {
  const muni = Array.isArray(row.municipalities) ? row.municipalities[0] : row.municipalities;
  return {
    name: muni?.name ?? muni?.city ?? '',
    city: muni?.city ?? '',
    state: muni?.state ?? '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 403 });
    }

    const companyId: string = profile.company_id;

    // ── 1b. Billing guard ────────────────────────────────────────────────────
    const access = await checkCompanyAccess(companyId);
    if (access.blocked) {
      return NextResponse.json(
        { error: 'Acesso bloqueado', reason: access.reason },
        { status: 403 },
      );
    }

    // ── 2. Body ──────────────────────────────────────────────────────────────
    const body = await req.json();
    const sendingAccountId: string | undefined = body.sending_account_id?.trim();

    if (!sendingAccountId) {
      return NextResponse.json({ error: 'Informe a conta de envio (sending_account_id).' }, { status: 400 });
    }

    // ── 3. Load campaign ─────────────────────────────────────────────────────
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, company_id, name, subject, preheader, html_content, text_content, audience_filters, status, sent_at')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }

    if (!campaign.subject?.trim()) {
      return NextResponse.json({ error: 'A campanha não tem assunto definido.' }, { status: 400 });
    }

    if (!campaign.html_content?.trim()) {
      return NextResponse.json({ error: 'A campanha não tem conteúdo HTML.' }, { status: 400 });
    }

    // ── 4. Validate sending account ──────────────────────────────────────────
    const { data: activeJobs, error: activeJobsError } = await supabase
      .from('email_job_queue')
      .select('id')
      .eq('campaign_id', campaignId)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (activeJobsError) {
      return NextResponse.json({ error: 'Erro ao validar status da fila da campanha.' }, { status: 500 });
    }

    if ((activeJobs?.length ?? 0) > 0) {
      return NextResponse.json(
        { error: 'A campanha jÃ¡ estÃ¡ em processamento de envio.' },
        { status: 409 },
      );
    }

    const { data: account, error: accountError } = await supabase
      .from('email_sending_accounts')
      .select('id, company_id, provider_type, is_active, smtp_password_encrypted, oauth_status, oauth_refresh_token_encrypted')
      .eq('id', sendingAccountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Conta de envio não encontrada.' }, { status: 404 });
    }

    if (account.company_id !== companyId) {
      return NextResponse.json({ error: 'Conta de envio não pertence a esta empresa.' }, { status: 403 });
    }

    if (!account.is_active) {
      return NextResponse.json({ error: 'A conta de envio está inativa.' }, { status: 400 });
    }

    if ((account.provider_type || 'smtp') === 'smtp' && !account.smtp_password_encrypted) {
      return NextResponse.json({ error: 'Senha SMTP não configurada na conta.' }, { status: 400 });
    }

    if (account.provider_type === 'google_oauth' && (!account.oauth_refresh_token_encrypted || account.oauth_status !== 'active')) {
      return NextResponse.json({ error: 'Conta Google nao esta ativa para envio.' }, { status: 400 });
    }

    // ── 4b. Verificar limite de emails do plano ──────────────────────────────
    const { data: company } = await supabase
      .from('companies')
      .select('plan_id, emails_used_this_month, extra_credits_available')
      .eq('id', companyId)
      .single();

    const { data: plan } = company?.plan_id
      ? await supabase.from('plans').select('emails_per_month').eq('id', company.plan_id).single()
      : { data: null };

    const emailsLimit = plan?.emails_per_month ?? 10000;
    const emailsUsed = company?.emails_used_this_month ?? 0;
    const extraCredits = company?.extra_credits_available ?? 0;
    const totalAvailable = (emailsLimit - emailsUsed) + extraCredits;
    const sendLimit: number = body.send_limit ?? totalAvailable;

    if (emailsUsed >= emailsLimit && extraCredits <= 0) {
      return NextResponse.json({
        error: 'limit_reached',
        emails_used: emailsUsed,
        emails_limit: emailsLimit,
      }, { status: 402 });
    }

    if (sendLimit <= 0) {
      return NextResponse.json({
        error: 'limit_reached',
        emails_used: emailsUsed,
        emails_limit: emailsLimit,
      }, { status: 402 });
    }

    // ── 5. Build audience query (no limit — all recipients go to queue) ───────
    const filters = ((campaign.audience_filters ?? {}) as AudienceFilters);

    let emailQuery = supabase
      .from('municipality_emails')
      .select(`
        id,
        email,
        municipalities:municipality_id (
          name,
          city,
          state
        )
      `)
      .order('priority_score', { ascending: false, nullsFirst: false })
      .order('email', { ascending: true });

    // Filters applied directly on municipality_emails columns — mirrors audiences/preview logic
    if (filters.state) emailQuery = emailQuery.eq('state_source', filters.state);
    if (filters.populationRange) emailQuery = emailQuery.eq('population_range', filters.populationRange);
    if (filters.municipalityId) emailQuery = emailQuery.eq('municipality_id', filters.municipalityId);

    if (filters.strategic === 'yes') emailQuery = emailQuery.eq('is_strategic', true);
    if (filters.strategic === 'no') emailQuery = emailQuery.eq('is_strategic', false);

    // Region filter: only applied when state is not set (mirrors audiences/preview logic)
    if (!filters.state && filters.region) {
      const regionStates = REGIONS[filters.region] ?? [];
      if (regionStates.length > 0) {
        emailQuery = emailQuery.in('state_source', regionStates);
      }
    }

    if (filters.minScore?.trim() && !Number.isNaN(Number(filters.minScore))) {
      emailQuery = emailQuery.gte('priority_score', Number(filters.minScore));
    }

    if (filters.emailSearch?.trim()) {
      emailQuery = emailQuery.ilike('email', `%${filters.emailSearch.trim()}%`);
    }

    const deptTerms = getDepartmentTerms(filters.department ?? '');
    if (deptTerms.length > 0) {
      const orConditions = deptTerms.flatMap((t) => [
        `email.ilike.%${t}%`,
        `department_label.ilike.%${t}%`,
      ]);
      emailQuery = emailQuery.or(orConditions.join(','));
    }

    const { data: emailRows, error: emailError } = await emailQuery;

    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    const allRows = (emailRows ?? []) as EmailRow[];

    // ── 5b. Busca emails já enviados nesta campanha (paginado) ──────────────
    // PostgREST aplica max-rows por requisição (padrão 1000 no Supabase).
    // O loop com .range() garante que todos os enviados sejam coletados,
    // independentemente do volume total da campanha.
    const alreadySentEmails = new Set<string>();
    let sentPage = 0;
    const SENT_PAGE_SIZE = 1000;

    while (true) {
      const { data: sentPageRows, error: sentPageError } = await supabase
        .from('email_job_queue')
        .select('recipient_email')
        .eq('campaign_id', campaignId)
        .eq('status', 'sent')
        .range(sentPage * SENT_PAGE_SIZE, (sentPage + 1) * SENT_PAGE_SIZE - 1);

      if (sentPageError) {
        return NextResponse.json({ error: sentPageError.message }, { status: 500 });
      }

      for (const r of sentPageRows ?? []) {
        alreadySentEmails.add(r.recipient_email as string);
      }

      if (!sentPageRows || sentPageRows.length < SENT_PAGE_SIZE) break;

      sentPage++;
    }

    // ── 5c. Exclui já enviados + deduplica por email ──────────────────────────
    const seenEmails = new Set<string>();
    const remainingRows = allRows.filter((row) => {
      if (alreadySentEmails.has(row.email)) return false;
      if (seenEmails.has(row.email)) return false;
      seenEmails.add(row.email);
      return true;
    });

    console.log('[campaign-send] total elegível:', allRows.length);
    console.log('[campaign-send] já enviados:', alreadySentEmails.size);
    console.log('[campaign-send] restante:', remainingRows.length);

    const rows = remainingRows.slice(0, Math.min(sendLimit, totalAvailable, remainingRows.length));

    console.log('[campaign-send] sendLimit final aplicado:', rows.length);

    if (rows.length === 0) {
      return NextResponse.json({ queued: 0, total: 0 });
    }

    // ── 6. Insert all recipients into email_job_queue ─────────────────────────
    const jobRows = rows.map((row) => {
      const { name, city, state } = getMuniData(row);
      return {
        campaign_id: campaignId,
        company_id: companyId,
        sending_account_id: sendingAccountId,
        recipient_email: row.email,
        recipient_name: name,
        municipality: city,
        state,
        status: 'pending',
      };
    });

    // Insert in chunks of 500 to stay within Supabase payload limits
    const CHUNK = 500;
    for (let i = 0; i < jobRows.length; i += CHUNK) {
      const { error: insertError } = await supabase
        .from('email_job_queue')
        .insert(jobRows.slice(i, i + CHUNK));

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // ── 7. Update campaign status to 'Agendada' ───────────────────────────────
    await supabase
      .from('email_campaigns')
      .update({
        status: 'Agendada',
        sending_account_id: sendingAccountId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // ── 8. Kick off queue processor immediately (fire and forget) ─────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://inteligencia-sooty.vercel.app';
    fetch(`${appUrl}/api/email/queue/process`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
    }).catch(() => {});

    return NextResponse.json({ queued: rows.length, total: rows.length });
  } catch (error: any) {
    console.error('[campaign-send] Erro interno:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao agendar campanha.' },
      { status: 500 },
    );
  }
}
