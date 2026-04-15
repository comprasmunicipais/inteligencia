'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ArrowRightLeft,
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
import { generateProposalPDF } from '@/lib/pdf/proposal-generator';
import { useCompany } from '@/components/providers/CompanyProvider';
import { proposalService } from '@/lib/services/proposals';
import { municipalityService, MunicipalityOption } from '@/lib/services/municipalities';
import { ProposalDTO } from '@/lib/types/dtos';
import { ProposalStatus } from '@/lib/types/enums';
import { formatCurrency } from '@/lib/utils/safe-helpers';
import { createClient } from '@/lib/supabase/client';

import EmptyState from '@/components/shared/EmptyState';

export default function ProposalsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingFullProposal, setLoadingFullProposal] = useState(false);
  const [proposals, setProposals] = useState<ProposalDTO[]>([]);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFullContentModalOpen, setIsFullContentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const [newProposal, setNewProposal] = useState({ 
    title: '', 
    municipality_id: '', 
    value: '', 
    status: ProposalStatus.DRAFT,
    department: '',
    secretariat: ''
  });
  const [editingProposal, setEditingProposal] = useState<ProposalDTO | null>(null);
  const [editingFullContent, setEditingFullContent] = useState('');
  const [editingAiProposalId, setEditingAiProposalId] = useState<string | null>(null);
  const [deletingProposal, setDeletingProposal] = useState<ProposalDTO | null>(null);
  
  const [filters, setFilters] = useState({ status: '' });

  const loadMunicipalities = useCallback(async () => {
    try {
      const munData = await municipalityService.getAllForSelect();
      setMunicipalities(munData);
    } catch (error) {
      console.error('Error loading municipalities:', error);
    }
  }, []);

  const loadProposals = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const proposalsData = await proposalService.getAll(companyId);
      setProposals(proposalsData || []);
    } catch (error) {
      console.error('Error loading proposals:', error);
      toast.error('Erro ao carregar propostas.');
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadMunicipalities();
  }, [loadMunicipalities]);

  useEffect(() => {
    if (companyId) {
      loadProposals();
    } else {
      setLoading(false);
    }
  }, [companyId, loadProposals]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible' && companyId) loadProposals(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [companyId, loadProposals]);

  const handleAddProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('ID da empresa não encontrado.');
      return;
    }

    if (!newProposal.title || !newProposal.municipality_id || !newProposal.value) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const created = await proposalService.create({
        title: newProposal.title,
        municipality_id: newProposal.municipality_id,
        value: Number(newProposal.value),
        status: newProposal.status,
        department: newProposal.department || undefined,
        secretariat: newProposal.secretariat || undefined,
        date: new Date().toISOString(),
        company_id: companyId
      });
      setProposals([created, ...proposals]);
      setIsAddModalOpen(false);
      setNewProposal({ 
        title: '', 
        municipality_id: '', 
        value: '', 
        status: ProposalStatus.DRAFT,
        department: '',
        secretariat: ''
      });
      toast.success('Proposta criada com sucesso!');
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      toast.error(`Erro ao criar proposta: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProposal) return;
    
    if (!editingProposal.title || !editingProposal.municipality_id || !editingProposal.value) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const updated = await proposalService.update(editingProposal.id, {
        title: editingProposal.title,
        municipality_id: editingProposal.municipality_id,
        value: Number(editingProposal.value),
        status: editingProposal.status,
        department: editingProposal.department || undefined,
        secretariat: editingProposal.secretariat || undefined
      });
      setProposals(proposals.map(p => p.id === updated.id ? updated : p));
      setIsEditModalOpen(false);
      setEditingProposal(null);
      toast.success('Proposta atualizada!');
    } catch (error: any) {
      console.error('Error updating proposal:', error);
      toast.error(`Erro ao atualizar proposta: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenProposalEditor = async (proposal: ProposalDTO) => {
    setEditingProposal(proposal);

    if (!companyId || !proposal.opportunity_id) {
      setIsEditModalOpen(true);
      return;
    }

    setLoadingFullProposal(true);

    try {
      const { data: aiProposal, error } = await supabase
        .from('ai_proposals')
        .select('id, content')
        .eq('company_id', companyId)
        .eq('opportunity_id', proposal.opportunity_id)
        .maybeSingle();

      if (error) throw error;

      const fullContent = aiProposal?.content || proposal.ai_content || '';
      if (!fullContent.trim()) {
        setIsEditModalOpen(true);
        return;
      }

      setEditingAiProposalId(aiProposal?.id || null);
      setEditingFullContent(fullContent);
      setIsFullContentModalOpen(true);
    } catch (error) {
      console.error('Error loading full proposal content:', error);
      toast.error('Não foi possível carregar o conteúdo completo. Abrindo edição simples.');
      setIsEditModalOpen(true);
    } finally {
      setLoadingFullProposal(false);
    }
  };

  const handleSaveFullProposal = async () => {
    if (!editingProposal) return;

    setSaving(true);

    try {
      const updated = await proposalService.update(editingProposal.id, {
        title: editingProposal.title,
        municipality_id: editingProposal.municipality_id,
        value: Number(editingProposal.value),
        status: editingProposal.status,
        department: editingProposal.department || undefined,
        secretariat: editingProposal.secretariat || undefined,
        ai_content: editingFullContent,
      });

      if (editingAiProposalId) {
        const { error } = await supabase
          .from('ai_proposals')
          .update({ content: editingFullContent, updated_at: new Date().toISOString() })
          .eq('id', editingAiProposalId);

        if (error) throw error;
      }

      setProposals(proposals.map((p) => (
        p.id === updated.id ? { ...updated, ai_content: editingFullContent } : p
      )));
      setEditingProposal({ ...updated, ai_content: editingFullContent });
      toast.success('Conteúdo completo da proposta salvo!');
      setIsFullContentModalOpen(false);
      setEditingAiProposalId(null);
      setEditingFullContent('');
    } catch (error: any) {
      console.error('Error saving full proposal:', error);
      toast.error(`Erro ao salvar proposta: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFullProposalPDF = async () => {
    if (!editingProposal || !editingFullContent) return;

    try {
      const response = await fetch('/api/intel/generate-proposal-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editingFullContent,
          title: editingProposal.title,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'Erro ao gerar PDF.');
      }

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
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar PDF.');
    }
  };

  const handleDeleteProposal = async () => {
    if (!deletingProposal) return;
    setSaving(true);
    try {
      await proposalService.delete(deletingProposal.id);
      setProposals(proposals.filter(p => p.id !== deletingProposal.id));
      setIsDeleteModalOpen(false);
      setDeletingProposal(null);
      toast.success('Proposta excluída!');
    } catch (error: any) {
      console.error('Error deleting proposal:', error);
      toast.error('Erro ao excluir proposta.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateProposal = async (proposal: ProposalDTO) => {
    setSaving(true);
    try {
      // Remove UI-only fields and metadata before creating duplicate
      const { id, created_at, updated_at, account_name, ...rest } = proposal;
      const duplicated = await proposalService.create({
        ...rest,
        title: `${proposal.title} (Cópia)`,
        company_id: companyId!
      });
      setProposals([duplicated, ...proposals]);
      toast.success('Proposta duplicada!');
    } catch (error: any) {
      console.error('Error duplicating proposal:', error);
      toast.error('Erro ao duplicar proposta.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async (id: string, newStatus: ProposalStatus) => {
    setSaving(true);
    try {
      const updated = await proposalService.update(id, { status: newStatus as any });
      setProposals(proposals.map(p => p.id === updated.id ? updated : p));
      toast.success(`Status alterado para ${newStatus}`);
    } catch (error: any) {
      console.error('Error changing status:', error);
      toast.error('Erro ao alterar status.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.account_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filters.status || p.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const handleApplyFilters = () => {
    toast.success('Filtros aplicados!');
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({ status: '' });
    toast.info('Filtros limpos.');
  };

  return (
    <>
      <Header title="Propostas" subtitle="Gerencie e acompanhe o status de todas as propostas comerciais enviadas." />
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-gray-500 text-xs font-bold uppercase mb-2">Propostas Ativas</h4>
              <p className="text-2xl font-black text-gray-900">{proposals.filter(p => p.status !== ProposalStatus.ACCEPTED && p.status !== ProposalStatus.REJECTED).length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-gray-500 text-xs font-bold uppercase mb-2">Valor em Negociação</h4>
              <p className="text-2xl font-black text-blue-600">
                {formatCurrency(proposals.filter(p => p.status !== ProposalStatus.ACCEPTED && p.status !== ProposalStatus.REJECTED).reduce((acc, p) => acc + p.value, 0))}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-gray-500 text-xs font-bold uppercase mb-2">Taxa de Conversão</h4>
              <p className="text-2xl font-black text-green-600">
                {proposals.length > 0 ? ((proposals.filter(p => p.status === ProposalStatus.ACCEPTED).length / proposals.length) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 w-full max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                <input 
                  type="text" 
                  placeholder="Buscar propostas..." 
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
              <Plus className="size-4" /> Nova Proposta
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Título</th>
                  <th className="px-6 py-4">Órgão</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Data</th>
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
                ) : filteredProposals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12">
                      <EmptyState 
                        icon={FileText}
                        title="Nenhuma proposta cadastrada ainda"
                        description="Comece criando propostas comerciais para seus clientes e acompanhe o status de cada uma."
                        action={{
                          label: "Nova Proposta",
                          onClick: () => setIsAddModalOpen(true)
                        }}
                        className="border-none bg-transparent py-0"
                      />
                    </td>
                  </tr>
                ) : filteredProposals.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {p.opportunity_id ? (
                        <Link
                          href={`/intel/opportunities?opportunityId=${p.opportunity_id}`}
                          className="text-[#0f49bd] hover:underline"
                        >
                          {p.title}
                        </Link>
                      ) : (
                        p.title
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{p.account_name}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{formatCurrency(p.value)}</td>
                    <td className="px-6 py-4 text-gray-500">{p.created_at ? formatDate(p.created_at) : 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        p.status === ProposalStatus.SENT ? "bg-blue-50 text-blue-600" :
                        p.status === ProposalStatus.ACCEPTED ? "bg-green-50 text-green-600" :
                        p.status === ProposalStatus.REJECTED ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={async () => {
                            toast.promise(generateProposalPDF(p), {
                              loading: 'Gerando PDF...',
                              success: 'PDF gerado com sucesso!',
                              error: 'Erro ao gerar PDF.'
                            });
                          }}
                          className="text-gray-400 hover:text-[#0f49bd] p-1 rounded-md hover:bg-gray-100 transition-colors"
                          title="Baixar PDF"
                        >
                          <Download className="size-4" />
                        </button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { void handleOpenProposalEditor(p); }}>
                              <Edit className="size-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateProposal(p)}>
                              <Copy className="size-4 mr-2" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const nextStatus = p.status === ProposalStatus.DRAFT ? ProposalStatus.SENT : p.status === ProposalStatus.SENT ? ProposalStatus.ACCEPTED : ProposalStatus.DRAFT;
                              handleChangeStatus(p.id, nextStatus);
                            }}>
                              <ArrowRightLeft className="size-4 mr-2" /> Alterar Status
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => { setDeletingProposal(p); setIsDeleteModalOpen(true); }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="size-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog
        open={isFullContentModalOpen}
        onOpenChange={(open) => {
          setIsFullContentModalOpen(open);
          if (!open) {
            setEditingAiProposalId(null);
            setEditingFullContent('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-purple-600" />
              Editar Conteúdo Completo
            </DialogTitle>
            <DialogDescription>
              {editingProposal?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto">
            {editingProposal && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="full-edit-title" className="text-sm font-bold text-gray-700">Título da Proposta</label>
                    <input
                      id="full-edit-title"
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                      value={editingProposal.title}
                      onChange={(e) => setEditingProposal({ ...editingProposal, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="full-edit-status" className="text-sm font-bold text-gray-700">Status</label>
                    <select
                      id="full-edit-status"
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                      value={editingProposal.status}
                      onChange={(e) => setEditingProposal({ ...editingProposal, status: e.target.value as ProposalStatus })}
                    >
                      <option value={ProposalStatus.DRAFT}>Rascunho</option>
                      <option value={ProposalStatus.SENT}>Enviada</option>
                      <option value={ProposalStatus.ACCEPTED}>Aceita</option>
                      <option value={ProposalStatus.REJECTED}>Rejeitada</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Edite o texto completo e salve para manter a proposta reabrível no CRM.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`/intel/opportunities?opportunityId=${editingProposal.opportunity_id}`)}
                    className="text-xs font-bold text-[#0f49bd] hover:underline disabled:text-gray-400 disabled:no-underline"
                    disabled={!editingProposal.opportunity_id}
                  >
                    Ir para oportunidade
                  </button>
                </div>

                <textarea
                  className="w-full min-h-[400px] p-4 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none leading-relaxed font-mono"
                  value={editingFullContent}
                  onChange={(e) => setEditingFullContent(e.target.value)}
                />
              </>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsFullContentModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleDownloadFullProposalPDF}
              disabled={saving || !editingFullContent}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <Download className="size-4" />
              Baixar PDF
            </button>
            <button
              type="button"
              onClick={handleSaveFullProposal}
              disabled={saving || !editingFullContent.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              Salvar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Proposal Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Proposta</DialogTitle>
            <DialogDescription>
              Atualize as informações desta proposta comercial.
            </DialogDescription>
          </DialogHeader>
          {editingProposal && (
            <form onSubmit={handleEditProposal} className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-title" className="text-sm font-bold text-gray-700">Título da Proposta</label>
                <input
                  id="edit-title"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingProposal.title}
                  onChange={(e) => setEditingProposal({ ...editingProposal, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-account" className="text-sm font-bold text-gray-700">Órgão / Prefeitura</label>
                <select
                  id="edit-account"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingProposal.municipality_id}
                  onChange={(e) => setEditingProposal({ ...editingProposal, municipality_id: e.target.value })}
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
                    value={editingProposal.department || ''}
                    onChange={(e) => setEditingProposal({ ...editingProposal, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-secretariat" className="text-sm font-bold text-gray-700">Secretaria</label>
                  <input
                    id="edit-secretariat"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    placeholder="Ex: Coordenação de TI"
                    value={editingProposal.secretariat || ''}
                    onChange={(e) => setEditingProposal({ ...editingProposal, secretariat: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-value" className="text-sm font-bold text-gray-700">Valor Total</label>
                  <input
                    id="edit-value"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingProposal.value}
                    onChange={(e) => setEditingProposal({ ...editingProposal, value: e.target.value === '' ? 0 : Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-status" className="text-sm font-bold text-gray-700">Status</label>
                  <select 
                    id="edit-status"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingProposal.status}
                    onChange={(e) => setEditingProposal({ ...editingProposal, status: e.target.value as ProposalStatus })}
                  >
                    <option value={ProposalStatus.DRAFT}>Rascunho</option>
                    <option value={ProposalStatus.SENT}>Enviada</option>
                    <option value={ProposalStatus.ACCEPTED}>Aceita</option>
                    <option value={ProposalStatus.REJECTED}>Rejeitada</option>
                  </select>
                </div>
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
                  disabled={saving}
                  className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Salvar Alterações
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a proposta <span className="font-bold text-gray-900">{deletingProposal?.title}</span>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDeleteProposal}
              disabled={saving}
              className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Proposal Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Proposta</DialogTitle>
            <DialogDescription>
              Crie uma nova proposta comercial para um órgão público.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProposal} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-bold text-gray-700">Título da Proposta</label>
              <input
                id="title"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Fornecimento de Equipamentos"
                value={newProposal.title}
                onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="account" className="text-sm font-bold text-gray-700">Órgão / Prefeitura</label>
              <select
                id="account"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={newProposal.municipality_id}
                onChange={(e) => setNewProposal({ ...newProposal, municipality_id: e.target.value })}
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
                  value={newProposal.department}
                  onChange={(e) => setNewProposal({ ...newProposal, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="secretariat" className="text-sm font-bold text-gray-700">Secretaria</label>
                <input
                  id="secretariat"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="Ex: Coordenação de TI"
                  value={newProposal.secretariat}
                  onChange={(e) => setNewProposal({ ...newProposal, secretariat: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="value" className="text-sm font-bold text-gray-700">Valor Total</label>
                <input
                  id="value"
                  type="number"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="0.00"
                  value={newProposal.value}
                  onChange={(e) => setNewProposal({ ...newProposal, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-bold text-gray-700">Status Inicial</label>
                <select 
                  id="status"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={newProposal.status}
                  onChange={(e) => setNewProposal({ ...newProposal, status: e.target.value as ProposalStatus })}
                >
                  <option value={ProposalStatus.DRAFT}>Rascunho</option>
                  <option value={ProposalStatus.SENT}>Enviada</option>
                </select>
              </div>
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
                disabled={saving}
                className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Gerar Proposta
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filtrar Propostas</DialogTitle>
            <DialogDescription>
              Selecione os critérios para filtrar suas propostas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Status</label>
              <select 
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as ProposalStatus })}
              >
                <option value="">Todos os status</option>
                <option value={ProposalStatus.DRAFT}>Rascunho</option>
                <option value={ProposalStatus.SENT}>Enviada</option>
                <option value={ProposalStatus.ACCEPTED}>Aceita</option>
                <option value={ProposalStatus.REJECTED}>Rejeitada</option>
              </select>
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
      {loadingFullProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="rounded-xl bg-white px-6 py-4 shadow-xl flex items-center gap-3 text-sm font-bold text-gray-700">
            <Loader2 className="size-4 animate-spin text-[#0f49bd]" />
            Carregando conteúdo completo da proposta...
          </div>
        </div>
      )}
    </>
  );
}
