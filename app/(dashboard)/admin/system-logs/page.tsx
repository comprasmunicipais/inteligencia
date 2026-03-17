'use client';

import React from 'react';
import Header from '@/components/shared/Header';
import { 
  Terminal, 
  Search, 
  Filter, 
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const logs = [
  { id: '1', level: 'error', message: 'Falha na conexão com Storage Bucket: municipality-documents', time: '2023-10-24 14:30:12', user: 'System' },
  { id: '2', level: 'info', message: 'Sincronização PNCP concluída: 145 novos registros', time: '2023-10-24 14:15:00', user: 'Fernando D.' },
  { id: '3', level: 'warning', message: 'Latência alta detectada no Motor de Match: 1.2s', time: '2023-10-24 13:45:22', user: 'System' },
  { id: '4', level: 'success', message: 'Backup diário do banco de dados concluído', time: '2023-10-24 03:00:00', user: 'System' },
  { id: '5', level: 'info', message: 'Novo usuário cadastrado: maria.silva@prefeitura.gov.br', time: '2023-10-23 16:20:10', user: 'Admin' },
];

export default function SystemLogsPage() {
  return (
    <>
      <Header 
        title="Logs do Sistema" 
        subtitle="Monitoramento técnico de eventos, erros e atividades críticas da plataforma." 
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
              <input 
                type="text" 
                placeholder="Buscar logs por mensagem ou usuário..." 
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] outline-none transition-all text-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                <Filter className="size-4" />
                Filtrar
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f49bd] text-white rounded-lg text-sm font-bold hover:bg-[#0a3690] transition-colors shadow-sm">
                <Download className="size-4" />
                Exportar Logs
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nível</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mensagem</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuário</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className={cn(
                          "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                          log.level === 'error' ? "text-red-600" :
                          log.level === 'warning' ? "text-amber-600" :
                          log.level === 'success' ? "text-green-600" : "text-blue-600"
                        )}>
                          {log.level === 'error' && <XCircle className="size-3" />}
                          {log.level === 'warning' && <AlertCircle className="size-3" />}
                          {log.level === 'success' && <CheckCircle2 className="size-3" />}
                          {log.level === 'info' && <Info className="size-3" />}
                          {log.level}
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{log.message}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-xs font-bold text-gray-600">{log.user}</span>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-xs font-mono text-gray-400">{log.time}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Terminal View Placeholder */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-4">
              <Terminal className="size-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Live System Console</span>
            </div>
            <div className="font-mono text-xs space-y-1">
              <p className="text-emerald-500/80">[2023-10-24 14:35:01] INFO: Initializing PNCP sync worker...</p>
              <p className="text-emerald-500/80">[2023-10-24 14:35:05] INFO: Connection established with PNCP API v1.</p>
              <p className="text-emerald-500/80">[2023-10-24 14:35:10] INFO: Processing batch #452 (50 records)...</p>
              <p className="text-amber-500/80">[2023-10-24 14:35:12] WARN: Skipping record #12345: Invalid CNPJ format.</p>
              <p className="text-emerald-500/80">[2023-10-24 14:35:15] INFO: Batch #452 completed. 49 inserted, 1 skipped.</p>
              <p className="text-emerald-500 animate-pulse">_</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
