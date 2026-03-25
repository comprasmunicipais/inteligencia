'use client';

import { useMemo, useState } from 'react';
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Globe,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';

type Municipality = {
  id: string;
  name: string;
  state: string;
};

type OpportunitySource = {
  id: string;
  url: string;
  source_type: 'municipality_portal' | 'licitacao_portal' | 'transparency_portal' | 'other';
  is_active: boolean;
  last_checked_at: string | null;
  last_check_status: 'success' | 'error' | 'pending';
  last_check_error: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  municipalities: Municipality | Municipality[] | null;
};

type Props = {
  initialSources: OpportunitySource[];
};

type FormState = {
  url: string;
  source_type: OpportunitySource['source_type'];
  notes: string;
};

type VerificationUpdate = {
  id: string;
  last_checked_at: string;
  last_check_status: 'success' | 'error';
  last_check_error: string | null;
};

function formatSourceType(value: OpportunitySource['source_type']) {
  switch (value) {
    case 'municipality_portal':
      return 'Portal da Prefeitura';
    case 'licitacao_portal':
      return 'Portal de Licitação';
    case 'transparency_portal':
      return 'Portal da Transparência';
    default:
      return 'Outro';
  }
}

function formatStatus(value: OpportunitySource['last_check_status']) {
  switch (value) {
    case 'success':
      return 'Sucesso';
    case 'error':
      return 'Erro';
    default:
      return 'Pendente';
  }
}

function getMunicipalityLabel(municipalities: OpportunitySource['municipalities']) {
  if (!municipalities) return 'Global';
  if (Array.isArray(municipalities)) {
    const first = municipalities[0];
    return first ? `${first.name} / ${first.state}` : 'Global';
  }
  return `${municipalities.name} / ${municipalities.state}`;
}

function formatDate(value: string | null) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function OpportunitySourcesClient({ initialSources }: Props) {
  const [sources, setSources] = useState<OpportunitySource[]>(initialSources);
  const [query, setQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<OpportunitySource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    url: '',
    source_type: 'licitacao_portal',
    notes: '',
  });

  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return sources;

    return sources.filter((source) => {
      const municipalityLabel = getMunicipalityLabel(source.municipalities).toLowerCase();

      return (
        source.url.toLowerCase().includes(normalizedQuery) ||
        source.source_type.toLowerCase().includes(normalizedQuery) ||
        municipalityLabel.includes(normalizedQuery) ||
        (source.notes ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, sources]);

  function resetForm() {
    setForm({
      url: '',
      source_type: 'licitacao_portal',
      notes: '',
    });
    setFormError(null);
  }

  function openCreateModal() {
    setVerifyMessage(null);
    setEditingSource(null);
    resetForm();
    setIsCreateOpen(true);
  }

  function openEditModal(source: OpportunitySource) {
    setVerifyMessage(null);
    setFormError(null);
    setEditingSource(source);
    setForm({
      url: source.url,
      source_type: source.source_type,
      notes: source.notes ?? '',
    });
    setIsCreateOpen(false);
  }

  function closeModal() {
    if (isSubmitting) return;
    setIsCreateOpen(false);
    setEditingSource(null);
    resetForm();
  }

  async function handleCreateSource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setVerifyMessage(null);

    if (!form.url.trim()) {
      setFormError('Informe a URL da fonte.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/opportunity-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: form.url.trim(),
          source_type: form.source_type,
          notes: form.notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Erro ao criar fonte.');
      }

      setSources((current) => [result.data, ...current]);
      closeModal();
    } catch (error: any) {
      setFormError(error?.message || 'Erro ao criar fonte.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editingSource) return;

    setFormError(null);
    setVerifyMessage(null);

    if (!form.url.trim()) {
      setFormError('Informe a URL da fonte.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/opportunity-sources/${editingSource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: form.url.trim(),
          source_type: form.source_type,
          notes: form.notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Erro ao editar fonte.');
      }

      setSources((current) =>
        current.map((source) =>
          source.id === editingSource.id ? result.data : source
        )
      );

      closeModal();
    } catch (error: any) {
      setFormError(error?.message || 'Erro ao editar fonte.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifySources() {
    setIsVerifying(true);
    setVerifyMessage(null);
    setFormError(null);

    try {
      const response = await fetch('/api/admin/opportunity-sources/verify', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Erro ao verificar fontes.');
      }

      const updatesById = new Map<string, VerificationUpdate>(
        (result.results ?? []).map((item: any) => [
          item.id,
          {
            id: item.id,
            last_checked_at: item.last_checked_at,
            last_check_status: item.last_check_status,
            last_check_error: item.last_check_error,
          },
        ])
      );

      setSources((current) =>
        current.map((source) => {
          const update = updatesById.get(source.id);

          if (!update) {
            return source;
          }

          return {
            ...source,
            last_checked_at: update.last_checked_at,
            last_check_status: update.last_check_status,
            last_check_error: update.last_check_error,
          };
        })
      );

      setVerifyMessage(
        `Verificação concluída. ${result.successCount} com sucesso e ${result.errorCount} com erro.`
      );
    } catch (error: any) {
      setVerifyMessage(error?.message || 'Erro ao verificar fontes.');
    } finally {
      setIsVerifying(false);
    }
  }

  const isModalOpen = isCreateOpen || !!editingSource;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Fontes de Oportunidades
          </h1>
          <p className="text-slate-600 mt-1">
            Gerencie URLs externas complementares ao PNCP com controle de status, ativação e manutenção.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleVerifySources}
            disabled={isVerifying || sources.filter((item) => item.is_active).length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isVerifying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {isVerifying ? 'Verificando...' : 'Verificar fontes'}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Plus className="size-4" />
            Nova Fonte
          </button>
        </div>
      </div>

      {verifyMessage ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
          {verifyMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total de fontes</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{sources.length}</p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Ativas</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">
            {sources.filter((item) => item.is_active).length}
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Com erro</p>
          <p className="text-3xl font-black text-red-600 mt-2">
            {sources.filter((item) => item.last_check_status === 'error').length}
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Pendentes</p>
          <p className="text-3xl font-black text-amber-600 mt-2">
            {sources.filter((item) => item.last_check_status === 'pending').length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por URL, município, tipo ou observação..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3 font-bold">URL</th>
                <th className="px-4 py-3 font-bold">Município</th>
                <th className="px-4 py-3 font-bold">Tipo</th>
                <th className="px-4 py-3 font-bold">Ativa</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Última verificação</th>
                <th className="px-4 py-3 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Nenhuma fonte cadastrada até o momento.
                  </td>
                </tr>
              ) : (
                filteredSources.map((source) => (
                  <tr key={source.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-600">
                          <Globe className="size-4" />
                        </div>
                        <div className="min-w-[280px]">
                          <p className="font-semibold text-slate-900 break-all">{source.url}</p>
                          {source.notes ? (
                            <p className="mt-1 text-xs text-slate-500">{source.notes}</p>
                          ) : null}
                          {source.last_check_error ? (
                            <p className="mt-1 text-xs text-red-600">{source.last_check_error}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {getMunicipalityLabel(source.municipalities)}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {formatSourceType(source.source_type)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          source.is_active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {source.is_active ? 'Sim' : 'Não'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          source.last_check_status === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : source.last_check_status === 'error'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {formatStatus(source.last_check_status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {formatDate(source.last_checked_at)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(source)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Edit className="size-4" />
                          Editar
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingSource ? 'Editar Fonte' : 'Nova Fonte'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingSource
                    ? 'Atualize os dados da fonte complementar.'
                    : 'Cadastre uma URL complementar ao núcleo soberano do PNCP.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={editingSource ? handleEditSource : handleCreateSource}
              className="space-y-5 px-6 py-5"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">URL</label>
                <input
                  type="url"
                  required
                  value={form.url}
                  onChange={(e) => setForm((current) => ({ ...current, url: e.target.value }))}
                  placeholder="https://portal.exemplo.gov.br/licitacoes"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tipo da fonte</label>
                <select
                  value={form.source_type}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      source_type: e.target.value as OpportunitySource['source_type'],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="municipality_portal">Portal da Prefeitura</option>
                  <option value="licitacao_portal">Portal de Licitação</option>
                  <option value="transparency_portal">Portal da Transparência</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Observações</label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Observações internas sobre esta fonte"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {formError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {formError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? editingSource
                      ? 'Salvando...'
                      : 'Salvando...'
                    : editingSource
                      ? 'Salvar alterações'
                      : 'Salvar fonte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
