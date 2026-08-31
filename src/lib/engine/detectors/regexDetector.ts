import { CandidateDetection, Detector, DetectorContext, EntityType, PriorityLevel } from '../../../types';

export interface RegexPatternSpec {
  type: EntityType;
  regex: RegExp;
  reason: string;
  confidence: number;
}

const REGEX_PATTERNS: RegexPatternSpec[] = [
  {
    type: 'EMAIL_ADDRESS',
    regex: /\b[a-zA-Z0-9._%+-]+(?:\s*\.\s*[a-zA-Z0-9._%+-]+)*\s*(?:@|\[at\]|\(at\))\s*[a-zA-Z0-9-]+(?:\s*\.\s*(?:com|org|net|edu|gov|mil|io|ai|co|uk|de|fr|ca|au|ng|app|dev|me|info|biz|tv|cc|[a-z]{2,4}))(?:\s*\.\s*(?:uk|au|ca|de|fr|ng|br|za|jp|cn|in|[a-z]{2}))?\b/gi,
    reason: 'Standard email address structure (OCR-resilient)',
    confidence: 0.98,
  },
  {
    type: 'CREDIT_CARD',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13})\b|\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    reason: 'Credit card number pattern',
    confidence: 0.9,
  },
  {
    type: 'IBAN',
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
    reason: 'International Bank Account Number (IBAN) format',
    confidence: 0.95,
  },
  {
    type: 'SSN_NATIONAL_ID',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    reason: 'US Social Security Number format',
    confidence: 0.95,
  },
  {
    type: 'UUID',
    regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g,
    reason: 'Universally Unique Identifier (UUID) format',
    confidence: 0.99,
  },
  {
    type: 'URL',
    regex: /\bhttps?:\/\/(?:[ \t]*[^\s<>'"]+)+/gi,
    reason: 'Standard Web URL format (OCR-resilient)',
    confidence: 0.85,
  },
  {
    type: 'IP_ADDRESS',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b|\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}\b/g,
    reason: 'IP Address pattern (IPv4 / IPv6)',
    confidence: 0.9,
  },
  {
    type: 'PHONE_NUMBER',
    regex: /(?:\+\d{1,4}[-.\s]*)?(?:\(\d{1,4}\)[-.\s]*)?(?:[0-9]{2,4}[-.\s]?[0-9]{2,4}[-.\s]?[0-9]{2,4}(?:[-.\s]?[0-9]{2,5})?)\b/g,
    reason: 'Standard phone number pattern',
    confidence: 0.85,
  },
  {
    type: 'ADDRESS',
    regex: /\b\d{1,5}\s+[A-Z][a-zA-Z0-9\s,.]{3,30}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Circle|Cir)\b/gi,
    reason: 'Physical street address pattern',
    confidence: 0.8,
  },
];

export class RegexDetector implements Detector {
  public readonly id = 'regex-detector';
  public readonly name = 'Regex Pattern Detector';
  public readonly priority = PriorityLevel.REGEX;

  public async detect(text: string, context?: DetectorContext): Promise<CandidateDetection[]> {
    const candidates: CandidateDetection[] = [];

    for (const spec of REGEX_PATTERNS) {
      // Reset regex index state
      spec.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = spec.regex.exec(text)) !== null) {
        const matchedText = match[0];
        const trimmed = matchedText.trim();

        // Guard: Phone numbers should never match IPv4 addresses (4 groups of 1-3 digits separated strictly by dots)
        if (spec.type === 'PHONE_NUMBER') {
          if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(trimmed)) {
            continue;
          }
          if (!trimmed.includes('+') && (trimmed.match(/\./g) || []).length >= 3) {
            continue;
          }
        }

        const start = match.index;
        const end = start + matchedText.length;

        candidates.push({
          id: `regex_${spec.type.toLowerCase()}_${start}_${end}`,
          start,
          end,
          entityType: spec.type,
          confidence: spec.confidence,
          priority: this.priority,
          detectorId: this.id,
          evidence: spec.reason,
          atomic: true,
          text: matchedText,
        });
      }
    }

    return candidates;
  }
}
