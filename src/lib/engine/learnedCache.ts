import { DetectedEntity, EntityType } from '@/types';

class LearnedCacheStore {
  // Learned Names Cache (Auto-learned names e.g. Aaliya, Kwame, Tariq, Kofi)
  private learnedNames = new Map<string, number>(); // name -> detection count

  // Custom Dictionary (Always detected correctly e.g. TrackPricely, MOAA, RIA, ABSS, SentryMask)
  private customDictionary = new Map<string, EntityType>();

  constructor() {
    // Seed user custom dictionary defaults
    const defaultCustom: [string, EntityType][] = [
      ['TrackPricely', 'PROJECT_CODENAME'],
      ['MOAA', 'ORGANIZATION'],
      ['RIA', 'ORGANIZATION'],
      ['ABSS', 'ORGANIZATION'],
      ['SentryMask', 'REPOSITORY'],
      ['SentinelMask', 'REPOSITORY'],
    ];

    for (const [term, type] of defaultCustom) {
      this.customDictionary.set(term.toLowerCase(), type);
    }
  }

  // Record a detected person name and auto-learn it after 1 appearance
  public learnPersonName(name: string): void {
    if (!name || name.length < 2) return;
    const key = name.trim();
    const current = this.learnedNames.get(key) || 0;
    this.learnedNames.set(key, current + 1);
  }

  public isLearnedName(name: string): boolean {
    return this.learnedNames.has(name.trim());
  }

  // Add custom dictionary term
  public addCustomTerm(term: string, type: EntityType = 'PROJECT_CODENAME'): void {
    if (term && term.trim()) {
      this.customDictionary.set(term.trim().toLowerCase(), type);
    }
  }

  public getCustomTermType(term: string): EntityType | undefined {
    return this.customDictionary.get(term.trim().toLowerCase());
  }

  public getCustomDictionaryEntries(): { term: string; type: EntityType }[] {
    const entries: { term: string; type: EntityType }[] = [];
    this.customDictionary.forEach((type, term) => {
      entries.push({ term, type });
    });
    return entries;
  }

  // Run Dictionary & Learned Cache Detection
  public runDictionaryDetection(text: string): DetectedEntity[] {
    const detected: DetectedEntity[] = [];

    // 1. Scan Custom Dictionary
    this.customDictionary.forEach((type, lowerTerm) => {
      const regex = new RegExp(`\\b${lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const matchText = match[0];
        detected.push({
          id: `dict_${match.index}_${Math.random().toString(36).substring(2, 6)}`,
          type,
          category: 'CUSTOM',
          text: matchText,
          start: match.index,
          end: match.index + matchText.length,
          confidence: 0.99,
          reason: `Custom Dictionary: Recognized registered enterprise term (${matchText})`,
          placeholder: `[[${type}_001]]`,
          votes: [
            {
              stage: 'DICTIONARY',
              type,
              confidence: 0.99,
              reason: 'Recognized in enterprise custom dictionary',
            },
          ],
        });
      }
    });

    // 2. Scan Learned Names Cache
    this.learnedNames.forEach((count, nameKey) => {
      if (count >= 1) {
        const regex = new RegExp(`\\b${nameKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
          const matchText = match[0];
          const isOverlapping = detected.some(
            (e) => Math.max(e.start, match!.index) < Math.min(e.end, match!.index + matchText.length)
          );

          if (!isOverlapping) {
            detected.push({
              id: `learn_${match.index}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'PERSON_NAME',
              category: 'PII',
              text: matchText,
              start: match.index,
              end: match.index + matchText.length,
              confidence: 0.98,
              reason: `Learned Names Cache: Fast <1ms hit for previously seen name (${matchText})`,
              placeholder: '[[PERSON_001]]',
              votes: [
                {
                  stage: 'DICTIONARY',
                  type: 'PERSON_NAME',
                  confidence: 0.98,
                  reason: 'Learned Names Cache: Previously learned person name',
                },
              ],
            });
          }
        }
      }
    });

    return detected;
  }
}

// Global Singleton for Learned Cache
declare global {
  // eslint-disable-next-line no-var
  var __learnedCacheStore: LearnedCacheStore | undefined;
}

if (!globalThis.__learnedCacheStore) {
  globalThis.__learnedCacheStore = new LearnedCacheStore();
}

export const learnedCacheStore: LearnedCacheStore = globalThis.__learnedCacheStore;
