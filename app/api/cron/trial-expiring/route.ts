import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendTrialExpiringEmail } from '@/lib/email/transactional';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient();

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, trial_ends_at')
    .eq('status', 'active')
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', threeDaysFromNow.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;

  for (const company of companies ?? []) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('company_id', company.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!profile?.email) continue;

      const trialEnd = new Date(company.trial_ends_at);
      const msLeft = trialEnd.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      await sendTrialExpiringEmail({
        name: profile.full_name || profile.email,
        email: profile.email,
        companyName: company.name,
        daysLeft,
      });

      sent++;
    } catch {
      // continue with next company
    }
  }

  return NextResponse.json({ sent });
}
