const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT_DIR = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT_DIR, 'camaras.xlsx');
const ENV_FILES = ['.env.local', '.env'];
const EMAIL_BATCH_SIZE = 50;

function loadEnvFiles() {
  for (const fileName of ENV_FILES) {
    const filePath = path.join(ROOT_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key || process.env[key]) continue;

      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

function getSupabaseConfig() {
  loadEnvFiles();

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL nao configurado no ambiente.');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY nao configurado no ambiente.');
  }

  return { supabaseUrl, serviceRoleKey };
}

function normalizeEmail(value) {
  if (value == null) return '';
  return String(value).trim().toLowerCase();
}

function extractDomainParts(email) {
  const [, domain = ''] = email.split('@');
  const hostname = domain.trim().toLowerCase();
  const parts = hostname.split('.').filter(Boolean);
  return { hostname, parts };
}

function extractState(parts) {
  if (parts.length < 4) return '';

  const suffixIndex = parts.findIndex((part) => part === 'gov' || part === 'leg');
  if (suffixIndex < 1) return '';
  if (parts[suffixIndex + 1] !== 'br') return '';

  const statePart = parts[suffixIndex - 1];
  return /^[a-z]{2}$/.test(statePart) ? statePart.toUpperCase() : '';
}

function extractCity(hostname, parts, state) {
  if (!state) return hostname;

  const stateIndex = parts.findIndex((part) => part.toUpperCase() === state);
  if (stateIndex <= 0) return hostname;

  const cityRaw = parts.slice(0, stateIndex).join('.');
  const cleaned = cityRaw
    .toLowerCase()
    .replace(/^(camaramunicipal|camara|cm)([.-]|$)/, '')
    .replace(/[._-]+/g, ' ')
    .trim();

  return cleaned && cleaned.length >= 3 ? cleaned : hostname;
}

function buildRow(email) {
  const { hostname, parts } = extractDomainParts(email);
  const state = extractState(parts);
  const city = extractCity(hostname, parts, state);

  return {
    email,
    city_source: city,
    state_source: state,
    source: 'import_camaras',
    department_label: 'Camara Municipal',
    validation_status: 'valid',
    validated_at: new Date().toISOString(),
    quality_score: 1,
  };
}

function readEmailsFromWorkbook() {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`Arquivo nao encontrado: ${XLSX_PATH}`);
  }

  const workbook = XLSX.readFile(XLSX_PATH);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('Arquivo XLSX sem abas.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

  const emails = [];
  for (const row of rows) {
    const firstColumn = Array.isArray(row) ? row[0] : undefined;
    const email = normalizeEmail(firstColumn);
    if (!email || !email.includes('@')) continue;
    emails.push(email);
  }

  return emails;
}

async function insertBatch(supabaseUrl, serviceRoleKey, batch) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/municipality_emails?on_conflict=email`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify(batch),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data.length : 0;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const emails = readEmailsFromWorkbook();

  const uniqueEmails = [...new Set(emails)];
  const rows = uniqueEmails.map(buildRow);

  let inserted = 0;
  let ignored = 0;
  let errors = 0;

  console.log(`Total lido: ${rows.length}`);

  for (let i = 0; i < rows.length; i += EMAIL_BATCH_SIZE) {
    const batch = rows.slice(i, i + EMAIL_BATCH_SIZE);
    const batchNumber = Math.floor(i / EMAIL_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / EMAIL_BATCH_SIZE);

    try {
      const insertedInBatch = await insertBatch(supabaseUrl, serviceRoleKey, batch);
      inserted += insertedInBatch;
      ignored += batch.length - insertedInBatch;
      console.log(
        `[${batchNumber}/${totalBatches}] lote=${batch.length} inseridos=${insertedInBatch} ignorados=${batch.length - insertedInBatch}`
      );
    } catch (error) {
      errors += batch.length;
      console.error(`[${batchNumber}/${totalBatches}] erro no lote:`, error.message);
    }
  }

  console.log('Resumo final:');
  console.log(`- total lido: ${rows.length}`);
  console.log(`- inseridos: ${inserted}`);
  console.log(`- ignorados (duplicatas): ${ignored}`);
  console.log(`- erros: ${errors}`);
}

main().catch((error) => {
  console.error('Falha na importacao:', error.message);
  process.exit(1);
});
