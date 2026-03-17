'use client';

import React, { useState } from 'react';
import { Bell, Search, Menu, Sparkles, AlertCircle, Bookmark, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const notifications = [
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
];

export default function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const [notifs, setNotifs] = useState(notifications);
  const unreadCount = notifs.filter(n => n.unread).length;

  const markAsRead = (id: string) => {
    setNotifs(notifs.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  return (
    <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 shadow-sm z-10">
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400 size-5" />
          </div>
          <input
            type="text"
            className="block w-64 pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0f49bd] focus:border-[#0f49bd] sm:text-sm transition-all"
            placeholder="Buscar..."
          />
        </div>
        
        <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden md:block"></div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors outline-none">
              <Bell className="size-6" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 mr-8" align="end">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificações</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount} novas
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[400px] overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="size-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Nenhuma notificação por enquanto.</p>
                </div>
              ) : (
                notifs.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className={cn(
                      "flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-gray-50",
                      n.unread && "bg-blue-50/30"
                    )}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {n.type === 'opportunity' && <Sparkles className="size-4 text-blue-600" />}
                      {n.type === 'update' && <Bookmark className="size-4 text-amber-600" />}
                      {n.type === 'alert' && <AlertCircle className="size-4 text-red-600" />}
                      <span className="text-sm font-bold text-gray-900 flex-1">{n.title}</span>
                      {n.unread && <div className="size-2 rounded-full bg-blue-600" />}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{n.description}</p>
                    <span className="text-[10px] text-gray-400 font-medium mt-1 uppercase">
                      {n.time ? formatDate(n.time) : 'N/A'}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-xs font-bold text-[#0f49bd] cursor-pointer"
              onClick={() => router.push('/notifications')}
            >
              Ver todas as notificações
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <button className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <Menu className="size-6" />
        </button>
      </div>
    </header>
  );
}
