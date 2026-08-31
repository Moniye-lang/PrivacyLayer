import { privacyStore } from '@/lib/db/store';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/v1/debug
 * Returns the current vault diagnostics.
 * Only enabled in development mode.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production.' }, { status: 403 });
  }

  const diag = privacyStore.diagnostics();
  console.log('[Debug API] Vault diagnostics requested:', diag);

  return NextResponse.json({
    ok: true,
    environment: process.env.NODE_ENV,
    vault: diag,
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}
