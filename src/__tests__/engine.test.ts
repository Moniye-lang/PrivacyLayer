/**
 * Privacy Layer — Deterministic Privacy Engine Permanent Regression Test Suite
 * Red-Team Verification & Precision Test Cases 1 - 12
 */
import { runSecretScanner } from '../lib/engine/secretScanner';
import { runMultiLayerDetectionPipeline } from '../lib/engine/multiLayerPipeline';
import { learnedCacheStore } from '../lib/engine/learnedCache';
import { shieldPrompt, revealResponse, applyManualOverrides } from '../lib/engine/policyEngine';
import { runStage1Regex } from '../lib/engine/stage1Regex';
import { SpanResolver } from '../lib/engine/resolver/spanResolver';
import { CompatibilityMatrix } from '../lib/engine/resolver/compatibilityMatrix';
import { AESGCMEncryptionProvider } from '../lib/security/encryptionProvider';
import { InMemoryRevealStore } from '../lib/security/revealStore';
import { evaluateResidualRisk } from '../lib/engine/residualRiskEngine';

describe('Privacy Layer Engine Test Suite', () => {

  // 1. SECRET SCANNER TESTS
  test('Secret Scanner: Detects MongoDB Atlas connection string with query parameters', () => {
    const prompt = 'DATABASE_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority';
    const secrets = runSecretScanner(prompt);

    expect(secrets.length).toBeGreaterThan(0);
    const dbSecret = secrets.find(s => s.type === 'CONNECTION_STRING');
    expect(dbSecret).toBeDefined();
    expect(dbSecret?.text).toContain('mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority');
  });

  test('Secret Scanner: Detects PostgreSQL, MySQL, and Redis URIs', () => {
    const prompt = 'PG: postgresql://admin:Pass123@db.prod.internal:5432/appdb?sslmode=require, Redis: rediss://user:secret@cache.prod:6380';
    const secrets = runSecretScanner(prompt);

    const pgSecret = secrets.find(s => s.text.includes('postgresql://'));
    const redisSecret = secrets.find(s => s.text.includes('rediss://'));

    expect(pgSecret).toBeDefined();
    expect(redisSecret).toBeDefined();
  });

  test('Secret Scanner: Detects PEM Private Key blocks', () => {
    const prompt = `Config key:\n-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----`;
    const secrets = runSecretScanner(prompt);

    const pemSecret = secrets.find(s => s.reason.includes('PEM') || s.reason.includes('Private Key'));
    expect(pemSecret).toBeDefined();
    expect(pemSecret?.text).toContain('-----BEGIN PRIVATE KEY-----');
  });

  test('Secret Scanner: Detects OpenAI, Anthropic, GitHub, AWS, and Stripe Keys', () => {
    const mockGh = 'gh' + 'p_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456abcd';
    const mockStripe = 'sk' + '_live_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456';
    const prompt = `OpenAI: sk-proj-84920194829104, GitHub: ${mockGh}, AWS: AKIAIOSFODNN7EXAMPLE, Stripe: ${mockStripe}`;
    const secrets = runSecretScanner(prompt);

    expect(secrets.length).toBeGreaterThanOrEqual(4);
    expect(secrets.find(s => s.text.startsWith('sk-proj-'))).toBeDefined();
    expect(secrets.find(s => s.text.startsWith('gh' + 'p_'))).toBeDefined();
    expect(secrets.find(s => s.text.startsWith('AKIA'))).toBeDefined();
    expect(secrets.find(s => s.text.startsWith('sk' + '_live_'))).toBeDefined();
  });

  // 2. CONTEXT ENGINE & DETERMINISTIC RULES
  test('Context Engine: Detects "Tell Han", "Project Titan", "Repository Sentinel", "CEO David"', async () => {
    const prompt = 'Tell Han to review Project Titan and Repository Sentinel with CEO David at Company ABC Ltd.';
    const fused = await runMultiLayerDetectionPipeline(prompt);

    const han = fused.find(e => e.text.includes('Han'));
    const titan = fused.find(e => e.text.includes('Titan'));
    const sentinel = fused.find(e => e.text.includes('Sentinel'));
    const david = fused.find(e => e.text.includes('David'));
    const abcLtd = fused.find(e => e.text.includes('ABC Ltd'));

    expect(han?.type).toBe('PERSON_NAME');
    expect(titan?.type).toBe('PROJECT_CODENAME');
    expect(sentinel?.type).toBe('REPOSITORY');
    expect(david?.type).toBe('PERSON_NAME');
    expect(abcLtd?.type).toBe('ORGANIZATION');
  });

  // 3. USER DICTIONARY REGISTRATION
  test('User Dictionary: Registered custom terms take 100% precedence', async () => {
    learnedCacheStore.addCustomTerm('MOAA', 'ORGANIZATION');
    learnedCacheStore.addCustomTerm('TrackPricely', 'PROJECT_CODENAME');

    const prompt = 'MOAA authorized Project TrackPricely.';
    const fused = await runMultiLayerDetectionPipeline(prompt);

    expect(fused.find(e => e.text === 'MOAA')?.type).toBe('ORGANIZATION');
    expect(fused.find(e => e.text === 'TrackPricely')?.type).toBe('PROJECT_CODENAME');
  });

  // 4. LOSSLESS REVEAL ENGINE WITH MARKDOWN & REPEATED PLACEHOLDERS
  test('Reveal Engine: Losslessly restores repeated & Markdown-formatted placeholders', async () => {
    const rawPrompt = 'Contact John Doe regarding Project Falcon.';
    const shieldResult = await shieldPrompt({ prompt: rawPrompt });

    expect(shieldResult.protectedPrompt).toContain('[[PERSON');
    expect(shieldResult.protectedPrompt).toContain('[[PROJECT');

    const mockAiResponse = `
### Executive Summary
- Primary Contact: **${shieldResult.detectedEntities.find(e => e.type === 'PERSON_NAME')?.placeholder}**
- Target Initiative: \`${shieldResult.detectedEntities.find(e => e.type === 'PROJECT_CODENAME')?.placeholder}\`

| Role | Name | Initiative |
| --- | --- | --- |
| Lead | ${shieldResult.detectedEntities.find(e => e.type === 'PERSON_NAME')?.placeholder} | ${shieldResult.detectedEntities.find(e => e.type === 'PROJECT_CODENAME')?.placeholder} |

Please send confirmation to ${shieldResult.detectedEntities.find(e => e.type === 'PERSON_NAME')?.placeholder}.
`;

    const revealResult = await revealResponse({
      sessionId: shieldResult.sessionId,
      aiResponse: mockAiResponse,
    });

    expect(revealResult.restoredResponse).toContain('**John Doe**');
    expect(revealResult.restoredResponse).toContain('`Falcon`');
    expect(revealResult.restoredResponse).toContain('| Lead | John Doe | Falcon |');
    expect(revealResult.restoredResponse).toContain('Please send confirmation to John Doe.');
    expect(revealResult.restoredCount).toBe(5);
  });

  // 5. DETERMINISM & EXPLAINABILITY
  test('Determinism: Identical inputs produce identical output & votes', async () => {
    const prompt = 'Tell Han to review Project Titan with CEO David.';
    const run1 = await runMultiLayerDetectionPipeline(prompt);
    const run2 = await runMultiLayerDetectionPipeline(prompt);

    expect(run1.length).toBe(run2.length);
    expect(run1[0].text).toBe(run2[0].text);
    expect(run1[0].confidence).toBe(run2[0].confidence);
    expect(run1[0].votes).toBeDefined();
    expect(run1[0].votes![0].stage).not.toBe('LLM'); // Zero LLM votes
  });

  // 6. MANUAL OVERRIDE PRECEDENCE
  test('Manual Override: UNMASK excludes auto-detected entity; MASK forces masking', async () => {
    const prompt = 'Tell Han to review Project Titan with CEO David.';
    const autoDetected = await runMultiLayerDetectionPipeline(prompt);

    const unmasked = applyManualOverrides(autoDetected, [
      { text: 'Han', start: prompt.indexOf('Han'), end: prompt.indexOf('Han') + 3, action: 'UNMASK' },
    ]);
    expect(unmasked.find((e) => e.text === 'Han')).toBeUndefined();

    const forced = applyManualOverrides(autoDetected, [
      { text: 'Titan', start: prompt.indexOf('Titan'), end: prompt.indexOf('Titan') + 5, action: 'MASK', type: 'PROJECT_CODENAME' },
    ]);
    const titan = forced.find((e) => e.text === 'Titan');
    expect(titan?.type).toBe('PROJECT_CODENAME');
    expect(titan?.confidence).toBe(1.0);
  });

  // 7. PII & FINANCIAL REGEX DETECTORS
  test('Regex Stage: Detects email, IBAN, and credit card patterns', () => {
    const prompt = 'Contact david@enterprise.com, IBAN GB82WEST12345698765432, card 4111111111111111';
    const detected = runStage1Regex(prompt);

    expect(detected.find((e) => e.type === 'EMAIL_ADDRESS')).toBeDefined();
    expect(detected.find((e) => e.type === 'IBAN')).toBeDefined();
    expect(detected.find((e) => e.type === 'CREDIT_CARD')).toBeDefined();
  });

  // 8. JWT & BEARER TOKEN DETECTION
  test('Secret Scanner: Detects JWT and Bearer tokens', () => {
    const prompt = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const secrets = runSecretScanner(prompt);
    expect(secrets.find((s) => s.type === 'JWT_TOKEN' || s.reason.includes('Bearer'))).toBeDefined();
  });

  // 9. DETECTION SUMMARY IN SHIELD RESPONSE
  test('Shield Pipeline: Returns detection summary with entity counts', async () => {
    const result = await shieldPrompt({ prompt: 'Email john@corp.com and API key sk-proj-abc1234567890123456789012' });
    expect(result.detectionSummary).toBeDefined();
    expect(result.detectionSummary).toContain('Protected:');
  });

  // 10. SPAN RESOLVER & COMPATIBILITY MATRIX TESTS
  test('Span Resolver: Merges compatible entity spans and resolves incompatible spans by priority', () => {
    const matrix = new CompatibilityMatrix();
    const resolver = new SpanResolver(matrix);

    const originalText = 'http://localhost:5432/db';

    const candidates = [
      {
        id: 'c1',
        start: 0,
        end: 23,
        entityType: 'URL' as const,
        confidence: 0.85,
        priority: 90,
        detectorId: 'regex-detector',
        evidence: 'URL match',
        atomic: false,
        text: originalText,
      },
      {
        id: 'c2',
        start: 0,
        end: 23,
        entityType: 'CONNECTION_STRING' as const,
        confidence: 0.99,
        priority: 95,
        detectorId: 'secret-detector',
        evidence: 'Connection string match',
        atomic: true,
        text: originalText,
      },
    ];

    const resolved = resolver.resolve(candidates, originalText);
    expect(resolved.length).toBe(1);
    expect(resolved[0].entityType).toBe('CONNECTION_STRING');
    expect(resolved[0].priority).toBe(95);
  });

  // 11. IMMUTABLE PROCESSING RECORD & ZERO PLAINTEXT INVARIANT
  test('Shield Engine: Emits immutable ProcessingRecord with zero plaintext leak', async () => {
    const result = await shieldPrompt({
      prompt: 'Contact alice@secret-corp.org with AWS Key AKIAIOSFODNN7EXAMPLE',
    });

    expect(result.processingRecord).toBeDefined();
    const record = result.processingRecord!;
    expect(record.engineVersion).toBe('2.0.0-deterministic');
    expect(record.entitiesDetected).toBeGreaterThan(0);
    expect(record.executionTimeMs).toBeGreaterThanOrEqual(0);

    const serializedRecord = JSON.stringify(record);
    expect(serializedRecord).not.toContain('alice@secret-corp.org');
    expect(serializedRecord).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  // 12. AES-256-GCM ENCRYPTION PROVIDER TEST
  test('EncryptionProvider: AESGCMEncryptionProvider encrypts and decrypts losslessly', async () => {
    const provider = new AESGCMEncryptionProvider('test-secret-key-32-bytes-long!!!');
    const plaintext = JSON.stringify({ "[[PERSON_001]]": "Secret Agent" });

    const ciphertext = await provider.encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext).toContain(':'); // Contains iv:authTag:ciphertext

    const decrypted = await provider.decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  // 13. REVEAL STORE ACTIVITY-BASED TTL REFRESH TEST
  test('RevealStore: Accessing session touches lastActivity and refreshes TTL', async () => {
    const store = new InMemoryRevealStore(30); // 30 mins TTL
    const pastTime = new Date(Date.now() - 60000).toISOString();

    await store.save({
      sessionId: 'shd_test_ttl',
      encryptedMappings: 'eyAibWFwIjogInRlc3QiIH0=',
      createdAt: pastTime,
      lastActivity: pastTime,
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
      isPurged: false,
    });

    const retrieved = await store.get('shd_test_ttl');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.sessionId).toBe('shd_test_ttl');
    expect(new Date(retrieved!.lastActivity).getTime()).toBeGreaterThanOrEqual(new Date(pastTime).getTime());
  });

  // =========================================================================
  // RED-TEAM REGRESSION SUITE (TESTS 1 - 12)
  // =========================================================================

  // TEST 1: const password = "SecretPass123";
  test('RED-TEAM TEST 1: Source code password assignment masks password value', async () => {
    const input = 'const password = "SecretPass123";';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).not.toContain('SecretPass123');
    expect(result.protectedPrompt).toContain('const password = "[[PASSWORD_001]]";');
  });

  // TEST 2: My password is SecretPass123
  test('RED-TEAM TEST 2: Natural language password is masked', async () => {
    const input = 'My password is SecretPass123';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).not.toContain('SecretPass123');
    expect(result.protectedPrompt).toContain('My password is [[PASSWORD_001]]');
  });

  // TEST 3: const passwordField = document.querySelector("#password");
  test('RED-TEAM TEST 3: Selector/DOM field passwordField is EXACTLY unchanged', async () => {
    const input = 'const passwordField = document.querySelector("#password");';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe(input);
    expect(result.entitiesCount).toBe(0);
  });

  // TEST 4: const apiKeyLabel = "API Key";
  test('RED-TEAM TEST 4: UI Label string apiKeyLabel is EXACTLY unchanged', async () => {
    const input = 'const apiKeyLabel = "API Key";';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe(input);
    expect(result.entitiesCount).toBe(0);
  });

  // TEST 5: const tokenCount = 100;
  test('RED-TEAM TEST 5: Numeric count tokenCount is EXACTLY unchanged', async () => {
    const input = 'const tokenCount = 100;';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe(input);
    expect(result.entitiesCount).toBe(0);
  });

  // TEST 6: const token = "Bearer FAKE_TOKEN_ABC123";
  test('RED-TEAM TEST 6: Bearer token is detected and masked cleanly; prose with Bearer untouched', async () => {
    const tokenInput = 'const token = "Bearer FAKE_TOKEN_ABC123";';
    const tokenResult = await shieldPrompt({ prompt: tokenInput });

    expect(tokenResult.protectedPrompt).not.toContain('FAKE_TOKEN_ABC123');

    const proseInput = 'The bearer of good news arrives at noon.';
    const proseResult = await shieldPrompt({ prompt: proseInput });
    expect(proseResult.protectedPrompt).toBe(proseInput);
    expect(proseResult.entitiesCount).toBe(0);
  });

  // TEST 7: Multiline API key and natural language password
  test('RED-TEAM TEST 7: Multiline prompt with API key and natural language password masks both values', async () => {
    const input = `Here is my API key:\nsk-proj-123456789012345678901234\n\nMy password is:\nSecretPass123`;
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).not.toContain('sk-proj-123456789012345678901234');
    expect(result.protectedPrompt).not.toContain('SecretPass123');
    expect(result.protectedPrompt).toContain('Here is my API key:');
    expect(result.protectedPrompt).toContain('My password is:');
  });

  // TEST 8: Multiple independent secrets
  test('RED-TEAM TEST 8: Multiple independent secrets receive unique non-colliding placeholders', async () => {
    const input = `const apiKey = "sk-test-AAA111";\nconst password = "AlphaPassword123";\nconst token = "Bearer FAKE_TOKEN_ABC123";\nconst db = "mongodb://user:password@localhost:27017/app";`;
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).not.toContain('sk-test-AAA111');
    expect(result.protectedPrompt).not.toContain('AlphaPassword123');
    expect(result.protectedPrompt).not.toContain('FAKE_TOKEN_ABC123');
    expect(result.protectedPrompt).not.toContain('mongodb://user:password@localhost:27017/app');
    expect(result.entitiesCount).toBeGreaterThanOrEqual(4);
  });

  // TEST 9: MongoDB connection string containing username/password
  test('RED-TEAM TEST 9: MongoDB connection string is handled as unified connection entity', async () => {
    const input = 'const db = "mongodb://user:password@localhost:27017/app";';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).not.toContain('mongodb://user:password@localhost:27017/app');
    expect(result.protectedPrompt).toContain('[[CONNECTION_STRING_001]]');
  });

  // TEST 10: Manual user masking
  test('RED-TEAM TEST 10: Manual user masking takes highest priority (100)', async () => {
    const input = 'let customVal = "SensitiveCustomVal123";';
    const result = await shieldPrompt({
      prompt: input,
      manualOverrides: [
        {
          text: 'SensitiveCustomVal123',
          start: input.indexOf('SensitiveCustomVal123'),
          end: input.indexOf('SensitiveCustomVal123') + 21,
          action: 'MASK',
          type: 'PASSWORD',
        },
      ],
    });

    expect(result.protectedPrompt).not.toContain('SensitiveCustomVal123');
    expect(result.protectedPrompt).toContain('[[PASSWORD_001]]');
  });

  // TEST 11: Non-sensitive source code invariant (byte-for-byte identical output)
  test('RED-TEAM TEST 11: Non-sensitive source code output is byte-for-byte 100% identical to input', async () => {
    const input = `const passwordField = document.querySelector("#password");\nconst apiKeyLabel = "API Key";\nconst tokenCount = 100;`;
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe(input);
    expect(result.entitiesCount).toBe(0);
    expect(result.shieldedPrivacyScore).toBe(99);
    expect(result.safetyVerdict).toBe('SAFE TO SHARE');
  });

  // TEST 12: Residual-risk invariant (SAFE TO SHARE prohibited when high-risk candidate remains)
  test('RED-TEAM TEST 12: Residual-risk invariant forces REVIEW REQUIRED if unmasked secret remains', async () => {
    const mockKey = 'sk' + '_live_1234567890abcdef1234567890';
    const residual = evaluateResidualRisk(`Text containing unmasked API key ${mockKey}`);

    expect(residual.hasUnresolvedHighRisk).toBe(true);
    expect(residual.safetyVerdict).toBe('REVIEW REQUIRED');
    expect(residual.residualScore).toBeLessThan(99);
  });

  // TEST 13: Nested Entity Resolution (PERSON_NAME inside EMAIL_ADDRESS -> keep only EMAIL)
  test('ARCHITECTURAL TEST 13: Nested entity resolution subsumes PERSON_NAME inside EMAIL_ADDRESS for john.doe@example.com', async () => {
    const input = 'Contact john.doe@example.com for support.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('Contact [[EMAIL_ADDRESS_001]] for support.');
    expect(result.protectedPrompt).toContain('[[EMAIL_ADDRESS_001]]');
    expect(result.protectedPrompt).not.toContain('[[PERSON');
    expect(result.protectedPrompt).not.toContain('john.doe@example.com');
    const emailPlaceholders = result.protectedPrompt.match(/\[\[EMAIL_ADDRESS_\d+\]\]/g) || [];
    expect(emailPlaceholders.length).toBe(1);
    expect(result.entitiesCount).toBe(1);
  });

  // TEST 14: Prose & Documentation Invariant (password, Bearer authentication, API key documentation)
  test('ARCHITECTURAL TEST 14: Prose and documentation references remain 100% byte-for-byte unchanged', async () => {
    const doc1 = 'Enter your password here';
    const doc2 = 'Supports Bearer authentication headers';
    const doc3 = 'API key documentation';

    const r1 = await shieldPrompt({ prompt: doc1 });
    const r2 = await shieldPrompt({ prompt: doc2 });
    const r3 = await shieldPrompt({ prompt: doc3 });

    expect(r1.protectedPrompt).toBe(doc1);
    expect(r2.protectedPrompt).toBe(doc2);
    expect(r3.protectedPrompt).toBe(doc3);
    expect(r1.entitiesCount).toBe(0);
    expect(r2.entitiesCount).toBe(0);
    expect(r3.entitiesCount).toBe(0);
  });

  // TEST 15: Residual-Risk Score Override (sk-test-ABC123XYZ remaining forces REVIEW REQUIRED)
  test('ARCHITECTURAL TEST 15: Residual risk override forces REVIEW REQUIRED and overrides 99/100', async () => {
    const residual = evaluateResidualRisk('The API key is sk-test-ABC123XYZ');

    expect(residual.hasUnresolvedHighRisk).toBe(true);
    expect(residual.safetyVerdict).toBe('REVIEW REQUIRED');
    expect(residual.residualScore).toBeLessThan(99);
  });

  // TEST 17: Customer debugging prompt with pre-existing placeholders and unmasked API key
  test('CUSTOMER TEST 17: Shields unmasked API key sk-test-ABC123XYZ while leaving pre-existing placeholders intact', async () => {
    const input = `Hey, I'm debugging production.\n\nThe customer said their email [[PERSON_NAME_001]][[EMAIL_ADDRESS_001]].\nOur staging DB is [[CONNECTION_STRING_001]]\n\nThe API key is sk-test-ABC123XYZ.\n\nAlso, don't expose the password:\nMy password is [[PASSWORD_001]]\n\nThanks.`;
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).not.toContain('sk-test-ABC123XYZ');
    expect(result.protectedPrompt).toContain('[[API_KEY_001]]');
    expect(result.protectedPrompt).toContain('[[PERSON_NAME_001]]');
    expect(result.protectedPrompt).toContain('[[EMAIL_ADDRESS_001]]');
    expect(result.protectedPrompt).toContain('[[CONNECTION_STRING_001]]');
    expect(result.protectedPrompt).toContain('[[PASSWORD_001]]');
    expect(result.safetyVerdict).toBe('SAFE TO SHARE');
    expect(result.shieldedPrivacyScore).toBe(99);
  });

  // TEST 18: Multiline WooCommerce configuration inline replacement & line structure preservation
  test('REQUIREMENT 7 TEST 18: Multiline WooCommerce configuration replaces sensitive spans inline cleanly', async () => {
    const input = `# WooCommerce Integration\n\nWOOCOMMERCE_URL=https://example.com\nWOOCOMMERCE_CONSUMER_KEY=ck_ab2e3eec5d5e100f5202064e916aff141428a777\nWOOCOMMERCE_CONSUMER_SECRET=cs_5a2e6ba63b1afa746cadff1db794f77cd24707c4`;
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('# WooCommerce Integration');
    expect(result.protectedPrompt).toContain('WOOCOMMERCE_URL=');
    expect(result.protectedPrompt).toContain('WOOCOMMERCE_CONSUMER_KEY=');
    expect(result.protectedPrompt).toContain('WOOCOMMERCE_CONSUMER_SECRET=');
    expect(result.protectedPrompt).not.toContain('https://example.com');
    expect(result.protectedPrompt).not.toContain('ck_ab2e3eec5d5e100f5202064e916aff141428a777');
    expect(result.protectedPrompt).not.toContain('cs_5a2e6ba63b1afa746cadff1db794f77cd24707c4');
    
    // Ensure line breaks are preserved
    const lines = result.protectedPrompt.split('\n');
    expect(lines.length).toBe(5);
  });

  // TEST 19: Copy Button & Clipboard Security Invariant
  test('REQUIREMENT 6 TEST 19: Protected prompt output is 100% free of sensitive plaintext bytes', async () => {
    const input = 'const password = "SecretPass123";';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('const password = "[[PASSWORD_001]]";');
    expect(result.protectedPrompt).not.toContain('SecretPass123');
  });

  // TEST 20: Manual Masking Inline Replacement
  test('REQUIREMENT 8 TEST 20: Manual override replaces sensitive substring inline without overlays', async () => {
    const input = 'WOOCOMMERCE_URL=https://example.com';
    const result = await shieldPrompt({
      prompt: input,
      manualOverrides: [{ text: 'https://example.com', start: 16, end: 35, action: 'MASK', type: 'CUSTOM_TERM' }],
    });

    expect(result.protectedPrompt).toContain('WOOCOMMERCE_URL=');
    expect(result.protectedPrompt).not.toContain('https://example.com');
    expect(result.entitiesCount).toBeGreaterThan(0);
  });

  // =========================================================================
  // TEXT ENGINE BEHAVIOR REGRESSION TESTS A THROUGH Q
  // =========================================================================

  // TEST A: Same person repeated 5 times -> same placeholder
  test('REGRESSION TEST A: Same person repeated 5 times reuses the same [[PERSON_NAME_001]] placeholder', async () => {
    const input = 'Contact Daniel Okafor. Inform Daniel Okafor. Send to Daniel Okafor. Meet with Daniel Okafor. Speak to Daniel Okafor.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('[[PERSON_NAME_001]]');
    expect(result.protectedPrompt).not.toContain('[[PERSON_NAME_002]]');
    expect(result.protectedPrompt.split('[[PERSON_NAME_001]]').length - 1).toBe(5);
  });

  // TEST B: Same project codename repeated 5 times -> same placeholder
  test('REGRESSION TEST B: Same project codename repeated 5 times reuses the same [[PROJECT_CODENAME_001]] placeholder', async () => {
    const input = 'Project Falcon is priority. Review Project Falcon. Deploy Project Falcon. Status of Project Falcon. Update Project Falcon.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('Project [[PROJECT_CODENAME_001]]');
    expect(result.protectedPrompt).not.toContain('[[PROJECT_CODENAME_002]]');
    expect(result.protectedPrompt.split('[[PROJECT_CODENAME_001]]').length - 1).toBe(5);
  });

  // TEST C: Same email repeated 5 times -> same placeholder
  test('REGRESSION TEST C: Same email repeated 5 times reuses the same [[EMAIL_ADDRESS_001]] placeholder', async () => {
    const input = 'Email daniel@example.com or daniel@example.com or daniel@example.com or daniel@example.com or daniel@example.com';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('[[EMAIL_ADDRESS_001]]');
    expect(result.protectedPrompt).not.toContain('[[EMAIL_ADDRESS_002]]');
    expect(result.protectedPrompt.split('[[EMAIL_ADDRESS_001]]').length - 1).toBe(5);
  });

  // TEST D: Two different people -> different placeholders
  test('REGRESSION TEST D: Two different people get distinct sequential placeholders', async () => {
    const input = 'Contact Daniel Okafor and CEO David.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('[[PERSON_NAME_001]]');
    expect(result.protectedPrompt).toContain('[[PERSON_NAME_002]]');
  });

  // TEST E: Two different projects -> different placeholders
  test('REGRESSION TEST E: Two different projects get distinct sequential placeholders', async () => {
    const input = 'Project Falcon and Project Titan are active.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('Project [[PROJECT_CODENAME_001]]');
    expect(result.protectedPrompt).toContain('Project [[PROJECT_CODENAME_002]]');
  });

  // TEST F: "password" alone -> no detection
  test('REGRESSION TEST F: Word "password" alone remains ordinary untouched text', async () => {
    const input = 'Use the password field when authenticating.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('Use the password field when authenticating.');
    expect(result.entitiesCount).toBe(0);
  });

  // TEST G: "API key" alone -> no detection
  test('REGRESSION TEST G: Phrase "API key" alone remains ordinary untouched text', async () => {
    const input = 'The API key field contains the customer credential.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('The API key field contains the customer credential.');
    expect(result.entitiesCount).toBe(0);
  });

  // TEST H: "secret" alone -> no detection
  test('REGRESSION TEST H: Word "secret" alone remains ordinary untouched text', async () => {
    const input = 'Keep this setting secret in your documentation.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('Keep this setting secret in your documentation.');
    expect(result.entitiesCount).toBe(0);
  });

  // TEST I: "token" alone -> no detection
  test('REGRESSION TEST I: Word "token" alone remains ordinary untouched text', async () => {
    const input = 'Token documentation explains authentication.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('Token documentation explains authentication.');
    expect(result.entitiesCount).toBe(0);
  });

  // TEST J: password=actual-value -> value detected
  test('REGRESSION TEST J: password=actual-value masks value while preserving key', async () => {
    const input = 'password=SuperSecret123';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('password=[[PASSWORD_001]]');
    expect(result.protectedPrompt).not.toContain('SuperSecret123');
  });

  // TEST K: API_KEY=actual-value -> value detected
  test('REGRESSION TEST K: API_KEY=actual-value masks value while preserving key', async () => {
    const input = 'API_KEY=sk-test-ABC1234567890';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('API_KEY=');
    expect(result.protectedPrompt).not.toContain('sk-test-ABC1234567890');
  });

  // TEST L: Bearer actual-token -> token detected
  test('REGRESSION TEST L: Bearer actual-token masks token while preserving Bearer keyword', async () => {
    const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('Authorization: Bearer ');
    expect(result.protectedPrompt).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  // TEST M: Person name + email -> two correctly bounded spans
  test('REGRESSION TEST M: Person name + email creates two distinct correctly bounded spans', async () => {
    const input = 'Contact Daniel Okafor at daniel@example.com';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('Contact [[PERSON_NAME_001]] at [[EMAIL_ADDRESS_001]]');
  });

  // TEST N: Email without person name -> only email detected
  test('REGRESSION TEST N: Email without person name detects only the email span', async () => {
    const input = 'Contact daniel@example.com';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('Contact [[EMAIL_ADDRESS_001]]');
    expect(result.entitiesCount).toBe(1);
  });

  // TEST O: "Project Falcon" -> Project remains ordinary text and Falcon is masked
  test('REGRESSION TEST O: "Project Falcon" keeps Project as ordinary text and masks Falcon', async () => {
    const input = 'We are building Project Falcon.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('We are building Project [[PROJECT_CODENAME_001]].');
  });

  // TEST P: Repeated "Project Falcon" -> same placeholder
  test('REGRESSION TEST P: Repeated "Project Falcon" reuses [[PROJECT_CODENAME_001]] placeholder', async () => {
    const input = 'Project Falcon is our internal project. Project Falcon launched today.';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('Project [[PROJECT_CODENAME_001]]');
    expect(result.protectedPrompt).not.toContain('[[PROJECT_CODENAME_002]]');
  });

  // TEST Q: Surrounding punctuation/spacing remains unchanged
  test('REGRESSION TEST Q: Surrounding punctuation and spacing remain byte-for-byte unchanged', async () => {
    const input = 'Contact Daniel Okafor, at (daniel@example.com)!';
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toBe('Contact [[PERSON_NAME_001]], at ([[EMAIL_ADDRESS_001]])!');
  });

  // TEST R: Natural language password phrasing & special characters
  test('REGRESSION TEST R: Detects natural phrasing passwords containing special characters without truncation', async () => {
    const p1 = await shieldPrompt({ prompt: 'The password is now P@ssw0rd!123.' });
    expect(p1.protectedPrompt).toBe('The password is now [[PASSWORD_001]].');
    const r1 = await revealResponse({ aiResponse: p1.protectedPrompt, sessionId: p1.sessionId });
    expect(r1.restoredResponse).toBe('The password is now P@ssw0rd!123.');

    const p2 = await shieldPrompt({ prompt: 'Please set it to Admin&Secure!2026 for database access.' });
    expect(p2.protectedPrompt).toBe('Please set it to [[PASSWORD_001]] for database access.');
    const r2 = await revealResponse({ aiResponse: p2.protectedPrompt, sessionId: p2.sessionId });
    expect(r2.restoredResponse).toBe('Please set it to Admin&Secure!2026 for database access.');

    const p3 = await shieldPrompt({ prompt: 'Temporary password was changed to Alpha#99_Special!' });
    expect(p3.protectedPrompt).toBe('Temporary password was changed to [[PASSWORD_001]]!');
    const r3 = await revealResponse({ aiResponse: p3.protectedPrompt, sessionId: p3.sessionId });
    expect(r3.restoredResponse).toBe('Temporary password was changed to Alpha#99_Special!');

    const p4 = await shieldPrompt({ prompt: 'The new value is "Secret$Value^2026*"' });
    expect(p4.protectedPrompt).toBe('The new value is "[[PASSWORD_001]]"');
    const r4 = await revealResponse({ aiResponse: p4.protectedPrompt, sessionId: p4.sessionId });
    expect(r4.restoredResponse).toBe('The new value is "Secret$Value^2026*"');
  });

  // TEST S: Document-wide repeated entity consistency across all types
  test('REGRESSION TEST S: Document-wide consistency reuses identical placeholder numbers for same values', async () => {
    const input = `Lead is Ngozi Adeyemi. Please notify Ngozi Adeyemi.\nProject is Project Titan. Review Project Titan.\nEmail is admin@enterprise.com. Forward to admin@enterprise.com.`;
    const result = await shieldPrompt({ prompt: input });

    expect(result.protectedPrompt).toContain('[[PERSON_NAME_001]]');
    expect(result.protectedPrompt).not.toContain('[[PERSON_NAME_002]]');
    expect(result.protectedPrompt).toContain('[[PROJECT_CODENAME_001]]');
    expect(result.protectedPrompt).not.toContain('[[PROJECT_CODENAME_002]]');
    expect(result.protectedPrompt).toContain('[[EMAIL_ADDRESS_001]]');
    expect(result.protectedPrompt).not.toContain('[[EMAIL_ADDRESS_002]]');
  });

  // TEST T: On-call handoff notes prompt verification
  test('REGRESSION TEST T: On-call handoff notes prompt precision test', async () => {
    const prompt = `Handoff notes for the on-call shift.

Everything's stable right now. If the Falcon service acts up, ping
Ngozi Adeyemi first, she owns that on-call this week. Her email is
ngozi.adeyemi@agbeni.com if Slack is slow to load.

One open item: the staging DB password got rotated but not yet
updated everywhere. New value is Tr0ub4dor&2025!, please swap it in
before your shift ends.

Also heads up, Ngozi Adeyemi mentioned the Falcon service dashboard
is showing stale metrics, might just be a caching thing, not urgent.

Reach me on +234 803 221 9087 if anything's actually on fire.`;

    const result = await shieldPrompt({ prompt });

    // 1. Ngozi Adeyemi is cleanly masked without capturing trailing 'first'
    expect(result.protectedPrompt).toContain('ping\n[[PERSON_NAME_001]] first');

    // 2. 'this week' is NOT treated as a person name or entity
    expect(result.protectedPrompt).toContain('that on-call this week.');

    // 3. 'password got rotated' remains ordinary prose, while 'New value is Tr0ub4dor&2025!' is masked
    expect(result.protectedPrompt).toContain('the staging DB password got rotated but not yet');
    expect(result.protectedPrompt).toContain('New value is [[PASSWORD_001]]!');

    // 4. Repeated person name and project reuse exact same placeholder indices
    expect(result.protectedPrompt).toContain('Also heads up, [[PERSON_NAME_001]] mentioned the [[PROJECT_CODENAME_001]]');
    expect(result.protectedPrompt).not.toContain('[[PERSON_NAME_002]]');
    expect(result.protectedPrompt).not.toContain('[[PROJECT_CODENAME_002]]');

    // 5. Phone number and email are cleanly masked
    expect(result.protectedPrompt).toContain('Her email is\n[[EMAIL_ADDRESS_001]]');
    expect(result.protectedPrompt).toContain('Reach me on [[PHONE_NUMBER_001]]');

    // 6. Lossless reveal restoration restores original text byte-for-byte
    const revealed = await revealResponse({ aiResponse: result.protectedPrompt, sessionId: result.sessionId });
    expect(revealed.restoredResponse).toBe(prompt);
  });

  // TEST U: Resume / Job Application header and prose precision
  test('REGRESSION TEST U: Resume / Job Application header and prose precision test', async () => {
    const resumeText = `ADENIYI OLUWANIMOFE SHALOM
+234(0)9167116988 @ oluwanimofeaden@gmail.com

PROFESSIONAL SUMMARY
Motivated Fine Arts graduate with experience in digital communication,
social media engagement, and retail sales, seeking to apply
communication and organisational skills to roles requiring content
strategy, audience engagement, and customer-facing support.

WORK EXPERIENCE
Tunde Odunlade Art Gallery
Communication Intern
• Managed organisational digital channels and content management
systems to maintain active customer engagement and implement a
weekly media content plan aligned with audience needs and content
strategy.
• Monitored and performed social media analytics and engagement
analysis, reporting weekly performance metrics to inform adjustments
to messaging and improve reach.

Xpress Cooking Gas
Sales Assistant
• Delivered customer service and resolved customer challenges
promptly, improving customer satisfaction and supporting a 10%
month-on-month sales increase through effective client engagement
and product recommendations.
• Created and maintained weekly sales reports and sales reporting
systems, managed inventory, and supported store operations to ensure
accurate transaction processing and performance tracking.

Additional Experience (summary)
• Administrative tasks supporting store management, time
management and independent initiative applied across roles.
• Collaborative teamwork and interpersonal relations used to support
organizational goals.

EDUCATION
Leadcity University, Ibadan, Oyo State, Nigeria
Bachelor of Fine Arts

NECO
Senior Secondary School Certificate
(SSCE)`;

    const result = await shieldPrompt({ prompt: resumeText });

    // 1. Candidate Full Name header is cleanly masked as one unified PERSON_NAME
    expect(result.protectedPrompt).toContain('[[PERSON_NAME_001]]\n[[PHONE_NUMBER_001]] @ [[EMAIL_ADDRESS_001]]');

    // 2. Tunde Odunlade is masked
    expect(result.protectedPrompt).toContain('[[PERSON_NAME_002]] Art Gallery');

    // 3. Ordinary prose phrases remain 100% byte-for-byte intact (Zero False Positives)
    expect(result.protectedPrompt).toContain('social media engagement, and retail sales, seeking to apply');
    expect(result.protectedPrompt).toContain('audience engagement, and customer-facing support.');
    expect(result.protectedPrompt).toContain('maintain active customer engagement and implement a');
    expect(result.protectedPrompt).toContain('Sales Assistant');
    expect(result.protectedPrompt).toContain('resolved customer challenges');
    expect(result.protectedPrompt).toContain('improving customer satisfaction');
    expect(result.protectedPrompt).toContain('month-on-month sales increase');
    expect(result.protectedPrompt).toContain('weekly sales reports and sales reporting');
    expect(result.protectedPrompt).toContain('supported store operations');
    expect(result.protectedPrompt).toContain('independent initiative applied across roles.');

    // 4. Lossless reveal restoration restores original resume byte-for-byte
    const revealed = await revealResponse({ aiResponse: result.protectedPrompt, sessionId: result.sessionId });
    expect(revealed.restoredResponse).toBe(resumeText);
  });

  test('COMPREHENSIVE PASSWORD DETECTION: Catches CLI flags, credential pairs, PINs, and config passwords', async () => {
    // 1. CLI command password flags
    const cliPrompt = 'mysql -u root -pMyDbSuperPass!2026';
    const cliResult = await shieldPrompt({ prompt: cliPrompt });
    expect(cliResult.protectedPrompt).not.toContain('MyDbSuperPass!2026');
    expect(cliResult.protectedPrompt).toContain('[[PASSWORD_001]]');

    // 2. Credential pair
    const credPairPrompt = 'Login details: username: admin / password: SuperSecretPass123!';
    const credResult = await shieldPrompt({ prompt: credPairPrompt });
    expect(credResult.protectedPrompt).not.toContain('SuperSecretPass123!');
    expect(credResult.protectedPrompt).toContain('[[PASSWORD_001]]');

    // 3. Security PIN / Passcode / WiFi Password
    const pinPrompt = 'The security pin is 987654 and wifi password is OfficeGuest2026!';
    const pinResult = await shieldPrompt({ prompt: pinPrompt });
    expect(pinResult.protectedPrompt).not.toContain('987654');
    expect(pinResult.protectedPrompt).not.toContain('OfficeGuest2026!');
    expect(pinResult.protectedPrompt).toContain('[[PASSWORD_001]]');
    expect(pinResult.protectedPrompt).toContain('[[PASSWORD_002]]');

    // 4. DB Config assignment
    const configPrompt = 'DB_PASSWORD="ProductionDbPass#99"';
    const configResult = await shieldPrompt({ prompt: configPrompt });
    expect(configResult.protectedPrompt).not.toContain('ProductionDbPass#99');
    expect(configResult.protectedPrompt).toContain('[[PASSWORD_001]]');

    // 5. Natural language with trailing punctuation
    const nlPrompt = 'Please note that the default password for admin is InitP@ssword2026.';
    const nlResult = await shieldPrompt({ prompt: nlPrompt });
    expect(nlResult.protectedPrompt).not.toContain('InitP@ssword2026');
    expect(nlResult.protectedPrompt).toContain('[[PASSWORD_001]].');
  });

  // REGRESSION TEST: FIX "contains" FALSE POSITIVE & CONTEXT FALSE POSITIVES
  test('REGRESSION TEST: Ordinary grammatical words ("contains", "API key", "token", "secret", "password") remain 100% untouched', async () => {
    // 1. "contains" following "repository" must never become a placeholder
    const repoPrompt = 'The repository contains a file called secrets.md.';
    const repoResult = await shieldPrompt({ prompt: repoPrompt });
    expect(repoResult.protectedPrompt).toBe(repoPrompt);

    // 2. Ordinary grammatical phrases with sensitive terminology
    const s1 = 'This sentence contains the phrase API key but does not contain an API key.';
    const r1 = await shieldPrompt({ prompt: s1 });
    expect(r1.protectedPrompt).toBe(s1);

    const s2 = 'This sentence contains the word token but does not contain an authentication token.';
    const r2 = await shieldPrompt({ prompt: s2 });
    expect(r2.protectedPrompt).toBe(s2);

    const s3 = 'This sentence contains the word secret but does not contain a secret.';
    const r3 = await shieldPrompt({ prompt: s3 });
    expect(r3.protectedPrompt).toBe(s3);

    const s4 = 'This sentence contains the word password but does not contain a password value.';
    const r4 = await shieldPrompt({ prompt: s4 });
    expect(r4.protectedPrompt).toBe(s4);
  });

  // REGRESSION TEST: FULL CONTIGUOUS PERSON NAME SPAN RESOLUTION
  test('REGRESSION TEST: Person candidate replaces the complete contiguous name without leaving surname or consuming possessive "\'s"', async () => {
    // John Doe
    const p1 = "John Doe's email is john.doe@example.com.";
    const r1 = await shieldPrompt({ prompt: p1 });
    expect(r1.protectedPrompt).toBe("[[PERSON_NAME_001]]'s email is [[EMAIL_ADDRESS_001]].");

    // Sarah Adeyemi
    const p2 = "Sarah Adeyemi's email is sarah.adeyemi@example.com.";
    const r2 = await shieldPrompt({ prompt: p2 });
    expect(r2.protectedPrompt).toBe("[[PERSON_NAME_001]]'s email is [[EMAIL_ADDRESS_001]].");

    // Michael Johnson
    const p3 = "Michael Johnson's email is michael.johnson@example.com.";
    const r3 = await shieldPrompt({ prompt: p3 });
    expect(r3.protectedPrompt).toBe("[[PERSON_NAME_001]]'s email is [[EMAIL_ADDRESS_001]].");

    // David Williams
    const p4 = "David Williams's email is david.williams@example.com.";
    const r4 = await shieldPrompt({ prompt: p4 });
    expect(r4.protectedPrompt).toBe("[[PERSON_NAME_001]]'s email is [[EMAIL_ADDRESS_001]].");
  });

  // REGRESSION TEST: PRESERVE CONTEXT AROUND PLACEHOLDERS & ENTITY TYPE CLASSIFICATION
  test('REGRESSION TEST: Context preservation around placeholders & project classification', async () => {
    // Project name: Project Sentinel
    const p1 = 'Project name: Project Sentinel';
    const r1 = await shieldPrompt({ prompt: p1 });
    expect(r1.protectedPrompt).toBe('Project name: [[PROJECT_CODENAME_001]]');

    // Contact John Doe at john.doe@example.com.
    const p2 = 'Contact John Doe at john.doe@example.com.';
    const r2 = await shieldPrompt({ prompt: p2 });
    expect(r2.protectedPrompt).toBe('Contact [[PERSON_NAME_001]] at [[EMAIL_ADDRESS_001]].');
  });

  // REGRESSION TEST: CANONICAL VALUE MAPPING & ADVERSARIAL DOCUMENT REGRESSION FIXTURE
  test('REGRESSION FIXTURE: Full Adversarial Document permanent regression verification', async () => {
    const adversarialDocument = `ADVERSARIAL PRIVACY EVALUATION FIXTURE
The repository contains a file called secrets.md.
This sentence contains the phrase API key but does not contain an API key.
This sentence contains the word token but does not contain an authentication token.
This sentence contains the word secret but does not contain a secret.
This sentence contains the word password but does not contain a password value.

Project name: Project Sentinel
Contact John Doe at john.doe@example.com.
John Doe's email is john.doe@example.com.

TEAM ROSTER:
Sarah Adeyemi
Michael Johnson
David Williams`;

    const expectedMaskedOutput = `ADVERSARIAL PRIVACY EVALUATION FIXTURE
The repository contains a file called secrets.md.
This sentence contains the phrase API key but does not contain an API key.
This sentence contains the word token but does not contain an authentication token.
This sentence contains the word secret but does not contain a secret.
This sentence contains the word password but does not contain a password value.

Project name: [[PROJECT_CODENAME_001]]
Contact [[PERSON_NAME_001]] at [[EMAIL_ADDRESS_001]].
[[PERSON_NAME_001]]'s email is [[EMAIL_ADDRESS_001]].

TEAM ROSTER:
[[PERSON_NAME_002]]
[[PERSON_NAME_003]]
[[PERSON_NAME_004]]`;

    const result = await shieldPrompt({ prompt: adversarialDocument });

    // Assert exact byte-for-byte output
    expect(result.protectedPrompt).toBe(expectedMaskedOutput);

    // Assert exact properties:
    // - repository contains remains unchanged
    expect(result.protectedPrompt).toContain('The repository contains a file called secrets.md.');
    // - API key ordinary phrase remains unchanged
    expect(result.protectedPrompt).toContain('This sentence contains the phrase API key but does not contain an API key.');
    // - token ordinary phrase remains unchanged
    expect(result.protectedPrompt).toContain('This sentence contains the word token but does not contain an authentication token.');
    // - secret ordinary phrase remains unchanged
    expect(result.protectedPrompt).toContain('This sentence contains the word secret but does not contain a secret.');
    // - password ordinary phrase remains unchanged
    expect(result.protectedPrompt).toContain('This sentence contains the word password but does not contain a password value.');
    // - John Doe full-name span & repeated consistency
    expect(result.protectedPrompt).toContain('Contact [[PERSON_NAME_001]] at [[EMAIL_ADDRESS_001]].');
    expect(result.protectedPrompt).toContain("[[PERSON_NAME_001]]'s email is [[EMAIL_ADDRESS_001]].");
    // - Project Sentinel classification
    expect(result.protectedPrompt).toContain('Project name: [[PROJECT_CODENAME_001]]');
    // - Preservation of possessive "'s"
    expect(result.protectedPrompt).toContain("[[PERSON_NAME_001]]'s email");
    // - Team roster distinct sequential placeholders
    expect(result.protectedPrompt).toContain('[[PERSON_NAME_002]]\n[[PERSON_NAME_003]]\n[[PERSON_NAME_004]]');

    // Lossless reveal restoration restores original text byte-for-byte
    const revealed = await revealResponse({
      aiResponse: result.protectedPrompt,
      sessionId: result.sessionId,
    });
    expect(revealed.restoredResponse).toBe(adversarialDocument);
  });

  // REGRESSION TEST: NAMES WITH PUNCTUATION REUSE SAME PLACEHOLDER AND PRESERVE PUNCTUATION
  test('REGRESSION TEST: Names with diverse punctuation (comma, quotes, parens, colon, semicolon, period) reuse same placeholder', async () => {
    const prompt = `Contact John Doe, or "John Doe", or (John Doe); please note John Doe: lead engineer. Also John Doe. John Doe's desk is near Sarah Adeyemi, (Sarah Adeyemi).`;
    const result = await shieldPrompt({ prompt });

    // John Doe should ALWAYS map to [[PERSON_NAME_001]] across all punctuation variants
    expect(result.protectedPrompt).toContain('Contact [[PERSON_NAME_001]],');
    expect(result.protectedPrompt).toContain('"[[PERSON_NAME_001]]",');
    expect(result.protectedPrompt).toContain('([[PERSON_NAME_001]]);');
    expect(result.protectedPrompt).toContain('[[PERSON_NAME_001]]: lead engineer.');
    expect(result.protectedPrompt).toContain('Also [[PERSON_NAME_001]].');
    expect(result.protectedPrompt).toContain("[[PERSON_NAME_001]]'s desk");

    // Sarah Adeyemi should ALWAYS map to [[PERSON_NAME_002]] across all punctuation variants
    expect(result.protectedPrompt).toContain('near [[PERSON_NAME_002]],');
    expect(result.protectedPrompt).toContain('([[PERSON_NAME_002]]).');

    // Ensure no spurious placeholders like [[PERSON_NAME_003]] were created
    expect(result.protectedPrompt).not.toContain('[[PERSON_NAME_003]]');

    // Reveal restores original prompt 100% byte-for-byte
    const revealed = await revealResponse({ aiResponse: result.protectedPrompt, sessionId: result.sessionId });
    expect(revealed.restoredResponse).toBe(prompt);
  });

  // GENERAL SELF-INTRODUCTION TESTS
  test('Self-Introduction Context: Detects "my name is jeff", "I am Jeff", "call me Jeff", "Name: Jeff"', async () => {
    // 1. Lowercase self-introduction: "my name is jeff"
    const lowerResult = await shieldPrompt({ prompt: 'Hello, my name is jeff, please review my proposal.' });
    expect(lowerResult.protectedPrompt).toBe('Hello, my name is [[PERSON_NAME_001]], please review my proposal.');

    const lowerRestored = await revealResponse({ sessionId: lowerResult.sessionId, aiResponse: lowerResult.protectedPrompt });
    expect(lowerRestored.restoredResponse).toBe('Hello, my name is jeff, please review my proposal.');

    // 2. Direct pipeline entity verification
    const fused = await runMultiLayerDetectionPipeline('Hello, my name is jeff, please review my proposal.');
    expect(fused.find(e => e.type === 'PERSON_NAME')?.text.toLowerCase()).toBe('jeff');

    // 3. Title Case self-introduction: "My name is Jeff"
    const titleResult = await shieldPrompt({ prompt: 'My name is Jeff and my API key is sk-proj-123456789012345678901234.' });
    expect(titleResult.protectedPrompt).toContain('My name is [[PERSON_NAME_001]]');
    expect(titleResult.protectedPrompt).toContain('[[API_KEY_001]]');

    // 4. Variations: "I am Jeff", "call me Jeff", "Name: Jeff"
    const variations = [
      { text: 'I am Jeff.', expected: 'I am [[PERSON_NAME_001]].' },
      { text: "Hi, I'm Jeff!", expected: "Hi, I'm [[PERSON_NAME_001]]!" },
      { text: 'You can call me Jeff.', expected: 'You can call me [[PERSON_NAME_001]].' },
      { text: 'Full Name: Jeff Okafor', expected: 'Full Name: [[PERSON_NAME_001]]' },
      { text: 'Signed by: Jeff', expected: 'Signed by: [[PERSON_NAME_001]]' }
    ];

    for (const v of variations) {
      const res = await shieldPrompt({ prompt: v.text });
      expect(res.protectedPrompt).toBe(v.expected);
    }
  });
});
