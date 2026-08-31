import { executeMaskingEngine } from '@/lib/engine/policyEngine';
import { enterpriseStore } from '@/lib/db/store';
import { validateApiKey } from '@/lib/security/auth';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const prompts: string[] = body.prompts || [];

  if (!Array.isArray(prompts) || prompts.length === 0) {
    return NextResponse.json({ error: 'Prompts array is required and must not be empty.' }, { status: 400 });
  }

  if (prompts.length > 50) {
    return NextResponse.json({ error: 'Batch limit exceeded. Maximum 50 prompts per batch request.' }, { status: 400 });
  }

  const activeRules = enterpriseStore.getRules();
  const results = [];

  for (const prompt of prompts) {
    const res = await executeMaskingEngine(
      { prompt, department: body.department, strategy: body.strategy },
      activeRules
    );
    results.push(res);
  }

  return NextResponse.json(
    { batchSize: results.length, results },
    { status: 200, headers: getSecurityHeaders() }
  );
}
