import { shieldImage } from '@/lib/engine/image/imageShieldEngine';
import { validateApiKey } from '@/lib/security/auth';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { ShieldImageRequestPayload } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ShieldImageRequestPayload;

  if (!body.imageDataUrl || !body.imageDataUrl.trim()) {
    return NextResponse.json(
      { error: 'imageDataUrl is required' },
      { status: 400 }
    );
  }

  try {
    const result = await shieldImage(body);
    return NextResponse.json(result, {
      status: 200,
      headers: getSecurityHeaders(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Image shielding execution failed' },
      { status: 500 }
    );
  }
}
