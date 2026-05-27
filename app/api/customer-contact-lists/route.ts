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

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

export async function GET() {
  try {
    const auth = await getAuthenticatedContext();

    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await auth.supabase
      .from('customer_contact_lists')
      .select(`
        id,
        company_id,
        owner_user_id,
        name,
        description,
        visibility,
        status,
        contacts_count,
        valid_contacts_count,
        invalid_contacts_count,
        duplicate_contacts_count,
        created_at,
        updated_at
      `)
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Erro ao listar bases: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao listar bases.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedContext();

    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description = normalizeOptionalText(body?.description);

    if (!name) {
      return NextResponse.json({ error: 'name é obrigatório.' }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from('customer_contact_lists')
      .insert({
        company_id: auth.companyId,
        owner_user_id: auth.userId,
        name,
        description,
      })
      .select(`
        id,
        company_id,
        owner_user_id,
        name,
        description,
        visibility,
        status,
        contacts_count,
        valid_contacts_count,
        invalid_contacts_count,
        duplicate_contacts_count,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Erro ao criar base: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao criar base.' },
      { status: 500 }
    );
  }
}
