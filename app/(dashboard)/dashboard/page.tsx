'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Send, 
  Gavel, 
  ShieldCheck, 
  Mail,
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

  const formatCampaignDate = (date: string | null) => {
    if (!date) return '--';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(new Date(date));
  };

  const getCampaignStatusStyles = (status?: string) => {
    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === 'enviada') {
      return 'bg-green-100 text-green-700';
    }

    if (normalizedStatus === 'enviando') {
      return 'bg-blue-100 text-blue-700';
    }

    return 'bg-gray-100 text-gray-700';
  };

  const kpis = [
    { name: 'Oportunidades Novas', value: metrics?.newOpportunities.toString() || '0', change: '+12%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Propostas Enviadas', value: metrics?.sentProposals.toString() || '0', change: '+5%', icon: Send, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Licitações Ativas', value: metrics?.activeTenders.toString() || '0', change: '0%', icon: Gavel, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Contratos Vigentes', value: metrics?.activeContracts.toString() || '0', change: '+2%', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const primaryKpi = kpis[0];
  const secondaryKpis = kpis.slice(1);

  return (
    <>
      <Header 
        title="Visão Geral" 
        subtitle="Bem-vindo de volta, aqui está o que está acontecendo hoje." 
      />
      
      <div className="flex-1 overflow-y-auto bg-[#f2f5fa] px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
              <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#13294b_52%,#183b73_100%)] text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
                <div className="flex h-full flex-col justify-between gap-5 p-5 lg:p-6">
                  <div className="space-y-4">
                    <div className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
                      Central Comercial
                    </div>
                    <div className="max-w-2xl space-y-2">
                      <h2 className="text-[1.75rem] font-semibold tracking-tight text-white lg:text-[1.9rem]">
                        Sua operação com prefeituras está em movimento.
                      </h2>
                      <p className="max-w-xl text-sm leading-5 text-slate-200">
                        Acompanhe negociações, oportunidades abertas, propostas enviadas e contratos ativos em uma única visão executiva.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.8fr]">
                      <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-[2px]">
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                              Destaque do dia
                            </p>
                            <h3 className="mt-1.5 text-sm font-semibold text-white">{primaryKpi.name}</h3>
                          </div>
                          <div className={`rounded-xl ${primaryKpi.bg} p-2.5`}>
                            <primaryKpi.icon className={`size-5 ${primaryKpi.color}`} />
                          </div>
                        </div>
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-[2rem] font-semibold leading-none text-white">{primaryKpi.value}</p>
                            <p className="mt-1.5 text-xs text-slate-300">negócios e movimentos recentes da carteira</p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-emerald-400/12 px-2.5 py-1 text-xs font-medium text-emerald-200">
                            <ArrowUpRight className="mr-1 size-3" />
                            {primaryKpi.change}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-2.5">
                        {secondaryKpis.map((kpi) => (
                          <div key={kpi.name} className="rounded-2xl border border-white/10 bg-white/8 p-3.5 backdrop-blur-[2px]">
                            <div className="flex items-center justify-between gap-3">
                              <div className={`rounded-xl ${kpi.bg} p-2`}>
                                <kpi.icon className={`size-4 ${kpi.color}`} />
                              </div>
                              <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-200">
                                <ArrowUpRight className="mr-1 size-3" />
                                {kpi.change}
                              </span>
                            </div>
                            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                              {kpi.name}
                            </p>
                            <p className="mt-0.5 text-[1.4rem] font-semibold text-white">{kpi.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 md:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Campanhas</p>
                      <p className="mt-1 text-xs font-medium text-white">{metrics?.lastCampaign?.name || 'Nenhuma campanha recente'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Envio</p>
                      <p className="mt-1 text-xs font-medium text-white">{formatCampaignDate(metrics?.lastCampaign?.sent_at || null)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Carteira</p>
                      <p className="mt-1 text-xs font-medium text-white">{formatCurrency(getTotalValue())}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Agenda</p>
                      <p className="mt-1 text-xs font-medium text-white">{metrics?.pendingTasks?.length || 0} prioridades abertas</p>
                    </div>
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={() => router.push('/email/campaigns')}
                className="rounded-[28px] border border-[#ead7b4] bg-[linear-gradient(180deg,#fffdf8_0%,#f8fbff_100%)] p-5 text-left shadow-[0_10px_30px_rgba(148,163,184,0.12)] transition-all hover:shadow-[0_14px_36px_rgba(148,163,184,0.16)]"
              >
                <div className="flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-[#fff1d6] p-3 text-[#c27a00] shadow-sm">
                      <Mail className="size-6" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a6700]">
                          Promoção Comercial
                        </span>
                        <h3 className="text-[1.6rem] font-semibold tracking-tight text-slate-900">Última Campanha</h3>
                        <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${getCampaignStatusStyles(metrics?.lastCampaign?.status)}`}>
                          {metrics?.lastCampaign?.status || 'rascunho'}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-slate-900">{metrics?.lastCampaign?.name || 'Nenhuma'}</p>
                      <p className="text-sm leading-5 text-slate-600">
                        {metrics?.lastCampaign?.sent_count || 0} enviados · {metrics?.lastCampaign?.failed_count || 0} falhas · {formatCampaignDate(metrics?.lastCampaign?.sent_at || null)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Disparos</p>
                      <p className="mt-1.5 text-[1.45rem] font-semibold text-slate-900">{metrics?.lastCampaign?.sent_count || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Falhas</p>
                      <p className="mt-1.5 text-[1.45rem] font-semibold text-slate-900">{metrics?.lastCampaign?.failed_count || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/80 pt-3.5">
                    <p className="text-sm leading-5 text-slate-600">
                      Presença institucional e ativação comercial em andamento.
                    </p>
                    <div className="flex items-center text-sm font-medium text-[#0f49bd]">
                      Ver campanhas <ChevronRight className="ml-1 size-4" />
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Chart Section */}
            <div className="rounded-[24px] border border-slate-200/80 bg-[#f9fbfd] p-6 shadow-[0_8px_26px_rgba(148,163,184,0.10)]">
              <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Evolução Comercial</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">Performance de Vendas ({period === '30d' ? '30 Dias' : period === '6m' ? '6 Meses' : '12 Meses'})</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-semibold text-slate-900">{formatCurrency(getTotalValue())}</span>
                    <span className="text-sm font-medium text-green-600 flex items-center bg-green-50 px-2 py-0.5 rounded">
                      <ArrowUpRight className="size-4 mr-1" />
                      15% vs período anterior
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
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
              <div className="lg:col-span-2 flex flex-col rounded-[24px] border border-slate-200/80 bg-[#f9fbfd] shadow-[0_8px_26px_rgba(148,163,184,0.10)]">
                <div className="flex items-center justify-between border-b border-slate-200/80 p-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Radar Comercial</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">Oportunidades Recentes</h3>
                  </div>
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
                      <tr className="bg-[#f1f5f9] text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
                        <th className="px-6 py-4">Órgão Público</th>
                        <th className="px-6 py-4">Objeto</th>
                        <th className="px-6 py-4">Valor Est.</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                      {metrics?.recentOpportunities.map((opp, i) => (
                        <tr key={i} className="cursor-pointer transition-colors hover:bg-[#eef4fb]" onClick={() => router.push('/intel/opportunities')}>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{opp.organ}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{opp.object}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatCurrency(opp.value)}</td>
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
              <div className="flex flex-col rounded-[24px] border border-slate-200/80 bg-[#f9fbfd] shadow-[0_8px_26px_rgba(148,163,184,0.10)]">
                <div className="border-b border-slate-200/80 p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Execução</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">Ações Pendentes</h3>
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
                          <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                          <p className="text-xs text-slate-500 mt-1 leading-5">{task.description}</p>
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
                      <Clock className="size-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Nenhuma tarefa pendente.</p>
                    </div>
                  )}
                </div>
                <div className="mt-auto rounded-b-[24px] border-t border-slate-200/80 bg-[#f1f5f9] p-4">
                  <button 
                    onClick={() => router.push('/crm/tasks')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 shadow-sm"
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
