import { shieldPrompt } from '../lib/engine/policyEngine';
import { detectorManager } from '../lib/engine/multiLayerPipeline';

describe('RAIN TEST SUITE', () => {
  test('RAIN TEST - Full comprehensive multi-entity prompt masking & lossless reveal', async () => {
    const mockStripeKey = 'sk' + '_live_2xM9qLpABCDEF123456cDeFgHjKmNpQrSt';
    const mockGithubKey = 'gh' + 'p_z9Y8x7W6v5U4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f48lK7jI6h5G4f3E2d1';

    const prompt = `Owner: Bisi Adewale backup contact Tunde Adewale (different person, same surname). Email bisi.adewale@nyc.com, cc tunde.adewale@nyc.com.

Project POS is the new POS rollout, not to be confused with Project POS Phase 2 which is the loyalty app. Sakura launches Friday.

Careful: the word "secret" appears here as ordinary documentation, and so does "password" and "token" - none of these three should be masked.

New DB password: K0i!Fish&Pond#2026, please rotate before launch. Confirm - same password again: K0i!Fish&Pond#2026.

Stripe live key: ${mockStripeKey} Same key mentioned again inline: the key ${mockStripeKey} is correct.

Server IP: 192.168.1.1 Short line next: id: 5 Access token (long): ${mockGithubKey} Call Bisi Adewale on +1 555 123 4567 or Tunde Adewale on +1 555 987 6543.`;

    const shielded = await shieldPrompt({ prompt });

    // 1. Email integrity: whole emails are replaced cleanly
    expect(shielded.protectedPrompt).toContain('Email [[EMAIL_ADDRESS_001]], cc [[EMAIL_ADDRESS_002]].');
    expect(shielded.protectedPrompt).not.toContain('bisi.ad');
    expect(shielded.protectedPrompt).not.toContain('tunde.a');

    // 2. Both passwords masked and deduplicated to identical placeholder
    expect(shielded.protectedPrompt).toContain('New DB password: [[PASSWORD_001]], please rotate before launch. Confirm - same password again: [[PASSWORD_001]].');
    expect(shielded.protectedPrompt).not.toContain('K0i!Fish&Pond#2026');

    // 3. Both Stripe keys masked and deduplicated to identical placeholder
    expect(shielded.protectedPrompt).toContain('[[ORGANIZATION_001]] live key: [[API_KEY_001]] Same key mentioned again inline: the key [[API_KEY_001]] is correct.');
    expect(shielded.protectedPrompt).not.toContain(mockStripeKey.substring(0, 15));

    // 4. Long GitHub access token masked completely
    expect(shielded.protectedPrompt).toContain('Access token (long): [[API_KEY_002]]');
    expect(shielded.protectedPrompt).not.toContain(mockGithubKey.substring(0, 15));
    expect(shielded.protectedPrompt).not.toContain('48lK7jI6h5G4f3E2d1');

    // 5. Phone numbers masked as full units
    expect(shielded.protectedPrompt).toContain('on [[PHONE_NUMBER_001]] or [[PERSON_NAME_002]] on [[PHONE_NUMBER_002]].');
    expect(shielded.protectedPrompt).not.toContain('+1 555 123 4567');
    expect(shielded.protectedPrompt).not.toContain('+1 555 987 6543');

    // 6. Documentation words remain unmasked
    expect(shielded.protectedPrompt).toContain('the word "secret" appears here as ordinary documentation, and so does "password" and "token" - none of these three should be masked.');

    // 7. Sakura launch detected
    expect(shielded.protectedPrompt).toContain('[[PERSON_NAME_003]] launches Friday.');
  });
});
