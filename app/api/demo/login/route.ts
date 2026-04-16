import { NextResponse } from 'next/server';

// Rota de demo desativada.
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
