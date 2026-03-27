'use client';

import React from 'react';
import Header from '@/components/shared/Header';
import { 
  Search, 
  Book, 
  MessageCircle, 
  Mail, 
  ExternalLink,
  ChevronRight,
  PlayCircle,
  FileText
} from 'lucide-react';

export default function HelpPage() {
  const categories = [
    { title: 'Primeiros Passos', icon: PlayCircle, description: 'Aprenda o básico para começar a usar a plataforma.' },
    { title: 'CRM e Vendas', icon: User, description: 'Como gerenciar prefeituras, contatos e seu pipeline.' },
    { title: 'Propostas e Contratos', icon: FileText, description: 'Criação de propostas e gestão de contratos vigentes.' },
    { title: 'Configurações', icon: Settings, description: 'Ajustes de conta, organização e permissões.' },
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
                {[
                  'Como importar sua base de prefeituras via Excel',
                  'Configurando alertas de vencimento de contratos',
                  'Gerando sua primeira proposta comercial em PDF',
                  'Entendendo as métricas do Dashboard',
                  'Gerenciando permissões da sua equipe'
                ].map((article) => (
                  <button key={article} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left group">
                    <span className="text-sm font-bold text-gray-700 group-hover:text-[#0f49bd]">{article}</span>
                    <ChevronRight className="size-4 text-gray-400" />
                  </button>
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
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-[#0f49bd] text-white rounded-xl font-bold text-sm hover:bg-[#0a3690] transition-all">
                  <MessageCircle className="size-4" />
                  Falar no WhatsApp
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">
                  <Mail className="size-4" />
                  Enviar E-mail
                </button>
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

// Mock components for the categories icons
function User(props: any) {
  return <PlayCircle {...props} />;
}
function Settings(props: any) {
  return <PlayCircle {...props} />;
}
