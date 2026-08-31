import { EntityType } from '../../../types';

export interface ExternalConnectorConfig {
  id: string;
  name: string;
  url: string;
  headers?: Record<string, string>;
  syncIntervalMinutes?: number;
  lastSyncedAt?: string;
  status: 'ACTIVE' | 'ERROR' | 'IDLE';
  errorCount?: number;
  termsCount?: number;
}

export class ExternalDictionaryConnector {
  private connectors: Map<string, ExternalConnectorConfig> = new Map();
  private fetchedTermsCache: Map<string, Record<string, EntityType>> = new Map();

  public registerConnector(config: ExternalConnectorConfig): void {
    this.connectors.set(config.id, {
      ...config,
      status: config.status || 'IDLE',
      errorCount: 0,
      termsCount: 0,
    });
  }

  public getConnectors(): ExternalConnectorConfig[] {
    return Array.from(this.connectors.values());
  }

  public removeConnector(id: string): void {
    this.connectors.delete(id);
    this.fetchedTermsCache.delete(id);
  }

  public async syncConnector(id: string): Promise<{ success: boolean; termsAdded: number; error?: string }> {
    const config = this.connectors.get(id);
    if (!config) {
      return { success: false, termsAdded: 0, error: 'Connector not found' };
    }

    try {
      const response = await fetch(config.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(config.headers || {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const termsMap: Record<string, EntityType> = {};

      // Parse JSON payload (array of objects { term, type } or key-value dictionary { term: type })
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && typeof item === 'object' && item.term) {
            termsMap[item.term] = (item.type as EntityType) || 'CUSTOM_TERM';
          }
        }
      } else if (typeof data === 'object' && data !== null) {
        for (const [term, type] of Object.entries(data)) {
          termsMap[term] = (type as EntityType) || 'CUSTOM_TERM';
        }
      }

      const termsAdded = Object.keys(termsMap).length;
      this.fetchedTermsCache.set(id, termsMap);

      config.status = 'ACTIVE';
      config.lastSyncedAt = new Date().toISOString();
      config.termsCount = termsAdded;
      config.errorCount = 0;

      return { success: true, termsAdded };
    } catch (err: any) {
      config.status = 'ERROR';
      config.errorCount = (config.errorCount || 0) + 1;
      return { success: false, termsAdded: 0, error: err?.message || 'Failed to fetch external dictionary' };
    }
  }

  public getAllExternalTerms(): Record<string, EntityType> {
    const combined: Record<string, EntityType> = {};
    for (const termsMap of this.fetchedTermsCache.values()) {
      Object.assign(combined, termsMap);
    }
    return combined;
  }
}

export const externalDictionaryConnector = new ExternalDictionaryConnector();
