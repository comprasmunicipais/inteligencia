export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: municipalityId } = await params;

  const authClient = await createClient();
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const body = await request.json();
  const email: string = (body.email ?? '').trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = await createAdminClient();

  // Skip if this email already exists for this municipality
  const { data: existing } = await supabase
    .from('municipality_emails')
    .select('id')
    .eq('municipality_id', municipalityId)
    .ilike('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await supabase.from('municipality_emails').insert({
    municipality_id: municipalityId,
    email,
    department_label: 'Cadastro principal',
    priority_score: 0,
    is_strategic: false,
    source: 'manual',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: true });
}
