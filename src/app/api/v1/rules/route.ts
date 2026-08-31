import { enterpriseStore } from '@/lib/db/store';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const rules = enterpriseStore.getRules();
  const codenames = enterpriseStore.getCodenames();
  return NextResponse.json({ rules, codenames }, { status: 200, headers: getSecurityHeaders() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { type, payload } = body;

  if (type === 'RULE') {
    const newRule = enterpriseStore.addRule(payload);
    return NextResponse.json({ success: true, rule: newRule }, { status: 201, headers: getSecurityHeaders() });
  } else if (type === 'CODENAME') {
    const newCode = enterpriseStore.addCodename(payload);
    return NextResponse.json({ success: true, codename: newCode }, { status: 201, headers: getSecurityHeaders() });
  }

  return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { ruleId } = body;
  const updated = enterpriseStore.toggleRule(ruleId);
  return NextResponse.json({ success: !!updated, rule: updated }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ruleId = searchParams.get('ruleId');
  const codeId = searchParams.get('codeId');

  if (ruleId) {
    const deleted = enterpriseStore.deleteRule(ruleId);
    return NextResponse.json({ success: deleted }, { status: 200 });
  } else if (codeId) {
    const deleted = enterpriseStore.deleteCodename(codeId);
    return NextResponse.json({ success: deleted }, { status: 200 });
  }

  return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
}
