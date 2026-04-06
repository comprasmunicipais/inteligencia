export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function calculateScore(opportunity: any, profile: any): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Estado (+15)
  const targetStates: string[] = profile.target_states || [];
  if (targetStates.includes(opportunity.state) || targetStates.includes('Nacional')) {
    score += 15;
    reasons.push('Localização estratégica (Estado alvo).');
  }

  // 2. Modalidade (+15)
  const targetModalities: string[] = profile.target_modalities || [];
  if (targetModalities.some((m: string) => opportunity.modality?.toLowerCase().includes(m.toLowerCase()))) {
    score += 15;
    reasons.push('Modalidade de contratação preferencial.');
  }

  // 3. Valor dentro do ticket (+10)
  const value = Number(opportunity.estimated_value || 0);
  const minTicket = Number(profile.min_ticket || 0);
  const maxTicket = Number(profile.max_ticket || 0);
  if (value > 0 && minTicket > 0 && maxTicket > 0) {
    if (value >= minTicket && value <= maxTicket) {
      score += 10;
      reasons.push('Valor estimado dentro da faixa de ticket ideal.');
    } else if (value > maxTicket) {
      reasons.push('Valor acima do ticket máximo definido.');
    }
  }

  // 4. Palavras-chave positivas (+25)
  const positiveKeywords: string[] = (profile.positive_keywords || '')
    .split(',')
    .map((k: string) => k.trim().toLowerCase())
    .filter(Boolean);

  const titleDesc = `${opportunity.title || ''} ${opportunity.description || ''}`.toLowerCase();
  const foundPositive = positiveKeywords.filter((k: string) => titleDesc.includes(k));
  if (foundPositive.length > 0) {
    score += 25;
    reasons.push(`Contém termos de interesse: ${foundPositive.join(', ')}.`);
  }

  // 5. Palavras-chave negativas (-20)
  const negativeKeywords: string[] = (profile.negative_keywords || '')
    .split(',')
    .map((k: string) => k.trim().toLowerCase())
    .filter(Boolean);

  const foundNegative = negativeKeywords.filter((k: string) => titleDesc.includes(k));
  if (foundNegative.length > 0) {
    score -= 20;
    reasons.push(`Contém termos evitados: ${foundNegative.join(', ')}.`);
  }

  // 6. Órgãos prioritários (+10)
  const preferredBuyers: string[] = (profile.preferred_buyers || '')
    .split(',')
    .map((b: string) => b.trim().toLowerCase())
    .filter(Boolean);

  const organName = (opportunity.organ_name || '').toLowerCase();
  if (preferredBuyers.some((b: string) => organName.includes(b))) {
    score += 10;
    reasons.push('Órgão comprador classificado como prioritário.');
  }

  // 7. Órgãos excluídos (-30)
  const excludedBuyers: string[] = (profile.excluded_buyers || '')
    .split(',')
    .map((b: string) => b.trim().toLowerCase())
    .filter(Boolean);

  if (excludedBuyers.some((b: string) => organName.includes(b))) {
    score -= 30;
    reasons.push('Órgão comprador na lista de exclusão.');
  }

  // 8. Categorias PNCP (+35)
  const targetCategories: string[] = (profile.target_categories || '')
    .split(',')
    .map((c: string) => c.trim().toLowerCase())
    .filter(Boolean);

  const foundCategories = targetCategories.filter((c: string) => titleDesc.includes(c));
  if (foundCategories.length > 0) {
    score += 35;
    reasons.push(`Categoria de interesse identificada: ${foundCategories.join(', ')}.`);
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const reason = reasons.length > 0
    ? reasons.join(' ')
    : 'Baixa correlação detectada com o perfil estratégico.';

  return { score: finalScore, reason };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userProfileError || !userProfile?.company_id) {
      return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 403 });
    }

    const body = await request.json();
    const { company_id } = body;

    if (!company_id) {
      return NextResponse.json({ error: 'company_id obrigatório' }, { status: 400 });
    }

    if (userProfile.company_id !== company_id) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Buscar perfil da empresa
    const { data: profile, error: profileError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil estratégico não encontrado.' }, { status: 404 });
    }

    // Buscar todas as oportunidades globais (company_id nullable desde 2026-03-31)
    const { data: opportunities, error: oppsError } = await supabase
      .from('opportunities')
      .select('id, title, description, organ_name, modality, state, estimated_value');

    if (oppsError) {
      return NextResponse.json({ error: oppsError.message }, { status: 500 });
    }

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: 'Nenhuma oportunidade encontrada.' });
    }

    // Recalcular e salvar em lotes de 50
    let updated = 0;
    const batchSize = 50;

    for (let i = 0; i < opportunities.length; i += batchSize) {
      const batch = opportunities.slice(i, i + batchSize);

      for (const opp of batch) {
        const { score, reason } = calculateScore(opp, profile);

        const { error: updateError } = await supabase
          .from('opportunities')
          .update({
            match_score: score,
            match_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', opp.id);

        if (!updateError) updated++;
      }
    }

    return NextResponse.json({
      ok: true,
      updated,
      total: opportunities.length,
      recalculated_at: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
