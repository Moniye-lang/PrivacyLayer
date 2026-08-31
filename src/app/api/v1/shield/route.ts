import { privacyStore } from '@/lib/db/store';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { NextRequest, NextResponse } from 'next/server';
import { shieldPrompt } from '@/lib/engine/policyEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt, customTerms, ttlMinutes, manualOverrides } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'prompt is required and must be a non-empty string.' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    console.log(`[Shield API] Incoming shield request: prompt length=${prompt.length}, customTerms=${JSON.stringify(customTerms)}`);

    const result = await shieldPrompt({
      prompt: prompt.trim(),
      customTerms: Array.isArray(customTerms) ? customTerms : [],
      manualOverrides: Array.isArray(manualOverrides) ? manualOverrides : [],
      ttlMinutes: typeof ttlMinutes === 'number' ? ttlMinutes : 60,
    });

    console.log(`[Shield API] Shield SUCCESS: sessionId="${result.sessionId}", entities=${result.entitiesCount}, score ${result.initialPrivacyScore}→${result.shieldedPrivacyScore}`);
    console.log(`[Shield API] Store diagnostics after save:`, privacyStore.diagnostics());

    return NextResponse.json(result, {
      status: 200,
      headers: getSecurityHeaders(),
    });
  } catch (err: any) {
    console.error('[Shield API] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Shield Error' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
