export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, title } = body;

    if (!content) {
      return NextResponse.json({ error: 'Conteúdo da proposta obrigatório' }, { status: 400 });
    }

    const proposalTitle = title || 'Proposta Comercial';
    const lines = content.split('\n');

    const htmlLines = lines.map((line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return '<br/>';

      // Títulos em maiúsculas (seções)
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
        return `<h2 style="color:#0f49bd;font-size:14px;font-weight:bold;margin-top:20px;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${trimmed}</h2>`;
      }

      // Negrito markdown **texto**
      const withBold = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Itálico markdown *texto*
      const withItalic = withBold.replace(/\*(.*?)\*/g, '<em>$1</em>');

      return `<p style="margin:4px 0;font-size:12px;line-height:1.6;color:#374151;">${withItalic}</p>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${proposalTitle}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #111827;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      background: #0f49bd;
      color: white;
      padding: 24px 32px;
      border-radius: 8px;
      margin-bottom: 32px;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: bold;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 13px;
      opacity: 0.8;
    }
    .content {
      line-height: 1.6;
    }
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f49bd;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(15,73,189,0.3);
    }
    .print-btn:hover { background: #0a3690; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${proposalTitle}</h1>
    <p>Gerado pelo CM Intelligence — Plataforma B2G · ${new Date().toLocaleDateString('pt-BR')}</p>
  </div>
  <div class="content">
    ${htmlLines}
  </div>
  <div class="footer">
    CM Intelligence — Plataforma de Inteligência Comercial B2G · Documento gerado automaticamente
  </div>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Salvar como PDF</button>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('GENERATE PDF ERROR:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
