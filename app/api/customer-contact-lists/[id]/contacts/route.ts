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

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function normalizePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedContext();

    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID da base é obrigatório.' }, { status: 400 });
    }

    const { data: existingList, error: existingListError } = await auth.supabase
      .from('customer_contact_lists')
      .select('id')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId)
      .single();

    if (existingListError || !existingList) {
      return NextResponse.json({ error: 'Base não encontrada.' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = normalizePositiveInteger(searchParams.get('page'), DEFAULT_PAGE);
    const pageSize = Math.min(
      normalizePositiveInteger(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const search = searchParams.get('search')?.trim() || '';
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = auth.supabase
      .from('customer_contacts')
      .select(
        `
          id,
          email_normalized,
          email_original,
          name,
          company_name,
          phone,
          city,
          state,
          validation_status,
          source,
          custom_fields,
          created_at
        `,
        { count: 'exact' },
      )
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId)
      .eq('list_id', id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      const escapedSearch = search.replace(/[%]/g, '').replace(/[,]/g, ' ');
      query = query.or(
        `email_normalized.ilike.%${escapedSearch}%,name.ilike.%${escapedSearch}%,company_name.ilike.%${escapedSearch}%`,
      );
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Erro ao listar contatos da base: ${error.message}` },
        { status: 500 },
      );
    }

    const total = count ?? 0;
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

    return NextResponse.json({
      data: data || [],
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao listar contatos da base.' },
      { status: 500 },
    );
  }
}
