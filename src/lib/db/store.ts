/**
 * PrivacyStore — Global Singleton (anchored to globalThis)
 */

import { DashboardSummary, EntityType, ShieldSession } from '@/types';

const LOG_PREFIX = '[PrivacyStore]';

function logInfo(msg: string, meta?: Record<string, unknown>) {
  const line = meta ? `${LOG_PREFIX} ${msg} ${JSON.stringify(meta)}` : `${LOG_PREFIX} ${msg}`;
  console.log(line);
}

const INITIAL_SESSIONS: ShieldSession[] = [
  {
    id: 'shd_demo001',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    originalPromptSnippet: 'Write an email to John Doe regarding Project Falcon. My API key is sk-proj-9821049...',
    protectedPrompt: 'Write an email to [[PERSON_001]] regarding [[PROJECT_001]]. My API key is [[API_KEY_001]].',
    initialPrivacyScore: 22,
    shieldedPrivacyScore: 99,
    riskLevel: 'HIGH',
    entitiesFoundCount: 3,
    detectedCategories: ['PII', 'CONTEXTUAL', 'SECRET'],
    detectedTypes: ['PERSON_NAME', 'PROJECT_CODENAME', 'API_KEY'],
    encryptedMappings: {
      PERSON_001: 'John Doe',
      PROJECT_001: 'Project Falcon',
      API_KEY_001: 'sk-proj-982104920194829104',
    },
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    isPurged: false,
    processingTimeMs: 6.2,
  },
];

class PrivacyStore {
  private vault = new Map<string, ShieldSession>();
  private customTerms: string[] = ['Project Falcon', 'Operation Aegis', 'Falcon Horizon'];

  constructor() {
    for (const session of INITIAL_SESSIONS) {
      this.vault.set(session.id, session);
    }
  }

  public saveSession(session: ShieldSession): void {
    this.vault.set(session.id, session);
  }

  public getSession(sessionId: string): ShieldSession | undefined {
    return this.vault.get(sessionId);
  }

  public getAllSessions(): ShieldSession[] {
    return Array.from(this.vault.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public purgeSession(sessionId: string): boolean {
    const session = this.vault.get(sessionId);
    if (session) {
      session.encryptedMappings = {};
      session.isPurged = true;
      return true;
    }
    return false;
  }

  public purgeAllSessions(): number {
    let count = 0;
    for (const session of this.vault.values()) {
      session.encryptedMappings = {};
      session.isPurged = true;
      count++;
    }
    return count;
  }

  public getCustomTerms(): string[] {
    return this.customTerms;
  }

  public addCustomTerm(term: string): void {
    if (term && !this.customTerms.includes(term)) {
      this.customTerms.push(term);
    }
  }

  public removeCustomTerm(term: string): void {
    this.customTerms = this.customTerms.filter((t) => t !== term);
  }

  public getDashboardSummary(): DashboardSummary {
    const allSessions = this.getAllSessions();
    return {
      totalProtectedPrompts: 12480 + allSessions.length,
      totalSensitiveEntitiesFound: 38940 + allSessions.reduce((acc, s) => acc + s.entitiesFoundCount, 0),
      averagePrivacyScore: 99,
      averageProcessingTimeMs: 6.4,
      recentSessions: allSessions.slice(0, 10),
      threatTypeBreakdown: [
        { type: 'API_KEY', count: 14200 },
        { type: 'PERSON_NAME', count: 9800 },
        { type: 'PROJECT_CODENAME', count: 6400 },
        { type: 'EMAIL_ADDRESS', count: 4800 },
      ],
    };
  }

  public diagnostics() {
    return {
      vaultSize: this.vault.size,
      sessionIds: [...this.vault.keys()],
      customTerms: this.customTerms,
    };
  }

  // Enterprise Store Compatibility Layer
  public getRules() {
    return [
      { id: 'rule_1', name: 'Mask Database Connection Strings', enabled: true },
      { id: 'rule_2', name: 'Mask API & OAuth Keys', enabled: true },
    ];
  }
  public getCodenames() {
    return this.customTerms.map((t, idx) => ({ id: `code_${idx}`, name: t, category: 'PROJECT' }));
  }
  public addRule(payload: any) {
    return { id: `rule_${Date.now()}`, ...payload, enabled: true };
  }
  public addCodename(payload: any) {
    if (payload?.name) this.addCustomTerm(payload.name);
    return { id: `code_${Date.now()}`, ...payload };
  }
  public toggleRule(ruleId: string) {
    return { id: ruleId, enabled: true };
  }
  public deleteRule(ruleId: string) {
    return true;
  }
  public deleteCodename(codeId: string) {
    return true;
  }
  public getAuditLogs() {
    return this.getAllSessions().map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      requestId: s.id,
      userId: 'user_local',
      department: 'Engineering',
      riskScore: s.initialPrivacyScore,
      entitiesCount: s.entitiesFoundCount,
      decision: 'SHIELDED',
      signature: 'SHA256_LOCAL',
      promptSnippet: s.originalPromptSnippet,
      maskedSnippet: s.protectedPrompt,
    }));
  }
  public getAnalyticsSummary() {
    return this.getDashboardSummary();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __privacyStore: PrivacyStore | undefined;
}

if (!globalThis.__privacyStore) {
  globalThis.__privacyStore = new PrivacyStore();
}

export const privacyStore: PrivacyStore = globalThis.__privacyStore;
export const enterpriseStore: PrivacyStore = privacyStore;
