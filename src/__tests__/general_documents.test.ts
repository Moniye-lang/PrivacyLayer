import { runMultiLayerDetectionPipeline } from '../lib/engine/multiLayerPipeline';

describe('Generalized Multi-Document Detection Tests', () => {
  test('US Driver License & Insurance Policy Document', async () => {
    const doc = `STATE OF CALIFORNIA
DEPARTMENT OF MOTOR VEHICLES
DRIVER LICENSE

Cardholder: Sarah Connor
License Number: D1234567
Date of Birth: 1985-11-20
Residential Address: 4545 Sunset Blvd, Los Angeles, CA
Phone: +1 310 555 0199
Insurance ID: POL-99887722
Primary Hospital: Cedars-Sinai Medical Center`;

    const entities = await runMultiLayerDetectionPipeline(doc);

    // Header state should NOT be masked
    expect(entities.some((e) => e.type === 'LOCATION' && e.text === 'CALIFORNIA')).toBe(false);

    // Cardholder
    const person = entities.find((e) => e.text.includes('Sarah Connor'));
    expect(person).toBeDefined();
    expect(person?.type).toBe('PERSON_NAME');

    // License Number
    const license = entities.find((e) => e.text.includes('D1234567'));
    expect(license).toBeDefined();
    expect(license?.type).toBe('SSN_NATIONAL_ID');

    // Phone
    const phone = entities.find((e) => e.text.includes('310 555 0199'));
    expect(phone).toBeDefined();
    expect(phone?.type).toBe('PHONE_NUMBER');

    // Insurance ID
    const ins = entities.find((e) => e.text.includes('POL-99887722'));
    expect(ins).toBeDefined();
    expect(ins?.type).toBe('SSN_NATIONAL_ID');

    // Hospital
    const hosp = entities.find((e) => e.text.includes('Cedars-Sinai Medical Center'));
    expect(hosp).toBeDefined();
    expect(hosp?.type).toBe('ORGANIZATION');
  });

  test('UK Utility Bill & Banking Transfer Document', async () => {
    const doc = `KINGDOM OF GREAT BRITAIN
COUNCIL TAX & UTILITY STATEMENT

Account Holder: Michael Davies
Beneficiary: British Gas Ltd
Sort Code: 20-45-78
Account Number: 88776655
Reference Number: REF-99001122
Contact Number: 020 7946 0912`;

    const entities = await runMultiLayerDetectionPipeline(doc);

    // Sovereign header not masked
    expect(entities.some((e) => e.type === 'LOCATION' && e.text === 'GREAT BRITAIN')).toBe(false);

    // Account Holder
    const person = entities.find((e) => e.text.includes('Michael Davies'));
    expect(person).toBeDefined();
    expect(person?.type).toBe('PERSON_NAME');

    // Beneficiary organization
    const org = entities.find((e) => e.text.includes('British Gas Ltd'));
    expect(org).toBeDefined();
    expect(org?.type).toBe('ORGANIZATION');

    // Account Number - must NOT be misclassified as phone number
    const acct = entities.find((e) => e.text === '88776655');
    expect(acct).toBeDefined();
    expect(acct?.type).toBe('BANK_ACCOUNT');

    // Contact Number - IS a phone number
    const phone = entities.find((e) => e.text.includes('020 7946 0912'));
    expect(phone).toBeDefined();
    expect(phone?.type).toBe('PHONE_NUMBER');
  });
});
