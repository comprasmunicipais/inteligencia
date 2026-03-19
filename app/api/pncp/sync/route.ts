import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const response = await fetch(
      'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?pagina=1&tamanhoPagina=20',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PNCP fetch error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Erro ao consultar API do PNCP.' },
        { status: 500 }
      );
    }

    const json = await response.json();
    const registros = json?.data || json?.resultado || json || [];

    if (!Array.isArray(registros)) {
      console.error('Formato inesperado da resposta PNCP:', json);
      return NextResponse.json(
        { error: 'Formato inesperado da resposta do PNCP.' },
        { status: 500 }
      );
    }

    const mapped = registros.map((item: any) => {
      const externalId =
        item.numeroControlePNCP ||
        item.id ||
        `${item.sequencialCompra || ''}-${item.anoCompra || ''}-${item.orgaoEntidade?.cnpj || ''}`;

      const city =
        item.unidadeOrgao?.municipioNome ||
        item.municipioNome ||
        '';

      const state =
        item.unidadeOrgao?.ufSigla ||
        item.ufSigla ||
        '';

      return {
        company_id: 'a14d818e-ea64-4e3f-b1e5-d28dae7bfbc3',
        external_id: String(externalId || crypto.randomUUID()),
        source: 'PNCP',
        organ_name: item.orgaoEntidade?.razaoSocial || item.orgaoEntidade?.nomeFantasia || 'Órgão não informado',
        city,
        state,
        municipality_name: city && state ? `${city} (${state})` : city || state || null,
        title: item.objetoCompra || item.objeto || 'Objeto não informado',
        description: item.informacaoComplementar || item.objetoCompra || item.objeto || null,
        modality: item.modalidadeNome || item.modalidadeId || null,
        situation: item.situacaoCompraNome || item.situacao || 'Publicada',
        publication_date: item.dataPublicacaoPncp || null,
        opening_date: item.dataAberturaProposta || item.dataEncerramentoProposta || null,
        estimated_value: item.valorTotalEstimado || item.valorEstimado || 0,
        official_url: item.linkSistemaOrigem || item.linkProcessoEletronico || null,
        sync_hash: String(externalId || ''),
        match_score: 75,
        match_reason: 'Oportunidade importada automaticamente da base pública.',
        internal_status: 'new',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('opportunities')
      .upsert(mapped, { onConflict: 'external_id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json(
        { error: 'Erro ao salvar oportunidades no banco.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: mapped.length,
    });
  } catch (error) {
    console.error('Route error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao sincronizar PNCP.' },
      { status: 500 }
    );
  }
}
