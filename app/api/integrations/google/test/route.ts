import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchGoogleOAuthEmail, refreshGoogleOAuthAccessToken, sanitizeGoogleOAuthError } from '@/lib/email/google-oauth';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  let accountId: string | null = null;
  let companyId: string | null = null;

  try {
    const body = await req.json() as { account_id?: string };
    accountId = body.account_id?.trim() || null;

    if (!accountId) {
      return NextResponse.json({ error: 'account_id e obrigatorio.' }, { status: 400 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario nao autenticado.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Nao foi possivel identificar a empresa do usuario.' }, { status: 403 });
    }

    companyId = profile.company_id;

    const { data: account, error: accountError } = await supabase
      .from('email_sending_accounts')
      .select('id, company_id, provider_type, oauth_access_token_encrypted, oauth_refresh_token_encrypted, oauth_token_expires_at, oauth_status')
      .eq('id', accountId)
      .eq('company_id', companyId)
      .eq('provider_type', 'google_oauth')
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Conta Google nao encontrada.' }, { status: 404 });
    }

    const accessToken = await refreshGoogleOAuthAccessToken(supabase, account);
    const email = await fetchGoogleOAuthEmail(accessToken);
    const now = new Date().toISOString();

    await supabase
      .from('email_sending_accounts')
      .update({
        last_tested_at: now,
        last_test_status: 'success',
        last_test_error: null,
        oauth_status: 'active',
        oauth_last_error: null,
        updated_at: now,
      })
      .eq('id', accountId)
      .eq('company_id', companyId);

    return NextResponse.json({
      success: true,
      message: 'Conta Google validada com sucesso.',
      data: { account_id: accountId, oauth_email: email, last_tested_at: now },
    });
  } catch (error) {
    const sanitized = sanitizeGoogleOAuthError(error);
    const now = new Date().toISOString();

    if (accountId && companyId) {
      await supabase
        .from('email_sending_accounts')
        .update({
          last_tested_at: now,
          last_test_status: 'error',
          last_test_error: sanitized,
          oauth_status: 'error',
          oauth_last_error: sanitized,
          updated_at: now,
        })
        .eq('id', accountId)
        .eq('company_id', companyId);
    }

    return NextResponse.json({ error: sanitized }, { status: 500 });
  }
}
