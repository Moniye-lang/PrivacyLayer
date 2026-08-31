import { SecretDetector, normalizeWrappedSecretLines } from '../lib/engine/detectors/secretDetector';

describe('Line-Wrapped Secret Normalization & SecretDetector Offset Mapping', () => {
  test('normalizeWrappedSecretLines joins wrapped assignment lines without affecting prose', () => {
    const wrappedInput = `AWS_SECRET_ACCESS_KEY=bPxRfiCYEXAMPLEK
EY1234567890
This is regular prose line 1
This is regular prose line 2`;

    const { normalizedText, mapToOriginalOffset } = normalizeWrappedSecretLines(wrappedInput);

    expect(normalizedText).toContain('AWS_SECRET_ACCESS_KEY=bPxRfiCYEXAMPLEKEY1234567890');
    expect(normalizedText).toContain('This is regular prose line 1\nThis is regular prose line 2');

    const joinedIndex = normalizedText.indexOf('bPxRfiCYEXAMPLEKEY1234567890');
    const originalIndex = mapToOriginalOffset(joinedIndex);

    expect(wrappedInput.substring(originalIndex, originalIndex + 21)).toContain('bPxRfiCYEXAMPLEK');
  });

  test('SecretDetector detects line-wrapped secret keys and maps offsets back accurately', async () => {
    const detector = new SecretDetector();
    const input = `AWS_SECRET_ACCESS_KEY=bPxRfiCYEXAMPLEK
EY123456789012345678901234567890`;

    const candidates = await detector.detect(input);
    expect(candidates.length).toBeGreaterThan(0);

    const match = candidates.find((c) => c.entityType === 'SOURCE_CODE_SECRET' || c.entityType === 'API_KEY');
    expect(match).toBeDefined();
    expect(match?.start).toBeLessThan(match?.end!);
    expect(input.substring(match?.start!, match?.end!)).toContain('bPxRfiCYEXAMPLEK');
  });

  test('SecretDetector detects line-wrapped AWS secret keys when line 2 has trailing prose', async () => {
    const input = `Morning — before the standup, can you rotate our AWS creds? The current
values are AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE and
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
bPxRfiCYEXAMPLEKEY, both currently live in the staging env file.`;

    const detector = new SecretDetector();
    const candidates = await detector.detect(input);
    const awsSecretMatch = candidates.find((c) => c.entityType === 'SOURCE_CODE_SECRET');

    expect(awsSecretMatch).toBeDefined();
    expect(awsSecretMatch?.confidence).toBeGreaterThanOrEqual(0.99);

    const matchedInInput = input.substring(awsSecretMatch?.start!, awsSecretMatch?.end!);
    expect(matchedInInput).toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    expect(matchedInInput).toContain('bPxRfiCYEXAMPLEKEY');
  });
});
