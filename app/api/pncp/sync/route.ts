import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const dataInicial = '2026-03-01';
    const dataFinal = '2026-03-31';

    const url =
      `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao` +
      `?pagina=1&tamanhoPagina=20&dataInicial=${dataInicial}&dataFinal=${dataFinal}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const rawText = await response.text();

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      url,
      body_preview: rawText.slice(0, 3000),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erro ao testar API do PNCP.',
        detail: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
