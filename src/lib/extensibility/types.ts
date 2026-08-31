import { ShieldRequestPayload, ShieldResponsePayload, RevealRequestPayload, RevealResponsePayload } from '@/types';

/**
 * Extensibility Architecture Module Contracts
 * Standard interfaces for future modules (Browser Extension, API Gateway, CLI, IDE Extensions, Enterprise Policy)
 */

export interface BrowserExtensionAdapter {
  targetDomain: 'chatgpt.com' | 'claude.ai' | 'gemini.google.com' | 'custom';
  interceptPrompt(rawPrompt: string): Promise<string>;
  restoreResponse(shieldedResponse: string, sessionId: string): Promise<string>;
}

export interface APIGatewayMiddleware {
  processIncomingPrompt(payload: ShieldRequestPayload): Promise<ShieldResponsePayload>;
  processOutgoingResponse(payload: RevealRequestPayload): Promise<RevealResponsePayload>;
}

export interface CLIOptions {
  inputFile?: string;
  outputFile?: string;
  action: 'shield' | 'reveal';
  sessionId?: string;
  customTerms?: string[];
}

export interface IDEExtensionPlugin {
  ideName: 'VSCode' | 'Cursor' | 'JetBrains';
  activeFileUri?: string;
  shieldSelection(selectedText: string): Promise<ShieldResponsePayload>;
  revealSelection(selectedText: string, sessionId: string): Promise<RevealResponsePayload>;
}

export interface EnterprisePolicyEngine {
  policyId: string;
  mandatoryMaskCategories: string[];
  blockUnmaskOverrides: boolean;
  minPrivacyScoreThreshold: number;
}

export interface AuditLogCollector {
  logShieldEvent(event: { sessionId: string; timestamp: string; entitiesCount: number; processingTimeMs: number }): void;
  logRevealEvent(event: { sessionId: string; timestamp: string; restoredCount: number }): void;
}
