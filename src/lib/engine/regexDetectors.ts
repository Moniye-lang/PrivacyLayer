import { DetectedEntity, EntityCategory, EntityType } from '@/types';

interface RegexPattern {
  type: EntityType;
  category: EntityCategory;
  pattern: RegExp;
  reason: string;
  confidence: number;
  validator?: (match: string) => boolean;
}

// Common capitalized English words to exclude from generic Person Name detection
const NON_NAME_WORDS = new Set([
  'Write', 'An', 'Email', 'To', 'Regarding', 'Project', 'Falcon', 'My', 'Api', 'Key', 'Is',
  'The', 'Ceo', 'Cto', 'Cfo', 'Openai', 'Anthropic', 'Google', 'Gemini', 'Cursor', 'Deepseek',
  'Grok', 'Copilot', 'Mongodb', 'Postgresql', 'Mysql', 'Redis', 'Database', 'Connection', 'String',
  'Customer', 'Employee', 'Account', 'System', 'Server', 'Client', 'User', 'Admin', 'Root',
  'Please', 'Send', 'Create', 'Update', 'Delete', 'Select', 'Insert', 'From', 'Where', 'With',
  'Patient', 'Doctor', 'Hospital', 'Record', 'Number', 'Salary', 'Annual', 'Report', 'Review',
  'Fiscal', 'Year', 'Target', 'Legal', 'Court', 'Order', 'Case', 'Settlement', 'Agreement',
]);

function validatePersonName(matchStr: string): boolean {
  const parts = matchStr.trim().split(/\s+/);
  if (parts.length !== 2) return false;
  if (NON_NAME_WORDS.has(parts[0]) || NON_NAME_WORDS.has(parts[1])) {
    return false;
  }
  return true;
}

// Standard Luhn Algorithm for Credit Card validation
function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

const REGEX_RULES: RegexPattern[] = [
  // OpenAI API Key (sk-proj-*, sk-admin-*, sk-*)
  {
    type: 'API_KEY',
    category: 'SECRET',
    pattern: /\b(sk-[a-zA-Z0-9]{20,48}|sk-proj-[a-zA-Z0-9_-]{10,100}|sk-admin-[a-zA-Z0-9_-]{10,100})\b/g,
    reason: 'OpenAI Secret API Key pattern detected',
    confidence: 0.99,
  },
  // Generic API Key (e.g. sk-xxxx, api_key_xxxx)
  {
    type: 'API_KEY',
    category: 'SECRET',
    pattern: /\b(sk-[a-zA-Z0-9]{4,32}|api[_-]?key[_-]?[a-zA-Z0-9]{6,32})\b/gi,
    reason: 'API Key pattern detected',
    confidence: 0.95,
  },
  // Anthropic API Key
  {
    type: 'API_KEY',
    category: 'SECRET',
    pattern: /\b(sk-ant-[a-zA-Z0-9_-]{30,100})\b/g,
    reason: 'Anthropic Claude API Key pattern detected',
    confidence: 0.99,
  },
  // AWS Access Key ID & Secret Key
  {
    type: 'API_KEY',
    category: 'SECRET',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    reason: 'AWS Access Key ID detected',
    confidence: 0.98,
  },
  // Person Name (Capitalized First & Last Name pair)
  {
    type: 'PERSON_NAME',
    category: 'PII',
    pattern: /\b([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/g,
    reason: 'Person Full Name pattern detected',
    confidence: 0.92,
    validator: validatePersonName,
  },
  // GitHub Personal Access Token
  {
    type: 'API_KEY',
    category: 'SECRET',
    pattern: /\b(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36})\b/g,
    reason: 'GitHub Personal Access Token detected',
    confidence: 0.99,
  },
  // Stripe Secret Key
  {
    type: 'API_KEY',
    category: 'SECRET',
    pattern: /(sk_live_[0-9a-zA-Z_-]{20,110}|rk_live_[0-9a-zA-Z_-]{20,110}|sk_test_[0-9a-zA-Z_-]{20,110})/g,
    reason: 'Stripe Live Secret Key detected',
    confidence: 0.99,
  },
  // JWT Token
  {
    type: 'JWT_TOKEN',
    category: 'SECRET',
    pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    reason: 'JSON Web Token (JWT) detected',
    confidence: 0.99,
  },
  // Database Connection Strings
  {
    type: 'CONNECTION_STRING',
    category: 'SECRET',
    pattern: /\b(mongodb(\+srv)?:\/\/[^\s"']+|(postgres|postgresql|mysql|redis):\/\/[^\s"']+)\b/gi,
    reason: 'Database Connection String URI detected',
    confidence: 0.98,
  },
  // Passwords in config/prompts/CLI/credentials
  {
    type: 'PASSWORD',
    category: 'SECRET',
    pattern: /\b(?:password|passwd|pwd|passcode|passphrase|secret_key|db_password|db_pass|admin_password|root_password)\s*(?:[:=]|=>|->)\s*["']?([^\s"';,]{3,128})["']?/gi,
    reason: 'Hardcoded Password or Auth Secret pattern detected',
    confidence: 0.95,
  },
  // Credit Card Numbers
  {
    type: 'CREDIT_CARD',
    category: 'FINANCIAL',
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    reason: 'Valid Payment Credit Card Number detected',
    confidence: 0.95,
    validator: validateLuhn,
  },
  // SSN (Social Security Number - US)
  {
    type: 'SSN_NATIONAL_ID',
    category: 'IDENTIFIER',
    pattern: /\b(?!000|666|9\d{2})\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g,
    reason: 'US Social Security / National ID pattern detected',
    confidence: 0.90,
  },
  // Email Address
  {
    type: 'EMAIL_ADDRESS',
    category: 'PII',
    pattern: /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[at\]\s*|\s*\(at\)\s*|@)[a-zA-Z0-9.-]+(?:\s*\.\s*|\.)[a-zA-Z]{2,}/gi,
    reason: 'Personally Identifiable Email Address detected',
    confidence: 0.98,
  },
  // Phone Number (International / Domestic)
  {
    type: 'PHONE_NUMBER',
    category: 'PII',
    pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    reason: 'Phone Number detected',
    confidence: 0.88,
  },
  // Employee ID
  {
    type: 'EMPLOYEE_ID',
    category: 'IDENTIFIER',
    pattern: /\b(EMP[-_\s]?\d{4,8}|EID[-_\s]?\d{4,8})\b/gi,
    reason: 'Enterprise Employee Identifier detected',
    confidence: 0.94,
  },
  // Customer Account ID
  {
    type: 'CUSTOMER_ID',
    category: 'IDENTIFIER',
    pattern: /\b(CUST[-_\s]?[A-Z0-9]{4,10}|ACC[-_\s]?[A-Z0-9]{4,10})\b/gi,
    reason: 'Customer Account ID detected',
    confidence: 0.93,
  },
];

export function runRegexDetection(text: string): DetectedEntity[] {
  const detected: DetectedEntity[] = [];

  for (const rule of REGEX_RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.pattern.exec(text)) !== null) {
      const matchText = match[0];
      if (rule.validator && !rule.validator(matchText)) {
        continue;
      }

      const entityId = `det_${rule.type}_${match.index}_${Math.random().toString(36).substr(2, 6)}`;
      
      const isOverlapping = detected.some(
        (existing) => Math.max(existing.start, match!.index) < Math.min(existing.end, match!.index + matchText.length)
      );

      if (!isOverlapping) {
        detected.push({
          id: entityId,
          type: rule.type,
          category: rule.category,
          text: matchText,
          start: match.index,
          end: match.index + matchText.length,
          confidence: rule.confidence,
          reason: rule.reason,
          placeholder: `[[${rule.type}]]`,
        });
      }
    }
  }

  return detected;
}
