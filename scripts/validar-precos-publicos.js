const ITENS = [
  { item: 'papel A4', segmento: 'papelaria' },
  { item: 'caneta esferografica azul', segmento: 'papelaria' },
  { item: 'toner impressora HP', segmento: 'informatica e suprimentos' },
  { item: 'luva de procedimento', segmento: 'saude' },
  { item: 'mascara descartavel', segmento: 'saude' },
  { item: 'alcool 70', segmento: 'saude' },
  { item: 'manutencao de ar-condicionado', segmento: 'servicos de manutencao' },
  { item: 'limpeza predial', segmento: 'servicos terceirizados' },
  { item: 'dedetizacao', segmento: 'servicos terceirizados' },
];

const CODIGOS_COMPRAS_GOV = {
  'papel A4': { tipo: 'material', codigo: '150119' },
  'caneta esferografica azul': { tipo: 'material', codigo: '233255' },
  'toner impressora HP': { tipo: 'material', codigo: '150422' },
  'luva de procedimento': { tipo: 'material', codigo: '269892' },
  'mascara descartavel': { tipo: 'material', codigo: '341922' },
  'alcool 70': { tipo: 'material', codigo: '383664' },
  'manutencao de ar-condicionado': { tipo: 'servico', codigo: '20060' },
  'limpeza predial': { tipo: 'servico', codigo: '24023' },
  'dedetizacao': { tipo: 'servico', codigo: '13595' },
};

const BASE_URLS = {
  material: 'https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial',
  servico: 'https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarServico',
};

const SPEC_URLS = [
  'https://dadosabertos.compras.gov.br/swagger-ui/index.html',
  'https://dadosabertos.compras.gov.br/v3/api-docs',
  'https://dadosabertos.compras.gov.br/v3/api-docs/swagger-config',
  'https://dadosabertos.compras.gov.br/api-docs',
  'https://dadosabertos.compras.gov.br/openapi.json',
  'https://dadosabertos.compras.gov.br/swagger.json',
];

const KEYWORDS = ['pesquisa', 'preco', 'precos', 'material', 'servico', 'catmat', 'catser'];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function montarUrl(tipo, codigo) {
  const baseUrl = BASE_URLS[tipo];
  if (!baseUrl) {
    throw new Error(`Tipo de consulta invalido: ${tipo}`);
  }

  const url = new URL(baseUrl);
  url.searchParams.set('codigoItemCatalogo', codigo);
  url.searchParams.set('pagina', '1');
  url.searchParams.set('tamanhoPagina', '10');
  return url.toString();
}

function extrairPrimeiroPreco(registros) {
  if (!Array.isArray(registros) || registros.length === 0) return null;

  const primeiroRegistro = registros[0];
  const candidatos = [
    primeiroRegistro.preco,
    primeiroRegistro.valor,
    primeiroRegistro.precoUnitario,
    primeiroRegistro.preco_unitario,
    primeiroRegistro.valorUnitario,
    primeiroRegistro.valor_unitario,
    primeiroRegistro.vl_unitario,
  ];

  const preco = candidatos.find((valor) => valor !== undefined && valor !== null && valor !== '');
  return preco ?? null;
}

function extrairEndpointsRelacionados(paths) {
  if (!paths || typeof paths !== 'object') return [];

  return Object.keys(paths).filter((path) => {
    const normalizedPath = normalizeText(path);
    return KEYWORDS.some((keyword) => normalizedPath.includes(keyword));
  });
}

async function diagnosticarSpecUrl(url) {
  try {
    const response = await fetch(url);
    const body = await response.text();

    let json = null;
    try {
      json = JSON.parse(body);
    } catch {
      json = null;
    }

    const endpoints = json ? extrairEndpointsRelacionados(json.paths) : [];

    return {
      url,
      statusHttp: response.status,
      jsonValido: Boolean(json),
      endpoints,
    };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);

    return {
      url,
      statusHttp: 'erro_fetch',
      jsonValido: false,
      endpoints: [],
      erro: mensagem,
    };
  }
}

async function diagnosticarSpecs() {
  const resultados = [];

  for (const url of SPEC_URLS) {
    resultados.push(await diagnosticarSpecUrl(url));
  }

  return resultados;
}

function coletarEndpointsEncontrados(diagnosticos) {
  const unicos = new Set();

  for (const diagnostico of diagnosticos) {
    for (const endpoint of diagnostico.endpoints) {
      unicos.add(endpoint);
    }
  }

  return Array.from(unicos);
}

function endpointConsultaFoiConfirmado(endpoints) {
  return endpoints.some((endpoint) => {
    const normalized = normalizeText(endpoint);
    return (
      normalized.includes('consultarmaterial') ||
      normalized.includes('consultarservico') ||
      normalized.includes('modulo-pesquisa-preco')
    );
  });
}

async function consultarItem({ item, segmento }) {
  const mapeamento = CODIGOS_COMPRAS_GOV[item];

  if (!mapeamento) {
    return {
      item,
      segmento,
      fonte: 'compras_gov',
      quantidade_resultados: 0,
      preco_exemplo: null,
      status: 'erro',
      observacoes: 'Item sem mapeamento CATMAT/CATSER.',
    };
  }

  const url = montarUrl(mapeamento.tipo, mapeamento.codigo);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const registros = Array.isArray(data)
      ? data
      : Array.isArray(data?.resultado)
        ? data.resultado
        : [];

    return {
      item,
      segmento,
      fonte: 'compras_gov',
      quantidade_resultados: registros.length,
      preco_exemplo: extrairPrimeiroPreco(registros),
      status: 'ok',
      observacoes: '',
    };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);

    return {
      item,
      segmento,
      fonte: 'compras_gov',
      quantidade_resultados: 0,
      preco_exemplo: null,
      status: 'erro',
      observacoes: mensagem,
    };
  }
}

function criarRelatorioSemEndpointConfirmado() {
  return ITENS.map(({ item, segmento }) => ({
    item,
    segmento,
    fonte: 'compras_gov',
    quantidade_resultados: 0,
    preco_exemplo: null,
    status: 'erro_endpoint_nao_confirmado',
    observacoes: 'Nenhum endpoint JSON valido de precos praticados foi confirmado na especificacao publica.',
  }));
}

function imprimirDiagnostico(diagnosticos, endpointsEncontrados) {
  console.log('URLs testadas:');
  for (const diagnostico of diagnosticos) {
    const sufixoErro = diagnostico.erro ? `, erro=${diagnostico.erro}` : '';
    console.log(
      `- ${diagnostico.url} -> status=${diagnostico.statusHttp}, jsonValido=${diagnostico.jsonValido}${sufixoErro}`,
    );
  }

  console.log('\nEndpoints encontrados relacionados a precos praticados:');
  if (endpointsEncontrados.length === 0) {
    console.log('- nenhum endpoint relacionado encontrado');
    return;
  }

  for (const endpoint of endpointsEncontrados) {
    console.log(`- ${endpoint}`);
  }
}

async function main() {
  const diagnosticos = await diagnosticarSpecs();
  const endpointsEncontrados = coletarEndpointsEncontrados(diagnosticos);
  const consultaConfirmada = endpointConsultaFoiConfirmado(endpointsEncontrados);

  imprimirDiagnostico(diagnosticos, endpointsEncontrados);

  const relatorio = [];

  if (consultaConfirmada) {
    for (const item of ITENS) {
      relatorio.push(await consultarItem(item));
    }
  } else {
    relatorio.push(...criarRelatorioSemEndpointConfirmado());
  }

  console.log('\nRelatorio final:');
  console.log(JSON.stringify(relatorio, null, 2));
  console.log('\nResumo por item:');

  for (const item of relatorio) {
    console.log(
      `- ${item.item}: status=${item.status}, resultados=${item.quantidade_resultados}, preco_exemplo=${item.preco_exemplo ?? 'null'}`,
    );
  }
}

main().catch((error) => {
  console.error('Falha ao executar validacao de precos publicos:', error);
  process.exitCode = 1;
});
