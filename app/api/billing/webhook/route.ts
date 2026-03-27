import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const token = req.headers.get('asaas-access-token')
  if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await req.json()
  const supabase = await createAdminClient()
  const event = payload.event
  const payment = payload.payment

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

    await supabase.from('billing_events')
      .update({ company_id: companyId })
      .eq('asaas_event_id', payment.id)
  }

  if (event === 'PAYMENT_OVERDUE') {
    await supabase.from('subscriptions')
      .update({ status: 'past_due' })
      .eq('asaas_subscription_id', payment.subscriptionId)
  }

  if (event === 'SUBSCRIPTION_CANCELLED' || event === 'PAYMENT_DELETED') {
    await supabase.from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('asaas_subscription_id', payment.subscriptionId)
  }

  return NextResponse.json({ received: true })
}
