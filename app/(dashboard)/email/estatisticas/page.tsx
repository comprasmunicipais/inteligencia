'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ArrowRight, BarChart2, Eye, MousePointer, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SentCampaign = {
  id: string;
  name: string;
  objective: string;
  sent_at: string;
  sent_count: number;
  failed_count: number;
};

type TrackingStats = Record<string, { opens: number; clicks: number }>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function successRate(sent: number, failed: number): number {
  const total = sent + failed;
  if (total === 0) return 100;
  return Math.round((sent / total) * 100);
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function rateColor(rate: number) {
  if (rate >= 90) return { bar: '#10b981', text: 'text-emerald-700' };
  if (rate >= 70) return { bar: '#f59e0b', text: 'text-amber-700' };
  return { bar: '#ef4444', text: 'text-red-600' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateLabel(name: string, maxLen = 20): string {
  return name.length > maxLen ? name.slice(0, maxLen) + '…' : name;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom tooltip for recharts
// ─────────────────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SentCampaign & { rate: number; opens: number; clicks: number };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-slate-900 mb-2">{d.name}</p>
      <p className="text-slate-600">Enviados: <span className="font-medium text-slate-900">{d.sent_count.toLocaleString('pt-BR')}</span></p>
      <p className="text-slate-600">Falhas: <span className="font-medium text-red-600">{d.failed_count.toLocaleString('pt-BR')}</span></p>
      <p className="text-slate-600">Aberturas: <span className="font-medium text-violet-600">{d.opens.toLocaleString('pt-BR')}</span></p>
      <p className="text-slate-600">Cliques: <span className="font-medium text-blue-600">{d.clicks.toLocaleString('pt-BR')}</span></p>
      <p className="text-slate-600 mt-1">Entrega: <span className={`font-medium ${rateColor(d.rate).text}`}>{d.rate}%</span></p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function EmailEstatisticasPage() {
  const supabase = createClient();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<SentCampaign[]>([]);
  const [tracking, setTracking] = useState<TrackingStats>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);

        const [campaignRes, trackingRes] = await Promise.all([
          supabase
            .from('email_campaigns')
            .select('id, name, objective, sent_at, sent_count, failed_count')
            .not('sent_at', 'is', null)
            .order('sent_at', { ascending: false }),
          fetch('/api/email/tracking-stats'),
        ]);

        if (campaignRes.error) throw campaignRes.error;
        setCampaigns((campaignRes.data ?? []) as SentCampaign[]);

        if (trackingRes.ok) {
          const json = await trackingRes.json();
          setTracking(json.stats ?? {});
        }
      } catch (err) {
        console.error('Erro ao carregar estatísticas:', err);
        toast.error('Erro ao carregar estatísticas de e-mail.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aggregates ─────────────────────────────────────────────────────────────
  const totalSent = campaigns.reduce((s, c) => s + (c.sent_count ?? 0), 0);
  const totalFailed = campaigns.reduce((s, c) => s + (c.failed_count ?? 0), 0);
  const totalOpens = Object.values(tracking).reduce((s, t) => s + t.opens, 0);
  const totalClicks = Object.values(tracking).reduce((s, t) => s + t.clicks, 0);
  const avgRate = campaigns.length > 0 ? successRate(totalSent, totalFailed) : null;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = [...campaigns]
    .sort((a, b) => b.sent_count - a.sent_count)
    .slice(0, 15)
    .map((c) => ({
      ...c,
      rate: successRate(c.sent_count ?? 0, c.failed_count ?? 0),
      opens: tracking[c.id]?.opens ?? 0,
      clicks: tracking[c.id]?.clicks ?? 0,
      label: truncateLabel(c.name),
    }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#f8fafc] p-6 overflow-y-auto">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Estatísticas</h1>
          <p className="text-sm text-slate-600">
            Visão consolidada de performance dos seus disparos de e-mail.
          </p>
        </div>

        {/* Stat cards */}
        {!isLoading && campaigns.length > 0 && (
          <>
            {/* Delivery stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Campanhas disparadas" value={campaigns.length} icon={<TrendingUp className="size-4 shrink-0 text-slate-300" />} />
              <StatCard label="E-mails enviados" value={totalSent.toLocaleString('pt-BR')} icon={<TrendingUp className="size-4 shrink-0 text-slate-300" />} />
              <StatCard label="Falhas totais" value={totalFailed.toLocaleString('pt-BR')} icon={<TrendingUp className="size-4 shrink-0 text-slate-300" />} />
              <StatCard
                label="Taxa média de entrega"
                value={avgRate !== null ? `${avgRate}%` : '—'}
                highlight={avgRate !== null ? rateColor(avgRate).text : undefined}
                icon={<TrendingUp className="size-4 shrink-0 text-slate-300" />}
              />
            </div>

            {/* Engagement stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                label="Aberturas únicas"
                value={totalOpens.toLocaleString('pt-BR')}
                icon={<Eye className="size-4 shrink-0 text-violet-300" />}
              />
              <StatCard
                label="Taxa de abertura"
                value={pct(totalOpens, totalSent)}
                highlight="text-violet-700"
                icon={<Eye className="size-4 shrink-0 text-violet-300" />}
              />
              <StatCard
                label="Cliques únicos"
                value={totalClicks.toLocaleString('pt-BR')}
                icon={<MousePointer className="size-4 shrink-0 text-blue-300" />}
              />
              <StatCard
                label="Taxa de clique"
                value={pct(totalClicks, totalSent)}
                highlight="text-blue-700"
                icon={<MousePointer className="size-4 shrink-0 text-blue-300" />}
              />
            </div>
          </>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-sm text-slate-500">
            Carregando estatísticas...
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState onNavigate={() => router.push('/email/campaigns')} />
        ) : (
          <>
            {/* Bar chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-slate-900">
                Envios por campanha
              </h2>
              <p className="mb-6 text-xs text-slate-500">
                {chartData.length < campaigns.length
                  ? `Top ${chartData.length} campanhas por volume de envio`
                  : 'Todas as campanhas disparadas'}
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={48}
                    tickFormatter={(v) => v.toLocaleString('pt-BR')}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="sent_count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {chartData.map((entry) => (
                      <Cell key={entry.id} fill={rateColor(entry.rate).bar} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center gap-6 justify-center">
                <Legend color="#10b981" label="Taxa ≥ 90%" />
                <Legend color="#f59e0b" label="Taxa 70–89%" />
                <Legend color="#ef4444" label="Taxa < 70%" />
              </div>
            </div>

            {/* Summary table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Resumo por campanha</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Campanha</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Disparada em</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Enviados</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Falhas</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aberturas</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cliques</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Entrega</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => {
                      const sent = campaign.sent_count ?? 0;
                      const failed = campaign.failed_count ?? 0;
                      const opens = tracking[campaign.id]?.opens ?? 0;
                      const clicks = tracking[campaign.id]?.clicks ?? 0;
                      const rate = successRate(sent, failed);
                      const colors = rateColor(rate);

                      return (
                        <tr key={campaign.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-900">{campaign.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{campaign.objective}</p>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">{formatDate(campaign.sent_at)}</td>
                          <td className="px-5 py-4 text-right text-sm font-medium text-slate-900">
                            {sent.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-5 py-4 text-right text-sm">
                            <span className={failed > 0 ? 'font-medium text-red-600' : 'text-slate-400'}>
                              {failed.toLocaleString('pt-BR')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right text-sm">
                            {opens > 0 ? (
                              <span className="font-medium text-violet-600">
                                {opens.toLocaleString('pt-BR')}
                                <span className="ml-1 text-xs font-normal text-violet-400">
                                  ({pct(opens, sent)})
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right text-sm">
                            {clicks > 0 ? (
                              <span className="font-medium text-blue-600">
                                {clicks.toLocaleString('pt-BR')}
                                <span className="ml-1 text-xs font-normal text-blue-400">
                                  ({pct(clicks, sent)})
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${rate}%`, backgroundColor: colors.bar }}
                                />
                              </div>
                              <span className={`text-xs font-semibold ${colors.text}`}>{rate}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => router.push(`/email/campaigns/${campaign.id}`)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#0f49bd]"
                            >
                              Ver
                              <ArrowRight className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string | number;
  highlight?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={`mt-3 text-2xl font-bold ${highlight ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
      <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
        <BarChart2 className="size-8 text-[#0f49bd]" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Nenhum dado disponível</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-600">
        As estatísticas aparecerão aqui após o primeiro envio de campanha.
      </p>
      <button
        type="button"
        onClick={onNavigate}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c]"
      >
        Ir para Campanhas
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
