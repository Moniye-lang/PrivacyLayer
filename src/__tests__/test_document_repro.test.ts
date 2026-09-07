import { runMultiLayerDetectionPipeline } from '../lib/engine/multiLayerPipeline';

describe('Reproduce User Image Detections', () => {
  test('Exact User Document Text Detection', async () => {
    const sampleText = `FEDERAL REPUBLIC OF NIGERIA
NATIONAL IDENTITY MANAGEMENT COMMISSION

Full Name: Johnathan Doe
Date of Birth: 1990-05-15
Place of Birth: Ibadan, Oyo State
Gender: Male
National Identification Number: 12345678901
Phone Number: 08012345678
Email Address: user@example.com
Residential Address: 22 Bodija Estate,
Ibadan, Oyo State

NEXT OF KIN INFORMATION
Name: Jane Doe
Relationship: Mother
Phone Number: 08098765432

BANK VERIFICATION
Bank Name: First Continental Bank
Account Number: 1234567890
BVN: 22233344455

SYSTEM METADATA (internal use only)
Record ID: NIMC-REC-889231
API Access Token: key_dummy_test_token_987654321
Verified By: Officer John Smith
Verification Date: 2026-09-04`;

    const entities = await runMultiLayerDetectionPipeline(sampleText);
    
    // 1. Header country name NIGERIA must NOT be masked as LOCATION
    const locationEntities = entities.filter((e) => e.type === 'LOCATION');
    expect(locationEntities.some((e) => e.text.includes('NIGERIA'))).toBe(false);

    // 2. Commission title word "MANAGEMENT" must NOT be misclassified as SSN_NATIONAL_ID
    expect(entities.some((e) => e.text === 'MANAGEMENT')).toBe(false);

    // 3. "First Continental Bank" must be captured in full as an ORGANIZATION (not split into "Continental Bank" as PERSON_NAME)
    const orgEntities = entities.filter((e) => e.type === 'ORGANIZATION');
    expect(orgEntities.some((e) => e.text === 'First Continental Bank')).toBe(true);
    expect(entities.some((e) => e.type === 'PERSON_NAME' && e.text.includes('Continental Bank'))).toBe(false);

    // 4. National Identification Number (12345678901) must be classified as SSN_NATIONAL_ID (not PHONE_NUMBER)
    const ninEntity = entities.find((e) => e.text === '12345678901');
    expect(ninEntity).toBeDefined();
    expect(ninEntity?.type).toBe('SSN_NATIONAL_ID');

    // 5. Account Number (1234567890) and BVN (22233344455) must be classified as BANK_ACCOUNT
    const acctEntity = entities.find((e) => e.text === '1234567890');
    expect(acctEntity).toBeDefined();
    expect(acctEntity?.type).toBe('BANK_ACCOUNT');

    const bvnEntity = entities.find((e) => e.text === '22233344455');
    expect(bvnEntity).toBeDefined();
    expect(bvnEntity?.type).toBe('BANK_ACCOUNT');
  });
});
