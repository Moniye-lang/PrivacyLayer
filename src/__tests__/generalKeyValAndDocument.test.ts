import { runMultiLayerDetectionPipeline } from '../lib/engine/multiLayerPipeline';
import { executeMaskingEngine } from '../lib/engine/policyEngine';

describe('General Key-Value Colon & Field-Naming Masking Engine', () => {
  const dvlaDoc = `DRIVER AND VEHICLE LICENSING AGENCY

Full Name: Alex Morgan
Date of Birth: 12/04/1988
Driving Licence Number: HARTL911227OJ9AB
Issue Date: 15/05/2018
Expiry Date: 14/05/2028
Address: 12 High Street
Manchester, M1 4WX, United Kingdom
Phone Number: +44 7700 900123
Email: alex.morgan@example.com
National Insurance No: QQ 12 34 56 C

EMERGENCY CONTACT
Name: Sarah Morgan
Relationship: Sister
Phone Number: +44 7700 900456

VEHICLE ENDORSEMENT HISTORY
Endorsement Code: SP30
Points: 3
Offence Date: 10/08/2022
Court: Manchester Magistrates Court

SYSTEM METADATA (internal use only)
Application: DL-Renewal
API Session Token: sk-session-9918291829182
Processed By: Officer / David Okafor
Processing Region: North West England`;

  test('General Key-Value: Successfully detects and masks all fields from UK DVLA Document', async () => {
    const result = await executeMaskingEngine({
      prompt: dvlaDoc,
    });

    const masked = result.protectedPrompt;

    // Verify raw PII values are NOT present in output
    expect(masked).not.toContain('Alex Morgan');
    expect(masked).not.toContain('HARTL911227OJ9AB');
    expect(masked).not.toContain('QQ 12 34 56 C');
    expect(masked).not.toContain('Sarah Morgan');
    expect(masked).not.toContain('Sister');
    expect(masked).not.toContain('Manchester Magistrates Court');
    expect(masked).not.toContain('sk-session-9918291829182');
    expect(masked).not.toContain('David Okafor');
    expect(masked).not.toContain('North West England');
    expect(masked).not.toContain('M1 4WX');

    // Verify placeholders are generated from what is before the colon
    expect(masked).toMatch(/\[\[(?:DRIVING_LICENCE_NUMBER|LICENCE|ID)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:NATIONAL_INSURANCE_NO|NIN|ID)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:RELATIONSHIP|RELATION)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:COURT|LEGAL)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:POINTS|LEGAL)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:PROCESSING_REGION|REGION|LOCATION)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:ADDRESS|LOCATION)_\d{3}\]\]/);
  });

  test('General Key-Value: Dynamically detects arbitrary new form fields and names them by label', async () => {
    const arbitraryForm = `FORM SUBMISSION
Blood Group: O Positive
Marital Status: Married
Voter Card ID: VOT-99281
Branch Office: Bristol Central
Case Reference: CR-88392
Next of Kin: Robert Evans`;

    const result = await executeMaskingEngine({
      prompt: arbitraryForm,
    });

    const masked = result.protectedPrompt;

    // None of the raw values should remain
    expect(masked).not.toContain('O Positive');
    expect(masked).not.toContain('Married');
    expect(masked).not.toContain('VOT-99281');
    expect(masked).not.toContain('Bristol Central');
    expect(masked).not.toContain('CR-88392');
    expect(masked).not.toContain('Robert Evans');

    // Placeholders should reflect the labels before the colons
    expect(masked).toMatch(/\[\[(?:BLOOD_GROUP|MED|MEDICAL)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:MARITAL_STATUS|CUSTOM_TERM|TERM|CUSTOM)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:VOTER_CARD_ID|ID|NIN)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:BRANCH_OFFICE|LOCATION|LOC)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:CASE_REFERENCE|CUSTOM_TERM|CUST_ID|CUSTOMER_ID|REF)_\d{3}\]\]/);
    expect(masked).toMatch(/\[\[(?:NEXT_OF_KIN|PERSON_NAME|PERSON|NAME)_\d{3}\]\]/);
  });

  test('Safety Guardrails: Does not mask non-sensitive syntactic colons or prose', async () => {
    const normalProse = `Note: This is important guidance.
Warning: Do not share your passwords.
Example: Please follow the standard format.
Visit https://example.com for more info.
The time is 10:30 AM right now.`;

    const result = await executeMaskingEngine({
      prompt: normalProse,
    });

    const masked = result.protectedPrompt;

    // Explanatory markers and prose should NOT be masked
    expect(masked).toContain('Note: This is important guidance.');
    expect(masked).toContain('Warning:');
    expect(masked).toContain('Example: Please follow the standard format.');
  });
});
