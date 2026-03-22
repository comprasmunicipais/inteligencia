export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proposal_id, content, title } = body;

    if (!content) {
      return NextResponse.json({ error: 'Conteúdo da proposta obrigatório' }, { status: 400 });
    }

    // Gerar HTML para o PDF
    const proposalTitle = title || 'Proposta Comercial';
    const lines = content.split('\n');

    const htmlLines = lines.map((line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return '<br/>';

      // Títulos em maiúsculas (seções)
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.startsWith('-')) {
        return `<h2 style="color:#0f49bd;font-size:14px;font-weight:bold;margin-top:20px;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${trimmed}</h2>`;
      }
      // Linhas com **texto** (negrito markdown)
      const withBold = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return `<p style="margin:4px 0;font-size:12px;line-height:1.6;color:#374151;">${withBold}</p>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #111827;
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
</body>
</html>`;

    // Retornar HTML para o cliente gerar o PDF via browser print
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
