'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Plus, Search, MoreVertical, Pencil, Copy, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '@/components/providers/CompanyProvider';
import { useIsReadOnly } from '@/hooks/useIsReadOnly';

type CampaignStatus = 'Rascunho' | 'Agendada' | 'Ativa' | 'Enviada' | 'Pausada';

type CampaignObjective =
  | 'Prospecção'
  | 'Relacionamento'
  | 'Apresentação comercial'
  | 'Follow-up';

type Campaign = {
  id: string;
  company_id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  description: string | null;
  sent_count: number | null;
  sent_at: string | null;
  subject: string | null;
  preheader: string | null;
  html_content: string | null;
  text_content: string | null;
  audience_filters: unknown;
  created_at: string;
  updated_at: string;
};

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  Rascunho: { label: 'Rascunho', className: 'bg-slate-100 text-slate-600' },
  Agendada: { label: 'Agendada', className: 'bg-amber-100 text-amber-700' },
  Ativa:    { label: 'Ativa',    className: 'bg-green-100 text-green-700' },
  Enviada:  { label: 'Enviada',  className: 'bg-blue-100 text-blue-700' },
  Pausada:  { label: 'Pausada',  className: 'bg-orange-100 text-orange-700' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as CampaignStatus] ?? STATUS_CONFIG.Rascunho;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const STATUS_FILTER_OPTIONS = ['Todos', 'Rascunho', 'Agendada', 'Ativa', 'Enviada', 'Pausada'] as const;
type StatusFilterOption = typeof STATUS_FILTER_OPTIONS[number];

export default function EmailCampaignsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { companyId } = useCompany();
  const isReadOnly = useIsReadOnly();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('Todos');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    status: 'Rascunho' as CampaignStatus,
    description: '',
  });

  // Close dropdown when clicking anywhere outside
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  const resetForm = () => {
    setFormData({ name: '', objective: '', status: 'Rascunho', description: '' });
  };

  const handleOpenCreateModal = () => { resetForm(); setIsCreateModalOpen(true); };
  const handleCloseCreateModal = () => { setIsCreateModalOpen(false); resetForm(); };

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCampaigns((data ?? []) as Campaign[]);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Erro ao carregar campanhas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreateCampaign = async () => {
    const name = formData.name.trim();
    const description = formData.description.trim();

    if (!name) { toast.error('Preencha o nome da campanha.'); return; }
    if (!formData.objective) { toast.error('Selecione o objetivo da campanha.'); return; }
    if (!companyId) { toast.error('Empresa não identificada.'); return; }

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          company_id: companyId,
          name,
          objective: formData.objective,
          status: 'Ativa',
          description: description || null,
        })
        .select('*')
        .single();
      if (error) throw error;
      const created = data as Campaign;
      setCampaigns((prev) => [created, ...prev]);
      toast.success('Campanha criada. Configure o e-mail.');
      handleCloseCreateModal();
      router.push(`/email/campaigns/${created.id}`);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      toast.error('Erro ao criar campanha.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          company_id: companyId,
          name: `Cópia de ${campaign.name}`,
          objective: campaign.objective,
          status: 'Rascunho',
          description: campaign.description,
          subject: campaign.subject,
          preheader: campaign.preheader,
          html_content: campaign.html_content,
          text_content: campaign.text_content,
          audience_filters: campaign.audience_filters,
        })
        .select('*')
        .single();
      if (error) throw error;
      setCampaigns((prev) => [data as Campaign, ...prev]);
      toast.success('Campanha duplicada.');
    } catch {
      toast.error('Erro ao duplicar campanha.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', deleteId);
      if (error) throw error;
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteId));
      toast.success('Campanha excluída.');
    } catch {
      toast.error('Erro ao excluir campanha.');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredCampaigns = useMemo(() => {
    let list = campaigns;
    if (statusFilter !== 'Todos') {
      list = list.filter((c) => c.status === statusFilter);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(term) ||
        c.objective.toLowerCase().includes(term) ||
        c.status.toLowerCase().includes(term) ||
        (c.description ?? '').toLowerCase().includes(term),
      );
    }
    return list;
  }, [campaigns, searchTerm, statusFilter]);

  const activeCampaignsCount = campaigns.filter((c) => c.status === 'Ativa').length;
  const draftCampaignsCount = campaigns.filter((c) => c.status === 'Rascunho').length;
  const sentCampaignsCount = campaigns.filter((c) => c.status === 'Ativa' || c.status === 'Enviada').length;

  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Campanhas</h1>
          <p className="text-sm text-slate-600">
            Gerencie campanhas de e-mail, públicos, modelos e histórico de disparos.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Campanhas Ativas</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{activeCampaignsCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rascunhos</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{draftCampaignsCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Enviadas</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{sentCampaignsCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Taxa de Resposta</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">0%</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar campanhas"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isReadOnly && (
                <span className="text-xs font-medium text-amber-700">
                  Disponível após contratação
                </span>
              )}
              <button
                type="button"
                onClick={isReadOnly ? undefined : handleOpenCreateModal}
                disabled={isReadOnly}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="size-4" />
                Nova Campanha
              </button>
            </div>
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStatusFilter(opt)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  statusFilter === opt
                    ? 'bg-[#0f49bd] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Carregando campanhas...
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
                <Mail className="size-8 text-[#0f49bd]" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Nenhuma campanha cadastrada</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Clique em Nova Campanha para começar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Campanha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Objetivo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contatos</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data Envio</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      onClick={() => router.push(`/email/campaigns/${campaign.id}`)}
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">{campaign.name}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{campaign.objective}</td>
                      <td className="px-4 py-4"><StatusBadge status={campaign.status} /></td>
                      <td className="px-4 py-4 text-sm text-slate-700">{campaign.sent_count ?? 0}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(campaign.sent_at)}</td>
                      <td
                        className="px-4 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === campaign.id ? null : campaign.id);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                          {openMenuId === campaign.id && (
                            <div
                              className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  router.push(`/email/campaigns/${campaign.id}`);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Pencil className="size-4" /> Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleDuplicate(campaign);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Copy className="size-4" /> Duplicar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDeleteId(campaign.id);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="size-4" /> Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Nova Campanha</h2>
                <p className="text-sm text-slate-500">Preencha os dados iniciais da campanha.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Nome da campanha</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex.: Apresentação institucional para secretarias de obras"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Objetivo</label>
                <select
                  value={formData.objective}
                  onChange={(e) => setFormData((prev) => ({ ...prev, objective: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                >
                  <option value="">Selecionar</option>
                  <option value="Prospecção">Prospecção</option>
                  <option value="Relacionamento">Relacionamento</option>
                  <option value="Apresentação comercial">Apresentação comercial</option>
                  <option value="Follow-up">Follow-up</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Descrição</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva brevemente o propósito desta campanha"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={isSaving}
                className="rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Salvando...' : 'Criar Campanha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-6">
              <h2 className="text-lg font-semibold text-slate-900">Excluir campanha</h2>
              <p className="mt-2 text-sm text-slate-600">
                Esta ação não pode ser desfeita. Todos os dados da campanha serão removidos.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
