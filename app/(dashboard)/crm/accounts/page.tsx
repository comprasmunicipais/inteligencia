'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink,
  Building2,
  X,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Gavel,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
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
import { useRouter } from 'next/navigation';
import { useCompany } from '@/components/providers/CompanyProvider';
import { accountService, MunicipalityFilters } from '@/lib/services/accounts';
import { MunicipalityDTO } from '@/lib/types/dtos';
import { AccountStatus, Region } from '@/lib/types/enums';
import { safeText, safeLink } from '@/lib/utils/safe-helpers';

const statusMap = {
  [AccountStatus.ACTIVE]: { label: 'Cliente', color: 'bg-green-50 text-green-700 border-green-100' },
  [AccountStatus.PROSPECT]: { label: 'Prospecção', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  [AccountStatus.INACTIVE]: { label: 'Inativo', color: 'bg-gray-50 text-gray-700 border-gray-100' },
};

import EmptyState from '@/components/shared/EmptyState';

export default function AccountsPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<MunicipalityDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const [newAccount, setNewAccount] = useState<Partial<MunicipalityDTO>>({ 
    name: '', 
    state: '', 
    city: '',
    mayor_name: '', 
    website: ''
  });
  const [editingAccount, setEditingAccount] = useState<MunicipalityDTO | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<MunicipalityDTO | null>(null);
  
  const [filters, setFilters] = useState<MunicipalityFilters>({ 
    state: '', 
    region: '',
    population_range: '',
    min_population: undefined,
    max_population: undefined,
    min_area: undefined,
    max_area: undefined,
    min_year: undefined,
    max_year: undefined,
    has_opportunities: false,
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await accountService.getAll({
        ...filters,
        searchTerm
      }, currentPage, pageSize);
      setAccounts(data || []);
      setTotalCount(count);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erro ao carregar prefeituras.');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadAccounts(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadAccounts]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name || !newAccount.state || !newAccount.city) {
      toast.error('Por favor, preencha o nome, cidade e estado.');
      return;
    }
    try {
      const created = await accountService.create(newAccount as any);
      setAccounts([created, ...accounts]);
      setIsAddModalOpen(false);
      setNewAccount({ name: '', state: '', city: '', mayor_name: '', website: '' });
      toast.success('Prefeitura adicionada com sucesso!');
    } catch (error) {
      toast.error('Erro ao adicionar prefeitura.');
    }
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!editingAccount.name || !editingAccount.state || !editingAccount.city) {
      toast.error('Por favor, preencha o nome, cidade e estado.');
      return;
    }
    try {
      const updated = await accountService.update(editingAccount.id, editingAccount);
      setAccounts(accounts.map(acc => acc.id === updated.id ? updated : acc));
      setIsEditModalOpen(false);
      setEditingAccount(null);
      toast.success('Prefeitura atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar prefeitura.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      await accountService.delete(deletingAccount.id);
      setAccounts(accounts.filter(acc => acc.id !== deletingAccount.id));
      setIsDeleteModalOpen(false);
      setDeletingAccount(null);
      toast.success('Prefeitura excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir prefeitura.');
    }
  };

  const handleVisitWebsite = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (!url) {
      toast.error('Website não cadastrado.');
      return;
    }
    try {
      const validUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(validUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error('URL inválida.');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({ 
      state: '', 
      region: '',
      population_range: '',
      min_population: undefined,
      max_population: undefined,
      min_area: undefined,
      max_area: undefined,
      min_year: undefined,
      max_year: undefined,
      has_opportunities: false,
    });
    setCurrentPage(1);
    toast.info('Filtros limpos.');
  };

  const regions = Object.values(Region);
  const regionLabels: Record<string, string> = {
    [Region.NORTH]: 'Norte',
    [Region.NORTHEAST]: 'Nordeste',
    [Region.MIDWEST]: 'Centro-Oeste',
    [Region.SOUTHEAST]: 'Sudeste',
    [Region.SOUTH]: 'Sul',
  };
  const populationRanges = [
    'Menor que 15.000',
    'Entre 15.001 e 30.000',
    'Entre 30.001 e 50.000',
    'Entre 50.001 e 100.000',
    'Entre 100.001 e 200.000',
    'Entre 200.001 e 300.000',
    'Entre 300.001 e 500.000',
    'Entre 500.001 e 1.000.000',
    'Maior que Um Milhão'
  ];

  const hasActiveFilters = filters.has_opportunities || filters.state || filters.region || filters.population_range;

  return (
    <>
      <Header 
        title="Prefeituras" 
        subtitle="Gerencie os dados institucionais e comerciais dos municípios brasileiros." 
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-gray-400 size-5" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] sm:text-sm shadow-sm transition-all outline-none"
                placeholder="Buscar por município, prefeito ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3">
              {/* Filtro rápido: com licitações */}
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, has_opportunities: !prev.has_opportunities }));
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors shadow-sm",
                  filters.has_opportunities
                    ? "bg-[#0f49bd] text-white border-[#0f49bd]"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
              >
                <Gavel className="size-4" />
                Com Licitações
              </button>

              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors shadow-sm",
                  hasActiveFilters && !filters.has_opportunities
                    ? "bg-[#0f49bd] text-white border-[#0f49bd]"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
              >
                <Filter className="size-4" />
                Filtrar
              </button>

              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2.5 text-white hover:bg-[#0a3690] transition-colors shadow-sm font-bold text-sm"
              >
                <Plus className="size-4" />
                Adicionar Prefeitura
              </button>
            </div>
          </div>

          {/* Indicador de filtro ativo */}
          {filters.has_opportunities && (
            <div className="flex items-center gap-2 text-sm text-[#0f49bd] font-bold">
              <Gavel className="size-4" />
              Exibindo apenas prefeituras com licitações abertas vinculadas
              <button
                onClick={() => setFilters(prev => ({ ...prev, has_opportunities: false }))}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Município</th>
                    <th className="px-6 py-4">UF</th>
                    <th className="px-6 py-4">Região</th>
                    <th className="px-6 py-4">Prefeito</th>
                    <th className="px-6 py-4">População</th>
                    <th className="px-6 py-4">Site Oficial</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center">
                        <Loader2 className="size-6 text-[#0f49bd] animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12">
                        <EmptyState 
                          icon={Building2}
                          title="Nenhum município encontrado"
                          description="A base oficial de municípios pode estar vazia ou os filtros aplicados não retornaram resultados."
                          action={{
                            label: "Importar Base Oficial",
                            onClick: () => router.push('/admin/municipalities-import')
                          }}
                          className="border-none bg-transparent py-0"
                        />
                      </td>
                    </tr>
                  ) : accounts.map((account) => (
                    <tr 
                      key={account.id} 
                      className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/crm/accounts/${account.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                            <Building2 className="size-4" />
                          </div>
                          <span className="font-bold text-gray-900">{account.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
                          {account.state}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-500">
                          {account.region ? (regionLabels[account.region] || account.region) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                            {account.mayor_name ? account.mayor_name.split(' ').map(n => n[0]).join('') : '??'}
                          </div>
                          <span className="text-gray-700">{safeText(account.mayor_name, 'Não informado')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-bold">{account.population?.toLocaleString() || '0'}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold">{safeText(account.population_range)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {account.website ? (
                          <button 
                            onClick={(e) => handleVisitWebsite(e, safeLink(account.website)!)}
                            className="text-[#0f49bd] hover:underline flex items-center gap-1 font-medium"
                          >
                            <ExternalLink className="size-3" />
                            Visitar
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
                            >
                              <MoreVertical className="size-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/crm/accounts/${account.id}`); }}>
                              <Eye className="size-4 mr-2" /> Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingAccount(account); setIsEditModalOpen(true); }}>
                              <Edit className="size-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); setDeletingAccount(account); setIsDeleteModalOpen(true); }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="size-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
              <span className="text-xs text-gray-500">
                Mostrando {accounts.length} de <span className="font-bold text-gray-900">{totalCount}</span> resultados
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                >
                  <ChevronLeft className="size-3" /> Anterior
                </button>
                <span className="text-xs font-bold text-gray-500 px-2">Página {currentPage} de {totalPages || 1}</span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                >
                  Próxima <ChevronRight className="size-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Editar Prefeitura */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Prefeitura</DialogTitle>
            <DialogDescription>Atualize as informações da prefeitura selecionada.</DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <form onSubmit={handleEditAccount} className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-bold text-gray-700">Município</label>
                <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={editingAccount.name} onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-bold text-gray-700">Cidade</label>
                <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={editingAccount.city} onChange={(e) => setEditingAccount({ ...editingAccount, city: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-bold text-gray-700">Estado (UF)</label>
                <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" maxLength={2} value={editingAccount.state} onChange={(e) => setEditingAccount({ ...editingAccount, state: e.target.value.toUpperCase() })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-bold text-gray-700">Prefeito</label>
                <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={editingAccount.mayor_name} onChange={(e) => setEditingAccount({ ...editingAccount, mayor_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-bold text-gray-700">Website</label>
                <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={editingAccount.website} onChange={(e) => setEditingAccount({ ...editingAccount, website: e.target.value })} />
              </div>
              <DialogFooter className="pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
                <button type="submit" className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all">Salvar Alterações</button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Excluir */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a prefeitura <span className="font-bold text-gray-900">{deletingAccount?.name}</span>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">Cancelar</button>
            <button onClick={handleDeleteAccount} className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-sm transition-all">Excluir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Prefeitura</DialogTitle>
            <DialogDescription>Preencha as informações básicas para cadastrar um novo município no sistema.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-bold text-gray-700">Município</label>
              <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="Ex: Prefeitura de São Paulo" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-bold text-gray-700">Cidade</label>
              <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="Ex: São Paulo" value={newAccount.city} onChange={(e) => setNewAccount({ ...newAccount, city: e.target.value })} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-bold text-gray-700">Estado (UF)</label>
              <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="Ex: SP" maxLength={2} value={newAccount.state} onChange={(e) => setNewAccount({ ...newAccount, state: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-bold text-gray-700">Prefeito</label>
              <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="Nome do prefeito atual" value={newAccount.mayor_name} onChange={(e) => setNewAccount({ ...newAccount, mayor_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-bold text-gray-700">Website</label>
              <input className="col-span-3 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="https://..." value={newAccount.website} onChange={(e) => setNewAccount({ ...newAccount, website: e.target.value })} />
            </div>
            <DialogFooter className="pt-4">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
              <button type="submit" className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all">Salvar Prefeitura</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Filtros Avançados */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
            <DialogDescription>Refine sua busca por prefeituras utilizando os critérios abaixo.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:border-[#0f49bd] hover:bg-blue-50/30 transition-all">
                <input
                  type="checkbox"
                  className="size-4 accent-[#0f49bd]"
                  checked={!!filters.has_opportunities}
                  onChange={(e) => setFilters({ ...filters, has_opportunities: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Gavel className="size-4 text-[#0f49bd]" />
                    Apenas prefeituras com licitações abertas
                  </span>
                  <span className="text-xs text-gray-400">Exibe somente municípios que possuem licitações vinculadas</span>
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Estado (UF)</label>
              <input className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="Ex: SP" maxLength={2} value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Região</label>
              <select className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value as Region })}>
                <option value="">Todas as regiões</option>
                {regions.map(r => <option key={r} value={r}>{regionLabels[r] || r}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-bold text-gray-700">Faixa Populacional</label>
              <select className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={filters.population_range} onChange={(e) => setFilters({ ...filters, population_range: e.target.value })}>
                <option value="">Todas as faixas</option>
                {populationRanges.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">População Mínima</label>
              <input type="number" className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={filters.min_population || ''} onChange={(e) => setFilters({ ...filters, min_population: Number(e.target.value) || undefined })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">População Máxima</label>
              <input type="number" className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={filters.max_population || ''} onChange={(e) => setFilters({ ...filters, max_population: Number(e.target.value) || undefined })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Área Mínima (km²)</label>
              <input type="number" className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={filters.min_area || ''} onChange={(e) => setFilters({ ...filters, min_area: Number(e.target.value) || undefined })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Ano Instalação Mín.</label>
              <input type="number" className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={filters.min_year || ''} onChange={(e) => setFilters({ ...filters, min_year: Number(e.target.value) || undefined })} />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <button onClick={handleResetFilters} className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">Limpar</button>
            <button onClick={handleApplyFilters} className="flex-1 bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all">Aplicar Filtros</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
