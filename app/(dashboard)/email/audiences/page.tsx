'use client';

import { useEffect, useState, useRef } from 'react';
import { ArrowRight, RefreshCw, Search, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type MunicipalityOption = {
  id: string;
  city: string;
  state: string;
  label: string;
};

type MunicipalityPopulationRangeRow = {
  population_range: string | null;
};

type FilterSegment = {
  region: string;
  state: string;
  municipalityId: string;
  populationRange: string;
  department: string;
  strategic: 'all' | 'yes' | 'no';
  minScore: string;
  emailSearch: string;
};

type AudiencePreviewResponse = {
  items: Array<{
    id: string;
    municipality_id: string;
    email: string;
    department_label: string | null;
    priority_score: number | null;
    is_strategic: boolean | null;
    source: string | null;
    municipalities:
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
        }[]
      | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

const REGIONS: Record<string, string[]> = {
  Norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  Sudeste: ['ES', 'MG', 'RJ', 'SP'],
  Sul: ['PR', 'RS', 'SC'],
};

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
  'Obras',
  'Prefeito',
  'Institucional',
  'Social',
  'Meio Ambiente',
  'Comunicacao',
  'Ouvidoria',
  'Planejamento',
  'RH',
  'TI',
  'Esporte e Cultura',
  'Juridico',
  'Camara Municipal',
  'Camaras Sul',
  'Camaras Sudeste',
  'Camaras Centro-Oeste',
  'Camaras Norte',
  'Camaras Nordeste',
];

const PAGE_SIZE = 50;

const DEFAULT_SEGMENT: FilterSegment = {
  region: '',
  state: '',
  municipalityId: '',
  populationRange: '',
  department: '',
  strategic: 'all',
  minScore: '',
  emailSearch: '',
};

function orderPopulationRanges(ranges: string[]) {
  const preferredOrder = [
    'Menor que 15.000',
    'Entre 15.001 e 30.000',
    'Entre 30.001 e 50.000',
    'Entre 50.001 e 100.000',
    'Entre 100.001 e 200.000',
    'Entre 200.001 e 300.000',
    'Entre 300.001 e 500.000',
    'Entre 500.001 e 1.000.000',
    'Maior que Um Milhão',
  ];

  return [...ranges].sort((a, b) => {
    const indexA = preferredOrder.indexOf(a);
    const indexB = preferredOrder.indexOf(b);

    if (indexA === -1 && indexB === -1) {
      return a.localeCompare(b, 'pt-BR');
    }

    if (indexA === -1) {
      return 1;
    }

    if (indexB === -1) {
      return -1;
    }

    return indexA - indexB;
  });
}

export default function EmailAudiencesPage() {
  const supabase = useRef(createClient()).current;
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  const [totalCount, setTotalCount] = useState(0);

  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [populationRanges, setPopulationRanges] = useState<string[]>([]);
  const [segments, setSegments] = useState<FilterSegment[]>([{ ...DEFAULT_SEGMENT }]);

  async function loadFilterOptions() {
    try {
      setLoadingFilters(true);

      const [
        { data: municipalityData, error: municipalityError },
        { data: populationData, error: populationError },
      ] = await Promise.all([
        supabase
          .from('municipalities')
          .select('id, city, state')
          .order('city', { ascending: true })
          .limit(6000),
        supabase
          .from('municipalities')
          .select('population_range')
          .not('population_range', 'is', null),
      ]);

      if (municipalityError) {
        throw municipalityError;
      }

      if (populationError) {
        throw populationError;
      }

      const municipalityOptions: MunicipalityOption[] = (municipalityData || []).map((item) => ({
        id: item.id,
        city: item.city || '',
        state: item.state || '',
        label: `${item.city || 'Sem cidade'} - ${item.state || ''}`,
      }));

      const uniquePopulationRanges = Array.from(
        new Set(
          ((populationData as MunicipalityPopulationRangeRow[]) || [])
            .map((item) => item.population_range)
            .filter((value): value is string => Boolean(value && value.trim() !== ''))
        )
      );

      setMunicipalities(municipalityOptions);
      setPopulationRanges(orderPopulationRanges(uniquePopulationRanges));
    } catch (error) {
      console.error('Erro ao carregar filtros de audiências:', error);
    } finally {
      setLoadingFilters(false);
    }
  }

  async function loadAudiencePreview() {
    try {
      setLoadingResults(true);

      const response = await fetch('/api/email/audiences/preview', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          page: 1,
          pageSize: PAGE_SIZE,
        }),
      });

      const result: AudiencePreviewResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar prévia da audiência.');
      }

      setTotalCount(result.total || 0);
    } catch (error) {
      console.error('Erro ao carregar preview da audiência:', error);
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
  }, [segments]);

  function clearFilters() {
    setSegments([{ ...DEFAULT_SEGMENT }]);
  }

  function handleAdvanceStep() {
    window.location.href = '/email/campaigns';
  }

  function updateSegment(index: number, key: keyof FilterSegment, value: string) {
    setSegments((current) =>
      current.map((segment, segmentIndex) => {
        if (segmentIndex !== index) return segment;

        const next = { ...segment, [key]: value };
        if (key === 'region') {
          next.state = '';
          next.municipalityId = '';
        }
        if (key === 'state') {
          next.municipalityId = '';
        }
        return next;
      }),
    );
  }

  function addSegment() {
    setSegments((current) => [...current, { ...DEFAULT_SEGMENT }]);
  }

  function removeSegment(index: number) {
    setSegments((current) => current.filter((_, segmentIndex) => segmentIndex !== index));
  }

  function getFilteredMunicipalities(segment: FilterSegment) {
    if (segment.state) {
      return municipalities.filter((item) => item.state === segment.state);
    }
    if (segment.region) {
      const regionStates = REGIONS[segment.region] ?? [];
      return municipalities.filter((item) => regionStates.includes(item.state));
    }
    return municipalities;
  }

  const labelClass = 'text-sm font-medium text-slate-700';
  const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]';

  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Audiências</h1>
          <p className="text-sm text-slate-600">
            Defina os filtros da audiência e visualize o volume disponível para a campanha.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Filtros da audiência</h2>
              <p className="text-sm text-slate-600">
                Use os filtros abaixo para segmentar a base de e-mails antes de seguir para a campanha.
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

          <div className="flex flex-col gap-4">
            {segments.map((segment, index) => {
              const filteredMunicipalities = getFilteredMunicipalities(segment);

              return (
                <div key={index} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Segmento {index + 1}</h3>
                      <p className="text-xs text-slate-500">
                        Os segmentos são combinados por união de e-mails.
                      </p>
                    </div>

                    {segments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSegment(index)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                        aria-label={`Remover segmento ${index + 1}`}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Região</label>
                      <select
                        value={segment.region}
                        onChange={(e) => updateSegment(index, 'region', e.target.value)}
                        disabled={loadingFilters}
                        className={selectClass}
                      >
                        <option value="">Todas as regiões</option>
                        {Object.keys(REGIONS).map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Estado</label>
                      <select
                        value={segment.state}
                        onChange={(e) => updateSegment(index, 'state', e.target.value)}
                        disabled={loadingFilters}
                        className={selectClass}
                      >
                        <option value="">Todos os estados</option>
                        {(segment.region ? (REGIONS[segment.region] ?? []) : BRAZILIAN_STATES).map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Município</label>
                      <select
                        value={segment.municipalityId}
                        onChange={(e) => updateSegment(index, 'municipalityId', e.target.value)}
                        disabled={loadingFilters}
                        className={selectClass}
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
                      <label className={labelClass}>Faixa populacional</label>
                      <select
                        value={segment.populationRange}
                        onChange={(e) => updateSegment(index, 'populationRange', e.target.value)}
                        disabled={loadingFilters}
                        className={selectClass}
                      >
                        <option value="">Todas as faixas</option>
                        {populationRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Departamento</label>
                      <select
                        value={segment.department}
                        onChange={(e) => updateSegment(index, 'department', e.target.value)}
                        className={selectClass}
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
                      <label className={labelClass}>Estratégico</label>
                      <select
                        value={segment.strategic}
                        onChange={(e) => updateSegment(index, 'strategic', e.target.value)}
                        className={selectClass}
                      >
                        <option value="all">Todos</option>
                        <option value="yes">Somente estratégicos</option>
                        <option value="no">Somente não estratégicos</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Score mínimo</label>
                      <input
                        type="number"
                        min="0"
                        value={segment.minScore}
                        onChange={(e) => updateSegment(index, 'minScore', e.target.value)}
                        placeholder="Ex.: 20"
                        className={selectClass}
                      />
                    </div>

                    <div className="flex flex-col gap-2 xl:col-span-2">
                      <label className={labelClass}>Buscar no e-mail</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={segment.emailSearch}
                          onChange={(e) => updateSegment(index, 'emailSearch', e.target.value)}
                          placeholder="Ex.: saude, adm, compras"
                          className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addSegment}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              + Adicionar segmento
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-blue-50">
                <Users className="size-7 text-[#0f49bd]" />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Resumo da audiência</h2>
                <p className="text-sm text-slate-600">
                  Esta etapa mostra quantos e-mails estão disponíveis com os filtros selecionados.
                </p>

                <div className="mt-2">
                  {loadingResults ? (
                    <div className="text-sm font-medium text-slate-600">
                      Calculando volume da audiência...
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-[#0f172a]">
                      {totalCount.toLocaleString('pt-BR')}
                    </div>
                  )}
                  <div className="text-sm text-slate-600">
                    e-mails únicos disponíveis para esta segmentação
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto">
              <button
                type="button"
                onClick={handleAdvanceStep}
                disabled={loadingResults || totalCount === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f49bd] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Avançar para a próxima etapa
                <ArrowRight className="size-4" />
              </button>

              <p className="text-center text-xs text-slate-500 lg:text-right">
                O próximo passo será conectar esta audiência ao fluxo de criação da campanha.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
