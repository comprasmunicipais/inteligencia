import 'server-only';

export function resolveSmtpSecurity(
  smtpPort: number | string | null | undefined,
  smtpSecure: boolean | null | undefined,
) {
  const port = Number(smtpPort);

  if (port === 465) {
    return { secure: true, requireTLS: false };
  }

  if (port === 587) {
    return { secure: false, requireTLS: true };
  }

  const secure = Boolean(smtpSecure);
  return { secure, requireTLS: !secure };
}
