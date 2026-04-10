export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';
import { createClient } from '@/lib/supabase/server';

const DKIM_SELECTORS = ['default', 'mail', 'smtp', 's1', 's2', 'google', 'locaweb'];

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Params ──────────────────────────────────────────────────────────────────
  const accountId = req.nextUrl.searchParams.get('account_id');
  if (!accountId) {
    return NextResponse.json({ error: 'account_id é obrigatório.' }, { status: 400 });
  }

  // ── Load account (RLS guarantees company isolation) ──────────────────────────
  const { data: account, error: accountError } = await supabase
    .from('email_sending_accounts')
    .select('id, sender_email, company_id')
    .eq('id', accountId)
    .eq('company_id', profile.company_id)
    .single();

  if (accountError || !account) {
    return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
  }

  const domain = account.sender_email?.split('@')[1]?.toLowerCase();
  if (!domain) {
    return NextResponse.json({ error: 'E-mail do remetente inválido.' }, { status: 400 });
  }

  // ── SPF check ───────────────────────────────────────────────────────────────
  let spf = false;
  try {
    const records = await dns.resolveTxt(domain);
    spf = records.some((chunks) => chunks.join('').toLowerCase().includes('v=spf1'));
  } catch {
    spf = false;
  }

  // ── DKIM check ──────────────────────────────────────────────────────────────
  let dkim = false;
  let dkimSelector: string | null = null;

  for (const selector of DKIM_SELECTORS) {
    try {
      const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
      if (records.some((chunks) => chunks.join('').toLowerCase().includes('v=dkim1'))) {
        dkim = true;
        dkimSelector = selector;
        break;
      }
    } catch {
      // selector not found — try next
    }
  }

  // ── Persist results ─────────────────────────────────────────────────────────
  await supabase
    .from('email_sending_accounts')
    .update({
      spf_status: spf,
      dkim_status: dkim,
      dkim_selector: dkimSelector,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId);

  return NextResponse.json({ domain, spf, dkim, dkim_selector: dkimSelector });
}
