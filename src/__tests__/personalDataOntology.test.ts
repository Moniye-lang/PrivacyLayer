import { runMultiLayerDetectionPipeline } from '../lib/engine/multiLayerPipeline';
import { shieldPrompt } from '../lib/engine/policyEngine';

describe('Comprehensive Personal Data Ontology & Masking Engine', () => {
  it('detects and masks Identification Numbers', async () => {
    const text = `
      Social Security Number: 987-65-4321
      Employee ID: EMP-98214
      Passport Number: A12345678
      National Identification Number: NIN-88492019482
    `;
    const entities = await runMultiLayerDetectionPipeline(text);
    const masked = (await shieldPrompt({ prompt: text })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('987-65-4321'))).toBe(true);
    expect(entities.some((e) => e.text.includes('EMP-98214'))).toBe(true);
    expect(entities.some((e) => e.text.includes('A12345678'))).toBe(true);
    expect(entities.some((e) => e.text.includes('88492019482') || e.text.includes('NIN-88492019482'))).toBe(true);

    expect(masked).not.toContain('987-65-4321');
    expect(masked).not.toContain('EMP-98214');
    expect(masked).not.toContain('A12345678');
    expect(masked).not.toContain('88492019482');
  });

  it('detects and masks Financial Information & Salaries', async () => {
    const text = `
      Bank Account Number: 0123984756
      Credit Card Information: 4111 2222 3333 4444
      Investment Portfolio: Vanguard S&P 500 Index Fund, 450 Units Apple Inc
      Loan Records: $450,000 30-Year Fixed Mortgage at 6.2%
      Payment History: Invoice #99482 Paid $1,250.00 on 2026-04-12
      Salary Information: $185,000 Base Salary with $25,000 Annual Bonus
    `;
    const entities = await runMultiLayerDetectionPipeline(text);
    const masked = (await shieldPrompt({ prompt: text })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('0123984756'))).toBe(true);
    expect(entities.some((e) => e.text.replace(/\s/g, '').includes('4111222233334444'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Vanguard'))).toBe(true);
    expect(entities.some((e) => e.text.includes('450,000'))).toBe(true);
    expect(entities.some((e) => e.text.includes('185,000'))).toBe(true);

    expect(masked).not.toContain('0123984756');
    expect(masked).not.toContain('4111 2222 3333 4444');
    expect(masked).not.toContain('Vanguard');
    expect(masked).not.toContain('185,000 Base Salary');
  });

  it('detects and masks Biometric & Health Information', async () => {
    const text = `
      Fingerprint: Biometric Minutiae Template FP-8849201
      Retina Scan: Iris Cryptographic Hash RS-90184
      DNA Profile: STR Loci Profile D8S1179-13-15
      Medical History: Type 2 Diabetes, Severe Childhood Asthma
      Prescription Information: Metformin 500mg daily, Albuterol Inhaler
      Blood Type: O+
      Immunisation Records: Moderna COVID-19 Vaccine Lot #48291A
      Allergy Information: Severe Anaphylactic Penicillin and Peanut Allergy
    `;
    const entities = await runMultiLayerDetectionPipeline(text);
    const masked = (await shieldPrompt({ prompt: text })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('FP-8849201'))).toBe(true);
    expect(entities.some((e) => e.text.includes('RS-90184'))).toBe(true);
    expect(entities.some((e) => e.text.includes('D8S1179-13-15'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Type 2 Diabetes'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Metformin'))).toBe(true);
    expect(entities.some((e) => e.text.includes('O+'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Moderna'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Penicillin'))).toBe(true);

    expect(masked).not.toContain('FP-8849201');
    expect(masked).not.toContain('Type 2 Diabetes');
    expect(masked).not.toContain('Metformin');
    expect(masked).not.toContain('O+');
    expect(masked).not.toContain('Penicillin');
  });

  it('detects and masks Technological Data (MAC Address, IMEI, WiFi networks)', async () => {
    const text = `
      MAC Address: 00:1A:2B:3C:4D:5E
      Device IMEI Number: 86-294012-492014-9
      WiFi Networks Joined: Starlight_Guest_5G, OfficeHQ_Secure
      Installed Apps: Signal Messenger, ProtonMail, Binance
    `;
    const entities = await runMultiLayerDetectionPipeline(text);
    const masked = (await shieldPrompt({ prompt: text })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('00:1A:2B:3C:4D:5E'))).toBe(true);
    expect(entities.some((e) => e.text.includes('86-294012-492014-9'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Starlight_Guest_5G'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Signal Messenger'))).toBe(true);

    expect(masked).not.toContain('00:1A:2B:3C:4D:5E');
    expect(masked).not.toContain('86-294012-492014-9');
    expect(masked).not.toContain('Starlight_Guest_5G');
  });

  it('detects and masks Geographical Data (GPS coordinates, travel itineraries)', async () => {
    const text = `
      GPS Coordinates: 37.7749, -122.4194
      Travel Itineraries: Flight UA942 from SFO to LHR on 2026-08-14
      Location History: Frequent check-in at 450 Sutter St, San Francisco, CA
      Check-ins on Social Media: Blue Bottle Coffee Downtown
    `;
    const entities = await runMultiLayerDetectionPipeline(text);
    const masked = (await shieldPrompt({ prompt: text })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('37.7749, -122.4194') || e.text.includes('37.7749'))).toBe(true);
    expect(entities.some((e) => e.text.includes('UA942') || e.text.includes('Flight UA942'))).toBe(true);
    expect(entities.some((e) => e.text.includes('450 Sutter St'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Blue Bottle Coffee'))).toBe(true);

    expect(masked).not.toContain('37.7749, -122.4194');
    expect(masked).not.toContain('450 Sutter St');
  });

  it('detects and masks Legal Records and Vehicle VINs', async () => {
    const text = `
      Vehicle Registrations: VIN 1HGCR2F83HA123456
      Criminal Record: Case #CR-2019-9481 State of California vs Defendant
      Civil Court Records: Docket #CV-2022-0041 Breach of Contract
      Driving Offences: Citation #SP-883921 Speeding 85 in 65
    `;
    const entities = await runMultiLayerDetectionPipeline(text);
    const masked = (await shieldPrompt({ prompt: text })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('1HGCR2F83HA123456'))).toBe(true);
    expect(entities.some((e) => e.text.includes('CR-2019-9481') || e.text.includes('Criminal Record'))).toBe(true);
    expect(entities.some((e) => e.text.includes('CV-2022-0041') || e.text.includes('Civil Court'))).toBe(true);
    expect(entities.some((e) => e.text.includes('SP-883921') || e.text.includes('Driving Offences'))).toBe(true);

    expect(masked).not.toContain('1HGCR2F83HA123456');
    expect(masked).not.toContain('CR-2019-9481');
  });

  it('detects and masks Political Affiliations, Religious Beliefs & Personal Beliefs', async () => {
    const text = `
      Party Membership: Democratic National Committee Member #88491
      Religious Contributions: Annual Tithe of $5,000 to Grace Fellowship Church
      Church or Religious Group Membership: St. Thomas Anglican Parish
      Dietary Choices (e.g., Veganism): Strict Ethical Veganism since 2018
      Political Beliefs: Democratic Socialist worldview
    `;
    const entities = await runMultiLayerDetectionPipeline(text);
    const masked = (await shieldPrompt({ prompt: text })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('Democratic National Committee') || e.text.includes('Party Membership'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Grace Fellowship Church') || e.text.includes('Annual Tithe'))).toBe(true);
    expect(entities.some((e) => e.text.includes('St. Thomas Anglican Parish'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Strict Ethical Veganism') || e.text.includes('Ethical Veganism'))).toBe(true);

    expect(masked).not.toContain('Democratic National Committee Member #88491');
    expect(masked).not.toContain('Grace Fellowship Church');
  });

  it('detects and masks Family Information, Emergency Contacts & Marital Status', async () => {
    const text = `
      Marital Status: Married to Eleanor Sterling
      Names and Ages of Children: Maya Sterling age 8, Lucas Sterling age 5
      Next of Kin: Eleanor Sterling (Relationship: Spouse, Phone: +1-555-901-2849)
      Medical Emergency Contacts: Dr. Robert Evans (+1-555-883-1029)
    `;
    const entities = await runMultiLayerDetectionPipeline(text);
    const masked = (await shieldPrompt({ prompt: text })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('Eleanor Sterling'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Maya Sterling') || e.text.includes('Lucas Sterling'))).toBe(true);
    expect(entities.some((e) => e.text.includes('555-901-2849') || e.text.includes('5559012849'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Robert Evans'))).toBe(true);

    expect(masked).not.toContain('Eleanor Sterling');
    expect(masked).not.toContain('Maya Sterling');
    expect(masked).not.toContain('555-901-2849');
  });

  it('detects and masks Security Information, Passwords and 2FA secrets', async () => {
    const text = `
      Passwords: SuperSecretP@ssword2026!
      Security Questions and Answers: First pet name: Barnaby; Mother maiden name: Henderson
      Two-Factor Authentication Methods: Backup Recovery Code: 8941-0928-1938
      Biometric Security Data: FaceID Encryption Seed 99fa881bce02
    `;
    const entities = await runMultiLayerDetectionPipeline(text);
    const masked = (await shieldPrompt({ prompt: text })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('SuperSecretP@ssword2026'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Barnaby') || e.text.includes('First pet name'))).toBe(true);
    expect(entities.some((e) => e.text.includes('8941-0928-1938') || e.text.includes('Backup Recovery Code'))).toBe(true);
    expect(entities.some((e) => e.text.includes('99fa881bce02'))).toBe(true);

    expect(masked).not.toContain('SuperSecretP@ssword2026');
    expect(masked).not.toContain('99fa881bce02');
  });

  it('detects and masks personal data rows inside Markdown Tables', async () => {
    const markdownTable = `
| Employee ID | Full Name | Salary | Blood Type | Next of Kin |
|---|---|---|---|---|
| EMP-7718 | Jonathan Sterling | $190,000 | AB+ | Jennifer Sterling |
| EMP-9924 | Beatrice Oladipo | $165,000 | O- | Samuel Oladipo |
    `;
    const entities = await runMultiLayerDetectionPipeline(markdownTable);
    const masked = (await shieldPrompt({ prompt: markdownTable })).protectedPrompt;

    expect(entities.some((e) => e.text.includes('EMP-7718'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Jonathan Sterling'))).toBe(true);
    expect(entities.some((e) => e.text.includes('190,000'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Jennifer Sterling'))).toBe(true);
    expect(entities.some((e) => e.text.includes('Beatrice Oladipo'))).toBe(true);

    expect(masked).not.toContain('Jonathan Sterling');
    expect(masked).not.toContain('EMP-7718');
    expect(masked).not.toContain('Jennifer Sterling');
    expect(masked).not.toContain('Beatrice Oladipo');
  });
});
