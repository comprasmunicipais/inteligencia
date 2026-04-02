import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'CM Pro <noreply@comprasmunicipais.com.br>';
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.comprasmunicipais.com.br';

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTML shell
// ─────────────────────────────────────────────────────────────────────────────

function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CM Pro</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:28px 40px;text-align:center;">
              <span style="font-family:system-ui,-apple-system,sans-serif;font-size:22px;font-weight:800;color:#f0f4ff;letter-spacing:-0.5px;">
                CM <span style="color:#3b82f6;">PRO</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                CM Pro · Inteligência Comercial B2G<br/>
                <a href="https://comprasmunicipais.com.br" style="color:#3b82f6;text-decoration:none;">comprasmunicipais.com.br</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Welcome email
// ─────────────────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail({
  name,
  email,
  companyName,
}: {
  name: string;
  email: string;
  companyName: string;
}) {
  const firstName = name.split(' ')[0];

  const html = shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Bem-vindo ao CM Pro, ${firstName}!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      A conta de <strong style="color:#0f172a;">${companyName}</strong> foi criada com sucesso.
      Você já pode acessar a plataforma e começar a encontrar oportunidades de licitação.
    </p>

    <table cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:28px;width:100%;">
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#15803d;">✓ Conta ativa</p>
          <p style="margin:0;font-size:13px;color:#166534;">Escolha seu plano para começar a enviar campanhas e monitorar licitações.</p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${baseUrl}/dashboard"
             style="display:inline-block;padding:14px 32px;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.02em;">
            Acessar a Plataforma →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
      Dúvidas? Responda este email e nossa equipe te ajuda.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Bem-vindo ao CM Pro, ${firstName}!`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Payment confirmed / receipt email
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPaymentConfirmedEmail({
  name,
  email,
  companyName,
  value,
  planName,
}: {
  name: string;
  email: string;
  companyName: string;
  value: number;
  planName: string;
}) {
  const firstName = name.split(' ')[0];
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

  const html = shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Pagamento confirmado! ✓
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}. Recebemos seu pagamento e sua assinatura está ativa.
    </p>

    <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;width:100%;overflow:hidden;">
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:12px 20px;font-size:13px;color:#64748b;">Empresa</td>
        <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${companyName}</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:12px 20px;font-size:13px;color:#64748b;">Plano</td>
        <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${planName}</td>
      </tr>
      <tr>
        <td style="padding:12px 20px;font-size:13px;color:#64748b;">Valor pago</td>
        <td style="padding:12px 20px;font-size:15px;font-weight:800;color:#10b981;text-align:right;">${formattedValue}</td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${baseUrl}/dashboard"
             style="display:inline-block;padding:14px 32px;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.02em;">
            Acessar a Plataforma →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
      Guarde este email como comprovante. Em caso de dúvidas, responda aqui.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Pagamento confirmado — Plano ${planName} · CM Pro`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Trial expiring alert email
// ─────────────────────────────────────────────────────────────────────────────

export async function sendTrialExpiringEmail({
  name,
  email,
  companyName,
  daysLeft,
}: {
  name: string;
  email: string;
  companyName: string;
  daysLeft: number;
}) {
  const firstName = name.split(' ')[0];
  const urgency = daysLeft <= 1 ? 'amanhã' : `em ${daysLeft} dias`;

  const html = shell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Seu período de avaliação termina ${urgency}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}. O período de avaliação de <strong style="color:#0f172a;">${companyName}</strong>
      ${daysLeft <= 1 ? 'termina amanhã' : `termina em <strong>${daysLeft} dias</strong>`}.
      Para continuar acessando a plataforma, escolha um plano.
    </p>

    <table cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:28px;width:100%;">
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;">⚠ Atenção</p>
          <p style="margin:0;font-size:13px;color:#78350f;line-height:1.5;">
            Após o vencimento, o acesso será suspenso até a contratação de um plano.
            Seus dados ficam preservados por 30 dias.
          </p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${baseUrl}/signup/plan"
             style="display:inline-block;padding:14px 32px;background:#10b981;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.02em;">
            Escolher meu plano →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
      Dúvidas sobre os planos? Responda este email.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Seu período de avaliação termina ${urgency} — CM Pro`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// sendPaymentFailedEmail
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPaymentFailedEmail({
  to,
  name,
  planName,
  retryUrl,
}: {
  to: string;
  name: string;
  planName: string;
  retryUrl: string;
}) {
  const html = shell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">
      Problema com seu pagamento
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Olá, <strong>${name}</strong>. Identificamos uma falha no pagamento da sua assinatura
      do plano <strong>${planName}</strong> no CM Pro.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 18px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#991b1b;">⚠ Pagamento não processado</p>
          <p style="margin:0;font-size:13px;color:#b91c1c;line-height:1.5;">
            Seu acesso pode ser suspenso caso o pagamento não seja regularizado. Por favor,
            atualize sua forma de pagamento o quanto antes.
          </p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${retryUrl}"
             style="display:inline-block;padding:14px 32px;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.02em;">
            Atualizar forma de pagamento →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
      Dúvidas? Responda este email e nossa equipe te ajuda.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Problema com seu pagamento — CM Pro',
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// sendSubscriptionCancelledEmail
// ─────────────────────────────────────────────────────────────────────────────

export async function sendSubscriptionCancelledEmail({
  to,
  name,
  planName,
  accessUntil,
}: {
  to: string;
  name: string;
  planName: string;
  accessUntil: string | null;
}) {
  const accessLine = accessUntil
    ? `Seu acesso ao plano <strong>${planName}</strong> permanece ativo até <strong>${accessUntil}</strong>.`
    : `Seu acesso ao plano <strong>${planName}</strong> permanece ativo até o fim do período já pago.`;

  const html = shell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">
      Assinatura cancelada
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Olá, <strong>${name}</strong>. Confirmamos o cancelamento da sua assinatura do CM Pro.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0f172a;">Plano cancelado: ${planName}</p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">${accessLine}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#475569;line-height:1.5;">
            Após essa data, seus dados ficam disponíveis por 30 dias antes de serem removidos.
          </p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${baseUrl}/signup/plan"
             style="display:inline-block;padding:14px 32px;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.02em;">
            Reativar assinatura →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
      Sentimos sua falta. Se quiser conversar, responda este email.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Sua assinatura foi cancelada — CM Pro',
    html,
  });
}
