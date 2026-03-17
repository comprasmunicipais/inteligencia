'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Send, 
  Gavel, 
  ShieldCheck, 
  ArrowUpRight,
  Clock,
  AlertCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { dashboardService, DashboardMetrics } from '@/lib/services/dashboard';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [period, setPeriod] = useState<'30d' | '6m' | '12m'>('6m');

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getMetrics(companyId!);
      setMetrics(data);
    } catch (error) {
      toast.error('Erro ao carregar métricas do dashboard.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadMetrics();
    }
  }, [companyId, loadMetrics]);

  const getChartData = () => {
    if (!metrics) return [];
    return metrics.salesPerformance;
  };

  const getTotalValue = () => {
    const data = getChartData();
    return data.reduce((acc, curr) => acc + curr.value, 0);
  };

  const kpis = [
    { name: 'Oportunidades Novas', value: metrics?.newOpportunities.toString() || '0', change: '+12%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Propostas Enviadas', value: metrics?.sentProposals.toString() || '0', change: '+5%', icon: Send, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Licitações Ativas', value: metrics?.activeTenders.toString() || '0', change: '0%', icon: Gavel, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Contratos Vigentes', value: metrics?.activeContracts.toString() || '0', change: '+2%', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <>
      <Header 
        title="Visão Geral" 
        subtitle="Bem-vindo de volta, aqui está o que está acontecendo hoje." 
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpis.map((kpi) => (
                <div key={kpi.name} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 ${kpi.bg} rounded-lg`}>
                      <kpi.icon className={`size-6 ${kpi.color}`} />
                    </div>
                    <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <ArrowUpRight className="size-3 mr-1" />
                      {kpi.change}
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">{kpi.name}</h3>
                  <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Chart Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Performance de Vendas ({period === '30d' ? '30 Dias' : period === '6m' ? '6 Meses' : '12 Meses'})</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(getTotalValue())}</span>
                    <span className="text-sm font-medium text-green-600 flex items-center bg-green-50 px-2 py-0.5 rounded">
                      <ArrowUpRight className="size-4 mr-1" />
                      15% vs período anterior
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg">
                  <button 
                    onClick={() => setPeriod('30d')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      period === '30d' ? "bg-white shadow-sm text-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    30 Dias
                  </button>
                  <button 
                    onClick={() => setPeriod('6m')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      period === '6m' ? "bg-white shadow-sm text-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    6 Meses
                  </button>
                  <button 
                    onClick={() => setPeriod('12m')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      period === '12m' ? "bg-white shadow-sm text-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    12 Meses
                  </button>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getChartData()}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f49bd" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#0f49bd" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#9ca3af'}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#9ca3af'}}
                      tickFormatter={(value) => `R$ ${value / 1000000}M`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Valor']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#0f49bd" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Opportunities Table */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Oportunidades Recentes</h3>
                  <button 
                    onClick={() => router.push('/intel/opportunities')}
                    className="text-[#0f49bd] hover:text-[#0a3690] text-sm font-medium flex items-center"
                  >
                    Ver todas <ChevronRight className="size-4 ml-1" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                        <th className="px-6 py-4">Órgão Público</th>
                        <th className="px-6 py-4">Objeto</th>
                        <th className="px-6 py-4">Valor Est.</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {metrics?.recentOpportunities.map((opp, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push('/intel/opportunities')}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{opp.organ}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{opp.object}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(opp.value)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${opp.statusColor}`}>
                              {opp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Actions */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">Ações Pendentes</h3>
                </div>
                <div className="p-6 space-y-6">
                  {metrics?.pendingTasks && metrics.pendingTasks.length > 0 ? (
                    metrics.pendingTasks.map((task, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            task.priority === 'alta' ? "bg-red-100 text-red-600" : 
                            task.priority === 'média' ? "bg-amber-100 text-amber-600" : 
                            "bg-blue-100 text-[#0f49bd]"
                          )}>
                            {task.priority === 'alta' ? <AlertCircle className="size-5" /> : <Clock className="size-5" />}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                          <button 
                            onClick={() => router.push('/crm/tasks')}
                            className="mt-2 text-xs font-medium text-[#0f49bd] hover:underline"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="size-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nenhuma tarefa pendente.</p>
                    </div>
                  )}
                </div>
                <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                  <button 
                    onClick={() => router.push('/crm/tasks')}
                    className="w-full py-2 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Ver Agenda Completa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
