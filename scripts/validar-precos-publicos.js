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

function montarUrl(tipo, codigo) {
  const baseUrl = BASE_URLS[tipo];
  if (!baseUrl) {
    throw new Error(`Tipo de consulta invalido: ${tipo}`);
  }

  return `${baseUrl}/${codigo}/resultados`;
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
    const registros = Array.isArray(data) ? data : [];

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

async function main() {
  const relatorio = [];

  for (const item of ITENS) {
    const resultado = await consultarItem(item);
    relatorio.push(resultado);
  }

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
