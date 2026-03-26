import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

type UpdateAccountPayload = Partial<SendingAccountPayload> & {
  account_id: string;
};

function normalizeEmail(value?: string | null) {
  return value ? value.trim().toLowerCase() : null;
}

async function getAuthenticatedCompany(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: 'Usuário não autenticado.', status: 401 };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return { error: 'Não foi possível identificar a empresa do usuário.', status: 403 };
  }

  return { companyId: profile.company_id as string };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await getAuthenticatedCompany(supabase);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data, error } = await supabase
      .from('email_sending_accounts')
      .select(
        'id, company_id, name, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, daily_limit, hourly_limit, is_active, last_tested_at, last_test_status, last_test_error, created_at, updated_at'
      )
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Erro ao listar contas de envio: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao listar contas de envio.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = (await req.json()) as SendingAccountPayload;

    const {
      name, sender_name, sender_email, reply_to_email,
      smtp_host, smtp_port, smtp_secure, smtp_username,
      smtp_password, daily_limit, hourly_limit, is_active,
    } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Informe o nome da conta de envio.' }, { status: 400 });
    if (!sender_name?.trim()) return NextResponse.json({ error: 'Informe o nome do remetente.' }, { status: 400 });
    if (!sender_email?.trim()) return NextResponse.json({ error: 'Informe o e-mail do remetente.' }, { status: 400 });
    if (!smtp_host?.trim()) return NextResponse.json({ error: 'Informe o host SMTP.' }, { status: 400 });
    if (!smtp_port || Number.isNaN(Number(smtp_port))) return NextResponse.json({ error: 'Informe uma porta SMTP válida.' }, { status: 400 });
    if (!smtp_username?.trim()) return NextResponse.json({ error: 'Informe o usuário SMTP.' }, { status: 400 });
    if (!smtp_password?.trim()) return NextResponse.json({ error: 'Informe a senha SMTP.' }, { status: 400 });

    const auth = await getAuthenticatedCompany(supabase);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const encryptedPassword = encryptEmailSettingSecret(smtp_password);

    const { data: rows, error } = await supabase.rpc('insert_sending_account_if_under_limit', {
      p_company_id:        auth.companyId,
      p_name:              name.trim(),
      p_sender_name:       sender_name.trim(),
      p_sender_email:      normalizeEmail(sender_email),
      p_reply_to_email:    normalizeEmail(reply_to_email),
      p_smtp_host:         smtp_host.trim(),
      p_smtp_port:         Number(smtp_port),
      p_smtp_secure:       Boolean(smtp_secure),
      p_smtp_username:     smtp_username.trim(),
      p_smtp_password_enc: encryptedPassword,
      p_daily_limit:       daily_limit ?? 500,
      p_hourly_limit:      hourly_limit ?? 100,
      p_is_active:         is_active ?? true,
      p_updated_at:        new Date().toISOString(),
    });

    if (error) {
      if (error.message?.includes('LIMIT_EXCEEDED')) {
        return NextResponse.json(
          { error: 'Limite máximo de 5 contas de envio por empresa atingido.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Erro ao salvar conta de envio: ${error.message}` },
        { status: 500 }
      );
    }

    const data = Array.isArray(rows) ? rows[0] : rows;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao salvar conta de envio.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = (await req.json()) as UpdateAccountPayload;
    const { account_id, smtp_password, ...fields } = body;

    if (!account_id?.trim()) {
      return NextResponse.json({ error: 'account_id é obrigatório.' }, { status: 400 });
    }

    const auth = await getAuthenticatedCompany(supabase);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Verifica que a conta pertence à empresa
    const { data: existing, error: fetchError } = await supabase
      .from('email_sending_accounts')
      .select('id')
      .eq('id', account_id)
      .eq('company_id', auth.companyId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Conta de envio não encontrada.' }, { status: 404 });
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (fields.name !== undefined) payload.name = fields.name.trim();
    if (fields.sender_name !== undefined) payload.sender_name = fields.sender_name.trim();
    if (fields.sender_email !== undefined) payload.sender_email = normalizeEmail(fields.sender_email);
    if (fields.reply_to_email !== undefined) payload.reply_to_email = normalizeEmail(fields.reply_to_email);
    if (fields.smtp_host !== undefined) payload.smtp_host = fields.smtp_host.trim();
    if (fields.smtp_port !== undefined) payload.smtp_port = Number(fields.smtp_port);
    if (fields.smtp_secure !== undefined) payload.smtp_secure = Boolean(fields.smtp_secure);
    if (fields.smtp_username !== undefined) payload.smtp_username = fields.smtp_username.trim();
    if (fields.daily_limit !== undefined) payload.daily_limit = fields.daily_limit;
    if (fields.hourly_limit !== undefined) payload.hourly_limit = fields.hourly_limit;
    if (fields.is_active !== undefined) payload.is_active = fields.is_active;

    // Senha só recriptografa se foi informada
    if (smtp_password?.trim()) {
      payload.smtp_password_encrypted = encryptEmailSettingSecret(smtp_password);
    }

    const { data, error } = await supabase
      .from('email_sending_accounts')
      .update(payload)
      .eq('id', account_id)
      .eq('company_id', auth.companyId)
      .select(
        'id, company_id, name, sender_name, sender_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, daily_limit, hourly_limit, is_active, last_tested_at, last_test_status, last_test_error, created_at, updated_at'
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Erro ao atualizar conta de envio: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao atualizar conta de envio.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { account_id } = (await req.json()) as { account_id?: string };

    if (!account_id?.trim()) {
      return NextResponse.json({ error: 'account_id é obrigatório.' }, { status: 400 });
    }

    const auth = await getAuthenticatedCompany(supabase);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { error } = await supabase
      .from('email_sending_accounts')
      .delete()
      .eq('id', account_id)
      .eq('company_id', auth.companyId);

    if (error) {
      return NextResponse.json(
        { error: `Erro ao excluir conta de envio: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao excluir conta de envio.' },
      { status: 500 }
    );
  }
}
