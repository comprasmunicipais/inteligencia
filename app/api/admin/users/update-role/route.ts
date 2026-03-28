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
    const { user_id, role, company_id } = body ?? {};

    if (!user_id || !role) {
      return NextResponse.json({ error: 'user_id e role são obrigatórios.' }, { status: 400 });
    }

    const validRoles = ['user', 'admin', 'platform_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role inválida.' }, { status: 400 });
    }

    // 3. Montar objeto de atualização
    const updates: Record<string, string> = { role };
    if (company_id) updates.company_id = company_id;

    // 4. Atualizar profiles
    const adminClient = await createAdminClient();
    const { data, error: updateError } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', user_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao atualizar permissões.' },
      { status: 500 }
    );
  }
}
