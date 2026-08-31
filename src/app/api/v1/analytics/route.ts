import { enterpriseStore } from '@/lib/db/store';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { NextResponse } from 'next/server';

export async function GET() {
  const summary = enterpriseStore.getAnalyticsSummary();
  return NextResponse.json(summary, {
    status: 200,
    headers: getSecurityHeaders(),
  });
}
