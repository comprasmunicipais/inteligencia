import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function authAdmin() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'platform_admin') return null;
  return createAdminClient();
}

// GET /api/admin/companies/update-plan?company_id=xxx
// Returns company detail + subscription + all plans
export async function GET(req: NextRequest) {
  const adminClientPromise = authAdmin();
  const company_id = req.nextUrl.searchParams.get('company_id');

  if (!company_id) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
  }

  const adminClient = await adminClientPromise;
  if (!adminClient) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [companyRes, subscriptionRes, plansRes] = await Promise.all([
    adminClient
      .from('companies')
      .select('id, name, status, plan_id, emails_used_this_month, trial_ends_at')
      .eq('id', company_id)
      .single(),
    adminClient
      .from('subscriptions')
      .select('status, billing_cycle')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminClient
      .from('plans')
      .select('id, name, price_monthly')
      .order('price_monthly', { ascending: true }),
  ]);

  if (companyRes.error) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
  }

  return NextResponse.json({
    company: {
      ...companyRes.data,
      subscription: subscriptionRes.data ?? null,
    },
    plans: plansRes.data ?? [],
  });
}

// POST /api/admin/companies/update-plan { company_id, plan_id }
export async function POST(req: NextRequest) {
  const adminClient = await authAdmin();
  if (!adminClient) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { company_id, plan_id } = body;

  if (!company_id || !plan_id) {
    return NextResponse.json({ error: 'company_id e plan_id são obrigatórios.' }, { status: 400 });
  }

  // Validate plan exists
  const { data: plan, error: planError } = await adminClient
    .from('plans')
    .select('id, name')
    .eq('id', plan_id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
  }

  // Update company plan
  const { error: companyError } = await adminClient
    .from('companies')
    .update({ plan_id })
    .eq('id', company_id);

  if (companyError) {
    return NextResponse.json({ error: 'Erro ao atualizar plano da empresa.' }, { status: 500 });
  }

  // Update subscription plan as well (if exists)
  await adminClient
    .from('subscriptions')
    .update({ plan_id })
    .eq('company_id', company_id);

  return NextResponse.json({ ok: true, plan_name: plan.name });
}
