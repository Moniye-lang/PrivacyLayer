import { imageRevealEngineInstance } from '@/lib/engine/image/imageRevealEngine';
import { validateApiKey } from '@/lib/security/auth';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { RevealImageRequestPayload } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as RevealImageRequestPayload;

  if (!body.sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  try {
    const result = await imageRevealEngineInstance.restore(body);
    return NextResponse.json(result, {
      status: 200,
      headers: getSecurityHeaders(),
    });
  } catch (err: any) {
    const message = err.message || 'Image reveal execution failed';
    const status = message.includes("This image doesn't match")
      ? 400
      : message.includes('not found')
      ? 404
      : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: getSecurityHeaders() }
    );
  }
}
