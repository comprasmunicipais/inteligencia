import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatDate } from '@/lib/utils';

export async function generateReportPDF(report: {
  id?: string;
  name: string;
  type: string;
  lastGenerated: string;
  data?: any;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Header
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width: width,
    height: 120,
    color: rgb(0.06, 0.29, 0.74), // #0f49bd
  });

  page.drawText('CM INTELLIGENCE', {
    x: 50,
    y: height - 60,
    size: 28,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('RELATÓRIO ESTRATÉGICO DE INTELIGÊNCIA', {
    x: 50,
    y: height - 90,
    size: 14,
    font: fontRegular,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Report Info
  let y = height - 180;

  page.drawText(report.name.toUpperCase(), {
    x: 50,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 40;
  page.drawText(`Categoria: ${report.type}`, { x: 50, y, size: 12, font: fontRegular });
  y -= 20;
  page.drawText(`Data de Geração: ${formatDate(report.lastGenerated)}`, { x: 50, y, size: 12, font: fontRegular });
  y -= 20;
  page.drawText(`Responsável: Fernando D'Amico`, { x: 50, y, size: 12, font: fontRegular });

  // Content Placeholder
  y -= 60;
  page.drawRectangle({
    x: 50,
    y: y - 300,
    width: width - 100,
    height: 300,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 1,
  });

  page.drawText('RESUMO EXECUTIVO', {
    x: 70,
    y: y - 30,
    size: 12,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  const summaryText = `Este relatório apresenta uma análise detalhada sobre ${report.name.toLowerCase()}. 
Os dados foram extraídos e processados pela inteligência artificial do Painel de Compras, 
considerando as tendências de mercado e o histórico de licitações públicas.

Principais Insights:
1. Crescimento de 15% nas oportunidades do setor no último trimestre.
2. Concentração de 40% das licitações na região Sudeste.
3. Ticket médio das propostas vencedoras está em R$ 450.000,00.`;

  const lines = summaryText.split('\n');
  let textY = y - 60;
  for (const line of lines) {
    page.drawText(line, {
      x: 70,
      y: textY,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
      lineHeight: 15,
    });
    textY -= 20;
  }

  // Footer
  page.drawText('Confidencial - CM Pro © 2024', {
    x: width / 2 - 100,
    y: 30,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-${report.id || 'export'}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
