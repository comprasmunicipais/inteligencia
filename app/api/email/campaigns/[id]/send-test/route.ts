import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, sanitizeEmailSendError } from '@/lib/email/sender';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Empresa nao identificada.' }, { status: 403 });
    }

    const companyId: string = profile.company_id;
    const body = await req.json();
    const sendingAccountId: string | undefined = body.sending_account_id?.trim();

    if (!sendingAccountId) {
      return NextResponse.json({ error: 'Informe a conta de envio (sending_account_id).' }, { status: 400 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, company_id, name, subject, preheader, html_content, text_content')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campanha nao encontrada.' }, { status: 404 });
    }

    if (!campaign.subject?.trim()) {
      return NextResponse.json({ error: 'A campanha nao tem assunto definido.' }, { status: 400 });
    }

    if (!campaign.html_content?.trim()) {
      return NextResponse.json({ error: 'A campanha nao tem conteudo HTML.' }, { status: 400 });
    }

    const { data: account, error: accountError } = await supabase
      .from('email_sending_accounts')
      .select(
        'id, company_id, provider_type, name, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password_encrypted, oauth_access_token_encrypted, oauth_refresh_token_encrypted, oauth_token_expires_at, oauth_status, is_active',
      )
      .eq('id', sendingAccountId)
      .eq('company_id', companyId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Conta de envio nao encontrada.' }, { status: 404 });
    }

    if (!account.is_active) {
      return NextResponse.json({ error: 'A conta de envio esta inativa.' }, { status: 400 });
    }

    if ((account.provider_type || 'smtp') === 'smtp' && !account.smtp_password_encrypted) {
      return NextResponse.json({ error: 'Senha SMTP nao configurada na conta.' }, { status: 400 });
    }

    if (account.provider_type === 'google_oauth' && (!account.oauth_refresh_token_encrypted || account.oauth_status !== 'active')) {
      return NextResponse.json({ error: 'Conta Google nao esta ativa para envio.' }, { status: 400 });
    }

    const testEmail = user.email!;
    await sendEmail(supabase, account, {
      to: testEmail,
      subject: `[TESTE] ${campaign.subject}`,
      html: campaign.html_content,
      ...(campaign.text_content ? { text: campaign.text_content } : {}),
      ...(campaign.preheader ? { headers: { 'X-Preheader': campaign.preheader } } : {}),
    });

    return NextResponse.json({ ok: true, sent_to: testEmail });
  } catch (error: any) {
    console.error('[send-test] Erro:', sanitizeEmailSendError(error));
    return NextResponse.json(
      { error: sanitizeEmailSendError(error) || 'Erro ao enviar e-mail de teste.' },
      { status: 500 },
    );
  }
}
