export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMPANY_ID = 'a14d818e-ea64-4e3f-b1e5-d28dae7bfbc3';

function formatDateToPNCP(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function normalizeText(value: string | null | undefined) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function calculateScore(opportunity: any, profile: any): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Estado (+25)
  const targetStates: string[] = profile.target_states || [];
  if (targetStates.includes(opportunity.state) || targetStates.includes('Nacional')) {
    score += 25;
    reasons.push('Localização estratégica (Estado alvo).');
  }

  // 2. Modalidade (+20)
  const targetModalities: string[] = profile.target_modalities || [];
  if (targetModalities.some((m: string) => (opportunity.modality || '').toLowerCase().includes(m.toLowerCase()))) {
    score += 20;
    reasons.push('Modalidade de contratação preferencial.');
  }

  // 3. Valor dentro do ticket (+20)
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

  // 4. Palavras-chave positivas (+20)
  const positiveKeywords: string[] = (profile.positive_keywords || '')
    .split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
  const titleDesc = `${opportunity.title || ''} ${opportunity.description || ''}`.toLowerCase();
  const foundPositive = positiveKeywords.filter((k: string) => titleDesc.includes(k));
  if (foundPositive.length > 0) {
    score += 20;
    reasons.push(`Contém termos de interesse: ${foundPositive.join(', ')}.`);
  }

  // 5. Palavras-chave negativas (-20)
  const negativeKeywords: string[] = (profile.negative_keywords || '')
    .split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
  const foundNegative = negativeKeywords.filter((k: string) => titleDesc.includes(k));
  if (foundNegative.length > 0) {
    score -= 20;
    reasons.push(`Contém termos evitados: ${foundNegative.join(', ')}.`);
  }

  // 6. Órgãos prioritários (+15)
  const preferredBuyers: string[] = (profile.preferred_buyers || '')
    .split(',').map((b: string) => b.trim().toLowerCase()).filter(Boolean);
  const organName = (opportunity.organ_name || '').toLowerCase();
  if (preferredBuyers.some((b: string) => organName.includes(b))) {
    score += 15;
    reasons.push('Órgão comprador classificado como prioritário.');
  }

  // 7. Órgãos excluídos (-30)
  const excludedBuyers: string[] = (profile.excluded_buyers || '')
    .split(',').map((b: string) => b.trim().toLowerCase()).filter(Boolean);
  if (excludedBuyers.some((b: string) => organName.includes(b))) {
    score -= 30;
    reasons.push('Órgão comprador na lista de exclusão.');
  }

  // 8. Categorias PNCP (+10)
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

async function recalculateScores(): Promise<{ updated: number; total: number }> {
  // Buscar perfil da empresa
  const { data: profile, error: profileError } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .single();

  if (profileError || !profile) {
    console.log('Perfil estratégico não encontrado — score não recalculado.');
    return { updated: 0, total: 0 };
  }

  const { data: opportunities, error: oppsError } = await supabase
    .from('opportunities')
    .select('id, title, description, organ_name, modality, state, estimated_value')
    .eq('company_id', COMPANY_ID);

  if (oppsError || !opportunities) {
    console.error('Erro ao buscar oportunidades para recálculo:', oppsError);
    return { updated: 0, total: 0 };
  }

  let updated = 0;
  for (const opp of opportunities) {
    const { score, reason } = calculateScore(opp, profile);
    const { error } = await supabase
      .from('opportunities')
      .update({ match_score: score, match_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', opp.id);
    if (!error) updated++;
  }

  return { updated, total: opportunities.length };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: lastSyncData, error: lastSyncError } = await supabase
      .from('sync_control')
      .select('last_sync')
      .eq('source', 'PNCP')
      .maybeSingle();

    if (lastSyncError) {
      return NextResponse.json(
        { ok: false, error: 'Erro ao consultar controle de sincronização', detail: lastSyncError.message },
        { status: 500 }
      );
    }

    const now = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 1);

    const dataInicialDate = lastSyncData?.last_sync ? new Date(lastSyncData.last_sync) : defaultStart;
    const dataFinalDate = now;

    const params = new URLSearchParams({
      pagina: '1',
      tamanhoPagina: '20',
      dataInicial: formatDateToPNCP(dataInicialDate),
      dataFinal: formatDateToPNCP(dataFinalDate),
      codigoModalidadeContratacao: '6',
    });

    const pncpUrl = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?${params.toString()}`;

    const response = await fetch(pncpUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        ok: false,
        error: 'Erro ao buscar PNCP',
        status: response.status,
        detail: errorText,
        url: pncpUrl,
      });
    }

    const json = await response.json();
    const items = json?.data || [];

    let inserted = 0;
    let updated = 0;
    const errors: Array<{ external_id: string; message: string; details: string | null; hint: string | null }> = [];

    for (const item of items) {
      const externalId =
        item.numeroControlePNCP ||
        `${item.anoCompra || ''}-${item.sequencialCompra || ''}-${item.orgaoEntidade?.cnpj || ''}`;

      const externalIdString = String(externalId);
      const city = item.unidadeOrgao?.municipioNome || null;
      const state = item.unidadeOrgao?.ufSigla || null;

      let municipalityId: string | null = null;

      if (city && state) {
        const { data: municipalities, error: municipalitySearchError } = await supabase
          .from('municipalities')
          .select('id, city, state')
          .eq('state', state);

        if (municipalitySearchError) {
          errors.push({ external_id: externalIdString, message: municipalitySearchError.message, details: municipalitySearchError.details, hint: municipalitySearchError.hint });
          continue;
        }

        const normalizedCity = normalizeText(city);
        const matchedMunicipality = (municipalities || []).find(
          (m) => normalizeText(m.city) === normalizedCity && normalizeText(m.state) === normalizeText(state)
        );
        municipalityId = matchedMunicipality?.id ?? null;
      }

      const oportunidade = {
        company_id: COMPANY_ID,
        external_id: externalIdString,
        source: 'PNCP',
        title: item.objetoCompra || 'Objeto não informado',
        description: item.objetoCompra || null,
        organ_name: item.orgaoEntidade?.razaoSocial || 'Órgão não informado',
        city,
        state,
        municipality_name: city && state ? `${city} (${state})` : null,
        municipality_id: municipalityId,
        modality: item.modalidadeNome || 'Pregão Eletrônico',
        situation: item.situacaoCompraNome || 'Publicada',
        publication_date: item.dataPublicacaoPncp || null,
        opening_date: item.dataAberturaProposta || null,
        estimated_value: item.valorTotalEstimado || null,
        official_url: item.linkSistemaOrigem || (item.numeroControlePNCP ? `https://pncp.gov.br/app/editais/${item.numeroControlePNCP}` : null),
        sync_hash: externalIdString,
        match_score: 0,
        match_reason: municipalityId ? 'Importado automaticamente do PNCP e vinculado ao município' : 'Importado automaticamente do PNCP',
        internal_status: 'new',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: existingRecord, error: existingError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('external_id', externalIdString)
        .maybeSingle();

      if (existingError) {
        errors.push({ external_id: externalIdString, message: existingError.message, details: existingError.details, hint: existingError.hint });
        continue;
      }

      const { error } = await supabase
        .from('opportunities')
        .upsert(oportunidade, { onConflict: 'external_id' });

      if (error) {
        errors.push({ external_id: externalIdString, message: error.message, details: error.details, hint: error.hint });
      } else {
        if (existingRecord) updated++;
        else inserted++;
      }
    }

    // Salvar controle de sincronização
    const { error: syncControlError } = await supabase
      .from('sync_control')
      .upsert({ source: 'PNCP', last_sync: new Date().toISOString() }, { onConflict: 'source' });

    if (syncControlError) {
      return NextResponse.json(
        { ok: false, error: 'Erro ao salvar controle de sincronização', detail: syncControlError.message },
        { status: 500 }
      );
    }

    // Recalcular scores automaticamente após o sync
    const scoreResult = await recalculateScores();

    return NextResponse.json({
      ok: true,
      total_recebidos: items.length,
      inseridos: inserted,
      atualizados: updated,
      total_erros: errors.length,
      primeiro_erro: errors[0] || null,
      sincronizado_em: new Date().toISOString(),
      janela_consultada: {
        data_inicial: formatDateToPNCP(dataInicialDate),
        data_final: formatDateToPNCP(dataFinalDate),
      },
      score_recalculo: {
        atualizado: scoreResult.updated,
        total: scoreResult.total,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
