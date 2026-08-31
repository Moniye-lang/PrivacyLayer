import { EncryptionProvider, RevealResponsePayload, RevealStore } from '../../../types';
import { AESGCMEncryptionProvider, NoOpEncryptionProvider } from '../../security/encryptionProvider';
import { revealStoreInstance } from '../../security/revealStore';

export class RevealEngine {
  private store: RevealStore;
  private encryptionProvider: EncryptionProvider;

  constructor(
    store: RevealStore = revealStoreInstance,
    encryptionProvider?: EncryptionProvider
  ) {
    this.store = store;
    this.encryptionProvider =
      encryptionProvider ||
      (process.env.NODE_ENV === 'production'
        ? new AESGCMEncryptionProvider()
        : new NoOpEncryptionProvider());
  }

  public async restore(
    sessionId: string,
    aiResponse: string
  ): Promise<RevealResponsePayload> {
    const startTimeMs = Date.now();

    const session = await this.store.get(sessionId);
    if (!session) {
      throw new Error(`RevealSession not found or expired for ID: ${sessionId}`);
    }

    // Decrypt mappings payload
    const decryptedJson = await this.encryptionProvider.decrypt(session.encryptedMappings);
    let plaintextMappings: Record<string, string> = JSON.parse(decryptedJson);

    let restoredResponse = aiResponse;
    let restoredCount = 0;
    const restoredEntities: { placeholder: string; originalText: string }[] = [];

    try {
      // Build entries with clean bare token names for matching
      const entries: { placeholder: string; bareToken: string; originalText: string }[] = [];

      for (const [key, originalText] of Object.entries(plaintextMappings)) {
        if (!originalText) continue;
        const bareToken = key.replace(/^\[+|\]+$/g, '').trim();
        if (!bareToken) continue;
        entries.push({
          placeholder: key.startsWith('[') ? key : `[[${key}]]`,
          bareToken,
          originalText,
        });
      }

      // Sort by bareToken length descending to prevent substring collisions
      entries.sort((a, b) => b.bareToken.length - a.bareToken.length);

      for (const entry of entries) {
        const { placeholder, bareToken, originalText } = entry;
        const escapedBare = bareToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Matches 1 or more opening brackets, optional spaces, bare token (case-insensitive), optional spaces, 1 or more closing brackets
        const regex = new RegExp(`\\[+\\s*${escapedBare}\\s*\\]+`, 'gi');

        const matches = restoredResponse.match(regex);
        if (matches && matches.length > 0) {
          restoredCount += matches.length;
          restoredResponse = restoredResponse.replace(regex, originalText);
          restoredEntities.push({ placeholder, originalText });
        }
      }
    } finally {
      // Strict Memory Zeroization Policy: Overwrite intermediate decrypted object in memory
      for (const key of Object.keys(plaintextMappings)) {
        (plaintextMappings as any)[key] = null;
        delete (plaintextMappings as any)[key];
      }
      plaintextMappings = {} as Record<string, string>;
    }

    const processingTimeMs = Math.max(0, Date.now() - startTimeMs);

    return {
      sessionId,
      restoredResponse,
      restoredCount,
      restoredEntities,
      processingTimeMs,
    };
  }
}
