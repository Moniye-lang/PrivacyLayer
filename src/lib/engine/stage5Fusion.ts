import { DetectedEntity, DetectorVote, EntityType } from '@/types';
import { learnedCacheStore } from './learnedCache';

interface CandidateSpan {
  text: string;
  start: number;
  end: number;
  votes: DetectorVote[];
}

/**
 * Stage 5: Confidence Fusion Engine
 * Fuses multi-stage detector votes (Regex, NER, Syntactic, Context, Dictionary, Secret),
 * calculates composite confidence, resolves span overlaps, and auto-learns names.
 */
export function fuseConfidenceVotes(entitiesByStage: DetectedEntity[]): DetectedEntity[] {
  if (entitiesByStage.length === 0) return [];

  // 1. Group candidate entities by overlapping character spans [start, end]
  const spanMap: CandidateSpan[] = [];

  for (const entity of entitiesByStage) {
    const existingSpan = spanMap.find(
      (s) => Math.max(s.start, entity.start) < Math.min(s.end, entity.end)
    );

    const vote: DetectorVote = {
      stage: (entity.votes && entity.votes[0]?.stage) || 'NER',
      type: entity.type,
      confidence: entity.confidence,
      reason: entity.reason,
    };

    if (existingSpan) {
      existingSpan.votes.push(vote);
      // Keep longer text span if broader
      if (entity.text.length > existingSpan.text.length) {
        existingSpan.text = entity.text;
        existingSpan.start = entity.start;
        existingSpan.end = entity.end;
      }
    } else {
      spanMap.push({
        text: entity.text,
        start: entity.start,
        end: entity.end,
        votes: [vote],
      });
    }
  }

  // 2. Compute Fused Confidence Score for each span
  const fusedEntities: DetectedEntity[] = [];

  for (const span of spanMap) {
    // Group votes by EntityType
    const typeConfidenceMap = new Map<EntityType, { maxConf: number; votes: DetectorVote[] }>();

    for (const vote of span.votes) {
      const current = typeConfidenceMap.get(vote.type) || { maxConf: 0, votes: [] };
      current.votes.push(vote);
      current.maxConf = Math.max(current.maxConf, vote.confidence);
      typeConfidenceMap.set(vote.type, current);
    }

    // Select EntityType with highest weighted fused confidence
    let bestType: EntityType = 'PERSON_NAME';
    let highestFusedConfidence = 0;
    let winningVotes: DetectorVote[] = [];

    typeConfidenceMap.forEach((data, type) => {
      // Fusion formula: Max vote confidence boosted by multi-detector agreement
      const agreementBonus = (data.votes.length - 1) * 0.03;
      const fused = Math.min(0.99, data.maxConf + agreementBonus);

      if (fused > highestFusedConfidence) {
        highestFusedConfidence = fused;
        bestType = type;
        winningVotes = data.votes;
      }
    });

    const category = getCategoryForType(bestType);
    const placeholder = getPlaceholderForType(bestType);

    const fusedEntity: DetectedEntity = {
      id: `fused_${bestType}_${span.start}_${Math.random().toString(36).substring(2, 6)}`,
      type: bestType,
      category,
      text: span.text,
      start: span.start,
      end: span.end,
      confidence: parseFloat(highestFusedConfidence.toFixed(2)),
      reason: `Stage 5 Fusion (${winningVotes.length} ${winningVotes.length === 1 ? 'vote' : 'votes'}): ${winningVotes.map(v => `${v.stage}=${Math.round(v.confidence * 100)}%`).join(', ')}`,
      placeholder,
      votes: winningVotes,
    };

    fusedEntities.push(fusedEntity);

    // Auto-learn person names into Learned Cache
    if (bestType === 'PERSON_NAME' && span.text.length >= 2) {
      learnedCacheStore.learnPersonName(span.text);
    }
  }

  // Sort descending by position
  return fusedEntities.sort((a, b) => a.start - b.start);
}

function getCategoryForType(type: EntityType) {
  switch (type) {
    case 'API_KEY':
    case 'JWT_TOKEN':
    case 'PASSWORD':
    case 'CONNECTION_STRING':
    case 'COMPANY_SECRET':
    case 'SOURCE_CODE_SECRET':
      return 'SECRET';
    case 'CREDIT_CARD':
    case 'BANK_ACCOUNT':
    case 'IBAN':
    case 'FINANCIAL_METRIC':
      return 'FINANCIAL';
    case 'SSN_NATIONAL_ID':
    case 'PASSPORT_NUMBER':
    case 'EMPLOYEE_ID':
    case 'CUSTOMER_ID':
    case 'IP_ADDRESS':
    case 'UUID':
    case 'URL':
      return 'IDENTIFIER';
    case 'MEDICAL_RECORD':
      return 'MEDICAL';
    case 'LEGAL_REFERENCE':
      return 'LEGAL';
    case 'PERSON_NAME':
    case 'EMAIL_ADDRESS':
    case 'PHONE_NUMBER':
    case 'ADDRESS':
    case 'LOCATION':
      return 'PII';
    default:
      return 'CONTEXTUAL';
  }
}

function getPlaceholderForType(type: EntityType): string {
  switch (type) {
    case 'PERSON_NAME': return '[[PERSON_001]]';
    case 'PROJECT_CODENAME': return '[[PROJECT_001]]';
    case 'API_KEY': return '[[API_KEY_001]]';
    case 'ORGANIZATION': return '[[ORGANIZATION_001]]';
    case 'LOCATION': return '[[LOCATION_001]]';
    case 'PRODUCT': return '[[PRODUCT_001]]';
    case 'EVENT': return '[[EVENT_001]]';
    case 'REPOSITORY': return '[[REPOSITORY_001]]';
    case 'EMAIL_ADDRESS': return '[[EMAIL_001]]';
    case 'PHONE_NUMBER': return '[[PHONE_001]]';
    case 'CONNECTION_STRING': return '[[CONNECTION_STRING_001]]';
    case 'CREDIT_CARD': return '[[CREDIT_CARD_001]]';
    case 'IBAN': return '[[IBAN_001]]';
    case 'PASSPORT_NUMBER': return '[[PASSPORT_001]]';
    case 'UUID': return '[[UUID_001]]';
    case 'URL': return '[[URL_001]]';
    default: return `[[${type}_001]]`;
  }
}
