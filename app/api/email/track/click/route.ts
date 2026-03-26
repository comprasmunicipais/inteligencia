export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaign_id');
  const email = searchParams.get('email');
  const url = searchParams.get('url');

  // Always redirect first — tracking must never block the user
  const destination = url && isAllowedUrl(url) ? url : '/';

  if (campaignId && email && url) {
    try {
      const supabase = await createAdminClient();

      const { count } = await supabase
        .from('email_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('id', campaignId);

      if (!count) {
        return NextResponse.redirect(destination, { status: 302 });
      }

      await supabase.from('email_events').insert({
        campaign_id: campaignId,
        recipient_email: email,
        event_type: 'click',
        link_url: url,
        ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
        user_agent: request.headers.get('user-agent') ?? null,
      });
    } catch {
      // Silently fail — never block the redirect
    }
  }

  return NextResponse.redirect(destination, { status: 302 });
}

/** Only allow http/https destinations to prevent open-redirect abuse */
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
