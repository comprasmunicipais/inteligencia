export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_MODALITIES = [6, 8, 1]; // Pregão Eletrônico, Dispensa, Concorrência
const MAX_PAGES = 1;
const PAGE_SIZE = 100;

function formatDateToPNCP(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function isOrgaoMunicipal(organName: string): boolean {
  const upper = organName.toUpperCase();
  if (upper.includes('ESTADUAL') || upper.includes('GOVERNO DO ESTADO') ||
      upper.includes('TRIBUNAL') || upper.includes('DETRAN') ||
      upper.includes('SUBSECRETARIA') || upper.includes('SECRETARIA DE ESTADO') ||
      upper.includes('ASSEMBLEIA') || upper.includes('POLICIA') ||
      upper.includes('BOMBEIRO') || upper.includes('UNIVERSIDADE ESTADUAL')) return false;
  if (upper.includes('FEDERAL') || upper.includes('MINISTERIO') ||
      upper.includes('EXERCITO') || upper.includes('MARINHA') ||
      upper.includes('AERONAUTICA') || upper.includes('SENADO') ||
      upper.includes('CAMARA DOS DEPUTADOS') || upper.includes('CORREIOS') ||
      upper.includes('BANCO DO BRASIL') || upper.includes('PETROBRAS')) return false;
  if (upper.includes('CONSELHO REGIONAL') || upper.includes('CONSELHO FEDERAL')) return false;
  return true;
}

function normalizeText(value: string | null | undefined) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}


async function fetchPNCPPage(
  modalidade: number,
  pagina: number,
  dataInicial: string,
  dataFinal: string
): Promise<{ items: any[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    pagina: String(pagina),
    tamanhoPagina: String(PAGE_SIZE),
    dataInicial,
    dataFinal,
    codigoModalidadeContratacao: String(modalidade),
  });

  let response: Response;
  try {
    response = await fetch(
      `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?${params.toString()}`,
      { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(45000) }
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`PNCP modalidade ${modalidade} pág ${pagina}: timeout após 45s`);
      return { items: [], hasMore: false };
    }
    throw err;
  }

  if (!response.ok) {
    console.error(`PNCP modalidade ${modalidade} pág ${pagina}: HTTP ${response.status}`);
    return { items: [], hasMore: false };
  }

  const json = await response.json();
  const items: any[] = json?.data || [];
  // API retorna paginasRestantes quando há mais páginas
  const hasMore = items.length === PAGE_SIZE || (json?.paginasRestantes ?? 0) > 0;

  return { items, hasMore };
}

async function fetchAllPNCPItems(dataInicial: string, dataFinal: string, modalidade: number): Promise<{ items: any[]; byModalidade: Record<number, number> }> {
  // Mapa de deduplicação por numeroControlePNCP
  const seen = new Map<string, any>();
  const byModalidade: Record<number, number> = {};

  {
    let pagina = 1;
    let hasMore = true;
    let modalidadeCount = 0;

    while (hasMore && pagina <= MAX_PAGES) {
      const { items, hasMore: more } = await fetchPNCPPage(modalidade, pagina, dataInicial, dataFinal);

      for (const item of items) {
        const key =
          item.numeroControlePNCP ||
          `${item.anoCompra || ''}-${item.sequencialCompra || ''}-${item.orgaoEntidade?.cnpj || ''}`;
        if (!seen.has(key)) {
          seen.set(key, item);
          modalidadeCount++;
        }
      }

      hasMore = more;
      pagina++;
    }

    byModalidade[modalidade] = modalidadeCount;
  }

  return { items: Array.from(seen.values()), byModalidade };

}

async function syncOpportunities(
  items: any[],
  municipalityCache: Map<string, any[]>
): Promise<{ inserted: number; updated: number; errors: any[] }> {
  const oportunidades: any[] = [];

  for (const item of items) {
    const externalId =
      item.numeroControlePNCP ||
      `${item.anoCompra || ''}-${item.sequencialCompra || ''}-${item.orgaoEntidade?.cnpj || ''}`;

    const externalIdString = String(externalId);
    const city = item.unidadeOrgao?.municipioNome || null;
    const state = item.unidadeOrgao?.ufSigla || null;

    let municipalityId: string | null = null;

    const organName = item.orgaoEntidade?.razaoSocial || '';

    if (city && state && isOrgaoMunicipal(organName)) {
      const cacheKey = state;
      if (!municipalityCache.has(cacheKey)) {
        const { data: municipalities } = await supabase
          .from('municipalities')
          .select('id, city, state')
          .eq('state', state);
        municipalityCache.set(cacheKey, municipalities || []);
      }

      const municipalities = municipalityCache.get(cacheKey) || [];
      const normalizedCity = normalizeText(city);
      const matchedMunicipality = municipalities.find(
        (m: any) => normalizeText(m.city) === normalizedCity
      );
      municipalityId = matchedMunicipality?.id ?? null;
    }

    oportunidades.push({
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
      match_reason: municipalityId
        ? 'Importado automaticamente do PNCP e vinculado ao município'
        : 'Importado automaticamente do PNCP',
      internal_status: 'new',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (oportunidades.length === 0) return { inserted: 0, updated: 0, errors: [] };

  const { error } = await supabase
    .from('opportunities')
    .upsert(oportunidades, { onConflict: 'external_id' });

  if (error) {
    return { inserted: 0, updated: 0, errors: [{ message: error.message, details: error.details, hint: error.hint }] };
  }

  return { inserted: oportunidades.length, updated: 0, errors: [] };
}


export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const start = Date.now();

    // Arquivar oportunidades cujo prazo já passou
    await supabase
      .from('opportunities')
      .update({ internal_status: 'expired', updated_at: new Date().toISOString() })
      .lt('opening_date', new Date().toISOString())
      .neq('internal_status', 'expired');

    // Deletar oportunidades expiradas há mais de 30 dias
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('opportunities')
      .delete()
      .eq('internal_status', 'expired')
      .lt('opening_date', cutoff);

    // Parâmetros de query opcionais
    const requestUrl = new URL(request.url);
    const modalidadeParam = Number(requestUrl.searchParams.get('modalidade') || '6');
    const modalidade = VALID_MODALITIES.includes(modalidadeParam) ? modalidadeParam : 6;
    const queryDataInicial = requestUrl.searchParams.get('data_inicial');
    const queryDataFinal = requestUrl.searchParams.get('data_final');
    const usandoQueryParams = !!(queryDataInicial && queryDataFinal);

    const now = new Date();
    let dataInicial: string;
    let dataFinal: string;

    if (usandoQueryParams) {
      dataInicial = queryDataInicial!;
      dataFinal = queryDataFinal!;
    } else {
      // Janela de sincronização via sync_control
      const { data: lastSyncData } = await supabase
        .from('sync_control')
        .select('last_sync')
        .eq('source', 'PNCP')
        .maybeSingle();

      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 7);

      const dataInicialDate = lastSyncData?.last_sync ? new Date(lastSyncData.last_sync) : defaultStart;
      dataInicial = formatDateToPNCP(dataInicialDate);
      dataFinal = formatDateToPNCP(now);
    }

    // Buscar itens do PNCP para a modalidade selecionada
    console.log('FETCH_START', Date.now() - start, 'ms');
    const { items, byModalidade } = await fetchAllPNCPItems(dataInicial, dataFinal, modalidade);
    console.log('FETCH_END', Date.now() - start, 'ms');

    // Upsert global — sem company_id
    const municipalityCache = new Map<string, any[]>();
    console.log('SYNC_START', Date.now() - start, 'ms');
    const { inserted, updated, errors } = await syncOpportunities(items, municipalityCache);
    console.log('SYNC_END', Date.now() - start, 'ms');

    // Salvar controle de sincronização apenas se não foram passadas datas manuais
    console.log('CONTROL_START', Date.now() - start, 'ms');
    if (!usandoQueryParams) {
      await supabase
        .from('sync_control')
        .upsert({ source: 'PNCP', last_sync: now.toISOString() }, { onConflict: 'source' });
    }
    console.log('CONTROL_END', Date.now() - start, 'ms');

    return NextResponse.json({
      ok: true,
      total_recebidos: items.length,
      total_inseridos: inserted,
      total_atualizados: updated,
      total_erros: errors.length,
      sincronizado_em: now.toISOString(),
      janela_consultada: { data_inicial: dataInicial, data_final: dataFinal },
      por_modalidade: byModalidade,
    });

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
