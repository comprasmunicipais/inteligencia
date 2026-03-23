'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Plus, Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '@/components/providers/CompanyProvider';

type CampaignStatus = 'Rascunho' | 'Ativa';

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
  created_at: string;
  updated_at: string;
};

export default function EmailCampaignsPage() {
  const supabase = createClient();
  const { companyId } = useCompany();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    status: 'Rascunho' as CampaignStatus,
    description: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      objective: '',
      status: 'Rascunho',
      description: '',
    });
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    resetForm();
  };

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

    if (!name) {
      toast.error('Preencha o nome da campanha.');
      return;
    }

    if (!formData.objective) {
      toast.error('Selecione o objetivo da campanha.');
      return;
    }

    if (!companyId) {
      toast.error('Empresa não identificada.');
      return;
    }

    try {
      setIsSaving(true);

      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          company_id: companyId,
          name,
          objective: formData.objective,
          status: formData.status,
          description: description || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      setCampaigns((prev) => [data as Campaign, ...prev]);
      toast.success('Campanha criada com sucesso.');
      handleCloseCreateModal();
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      toast.error('Erro ao criar campanha.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCampaigns = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return campaigns;
    return campaigns.filter((campaign) =>
      campaign.name.toLowerCase().includes(term) ||
      campaign.objective.toLowerCase().includes(term) ||
      campaign.status.toLowerCase().includes(term) ||
      (campaign.description ?? '').toLowerCase().includes(term)
    );
  }, [campaigns, searchTerm]);

  const activeCampaignsCount = campaigns.filter((c) => c.status === 'Ativa').length;
  const draftCampaignsCount = campaigns.filter((c) => c.status === 'Rascunho').length;

  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Campanhas</h1>
          <p className="text-sm text-slate-600">
            Gerencie campanhas de e-mail, públicos, modelos e histórico de disparos.
          </p>
        </div>

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
            <p className="mt-3 text-2xl font-bold text-slate-900">0</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Taxa de Resposta</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">0%</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
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
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Filter className="size-4" />
                Filtrar
              </button>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c]"
            >
              <Plus className="size-4" />
              Nova Campanha
            </button>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-slate-100">
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">{campaign.name}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{campaign.objective}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          campaign.status === 'Ativa'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{campaign.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status inicial</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as CampaignStatus }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Ativa">Ativa</option>
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
    </div>
  );
}
