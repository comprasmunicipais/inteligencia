import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createAsaasCustomer, createAsaasSubscription } from '@/lib/asaas'

export async function POST(req: NextRequest) {
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

  const { planId, billingCycle, billingType, email, name, cpfCnpj } = await req.json()

  if (!planId || !billingCycle || !billingType || !email || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const cycleMap: Record<string, { cycle: 'MONTHLY' | 'SEMIANNUAL' | 'YEARLY', value: number }> = {
    monthly:    { cycle: 'MONTHLY',    value: plan.price_monthly },
    semiannual: { cycle: 'SEMIANNUAL', value: plan.price_semiannual },
    annual:     { cycle: 'YEARLY',     value: plan.price_annual },
  }

  const billing = cycleMap[billingCycle]
  if (!billing) {
    return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
  }

  const customer = await createAsaasCustomer({ name, email, cpfCnpj })

  const nextDueDate = new Date()
  nextDueDate.setDate(nextDueDate.getDate() + 1)
  const nextDueDateStr = nextDueDate.toISOString().split('T')[0]

  const subscription = await createAsaasSubscription({
    customer: customer.id,
    billingType,
    value: billing.value,
    nextDueDate: nextDueDateStr,
    cycle: billing.cycle,
    description: `CM Pro — Plano ${plan.name} (${billingCycle})`,
  })

  const adminSupabase = await createAdminClient()

  await adminSupabase.from('subscriptions')
    .update({
      asaas_customer_id: customer.id,
      asaas_subscription_id: subscription.id,
      plan_id: planId,
      billing_cycle: billingCycle,
      status: 'active',
      current_period_start: new Date().toISOString(),
    })
    .eq('company_id', profile.company_id)

  await adminSupabase.from('companies')
    .update({ plan_id: planId })
    .eq('id', profile.company_id)

  return NextResponse.json({
    success: true,
    subscription_id: subscription.id,
    customer_id: customer.id,
    status: subscription.status,
  })
}
