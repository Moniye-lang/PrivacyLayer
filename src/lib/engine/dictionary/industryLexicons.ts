import { EntityType } from '../../../types';

export type DomainPackId = 'HEALTHCARE_PHI' | 'FINANCE_MNPI' | 'LEGAL_PRIVILEGE' | 'CYBER_DEVOPS' | 'GOVT_DEFENSE';

export interface DomainPackInfo {
  id: DomainPackId;
  name: string;
  category: string;
  description: string;
  terms: Record<string, EntityType>;
  patterns: { pattern: string; entityType: EntityType; description: string }[];
}

export const INDUSTRY_DOMAIN_PACKS: Record<DomainPackId, DomainPackInfo> = {
  HEALTHCARE_PHI: {
    id: 'HEALTHCARE_PHI',
    name: 'Healthcare & PHI (HIPAA Compliance)',
    category: 'Healthcare',
    description: 'Medical terms, ICD-10 codes, EHR references, prescription specs, and clinical trial identifiers.',
    terms: {
      'Protected Health Information': 'MEDICAL_RECORD',
      'Electronic Health Record': 'MEDICAL_RECORD',
      'ICD-10-CM': 'MEDICAL_RECORD',
      'HIPAA Identifier': 'MEDICAL_RECORD',
      'Medical Record Number': 'MEDICAL_RECORD',
      'MRN Patient': 'MEDICAL_RECORD',
      'Clinical Trial Subject': 'MEDICAL_RECORD',
      'Prescription Rx Number': 'MEDICAL_RECORD',
      'Patient History Record': 'MEDICAL_RECORD',
    },
    patterns: [
      { pattern: '\\bMRN[-\\s]?\\d{6,10}\\b', entityType: 'MEDICAL_RECORD', description: 'Medical Record Number (MRN)' },
      { pattern: '\\bICD-10-[A-Z0-9]{3,7}\\b', entityType: 'MEDICAL_RECORD', description: 'ICD-10 Diagnostic Code' },
      { pattern: '\\bRx[-\\s]?#?\\d{7,10}\\b', entityType: 'MEDICAL_RECORD', description: 'Prescription Identifier' },
    ],
  },

  FINANCE_MNPI: {
    id: 'FINANCE_MNPI',
    name: 'Finance & Wall St (SEC / MNPI)',
    category: 'Financial',
    description: 'Material Non-Public Information, stock tickers, offshore ledger codes, SWIFT/IBAN tags, wire transfer specs.',
    terms: {
      'Material Non-Public Information': 'FINANCIAL_METRIC',
      'MNPI Disclosure': 'FINANCIAL_METRIC',
      'Offshore Ledger Account': 'FINANCIAL_METRIC',
      'Wire Transfer Settlement': 'FINANCIAL_METRIC',
      'Insider Trading Window': 'FINANCIAL_METRIC',
      'Merger & Acquisition Codename': 'PROJECT_CODENAME',
      'EBITDA Guidance': 'FINANCIAL_METRIC',
      'Q4 Revenue Forecast': 'FINANCIAL_METRIC',
    },
    patterns: [
      { pattern: '\\b[A-Z]{2}\\d{2}[A-Z0-9]{11,30}\\b', entityType: 'BANK_ACCOUNT', description: 'International Bank Account Number (IBAN)' },
      { pattern: '\\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\\b', entityType: 'FINANCIAL_METRIC', description: 'SWIFT / BIC Code' },
      { pattern: '\\bCUSIP[-\\s]?[A-Z0-9]{9}\\b', entityType: 'FINANCIAL_METRIC', description: 'CUSIP Security Identifier' },
    ],
  },

  LEGAL_PRIVILEGE: {
    id: 'LEGAL_PRIVILEGE',
    name: 'Legal & Corporate Privilege',
    category: 'Legal',
    description: 'Attorney-Client Privilege, Work Product Doctrine, Non-Disclosure Agreements, Trade Secrets, Court Seals.',
    terms: {
      'Attorney-Client Privileged': 'LEGAL_REFERENCE',
      'Work Product Doctrine': 'LEGAL_REFERENCE',
      'Confidential Disclosure Agreement': 'LEGAL_REFERENCE',
      'Trade Secret Classification': 'COMPANY_SECRET',
      'Subject to NDA': 'LEGAL_REFERENCE',
      'Court Sealed File': 'LEGAL_REFERENCE',
      'Under Protective Order': 'LEGAL_REFERENCE',
    },
    patterns: [
      { pattern: 'CONFIDENTIAL\\s+ATTORNEY-CLIENT\\s+PRIVILEGED', entityType: 'LEGAL_REFERENCE', description: 'Attorney-Client Header' },
      { pattern: 'TRADE\\s+SECRET\\s+-\\s+DO\\s+NOT\\s+DISCLOSE', entityType: 'COMPANY_SECRET', description: 'Trade Secret Stamp' },
    ],
  },

  CYBER_DEVOPS: {
    id: 'CYBER_DEVOPS',
    name: 'Cybersecurity & Cloud DevOps',
    category: 'Engineering',
    description: 'Internal API paths, staging databases, cloud resource tags, Kubernetes secrets, private domain suffixes.',
    terms: {
      'Staging DB Cluster': 'COMPANY_SECRET',
      'K8s Secret Manifest': 'API_KEY',
      'Internal Gateway Route': 'COMPANY_SECRET',
      'Production Root Credential': 'PASSWORD',
      'AWS IAM Master Role': 'API_KEY',
    },
    patterns: [
      { pattern: '\\b[a-zA-Z0-9-]+\\.internal\\b', entityType: 'URL', description: 'Internal Domain Suffix' },
      { pattern: '\\b[a-zA-Z0-9-]+\\.local\\b', entityType: 'URL', description: 'Local Subdomain' },
      { pattern: 'mongodb(\\+srv)?://[a-zA-Z0-9_-]+:[^@]+@[a-zA-Z0-9_.-]+', entityType: 'CONNECTION_STRING', description: 'MongoDB Connection URL' },
    ],
  },

  GOVT_DEFENSE: {
    id: 'GOVT_DEFENSE',
    name: 'Government & Defense Clearance',
    category: 'Government',
    description: 'Classification markings (TOP SECRET, NOFORN, CUI, SCI), ITAR export controls, defense codenames.',
    terms: {
      'TOP SECRET // NOFORN': 'COMPANY_SECRET',
      'Controlled Unclassified Information': 'COMPANY_SECRET',
      'Sensitive Compartmented Information': 'COMPANY_SECRET',
      'ITAR Restricted Technical Data': 'COMPANY_SECRET',
      'Special Access Program': 'COMPANY_SECRET',
    },
    patterns: [
      { pattern: '\\bTOP\\s+SECRET\\b', entityType: 'COMPANY_SECRET', description: 'Top Secret Classification' },
      { pattern: '\\bCUI//[A-Z0-9/-]+\\b', entityType: 'COMPANY_SECRET', description: 'CUI Marking' },
    ],
  },
};
