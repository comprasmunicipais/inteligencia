'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import { 
  Handshake, 
  Search, 
  Plus,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ArrowRightLeft,
  Eye,
  X,
  Loader2
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
import { useCompany } from '@/components/providers/CompanyProvider';
import { contractService } from '@/lib/services/contracts';
import { municipalityService, MunicipalityOption } from '@/lib/services/municipalities';
import { ContractDTO } from '@/lib/types/dtos';
import { ContractStatus } from '@/lib/types/enums';
import { safeText, formatCurrency } from '@/lib/utils/safe-helpers';

import EmptyState from '@/components/shared/EmptyState';

export default function ContractsPage() {
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ContractDTO[]>([]);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newContract, setNewContract] = useState({ 
    title: '', 
    municipality_id: '', 
    value: '', 
    start_date: '', 
    end_date: '', 
    status: ContractStatus.ACTIVE, 
    notes: '',
    department: '',
    secretariat: ''
  });
  const [editingContract, setEditingContract] = useState<ContractDTO | null>(null);
  const [deletingContract, setDeletingContract] = useState<ContractDTO | null>(null);
  const [viewingContract, setViewingContract] = useState<ContractDTO | null>(null);
  
  const [filters, setFilters] = useState({ status: '' });

  const loadContracts = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [contractsData, munData] = await Promise.all([
        contractService.getAll(companyId),
        municipalityService.getAllForSelect()
      ]);
      setContracts(contractsData || []);
      setMunicipalities(munData);
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast.error('Erro ao carregar contratos.');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.title || !newContract.municipality_id || !newContract.value || !newContract.start_date || !newContract.end_date) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setIsSaving(true);
      const created = await contractService.create({
        title: newContract.title,
        municipality_id: newContract.municipality_id,
        value: Number(newContract.value),
        start_date: newContract.start_date,
        end_date: newContract.end_date,
        status: newContract.status,
        notes: newContract.notes,
        department: newContract.department,
        secretariat: newContract.secretariat,
        company_id: companyId!
      });
      setContracts([created, ...contracts]);
      setIsAddModalOpen(false);
      setNewContract({ 
        title: '', 
        municipality_id: '', 
        value: '', 
        start_date: '', 
        end_date: '', 
        status: ContractStatus.ACTIVE, 
        notes: '',
        department: '',
        secretariat: ''
      });
      toast.success('Contrato cadastrado com sucesso!');
    } catch (err: any) {
      console.error('CREATE CONTRACT ERROR:', err);
      toast.error(err.message || 'Erro ao cadastrar contrato.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;
    
    if (!editingContract.title || !editingContract.municipality_id || !editingContract.value) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await contractService.update(editingContract.id, {
        title: editingContract.title,
        municipality_id: editingContract.municipality_id,
        value: Number(editingContract.value),
        start_date: editingContract.start_date,
        end_date: editingContract.end_date,
        status: editingContract.status,
        notes: editingContract.notes,
        department: editingContract.department,
        secretariat: editingContract.secretariat
      });
      setContracts(contracts.map(c => c.id === updated.id ? updated : c));
      setIsEditModalOpen(false);
      setEditingContract(null);
      toast.success('Contrato atualizado!');
    } catch (err: any) {
      console.error('UPDATE CONTRACT ERROR:', err);
      toast.error(err.message || 'Erro ao atualizar contrato.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!deletingContract) return;
    try {
      setIsSaving(true);
      await contractService.delete(deletingContract.id);
      setContracts(contracts.filter(c => c.id !== deletingContract.id));
      setIsDeleteModalOpen(false);
      setDeletingContract(null);
      toast.success('Contrato excluído!');
    } catch (err: any) {
      console.error('DELETE CONTRACT ERROR:', err);
      toast.error(err.message || 'Erro ao excluir contrato.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateContract = async (contract: ContractDTO) => {
    try {
      const { id, created_at, updated_at, ...rest } = contract;
      const duplicated = await contractService.create({
        ...rest,
        title: `${contract.title} (Cópia)`,
        company_id: companyId!
      });
      setContracts([duplicated, ...contracts]);
      toast.success('Contrato duplicado!');
    } catch (err: any) {
      console.error('DUPLICATE CONTRACT ERROR:', err);
      toast.error(err.message || 'Erro ao duplicar contrato.');
    }
  };

  const handleChangeStatus = async (id: string, newStatus: ContractStatus) => {
    try {
      const updated = await contractService.update(id, { status: newStatus });
      setContracts(contracts.map(c => c.id === updated.id ? updated : c));
      toast.success(`Status alterado para ${newStatus}`);
    } catch (err: any) {
      console.error('CHANGE STATUS ERROR:', err);
      toast.error(err.message || 'Erro ao alterar status.');
    }
  };

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (c.account_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filters.status || c.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const activeCount = contracts.filter(c => c.status === 'active').length;
  const totalValue = contracts.reduce((acc, c) => acc + c.value, 0);
  const expiringSoon = contracts.filter(c => {
    if (!c.end_date) return false;
    const end = new Date(c.end_date);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30;
  }).length;

  return (
    <>
      <Header title="Contratos" subtitle="Gestão de contratos vigentes, aditivos e renovações." />
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-gray-500 text-xs font-bold uppercase mb-2">Contratos Ativos</h4>
              <p className="text-2xl font-black text-gray-900">{activeCount}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-gray-500 text-xs font-bold uppercase mb-2">Valor Total Sob Gestão</h4>
              <p className="text-2xl font-black text-green-600">{formatCurrency(totalValue)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-gray-500 text-xs font-bold uppercase mb-2">Vencendo em 30 dias</h4>
              <p className="text-2xl font-black text-red-600">{expiringSoon}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 w-full max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                <input 
                  type="text" 
                  placeholder="Buscar contratos..." 
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none text-sm" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Filter className="size-4" />
                Filtrar
              </button>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#0f49bd] text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2"
            >
              <Plus className="size-4" /> Novo Contrato
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Contrato</th>
                  <th className="px-6 py-4">Órgão</th>
                  <th className="px-6 py-4">Valor Anual</th>
                  <th className="px-6 py-4">Vigência</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <Loader2 className="size-6 text-[#0f49bd] animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12">
                      <EmptyState 
                        icon={Handshake}
                        title="Nenhum contrato cadastrado ainda"
                        description="Gerencie seus contratos vigentes, acompanhe prazos de renovação e aditivos em um só lugar."
                        action={{
                          label: "Novo Contrato",
                          onClick: () => setIsAddModalOpen(true)
                        }}
                        className="border-none bg-transparent py-0"
                      />
                    </td>
                  </tr>
                ) : filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{c.title}</td>
                    <td className="px-6 py-4 text-gray-600">{c.account_name}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{formatCurrency(c.value)}</td>
                    <td className="px-6 py-4 text-gray-500">{c.start_date ? formatDate(c.start_date) : 'N/A'} - {c.end_date ? formatDate(c.end_date) : 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        c.status === 'active' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      )}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                            <MoreVertical className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setViewingContract(c); setIsViewModalOpen(true); }}>
                            <Eye className="size-4 mr-2" /> Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingContract(c); setIsEditModalOpen(true); }}>
                            <Edit className="size-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateContract(c)}>
                            <Copy className="size-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const nextStatus = c.status === ContractStatus.ACTIVE ? ContractStatus.EXPIRED : ContractStatus.ACTIVE;
                            handleChangeStatus(c.id, nextStatus);
                          }}>
                            <ArrowRightLeft className="size-4 mr-2" /> Alterar Status
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => { setDeletingContract(c); setIsDeleteModalOpen(true); }}
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
        </div>
      </div>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
            <DialogDescription>
              Informações completas e ações para este contrato.
            </DialogDescription>
          </DialogHeader>
          {viewingContract && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Título</span>
                  <span className="text-sm font-bold text-gray-900">{viewingContract.title}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Órgão / Prefeitura</span>
                  <span className="text-sm font-bold text-gray-900">{viewingContract.account_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Valor Anual</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(viewingContract.value)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded inline-block",
                    viewingContract.status === 'active' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    {viewingContract.status === 'active' ? 'Ativo' : 'Expirado'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Início Vigência</span>
                  <span className="text-sm text-gray-700">{viewingContract.start_date ? formatDate(viewingContract.start_date) : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Fim Vigência</span>
                  <span className="text-sm text-gray-700">{viewingContract.end_date ? formatDate(viewingContract.end_date) : 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Observações</span>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                  {viewingContract.notes || "Nenhuma observação cadastrada."}
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3 border-t border-gray-100">
                <button 
                  onClick={() => {
                    setEditingContract({...viewingContract});
                    setIsViewModalOpen(false);
                    setIsEditModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit className="size-4" /> Editar
                </button>
                <button 
                  onClick={async () => {
                    const nextStatus = viewingContract.status === ContractStatus.ACTIVE ? ContractStatus.EXPIRED : ContractStatus.ACTIVE;
                    await handleChangeStatus(viewingContract.id, nextStatus);
                    setViewingContract({...viewingContract, status: nextStatus});
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowRightLeft className="size-4" /> Alterar Status
                </button>
                <button 
                  onClick={() => {
                    setDeletingContract(viewingContract);
                    setIsViewModalOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="size-4" /> Excluir
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
            <DialogDescription>
              Cadastre um novo contrato vigente no sistema.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddContract} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-bold text-gray-700">Título do Contrato</label>
              <input
                id="title"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Manutenção de TI 2024"
                value={newContract.title}
                onChange={(e) => setNewContract({ ...newContract, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="account" className="text-sm font-bold text-gray-700">Órgão / Prefeitura</label>
              <select
                id="account"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={newContract.municipality_id}
                onChange={(e) => setNewContract({ ...newContract, municipality_id: e.target.value })}
              >
                <option value="">Selecione uma prefeitura...</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="department" className="text-sm font-bold text-gray-700">Departamento</label>
                <input
                  id="department"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="Ex: Secretaria de Saúde"
                  value={newContract.department}
                  onChange={(e) => setNewContract({ ...newContract, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="secretariat" className="text-sm font-bold text-gray-700">Secretaria</label>
                <input
                  id="secretariat"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="Ex: Coordenação de TI"
                  value={newContract.secretariat}
                  onChange={(e) => setNewContract({ ...newContract, secretariat: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-bold text-gray-700">Observações</label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Detalhes adicionais do contrato..."
                value={newContract.notes}
                onChange={(e) => setNewContract({ ...newContract, notes: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="value" className="text-sm font-bold text-gray-700">Valor Anual</label>
                <input
                  id="value"
                  type="number"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="0.00"
                  value={newContract.value}
                  onChange={(e) => setNewContract({ ...newContract, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-bold text-gray-700">Status</label>
                <select 
                  id="status"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={newContract.status}
                  onChange={(e) => setNewContract({ ...newContract, status: e.target.value as ContractStatus })}
                >
                  <option value={ContractStatus.ACTIVE}>Ativo</option>
                  <option value={ContractStatus.EXPIRED}>Expirado</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="start" className="text-sm font-bold text-gray-700">Início da Vigência</label>
                <input
                  id="start"
                  type="date"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={newContract.start_date}
                  onChange={(e) => setNewContract({ ...newContract, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="end" className="text-sm font-bold text-gray-700">Fim da Vigência</label>
                <input
                  id="end"
                  type="date"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={newContract.end_date}
                  onChange={(e) => setNewContract({ ...newContract, end_date: e.target.value })}
                />
              </div>
            </div>
              <DialogFooter className="pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin" />}
                  {isSaving ? 'Cadastrando...' : 'Cadastrar Contrato'}
                </button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Contrato</DialogTitle>
            <DialogDescription>
              Atualize as informações deste contrato.
            </DialogDescription>
          </DialogHeader>
          {editingContract && (
            <form onSubmit={handleEditContract} className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-title" className="text-sm font-bold text-gray-700">Título do Contrato</label>
                <input
                  id="edit-title"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingContract.title}
                  onChange={(e) => setEditingContract({ ...editingContract, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-account" className="text-sm font-bold text-gray-700">Órgão / Prefeitura</label>
                <select
                  id="edit-account"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingContract.municipality_id}
                  onChange={(e) => setEditingContract({ ...editingContract, municipality_id: e.target.value })}
                >
                  <option value="">Selecione uma prefeitura...</option>
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-department" className="text-sm font-bold text-gray-700">Departamento</label>
                  <input
                    id="edit-department"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    placeholder="Ex: Secretaria de Saúde"
                    value={editingContract.department || ''}
                    onChange={(e) => setEditingContract({ ...editingContract, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-secretariat" className="text-sm font-bold text-gray-700">Secretaria</label>
                  <input
                    id="edit-secretariat"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    placeholder="Ex: Coordenação de TI"
                    value={editingContract.secretariat || ''}
                    onChange={(e) => setEditingContract({ ...editingContract, secretariat: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-notes" className="text-sm font-bold text-gray-700">Observações</label>
                <textarea
                  id="edit-notes"
                  className="flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingContract.notes}
                  onChange={(e) => setEditingContract({ ...editingContract, notes: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-value" className="text-sm font-bold text-gray-700">Valor Anual</label>
                  <input
                    id="edit-value"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingContract.value}
                    onChange={(e) => setEditingContract({ ...editingContract, value: e.target.value === '' ? 0 : Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-status" className="text-sm font-bold text-gray-700">Status</label>
                  <select 
                    id="edit-status"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingContract.status}
                    onChange={(e) => setEditingContract({ ...editingContract, status: e.target.value as ContractStatus })}
                  >
                    <option value={ContractStatus.ACTIVE}>Ativo</option>
                    <option value={ContractStatus.EXPIRED}>Expirado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-start" className="text-sm font-bold text-gray-700">Início da Vigência</label>
                  <input
                    id="edit-start"
                    type="date"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingContract.start_date}
                    onChange={(e) => setEditingContract({ ...editingContract, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-end" className="text-sm font-bold text-gray-700">Fim da Vigência</label>
                  <input
                    id="edit-end"
                    type="date"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingContract.end_date}
                    onChange={(e) => setEditingContract({ ...editingContract, end_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin" />}
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o contrato <span className="font-bold text-gray-900">{deletingContract?.title}</span>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDeleteContract}
              disabled={isSaving}
              className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isSaving ? 'Excluindo...' : 'Excluir'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filtrar Contratos</DialogTitle>
            <DialogDescription>
              Selecione os critérios para filtrar seus contratos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Status</label>
              <select 
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as ContractStatus })}
              >
                <option value="">Todos os status</option>
                <option value={ContractStatus.ACTIVE}>Ativo</option>
                <option value={ContractStatus.EXPIRED}>Expirado</option>
              </select>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <button 
              onClick={() => {
                setFilters({ status: '' });
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