import {
  CandidateDetection,
  DetectedEntity,
  EntityType,
  ManualOverride,
  ProcessingRecord,
  RevealRequestPayload,
  RevealResponsePayload,
  RevealSession,
  ShieldRequestPayload,
  ShieldResponsePayload,
  ShieldSession,
} from '../../types';
import { detectorManager, spanResolver } from './multiLayerPipeline';
import { DecisionEngine, MaskEngine } from './mask/maskEngine';
import { EncryptionProvider } from '../../types';
import { AESGCMEncryptionProvider, NoOpEncryptionProvider } from '../security/encryptionProvider';
import { revealStoreInstance } from '../security/revealStore';
import { RevealEngine } from './reveal/revealEngine';
import { privacyStore } from '../db/store';
import { evaluateResidualRisk, ResidualRiskResult } from './residualRiskEngine';

const decisionEngine = new DecisionEngine();
const maskEngine = new MaskEngine();
const encryptionProvider: EncryptionProvider =
  process.env.NODE_ENV === 'production'
    ? new AESGCMEncryptionProvider()
    : new NoOpEncryptionProvider();

const revealEngine = new RevealEngine(revealStoreInstance, encryptionProvider);

const PLACEHOLDER_PREFIXES: Record<string, string> = {
  PERSON_NAME: 'PERSON',
  PROJECT_CODENAME: 'PROJECT',
  API_KEY: 'API_KEY',
  EMAIL_ADDRESS: 'EMAIL',
  PHONE_NUMBER: 'PHONE',
  PASSWORD: 'PASSWORD',
  JWT_TOKEN: 'TOKEN',
  CONNECTION_STRING: 'CONNECTION_STRING',
  CREDIT_CARD: 'CREDIT_CARD',
  BANK_ACCOUNT: 'BANK_ACCOUNT',
  IBAN: 'IBAN',
  PASSPORT_NUMBER: 'PASSPORT',
  UUID: 'UUID',
  URL: 'URL',
  SSN_NATIONAL_ID: 'SSN',
  EMPLOYEE_ID: 'EMPLOYEE',
  CUSTOMER_ID: 'CUSTOMER',
  COMPANY_SECRET: 'SECRET',
  FINANCIAL_METRIC: 'FINANCIAL',
  MEDICAL_RECORD: 'MEDICAL',
  LEGAL_REFERENCE: 'LEGAL',
  SOURCE_CODE_SECRET: 'SECRET',
  ADDRESS: 'ADDRESS',
  DATE: 'DATE',
  ORGANIZATION: 'ORGANIZATION',
  LOCATION: 'LOCATION',
  PRODUCT: 'PRODUCT',
  EVENT: 'EVENT',
  REPOSITORY: 'REPOSITORY',
  CUSTOM_TERM: 'TERM',
};

function getPlaceholderPrefix(type: EntityType): string {
  return PLACEHOLDER_PREFIXES[type] || 'ENTITY';
}

export function calculateInitialPrivacyScore(entitiesCount: number): number {
  if (entitiesCount === 0) return 99;
  return Math.max(14, Math.min(99, 100 - entitiesCount * 20));
}

export function generateDetectionSummary(
  entities: { type: EntityType }[],
  residualRisk?: ResidualRiskResult
): string {
  if (entities.length === 0 && (!residualRisk || !residualRisk.hasUnresolvedHighRisk)) {
    return 'No sensitive information detected. Safe to send directly.';
  }

  const countByType: Record<string, number> = {};
  for (const e of entities) {
    const readable = e.type.replace(/_/g, ' ').toLowerCase();
    countByType[readable] = (countByType[readable] || 0) + 1;
  }

  const items = Object.entries(countByType).map(
    ([type, count]) => `✓ ${count} ${type}${count > 1 ? 's' : ''}`
  );

  let summary = `Protected: ${items.join(', ')}.`;

  if (residualRisk && residualRisk.hasUnresolvedHighRisk) {
    summary += ` ⚠ REVIEW REQUIRED: ${residualRisk.unresolvedWarningMessage}`;
  }

  return summary;
}

export async function shieldPrompt(
  payload: ShieldRequestPayload | string,
  _activeRules?: any
): Promise<ShieldResponsePayload & { processingRecord?: ProcessingRecord }> {
  const startTimeMs = Date.now();
  const normPayload: ShieldRequestPayload = typeof payload === 'string' ? { prompt: payload } : (payload || { prompt: '' });
  const rawPrompt = normPayload.prompt || '';
  const customTerms = normPayload.customTerms || [];
  const manualOverrides = normPayload.manualOverrides || [];
  const ttlMinutes = normPayload.ttlMinutes || 60;

  // 1. Parallel Detection
  const detectors = detectorManager.getRegisteredDetectors();
  const detectorsExecuted = detectors.map((d) => d.id);
  let candidates: CandidateDetection[] = await detectorManager.detectAll(rawPrompt, { customTerms });

  // 2. Decision Engine (Manual Overrides)
  candidates = decisionEngine.applyOverrides(candidates, manualOverrides, rawPrompt);

  // 3. Span Resolver (Compatibility Matrix & Priority Authority)
  const resolvedSpans = spanResolver.resolve(candidates, rawPrompt);

  // 4. Mask Engine
  const maskResult = maskEngine.mask(
    resolvedSpans,
    rawPrompt,
    detectorsExecuted,
    manualOverrides.length,
    startTimeMs,
    candidates.length
  );

  // 5. Residual Risk Evaluation on the post-shielded output prompt text
  const residualRisk = evaluateResidualRisk(maskResult.protectedPrompt);

  // Encrypt plaintext mappings for storage in RevealSession
  const encryptedMappings = await encryptionProvider.encrypt(
    JSON.stringify(maskResult.plaintextMappings)
  );

  const sessionId = `shd_${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

  const revealSession: RevealSession = {
    sessionId,
    encryptedMappings,
    createdAt: now.toISOString(),
    lastActivity: now.toISOString(),
    expiresAt,
    isPurged: false,
  };

  // Save in RevealStore
  await revealStoreInstance.save(revealSession);

  const initialPrivacyScore = calculateInitialPrivacyScore(resolvedSpans.length);
  const shieldedPrivacyScore = residualRisk.hasUnresolvedHighRisk
    ? Math.min(45, residualRisk.residualScore)
    : 99;

  const riskLevel = residualRisk.hasUnresolvedHighRisk
    ? 'REVIEW_REQUIRED'
    : initialPrivacyScore < 35
    ? 'CRITICAL'
    : initialPrivacyScore < 60
    ? 'HIGH'
    : initialPrivacyScore < 80
    ? 'MEDIUM'
    : 'LOW';

  const safetyVerdict = residualRisk.hasUnresolvedHighRisk
    ? 'REVIEW REQUIRED'
    : 'SAFE TO SHARE';

  const fullProcessingRecord: ProcessingRecord = {
    ...maskResult.processingRecord,
    candidatesCount: candidates.length,
    entitiesDetected: resolvedSpans.length,
    entitiesMasked: maskResult.detectedEntities.length,
    residualHighRiskCount: residualRisk.unresolvedCategories.length,
    residualHighRiskCategories: residualRisk.unresolvedCategories,
    safetyVerdict,
  };

  // Legacy store compatibility for UI dashboard
  const legacySession: ShieldSession = {
    id: sessionId,
    timestamp: now.toISOString(),
    originalPromptSnippet: rawPrompt.length > 120 ? rawPrompt.slice(0, 117) + '...' : rawPrompt,
    protectedPrompt: maskResult.protectedPrompt,
    initialPrivacyScore,
    shieldedPrivacyScore,
    riskLevel: riskLevel as any,
    entitiesFoundCount: resolvedSpans.length,
    detectedCategories: Array.from(new Set(maskResult.detectedEntities.map((e) => 'SECRET'))),
    detectedTypes: Array.from(new Set(maskResult.detectedEntities.map((e) => e.type))),
    encryptedMappings: maskResult.plaintextMappings,
    expiresAt,
    isPurged: false,
    processingTimeMs: fullProcessingRecord.executionTimeMs,
  };
  privacyStore.saveSession(legacySession);

  const detectedEntitiesPayload = maskResult.detectedEntities.map((e) => ({
    placeholder: e.placeholder,
    type: e.type,
    category: 'SECRET' as const,
    reason: e.evidence,
    confidence: e.confidence,
  }));

  return {
    sessionId,
    requestId: sessionId,
    protectedPrompt: maskResult.protectedPrompt,
    maskedPrompt: maskResult.protectedPrompt,
    initialPrivacyScore,
    shieldedPrivacyScore,
    riskLevel,
    safetyVerdict,
    riskScore: initialPrivacyScore,
    entitiesCount: resolvedSpans.length,
    entitiesDetectedCount: resolvedSpans.length,
    detectionSummary: generateDetectionSummary(maskResult.detectedEntities, residualRisk),
    detectedEntities: detectedEntitiesPayload,
    processingTimeMs: fullProcessingRecord.executionTimeMs,
    latency: { totalMs: fullProcessingRecord.executionTimeMs },
    expiresAt,
    processingRecord: fullProcessingRecord,
    unresolvedCategories: residualRisk.unresolvedCategories,
  };
}

export async function revealResponse(
  payloadOrSessionId: RevealRequestPayload | string,
  maybeAiResponse?: string
): Promise<RevealResponsePayload> {
  const sessionId = typeof payloadOrSessionId === 'string' ? payloadOrSessionId : payloadOrSessionId.sessionId;
  const aiResponse = typeof payloadOrSessionId === 'string' ? (maybeAiResponse ?? '') : payloadOrSessionId.aiResponse;
  return await revealEngine.restore(sessionId, aiResponse);
}

export function applyManualOverrides(
  entities: DetectedEntity[],
  overrides: ManualOverride[]
): DetectedEntity[] {
  if (!overrides.length) return entities;

  let result = [...entities];

  for (const override of overrides.filter((o) => o.action === 'UNMASK')) {
    result = result.filter(
      (e) => Math.max(e.start, override.start) >= Math.min(e.end, override.end)
    );
  }

  for (const override of overrides.filter((o) => o.action === 'MASK')) {
    result = result.filter(
      (e) => Math.max(e.start, override.start) >= Math.min(e.end, override.end)
    );

    const entityType = override.type || 'CUSTOM_TERM';
    result.push({
      id: `manual_${entityType}_${override.start}`,
      type: entityType,
      category: 'CUSTOM',
      text: override.text,
      start: override.start,
      end: override.end,
      confidence: 1.0,
      reason: 'Manual Override: User explicitly marked for masking (100% precedence)',
      placeholder: `[[${getPlaceholderPrefix(entityType)}_001]]`,
      votes: [
        {
          stage: 'DICTIONARY',
          type: entityType,
          confidence: 1.0,
          reason: 'Manual user override — takes precedence over all automatic detectors',
        },
      ],
    });
  }

  return result.sort((a, b) => a.start - b.start);
}

export const executeMaskingEngine = shieldPrompt;
