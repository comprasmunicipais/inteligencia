export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
        {
          ok: false,
          error: 'Erro ao consultar controle de sincronização',
          detail: lastSyncError.message,
        },
        { status: 500 }
      );
    }

    const now = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 1);

    const dataInicialDate = lastSyncData?.last_sync
      ? new Date(lastSyncData.last_sync)
      : defaultStart;

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
      headers: {
        Accept: 'application/json',
      },
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

    const errors: Array<{
      external_id: string;
      message: string;
      details: string | null;
      hint: string | null;
    }> = [];

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
          errors.push({
            external_id: externalIdString,
            message: municipalitySearchError.message,
            details: municipalitySearchError.details,
            hint: municipalitySearchError.hint,
          });
          continue;
        }

        const normalizedCity = normalizeText(city);

        const matchedMunicipality = (municipalities || []).find(
          (municipality) =>
            normalizeText(municipality.city) === normalizedCity &&
            normalizeText(municipality.state) === normalizeText(state)
        );

        municipalityId = matchedMunicipality?.id ?? null;
      }

      const oportunidade = {
        company_id: 'a14d818e-ea64-4e3f-b1e5-d28dae7bfbc3',
        external_id: externalIdString,
        source: 'PNCP',
        title: item.objetoCompra || 'Objeto não informado',
        description: item.objetoCompra || null,
        organ_name: item.orgaoEntidade?.razaoSocial || 'Órgão não informado',
        city,
        state,
        municipality_name:
          city && state
            ? `${city} (${state})`
            : null,
        municipality_id: municipalityId,
        modality: item.modalidadeNome || 'Pregão Eletrônico',
        situation: item.situacaoCompraNome || 'Publicada',
        publication_date: item.dataPublicacaoPncp || null,
        opening_date: item.dataAberturaProposta || null,
        estimated_value: item.valorTotalEstimado || null,
        official_url:
          item.linkSistemaOrigem ||
          (item.numeroControlePNCP
            ? `https://pncp.gov.br/app/editais/${item.numeroControlePNCP}`
            : null),
        sync_hash: externalIdString,
        match_score: 0,
        match_reason: municipalityId
          ? 'Importado automaticamente do PNCP e vinculado ao município'
          : 'Importado automaticamente do PNCP',
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
        errors.push({
          external_id: externalIdString,
          message: existingError.message,
          details: existingError.details,
          hint: existingError.hint,
        });
        continue;
      }

      const { error } = await supabase
        .from('opportunities')
        .upsert(oportunidade, { onConflict: 'external_id' });

      if (error) {
        errors.push({
          external_id: externalIdString,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
      } else {
        if (existingRecord) {
          updated++;
        } else {
          inserted++;
        }
      }
    }

    const { error: syncControlError } = await supabase
      .from('sync_control')
      .upsert(
        {
          source: 'PNCP',
          last_sync: new Date().toISOString(),
        },
        { onConflict: 'source' }
      );

    if (syncControlError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Erro ao salvar controle de sincronização',
          detail: syncControlError.message,
        },
        { status: 500 }
      );
    }

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
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
