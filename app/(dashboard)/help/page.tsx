'use client';

import React, { useState } from 'react';
import Header from '@/components/shared/Header';
import {
  Search,
  Book,
  MessageCircle,
  Mail,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  PlayCircle,
  FileText
} from 'lucide-react';

const articles = [
  {
    title: 'Como cadastrar uma conta de envio de e-mail',
    content: (
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 leading-relaxed">
        <li>Acesse <strong>Configurações</strong> no menu lateral.</li>
        <li>Clique na aba <strong>Contas de Envio</strong>.</li>
        <li>Clique em <strong>Adicionar Conta</strong>.</li>
        <li>Preencha os dados SMTP: servidor, porta, usuário e senha. Use a porta <strong>465 (SSL)</strong> ou <strong>587 (STARTTLS)</strong> conforme seu provedor.</li>
        <li>Clique em <strong>Testar Conexão</strong> para validar as credenciais antes de salvar.</li>
        <li>Se o teste passar, clique em <strong>Salvar</strong>. A conta estará disponível para uso nas campanhas.</li>
        <li>Você pode cadastrar até 5 contas por empresa.</li>
      </ol>
    ),
  },
  {
    title: 'Como criar sua primeira campanha de e-mail',
    content: (
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 leading-relaxed">
        <li>Acesse <strong>E-mail Marketing</strong> no menu lateral e clique em <strong>Nova Campanha</strong>.</li>
        <li><strong>Etapa 1 — Editor</strong>: preencha o assunto, o preheader e o conteúdo do e-mail. Use o editor rico ou cole seu HTML diretamente. Utilize as variáveis <code>[Municipio]</code> e <code>[Estado]</code> para personalização automática.</li>
        <li><strong>Etapa 2 — Audiência</strong>: filtre os destinatários por estado, porte do município, secretaria ou score mínimo de aderência. O contador ao vivo mostrará quantas prefeituras serão alcançadas.</li>
        <li><strong>Etapa 3 — Resumo</strong>: revise tudo antes de continuar. O botão só estará ativo se o conteúdo e a audiência estiverem válidos.</li>
        <li><strong>Etapa 4 — Envio</strong>: selecione a conta de envio SMTP desejada, confirme e clique em <strong>Enviar Campanha</strong>. Os e-mails serão enfileirados e disparados automaticamente.</li>
        <li>Acompanhe abertura e cliques em <strong>Histórico</strong> após o envio.</li>
      </ol>
    ),
  },
  {
    title: 'Como configurar seu Perfil Estratégico',
    content: (
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 leading-relaxed">
        <li>Acesse <strong>Inteligência &gt; Perfil Estratégico</strong> no menu lateral.</li>
        <li>Preencha as <strong>Categorias de Interesse</strong> — segmentos de produto ou serviço que sua empresa fornece (ex.: ambulância, equipamento hospitalar). Separe por vírgula.</li>
        <li>Adicione <strong>Palavras-chave Positivas</strong> para identificar licitações de interesse, e <strong>Palavras-chave Negativas</strong> para excluir licitações fora do escopo.</li>
        <li>Informe os <strong>Estados Prioritários</strong> onde sua empresa atua, a <strong>Modalidade Preferida</strong> (ex.: Pregão Eletrônico) e a faixa de <strong>Ticket Ideal</strong> (valor mínimo e máximo de licitação).</li>
        <li>Salve o perfil e clique em <strong>Recalcular Scores</strong> na página de Licitações para reclassificar todas as oportunidades com base no novo perfil.</li>
        <li>Licitações com score ≥ 70 aparecem como <em>Alta Aderência</em> no módulo de Inteligência.</li>
      </ol>
    ),
  },
  {
    title: 'Como vincular uma licitação a uma proposta',
    content: (
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 leading-relaxed">
        <li>Acesse <strong>Inteligência &gt; Licitações</strong> e localize a licitação desejada.</li>
        <li>Clique no botão <strong>Gerar Proposta</strong> ao lado da licitação. A IA irá pré-preencher os campos com base no edital e no seu perfil.</li>
        <li>Revise o conteúdo gerado, ajuste valores, prazo e condições comerciais conforme necessário.</li>
        <li>Salve a proposta. Ela ficará vinculada automaticamente à licitação de origem.</li>
        <li>Para acompanhar o andamento, acesse <strong>CRM &gt; Propostas</strong>. A proposta aparecerá com o status <em>Em elaboração</em>.</li>
        <li>Atualize o status conforme a negociação avança: <em>Enviada</em>, <em>Em negociação</em>, <em>Ganha</em> ou <em>Perdida</em>.</li>
      </ol>
    ),
  },
  {
    title: 'Como usar o Funil de Vendas',
    content: (
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 leading-relaxed">
        <li>Acesse <strong>CRM &gt; Pipeline</strong> no menu lateral.</li>
        <li>O funil exibe seus negócios organizados por etapa: <em>Prospecção</em>, <em>Qualificação</em>, <em>Proposta</em>, <em>Negociação</em>, <em>Fechamento</em>.</li>
        <li>Para adicionar um novo negócio, clique em <strong>+ Novo Negócio</strong> na coluna desejada.</li>
        <li>Arraste os cards entre as colunas conforme o avanço da negociação.</li>
        <li>Clique em um card para ver o detalhe completo: prefeitura vinculada, valor, contato responsável e histórico de atividades.</li>
        <li>Acompanhe a <strong>Previsão do Mês</strong> (soma dos negócios Ganhos no mês atual) e a <strong>Taxa de Conversão</strong> direto no topo da página.</li>
        <li>Use os filtros de período para analisar performance histórica do funil.</li>
      </ol>
    ),
  },
];

export default function HelpPage() {
  const [openArticle, setOpenArticle] = useState<number | null>(null);

  const categories = [
    { title: 'Primeiros Passos', icon: PlayCircle, description: 'Aprenda o básico para começar a usar a plataforma.' },
    { title: 'CRM e Vendas', icon: PlayCircle, description: 'Como gerenciar prefeituras, contatos e seu pipeline.' },
    { title: 'Propostas e Contratos', icon: FileText, description: 'Criação de propostas e gestão de contratos vigentes.' },
    { title: 'Configurações', icon: PlayCircle, description: 'Ajustes de conta, organização e permissões.' },
  ];

  return (
    <>
      <Header title="Central de Ajuda" subtitle="Encontre respostas e aprenda a tirar o máximo proveito do CM Pro." />

      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Search Section */}
          <div className="bg-[#0f49bd] rounded-3xl p-12 text-center text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 size-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black mb-4">Como podemos ajudar?</h2>
              <div className="max-w-2xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                <input
                  type="text"
                  placeholder="Busque por artigos, tutoriais ou dúvidas..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-gray-900 outline-none shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <div key={cat.title} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#0f49bd] mb-4 group-hover:scale-110 transition-transform">
                  <cat.icon className="size-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{cat.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{cat.description}</p>
              </div>
            ))}
          </div>

          {/* Popular Articles */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Book className="size-5 text-[#0f49bd]" />
                Artigos Populares
              </h3>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {articles.map((article, idx) => (
                  <div key={idx}>
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left group"
                      onClick={() => setOpenArticle(openArticle === idx ? null : idx)}
                    >
                      <span className="text-sm font-bold text-gray-700 group-hover:text-[#0f49bd]">{article.title}</span>
                      {openArticle === idx
                        ? <ChevronDown className="size-4 text-[#0f49bd] flex-shrink-0" />
                        : <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
                      }
                    </button>
                    {openArticle === idx && (
                      <div className="px-4 pb-4">
                        {article.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="size-5 text-[#0f49bd]" />
                Ainda precisa de ajuda?
              </h3>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <p className="text-sm text-gray-500">Nossa equipe de suporte está disponível de segunda a sexta, das 09h às 18h.</p>
                <a
                  href="https://wa.me/551132807010?text=Estou%20no%20CM%20Pro%20e%20preciso%20de%20seu%20aux%C3%ADlio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#0f49bd] text-white rounded-xl font-bold text-sm hover:bg-[#0a3690] transition-all"
                >
                  <MessageCircle className="size-4" />
                  Falar no WhatsApp
                </a>
                <a
                  href="mailto:cmpro@comprasmunicipais.com.br"
                  className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  <Mail className="size-4" />
                  Enviar E-mail
                </a>
                <div className="pt-4 border-t border-gray-100">
                  <a href="#" className="flex items-center justify-between text-xs font-bold text-gray-500 hover:text-[#0f49bd]">
                    Documentação da API
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
