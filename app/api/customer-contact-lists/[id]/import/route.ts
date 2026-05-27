import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/server';

type AuthContext =
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
      companyId: string;
      error: null;
      status: null;
    }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: null;
      companyId: null;
      error: string;
      status: number;
    };

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ParsedCsvRow = string[];
type MappedField = 'email' | 'name' | 'company_name' | 'phone' | 'city' | 'state' | 'tags';

const MAX_ROWS = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHUNK_SIZE = 500;

const HEADER_ALIASES: Record<MappedField, string[]> = {
  email: ['email', 'e_mail', 'mail', 'endereco_email', 'endereço_email'],
  name: ['nome', 'name', 'contato', 'contact_name', 'nome_contato', 'responsavel', 'responsável'],
  company_name: [
    'empresa',
    'company',
    'company_name',
    'nome_empresa',
    'empresa_nome',
    'razao_social',
    'razão_social',
    'organizacao',
    'organização',
  ],
  phone: ['telefone', 'phone', 'celular', 'whatsapp', 'tel', 'telefone_1', 'telefone1'],
  city: ['cidade', 'city', 'municipio', 'município'],
  state: ['estado', 'state', 'uf'],
  tags: ['tags', 'tag', 'categoria', 'segmento'],
} as const;

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF+/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function mapHeaderToField(header: string): MappedField | null {
  const normalizedHeader = normalizeHeader(header);

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[MappedField, string[]]>) {
    if (aliases.map(normalizeHeader).includes(normalizedHeader)) {
      return field;
    }
  }

  return null;
}

function normalizeOptionalText(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: string | undefined) {
  if (!value) return '';
  return value.trim().toLowerCase();
}

function parseTags(value: string | undefined) {
  if (!value) return null;

  const items = value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
}

function parseCsv(content: string): ParsedCsvRow[] {
  const result = Papa.parse<string[]>(content, {
    skipEmptyLines: 'greedy',
  });

  const parsingErrors = result.errors.filter(
    (error) => error.code !== 'UndetectableDelimiter',
  );

  if (parsingErrors.length > 0) {
    throw new Error(parsingErrors[0]?.message || 'Erro ao ler o arquivo CSV.');
  }

  return result.data.filter((row): row is ParsedCsvRow => Array.isArray(row));
}

function getHeaderIndexes(headers: string[]) {
  const indexes: Partial<Record<MappedField, number>> = {};
  const unmappedHeaders: Array<{ index: number; key: string }> = [];

  headers.forEach((header, index) => {
    const mappedField = mapHeaderToField(header);
    const normalizedHeader = normalizeHeader(header);

    if (mappedField && indexes[mappedField] === undefined) {
      indexes[mappedField] = index;
      return;
    }

    if (normalizedHeader) {
      unmappedHeaders.push({
        index,
        key: normalizedHeader,
      });
    }
  });

  return {
    indexes,
    unmappedHeaders,
  };
}

async function getAuthenticatedContext(): Promise<AuthContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      userId: null,
      companyId: null,
      error: 'Usuário não autenticado.',
      status: 401,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return {
      supabase,
      userId: null,
      companyId: null,
      error: 'Empresa não identificada.',
      status: 403,
    };
  }

  return {
    supabase,
    userId: user.id,
    companyId: profile.company_id as string,
    error: null,
    status: null,
  };
}

async function loadExistingEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  userId: string,
  listId: string,
  emails: string[],
) {
  const existingEmails = new Set<string>();

  for (let index = 0; index < emails.length; index += CHUNK_SIZE) {
    const chunk = emails.slice(index, index + CHUNK_SIZE);

    if (chunk.length === 0) {
      continue;
    }

    const { data, error } = await supabase
      .from('customer_contacts')
      .select('email_normalized')
      .eq('company_id', companyId)
      .eq('owner_user_id', userId)
      .eq('list_id', listId)
      .in('email_normalized', chunk);

    if (error) {
      throw new Error(`Erro ao verificar contatos existentes: ${error.message}`);
    }

    for (const item of data || []) {
      if (item.email_normalized) {
        existingEmails.add(item.email_normalized);
      }
    }
  }

  return existingEmails;
}

async function insertContactsInChunks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Array<Record<string, unknown>>,
) {
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const chunk = rows.slice(index, index + CHUNK_SIZE);

    if (chunk.length === 0) {
      continue;
    }

    const { error } = await supabase.from('customer_contacts').insert(chunk);

    if (error) {
      throw new Error(`Erro ao inserir contatos: ${error.message}`);
    }
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedContext();

    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const companyId = auth.companyId;
    const userId = auth.userId;

    if (!companyId || !userId) {
      return NextResponse.json({ error: 'Contexto de autenticação inválido.' }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID da base é obrigatório.' }, { status: 400 });
    }

    const { data: list, error: listError } = await auth.supabase
      .from('customer_contact_lists')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .eq('owner_user_id', userId)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: 'Base não encontrada.' }, { status: 404 });
    }

    const { data, error } = await auth.supabase
      .from('customer_contact_imports')
      .select(
        'id, original_file_name, file_type, status, total_rows, valid_rows, invalid_rows, duplicate_rows, created_at, started_at, finished_at',
      )
      .eq('list_id', id)
      .eq('company_id', companyId)
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Erro ao carregar histórico de importações: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao carregar histórico de importações.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  let importId: string | null = null;

  try {
    const auth = await getAuthenticatedContext();

    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const companyId = auth.companyId;
    const userId = auth.userId;

    if (!companyId || !userId) {
      return NextResponse.json({ error: 'Contexto de autenticação inválido.' }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID da base é obrigatório.' }, { status: 400 });
    }

    const { data: list, error: listError } = await auth.supabase
      .from('customer_contact_lists')
      .select(
        'id, company_id, owner_user_id, contacts_count, valid_contacts_count, invalid_contacts_count, duplicate_contacts_count',
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .eq('owner_user_id', userId)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: 'Base não encontrada.' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Envie um arquivo CSV válido.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Apenas arquivos .csv são aceitos nesta fase.' }, { status: 400 });
    }

    const rawText = await file.text();
    const csvText = rawText.replace(/^\uFEFF/, '');

    if (!csvText.trim()) {
      return NextResponse.json({ error: 'O arquivo CSV está vazio.' }, { status: 400 });
    }

    const parsedRows = parseCsv(csvText).filter((row) => row.some((cell) => cell.trim().length > 0));

    if (parsedRows.length === 0) {
      return NextResponse.json({ error: 'O arquivo CSV está vazio.' }, { status: 400 });
    }

    const headers = parsedRows[0];
    const { indexes: headerIndexes, unmappedHeaders } = getHeaderIndexes(headers);

    if (headerIndexes.email === undefined) {
      return NextResponse.json(
        { error: 'O CSV precisa conter a coluna obrigatória "email" na primeira linha.' },
        { status: 400 },
      );
    }

    const emailHeaderIndex = headerIndexes.email;

    const dataRows = parsedRows.slice(1);

    if (dataRows.length === 0) {
      return NextResponse.json({ error: 'O CSV não possui linhas de dados para importar.' }, { status: 400 });
    }

    if (dataRows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: 'O limite desta fase é de até 5.000 linhas por importação.' },
        { status: 400 },
      );
    }

    const { data: importRecord, error: importError } = await auth.supabase
      .from('customer_contact_imports')
      .insert({
        company_id: companyId,
        owner_user_id: userId,
        list_id: list.id,
        original_file_name: file.name,
        file_type: 'csv',
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (importError || !importRecord) {
      return NextResponse.json(
        { error: `Erro ao iniciar importação: ${importError?.message || 'registro não criado'}` },
        { status: 500 },
      );
    }

    importId = importRecord.id as string;

    const candidateEmails = new Set<string>();
    const parsedCandidates = dataRows.map((row) => {
      const emailOriginal = row[emailHeaderIndex] ?? '';
      const emailNormalized = normalizeEmail(emailOriginal);

      if (emailNormalized && EMAIL_REGEX.test(emailNormalized)) {
        candidateEmails.add(emailNormalized);
      }

      return {
        emailOriginal,
        emailNormalized,
        name: headerIndexes.name !== undefined ? row[headerIndexes.name] : undefined,
        companyName: headerIndexes.company_name !== undefined ? row[headerIndexes.company_name] : undefined,
        phone: headerIndexes.phone !== undefined ? row[headerIndexes.phone] : undefined,
        city: headerIndexes.city !== undefined ? row[headerIndexes.city] : undefined,
        state: headerIndexes.state !== undefined ? row[headerIndexes.state] : undefined,
        tags: headerIndexes.tags !== undefined ? row[headerIndexes.tags] : undefined,
        customFields: unmappedHeaders.reduce<Record<string, string>>((acc, header) => {
          const value = row[header.index];
          const normalizedValue = normalizeOptionalText(value);

          if (normalizedValue) {
            acc[header.key] = normalizedValue;
          }

          return acc;
        }, {}),
      };
    });

    const existingEmails = await loadExistingEmails(
      auth.supabase,
      companyId,
      userId,
      list.id,
      Array.from(candidateEmails),
    );

    const emailsInFile = new Set<string>();
    const contactsToInsert: Array<Record<string, unknown>> = [];

    let totalRows = dataRows.length;
    let validRows = 0;
    let invalidRows = 0;
    let duplicateRows = 0;

    for (const row of parsedCandidates) {
      if (!row.emailNormalized) {
        invalidRows += 1;
        continue;
      }

      if (!EMAIL_REGEX.test(row.emailNormalized)) {
        invalidRows += 1;
        continue;
      }

      if (emailsInFile.has(row.emailNormalized) || existingEmails.has(row.emailNormalized)) {
        duplicateRows += 1;
        continue;
      }

      emailsInFile.add(row.emailNormalized);
      validRows += 1;

      contactsToInsert.push({
        company_id: companyId,
        owner_user_id: userId,
        list_id: list.id,
        import_id: importId,
        email_original: row.emailOriginal,
        email_normalized: row.emailNormalized,
        name: normalizeOptionalText(row.name),
        company_name: normalizeOptionalText(row.companyName),
        phone: normalizeOptionalText(row.phone),
        city: normalizeOptionalText(row.city),
        state: normalizeOptionalText(row.state),
        tags: parseTags(row.tags),
        custom_fields:
          row.customFields && Object.keys(row.customFields).length > 0 ? row.customFields : null,
        validation_status: 'not_checked',
        source: 'upload',
      });
    }

    if (contactsToInsert.length > 0) {
      await insertContactsInChunks(auth.supabase, contactsToInsert);
    }

    const nextContactsCount = (list.contacts_count ?? 0) + validRows;
    const nextValidContactsCount = (list.valid_contacts_count ?? 0) + validRows;
    const nextInvalidContactsCount = (list.invalid_contacts_count ?? 0) + invalidRows;
    const nextDuplicateContactsCount = (list.duplicate_contacts_count ?? 0) + duplicateRows;
    const finishedAt = new Date().toISOString();

    const { error: updateImportError } = await auth.supabase
      .from('customer_contact_imports')
      .update({
        total_rows: totalRows,
        valid_rows: validRows,
        invalid_rows: invalidRows,
        duplicate_rows: duplicateRows,
        status: 'completed',
        finished_at: finishedAt,
      })
      .eq('id', importId)
      .eq('company_id', companyId)
      .eq('owner_user_id', userId);

    if (updateImportError) {
      throw new Error(`Erro ao finalizar importação: ${updateImportError.message}`);
    }

    const { error: updateListError } = await auth.supabase
      .from('customer_contact_lists')
      .update({
        contacts_count: nextContactsCount,
        valid_contacts_count: nextValidContactsCount,
        invalid_contacts_count: nextInvalidContactsCount,
        duplicate_contacts_count: nextDuplicateContactsCount,
        updated_at: finishedAt,
      })
      .eq('id', list.id)
      .eq('company_id', companyId)
      .eq('owner_user_id', userId);

    if (updateListError) {
      throw new Error(`Erro ao atualizar contadores da base: ${updateListError.message}`);
    }

    return NextResponse.json({
      data: {
        import_id: importId,
        total_rows: totalRows,
        valid_rows: validRows,
        invalid_rows: invalidRows,
        duplicate_rows: duplicateRows,
      },
    });
  } catch (error: any) {
    if (importId) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

          await supabase
            .from('customer_contact_imports')
            .update({
              status: 'failed',
              finished_at: new Date().toISOString(),
              error_summary: { message: error?.message || 'Erro interno na importação.' },
            })
            .eq('id', importId)
            .eq('owner_user_id', user.id)
            .eq('company_id', profile?.company_id ?? '');
        }
      } catch {
        // Mantém o erro original como resposta.
      }
    }

    return NextResponse.json(
      { error: error?.message || 'Erro interno ao importar contatos.' },
      { status: 500 },
    );
  }
}
