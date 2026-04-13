import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/transactional';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { limited } = checkRateLimit(ip)
  if (limited) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    )
  }

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
        // Diagnostic: check presence in auth.users and profiles
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const inAuthUsers = authUsers?.users?.some((u) => u.email === email) ?? false;

          const { data: profileRow } = await supabase
            .from('profiles')
            .select('id, email, company_id')
            .eq('email', email)
            .maybeSingle();

          console.log('[signup duplicate]', {
            email,
            inAuthUsers,
            profileRow: profileRow ?? null,
          });
        } catch (diagErr) {
          console.error('[signup duplicate] erro no diagnóstico:', diagErr);
        }

        return NextResponse.json(
          { error: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Step 2: Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: company_name, status: 'pending' })
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

    // Step 4: Send welcome email (best-effort, don't fail signup if email fails)
    try {
      await sendWelcomeEmail({ name, email, companyName: company_name });
    } catch {
      // non-blocking
    }

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno. Tente novamente.' },
      { status: 500 }
    );
  }
}
