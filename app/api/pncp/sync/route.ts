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
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const json = await response.json();
    const items = json?.data || [];

    let inserted = 0;

    for (const item of items) {
      const { error } = await supabase
        .from('pncp_contratacoes')
        .upsert({
          numero_controle: item.numeroControlePNCP,
          orgao: item.orgaoEntidade?.razaoSocial,
          objeto: item.objetoCompra,
          municipio: item.unidadeOrgao?.municipioNome,
          uf: item.unidadeOrgao?.ufSigla,
          valor: item.valorTotalEstimado,
          data_publicacao: item.dataPublicacaoPncp,
          raw: item,
        }, {
          onConflict: 'numero_controle'
        });

      if (!error) inserted++;
    }

    return NextResponse.json({
      ok: true,
      total_recebidos: items.length,
      inseridos: inserted,
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
