import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  AsaasRequestError,
  createAsaasCustomer,
  createAsaasSubscription,
  cancelAsaasSubscription,
  getAsaasSubscriptionPayments,
  getAsaasPaymentPixQrCode,
} from '@/lib/asaas'

function getGatewaySetupErrorMessage() {
  return 'Não foi possível preparar a cobrança. Tente novamente em instantes.'
}

function getSubscriptionErrorMessage(billingType: string) {
  if (billingType === 'CREDIT_CARD') {
    return 'Não foi possível processar o pagamento com cartão. Verifique os dados e tente novamente.'
  }

  return 'Não foi possível iniciar a cobrança. Tente novamente em instantes.'
}

function getRequestRemoteIp(req: NextRequest, fallbackRemoteIp: unknown) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const fallback = typeof fallbackRemoteIp === 'string' ? fallbackRemoteIp.trim() : ''

  return [forwardedFor?.split(',')[0]?.trim(), realIp?.trim(), fallback].find(
    (value) => typeof value === 'string' && value.length > 0
  )
}

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

  const body = await req.json()
  const { planId, billingCycle, billingType, email, name, cpfCnpj, creditCardToken, creditCard, creditCardHolderInfo, remoteIp } = body
  const requestRemoteIp = getRequestRemoteIp(req, remoteIp)

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
    monthly: { cycle: 'MONTHLY', value: plan.price_monthly },
    semiannual: { cycle: 'SEMIANNUAL', value: plan.price_semiannual },
    annual: { cycle: 'YEARLY', value: plan.price_annual },
  }

  const billing = cycleMap[billingCycle]
  if (!billing) {
    return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()

  const { data: existingSub } = await adminSupabase
    .from('subscriptions')
    .select('asaas_subscription_id, asaas_customer_id')
    .eq('company_id', profile.company_id)
    .maybeSingle()

  if (existingSub?.asaas_subscription_id) {
    try {
      await cancelAsaasSubscription(existingSub.asaas_subscription_id)
    } catch {
      // proceed even if cancel fails
    }
  }

  let customer: { id: string }
  try {
    customer = existingSub?.asaas_customer_id
      ? { id: existingSub.asaas_customer_id }
      : await createAsaasCustomer({ name, email, cpfCnpj })
  } catch (err: unknown) {
    const status = err instanceof AsaasRequestError && err.status >= 400 && err.status < 500 ? 400 : 500
    return NextResponse.json({ error: getGatewaySetupErrorMessage() }, { status })
  }

  const nextDueDate = new Date()
  nextDueDate.setDate(nextDueDate.getDate() + 1)
  const nextDueDateStr = nextDueDate.toISOString().split('T')[0]

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
      ...(billingType === 'CREDIT_CARD' && creditCard ? { creditCard } : {}),
      ...(billingType === 'CREDIT_CARD' && creditCardHolderInfo ? { creditCardHolderInfo } : {}),
      ...(billingType === 'CREDIT_CARD' && requestRemoteIp ? { remoteIp: requestRemoteIp } : {}),
    })
  } catch (err: unknown) {
    console.error('ASAAS_SUBSCRIPTION_ERROR', {
      status: err instanceof AsaasRequestError ? err.status : 'unknown',
      billingType,
      planId,
      companyId: profile.company_id,
    })
    console.error('ASAAS_DEBUG_VALIDATION', {
      billingType,
      planId,
      companyId: profile.company_id,
      hasCreditCard: !!creditCard,
      hasHolderInfo: !!creditCardHolderInfo,
      cpfCnpjLength: typeof cpfCnpj === 'string' ? cpfCnpj.length : undefined,
      postalCode:
        creditCardHolderInfo &&
        typeof creditCardHolderInfo === 'object' &&
        'postalCode' in creditCardHolderInfo
          ? creditCardHolderInfo.postalCode
          : undefined,
      addressNumber:
        creditCardHolderInfo &&
        typeof creditCardHolderInfo === 'object' &&
        'addressNumber' in creditCardHolderInfo
          ? creditCardHolderInfo.addressNumber
          : undefined,
      hasRemoteIp: !!requestRemoteIp,
    })
    const status = err instanceof AsaasRequestError && err.status >= 400 && err.status < 500 ? 400 : 500
    return NextResponse.json({ error: getSubscriptionErrorMessage(billingType) }, { status })
  }

  const now = new Date().toISOString()
  const initialStatus = 'pending'

  if (existingSub) {
    const { error: updateError } = await adminSupabase
      .from('subscriptions')
      .update({
        asaas_customer_id: customer.id,
        asaas_subscription_id: subscription.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: initialStatus,
        current_period_start: now,
      })
      .eq('company_id', profile.company_id)

    if (updateError) {
      console.error('SUBSCRIPTION_UPDATE_FAILED', {
        companyId: profile.company_id,
        error: updateError.message,
      })
      return NextResponse.json(
        { error: 'Erro interno ao registrar assinatura. Tente novamente.' },
        { status: 500 }
      )
    }
  } else {
    const { error: insertError } = await adminSupabase
      .from('subscriptions')
      .insert({
        company_id: profile.company_id,
        asaas_customer_id: customer.id,
        asaas_subscription_id: subscription.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: initialStatus,
        current_period_start: now,
        created_at: now,
      })

    if (insertError) {
      console.error('SUBSCRIPTION_INSERT_FAILED', {
        companyId: profile.company_id,
        error: insertError.message,
      })
      return NextResponse.json(
        { error: 'Erro interno ao registrar assinatura. Tente novamente.' },
        { status: 500 }
      )
    }
  }

  await adminSupabase
    .from('companies')
    .update({ status: initialStatus })
    .eq('id', profile.company_id)

  let pixData: { encodedImage: string; payload: string; expirationDate: string } | null = null

  if (billingType === 'PIX') {
    try {
      const paymentsRes = await getAsaasSubscriptionPayments(subscription.id)
      const firstPayment = paymentsRes?.data?.[0]
      if (firstPayment?.id) {
        const pixRes = await getAsaasPaymentPixQrCode(firstPayment.id)
        pixData = {
          encodedImage: pixRes.encodedImage,
          payload: pixRes.payload,
          expirationDate: pixRes.expirationDate,
        }
      }
    } catch {
      // non-blocking
    }
  }

  let boletoUrl: string | null = null

  if (billingType === 'BOLETO') {
    try {
      const paymentsRes = await getAsaasSubscriptionPayments(subscription.id)
      const firstPayment = paymentsRes?.data?.[0]
      if (firstPayment?.bankSlipUrl) {
        boletoUrl = firstPayment.bankSlipUrl
      }
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({
    success: true,
    subscription_id: subscription.id,
    customer_id: customer.id,
    status: initialStatus,
    pix: pixData,
    boletoUrl,
  })
}
