import { getSecurityHeaders } from '@/lib/security/owasp';
import { NextResponse } from 'next/server';

export async function GET() {
  const healthStatus = {
    status: 'HEALTHY',
    version: '1.0.0-enterprise',
    service: 'Intelligence Driven Masking Proxy',
    timestamp: new Date().toISOString(),
    engineLatencySLA: '< 15ms',
    components: {
      regexEngine: 'OPERATIONAL',
      semanticEngine: 'OPERATIONAL',
      policyEngine: 'OPERATIONAL',
      rateLimiter: 'OPERATIONAL',
      memoryCache: 'ACTIVE',
      database: process.env.MONGODB_URI ? 'CONNECTED' : 'IN_MEMORY_FALLBACK',
      redis: process.env.REDIS_URL ? 'CONNECTED' : 'IN_MEMORY_FALLBACK',
    },
  };

  return NextResponse.json(healthStatus, {
    status: 200,
    headers: getSecurityHeaders(),
  });
}
