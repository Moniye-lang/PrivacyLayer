import { z } from 'zod';

// Zod payload validation schema for API requests
export const MaskRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt content is required').max(100000, 'Prompt exceeds max 100k characters'),
  department: z.string().optional().default('Global'),
  country: z.string().optional().default('ALL'),
  strategy: z.enum(['REPLACE', 'REDACT', 'HASH', 'PSEUDONYMIZE']).optional().default('REPLACE'),
  customCodenames: z.array(z.string()).optional().default([]),
  userId: z.string().optional(),
  modelTarget: z.string().optional().default('gpt-4o'),
});

// XSS Sanitizer for input strings
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// OWASP Security headers generator for NextResponse
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}
