'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import Image from 'next/image';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  MoreHorizontal,
  Plus,
  Search,
  Filter as FilterIcon,
  Download,
  Timer,
  Edit,
  Trash2,
  Copy,
  Loader2,
  Settings,
  GripVertical,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { useCompany } from '@/components/providers/CompanyProvider';
import { dealService } from '@/lib/services/deals';
import { municipalityService, MunicipalityOption } from '@/lib/services/municipalities';
import { DealDTO } from '@/lib/types/dtos';
import { DealStage } from '@/lib/types/enums';
import { formatCurrency } from '@/lib/utils/safe-helpers';
import EmptyState from '@/components/shared/EmptyState';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const COLOR_OPTIONS = [
  { label: 'Cinza', value: 'bg-gray-400' },
  { label: 'Azul', value: 'bg-blue-500' },
  { label: 'Verde', value: 'bg-green-500' },
  { label: 'Vermelho', value: 'bg-red-500' },
  { label: 'Amarelo', value: 'bg-yellow-400' },
  { label: 'Roxo', value: 'bg-purple-500' },
  { label: 'Laranja', value: 'bg-orange-500' },
  { label: 'Ciano', value: 'bg-cyan-500' },
];

const DEFAULT_STAGES = [
  { title: 'Prospecção', color: 'bg-gray-400', position: 0, is_default: true },
  { title: 'Qualificação', color: 'bg-yellow-400', position: 1, is_default: true },
  { title: 'Proposta', color: 'bg-blue-500', position: 2, is_default: true },
  { title: 'Negociação', color: 'bg-orange-500', position: 3, is_default: true },
  { title: 'Ganho', color: 'bg-green-500', position: 4, is_default: true },
  { title: 'Perdido', color: 'bg-red-500', position: 5, is_default: true },
];

interface PipelineStage {
  id: string;
  company_id: string;
  title: string;
  color: string;
  position: number;
  is_default: boolean;
}

interface Column {
  id: string;
  title: string;
  color: string;
  deals: DealDTO[];
  is_default: boolean;
}

export default function PipelinePage() {
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<Column[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isStagesModalOpen, setIsStagesModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingStages, setIsSavingStages] = useState(false);

  const [editingStages, setEditingStages] = useState<PipelineStage[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('bg-gray-400');

  const [newDeal, setNewDeal] = useState({
    title: '',
    municipality_id: '',
    estimated_value: '',
    status: '',
  });
  const [editingDeal, setEditingDeal] = useState<DealDTO | null>(null);
  const [filters, setFilters] = useState({ municipality_id: '', minValue: '', maxValue: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const loadStages = useCallback(async (): Promise<PipelineStage[]> => {
    if (!companyId) return [];
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('company_id', companyId)
      .order('position', { ascending: true });

    if (error || !data || data.length === 0) {
      const toInsert = DEFAULT_STAGES.map(s => ({ ...s, company_id: companyId }));
      const { data: inserted, error: insertError } = await supabase
        .from('pipeline_stages')
        .insert(toInsert)
        .select();
      if (insertError) {
        console.error('Error seeding stages:', insertError);
        return [];
      }
      return inserted as PipelineStage[];
    }
    return data as PipelineStage[];
  }, [companyId]);

  const loadDeals = useCallback(async (currentStages: PipelineStage[]) => {
    if (!companyId) return;
    try {
      const dealsData = await dealService.getAll(companyId);
      const cols: Column[] = currentStages.map(stage => ({
        id: stage.id,
        title: stage.title,
        color: stage.color,
        is_default: stage.is_default,
        deals: (dealsData || []).filter(d => d.status === stage.id),
      }));
      setColumns(cols);
    } catch (error: any) {
      console.error('Erro ao carregar deals:', error);
      toast.error('Erro ao carregar dados do pipeline.');
      setColumns(currentStages.map(s => ({
        id: s.id,
        title: s.title,
        color: s.color,
        is_default: s.is_default,
        deals: [],
      })));
    }
  }, [companyId]);

  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      const [munData, loadedStages] = await Promise.all([
        municipalityService.getAllForSelect(),
        loadStages(),
      ]);
      setMunicipalities(munData);
      setStages(loadedStages);
      if (loadedStages.length > 0) {
        setNewDeal(prev => ({ ...prev, status: loadedStages[0].id }));
      }
      await loadDeals(loadedStages);
    } finally {
      setLoading(false);
    }
  }, [loadStages, loadDeals]);

  useEffect(() => {
    if (companyId) initialize();
  }, [companyId, initialize]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceCol = columns.find(c => c.id === source.droppableId);
    const destCol = columns.find(c => c.id === destination.droppableId);
    if (!sourceCol || !destCol) return;

    const newSourceDeals = Array.from(sourceCol.deals);
    const [movedDeal] = newSourceDeals.splice(source.index, 1);

    if (sourceCol.id === destCol.id) {
      newSourceDeals.splice(destination.index, 0, movedDeal);
      setColumns(columns.map(c => c.id === sourceCol.id ? { ...c, deals: newSourceDeals } : c));
    } else {
      const newDestDeals = Array.from(destCol.deals);
      newDestDeals.splice(destination.index, 0, movedDeal);
      setColumns(columns.map(c => {
        if (c.id === sourceCol.id) return { ...c, deals: newSourceDeals };
        if (c.id === destCol.id) return { ...c, deals: newDestDeals };
        return c;
      }));
      try {
        await dealService.update(draggableId, { status: destination.droppableId as DealStage });
        toast.info(`Negócio movido para ${destCol.title}`);
      } catch (err: any) {
        toast.error('Erro ao mover negócio. Revertendo...');
        await loadDeals(stages);
      }
    }
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.title || !newDeal.municipality_id || !newDeal.estimated_value) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }
    setIsSaving(true);
    try {
      const created = await dealService.create({
        title: newDeal.title,
        municipality_id: newDeal.municipality_id,
        estimated_value: Number(newDeal.estimated_value),
        status: newDeal.status as DealStage,
        company_id: companyId!,
      });
      setColumns(columns.map(col =>
        col.id === newDeal.status ? { ...col, deals: [created, ...col.deals] } : col
      ));
      setIsAddModalOpen(false);
      setNewDeal({ title: '', municipality_id: '', estimated_value: '', status: stages[0]?.id || '' });
      toast.success('Negócio adicionado ao pipeline!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao adicionar negócio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;
    if (!editingDeal.title || !editingDeal.municipality_id || !editingDeal.estimated_value) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await dealService.update(editingDeal.id, {
        title: editingDeal.title,
        municipality_id: editingDeal.municipality_id,
        estimated_value: Number(editingDeal.estimated_value),
        status: editingDeal.status,
      });
      setColumns(columns.map(col => ({
        ...col,
        deals: col.deals.map(d => d.id === updated.id ? updated : d),
      })));
      setIsEditModalOpen(false);
      setEditingDeal(null);
      toast.success('Negócio atualizado!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar negócio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    try {
      await dealService.delete(dealId);
      setColumns(columns.map(col => ({ ...col, deals: col.deals.filter(d => d.id !== dealId) })));
      toast.success('Negócio removido com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir negócio.');
    }
  };

  const handleDuplicateDeal = async (deal: DealDTO) => {
    try {
      const { id, created_at, updated_at, account_name, ...rest } = deal;
      const duplicated = await dealService.create({ ...rest, title: `${deal.title} (Cópia)`, company_id: companyId! });
      setColumns(columns.map(col =>
        col.id === duplicated.status ? { ...col, deals: [duplicated, ...col.deals] } : col
      ));
      toast.success('Negócio duplicado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao duplicar negócio.');
    }
  };

  // ── Stages editor ──
  const openStagesEditor = () => {
    setEditingStages(stages.map(s => ({ ...s })));
    setNewStageName('');
    setNewStageColor('bg-gray-400');
    setIsStagesModalOpen(true);
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) {
      toast.error('Digite um nome para a etapa.');
      return;
    }
    const newStage: PipelineStage = {
      id: `new-${Date.now()}`,
      company_id: companyId!,
      title: newStageName.trim(),
      color: newStageColor,
      position: editingStages.length,
      is_default: false,
    };
    setEditingStages([...editingStages, newStage]);
    setNewStageName('');
    setNewStageColor('bg-gray-400');
  };

  const handleRemoveStage = (id: string) => {
    if (editingStages.length <= 2) {
      toast.error('O funil precisa ter pelo menos 2 etapas.');
      return;
    }
    setEditingStages(editingStages.filter(s => s.id !== id));
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const newList = [...editingStages];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    setEditingStages(newList.map((s, i) => ({ ...s, position: i })));
  };

  const handleSaveStages = async () => {
    if (editingStages.length < 2) {
      toast.error('O funil precisa ter pelo menos 2 etapas.');
      return;
    }
    setIsSavingStages(true);
    try {
      await supabase.from('pipeline_stages').delete().eq('company_id', companyId!);
      const toInsert = editingStages.map((s, i) => ({
        company_id: companyId!,
        title: s.title,
        color: s.color,
        position: i,
        is_default: s.is_default,
      }));
      const { data, error } = await supabase.from('pipeline_stages').insert(toInsert).select();
      if (error) throw error;

      const saved = data as PipelineStage[];
      setStages(saved);
      const allDeals = columns.flatMap(c => c.deals);
      const newCols: Column[] = saved.map(s => ({
        id: s.id,
        title: s.title,
        color: s.color,
        is_default: s.is_default,
        deals: allDeals.filter(d => d.status === s.id),
      }));
      setColumns(newCols);
      setIsStagesModalOpen(false);
      toast.success('Etapas do funil atualizadas!');
    } catch (err: any) {
      toast.error('Erro ao salvar etapas.');
      console.error(err);
    } finally {
      setIsSavingStages(false);
    }
  };

  const filteredColumns = columns.map(col => ({
    ...col,
    deals: col.deals.filter(d => {
      const matchesSearch =
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.account_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAccount = !filters.municipality_id || d.municipality_id === filters.municipality_id;
      const matchesMin = !filters.minValue || d.estimated_value >= Number(filters.minValue);
      const matchesMax = !filters.maxValue || d.estimated_value <= Number(filters.maxValue);
      return matchesSearch && matchesAccount && matchesMin && matchesMax;
    }),
  }));

  const totalPipeline = filteredColumns.reduce(
    (acc, col) => acc + col.deals.reduce((dAcc, d) => dAcc + d.estimated_value, 0), 0
  );

  const totalDeals = columns.reduce((acc, col) => acc + col.deals.length, 0);
  const wonDeals = columns
    .filter(col => col.title.toLowerCase().includes('ganho'))
    .flatMap(col => col.deals);
  const conversionRate = totalDeals > 0
    ? ((wonDeals.length / totalDeals) * 100).toFixed(1)
    : null;
  const nowStart = new Date();
  nowStart.setDate(1);
  nowStart.setHours(0, 0, 0, 0);
  const monthlyWon = wonDeals
    .filter(d => d.created_at && d.created_at >= nowStart.toISOString())
    .reduce((acc, d) => acc + d.estimated_value, 0);

  return (
    <>
      <Header title="Funil de Vendas" subtitle="Gerencie seu pipeline de licitações e contratos." />

      <div className="bg-white border-b border-gray-200 px-8 py-3 flex gap-8 items-center flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total em Pipeline</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(totalPipeline)}</span>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Ganho (Mês)</span>
          <span className="text-lg font-bold text-green-600">{formatCurrency(monthlyWon)}</span>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Taxa de Conversão</span>
          <span className="text-lg font-bold text-gray-900">{conversionRate !== null ? `${conversionRate}%` : '—'}</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative w-64 mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] outline-none shadow-sm transition-all text-xs"
              placeholder="Buscar negócios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={openStagesEditor}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Configurar etapas do funil"
          >
            <Settings className="size-5" />
          </button>
          <button onClick={() => setIsFilterModalOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <FilterIcon className="size-5" />
          </button>
          <button onClick={() => toast.info('Iniciando exportação do pipeline...')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Download className="size-5" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#0f49bd] hover:bg-[#0a3690] text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus className="size-4" /> Novo Negócio
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 bg-[#f8fafc]">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
          </div>
        ) : columns.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              icon={Timer}
              title="Nenhuma etapa configurada"
              description="Configure as etapas do seu funil clicando no ícone de engrenagem."
              action={{ label: 'Configurar Etapas', onClick: openStagesEditor }}
              className="max-w-md w-full"
            />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-4 min-w-max">
              {filteredColumns.map((column) => (
                <div key={column.id} className="flex flex-col w-80 h-full">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full', column.color)}></span>
                      <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide">{column.title}</h3>
                      <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {column.deals.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">
                      {formatCurrency(column.deals.reduce((acc, d) => acc + d.estimated_value, 0))}
                    </span>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 pb-4 min-h-[200px] bg-white/50 rounded-xl border border-dashed border-gray-200 p-2"
                      >
                        {column.deals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  'bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all border-l-4 group relative',
                                  snapshot.isDragging ? 'shadow-lg ring-2 ring-[#0f49bd]/20' : ''
                                )}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100"
                                      >
                                        <MoreHorizontal className="size-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingDeal({ ...deal });
                                        setIsEditModalOpen(true);
                                      }}>
                                        <Edit className="size-4 mr-2" /> Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateDeal(deal); }}>
                                        <Copy className="size-4 mr-2" /> Duplicar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); handleDeleteDeal(deal.id); }}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="size-4 mr-2" /> Excluir
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm mb-1">{deal.account_name || 'Sem Município'}</h4>
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{deal.title}</p>
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                  <span className="font-bold text-gray-900 text-sm">{formatCurrency(deal.estimated_value)}</span>
                                  <div className="flex -space-x-2 relative h-6 w-6">
                                    <Image
                                      className="rounded-full border-2 border-white object-cover"
                                      src={`https://picsum.photos/seed/${deal.id}/50/50`}
                                      alt="User"
                                      fill
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {column.deals.length === 0 && (
                          <div className="flex-1 flex items-center justify-center text-xs text-gray-300 font-bold py-8">
                            Nenhum negócio
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* ── Modal: Configurar Etapas ── */}
      <Dialog open={isStagesModalOpen} onOpenChange={setIsStagesModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Configurar Etapas do Funil</DialogTitle>
            <DialogDescription>
              Personalize as etapas do seu funil. As alterações valem para toda a equipe da empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {editingStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <GripVertical className="size-4 text-gray-300 flex-shrink-0" />
                  <span className={cn('w-3 h-3 rounded-full flex-shrink-0', stage.color)}></span>
                  <input
                    className="flex-1 text-sm font-bold text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-gray-300"
                    value={stage.title}
                    onChange={(e) => setEditingStages(editingStages.map((s, i) =>
                      i === index ? { ...s, title: e.target.value } : s
                    ))}
                  />
                  <select
                    className="text-xs rounded border border-gray-200 bg-white px-1 py-1 outline-none"
                    value={stage.color}
                    onChange={(e) => setEditingStages(editingStages.map((s, i) =>
                      i === index ? { ...s, color: e.target.value } : s
                    ))}
                  >
                    {COLOR_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleMoveStage(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs font-bold">↑</button>
                    <button onClick={() => handleMoveStage(index, 'down')} disabled={index === editingStages.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs font-bold">↓</button>
                    <button onClick={() => handleRemoveStage(stage.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Nova Etapa</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 h-10 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="Nome da etapa"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                />
                <select
                  className="h-10 rounded-md border border-gray-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                >
                  {COLOR_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddStage}
                  className="h-10 px-4 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-bold text-gray-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="size-4" /> Adicionar
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setIsStagesModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
            <button
              onClick={handleSaveStages}
              disabled={isSavingStages}
              className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingStages && <Loader2 className="size-4 animate-spin" />}
              Salvar Etapas
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Novo Negócio ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Negócio</DialogTitle>
            <DialogDescription>Adicione uma nova oportunidade ao seu funil de vendas.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDeal} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Título da Oportunidade</label>
              <input
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Licenciamento de Software"
                value={newDeal.title}
                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Prefeitura / Órgão</label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={newDeal.municipality_id}
                onChange={(e) => setNewDeal({ ...newDeal, municipality_id: e.target.value })}
              >
                <option value="">Selecione uma prefeitura</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Etapa</label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={newDeal.status}
                onChange={(e) => setNewDeal({ ...newDeal, status: e.target.value })}
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Valor Estimado</label>
              <input
                type="number"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="0.00"
                value={newDeal.estimated_value}
                onChange={(e) => setNewDeal({ ...newDeal, estimated_value: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-4">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
              <button type="submit" disabled={isSaving} className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                Criar Negócio
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Editar Negócio ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Negócio</DialogTitle>
            <DialogDescription>Atualize as informações deste negócio no pipeline.</DialogDescription>
          </DialogHeader>
          {editingDeal && (
            <form onSubmit={handleEditDeal} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Título da Oportunidade</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingDeal.title}
                  onChange={(e) => setEditingDeal({ ...editingDeal, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Prefeitura / Órgão</label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingDeal.municipality_id}
                  onChange={(e) => setEditingDeal({ ...editingDeal, municipality_id: e.target.value })}
                >
                  <option value="">Selecione uma prefeitura</option>
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Etapa</label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingDeal.status}
                  onChange={(e) => setEditingDeal({ ...editingDeal, status: e.target.value as DealStage })}
                >
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Valor Estimado</label>
                <input
                  type="number"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingDeal.estimated_value}
                  onChange={(e) => setEditingDeal({ ...editingDeal, estimated_value: Number(e.target.value) })}
                />
              </div>
              <DialogFooter className="pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
                <button type="submit" disabled={isSaving} className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                  {isSaving && <Loader2 className="size-4 animate-spin" />}
                  Salvar Alterações
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Filtrar ── */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filtrar Pipeline</DialogTitle>
            <DialogDescription>Refine a visualização dos seus negócios no pipeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Prefeitura / Órgão</label>
              <select
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={filters.municipality_id}
                onChange={(e) => setFilters({ ...filters, municipality_id: e.target.value })}
              >
                <option value="">Todas as prefeituras</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Valor Mínimo</label>
                <input type="number" className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="0" value={filters.minValue} onChange={(e) => setFilters({ ...filters, minValue: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Valor Máximo</label>
                <input type="number" className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="9999999" value={filters.maxValue} onChange={(e) => setFilters({ ...filters, maxValue: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <button onClick={() => { setFilters({ municipality_id: '', minValue: '', maxValue: '' }); toast.info('Filtros limpos.'); }} className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">Limpar</button>
            <button onClick={() => { toast.success('Filtros aplicados!'); setIsFilterModalOpen(false); }} className="flex-1 bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all">Aplicar Filtros</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
