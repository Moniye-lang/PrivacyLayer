import { CandidateDetection, Detector, DetectorContext, EntityCategory, EntityType, PriorityLevel } from '../../../types';
import { PERSONAL_DATA_CONTEXT_RULES } from './personalDataPrecursors';

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
    pattern: /(?<![-_])\b(?:CEO|CTO|CFO|COO|President|Director|VP|Manager|Lead|Engineer|Developer|Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Founder|Co-founder|Partner|Chairperson|Architect|Consultant|Analyst|Specialist|Officer|Coordinator|Representative|Agent|Speaker|Presenter|Attendee|Assignee|Reporter|Author)\s+([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20}(?:[^\S\r\n]+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20})?)\b|\b(?:Customer|Client|Admin|Owner|Contact|Full\s+Name|First\s+Name|Last\s+Name|Middle\s+Name|User|Username|Employee|Applicant|Candidate|Patient|Member|Account\s+Holder|Cardholder(?:\s+Name)?|Beneficiary|Payee|Insured|Guardian|Next\s+of\s+Kin|Nominee|Dependent|Witness|Spouse|Father|Mother|Author|Recipient|Sender|Agent|Supervisor|Signed\s+by|(?<!\b(?:Bank|Company|Org|Organization|Institution|University|School|College|Hospital|Clinic|Firm|Corporation|Agency|Business|Project|Repo|Repository|Codebase|Database|DB|File|App|Application|Service|Table|Column|Field|Bucket|Secret|Key|Host|Server|Domain|Site)\s+)Name)(?:\s*(?:Name|Person|Holder|Details))?\s*[:=]\s*["']?([a-zA-Z0-9_\-\.\u00C0-\u024F\u1E00-\u1EFF]{2,30}(?:[^\S\r\n]+[a-zA-Z0-9_\-\.\u00C0-\u024F\u1E00-\u1EFF]{1,30}){0,2})["']?\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Professional / Role precursor',
    confidence: 0.98,
  },
  // 2a. Direct Name & Identity Property Declarations (e.g., "name: uuuebf", "user: alex99", "handle: jsmith")
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /(?<![-_])(?<!\b(?:Bank|Company|Org|Organization|Institution|University|School|College|Hospital|Clinic|Firm|Corporation|Agency|Business|Project|Repo|Repository|DB|Database|Table|Service|File|Bucket|Secret)\s+)\b(?:name|full_name|first_name|last_name|user|username|client|customer|patient|doctor|physician|contact|author|owner|admin|member|agent|caller|recipient|sender|subscriber|assignee|creator|handle|nickname|alias|identity)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.\u00C0-\u024F\u1E00-\u1EFF]{2,40}(?:[^\S\r\n]+[a-zA-Z0-9_\-\.\u00C0-\u024F\u1E00-\u1EFF]{1,40}){0,2})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Identity label declaration (e.g. "name: [value]" / "user: [value]")',
    confidence: 0.99,
  },
  // 2b. Managed By / Owned By / Assigned To Precursors
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /(?<![-_])\b(?:managed\s+by|owned\s+by|assigned\s+to|created\s+by|supervised\s+by)\s+([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20}(?:[^\S\r\n]+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]{1,20})?)\b/g,
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
  // 2d. Address Label Precursors (with multiline continuation support)
  {
    type: 'ADDRESS',
    category: 'PII',
    pattern: /(?<![-_])\b(?:Address|Physical\s+Address|Street\s+Address|Billing\s+Address|Shipping\s+Address|Home\s+Address|Residential\s+Address|Office\s+Address)\s*[:=]\s*([^\n\r;]+(?:\r?\n[ \t]+[^\n\r;]+)?)/gi,
    groupIndex: 1,
    reason: 'Context Engine: Address label precursor',
    confidence: 0.98,
    priority: PriorityLevel.CONTEXT + 15,
  },
  // 3. Project Precursors
  {
    type: 'PROJECT_CODENAME',
    category: 'CONTEXTUAL',
    pattern: /(?<![-_])\b(?:(?:[Pp]roject|[Ii]nitiative|[Cc]odename|[Oo]peration|[Pp]rogram|[Cc]ampaign)\s+(?:[Nn]ame|[Cc]odename)\s*[:=]\s*([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]{1,30}(?:[^\S\r\n]+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]{1,30})?)|(?:[Pp]roject|[Ii]nitiative|[Cc]odename|[Oo]peration|[Pp]roduct|[Ff]eature|[Pp]latform|[Pp]ortal|[Ee]ngine|[Mm]odule|[Ss]ystem|[Pp]ipeline)\s*[:=]?\s*([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]{2,30}))\b/g,
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
    pattern: /\b(?:company|startup|agency|firm|corp)[^\S\r\n]+([A-Z0-9_\-\.\s]{2,30}(?:Ltd|Inc|LLC|Corp|Co|GmbH|PLC)?)\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Company/Organization precursor',
    confidence: 0.98,
  },
  // 5a. Explicit Organization / Institutional / Business Name Precursor (universal across any industry)
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b(?:Bank(?:\s+Name)?|Company(?:\s+Name)?|Organization(?:\s+Name)?|Org(?:\s+Name)?|Institution(?:\s+Name)?|Agency(?:\s+Name)?|Business(?:\s+Name)?|Employer(?:\s+Name)?|Firm(?:\s+Name)?|University(?:\s+Name)?|College(?:\s+Name)?|School(?:\s+Name)?|Hospital(?:\s+Name)?|Clinic(?:\s+Name)?|Ministry(?:\s+of)?|Department(?:\s+of)?|Authority(?:\s+Name)?|Foundation(?:\s+Name)?|Association(?:\s+Name)?)\s*[:=]\s*["']?([a-zA-Z0-9&.\'\-\u00C0-\u024F\u1E00-\u1EFF]{2,35}(?:[^\S\r\n]+[a-zA-Z0-9&.\'\-\u00C0-\u024F\u1E00-\u1EFF]{1,35}){0,4})["']?/gi,
    groupIndex: 1,
    reason: 'Context Engine: Organization / Institution / Bank name precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 20, // 110 priority: higher than generic regex / ner
  },
  // 5b. Corporate Organization & Bank Name Precursors / Suffixes (e.g. "First Continental Bank", "Continental Bank", "Acme Ltd", "Zenith Bank PLC")
  {
    type: 'ORGANIZATION',
    category: 'CONTEXTUAL',
    pattern: /\b((?:First\s+|United\s+|Union\s+|Standard\s+|National\s+|Global\s+|Central\s+|Federal\s+|Apex\s+)?[A-Z\u00C0-\u024F][a-zA-Z0-9&.\'\-]{1,25}(?:[^\S\r\n]+[A-Z\u00C0-\u024F][a-zA-Z0-9&.\'\-]{1,25}){0,3}[^\S\r\n]+(?:Bank|Microfinance\s+Bank|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH))\b/g,
    groupIndex: 1,
    reason: 'Context Engine: Corporate organization / bank name recognized by suffix',
    confidence: 0.98,
    priority: PriorityLevel.CONTEXT + 15, // 85 priority
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
  // 7a. Universal National / Civil / Identification Numbers (NIN, SSN, Passport, Driver's License, Tax ID, Voter ID, Student ID, State ID)
  {
    type: 'SSN_NATIONAL_ID',
    category: 'PII',
    pattern: /\b(?:National\s+Identification(?:\s+Number)?(?:\s*\([A-Za-z]+\))?|National\s+Identity(?:\s+(?:Number|No\.?|#))?(?:\s*\([A-Za-z]+\))?|National\s+ID(?:\s+(?:Number|No\.?|#))?(?:\s*\([A-Za-z]+\))?|NIN(?:\s+(?:Number|No\.?|#))?|SSN(?:\s+(?:Number|No\.?|#))?|Social\s+Security(?:\s+Number)?|Passport(?:\s+(?:Number|No\.?|#))?|Driver['’]?s\s+License(?:\s+(?:Number|No\.?|#))?|License\s+(?:Number|No\.?|#)|Voter\s+ID|Student\s+ID|State\s+ID|Civil\s+ID|Resident\s+ID|Alien\s+Registration(?:\s+Number)?|Tax\s+ID|EIN|TIN|VAT(?:\s+(?:Number|No\.?|#))?|Policy\s+(?:Number|No\.?|#)|Insurance\s+ID|Medicare(?:\s+ID)?|Medicaid(?:\s+ID)?)(?!\s*(?:Management|Commission|Authority|Ministry|Agency|Department|Card|Slip))\s*[:=\-]?\s*([0-9]{3,4}[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{3,5}|\d{9,14}|(?=[A-Za-z0-9\-_/]*\d{2})[A-Za-z0-9\-_/]{4,28}|(?=[A-Za-z0-9\-\/]*\d)[A-Za-z0-9]{2,6}(?:[-\/][A-Za-z0-9]{2,10}){1,3})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: National ID / NIN / SSN precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 20, // 110 priority: higher than generic regex phone match
  },
  // 7b. Bank Verification Number (BVN) (11 digits, e.g. "BVN: 22233344455", "BVN: 222 333 444 55", "Bank Verification Number (BVN): ...")
  {
    type: 'BANK_ACCOUNT',
    category: 'PII',
    pattern: /\b(?:Bank\s+Verification(?:\s+Number)?(?:\s*\([A-Za-z]+\))?|BVN(?:\s+Number)?)\s*[:=\-]?\s*([0-9]{2,4}[\s\-]?[0-9]{2,4}[\s\-]?[0-9]{2,5}|\d{11})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Bank Verification Number (BVN) precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 20, // 110 priority: higher than generic regex phone match
  },
  // 7d. Phone Number Context Precursors (e.g. "Phone: 08012345678", "Tel: +234 812 345 6789", "Mobile: ...")
  {
    type: 'PHONE_NUMBER',
    category: 'PII',
    pattern: /\b(?:Phone(?:\s+Number)?|Telephone|Tel|Mobile(?:\s+Number)?|Cell(?:\s+Phone)?|Call(?:\s+us\s+at)?|Contact\s+(?:Number|Phone)|Hotline|WhatsApp|SMS|Fax|Reach\s+me\s+(?:on|at))\s*[:=]\s*([+0-9\s\-\.\(\)]{7,22})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Phone number precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 10, // 100 priority
  },
  // 8. Universal Banking & Financial Identifiers (Account Number / Routing / Sort Code / IBAN / Card Number / CVV)
  {
    type: 'BANK_ACCOUNT',
    category: 'FINANCIAL',
    pattern: /\b(?:Bank\s+Account(?:\s+Number)?|Routing\s+Number|Sort\s+Code|Account\s+Number|Acct\s+No\.?|IBAN|SWIFT(?:\s+Code)?|BIC|Card\s+Number|Credit\s+Card(?:\s+(?:Number|Information))?|Debit\s+Card(?:\s+(?:Number|Information))?|CVV|CVC|Card\s+Verification(?:\s+Value)?)\s*[:=\-]\s*([A-Za-z0-9\-][A-Za-z0-9\-[^\S\r\n]]{3,32}[A-Za-z0-9]|[A-Za-z0-9]{3,34})\b/gi,
    groupIndex: 1,
    reason: 'Context Engine: Banking / Financial Account precursor',
    confidence: 0.99,
    priority: PriorityLevel.REGEX + 15, // 105 priority: higher than generic regex phone match
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
  ...PERSONAL_DATA_CONTEXT_RULES,
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
      // Must not be a section title, official state header, or corporate/bank name
      if (/^(?:PROFESSIONAL\s+SUMMARY|WORK\s+EXPERIENCE|EXPERIENCE|EDUCATION|SKILLS|CURRICULUM\s+VITAE|RESUME|COVER\s+LETTER|HANDOFF\s+NOTES|NOTES|ADVERSARIAL\s+PRIVACY|FEDERAL\s+REPUBLIC|REPUBLIC\s+OF|GOVERNMENT\s+OF)\b/i.test(line)) {
        break;
      }
      if (/\b(?:Bank|Microfinance|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH)\b/i.test(line)) {
        continue;
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

    // Table Structure Detection: detect table columns like "| Project |" or "| Name |"
    const tableLines = text.split(/\r?\n/);
    let lineCharOffset = 0;

    for (let i = 0; i < tableLines.length - 1; i++) {
      const headerLine = tableLines[i];
      const sepLine = tableLines[i + 1];

      // Check if this line is a markdown table header followed by a delimiter (|---|---|)
      if (headerLine.includes('|') && /^\s*\|?\s*[-:]+[-| :]*\|?\s*$/.test(sepLine)) {
        const headerCells = headerLine.split('|').map(c => c.trim()).filter(c => c.length > 0);
        const colTypes: (EntityType | null)[] = headerCells.map(h => {
          const lower = h.toLowerCase();
          if (/^(?:project|initiative|codename|campaign|product|app|application|feature)\b/i.test(lower)) {
            return 'PROJECT_CODENAME';
          }
          if (/^(?:name|full\s+name|person|user|employee|author|lead|owner|candidate|contact\s+name|next\s+of\s+kin|spouse|children|guardian|emergency\s+contact|recommender|referee)\b/i.test(lower)) {
            return 'PERSON_NAME';
          }
          if (/^(?:repo|repository|codebase)\b/i.test(lower)) {
            return 'REPOSITORY';
          }
          if (/^(?:secret|token|api\s*key|key|password|passphrase|2fa|recovery\s+code)\b/i.test(lower)) {
            return 'COMPANY_SECRET';
          }
          if (/^(?:ssn|social\s+security|national\s+id|nin|passport|civil\s+id|state\s+id|voter\s+id|military\s+id|imei|vin|vehicle\s+registration|driver['’]?s\s+license)\b/i.test(lower)) {
            return 'SSN_NATIONAL_ID';
          }
          if (/^(?:employee\s+id|staff\s+id|badge\s+number|customer\s+id|frequent\s+flyer)\b/i.test(lower)) {
            return 'EMPLOYEE_ID';
          }
          if (/^(?:bank\s+account|routing\s+number|sort\s+code|iban|bvn)\b/i.test(lower)) {
            return 'BANK_ACCOUNT';
          }
          if (/^(?:credit\s+card|card\s+number|debit\s+card|cvv|cvc)\b/i.test(lower)) {
            return 'CREDIT_CARD';
          }
          if (/^(?:salary|wage|compensation|bonus|investment|portfolio|loan|mortgage|payment\s+history|billing|order\s+id|donation|tithe|zakat)\b/i.test(lower)) {
            return 'FINANCIAL_METRIC';
          }
          if (/^(?:email|e-mail)\b/i.test(lower)) {
            return 'EMAIL_ADDRESS';
          }
          if (/^(?:phone|telephone|tel|mobile|cell|fax)\b/i.test(lower)) {
            return 'PHONE_NUMBER';
          }
          if (/^(?:address|home\s+address|work\s+address|residential\s+address|street)\b/i.test(lower)) {
            return 'ADDRESS';
          }
          if (/^(?:medical|prescription|medication|dosage|blood\s+type|blood\s+group|immunisation|immunization|allergy|allergies|diagnosis|therapy)\b/i.test(lower)) {
            return 'MEDICAL_RECORD';
          }
          if (/^(?:criminal|court|case\s+number|arrest|offence|offense|docket|property\s+deed|deed|power\s+of\s+attorney)\b/i.test(lower)) {
            return 'LEGAL_REFERENCE';
          }
          if (/^(?:gps|coordinates|latitude|longitude|itinerary|location\s+history|check-in|wifi|ssid)\b/i.test(lower)) {
            return 'LOCATION';
          }
          if (/^(?:ip\s+address|mac\s+address)\b/i.test(lower)) {
            return 'IP_ADDRESS';
          }
          if (/^(?:website|homepage|url|domain)\b/i.test(lower)) {
            return 'URL';
          }
          if (/^(?:company|organization|org|bank|employer|institution|hospital|university|school|church|union|association|club)\b/i.test(lower)) {
            return 'ORGANIZATION';
          }
          if (/^(?:job\s+title|degree|transcript|gpa|test\s+score|fingerprint|retina|dna|political|religion|marital\s+status|sexual\s+orientation|ethnicity|hobby|dietary)\b/i.test(lower)) {
            return 'CUSTOM_TERM';
          }
          return null;
        });

        // Scan subsequent data rows in the table
        let rowCharOffset = lineCharOffset + headerLine.length + 1 + sepLine.length + 1;
        for (let r = i + 2; r < tableLines.length; r++) {
          const rowLine = tableLines[r];
          if (!rowLine.includes('|') || rowLine.trim().length === 0) {
            break;
          }
          const rawCells = rowLine.split('|');
          const cells = rawCells.filter((_, idx) => !(idx === 0 && rawCells[0].trim() === '') && !(idx === rawCells.length - 1 && rawCells[rawCells.length - 1].trim() === ''));

          for (let c = 0; c < cells.length && c < colTypes.length; c++) {
            const trimmedCell = cells[c].trim();
            const targetType = colTypes[c];

            if (targetType && trimmedCell.length >= 2 && !DISALLOWED_COMMON_WORDS.has(trimmedCell.toLowerCase())) {
              const cellIdxInRow = rowLine.indexOf(trimmedCell);
              if (cellIdxInRow !== -1) {
                const cellValStart = rowCharOffset + cellIdxInRow;
                const cellValEnd = cellValStart + trimmedCell.length;

                candidates.push({
                  id: `context_table_${targetType.toLowerCase()}_${cellValStart}_${cellValEnd}`,
                  start: cellValStart,
                  end: cellValEnd,
                  entityType: targetType,
                  confidence: 0.98,
                  priority: this.priority + 10,
                  detectorId: this.id,
                  evidence: `Table Column Detector: Recognized "${trimmedCell}" in "${headerCells[c]}" column`,
                  atomic: true,
                  text: trimmedCell,
                });
              }
            }
          }

          rowCharOffset += rowLine.length + 1;
        }
      }

      lineCharOffset += headerLine.length + 1;
    }

    for (const rule of CONTEXT_RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(text)) !== null) {
        let matchText = (match[rule.groupIndex] || match[1] || match[2] || match[0]).trim();
        if (!matchText || matchText.length < 2) continue;

        // Trim possessive 's or trailing punctuation from person / project / repo names
        if (rule.type === 'PERSON_NAME' || rule.type === 'PROJECT_CODENAME' || rule.type === 'REPOSITORY') {
          matchText = matchText.replace(/['’]s$/i, '').replace(/[.,;:!?]+$/, '').trim();
        }

        // Exclude corporate / bank suffixes from PERSON_NAME
        if (rule.type === 'PERSON_NAME') {
          if (/\b(?:Bank|Microfinance\s+Bank|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH)\b/i.test(matchText)) {
            continue;
          }
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

          if (/\b(?:Bank|Microfinance\s+Bank|Ltd|Limited|Inc|Incorporated|PLC|Corp|Corporation|LLC|GmbH)\b/i.test(matchText)) {
            continue;
          }
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
