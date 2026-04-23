import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeGoogleOAuthError } from '@/lib/email/google-oauth';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json() as { account_id?: string };
    const accountId = body.account_id?.trim();

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

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('email_sending_accounts')
      .update({
        is_active: false,
        oauth_status: 'revoked',
        oauth_access_token_encrypted: null,
        oauth_last_error: null,
        updated_at: now,
      })
      .eq('id', accountId)
      .eq('company_id', profile.company_id)
      .eq('provider_type', 'google_oauth')
      .select('id, oauth_status, is_active, updated_at')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Conta Google nao encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: sanitizeGoogleOAuthError(error) }, { status: 500 });
  }
}
