export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company_id } = body;

    if (!company_id) {
      return NextResponse.json({ error: 'company_id obrigatório' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil estratégico não encontrado.' }, { status: 404 });
    }

    const { data: catalogs } = await supabase
      .from('company_catalogs')
      .select('file_name, product_line')
      .eq('company_id', company_id);

    const { data: documents } = await supabase
      .from('company_documents')
      .select('file_name, category, description')
      .eq('company_id', company_id);

    const catalogsText = catalogs && catalogs.length > 0
      ? catalogs.map(c => `- ${c.product_line || 'Linha não informada'}: ${c.file_name}`).join('\n')
      : 'Nenhum catálogo cadastrado.';

    const docCategories: Record<string, string[]> = {};
    (documents || []).forEach(doc => {
      if (!docCategories[doc.category]) docCategories[doc.category] = [];
      docCategories[doc.category].push(doc.description || doc.file_name);
    });

    const categoryLabels: Record<string, string> = {
      habilitacao_juridica: 'Habilitação Jurídica',
      regularidade_fiscal: 'Regularidade Fiscal e Trabalhista',
      qualificacao_tecnica: 'Qualificação Técnica',
      qualificacao_economica: 'Qualificação Econômico-Financeira',
      outros: 'Outros',
    };

    const documentsText = Object.keys(docCategories).length > 0
      ? Object.entries(docCategories).map(([cat, docs]) =>
          `${categoryLabels[cat] || cat}: ${docs.join(', ')}`
        ).join('\n')
      : 'Nenhum documento cadastrado.';

    const statesText = (profile.target_states || []).join(', ') || 'Não informado';

    const prompt = `Você é um especialista em vendas B2G e redação de propostas para licitações públicas brasileiras.

Sua tarefa é transformar os dados estruturados de uma empresa em um texto institucional estratégico, claro, objetivo e persuasivo, que represente essa empresa em processos licitatórios.

Com base nas informações abaixo, gere um texto consolidado que contenha:
1. Apresentação da empresa
2. Segmento de atuação e especialidades
3. Tipos de soluções oferecidas
4. Capacidade operacional e financeira
5. Regiões de atuação
6. Diferenciais competitivos
7. Capacidade de atender o setor público
8. Conformidade documental e habilitação
9. Posicionamento comercial (tom profissional, seguro e confiável)

Regras:
- Não inventar dados
- Pode inferir contexto com base nos dados fornecidos
- Linguagem formal, clara e comercial
- Texto fluido, em parágrafos (sem bullet points)
- Máximo de 3 a 4 parágrafos
- Escreva em português do Brasil

DADOS DA EMPRESA:

[IDENTIDADE COMERCIAL]
Nome: ${profile.company_name || 'Não informado'}
Segmento: ${profile.main_segment || 'Não informado'}
Subsegmentos: ${profile.subsegments || 'Não informado'}
Categorias PNCP: ${profile.target_categories || 'Não informado'}

[PALAVRAS-CHAVE]
Positivas (termos de interesse): ${profile.positive_keywords || 'Não informado'}
Negativas (fora de escopo): ${profile.negative_keywords || 'Não informado'}

[CAPACIDADE FINANCEIRA]
Ticket mínimo: ${profile.min_ticket ? formatCurrency(profile.min_ticket) : 'Não informado'}
Ticket máximo: ${profile.max_ticket ? formatCurrency(profile.max_ticket) : 'Não informado'}

[ALCANCE GEOGRÁFICO]
Estados de atuação: ${statesText}
Municípios prioritários: ${profile.target_municipalities || 'Não informado'}

[ALVOS ESPECÍFICOS]
Órgãos prioritários: ${profile.preferred_buyers || 'Não informado'}
Órgãos a evitar: ${profile.excluded_buyers || 'Não informado'}

[CATÁLOGOS DE PRODUTOS]
${catalogsText}

[DOCUMENTAÇÃO DE HABILITAÇÃO]
${documentsText}

Gere o texto final consolidado da empresa agora:`;

    // Chamar Gemini via REST API diretamente — evita problemas de versão do SDK
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('GEMINI API ERROR:', errorData);
      throw new Error(errorData?.error?.message || 'Erro ao chamar Gemini API');
    }

    const geminiData = await geminiResponse.json();
    const consolidatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!consolidatedText) {
      throw new Error('Gemini não retornou texto.');
    }

    const { error: updateError } = await supabase
      .from('company_profiles')
      .update({
        consolidated_text: consolidatedText,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', company_id);

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao salvar texto consolidado.' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      consolidated_text: consolidatedText,
    });

  } catch (error) {
    console.error('CONSOLIDATE PROFILE ERROR:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
