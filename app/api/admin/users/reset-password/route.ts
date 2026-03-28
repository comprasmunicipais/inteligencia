import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar que o solicitante é platform_admin via cookie session
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Validar body
    const body = await request.json();
    const { user_id } = body ?? {};

    if (!user_id) {
      return NextResponse.json({ error: 'user_id é obrigatório.' }, { status: 400 });
    }

    // 3. Buscar email do usuário em profiles
    const adminClient = await createAdminClient();
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single();

    if (targetError || !targetProfile?.email) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // 4. Enviar email de redefinição de senha
    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(
      targetProfile.email,
      { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login` }
    );

    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, email: targetProfile.email });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao resetar senha.' },
      { status: 500 }
    );
  }
}
