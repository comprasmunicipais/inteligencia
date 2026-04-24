'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { History, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type EmailJob = {
  id: string;
  sent_at: string | null;
  created_at: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  email_campaigns: {
    name: string;
    subject: string | null;
  } | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const PERIOD_OPTIONS = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        Enviado
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        Erro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
      Pendente
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function EmailHistoryPage() {
  const supabase = useRef(createClient()).current;
  const router = useRouter();

  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Reset page when period changes
  useEffect(() => {
    setPage(0);
  }, [period]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error, count } = await supabase
          .from('email_job_queue')
          .select(
            'id, sent_at, created_at, recipient_email, recipient_name, status, email_campaigns(name, subject)',
            { count: 'exact' },
          )
          .gte('created_at', since)
          .neq('status', 'pending')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;
        setJobs((data ?? []) as unknown as EmailJob[]);
        setTotal(count ?? 0);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
        toast.error('Erro ao carregar histórico de emails.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [period, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="h-full overflow-y-auto bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Histórico</h1>
          <p className="text-sm text-slate-600">
            Registros individuais de emails enviados pela plataforma.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setPeriod(opt.days)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                period === opt.days
                  ? 'border-[#0f49bd] bg-[#0f49bd] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {!isLoading && total > 0 && (
            <span className="ml-auto text-xs text-slate-400">
              {total.toLocaleString('pt-BR')} registro{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table / empty state */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Emails enviados</h2>
          </div>

          {isLoading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Carregando histórico…
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
                <History className="size-8 text-[#0f49bd]" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Nenhum email no período
              </h2>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                Não há registros de envio nos últimos {period} dias.
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
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Data/Hora
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Campanha
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Assunto
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Destinatário
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-slate-100 last:border-0">
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-600">
                          {formatDate(job.sent_at ?? job.created_at)}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                          {job.email_campaigns?.name ?? '—'}
                        </td>
                        <td className="max-w-[220px] px-5 py-3.5 text-sm text-slate-600">
                          <span className="line-clamp-1">
                            {job.email_campaigns?.subject ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">
                          <p>{job.recipient_email}</p>
                          {job.recipient_name && (
                            <p className="text-xs text-slate-400">{job.recipient_name}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={job.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                  <p className="text-xs text-slate-500">
                    Página {page + 1} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="size-3.5" />
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Próxima
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
