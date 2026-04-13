import { Resend } from 'resend'

export async function sendContractEmail(
  toEmail: string,
  toName: string,
  pdfBytes: Uint8Array
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'CM Pro <contratos@comprasmunicipais.com.br>',
    to: toEmail,
    subject: 'Seu contrato CM Pro está disponível',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <div style="background: #0d1220; padding: 32px 40px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #f0f4ff; font-size: 20px; margin: 0;">CM <span style="color: #10b981;">PRO</span></h1>
          <p style="color: rgba(148,163,184,0.7); font-size: 12px; margin: 6px 0 0;">Compras Municipais Pro</p>
        </div>
        <div style="background: #f8fafc; padding: 32px 40px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 15px; margin: 0 0 16px;">Olá${toName ? ', ' + toName : ''},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
            Sua assinatura do <strong>CM Pro</strong> foi confirmada com sucesso.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
            Em anexo você encontra o <strong>Contrato de Licença de Software e Prestação de Serviços</strong>
            referente ao plano contratado. Recomendamos guardar este documento em local seguro para
            referência futura.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
            Em caso de dúvidas, entre em contato pelo e-mail
            <a href="mailto:contato@comprasmunicipais.com.br" style="color: #10b981;">contato@comprasmunicipais.com.br</a>
            ou pelo WhatsApp <strong>+55 11 3280-7010</strong>.
          </p>
          <p style="font-size: 13px; color: #64748b; margin: 0;">
            Atenciosamente,<br/>
            <strong>Equipe CM Pro</strong><br/>
            D'Amico Editora Ltda
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'Contrato_CM_Pro.pdf',
        content: Buffer.from(pdfBytes),
      },
    ],
  })
}
