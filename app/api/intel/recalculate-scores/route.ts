export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const DEMO_COMPANY_ID = 'e4b60595-2a42-4c2a-aa61-ebfb52cfb50d';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const AMBIGUOUS_POSITIVE_TERMS = new Set([
  'suporte',
  'servico',
  'servicos',
  'manutencao',
  'consultoria',
  'infraestrutura',
]);

const TI_CONTEXT_TERMS = [
  'software',
  'sistema',
  'sistemas',
  'tecnologia',
  'ti',
  'informatica',
  'licenca',
  'licenciamento',
  'desenvolvimento',
  'aplicacao',
  'aplicacoes',
  'saas',
  'plataforma',
  'cloud',
  'dados',
  'rede',
  'redes',
];

const NON_TI_CONTEXT_TERMS = [
  'evento',
  'eventos',
  'montagem',
  'desmontagem',
  'palco',
  'estrutura',
  'iluminacao',
  'sonorizacao',
  'locacao de infraestrutura para eventos',
];

const partialMatch = (text: string, term: string): boolean => {
  if (!term || term.length < 3) return false;
  if (text.includes(term)) return true;
  if (term.includes(' ')) return false;
  if (term.length >= 6) {
    const stem = term.slice(0, Math.floor(term.length * 0.85));
    return text.includes(stem);
  }
  return false;
};

const hasAnyTerm = (text: string, terms: string[]): boolean => {
  return terms.some((term) => text.includes(term));
};

function truncateItemExample(value: string, maxLength = 80): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3).trim()}...`;
}

function calculateScore(opportunity: any, profile: any): { score: number; reason: string } {
  const baseText = normalize(`${opportunity.title || ''} ${opportunity.description || ''}`);
  const itemsText = normalize(opportunity.items_text || '');
  const combinedText = normalize(`${baseText} ${itemsText}`);
  const itemsOriginals: string[] = Array.isArray(opportunity.items_originals)
    ? opportunity.items_originals.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const normalizedItems = itemsOriginals.map((item) => ({
    original: item,
    normalized: normalize(item),
  }));

  // Gate de produto obrigatório
  const targetCategories: string[] = (profile.target_categories || '')
    .split(',')
    .map((c: string) => normalize(c.trim()))
    .filter(Boolean);

  const positiveKeywords: string[] = (profile.positive_keywords || '')
    .split(',')
    .map((k: string) => normalize(k.trim()))
    .filter(Boolean);

  const isTechnologyProfile = [...targetCategories, ...positiveKeywords].some((term) =>
    hasAnyTerm(term, TI_CONTEXT_TERMS)
  );
  const hasTechnologyContext = hasAnyTerm(combinedText, TI_CONTEXT_TERMS);
  const foundNonTIContext = isTechnologyProfile
    ? NON_TI_CONTEXT_TERMS.filter((term) => partialMatch(combinedText, term))
    : [];

  const categoryHit = targetCategories.some((c) => partialMatch(combinedText, c));
  const keywordHit = positiveKeywords.some((k) => partialMatch(combinedText, k));

  if (!categoryHit && !keywordHit) {
    return { score: 0, reason: 'Produto/segmento da empresa não identificado na licitação.' };
  }

  let score = 0;
  const reasons: string[] = [];

  // 1. Categorias PNCP (+50)
  const foundCategories = targetCategories.filter((c) => partialMatch(combinedText, c));
  if (foundCategories.length > 0) {
    score += 30;
    reasons.push(`Categoria de interesse identificada: ${foundCategories.join(', ')}.`);
  }

  // 2. Keywords positivas (+20)
  const foundPositive = positiveKeywords.filter((k) => partialMatch(combinedText, k));
  const foundSpecificPositive = foundPositive.filter((k) => !AMBIGUOUS_POSITIVE_TERMS.has(k));
  const foundAmbiguousPositive = foundPositive.filter((k) => AMBIGUOUS_POSITIVE_TERMS.has(k));

  if (foundSpecificPositive.length > 0) {
    score += 20;
    reasons.push(`Contém termos de interesse: ${foundSpecificPositive.join(', ')}.`);
  }

  if (foundAmbiguousPositive.length > 0 && hasTechnologyContext) {
    score += 8;
    reasons.push(`Contém termos de interesse em contexto compatível: ${foundAmbiguousPositive.join(', ')}.`);
  }

  const foundItemCategories = targetCategories.filter((c) => partialMatch(itemsText, c));
  const foundItemPositive = positiveKeywords.filter((k) => partialMatch(itemsText, k));
  const matchedItemTerms = [...foundItemCategories, ...foundItemPositive];
  if (matchedItemTerms.length > 0 && normalizedItems.length > 0) {
    const matchedItemExamples = normalizedItems
      .filter((item) => matchedItemTerms.some((term) => partialMatch(item.normalized, term)))
      .map((item) => truncateItemExample(item.original))
      .filter((item, index, array) => array.indexOf(item) === index)
      .slice(0, 3);

    if (matchedItemExamples.length > 0) {
      reasons.push(`Itens identificados na licitação: ${matchedItemExamples.join(', ')}.`);
    }
  }

  // 3. Estado prioritário (+15)
  const targetStates: string[] = profile.target_states || [];
  if (targetStates.includes(opportunity.state) || targetStates.includes('Nacional')) {
    score += 15;
    reasons.push('Localização estratégica (Estado alvo).');
  }

  // 4. Modalidade (+10)
  const targetModalities: string[] = profile.target_modalities || [];
  if (targetModalities.some((m: string) => normalize(opportunity.modality || '').includes(normalize(m)))) {
    score += 10;
    reasons.push('Modalidade de contratação preferencial.');
  }

  // 5. Ticket no range (+10)
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

  // 6. Órgão prioritário (+10)
  const preferredBuyers: string[] = (profile.preferred_buyers || '')
    .split(',')
    .map((b: string) => normalize(b.trim()))
    .filter(Boolean);

  const organName = normalize(opportunity.organ_name || '');
  if (preferredBuyers.some((b) => organName.includes(b))) {
    score += 10;
    reasons.push('Órgão comprador classificado como prioritário.');
  }

  // 7. Keywords negativas (-20)
  const negativeKeywords: string[] = (profile.negative_keywords || '')
    .split(',')
    .map((k: string) => normalize(k.trim()))
    .filter(Boolean);

  const foundNegative = negativeKeywords.filter((k) => partialMatch(combinedText, k));
  if (foundNegative.length > 0) {
    score -= 20;
    reasons.push(`Contém termos evitados: ${foundNegative.join(', ')}.`);
  }

  if (foundNonTIContext.length > 0) {
    score -= 15;
    reasons.push(`Contexto com baixa aderência ao perfil de TI: ${foundNonTIContext.join(', ')}.`);
  }

  // 8. Órgão excluído (-30)
  const excludedBuyers: string[] = (profile.excluded_buyers || '')
    .split(',')
    .map((b: string) => normalize(b.trim()))
    .filter(Boolean);

  if (excludedBuyers.some((b) => organName.includes(b))) {
    score -= 30;
    reasons.push('Órgão comprador na lista de exclusão.');
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
    const adminSupabase = await createAdminClient();

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

    if (company_id !== DEMO_COMPANY_ID && userProfile.company_id !== company_id) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Buscar perfil da empresa
    const { data: profile, error: profileError } = await adminSupabase
      .from('company_profiles')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil estratégico não encontrado.' }, { status: 404 });
    }

    // Buscar todas as oportunidades globais (company_id nullable desde 2026-03-31)
    const { data: opportunities, error: oppsError } = await adminSupabase
      .from('opportunities')
      .select('id, title, description, organ_name, modality, state, estimated_value');

    if (oppsError) {
      return NextResponse.json({ error: oppsError.message }, { status: 500 });
    }

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: 'Nenhuma oportunidade encontrada.' });
    }

    const opportunityIds = opportunities.map((opp) => opp.id);
    const ITEMS_CHUNK_SIZE = 500;
    const allItems: { opportunity_id: string; item_original: string }[] = [];

    for (let i = 0; i < opportunityIds.length; i += ITEMS_CHUNK_SIZE) {
      const chunk = opportunityIds.slice(i, i + ITEMS_CHUNK_SIZE);
      const { data, error } = await adminSupabase
        .from('opportunity_items')
        .select('opportunity_id, item_original')
        .in('opportunity_id', chunk);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (data) allItems.push(...data);
    }

    const itemsTextByOpportunityId = new Map<string, string>();
    const itemsOriginalsByOpportunityId = new Map<string, string[]>();
    for (const item of allItems || []) {
      const currentText = itemsTextByOpportunityId.get(item.opportunity_id) || '';
      const nextText = [currentText, item.item_original || ''].filter(Boolean).join(' ').trim();
      itemsTextByOpportunityId.set(item.opportunity_id, nextText);
      const currentItems = itemsOriginalsByOpportunityId.get(item.opportunity_id) || [];
      if (item.item_original) {
        currentItems.push(item.item_original);
      }
      itemsOriginalsByOpportunityId.set(item.opportunity_id, currentItems);
    }

    // Calcular scores em paralelo por batch de 50
    const BATCH_SIZE = 50;
    const results: { opportunity_id: string; match_score: number; match_reason: string }[] = [];

    for (let i = 0; i < opportunities.length; i += BATCH_SIZE) {
      const batch = opportunities.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (opp) => {
          const { score, reason } = calculateScore(
            {
              ...opp,
              items_text: itemsTextByOpportunityId.get(opp.id) || '',
              items_originals: itemsOriginalsByOpportunityId.get(opp.id) || [],
            },
            profile
          );
          return { opportunity_id: opp.id, match_score: score, match_reason: reason };
        })
      );
      results.push(...batchResults);
    }

    // Upsert único em lote
    const upsertData = results.map(r => ({
      company_id: company_id,
      opportunity_id: r.opportunity_id,
      match_score: r.match_score,
      match_reason: r.match_reason,
      updated_at: new Date().toISOString(),
    }));

    const UPSERT_CHUNK_SIZE = 300;
    for (let i = 0; i < upsertData.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = upsertData.slice(i, i + UPSERT_CHUNK_SIZE);
      const { error: upsertError } = await adminSupabase
        .from('company_opportunity_scores')
        .upsert(chunk, { onConflict: 'company_id,opportunity_id' });
      if (upsertError) throw upsertError;
    }

    return NextResponse.json({
      ok: true,
      updated: results.length,
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
