import { NextRequest } from 'next/server';

export interface UserSession {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SECURITY_OFFICER' | 'DEVELOPER' | 'AUDITOR';
  organizationId: string;
  department: string;
}

export function validateApiKey(request: NextRequest): { valid: boolean; keyId?: string; rateLimit?: number } {
  const authHeader = request.headers.get('Authorization') || '';
  const apiKeyHeader = request.headers.get('X-API-Key') || '';

  const token = authHeader.replace('Bearer ', '').trim() || apiKeyHeader.trim();

  // If no key provided, allow demo requests with default limits
  if (!token) {
    return { valid: true, keyId: 'demo_key_public', rateLimit: 60 };
  }

  if (token.startsWith('sk_live_') || token === 'demo_key_public' || token.length >= 16) {
    return { valid: true, keyId: `key_${token.slice(0, 10)}`, rateLimit: 1000 };
  }

  return { valid: false };
}

export function getCurrentSession(): UserSession {
  return {
    userId: 'usr_enterprise_master',
    email: 'cto@enterprise.com',
    role: 'ADMIN',
    organizationId: 'org_acme_corp',
    department: 'Engineering',
  };
}
