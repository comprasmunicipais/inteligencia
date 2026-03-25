'use client';

import { useMemo, useState } from 'react';
import { Edit, Trash2, Plus, Search, Globe, RefreshCw } from 'lucide-react';

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
  const [sources] = useState<OpportunitySource[]>(initialSources);
  const [query, setQuery] = useState('');

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

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Plus className="size-4" />
          Nova Fonte
        </button>
      </div>

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
    </div>
  );
}
