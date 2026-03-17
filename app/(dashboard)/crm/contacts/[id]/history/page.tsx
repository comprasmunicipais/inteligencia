'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar,
  Clock,
  Filter,
  Download
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const interactions = [
  { id: '1', date: '2023-10-24', time: '14:30', type: 'call', title: 'Ligação de Acompanhamento', desc: 'Discussão sobre o cronograma de entrega do projeto. O contato confirmou que a equipe técnica está revisando os requisitos.', user: 'Fernando D.' },
  { id: '2', date: '2023-10-20', time: '10:15', type: 'email', title: 'Envio de Proposta Atualizada', desc: 'Proposta enviada com os novos requisitos técnicos solicitados na reunião anterior.', user: 'Fernando D.' },
  { id: '3', date: '2023-10-15', time: '09:00', type: 'meeting', title: 'Reunião Presencial', desc: 'Apresentação da solução para a diretoria de TI. Demonstração das funcionalidades de segurança e integração.', user: 'Fernando D.' },
  { id: '4', date: '2023-10-05', time: '16:45', type: 'call', title: 'Qualificação Inicial', desc: 'Primeiro contato para entender as dores do órgão e apresentar o Painel de Compras.', user: 'Fernando D.' },
  { id: '5', date: '2023-09-28', time: '11:20', type: 'email', title: 'Agradecimento e Material', desc: 'E-mail de agradecimento pelo tempo e envio de material institucional.', user: 'Fernando D.' },
];

export default function ContactHistoryPage() {
  const params = useParams();
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="size-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Histórico Completo</h1>
            <p className="text-xs text-gray-500">Todas as interações registradas com o contato.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="size-4" /> Exportar Log
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-[#0f49bd] shadow-sm">Todas</button>
              <button className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Chamadas</button>
              <button className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">E-mails</button>
              <button className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Reuniões</button>
            </div>
            <button className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700">
              <Filter className="size-4" /> Filtrar por Data
            </button>
          </div>

          <div className="space-y-6">
            {interactions.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex gap-6">
                <div className="flex flex-col items-center gap-2 min-w-[80px]">
                  <span className="text-xs font-black text-gray-400 uppercase">{item.date ? formatDate(item.date).split(' ')[0] : 'N/A'}</span>
                  <span className="text-2xl font-black text-gray-900">{item.date.split('-')[2]}</span>
                  <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <Clock className="size-3" /> {item.time}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg text-[#0f49bd]">
                      {item.type === 'call' && <Phone className="size-4" />}
                      {item.type === 'email' && <Mail className="size-4" />}
                      {item.type === 'meeting' && <MessageSquare className="size-4" />}
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {item.desc}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {item.user.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-xs text-gray-500">Registrado por <span className="font-bold">{item.user}</span></span>
                    </div>
                    <button className="text-xs font-bold text-[#0f49bd] hover:underline">Editar Registro</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
