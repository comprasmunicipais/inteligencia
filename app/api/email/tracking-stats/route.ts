export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const authClient = await createClient();

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await authClient
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 403 });
  }

  const supabase = await createAdminClient();

  // ── Modo detalhe: ?campaign_id=<id> ──────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaign_id');

  if (campaignId) {
    // Verifica que a campanha pertence à empresa do usuário
    const { data: camp, error: campError } = await authClient
      .from('email_campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (campError || !camp) {
      return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }

    const { data: events, error: eventsError } = await supabase
      .from('email_events')
      .select('id, recipient_email, event_type, link_url, tracked_at, ip_address, user_agent')
      .eq('campaign_id', campaignId)
      .order('tracked_at', { ascending: false });

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    return NextResponse.json({ events: events ?? [] });
  }

  // ── Modo agregado: retorna totais por campanha ────────────────────────────
  const { data: campaigns, error: campaignsError } = await authClient
    .from('email_campaigns')
    .select('id')
    .eq('company_id', profile.company_id);

  if (campaignsError) {
    return NextResponse.json({ error: campaignsError.message }, { status: 500 });
  }

  const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);

  if (campaignIds.length === 0) {
    return NextResponse.json({ stats: {} });
  }

  const { data: events, error: eventsError } = await supabase
    .from('email_events')
    .select('campaign_id, event_type, recipient_email')
    .in('campaign_id', campaignIds);

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  // Group by campaign → event_type → unique emails
  const openEmails: Record<string, Set<string>> = {};
  const clickEmails: Record<string, Set<string>> = {};

  for (const event of events ?? []) {
    const cid = event.campaign_id;
    if (event.event_type === 'open') {
      if (!openEmails[cid]) openEmails[cid] = new Set();
      openEmails[cid].add(event.recipient_email);
    } else if (event.event_type === 'click') {
      if (!clickEmails[cid]) clickEmails[cid] = new Set();
      clickEmails[cid].add(event.recipient_email);
    }
  }

  const result: Record<string, { opens: number; clicks: number }> = {};
  for (const cid of campaignIds) {
    result[cid] = {
      opens: openEmails[cid]?.size ?? 0,
      clicks: clickEmails[cid]?.size ?? 0,
    };
  }

  return NextResponse.json({ stats: result });
}
