'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Database, Download, FileSpreadsheet, RefreshCw, Upload, UserLock } from 'lucide-react';
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

type CustomerContactImport = {
  id: string;
  original_file_name: string;
  file_type: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

type ListResponse = {
  data?: CustomerContactList[];
  error?: string;
};

type ImportListResponse = {
  data?: CustomerContactImport[];
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

type CustomerContact = {
  id: string;
  email_normalized: string;
  email_original: string;
  name: string | null;
  company_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  validation_status: string;
  source: string;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
};

type ContactsResponse = {
  data?: CustomerContact[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
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

const STATUS_BADGES: Record<CustomerContactListStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-200 text-slate-700',
};

const STATUS_LABELS: Record<CustomerContactListStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
};

function formatDateTime(value: string | null) {
  if (!value) return '—';

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

function getImportStatusLabel(status: string) {
  if (status === 'completed') return 'Concluída';
  if (status === 'failed') return 'Falhou';
  if (status === 'processing') return 'Processando';
  if (status === 'pending') return 'Pendente';
  return status;
}

function getImportStatusClass(status: string) {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-rose-100 text-rose-700';
  if (status === 'processing') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-200 text-slate-700';
}

export default function CustomerBaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isReadOnly = useIsReadOnly();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [listId, setListId] = useState('');
  const [list, setList] = useState<CustomerContactList | null>(null);
  const [imports, setImports] = useState<CustomerContactImport[]>([]);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingImports, setIsRefreshingImports] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [contactsError, setContactsError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsPageSize] = useState(50);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsTotalPages, setContactsTotalPages] = useState(1);

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

  async function loadBase(currentListId: string) {
    const response = await fetch('/api/customer-contact-lists', {
      method: 'GET',
      cache: 'no-store',
    });

    const result = (await response.json()) as ListResponse;

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao carregar base.');
    }

    const currentList = (result.data || []).find((item) => item.id === currentListId) || null;

    if (!currentList) {
      throw new Error('Base não encontrada.');
    }

    setList(currentList);
  }

  async function loadImports(currentListId: string, silent = false) {
    if (silent) {
      setIsRefreshingImports(true);
    }

    const response = await fetch(`/api/customer-contact-lists/${currentListId}/import`, {
      method: 'GET',
      cache: 'no-store',
    });

    const result = (await response.json()) as ImportListResponse;

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao carregar histórico de importações.');
    }

    setImports(result.data || []);

    if (silent) {
      setIsRefreshingImports(false);
    }
  }

  async function loadContacts(currentListId: string, page = 1, search = '') {
    try {
      setIsLoadingContacts(true);
      setContactsError('');

      const searchParams = new URLSearchParams({
        page: String(page),
        pageSize: String(contactsPageSize),
      });

      if (search.trim()) {
        searchParams.set('search', search.trim());
      }

      const response = await fetch(
        `/api/customer-contact-lists/${currentListId}/contacts?${searchParams.toString()}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );

      const result = (await response.json()) as ContactsResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar contatos da base.');
      }

      setContacts(result.data || []);
      setContactsTotal(result.total || 0);
      setContactsPage(result.page || page);
      setContactsTotalPages(result.totalPages || 1);
    } catch (error: any) {
      setContactsError(error?.message || 'Erro ao carregar contatos da base.');
      setContacts([]);
      setContactsTotal(0);
      setContactsTotalPages(1);
    } finally {
      setIsLoadingContacts(false);
    }
  }

  async function loadPage(currentListId: string) {
    try {
      setIsLoading(true);
      setLoadError('');

      await Promise.all([loadBase(currentListId), loadImports(currentListId), loadContacts(currentListId, 1, '')]);
    } catch (error: any) {
      setLoadError(error?.message || 'Erro ao carregar a base.');
      setList(null);
      setImports([]);
      setContacts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshingImports(false);
    }
  }

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params;
      setListId(resolvedParams.id);
      await loadPage(resolvedParams.id);
    }

    resolveParams();
  }, [params]);

  const importStats = useMemo(() => {
    return imports.reduce(
      (acc, item) => {
        acc.total += 1;
        acc.valid += item.valid_rows ?? 0;
        acc.invalid += item.invalid_rows ?? 0;
        acc.duplicates += item.duplicate_rows ?? 0;
        return acc;
      },
      { total: 0, valid: 0, invalid: 0, duplicates: 0 },
    );
  }, [imports]);

  function triggerCsvUpload() {
    fileInputRef.current?.click();
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !listId) {
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

      const response = await fetch(`/api/customer-contact-lists/${listId}/import`, {
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

      await Promise.all([loadBase(listId), loadImports(listId, true), loadContacts(listId, contactsPage, searchInput)]);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao importar arquivo CSV.');
    } finally {
      setIsImporting(false);
    }
  }

  async function handleContactsSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!listId) return;

    await loadContacts(listId, 1, searchInput);
  }

  async function handleContactsPageChange(nextPage: number) {
    if (!listId || nextPage < 1 || nextPage > contactsTotalPages) {
      return;
    }

    await loadContacts(listId, nextPage, searchInput);
  }

  return (
    <div className="min-h-full overflow-y-auto bg-[#f8fafc] p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Link
            href="/email/customer-bases"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="size-4" />
            Voltar para bases
          </Link>

          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0f49bd]">
              <Database className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0f172a]">
                {list?.name || 'Base própria'}
              </h1>
              <p className="text-sm text-slate-600">
                {list?.description?.trim() ||
                  'Gerencie a importação CSV desta base privada e acompanhe os resultados por histórico.'}
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
            <UserLock className="size-3.5" />
            Visível apenas para o usuário que criou a base
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
            Carregando base...
          </div>
        ) : loadError || !list ? (
          <div className="rounded-xl border border-rose-200 bg-white px-6 py-16 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Erro ao carregar base</h2>
            <p className="mt-2 text-sm text-slate-600">{loadError || 'Base não encontrada.'}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <CounterCard label="Contatos" value={list.contacts_count} tone="text-slate-900" />
              <CounterCard label="Válidos" value={list.valid_contacts_count} tone="text-emerald-600" />
              <CounterCard label="Inválidos" value={list.invalid_contacts_count} tone="text-amber-600" />
              <CounterCard label="Duplicados" value={list.duplicate_contacts_count} tone="text-rose-600" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <FileSpreadsheet className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Importação CSV</h2>
                      <p className="text-sm text-slate-600">
                        Envie um CSV simples para esta base. O arquivo precisa ter cabeçalhos e a
                        coluna obrigatória <span className="font-medium text-slate-900">email</span>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 px-4 py-5">
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
                    A primeira linha do arquivo deve conter os nomes das colunas. Nesta fase, apenas
                    CSV em UTF-8 e até 5.000 linhas por importação são aceitos.
                  </div>

                  {isReadOnly && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      A importação fica disponível após a contratação.
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
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
                      disabled={isReadOnly || isImporting}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      <Upload className="size-4" />
                      {isImporting ? 'Importando CSV...' : 'Importar CSV nesta base'}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleImportFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-4">
                  <h2 className="text-base font-semibold text-slate-900">Resumo da base</h2>
                  <p className="text-sm text-slate-600">
                    Status atual, evolução das importações e informações rápidas desta base.
                  </p>
                </div>

                <div className="space-y-4 px-4 py-5 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_BADGES[list.status]
                      }`}
                    >
                      {STATUS_LABELS[list.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Criada em</span>
                    <span>{formatDateTime(list.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Última atualização</span>
                    <span>{formatDateTime(list.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Importações</span>
                    <span>{importStats.total.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Válidos importados</span>
                    <span>{importStats.valid.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Inválidos detectados</span>
                    <span>{importStats.invalid.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Duplicados detectados</span>
                    <span>{importStats.duplicates.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Histórico de importações</h2>
                  <p className="text-sm text-slate-600">
                    Acompanhe os últimos arquivos enviados para esta base.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (listId) {
                      loadImports(listId, true).catch((error: any) => {
                        toast.error(error?.message || 'Erro ao atualizar histórico de importações.');
                        setIsRefreshingImports(false);
                      });
                    }
                  }}
                  disabled={isRefreshingImports}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className={`size-4 ${isRefreshingImports ? 'animate-spin' : ''}`} />
                  Atualizar histórico
                </button>
              </div>

              {imports.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  Nenhuma importação realizada nesta base até o momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Arquivo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Resultado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Datas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {imports.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 align-top">
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-semibold text-slate-900">
                                {item.original_file_name}
                              </span>
                              <span className="text-xs text-slate-500">
                                Tipo: {item.file_type.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getImportStatusClass(
                                item.status,
                              )}`}
                            >
                              {getImportStatusLabel(item.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1 text-sm">
                              <span className="text-slate-700">
                                Total: {item.total_rows.toLocaleString('pt-BR')}
                              </span>
                              <span className="text-emerald-700">
                                Válidos: {item.valid_rows.toLocaleString('pt-BR')}
                              </span>
                              <span className="text-amber-700">
                                Inválidos: {item.invalid_rows.toLocaleString('pt-BR')}
                              </span>
                              <span className="text-rose-700">
                                Duplicados: {item.duplicate_rows.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1 text-sm text-slate-600">
                              <span>Criada: {formatDateTime(item.created_at)}</span>
                              <span>Iniciada: {formatDateTime(item.started_at)}</span>
                              <span>Finalizada: {formatDateTime(item.finished_at)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Contatos importados</h2>
                  <p className="text-sm text-slate-600">
                    Consulte os contatos desta base com busca simples por e-mail, nome ou empresa.
                  </p>
                </div>

                <form onSubmit={handleContactsSearch} className="flex w-full max-w-md items-center gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Buscar por e-mail, nome ou empresa"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                  />
                  <button
                    type="submit"
                    disabled={isLoadingContacts}
                    className="rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Buscar
                  </button>
                </form>
              </div>

              {isLoadingContacts ? (
                <div className="px-6 py-16 text-center text-sm text-slate-500">
                  Carregando contatos...
                </div>
              ) : contactsError ? (
                <div className="px-6 py-16 text-center">
                  <h3 className="text-lg font-semibold text-slate-900">Erro ao carregar contatos</h3>
                  <p className="mt-2 text-sm text-slate-600">{contactsError}</p>
                </div>
              ) : contacts.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <h3 className="text-lg font-semibold text-slate-900">Nenhum contato encontrado</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {searchInput.trim()
                      ? 'Nenhum contato corresponde ao filtro informado.'
                      : 'Esta base ainda não possui contatos importados.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            E-mail
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Nome
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Empresa
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Telefone
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Cidade/UF
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Origem
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Criado em
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map((contact) => (
                          <tr key={contact.id} className="border-b border-slate-100 align-top">
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-slate-900">
                                  {contact.email_normalized}
                                </span>
                                {contact.email_original !== contact.email_normalized && (
                                  <span className="text-xs text-slate-500">{contact.email_original}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {contact.name?.trim() || '—'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {contact.company_name?.trim() || '—'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {contact.phone?.trim() || '—'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {[contact.city?.trim(), contact.state?.trim()].filter(Boolean).join('/') || '—'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {contact.validation_status || '—'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {contact.source || '—'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {formatDateTime(contact.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-600">
                      {contactsTotal.toLocaleString('pt-BR')} contatos no total. Página {contactsPage} de{' '}
                      {contactsTotalPages}.
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleContactsPageChange(contactsPage - 1)}
                        disabled={contactsPage <= 1 || isLoadingContacts}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => handleContactsPageChange(contactsPage + 1)}
                        disabled={contactsPage >= contactsTotalPages || isLoadingContacts}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
