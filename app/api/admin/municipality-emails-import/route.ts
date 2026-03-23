import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

type EmailImportRow = {
  email?: string;
  cidade?: string;
  uf?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeUf(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const body = await request.json();

    const rows = Array.isArray(body?.rows) ? (body.rows as EmailImportRow[]) : [];
    const replaceExisting = Boolean(body?.replaceExisting);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha recebida para importação.' },
        { status: 400 }
      );
    }

    const normalizedRows = rows
      .map((row) => ({
        email: normalizeEmail(row.email),
        cidade: normalizeText(row.cidade),
        uf: normalizeUf(row.uf),
      }))
      .filter((row) => row.email && row.cidade && row.uf);

    if (normalizedRows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha válida encontrada. Esperado: email, cidade, uf.' },
        { status: 400 }
      );
    }

    if (replaceExisting) {
      const { error: truncateError } = await supabase
        .from('municipality_emails_import')
        .delete()
        .neq('email', '');

      if (truncateError) {
        return NextResponse.json(
          { error: truncateError.message },
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
          { error: error.message, inserted },
          { status: 500 }
        );
      }

      inserted += batch.length;
    }

    return NextResponse.json({
      success: true,
      received: rows.length,
      valid: normalizedRows.length,
      inserted,
      replaceExisting,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao importar e-mails.' },
      { status: 500 }
    );
  }
}
