import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_BODY_KEYS = ['segment', 'states', 'userId'] as const;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
    }

    const bodyKeys = Object.keys(body);
    const unexpectedKeys = bodyKeys.filter(
      (key) => !ALLOWED_BODY_KEYS.includes(key as (typeof ALLOWED_BODY_KEYS)[number])
    );

    if (unexpectedKeys.length > 0) {
      return NextResponse.json(
        { error: `Campos não permitidos: ${unexpectedKeys.join(', ')}` },
        { status: 400 }
      );
    }

    const { userId, segment, states } = body as {
      userId?: string;
      segment?: unknown;
      states?: unknown;
    };

    // Compatibilidade com o frontend atual: aceita userId no body, mas nunca o usa
    // como fonte de verdade. Se vier divergente da sessão, bloqueia.
    if (userId && userId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    if (typeof segment !== 'string' || !segment.trim()) {
      return NextResponse.json({ error: 'segment é obrigatório.' }, { status: 400 });
    }

    if (!Array.isArray(states) || states.length === 0) {
      return NextResponse.json({ error: 'states é obrigatório.' }, { status: 400 });
    }

    const sanitizedStates = states
      .filter((state): state is string => typeof state === 'string')
      .map((state) => state.trim())
      .filter(Boolean);

    if (sanitizedStates.length === 0 || sanitizedStates.length !== states.length) {
      return NextResponse.json(
        { error: 'states deve conter apenas valores de texto válidos.' },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'Usuário ou empresa não encontrados.' },
        { status: 404 }
      );
    }

    const payload = {
      company_id: profile.company_id,
      main_segment: segment.trim(),
      target_states: sanitizedStates,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedRows, error: updateError } = await supabase
      .from('company_profiles')
      .update({
        main_segment: payload.main_segment,
        target_states: payload.target_states,
        updated_at: payload.updated_at,
      })
      .eq('company_id', profile.company_id)
      .select('company_id');

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if ((updatedRows?.length ?? 0) > 0) {
      return NextResponse.json({ success: true });
    }

    const { error: insertError } = await supabase
      .from('company_profiles')
      .insert(payload);

    if (insertError) {
      return NextResponse.json(
        { error: `Erro ao criar perfil estratégico: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno.' },
      { status: 500 }
    );
  }
}
