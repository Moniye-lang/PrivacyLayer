import { DetectedEntity, EntityCategory, EntityType } from '@/types';

interface ContextPrecursorRule {
  type: EntityType;
  category: EntityCategory;
  pattern: RegExp;
  groupIndex: number;
  reason: string;
  confidence: number;
  placeholderPrefix: string;
}

const STAGE4_CONTEXT_RULES: ContextPrecursorRule[] = [
  // 1. Person Verbal & Action Precursors: "tell Han", "contact John Doe", "message David"
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /\b(?:tell|message|email|contact|call|text|notify|ask|remind|inform|send\s+to|forward\s+to|reply\s+to|thank|congratulate|invite|meet\s+with|schedule\s+with|speak\s+to|speak\s+with|write\s+to|ping|dear)\s+([A-Z][a-zA-Z]{1,20}(?:\s+[A-Z][a-zA-Z]{1,20})?)\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Action verb precursor ("tell Han" / "contact John Doe")',
    confidence: 0.98,
    placeholderPrefix: 'PERSON',
  },
  // 2. Self-Identification & Introductions: "my name is Jeff", "I am Alex", "call me Jeff", "Name: Jeff"
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /\b(?:my\s+name\s+(?:is|'s)|i\s+am|i'm|call\s+me|myself|this\s+is|(?:full\s+)?name\s*[:=]|user(?:name)?\s*[:=]|signed\s+(?:by|off\s+by)?\s*[:=]?|regards,?\s*|sincerely,?\s*)\s+([a-zA-Z\u00C0-\u024F]{2,20}(?:\s+[a-zA-Z\u00C0-\u024F]{2,20})?)\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Self-identification precursor ("my name is [Name]" / "I am [Name]")',
    confidence: 0.98,
    placeholderPrefix: 'PERSON',
  },
  // 3. Executive / Job Title Precursors: "CEO David", "Manager Sarah", "Dr. John Smith"
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /\b(?:CEO|CTO|CFO|COO|President|Director|VP|Manager|Lead|Engineer|Developer|Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-zA-Z]{1,20}(?:\s+[A-Z][a-zA-Z]{1,20})?)\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Professional title precursor ("CEO David")',
    confidence: 0.98,
    placeholderPrefix: 'PERSON',
  },
  // 3. Project Precursors: "Project Titan", "Project Falcon", "Initiative Apollo"
  {
    type: 'PROJECT_CODENAME',
    category: 'CONTEXTUAL',
    pattern: /\b(?:project|initiative|codename|operation)\s+([A-Z][a-zA-Z0-9_\-]{2,30})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Project precursor ("Project Titan")',
    confidence: 0.98,
    placeholderPrefix: 'PROJECT',
  },
  // 4. Repository Precursors: "Repository Sentinel", "Repo aquire1", "Codebase X"
  {
    type: 'REPOSITORY',
    category: 'CONTEXTUAL',
    pattern: /\b(?:repository|repo|codebase|git\s+repo)\s+([A-Z0-9_\-\.\/]{2,40})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Repository precursor ("Repository Sentinel")',
    confidence: 0.98,
    placeholderPrefix: 'REPOSITORY',
  },
  // 5. Company / Organization Precursors: "Company ABC Ltd", "Acme Corp"
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:company|startup|agency|firm|corp|inc|ltd)\s+([A-Z0-9_\-\.\s]{2,30}(?:Ltd|Inc|LLC|Corp|Co|GmbH|PLC)?)\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Company/Organization precursor ("Company ABC Ltd")',
    confidence: 0.98,
    placeholderPrefix: 'ORGANIZATION',
  },
  // 6. Department Precursors: "Department of Engineering"
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:department\s+of\s+([A-Z][a-zA-Z\s]{2,20})|([A-Z][a-zA-Z\s]{2,20})\s+department)\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Department precursor ("Department of Engineering")',
    confidence: 0.96,
    placeholderPrefix: 'ORGANIZATION',
  },
];

const DISALLOWED_COMMON_WORDS = new Set([
  'api', 'key', 'token', 'secret', 'secrets', 'password', 'passwords', 'repository', 'repo',
  'contains', 'contain', 'contained', 'containing', 'does', 'do', 'doing', 'done', 'did',
  'field', 'fields', 'documentation', 'docs', 'phrase', 'phrases', 'word', 'words', 'sentence',
  'sentences', 'called', 'named', 'file', 'files', 'value', 'values', 'is', 'was', 'are', 'were',
  'will', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'the', 'a', 'an', 'this', 'that',
  'these', 'those', 'it', 'its', 'not', 'but', 'and', 'or', 'so', 'if', 'for', 'in', 'on', 'at',
  'to', 'from', 'with', 'by', 'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between',
  'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among', 'my', 'your', 'his',
  'her', 'their', 'our', 'we', 'you', 'he', 'she', 'they', 'them', 'us', 'me', 'him', 'who',
  'whom', 'whose', 'which', 'what', 'where', 'when', 'why', 'how', 'here', 'there', 'now', 'then',
  'today', 'tomorrow', 'yesterday', 'first', 'second', 'third', 'last', 'next', 'only', 'same',
  'other', 'another', 'such', 'no', 'nor', 'too', 'very', 'can', 'cannot', 'could', 'should',
  'would', 'may', 'might', 'must', 'shall', 'just', 'also', 'than', 'more', 'most', 'some', 'any',
  'all', 'both', 'each', 'few', 'much', 'many', 'own'
]);

export function runStage4Context(text: string): DetectedEntity[] {
  const detected: DetectedEntity[] = [];

  for (const rule of STAGE4_CONTEXT_RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.pattern.exec(text)) !== null) {
      let matchText = match[rule.groupIndex] || match[1] || match[2] || match[0];
      if (!matchText || matchText.length < 2) continue;

      matchText = matchText.replace(/['’]s$/i, '').replace(/[.,;:!?]+$/, '').trim();

      const words = matchText.split(/\s+/);
      if (words.length > 1 && DISALLOWED_COMMON_WORDS.has(words[words.length - 1].toLowerCase())) {
        words.pop();
        matchText = words.join(' ');
      }

      if (DISALLOWED_COMMON_WORDS.has(matchText.toLowerCase()) || matchText.length < 2) {
        continue;
      }

      const startIndex = match.index + match[0].indexOf(matchText);

      const isDuplicate = detected.some(
        (existing) => Math.max(existing.start, startIndex) < Math.min(existing.end, startIndex + matchText.length)
      );

      if (!isDuplicate) {
        detected.push({
          id: `stg4_ctx_${rule.type}_${startIndex}_${Math.random().toString(36).substring(2, 6)}`,
          type: rule.type,
          category: rule.category,
          text: matchText,
          start: startIndex,
          end: startIndex + matchText.length,
          confidence: rule.confidence,
          reason: rule.reason,
          placeholder: `[[${rule.placeholderPrefix}_001]]`,
          votes: [
            {
              stage: 'CONTEXT',
              type: rule.type,
              confidence: rule.confidence,
              reason: rule.reason,
            },
          ],
        });
      }
    }
  }

  return detected;
}
