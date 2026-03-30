import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, company_name } = body ?? {};

    // Validate required fields
    if (!name || !email || !password || !company_name) {
      return NextResponse.json(
        { error: 'Nome, e-mail, senha e nome da empresa são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 8 caracteres.' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Step 1: Create user in Supabase Auth
    // email_confirm: true skips email confirmation — user can log in immediately
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authError) {
      // Supabase returns "User already registered" for duplicate emails
      if (authError.message.includes('already')) {
        return NextResponse.json(
          { error: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Step 2: Create company with 7-day trial
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: company_name, status: 'active', trial_ends_at: trialEndsAt })
      .select('id')
      .single();

    if (companyError) {
      // Best-effort cleanup: delete the auth user so signup can be retried
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Erro ao criar empresa. Tente novamente.' },
        { status: 500 }
      );
    }

    // Step 3: Create profile linking user to company
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: name,
        company_id: company.id,
        role: 'user',
      });

    if (profileError) {
      // Best-effort cleanup
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from('companies').delete().eq('id', company.id);
      return NextResponse.json(
        { error: 'Erro ao criar perfil. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno. Tente novamente.' },
      { status: 500 }
    );
  }
}
