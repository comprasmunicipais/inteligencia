import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { encryptEmailSettingSecret } from '@/lib/security/email-settings-crypto';

type SenderSettingsPayload = {
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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const body = (await req.json()) as SenderSettingsPayload;

    const {
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

    const encryptedPassword = encryptEmailSettingSecret(smtp_password);

    const payloadToSave = {
      company_id: profile.company_id,
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
      .from('email_sender_settings')
      .upsert(payloadToSave, { onConflict: 'company_id' })
      .select(
        'id, company_id, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, daily_limit, hourly_limit, is_active, last_tested_at, last_test_status, last_test_error, created_at, updated_at'
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Erro ao salvar configuração SMTP: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao salvar configuração SMTP.' },
      { status: 500 }
    );
  }
}
