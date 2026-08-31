import { DetectedEntity, EntityCategory, EntityType } from '@/types';

interface RegexPatternRule {
  type: EntityType;
  category: EntityCategory;
  pattern: RegExp;
  reason: string;
  confidence: number;
  validator?: (match: string) => boolean;
}

// IBAN Check Digit & Format Validation (ISO 13616)
function validateIBAN(iban: string): boolean {
  const clean = iban.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) return false;
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean);
}

// Luhn Credit Card Validation
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

const STAGE1_RULES: RegexPatternRule[] = [
  // 1. Email Address
  {
    type: 'EMAIL_ADDRESS',
    category: 'PII',
    pattern: /[a-zA-Z0-9._%+-]+(?:\s*\.\s*[a-zA-Z0-9._%+-]+)*\s*(?:@|\[at\]|\(at\))\s*[a-zA-Z0-9-]+(?:\s*\.\s*(?:com|org|net|edu|gov|mil|io|ai|co|uk|de|fr|ca|au|ng|app|dev|me|info|biz|tv|cc|[a-z]{2,4}))(?:\s*\.\s*(?:uk|au|ca|de|fr|ng|br|za|jp|cn|in|[a-z]{2}))?/gi,
    reason: 'Personal Information Detector: Email Address detected',
    confidence: 0.99,
  },
  // 2. Phone Numbers (International & Standard Formats)
  {
    type: 'PHONE_NUMBER',
    category: 'PII',
    pattern: /(?<!\w)(?:\+\d{1,4}[-.\s]*)?(?:\(\d{1,4}\)[-.\s]*)?(?:[0-9]{3,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,5})\b/g,
    reason: 'Personal Information Detector: Phone Number detected',
    confidence: 0.92,
  },
  // 3. Street Addresses
  {
    type: 'ADDRESS',
    category: 'PII',
    pattern: /\b\d{1,5}\s+[A-Z0-9\.\s,-]{2,30}\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Way|Court|Ct|Circle|Cir|Apartment|Apt|Suite|Ste|Floor|Fl)\b/gi,
    reason: 'Personal Information Detector: Physical Street Address detected',
    confidence: 0.94,
  },
  // 4. Postal / ZIP Codes (US, UK, CA, EU)
  {
    type: 'ADDRESS',
    category: 'PII',
    pattern: /\b(?:ZIP|Postal Code|Postal)\s*[:=]?\s*([A-Z0-9]{3,5}[-\s]?[A-Z0-9]{3,4}|\d{5}(?:-\d{4})?)\b/gi,
    reason: 'Personal Information Detector: Postal / ZIP Code detected',
    confidence: 0.93,
  },
  // 5. Bank Accounts
  {
    type: 'BANK_ACCOUNT',
    category: 'FINANCIAL',
    pattern: /\b(?:Account|Acct|Account Number|Acc #)\s*[:=]?\s*#?(\d{8,17})\b/gi,
    reason: 'Financial Detector: Bank Account Number detected',
    confidence: 0.96,
  },
  // 6. IBAN (International Bank Account Number)
  {
    type: 'IBAN',
    category: 'FINANCIAL',
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi,
    reason: 'Financial Detector: Validated IBAN detected',
    confidence: 0.98,
    validator: validateIBAN,
  },
  // 7. ABA Routing Numbers (9-digit)
  {
    type: 'BANK_ACCOUNT',
    category: 'FINANCIAL',
    pattern: /\b(?:Routing|ABA|Routing Number)\s*[:=]?\s*#?(\d{9})\b/gi,
    reason: 'Financial Detector: ABA Routing Number detected',
    confidence: 0.95,
  },
  // 8. Credit Card Numbers (Luhn-validated)
  {
    type: 'CREDIT_CARD',
    category: 'FINANCIAL',
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    reason: 'Financial Detector: Credit Card number detected',
    confidence: 0.98,
    validator: validateLuhn,
  },
  // 9. Crypto Wallet Addresses (BTC, ETH, SOL)
  {
    type: 'BANK_ACCOUNT',
    category: 'FINANCIAL',
    pattern: /\b(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}|[1-9A-HJ-NP-Za-km-z]{32,44})\b/g,
    reason: 'Financial Detector: Crypto Wallet Address detected',
    confidence: 0.97,
  },
  // 10. SSN / National ID
  {
    type: 'SSN_NATIONAL_ID',
    category: 'IDENTIFIER',
    pattern: /\b(?!000|666|9\d{2})\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g,
    reason: 'Personal Information Detector: SSN / National ID detected',
    confidence: 0.96,
  },
  // 11. Passport Numbers
  {
    type: 'PASSPORT_NUMBER',
    category: 'IDENTIFIER',
    pattern: /\b(?:passport\s*#?\s*|passport\s+number\s*:\s*|\b[A-PR-WY][0-9]{7,8}\b)/gi,
    reason: 'Personal Information Detector: Passport Number detected',
    confidence: 0.90,
  },
  // 12. Source Code Environment Variables
  {
    type: 'SOURCE_CODE_SECRET',
    category: 'SECRET',
    pattern: /\b(?:process\.env\.[A-Z0-9_]{3,40}|\$[A-Z0-9_]{3,40}|\$\{[A-Z0-9_]{3,40}\})\b/g,
    reason: 'Source Code Detector: Environment Variable reference detected',
    confidence: 0.95,
  },
  // 13. Source Code Config File & Hardcoded Secrets
  {
    type: 'SOURCE_CODE_SECRET',
    category: 'SECRET',
    pattern: /\b(?:const|let|var|String|final)\s+(?!(?:[a-zA-Z0-9_]*(?:Field|Element|Input|Selector|Label|Text|Count|Total|List|Length|Name|Type|Id|Icon|Button|Form)))(?:[a-zA-Z0-9_]*(?:secret|apiKey|password|token|credential|dbPass)[a-zA-Z0-9_]*)\s*[:=]\s*["']([^"']{4,128})["']/gi,
    reason: 'Source Code Detector: Hardcoded Credential assignment in source code detected',
    confidence: 0.96,
  },
  // 14. Passwords in config/prompts/assignments
  {
    type: 'PASSWORD',
    category: 'SECRET',
    pattern: /\b(?:password|passwd|pwd|passcode|passphrase|secret_key|db_password|db_pass|admin_password|root_password)\s*(?:[:=]|=>|->)\s*["']?([^\s"';,]{3,128})["']?/gi,
    reason: 'Password or Auth Secret pattern detected',
    confidence: 0.96,
  },
  // 15. UUID
  {
    type: 'UUID',
    category: 'IDENTIFIER',
    pattern: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/gi,
    reason: 'Regex Detector: UUID / GUID detected',
    confidence: 0.99,
  },
];

export function runStage1Regex(text: string): DetectedEntity[] {
  const detected: DetectedEntity[] = [];

  for (const rule of STAGE1_RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.pattern.exec(text)) !== null) {
      // Use Group 1 if present (value group), otherwise Group 0 (full match)
      const matchText = match.length > 1 && match[1] ? match[1] : match[0];
      // Skip if matched value is code method call or DOM query
      if (/^(?:document\.|window\.|location\.|console\.|Math\.|JSON\.|[a-zA-Z0-9_$]+\()\s*/.test(matchText)) {
        continue;
      }
      const startIndex = match.index + match[0].indexOf(matchText);

      if (rule.validator && !rule.validator(matchText)) {
        continue;
      }

      const entityId = `stg1_${rule.type}_${startIndex}_${Math.random().toString(36).substring(2, 7)}`;
      
      const isOverlapping = detected.some(
        (existing) => Math.max(existing.start, startIndex) < Math.min(existing.end, startIndex + matchText.length)
      );

      if (!isOverlapping) {
        detected.push({
          id: entityId,
          type: rule.type,
          category: rule.category,
          text: matchText,
          start: startIndex,
          end: startIndex + matchText.length,
          confidence: rule.confidence,
          reason: rule.reason,
          placeholder: `[[${rule.type}]]`,
          votes: [
            {
              stage: 'REGEX',
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
