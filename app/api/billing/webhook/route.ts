import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPaymentConfirmedEmail, sendPaymentFailedEmail, sendSubscriptionCancelledEmail } from '@/lib/email/transactional'
import { timingSafeEqual } from 'crypto'
import { generateContractPdf } from '@/lib/contract/generatePdf'
import { sendContractEmail } from '@/lib/contract/sendContractEmail'

export async function POST(req: NextRequest) {
  // Layer 1: header must be present
  const token = req.headers.get('asaas-access-token')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Layer 2: constant-time comparison to prevent timing attacks
  const expected = process.env.ASAAS_WEBHOOK_TOKEN ?? ''
  const tokenBuf = Buffer.from(token)
  const expectedBuf = Buffer.from(expected)
  const valid =
    tokenBuf.length === expectedBuf.length &&
    timingSafeEqual(tokenBuf, expectedBuf)
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await req.text()
  const payload = JSON.parse(rawBody)
  const supabase = await createAdminClient()
  const event = payload.event
  const payment = payload.payment

  // Idempotency: skip if this (event_type, asaas_event_id) was already processed.
  // billing_events has no unique constraint, so we check before inserting.
  if (payment?.id) {
    const { data: existing } = await supabase
      .from('billing_events')
      .select('id')
      .eq('asaas_event_id', payment.id)
      .eq('event_type', event)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ received: true })
    }
  }

  // Record the event first so any retry arriving concurrently finds it.
  await supabase.from('billing_events').insert({
    event_type: event,
    asaas_event_id: payment?.id ?? null,
    payload,
    processed_at: new Date().toISOString(),
  })

  if (!payment?.subscriptionId) {
    return NextResponse.json({ received: true })
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('company_id')
    .eq('asaas_subscription_id', payment.subscriptionId)
    .single()

  if (!subscription) return NextResponse.json({ received: true })

  const companyId = subscription.company_id

  if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
    await supabase.from('subscriptions')
      .update({ status: 'active' })
      .eq('asaas_subscription_id', payment.subscriptionId)

    await supabase.from('companies')
      .update({ status: 'active' })
      .eq('id', companyId)

    // Sincroniza plan_id na empresa com base na subscription ativa
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .single()

    if (activeSub?.plan_id) {
      await supabase
        .from('companies')
        .update({ plan_id: activeSub.plan_id })
        .eq('id', companyId)
    }

    await supabase.from('billing_events')
      .update({ company_id: companyId })
      .eq('asaas_event_id', payment.id)

    // Send payment confirmation email (best-effort)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const { data: company } = await supabase
        .from('companies')
        .select('name, plan_id')
        .eq('id', companyId)
        .single()

      const { data: plan } = company?.plan_id
        ? await supabase.from('plans').select('name').eq('id', company.plan_id).single()
        : { data: null }

      if (profile?.email) {
        await sendPaymentConfirmedEmail({
          name: profile.full_name || profile.email,
          email: profile.email,
          companyName: company?.name ?? '',
          value: payment.value ?? 0,
          planName: plan?.name ?? 'CM Pro',
        })
      }
    } catch {
      // non-blocking
    }

    // Generate and send contract PDF (best-effort)
    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('name, cnpj_cpf, address, plan_id')
        .eq('id', companyId)
        .single()

      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const { data: planData } = companyData?.plan_id
        ? await supabase.from('plans').select('name').eq('id', companyData.plan_id).single()
        : { data: null }

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('billing_cycle')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (profileData?.email) {
        const cycleLabel: Record<string, string> = {
          monthly: 'Mensal',
          semiannual: 'Semestral',
          annual: 'Anual',
        }
        const periodicidade = subData?.billing_cycle
          ? (cycleLabel[subData.billing_cycle] ?? subData.billing_cycle)
          : 'Mensal'

        const valor = payment.value
          ? `R$ ${Number(payment.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : ''

        const pdfBytes = await generateContractPdf({
          razaoSocial: companyData?.name ?? '',
          cnpjCpf: companyData?.cnpj_cpf ?? '',
          address: companyData?.address ?? '',
          email: profileData.email,
          plano: planData?.name ?? 'CM Pro',
          valor,
          periodicidade,
          dataContratacao: new Date().toLocaleDateString('pt-BR'),
        })

        await sendContractEmail(profileData.email, profileData.full_name ?? '', pdfBytes)
      }
    } catch {
      // non-blocking
    }
  }

  if (event === 'PAYMENT_OVERDUE') {
    await supabase.from('subscriptions')
      .update({ status: 'past_due' })
      .eq('asaas_subscription_id', payment.subscriptionId)

    await supabase.from('companies')
      .update({ status: 'past_due' })
      .eq('id', companyId)

    // Send payment failed email (best-effort)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const { data: company } = await supabase
        .from('companies')
        .select('plan_id')
        .eq('id', companyId)
        .single()

      const { data: plan } = company?.plan_id
        ? await supabase.from('plans').select('name').eq('id', company.plan_id).single()
        : { data: null }

      if (profile?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.comprasmunicipais.com.br'
        await sendPaymentFailedEmail({
          to: profile.email,
          name: profile.full_name || profile.email,
          planName: plan?.name ?? 'CM Pro',
          retryUrl: `${appUrl}/settings`,
        })
      }
    } catch {
      // non-blocking
    }
  }

  if (event === 'SUBSCRIPTION_CANCELLED' || event === 'PAYMENT_DELETED') {
    await supabase.from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('asaas_subscription_id', payment.subscriptionId)

    await supabase.from('companies')
      .update({ status: 'cancelled' })
      .eq('id', companyId)

    // Send appropriate email (best-effort)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const { data: company } = await supabase
        .from('companies')
        .select('plan_id')
        .eq('id', companyId)
        .single()

      const { data: plan } = company?.plan_id
        ? await supabase.from('plans').select('name').eq('id', company.plan_id).single()
        : { data: null }

      if (profile?.email) {
        const accessUntil = payment?.dueDate
          ? new Date(payment.dueDate).toLocaleDateString('pt-BR')
          : null

        if (event === 'PAYMENT_DELETED') {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.comprasmunicipais.com.br'
          await sendPaymentFailedEmail({
            to: profile.email,
            name: profile.full_name || profile.email,
            planName: plan?.name ?? 'CM Pro',
            retryUrl: `${appUrl}/settings`,
          })
        } else {
          await sendSubscriptionCancelledEmail({
            to: profile.email,
            name: profile.full_name || profile.email,
            planName: plan?.name ?? 'CM Pro',
            accessUntil,
          })
        }
      }
    } catch {
      // non-blocking
    }
  }

  if (event === 'SUBSCRIPTION_INACTIVATED') {
    await supabase.from('subscriptions')
      .update({ status: 'inactive' })
      .eq('asaas_subscription_id', payment.subscriptionId)

    await supabase.from('companies')
      .update({ status: 'inactive' })
      .eq('id', companyId)

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const { data: company } = await supabase
        .from('companies')
        .select('plan_id')
        .eq('id', companyId)
        .single()

      const { data: plan } = company?.plan_id
        ? await supabase.from('plans').select('name').eq('id', company.plan_id).single()
        : { data: null }

      if (profile?.email) {
        await sendSubscriptionCancelledEmail({
          to: profile.email,
          name: profile.full_name || profile.email,
          planName: plan?.name ?? 'CM Pro',
          accessUntil: null,
        })
      }
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({ received: true })
}
