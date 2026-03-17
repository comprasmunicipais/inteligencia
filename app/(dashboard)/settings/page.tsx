'use client';

import React, { useState } from 'react';
import Header from '@/components/shared/Header';
import Image from 'next/image';
import { 
  User, 
  Shield, 
  Bell, 
  Database,
  Globe,
  CreditCard,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Perfil');

  const tabs = [
    { name: 'Perfil', icon: User },
    { name: 'Organização', icon: Globe },
    { name: 'Segurança', icon: Shield },
    { name: 'Notificações', icon: Bell },
    { name: 'Integrações', icon: Database },
    { name: 'Assinatura', icon: CreditCard },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Perfil':
        return (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Informações do Perfil</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="size-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden relative">
                  <Image 
                    src="https://picsum.photos/seed/user/200/200" 
                    alt="Avatar" 
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">
                  Alterar Foto
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
                  <input type="text" defaultValue="Ricardo Silva" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                  <input type="email" defaultValue="ricardo@empresa.com.br" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cargo</label>
                  <input type="text" defaultValue="Diretor Comercial" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
                  <input type="text" defaultValue="(11) 98765-4321" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button className="px-6 py-2.5 bg-[#0f49bd] text-white rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all">
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        );
      case 'Organização':
        return (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Preferências da Organização</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <div>
                  <p className="text-sm font-bold text-gray-900">Moeda Padrão</p>
                  <p className="text-xs text-gray-500">Real Brasileiro (BRL)</p>
                </div>
                <button className="text-xs font-bold text-[#0f49bd] hover:underline">Alterar</button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <div>
                  <p className="text-sm font-bold text-gray-900">Fuso Horário</p>
                  <p className="text-xs text-gray-500">(GMT-03:00) Brasília</p>
                </div>
                <button className="text-xs font-bold text-[#0f49bd] hover:underline">Alterar</button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
            <div className="size-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto mb-6">
              <Database className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{activeTab}</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Esta funcionalidade está sendo preparada para sua organização. Em breve você poderá gerenciar suas configurações de {activeTab.toLowerCase()}.
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <Header title="Configurações" subtitle="Gerencie as preferências da sua conta e da organização." />
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 space-y-1">
            {tabs.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                  activeTab === item.name ? "bg-white text-[#0f49bd] shadow-sm border border-gray-200" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <item.icon className="size-4" />
                {item.name}
              </button>
            ))}
            
            <div className="pt-4 mt-4 border-t border-gray-200">
              <Link
                href="/help"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
              >
                <HelpCircle className="size-4" />
                Ajuda
              </Link>
            </div>
          </aside>

          <div className="flex-1 space-y-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  );
}
