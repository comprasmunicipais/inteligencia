'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import { 
  Search, 
  Filter, 
  Plus,
  Bookmark, 
  Eye, 
  Trash2, 
  MapPin, 
  Calendar, 
  DollarSign,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  Star,
  Loader2
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { getCentralOpportunities, runIncrementalSync, addManualOpportunity } from '@/lib/intel/services';
import { Opportunity, CompanyOpportunityMatch, OpportunityStatus } from '@/lib/intel/types';
import { useCompany } from '@/components/providers/CompanyProvider';
import { intelService } from '@/lib/services/intel';
import { municipalityService, MunicipalityOption } from '@/lib/services/municipalities';

export default function OpportunitiesPage() {
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [matches, setMatches] = useState<CompanyOpportunityMatch[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isIAInsightsModalOpen, setIsIAInsightsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [newManualOpp, setNewManualOpp] = useState({
    title: '',
    municipality_id: '',
    department: '',
    secretariat: '',
    estimated_value: '',
    category: 'Educação',
    description: '',
    status: 'active' as OpportunityStatus
  });
  const [filters, setFilters] = useState({ location: '', minScore: 0, priority: 'all', onlyFavorites: false });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [centralOpps, companyMatches, munData] = await Promise.all([
        getCentralOpportunities(),
        intelService.getMatches(companyId!),
        municipalityService.getAllForSelect()
      ]);
      
      setOpps(centralOpps);
      setMatches(companyMatches);
      setMunicipalities(munData);
    } catch (error) {
      toast.error('Erro ao carregar dados de inteligência.');
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
    setIsSyncing(true);
    try {
      await runIncrementalSync();
      await loadData();
      toast.success('Base de oportunidades atualizada!');
    } catch (error) {
      toast.error('Erro ao sincronizar dados.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getMatchForOpp = (oppId: string) => {
    return matches.find(m => m.opportunity_id === oppId);
  };

  const handleToggleSave = async (oppId: string) => {
    const match = getMatchForOpp(oppId);
    if (match) {
      const newStatus = match.status === 'saved' ? 'new' : 'saved';
      try {
        const updated = await intelService.updateMatchStatus(match.id, newStatus);
        setMatches(matches.map(m => m.id === match.id ? updated : m));
        toast.success(newStatus === 'saved' ? 'Oportunidade salva!' : 'Removida das salvas.');
      } catch (error) {
        toast.error('Erro ao atualizar status.');
      }
    }
  };

  const handleDelete = async (oppId: string) => {
    const match = getMatchForOpp(oppId);
    if (match) {
      try {
        const updated = await intelService.updateMatchStatus(match.id, 'dismissed');
        setMatches(matches.map(m => m.id === match.id ? updated : m));
        toast.success('Oportunidade descartada.');
      } catch (error) {
        toast.error('Erro ao descartar oportunidade.');
      }
    }
  };

  const enrichedOpps = opps.map(opp => {
    const match = getMatchForOpp(opp.id);
    return {
      ...opp,
      matchScore: match?.match_score || 0,
      matchReason: match?.match_reason || '',
      matchStatus: match?.status || 'new',
      priority: match?.priority_level || 'low',
      isFavorite: match?.status === 'saved'
    };
  }).filter(o => o.matchStatus !== 'dismissed')
    .sort((a, b) => b.matchScore - a.matchScore);

  const filteredOpps = enrichedOpps.filter(o => {
    const matchesTab = activeTab === 'all' || o.matchStatus === activeTab;
    const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.buyer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !filters.location || o.state.toLowerCase().includes(filters.location.toLowerCase()) || o.municipality.toLowerCase().includes(filters.location.toLowerCase());
    const matchesScore = o.matchScore >= filters.minScore;
    const matchesPriority = filters.priority === 'all' || o.priority === filters.priority;
    const matchesFavorites = !filters.onlyFavorites || o.isFavorite;
    
    return matchesTab && matchesSearch && matchesLocation && matchesScore && matchesPriority && matchesFavorites;
  });

  const totalPages = Math.ceil(filteredOpps.length / itemsPerPage);
  const paginatedOpps = filteredOpps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    toast.success('Filtros aplicados!');
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({ location: '', minScore: 0, priority: 'all', onlyFavorites: false });
    setCurrentPage(1);
    toast.info('Filtros limpos.');
  };

  const handleOpenNotice = (url: string) => {
    if (!url) {
      toast.error('Edital oficial ainda não disponível para esta oportunidade.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleIAInsights = () => {
    setIsIAInsightsModalOpen(true);
  };

  const handleCreateManualOpp = async () => {
    if (!newManualOpp.title || !newManualOpp.municipality_id) {
      toast.error('Título e Prefeitura são obrigatórios.');
      return;
    }

    try {
      const selectedMun = municipalities.find(m => m.id === newManualOpp.municipality_id);
      
      const manualOpp: Partial<Opportunity> = {
        title: newManualOpp.title,
        description: newManualOpp.description,
        municipality: selectedMun?.label || '',
        state: selectedMun?.state || '',
        estimated_value: parseFloat(newManualOpp.estimated_value) || 0,
        category: newManualOpp.category,
        status: newManualOpp.status,
        source: 'manual' as any,
        publish_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      };

      await addManualOpportunity(manualOpp as Opportunity);
      await loadData();
      
      setIsManualModalOpen(false);
      setNewManualOpp({
        title: '',
        municipality_id: '',
        department: '',
        secretariat: '',
        estimated_value: '',
        category: 'Educação',
        description: '',
        status: 'active'
      });
      
      toast.success('Oportunidade manual criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar oportunidade manual.');
    }
  };

  const handleViewDetail = (opp: any) => {
    setSelectedOpp(opp);
    setIsDetailModalOpen(true);
  };

  const handleViewAnalysis = (opp: any) => {
    setSelectedOpp(opp);
    setIsAnalysisModalOpen(true);
  };

  const iaSummary = {
    totalAnalyzed: filteredOpps.length,
    highMatch: filteredOpps.filter(o => o.matchScore >= 90),
    mediumMatch: filteredOpps.filter(o => o.matchScore >= 70 && o.matchScore < 90),
    topRecommendation: filteredOpps.sort((a, b) => b.matchScore - a.matchScore)[0]
  };

  return (
    <>
      <Header 
        title="Oportunidades PNCP" 
        subtitle="Monitoramento em tempo real de licitações e editais publicados no Portal Nacional de Contratações Públicas." 
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Filters & Search */}
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
                  onClick={() => setIsManualModalOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="size-4" />
                  Nova Oportunidade
                </button>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="Sincronizar com PNCP"
                >
                  <RefreshCw className={cn("size-4", isSyncing && "animate-spin")} />
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
                  onClick={handleIAInsights}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f49bd] text-white rounded-lg text-sm font-bold hover:bg-[#0a3690] transition-colors shadow-sm"
                >
                  <Sparkles className="size-4" />
                  IA Insights
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-200">
              {['all', 'new', 'saved', 'viewed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-6 py-3 text-sm font-bold transition-all border-b-2 capitalize",
                    activeTab === tab 
                      ? "border-[#0f49bd] text-[#0f49bd]" 
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  {tab === 'all' ? 'Todas' : tab === 'new' ? 'Novas' : tab === 'saved' ? 'Salvas' : 'Visualizadas'}
                </button>
              ))}
            </div>

            {/* Opportunities List */}
            <div className="grid grid-cols-1 gap-4">
              {paginatedOpps.map((opp) => (
                <div 
                  key={opp.id} 
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                >
                  <div className="p-6 flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">
                              {opp.source}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border",
                              opp.priority === 'critical' ? "bg-red-50 text-red-700 border-red-100" :
                              opp.priority === 'high' ? "bg-orange-50 text-orange-700 border-orange-100" :
                              opp.priority === 'medium' ? "bg-blue-50 text-blue-700 border-blue-100" :
                              "bg-gray-50 text-gray-700 border-gray-100"
                            )}>
                              Prioridade {opp.priority === 'critical' ? 'Crítica' : opp.priority === 'high' ? 'Alta' : opp.priority === 'medium' ? 'Média' : 'Baixa'}
                            </span>
                            <span className="text-gray-400 text-xs">•</span>
                            <span className="text-gray-500 text-xs font-medium flex items-center gap-1">
                              <Calendar className="size-3" />
                              Publicado em {opp.publish_date ? formatDate(opp.publish_date) : 'N/A'}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#0f49bd] transition-colors">
                            {opp.title}
                          </h3>
                          <p className="text-sm text-gray-600 font-medium mt-1 flex items-center gap-1">
                            <MapPin className="size-3 text-gray-400" />
                            {opp.buyer_name} - {opp.municipality} ({opp.state})
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <div className={cn(
                            "size-12 rounded-full border-4 flex items-center justify-center text-sm font-bold",
                            opp.matchScore >= 90 ? "border-green-100 text-green-600" :
                            opp.matchScore >= 70 ? "border-blue-100 text-blue-600" : "border-gray-100 text-gray-400"
                          )}>
                            {opp.matchScore}%
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Match IA</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">
                          {opp.category}
                        </span>
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">
                          {opp.modality_name}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Valor Estimado</span>
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(opp.estimated_value)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Abertura</span>
                          <span className="text-sm font-bold text-gray-900">{opp.deadline_date ? formatDate(opp.deadline_date) : 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</span>
                          <span className={cn(
                            "text-sm font-bold capitalize",
                            opp.matchStatus === 'new' ? "text-blue-600" : 
                            opp.matchStatus === 'saved' ? "text-amber-600" : "text-gray-500"
                          )}>
                            {opp.matchStatus === 'new' ? 'Nova' : opp.matchStatus === 'saved' ? 'Salva' : 'Visualizada'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ID Externo</span>
                          <span className="text-sm font-medium text-gray-500">#{opp.source_external_id}</span>
                        </div>
                      </div>
                    </div>

                      <div className="flex flex-row md:flex-col gap-2 justify-end md:border-l md:border-gray-100 md:pl-6">
                        <button 
                          onClick={() => handleToggleSave(opp.id)}
                          className={cn(
                            "flex-1 md:flex-none p-2.5 rounded-lg border transition-all flex items-center justify-center gap-2 text-sm font-bold",
                            opp.isFavorite 
                              ? "bg-amber-50 border-amber-200 text-amber-600" 
                              : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#0f49bd]"
                          )}
                        >
                          <Star className={cn("size-5", opp.isFavorite && "fill-current")} />
                          <span className="md:hidden">Favoritar</span>
                        </button>
                      <button 
                        onClick={() => handleViewDetail(opp)}
                        className="flex-1 md:flex-none p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#0f49bd] transition-all flex items-center justify-center gap-2 text-sm font-bold"
                      >
                        <Eye className="size-5" />
                        <span className="md:hidden">Visualizar</span>
                      </button>
                      <button 
                        onClick={() => handleOpenNotice(opp.source_url)}
                        className="flex-1 md:flex-none p-2.5 rounded-lg bg-[#0f49bd] text-white hover:bg-[#0a3690] transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                      >
                        <ExternalLink className="size-5" />
                        <span className="md:hidden">Ir para Edital</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(opp.id)}
                        className="flex-1 md:flex-none p-2.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                      >
                        <Trash2 className="size-5" />
                        <span className="md:hidden">Descartar</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* IA Insight Banner */}
                  {opp.matchScore >= 50 && (
                    <div className="bg-blue-50/50 px-6 py-3 border-t border-blue-100 flex items-center gap-3">
                      <Sparkles className="size-4 text-blue-600" />
                      <p className="text-xs text-blue-800 font-medium">
                        <span className="font-bold">Análise IA:</span> {opp.matchReason}
                      </p>
                      <button 
                        onClick={() => handleViewAnalysis(opp)}
                        className="ml-auto text-xs font-bold text-blue-700 hover:underline flex items-center"
                      >
                        Ver Detalhes <ChevronRight className="size-3 ml-1" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-8">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-500 hover:bg-white transition-all disabled:opacity-50"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all",
                      currentPage === page ? "bg-[#0f49bd] text-white" : "border border-gray-200 text-gray-500 hover:bg-white"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-500 hover:bg-white transition-all disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Manual Opportunity Modal */}
      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Oportunidade Manual</DialogTitle>
            <DialogDescription>
              Cadastre uma oportunidade que não foi capturada automaticamente pelo PNCP.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Título da Oportunidade</label>
              <input 
                type="text" 
                placeholder="Ex: Aquisição de licenças de software..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none"
                value={newManualOpp.title}
                onChange={(e) => setNewManualOpp({ ...newManualOpp, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prefeitura / Órgão</label>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none"
                value={newManualOpp.municipality_id}
                onChange={(e) => setNewManualOpp({ ...newManualOpp, municipality_id: e.target.value })}
              >
                <option value="">Selecione uma prefeitura...</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Estimado</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input 
                  type="number" 
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none"
                  value={newManualOpp.estimated_value}
                  onChange={(e) => setNewManualOpp({ ...newManualOpp, estimated_value: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Departamento</label>
              <input 
                type="text" 
                placeholder="Ex: Secretaria de Educação"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none"
                value={newManualOpp.department}
                onChange={(e) => setNewManualOpp({ ...newManualOpp, department: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Secretaria</label>
              <input 
                type="text" 
                placeholder="Ex: Coordenação de TI"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none"
                value={newManualOpp.secretariat}
                onChange={(e) => setNewManualOpp({ ...newManualOpp, secretariat: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none"
                value={newManualOpp.category}
                onChange={(e) => setNewManualOpp({ ...newManualOpp, category: e.target.value })}
              >
                <option value="Educação">Educação</option>
                <option value="Saúde">Saúde</option>
                <option value="Tecnologia">Tecnologia</option>
                <option value="Infraestrutura">Infraestrutura</option>
                <option value="Administração">Administração</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none"
                value={newManualOpp.status}
                onChange={(e) => setNewManualOpp({ ...newManualOpp, status: e.target.value as any })}
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
                <option value="expired">Expirada</option>
              </select>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Descrição / Observações</label>
              <textarea 
                rows={3}
                placeholder="Detalhes adicionais sobre a oportunidade..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none resize-none"
                value={newManualOpp.description}
                onChange={(e) => setNewManualOpp({ ...newManualOpp, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <button 
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleCreateManualOpp}
              className="px-4 py-2 text-sm font-bold text-white bg-[#0f49bd] hover:bg-[#0a3690] rounded-lg transition-colors shadow-sm"
            >
              Criar Oportunidade
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IA Insights Modal */}
      <Dialog open={isIAInsightsModalOpen} onOpenChange={setIsIAInsightsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-[#0f49bd]" />
              IA Insights - Análise de Oportunidades
            </DialogTitle>
            <DialogDescription>
              Resumo inteligente das oportunidades filtradas com base no seu perfil.
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
                    <span className="font-bold">Justificativa:</span> {iaSummary.topRecommendation.matchReason}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-600" />
                Alertas e Riscos
              </h4>
              <ul className="space-y-2">
                <li className="text-xs text-gray-600 flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  {iaSummary.totalAnalyzed > 10 ? "Volume alto de editais para o período. Risco de sobrecarga na equipe de orçamentação." : "Baixa concorrência prevista para os editais de Santa Catarina."}
                </li>
                <li className="text-xs text-gray-600 flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  Atenção aos prazos de impugnação que vencem nos próximos 3 dias.
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

      {/* Detailed View Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Oportunidade</DialogTitle>
            <DialogDescription>
              Informações completas extraídas do PNCP.
            </DialogDescription>
          </DialogHeader>
          {selectedOpp && (
            <div className="py-4 space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">{selectedOpp.title}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Building2 className="size-4" /> {selectedOpp.buyer_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Valor Estimado</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(selectedOpp.estimated_value)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Modalidade</span>
                  <span className="text-sm font-bold text-gray-900">{selectedOpp.modality_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Prazo de Abertura</span>
                  <span className="text-sm font-bold text-gray-900">{selectedOpp.deadline_date ? formatDate(selectedOpp.deadline_date) : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Match IA</span>
                  <span className={cn(
                    "text-sm font-bold",
                    selectedOpp.matchScore >= 90 ? "text-green-600" : "text-blue-600"
                  )}>{selectedOpp.matchScore}%</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Resumo Analítico</h4>
                <p className="text-sm text-gray-600 leading-relaxed italic">
                  &quot;{selectedOpp.matchReason}&quot;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => handleOpenNotice(selectedOpp.source_url)}
                  className="flex-1 bg-[#0f49bd] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="size-4" /> Ver Edital Oficial
                </button>
                <button 
                  onClick={() => handleToggleSave(selectedOpp.id)}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg font-bold text-sm border transition-all flex items-center justify-center gap-2",
                    selectedOpp.matchStatus === 'saved' 
                      ? "bg-amber-50 border-amber-200 text-amber-600" 
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Bookmark className={cn("size-4", selectedOpp.matchStatus === 'saved' && "fill-current")} />
                  {selectedOpp.matchStatus === 'saved' ? 'Salvo' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Analysis Modal */}
      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-[#0f49bd]" />
              Análise Profunda da Licitação
            </DialogTitle>
          </DialogHeader>
          {selectedOpp && (
            <div className="py-4 space-y-6">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="text-sm font-bold text-blue-900 mb-2">Por que participar?</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  {selectedOpp.matchReason} O órgão tem um histórico de 98% de empenho e pagamento em dia para este tipo de objeto.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900">Pontos de Atenção</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="size-5 rounded bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                      <Info className="size-3" />
                    </div>
                    <p className="text-xs text-gray-600">Exigência de atestado de capacidade técnica para 50% do volume total.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="size-5 rounded bg-green-100 flex items-center justify-center text-green-600 shrink-0 mt-0.5">
                      <CheckCircle2 className="size-3" />
                    </div>
                    <p className="text-xs text-gray-600">Sua empresa possui todas as certidões negativas exigidas no item 9.2 do edital.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Estimativa de Concorrência</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">Baixa / Média</span>
                  <div className="flex gap-1">
                    <div className="w-8 h-2 rounded bg-green-500" />
                    <div className="w-8 h-2 rounded bg-green-500" />
                    <div className="w-8 h-2 rounded bg-gray-200" />
                    <div className="w-8 h-2 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <button 
              onClick={() => setIsAnalysisModalOpen(false)}
              className="w-full bg-[#0f49bd] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
            >
              Fechar Análise
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
            <DialogDescription>
              Refine sua busca por oportunidades no PNCP.
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
              <label className="text-sm font-bold text-gray-700">Prioridade</label>
              <select 
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <option value="all">Todas as Prioridades</option>
                <option value="critical">Crítica</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>
            <div className="flex items-center gap-2 py-2">
              <input 
                type="checkbox" 
                id="onlyFavorites"
                className="size-4 rounded border-gray-300 text-[#0f49bd] focus:ring-[#0f49bd]"
                checked={filters.onlyFavorites}
                onChange={(e) => setFilters({ ...filters, onlyFavorites: e.target.checked })}
              />
              <label htmlFor="onlyFavorites" className="text-sm font-bold text-gray-700 cursor-pointer">Apenas Favoritas</label>
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
                onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
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
