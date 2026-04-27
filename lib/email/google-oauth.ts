import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { encryptGoogleOAuthToken, decryptGoogleOAuthToken } from '@/lib/security/google-oauth-crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKEN_INFO_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo';
const GOOGLE_GMAIL_PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const STATE_COOKIE = 'cm_google_oauth_state';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send email';
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

type SupabaseClientLike = {
  from: (table: string) => any;
};

type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleOAuthAccount = {
  id: string;
  company_id: string;
  provider_type?: string | null;
  oauth_access_token_encrypted?: string | null;
  oauth_refresh_token_encrypted?: string | null;
  oauth_token_expires_at?: string | null;
  oauth_status?: string | null;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  const missing = [
    !clientId ? 'GOOGLE_OAUTH_CLIENT_ID' : null,
    !clientSecret ? 'GOOGLE_OAUTH_CLIENT_SECRET' : null,
    !redirectUri ? 'GOOGLE_OAUTH_REDIRECT_URI' : null,
    !process.env.GOOGLE_OAUTH_ENCRYPTION_KEY ? 'GOOGLE_OAUTH_ENCRYPTION_KEY' : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Google OAuth nao configurado. Variaveis ausentes: ${missing.join(', ')}.`);
  }

  return { clientId: clientId!, clientSecret: clientSecret!, redirectUri: redirectUri! };
}

function hashState(state: string): string {
  return crypto.createHash('sha256').update(state).digest('hex');
}

export async function createGoogleOAuthAuthorizationUrl(userId: string, companyId: string): Promise<string> {
  const config = getGoogleOAuthConfig();
  const state = crypto.randomBytes(32).toString('base64url');
  const cookieStore = await cookies();

  cookieStore.set(STATE_COOKIE, JSON.stringify({
    stateHash: hashState(state),
    userId,
    companyId,
    createdAt: Date.now(),
  }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SEND_SCOPE,
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function validateGoogleOAuthState(state: string, userId: string, companyId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!raw || !state) return false;

  try {
    const parsed = JSON.parse(raw) as {
      stateHash?: string;
      userId?: string;
      companyId?: string;
      createdAt?: number;
    };
    const isFresh = typeof parsed.createdAt === 'number' && Date.now() - parsed.createdAt < 10 * 60 * 1000;
    return (
      isFresh &&
      parsed.userId === userId &&
      parsed.companyId === companyId &&
      parsed.stateHash === hashState(state)
    );
  } catch {
    return false;
  }
}

export async function exchangeGoogleAuthorizationCode(code: string): Promise<TokenResponse> {
  const config = getGoogleOAuthConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = (await response.json()) as TokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Falha ao trocar codigo OAuth.');
  }

  return data;
}

export async function fetchGoogleOAuthEmail(accessToken: string): Promise<string> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.ok) {
    const info = await response.json() as { email?: string };
    if (info.email) return info.email.toLowerCase();
  }

  throw new Error('Nao foi possivel identificar o e-mail Google conectado.');
}

export function getGoogleTokenExpiration(expiresIn?: number): string {
  const seconds = typeof expiresIn === 'number' && expiresIn > 0 ? expiresIn : 3600;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function sanitizeGoogleOAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/access_token[=:]\s*[^&\s]+/gi, 'access_token=[redacted]')
    .replace(/refresh_token[=:]\s*[^&\s]+/gi, 'refresh_token=[redacted]')
    .replace(/client_secret[=:]\s*[^&\s]+/gi, 'client_secret=[redacted]')
    .replace(/code[=:]\s*[^&\s]+/gi, 'code=[redacted]');
}

export async function refreshGoogleOAuthAccessToken(
  supabase: SupabaseClientLike,
  account: GoogleOAuthAccount,
): Promise<string> {
  if (!account.oauth_refresh_token_encrypted) {
    throw new Error('Conta Google sem refresh_token.');
  }

  const expiresAt = account.oauth_token_expires_at
    ? new Date(account.oauth_token_expires_at).getTime()
    : 0;

  if (
    account.oauth_access_token_encrypted &&
    account.oauth_status === 'active' &&
    expiresAt > Date.now() + REFRESH_WINDOW_MS
  ) {
    return decryptGoogleOAuthToken(account.oauth_access_token_encrypted);
  }

  const config = getGoogleOAuthConfig();
  const refreshToken = decryptGoogleOAuthToken(account.oauth_refresh_token_encrypted);

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = (await response.json()) as TokenResponse;
    if (!response.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || 'Falha ao renovar token Google.');
    }

    const encryptedAccessToken = encryptGoogleOAuthToken(data.access_token);
    const expiresAtIso = getGoogleTokenExpiration(data.expires_in);
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('email_sending_accounts')
      .update({
        oauth_access_token_encrypted: encryptedAccessToken,
        oauth_token_expires_at: expiresAtIso,
        oauth_scope: data.scope || GMAIL_SEND_SCOPE,
        oauth_status: 'active',
        oauth_last_error: null,
        updated_at: now,
      })
      .eq('id', account.id)
      .eq('company_id', account.company_id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.info('[google-oauth] Token renovado.', { accountId: account.id });
    return data.access_token;
  } catch (error) {
    const sanitized = sanitizeGoogleOAuthError(error);
    await supabase
      .from('email_sending_accounts')
      .update({
        oauth_status: 'error',
        oauth_last_error: sanitized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .eq('company_id', account.company_id);

    console.error('[google-oauth] Falha ao renovar token.', {
      accountId: account.id,
      error: sanitized,
    });
    throw new Error(sanitized);
  }
}

export function encryptGoogleTokenForStorage(token: string): string {
  return encryptGoogleOAuthToken(token);
}

export function getGoogleOAuthScope(): string {
  return GMAIL_SEND_SCOPE;
}
