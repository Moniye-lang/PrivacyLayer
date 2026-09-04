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

  // 3. Map resolved spans to DetectedEntity interface for backwards compatibility
  return resolvedSpans.map((span) => ({
    id: span.id,
    type: span.entityType,
    category: getCategoryForType(span.entityType),
    text: span.text,
    start: span.start,
    end: span.end,
    confidence: span.confidence,
    reason: span.evidence,
    placeholder: `[[${span.entityType}_001]]`,
    votes: span.contributingDetections.map((d) => ({
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
    })),
  }));
}

export { detectorManager, spanResolver };
