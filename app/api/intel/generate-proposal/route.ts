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
    const { company_id, opportunity_id } = body;

    if (!company_id || !opportunity_id) {
      return NextResponse.json({ error: 'company_id e opportunity_id obrigatórios' }, { status: 400 });
    }

    // Buscar perfil consolidado da empresa
    const { data: profile, error: profileError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil estratégico não encontrado. Configure o Perfil Estratégico antes de gerar propostas.' }, { status: 404 });
    }

    if (!profile.consolidated_text) {
      return NextResponse.json({ error: 'Gere o Perfil Consolidado no Perfil Estratégico antes de criar propostas.' }, { status: 400 });
    }

    // Buscar dados da oportunidade
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Oportunidade não encontrada.' }, { status: 404 });
    }

    const prompt = `Você é um especialista em licitações públicas brasileiras e redação de propostas comerciais B2G.

Sua tarefa é gerar uma proposta comercial completa e profissional para participação em uma licitação pública, cruzando os dados da empresa com os dados do edital.

PERFIL DA EMPRESA:
${profile.consolidated_text}

DADOS ESTRUTURAIS DA EMPRESA:
- Razão Social: ${profile.razao_social || profile.company_name || 'Não informado'}
- CNPJ: ${profile.cnpj || 'Não informado'}
- Endereço: ${profile.endereco || 'Não informado'}
- Telefone: ${profile.telefone || 'Não informado'}

DADOS DA LICITAÇÃO:
- Objeto: ${opportunity.title}
- Órgão: ${opportunity.organ_name}
- Modalidade: ${opportunity.modality || 'Pregão Eletrônico'}
- Situação: ${opportunity.situation || 'Publicada'}
- Valor Estimado: ${opportunity.estimated_value ? formatCurrency(opportunity.estimated_value) : 'Não informado'}
- Data de Publicação: ${opportunity.publication_date ? new Date(opportunity.publication_date).toLocaleDateString('pt-BR') : 'Não informado'}
- Data de Abertura: ${opportunity.opening_date ? new Date(opportunity.opening_date).toLocaleDateString('pt-BR') : 'Não informado'}
- Descrição: ${opportunity.description || opportunity.title}

ESTRUTURA DA PROPOSTA (siga exatamente esta ordem):

1. IDENTIFICAÇÃO DA EMPRESA
   - Razão Social, CNPJ, endereço, telefone

2. APRESENTAÇÃO DA PROPOSTA
   - Parágrafo apresentando a empresa e sua qualificação para atender este objeto específico

3. OBJETO DA PROPOSTA
   - Descrição clara do que está sendo ofertado para atender ao edital

4. QUALIFICAÇÃO TÉCNICA
   - Como a empresa atende os requisitos técnicos deste objeto

5. PROPOSTA COMERCIAL
   - Valor proposto (usar o valor estimado como referência)
   - Condições de fornecimento/execução
   - Prazo de entrega/execução

6. HABILITAÇÃO JURÍDICA E REGULARIDADE FISCAL
   - Declaração de regularidade e conformidade documental

7. VALIDADE DA PROPOSTA
   - 60 dias corridos a partir da data de abertura

8. ASSINATURA
   - Espaço para assinatura do representante legal

Regras:
- Linguagem formal e técnica
- Tom profissional e confiável
- Não inventar dados que não foram fornecidos
- Usar os dados reais da empresa e da licitação
- Escreva em português do Brasil
- Formato de documento formal com títulos em maiúsculas para cada seção`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      throw new Error(errorData?.error?.message || 'Erro ao chamar Gemini API');
    }

    const geminiData = await geminiResponse.json();
    const proposalContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!proposalContent) {
      throw new Error('Gemini não retornou conteúdo.');
    }

    // Verificar se já existe proposta para esta oportunidade
    const { data: existingProposal } = await supabase
      .from('ai_proposals')
      .select('id')
      .eq('company_id', company_id)
      .eq('opportunity_id', opportunity_id)
      .maybeSingle();

    let savedProposal;
    if (existingProposal) {
      const { data } = await supabase
        .from('ai_proposals')
        .update({ content: proposalContent, updated_at: new Date().toISOString() })
        .eq('id', existingProposal.id)
        .select()
        .single();
      savedProposal = data;
    } else {
      const { data } = await supabase
        .from('ai_proposals')
        .insert({
          company_id,
          opportunity_id,
          opportunity_title: opportunity.title,
          content: proposalContent,
        })
        .select()
        .single();
      savedProposal = data;
    }

    return NextResponse.json({
      ok: true,
      proposal_id: savedProposal?.id,
      content: proposalContent,
    });

  } catch (error) {
    console.error('GENERATE PROPOSAL ERROR:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
