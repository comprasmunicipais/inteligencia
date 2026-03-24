import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/server';
import { decryptEmailSettingSecret } from '@/lib/security/email-settings-crypto';

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient();
  let accountId: string | null = null;

  try {
    const body = await req.json();
    accountId = body.accountId;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId é obrigatório.' },
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

    const { data: account, error: accountError } = await supabase
      .from('email_sending_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('company_id', profile.company_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Conta de envio não encontrada.' },
        { status: 404 }
      );
    }

    const smtpPassword = decryptEmailSettingSecret(
      account.smtp_password_encrypted
    );

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_secure,
      auth: {
        user: account.smtp_username,
        pass: smtpPassword,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    await transporter.verify();

    await supabase
      .from('email_sending_accounts')
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: 'success',
        last_test_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('company_id', profile.company_id);

    return NextResponse.json({
      success: true,
      message: 'Conexão SMTP validada com sucesso.',
    });
  } catch (error: any) {
    if (accountId) {
      await supabase
        .from('email_sending_accounts')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: 'error',
          last_test_error: error?.message || 'Falha ao testar SMTP.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
    }

    return NextResponse.json(
      {
        error: 'Falha ao testar SMTP.',
        details: error?.message || 'Erro interno ao validar conexão SMTP.',
      },
      { status: 500 }
    );
  }
}
