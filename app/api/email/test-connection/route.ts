import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';
import { decryptEmailSettingSecret } from '@/lib/security/email-settings-crypto';
import { resolveSmtpSecurity } from '@/lib/email/smtp-config';

type TestConnectionPayload = {
  account_id?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Falha ao testar conexão SMTP.';
}

function sanitizeSmtpError(error: unknown): string {
  const message = getErrorMessage(error);
  return message
    .replace(/pass(wo)?rd\s*[:=]\s*[^\s]+/gi, 'password=[redacted]')
    .replace(/user(name)?\s*[:=]\s*[^\s]+/gi, 'username=[redacted]')
    .replace(/auth\s*[:=]\s*\{[^}]*\}/gi, 'auth=[redacted]');
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  let accountId: string | null = null;
  let companyId: string | null = null;

  try {
    const body = (await req.json()) as TestConnectionPayload;
    accountId = body.account_id?.trim() || null;

    if (!accountId) {
      return NextResponse.json(
        { error: 'account_id é obrigatório.' },
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

    companyId = profile.company_id;

    const { data: account, error: accountError } = await supabase
      .from('email_sending_accounts')
      .select(
        'id, company_id, name, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password_encrypted, is_active'
      )
      .eq('id', accountId)
      .eq('company_id', companyId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Conta de envio não encontrada.' },
        { status: 404 }
      );
    }

    if (!account.is_active) {
      return NextResponse.json(
        { error: 'A conta de envio está inativa.' },
        { status: 400 }
      );
    }

    if (!account.smtp_password_encrypted) {
      return NextResponse.json(
        { error: 'A conta não possui senha SMTP criptografada.' },
        { status: 400 }
      );
    }

    const smtpPassword = decryptEmailSettingSecret(account.smtp_password_encrypted);
    const smtpSecurity = resolveSmtpSecurity(account.smtp_port, account.smtp_secure);

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: Number(account.smtp_port),
      secure: smtpSecurity.secure,
      auth: {
        user: account.smtp_username,
        pass: smtpPassword,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      requireTLS: smtpSecurity.requireTLS,
      tls: {
        rejectUnauthorized: true,
      },
    });

    await transporter.verify();

    const now = new Date().toISOString();

    const { error: updateSuccessError } = await supabase
      .from('email_sending_accounts')
      .update({
        last_tested_at: now,
        last_test_status: 'success',
        last_test_error: null,
        updated_at: now,
      })
      .eq('id', accountId)
      .eq('company_id', companyId);

    if (updateSuccessError) {
      return NextResponse.json(
        { error: `Conexão validada, mas falhou ao atualizar status: ${updateSuccessError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conexão SMTP validada com sucesso.',
      data: {
        account_id: account.id,
        last_test_status: 'success',
        last_tested_at: now,
      },
    });
  } catch (error: unknown) {
    const sanitizedError = sanitizeSmtpError(error);
    const now = new Date().toISOString();

    if (accountId && companyId) {
      await supabase
        .from('email_sending_accounts')
        .update({
          last_tested_at: now,
          last_test_status: 'error',
          last_test_error: sanitizedError,
          updated_at: now,
        })
        .eq('id', accountId)
        .eq('company_id', companyId);
    }

    return NextResponse.json({ error: sanitizedError }, { status: 500 });
  }
}
