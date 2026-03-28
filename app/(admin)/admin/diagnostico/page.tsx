'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Database,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiagnosticsData {
  supabaseOk: boolean;
  envVars: { key: string; defined: boolean }[];
  pendingJobs: number;
  lastSync: string | null;
  totalOpportunities: number;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Nunca';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
    : <XCircle className="size-5 text-red-500 shrink-0" />;
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function AdminDiagnosticoPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/diagnostics');
      if (!res.ok) throw new Error('Erro ao buscar diagnóstico.');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Shield className="size-7 text-blue-600" />
            Diagnóstico
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Conectividade, variáveis de ambiente e status dos serviços.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-sm text-gray-500">
          Carregando diagnóstico…
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Supabase connectivity */}
          <Card title="Conectividade" icon={<Database className="size-4" />}>
            <div className={cn(
              'flex items-center justify-between rounded-xl border p-4',
              data.supabaseOk ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'
            )}>
              <div>
                <p className="text-sm font-bold text-gray-900">Supabase</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {data.supabaseOk ? 'Conexão estabelecida' : 'Falha na conexão'}
                </p>
              </div>
              <StatusIcon ok={data.supabaseOk} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-bold text-gray-900">Oportunidades no banco</p>
                <p className="text-xs text-gray-500 mt-0.5">Total de licitações sincronizadas</p>
              </div>
              <span className="text-lg font-black text-gray-900">
                {data.totalOpportunities.toLocaleString('pt-BR')}
              </span>
            </div>
          </Card>

          {/* PNCP Sync + Email Queue */}
          <Card title="Serviços" icon={<Clock className="size-4" />}>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-bold text-gray-900">Último sync PNCP</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(data.lastSync)}</p>
              </div>
              <Clock className="size-5 text-blue-400" />
            </div>
            <div className={cn(
              'flex items-center justify-between rounded-xl border p-4',
              data.pendingJobs > 0 ? 'border-amber-100 bg-amber-50' : 'border-emerald-100 bg-emerald-50'
            )}>
              <div>
                <p className="text-sm font-bold text-gray-900">Fila de email</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {data.pendingJobs > 0
                    ? `${data.pendingJobs} job${data.pendingJobs !== 1 ? 's' : ''} pendente${data.pendingJobs !== 1 ? 's' : ''}`
                    : 'Fila vazia'}
                </p>
              </div>
              <Mail className={cn('size-5', data.pendingJobs > 0 ? 'text-amber-500' : 'text-emerald-500')} />
            </div>
          </Card>

          {/* Env vars */}
          <Card title="Variáveis de Ambiente" icon={<Key className="size-4" />}>
            <div className="space-y-2">
              {data.envVars.map((v) => (
                <div
                  key={v.key}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-4 py-3',
                    v.defined ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'
                  )}
                >
                  <span className="text-xs font-mono font-bold text-gray-700">{v.key}</span>
                  <StatusIcon ok={v.defined} />
                </div>
              ))}
            </div>
          </Card>

        </div>
      ) : null}
    </div>
  );
}
