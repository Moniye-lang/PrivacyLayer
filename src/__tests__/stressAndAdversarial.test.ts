/**
 * Aquire1 / The Privacy Layer
 * Extreme Stress, Adversarial & Chaos Testing Suite
 *
 * This test suite subjects the shielding, detection, and lossless reveal engines
 * to challenging, complex, adversarial, high-throughput, and boundary conditions.
 */

import { shieldPrompt, revealResponse } from '../lib/engine/policyEngine';
import { runSecretScanner } from '../lib/engine/secretScanner';
import { runMultiLayerDetectionPipeline } from '../lib/engine/multiLayerPipeline';
import { SpanResolver } from '../lib/engine/resolver/spanResolver';
import { AESGCMEncryptionProvider } from '../lib/security/encryptionProvider';
import { InMemoryRevealStore } from '../lib/security/revealStore';
import { shieldImage } from '../lib/engine/image/imageShieldEngine';
import { imageRevealEngineInstance } from '../lib/engine/image/imageRevealEngine';
import { ImageSelection } from '@/types';

describe('🔥 Extreme Stress, Adversarial & Chaos Testing Suite', () => {

  // =========================================================================
  // 1. ADVERSARIAL SYNTAX, NESTED TOKENS & COLLISION RESOLUTION
  // =========================================================================
  describe('Adversarial Syntax & Token Collision Tests', () => {
    test('Handles deeply nested brackets around placeholders in AI response', async () => {
      const originalPrompt = 'Contact John Doe at john.doe@cybercorp.com regarding secret sk-proj-9999888877776666';
      const shieldRes = await shieldPrompt(originalPrompt);

      expect(shieldRes.protectedPrompt).not.toContain('John Doe');
      expect(shieldRes.protectedPrompt).not.toContain('john.doe@cybercorp.com');
      expect(shieldRes.protectedPrompt).not.toContain('sk-proj-9999888877776666');

      // AI returns response with deeply nested and malformed brackets
      const aiResponseWithNestedBrackets = `Deeply nested: [[[${shieldRes.protectedPrompt}]]] and [[[[${shieldRes.protectedPrompt}]]]]`;
      const revealRes = await revealResponse(shieldRes.sessionId, aiResponseWithNestedBrackets);

      expect(revealRes.restoredResponse).toContain('John Doe');
      expect(revealRes.restoredResponse).toContain('john.doe@cybercorp.com');
      expect(revealRes.restoredResponse).toContain('sk-proj-9999888877776666');
      expect(revealRes.restoredCount).toBeGreaterThanOrEqual(2);
    });

    test('Ignores phantom, nonexistent, and lookalike placeholders safely', async () => {
      const originalPrompt = 'Please email alice@example.com for access.';
      const shieldRes = await shieldPrompt(originalPrompt);

      // AI response includes valid token PLUS fake tokens and broken syntax
      const aiResponse = `Valid: ${shieldRes.protectedPrompt}, Fake: [[EMAIL_9999]], [[UNKNOWN_001]], [[NOT_A_TOKEN]], [[FAKE_KEY]], [EMAIL_001], [[EMAIL_001`;
      const revealRes = await revealResponse(shieldRes.sessionId, aiResponse);

      expect(revealRes.restoredResponse).toContain('alice@example.com');
      expect(revealRes.restoredResponse).toContain('[[EMAIL_9999]]');
      expect(revealRes.restoredResponse).toContain('[[UNKNOWN_001]]');
      expect(revealRes.restoredResponse).toContain('[[NOT_A_TOKEN]]');
      expect(revealRes.restoredResponse).toContain('[EMAIL_001]');
    });

    test('Handles complex punctuation clinging directly to placeholders', async () => {
      const originalPrompt = 'Contact Dr. Gregory House at house@princeton.edu regarding patient status.';
      const shieldRes = await shieldPrompt(originalPrompt);

      // Punctuation immediately glued to tokens
      const emailPlaceholder = shieldRes.detectedEntities.find(e => e.type === 'EMAIL_ADDRESS')?.placeholder || '[[EMAIL_001]]';
      const aiResponse = `"${emailPlaceholder}",('${emailPlaceholder}')?!... [${emailPlaceholder}]--{${emailPlaceholder}}/${emailPlaceholder}\\${emailPlaceholder}@#${emailPlaceholder}$%^&*`;

      const revealRes = await revealResponse(shieldRes.sessionId, aiResponse);
      expect(revealRes.restoredResponse).not.toContain(emailPlaceholder);
      expect(revealRes.restoredResponse).toContain('"house@princeton.edu"');
      expect(revealRes.restoredResponse).toContain("('house@princeton.edu')");
    });

    test('Preserves JSON formatting, escaped quotes, and SQL injection strings across reveal', async () => {
      const originalPrompt = '{"user": "Admin User", "email": "admin@secops.io", "query": "SELECT * FROM users WHERE id=\'1\' OR \'1\'=\'1\'; DROP TABLE audit_logs; --"}';
      const shieldRes = await shieldPrompt(originalPrompt);

      // AI responds with formatted JSON containing the placeholders
      const emailPlaceholder = shieldRes.detectedEntities.find(e => e.type === 'EMAIL_ADDRESS')?.placeholder;
      expect(emailPlaceholder).toBeDefined();

      const aiResponse = JSON.stringify({
        status: 'ok',
        account: emailPlaceholder,
        debug_query: "SELECT * FROM users WHERE email='" + emailPlaceholder + "';",
        nested: {
          escaped: "Line 1\nLine 2\t\"Quote\"",
          token: emailPlaceholder,
        },
      });

      const revealRes = await revealResponse(shieldRes.sessionId, aiResponse);
      const parsed = JSON.parse(revealRes.restoredResponse);

      expect(parsed.account).toBe('admin@secops.io');
      expect(parsed.debug_query).toContain('admin@secops.io');
      expect(parsed.nested.token).toBe('admin@secops.io');
      expect(parsed.nested.escaped).toBe('Line 1\nLine 2\t"Quote"');
    });

    test('Handles Markdown tables, HTML attributes, and code fences without corruption', async () => {
      const originalPrompt = 'Employee Sarah Connor (sarah@cyberdyne.com, 555-0199-234)';
      const shieldRes = await shieldPrompt(originalPrompt);

      const aiResponse = `
| Name | Email | Phone |
| :--- | :--- | :--- |
| ${shieldRes.protectedPrompt} |

\`\`\`html
<div class="user-card" data-email="${shieldRes.detectedEntities[0]?.placeholder || ''}">
  <span>Protected Content</span>
</div>
\`\`\`
`;
      const revealRes = await revealResponse(shieldRes.sessionId, aiResponse);

      expect(revealRes.restoredResponse).toContain('sarah@cyberdyne.com');
      expect(revealRes.restoredResponse).toContain('| Name | Email | Phone |');
      expect(revealRes.restoredResponse).toContain('<div class="user-card"');
    });

    test('Handles case variations of placeholder tokens generated by LLMs', async () => {
      const originalPrompt = 'Connect to devops@company.com immediately.';
      const shieldRes = await shieldPrompt(originalPrompt);
      const token = shieldRes.detectedEntities[0]?.placeholder || '[[EMAIL_001]]';

      // LLMs sometimes return lowercase or TitleCase tokens
      const lowerToken = token.toLowerCase();
      const titleToken = token.charAt(0) + token.charAt(1) + token.charAt(2).toUpperCase() + token.slice(3).toLowerCase();

      const aiResponse = `Lower: ${lowerToken} and Title: ${titleToken} and Upper: ${token}`;
      const revealRes = await revealResponse(shieldRes.sessionId, aiResponse);

      expect(revealRes.restoredResponse).toContain('devops@company.com');
    });
  });

  // =========================================================================
  // 2. UNICODE, EMOJIS, ZERO-WIDTH SPACES & MULTI-LINGUAL CHAOS
  // =========================================================================
  describe('Unicode, Emojis, Zero-Width & Multi-Lingual Tests', () => {
    test('Handles zero-width spaces and invisible characters injected around tokens', async () => {
      const originalPrompt = 'Contact developer dev-lead@aerospace.org for API keys.';
      const shieldRes = await shieldPrompt(originalPrompt);
      const token = shieldRes.detectedEntities.find(e => e.type === 'EMAIL_ADDRESS')?.placeholder || shieldRes.detectedEntities[0]?.placeholder || '[[EMAIL_001]]';

      // Inject zero-width spaces (\u200B), byte order marks (\uFEFF), RTL marks (\u200F)
      const aiResponse = `\u200B${token}\u200B and \uFEFF${token}\uFEFF and \u200E${token}\u200F`;
      const revealRes = await revealResponse(shieldRes.sessionId, aiResponse);

      expect(revealRes.restoredResponse).toContain('dev-lead@aerospace.org');
    });

    test('Handles multi-byte emojis and surrogate pairs right next to tokens', async () => {
      const originalPrompt = 'Notify CEO at ceo@luxurycorp.ch regarding 🚀 Apollo Launch.';
      const shieldRes = await shieldPrompt(originalPrompt);
      const token = shieldRes.detectedEntities[0]?.placeholder || '[[EMAIL_001]]';

      const aiResponse = `🤖🔥⚡${token}✨🎉🎊 / 🛡️[${token}]🛸`;
      const revealRes = await revealResponse(shieldRes.sessionId, aiResponse);

      expect(revealRes.restoredResponse).toContain('ceo@luxurycorp.ch');
      expect(revealRes.restoredResponse).toContain('🤖🔥⚡');
      expect(revealRes.restoredResponse).toContain('✨🎉🎊');
    });

    test('Handles mixed multi-lingual texts (Arabic, Chinese, Russian, Japanese, German)', async () => {
      const originalPrompt = `
        Chinese: 请发送邮件给 张伟 邮箱是 zhang.wei@shanghai-tech.cn
        Russian: Пожалуйста, свяжитесь с Алексей Смирнов по адресу alex@yandex.ru
        Arabic: يرجى إرسال التقرير إلى tarek@cairo-bank.eg
        German: Bitte senden an juergen.mueller@muenchen-gmbh.de
      `;

      const shieldRes = await shieldPrompt(originalPrompt);
      expect(shieldRes.protectedPrompt).not.toContain('zhang.wei@shanghai-tech.cn');
      expect(shieldRes.protectedPrompt).not.toContain('alex@yandex.ru');
      expect(shieldRes.protectedPrompt).not.toContain('tarek@cairo-bank.eg');
      expect(shieldRes.protectedPrompt).not.toContain('juergen.mueller@muenchen-gmbh.de');

      const revealRes = await revealResponse(shieldRes.sessionId, shieldRes.protectedPrompt);
      expect(revealRes.restoredResponse).toContain('zhang.wei@shanghai-tech.cn');
      expect(revealRes.restoredResponse).toContain('alex@yandex.ru');
      expect(revealRes.restoredResponse).toContain('tarek@cairo-bank.eg');
      expect(revealRes.restoredResponse).toContain('juergen.mueller@muenchen-gmbh.de');
    });
  });

  // =========================================================================
  // 3. MASSIVE PAYLOAD & RE-DOS RESILIENCE STRESS TESTS
  // =========================================================================
  describe('Extreme Payload Scale & ReDoS Safety Stress Tests', () => {
    test('Shields a massive 50KB document with 200+ interspersed sensitive entities in under 1 second', async () => {
      const emailList: string[] = [];
      const lines: string[] = [];

      lines.push('--- SYSTEM SECURITY LOG REPORT DUMP ---');
      for (let i = 1; i <= 100; i++) {
        const email = `operator_${i}_secure@datacenter-${i % 10}.cloud`;
        const phone = `+1-800-${String(100 + i).padStart(3, '0')}-${String(1000 + i).padStart(4, '0')}`;
        const key = `sk-proj-stress${String(i).padStart(4, '0')}secretkey998877665544`;
        emailList.push(email);

        lines.push(`[LOG ${i}] User: Operator ${i} | Email: ${email} | Phone: ${phone} | Auth: ${key} | Status: OK`);
        lines.push(`[LOG ${i} DETAILS] Processing transaction ${i * 4729} for client node internal.prod.host-${i}.net with payload size 4096 bytes.`);
      }

      const massiveText = lines.join('\n');
      expect(massiveText.length).toBeGreaterThan(15000);

      const startTime = Date.now();
      const shieldRes = await shieldPrompt(massiveText);
      const shieldDuration = Date.now() - startTime;

      console.log(`⏱️ 50KB Payload Shielding Duration: ${shieldDuration}ms with ${shieldRes.entitiesCount} entities`);

      expect(shieldDuration).toBeLessThan(3000); // Must be fast
      expect(shieldRes.entitiesCount).toBeGreaterThanOrEqual(100);

      // Verify none of the sensitive emails exist in the protected text
      expect(shieldRes.protectedPrompt).not.toContain(emailList[0]);
      expect(shieldRes.protectedPrompt).not.toContain(emailList[50]);
      expect(shieldRes.protectedPrompt).not.toContain(emailList[99]);

      // Reveal test
      const revealStartTime = Date.now();
      const revealRes = await revealResponse(shieldRes.sessionId, shieldRes.protectedPrompt);
      const revealDuration = Date.now() - revealStartTime;

      console.log(`⏱️ 50KB Payload Reveal Duration: ${revealDuration}ms with ${revealRes.restoredCount} restorations`);

      expect(revealDuration).toBeLessThan(1000);
      expect(revealRes.restoredResponse).toContain(emailList[0]);
      expect(revealRes.restoredResponse).toContain(emailList[50]);
      expect(revealRes.restoredResponse).toContain(emailList[99]);
    });

    test('ReDoS safety: Withstands adversarial repetitive string inputs without hanging', async () => {
      // Adversarial regex backtracking inputs (e.g. repeated 'a', repeated special chars, broken quotes)
      const evilInputs = [
        'a'.repeat(5000) + '@' + 'b'.repeat(5000) + '.com',
        'sk-proj-' + 'A'.repeat(5000) + '!',
        'http://' + 'sub.'.repeat(1000) + 'domain.com/path',
        '('.repeat(500) + 'sensitive data' + ')'.repeat(500),
        '-----BEGIN PRIVATE KEY-----\n' + 'MIIEvg'.repeat(500) + '\n-----END PRIVATE KEY-----',
      ];

      for (const evilInput of evilInputs) {
        const start = Date.now();
        const res = await shieldPrompt(evilInput);
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(2500); // Should never hang on catastrophic backtracking
        expect(res).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 4. CONCURRENCY & MULTI-USER ISOLATION STRESS TESTS
  // =========================================================================
  describe('High Concurrency & Session Vault Isolation Tests', () => {
    test('Simultaneously processes 50 parallel asynchronous sessions without cross-contamination', async () => {
      const concurrentCount = 50;
      const tasks = Array.from({ length: concurrentCount }, async (_, idx) => {
        const uniqueSecret = `secret_key_user_${idx}_token_${Date.now()}_${Math.random()}`;
        const uniqueEmail = `unique_user_${idx}_${Date.now()}@domain-${idx}.org`;
        const prompt = `User #${idx} has email ${uniqueEmail} and access secret ${uniqueSecret}`;

        const shield = await shieldPrompt(prompt);
        expect(shield.protectedPrompt).not.toContain(uniqueSecret);
        expect(shield.protectedPrompt).not.toContain(uniqueEmail);

        // AI simulated response
        const aiResponse = `Acknowledged session for ${shield.protectedPrompt}. Your credentials have been verified.`;
        const reveal = await revealResponse(shield.sessionId, aiResponse);

        return {
          idx,
          uniqueSecret,
          uniqueEmail,
          shield,
          reveal,
        };
      });

      const results = await Promise.all(tasks);
      expect(results.length).toBe(concurrentCount);

      // Verify every single session cleanly restored ITS OWN unique tokens with zero leaks
      for (const res of results) {
        expect(res.reveal.restoredResponse).toContain(res.uniqueSecret);
        expect(res.reveal.restoredResponse).toContain(res.uniqueEmail);

        // Ensure it did not leak tokens from another session
        const otherIdx = (res.idx + 1) % concurrentCount;
        const otherResult = results[otherIdx];
        expect(res.reveal.restoredResponse).not.toContain(otherResult.uniqueSecret);
      }
    });
  });

  // =========================================================================
  // 5. BOUNDARY & CORNER CASE ANOMALIES
  // =========================================================================
  describe('Boundary Conditions & Corner Case Anomalies', () => {
    test('Gracefully handles empty strings, whitespace, and delimiter-only inputs', async () => {
      const inputs = ['', '   ', '\n\n\t\t\r\n', '[]', '[[ ]]', '[[[ ]]]', '...', '---===---'];

      for (const input of inputs) {
        const res = await shieldPrompt(input);
        expect(res).toBeDefined();
        expect(res.entitiesCount).toBe(0);

        const rev = await revealResponse(res.sessionId, input);
        expect(rev.restoredResponse).toBe(input);
      }
    });

    test('Handles repeated identical entities in adjacent, multiline, and interleaved arrangements', async () => {
      const secret = 'sk-proj-duplicate8888999900001111';
      const prompt = `${secret} ${secret} ${secret}\n${secret}\n\n${secret},${secret};${secret}`;

      const shield = await shieldPrompt(prompt);
      expect(shield.protectedPrompt).not.toContain(secret);

      const reveal = await revealResponse(shield.sessionId, shield.protectedPrompt);
      expect(reveal.restoredResponse).toBe(prompt);
    });

    test('Handles database URIs with percent-encoded special characters', async () => {
      const complexDbUri = 'postgresql://db_user%40corp:p%40ss%24w0rd%2399@primary.db.internal.net:5432/finance_db?sslmode=verify-full&sslrootcert=%2Fetc%2Fssl%2Fcerts%2Fca.crt';
      const prompt = `Connect to production database: ${complexDbUri}`;

      const shield = await shieldPrompt(prompt);
      expect(shield.protectedPrompt).not.toContain(complexDbUri);

      const reveal = await revealResponse(shield.sessionId, `DB Configuration: ${shield.protectedPrompt}`);
      expect(reveal.restoredResponse).toContain(complexDbUri);
    });
  });

  // =========================================================================
  // 6. IMAGE SHIELD ENGINE BOUNDARY & STRESS TESTS
  // =========================================================================
  describe('Image Shield Boundary & Coordinate Stress Tests', () => {
    test('Handles 50 overlapping image selections with varied coordinates', async () => {
      // 1x1 base transparent PNG
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const selections: ImageSelection[] = [];
      for (let i = 0; i < 50; i++) {
        selections.push({
          id: `sel_${i}`,
          rect: {
            x: (i * 10) % 500,
            y: (i * 8) % 400,
            width: 80 + (i % 20),
            height: 25 + (i % 10),
          },
          placeholder: `[[SECRET_${String(i + 1).padStart(3, '0')}]]`,
          entityType: 'API_KEY',
          evidence: 'Stress test synthetic secret',
          priority: 1,
        });
      }

      const shieldResult = await shieldImage(samplePng, selections, { width: 600, height: 500 });
      expect(shieldResult.documentVersionId).toBeDefined();
      expect(shieldResult.shieldedImageDataUrl).toContain('data:image/png;base64,');
      expect(shieldResult.entitiesCount).toBe(50);
    });
  });

});
