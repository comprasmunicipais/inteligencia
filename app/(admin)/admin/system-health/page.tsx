'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { createClient } from '@/lib/supabase/client';
import { 
  Shield, 
  Database, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Table as TableIcon,
  User as UserIcon,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableStatus {
  name: string;
  count: number | null;
  error: string | null;
  status: 'ok' | 'error' | 'loading';
}

const supabase = createClient();

const TABLES_TO_CHECK = [
  'profiles',
  'companies',
  'municipalities',
  'contacts',
  'deals',
  'proposals',
  'contracts',
  'opportunities'
];

export default function SystemHealthPage() {
  const { user, role, companyId, loading: authLoading } = useCompany();
  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([]);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    const statuses: TableStatus[] = [];

    for (const table of TABLES_TO_CHECK) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          statuses.push({
            name: table,
            count: null,
            error: error.message,
            status: 'error'
          });
        } else {
          statuses.push({
            name: table,
            count: count ?? 0,
            error: null,
            status: 'ok'
          });
        }
      } catch (err: any) {
        statuses.push({
          name: table,
          count: null,
          error: err.message,
          status: 'error'
        });
      }
    }

    setTableStatuses(statuses);
    setChecking(false);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        checkHealth();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [authLoading, checkHealth]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Shield className="size-8 text-blue-600" />
            Diagnóstico do Sistema
          </h1>
          <p className="text-gray-500 font-medium">Verifique a integridade das tabelas e o contexto do usuário.</p>
        </div>
        <button 
          onClick={checkHealth}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", checking && "animate-spin")} />
          Recarregar Diagnóstico
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Context Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon className="size-4" />
            Contexto do Usuário
          </h2>
          <div className="space-y-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Usuário ID</span>
              <span className="text-sm font-mono font-bold text-gray-900 truncate">{user?.id || 'Não autenticado'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Role</span>
              <span className={cn(
                "text-sm font-bold px-2 py-0.5 rounded-md w-fit",
                role === 'platform_admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              )}>
                {role || 'Nenhum'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Company ID</span>
              <span className="text-sm font-mono font-bold text-gray-900 truncate">{companyId || 'Nenhum'}</span>
            </div>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Database className="size-4" />
            Status das Tabelas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tableStatuses.map((table) => (
              <div 
                key={table.name}
                className={cn(
                  "p-4 rounded-xl border flex items-center justify-between transition-all",
                  table.status === 'ok' ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <TableIcon className={cn("size-5", table.status === 'ok' ? "text-green-600" : "text-red-600")} />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{table.name}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">
                      {table.status === 'ok' ? `${table.count} registros` : 'Erro na consulta'}
                    </p>
                  </div>
                </div>
                {table.status === 'ok' ? (
                  <CheckCircle2 className="size-5 text-green-600" />
                ) : (
                  <XCircle className="size-5 text-red-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Errors List */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle className="size-4" />
          Detalhamento de Erros
        </h2>
        <div className="space-y-2">
          {tableStatuses.filter(t => t.status === 'error').length === 0 ? (
            <p className="text-sm text-gray-500 italic">Nenhum erro detectado nas tabelas selecionadas.</p>
          ) : (
            tableStatuses.filter(t => t.status === 'error').map(table => (
              <div key={table.name} className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm font-bold text-red-900">Tabela: {table.name}</p>
                <p className="text-xs font-mono text-red-700 mt-1">{table.error}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
