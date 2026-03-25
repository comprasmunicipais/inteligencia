import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getAuthorizedContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'platform_admin') {
    return {
      supabase,
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return {
    supabase,
    authorized: true,
    response: null,
  };
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthorizedContext();

    if (!auth.authorized) {
      return auth.response!;
    }

    const { id } = await context.params;
    const body = await request.json();

    const { url, source_type, notes } = body ?? {};

    if (!id) {
      return NextResponse.json({ error: 'ID da fonte é obrigatório.' }, { status: 400 });
    }

    if (!url || !source_type) {
      return NextResponse.json(
        { error: 'URL e source_type são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabase
      .from('opportunity_sources')
      .update({
        url: String(url).trim(),
        source_type,
        notes: notes ? String(notes).trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        url,
        source_type,
        is_active,
        last_checked_at,
        last_check_status,
        last_check_error,
        notes,
        created_at,
        updated_at,
        municipalities (
          id,
          name,
          state
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao editar fonte.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthorizedContext();

    if (!auth.authorized) {
      return auth.response!;
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID da fonte é obrigatório.' }, { status: 400 });
    }

    const { error } = await auth.supabase
      .from('opportunity_sources')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao excluir fonte.' },
      { status: 500 }
    );
  }
}
