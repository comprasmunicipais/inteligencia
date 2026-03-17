'use client';

import React from 'react';
import { 
  Users, 
  Building2, 
  Activity, 
  Database, 
  TrendingUp, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total de Empresas', value: '124', change: '+12%', icon: Building2, color: 'blue' },
    { label: 'Usuários Ativos', value: '1,240', change: '+5%', icon: Users, color: 'green' },
    { label: 'Requisições API (24h)', value: '45.2k', change: '+18%', icon: Activity, color: 'purple' },
    { label: 'Uso de Storage', value: '84.2 GB', change: '+2%', icon: Database, color: 'orange' },
  ];

  const recentLogs = [
    { id: 1, action: 'Nova Empresa Cadastrada', target: 'Tech Solutions Ltda', user: 'System', time: '2 min atrás', status: 'success' },
    { id: 2, action: 'Falha na Coleta PNCP', target: 'Crawler #4', user: 'Worker-01', time: '15 min atrás', status: 'error' },
    { id: 3, action: 'Backup Concluído', target: 'Database Production', user: 'System', time: '1 hora atrás', status: 'success' },
    { id: 4, action: 'Alteração de Permissão', target: 'fernando@painel.com', user: 'Admin', time: '3 horas atrás', status: 'warning' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Visão Geral da Plataforma</h2>
        <p className="text-gray-500 text-sm">Monitoramento global de recursos, empresas e usuários.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "size-10 rounded-xl flex items-center justify-center",
                stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                stat.color === 'green' ? "bg-green-50 text-green-600" :
                stat.color === 'purple' ? "bg-purple-50 text-purple-600" :
                "bg-orange-50 text-orange-600"
              )}>
                <stat.icon className="size-5" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold",
                stat.change.startsWith('+') ? "text-green-600" : "text-red-600"
              )}>
                {stat.change}
                {stat.change.startsWith('+') ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              </div>
            </div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Logs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Logs de Atividade Recentes</h3>
            <button className="text-xs font-bold text-blue-600 hover:underline">Ver todos os logs</button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentLogs.map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "size-2 rounded-full",
                    log.status === 'success' ? "bg-green-500" :
                    log.status === 'error' ? "bg-red-500" : "bg-yellow-500"
                  )}></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500">{log.target} • por {log.user}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="size-3" />
                  <span className="text-[10px] font-bold uppercase">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h3 className="font-bold text-gray-900">Saúde do Sistema</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-500 uppercase">CPU Usage</span>
                <span className="text-gray-900">24%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[24%]"></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-500 uppercase">Memory</span>
                <span className="text-gray-900">62%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-[62%]"></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-500 uppercase">Database Connections</span>
                <span className="text-gray-900">88/200</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[44%]"></div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
              <AlertTriangle className="size-5 text-yellow-600" />
              <div>
                <p className="text-xs font-bold text-yellow-800">Alerta de Performance</p>
                <p className="text-[10px] text-yellow-700">Crawler #4 está consumindo mais memória que o usual.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
