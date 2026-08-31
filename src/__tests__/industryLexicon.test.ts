import { dictionaryStore } from '../lib/engine/dictionary/dictionaryStore';
import { DictionaryDetector } from '../lib/engine/detectors/dictionaryDetector';
import { externalDictionaryConnector } from '../lib/engine/dictionary/externalConnector';
import { INDUSTRY_DOMAIN_PACKS } from '../lib/engine/dictionary/industryLexicons';

describe('Global Industry Lexicons & Multi-Dictionary API Engine', () => {
  beforeEach(() => {
    dictionaryStore.clearAll();
  });

  test('Domain Packs: Contains standard domain catalogs for Healthcare, Finance, Legal, Cyber, and Defense', () => {
    expect(INDUSTRY_DOMAIN_PACKS.HEALTHCARE_PHI).toBeDefined();
    expect(INDUSTRY_DOMAIN_PACKS.FINANCE_MNPI).toBeDefined();
    expect(INDUSTRY_DOMAIN_PACKS.LEGAL_PRIVILEGE).toBeDefined();
    expect(INDUSTRY_DOMAIN_PACKS.CYBER_DEVOPS).toBeDefined();
    expect(INDUSTRY_DOMAIN_PACKS.GOVT_DEFENSE).toBeDefined();
  });

  test('Dictionary Detector: Detects Healthcare PHI terms when HEALTHCARE_PHI pack is enabled', async () => {
    dictionaryStore.enableDomainPack('HEALTHCARE_PHI');
    const detector = new DictionaryDetector();
    const text = 'The patient Electronic Health Record shows a diagnosis of diabetes.';

    const results = await detector.detect(text);
    const phiMatch = results.find((r) => r.text === 'Electronic Health Record');

    expect(phiMatch).toBeDefined();
    expect(phiMatch?.entityType).toBe('MEDICAL_RECORD');
  });

  test('Domain Pack Toggles: Disabling HEALTHCARE_PHI pack stops Healthcare term matching', async () => {
    dictionaryStore.disableDomainPack('HEALTHCARE_PHI');
    const detector = new DictionaryDetector();
    const text = 'The patient Electronic Health Record shows a diagnosis of diabetes.';

    const results = await detector.detect(text);
    const phiMatch = results.find((r) => r.text === 'Electronic Health Record');

    expect(phiMatch).toBeUndefined();
  });

  test('Finance MNPI Detection: Detects Material Non-Public Information terms', async () => {
    dictionaryStore.enableDomainPack('FINANCE_MNPI');
    const detector = new DictionaryDetector();
    const text = 'Do not leak the Material Non-Public Information regarding Q4 Guidance.';

    const results = await detector.detect(text);
    const mnpiMatch = results.find((r) => r.text === 'Material Non-Public Information');

    expect(mnpiMatch).toBeDefined();
    expect(mnpiMatch?.entityType).toBe('FINANCIAL_METRIC');
  });

  test('External API Connector: Connects remote terms and includes them in detection engine', async () => {
    externalDictionaryConnector.registerConnector({
      id: 'mock_api',
      name: 'Mock Remote Glossary',
      url: 'https://mock.example.com/api',
      status: 'ACTIVE',
    });

    // Simulate fetched external terms
    (externalDictionaryConnector as any).fetchedTermsCache.set('mock_api', {
      'Project Chronos': 'PROJECT_CODENAME',
    });

    const detector = new DictionaryDetector();
    const text = 'The team is deploying Project Chronos to production.';

    const results = await detector.detect(text);
    const match = results.find((r) => r.text === 'Project Chronos');

    expect(match).toBeDefined();
    expect(match?.entityType).toBe('PROJECT_CODENAME');
  });
});
