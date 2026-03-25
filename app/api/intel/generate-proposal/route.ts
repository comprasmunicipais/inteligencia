export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userProfileError || !userProfile?.company_id) {
      return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 403 });
    }

    const body = await request.json();
    const { company_id, opportunity_id } = body;

    if (!company_id || !opportunity_id) {
      return NextResponse.json({ error: 'company_id e opportunity_id obrigatórios' }, { status: 400 });
    }

    if (userProfile.company_id !== company_id) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

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

    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Oportunidade não encontrada.' }, { status: 404 });
    }

    const prompt = `Você é um redator especialista em propostas comerciais para licitações públicas brasileiras.

INSTRUÇÕES CRÍTICAS — SIGA EXATAMENTE:
- Gere APENAS o documento formal da proposta
- NÃO adicione introduções, apresentações ou preâmbulos antes do documento
- NÃO adicione observações, notas, dicas ou comentários após o documento
- NÃO explique o que está fazendo
- Comece o documento DIRETAMENTE com o título "PROPOSTA COMERCIAL"
- Termine o documento EXATAMENTE na linha de assinatura, sem nenhum texto adicional após

PERFIL DA EMPRESA:
${profile.consolidated_text}

DADOS ESTRUTURAIS DA EMPRESA:
- Razão Social: ${profile.razao_social || profile.company_name || 'A preencher'}
- CNPJ: ${profile.cnpj || 'A preencher'}
- Endereço: ${profile.endereco || 'A preencher'}
- Telefone: ${profile.telefone || 'A preencher'}

DADOS DA LICITAÇÃO:
- Objeto: ${opportunity.title}
- Órgão: ${opportunity.organ_name}
- Modalidade: ${opportunity.modality || 'Pregão Eletrônico'}
- Situação: ${opportunity.situation || 'Publicada'}
- Valor Estimado: ${opportunity.estimated_value ? formatCurrency(opportunity.estimated_value) : 'A ser informado'}
- Data de Publicação: ${opportunity.publication_date ? new Date(opportunity.publication_date).toLocaleDateString('pt-BR') : 'A informar'}
- Data de Abertura: ${opportunity.opening_date ? new Date(opportunity.opening_date).toLocaleDateString('pt-BR') : 'A informar'}
- Descrição: ${opportunity.description || opportunity.title}

ESTRUTURA OBRIGATÓRIA DO DOCUMENTO:

PROPOSTA COMERCIAL
[linha em branco]
REFERÊNCIA: [modalidade] — [objeto resumido] — [órgão]
DATA: [data atual]
[linha em branco]
---
[linha em branco]
1. IDENTIFICAÇÃO DA EMPRESA
[dados da empresa]
[linha em branco]
2. APRESENTAÇÃO DA PROPOSTA
[parágrafo apresentando a empresa e sua qualificação para este objeto]
[linha em branco]
3. OBJETO DA PROPOSTA
[descrição do que está sendo ofertado]
[linha em branco]
4. QUALIFICAÇÃO TÉCNICA
[como a empresa atende os requisitos técnicos]
[linha em branco]
5. PROPOSTA COMERCIAL
[valor, condições e prazo]
[linha em branco]
6. HABILITAÇÃO JURÍDICA E REGULARIDADE FISCAL
[declaração de regularidade]
[linha em branco]
7. VALIDADE DA PROPOSTA
60 (sessenta) dias corridos a partir da data de abertura.
[linha em branco]
8. ASSINATURA
[linha de assinatura do representante legal]`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
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
    let proposalContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!proposalContent) {
      throw new Error('Gemini não retornou conteúdo.');
    }

    // Garantir que começa em PROPOSTA COMERCIAL
    const startIndex = proposalContent.indexOf('PROPOSTA COMERCIAL');
    if (startIndex > 0) {
      proposalContent = proposalContent.substring(startIndex);
    }

    // Título limpo — apenas o título da oportunidade
    const proposalTitle = opportunity.title.substring(0, 100);

    // Salvar na tabela ai_proposals
    const { data: existingAiProposal } = await supabase
      .from('ai_proposals')
      .select('id')
      .eq('company_id', company_id)
      .eq('opportunity_id', opportunity_id)
      .maybeSingle();

    let savedAiProposal;
    if (existingAiProposal) {
      const { data } = await supabase
        .from('ai_proposals')
        .update({ content: proposalContent, updated_at: new Date().toISOString() })
        .eq('id', existingAiProposal.id)
        .select()
        .single();
      savedAiProposal = data;
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
      savedAiProposal = data;
    }

    // Salvar na tabela proposals (CRM)
    const { data: existingProposal } = await supabase
      .from('proposals')
      .select('id')
      .eq('company_id', company_id)
      .eq('opportunity_id', opportunity_id)
      .maybeSingle();

    let crmProposalId: string | null = existingProposal?.id || null;

    if (!existingProposal) {
      const { data: crmProposal, error: crmError } = await supabase
        .from('proposals')
        .insert({
          company_id,
          opportunity_id,
          title: proposalTitle,
          municipality_id: opportunity.municipality_id || null,
          value: opportunity.estimated_value || 0,
          status: 'draft',
          department: opportunity.organ_name || null,
          date: new Date().toISOString(),
          ai_generated: true,
          ai_content: proposalContent,
        })
        .select('id')
        .single();

      if (crmError) {
        console.error('ERRO ao salvar em proposals:', crmError);
      } else {
        crmProposalId = crmProposal?.id || null;
      }
    }

    // Buscar etapa "Proposta" do funil dinamicamente
    const { data: proposalStage, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id, title')
      .eq('company_id', company_id)
      .ilike('title', 'proposta')
      .maybeSingle();

    if (stageError) {
      console.error('ERRO ao buscar etapa Proposta:', stageError);
    }

    // Criar deal no funil
    if (proposalStage) {
      const { data: existingDeal } = await supabase
        .from('deals')
        .select('id')
        .eq('company_id', company_id)
        .eq('opportunity_id', opportunity_id)
        .maybeSingle();

      if (!existingDeal) {
        const { error: dealError } = await supabase
          .from('deals')
          .insert({
            company_id,
            opportunity_id,
            title: proposalTitle,
            status: proposalStage.id,
            estimated_value: opportunity.estimated_value || 0,
            municipality_id: opportunity.municipality_id || null,
            source: 'ai_proposal',
          });

        if (dealError) {
          console.error('ERRO ao criar deal no funil:', dealError);
        }
      }
    } else {
      console.warn(`Etapa "Proposta" não encontrada para company_id ${company_id}`);
    }

    return NextResponse.json({
      ok: true,
      proposal_id: savedAiProposal?.id,
      crm_proposal_id: crmProposalId,
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
