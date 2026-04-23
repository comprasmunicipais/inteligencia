import 'server-only';
import nodemailer from 'nodemailer';
import { decryptEmailSettingSecret } from '@/lib/security/email-settings-crypto';
import { refreshGoogleOAuthAccessToken, sanitizeGoogleOAuthError, type GoogleOAuthAccount } from '@/lib/email/google-oauth';

type SupabaseClientLike = {
  from: (table: string) => any;
};

export type SendingProviderType = 'smtp' | 'google_oauth';

export type SendingAccount = GoogleOAuthAccount & {
  id: string;
  company_id: string;
  provider_type?: SendingProviderType | null;
  sender_name: string;
  sender_email: string;
  reply_to_email?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_secure?: boolean | null;
  smtp_username?: string | null;
  smtp_password_encrypted?: string | null;
};

export type SendEmailInput = {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | null;
  headers?: Record<string, string>;
};

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

function encodeHeader(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMimeMessage(input: SendEmailInput): string {
  const boundary = `cmpro_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const text = input.text?.trim() || htmlToText(input.html) || ' ';
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    ...(input.replyTo ? [`Reply-To: ${input.replyTo}`] : []),
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ...(input.headers
      ? Object.entries(input.headers).map(([key, value]) => `${key}: ${encodeHeader(value)}`)
      : []),
  ];

  return [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.html,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export function sanitizeEmailSendError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return sanitizeGoogleOAuthError(message)
    .replace(/pass(wo)?rd\s*[:=]\s*[^\s]+/gi, 'password=[redacted]')
    .replace(/user(name)?\s*[:=]\s*[^\s]+/gi, 'username=[redacted]');
}

export async function sendEmailViaSmtp(account: SendingAccount, input: SendEmailInput): Promise<void> {
  if (!account.smtp_password_encrypted) {
    throw new Error('Senha SMTP nao configurada na conta.');
  }

  const smtpPassword = decryptEmailSettingSecret(account.smtp_password_encrypted);
  const transporter = nodemailer.createTransport({
    host: account.smtp_host!,
    port: Number(account.smtp_port),
    secure: Boolean(account.smtp_secure),
    auth: { user: account.smtp_username!, pass: smtpPassword },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    requireTLS: !account.smtp_secure,
    tls: { rejectUnauthorized: true },
  });

  await transporter.sendMail({
    from: input.from,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(input.text ? { text: input.text } : {}),
    ...(input.headers ? { headers: input.headers } : {}),
  });
}

export async function sendEmailViaGoogleOAuth(
  supabase: SupabaseClientLike,
  account: SendingAccount,
  input: SendEmailInput,
): Promise<void> {
  const accessToken = await refreshGoogleOAuthAccessToken(supabase, account);
  const mime = buildMimeMessage(input);
  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64UrlEncode(mime) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha Gmail API: ${response.status} ${body.slice(0, 300)}`);
  }

  console.info('[gmail-send] Envio Gmail realizado.', { accountId: account.id });
}

export async function sendEmail(
  supabase: SupabaseClientLike,
  account: SendingAccount,
  input: Omit<SendEmailInput, 'from' | 'replyTo'>,
): Promise<void> {
  const from = `"${account.sender_name}" <${account.sender_email}>`;
  const provider = account.provider_type || 'smtp';

  if (provider === 'google_oauth') {
    await sendEmailViaGoogleOAuth(supabase, account, {
      ...input,
      from,
      replyTo: account.reply_to_email,
    });
    return;
  }

  await sendEmailViaSmtp(account, {
    ...input,
    from,
    replyTo: account.reply_to_email,
  });
}
