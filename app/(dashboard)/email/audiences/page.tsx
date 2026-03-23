'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type MunicipalityOption = {
  id: string;
  city: string;
  state: string;
  label: string;
};

type MunicipalityRelation =
  | {
      id: string;
      name: string | null;
      city: string | null;
      state: string | null;
      population_range?: string | null;
    }
  | {
      id: string;
      name: string | null;
      city: string | null;
      state: string | null;
      population_range?: string | null;
    }[];

type AudiencePreviewItem = {
  id: string;
  municipality_id: string;
  email: string;
  department_label: string | null;
  priority_score: number | null;
  is_strategic: boolean | null;
  source: string | null;
  municipalities: MunicipalityRelation | null;
};

type AudiencePreviewResponse = {
  items: AudiencePreviewItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

const supabase = createClient();

const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

const DEPARTMENT_OPTIONS = [
  'Saúde',
  'Educação',
  'Compras / Licitação',
  'Administração',
  'Financeiro',
];

const POPULATION_RANGE_OPTIONS = [
  'ATE 10.000',
  '10.001 A 15.000',
  '15.001 A 30.000',
  '30.001 A 50.000',
  '50.001 A 100.000',
  '100.001 A 500.000',
  'ACIMA DE 500.000',
];

const PAGE_SIZE = 50;

function getMunicipalityData(
  municipalities: AudiencePreviewItem['municipalities']
): {
  city: string | null;
  state: string | null;
  populationRange: string | null;
} {
  if (!municipalities) {
    return { city: null, state: null, populationRange: null };
  }

  if (Array.isArray(municipalities)) {
    const first = municipalities[0];
    return {
      city: first?.city ?? null,
      state: first?.state ?? null,
      populationRange: first?.population_range ?? null,
    };
  }

  return {
    city: municipalities.city ?? null,
    state: municipalities.state ?? null,
    populationRange: municipalities.population_range ?? null,
  };
}

export default function EmailAudiencesPage() {
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  const [items, setItems] = useState<AudiencePreviewItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState('');
  const [selectedPopulationRange, setSelectedPopulationRange] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [strategicFilter, setStrategicFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [minScore, setMinScore] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [page, setPage] = useState(1);

  async function loadFilterOptions() {
    try {
      setLoadingFilters(true);

      const { data, error } = await supabase
        .from('municipalities')
        .select('id, city, state')
        .order('state', { ascending: true })
        .order('city', { ascending: true });

      if (error) {
        throw error;
      }

      const municipalityOptions: MunicipalityOption[] = (data || []).map((item) => ({
        id: item.id,
        city: item.city || '',
        state: item.state || '',
        label: `${item.city || 'Sem cidade'} - ${item.state || ''}`,
      }));

      setMunicipalities(municipalityOptions);
    } catch (error) {
      console.error('Erro ao carregar filtros de audiências:', error);
    } finally {
      setLoadingFilters(false);
    }
  }

  async function loadAudiencePreview() {
    try {
      setLoadingResults(true);

      const params = new URLSearchParams();

      if (selectedState) {
        params.set('state', selectedState);
      }

      if (selectedMunicipalityId) {
        params.set('municipalityId', selectedMunicipalityId);
      }

      if (selectedPopulationRange) {
        params.set('populationRange', selectedPopulationRange);
      }

      if (selectedDepartment) {
        params.set('department', selectedDepartment);
      }

      if (strategicFilter) {
        params.set('strategic', strategicFilter);
      }

      if (minScore.trim() !== '') {
        params.set('minScore', minScore.trim());
      }

      if (emailSearch.trim() !== '') {
        params.set('emailSearch', emailSearch.trim());
      }

      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const response = await fetch(`/api/email/audiences/preview?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const result: AudiencePreviewResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar prévia da audiência.');
      }

      setItems(result.items || []);
      setTotalCount(result.total || 0);
    } catch (error) {
      console.error('Erro ao carregar preview da audiência:', error);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoadingResults(false);
    }
  }

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadAudiencePreview();
  }, [
    page,
    selectedState,
    selectedMunicipalityId,
    selectedPopulationRange,
    selectedDepartment,
    strategicFilter,
    minScore,
    emailSearch,
  ]);

  useEffect(() => {
    setSelectedMunicipalityId('');
    setPage(1);
  }, [selectedState]);

  const filteredMunicipalities = useMemo(() => {
    if (!selectedState) {
      return municipalities;
    }

    return municipalities.filter((item) => item.state === selectedState);
  }, [municipalities, selectedState]);

  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  function clearFilters() {
    setSelectedState('');
    setSelectedMunicipalityId('');
    setSelectedPopulationRange('');
    setSelectedDepartment('');
    setStrategicFilter('all');
    setMinScore('');
    setEmailSearch('');
    setPage(1);
  }

  function handleDepartmentChange(value: string) {
    setSelectedDepartment(value);
    setPage(1);
  }

  function handleMunicipalityChange(value: string) {
    setSelectedMunicipalityId(value);
    setPage(1);
  }

  function handlePopulationRangeChange(value: string) {
    setSelectedPopulationRange(value);
    setPage(1);
  }

  function handleStrategicChange(value: 'all' | 'yes' | 'no') {
    setStrategicFilter(value);
    setPage(1);
  }

  function handleMinScoreChange(value: string) {
    setMinScore(value);
    setPage(1);
  }

  function handleEmailSearchChange(value: string) {
    setEmailSearch(value);
    setPage(1);
  }

  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Audiências</h1>
          <p className="text-sm text-slate-600">
            Filtre a base de e-mails para montar o público dos seus futuros disparos.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Filtros da audiência</h2>
              <p className="text-sm text-slate-600">
                Use os filtros abaixo para segmentar toda a base de e-mails.
              </p>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="size-4" />
              Limpar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="state" className="text-sm font-medium text-slate-700">
                Estado
              </label>
              <select
                id="state"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                disabled={loadingFilters}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
              >
                <option value="">Todos os estados</option>
                {BRAZILIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="municipality" className="text-sm font-medium text-slate-700">
                Município
              </label>
              <select
                id="municipality"
                value={selectedMunicipalityId}
                onChange={(e) => handleMunicipalityChange(e.target.value)}
                disabled={loadingFilters}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
              >
                <option value="">Todos os municípios</option>
                {filteredMunicipalities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="population-range" className="text-sm font-medium text-slate-700">
                Faixa populacional
              </label>
              <select
                id="population-range"
                value={selectedPopulationRange}
                onChange={(e) => handlePopulationRangeChange(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
              >
                <option value="">Todas as faixas</option>
                {POPULATION_RANGE_OPTIONS.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="department" className="text-sm font-medium text-slate-700">
                Departamento
              </label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
              >
                <option value="">Todos os departamentos</option>
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="strategic" className="text-sm font-medium text-slate-700">
                Estratégico
              </label>
              <select
                id="strategic"
                value={strategicFilter}
                onChange={(e) => handleStrategicChange(e.target.value as 'all' | 'yes' | 'no')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
              >
                <option value="all">Todos</option>
                <option value="yes">Somente estratégicos</option>
                <option value="no">Somente não estratégicos</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="score" className="text-sm font-medium text-slate-700">
                Score mínimo
              </label>
              <input
                id="score"
                type="number"
                min="0"
                value={minScore}
                onChange={(e) => handleMinScoreChange(e.target.value)}
                placeholder="Ex.: 20"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
              />
            </div>

            <div className="flex flex-col gap-2 xl:col-span-2">
              <label htmlFor="email-search" className="text-sm font-medium text-slate-700">
                Buscar no e-mail
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email-search"
                  type="text"
                  value={emailSearch}
                  onChange={(e) => handleEmailSearchChange(e.target.value)}
                  placeholder="Ex.: saude, adm, compras"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-50">
                <Users className="size-6 text-[#0f49bd]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Prévia da audiência</h2>
                <p className="text-sm text-slate-600">
                  Exibindo resultados paginados da base completa.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
              {loadingResults ? 'Calculando...' : `${totalCount.toLocaleString('pt-BR')} e-mails encontrados`}
            </div>
          </div>

          {loadingResults ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Loader2 className="size-5 animate-spin" />
                Carregando prévia da audiência...
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
                <Users className="size-8 text-[#0f49bd]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Nenhum e-mail encontrado
              </h3>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Ajuste os filtros para visualizar uma audiência com resultados.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          E-mail
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Município
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          UF
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Faixa Populacional
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Departamento
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Score
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Estratégico
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {items.map((item) => {
                        const municipality = getMunicipalityData(item.municipalities);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                              {item.email}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {municipality.city || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {municipality.state || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {municipality.populationRange || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {item.department_label || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {item.priority_score ?? 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {item.is_strategic ? 'Sim' : 'Não'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="text-sm text-slate-600">
                  Página {page} de {totalPages}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
