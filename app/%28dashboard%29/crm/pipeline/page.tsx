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
  CheckCircle2,
  Gavel,
  X,
  Edit,
  Trash2,
  Copy,
  Loader2
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

interface Column {
  id: string;
  title: string;
  deals: DealDTO[];
  color: string;
}

const STAGES = [
  { id: DealStage.LEAD, title: 'Lead', color: 'bg-gray-400' },
  { id: DealStage.PROPOSAL, title: 'Proposta', color: 'bg-[#0f49bd]' },
  { id: DealStage.WON, title: 'Ganho', color: 'bg-green-500' },
  { id: DealStage.LOST, title: 'Perdido', color: 'bg-red-500' }
];

export default function PipelinePage() {
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<Column[]>([]);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newDeal, setNewDeal] = useState({ 
    title: '', 
    municipality_id: '', 
    estimated_value: '', 
    status: DealStage.LEAD
  });
  const [editingDeal, setEditingDeal] = useState<DealDTO | null>(null);
  const [filters, setFilters] = useState({ category: '', municipality_id: '', minValue: '', maxValue: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const loadMunicipalities = useCallback(async () => {
    try {
      const munData = await municipalityService.getAllForSelect();
      setMunicipalities(munData);
    } catch (error) {
      console.error('Erro ao carregar municípios:', error);
    }
  }, []);

  const loadDeals = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const dealsData = await dealService.getAll(companyId);
      
      // Organize deals into columns
      const cols = STAGES.map(stage => ({
        ...stage,
        deals: (dealsData || []).filter(d => d.status === stage.id)
      }));
      
      setColumns(cols);
    } catch (error: any) {
      console.error('Erro ao carregar deals:', error);
      const errorMsg = error?.message || error?.details || 'Erro ao carregar dados do pipeline.';
      toast.error(errorMsg);
      setColumns(STAGES.map(stage => ({ ...stage, deals: [] })));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadMunicipalities();
  }, [loadMunicipalities]);

  useEffect(() => {
    if (companyId) {
      loadDeals();
    }
  }, [companyId, loadDeals]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceCol = columns.find(c => c.id === source.droppableId);
    const destCol = columns.find(c => c.id === destination.droppableId);

    if (!sourceCol || !destCol) return;

    const newSourceDeals = Array.from(sourceCol.deals);
    const [movedDeal] = newSourceDeals.splice(source.index, 1);

    // Optimistic update
    if (sourceCol === destCol) {
      newSourceDeals.splice(destination.index, 0, movedDeal);
      const newColumns = columns.map(c => c.id === sourceCol.id ? { ...c, deals: newSourceDeals } : c);
      setColumns(newColumns);
    } else {
      const newDestDeals = Array.from(destCol.deals);
      newDestDeals.splice(destination.index, 0, movedDeal);
      const newColumns = columns.map(c => {
        if (c.id === sourceCol.id) return { ...c, deals: newSourceDeals };
        if (c.id === destCol.id) return { ...c, deals: newDestDeals };
        return c;
      });
      setColumns(newColumns);
      
      // Update in backend
      try {
        await dealService.update(draggableId, { status: destination.droppableId as DealStage });
        toast.info(`Negócio movido para ${destCol.title}`);
      } catch (err: any) {
        console.error('MOVE DEAL ERROR:', err);
        const errorMsg = err?.message || err?.details || 'Erro ao mover negócio. Revertendo...';
        toast.error(errorMsg);
        loadDeals(); // Revert by reloading
      }
    }
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.title || !newDeal.municipality_id || !newDeal.estimated_value) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setIsSaving(true);
      const created = await dealService.create({
        title: newDeal.title,
        municipality_id: newDeal.municipality_id,
        estimated_value: Number(newDeal.estimated_value),
        status: newDeal.status,
        company_id: companyId!
      });
      
      const newColumns = columns.map(col => {
        if (col.id === created.status) {
          return { ...col, deals: [created, ...col.deals] };
        }
        return col;
      });

      setColumns(newColumns);
      setIsAddModalOpen(false);
      setNewDeal({ 
        title: '', 
        municipality_id: '', 
        estimated_value: '', 
        status: DealStage.LEAD
      });
      toast.success('Negócio adicionado ao pipeline!');
    } catch (err: any) {
      console.error('CREATE DEAL ERROR:', err);
      const errorMsg = err?.message || err?.details || 'Erro ao adicionar negócio.';
      toast.error(errorMsg);
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

    try {
      setIsSaving(true);
      const updated = await dealService.update(editingDeal.id, {
        title: editingDeal.title,
        municipality_id: editingDeal.municipality_id,
        estimated_value: Number(editingDeal.estimated_value),
        status: editingDeal.status
      });

      const newColumns = columns.map(col => {
        if (col.id === updated.status) {
          return { ...col, deals: col.deals.map(d => d.id === updated.id ? updated : d) };
        }
        return col;
      });

      setColumns(newColumns);
      setIsEditModalOpen(false);
      setEditingDeal(null);
      toast.success('Negócio atualizado!');
    } catch (err: any) {
      console.error('UPDATE DEAL ERROR:', err);
      const errorMsg = err?.message || err?.details || 'Erro ao atualizar negócio.';
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    try {
      setIsSaving(true);
      await dealService.delete(dealId);
      const newColumns = columns.map(col => ({
        ...col,
        deals: col.deals.filter(d => d.id !== dealId)
      }));
      setColumns(newColumns);
      toast.success('Negócio removido com sucesso!');
    } catch (err: any) {
      console.error('DELETE DEAL ERROR:', err);
      toast.error(err.message || 'Erro ao excluir negócio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateDeal = async (deal: DealDTO) => {
    try {
      setIsSaving(true);
      const { id, created_at, updated_at, account_name, ...rest } = deal;
      const duplicated = await dealService.create({
        ...rest,
        title: `${deal.title} (Cópia)`,
        company_id: companyId!
      });
      
      const newColumns = columns.map(col => {
        if (col.id === duplicated.status) {
          return { ...col, deals: [duplicated, ...col.deals] };
        }
        return col;
      });
      setColumns(newColumns);
      toast.success('Negócio duplicado!');
    } catch (err: any) {
      console.error('DUPLICATE DEAL ERROR:', err);
      toast.error(err.message || 'Erro ao duplicar negócio.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredColumns = columns.map(col => ({
    ...col,
    deals: col.deals.filter(d => {
      const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (d.account_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAccount = !filters.municipality_id || d.municipality_id === filters.municipality_id;
      const matchesMin = !filters.minValue || d.estimated_value >= Number(filters.minValue);
      const matchesMax = !filters.maxValue || d.estimated_value <= Number(filters.maxValue);
      return matchesSearch && matchesAccount && matchesMin && matchesMax;
    })
  }));

  const totalPipeline = filteredColumns.reduce((acc, col) => acc + col.deals.reduce((dAcc, d) => dAcc + d.estimated_value, 0), 0);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Educação': return 'bg-blue-50 text-blue-700';
      case 'Saúde': return 'bg-green-50 text-green-700';
      case 'Infraestrutura': return 'bg-purple-50 text-purple-700';
      case 'Administração': return 'bg-gray-100 text-gray-700';
      case 'Assistência Social': return 'bg-orange-50 text-orange-700';
      case 'Segurança': return 'bg-red-50 text-red-700';
      case 'Tecnologia': return 'bg-cyan-50 text-cyan-700';
      case 'Meio Ambiente': return 'bg-emerald-50 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Previsão (Mês)</span>
          <span className="text-lg font-bold text-green-600">R$ 3.200.000,00</span>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Taxa de Conversão</span>
          <span className="text-lg font-bold text-gray-900">12.5%</span>
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
            onClick={() => setIsFilterModalOpen(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FilterIcon className="size-5" />
          </button>
          <button 
            onClick={() => toast.info('Iniciando exportação do pipeline...')}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="size-5" />
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#0f49bd] hover:bg-[#0a3690] text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus className="size-4" />
            Novo Negócio
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 bg-[#f8fafc]">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
          </div>
        ) : totalPipeline === 0 && searchTerm === '' ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState 
              icon={Timer}
              title="Seu funil de vendas está vazio"
              description="Comece adicionando oportunidades e negócios para gerenciar seu pipeline e previsões de faturamento."
              action={{
                label: "Novo Negócio",
                onClick: () => setIsAddModalOpen(true)
              }}
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
                      <span className={cn("w-2.5 h-2.5 rounded-full", column.color)}></span>
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
                        className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 pb-4 min-h-[200px]"
                      >
                        {column.deals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all border-l-4 group relative",
                                  snapshot.isDragging ? "shadow-lg ring-2 ring-[#0f49bd]/20" : "",
                                  column.id === DealStage.LEAD ? "border-l-gray-400" : 
                                  column.id === DealStage.PROPOSAL ? "border-l-[#0f49bd]" :
                                  column.id === DealStage.WON ? "border-l-green-500" : "border-l-red-500"
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
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Add Deal Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Negócio</DialogTitle>
            <DialogDescription>
              Adicione uma nova oportunidade ao seu funil de vendas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDeal} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-bold text-gray-700">Título da Oportunidade</label>
              <input
                id="title"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Licenciamento de Software"
                value={newDeal.title}
                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="account" className="text-sm font-bold text-gray-700">Prefeitura / Órgão</label>
              <select 
                id="account"
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
              <label htmlFor="value" className="text-sm font-bold text-gray-700">Valor Estimado</label>
              <input
                id="value"
                type="number"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="0.00"
                value={newDeal.estimated_value}
                onChange={(e) => setNewDeal({ ...newDeal, estimated_value: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-4">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
              >
                Criar Negócio
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Deal Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Negócio</DialogTitle>
            <DialogDescription>
              Atualize as informações deste negócio no pipeline.
            </DialogDescription>
          </DialogHeader>
          {editingDeal && (
            <form onSubmit={handleEditDeal} className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-title" className="text-sm font-bold text-gray-700">Título da Oportunidade</label>
                <input
                  id="edit-title"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingDeal.title}
                  onChange={(e) => setEditingDeal({ ...editingDeal, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-account" className="text-sm font-bold text-gray-700">Prefeitura / Órgão</label>
                <select 
                  id="edit-account"
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
                <label htmlFor="edit-value" className="text-sm font-bold text-gray-700">Valor Estimado</label>
                <input
                  id="edit-value"
                  type="number"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingDeal.estimated_value}
                  onChange={(e) => setEditingDeal({ ...editingDeal, estimated_value: Number(e.target.value) })}
                />
              </div>
              <DialogFooter className="pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
                >
                  Salvar Alterações
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filtrar Pipeline</DialogTitle>
            <DialogDescription>
              Refine a visualização dos seus negócios no pipeline.
            </DialogDescription>
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
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Categoria</label>
              <select 
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="">Todas as categorias</option>
                <option value="Educação">Educação</option>
                <option value="Saúde">Saúde</option>
                <option value="Infraestrutura">Infraestrutura</option>
                <option value="Administração">Administração</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Valor Mínimo</label>
                <input
                  type="number"
                  className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="0"
                  value={filters.minValue}
                  onChange={(e) => setFilters({ ...filters, minValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Valor Máximo</label>
                <input
                  type="number"
                  className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="9999999"
                  value={filters.maxValue}
                  onChange={(e) => setFilters({ ...filters, maxValue: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <button 
              onClick={() => {
                setFilters({ category: '', municipality_id: '', minValue: '', maxValue: '' });
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
