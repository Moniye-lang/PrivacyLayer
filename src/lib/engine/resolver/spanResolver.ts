import { CandidateDetection, EntityType, ICompatibilityMatrix } from '../../../types';
import { defaultCompatibilityMatrix } from './compatibilityMatrix';

export interface ResolvedSpan {
  id: string;
  start: number;
  end: number;
  entityType: CandidateDetection['entityType'];
  priority: number;
  confidence: number;
  evidence: string;
  detectorId: string;
  text: string;
  contributingDetections: CandidateDetection[];
}

const COMPOUND_CONTAINER_TYPES: Set<EntityType> = new Set([
  'EMAIL_ADDRESS',
  'CONNECTION_STRING',
  'URL',
  'API_KEY',
  'JWT_TOKEN',
  'PASSWORD',
  'SOURCE_CODE_SECRET',
  'COMPANY_SECRET',
  'CREDIT_CARD',
  'IBAN',
  'PHONE_NUMBER',
]);

function trimSpanPunctuation(
  start: number,
  end: number,
  entityType: EntityType,
  originalText: string
): { start: number; end: number; text: string } {
  let s = start;
  let e = end;

  // Characters that should never be at the start/end of sensitive spans
  // Preserve leading '+' for phone numbers
  const LEADING_PUNCT = entityType === 'PHONE_NUMBER' ? /^[\s,.;:!?'"()\[\]{}<>“”‘’`]/ : /^[\s,.;:!?'"()\[\]{}<>“”‘’`]/;
  const TRAILING_PUNCT = /[\s,.;:!?'"()\[\]{}<>“”‘’`]$/;

  while (s < e && LEADING_PUNCT.test(originalText.charAt(s))) {
    s++;
  }

  while (e > s && TRAILING_PUNCT.test(originalText.charAt(e - 1))) {
    e--;
  }

  // Strip possessive 's or ’s at trailing end for names/entities
  const sub = originalText.substring(s, e);
  if (/['’]s$/i.test(sub)) {
    e -= 2;
  } else if (/['’]$/.test(sub)) {
    e -= 1;
  }

  // Re-trim trailing punctuation if any became exposed
  while (e > s && TRAILING_PUNCT.test(originalText.charAt(e - 1))) {
    e--;
  }

  return {
    start: s,
    end: e,
    text: originalText.substring(s, e),
  };
}

export class SpanResolver {
  private matrix: ICompatibilityMatrix;

  constructor(matrix: ICompatibilityMatrix = defaultCompatibilityMatrix) {
    this.matrix = matrix;
  }

  public resolve(candidates: CandidateDetection[], originalText: string): ResolvedSpan[] {
    if (!candidates || candidates.length === 0) {
      return [];
    }

    // 1. Sort candidates: Priority Authority desc, Confidence desc, Start pos asc, Length desc
    const sorted = [...candidates].sort((a, b) => {
      const prioA = (a.priority as number) || 0;
      const prioB = (b.priority as number) || 0;
      if (prioA !== prioB) return prioB - prioA;

      const confA = a.confidence || 0;
      const confB = b.confidence || 0;
      if (confA !== confB) return confB - confA;

      if (a.start !== b.start) return a.start - b.start;

      const lenA = a.end - a.start;
      const lenB = b.end - b.start;
      return lenB - lenA;
    });

    const resolved: ResolvedSpan[] = [];

    for (const candidate of sorted) {
      if (candidate.start >= candidate.end) continue;

      const trimmed = trimSpanPunctuation(candidate.start, candidate.end, candidate.entityType, originalText);
      if (trimmed.start >= trimmed.end) continue;

      let currentSpan: ResolvedSpan = {
        id: candidate.id,
        start: trimmed.start,
        end: trimmed.end,
        entityType: candidate.entityType,
        priority: candidate.priority as number,
        confidence: candidate.confidence,
        evidence: candidate.evidence,
        detectorId: candidate.detectorId,
        text: trimmed.text,
        contributingDetections: [candidate],
      };

      let subsumedOrMerged = false;

      for (let i = 0; i < resolved.length; i++) {
        const existing = resolved[i];

        // Check if currentSpan and existing span overlap
        const overlapStart = Math.max(existing.start, currentSpan.start);
        const overlapEnd = Math.min(existing.end, currentSpan.end);

        if (overlapStart < overlapEnd) {
          // NESTED ENTITY RESOLUTION: Compound container entities (EMAIL, CONNECTION_STRING, URL) subsume sub-entities
          const existingIsCompound = COMPOUND_CONTAINER_TYPES.has(existing.entityType);
          const currentIsCompound = COMPOUND_CONTAINER_TYPES.has(currentSpan.entityType);

          // Explicit Rule: EMAIL_ADDRESS parent subsumes contained PERSON_NAME child
          if (existing.entityType === 'EMAIL_ADDRESS' && currentSpan.entityType === 'PERSON_NAME' && existing.start <= currentSpan.start && existing.end >= currentSpan.end) {
            subsumedOrMerged = true;
            break;
          }
          // Explicit Rule: Compound containers (EMAIL, API_KEY, CONNECTION_STRING, URL, PASSWORD, PHONE_NUMBER) always subsume internal child spans
          if (existingIsCompound && (!currentIsCompound || existing.text.length >= currentSpan.text.length) && existing.start <= currentSpan.start && existing.end >= currentSpan.end) {
            subsumedOrMerged = true;
            break;
          }

          if (currentIsCompound && (!existingIsCompound || currentSpan.text.length >= existing.text.length) && currentSpan.start <= existing.start && currentSpan.end >= existing.end) {
            resolved[i] = currentSpan;
            subsumedOrMerged = true;
            break;
          }

          // Check compatibility matrix
          const compatible = this.matrix.areCompatible(existing.entityType, currentSpan.entityType);

          if (compatible) {
            // MERGE compatible spans into a single unified span
            const mergedStart = Math.min(existing.start, currentSpan.start);
            const mergedEnd = Math.max(existing.end, currentSpan.end);

            const dominant = (existing.priority >= currentSpan.priority) ? existing : currentSpan;
            const trimmedMerged = trimSpanPunctuation(mergedStart, mergedEnd, dominant.entityType, originalText);

            resolved[i] = {
              id: dominant.id,
              start: trimmedMerged.start,
              end: trimmedMerged.end,
              entityType: dominant.entityType,
              priority: dominant.priority,
              confidence: Math.max(existing.confidence, currentSpan.confidence),
              evidence: `${existing.evidence} | ${currentSpan.evidence}`,
              detectorId: dominant.detectorId,
              text: trimmedMerged.text,
              contributingDetections: [...existing.contributingDetections, ...currentSpan.contributingDetections],
            };
            subsumedOrMerged = true;
            break;
          } else {
            // INCOMPATIBLE spans -> Resolve by Priority Authority
            if (currentSpan.priority > existing.priority) {
              // Higher priority specific detector replaces lower priority generic/assignment span
              resolved[i] = currentSpan;
              subsumedOrMerged = true;
              break;
            } else {
              // Lower priority span is subsumed by existing higher priority span
              subsumedOrMerged = true;
              break;
            }
          }
        }
      }

      if (!subsumedOrMerged && currentSpan.start < currentSpan.end) {
        resolved.push(currentSpan);
      }
    }

    // Final deduplication & nested subsumption pass
    const finalResolved: ResolvedSpan[] = [];
    const sortedResolved = resolved
      .filter((s) => s.start < s.end)
      .sort((a, b) => (b.end - b.start) - (a.end - a.start) || b.priority - a.priority);

    for (const span of sortedResolved) {
      const isSubsumed = finalResolved.some(
        (existing) => existing.start <= span.start && existing.end >= span.end
      );
      if (!isSubsumed) {
        finalResolved.push(span);
      }
    }

    return finalResolved.sort((a, b) => a.start - b.start);
  }
}
