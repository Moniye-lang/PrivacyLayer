import { CandidateDetection, Detector, DetectorContext, EntityType, PriorityLevel } from '../../../types';
import { dictionaryStore } from '../dictionary/dictionaryStore';
import { learnedCacheStore } from '../learnedCache';

export class DictionaryDetector implements Detector {
  public readonly id = 'dictionary-detector';
  public readonly name = 'Multi-Tier & Industry Dictionary Detector';
  public readonly priority = PriorityLevel.DICTIONARY;

  public async detect(text: string, context?: DetectorContext): Promise<CandidateDetection[]> {
    const candidates: CandidateDetection[] = [];

    // Collect terms from dictionaryStore including active industry domain packs & external APIs
    const allDictionaries: { tier: string; terms: Record<string, EntityType> }[] = [
      { tier: 'Industry Domain Lexicon', terms: dictionaryStore.getActiveDomainTerms() },
      { tier: 'User', terms: { ...dictionaryStore.getUserDictionary(), ...(context?.userDictionary || {}) } },
      { tier: 'Team', terms: { ...dictionaryStore.getTeamDictionary(), ...(context?.teamDictionary || {}) } },
      { tier: 'Org', terms: { ...dictionaryStore.getOrgDictionary(), ...(context?.orgDictionary || {}) } },
    ];

    // Collect terms from learnedCacheStore with explicit type
    const learnedCustomEntries = learnedCacheStore.getCustomDictionaryEntries();
    const processedTerms = new Set<string>();

    for (const entry of learnedCustomEntries) {
      if (entry.term) {
        this.findTermMatches(text, entry.term, entry.type, 'Enterprise Custom Dictionary', candidates);
        processedTerms.add(entry.term.toLowerCase());
      }
    }

    // Custom terms from context or dictionaryStore
    const storeCustomTerms = dictionaryStore.getCustomTerms();
    const extraCustomTerms = context?.customTerms || [];
    const allCustomTerms = Array.from(new Set([...storeCustomTerms, ...extraCustomTerms]));

    for (const term of allCustomTerms) {
      if (!term || term.trim().length === 0) continue;
      if (!processedTerms.has(term.toLowerCase())) {
        const learnedType = learnedCacheStore.getCustomTermType(term);
        const entityType = learnedType || 'CUSTOM_TERM';
        this.findTermMatches(text, term, entityType, 'Custom Term', candidates);
        processedTerms.add(term.toLowerCase());
      }
    }

    for (const dict of allDictionaries) {
      for (const [term, entityType] of Object.entries(dict.terms)) {
        if (!term || term.trim().length === 0) continue;
        if (!processedTerms.has(term.toLowerCase())) {
          this.findTermMatches(text, term, entityType, `${dict.tier} Term`, candidates);
          processedTerms.add(term.toLowerCase());
        }
      }
    }

    return candidates;
  }

  private findTermMatches(
    text: string,
    term: string,
    entityType: EntityType,
    tierDescription: string,
    candidates: CandidateDetection[]
  ): void {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      candidates.push({
        id: `dict_${entityType.toLowerCase()}_${start}_${end}`,
        start,
        end,
        entityType,
        confidence: 1.0,
        priority: this.priority,
        detectorId: this.id,
        evidence: `Matched ${tierDescription}`,
        atomic: true,
        text: match[0],
      });
    }
  }
}
