import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { encryptEmailSettingSecret } from '@/lib/security/email-settings-crypto';

type SendingAccountPayload = {
  name: string;
  sender_name: string;
  sender_email: string;
  reply_to_email?: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  smtp_password: string;
  daily_limit?: number;
  hourly_limit?: number;
  is_active?: boolean;
};

function normalizeEmail(value?: string | null) {
  return value ? value.trim().toLowerCase() : null;
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Em Route Handler, às vezes o set não é necessário aqui.
          }
        },
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado.' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'Não foi possível identificar a empresa do usuário.' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('email_sending_accounts')
      .select(
        'id, company_id, name, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, daily_limit, hourly_limit, is_active, last_tested_at, last_test_status, last_test_error, created_at, updated_at'
      )
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Erro ao listar contas de envio: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao listar contas de envio.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = (await req.json()) as SendingAccountPayload;

    const {
      name,
      sender_name,
      sender_email,
      reply_to_email,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_username,
      smtp_password,
      daily_limit,
      hourly_limit,
      is_active,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Informe o nome da conta de envio.' },
        { status: 400 }
      );
    }

    if (!sender_name?.trim()) {
      return NextResponse.json(
        { error: 'Informe o nome do remetente.' },
        { status: 400 }
      );
    }

    if (!sender_email?.trim()) {
      return NextResponse.json(
        { error: 'Informe o e-mail do remetente.' },
        { status: 400 }
      );
    }

    if (!smtp_host?.trim()) {
      return NextResponse.json(
        { error: 'Informe o host SMTP.' },
        { status: 400 }
      );
    }

    if (!smtp_port || Number.isNaN(Number(smtp_port))) {
      return NextResponse.json(
        { error: 'Informe uma porta SMTP válida.' },
        { status: 400 }
      );
    }

    if (!smtp_username?.trim()) {
      return NextResponse.json(
        { error: 'Informe o usuário SMTP.' },
        { status: 400 }
      );
    }

    if (!smtp_password?.trim()) {
      return NextResponse.json(
        { error: 'Informe a senha SMTP.' },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado.' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'Não foi possível identificar a empresa do usuário.' },
        { status: 403 }
      );
    }

    const { count, error: countError } = await supabase
      .from('email_sending_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id);

    if (countError) {
      return NextResponse.json(
        { error: `Erro ao validar limite de contas: ${countError.message}` },
        { status: 500 }
      );
    }

    if ((count || 0) >= 5) {
      return NextResponse.json(
        { error: 'Limite máximo de 5 contas de envio por empresa atingido.' },
        { status: 400 }
      );
    }

    const encryptedPassword = encryptEmailSettingSecret(smtp_password);

    const payloadToSave = {
      company_id: profile.company_id,
      name: name.trim(),
      sender_name: sender_name.trim(),
      sender_email: normalizeEmail(sender_email),
      reply_to_email: normalizeEmail(reply_to_email),
      smtp_host: smtp_host.trim(),
      smtp_port: Number(smtp_port),
      smtp_secure: Boolean(smtp_secure),
      smtp_username: smtp_username.trim(),
      smtp_password_encrypted: encryptedPassword,
      daily_limit: daily_limit ?? 500,
      hourly_limit: hourly_limit ?? 100,
      is_active: is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('email_sending_accounts')
      .insert(payloadToSave)
      .select(
        'id, company_id, name, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, daily_limit, hourly_limit, is_active, last_tested_at, last_test_status, last_test_error, created_at, updated_at'
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Erro ao salvar conta de envio: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao salvar conta de envio.' },
      { status: 500 }
    );
  }
}
