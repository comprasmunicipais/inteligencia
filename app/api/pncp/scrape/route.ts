export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function scrapeManualSources(): Promise<{ processed: number; inserted: number; errors: number }> {
  const { data: sources } = await supabase
    .from('opportunity_sources')
    .select('*')
    .eq('is_active', true);

  if (!sources || sources.length === 0) return { processed: 0, inserted: 0, errors: 0 };

  let processed = 0;
  let inserted = 0;
  let errors = 0;

  for (const source of sources) {
    const now = new Date().toISOString();
    let html = '';

    try {
      const fetchResponse = await fetch(source.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CMPro-Bot/1.0)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!fetchResponse.ok) throw new Error(`HTTP ${fetchResponse.status}`);
      const rawHtml = await fetchResponse.text();
      html = rawHtml.length > 50000 ? rawHtml.slice(0, 50000) : rawHtml;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao fazer fetch da URL';
      await supabase
        .from('opportunity_sources')
        .update({ last_checked_at: now, last_check_status: 'error', last_check_error: errMsg })
        .eq('id', source.id);
      errors++;
      continue;
    }

    let licitacoes: any[] = [];
    try {
      const aiResponse = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_API_KEY! },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analise o HTML abaixo e extraia todas as licitações publicadas. Retorne APENAS JSON válido, sem texto adicional, no formato exato:\n{"licitacoes":[{"titulo":"","modalidade":"","valor_estimado":0,"data_abertura":"","data_publicacao":"","url_licitacao":""}]}\n\nSe não houver licitações, retorne: {"licitacoes":[]}\n\nHTML:\n${html}`,
                  },
                ],
              },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!aiResponse.ok) throw new Error(`Gemini API HTTP ${aiResponse.status}`);

      const aiJson = await aiResponse.json();
      const text: string = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(text);
      licitacoes = parsed?.licitacoes || [];
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao processar resposta da IA';
      await supabase
        .from('opportunity_sources')
        .update({ last_checked_at: now, last_check_status: 'ai_error', last_check_error: errMsg })
        .eq('id', source.id);
      errors++;
      continue;
    }

    for (const lic of licitacoes) {
      if (!lic.url_licitacao) continue;
      const externalId = `MANUAL_${lic.url_licitacao}`;
      const oportunidade = {
        external_id: externalId,
        source: 'MANUAL',
        title: lic.titulo || 'Título não informado',
        description: lic.titulo || null,
        organ_name: source.name || 'Fonte manual',
        municipality_id: source.municipality_id || null,
        modality: lic.modalidade || 'Não informada',
        situation: 'Publicada',
        publication_date: lic.data_publicacao || null,
        opening_date: lic.data_abertura || null,
        estimated_value: lic.valor_estimado || null,
        official_url: lic.url_licitacao,
        sync_hash: externalId,
        match_score: 0,
        match_reason: 'Importado automaticamente via scraper de fontes manuais',
        internal_status: 'new',
        last_synced_at: now,
        updated_at: now,
      };

      const { error } = await supabase
        .from('opportunities')
        .upsert(oportunidade, { onConflict: 'external_id' });

      if (!error) inserted++;
    }

    await supabase
      .from('opportunity_sources')
      .update({ last_checked_at: now, last_check_status: 'ok', last_check_error: null })
      .eq('id', source.id);

    processed++;
  }

  return { processed, inserted, errors };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await scrapeManualSources();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
