export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// 1×1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaign_id');
  const email = searchParams.get('email');

  if (campaignId && email) {
    try {
      const supabase = await createAdminClient();
      await supabase.from('email_events').insert({
        campaign_id: campaignId,
        recipient_email: email,
        event_type: 'open',
        ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
        user_agent: request.headers.get('user-agent') ?? null,
      });
    } catch {
      // Silently fail — never block image delivery
    }
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
