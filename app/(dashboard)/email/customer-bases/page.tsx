'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  UserLock,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsReadOnly } from '@/hooks/useIsReadOnly';

type CustomerContactListStatus = 'active' | 'inactive';

type CustomerContactList = {
  id: string;
  company_id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  visibility: string;
  status: CustomerContactListStatus;
  contacts_count: number;
  valid_contacts_count: number;
  invalid_contacts_count: number;
  duplicate_contacts_count: number;
  created_at: string;
  updated_at: string;
};

type ApiError = {
  error?: string;
};

type ListResponse = {
  data?: CustomerContactList[];
  error?: string;
};

type ItemResponse = {
  data?: CustomerContactList;
  error?: string;
};

type ImportResponse = {
  data?: {
    import_id: string;
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    duplicate_rows: number;
  };
  error?: string;
};

const STATUS_LABELS: Record<CustomerContactListStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
};

const STATUS_BADGES: Record<CustomerContactListStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-200 text-slate-700',
};

const ACCEPTED_COLUMNS = [
  { name: 'email', required: true },
  { name: 'nome', required: false },
  { name: 'empresa', required: false },
  { name: 'telefone', required: false },
  { name: 'cidade', required: false },
  { name: 'estado', required: false },
  { name: 'tags', required: false },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CounterCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-bold ${tone}`}>{value.toLocaleString('pt-BR')}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CustomerContactListStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_BADGES[status]
      }`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function CustomerBasesPage() {
  const isReadOnly = useIsReadOnly();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [lists, setLists] = useState<CustomerContactList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedImportListId, setSelectedImportListId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomerContactList | null>(null);
  const [deletingList, setDeletingList] = useState<CustomerContactList | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'active' as CustomerContactListStatus,
  });

  function handleDownloadCsvTemplate() {
    const csvContent = [
      'email,nome,empresa,telefone,cidade,estado,tags',
      'contato@empresa.com.br,João Silva,Empresa XYZ,11999999999,São Paulo,SP,software',
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-base-propria.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function loadLists() {
    try {
      setIsLoading(true);
      setLoadError('');

      const response = await fetch('/api/customer-contact-lists', {
        method: 'GET',
        cache: 'no-store',
      });

      const result = (await response.json()) as ListResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar bases próprias.');
      }

      setLists(result.data || []);
    } catch (error: any) {
      setLoadError(error?.message || 'Erro ao carregar bases próprias.');
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (lists.length === 0) {
      if (selectedImportListId) {
        setSelectedImportListId('');
      }
      return;
    }

    const hasSelectedList = lists.some((item) => item.id === selectedImportListId);

    if (!hasSelectedList) {
      setSelectedImportListId(lists[0].id);
    }
  }, [lists, selectedImportListId]);

  const totals = useMemo(() => {
    return lists.reduce(
      (acc, item) => {
        acc.lists += 1;
        acc.contacts += item.contacts_count ?? 0;
        acc.valid += item.valid_contacts_count ?? 0;
        acc.invalid += item.invalid_contacts_count ?? 0;
        acc.duplicates += item.duplicate_contacts_count ?? 0;
        return acc;
      },
      { lists: 0, contacts: 0, valid: 0, invalid: 0, duplicates: 0 },
    );
  }, [lists]);

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setCreateForm({ name: '', description: '' });
  }

  function openEditModal(list: CustomerContactList) {
    setEditingList(list);
    setEditForm({
      name: list.name,
      description: list.description ?? '',
      status: list.status,
    });
  }

  function closeEditModal() {
    setEditingList(null);
    setEditForm({ name: '', description: '', status: 'active' });
  }

  async function handleCreateList() {
    const name = createForm.name.trim();
    const description = createForm.description.trim();

    if (!name) {
      toast.error('Informe o nome da base.');
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch('/api/customer-contact-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      const result = (await response.json()) as ItemResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar base.');
      }

      if (result.data) {
        setLists((prev) => [result.data as CustomerContactList, ...prev]);
      }

      toast.success('Base criada com sucesso.');
      closeCreateModal();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar base.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateList() {
    if (!editingList) return;

    const name = editForm.name.trim();
    const description = editForm.description.trim();

    if (!name) {
      toast.error('Informe o nome da base.');
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(`/api/customer-contact-lists/${editingList.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          status: editForm.status,
        }),
      });

      const result = (await response.json()) as ItemResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar base.');
      }

      if (result.data) {
        setLists((prev) =>
          prev.map((item) => (item.id === editingList.id ? (result.data as CustomerContactList) : item)),
        );
      }

      toast.success('Base atualizada com sucesso.');
      closeEditModal();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar base.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteList() {
    if (!deletingList) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/customer-contact-lists/${deletingList.id}`, {
        method: 'DELETE',
      });

      const result = (await response.json()) as ApiError & { success?: boolean };

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir base.');
      }

      setLists((prev) => prev.filter((item) => item.id !== deletingList.id));
      toast.success('Base excluída com sucesso.');
      setDeletingList(null);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir base.');
    } finally {
      setIsDeleting(false);
    }
  }

  function triggerCsvUpload() {
    if (!selectedImportListId) {
      toast.error('Selecione uma base para receber os contatos.');
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!selectedImportListId) {
      toast.error('Selecione uma base para receber os contatos.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Apenas arquivos .csv são aceitos nesta fase.');
      return;
    }

    try {
      setIsImporting(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/customer-contact-lists/${selectedImportListId}/import`, {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as ImportResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao importar arquivo CSV.');
      }

      const importedCount = result.data?.valid_rows ?? 0;
      const invalidCount = result.data?.invalid_rows ?? 0;
      const duplicateCount = result.data?.duplicate_rows ?? 0;

      toast.success(
        `Importação concluída: ${importedCount} contatos adicionados, ${invalidCount} inválidos e ${duplicateCount} duplicados.`,
      );

      await loadLists();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao importar arquivo CSV.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="min-h-full overflow-y-auto bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0f49bd]">
              <Database className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0f172a]">Bases Próprias</h1>
              <p className="text-sm text-slate-600">
                Importe e organize bases próprias de contatos. Nesta fase, as bases ficam visíveis
                apenas para o usuário que as criou.
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
            <UserLock className="size-3.5" />
            Bases privadas do usuário logado
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <CounterCard label="Bases" value={totals.lists} tone="text-slate-900" />
          <CounterCard label="Contatos" value={totals.contacts} tone="text-slate-900" />
          <CounterCard label="Válidos" value={totals.valid} tone="text-emerald-600" />
          <CounterCard label="Inválidos" value={totals.invalid} tone="text-amber-600" />
          <CounterCard label="Duplicados" value={totals.duplicates} tone="text-rose-600" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <FileSpreadsheet className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Importação de contatos</h2>
                <p className="text-sm text-slate-600">
                  Importe arquivos CSV contendo sua própria base de contatos. Nesta primeira
                  versão funcional, apenas arquivos estruturados com cabeçalhos são aceitos.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Colunas aceitas</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ACCEPTED_COLUMNS.map((column) => (
                    <span
                      key={column.name}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        column.required
                          ? 'border border-blue-200 bg-blue-50 text-blue-800'
                          : 'border border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {column.name}
                      {column.required ? ' (obrigatório)' : ' (opcional)'}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                A primeira linha do arquivo deve conter os nomes das colunas.
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-64">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Base de destino
                </label>
                <select
                  value={selectedImportListId}
                  onChange={(e) => setSelectedImportListId(e.target.value)}
                  disabled={lists.length === 0 || isReadOnly || isImporting}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd] disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {lists.length === 0 ? (
                    <option value="">Crie uma base antes de importar</option>
                  ) : (
                    lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="size-4" />
                Baixar modelo CSV
              </button>

              <button
                type="button"
                onClick={triggerCsvUpload}
                disabled={lists.length === 0 || isReadOnly || isImporting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                <Upload className="size-4" />
                {isImporting ? 'Importando CSV...' : 'Importar arquivo CSV'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportFileChange}
                className="hidden"
              />

              <p className="text-xs text-slate-500">
                Apenas CSV está disponível nesta fase. XLSX, fila assíncrona e importação
                avançada entram nas próximas etapas.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Minhas bases</h2>
              <p className="text-sm text-slate-600">
                Gerencie nome, descrição e status das bases privadas vinculadas ao seu usuário.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadLists}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                disabled={isReadOnly}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="size-4" />
                Nova Base
              </button>
            </div>
          </div>

          {isReadOnly && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A criação e edição ficam disponíveis após a contratação.
            </div>
          )}

          {isLoading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Carregando bases próprias...
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <div className="rounded-full bg-rose-50 p-4 text-rose-600">
                <Mail className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Erro ao carregar bases</h3>
                <p className="mt-2 text-sm text-slate-600">{loadError}</p>
              </div>
              <button
                type="button"
                onClick={loadLists}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="size-4" />
                Tentar novamente
              </button>
            </div>
          ) : lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
                <Database className="size-8 text-[#0f49bd]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhuma base criada</h3>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Crie sua primeira base própria para organizar contatos privados do seu usuário.
                Depois disso, você já poderá importar um CSV simples sem integração com
                campanhas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Base
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contatos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Qualidade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Criada em
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lists.map((list) => (
                    <tr key={list.id} className="border-b border-slate-100 align-top">
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-slate-900">{list.name}</span>
                          <span className="text-sm text-slate-600">
                            {list.description?.trim() || 'Sem descrição.'}
                          </span>
                          <span className="text-xs text-slate-400">
                            Atualizada em {formatDateTime(list.updated_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={list.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {list.contacts_count.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="text-emerald-700">
                            Válidos: {list.valid_contacts_count.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-amber-700">
                            Inválidos: {list.invalid_contacts_count.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-rose-700">
                            Duplicados: {list.duplicate_contacts_count.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDateTime(list.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(list)}
                            disabled={isReadOnly}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Pencil className="size-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingList(list)}
                            disabled={isReadOnly}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="size-4" />
                            Excluir
                          </button>
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Nova Base Própria</h2>
                <p className="text-sm text-slate-500">
                  Crie uma base privada vinculada apenas ao seu usuário.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Nome</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex.: Secretarias municipais - carteira 2026"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Descrição</label>
                <textarea
                  rows={4}
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descreva a origem ou o objetivo desta base"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateList}
                disabled={isSaving}
                className="rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Salvando...' : 'Criar Base'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Editar Base</h2>
                <p className="text-sm text-slate-500">
                  Atualize apenas nome, descrição e status da base.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Nome</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Descrição</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      status: e.target.value as CustomerContactListStatus,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateList}
                disabled={isSaving}
                className="rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-6">
              <h2 className="text-lg font-semibold text-slate-900">Excluir base</h2>
              <p className="mt-2 text-sm text-slate-600">
                Esta ação remove a base apenas se ela não tiver contatos vinculados.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setDeletingList(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteList}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
