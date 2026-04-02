'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/shared/Header';
import {
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  MapPin,
  Calendar,
  ExternalLink,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Building2,
  Zap,
  FileText,
  Download,
  Save,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/safe-helpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useCompany } from '@/components/providers/CompanyProvider';
import { useIsReadOnly } from '@/hooks/useIsReadOnly';
import { opportunityService } from '@/lib/services/opportunities';
import { OpportunityDTO } from '@/lib/types/dtos';
import EmptyState from '@/components/shared/EmptyState';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TabKey = 'all' | 'new' | 'under_review' | 'relevant' | 'discarded';
type QuickFilterKey = 'all' | 'new_last_sync' | 'high_match' | 'expiring_soon' | 'converted';
type EsferaKey = 'Todos' | 'Municipal' | 'Estadual' | 'Federal' | 'Outro';

function deriveEsfera(organ_name: string): 'Municipal' | 'Estadual' | 'Federal' | 'Outro' {
  const up = (organ_name || '').toUpperCase();
  if (
    up.includes('FEDERAL') || up.includes('MINISTERIO') || up.includes('CASA DA MOEDA') ||
    up.includes('INSTITUTO FEDERAL') || up.includes('EXERCITO') || up.includes('MARINHA') ||
    up.includes('AERONAUTICA') || up.includes('POLICIA FEDERAL') || up.includes('RECEITA FEDERAL') ||
    up.includes('BANCO DO BRASIL') || up.includes('CAIXA ECONOMICA') || up.includes('CORREIOS') ||
    up.includes('PETROBRAS') || up.includes('ELETROBRAS') || up.includes('FUNDACAO FEDERAL') ||
    up.includes('AGENCIA NACIONAL')
  ) return 'Federal';
  if (
    up.includes('ESTADUAL') || up.includes('GOVERNO DO ESTADO') || up.includes('SEBRAE') ||
    up.includes('ASSEMBLEIA') || up.includes('TRIBUNAL') || up.includes('DETRAN') ||
    up.includes('DENATRAN') || up.includes('SESI') || up.includes('SENAI') ||
    up.includes('SENAR') || up.includes('SESC') || up.includes('SENAC') ||
    up.includes('GOVERNO DO') || up.includes('SECRETARIA DE ESTADO') ||
    up.includes('AGENCIA ESTADUAL') || up.includes('AUTARQUIA ESTADUAL')
  ) return 'Estadual';
  if (
    up.includes('MUNICIPIO') || up.includes('PREFEITURA') || up.includes('CAMARA DE VEREADORES') ||
    up.includes('FUNDO MUNICIPAL') || up.includes('CONSORCIO') || up.includes('CAMARA MUNICIPAL') ||
    up.includes('SERVICO MUNICIPAL') || up.includes('AUTARQUIA MUNICIPAL') || up.includes('SAAE') ||
    up.includes('SAAMA') || up.includes('SAMAE') || up.includes('FUNDO DE SAUDE') ||
    up.includes('FUNDO DE EDUCACAO')
  ) return 'Municipal';
  return 'Outro';
}

export default function OpportunitiesPage() {
  const { companyId } = useCompany();
  const isReadOnly = useIsReadOnly();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const [opps, setOpps] = useState<OpportunityDTO[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    newLastSync: 0,
    highMatch: 0,
    expiringSoon: 0,
    converted: 0,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isIAInsightsModalOpen, setIsIAInsightsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  const [selectedOpp, setSelectedOpp] = useState<OpportunityDTO | null>(null);
  const [proposalOpp, setProposalOpp] = useState<OpportunityDTO | null>(null);
  const [proposalContent, setProposalContent] = useState('');
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isSavingProposal, setIsSavingProposal] = useState(false);

  const [filters, setFilters] = useState({
    location: '',
    modality: '',
    minScore: 0,
  });
  const [selectedEsfera, setSelectedEsfera] = useState<EsferaKey>('Todos');

  const loadData = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);

    try {
      const oppsData = await opportunityService.getAll(companyId);
      setOpps(isReadOnly ? (oppsData || []).slice(0, 5) : (oppsData || []));
    } catch (error) {
      setOpps([]);
    }

    try {
      const statsData = await opportunityService.getStats(companyId);
      setStats(
        statsData || {
          total: 0,
          newLastSync: 0,
          highMatch: 0,
          expiringSoon: 0,
          converted: 0,
        }
      );
    } catch {}

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId, loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      toast.info('A sincronização automática ainda será conectada à fonte oficial.');
      await loadData();
    } catch {
      toast.error('Erro ao sincronizar dados.');
    } finally {
      setSyncing(false);
    }
  };

  const handleRecalculateScores = async () => {
    if (!companyId) return;

    setRecalculating(true);
    const toastId = toast.loading('Recalculando scores...');

    try {
      const response = await fetch('/api/intel/recalculate-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success(`Score atualizado em ${result.updated} oportunidades!`, { id: toastId });
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao recalcular scores.', {
        id: toastId,
      });
    } finally {
      setRecalculating(false);
    }
  };

  const handleGenerateProposal = async (opp: OpportunityDTO) => {
    if (!companyId) return;

    setProposalOpp(opp);
    setProposalContent('');
    setProposalId(null);
    setIsProposalModalOpen(true);
    setIsGeneratingProposal(true);

    const toastId = toast.loading('Gerando proposta com IA...');

    try {
      const response = await fetch('/api/intel/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, opportunity_id: opp.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setProposalContent(result.content);
      setProposalId(result.proposal_id);
      toast.success('Proposta gerada com sucesso!', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar proposta.', {
        id: toastId,
      });
      setIsProposalModalOpen(false);
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handleSaveProposal = async () => {
    if (!proposalId || !companyId) return;

    setIsSavingProposal(true);

    try {
      await supabase
        .from('ai_proposals')
        .update({ content: proposalContent, updated_at: new Date().toISOString() })
        .eq('id', proposalId);

      toast.success('Proposta salva com sucesso!');
    } catch {
      toast.error('Erro ao salvar proposta.');
    } finally {
      setIsSavingProposal(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!proposalContent || !proposalOpp) return;

    try {
      const response = await fetch('/api/intel/generate-proposal-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: proposalContent,
          title: `Proposta — ${proposalOpp.organ_name}`,
        }),
      });

      const html = await response.text();

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch {
      toast.error('Erro ao gerar PDF.');
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'new':
        return 'Nova';
      case 'updated':
        return 'Atualizada';
      case 'under_review':
        return 'Em revisão';
      case 'relevant':
        return 'Relevante';
      case 'discarded':
        return 'Descartada';
      case 'converted_to_task':
        return 'Convertida em tarefa';
      case 'converted_to_deal':
        return 'Convertida em negócio';
      case 'converted_to_proposal':
        return 'Convertida em proposta';
      default:
        return 'Sem status';
    }
  };

  const isConvertedOpportunity = (opp: OpportunityDTO) => {
    return (opp.internal_status || '').startsWith('converted_to_');
  };

  const isHighMatchOpportunity = (opp: OpportunityDTO) => {
    return Number(opp.match_score || 0) >= 90;
  };

  const isNewLastSyncOpportunity = (opp: OpportunityDTO) => {
    return opp.internal_status === 'new';
  };

  const isExpiringSoonOpportunity = (opp: OpportunityDTO) => {
    if (!opp.opening_date) return false;

    const today = new Date();
    const openingDate = new Date(opp.opening_date);

    if (Number.isNaN(openingDate.getTime())) return false;

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const openingStart = new Date(
      openingDate.getFullYear(),
      openingDate.getMonth(),
      openingDate.getDate()
    );

    const diffMs = openingStart.getTime() - todayStart.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 7;
  };

  const matchesQuickFilter = (opp: OpportunityDTO) => {
    switch (quickFilter) {
      case 'new_last_sync':
        return isNewLastSyncOpportunity(opp);
      case 'high_match':
        return isHighMatchOpportunity(opp);
      case 'expiring_soon':
        return isExpiringSoonOpportunity(opp);
      case 'converted':
        return isConvertedOpportunity(opp);
      case 'all':
      default:
        return true;
    }
  };

  const filteredOpps = useMemo(() => {
    return opps.filter((opp) => {
      const matchesTab = activeTab === 'all' ? true : opp.internal_status === activeTab;
      const searchBase = `${opp.title || ''} ${opp.organ_name || ''} ${opp.description || ''}`.toLowerCase();
      const matchesSearch = searchBase.includes(searchTerm.toLowerCase());

      const locationBase = `${opp.city || ''} ${opp.state || ''} ${opp.municipality_name || ''}`.toLowerCase();
      const matchesLocation = !filters.location || locationBase.includes(filters.location.toLowerCase());

      const matchesModality =
        !filters.modality || (opp.modality || '').toLowerCase().includes(filters.modality.toLowerCase());

      const matchesScore = Number(opp.match_score || 0) >= filters.minScore;
      const matchesQuick = matchesQuickFilter(opp);
      const matchesEsfera = selectedEsfera === 'Todos' || deriveEsfera(opp.organ_name || '') === selectedEsfera;

      return matchesTab && matchesSearch && matchesLocation && matchesModality && matchesScore && matchesQuick && matchesEsfera;
    });
  }, [opps, activeTab, searchTerm, filters, quickFilter, selectedEsfera]);

  const iaSummary = useMemo(() => {
    const ordered = [...filteredOpps].sort(
      (a, b) => Number(b.match_score || 0) - Number(a.match_score || 0)
    );

    return {
      totalAnalyzed: filteredOpps.length,
      highMatch: filteredOpps.filter((o) => Number(o.match_score || 0) >= 90),
      topRecommendation: ordered[0] || null,
    };
  }, [filteredOpps]);

  const quickFilterLabel =
    quickFilter === 'all'
      ? 'Todos os cards'
      : quickFilter === 'new_last_sync'
      ? 'Novas na Última Atualização'
      : quickFilter === 'high_match'
      ? 'Alta Aderência'
      : quickFilter === 'expiring_soon'
      ? 'Vencendo em Breve'
      : 'Convertidas';

  const handleQuickFilterClick = (filter: QuickFilterKey) => {
    setQuickFilter(filter);
  };

  return (
    <>
      <Header
        title="Licitações Abertas e Publicadas"
        subtitle="Monitoramento em tempo real de oportunidades públicas com destaque para aderência ao perfil da empresa."
      />

      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <button
                type="button"
                onClick={() => handleQuickFilterClick('all')}
                className={cn(
                  'bg-white p-4 rounded-xl border shadow-sm text-left transition-all',
                  quickFilter === 'all'
                    ? 'border-[#0f49bd] ring-2 ring-[#0f49bd]/10'
                    : 'border-gray-200 hover:border-[#0f49bd]/40 hover:shadow-md'
                )}
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Total Capturadas
                </span>
                <span className="text-2xl font-black text-gray-900">{stats.total}</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFilterClick('new_last_sync')}
                className={cn(
                  'bg-white p-4 rounded-xl border shadow-sm text-left transition-all',
                  quickFilter === 'new_last_sync'
                    ? 'border-blue-500 ring-2 ring-blue-500/10'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                )}
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Novas na Última Atualização
                </span>
                <span className="text-2xl font-black text-blue-600">{stats.newLastSync}</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFilterClick('high_match')}
                className={cn(
                  'bg-white p-4 rounded-xl border shadow-sm text-left transition-all',
                  quickFilter === 'high_match'
                    ? 'border-green-500 ring-2 ring-green-500/10'
                    : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                )}
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Alta Aderência
                </span>
                <span className="text-2xl font-black text-green-600">{stats.highMatch}</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFilterClick('expiring_soon')}
                className={cn(
                  'bg-white p-4 rounded-xl border shadow-sm text-left transition-all',
                  quickFilter === 'expiring_soon'
                    ? 'border-red-500 ring-2 ring-red-500/10'
                    : 'border-gray-200 hover:border-red-300 hover:shadow-md'
                )}
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Vencendo em Breve
                </span>
                <span className="text-2xl font-black text-red-600">{stats.expiringSoon}</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFilterClick('converted')}
                className={cn(
                  'bg-white p-4 rounded-xl border shadow-sm text-left transition-all',
                  quickFilter === 'converted'
                    ? 'border-purple-500 ring-2 ring-purple-500/10'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                )}
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Convertidas
                </span>
                <span className="text-2xl font-black text-purple-600">{stats.converted}</span>
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                <input
                  type="text"
                  placeholder="Buscar por objeto, órgão ou palavra-chave..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] outline-none transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={handleRecalculateScores}
                  disabled={recalculating}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Zap className={cn('size-4', recalculating && 'animate-pulse text-yellow-500')} />
                  {recalculating ? 'Recalculando...' : 'Recalcular Score'}
                </button>

                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('size-4', syncing && 'animate-spin')} />
                  Sincronizar
                </button>

                <button
                  onClick={() => setIsFilterModalOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Filter className="size-4" /> Filtros
                </button>

                <button
                  onClick={() => setIsIAInsightsModalOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f49bd] text-white rounded-lg text-sm font-bold hover:bg-[#0a3690] transition-colors shadow-sm"
                >
                  <Sparkles className="size-4" /> IA Insights
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1 border-b border-gray-200">
                {[
                  { key: 'all', label: 'Todas' },
                  { key: 'new', label: 'Novas' },
                  { key: 'under_review', label: 'Em Revisão' },
                  { key: 'relevant', label: 'Relevantes' },
                  { key: 'discarded', label: 'Descartadas' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as TabKey)}
                    className={cn(
                      'px-6 py-3 text-sm font-bold transition-all border-b-2',
                      activeTab === tab.key
                        ? 'border-[#0f49bd] text-[#0f49bd]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {quickFilter !== 'all' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Filtro rápido ativo:
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                    {quickFilterLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuickFilter('all')}
                    className="text-xs font-bold text-[#0f49bd] hover:underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            {isReadOnly && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 font-medium">
                Exibindo 5 oportunidades como amostra
              </div>
            )}

            {filteredOpps.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <EmptyState
                  icon={AlertCircle}
                  title="Nenhuma oportunidade encontrada"
                  description="Não há registros compatíveis com os filtros aplicados."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredOpps.map((opp) => (
                  <div
                    key={opp.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  >
                    <div className="p-6 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">
                                Licitação
                              </span>
                              <span className="text-gray-400 text-xs">•</span>
                              <span className="text-gray-500 text-xs font-medium flex items-center gap-1">
                                <Calendar className="size-3" />
                                Publicado em {opp.publication_date ? formatDate(opp.publication_date) : 'N/A'}
                              </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#0f49bd] transition-colors">
                              {opp.title}
                            </h3>

                            <p className="text-sm text-gray-600 font-medium mt-1 flex items-center gap-1">
                              <MapPin className="size-3 text-gray-400" />
                              {opp.organ_name} - {opp.city || opp.municipality_name || 'N/A'} ({opp.state || 'N/A'})
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            <div
                              className={cn(
                                'size-12 rounded-full border-4 flex items-center justify-center text-sm font-bold',
                                Number(opp.match_score || 0) >= 90
                                  ? 'border-green-100 text-green-600 bg-green-50'
                                  : Number(opp.match_score || 0) >= 70
                                  ? 'border-blue-100 text-blue-600 bg-blue-50'
                                  : Number(opp.match_score || 0) >= 50
                                  ? 'border-amber-100 text-amber-600 bg-amber-50'
                                  : 'border-gray-100 text-gray-400 bg-gray-50'
                              )}
                            >
                              {Number(opp.match_score || 0)}%
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                              Match IA
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {!!opp.modality && (
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">
                              {opp.modality}
                            </span>
                          )}
                          {!!opp.situation && (
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">
                              {opp.situation}
                            </span>
                          )}
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">
                            {getStatusLabel(opp.internal_status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Valor Estimado
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {opp.estimated_value ? formatCurrency(opp.estimated_value) : 'Não informado'}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Abertura
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {opp.opening_date ? formatDate(opp.opening_date) : 'N/A'}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Município Vinculado
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {opp.municipality_name || 'Não vinculado'}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Status Interno
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {getStatusLabel(opp.internal_status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 justify-end md:border-l md:border-gray-100 md:pl-6">
                        <button
                          onClick={() => {
                            setSelectedOpp(opp);
                            setIsDetailModalOpen(true);
                          }}
                          className="flex-1 md:flex-none p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#0f49bd] transition-all flex items-center justify-center gap-2 text-sm font-bold"
                        >
                          <Eye className="size-5" />
                          <span className="md:hidden">Visualizar</span>
                        </button>

                        <button
                          onClick={() => handleGenerateProposal(opp)}
                          className="flex-1 md:flex-none p-2.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                        >
                          <FileText className="size-5" />
                          <span className="md:hidden">Gerar Proposta</span>
                        </button>

                        {!isReadOnly && (
                          <button
                            onClick={() => {
                              if (opp.official_url) {
                                window.open(opp.official_url, '_blank', 'noopener,noreferrer');
                              } else {
                                toast.error('Link oficial não disponível.');
                              }
                            }}
                            className="flex-1 md:flex-none p-2.5 rounded-lg bg-[#0f49bd] text-white hover:bg-[#0a3690] transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                          >
                            <ExternalLink className="size-5" />
                            <span className="md:hidden">Link Oficial</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {Number(opp.match_score || 0) >= 50 && (
                      <div className="bg-blue-50/50 px-6 py-3 border-t border-blue-100 flex items-center gap-3">
                        <Sparkles className="size-4 text-blue-600" />
                        <p className="text-xs text-blue-800 font-medium">
                          <span className="font-bold">Análise IA:</span>{' '}
                          {opp.match_reason || 'Sem justificativa disponível.'}
                        </p>
                        <button
                          onClick={() => {
                            setSelectedOpp(opp);
                            setIsDetailModalOpen(true);
                          }}
                          className="ml-auto text-xs font-bold text-blue-700 hover:underline flex items-center"
                        >
                          Ver Detalhes <ChevronRight className="size-3 ml-1" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-purple-600" />
              Proposta Comercial Gerada por IA
            </DialogTitle>
            <DialogDescription>
              {proposalOpp?.organ_name} — {proposalOpp?.title?.substring(0, 80)}...
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {isGeneratingProposal ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="size-10 text-purple-600 animate-spin" />
                <p className="text-sm text-gray-500 font-medium">
                  Analisando o edital e gerando a proposta...
                </p>
                <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Edite o texto abaixo se necessário antes de salvar ou baixar.
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full uppercase">
                    Gerado por IA
                  </span>
                </div>

                <textarea
                  className="w-full min-h-[400px] p-4 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none leading-relaxed font-mono"
                  value={proposalContent}
                  onChange={(e) => setProposalContent(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsProposalModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>

            <button
              onClick={handleSaveProposal}
              disabled={isSavingProposal || isGeneratingProposal || !proposalContent}
              className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              {isSavingProposal ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingProposal || !proposalContent}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <Download className="size-4" />
              Baixar PDF
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isIAInsightsModalOpen} onOpenChange={setIsIAInsightsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-[#0f49bd]" /> IA Insights
            </DialogTitle>
            <DialogDescription>
              Resumo das oportunidades com base na aderência identificada.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Analisadas
                </span>
                <span className="text-2xl font-black text-gray-900">{iaSummary.totalAnalyzed}</span>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">
                  Alta Aderência
                </span>
                <span className="text-2xl font-black text-[#0f49bd]">
                  {iaSummary.highMatch.length}
                </span>
              </div>
            </div>

            {iaSummary.topRecommendation && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" /> Recomendação Prioritária
                </h4>

                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-sm font-bold text-green-900 mb-1">
                    {iaSummary.topRecommendation.title}
                  </p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    <span className="font-bold">Justificativa:</span>{' '}
                    {iaSummary.topRecommendation.match_reason || 'Sem justificativa.'}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-600" /> Alertas
              </h4>

              <ul className="space-y-2">
                <li className="text-xs text-gray-600 flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  Use "Recalcular Score" sempre que atualizar o perfil estratégico.
                </li>
                <li className="text-xs text-gray-600 flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  Use "Gerar Proposta" nas licitações com maior aderência ao seu perfil.
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsIAInsightsModalOpen(false)}
              className="w-full bg-[#0f49bd] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
            >
              Entendido
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Oportunidade</DialogTitle>
            <DialogDescription>
              Informações completas da oportunidade selecionada.
            </DialogDescription>
          </DialogHeader>

          {selectedOpp && (
            <div className="py-4 space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">{selectedOpp.title}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Building2 className="size-4" /> {selectedOpp.organ_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Valor Estimado
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedOpp.estimated_value
                      ? formatCurrency(selectedOpp.estimated_value)
                      : 'Não informado'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Modalidade
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedOpp.modality || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Abertura
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedOpp.opening_date ? formatDate(selectedOpp.opening_date) : 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Match IA
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold',
                      Number(selectedOpp.match_score || 0) >= 90 ? 'text-green-600' : 'text-blue-600'
                    )}
                  >
                    {Number(selectedOpp.match_score || 0)}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Resumo Analítico
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed italic">
                  &quot;{selectedOpp.match_reason || 'Sem justificativa analítica disponível.'}&quot;
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Descrição
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedOpp.description || 'Sem descrição detalhada disponível.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                {!isReadOnly && (
                  <button
                    onClick={() => {
                      if (selectedOpp.official_url) {
                        window.open(selectedOpp.official_url, '_blank');
                      } else {
                        toast.error('Link não disponível.');
                      }
                    }}
                    className="flex-1 bg-[#0f49bd] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="size-4" /> Ver Link Oficial
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleGenerateProposal(selectedOpp);
                  }}
                  className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-purple-700 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="size-4" /> Gerar Proposta
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
            <DialogDescription>
              Refine a visualização das oportunidades carregadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Esfera</label>
              <div className="flex gap-2 flex-wrap">
                {(['Todos', 'Municipal', 'Estadual', 'Federal'] as const).map((esfera) => (
                  <button
                    key={esfera}
                    type="button"
                    onClick={() => setSelectedEsfera(esfera)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-bold border transition-all',
                      selectedEsfera === esfera
                        ? 'bg-[#0f49bd] text-white border-[#0f49bd]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#0f49bd]/40'
                    )}
                  >
                    {esfera}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Localização (UF ou Cidade)</label>
              <input
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: SP ou Curitiba"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Modalidade</label>
              <input
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Pregão Eletrônico"
                value={filters.modality}
                onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Match IA Mínimo ({filters.minScore}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0f49bd]"
                value={filters.minScore}
                onChange={(e) =>
                  setFilters({ ...filters, minScore: parseInt(e.target.value, 10) })
                }
              />
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <button
              onClick={() => {
                setFilters({ location: '', modality: '', minScore: 0 });
                setSelectedEsfera('Todos');
                setQuickFilter('all');
                toast.info('Filtros limpos.');
              }}
              className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              Limpar
            </button>

            <button
              onClick={() => {
                toast.success('Filtros aplicados!');
                setIsFilterModalOpen(false);
              }}
              className="flex-1 bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
            >
              Aplicar Filtros
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
