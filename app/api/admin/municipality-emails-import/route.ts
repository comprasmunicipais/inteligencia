import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

type RawRow = Record<string, unknown>;

type NormalizedImportRow = {
  email: string;
  cidade: string;
  uf: string;
};

const EMAIL_KEYS = [
  'email',
  'e-mail',
  'mail',
  'correio',
];

const CITY_KEYS = [
  'cidade',
  'city',
  'municipio',
  'município',
  'nome_municipio',
  'nome_município',
];

const UF_KEYS = [
  'uf',
  'estado',
  'state',
  'sigla_uf',
];

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeUf(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function getFieldValue(row: RawRow, possibleKeys: string[]) {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    const normalizedKey = normalizeHeader(key);

    if (possibleKeys.some((item) => normalizeHeader(item) === normalizedKey)) {
      return value;
    }
  }

  return undefined;
}

function mapRow(row: RawRow): NormalizedImportRow | null {
  const email = normalizeEmail(getFieldValue(row, EMAIL_KEYS));
  const cidade = normalizeText(getFieldValue(row, CITY_KEYS));
  const uf = normalizeUf(getFieldValue(row, UF_KEYS));

  if (!email || !cidade || !uf) {
    return null;
  }

  return {
    email,
    cidade,
    uf,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const body = await request.json();

    const rows = Array.isArray(body?.rows) ? (body.rows as RawRow[]) : [];
    const replaceExisting = Boolean(body?.replaceExisting);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha recebida para importação.' },
        { status: 400 }
      );
    }

    const invalidRows: number[] = [];
    const dedupeMap = new Map<string, NormalizedImportRow>();

    rows.forEach((row, index) => {
      const mapped = mapRow(row);

      if (!mapped) {
        invalidRows.push(index + 1);
        return;
      }

      const dedupeKey = mapped.email;
      if (!dedupeMap.has(dedupeKey)) {
        dedupeMap.set(dedupeKey, mapped);
      }
    });

    const normalizedRows = Array.from(dedupeMap.values());

    if (normalizedRows.length === 0) {
      return NextResponse.json(
        {
          error: 'Nenhuma linha válida encontrada. Esperado: colunas equivalentes a email, cidade e uf.',
        },
        { status: 400 }
      );
    }

    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from('municipality_emails_import')
        .delete()
        .not('email', 'is', null);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }
    }

    const batchSize = 1000;
    let inserted = 0;

    for (let i = 0; i < normalizedRows.length; i += batchSize) {
      const batch = normalizedRows.slice(i, i + batchSize);

      const { error } = await supabase
        .from('municipality_emails_import')
        .insert(batch);

      if (error) {
        return NextResponse.json(
          {
            error: error.message,
            inserted,
          },
          { status: 500 }
        );
      }

      inserted += batch.length;
    }

    return NextResponse.json({
      success: true,
      received: rows.length,
      validAfterMapping: rows.length - invalidRows.length,
      uniqueAfterDeduplication: normalizedRows.length,
      duplicatesRemoved: rows.length - invalidRows.length - normalizedRows.length,
      invalidRows: invalidRows.slice(0, 100),
      inserted,
      replaceExisting,
      mappedColumns: {
        email: EMAIL_KEYS,
        cidade: CITY_KEYS,
        uf: UF_KEYS,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao importar e-mails.' },
      { status: 500 }
    );
  }
}
