export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'TESTE_SYNC_NOVO',
    timestamp: new Date().toISOString(),
  });
}
