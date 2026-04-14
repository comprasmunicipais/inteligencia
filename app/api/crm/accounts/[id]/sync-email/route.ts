export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: accountId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 401 });
  }

  if (profile.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const email: string = (body.email ?? '').trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { data: account, error: accountError } = await supabase
    .from('municipalities')
    .select('id')
    .eq('id', accountId)
    .maybeSingle();

  if (accountError || !account) {
    return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('municipality_emails')
    .select('id')
    .eq('municipality_id', accountId)
    .ilike('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await supabase.from('municipality_emails').insert({
    municipality_id: accountId,
    email,
    department_label: 'Cadastro principal',
    priority_score: 0,
    is_strategic: false,
    source: 'manual',
  });

  if (error) {
    return NextResponse.json({ error: 'Erro ao sincronizar e-mail da conta.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: true });
}
