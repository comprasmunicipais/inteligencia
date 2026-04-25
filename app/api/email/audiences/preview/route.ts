import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type FilterSegment = {
  region?: string;
  state?: string;
  municipalityId?: string;
  populationRange?: string;
  department?: string;
  strategic?: 'all' | 'yes' | 'no';
  minScore?: string;
  emailSearch?: string;
};

type AudiencePreviewPayload = FilterSegment & {
  segments?: FilterSegment[];
  page?: number;
  pageSize?: number;
};

type AudienceItem = {
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
};

const DEPARTMENT_RULES = [
  { label: 'Saúde', terms: ['saude', 'secsaude', 'sms', 'ubs', 'secretariadesaude', 'hospital', 'semus', 'semsa', 'sus', 'vigilancia'] },
  { label: 'Educação', terms: ['educacao', 'escola', 'creche', 'semed', 'sme', 'seceducacao', 'secretariadeeducacao', 'ensino'] },
  { label: 'Compras / Licitação', terms: ['compras', 'licitacao', 'licitacoes', 'contratos', 'cpl', 'pregao', 'pregoeiro', 'cotacao'] },
  { label: 'Administração', terms: ['administracao', 'gabinete', 'rh', 'semad', 'juridico', 'dp', 'pessoal', 'recursoshumanos'] },
  { label: 'Financeiro', terms: ['sefin', 'financas', 'fazenda', 'financeiro', 'arrecadacao', 'tributos', 'contabilidade', 'tesouraria'] },
  { label: 'Obras', terms: ['obras', 'engenharia', 'infra', 'infraestrutura', 'semob', 'semusp', 'urbanismo', 'seinfra'] },
  { label: 'Prefeito', terms: ['prefeito', 'viceprefeito', 'chefedegabinete'] },
  { label: 'Institucional', terms: ['prefeitura', 'contato'] },
  { label: 'Social', terms: ['assistenciasocial', 'social', 'cras', 'creas', 'acaosocial', 'fundosocial', 'bolsafamilia'] },
  { label: 'Meio Ambiente', terms: ['meioambiente', 'agricultura', 'defesacivil', 'ambiental', 'ambiente'] },
  { label: 'Comunicacao', terms: ['comunicacao', 'imprensa', 'ascom', 'secom'] },
  { label: 'Ouvidoria', terms: ['ouvidoria', 'procon', 'sic', 'faleconosco', 'atendimento'] },
  { label: 'Planejamento', terms: ['planejamento', 'seplan', 'projetos', 'convenios', 'desenvolvimento'] },
  { label: 'RH', terms: ['recursoshumanos', 'rh', 'pessoal', 'dp'] },
  { label: 'TI', terms: ['informatica', 'ti', 'cpd'] },
  { label: 'Esporte e Cultura', terms: ['esporte', 'esportes', 'cultura', 'turismo', 'biblioteca', 'lazer'] },
  { label: 'Juridico', terms: ['procuradoria', 'controleinterno', 'controladoria', 'fiscalizacao'] },
  { label: 'Camara Municipal', terms: ['camara', 'legislativo', 'vereador'] },
];

const REGIOES: Record<string, string[]> = {
  'Camaras Sul': ['PR', 'SC', 'RS'],
  'Camaras Sudeste': ['SP', 'RJ', 'MG', 'ES'],
  'Camaras Centro-Oeste': ['MT', 'MS', 'GO', 'DF'],
  'Camaras Norte': ['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'],
  'Camaras Nordeste': ['BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE', 'PI', 'MA'],
};

const REGIONS: Record<string, string[]> = {
  Norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  Sudeste: ['ES', 'MG', 'RJ', 'SP'],
  Sul: ['PR', 'RS', 'SC'],
};

const DEFAULT_SEGMENT: Required<FilterSegment> = {
  region: '',
  state: '',
  municipalityId: '',
  populationRange: '',
  department: '',
  strategic: 'all',
  minScore: '',
  emailSearch: '',
};

function getDepartmentTerms(department: string | null) {
  if (!department) return [];

  const found = DEPARTMENT_RULES.find((item) => item.label === department);
  return found ? found.terms : [];
}

function normalizeSegments(payload: AudiencePreviewPayload) {
  if (Array.isArray(payload.segments) && payload.segments.length > 0) {
    return payload.segments.map((segment) => ({ ...DEFAULT_SEGMENT, ...segment }));
  }

  return [{ ...DEFAULT_SEGMENT, ...payload }];
}

function parseSearchParams(searchParams: URLSearchParams): AudiencePreviewPayload {
  return {
    region: searchParams.get('region') || '',
    state: searchParams.get('state') || '',
    municipalityId: searchParams.get('municipalityId') || '',
    populationRange: searchParams.get('populationRange') || '',
    department: searchParams.get('department') || '',
    strategic: (searchParams.get('strategic') || 'all') as FilterSegment['strategic'],
    minScore: searchParams.get('minScore') || '',
    emailSearch: searchParams.get('emailSearch') || '',
    page: Number(searchParams.get('page') || '1'),
    pageSize: Number(searchParams.get('pageSize') || '50'),
  };
}

function applySegmentFilters(query: any, segment: Required<FilterSegment>) {
  const regionStates = !segment.state && segment.region ? (REGIONS[segment.region] ?? []) : [];
  const regionStatesForCamaras = REGIOES[segment.department] ?? [];
  const departmentTerms = getDepartmentTerms(segment.department);

  if (segment.state) {
    query = query.eq('state_source', segment.state);
  } else if (regionStates.length > 0) {
    query = query.in('state_source', regionStates);
  }

  if (segment.populationRange) {
    query = query.eq('population_range', segment.populationRange);
  }

  if (segment.municipalityId) {
    query = query.eq('municipality_id', segment.municipalityId);
  }

  if (segment.strategic === 'yes') {
    query = query.eq('is_strategic', true);
  }

  if (segment.strategic === 'no') {
    query = query.eq('is_strategic', false);
  }

  if (segment.minScore.trim() !== '' && !Number.isNaN(Number(segment.minScore))) {
    query = query.gte('priority_score', Number(segment.minScore));
  }

  if (segment.emailSearch.trim() !== '') {
    query = query.ilike('email', `%${segment.emailSearch.trim()}%`);
  }

  if (regionStatesForCamaras.length > 0) {
    query = query
      .eq('department_label', 'Camara Municipal')
      .in('state_source', regionStatesForCamaras);
  } else if (departmentTerms.length > 0) {
    const orExpression = departmentTerms.flatMap((term) => [
      `email.ilike.%${term}%`,
      `department_label.ilike.%${term}%`,
    ]).join(',');
    query = query.or(orExpression);
  }

  return query;
}

async function buildPreviewResponse(payload: AudiencePreviewPayload) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const page = Math.max(Number(payload.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(payload.pageSize) || 50, 1), 200);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const segments = normalizeSegments(payload);

  const allRows: AudienceItem[] = [];

  for (const segment of segments) {
    let query = supabase.from('municipality_emails').select(`
        id,
        municipality_id,
        email,
        department_label,
        priority_score,
        is_strategic,
        source,
        municipalities:municipality_id (
          id,
          name,
          city,
          state,
          population_range
        )
      `);

    query = applySegmentFilters(query, segment);

    const { data, error } = await query
      .order('priority_score', { ascending: false, nullsFirst: false })
      .order('email', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    allRows.push(...((data || []) as AudienceItem[]));
  }

  const dedupedMap = new Map<string, AudienceItem>();
  for (const row of allRows) {
    if (!dedupedMap.has(row.email)) {
      dedupedMap.set(row.email, row);
    }
  }

  const dedupedItems = Array.from(dedupedMap.values()).sort((a, b) => {
    const scoreA = a.priority_score ?? -1;
    const scoreB = b.priority_score ?? -1;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return a.email.localeCompare(b.email, 'pt-BR');
  });

  return NextResponse.json({
    items: dedupedItems.slice(from, to + 1),
    total: dedupedItems.length,
    page,
    pageSize,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    return await buildPreviewResponse(parseSearchParams(searchParams));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao gerar preview da audiência.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AudiencePreviewPayload;
    return await buildPreviewResponse(payload);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao gerar preview da audiência.' },
      { status: 500 }
    );
  }
}
