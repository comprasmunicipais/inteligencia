import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? null;
  const authHeader = (req.headers.get('authorization') ?? '').trim();
  const expectedHeader = cronSecret ? `Bearer ${cronSecret}` : null;

  return NextResponse.json({
    hasCronSecret: Boolean(cronSecret),
    cronSecretLength: cronSecret ? cronSecret.length : null,
    authHeaderPresent: Boolean(authHeader),
    authHeaderStartsWithBearer: authHeader.startsWith('Bearer '),
    authHeaderLength: authHeader.length,
    expectedHeaderLength: expectedHeader ? expectedHeader.length : null,
    isExactMatch: expectedHeader ? authHeader === expectedHeader : false,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    commitHint: 'auth-debug',
  });
}
