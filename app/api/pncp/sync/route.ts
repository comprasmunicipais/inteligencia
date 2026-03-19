export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

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

    const data = await response.json();

    return NextResponse.json({
      ok: true,
      total: data?.data?.length || 0,
      sample: data?.data?.slice(0, 3) || [],
      url,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
