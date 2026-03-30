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
    const { email, company_id, role } = body ?? {};

    if (!email || !company_id || !role) {
      return NextResponse.json(
        { error: 'email, company_id e role são obrigatórios.' },
        { status: 400 }
      );
    }

    const validRoles = ['user', 'admin', 'platform_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role inválida.' }, { status: 400 });
    }

    // 3. Verificar limite de usuários do plano
    const adminClient = await createAdminClient();

    const { data: targetCompany } = await adminClient
      .from('companies')
      .select('plan_id')
      .eq('id', company_id)
      .single();

    if (targetCompany?.plan_id) {
      const { data: plan } = await adminClient
        .from('plans')
        .select('max_users')
        .eq('id', targetCompany.plan_id)
        .single();

      // max_users = 0 means unlimited (Elite plan)
      if (plan && plan.max_users > 0) {
        const { count } = await adminClient
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company_id);

        if ((count ?? 0) >= plan.max_users) {
          return NextResponse.json(
            { error: 'Limite de usuários do plano atingido.' },
            { status: 403 }
          );
        }
      }
    }

    // 4. Enviar convite via Supabase Auth Admin (exige service role key)
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      );
    }

    // 4. Upsert na tabela profiles com os dados do convite
    const { error: upsertError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: inviteData.user.id,
          email,
          company_id,
          role,
          status: 'inactive',
        },
        { onConflict: 'id' }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: `Convite enviado, mas erro ao salvar perfil: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user_id: inviteData.user.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar convite.' },
      { status: 500 }
    );
  }
}
