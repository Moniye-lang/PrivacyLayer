import { enterpriseStore } from '@/lib/db/store';
import { getSecurityHeaders } from '@/lib/security/owasp';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() || '';
  const decision = searchParams.get('decision') || 'ALL';
  const format = searchParams.get('format') || 'json';

  let logs = enterpriseStore.getAuditLogs();

  if (search) {
    logs = logs.filter(
      (l) =>
        l.promptSnippet.toLowerCase().includes(search) ||
        l.maskedSnippet.toLowerCase().includes(search) ||
        l.department.toLowerCase().includes(search) ||
        l.userId.toLowerCase().includes(search) ||
        l.requestId.toLowerCase().includes(search)
    );
  }

  if (decision !== 'ALL') {
    logs = logs.filter((l) => l.decision === decision);
  }

  if (format === 'csv') {
    const csvRows = [
      'ID,Timestamp,RequestId,User,Department,RiskScore,EntitiesCount,Decision,Signature',
      ...logs.map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.requestId}","${l.userId}","${l.department}",${l.riskScore},${l.entitiesCount},"${l.decision}","${l.signature}"`
      ),
    ];
    return new NextResponse(csvRows.join('\n'), {
      status: 200,
      headers: {
        ...getSecurityHeaders(),
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="audit_logs.csv"',
      },
    });
  }

  return NextResponse.json({ total: logs.length, logs }, { status: 200, headers: getSecurityHeaders() });
}
