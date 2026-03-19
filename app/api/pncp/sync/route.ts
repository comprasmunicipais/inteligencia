import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const dataInicial = '20260301';
    const dataFinal = '20260331';
    const codigoModalidadeContratacao = '6';

    const url =
      `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao` +
      `?pagina=1&tamanhoPagina=20` +
      `&dataInicial=${dataInicial}` +
      `&dataFinal=${dataFinal}` +
      `&codigoModalidadeContratacao=${codigoModalidadeContratacao}`;

    const response = await fetch(url);
    const json = await response.json();

    const items = json.data || [];

    let inserted = 0;

    for (const item of items) {
      const oportunidade = {
        company_id: 'a14d818e-ea64-4e3f-b1e5-d28dae7bfbc3', // seu ID

        title: item.objetoCompra,
        description: item.objetoCompra,

        organ_name: item.orgaoEntidade?.razaoSocial || null,

        modality: item.modalidadeNome || 'Pregão',
        situation: 'publicada',

        city: item.unidadeOrgao?.municipioNome || null,
        state: item.unidadeOrgao?.ufSigla || null,

        estimated_value: item.valorTotalEstimado || null,

        opening_date: item.dataAberturaProposta || null,
        publication_date: item.dataPublicacaoPncp || null,

        official_url:
          item.linkSistemaOrigem ||
          `https://pncp.gov.br/app/editais/${item.numeroControlePNCP}`,

        match_score: 0,
        match_reason: 'Importado do PNCP',

        internal_status: 'nova'
      };

      const { error } = await supabase
        .from('opportunities')
        .insert(oportunidade);

      if (!error) inserted++;
    }

    return NextResponse.json({
      success: true,
      total_recebidos: items.length,
      inseridos: inserted
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erro ao sincronizar PNCP',
        detail: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
