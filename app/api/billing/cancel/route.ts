import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cancelAsaasSubscription } from '@/lib/asaas';

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
  }

  const companyId = profile.company_id;
  const adminSupabase = await createAdminClient();

  const { data: subscription } = await adminSupabase
    .from('subscriptions')
    .select('asaas_subscription_id')
    .eq('company_id', companyId)
    .single();

  if (subscription?.asaas_subscription_id) {
    try {
      await cancelAsaasSubscription(subscription.asaas_subscription_id);
    } catch {
      // proceed even if already cancelled in Asaas
    }
  }

  await adminSupabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('company_id', companyId);

  await adminSupabase
    .from('companies')
    .update({ status: 'cancelled' })
    .eq('id', companyId);

  return NextResponse.json({ success: true });
}
