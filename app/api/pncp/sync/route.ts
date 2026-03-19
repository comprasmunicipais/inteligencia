export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  console.log('PNCP SYNC TEST OK v3');

  return NextResponse.json({
    ok: true,
    source: 'ROUTE_V3',
    timestamp: new Date().toISOString(),
  });
}
