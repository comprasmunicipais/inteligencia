export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 403 });
  }

  const { data: companyProfile, error: cpError } = await supabase
    .from('company_profiles')
    .select('consolidated_text')
    .eq('company_id', profile.company_id)
    .single();

  if (cpError || !companyProfile) {
    return NextResponse.json(
      { error: 'Perfil estratégico não encontrado. Configure o Perfil Estratégico antes de gerar conteúdo.' },
      { status: 404 },
    );
  }

  if (!companyProfile.consolidated_text?.trim()) {
    return NextResponse.json(
      { error: 'Gere o Perfil Consolidado no Perfil Estratégico antes de usar esta função.' },
      { status: 400 },
    );
  }

  const prompt = `Com base no perfil comercial abaixo, escreva um e-mail de prospecção para prefeituras municipais. O e-mail deve ter tom profissional, ser direto, destacar o diferencial da empresa e terminar com uma chamada para ação clara. Gere apenas o corpo do e-mail em HTML simples (sem <!DOCTYPE>, sem <html>, sem <head>, sem <body> — apenas o conteúdo interno), usando as variáveis [Nome] para o nome do contato, [Municipio] para o nome do município e [Estado] para o estado. Perfil: ${companyProfile.consolidated_text}`;

  const geminiRes = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    },
  );

  if (!geminiRes.ok) {
    const err = await geminiRes.json();
    return NextResponse.json(
      { error: err?.error?.message || 'Erro ao chamar Gemini API.' },
      { status: 500 },
    );
  }

  const geminiData = await geminiRes.json();
  const rawContent: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawContent) {
    return NextResponse.json({ error: 'Gemini não retornou conteúdo.' }, { status: 500 });
  }

  // Wrap in a styled container matching the project's email template pattern
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 32px; }
    h1, h2, h3 { color: #0f172a; }
    p { font-size: 15px; line-height: 1.6; color: #475569; }
    a { color: #0f49bd; }
    .cta { display:inline-block; margin-top:24px; padding:12px 24px; background:#0f49bd; color:#fff; text-decoration:none; border-radius:6px; font-weight:600; }
  </style>
</head>
<body>
  <div class="container">
    ${rawContent}
  </div>
</body>
</html>`;

  return NextResponse.json({ html });
}
