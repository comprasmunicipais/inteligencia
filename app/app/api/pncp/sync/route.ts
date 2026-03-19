export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  console.log('CRON TEST RUNNING');

  return NextResponse.json({
    ok: true,
    message: 'cron funcionando',
    timestamp: new Date().toISOString(),
  });
}
