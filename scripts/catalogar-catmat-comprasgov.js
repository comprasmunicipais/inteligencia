const fs = require('fs');
const path = require('path');

const GROUP_URL = 'https://dadosabertos.compras.gov.br/modulo-material/1_consultarGrupoMaterial';
const CLASS_URL = 'https://dadosabertos.compras.gov.br/modulo-material/2_consultarClasseMaterial';
const ITEM_URL = 'https://dadosabertos.compras.gov.br/modulo-material/4_consultarItemMaterial';
const PRICE_URL = 'https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial';
const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'catalogo-catmat-validado.json');
const ITEM_PAGE_SIZE = 10;
const GROUP_LIMIT = 2;
const CLASS_LIMIT = 2;
const ITEM_LIMIT = 2;
const PRICE_PAGE_SIZE = 10;
const MAX_FETCH_ATTEMPTS = 1;

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function fetchJson(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        const message = body || `HTTP ${response.status} ${response.statusText}`;
        const shouldRetry =
          attempt < MAX_FETCH_ATTEMPTS &&
          (response.status >= 500 || message.includes('Could not open JPA EntityManager'));

        if (shouldRetry) {
          lastError = new Error(message);
          continue;
        }

        throw new Error(message);
      }

      return response.json();
    } catch (error) {
      lastError = error;

      if (attempt >= MAX_FETCH_ATTEMPTS) {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function extractApiItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.resultado)) {
    return payload.resultado;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  return [];
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/\./g, '').replace(',', '.').trim();
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function pickMostCommon(values) {
  const counts = new Map();

  for (const value of values) {
    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let bestValue = null;
  let bestCount = 0;

  for (const [value, count] of counts.entries()) {
    if (count > bestCount) {
      bestValue = value;
      bestCount = count;
    }
  }

  return bestValue;
}

function summarizePrices(items) {
  const prices = items
    .map((item) => parseNumber(item.precoUnitario))
    .filter((value) => value !== null);

  const dates = items
    .map((item) => item.dataResultado || item.dataCompra || null)
    .filter(Boolean)
    .sort();

  const unitMeasures = items
    .map((item) => item.siglaUnidadeMedida || item.nomeUnidadeMedida || null)
    .filter(Boolean);

  const supplyUnits = items
    .map((item) => item.nomeUnidadeFornecimento || item.siglaUnidadeFornecimento || null)
    .filter(Boolean);

  const quantity = items.length;
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const avg = prices.length
    ? Number((prices.reduce((sum, value) => sum + value, 0) / prices.length).toFixed(2))
    : null;
  const latestDate = dates.length ? dates[dates.length - 1] : null;

  return {
    quantidade_resultados_preco: quantity,
    preco_min: min,
    preco_max: max,
    preco_medio: avg,
    data_mais_recente: latestDate,
    unidade_medida: pickMostCommon(unitMeasures),
    unidade_fornecimento: pickMostCommon(supplyUnits),
  };
}

function getValidationStatus(summary) {
  if (summary.quantidade_resultados_preco > 0 && summary.preco_medio !== null) {
    return 'validado';
  }

  return 'sem_preco';
}

function getConfidence(summary) {
  if (summary.quantidade_resultados_preco >= 5 && summary.data_mais_recente) {
    return 'alta';
  }

  if (summary.quantidade_resultados_preco >= 2 && summary.quantidade_resultados_preco <= 4) {
    return 'media';
  }

  return 'baixa';
}

async function fetchGroups() {
  const url = buildUrl(GROUP_URL, {
    pagina: 1,
  });

  const payload = await fetchJson(url);
  return extractApiItems(payload);
}

async function fetchClassesByGroup(codigoGrupo) {
  const url = buildUrl(CLASS_URL, {
    pagina: 1,
    codigoGrupo,
  });

  const payload = await fetchJson(url);
  return extractApiItems(payload);
}

async function fetchItemsByGroupAndClass(codigoGrupo, codigoClasse) {
  const url = buildUrl(ITEM_URL, {
    pagina: 1,
    tamanhoPagina: ITEM_PAGE_SIZE,
    codigoGrupo,
    codigoClasse,
  });

  const payload = await fetchJson(url);
  return extractApiItems(payload);
}

async function fetchPriceSummary(codigoItem) {
  const url = buildUrl(PRICE_URL, {
    pagina: 1,
    tamanhoPagina: PRICE_PAGE_SIZE,
    codigoItemCatalogo: codigoItem,
  });

  const payload = await fetchJson(url);
  return summarizePrices(extractApiItems(payload).slice(0, PRICE_PAGE_SIZE));
}

async function analyzeCandidate(candidate) {
  const codigoItem = candidate.codigoItem ?? null;
  console.log(`[catmat] Item validado: ${codigoItem ?? 'sem-codigo'}`);

  try {
    const summary = await fetchPriceSummary(codigoItem);
    const status = getValidationStatus(summary);
    const confidence = getConfidence(summary);

    console.log(`[catmat] status_validacao=${status} confianca_inicial=${confidence} item=${codigoItem ?? 'sem-codigo'}`);

    return {
      termo_consultado: null,
      codigoItem,
      descricaoItem: candidate.descricaoItem ?? null,
      codigoGrupo: candidate.codigoGrupo ?? null,
      nomeGrupo: candidate.nomeGrupo ?? null,
      codigoClasse: candidate.codigoClasse ?? null,
      nomeClasse: candidate.nomeClasse ?? null,
      codigoPdm: candidate.codigoPdm ?? null,
      nomePdm: candidate.nomePdm ?? null,
      codigo_ncm: candidate.codigo_ncm ?? null,
      descricao_ncm: candidate.descricao_ncm ?? null,
      ...summary,
      status_validacao: status,
      confianca_inicial: confidence,
      erro_tecnico: null,
    };
  } catch (error) {
    console.log(`[catmat] status_validacao=erro confianca_inicial=baixa item=${codigoItem ?? 'sem-codigo'}`);

    return {
      termo_consultado: null,
      codigoItem,
      descricaoItem: candidate.descricaoItem ?? null,
      codigoGrupo: candidate.codigoGrupo ?? null,
      nomeGrupo: candidate.nomeGrupo ?? null,
      codigoClasse: candidate.codigoClasse ?? null,
      nomeClasse: candidate.nomeClasse ?? null,
      codigoPdm: candidate.codigoPdm ?? null,
      nomePdm: candidate.nomePdm ?? null,
      codigo_ncm: candidate.codigo_ncm ?? null,
      descricao_ncm: candidate.descricao_ncm ?? null,
      quantidade_resultados_preco: 0,
      preco_min: null,
      preco_max: null,
      preco_medio: null,
      data_mais_recente: null,
      unidade_medida: null,
      unidade_fornecimento: null,
      status_validacao: 'erro',
      confianca_inicial: 'baixa',
      erro_tecnico: error instanceof Error ? error.message : String(error),
    };
  }
}

async function analyzeGroup(group) {
  const codigoGrupo = group.codigoGrupo ?? null;
  const nomeGrupo = group.nomeGrupo ?? group.descricaoGrupo ?? null;
  console.log(`[catmat] Consultando grupo ${codigoGrupo ?? 'sem-codigo'} - ${nomeGrupo ?? 'sem-nome'}`);

  try {
    const classes = await fetchClassesByGroup(codigoGrupo);
    console.log(`[catmat] Classes encontradas no grupo ${codigoGrupo ?? 'sem-codigo'}: ${classes.length}`);

    const selectedClasses = classes.slice(0, CLASS_LIMIT);
    console.log(
      `[catmat] Classes selecionadas no grupo ${codigoGrupo ?? 'sem-codigo'}: ${selectedClasses.map((item) => item.codigoClasse ?? 'sem-codigo').join(', ') || 'nenhuma'}`,
    );

    const analyzedCandidates = [];

    for (const materialClass of selectedClasses) {
      const codigoClasse = materialClass.codigoClasse ?? null;
      const nomeClasse = materialClass.nomeClasse ?? materialClass.descricaoClasse ?? null;

      try {
        const items = await fetchItemsByGroupAndClass(codigoGrupo, codigoClasse);
        console.log(`[catmat] Itens encontrados na classe ${codigoClasse ?? 'sem-codigo'}: ${items.length}`);

        const selectedItems = items.slice(0, ITEM_LIMIT);

        for (const item of selectedItems) {
          const candidate = {
            ...item,
            codigoGrupo: item.codigoGrupo ?? codigoGrupo,
            nomeGrupo: item.nomeGrupo ?? nomeGrupo,
            codigoClasse: item.codigoClasse ?? codigoClasse,
            nomeClasse: item.nomeClasse ?? nomeClasse,
          };

          analyzedCandidates.push(await analyzeCandidate(candidate));
        }
      } catch (error) {
        console.log(
          `[catmat] Erro ao consultar itens da classe ${codigoClasse ?? 'sem-codigo'} no grupo ${codigoGrupo ?? 'sem-codigo'}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      termo_consultado: nomeGrupo,
      codigoGrupo,
      nomeGrupo,
      erro_tecnico: null,
      candidatos: analyzedCandidates,
    };
  } catch (error) {
    console.log(`[catmat] Erro ao consultar grupo ${codigoGrupo ?? 'sem-codigo'}: ${error instanceof Error ? error.message : String(error)}`);

    return {
      termo_consultado: nomeGrupo,
      codigoGrupo,
      nomeGrupo,
      erro_tecnico: error instanceof Error ? error.message : String(error),
      candidatos: [],
    };
  }
}

async function main() {
  console.log('[catmat] Iniciando catalogacao CATMAT com navegacao estrutural leve');

  const results = [];

  try {
    const groups = await fetchGroups();
    console.log(`[catmat] Grupos encontrados: ${groups.length}`);

    const selectedGroups = groups.slice(0, GROUP_LIMIT);
    console.log(
      `[catmat] Grupos selecionados: ${selectedGroups.map((group) => group.codigoGrupo ?? 'sem-codigo').join(', ') || 'nenhum'}`,
    );

    for (const group of selectedGroups) {
      results.push(await analyzeGroup(group));
    }
  } catch (error) {
    console.log(`[catmat] Erro ao consultar grupos: ${error instanceof Error ? error.message : String(error)}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(results, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(results, null, 2));
  console.log(`[catmat] JSON salvo em: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('Falha ao catalogar CATMAT:', error);
  process.exitCode = 1;
});
