export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  console.log('TOKEN_LENGTH:', token?.length, 'SECRET_LENGTH:', process.env.CRON_SECRET?.length);

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const items: any[] = Array.isArray(body) ? body : body?.items;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Body deve ser um array ou { items: [] }' }, { status: 400 });
    }

    const municipalityCache = new Map<string, any[]>();
    const { inserted, errors } = await syncOpportunities(items, municipalityCache);

    return NextResponse.json({ ok: true, inserted, errors });

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
