'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ArrowRight, History, TrendingUp } from 'lucide-react';

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function successRate(sent: number, failed: number): number {
  const total = sent + failed;
  if (total === 0) return 100;
  return Math.round((sent / total) * 100);
}

function rateColor(rate: number): {
  bar: string;
  badge: string;
  text: string;
} {
  if (rate >= 90) {
    return {
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700',
      text: 'text-emerald-700',
    };
  }
  if (rate >= 70) {
    return {
      bar: 'bg-amber-400',
      badge: 'bg-amber-100 text-amber-700',
      text: 'text-amber-700',
    };
  }
  return {
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
    text: 'text-red-700',
  };
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

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function EmailHistoryPage() {
  const supabase = createClient();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<SentCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('email_campaigns')
          .select('id, name, objective, sent_at, sent_count, failed_count')
          .not('sent_at', 'is', null)
          .order('sent_at', { ascending: false });

        if (error) throw error;
        setCampaigns((data ?? []) as SentCampaign[]);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
        toast.error('Erro ao carregar histórico de campanhas.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aggregates ─────────────────────────────────────────────────────────────
  const totalSent = campaigns.reduce((s, c) => s + (c.sent_count ?? 0), 0);
  const totalFailed = campaigns.reduce((s, c) => s + (c.failed_count ?? 0), 0);
  const avgRate = campaigns.length > 0 ? successRate(totalSent, totalFailed) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Histórico</h1>
          <p className="text-sm text-slate-600">
            Acompanhe todos os disparos realizados pela plataforma.
          </p>
        </div>

        {/* Stats */}
        {!isLoading && campaigns.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Campanhas disparadas" value={campaigns.length} />
            <StatCard label="E-mails enviados" value={totalSent.toLocaleString('pt-BR')} />
            <StatCard label="Falhas totais" value={totalFailed.toLocaleString('pt-BR')} />
            <StatCard
              label="Taxa média de sucesso"
              value={avgRate !== null ? `${avgRate}%` : '—'}
              highlight={avgRate !== null ? rateColor(avgRate).text : undefined}
            />
          </div>
        )}

        {/* Table / empty state */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Disparos realizados</h2>
          </div>

          {isLoading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Carregando histórico...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
                <History className="size-8 text-[#0f49bd]" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Nenhum disparo registrado
              </h2>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                O histórico aparecerá aqui após o primeiro envio de campanha.
              </p>
              <button
                type="button"
                onClick={() => router.push('/email/campaigns')}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c]"
              >
                Ir para Campanhas
                <ArrowRight className="size-4" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Campanha
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Disparada em
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Enviados
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Falhas
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Taxa de sucesso
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => {
                    const sent = campaign.sent_count ?? 0;
                    const failed = campaign.failed_count ?? 0;
                    const rate = successRate(sent, failed);
                    const colors = rateColor(rate);

                    return (
                      <tr
                        key={campaign.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        {/* Name + objective */}
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-900">
                            {campaign.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {campaign.objective}
                          </p>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(campaign.sent_at)}
                        </td>

                        {/* Sent */}
                        <td className="px-5 py-4 text-right text-sm font-medium text-slate-900">
                          {sent.toLocaleString('pt-BR')}
                        </td>

                        {/* Failed */}
                        <td className="px-5 py-4 text-right text-sm">
                          <span className={failed > 0 ? 'font-medium text-red-600' : 'text-slate-400'}>
                            {failed.toLocaleString('pt-BR')}
                          </span>
                        </td>

                        {/* Success rate */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${colors.bar}`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${colors.text}`}>
                              {rate}%
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => router.push(`/email/campaigns/${campaign.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#0f49bd]"
                          >
                            Ver detalhes
                            <ArrowRight className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <TrendingUp className="size-4 shrink-0 text-slate-300" />
      </div>
      <p className={`mt-3 text-2xl font-bold ${highlight ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
