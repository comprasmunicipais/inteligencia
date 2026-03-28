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
    const { email, password, company_id, role, full_name } = body ?? {};

    if (!email || !password || !company_id || !role) {
      return NextResponse.json(
        { error: 'email, password, company_id e role são obrigatórios.' },
        { status: 400 }
      );
    }

    const validRoles = ['user', 'admin', 'platform_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role inválida.' }, { status: 400 });
    }

    // 3. Criar usuário via Supabase Auth Admin (exige service role key)
    const adminClient = await createAdminClient();
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      ...(full_name ? { user_metadata: { full_name } } : {}),
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // 4. Upsert na tabela profiles
    const { error: upsertError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: createData.user.id,
          email,
          company_id,
          role,
        },
        { onConflict: 'id' }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: `Usuário criado, mas erro ao salvar perfil: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user_id: createData.user.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao criar usuário.' },
      { status: 500 }
    );
  }
}
