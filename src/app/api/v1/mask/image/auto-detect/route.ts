import { NextRequest, NextResponse } from 'next/server';
import { autoDetectImageSensitiveRegionsServer } from '@/lib/engine/image/autoImageShieldEngine';
import { getSecurityHeaders } from '@/lib/security/owasp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { imageDataUrl, sampleTextFallback } = body;

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageDataUrl is required' },
        { status: 400 }
      );
    }

    const selections = await autoDetectImageSensitiveRegionsServer(imageDataUrl, sampleTextFallback);

    return NextResponse.json(
      {
        success: true,
        selections,
        ocrWords: (selections as any).ocrWords || [],
        ocrRegions: (selections as any).ocrRegions || [],
        ocrText: (selections as any).ocrText || '',
      },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (err: any) {
    console.error('[API /api/v1/mask/image/auto-detect error]:', err);
    return NextResponse.json(
      { error: err.message || 'Auto-detect sensitive regions failed' },
      { status: 500 }
    );
  }
}
