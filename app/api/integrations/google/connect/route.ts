import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGoogleOAuthAuthorizationUrl, sanitizeGoogleOAuthError } from '@/lib/email/google-oauth';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario nao autenticado.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Nao foi possivel identificar a empresa do usuario.' }, { status: 403 });
    }

    console.info('[google-connect] Inicio do connect.', {
      userId: user.id,
      companyId: profile.company_id,
    });

    const url = await createGoogleOAuthAuthorizationUrl(user.id, profile.company_id);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json({ error: sanitizeGoogleOAuthError(error) }, { status: 500 });
  }
}
