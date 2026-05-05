import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEPARTMENT_RULES = [
  {
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
  {
    label: 'Obras',
    terms: [
      'obras',
      'engenharia',
      'infra',
      'infraestrutura',
      'semob',
      'semusp',
      'urbanismo',
      'seinfra',
    ],
  },
  {
    label: 'Prefeito',
    terms: [
      'prefeito',
      'viceprefeito',
      'chefedegabinete',
    ],
  },
  {
    label: 'Institucional',
    terms: [
      'prefeitura',
      'contato',
    ],
  },
  {
    label: 'Social',
    terms: [
      'assistenciasocial',
      'social',
      'cras',
      'creas',
      'acaosocial',
      'fundosocial',
      'bolsafamilia',
    ],
  },
  {
    label: 'Meio Ambiente',
    terms: [
      'meioambiente',
      'agricultura',
      'defesacivil',
      'ambiental',
      'ambiente',
    ],
  },
  {
    label: 'Comunicacao',
    terms: [
      'comunicacao',
      'imprensa',
      'ascom',
      'secom',
    ],
  },
  {
    label: 'Ouvidoria',
    terms: [
      'ouvidoria',
      'procon',
      'sic',
      'faleconosco',
      'atendimento',
    ],
  },
  {
    label: 'Planejamento',
    terms: [
      'planejamento',
      'seplan',
      'projetos',
      'convenios',
      'desenvolvimento',
    ],
  },
  {
    label: 'RH',
    terms: [
      'recursoshumanos',
      'rh',
      'pessoal',
      'dp',
    ],
  },
  {
    label: 'TI',
    terms: [
      'informatica',
      'ti',
      'cpd',
    ],
  },
  {
    label: 'Esporte e Cultura',
    terms: [
      'esporte',
      'esportes',
      'cultura',
      'turismo',
      'biblioteca',
      'lazer',
    ],
  },
  {
    label: 'Juridico',
    terms: [
      'procuradoria',
      'controleinterno',
      'controladoria',
      'fiscalizacao',
    ],
  },
  {
    label: 'Camara Municipal',
    terms: [
      'camara',
      'legislativo',
      'vereador',
    ],
  },
];

const REGIOES: Record<string, string[]> = {
  'Camaras Sul': ['PR', 'SC', 'RS'],
  'Camaras Sudeste': ['SP', 'RJ', 'MG', 'ES'],
  'Camaras Centro-Oeste': ['MT', 'MS', 'GO', 'DF'],
  'Camaras Norte': ['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'],
  'Camaras Nordeste': ['BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE', 'PI', 'MA'],
};

function getDepartmentTerms(department: string | null) {
  if (!department) return [];

  const found = DEPARTMENT_RULES.find((item) => item.label === department);
  return found ? found.terms : [];
}

function applyAudienceFilters(
  query: any,
  params: {
    state: string;
    regionStates: string[];
    populationRange: string;
    municipalityId: string;
    strategic: string;
    minScoreRaw: string;
    emailSearch: string;
    department: string;
  },
) {
  let nextQuery = query;

  if (params.state) {
    nextQuery = nextQuery.eq('state_source', params.state);
  } else if (params.regionStates.length > 0) {
    nextQuery = nextQuery.in('state_source', params.regionStates);
  }

  if (params.populationRange) {
    nextQuery = nextQuery.eq('population_range', params.populationRange);
  }

  if (params.municipalityId) {
    nextQuery = nextQuery.eq('municipality_id', params.municipalityId);
  }

  if (params.strategic === 'yes') {
    nextQuery = nextQuery.eq('is_strategic', true);
  }

  if (params.strategic === 'no') {
    nextQuery = nextQuery.eq('is_strategic', false);
  }

  if (params.minScoreRaw.trim() !== '' && !Number.isNaN(Number(params.minScoreRaw))) {
    nextQuery = nextQuery.gte('priority_score', Number(params.minScoreRaw));
  }

  if (params.emailSearch.trim() !== '') {
    nextQuery = nextQuery.ilike('email', `%${params.emailSearch.trim()}%`);
  }

  const regionStatesForCamaras = REGIOES[params.department] ?? [];
  const departmentTerms = getDepartmentTerms(params.department);

  if (regionStatesForCamaras.length > 0) {
    nextQuery = nextQuery
      .eq('department_label', 'Camara Municipal')
      .in('state_source', regionStatesForCamaras);
  } else if (departmentTerms.length > 0) {
    const orConditions = departmentTerms.flatMap((term) => [
      `email.ilike.%${term}%`,
      `department_label.ilike.%${term}%`,
    ]);

    nextQuery = nextQuery.or(orConditions.join(','));
  }

  return nextQuery;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const region = searchParams.get('region') || '';
    const state = searchParams.get('state') || '';
    const municipalityId = searchParams.get('municipalityId') || '';
    const populationRange = searchParams.get('populationRange') || '';
    const department = searchParams.get('department') || '';
    const strategic = searchParams.get('strategic') || 'all';
    const minScoreRaw = searchParams.get('minScore') || '';
    const emailSearch = searchParams.get('emailSearch') || '';
    const pageRaw = searchParams.get('page') || '1';
    const pageSizeRaw = searchParams.get('pageSize') || '50';

    const REGIONS: Record<string, string[]> = {
      Norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
      Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
      'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
      Sudeste: ['ES', 'MG', 'RJ', 'SP'],
      Sul: ['PR', 'RS', 'SC'],
    };
    const regionStates = region ? (REGIONS[region] ?? []) : [];
    const audienceFilterParams = {
      state,
      regionStates,
      populationRange,
      municipalityId,
      strategic,
      minScoreRaw,
      emailSearch,
      department,
    };

    const page = Math.max(Number(pageRaw) || 1, 1);
    const pageSize = Math.min(Math.max(Number(pageSizeRaw) || 50, 1), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const baseCountQuery = applyAudienceFilters(
      supabase
        .from('municipality_emails')
        .select('id', { count: 'exact', head: true })
        .neq('deliverability_status', 'hard_bounce'),
      audienceFilterParams,
    );

    const baseDataQuery = applyAudienceFilters(supabase.from('municipality_emails').select(`
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
      `)
      .neq('deliverability_status', 'hard_bounce'), audienceFilterParams);

    const { count, error: countError } = await baseCountQuery;

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const [greenCountResult, yellowCountResult] = await Promise.all([
      applyAudienceFilters(
        supabase
          .from('municipality_emails')
          .select('id', { count: 'exact', head: true })
          .neq('deliverability_status', 'hard_bounce')
          .or('validation_status.eq.snovio_valid,deliverability_status.eq.delivered'),
        audienceFilterParams,
      ),
      applyAudienceFilters(
        supabase
          .from('municipality_emails')
          .select('id', { count: 'exact', head: true })
          .neq('deliverability_status', 'hard_bounce')
          .or('validation_status.eq.snovio_uncertain,deliverability_status.eq.failed'),
        audienceFilterParams,
      ),
    ]);

    if (greenCountResult.error) {
      return NextResponse.json({ error: greenCountResult.error.message }, { status: 500 });
    }

    if (yellowCountResult.error) {
      return NextResponse.json({ error: yellowCountResult.error.message }, { status: 500 });
    }

    const total = count || 0;
    const green = greenCountResult.count || 0;
    const yellow = yellowCountResult.count || 0;
    const white = Math.max(0, total - green - yellow);

    const { data, error: dataError } = await baseDataQuery
      .order('priority_score', { ascending: false, nullsFirst: false })
      .order('email', { ascending: true })
      .range(from, to);

    if (dataError) {
      return NextResponse.json({ error: dataError.message }, { status: 500 });
    }

    const items = (data || []).map((item: any) => ({
      id: item.id,
      municipality_id: item.municipality_id,
      email: item.email,
      department_label: item.department_label,
      priority_score: item.priority_score,
      is_strategic: item.is_strategic,
      source: item.source,
      municipalities: item.municipalities,
    }));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      quality_summary: {
        green,
        yellow,
        white,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao gerar preview da audiência.' },
      { status: 500 }
    );
  }
}
