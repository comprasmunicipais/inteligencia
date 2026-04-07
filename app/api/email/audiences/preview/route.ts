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
];

function getDepartmentTerms(department: string | null) {
  if (!department) return [];

  const found = DEPARTMENT_RULES.find((item) => item.label === department);
  return found ? found.terms : [];
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

    const state = searchParams.get('state') || '';
    const municipalityId = searchParams.get('municipalityId') || '';
    const populationRange = searchParams.get('populationRange') || '';
    const department = searchParams.get('department') || '';
    const strategic = searchParams.get('strategic') || 'all';
    const minScoreRaw = searchParams.get('minScore') || '';
    const emailSearch = searchParams.get('emailSearch') || '';
    const pageRaw = searchParams.get('page') || '1';
    const pageSizeRaw = searchParams.get('pageSize') || '50';

    const page = Math.max(Number(pageRaw) || 1, 1);
    const pageSize = Math.min(Math.max(Number(pageSizeRaw) || 50, 1), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let baseCountQuery = supabase
      .from('municipality_emails')
      .select('id', { count: 'exact', head: true });

    let baseDataQuery = supabase.from('municipality_emails').select(`
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

    if (state) {
      baseCountQuery = baseCountQuery.eq('state_source', state);
      baseDataQuery = baseDataQuery.eq('state_source', state);
    }

    if (populationRange) {
      baseCountQuery = baseCountQuery.eq('population_range', populationRange);
      baseDataQuery = baseDataQuery.eq('population_range', populationRange);
    }

    if (municipalityId) {
      baseCountQuery = baseCountQuery.eq('municipality_id', municipalityId);
      baseDataQuery = baseDataQuery.eq('municipality_id', municipalityId);
    }

    if (strategic === 'yes') {
      baseCountQuery = baseCountQuery.eq('is_strategic', true);
      baseDataQuery = baseDataQuery.eq('is_strategic', true);
    }

    if (strategic === 'no') {
      baseCountQuery = baseCountQuery.eq('is_strategic', false);
      baseDataQuery = baseDataQuery.eq('is_strategic', false);
    }

    if (minScoreRaw.trim() !== '' && !Number.isNaN(Number(minScoreRaw))) {
      const minScore = Number(minScoreRaw);
      baseCountQuery = baseCountQuery.gte('priority_score', minScore);
      baseDataQuery = baseDataQuery.gte('priority_score', minScore);
    }

    if (emailSearch.trim() !== '') {
      baseCountQuery = baseCountQuery.ilike('email', `%${emailSearch.trim()}%`);
      baseDataQuery = baseDataQuery.ilike('email', `%${emailSearch.trim()}%`);
    }

    const departmentTerms = getDepartmentTerms(department);

    if (departmentTerms.length > 0) {
      const orConditions = departmentTerms.flatMap((term) => [
        `email.ilike.%${term}%`,
        `department_label.ilike.%${term}%`,
      ]);

      const orExpression = orConditions.join(',');

      baseCountQuery = baseCountQuery.or(orExpression);
      baseDataQuery = baseDataQuery.or(orExpression);
    }

    const { count, error: countError } = await baseCountQuery;

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

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
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao gerar preview da audiência.' },
      { status: 500 }
    );
  }
}
