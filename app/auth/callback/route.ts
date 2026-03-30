import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const adminSupabase = await createAdminClient();

        const { data: existingProfile } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingProfile) {
          // New OAuth user — create company + profile, send to onboarding
          const fullName = user.user_metadata?.full_name ?? user.email ?? 'Usuário';
          const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          const { data: company } = await adminSupabase
            .from('companies')
            .insert({ name: `${fullName} - Empresa`, status: 'active', trial_ends_at: trialEndsAt })
            .select('id')
            .single();

          if (company) {
            await adminSupabase.from('profiles').insert({
              id: user.id,
              email: user.email,
              full_name: fullName,
              role: 'user',
              company_id: company.id,
            });
          }

          return NextResponse.redirect(`${origin}/signup/onboarding?userId=${user.id}`);
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
