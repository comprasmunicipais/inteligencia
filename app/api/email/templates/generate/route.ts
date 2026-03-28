export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';

const TEMPLATE_TYPES = ['prospeccao', 'relacionamento', 'apresentacao', 'followup'] as const;
type TemplateType = typeof TEMPLATE_TYPES[number];

interface GeminiTemplate {
  type: TemplateType;
  subject: string;
  body: string;
}

export async function POST() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile?.company_id) {
    return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 403 });
  }

  const companyId = userProfile.company_id;

  const { data: companyProfile, error: cpError } = await supabase
    .from('company_profiles')
    .select('consolidated_text')
    .eq('company_id', companyId)
    .single();

  if (cpError || !companyProfile?.consolidated_text?.trim()) {
    return NextResponse.json(
      { error: 'Gere o Perfil Consolidado no Perfil Estratégico antes de usar esta função.' },
      { status: 400 }
    );
  }

  const profileHash = createHash('sha256')
    .update(companyProfile.consolidated_text)
    .digest('hex');

  // Verificar se todos os 4 templates já existem com o mesmo hash (cache)
  const { data: existing } = await supabase
    .from('email_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('profile_hash', profileHash);

  if (existing && existing.length === 4) {
    return NextResponse.json({ templates: existing, cached: true });
  }

  // Gerar via Gemini
  const prompt = `Você é um especialista em marketing B2G para prefeituras municipais brasileiras.

Com base no perfil comercial da empresa abaixo, gere EXATAMENTE 4 templates de e-mail profissionais.

PERFIL DA EMPRESA:
${companyProfile.consolidated_text}

INSTRUÇÕES:
- Use variáveis [Nome], [Municipio] e [Estado] nos textos
- Tom profissional, direto e persuasivo
- Português do Brasil formal
- Corpo do e-mail em texto simples (sem HTML)
- Cada body deve ter entre 3 e 6 parágrafos
- Responda APENAS com JSON válido, sem markdown, sem explicações antes ou depois

FORMATO DE RESPOSTA (JSON array exato):
[
  {
    "type": "prospeccao",
    "subject": "assunto do e-mail de prospecção",
    "body": "corpo completo do e-mail de prospecção"
  },
  {
    "type": "relacionamento",
    "subject": "assunto do e-mail de relacionamento",
    "body": "corpo completo do e-mail de relacionamento"
  },
  {
    "type": "apresentacao",
    "subject": "assunto do e-mail de apresentação comercial",
    "body": "corpo completo do e-mail de apresentação"
  },
  {
    "type": "followup",
    "subject": "assunto do e-mail de follow-up",
    "body": "corpo completo do e-mail de follow-up"
  }
]`;

  const geminiRes = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!geminiRes.ok) {
    const err = await geminiRes.json();
    return NextResponse.json(
      { error: err?.error?.message || 'Erro ao chamar Gemini API.' },
      { status: 500 }
    );
  }

  const geminiData = await geminiRes.json();
  const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    return NextResponse.json({ error: 'Gemini não retornou conteúdo.' }, { status: 500 });
  }

  let templates: GeminiTemplate[];
  try {
    // Remover possível markdown code block se o modelo incluir
    const clean = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    templates = JSON.parse(clean);
    if (!Array.isArray(templates) || templates.length !== 4) {
      throw new Error('Formato inesperado');
    }
  } catch {
    return NextResponse.json(
      { error: 'Erro ao interpretar resposta do Gemini. Tente novamente.' },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const rows = templates.map((t) => ({
    company_id: companyId,
    type: t.type,
    subject: t.subject,
    body: t.body,
    profile_hash: profileHash,
    generated_at: now,
    updated_at: now,
  }));

  const { data: upserted, error: upsertError } = await supabase
    .from('email_templates')
    .upsert(rows, { onConflict: 'company_id,type' })
    .select();

  if (upsertError) {
    console.error('SUPABASE ERROR (email_templates upsert):', upsertError);
    return NextResponse.json({ error: 'Erro ao salvar templates.' }, { status: 500 });
  }

  return NextResponse.json({ templates: upserted, cached: false });
}
