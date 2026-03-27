import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('plan_id, emails_used_this_month, extra_credits_available, trial_ends_at')
    .eq('id', profile.company_id)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, billing_cycle, current_period_end, trial_ends_at')
    .eq('company_id', profile.company_id)
    .single()

  const { data: plan } = await supabase
    .from('plans')
    .select('name, emails_per_month, max_users, price_monthly, price_semiannual, price_annual')
    .eq('id', company?.plan_id ?? '')
    .single()

  const { data: allPlans } = await supabase
    .from('plans')
    .select('id, name, emails_per_month, max_users, price_monthly, price_semiannual, price_annual')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })

  return NextResponse.json({
    company,
    subscription,
    current_plan: plan,
    all_plans: allPlans ?? [],
  })
}
