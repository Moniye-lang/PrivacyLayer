import {
  CandidateDetection,
  EntityType,
  ManualOverride,
  PriorityLevel,
  ProcessingRecord,
} from '../../../types';
import { ResolvedSpan } from '../resolver/spanResolver';

export class DecisionEngine {
  public applyOverrides(
    candidates: CandidateDetection[],
    manualOverrides: ManualOverride[],
    originalText: string
  ): CandidateDetection[] {
    if (!manualOverrides || manualOverrides.length === 0) {
      return candidates;
    }

    let filtered = [...candidates];

    for (const override of manualOverrides) {
      if (override.action === 'UNMASK') {
        // Exclude all candidates that overlap with the UNMASK override range
        filtered = filtered.filter(
          (c) => !(Math.max(c.start, override.start) < Math.min(c.end, override.end))
        );
      } else if (override.action === 'MASK') {
        // Force addition of candidate detection with PriorityLevel.MANUAL (100)
        const overrideType: EntityType = override.type || 'CUSTOM_TERM';
        const text = override.text || originalText.substring(override.start, override.end);

        filtered.push({
          id: `manual_${overrideType.toLowerCase()}_${override.start}_${override.end}`,
          start: override.start,
          end: override.end,
          entityType: overrideType,
          confidence: 1.0,
          priority: PriorityLevel.MANUAL,
          detectorId: 'manual-override',
          evidence: 'User manual mask override',
          atomic: true,
          text,
        });
      }
    }

    return filtered;
  }
}

export interface MaskEngineResult {
  protectedPrompt: string;
  plaintextMappings: Record<string, string>; // { "[[PERSON_NAME_001]]": "John Doe" }
  detectedEntities: {
    placeholder: string;
    type: EntityType;
    text: string;
    start: number;
    end: number;
    confidence: number;
    evidence: string;
  }[];
  processingRecord: ProcessingRecord;
}

export class MaskEngine {
  public mask(
    resolvedSpans: ResolvedSpan[],
    originalText: string,
    detectorsExecuted: string[],
    manualOverrideCount: number,
    startTimeMs: number,
    candidatesCount?: number
  ): MaskEngineResult {
    const typeCounters: Map<EntityType, number> = new Map();
    const valuePlaceholderCache: Map<string, string> = new Map();
    const plaintextMappings: Record<string, string> = {};
    const detectedEntities: MaskEngineResult['detectedEntities'] = [];

    // Value-to-Type Authority Ranking:
    // API_KEY, JWT_TOKEN, CONNECTION_STRING, CREDIT_CARD, IBAN, EMAIL_ADDRESS, IP_ADDRESS, PHONE_NUMBER, SSN_NATIONAL_ID > PASSWORD, PERSON_NAME, PROJECT_CODENAME
    const TYPE_SPECIFICITY_RANK: Record<string, number> = {
      API_KEY: 100,
      JWT_TOKEN: 95,
      CONNECTION_STRING: 95,
      CREDIT_CARD: 90,
      IBAN: 90,
      SSN_NATIONAL_ID: 90,
      EMAIL_ADDRESS: 85,
      IP_ADDRESS: 85,
      PHONE_NUMBER: 85,
      UUID: 80,
      URL: 75,
      SOURCE_CODE_SECRET: 70,
      COMPANY_SECRET: 70,
      PASSWORD: 65,
      PERSON_NAME: 50,
      PROJECT_CODENAME: 50,
      ORGANIZATION: 45,
      REPOSITORY: 45,
      LOCATION: 40,
      PRODUCT: 40,
      EVENT: 40,
      ADDRESS: 40,
      CUSTOM_TERM: 30,
      EMPLOYEE_ID: 50,
      CUSTOMER_ID: 50,
      BANK_ACCOUNT: 85,
      PASSPORT_NUMBER: 85,
      MEDICAL_RECORD: 50,
      LEGAL_REFERENCE: 50,
      FINANCIAL_METRIC: 50,
      DATE: 35,
    };

    // Document-Wide Sensitive Value Self-Propagation Pass
    // If a secret, password, key, token, email, phone, or multi-word name is detected, ensure all unmasked occurrences in text are protected.
    const allSpans: ResolvedSpan[] = [...resolvedSpans];
    const coveredRanges = resolvedSpans.map((s) => ({ start: s.start, end: s.end }));

    for (const span of resolvedSpans) {
      const val = (span.text || originalText.substring(span.start, span.end)).trim();
      if (!val || val.length < 3 || /^(?:the|and|for|with|that|this|from|have|been|will|were|they|some|more|test|here|your)$/i.test(val)) {
        continue;
      }
      const shouldPropagate =
        span.entityType === 'PASSWORD' ||
        span.entityType === 'API_KEY' ||
        span.entityType === 'JWT_TOKEN' ||
        span.entityType === 'SOURCE_CODE_SECRET' ||
        span.entityType === 'CONNECTION_STRING' ||
        span.entityType === 'EMAIL_ADDRESS' ||
        span.entityType === 'PHONE_NUMBER' ||
        span.entityType === 'PROJECT_CODENAME' ||
        span.entityType === 'COMPANY_SECRET' ||
        (span.entityType === 'PERSON_NAME' && val.includes(' '));

      if (shouldPropagate) {
        let searchIndex = 0;
        while ((searchIndex = originalText.indexOf(val, searchIndex)) !== -1) {
          const sEnd = searchIndex + val.length;
          const isCovered = coveredRanges.some((r) => Math.max(r.start, searchIndex) < Math.min(r.end, sEnd));
          if (!isCovered) {
            const charBefore = searchIndex > 0 ? originalText[searchIndex - 1] : ' ';
            const charAfter = sEnd < originalText.length ? originalText[sEnd] : ' ';
            const isWordBoundary = !/[a-zA-Z0-9_]/.test(charBefore) && !/[a-zA-Z0-9_]/.test(charAfter);
            if (isWordBoundary) {
              allSpans.push({
                ...span,
                start: searchIndex,
                end: sEnd,
                text: val,
                evidence: `${span.evidence} (Document-wide value propagation)`,
              });
              coveredRanges.push({ start: searchIndex, end: sEnd });
            }
          }
          searchIndex += val.length;
        }
      }
    }

    // Pre-pass: Determine the single authoritative canonical EntityType for each unique text value
    const canonicalValueTypeMap: Map<string, EntityType> = new Map();
    for (const span of allSpans) {
      const matchedText = span.text || originalText.substring(span.start, span.end);
      const cleanKey = matchedText
        .replace(/^[\s,.;:!?'"()\[\]{}<>“”‘’`]+|[\s,.;:!?'"()\[\]{}<>“”‘’`]+$/g, '')
        .replace(/['’]s$/i, '')
        .trim()
        .toLowerCase();
      if (!cleanKey) continue;

      const existingType = canonicalValueTypeMap.get(cleanKey);
      if (!existingType) {
        canonicalValueTypeMap.set(cleanKey, span.entityType);
      } else {
        const currentRank = TYPE_SPECIFICITY_RANK[span.entityType] || 50;
        const existingRank = TYPE_SPECIFICITY_RANK[existingType] || 50;
        if (currentRank > existingRank) {
          canonicalValueTypeMap.set(cleanKey, span.entityType);
        }
      }
    }

    // Sort spans by start position ascending
    const sortedSpans = allSpans.sort((a, b) => a.start - b.start);

    let protectedPrompt = '';
    let lastIndex = 0;

    for (const span of sortedSpans) {
      // Append unmasked text preceding current span
      protectedPrompt += originalText.substring(lastIndex, span.start);

      const matchedText = span.text || originalText.substring(span.start, span.end);
      const cleanText = matchedText
        .replace(/^[\s,.;:!?'"()\[\]{}<>“”‘’`]+|[\s,.;:!?'"()\[\]{}<>“”‘’`]+$/g, '')
        .replace(/['’]s$/i, '')
        .trim();
      const cleanKey = cleanText.toLowerCase();

      // Canonical value mapping: exact string value -> single unified placeholder
      const canonicalType = canonicalValueTypeMap.get(cleanKey) || span.entityType;
      let placeholder = valuePlaceholderCache.get(cleanKey);

      if (!placeholder) {
        // Increment 1-based counter for canonical entity type
        const currentCount = (typeCounters.get(canonicalType) || 0) + 1;
        typeCounters.set(canonicalType, currentCount);

        // Format placeholder [[CANONICAL_TYPE_001]]
        const indexStr = String(currentCount).padStart(3, '0');
        placeholder = `[[${canonicalType}_${indexStr}]]`;
        valuePlaceholderCache.set(cleanKey, placeholder);
      }

      plaintextMappings[placeholder] = matchedText;
      protectedPrompt += placeholder;
      lastIndex = span.end;

      detectedEntities.push({
        placeholder,
        type: canonicalType,
        text: matchedText,
        start: span.start,
        end: span.end,
        confidence: span.confidence,
        evidence: span.evidence,
      });
    }

    // Append remaining text
    protectedPrompt += originalText.substring(lastIndex);

    const executionTimeMs = Math.max(0, Date.now() - startTimeMs);

    const processingRecord: ProcessingRecord = {
      recordId: `rec_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      engineVersion: '2.0.0-deterministic',
      detectorsExecuted,
      candidatesCount: candidatesCount ?? resolvedSpans.length,
      entitiesDetected: resolvedSpans.length,
      entitiesMasked: Object.keys(plaintextMappings).length,
      manualOverrideCount,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    };

    return {
      protectedPrompt,
      plaintextMappings,
      detectedEntities,
      processingRecord,
    };
  }
}
