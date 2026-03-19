export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const params = new URLSearchParams({
      pagina: '1',
      tamanhoPagina: '20',
      dataInicial: '20260301',
      dataFinal: '20260331',
      codigoModalidadeContratacao: '6',
    });

    const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?${params.toString()}`;

    const response = await fetch(url, {
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
        url,
      });
    }

    const json = await response.json();
    const items = json?.data || [];

    let inserted = 0;
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

      const oportunidade = {
        company_id: 'a14d818e-ea64-4e3f-b1e5-d28dae7bfbc3',
        external_id: String(externalId),
        source: 'PNCP',
        title: item.objetoCompra || 'Objeto não informado',
        description: item.objetoCompra || null,
        organ_name: item.orgaoEntidade?.razaoSocial || 'Órgão não informado',
        city: item.unidadeOrgao?.municipioNome || null,
        state: item.unidadeOrgao?.ufSigla || null,
        municipality_name:
          item.unidadeOrgao?.municipioNome && item.unidadeOrgao?.ufSigla
            ? `${item.unidadeOrgao.municipioNome} (${item.unidadeOrgao.ufSigla})`
            : null,
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
        sync_hash: String(externalId),
        match_score: 0,
        match_reason: 'Importado automaticamente do PNCP',
        internal_status: 'new',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('opportunities')
        .upsert(oportunidade, { onConflict: 'external_id' });

      if (error) {
        errors.push({
          external_id: String(externalId),
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
      } else {
        inserted++;
      }
    }

    return NextResponse.json({
      ok: true,
      total_recebidos: items.length,
      inseridos: inserted,
      total_erros: errors.length,
      primeiro_erro: errors[0] || null,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
