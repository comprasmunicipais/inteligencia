import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';
import { decryptEmailSettingSecret } from '@/lib/security/email-settings-crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AudienceFilters = {
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
];

function getDepartmentTerms(department: string): string[] {
  const rule = DEPARTMENT_RULES.find((r) => r.label === department);
  return rule ? rule.terms : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Variable substitution
// ─────────────────────────────────────────────────────────────────────────────

function getMuniData(row: EmailRow) {
  const muni = Array.isArray(row.municipalities) ? row.municipalities[0] : row.municipalities;
  return {
    name: muni?.name ?? muni?.city ?? '',
    city: muni?.city ?? '',
    state: muni?.state ?? '',
  };
}

function substituteVars(template: string, row: EmailRow): string {
  const { name, city, state } = getMuniData(row);
  return template
    .replace(/\[Nome\]/gi, name || 'Prezado(a)')
    .replace(/\[Municipio\]/gi, city)
    .replace(/\[Estado\]/gi, state);
}

function sanitizeSmtpError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return msg
    .replace(/pass(wo)?rd\s*[:=]\s*[^\s]+/gi, 'password=[redacted]')
    .replace(/user(name)?\s*[:=]\s*[^\s]+/gi, 'username=[redacted]');
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

    // ── 2. Body ──────────────────────────────────────────────────────────────
    const body = await req.json();
    const sendingAccountId: string | undefined = body.sending_account_id?.trim();

    if (!sendingAccountId) {
      return NextResponse.json({ error: 'Informe a conta de envio (sending_account_id).' }, { status: 400 });
    }

    // ── 3. Load campaign ─────────────────────────────────────────────────────
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, company_id, name, subject, preheader, html_content, text_content, audience_filters, status')
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

    // ── 4. Load sending account ──────────────────────────────────────────────
    const { data: account, error: accountError } = await supabase
      .from('email_sending_accounts')
      .select(
        'id, name, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password_encrypted, hourly_limit, daily_limit, is_active',
      )
      .eq('id', sendingAccountId)
      .eq('company_id', companyId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Conta de envio não encontrada.' }, { status: 404 });
    }

    if (!account.is_active) {
      return NextResponse.json({ error: 'A conta de envio está inativa.' }, { status: 400 });
    }

    if (!account.smtp_password_encrypted) {
      return NextResponse.json({ error: 'Senha SMTP não configurada na conta.' }, { status: 400 });
    }

    const smtpPassword = decryptEmailSettingSecret(account.smtp_password_encrypted);
    const maxSend = Math.min(account.hourly_limit ?? 100, 2000);

    // ── 5. Build audience query ──────────────────────────────────────────────
    const filters = ((campaign.audience_filters ?? {}) as AudienceFilters);

    // Resolve municipality IDs from geo filters
    let municipalityIds: string[] | null = null;

    if (filters.state || filters.municipalityId || filters.populationRange) {
      let mq = supabase.from('municipalities').select('id');
      if (filters.state) mq = mq.eq('state', filters.state);
      if (filters.municipalityId) mq = mq.eq('id', filters.municipalityId);
      if (filters.populationRange) mq = mq.eq('population_range', filters.populationRange);

      const { data: munData, error: munError } = await mq;

      if (munError) {
        return NextResponse.json({ error: munError.message }, { status: 500 });
      }

      municipalityIds = (munData ?? []).map((m: any) => m.id);

      if (municipalityIds.length === 0) {
        return NextResponse.json({ sent: 0, failed: 0, total: 0, truncated: false });
      }
    }

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
      .limit(maxSend);

    if (municipalityIds) {
      emailQuery = emailQuery.in('municipality_id', municipalityIds);
    }

    if (filters.strategic === 'yes') emailQuery = emailQuery.eq('is_strategic', true);
    if (filters.strategic === 'no') emailQuery = emailQuery.eq('is_strategic', false);

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

    const rows = (emailRows ?? []) as EmailRow[];
    const truncated = rows.length === maxSend && (filters.totalCount ?? 0) > maxSend;

    if (rows.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, total: 0, truncated: false });
    }

    // ── 6. Create SMTP transporter ───────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: Number(account.smtp_port),
      secure: Boolean(account.smtp_secure),
      auth: {
        user: account.smtp_username,
        pass: smtpPassword,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      requireTLS: !account.smtp_secure,
      tls: { rejectUnauthorized: true },
    });

    // ── 7. Send emails ───────────────────────────────────────────────────────
    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await transporter.sendMail({
          from: `"${account.sender_name}" <${account.sender_email}>`,
          ...(account.reply_to_email ? { replyTo: account.reply_to_email } : {}),
          to: row.email,
          subject: substituteVars(campaign.subject!, row),
          html: substituteVars(campaign.html_content!, row),
          ...(campaign.text_content
            ? { text: substituteVars(campaign.text_content, row) }
            : {}),
          ...(campaign.preheader
            ? { headers: { 'X-Preheader': campaign.preheader } }
            : {}),
        });
        sent++;
      } catch (err) {
        console.error(`[campaign-send] Falha para ${row.email}:`, sanitizeSmtpError(err));
        failed++;
      }
    }

    // ── 8. Update campaign ───────────────────────────────────────────────────
    const now = new Date().toISOString();

    await supabase
      .from('email_campaigns')
      .update({
        status: 'Ativa',
        sending_account_id: sendingAccountId,
        sent_at: now,
        sent_count: sent,
        failed_count: failed,
        updated_at: now,
      })
      .eq('id', campaignId);

    return NextResponse.json({ sent, failed, total: rows.length, truncated });
  } catch (error: any) {
    console.error('[campaign-send] Erro interno:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao enviar campanha.' },
      { status: 500 },
    );
  }
}
