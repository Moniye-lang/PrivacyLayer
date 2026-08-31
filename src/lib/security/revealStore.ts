import { RevealSession, RevealStore } from '../../types';

export class InMemoryRevealStore implements RevealStore {
  private sessions: Map<string, RevealSession> = new Map();
  private defaultTtlMinutes: number;

  constructor(defaultTtlMinutes: number = 60) {
    this.defaultTtlMinutes = defaultTtlMinutes;
  }

  public async save(session: RevealSession): Promise<void> {
    this.sessions.set(session.sessionId, { ...session });
  }

  public async get(sessionId: string): Promise<RevealSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.isPurged) {
      return null;
    }

    const now = new Date();
    const expires = new Date(session.expiresAt);

    if (now > expires) {
      await this.purge(sessionId);
      return null;
    }

    // Touch session activity-based TTL refresh
    await this.touch(sessionId);
    return this.sessions.get(sessionId) || null;
  }

  public async touch(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.isPurged) {
      return;
    }

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + this.defaultTtlMinutes * 60 * 1000).toISOString();

    session.lastActivity = now.toISOString();
    session.expiresAt = newExpiresAt;

    this.sessions.set(sessionId, session);
  }

  public async purge(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isPurged = true;
      this.sessions.delete(sessionId);
    }
  }

  public async clearAll(): Promise<void> {
    this.sessions.clear();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __revealStore: InMemoryRevealStore | undefined;
}

if (!globalThis.__revealStore) {
  globalThis.__revealStore = new InMemoryRevealStore();
}

export const revealStoreInstance: InMemoryRevealStore = globalThis.__revealStore;
