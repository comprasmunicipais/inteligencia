'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type MunicipalityEmailRow = {
  id: string;
  email: string;
  department_label: string | null;
  priority_score: number | null;
  is_strategic: boolean | null;
  source: string | null;
  municipalities: {
    id: string;
    name: string | null;
    city: string | null;
    state: string | null;
  } | null;
};

type MunicipalityOption = {
  id: string;
  city: string;
  state: string;
  label: string;
};

type DepartmentKey =
  | 'saude'
  | 'educacao'
  | 'compras_licitacao'
  | 'administracao'
  | 'financeiro';

type DepartmentOption = {
  key: DepartmentKey;
  label: string;
  terms: string[];
};

type AudienceEmailRow = MunicipalityEmailRow & {
  inferred_department: string | null;
};

const supabase = createClient();

const DEPARTMENT_OPTIONS: DepartmentOption[] = [
  {
    key: 'saude',
    label: 'Saúde',
    terms: [
      'saude',
      'secsaude',
      'sms',
      'ubs',
      'secretariadesaude',
      'hospital',
      'semus',
      'semsa',
      'sus',
      'vigilancia',
    ],
  },
  {
    key: 'educacao',
    label: 'Educação',
    terms: [
      'educacao',
      'escola',
      'creche',
      'semed',
      'sme',
      'seceducacao',
      'secretariadeeducacao',
      'ensino',
    ],
  },
  {
    key: 'compras_licitacao',
    label: 'Compras / Licitação',
    terms: [
      'compras',
      'licitacao',
      'licitacoes',
      'contratos',
      'cpl',
      'pregao',
      'pregoeiro',
      'cotacao',
    ],
  },
  {
    key: 'administracao',
    label: 'Administração',
    terms: [
      'administracao',
      'gabinete',
      'rh',
      'semad',
      'juridico',
      'dp',
      'pessoal',
      'recursoshumanos',
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    terms: [
      'sefin',
      'financas',
      'fazenda',
      'financeiro',
      'arrecadacao',
      'tributos',
      'contabilidade',
      'tesouraria',
    ],
  },
];

function normalizeText(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9@._-]/g, '')
    .toLowerCase()
    .trim();
}

function inferDepartment(email: string, departmentLabel: string | null) {
  const normalizedEmail = normalizeText(email);
  const normalizedDepartmentLabel = normalizeText(departmentLabel);

  for (const department of DEPARTMENT_OPTIONS) {
    const matchedInLabel = department.terms.some((term) =>
      normalizedDepartmentLabel.includes(normalizeText(term))
    );

    if (matchedInLabel) {
      return department.label;
    }

    const matchedInEmail = department.terms.some((term) =>
      normalizedEmail.includes(normalizeText(term))
    );

    if (matchedInEmail) {
      return department.label;
    }
  }

  if (departmentLabel && departmentLabel.trim() !== '') {
    return departmentLabel.trim();
  }

  return null;
}

export default function EmailAudiencesPage() {
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  const [emails, setEmails] = useState<AudienceEmailRow[]>([]);
  const [rawEmails, setRawEmails] = useState<MunicipalityEmailRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [states, setStates] = useState<string[]>([]);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [strategicFilter, setStrategicFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [minScore, setMinScore] = useState('');
  const [emailSearch, setEmailSearch] = useState('');

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

      const uniqueStates = Array.from(
        new Set(
          municipalityOptions
            .map((item) => item.state)
            .filter((state) => state && state.trim() !== '')
        )
      ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

      setMunicipalities(municipalityOptions);
      setStates(uniqueStates);
    } catch (error) {
      console.error('Erro ao carregar filtros de audiências:', error);
    } finally {
      setLoadingFilters(false);
    }
  }

  async function loadAudiencePreview() {
    try {
      setLoadingResults(true);

      let municipalityIds: string[] | null = null;

      if (selectedState || selectedMunicipalityId) {
        let municipalityQuery = supabase.from('municipalities').select('id');

        if (selectedState) {
          municipalityQuery = municipalityQuery.eq('state', selectedState);
        }

        if (selectedMunicipalityId) {
          municipalityQuery = municipalityQuery.eq('id', selectedMunicipalityId);
        }

        const { data: municipalityData, error: municipalityError } = await municipalityQuery;

        if (municipalityError) {
          throw municipalityError;
        }

        municipalityIds = (municipalityData || []).map((item) => item.id);

        if (municipalityIds.length === 0) {
          setRawEmails([]);
          setEmails([]);
          setTotalCount(0);
          return;
        }
      }

      let countQuery = supabase
        .from('municipality_emails')
        .select('id', { count: 'exact', head: true });

      let dataQuery = supabase
        .from('municipality_emails')
        .select(`
          id,
          email,
          department_label,
          priority_score,
          is_strategic,
          source,
          municipalities:municipality_id (
            id,
            name,
            city,
            state
          )
        `)
        .limit(500)
        .order('priority_score', { ascending: false, nullsFirst: false })
        .order('email', { ascending: true });

      if (municipalityIds) {
        countQuery = countQuery.in('municipality_id', municipalityIds);
        dataQuery = dataQuery.in('municipality_id', municipalityIds);
      }

      if (strategicFilter === 'yes') {
        countQuery = countQuery.eq('is_strategic', true);
        dataQuery = dataQuery.eq('is_strategic', true);
      }

      if (strategicFilter === 'no') {
        countQuery = countQuery.eq('is_strategic', false);
        dataQuery = dataQuery.eq('is_strategic', false);
      }

      if (minScore.trim() !== '' && !Number.isNaN(Number(minScore))) {
        countQuery = countQuery.gte('priority_score', Number(minScore));
        dataQuery = dataQuery.gte('priority_score', Number(minScore));
      }

      if (emailSearch.trim() !== '') {
        countQuery = countQuery.ilike('email', `%${emailSearch.trim()}%`);
        dataQuery = dataQuery.ilike('email', `%${emailSearch.trim()}%`);
      }

      const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
        countQuery,
        dataQuery,
      ]);

      if (countError) {
        throw countError;
      }

      if (dataError) {
        throw dataError;
      }

      const fetchedRows = ((data as MunicipalityEmailRow[]) || []).map((item) => ({
        ...item,
        inferred_department: inferDepartment(item.email, item.department_label),
      }));

      setRawEmails((data as MunicipalityEmailRow[]) || []);

      const filteredRows =
        selectedDepartment.trim() === ''
          ? fetchedRows
          : fetchedRows.filter((item) => item.inferred_department === selectedDepartment);

      setEmails(filteredRows);
      setTotalCount(selectedDepartment.trim() === '' ? count || 0 : filteredRows.length);
    } catch (error) {
      console.error('Erro ao carregar preview da audiência:', error);
      setRawEmails([]);
      setEmails([]);
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
  }, [selectedState, selectedMunicipalityId, selectedDepartment, strategicFilter, minScore, emailSearch]);

  useEffect(() => {
    setSelectedMunicipalityId('');
  }, [selectedState]);

  const filteredMunicipalities = useMemo(() => {
    if (!selectedState) {
      return municipalities;
    }

    return municipalities.filter((item) => item.state === selectedState);
  }, [municipalities, selectedState]);

  const availableDepartments = useMemo(() => {
    const values = new Set<string>();

    for (const item of rawEmails) {
      const inferredDepartment = inferDepartment(item.email, item.department_label);

      if (inferredDepartment && inferredDepartment.trim() !== '') {
        values.add(inferredDepartment);
      }
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rawEmails]);

  function clearFilters() {
    setSelectedState('');
    setSelectedMunicipalityId('');
    setSelectedDepartment('');
    setStrategicFilter('all');
    setMinScore('');
    setEmailSearch('');
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
                Use os filtros abaixo para visualizar os e-mails que compõem a audiência.
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                {states.map((state) => (
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
                onChange={(e) => setSelectedMunicipalityId(e.target.value)}
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
              <label htmlFor="department" className="text-sm font-medium text-slate-700">
                Departamento
              </label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
              >
                <option value="">Todos os departamentos</option>
                {availableDepartments.map((department) => (
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
                onChange={(e) => setStrategicFilter(e.target.value as 'all' | 'yes' | 'no')}
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
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="Ex.: 20"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email-search" className="text-sm font-medium text-slate-700">
                Buscar no e-mail
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email-search"
                  type="text"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
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
                  Mostrando os primeiros 500 registros da seleção atual.
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
          ) : emails.length === 0 ? (
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
                    {emails.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {item.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {item.municipalities?.city || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {item.municipalities?.state || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {item.inferred_department || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {item.priority_score ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {item.is_strategic ? 'Sim' : 'Não'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
