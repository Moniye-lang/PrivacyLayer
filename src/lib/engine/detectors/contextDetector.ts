import { CandidateDetection, Detector, DetectorContext, EntityCategory, EntityType, PriorityLevel } from '../../../types';

interface ContextPrecursorRule {
  type: EntityType;
  category: EntityCategory;
  pattern: RegExp;
  groupIndex: number;
  reason: string;
  confidence: number;
  priority?: number;
}

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
  'all', 'both', 'each', 'few', 'much', 'many', 'own', 'shift', 'shifts', 'on-call', 'oncall',
  'stale', 'fresh', 'metric', 'metrics', 'dashboard', 'service', 'services', 'caching', 'thing',
  'notes', 'item', 'items', 'open', 'closed', 'summary', 'experience', 'education', 'skills',
  'certificate', 'secondary', 'school', 'university', 'college', 'intern', 'assistant', 'senior',
  'junior', 'lead', 'manager', 'director', 'engineer', 'developer', 'gas', 'oil', 'tech', 'arts',
  'fine', 'digital', 'technical', 'business', 'relational', 'reset', 'change', 'policy', 'example',
  'test', 'sample', 'setting', 'settings', 'config', 'configuration', 'backup', 'contact', 'details',
  'note', 'warning', 'info', 'caution', 'primary', 'secondary'
]);

const NON_PERSON_ENGLISH_WORDS = DISALLOWED_COMMON_WORDS;

const CONTEXT_RULES: ContextPrecursorRule[] = [
  // 1. Person Verbal & Action Precursors (requires capitalized person name, preventing trailing prose capture)
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /(?<![-_])\b(?:tell|message|contact|call|text|notify|ask|remind|inform|send\s+to|forward\s+to|reply\s+to|thank|congratulate|invite|meet\s+with|schedule\s+with|speak\s+to|speak\s+with|write\s+to|ping|dear|spoke\s+to|spoke\s+with|chatted\s+with|assigned\s+to|worked\s+with|helped\s+by|referred\s+by|connected\s+with|introduced\s+to|reported\s+to|approved\s+by|reviewed\s+by|signed\s+by|authored\s+by|presented\s+by|interviewed\s+by|recommended\s+by)\s+([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20}(?:\s+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20})?)\b/g,
    groupIndex: 1,
    reason: 'Context Engine: Action verb precursor',
    confidence: 0.98,
  },
  // 1b. Self-Identification & General Introductions: "my name is Jeff", "my name is jeff", "I am Jeff", "call me Jeff", "this is Jeff"
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /(?<![-_])\b(?:my\s+name\s+(?:is|'s)|i\s+am|i'm|call\s+me|myself|this\s+is|regards,?\s*|sincerely,?\s*)\s+([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{2,20}(?:[ \t]+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20})?)\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Self-identification precursor',
    confidence: 0.98,
  },
  // 2. Executive / Job Title / Form Field / Role Precursors
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /(?<![-_])\b(?:CEO|CTO|CFO|COO|President|Director|VP|Manager|Lead|Engineer|Developer|Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Founder|Co-founder|Partner|Chairperson|Architect|Consultant|Analyst|Specialist|Officer|Coordinator|Representative|Agent|Speaker|Presenter|Attendee|Assignee|Reporter|Author)\s+([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20}(?:\s+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20})?)\b|\b(?:Customer|Client|Admin|Owner|Contact|Full\s+Name|First\s+Name|Last\s+Name|User|Username|Employee|Applicant|Candidate|Patient|Member|Account\s+Holder|Author|Recipient|Sender|Agent|Supervisor|Signed\s+by|(?<!\b(?:Project|Repo|Repository|Codebase|Database|DB|File|App|Application|Service|Table|Column|Field|Bucket|Secret|Key|Host|Server|Domain|Site)\s+)Name)(?:\s*(?:Name|Person|Holder|Details))?\s*[:=]\s*([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{2,20}(?:\s+[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{2,20}){0,2})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Professional / Role precursor',
    confidence: 0.98,
  },
  // 2b. Managed By / Owned By / Assigned To Precursors
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /(?<![-_])\b(?:managed\s+by|owned\s+by|assigned\s+to|created\s+by|supervised\s+by)\s+([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20}(?:\s+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20})?)\b/g,
    groupIndex: 1,
    reason: 'Context Engine: Ownership / Management precursor',
    confidence: 0.98,
  },
  // 2c. Email Label Precursors
  {
    type: 'EMAIL_ADDRESS',
    category: 'PII',
    pattern: /\b(?:Email|E-mail|Mail|Admin\s+email|Contact\s+email|User\s+email|Email\s+Address|Email-Address|Primary\s+Email|Work\s+Email|Personal\s+Email|Email\s+ID|Account\s+Email|Customer\s+Email)\s*[:=\-\.\|\> \t]\s*([a-zA-Z0-9._%+-]+(?:\s*\.\s*[a-zA-Z0-9._%+-]+)*\s*(?:@|\[at\]|\(at\)|@)\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Email label precursor',
    confidence: 0.99,
  },
  // 3. Project Precursors
  {
    type: 'PROJECT_CODENAME',
    category: 'CONTEXTUAL',
    pattern: /(?<![-_])\b(?:(?:[Pp]roject|[Ii]nitiative|[Cc]odename|[Oo]peration|[Pp]rogram|[Cc]ampaign)\s+(?:[Nn]ame|[Cc]odename)\s*[:=]\s*([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]{1,30}(?:\s+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]{1,30})?)|(?:[Pp]roject|[Ii]nitiative|[Cc]odename|[Oo]peration|[Pp]roduct|[Ff]eature|[Pp]latform|[Pp]ortal|[Ee]ngine|[Mm]odule|[Ss]ystem|[Pp]ipeline)\s*[:=]?\s*([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]{2,30}))\b/g,
    groupIndex: 1,
    reason: 'Context Engine: Project precursor',
    confidence: 0.98,
    priority: PriorityLevel.CONTEXT + 10, // 80 priority to override generic dictionary NER when explicit "Project" prefix exists
  },
  // 3b. Product / Project / Feature Launch Precursors: "Sakura launches Friday", "Portal rolling out tomorrow"
  {
    type: 'PROJECT_CODENAME',
    category: 'CONTEXTUAL',
    pattern: /(?<![-_])\b([A-Z\u00C0-\u024F][a-zA-Z0-9_\-\u00C0-\u024F]{1,30})\s+(?:launches|launched|launching|rolls\s+out|rolling\s+out|goes\s+live|went\s+live|is\s+releasing|released|deployed|deploying)\b/g,
    groupIndex: 1,
    reason: 'Context Engine: Product / Project launch precursor',
    confidence: 0.98,
  },
  // 4. Repository Precursors
  {
    type: 'REPOSITORY',
    category: 'CONTEXTUAL',
    pattern: /\b(?:[Rr]epository(?:\s+[Nn]ame)?|[Rr]epo(?:\s+[Nn]ame)?|[Cc]odebase|[Gg]it\s+repo)\b\s*[:=]?\s*([A-Za-z0-9_\-\.\/]{2,40})\b/g,
    groupIndex: 1,
    reason: 'Context Engine: Repository precursor',
    confidence: 0.98,
  },
  // 5. Company / Organization Precursors
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:company|startup|agency|firm|corp|inc|ltd)\s+([A-Z0-9_\-\.\s]{2,30}(?:Ltd|Inc|LLC|Corp|Co|GmbH|PLC)?)\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Company/Organization precursor',
    confidence: 0.98,
  },
  // 6. Department Precursors
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:department\s+of\s+([A-Z][a-zA-Z\s]{2,20})|([A-Z][a-zA-Z\s]{2,20})\s+department)\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Department precursor',
    confidence: 0.96,
  },
  // 7. National Identification Numbers
  {
    type: 'SSN_NATIONAL_ID',
    category: 'PII',
    pattern: /\b(?:SSN|Social\s+Security(?:\s+Number)?|National\s+ID|Passport(?:\s+Number)?|Driver['’]?s\s+License|Tax\s+ID|EIN|TIN|NIN|BVN)\s*[:=]\s*([A-Za-z0-9\-\/ ]{5,25})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: National ID / SSN precursor',
    confidence: 0.99,
  },
  // 8. Banking & Financial Identifiers
  {
    type: 'IBAN',
    category: 'PII',
    pattern: /\b(?:Bank\s+Account(?:\s+Number)?|Routing\s+Number|Sort\s+Code|Account\s+Number|IBAN|SWIFT(?:\s+Code)?|BIC)\s*[:=]\s*([A-Za-z0-9\-\s]{5,34})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Banking / IBAN precursor',
    confidence: 0.99,
  },
  // 9. System User & Customer IDs
  {
    type: 'SSN_NATIONAL_ID',
    category: 'PII',
    pattern: /\b(?:User\s+ID|Account\s+ID|Customer\s+ID|Client\s+ID|Employee\s+ID|Member\s+ID|Patient\s+ID|Subscriber\s+ID|Ticket\s+ID)\s*[:=]\s*([A-Za-z0-9\-_#]{3,30})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: System Identifier precursor',
    confidence: 0.95,
  },
];

export class ContextDetector implements Detector {
  public readonly id = 'context-detector';
  public readonly name = 'Context Precursor Detector';
  public readonly priority = PriorityLevel.CONTEXT;

  public async detect(text: string, context?: DetectorContext): Promise<CandidateDetection[]> {
    const candidates: CandidateDetection[] = [];

    // Resume / Document Header Candidate Name Detection (top 1-3 lines before contact info or summary)
    const headerLines = text.split(/\r?\n/).slice(0, 4);
    for (let lineIdx = 0; lineIdx < headerLines.length; lineIdx++) {
      const line = headerLines[lineIdx].trim();
      if (!line || line.length < 3 || line.length > 50) continue;
      // Must not be a section title or contain numbers
      if (/^(?:PROFESSIONAL\s+SUMMARY|WORK\s+EXPERIENCE|EXPERIENCE|EDUCATION|SKILLS|CURRICULUM\s+VITAE|RESUME|COVER\s+LETTER|HANDOFF\s+NOTES|NOTES|ADVERSARIAL\s+PRIVACY)\b/i.test(line)) {
        break;
      }
      // Line must be 2 to 4 capitalized words (letters and spaces only)
      if (/^[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20}(?:\s+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20}){1,3}$/.test(line)) {
        const words = line.split(/\s+/);
        const hasStopword = words.some((w) => DISALLOWED_COMMON_WORDS.has(w.toLowerCase()));
        if (!hasStopword) {
          const lineOffset = text.indexOf(line);
          if (lineOffset !== -1) {
            candidates.push({
              id: `context_header_person_${lineOffset}`,
              start: lineOffset,
              end: lineOffset + line.length,
              entityType: 'PERSON_NAME',
              confidence: 0.98,
              priority: this.priority,
              detectorId: this.id,
              evidence: 'Resume Detector: Document Header Candidate Name recognized',
              atomic: true,
              text: line,
            });
            break; // only the primary top header candidate
          }
        }
      }
    }

    for (const rule of CONTEXT_RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(text)) !== null) {
        let matchText = match[rule.groupIndex] || match[1] || match[2] || match[0];
        if (!matchText || matchText.length < 2) continue;

        // Trim possessive 's or trailing punctuation from person / project / repo names
        if (rule.type === 'PERSON_NAME' || rule.type === 'PROJECT_CODENAME' || rule.type === 'REPOSITORY') {
          matchText = matchText.replace(/['’]s$/i, '').replace(/[.,;:!?]+$/, '').trim();
        }

        // Trim leading and trailing prepositions / stop words from person names
        if (rule.type === 'PERSON_NAME') {
          const words = matchText.split(/\s+/);
          while (words.length > 1 && DISALLOWED_COMMON_WORDS.has(words[0].toLowerCase())) {
            words.shift();
          }
          while (words.length > 1 && DISALLOWED_COMMON_WORDS.has(words[words.length - 1].toLowerCase())) {
            words.pop();
          }
          matchText = words.join(' ');
        }

        // Never manufacture a candidate from ordinary grammatical/English words
        if (DISALLOWED_COMMON_WORDS.has(matchText.toLowerCase())) {
          continue;
        }

        // Words in person name must not be stop words
        if (rule.type === 'PERSON_NAME') {
          const words = matchText.split(/\s+/);
          if (words.some((w) => DISALLOWED_COMMON_WORDS.has(w.toLowerCase()))) {
            continue;
          }
        }

        const relativeIdx = match[0].indexOf(matchText);
        if (relativeIdx < 0) continue;
        const start = match.index + relativeIdx;
        const end = start + matchText.length;

        candidates.push({
          id: `context_${rule.type.toLowerCase()}_${start}_${end}`,
          start,
          end,
          entityType: rule.type,
          confidence: rule.confidence,
          priority: rule.priority || this.priority,
          detectorId: this.id,
          evidence: `${rule.reason} ("${matchText}")`,
          atomic: true,
          text: matchText,
        });
      }
    }

    return candidates;
  }
}
