import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createAsaasPayment } from '@/lib/asaas'

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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('asaas_customer_id, status')
    .eq('company_id', profile.company_id)
    .single()

  if (!subscription?.asaas_customer_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
  }

  const { billingType } = await req.json()
  const validTypes = ['CREDIT_CARD', 'BOLETO', 'PIX']
  if (!validTypes.includes(billingType)) {
    return NextResponse.json({ error: 'Invalid billing type' }, { status: 400 })
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 1)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  const payment = await createAsaasPayment({
    customer: subscription.asaas_customer_id,
    billingType,
    value: 80.00,
    dueDate: dueDateStr,
    description: 'Pacote extra 5.000 e-mails — CM Pro',
  })

  const adminSupabase = await createAdminClient()
  await adminSupabase.from('email_credits').insert({
    company_id: profile.company_id,
    credits: 5000,
    price_paid: 80.00,
    asaas_payment_id: payment.id,
  })

  if (billingType === 'CREDIT_CARD' && payment.status === 'CONFIRMED') {
    await adminSupabase.from('companies')
      .update({ extra_credits_available: supabase.rpc('increment', { x: 5000 }) })
      .eq('id', profile.company_id)
  }

  return NextResponse.json({
    success: true,
    payment_id: payment.id,
    status: payment.status,
    invoice_url: payment.invoiceUrl ?? null,
  })
}
