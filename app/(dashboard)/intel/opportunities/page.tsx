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
  DollarSign,
  ExternalLink,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronRight,
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
import { opportunityService } from '@/lib/services/opportunities';
import { OpportunityDTO } from '@/lib/types/dtos';
import EmptyState from '@/components/shared/EmptyState';

type TabKey = 'all' | 'new' | 'under_review' | 'relevant' | 'discarded';

export default function OpportunitiesPage() {
  const { companyId } = useCompany();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [opportunities, setOpportunities] = useState<OpportunityDTO[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    newLastSync: 0,
    highMatch: 0,
    expiringSoon: 0,
    converted: 0,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isIAInsightsModalOpen, setIsIAInsightsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedOpp, setSelectedOpp] = useState<OpportunityDTO | null>(null);

  const [filters, setFilters] = useState({
    location: '',
    modality: '',
    minScore: 0,
  });

  const loadData = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const [oppsData, statsData] = await Promise.all([
        opportunityService.getAll(companyId),
        opportunityService.getStats(companyId),
      ]);

      setOpportunities(oppsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar oportunidades:', error);
      toast.error('Erro ao carregar dados de inteligência.');
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      toast.info('A sincronização automática ainda será conectada à fonte oficial.');
      await loadData();
    } catch (error) {
      toast.error('Erro ao sincronizar dados.');
    } finally {
      setSyncing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'border-green-100 text-green-600 bg-green-50';
    if (score >= 70) return 'border-blue-100 text-blue-600 bg-blue-50';
    if (score >= 50) return 'border-amber-100 text-amber-600 bg-amber-50';
    return 'border-gray-100 text-gray-400 bg-gray-50';
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

  const filteredOpps = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesTab =
        activeTab === 'all' ? true : opp.internal_status === activeTab;

      const searchBase = `${opp.title || ''} ${opp.organ_name || ''} ${opp.description || ''}`.toLowerCase();
      const matchesSearch = searchBase.includes(searchTerm.toLowerCase());

      const locationBase = `${opp.city || ''} ${opp.state || ''} ${opp.municipality_name || ''}`.toLowerCase();
      const matchesLocation = !filters.location || locationBase.includes(filters.location.toLowerCase());

      const matchesModality =
        !filters.modality ||
        (opp.modality || '').toLowerCase().includes(filters.modality.toLowerCase());

      const matchesScore = Number(opp.match_score || 0) >= filters.minScore;

      return matchesTab && matchesSearch && matchesLocation && matchesModality && matchesScore;
    });
  }, [opportunities, activeTab, searchTerm, filters]);

  const iaSummary = useMemo(() => {
    const ordered = [...filteredOpps].sort(
      (a, b) => Number(b.match_score || 0) - Number(a.match_score || 0)
    );

    return {
      totalAnalyzed: filteredOpps.length,
      highMatch: filteredOpps.filter((o) => Number(o.match_score || 0) >= 90),
      mediumMatch: filteredOpps.filter(
        (o) => Number(o.match_score || 0) >= 70 && Number(o.match_score || 0) < 90
      ),
      topRecommendation: ordered[0] || null,
    };
  }, [filteredOpps]);

  const handleApplyFilters = () => {
    toast.success('Filtros aplicados!');
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({
      location: '',
      modality: '',
      minScore: 0,
    });
    toast.info('Filtros limpos.');
  };

  const handleOpenNotice = (url?: string) => {
    if (!url) {
      toast.error('Link oficial ainda não disponível para esta oportunidade.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleViewDetail = (opp: OpportunityDTO) => {
    setSelectedOpp(opp);
    setIsDetailModalOpen(true);
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
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total Capturadas</span>
                <span className="text-2xl font-black text-gray-900">{stats.total}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Novas na Última Atualização</span>
                <span className="text-2xl font-black text-blue-600">{stats.newLastSync}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Alta Aderência</span>
                <span className="text-2xl font-black text-green-600">{stats.highMatch}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Vencendo em Breve</span>
                <span className="text-2xl font-black text-red-600">{stats.expiringSoon}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Convertidas</span>
                <span className="text-2xl font-black text-purple-600">{stats.converted}</span>
              </div>
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
                  <Filter className="size-4" />
                  Filtros Avançados
                </button>

                <button
                  onClick={() => setIsIAInsightsModalOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f49bd] text-white rounded-lg text-sm font-bold hover:bg-[#0a3690] transition-colors shadow-sm"
                >
                  <Sparkles className="size-4" />
                  IA Insights
                </button>
              </div>
            </div>

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

            {filteredOpps.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <EmptyState
                  icon={AlertCircle}
                  title="Nenhuma oportunidade encontrada"
                  description="Não há registros compatíveis com os filtros aplicados ou ainda não existem oportunidades carregadas na base."
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
                                getScoreColor(Number(opp.match_score || 0))
                              )}
                            >
                              {Number(opp.match_score || 0)}%
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Match IA</span>
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
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Valor Estimado</span>
                            <span className="text-sm font-bold text-gray-900">
                              {opp.estimated_value ? formatCurrency(opp.estimated_value) : 'Não informado'}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Abertura</span>
                            <span className="text-sm font-bold text-gray-900">
                              {opp.opening_date ? formatDate(opp.opening_date) : 'N/A'}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Município Vinculado</span>
                            <span className="text-sm font-bold text-gray-900">
                              {opp.municipality_name || 'Não vinculado'}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status Interno</span>
                            <span className="text-sm font-bold text-gray-900">
                              {getStatusLabel(opp.internal_status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 justify-end md:border-l md:border-gray-100 md:pl-6">
                        <button
                          onClick={() => handleViewDetail(opp)}
                          className="flex-1 md:flex-none p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#0f49bd] transition-all flex items-center justify-center gap-2 text-sm font-bold"
                        >
                          <Eye className="size-5" />
                          <span className="md:hidden">Visualizar</span>
                        </button>

                        <button
                          onClick={() => handleOpenNotice(opp.official_url)}
                          className="flex-1 md:flex-none p-2.5 rounded-lg bg-[#0f49bd] text-white hover:bg-[#0a3690] transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                        >
                          <ExternalLink className="size-5" />
                          <span className="md:hidden">Link Oficial</span>
                        </button>
                      </div>
                    </div>

                    {Number(opp.match_score || 0) >= 50 && (
                      <div className="bg-blue-50/50 px-6 py-3 border-t border-blue-100 flex items-center gap-3">
                        <Sparkles className="size-4 text-blue-600" />
                        <p className="text-xs text-blue-800 font-medium">
                          <span className="font-bold">Análise IA:</span> {opp.match_reason || 'Sem justificativa disponível.'}
                        </p>
                        <button
                          onClick={() => handleViewDetail(opp)}
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

      <Dialog open={isIAInsightsModalOpen} onOpenChange={setIsIAInsightsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-[#0f49bd]" />
              IA Insights - Oportunidades
            </DialogTitle>
            <DialogDescription>
              Resumo das oportunidades carregadas com base na aderência identificada.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Analisadas</span>
                <span className="text-2xl font-black text-gray-900">{iaSummary.totalAnalyzed}</span>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Alta Aderência</span>
                <span className="text-2xl font-black text-[#0f49bd]">{iaSummary.highMatch.length}</span>
              </div>
            </div>

            {iaSummary.topRecommendation && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  Recomendação Prioritária
                </h4>
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-sm font-bold text-green-900 mb-1">{iaSummary.topRecommendation.title}</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    <span className="font-bold">Justificativa:</span> {iaSummary.topRecommendation.match_reason || 'Sem justificativa disponível.'}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-600" />
                Alertas
              </h4>
              <ul className="space-y-2">
                <li className="text-xs text-gray-600 flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  O painel já destaca automaticamente oportunidades com maior aderência ao perfil estratégico.
                </li>
                <li className="text-xs text-gray-600 flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  A sincronização automática com a fonte oficial ainda será conectada na próxima etapa.
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
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Valor Estimado</span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedOpp.estimated_value ? formatCurrency(selectedOpp.estimated_value) : 'Não informado'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Modalidade</span>
                  <span className="text-sm font-bold text-gray-900">{selectedOpp.modality || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Abertura</span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedOpp.opening_date ? formatDate(selectedOpp.opening_date) : 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Match IA</span>
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
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Resumo Analítico</h4>
                <p className="text-sm text-gray-600 leading-relaxed italic">
                  &quot;{selectedOpp.match_reason || 'Sem justificativa analítica disponível.'}&quot;
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedOpp.description || 'Sem descrição detalhada disponível.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleOpenNotice(selectedOpp.official_url)}
                  className="flex-1 bg-[#0f49bd] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="size-4" /> Ver Link Oficial
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
              <label className="text-sm font-bold text-gray-700">Match IA Mínimo ({filters.minScore}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0f49bd]"
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value, 10) })}
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
              onClick={handleResetFilters}
              className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              Limpar
            </button>
            <button
              onClick={handleApplyFilters}
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
