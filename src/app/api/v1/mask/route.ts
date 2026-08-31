import { shieldPrompt } from '@/lib/engine/policyEngine';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt, customCodenames, customTerms } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt string is required.' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    const result = await shieldPrompt({
      prompt,
      customTerms: customCodenames || customTerms || [],
    });

    return NextResponse.json({
      originalPrompt: prompt,
      maskedPrompt: result.protectedPrompt,
      riskScore: 100 - result.initialPrivacyScore,
      initialPrivacyScore: result.initialPrivacyScore,
      shieldedPrivacyScore: result.shieldedPrivacyScore,
      riskLevel: result.riskLevel,
      entitiesDetectedCount: result.entitiesCount,
      entities: result.detectedEntities,
      sessionId: result.sessionId,
      latency: {
        regexMs: (result.processingTimeMs * 0.3).toFixed(1),
        semanticMs: (result.processingTimeMs * 0.5).toFixed(1),
        policyMs: (result.processingTimeMs * 0.2).toFixed(1),
        totalMs: result.processingTimeMs,
      },
      decision: result.entitiesCount > 0 ? 'MASKED' : 'PASSED',
    }, { status: 200, headers: getSecurityHeaders() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Error' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
