import { DetectedEntity, EntityType } from '@/types';

// Pre-configured default enterprise codenames for context detection
const DEFAULT_CODENAMES = [
  'Project Phoenix',
  'Project Titan',
  'Operation Aegis',
  'Falcon Horizon',
  'Project Q-Branch',
  'Project Quantum',
  'Apollo 2.0',
  'Project Falcon',
];

interface SemanticContextPattern {
  type: EntityType;
  category: 'CONTEXTUAL' | 'SECRET' | 'MEDICAL' | 'LEGAL' | 'FINANCIAL' | 'PII';
  contextRegex: RegExp;
  targetGroupIndex: number;
  reason: string;
  confidence: number;
}

const SEMANTIC_PATTERNS: SemanticContextPattern[] = [
  // Project codenames: "Project Falcon", "Operation Aegis"
  {
    type: 'PROJECT_CODENAME',
    category: 'CONTEXTUAL',
    contextRegex: /\b(?:project|operation|initiative|codename|stealth project)\s+([A-Z][a-zA-Z0-9_\-\s]{2,20})\b/gi,
    targetGroupIndex: 0,
    reason: 'Semantic codename pattern in project context',
    confidence: 0.95,
  },
  // Executive approval of confidential initiative
  {
    type: 'COMPANY_SECRET',
    category: 'SECRET',
    contextRegex: /\b(?:CEO|CTO|CFO|Board|VP|Director)\s+(?:approved|authorized|signed|disclosed|reviewed)\s+([A-Z][a-zA-Z0-9\s]{2,25})/gi,
    targetGroupIndex: 0,
    reason: 'Executive authorization of sensitive internal asset',
    confidence: 0.92,
  },
  // Financial metrics (M&A, unreleased revenue, valuation)
  {
    type: 'FINANCIAL_METRIC',
    category: 'FINANCIAL',
    contextRegex: /\b(?:Q[1-4]|fiscal year|ARR|MRR|EBITDA|valuation|settlement|acquisition)\b[^$0-9]{1,30}?(\$?\d+(?:\.\d+)?\s*(?:million|billion|M|B|k)?)\b/gi,
    targetGroupIndex: 0,
    reason: 'Sensitive internal financial metric or valuation context',
    confidence: 0.89,
  },
  // Person name near professional title: "Dr. John Doe", "Counsel Jane Smith"
  {
    type: 'PERSON_NAME',
    category: 'PII',
    contextRegex: /\b(?:Dr\.|Prof\.|Counsel|Attorney|Patient|Employee|User|Manager|Mr\.|Mrs\.|Ms\.|Executive|Director)\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/g,
    targetGroupIndex: 1,
    reason: 'Contextual Person Name identified near professional title',
    confidence: 0.91,
  },
  // Medical records / diagnostic context
  {
    type: 'MEDICAL_RECORD',
    category: 'MEDICAL',
    contextRegex: /\b(?:diagnosed with|prescribed|patient history of|symptoms include|medical record #?)\s+([a-zA-Z0-9\s]{4,30})\b/gi,
    targetGroupIndex: 0,
    reason: 'Protected Health Information (PHI) medical diagnostic context',
    confidence: 0.93,
  },
  // Legal references
  {
    type: 'LEGAL_REFERENCE',
    category: 'LEGAL',
    contextRegex: /\b(?:NDA|non-disclosure|litigation|case #?|settlement agreement|court order)\s+([a-zA-Z0-9\-_\s]{3,25})\b/gi,
    targetGroupIndex: 0,
    reason: 'Confidential Legal & Litigation reference context',
    confidence: 0.90,
  },
];

export function runSemanticDetection(
  text: string,
  customCodenames: string[] = []
): DetectedEntity[] {
  const detected: DetectedEntity[] = [];
  const activeCodenames = Array.from(new Set([...DEFAULT_CODENAMES, ...customCodenames]));

  // 1. Direct Exact Match for Known Enterprise Codenames (Case Insensitive)
  for (const codename of activeCodenames) {
    if (!codename || codename.trim().length < 3) continue;
    
    const escaped = codename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0];

      const isDuplicate = detected.some(
        (existing) => Math.max(existing.start, match!.index) < Math.min(existing.end, match!.index + matchText.length)
      );
      if (isDuplicate) continue;

      detected.push({
        id: `sem_code_${match.index}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'PROJECT_CODENAME',
        category: 'CONTEXTUAL',
        text: matchText,
        start: match.index,
        end: match.index + matchText.length,
        confidence: 0.98,
        reason: `Matched known confidential enterprise codename (${codename})`,
        placeholder: '[[PROJECT_001]]',
      });
    }
  }

  // 2. Contextual Semantic Rules
  for (const rule of SEMANTIC_PATTERNS) {
    rule.contextRegex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.contextRegex.exec(text)) !== null) {
      const matchText = match[rule.targetGroupIndex] || match[0];
      const startIndex = match.index + (rule.targetGroupIndex > 0 ? match[0].indexOf(matchText) : 0);

      const isDuplicate = detected.some(
        (existing) => Math.max(existing.start, startIndex) < Math.min(existing.end, startIndex + matchText.length)
      );

      if (!isDuplicate) {
        detected.push({
          id: `sem_ctx_${rule.type}_${startIndex}_${Math.random().toString(36).substr(2, 6)}`,
          type: rule.type,
          category: rule.category,
          text: matchText,
          start: startIndex,
          end: startIndex + matchText.length,
          confidence: rule.confidence,
          reason: rule.reason,
          placeholder: `[[${rule.type}]]`,
        });
      }
    }
  }

  return detected;
}
