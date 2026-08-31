import { EntityType, ICompatibilityMatrix } from '../../../types';

export class CompatibilityMatrix implements ICompatibilityMatrix {
  private compatiblePairs: Set<string> = new Set();

  constructor() {
    this.registerDefaultCompatibilities();
  }

  private makePairKey(typeA: EntityType, typeB: EntityType): string {
    return [typeA, typeB].sort().join('::');
  }

  public registerCompatibility(typeA: EntityType, typeB: EntityType): void {
    this.compatiblePairs.add(this.makePairKey(typeA, typeB));
  }

  public registerIncompatibility(typeA: EntityType, typeB: EntityType): void {
    this.compatiblePairs.delete(this.makePairKey(typeA, typeB));
  }

  public areCompatible(typeA: EntityType, typeB: EntityType): boolean {
    if (typeA === typeB) {
      return true;
    }
    const key = this.makePairKey(typeA, typeB);
    return this.compatiblePairs.has(key);
  }

  private registerDefaultCompatibilities(): void {
    // Compatible pairs where overlapping spans can be merged under higher priority type
    const defaultPairs: [EntityType, EntityType][] = [
      ['URL', 'CONNECTION_STRING'],
      ['CONNECTION_STRING', 'PASSWORD'],
      ['CONNECTION_STRING', 'API_KEY'],
      ['JWT_TOKEN', 'API_KEY'],
      ['JWT_TOKEN', 'SOURCE_CODE_SECRET'],
      ['API_KEY', 'SOURCE_CODE_SECRET'],
      ['CUSTOM_TERM', 'PROJECT_CODENAME'],
      ['CUSTOM_TERM', 'ORGANIZATION'],
    ];

    for (const [a, b] of defaultPairs) {
      this.registerCompatibility(a, b);
    }
  }
}

export const defaultCompatibilityMatrix = new CompatibilityMatrix();
