import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createAsaasCustomer, createAsaasSubscription, cancelAsaasSubscription } from '@/lib/asaas'

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

  // NOTE: creditCard data is never logged — it is only forwarded to Asaas
  const body = await req.json()
  const { planId, billingCycle, billingType, email, name, cpfCnpj, creditCardToken, creditCardHolderInfo, remoteIp } = body

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

  // Check for existing subscription — cancel it before creating a new one
  const adminSupabase = await createAdminClient()

  // Fix 2: .maybeSingle() — returns null instead of error when no subscription exists
  const { data: existingSub } = await adminSupabase
    .from('subscriptions')
    .select('asaas_subscription_id, asaas_customer_id')
    .eq('company_id', profile.company_id)
    .maybeSingle()

  if (existingSub?.asaas_subscription_id) {
    try {
      await cancelAsaasSubscription(existingSub.asaas_subscription_id)
    } catch {
      // proceed even if cancel fails (e.g. already cancelled in Asaas)
    }
  }

  // Fix 1a: createAsaasCustomer wrapped in try/catch — returns JSON error instead of HTML 500
  let customer: { id: string }
  try {
    customer = existingSub?.asaas_customer_id
      ? { id: existingSub.asaas_customer_id }
      : await createAsaasCustomer({ name, email, cpfCnpj })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erro ao criar cliente no gateway: ${msg}` }, { status: 500 })
  }

  const nextDueDate = new Date()
  nextDueDate.setDate(nextDueDate.getDate() + 1)
  const nextDueDateStr = nextDueDate.toISOString().split('T')[0]

  // Fix 1b: createAsaasSubscription wrapped in try/catch — returns JSON error instead of HTML 500
  let subscription: { id: string; status: string }
  try {
    subscription = await createAsaasSubscription({
      customer: customer.id,
      billingType,
      value: billing.value,
      nextDueDate: nextDueDateStr,
      cycle: billing.cycle,
      description: `CM Pro — Plano ${plan.name} (${billingCycle})`,
      ...(billingType === 'CREDIT_CARD' && creditCardToken ? { creditCardToken } : {}),
      ...(billingType === 'CREDIT_CARD' && creditCardHolderInfo ? { creditCardHolderInfo } : {}),
      ...(billingType === 'CREDIT_CARD' && remoteIp ? { remoteIp } : {}),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erro ao criar assinatura no gateway: ${msg}` }, { status: 500 })
  }

  const now = new Date().toISOString()

  // Fix 3: upsert — INSERT for new users without subscription, UPDATE for existing ones
  if (existingSub) {
    await adminSupabase.from('subscriptions')
      .update({
        asaas_customer_id: customer.id,
        asaas_subscription_id: subscription.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: now,
      })
      .eq('company_id', profile.company_id)
  } else {
    await adminSupabase.from('subscriptions')
      .insert({
        company_id: profile.company_id,
        asaas_customer_id: customer.id,
        asaas_subscription_id: subscription.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: now,
        created_at: now,
      })
  }

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
