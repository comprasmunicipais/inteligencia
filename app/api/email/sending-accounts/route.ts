import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

function decrypt(text: string) {
  const key = process.env.ENCRYPTION_KEY as string;

  if (!key) {
    throw new Error('ENCRYPTION_KEY não definida');
  }

  const [ivHex, encrypted] = text.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encrypted, 'hex');

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(key, 'hex'),
    iv
  );

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return decrypted.toString();
}

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const { data: account, error } = await supabase
      .from('email_sending_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      );
    }

    const password = decrypt(account.smtp_password_encrypted);

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_secure,
      auth: {
        user: account.smtp_username,
        pass: password,
      },
    });

    // Testa conexão SMTP
    await transporter.verify();

    // Atualiza status no banco
    await supabase
      .from('email_sending_accounts')
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: 'success',
        last_test_error: null,
      })
      .eq('id', accountId);

    return NextResponse.json({
      success: true,
      message: 'Conexão SMTP validada com sucesso',
    });
  } catch (err: any) {
    const supabase = await createAdminClient();

    if (err?.accountId) {
      await supabase
        .from('email_sending_accounts')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: 'error',
          last_test_error: err.message,
        })
        .eq('id', err.accountId);
    }

    return NextResponse.json(
      {
        error: 'Falha ao testar SMTP',
        details: err.message,
      },
      { status: 500 }
    );
  }
}
