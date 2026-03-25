import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('opportunity_sources')
      .select(`
        id,
        url,
        source_type,
        is_active,
        last_check_status,
        last_checked_at,
        municipalities (
          name,
          state
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar fontes.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { url, source_type, municipality_id, notes } = body;

    if (!url || !source_type) {
      return NextResponse.json(
        { error: 'URL e source_type são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('opportunity_sources')
      .insert({
        url: url.trim(),
        source_type,
        municipality_id: municipality_id || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar fonte.' },
      { status: 500 }
    );
  }
}
