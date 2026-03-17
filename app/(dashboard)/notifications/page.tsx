'use client';

import React, { useState } from 'react';
import Header from '@/components/shared/Header';
import { 
  Bell, 
  Sparkles, 
  Bookmark, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  MoreVertical,
  Trash2,
  Check
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const initialNotifications = [
  { 
    id: '1', 
    title: 'Nova Oportunidade Relevante', 
    description: 'Licenciamento de Software em Curitiba - 95% Match', 
    time: '2023-10-24T09:00:00',
    type: 'opportunity',
    unread: true
  },
  { 
    id: '2', 
    title: 'Oportunidade Salva Atualizada', 
    description: 'O edital de Manutenção de Ar Condicionado sofreu retificação.', 
    time: '2023-10-23T15:30:00',
    type: 'update',
    unread: true
  },
  { 
    id: '3', 
    title: 'Alerta de Prazo', 
    description: 'O prazo para impugnação da Prefeitura de Joinville vence hoje.', 
    time: '2023-10-24T08:00:00',
    type: 'alert',
    unread: false
  },
  { 
    id: '4', 
    title: 'Proposta Visualizada', 
    description: 'A Prefeitura de São Paulo visualizou sua proposta para o edital 123/2023.', 
    time: '2023-10-22T11:20:00',
    type: 'update',
    unread: false
  },
  { 
    id: '5', 
    title: 'Novo Contrato Assinado', 
    description: 'O contrato com a Prefeitura de Curitiba foi formalizado no sistema.', 
    time: '2023-10-21T16:45:00',
    type: 'opportunity',
    unread: false
  },
];

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(initialNotifications);

  const markAsRead = (id: string) => {
    setNotifs(notifs.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const markAllAsRead = () => {
    setNotifs(notifs.map(n => ({ ...n, unread: false })));
  };

  const deleteNotification = (id: string) => {
    setNotifs(notifs.filter(n => n.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header 
        title="Notificações" 
        subtitle="Fique por dentro das atualizações e alertas do sistema." 
      />
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Todas as Notificações</h3>
            <button 
              onClick={markAllAsRead}
              className="text-sm font-bold text-[#0f49bd] hover:underline flex items-center gap-2"
            >
              <Check className="size-4" />
              Marcar todas como lidas
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {notifs.length === 0 ? (
              <div className="p-20 text-center">
                <div className="size-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="size-8 text-gray-300" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">Nenhuma notificação</h4>
                <p className="text-gray-500">Você está em dia com todas as suas notificações.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifs.map((n) => (
                  <div 
                    key={n.id}
                    className={cn(
                      "p-6 flex items-start gap-4 transition-colors hover:bg-gray-50/50",
                      n.unread && "bg-blue-50/30"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-xl",
                      n.type === 'opportunity' ? "bg-blue-100 text-blue-600" :
                      n.type === 'update' ? "bg-amber-100 text-amber-600" :
                      "bg-red-100 text-red-600"
                    )}>
                      {n.type === 'opportunity' && <Sparkles className="size-6" />}
                      {n.type === 'update' && <Bookmark className="size-6" />}
                      {n.type === 'alert' && <AlertCircle className="size-6" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={cn(
                          "text-base font-bold text-gray-900 truncate",
                          n.unread && "text-[#0f49bd]"
                        )}>
                          {n.title}
                        </h4>
                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap ml-4 flex items-center gap-1">
                          <Clock className="size-3" />
                          {n.time ? formatDate(n.time) : 'N/A'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">
                        {n.description}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        {n.unread && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="text-xs font-bold text-[#0f49bd] hover:underline"
                          >
                            Marcar como lida
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="size-3" />
                          Excluir
                        </button>
                      </div>
                    </div>

                    {n.unread && (
                      <div className="size-2.5 rounded-full bg-blue-600 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
