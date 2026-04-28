import { NextRequest } from 'next/server';

const COMPRAS_GOV_URL = 'https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial';

const ITEM_MAP: Record<string, { item: string; codigo: string }> = {
  papel: { item: 'papel A4', codigo: '150119' },
  caneta: { item: 'caneta esferografica azul', codigo: '233255' },
  toner: { item: 'toner impressora HP', codigo: '150422' },
  luva: { item: 'luva de procedimento', codigo: '269892' },
  mascara: { item: 'mascara descartavel', codigo: '341922' },
  alcool: { item: 'alcool 70', codigo: '383664' },
};

type ComprasGovRegistro = {
  precoUnitario?: number | string | null;
  preco?: number | string | null;
  valor?: number | string | null;
  dataResultado?: string | null;
  dataCompra?: string | null;
};

function parsePrice(registro: ComprasGovRegistro): number | null {
  const candidatos = [registro.precoUnitario, registro.preco, registro.valor];

  for (const candidato of candidatos) {
    const numero = typeof candidato === 'string' ? Number(candidato) : candidato;
    if (typeof numero === 'number' && Number.isFinite(numero)) {
      return numero;
    }
  }

  return null;
}

function parseDate(registro: ComprasGovRegistro): string | null {
  return registro.dataResultado || registro.dataCompra || null;
}

function mapItem(item: string) {
  const normalized = item.trim().toLowerCase();

  for (const [key, value] of Object.entries(ITEM_MAP)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  return null;
}

function buildComprasGovUrl(codigo: string) {
  const url = new URL(COMPRAS_GOV_URL);
  url.searchParams.set('codigoItemCatalogo', codigo);
  url.searchParams.set('pagina', '1');
  url.searchParams.set('tamanhoPagina', '10');
  return url.toString();
}

export async function GET(request: NextRequest) {
  const itemParam = request.nextUrl.searchParams.get('item');

  if (!itemParam) {
    return Response.json({ error: 'Parametro "item" e obrigatorio.' }, { status: 400 });
  }

  const mappedItem = mapItem(itemParam);

  if (!mappedItem) {
    return Response.json({ error: `Item nao mapeado para teste: ${itemParam}` }, { status: 400 });
  }

  try {
    const response = await fetch(buildComprasGovUrl(mappedItem.codigo), {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Compras.gov retornou HTTP ${response.status}`);
    }

    const payload = (await response.json()) as { resultado?: ComprasGovRegistro[] };
    const registros = Array.isArray(payload.resultado) ? payload.resultado : [];
    const precos = registros
      .map((registro) => parsePrice(registro))
      .filter((preco): preco is number => preco !== null);

    const precoMin = precos.length > 0 ? Math.min(...precos) : null;
    const precoMax = precos.length > 0 ? Math.max(...precos) : null;
    const precoMedio =
      precos.length > 0 ? Number((precos.reduce((soma, preco) => soma + preco, 0) / precos.length).toFixed(2)) : null;

    let dataMaisRecente: string | null = null;
    let ultimoPreco: number | null = null;

    for (const registro of registros) {
      const data = parseDate(registro);
      const preco = parsePrice(registro);

      if (!data) continue;

      if (!dataMaisRecente || new Date(data).getTime() > new Date(dataMaisRecente).getTime()) {
        dataMaisRecente = data;
        ultimoPreco = preco;
      }
    }

    return Response.json({
      item: mappedItem.item,
      quantidade_resultados: registros.length,
      preco_min: precoMin,
      preco_max: precoMax,
      preco_medio: precoMedio,
      ultimo_preco: ultimoPreco,
      data_mais_recente: dataMaisRecente,
      fonte: 'compras_gov',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida ao consultar o Compras.gov.';
    return Response.json({ error: `Falha ao consultar precos publicos: ${message}` }, { status: 500 });
  }
}
