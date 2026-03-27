'use client';

import React from 'react';
import Header from '@/components/shared/Header';
import { 
  Users, 
  Database, 
  Activity, 
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminDashboardPage() {
  return (
    <>
      <Header 
        title="Painel Administrativo" 
        subtitle="Visão geral técnica e operacional da plataforma CM Pro."
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total de Empresas', value: '12', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+2 este mês' },
              { label: 'Usuários Ativos', value: '148', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12% vs last week' },
              { label: 'Oportunidades Coletadas', value: '45.2k', icon: Database, color: 'text-purple-600', bg: 'bg-purple-50', trend: '+1.2k today' },
              { label: 'Saúde do Sistema', value: '99.9%', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'All systems go' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-2 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("size-5", stat.color)} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.trend}</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{stat.value}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* System Status */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Server className="size-5 text-gray-400" />
                  Status dos Serviços
                </h3>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-widest">Online</span>
              </div>
              <div className="p-8 space-y-6">
                {[
                  { name: 'Coletor PNCP', status: 'operational', latency: '120ms' },
                  { name: 'Motor de Match (IA)', status: 'operational', latency: '450ms' },
                  { name: 'Supabase Database', status: 'operational', latency: '45ms' },
                  { name: 'Storage Service', status: 'operational', latency: '85ms' },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-green-500" />
                      <span className="text-sm font-bold text-gray-700">{service.name}</span>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{service.latency}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Admin Activity */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="size-5 text-gray-400" />
                  Atividade Recente
                </h3>
              </div>
              <div className="p-8 space-y-6">
                {[
                  { user: 'Fernando D.', action: 'Executou sync manual PNCP', time: '10 min atrás' },
                  { user: 'Sistema', action: 'Backup diário concluído', time: '2 horas atrás' },
                  { user: 'Admin', action: 'Nova empresa cadastrada: TechGov', time: '5 horas atrás' },
                  { user: 'Sistema', action: 'Alerta de latência no Match Engine', time: '1 dia atrás' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      {activity.user[0]}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 font-medium">
                        <span className="font-bold">{activity.user}</span> {activity.action}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
