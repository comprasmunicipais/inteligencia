import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ProposalDTO } from '@/lib/types/dtos';

export async function generateProposalPDF(proposal: ProposalDTO) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Header
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.06, 0.29, 0.74), // #0f49bd
  });

  page.drawText('CM INTELLIGENCE', {
    x: 50,
    y: height - 60,
    size: 24,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('PROPOSTA COMERCIAL', {
    x: 50,
    y: height - 85,
    size: 12,
    font: fontRegular,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Proposal Info
  let y = height - 150;

  page.drawText('DADOS DA PROPOSTA', {
    x: 50,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 30;
  page.drawText(`Título: ${proposal.title}`, { x: 50, y, size: 12, font: fontRegular });
  y -= 20;
  page.drawText(`Órgão: ${proposal.account_name || 'N/A'}`, { x: 50, y, size: 12, font: fontRegular });
  y -= 20;
  page.drawText(`Data de Emissão: ${formatDate(proposal.date || proposal.created_at || new Date().toISOString())}`, { x: 50, y, size: 12, font: fontRegular });
  y -= 20;
  page.drawText(`Status Atual: ${proposal.status.toUpperCase()}`, { x: 50, y, size: 12, font: fontRegular });

  // Value Section
  y -= 50;
  page.drawRectangle({
    x: 50,
    y: y - 40,
    width: width - 100,
    height: 60,
    color: rgb(0.95, 0.96, 0.98),
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 1,
  });

  page.drawText('VALOR TOTAL DA PROPOSTA', {
    x: 70,
    y: y - 5,
    size: 10,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText(formatCurrency(proposal.value), {
    x: 70,
    y: y - 30,
    size: 20,
    font: fontBold,
    color: rgb(0.06, 0.29, 0.74),
  });

  // Footer
  page.drawText('Documento gerado automaticamente pela plataforma CM Intelligence.', {
    x: 50,
    y: 50,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `proposta-${proposal.id || 'export'}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
