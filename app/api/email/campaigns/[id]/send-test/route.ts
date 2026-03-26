import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';
import { decryptEmailSettingSecret } from '@/lib/security/email-settings-crypto';

function sanitizeSmtpError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return msg
    .replace(/pass(wo)?rd\s*[:=]\s*[^\s]+/gi, 'password=[redacted]')
    .replace(/user(name)?\s*[:=]\s*[^\s]+/gi, 'username=[redacted]');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 403 });
    }

    const companyId: string = profile.company_id;

    // ── 2. Body ──────────────────────────────────────────────────────────────
    const body = await req.json();
    const sendingAccountId: string | undefined = body.sending_account_id?.trim();

    if (!sendingAccountId) {
      return NextResponse.json({ error: 'Informe a conta de envio (sending_account_id).' }, { status: 400 });
    }

    // ── 3. Load campaign ─────────────────────────────────────────────────────
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, company_id, name, subject, preheader, html_content, text_content')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }

    if (!campaign.subject?.trim()) {
      return NextResponse.json({ error: 'A campanha não tem assunto definido.' }, { status: 400 });
    }

    if (!campaign.html_content?.trim()) {
      return NextResponse.json({ error: 'A campanha não tem conteúdo HTML.' }, { status: 400 });
    }

    // ── 4. Load sending account ──────────────────────────────────────────────
    const { data: account, error: accountError } = await supabase
      .from('email_sending_accounts')
      .select(
        'id, name, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password_encrypted, is_active',
      )
      .eq('id', sendingAccountId)
      .eq('company_id', companyId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Conta de envio não encontrada.' }, { status: 404 });
    }

    if (!account.is_active) {
      return NextResponse.json({ error: 'A conta de envio está inativa.' }, { status: 400 });
    }

    if (!account.smtp_password_encrypted) {
      return NextResponse.json({ error: 'Senha SMTP não configurada na conta.' }, { status: 400 });
    }

    const smtpPassword = decryptEmailSettingSecret(account.smtp_password_encrypted);

    // ── 5. Create transporter ────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: Number(account.smtp_port),
      secure: Boolean(account.smtp_secure),
      auth: { user: account.smtp_username, pass: smtpPassword },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      requireTLS: !account.smtp_secure,
      tls: { rejectUnauthorized: true },
    });

    // ── 6. Send test email to logged-in user ─────────────────────────────────
    const testEmail = user.email!;
    const subjectWithTag = `[TESTE] ${campaign.subject}`;

    await transporter.sendMail({
      from: `"${account.sender_name}" <${account.sender_email}>`,
      ...(account.reply_to_email ? { replyTo: account.reply_to_email } : {}),
      to: testEmail,
      subject: subjectWithTag,
      html: campaign.html_content,
      ...(campaign.text_content ? { text: campaign.text_content } : {}),
      ...(campaign.preheader ? { headers: { 'X-Preheader': campaign.preheader } } : {}),
    });

    return NextResponse.json({ ok: true, sent_to: testEmail });
  } catch (error: any) {
    console.error('[send-test] Erro:', sanitizeSmtpError(error));
    return NextResponse.json(
      { error: error?.message || 'Erro ao enviar e-mail de teste.' },
      { status: 500 },
    );
  }
}
