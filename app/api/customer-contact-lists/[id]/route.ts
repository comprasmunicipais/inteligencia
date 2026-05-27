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

const ALLOWED_STATUSES = new Set(['active', 'inactive']);

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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedContext();

    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID da base é obrigatório.' }, { status: 400 });
    }

    const body = await request.json();
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body?.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'name inválido.' }, { status: 400 });
      }
      payload.name = body.name.trim();
    }

    if (body?.description !== undefined) {
      payload.description = normalizeOptionalText(body.description);
    }

    if (body?.status !== undefined) {
      if (typeof body.status !== 'string' || !ALLOWED_STATUSES.has(body.status.trim())) {
        return NextResponse.json({ error: 'status inválido.' }, { status: 400 });
      }
      payload.status = body.status.trim();
    }

    const allowedKeys = new Set(['name', 'description', 'status']);
    const hasInvalidKey = Object.keys(body || {}).some((key) => !allowedKeys.has(key));

    if (hasInvalidKey) {
      return NextResponse.json(
        { error: 'PATCH permite apenas name, description e status.' },
        { status: 400 }
      );
    }

    if (Object.keys(payload).length === 1) {
      return NextResponse.json(
        { error: 'Nenhum campo válido informado para atualização.' },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabase
      .from('customer_contact_lists')
      .update(payload)
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId)
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Base não encontrada.' }, { status: 404 });
      }

      return NextResponse.json(
        { error: `Erro ao atualizar base: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao atualizar base.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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

    const { error } = await auth.supabase
      .from('customer_contact_lists')
      .delete()
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId);

    if (error) {
      return NextResponse.json(
        { error: `Erro ao excluir base: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao excluir base.' },
      { status: 500 }
    );
  }
}
