'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/shared/Header';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Database, 
  ArrowRight,
  Activity,
  History,
  Sparkles,
  PlusCircle,
  Trash2,
  ShieldAlert,
  XCircle,
  Info
} from 'lucide-react';
import { pncpSyncService, SyncError } from '@/lib/pncp/sync';
import { SyncJob, Opportunity } from '@/lib/intel/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { runTestSync, triggerNewTestOpportunity, resetSyncTest, triggerUpdateTestOpportunities, runResilienceTest } from '@/lib/intel/services';

export default function PNCPAdminSyncPage() {
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [errors, setErrors] = useState<SyncError[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isResilienceTesting, setIsResilienceTesting] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [stats, setStats] = useState({
    totalOpps: 0,
    lastSync: 'Nunca',
    status: 'idle' as 'idle' | 'running' | 'success' | 'failed'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allJobs = pncpSyncService.getJobs();
    const allOpps = pncpSyncService.getOpportunities();
    const allErrors = pncpSyncService.getErrors();
    setJobs([...allJobs]);
    setErrors([...allErrors]);
    
    const lastJob = allJobs[0];
    setStats({
      totalOpps: allOpps.length,
      lastSync: lastJob ? formatDate(lastJob.finished_at || lastJob.started_at) : 'Nunca',
      status: lastJob ? lastJob.status : 'idle'
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    toast.info('Iniciando sincronização incremental com PNCP...');
    
    try {
      await pncpSyncService.runSync({ mode: 'production' });
      loadData();
      toast.success('Sincronização concluída com sucesso!');
    } catch (error) {
      toast.error('Erro na sincronização. Verifique os logs.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestSync = async () => {
    setIsTesting(true);
    toast.info('Executando sincronização de teste...');
    try {
      await runTestSync();
      loadData();
      toast.success('Sync de teste concluído!');
    } catch (error) {
      toast.error('Erro no sync de teste.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleResilienceTest = async () => {
    setIsResilienceTesting(true);
    toast.info('Executando teste de resiliência...');
    try {
      await runResilienceTest();
      loadData();
      toast.success('Teste de resiliência concluído!');
    } catch (error) {
      toast.error('Erro no teste de resiliência.');
    } finally {
      setIsResilienceTesting(false);
    }
  };

  const handleSimulateNew = () => {
    const newOpp = triggerNewTestOpportunity();
    toast.success(`Nova oportunidade simulada: ${newOpp.numeroControlePNCP}`);
  };

  const handleSimulateUpdate = () => {
    triggerUpdateTestOpportunities();
    toast.success('Dataset de teste atualizado para simular reprocessamento.');
  };

  const handleResetTest = () => {
    resetSyncTest();
    loadData();
    toast.info('Dataset de teste resetado.');
  };

  return (
    <>
      <Header 
        title="Monitoramento PNCP" 
        subtitle="Gerencie a coleta incremental de oportunidades do Portal Nacional de Contratações Públicas." 
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Database className="size-5 text-[#0f49bd]" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total na Base</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">{stats.totalOpps}</span>
                <span className="text-xs text-gray-500 font-medium">oportunidades</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Clock className="size-5 text-green-600" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Última Sincronização</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{stats.lastSync}</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Activity className="size-5 text-gray-600" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status do Coletor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "size-2.5 rounded-full animate-pulse",
                  stats.status === 'running' ? "bg-blue-500" : 
                  stats.status === 'success' ? "bg-green-500" : 
                  stats.status === 'failed' ? "bg-red-500" : "bg-gray-300"
                )} />
                <span className="font-bold text-gray-900 capitalize">
                  {stats.status === 'idle' ? 'Inativo' : 
                   stats.status === 'running' ? 'Sincronizando...' : 
                   stats.status === 'success' ? 'Operacional' : 'Erro'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <button 
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#0f49bd] text-white rounded-2xl hover:bg-[#0a3690] transition-all shadow-md disabled:opacity-50 group"
              >
                <RefreshCw className={cn("size-8", isSyncing && "animate-spin")} />
                <span className="font-bold text-sm">Sincronizar Agora</span>
              </button>
            </div>
          </div>

          {/* Test & Resilience Mode Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Sparkles className="size-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900">Testes de Incrementalidade</h3>
                  <p className="text-xs text-amber-800">Valide a lógica de deduplicação e sincronização incremental.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleTestSync}
                  disabled={isTesting}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm font-bold text-amber-900 hover:bg-amber-100 transition-all shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-4", isTesting && "animate-spin")} />
                  Executar Teste
                </button>
                <button 
                  onClick={handleSimulateUpdate}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm font-bold text-amber-900 hover:bg-amber-100 transition-all shadow-sm"
                >
                  <Activity className="size-4" />
                  Simular Atu.
                </button>
                <button 
                  onClick={handleSimulateNew}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm font-bold text-amber-900 hover:bg-amber-100 transition-all shadow-sm"
                >
                  <PlusCircle className="size-4" />
                  Simular Novo
                </button>
                <button 
                  onClick={handleResetTest}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all shadow-sm"
                >
                  <Trash2 className="size-4" />
                  Resetar Tudo
                </button>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShieldAlert className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-900">Teste de Resiliência</h3>
                  <p className="text-xs text-purple-800">Valide a robustez contra payloads inválidos ou incompletos.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleResilienceTest}
                  disabled={isResilienceTesting}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-purple-200 rounded-xl text-sm font-bold text-purple-900 hover:bg-purple-100 transition-all shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-4", isResilienceTesting && "animate-spin")} />
                  Executar Resiliência
                </button>
                <button 
                  onClick={() => setShowErrorModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-purple-200 rounded-xl text-sm font-bold text-purple-900 hover:bg-purple-100 transition-all shadow-sm"
                >
                  <XCircle className="size-4" />
                  Ver Erros ({errors.length})
                </button>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white/50 rounded-xl border border-purple-100">
                <Info className="size-4 text-purple-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-purple-700 leading-tight">
                  O teste de resiliência injeta payloads com campos ausentes, tipos errados e IDs inválidos para garantir que o coletor não interrompa o lote.
                </p>
              </div>
            </div>
          </div>

          {/* Jobs History */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="size-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">Histórico de Sincronização</h3>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Início</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Janela</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resultados</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duração</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-gray-500 italic">
                        Nenhum job de sincronização registrado.
                      </td>
                    </tr>
                  ) : (
                    jobs.map(job => (
                      <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="text-sm font-bold text-gray-900">{job.started_at ? formatDate(job.started_at) : 'N/A'}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{new Date(job.started_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-8 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            job.status === 'success' ? "bg-green-50 text-green-700" :
                            job.status === 'running' ? "bg-blue-50 text-blue-700" :
                            "bg-red-50 text-red-700"
                          )}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                            <span>{job.sync_window_start}</span>
                            <ArrowRight className="size-3 text-gray-300" />
                            <span>{job.sync_window_end}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex gap-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Novos</span>
                              <span className="text-sm font-bold text-green-600">{job.records_inserted}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Atu.</span>
                              <span className="text-sm font-bold text-blue-600">{job.records_updated}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Ign.</span>
                              <span className="text-sm font-bold text-gray-400">{job.records_skipped}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm font-medium text-gray-600">
                            {job.finished_at ? 
                              `${Math.round((new Date(job.finished_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s` : 
                              '--'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Technical Info */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white rounded-lg border border-blue-100">
                <AlertCircle className="size-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900 mb-1">Arquitetura de Coleta Incremental</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  O coletor utiliza o endpoint <code className="bg-blue-100 px-1 rounded">/v1/contratacoes/publicacao</code> do PNCP. 
                  A cada execução, o sistema identifica o último job bem-sucedido e utiliza sua data de término como ponto de partida para a nova janela de busca. 
                  A deduplicação é realizada através do <span className="font-bold">Número de Controle PNCP</span>, garantindo que atualizações em editais já existentes sejam processadas sem duplicar registros na base central.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-purple-50">
              <div className="flex items-center gap-3">
                <ShieldAlert className="size-6 text-purple-600" />
                <div>
                  <h3 className="text-xl font-black text-gray-900">Logs de Resiliência</h3>
                  <p className="text-xs text-purple-700 font-medium">Erros de parsing e normalização detectados durante a sincronização.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowErrorModal(false)}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <XCircle className="size-6 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              {errors.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="size-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Nenhum erro de resiliência detectado até o momento.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {errors.map(err => (
                    <div key={err.id} className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{err.error_type}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{err.created_at ? formatDate(err.created_at) : 'N/A'}</span>
                      </div>
                      <div className="text-sm font-bold text-gray-900">{err.error_message}</div>
                      <div className="bg-white p-3 rounded-lg border border-red-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Payload Excerpt</div>
                        <code className="text-[10px] text-red-800 break-all">{err.raw_payload_excerpt}</code>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        ID Externo: <span className="font-mono">{err.source_external_id || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowErrorModal(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
