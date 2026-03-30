import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Public route — called during onboarding before user has a session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, segment, states } = body ?? {};

    if (!userId || !segment || !Array.isArray(states) || states.length === 0) {
      return NextResponse.json(
        { error: 'userId, segment e states são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Resolve company_id from profiles using userId
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'Usuário ou empresa não encontrados.' },
        { status: 404 }
      );
    }

    const companyId = profile.company_id;

    // Upsert into company_profiles (strategic profile table)
    // target_states is a PostgreSQL ARRAY column
    const { error: upsertError } = await supabase
      .from('company_profiles')
      .upsert(
        {
          company_id: companyId,
          main_segment: segment,
          target_states: states,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}
