import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Public route — no auth required
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statesParam = searchParams.get('states');

  if (!statesParam) {
    return NextResponse.json({ count: 0 });
  }

  // Parse and sanitize state codes — only uppercase 2-letter codes allowed
  const states = statesParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s));

  if (states.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const supabase = await createAdminClient();

    // opportunities.state stores UF codes directly (e.g. 'SP', 'RJ')
    const { count, error } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .neq('internal_status', 'expired')
      .in('state', states);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao contar oportunidades.' },
      { status: 500 }
    );
  }
}
