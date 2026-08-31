import { privacyStore } from '@/lib/db/store';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const sessions = privacyStore.getAllSessions();
  return NextResponse.json({ sessions }, { status: 200, headers: getSecurityHeaders() });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const purgeAll = searchParams.get('purgeAll');

  if (purgeAll === 'true') {
    privacyStore.purgeAllSessions();
    return NextResponse.json({ success: true, message: 'All session mappings permanently purged.' }, { status: 200, headers: getSecurityHeaders() });
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId parameter required.' }, { status: 400 });
  }

  const success = privacyStore.purgeSession(sessionId);
  return NextResponse.json({ success }, { status: 200, headers: getSecurityHeaders() });
}
