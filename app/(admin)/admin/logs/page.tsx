'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

const PERIOD_OPTIONS = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
];

type AuditLog = {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminLogsPage() {
  const supabase = useRef(createClient()).current;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [period, setPeriod] = useState(30);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => { setPage(0); }, [period, actionFilter]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('audit_logs')
          .select('id, created_at, user_id, action, resource, ip_address, metadata', { count: 'exact' })
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (actionFilter) query = query.eq('action', actionFilter);

        const { data, error, count } = await query;

        if (error) {
          // Table likely doesn't exist
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            setTableExists(false);
          }
          setLogs([]);
          setTotal(0);
        } else {
          setLogs((data ?? []) as AuditLog[]);
          setTotal(count ?? 0);
          setTableExists(true);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [period, page, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Activity className="size-7 text-blue-600" />
            Logs do Sistema
          </h1>
          <p className="text-gray-500 font-medium mt-1">Auditoria de ações realizadas na plataforma.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            type="button"
            onClick={() => setPeriod(opt.days)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              period === opt.days
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="ml-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">Todas as ações</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="create">Criar</option>
          <option value="update">Atualizar</option>
          <option value="delete">Deletar</option>
        </select>
        {!isLoading && total > 0 && (
          <span className="text-xs text-gray-400">
            {total.toLocaleString('pt-BR')} registro{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-bold text-gray-900">Registros de auditoria</h2>
        </div>

        {isLoading ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500">Carregando logs…</div>
        ) : !tableExists ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
              <Activity className="size-8 text-blue-600" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">Nenhum log registrado</h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              A tabela <code className="rounded bg-gray-100 px-1 font-mono text-xs">audit_logs</code> ainda não existe no banco de dados.
              Crie-a para ativar o registro de auditoria da plataforma.
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
              <Activity className="size-8 text-blue-600" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">Nenhum log no período</h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Não há registros de auditoria nos últimos {period} dias
              {actionFilter ? ` com a ação "${actionFilter}"` : ''}.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Data/Hora</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Usuário</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Ação</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Recurso</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">{formatDate(log.created_at)}</td>
                      <td className="px-5 py-3.5 text-sm font-mono text-gray-600 text-xs">{log.user_id ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{log.resource ?? '—'}</td>
                      <td className="px-5 py-3.5 text-sm font-mono text-gray-500 text-xs">{log.ip_address ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-xs text-gray-500">Página {page + 1} de {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
  );
}
