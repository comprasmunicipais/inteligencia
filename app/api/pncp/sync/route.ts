export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  console.log('PNCP SYNC TEST OK');

  return NextResponse.json({
    ok: true,
    message: 'rota pncp sync funcionando',
    timestamp: new Date().toISOString(),
  });
}
