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
  // 2. Self-Identification & Introductions: "my name is Jeff", "I am Alex", "call me Jeff", "Name: uuuebf"
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /\b(?:my\s+name\s+(?:is|'s)|i\s+am|i'm|call\s+me|myself|this\s+is|(?:full\s+)?name\s*[:=]|user(?:name)?\s*[:=]|signed\s+(?:by|off\s+by)?\s*[:=]?|client\s*[:=]|customer\s*[:=]|patient\s*[:=]|doctor\s*[:=]|author\s*[:=]|owner\s*[:=]|admin\s*[:=]|handle\s*[:=]|alias\s*[:=]|regards,?\s*|sincerely,?\s*)\s*["']?([a-zA-Z0-9_\-\.\u00C0-\u024F]{2,40}(?:\s+[a-zA-Z0-9_\-\.\u00C0-\u024F]{1,40}){0,2})["']?\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Identity / Name label precursor ("Name: [Value]" / "my name is [Name]")',
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
  // 5a. Explicit Organization / Bank Name Precursor: "Bank Name: First Continental Bank"
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:Bank(?:\s+Name)?|Company(?:\s+Name)?|Organization(?:\s+Name)?|Org(?:\s+Name)?|Institution(?:\s+Name)?|Agency(?:\s+Name)?|Business(?:\s+Name)?|Employer(?:\s+Name)?|Firm(?:\s+Name)?)\s*[:=]\s*["']?([a-zA-Z0-9&.\'\-\u00C0-\u024F\u1E00-\u1EFF]{2,35}(?:[^\S\r\n]+[a-zA-Z0-9&.\'\-\u00C0-\u024F\u1E00-\u1EFF]{1,35}){0,4})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Organization / Bank name precursor',
    confidence: 0.99,
    placeholderPrefix: 'ORGANIZATION',
  },
  // 5b. Corporate Organization & Bank Name Precursors / Suffixes: "First Continental Bank", "Continental Bank", "Apex Bank"
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b((?:First\s+|United\s+|Union\s+|Standard\s+|National\s+|Global\s+|Central\s+|Federal\s+|Apex\s+)?[A-Z\u00C0-\u024F][a-zA-Z0-9&.\'\-]{1,25}(?:[^\S\r\n]+[A-Z\u00C0-\u024F][a-zA-Z0-9&.\'\-]{1,25}){0,3}[^\S\r\n]+(?:Bank|Microfinance\s+Bank|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH))\b/g,
    groupIndex: 1,
    reason: 'Context Engine: Corporate organization / bank name recognized by suffix',
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
  // 7a. National Identification Numbers (NIN / SSN)
  {
    type: 'SSN_NATIONAL_ID',
    category: 'PII',
    pattern: /\b(?:National\s+Identification(?:\s+Number)?(?:\s*\([A-Za-z]+\))?|National\s+Identity(?:\s+(?:Number|No\.?|#))?(?:\s*\([A-Za-z]+\))?|National\s+ID(?:\s+(?:Number|No\.?|#))?(?:\s*\([A-Za-z]+\))?|NIN(?:\s+(?:Number|No\.?|#))?|SSN|Social\s+Security(?:\s+Number)?|Passport(?:\s+(?:Number|No\.?|#))?|Driver['’]?s\s+License|Tax\s+ID|EIN|TIN)(?!\s*(?:Management|Commission|Authority|Ministry|Agency|Department|Card|Slip))\s*[:=\-]?\s*([0-9]{3,4}[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{3,5}|\d{9,14}|(?=[A-Za-z0-9]*\d{2})[A-Za-z0-9]{6,16}|(?=[A-Za-z0-9\-\/]*\d)[A-Za-z0-9]{2,6}(?:[-\/][A-Za-z0-9]{2,6}){1,3})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: National ID / NIN precursor',
    confidence: 0.99,
    placeholderPrefix: 'NIN',
  },
  // 7b. Bank Verification Number (BVN)
  {
    type: 'BANK_ACCOUNT',
    category: 'PII',
    pattern: /\b(?:Bank\s+Verification(?:\s+Number)?(?:\s*\([A-Za-z]+\))?|BVN(?:\s+Number)?)\s*[:=\-]?\s*([0-9]{2,4}[\s\-]?[0-9]{2,4}[\s\-]?[0-9]{2,5}|\d{11})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Bank Verification Number (BVN) precursor',
    confidence: 0.99,
    placeholderPrefix: 'BVN',
  },
  // 7c. Phone Number Context Precursors
  {
    type: 'PHONE_NUMBER',
    category: 'PII',
    pattern: /\b(?:Phone(?:\s+Number)?|Telephone|Tel|Mobile(?:\s+Number)?|Cell(?:\s+Phone)?|Call(?:\s+us\s+at)?|Contact\s+(?:Number|Phone)|Hotline|WhatsApp|SMS|Fax|Reach\s+me\s+(?:on|at))\s*[:=]\s*([+0-9\s\-\.\(\)]{7,22})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Phone number precursor',
    confidence: 0.99,
    placeholderPrefix: 'PHONE',
  },
  // 8. Banking Identifiers (Account Number)
  {
    type: 'BANK_ACCOUNT',
    category: 'FINANCIAL',
    pattern: /\b(?:Bank\s+Account(?:\s+Number)?|Routing\s+Number|Sort\s+Code|Account\s+Number|IBAN|SWIFT(?:\s+Code)?|BIC)\s*[:=\-]?\s*([A-Za-z0-9\-][A-Za-z0-9\-[^\S\r\n]]{3,32}[A-Za-z0-9]|[A-Za-z0-9]{4,34})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Banking / Account Number precursor',
    confidence: 0.99,
    placeholderPrefix: 'BVN',
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

      if (rule.type === 'PERSON_NAME' && /\b(?:Bank|Microfinance\s+Bank|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH)\b/i.test(matchText)) {
        continue;
      }

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
