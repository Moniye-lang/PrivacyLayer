import { privacyStore } from '@/lib/db/store';
import { revealResponse } from '@/lib/engine/policyEngine';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, aiResponse } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required and must be a string.' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    if (aiResponse === undefined || typeof aiResponse !== 'string') {
      return NextResponse.json(
        { error: 'aiResponse is required and must be a string.' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    console.log(`[Reveal API] Incoming request: sessionId="${sessionId}", aiResponse length=${aiResponse.length}`);

    // Check if session has been explicitly purged
    const legacySession = privacyStore.getSession(sessionId);
    if (legacySession?.isPurged) {
      console.error(`[Reveal API] Session "${sessionId}" has been permanently purged.`);
      return NextResponse.json(
        {
          error: 'This privacy mapping has been permanently deleted by the user.',
          code: 'SESSION_PURGED',
          sessionId,
        },
        { status: 410, headers: getSecurityHeaders() }
      );
    }

    try {
      const result = await revealResponse({ sessionId, aiResponse });
      console.log(`[Reveal API] Reveal SUCCESS: ${result.restoredCount} placeholders restored in ${result.processingTimeMs}ms`);
      return NextResponse.json(result, {
        status: 200,
        headers: getSecurityHeaders(),
      });
    } catch (engineErr: any) {
      // Fallback: If revealStore missed but privacyStore has it (e.g. demo session or legacy mapping)
      if (legacySession && legacySession.encryptedMappings) {
        const startTime = performance.now();
        let restoredResponse = aiResponse;
        const restoredEntities: { placeholder: string; originalText: string }[] = [];
        let restoredCount = 0;

        const rawMappings: Record<string, string> =
          typeof legacySession.encryptedMappings === 'string'
            ? JSON.parse(legacySession.encryptedMappings)
            : legacySession.encryptedMappings;

        const entries = Object.entries(rawMappings)
          .map(([key, val]) => ({
            placeholder: key.startsWith('[') ? key : `[[${key}]]`,
            bareToken: key.replace(/^\[+|\]+$/g, '').trim(),
            originalText: val,
          }))
          .filter((e) => e.bareToken && e.originalText)
          .sort((a, b) => b.bareToken.length - a.bareToken.length);

        for (const entry of entries) {
          const escaped = entry.bareToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\[+\\s*${escaped}\\s*\\]+`, 'gi');
          const matches = restoredResponse.match(regex);
          if (matches && matches.length > 0) {
            restoredCount += matches.length;
            restoredResponse = restoredResponse.replace(regex, entry.originalText);
            restoredEntities.push({ placeholder: entry.placeholder, originalText: entry.originalText });
          }
        }

        const processingTimeMs = parseFloat((performance.now() - startTime).toFixed(1));
        console.log(`[Reveal API] Fallback store reveal complete: ${restoredCount} restored in ${processingTimeMs}ms`);

        return NextResponse.json(
          {
            sessionId,
            restoredResponse,
            restoredCount,
            restoredEntities,
            processingTimeMs,
          },
          { status: 200, headers: getSecurityHeaders() }
        );
      }

      console.error(`[Reveal API] Session not found for sessionId="${sessionId}":`, engineErr);
      return NextResponse.json(
        {
          error: 'Shield session not found or expired. Please shield your prompt again.',
          code: 'SESSION_NOT_FOUND',
          sessionId,
          hint: 'Sessions expire after 60 minutes. Re-shield your prompt to generate a new session.',
        },
        { status: 404, headers: getSecurityHeaders() }
      );
    }
  } catch (err: any) {
    console.error('[Reveal API] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during Reveal.' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
