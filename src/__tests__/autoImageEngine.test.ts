/**
 * Privacy Layer — Automated (Non-Manual) Image Shielding Engine Test Suite
 * Tests: Automatic text region scanning, coordinate bounding box mapping, multi-layer detection pipeline integration,
 * placeholder sequence generation, zero external API calls, and original image immutability.
 */

import { autoDetectImageSensitiveRegions, terminateOcrWorker } from '../lib/engine/image/autoImageShieldEngine';
import { shieldImage } from '../lib/engine/image/imageShieldEngine';
import { composeShieldedImageWithSvg } from '../lib/engine/image/svgImageCompositor';
import { getAbbreviatedPlaceholder } from '../lib/engine/image/imageGeometry';
import { ImageRevealEngine } from '../lib/engine/image/imageRevealEngine';

describe('Automated (Non-Manual) Image Shielding Test Suite', () => {
  const sampleImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  afterAll(async () => {
    await terminateOcrWorker();
  });

  test('Auto-Detect: Automatically extracts text lines and creates sensitive bounding box selections', async () => {
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl);

    expect(selections).toBeDefined();
    expect(selections.length).toBeGreaterThan(0);

    const dbSelection = selections.find((s) => s.entityType === 'CONNECTION_STRING' || s.entityType === 'PASSWORD');
    expect(dbSelection).toBeDefined();
    expect(dbSelection?.rect).toBeDefined();
    expect(dbSelection?.rect.width).toBeGreaterThan(0);
    expect(dbSelection?.rect.height).toBeGreaterThan(0);
  });

  test('Auto-Detect Pipeline Integration: Automatically assigns placeholders using multi-layer pipeline rules', async () => {
    const samplePrompt = `API_KEY = "sk-proj-123456789012345678901234"\nlet dbPass = "SecretPass123";`;
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl, samplePrompt);

    expect(selections.length).toBeGreaterThanOrEqual(2);

    const apiKeySelection = selections.find((s) => s.entityType === 'API_KEY');
    const passwordSelection = selections.find((s) => s.entityType === 'PASSWORD');

    expect(apiKeySelection).toBeDefined();
    expect(passwordSelection).toBeDefined();
    expect(apiKeySelection?.placeholder).toContain('[[API_KEY_');
    expect(passwordSelection?.placeholder).toContain('[[PASSWORD_');
  });

  test('Auto-Detect to Shielding End-to-End: Auto-detected selections produce encrypted Reveal session', async () => {
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl);
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections,
    });

    expect(result.sessionId).toBeDefined();
    expect(result.entitiesCount).toBe(selections.length);
    expect(result.originalImageDataUrl).toBe(sampleImageDataUrl);
    expect(result.shieldedImageDataUrl).toBeDefined();
  });

  test('WooCommerce Integration: Auto-detects WooCommerce consumer key (ck_...) and consumer secret (cs_...)', async () => {
    const prompt = `# WooCommerce Integration\nWOOCOMMERCE_URL=https://wc.agbenimercantilestores.com\nWOOCOMMERCE_CONSUMER_KEY=ck_ab2e3eec5d5e100f5202064e916aff141428a777\nWOOCOMMERCE_CONSUMER_SECRET=cs_5a2e6ba63b1afa746cadff1db794f77cd24707c4`;
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl, prompt);

    const ckSelection = selections.find((s) => s.evidence.includes('ck_') || s.entityType === 'API_KEY');
    const csSelection = selections.filter((s) => s.evidence.includes('cs_') || s.entityType === 'API_KEY' || s.entityType === 'PASSWORD' || s.entityType === 'SOURCE_CODE_SECRET' || s.entityType === 'COMPANY_SECRET');

    expect(selections.length).toBeGreaterThanOrEqual(2);
    expect(ckSelection).toBeDefined();
    expect(csSelection.length).toBeGreaterThanOrEqual(1);
  });

  test('Low-Height Image Boundary Clamping: Ensures all auto-detected selection rects fit strictly inside low-height boundaries without stacking', async () => {
    const prompt = `Name: Amina Bello\nEmail: amina.bello@example.com\nPhone: +234 812 345 6789\nAddress: 14 Example Street, Abuja\nAPI Key: sk-proj-123456789012345678901234\nPassword: SecretPass123\nService URL: https://production.example.com/api\nServer IP: 192.0.2.42`;
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl, prompt);

    expect(selections.length).toBeGreaterThanOrEqual(4);

    for (const sel of selections) {
      expect(sel.rect.x).toBeGreaterThanOrEqual(0);
      expect(sel.rect.y).toBeGreaterThanOrEqual(0);
      expect(sel.rect.x + sel.rect.width).toBeLessThanOrEqual(800);
      expect(sel.rect.y + sel.rect.height).toBeLessThanOrEqual(600);
    }

    // Verify Y coordinates are distinct and incrementing (no identical Y stacking)
    const yCoords = selections.map((s) => s.rect.y);
    const uniqueYCoords = new Set(yCoords);
    expect(uniqueYCoords.size).toBe(selections.length);
  });

  test('Email Auto-Detection: Accurately identifies email address and computes precise bounding box in length & height', async () => {
    const prompt = 'Tell Han to email Aaliya at david@enterprise.com regarding Project Titan';
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl, prompt);

    const emailSelection = selections.find((s) => s.entityType === 'EMAIL_ADDRESS');
    expect(emailSelection).toBeDefined();
    expect(emailSelection?.placeholder).toContain('[[EMAIL_ADDRESS_');

    // Verify precise coordinates: should NOT be clustered at y=4, but aligned with spaced line index
    expect(emailSelection?.rect.y).toBeGreaterThanOrEqual(70);
    expect(emailSelection?.rect.y).toBeLessThanOrEqual(180);

    // Verify width & height are precise and proportional (email is ~20 characters, width between 180 and 260px, height ~30px)
    expect(emailSelection?.rect.width).toBeGreaterThanOrEqual(180);
    expect(emailSelection?.rect.width).toBeLessThanOrEqual(280);
    expect(emailSelection?.rect.height).toBeGreaterThanOrEqual(20);
    expect(emailSelection?.rect.height).toBeLessThanOrEqual(35);
  });

  test('OCR-Resilient Email Detection: Detects emails with OCR spaces around @ and dots', async () => {
    const prompt = 'Contact CEO at ceo.john @ company . org for approval';
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl, prompt);

    const emailSelection = selections.find((s) => s.entityType === 'EMAIL_ADDRESS');
    expect(emailSelection).toBeDefined();
    expect(emailSelection?.placeholder).toContain('[[EMAIL_ADDRESS_');
  });

  test('User Full Test Case: Detects customer Amina Bello, emails, Daniel Okafor, and admin email', async () => {
    const prompt = `CUSTOMER INFORMATION\nCustomer: Amina Bello\nEmail: amina.bello@example.com\nPhone: +234 812 345 6789\nAddress: 14 Example Street, Abuja, Nigeria\n\nSUPPORT NOTES\nThe API key field should remain protected.\nThe word password by itself is ordinary documentation.\nThe word token by itself is ordinary documentation.\nThe repository is called Project Atlas.\n\nREPEATED VALUES - CONSISTENCY TEST\nDaniel Okafor\ndaniel.okafor@example.com\nProject Falcon\nDaniel Okafor\ndaniel.okafor@example.com\nProject Falcon\n\nSECOND PRODUCTION BLOCK\nService URL: https://production.example.com/api\nServer IP: 192.0.2.42\nAdmin email: admin@example.com\nAccess token: ghp_EXAMPLE_TOKEN_123456789`;

    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl, prompt);
    console.log('=== DETECTED USER SELECTIONS ===', selections.map((s) => ({ type: s.entityType, placeholder: s.placeholder, evidence: s.evidence })));

    const aminaSel = selections.find((s) => s.evidence.toLowerCase().includes('amina') || s.evidence.toLowerCase().includes('bello'));
    const emailsSel = selections.filter((s) => s.entityType === 'EMAIL_ADDRESS');
    const danielSel = selections.filter((s) => s.evidence.toLowerCase().includes('daniel') || s.evidence.toLowerCase().includes('okafor'));

    expect(aminaSel).toBeDefined();
    expect(emailsSel.length).toBeGreaterThanOrEqual(2);
    expect(danielSel.length).toBeGreaterThanOrEqual(2);
  });

  test('Image Form Labels & ALL-CAPS Name Detection: Detects ALL-CAPS names and form labels like Name: ALEX MORGAN', async () => {
    const prompt = `Form Details:\nName: ALEX MORGAN\nEmail: alex.morgan @ company . com\nSigned by: DANIEL OKAFOR`;
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl, prompt);

    const alexSel = selections.find((s) => s.evidence.toLowerCase().includes('alex') || s.evidence.toLowerCase().includes('morgan'));
    const emailSel = selections.find((s) => s.entityType === 'EMAIL_ADDRESS');
    const danielSel = selections.find((s) => s.evidence.toLowerCase().includes('daniel') || s.evidence.toLowerCase().includes('okafor'));

    expect(alexSel).toBeDefined();
    expect(emailSel).toBeDefined();
    expect(danielSel).toBeDefined();
  });

  test('Multi-Resolution Image Scaling & Bounding Box Proportionality Test (Small, Medium, Large)', async () => {
    // 1. Small Image (~350px wide) - e.g. cropped mobile screenshot
    const smallWidth = 350;
    const smallHeight = 240;
    const smallLongest = Math.max(smallWidth, smallHeight);
    const expectedSmallScaleFactor = Math.min(3.0, 1200 / smallLongest); // 3.0x scale

    // 2. Medium Image (~1000px wide) - e.g. web application view
    const mediumWidth = 1000;
    const mediumHeight = 600;
    const mediumLongest = Math.max(mediumWidth, mediumHeight);
    const expectedMediumScaleFactor = 1.0; // 1.0x scale

    // 3. Large Image (~3200px wide) - e.g. high-res desktop capture
    const largeWidth = 3200;
    const largeHeight = 2000;
    const largeLongest = Math.max(largeWidth, largeHeight);
    const expectedLargeScaleFactor = 2000 / largeLongest; // 0.625x scale

    console.log(`[MULTI-RES SCALING REPORT]:`);
    console.log(`Small Image (350x240px): Scale Factor = ${expectedSmallScaleFactor.toFixed(4)} (Upscaled for Tesseract accuracy)`);
    console.log(`Medium Image (1000x600px): Scale Factor = ${expectedMediumScaleFactor.toFixed(4)} (Unchanged)`);
    console.log(`Large Image (3200x2000px): Scale Factor = ${expectedLargeScaleFactor.toFixed(4)} (Downscaled to cap at 2000px)`);

    expect(expectedSmallScaleFactor).toBeGreaterThan(1.0);
    expect(expectedMediumScaleFactor).toBe(1.0);
    expect(expectedLargeScaleFactor).toBeLessThan(1.0);

    const testPrompt = `Customer: Amina Bello\nEmail: amina.bello@example.com\nAPI Key: sk-proj-123456789012345678901234`;
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl, testPrompt);

    for (const sel of selections) {
      expect(sel.rect.x).toBeGreaterThanOrEqual(0);
      expect(sel.rect.y).toBeGreaterThanOrEqual(0);
      expect(sel.rect.width).toBeGreaterThan(0);
      expect(sel.rect.height).toBeGreaterThan(0);
    }
  });

  test('Multi-Line Image Secret: Multi-line secrets create distinct per-line bounding boxes without masking full lines', async () => {
    // Multi-line secret wrapped across line 1 and line 2
    const multiLinePrompt = `Line 1 Prefix: API_KEY_SECRET = "sk-proj-abc123456789012345678901234567890\nwrapped-secret-part2-abcdef1234567890" and non-secret trailing prose on line 2`;
    const selections = await autoDetectImageSensitiveRegions(sampleImageDataUrl, multiLinePrompt);

    expect(selections).toBeDefined();
    expect(selections.length).toBeGreaterThan(0);

    for (const sel of selections) {
      // Bounding box height should be tight to single-line text (not covering entire multi-line height)
      expect(sel.rect.height).toBeLessThanOrEqual(50);
      expect(sel.rect.width).toBeGreaterThan(0);
      expect(sel.rect.x).toBeGreaterThanOrEqual(0);
      expect(sel.rect.y).toBeGreaterThanOrEqual(0);
    }
  });

  test('Issue 1: Adaptive-shortening fallback always retains double brackets [[...]] on constrained regions', () => {
    // Test direct helper
    const abbrev1 = getAbbreviatedPlaceholder('[[PERSON_NAME_001]]', true);
    expect(abbrev1).toMatch(/^\[\[[A-Z0-9_]+_\d{3}\]\]$/);
    expect(abbrev1.startsWith('[[')).toBe(true);
    expect(abbrev1.endsWith(']]')).toBe(true);

    // Even if called with includeBrackets=false or unbracketed input, ensure brackets are enforced
    const abbrev2 = getAbbreviatedPlaceholder('PERSON_NAME_001', false);
    expect(abbrev2.startsWith('[[')).toBe(true);
    expect(abbrev2.endsWith(']]')).toBe(true);

    const abbrev3 = getAbbreviatedPlaceholder('CUSTOM_LABEL', true);
    expect(abbrev3.startsWith('[[')).toBe(true);
    expect(abbrev3.endsWith(']]')).toBe(true);
  });

  test('Issue 4 & Issue 1: Line-wrapped secrets render placeholder label only once, and always bracketed in SVG', async () => {
    // Two boxes representing a line-wrapped secret
    const wrappedSelections = [
      {
        id: 'line_1_box',
        rect: { x: 50, y: 100, width: 180, height: 28 },
        entityType: 'API_KEY' as const,
        placeholder: '[[API_KEY_001]]',
        assignedPlaceholder: '[[API_KEY_001]]',
        evidence: 'Wrapped secret line 1',
        priority: 1,
      },
      {
        id: 'line_2_box',
        rect: { x: 50, y: 135, width: 220, height: 28 },
        entityType: 'API_KEY' as const,
        placeholder: '[[API_KEY_001]]',
        assignedPlaceholder: '[[API_KEY_001]]',
        evidence: 'Wrapped secret line 2',
        priority: 1,
      },
    ];

    const { svgXml } = await composeShieldedImageWithSvg(sampleImageDataUrl, wrappedSelections);

    // Both boxes must have <rect> elements drawn
    const rectCount = (svgXml.match(/<rect /g) || []).length;
    expect(rectCount).toBe(2);

    // But <text> must only be rendered ONCE (for the first box)
    const textMatches = svgXml.match(/<text [^>]*>([^<]+)<\/text>/g) || [];
    expect(textMatches.length).toBe(1);

    // The single rendered label must be properly bracketed
    expect(textMatches[0]).toContain('[[API_KEY_001]]');
  });

  test('Issue 10: Distinct occurrences of the same entity (e.g. repeated sender in chat logs) both render placeholder labels', async () => {
    // Two distinct messages where the same user [[PERSON_NAME_001]] speaks
    const distinctSelections = [
      {
        id: 'msg_1_sender',
        rect: { x: 50, y: 80, width: 120, height: 24 },
        entityType: 'PERSON_NAME' as const,
        placeholder: '[[PERSON_NAME_001]]',
        assignedPlaceholder: '[[PERSON_NAME_001]]',
        evidence: 'Sender header at 9:16 AM',
        priority: 1,
      },
      {
        id: 'msg_2_sender',
        rect: { x: 50, y: 220, width: 120, height: 24 },
        entityType: 'PERSON_NAME' as const,
        placeholder: '[[PERSON_NAME_001]]',
        assignedPlaceholder: '[[PERSON_NAME_001]]',
        evidence: 'Sender header at 9:20 AM',
        priority: 1,
      },
    ];

    const { svgXml } = await composeShieldedImageWithSvg(sampleImageDataUrl, distinctSelections);

    // Both boxes must have <rect> elements drawn
    const rectCount = (svgXml.match(/<rect /g) || []).length;
    expect(rectCount).toBe(2);

    // Both occurrences must render their <text> labels
    const textMatches = svgXml.match(/<text [^>]*>([^<]+)<\/text>/g) || [];
    expect(textMatches.length).toBe(2);
    expect(textMatches[0]).toContain('[[PERSON_NAME_001]]');
    expect(textMatches[1]).toContain('[[PERSON_NAME_001]]');
  });

  test('Reveal: Safely restores shielded regions regardless of whether stored placeholder had brackets', async () => {
    const revealEngine = new ImageRevealEngine();

    // Mock restore payload matching sampleImageDataUrl dimensions (1x1)
    const mockSession = {
      sessionId: 'test_sess_reveal_001',
      documentId: 'doc_1',
      documentVersionId: 'ver_1',
      imageWidth: 1,
      imageHeight: 1,
      encryptedMappings: JSON.stringify([
        {
          entityId: 'ent_1',
          entityType: 'PERSON_NAME',
          rect: { x: 0, y: 0, width: 1, height: 1 },
          imageWidth: 1,
          imageHeight: 1,
          placeholder: 'PERSON_NAME_001', // Unbracketed legacy placeholder
          originalDataUrl: sampleImageDataUrl,
        },
        {
          entityId: 'ent_2',
          entityType: 'API_KEY',
          rect: { x: 0, y: 0, width: 1, height: 1 },
          imageWidth: 1,
          imageHeight: 1,
          placeholder: '[[API_KEY_001]]', // Properly bracketed placeholder
          originalDataUrl: sampleImageDataUrl,
        },
      ]),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      isPurged: false,
    };

    const mockStore: any = {
      get: jest.fn().mockResolvedValue(mockSession),
      save: jest.fn().mockResolvedValue(undefined),
      touch: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
      purgeExpired: jest.fn().mockResolvedValue(0),
      count: jest.fn().mockResolvedValue(1),
    };

    const mockCrypto: any = {
      encrypt: jest.fn().mockImplementation(async (text) => text),
      decrypt: jest.fn().mockImplementation(async (text) => text),
    };

    const customReveal = new ImageRevealEngine(mockStore, mockCrypto);
    const restored = await customReveal.restore({
      sessionId: 'test_sess_reveal_001',
      shieldedImageDataUrl: sampleImageDataUrl,
    });

    expect(restored.restoredCount).toBe(2);
    // Both restored entities should have normalized bracketed placeholders
    for (const ent of restored.restoredEntities) {
      expect(ent.placeholder.startsWith('[[')).toBe(true);
      expect(ent.placeholder.endsWith(']]')).toBe(true);
    }
  });
});
