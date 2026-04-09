export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const ALERT_SCORE_THRESHOLD = 90;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function calculateScore(opportunity: any, profile: any): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  const targetStates: string[] = profile.target_states || [];
  if (targetStates.includes(opportunity.state) || targetStates.includes('Nacional')) {
    score += 25;
    reasons.push('Localização estratégica (Estado alvo).');
  }

  const targetModalities: string[] = profile.target_modalities || [];
  if (targetModalities.some((m: string) => (opportunity.modality || '').toLowerCase().includes(m.toLowerCase()))) {
    score += 20;
    reasons.push('Modalidade de contratação preferencial.');
  }

  const value = Number(opportunity.estimated_value || 0);
  const minTicket = Number(profile.min_ticket || 0);
  const maxTicket = Number(profile.max_ticket || 0);
  if (value > 0 && minTicket > 0 && maxTicket > 0) {
    if (value >= minTicket && value <= maxTicket) {
      score += 20;
      reasons.push('Valor estimado dentro da faixa de ticket ideal.');
    } else if (value > maxTicket) {
      reasons.push('Valor acima do ticket máximo definido.');
    }
  }

  const positiveKeywords: string[] = (profile.positive_keywords || '')
    .split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
  const titleDesc = `${opportunity.title || ''} ${opportunity.description || ''}`.toLowerCase();
  const foundPositive = positiveKeywords.filter((k: string) => titleDesc.includes(k));
  if (foundPositive.length > 0) {
    score += 20;
    reasons.push(`Contém termos de interesse: ${foundPositive.join(', ')}.`);
  }

  const negativeKeywords: string[] = (profile.negative_keywords || '')
    .split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
  const foundNegative = negativeKeywords.filter((k: string) => titleDesc.includes(k));
  if (foundNegative.length > 0) {
    score -= 20;
    reasons.push(`Contém termos evitados: ${foundNegative.join(', ')}.`);
  }

  const preferredBuyers: string[] = (profile.preferred_buyers || '')
    .split(',').map((b: string) => b.trim().toLowerCase()).filter(Boolean);
  const organName = (opportunity.organ_name || '').toLowerCase();
  if (preferredBuyers.some((b: string) => organName.includes(b))) {
    score += 15;
    reasons.push('Órgão comprador classificado como prioritário.');
  }

  const excludedBuyers: string[] = (profile.excluded_buyers || '')
    .split(',').map((b: string) => b.trim().toLowerCase()).filter(Boolean);
  if (excludedBuyers.some((b: string) => organName.includes(b))) {
    score -= 30;
    reasons.push('Órgão comprador na lista de exclusão.');
  }

  const targetCategories: string[] = (profile.target_categories || '')
    .split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean);
  const foundCategories = targetCategories.filter((c: string) => titleDesc.includes(c));
  if (foundCategories.length > 0) {
    score += 10;
    reasons.push(`Categoria de interesse identificada: ${foundCategories.join(', ')}.`);
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const reason = reasons.length > 0
    ? reasons.join(' ')
    : 'Baixa correlação detectada com o perfil estratégico.';

  return { score: finalScore, reason };
}

async function recalculateAndNotify(companyId: string): Promise<{ updated: number; total: number; alerts: number }> {
  const { data: profile, error: profileError } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (profileError || !profile) {
    console.log(`Perfil estratégico não encontrado para company_id ${companyId}`);
    return { updated: 0, total: 0, alerts: 0 };
  }

  const { data: companyUsers } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('company_id', companyId)
    .in('role', ['user', 'admin']);

  const users = companyUsers || [];

  // Oportunidades são globais — sem filtro por company_id
  const { data: opportunities, error: oppsError } = await supabase
    .from('opportunities')
    .select('id, title, description, organ_name, modality, state, estimated_value, official_url, opening_date');

  if (oppsError || !opportunities) {
    console.error('Erro ao buscar oportunidades para recálculo:', oppsError);
    return { updated: 0, total: 0, alerts: 0 };
  }

  let updated = 0;
  let alerts = 0;
  const highScoreOpps: any[] = [];

  for (const opp of opportunities) {
    const { score, reason } = calculateScore(opp, profile);

    const { error } = await supabase
      .from('opportunities')
      .update({ match_score: score, match_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', opp.id);

    if (!error) {
      updated++;

      if (score >= ALERT_SCORE_THRESHOLD && users.length > 0) {
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('opportunity_id', opp.id)
          .eq('company_id', companyId)
          .maybeSingle();

        if (!existingNotif) {
          for (const user of users) {
            await supabase.from('notifications').insert({
              company_id: companyId,
              user_id: user.id,
              type: 'high_match_opportunity',
              title: `🎯 Oportunidade com ${score}% de aderência detectada`,
              message: `${opp.title} — ${opp.organ_name}. ${reason}`,
              opportunity_id: opp.id,
              read: false,
            });
          }
          highScoreOpps.push({ ...opp, score, reason });
          alerts++;
        }
      }
    }
  }

  if (highScoreOpps.length > 0 && users.length > 0) {
    const oppsList = highScoreOpps.map(opp => `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="color:#111827;font-size:14px;">${opp.title}</strong>
          <span style="background:#dcfce7;color:#166534;font-weight:700;font-size:12px;padding:2px 8px;border-radius:999px;">${opp.score}% Match</span>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">${opp.organ_name}</p>
        <div style="display:flex;gap:16px;margin-bottom:8px;">
          <span style="font-size:12px;color:#6b7280;">💰 ${opp.estimated_value ? formatCurrency(opp.estimated_value) : 'Valor não informado'}</span>
          <span style="font-size:12px;color:#6b7280;">📅 Abertura: ${opp.opening_date ? new Date(opp.opening_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
        </div>
        <p style="font-size:12px;color:#4b5563;font-style:italic;margin:0 0 8px;">${opp.reason}</p>
        ${opp.official_url ? `<a href="${opp.official_url}" style="color:#0f49bd;font-size:13px;font-weight:700;">Ver edital →</a>` : ''}
      </div>
    `).join('');

    const emailAddresses = users.map((u: any) => u.email).filter(Boolean);

    if (emailAddresses.length > 0) {
      await resend.emails.send({
        from: 'CM Pro <onboarding@resend.dev>',
        to: emailAddresses,
        subject: `🎯 ${highScoreOpps.length} nova(s) oportunidade(s) com alta aderência detectada(s)`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#0f49bd;padding:24px;border-radius:12px;margin-bottom:24px;">
              <h1 style="color:white;margin:0;font-size:20px;">CM Pro</h1>
              <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Alerta de Oportunidades com Alta Aderência</p>
            </div>
            <p style="color:#374151;font-size:15px;">
              O sistema identificou <strong>${highScoreOpps.length} oportunidade(s)</strong> com score acima de ${ALERT_SCORE_THRESHOLD}% de aderência ao seu perfil estratégico.
            </p>
            ${oppsList}
            <div style="margin-top:24px;padding:16px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;">
              <p style="margin:0;font-size:13px;color:#0369a1;">
                💡 Acesse a plataforma para ver todas as oportunidades e tomar as próximas ações comerciais.
              </p>
            </div>
            <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">
              CM Pro — Plataforma B2G · Este e-mail foi gerado automaticamente após a sincronização com o PNCP.
            </p>
          </div>
        `,
      });
    }
  }

  return { updated, total: opportunities.length, alerts };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('status', 'active');

    if (companiesError || !companies || companies.length === 0) {
      return NextResponse.json({ ok: false, error: 'Nenhuma empresa ativa encontrada.' }, { status: 400 });
    }

    const companyResults: any[] = [];
    let totalAlerts = 0;

    for (const company of companies) {
      try {
        const scoreResult = await recalculateAndNotify(company.id);
        totalAlerts += scoreResult.alerts;
        companyResults.push({
          company_id: company.id,
          company_name: company.name,
          alertas: scoreResult.alerts,
        });
      } catch (err) {
        console.error(`Erro ao recalcular scores para empresa ${company.id}:`, err);
        companyResults.push({
          company_id: company.id,
          company_name: company.name,
          erro: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      total_empresas: companies.length,
      total_alertas: totalAlerts,
      por_empresa: companyResults,
    });

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
