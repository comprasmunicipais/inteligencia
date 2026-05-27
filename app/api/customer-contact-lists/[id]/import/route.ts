import { NextRequest, NextResponse } from 'next/server';
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

const MAX_ROWS = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHUNK_SIZE = 500;

const HEADER_ALIASES = {
  email: ['email'],
  name: ['nome', 'name'],
  company_name: ['empresa', 'company'],
  phone: ['telefone', 'phone'],
  city: ['cidade', 'city'],
  state: ['estado', 'state'],
  tags: ['tags'],
} as const;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
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
  const rows: ParsedCsvRow[] = [];
  let currentValue = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

function getHeaderIndexes(headers: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);

  const indexes = Object.entries(HEADER_ALIASES).reduce<Record<string, number>>((acc, [key, aliases]) => {
    const foundIndex = normalizedHeaders.findIndex((header) => aliases.some((alias) => alias === header));

    if (foundIndex >= 0) {
      acc[key] = foundIndex;
    }

    return acc;
  }, {});

  return indexes;
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
    const headerIndexes = getHeaderIndexes(headers);

    if (headerIndexes.email === undefined) {
      return NextResponse.json(
        { error: 'O CSV precisa conter a coluna obrigatória "email" na primeira linha.' },
        { status: 400 },
      );
    }

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
      const emailOriginal = row[headerIndexes.email] ?? '';
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
