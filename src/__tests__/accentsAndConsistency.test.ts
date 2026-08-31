import { shieldPrompt } from '../lib/engine/policyEngine';

describe('ACCENTS, DEDUPLICATION, & IP VS PHONE SUITE', () => {
  test('Issue 1: Accented Latin character names (e.g. François Dubois) detected and masked', async () => {
    const prompt = 'Primary contact: François Dubois. Backup contact: Hélène Martin or Benoît Girard.';
    const shielded = await shieldPrompt({ prompt });

    expect(shielded.protectedPrompt).toContain('Primary contact: [[PERSON_NAME_001]]');
    expect(shielded.protectedPrompt).toContain('Backup contact: [[PERSON_NAME_002]] or [[PERSON_NAME_003]].');
    expect(shielded.protectedPrompt).not.toContain('François Dubois');
    expect(shielded.protectedPrompt).not.toContain('Hélène Martin');
    expect(shielded.protectedPrompt).not.toContain('Benoît Girard');
  });

  test('Issue 2: Same secret value in different contexts resolves to same placeholder & canonical type', async () => {
    const mockStripeKey = 'sk' + '_live_7pQ2mNxRtY9wKzVbC4dEfGhJkLmNpQrS';
    const prompt = `Identified stale credential: ${mockStripeKey}. Later inline: the Stripe key ${mockStripeKey} is verified.`;
    const shielded = await shieldPrompt({ prompt });

    expect(shielded.protectedPrompt).toContain('Identified stale credential: [[API_KEY_001]]. Later inline: the [[ORGANIZATION_001]] key [[API_KEY_001]] is verified.');
    expect(shielded.protectedPrompt).not.toContain(mockStripeKey);
    expect(shielded.protectedPrompt).not.toContain('PASSWORD');
  });

  test('Issue 3: IP address 198.51.100.23 is not confused with a phone number', async () => {
    const prompt = 'Host IP: 198.51.100.23. Contact phone: +1 555 123 4567 or +44 20 7123 4567.';
    const shielded = await shieldPrompt({ prompt });

    expect(shielded.protectedPrompt).toContain('Host IP: [[IP_ADDRESS_001]].');
    expect(shielded.protectedPrompt).toContain('Contact phone: [[PHONE_NUMBER_001]] or [[PHONE_NUMBER_002]].');
    expect(shielded.protectedPrompt).not.toContain('198.51.100.23');
    expect(shielded.protectedPrompt).not.toContain('[[PHONE_NUMBER_003]]');
    expect(shielded.protectedPrompt).not.toContain('[[NAME_001]]');
  });

  test('Issue 4: Contextual disambiguation overrides generic dictionary NER (Project Sakura, Project Alexander, Project Berlin)', async () => {
    const prompt = 'Project Sakura is the new POS rollout. We also have Project Alexander and Project Berlin in development.';
    const shielded = await shieldPrompt({ prompt });

    expect(shielded.protectedPrompt).toContain('Project [[PROJECT_CODENAME_001]] is the new POS rollout.');
    expect(shielded.protectedPrompt).toContain('Project [[PROJECT_CODENAME_002]] and Project [[PROJECT_CODENAME_003]] in development.');
    expect(shielded.protectedPrompt).not.toContain('Project [[PERSON_NAME_');
    expect(shielded.protectedPrompt).not.toContain('Project [[LOCATION_');
  });
});
