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
      user: null,
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
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
      user,
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      ),
    };
  }

  return {
    supabase,
    user,
    authorized: true,
    response: null,
  };
}

export async function GET() {
  try {
    const context = await getAuthorizedContext();

    if (!context.authorized) {
      return context.response!;
    }

    const { supabase } = context;

    const { data, error } = await supabase
      .from('opportunity_sources')
      .select(`
        id,
        url,
        source_type,
        is_active,
        last_check_status,
        last_checked_at,
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
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar fontes.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthorizedContext();

    if (!context.authorized) {
      return context.response!;
    }

    const { supabase } = context;
    const body = await request.json();

    const { url, source_type, municipality_id, notes } = body ?? {};

    if (!url || !source_type) {
      return NextResponse.json(
        { error: 'URL e source_type são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('opportunity_sources')
      .insert({
        url: String(url).trim(),
        source_type,
        municipality_id: municipality_id || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar fonte.' },
      { status: 500 }
    );
  }
}
