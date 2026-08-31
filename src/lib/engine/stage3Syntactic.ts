import { DetectedEntity, EntityType } from '@/types';

/**
 * Stage 3: Deterministic Syntactic & Grammatical Rule Engine
 * Analyzes sentence structure, capitalizations, variable naming patterns, and syntactic indicators.
 * 100% Offline, Deterministic, Zero-LLM.
 */
export function runStage3Syntactic(
  text: string,
  candidateSpans: { text: string; start: number; end: number }[] = []
): DetectedEntity[] {
  const detected: DetectedEntity[] = [];

  for (const span of candidateSpans) {
    const rawSpan = span.text.trim();
    if (!rawSpan || rawSpan.length < 2) continue;

    // 1. Title Case / Proper Noun Patterns (e.g., "Alexander Smith", "Falcon-X")
    if (/^[A-Z][a-z]{2,20}(?:\s+[A-Z][a-z]{2,20})?$/.test(rawSpan)) {
      detected.push({
        id: `stg3_syn_${span.start}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'PERSON_NAME',
        category: 'PII',
        text: rawSpan,
        start: span.start,
        end: span.end,
        confidence: 0.88,
        reason: `Syntactic Engine: Capitalized proper noun phrase detected (${rawSpan})`,
        placeholder: '[[PERSON_001]]',
        votes: [
          {
            stage: 'SYNTACTIC',
            type: 'PERSON_NAME',
            confidence: 0.88,
            reason: 'Deterministic syntactic proper noun rule match',
          },
        ],
      });
    }
    // 2. Sensitive Variable / Constant Naming Patterns (e.g. `USER_SECRET_PASS`, `apiKeySecret`)
    else if (/^(?:[a-z0-9_]*(?:secret|password|api_key|priv_key|auth_token)[a-z0-9_]*)$/i.test(rawSpan)) {
      detected.push({
        id: `stg3_syn_var_${span.start}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'SOURCE_CODE_SECRET',
        category: 'SECRET',
        text: rawSpan,
        start: span.start,
        end: span.end,
        confidence: 0.90,
        reason: `Syntactic Engine: Sensitive code identifier pattern (${rawSpan})`,
        placeholder: '[[SECRET_001]]',
        votes: [
          {
            stage: 'SYNTACTIC',
            type: 'SOURCE_CODE_SECRET',
            confidence: 0.90,
            reason: 'Sensitive identifier syntax match',
          },
        ],
      });
    }
  }

  return detected;
}
