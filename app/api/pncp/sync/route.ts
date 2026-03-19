export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // ✅ 1. Permite execução automática da Vercel (CRON REAL)
  const isVercelCron = request.headers.get('x-vercel-cron');

  if (isVercelCron) {
    console.log('CRON AUTH: Vercel cron autorizado');
    return true;
  }

  // ✅ 2. Permite chamada manual com token
  if (!cronSecret) {
    console.log('CRON AUTH: missing CRON_SECRET');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    console.log('CRON AUTH: authorized by header');
    return true;
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (token && token === cronSecret) {
    console.log('CRON AUTH: authorized by query token');
    return true;
  }

  console.log('CRON AUTH: unauthorized request');
  return false;
}

export async function GET(request: NextRequest) {
  console.log('CRON START');

  try {
    if (!isAuthorized(request)) {
      console.log('CRON STOP: unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('CRON STEP: building PNCP request');

    const dataInicial = '20260301';
    const dataFinal = '20260331';
    const codigoModalidadeContratacao = '6';

    const url =
      `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao` +
      `?pagina=1&tamanhoPagina=20` +
      `&dataInicial=${dataInicial}` +
      `&dataFinal=${dataFinal}` +
      `&codigoModalidadeContratacao=${codigoModalidadeContratacao}`;

    console.log('CRON STEP: fetching PNCP', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    console.log('CRON STEP: PNCP response status', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CRON ERROR: PNCP non-200 response', errorText);

      return NextResponse.json(
        {
          error: 'Erro ao consultar PNCP',
          status: response.status,
          detail: errorText,
        },
        { status: 502 }
      );
    }

    const json = await response.json();
    const items = json.data || [];

    console.log('CRON STEP: PNCP items received', items.length);

    let inserted = 0;
    const errors: Array<any> = [];

    for (const item of items) {
      const externalId =
        item.numeroControlePNCP ||
        `${item.anoCompra || ''}-${item.sequencialCompra || ''}-${item.orgaoEntidade?.cnpj || ''}`;

      const oportunidade = {
        company_id: 'a14d818e-ea64-4e3f-b1e5-d28dae7bfbc3',
        external_id: String(externalId),
        source: 'PNCP',
        title: item.objetoCompra || 'Objeto não informado',
        description: item.objetoCompra || null,
        organ_name: item.orgaoEntidade?.razaoSocial || 'Órgão não informado',
        city: item.unidadeOrgao?.municipioNome || null,
        state: item.unidadeOrgao?.ufSigla || null,
        municipality_name:
          item.unidadeOrgao?.municipioNome && item.unidadeOrgao?.ufSigla
            ? `${item.unidadeOrgao.municipioNome} (${item.unidadeOrgao.ufSigla})`
            : null,
        modality: item.modalidadeNome || 'Pregão Eletrônico',
        situation: item.situacaoCompraNome || 'Publicada',
        publication_date: item.dataPublicacaoPncp || null,
        opening_date: item.dataAberturaProposta || null,
        estimated_value: item.valorTotalEstimado || null,
        official_url:
          item.linkSistemaOrigem ||
          (item.numeroControlePNCP
            ? `https://pncp.gov.br/app/editais/${item.numeroControlePNCP}`
            : null),
        sync_hash: String(externalId),
        match_score: 0,
        match_reason: 'Importado automaticamente do PNCP',
        internal_status: 'new',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('opportunities')
        .upsert(oportunidade, { onConflict: 'external_id' });

      if (error) {
        console.error('CRON UPSERT ERROR:', error);
        errors.push(error);
      } else {
        inserted++;
      }
    }

    console.log('CRON FINISHED', {
      total_recebidos: items.length,
      inseridos: inserted,
      total_erros: errors.length,
    });

    return NextResponse.json({
      success: true,
      total_recebidos: items.length,
      inseridos: inserted,
      total_erros: errors.length,
    });

  } catch (error) {
    console.error('CRON FATAL ERROR:', error);

    return NextResponse.json(
      {
        error: 'Erro ao sincronizar PNCP',
        detail: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
