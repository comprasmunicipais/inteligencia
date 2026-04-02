import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // 1. Auth — user session via cookie
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Profile — must be company_admin or platform_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 403 });
  }

  if (!['company_admin', 'platform_admin'].includes(profile.role ?? '')) {
    return NextResponse.json(
      { error: 'Apenas administradores podem convidar membros.' },
      { status: 403 }
    );
  }

  // 3. Validate body
  const body = await request.json();
  const { email, role } = body ?? {};

  if (!email || !role) {
    return NextResponse.json({ error: 'email e role são obrigatórios.' }, { status: 400 });
  }

  // company_admin can only assign 'user' or 'company_admin' — never platform_admin
  if (!['user', 'company_admin'].includes(role)) {
    return NextResponse.json({ error: 'Role inválida.' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  // 4. Check plan user limit
  const { data: company } = await adminClient
    .from('companies')
    .select('plan_id')
    .eq('id', profile.company_id)
    .single();

  if (company?.plan_id) {
    const { data: plan } = await adminClient
      .from('plans')
      .select('max_users')
      .eq('id', company.plan_id)
      .single();

    // max_users = 0 means unlimited
    if (plan && plan.max_users > 0) {
      const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);

      if ((count ?? 0) >= plan.max_users) {
        return NextResponse.json(
          { error: 'Limite de usuários do plano atingido.' },
          { status: 403 }
        );
      }
    }
  }

  // 5. Send invite via Supabase Auth (requires service role key)
  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email);

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  // 6. Upsert profile — vincula o convidado à empresa do invitante
  const { error: upsertError } = await adminClient
    .from('profiles')
    .upsert(
      {
        id: inviteData.user.id,
        email,
        company_id: profile.company_id, // ← same company_id as the inviter
        role,
      },
      { onConflict: 'id' }
    );

  if (upsertError) {
    return NextResponse.json(
      { error: `Convite enviado, mas erro ao salvar perfil: ${upsertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
