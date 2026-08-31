import { executeMaskingEngine } from '@/lib/engine/policyEngine';
import { enterpriseStore } from '@/lib/db/store';
import { validateApiKey } from '@/lib/security/auth';
import { MaskRequestSchema, getSecurityHeaders } from '@/lib/security/owasp';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parseResult = MaskRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid Payload' }, { status: 400 });
  }

  const payload = parseResult.data;
  const activeRules = enterpriseStore.getRules();
  const maskResult = await executeMaskingEngine(payload, activeRules);

  // Stream chunks back over SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send metadata event
      controller.enqueue(
        encoder.encode(`event: metadata\ndata: ${JSON.stringify({ requestId: maskResult.requestId, entitiesDetected: maskResult.entitiesDetectedCount, riskScore: maskResult.riskScore })}\n\n`)
      );

      // 2. Stream masked prompt in word chunks with slight natural latency
      const promptText = maskResult.maskedPrompt || maskResult.protectedPrompt || '';
      const words = promptText.split(' ');
      for (const word of words) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: word + ' ' })}\n\n`));
        await new Promise((res) => setTimeout(res, 25));
      }

      // 3. Send done event
      const totalLatency = maskResult.latency?.totalMs ?? maskResult.processingTimeMs ?? 0;
      controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ latencyMs: totalLatency })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...getSecurityHeaders(),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
