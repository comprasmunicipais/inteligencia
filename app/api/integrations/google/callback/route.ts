import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleOAuthEmail,
  getGoogleOAuthScope,
  getGoogleTokenExpiration,
  encryptGoogleTokenForStorage,
  sanitizeGoogleOAuthError,
  validateGoogleOAuthState,
} from '@/lib/email/google-oauth';

const REDIRECT_PATH = '/email/accounts';

function redirectWithStatus(req: NextRequest, status: 'success' | 'error', message: string) {
  const url = new URL(REDIRECT_PATH, req.url);
  url.searchParams.set('google_oauth', status);
  url.searchParams.set('message', message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const googleError = searchParams.get('error');

    console.info('[google-callback] Callback recebido.');

    if (googleError) {
      return redirectWithStatus(req, 'error', 'Autorizacao Google cancelada ou recusada.');
    }

    if (!code || !state) {
      return redirectWithStatus(req, 'error', 'Callback Google invalido.');
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirectWithStatus(req, 'error', 'Usuario nao autenticado.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return redirectWithStatus(req, 'error', 'Empresa nao identificada.');
    }

    const stateOk = await validateGoogleOAuthState(state, user.id, profile.company_id);
    if (!stateOk) {
      return redirectWithStatus(req, 'error', 'State OAuth invalido ou expirado.');
    }

    const tokens = await exchangeGoogleAuthorizationCode(code);
    if (!tokens.access_token) {
      return redirectWithStatus(req, 'error', 'Token Google nao retornado.');
    }

    const oauthEmail = await fetchGoogleOAuthEmail(tokens.access_token);
    const now = new Date().toISOString();
    const payload = {
      provider_type: 'google_oauth',
      oauth_provider: 'google',
      oauth_email: oauthEmail,
      oauth_access_token_encrypted: encryptGoogleTokenForStorage(tokens.access_token),
      ...(tokens.refresh_token
        ? { oauth_refresh_token_encrypted: encryptGoogleTokenForStorage(tokens.refresh_token) }
        : {}),
      oauth_token_expires_at: getGoogleTokenExpiration(tokens.expires_in),
      oauth_scope: tokens.scope || getGoogleOAuthScope(),
      oauth_status: 'active',
      oauth_last_error: null,
      name: `Google - ${oauthEmail}`,
      sender_name: oauthEmail,
      sender_email: oauthEmail,
      reply_to_email: null,
      is_active: true,
      daily_limit: 500,
      hourly_limit: 50,
      updated_at: now,
    };

    const { data: existing, error: existingError } = await supabase
      .from('email_sending_accounts')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('provider_type', 'google_oauth')
      .eq('oauth_provider', 'google')
      .ilike('oauth_email', oauthEmail)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existing?.id && !tokens.refresh_token) {
      return redirectWithStatus(req, 'error', 'Google nao retornou refresh_token. Tente conectar novamente.');
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('email_sending_accounts')
        .update(payload)
        .eq('id', existing.id)
        .eq('company_id', profile.company_id);

      if (updateError) throw new Error(updateError.message);
    } else {
      const { count, error: countError } = await supabase
        .from('email_sending_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);

      if (countError) throw new Error(countError.message);
      if ((count ?? 0) >= 5) {
        return redirectWithStatus(req, 'error', 'Limite maximo de 5 contas de envio por empresa atingido.');
      }

      const { error: insertError } = await supabase
        .from('email_sending_accounts')
        .insert({
          ...payload,
          company_id: profile.company_id,
          created_at: now,
        });

      if (insertError) throw new Error(insertError.message);
    }

    return redirectWithStatus(req, 'success', 'Conta Google conectada com sucesso.');
  } catch (error) {
    console.error('[google-callback] Erro:', sanitizeGoogleOAuthError(error));
    return redirectWithStatus(req, 'error', sanitizeGoogleOAuthError(error));
  }
}
