export type EntityCategory =
  | 'SECRET'
  | 'IDENTIFIER'
  | 'PII'
  | 'FINANCIAL'
  | 'MEDICAL'
  | 'LEGAL'
  | 'CONTEXTUAL'
  | 'CUSTOM';

export type EntityType =
  | 'API_KEY'
  | 'JWT_TOKEN'
  | 'PASSWORD'
  | 'CONNECTION_STRING'
  | 'SSN_NATIONAL_ID'
  | 'CREDIT_CARD'
  | 'BANK_ACCOUNT'
  | 'IBAN'
  | 'PASSPORT_NUMBER'
  | 'UUID'
  | 'URL'
  | 'EMAIL_ADDRESS'
  | 'PHONE_NUMBER'
  | 'IP_ADDRESS'
  | 'EMPLOYEE_ID'
  | 'CUSTOMER_ID'
  | 'PROJECT_CODENAME'
  | 'COMPANY_SECRET'
  | 'MEDICAL_RECORD'
  | 'LEGAL_REFERENCE'
  | 'FINANCIAL_METRIC'
  | 'PERSON_NAME'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'PRODUCT'
  | 'EVENT'
  | 'REPOSITORY'
  | 'SOURCE_CODE_SECRET'
  | 'ADDRESS'
  | 'CUSTOM_TERM';

export enum PriorityLevel {
  MANUAL = 100,
  REGEX = 90,
  DICTIONARY = 80,
  CONTEXT = 70,
  HEURISTIC = 60,
}

export interface CandidateDetection {
  id: string;
  start: number;
  end: number;
  entityType: EntityType;
  confidence: number; // 0.0 - 1.0
  priority: PriorityLevel | number;
  detectorId: string;
  evidence: string; // Sanitized, non-sensitive explanation
  atomic: boolean; // Flag if candidate cannot be partially split
  text: string; // Matched raw plaintext segment
}

export interface DetectorVote {
  stage: 'REGEX' | 'NER' | 'SYNTACTIC' | 'CONTEXT' | 'DICTIONARY' | 'SECRET';
  type: EntityType;
  confidence: number; // 0.0 - 1.0
  reason: string;
}

export interface DetectedEntity {
  id: string;
  type: EntityType;
  category: EntityCategory;
  text: string;
  start: number;
  end: number;
  confidence: number; // 0.0 - 1.0
  reason: string;
  placeholder: string; // e.g. "[[PERSON_NAME_001]]"
  votes?: DetectorVote[];
}

export interface ImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageSelection {
  id: string;
  rect: ImageRect;
  displayedDim?: { width: number; height: number };
  entityType: EntityType;
  customLabel?: string;
  placeholder: string;
  evidence: string;
  priority: number;
}

export interface ImageRevealEntity {
  entityId: string;
  entityType: EntityType;
  sourceDocumentId: string;
  documentVersionId: string;
  imageWidth?: number;
  imageHeight?: number;
  rect: ImageRect;
  originalDataUrl: string;
  placeholder: string;
}

export interface RevealSession {
  sessionId: string;
  documentId?: string;
  documentVersionId?: string;
  imageWidth?: number;
  imageHeight?: number;
  encryptedMappings: string; // Serialized encrypted mapping payload
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  isPurged?: boolean;
}

export interface ProcessingRecord {
  readonly recordId: string;
  readonly engineVersion: string;
  readonly detectorsExecuted: string[];
  readonly candidatesCount?: number;
  readonly entitiesDetected: number;
  readonly entitiesMasked: number;
  readonly residualHighRiskCount?: number;
  readonly residualHighRiskCategories?: string[];
  readonly safetyVerdict?: 'SAFE TO SHARE' | 'REVIEW REQUIRED';
  readonly manualOverrideCount: number;
  readonly executionTimeMs: number;
  readonly timestamp: string;
}

export interface DetectorContext {
  customTerms?: string[];
  userDictionary?: Record<string, EntityType>;
  teamDictionary?: Record<string, EntityType>;
  orgDictionary?: Record<string, EntityType>;
}

export interface Detector {
  id: string;
  name: string;
  priority: PriorityLevel | number;
  detect(text: string, context?: DetectorContext): Promise<CandidateDetection[]>;
}

export interface ICompatibilityMatrix {
  areCompatible(typeA: EntityType, typeB: EntityType): boolean;
}

export interface EncryptionProvider {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

export interface RevealStore {
  save(session: RevealSession): Promise<void>;
  get(sessionId: string): Promise<RevealSession | null>;
  touch(sessionId: string): Promise<void>;
  purge(sessionId: string): Promise<void>;
}

export interface ShieldSession {
  id: string; // e.g. "shd_9a8f2k"
  timestamp: string;
  originalPromptSnippet: string; // Sanitized preview for history
  protectedPrompt: string;
  initialPrivacyScore: number; // e.g. 22/100 (High Risk)
  shieldedPrivacyScore: number; // e.g. 98/100 (Safe To Share)
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  entitiesFoundCount: number;
  detectedCategories: EntityCategory[];
  detectedTypes: EntityType[];
  encryptedMappings: Record<string, string>; // e.g. { "PERSON_001": "John Doe", "PROJECT_001": "Project Falcon" }
  expiresAt: string;
  isPurged: boolean;
  processingTimeMs: number;
}

export interface ManualOverride {
  text: string;
  start: number;
  end: number;
  action: 'MASK' | 'UNMASK';
  type?: EntityType;
}

export interface ShieldRequestPayload {
  prompt: string;
  customTerms?: string[];
  manualOverrides?: ManualOverride[];
  ttlMinutes?: number; // Auto-expire timer (default: 60 mins)
  department?: string;
  strategy?: string;
}

export interface ShieldResponsePayload {
  sessionId: string;
  requestId?: string;
  protectedPrompt: string;
  maskedPrompt?: string;
  initialPrivacyScore: number;
  shieldedPrivacyScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'REVIEW_REQUIRED';
  safetyVerdict?: 'SAFE TO SHARE' | 'REVIEW REQUIRED';
  riskScore?: number;
  entitiesCount: number;
  entitiesDetectedCount?: number;
  detectionSummary?: string;
  detectedEntities: {
    placeholder: string;
    type: EntityType;
    category?: EntityCategory;
    reason?: string;
    confidence: number;
    votes?: DetectorVote[];
    text?: string;
    start?: number;
    end?: number;
    evidence?: string;
  }[];
  plaintextMappings?: Record<string, string>;
  processingTimeMs: number;
  latency?: { totalMs: number };
  expiresAt: string;
  processingRecord?: ProcessingRecord;
  unresolvedCategories?: string[];
}

export interface ShieldImageRequestPayload {
  imageDataUrl: string;
  documentId?: string;
  selections: ImageSelection[];
  ttlMinutes?: number;
}

export interface ShieldImageResponsePayload {
  sessionId: string;
  documentId: string;
  documentVersionId: string;
  originalImageDataUrl: string;
  shieldedImageDataUrl: string;
  entitiesCount: number;
  detectedEntities: {
    placeholder: string;
    type: EntityType;
    rect: ImageRect;
    evidence: string;
  }[];
  processingTimeMs: number;
  expiresAt: string;
  processingRecord: ProcessingRecord;
}

export interface RevealRequestPayload {
  sessionId: string;
  aiResponse: string;
}

export interface RevealResponsePayload {
  sessionId: string;
  restoredResponse: string;
  restoredCount: number;
  restoredEntities: { placeholder: string; originalText: string }[];
  processingTimeMs: number;
}

export interface RevealImageRequestPayload {
  sessionId: string;
  shieldedImageDataUrl?: string;
  aiResponseImageDataUrl?: string;
}

export interface RevealImageResponsePayload {
  sessionId: string;
  restoredImageDataUrl: string;
  restoredCount: number;
  restoredEntities: { placeholder: string; rect: ImageRect }[];
  processingTimeMs: number;
}

export interface DashboardSummary {
  totalProtectedPrompts: number;
  totalSensitiveEntitiesFound: number;
  averagePrivacyScore: number;
  averageProcessingTimeMs: number;
  recentSessions: ShieldSession[];
  threatTypeBreakdown: { type: EntityType; count: number }[];
}

export interface MaskingStrategySettings {
  autoExpireMinutes: number;
  customTerms: string[];
  enableAES256Encryption: boolean;
}

/** Response shape from POST /api/v1/mask */
export interface MaskApiResponse {
  originalPrompt: string;
  maskedPrompt: string;
  riskScore: number;
  initialPrivacyScore: number;
  shieldedPrivacyScore: number;
  riskLevel: string;
  entitiesDetectedCount: number;
  entities: {
    placeholder: string;
    type: EntityType;
    category: EntityCategory;
    reason: string;
    confidence: number;
    votes?: DetectorVote[];
  }[];
  sessionId: string;
  latency: { regexMs: string; semanticMs: string; policyMs: string; totalMs: number };
  decision: string;
  processingRecord?: ProcessingRecord;
}

export type MaskResponsePayload = MaskApiResponse;
export type MaskingStrategy = 'DETERMINISTIC' | 'REDACT' | 'TOKENIZE' | 'REPLACE';
