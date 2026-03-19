export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const dataInicial = '20260301';
    const dataFinal = '20260331';
    const codigoModalidadeContratacao = '6';

    const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${dataInicial}&dataFinal=${dataFinal}&codigoModalidadeContratacao=${codigoModalidadeContratacao}`;

    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        error: 'Erro ao buscar PNCP',
        status: response.status,
      });
    }

    const data = await response.json();

    return NextResponse.json({
      ok: true,
      total: data?.data?.length || 0,
      sample: data?.data?.slice(0, 3) || [],
    });

  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    });
  }
}
