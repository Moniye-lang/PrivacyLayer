import { CandidateDetection, DetectedEntity, DetectorContext, EntityCategory } from '../../types';
import { ParallelDetectorManager } from './detectors/detector';
import { RegexDetector } from './detectors/regexDetector';
import { SecretDetector } from './detectors/secretDetector';
import { DictionaryDetector } from './detectors/dictionaryDetector';
import { ContextDetector } from './detectors/contextDetector';
import { NerDetector } from './detectors/nerDetector';
import { SpanResolver } from './resolver/spanResolver';
import { defaultCompatibilityMatrix } from './resolver/compatibilityMatrix';
import { dictionaryStore } from './dictionary/dictionaryStore';

const detectorManager = new ParallelDetectorManager([
  new SecretDetector(),
  new RegexDetector(),
  new DictionaryDetector(),
  new ContextDetector(),
  new NerDetector(),
]);

const spanResolver = new SpanResolver(defaultCompatibilityMatrix);

function getCategoryForType(type: string): EntityCategory {
  if (['CONNECTION_STRING', 'API_KEY', 'JWT_TOKEN', 'PASSWORD', 'SOURCE_CODE_SECRET', 'COMPANY_SECRET'].includes(type)) {
    return 'SECRET';
  }
  if (['EMAIL_ADDRESS', 'PHONE_NUMBER', 'PERSON_NAME', 'SSN_NATIONAL_ID', 'PASSPORT_NUMBER', 'ADDRESS', 'DATE'].includes(type)) {
    return 'PII';
  }
  if (['CREDIT_CARD', 'BANK_ACCOUNT', 'IBAN', 'FINANCIAL_METRIC'].includes(type)) {
    return 'FINANCIAL';
  }
  if (['EMPLOYEE_ID', 'CUSTOMER_ID', 'UUID'].includes(type)) {
    return 'IDENTIFIER';
  }
  if (['MEDICAL_RECORD'].includes(type)) return 'MEDICAL';
  if (['LEGAL_REFERENCE'].includes(type)) return 'LEGAL';
  if (['PROJECT_CODENAME', 'ORGANIZATION', 'REPOSITORY', 'LOCATION', 'PRODUCT', 'EVENT', 'URL'].includes(type)) {
    return 'CONTEXTUAL';
  }
  return 'CUSTOM';
}

/**
 * Multi-Layer Parallel Detection Pipeline Orchestrator
 * Runs deterministic parallel detectors via Promise.all and resolves candidate spans via Compatibility Matrix.
 */
export async function runMultiLayerDetectionPipeline(
  prompt: string,
  customTerms: string[] = []
): Promise<DetectedEntity[]> {
  if (!prompt || !prompt.trim()) return [];

  // Register custom terms into dictionary store
  for (const term of customTerms) {
    dictionaryStore.addCustomTerm(term);
  }

  const context: DetectorContext = {
    customTerms,
  };

  // 1. Run all detectors in parallel via Promise.all
  const candidates: CandidateDetection[] = await detectorManager.detectAll(prompt, context);

  // 2. Resolve overlapping spans strictly by Compatibility Matrix & Priority Authority
  const resolvedSpans = spanResolver.resolve(candidates, prompt);

  // 3. Document-wide value propagation for high-value entities (PROJECT_CODENAME, COMPANY_SECRET, PASSWORD, API_KEY, etc.)
  const allSpans = [...resolvedSpans];
  const coveredRanges = resolvedSpans.map((s) => ({ start: s.start, end: s.end }));

  for (const span of resolvedSpans) {
    const val = (span.text || prompt.substring(span.start, span.end)).trim();
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
      span.entityType === 'SSN_NATIONAL_ID' ||
      span.entityType === 'PASSPORT_NUMBER' ||
      span.entityType === 'EMPLOYEE_ID' ||
      span.entityType === 'BANK_ACCOUNT' ||
      span.entityType === 'CREDIT_CARD' ||
      span.entityType === 'MEDICAL_RECORD' ||
      span.entityType === 'LEGAL_REFERENCE' ||
      span.entityType === 'CUSTOM_TERM' ||
      (span.entityType === 'PERSON_NAME' && val.includes(' '));

    if (shouldPropagate) {
      let searchIndex = 0;
      while ((searchIndex = prompt.indexOf(val, searchIndex)) !== -1) {
        const sEnd = searchIndex + val.length;
        const isCovered = coveredRanges.some((r) => Math.max(r.start, searchIndex) < Math.min(r.end, sEnd));
        if (!isCovered) {
          const charBefore = searchIndex > 0 ? prompt[searchIndex - 1] : ' ';
          const charAfter = sEnd < prompt.length ? prompt[sEnd] : ' ';
          const isWordBoundary = !/[a-zA-Z0-9_]/.test(charBefore) && !/[a-zA-Z0-9_]/.test(charAfter);
          if (isWordBoundary) {
            allSpans.push({
              ...span,
              id: `${span.id}_prop_${searchIndex}`,
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

  // 4. Map resolved spans to DetectedEntity interface for backwards compatibility
  return allSpans.map((span) => ({
    id: span.id,
    type: span.entityType,
    category: getCategoryForType(span.entityType),
    text: span.text,
    start: span.start,
    end: span.end,
    confidence: span.confidence,
    reason: span.evidence,
    placeholder: `[[${span.entityType}_001]]`,
    votes: span.contributingDetections?.map((d) => ({
      stage: d.detectorId.includes('secret')
        ? 'SECRET'
        : d.detectorId.includes('regex')
        ? 'REGEX'
        : d.detectorId.includes('dict')
        ? 'DICTIONARY'
        : 'CONTEXT',
      type: d.entityType,
      confidence: d.confidence,
      reason: d.evidence,
    })) || [],
  }));
}

export { detectorManager, spanResolver };
