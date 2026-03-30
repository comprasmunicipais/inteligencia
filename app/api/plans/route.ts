import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createAdminClient();

    const { data: plans, error } = await supabase
      .from('plans')
      .select('id, name, price_monthly, price_semiannual, price_annual, emails_per_month, max_users, extra_users_allowed')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar planos.' },
      { status: 500 }
    );
  }
}
