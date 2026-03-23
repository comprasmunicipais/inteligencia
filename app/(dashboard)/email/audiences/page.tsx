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
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

const DEPARTMENT_OPTIONS = [
  'Saúde',
  'Educação',
  'Compras / Licitação',
  'Administração',
  'Financeiro',
];

const POPULATION_RANGE_OPTIONS = [
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

const PAGE_SIZE = 50;

function getMunicipalityData(municipalities: AudiencePreviewItem['municipalities']) {
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
        .order('state')
        .order('city');

      if (error) throw error;

      const municipalityOptions: MunicipalityOption[] = (data || []).map((item) => ({
        id: item.id,
        city: item.city || '',
        state: item.state || '',
        label: `${item.city} - ${item.state}`,
      }));

      setMunicipalities(municipalityOptions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFilters(false);
    }
  }

  async function loadAudiencePreview() {
    try {
      setLoadingResults(true);

      const params = new URLSearchParams();

      if (selectedState) params.set('state', selectedState);
      if (selectedMunicipalityId) params.set('municipalityId', selectedMunicipalityId);
      if (selectedPopulationRange) params.set('populationRange', selectedPopulationRange);
      if (selectedDepartment) params.set('department', selectedDepartment);
      if (strategicFilter) params.set('strategic', strategicFilter);
      if (minScore) params.set('minScore', minScore);
      if (emailSearch) params.set('emailSearch', emailSearch);

      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/email/audiences/preview?${params.toString()}`);
      const data: AudiencePreviewResponse = await res.json();

      setItems(data.items || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error(error);
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

  const filteredMunicipalities = useMemo(() => {
    if (!selectedState) return municipalities;
    return municipalities.filter((m) => m.state === selectedState);
  }, [municipalities, selectedState]);

  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <h1 className="text-2xl font-bold mb-4">Audiências</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

        <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
          <option value="">Estado</option>
          {BRAZILIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>

        <select value={selectedMunicipalityId} onChange={(e) => setSelectedMunicipalityId(e.target.value)}>
          <option value="">Município</option>
          {filteredMunicipalities.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>

        <select value={selectedPopulationRange} onChange={(e) => setSelectedPopulationRange(e.target.value)}>
          <option value="">Faixa Populacional</option>
          {POPULATION_RANGE_OPTIONS.map((p) => <option key={p}>{p}</option>)}
        </select>

        <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
          <option value="">Departamento</option>
          {DEPARTMENT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
        </select>

      </div>

      <div className="mb-4">
        {loadingResults ? 'Carregando...' : `${totalCount} resultados`}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Email</th>
            <th>Cidade</th>
            <th>UF</th>
            <th>Faixa</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const m = getMunicipalityData(item.municipalities);
            return (
              <tr key={item.id}>
                <td>{item.email}</td>
                <td>{m.city}</td>
                <td>{m.state}</td>
                <td>{m.populationRange}</td>
                <td>{item.priority_score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
