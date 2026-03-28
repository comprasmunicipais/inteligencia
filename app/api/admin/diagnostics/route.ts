import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  // Auth: platform_admin only
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();

  // ── Env vars ───────────────────────────────────────────────────────────────
  const envVars = [
    { key: 'GOOGLE_API_KEY', defined: !!process.env.GOOGLE_API_KEY },
    { key: 'CRON_SECRET', defined: !!process.env.CRON_SECRET },
    { key: 'ASAAS_API_KEY', defined: !!process.env.ASAAS_API_KEY },
    { key: 'EMAIL_SETTINGS_ENCRYPTION_KEY', defined: !!process.env.EMAIL_SETTINGS_ENCRYPTION_KEY },
    { key: 'NEXT_PUBLIC_APP_URL', defined: !!process.env.NEXT_PUBLIC_APP_URL },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', defined: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
  ];

  // ── Supabase connectivity ──────────────────────────────────────────────────
  let supabaseOk = false;
  try {
    const { error } = await adminClient.from('companies').select('id', { count: 'exact', head: true });
    supabaseOk = !error;
  } catch {
    supabaseOk = false;
  }

  // ── Email queue pending ────────────────────────────────────────────────────
  let pendingJobs = 0;
  try {
    const { count } = await adminClient
      .from('email_job_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingJobs = count ?? 0;
  } catch {
    pendingJobs = 0;
  }

  // ── Last PNCP sync (opportunities table — last synced_at) ─────────────────
  let lastSync: string | null = null;
  try {
    const { data } = await adminClient
      .from('opportunities')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .single();
    lastSync = data?.last_synced_at ?? null;
  } catch {
    lastSync = null;
  }

  // ── Total opportunities ────────────────────────────────────────────────────
  let totalOpportunities = 0;
  try {
    const { count } = await adminClient
      .from('opportunities')
      .select('*', { count: 'exact', head: true });
    totalOpportunities = count ?? 0;
  } catch {
    totalOpportunities = 0;
  }

  return NextResponse.json({
    supabaseOk,
    envVars,
    pendingJobs,
    lastSync,
    totalOpportunities,
  });
}
