import { EntityType } from '../../../types';
import { DomainPackId, INDUSTRY_DOMAIN_PACKS } from './industryLexicons';
import { externalDictionaryConnector } from './externalConnector';

export class DictionaryStore {
  private userDictionary: Map<string, EntityType> = new Map();
  private teamDictionary: Map<string, EntityType> = new Map();
  private orgDictionary: Map<string, EntityType> = new Map();
  private customTerms: Set<string> = new Set();
  private alwaysMaskRules: Set<string> = new Set();
  private enabledDomainPacks: Set<DomainPackId> = new Set([
    'HEALTHCARE_PHI',
    'FINANCE_MNPI',
    'LEGAL_PRIVILEGE',
    'CYBER_DEVOPS',
    'GOVT_DEFENSE',
  ]);

  public addCustomTerm(term: string, entityType: EntityType = 'CUSTOM_TERM'): void {
    if (!term) return;
    this.customTerms.add(term);
    this.userDictionary.set(term, entityType);
  }

  public removeCustomTerm(term: string): void {
    this.customTerms.delete(term);
    this.userDictionary.delete(term);
  }

  public getCustomTerms(): string[] {
    return Array.from(this.customTerms);
  }

  public setUserDictionary(dictionary: Record<string, EntityType>): void {
    this.userDictionary = new Map(Object.entries(dictionary));
  }

  public setTeamDictionary(dictionary: Record<string, EntityType>): void {
    this.teamDictionary = new Map(Object.entries(dictionary));
  }

  public setOrgDictionary(dictionary: Record<string, EntityType>): void {
    this.orgDictionary = new Map(Object.entries(dictionary));
  }

  public getUserDictionary(): Record<string, EntityType> {
    return Object.fromEntries(this.userDictionary);
  }

  public getTeamDictionary(): Record<string, EntityType> {
    return Object.fromEntries(this.teamDictionary);
  }

  public getOrgDictionary(): Record<string, EntityType> {
    return Object.fromEntries(this.orgDictionary);
  }

  public addAlwaysMaskRule(pattern: string): void {
    this.alwaysMaskRules.add(pattern);
  }

  public getAlwaysMaskRules(): string[] {
    return Array.from(this.alwaysMaskRules);
  }

  // --- Domain Pack Management ---
  public enableDomainPack(packId: DomainPackId): void {
    this.enabledDomainPacks.add(packId);
  }

  public disableDomainPack(packId: DomainPackId): void {
    this.enabledDomainPacks.delete(packId);
  }

  public isDomainPackEnabled(packId: DomainPackId): boolean {
    return this.enabledDomainPacks.has(packId);
  }

  public getEnabledDomainPacks(): DomainPackId[] {
    return Array.from(this.enabledDomainPacks);
  }

  public getActiveDomainTerms(): Record<string, EntityType> {
    const combined: Record<string, EntityType> = {};

    for (const packId of this.enabledDomainPacks) {
      const pack = INDUSTRY_DOMAIN_PACKS[packId];
      if (pack && pack.terms) {
        Object.assign(combined, pack.terms);
      }
    }

    // Merge external API terms
    const externalTerms = externalDictionaryConnector.getAllExternalTerms();
    Object.assign(combined, externalTerms);

    return combined;
  }

  public clearAll(): void {
    this.userDictionary.clear();
    this.teamDictionary.clear();
    this.orgDictionary.clear();
    this.customTerms.clear();
    this.alwaysMaskRules.clear();
    this.enabledDomainPacks = new Set([
      'HEALTHCARE_PHI',
      'FINANCE_MNPI',
      'LEGAL_PRIVILEGE',
      'CYBER_DEVOPS',
      'GOVT_DEFENSE',
    ]);
  }
}

export const dictionaryStore = new DictionaryStore();
