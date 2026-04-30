const fs = require('fs');
const path = require('path');

const TERMS = [
  'caneta esferográfica azul',
  'luva de procedimento',
  'álcool 70',
  'toner impressora HP',
  'papel A4',
];

const CATALOG_URL = 'https://dadosabertos.compras.gov.br/modulo-material/4_consultarItemMaterial';
const PRICE_URL = 'https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial';
const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'catalogo-catmat-validado.json');
const CATALOG_PAGE_SIZE = 10;
const CANDIDATE_LIMIT = 5;
const PRICE_PAGE_SIZE = 10;
const MAX_FETCH_ATTEMPTS = 3;

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function normalizeSearchTerm(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function buildSearchVariants(term) {
  const normalized = normalizeSearchTerm(term);
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return [...new Set([
    normalized,
    tokens.slice(0, 3).join(' '),
    tokens.slice(0, 2).join(' '),
    tokens[0] ?? '',
  ].filter(Boolean))];
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

function extractCatalogItems(payload) {
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

function extractPriceItems(payload) {
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

async function fetchCatalogCandidates(term) {
  const candidates = [];
  const seenCodes = new Set();

  for (const variant of buildSearchVariants(term)) {
    const url = buildUrl(CATALOG_URL, {
      pagina: 1,
      tamanhoPagina: CATALOG_PAGE_SIZE,
      descricaoItem: variant,
    });

    const payload = await fetchJson(url);
    const items = extractCatalogItems(payload);

    for (const item of items) {
      if (!item?.codigoItem || seenCodes.has(item.codigoItem)) {
        continue;
      }

      seenCodes.add(item.codigoItem);
      candidates.push(item);

      if (candidates.length >= CANDIDATE_LIMIT) {
        return candidates;
      }
    }
  }

  return candidates;
}

async function fetchPriceSummary(codigoItem) {
  const url = buildUrl(PRICE_URL, {
    pagina: 1,
    tamanhoPagina: PRICE_PAGE_SIZE,
    codigoItemCatalogo: codigoItem,
  });

  const payload = await fetchJson(url);
  return summarizePrices(extractPriceItems(payload).slice(0, PRICE_PAGE_SIZE));
}

async function analyzeCandidate(term, candidate) {
  try {
    const summary = await fetchPriceSummary(candidate.codigoItem);

    return {
      termo_consultado: term,
      codigoItem: candidate.codigoItem ?? null,
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
      status_validacao: getValidationStatus(summary),
      confianca_inicial: getConfidence(summary),
      erro_tecnico: null,
    };
  } catch (error) {
    return {
      termo_consultado: term,
      codigoItem: candidate.codigoItem ?? null,
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

async function analyzeTerm(term) {
  try {
    const candidates = await fetchCatalogCandidates(term);

    if (candidates.length === 0) {
      return {
        termo_consultado: term,
        erro_tecnico: null,
        candidatos: [],
      };
    }

    const analyzedCandidates = [];

    for (const candidate of candidates) {
      analyzedCandidates.push(await analyzeCandidate(term, candidate));
    }

    return {
      termo_consultado: term,
      erro_tecnico: null,
      candidatos: analyzedCandidates,
    };
  } catch (error) {
    return {
      termo_consultado: term,
      erro_tecnico: error instanceof Error ? error.message : String(error),
      candidatos: [],
    };
  }
}

async function main() {
  const results = [];

  for (const term of TERMS) {
    results.push(await analyzeTerm(term));
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(results, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(results, null, 2));
  console.error(`Arquivo salvo em: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('Falha ao catalogar CATMAT:', error);
  process.exitCode = 1;
});
