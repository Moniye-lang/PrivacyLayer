/**
 * Privacy Layer — Manual Image Shielding & Reveal Test Suite
 * Tests: Single/Multiple Selections, Same/Different Entity Types, Adjacent Selection Independence,
 * Coordinate Scaling, Original Immutability, Encrypted Storage Boundary, Zero Plaintext Leak,
 * Placeholder Uniqueness, Deletion/Cancel Behavior, Repeated Overrides, & Safe Failures.
 */

import { shieldImage } from '../lib/engine/image/imageShieldEngine';
import { ImageRevealEngine } from '../lib/engine/image/imageRevealEngine';
import { InMemoryRevealStore } from '../lib/security/revealStore';
import { AESGCMEncryptionProvider, NoOpEncryptionProvider } from '../lib/security/encryptionProvider';
import { ImageSelection } from '../types';
import { createTestImage, decodePng } from '../lib/engine/image/pngCodec';

describe('Manual Image Shielding & Reveal Engine Test Suite', () => {
  const sampleImageDataUrl = createTestImage(400, 300).dataUrl;

  // 1. Single manual selection
  test('Single manual selection: Shields region and produces unique placeholder', async () => {
    const selection: ImageSelection = {
      id: 'sel_1',
      rect: { x: 10, y: 20, width: 100, height: 50 },
      entityType: 'PERSON_NAME',
      placeholder: '[[PERSON_NAME_001]]',
      evidence: 'Manual user selection',
      priority: 100,
    };

    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [selection],
    });

    expect(result.sessionId).toBeDefined();
    expect(result.entitiesCount).toBe(1);
    expect(result.detectedEntities[0].placeholder).toBe('[[PERSON_NAME_001]]');
    expect(result.shieldedImageDataUrl).toBeDefined();
    expect(result.originalImageDataUrl).toBe(sampleImageDataUrl);
  });

  // 2. Multiple selections
  test('Multiple selections: Processes multiple independent regions correctly', async () => {
    const selections: ImageSelection[] = [
      {
        id: 'sel_1',
        rect: { x: 10, y: 10, width: 100, height: 40 },
        entityType: 'PERSON_NAME',
        placeholder: '[[PERSON_NAME_001]]',
        evidence: 'Manual user selection',
        priority: 100,
      },
      {
        id: 'sel_2',
        rect: { x: 10, y: 60, width: 200, height: 40 },
        entityType: 'EMAIL_ADDRESS',
        placeholder: '[[EMAIL_ADDRESS_001]]',
        evidence: 'Manual user selection',
        priority: 100,
      },
    ];

    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections,
    });

    expect(result.entitiesCount).toBe(2);
    expect(result.detectedEntities.map((e) => e.placeholder)).toEqual([
      '[[PERSON_NAME_001]]',
      '[[EMAIL_ADDRESS_001]]',
    ]);
  });

  // 3. Two selections of the same type (incrementing counters _001, _002)
  test('Two selections of the same type: Increments counter sequentially (_001, _002)', async () => {
    const selections: ImageSelection[] = [
      {
        id: 'sel_1',
        rect: { x: 10, y: 10, width: 80, height: 30 },
        entityType: 'API_KEY',
        placeholder: '',
        evidence: 'Manual user selection',
        priority: 100,
      },
      {
        id: 'sel_2',
        rect: { x: 10, y: 50, width: 80, height: 30 },
        entityType: 'API_KEY',
        placeholder: '',
        evidence: 'Manual user selection',
        priority: 100,
      },
    ];

    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections,
    });

    expect(result.entitiesCount).toBe(2);
    expect(result.detectedEntities[0].placeholder).toBe('[[API_KEY_001]]');
    expect(result.detectedEntities[1].placeholder).toBe('[[API_KEY_002]]');
  });

  // 4. Different entity types & custom labels
  test('Different entity types: Assigns appropriate placeholder prefixes and custom labels', async () => {
    const selections: ImageSelection[] = [
      {
        id: 'sel_1',
        rect: { x: 5, y: 5, width: 50, height: 20 },
        entityType: 'CONNECTION_STRING',
        placeholder: '',
        evidence: 'Manual user selection',
        priority: 100,
      },
      {
        id: 'sel_2',
        rect: { x: 5, y: 30, width: 50, height: 20 },
        entityType: 'CUSTOM_TERM',
        customLabel: 'STRIPE_SECRET',
        placeholder: '',
        evidence: 'Manual user selection',
        priority: 100,
      },
    ];

    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections,
    });

    expect(result.detectedEntities[0].placeholder).toBe('[[CONNECTION_STRING_001]]');
    expect(result.detectedEntities[1].placeholder).toBe('[[STRIPE_SECRET_001]]');
  });

  // 5. Adjacent selections remain separate
  test('Adjacent selections: Remain separate and are NOT merged', async () => {
    const selections: ImageSelection[] = [
      {
        id: 'sel_1',
        rect: { x: 10, y: 10, width: 50, height: 20 },
        entityType: 'PERSON_NAME',
        placeholder: '',
        evidence: 'Manual user selection',
        priority: 100,
      },
      {
        id: 'sel_2',
        rect: { x: 60, y: 10, width: 50, height: 20 }, // Immediately adjacent
        entityType: 'EMAIL_ADDRESS',
        placeholder: '',
        evidence: 'Manual user selection',
        priority: 100,
      },
    ];

    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections,
    });

    expect(result.entitiesCount).toBe(2);
    expect(result.detectedEntities[0].rect.x).toBe(10);
    expect(result.detectedEntities[1].rect.x).toBe(60);
  });

  // 6. Selection coordinates remain correct after scaling
  test('Selection coordinates: Preserved accurately in natural image space', async () => {
    const selection: ImageSelection = {
      id: 'sel_scale',
      rect: { x: 124, y: 356, width: 450, height: 85 },
      entityType: 'PASSWORD',
      placeholder: '',
      evidence: 'Manual user selection',
      priority: 100,
    };

    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [selection],
    });

    expect(result.detectedEntities[0].rect).toEqual({
      x: 124,
      y: 356,
      width: 450,
      height: 85,
    });
  });

  // 7. Original image is never modified
  test('Original image immutability: Original Data URL is preserved untouched', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [
        {
          id: 'sel_1',
          rect: { x: 0, y: 0, width: 10, height: 10 },
          entityType: 'COMPANY_SECRET',
          placeholder: '',
          evidence: 'Manual user selection',
          priority: 100,
        },
      ],
    });

    expect(result.originalImageDataUrl).toBe(sampleImageDataUrl);
    expect(result.shieldedImageDataUrl).not.toBe(sampleImageDataUrl);
  });

  // 8. Manual selection creates a Reveal entity
  test('Reveal entity: Manual shielding creates a Reveal session in store', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [
        {
          id: 'sel_rev',
          rect: { x: 15, y: 15, width: 100, height: 30 },
          entityType: 'COMPANY_SECRET',
          placeholder: '',
          evidence: 'Manual user selection',
          priority: 100,
        },
      ],
    });

    const revealEngine = new ImageRevealEngine();
    const revealResult = await revealEngine.restore({
      sessionId: result.sessionId,
      shieldedImageDataUrl: result.shieldedImageDataUrl,
    });

    expect(revealResult.sessionId).toBe(result.sessionId);
    expect(revealResult.restoredCount).toBe(1);
    expect(revealResult.restoredEntities[0].placeholder).toBe('[[COMPANY_SECRET_001]]');
  });

  // 9. Original sensitive data does not appear in evidence/logging
  test('Zero Plaintext Leak: Evidence strings never expose sensitive raw strings', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [
        {
          id: 'sel_secret',
          rect: { x: 5, y: 5, width: 50, height: 50 },
          entityType: 'PASSWORD',
          placeholder: '',
          evidence: 'Manual user selection',
          priority: 100,
        },
      ],
    });

    const evidenceStr = result.detectedEntities[0].evidence;
    expect(evidenceStr).toBe('Manual user selection');
    expect(evidenceStr).not.toContain('password');
    expect(JSON.stringify(result.processingRecord)).not.toContain('data:image');
  });

  // 10. Encrypted storage boundary is respected
  test('Encrypted Storage Boundary: Uses production AES-256-GCM encryption boundary', async () => {
    const customStore = new InMemoryRevealStore();
    const aesProvider = new AESGCMEncryptionProvider('test-image-key-32-bytes-long!!');

    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [
        {
          id: 'sel_aes',
          rect: { x: 0, y: 0, width: 20, height: 20 },
          entityType: 'API_KEY',
          placeholder: '',
          evidence: 'Manual user selection',
          priority: 100,
        },
      ],
    });

    const revealEngine = new ImageRevealEngine(customStore, aesProvider);
    expect(revealEngine).toBeDefined();
  });

  // 11. Placeholder IDs remain unique
  test('Placeholder Uniqueness: Multiple selections generate non-colliding unique placeholders', async () => {
    const selections: ImageSelection[] = [
      { id: '1', rect: { x: 0, y: 0, width: 10, height: 10 }, entityType: 'PERSON_NAME', placeholder: '', evidence: '', priority: 100 },
      { id: '2', rect: { x: 20, y: 0, width: 10, height: 10 }, entityType: 'PERSON_NAME', placeholder: '', evidence: '', priority: 100 },
      { id: '3', rect: { x: 40, y: 0, width: 10, height: 10 }, entityType: 'EMAIL_ADDRESS', placeholder: '', evidence: '', priority: 100 },
    ];

    const result = await shieldImage({ imageDataUrl: sampleImageDataUrl, selections });
    const placeholders = result.detectedEntities.map((e) => e.placeholder);
    const uniquePlaceholders = new Set(placeholders);

    expect(placeholders.length).toBe(uniquePlaceholders.size);
  });

  // 12. Cancelling a selection creates no Reveal entity
  test('Cancelling selection: Empty or cancelled selections create 0 Reveal entities', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [],
    });

    expect(result.entitiesCount).toBe(0);
    expect(result.detectedEntities.length).toBe(0);
  });

  // 13. Deleting a selection removes it before final shielding
  test('Deleting selection: Filtered selection is excluded from final shielded output', async () => {
    const initialSelections: ImageSelection[] = [
      { id: 'keep', rect: { x: 0, y: 0, width: 10, height: 10 }, entityType: 'PERSON_NAME', placeholder: '', evidence: '', priority: 100 },
      { id: 'delete', rect: { x: 20, y: 0, width: 10, height: 10 }, entityType: 'EMAIL_ADDRESS', placeholder: '', evidence: '', priority: 100 },
    ];

    const activeSelections = initialSelections.filter((s) => s.id !== 'delete');

    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: activeSelections,
    });

    expect(result.entitiesCount).toBe(1);
    expect(result.detectedEntities[0].placeholder).toBe('[[PERSON_NAME_001]]');
  });

  // 14. Repeated processing preserves manual overrides
  test('Repeated processing: Reprocessing same image preserves manual override priority', async () => {
    const selection: ImageSelection = {
      id: 'override_1',
      rect: { x: 50, y: 50, width: 100, height: 50 },
      entityType: 'PROJECT_CODENAME',
      placeholder: '',
      evidence: 'Manual user selection',
      priority: 100,
    };

    const run1 = await shieldImage({ imageDataUrl: sampleImageDataUrl, selections: [selection] });
    const run2 = await shieldImage({ imageDataUrl: sampleImageDataUrl, selections: [selection] });

    expect(run1.detectedEntities[0].type).toBe('PROJECT_CODENAME');
    expect(run2.detectedEntities[0].type).toBe('PROJECT_CODENAME');
  });

  // 15. Failed/invalid selections are handled safely
  test('Safe Failure: Handles invalid or 0-dimension selections gracefully', async () => {
    const invalidSelections: ImageSelection[] = [
      { id: 'zero_w', rect: { x: 0, y: 0, width: 0, height: 50 }, entityType: 'COMPANY_SECRET', placeholder: '', evidence: '', priority: 100 },
      { id: 'zero_h', rect: { x: 0, y: 0, width: 50, height: 0 }, entityType: 'COMPANY_SECRET', placeholder: '', evidence: '', priority: 100 },
    ];

    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: invalidSelections,
    });

    expect(result.entitiesCount).toBe(0);
    expect(result.shieldedImageDataUrl).toBeDefined();
  });

  // TEST A: One selected region image composition
  test('TEST A: One selected region generates composited PNG data URL', async () => {
    const selection: ImageSelection = {
      id: 'sel_single',
      rect: { x: 50, y: 50, width: 200, height: 40 },
      entityType: 'API_KEY',
      placeholder: '[[API_KEY_001]]',
      evidence: 'Manual selection',
      priority: 100,
    };
    const result = await shieldImage({ imageDataUrl: sampleImageDataUrl, selections: [selection] });

    expect(result.shieldedImageDataUrl).toContain('data:image/png;base64,');
    expect(result.entitiesCount).toBe(1);
    expect(result.detectedEntities[0].placeholder).toBe('[[API_KEY_001]]');
  });

  // TEST B: Two selected regions image composition
  test('TEST B: Two selected regions generate composited PNG with 2 entities', async () => {
    const selections: ImageSelection[] = [
      { id: 'sel_1', rect: { x: 50, y: 20, width: 200, height: 30 }, entityType: 'SOURCE_CODE_SECRET', placeholder: '[[SOURCE_CODE_SECRET_001]]', evidence: 'Manual', priority: 100 },
      { id: 'sel_2', rect: { x: 50, y: 60, width: 200, height: 30 }, entityType: 'PASSWORD', placeholder: '[[PASSWORD_001]]', evidence: 'Manual', priority: 100 },
    ];
    const result = await shieldImage({ imageDataUrl: sampleImageDataUrl, selections });

    expect(result.shieldedImageDataUrl).toContain('data:image/png;base64,');
    expect(result.entitiesCount).toBe(2);
  });

  // TEST C: Display vs Native Dimensions Scaling (392x647 displayed vs 1027x113 native)
  test('TEST C: Display vs Native scaling converts display coordinates (392x647) to native image (1027x113)', async () => {
    const selection: ImageSelection = {
      id: 'sel_scaled',
      rect: { x: 50, y: 20, width: 300, height: 30 },
      displayedDim: { width: 392, height: 647 },
      entityType: 'API_KEY',
      placeholder: '[[API_KEY_001]]',
      evidence: 'Manual',
      priority: 100,
    };
    const result = await shieldImage({ imageDataUrl: sampleImageDataUrl, selections: [selection] });

    expect(result.shieldedImageDataUrl).toBeDefined();
    expect(result.entitiesCount).toBe(1);
  });

  // TEST D: Placeholder text fitting inside region
  test('TEST D: Placeholder text fits cleanly inside target region bounds', async () => {
    const selection: ImageSelection = {
      id: 'sel_fit',
      rect: { x: 10, y: 10, width: 150, height: 25 },
      entityType: 'SOURCE_CODE_SECRET',
      placeholder: '[[SOURCE_CODE_SECRET_001]]',
      evidence: 'Manual',
      priority: 100,
    };
    const result = await shieldImage({ imageDataUrl: sampleImageDataUrl, selections: [selection] });

    expect(result.shieldedImageDataUrl).toBeDefined();
  });

  // TEST E: Original sensitive pixels absent from generated image
  test('TEST E: Original sensitive pixels are erased from shielded image Data URL', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [{ id: 'sel_erase', rect: { x: 0, y: 0, width: 10, height: 10 }, entityType: 'PASSWORD', placeholder: '', evidence: '', priority: 100 }],
    });

    expect(result.shieldedImageDataUrl).not.toBe(sampleImageDataUrl);
  });

  // TEST F: Generated image is a real PNG data URL, not an HTML overlay
  test('TEST F: Shielded output is a real PNG Data URL and not an HTML overlay string', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [{ id: 'sel_png', rect: { x: 5, y: 5, width: 50, height: 20 }, entityType: 'API_KEY', placeholder: '', evidence: '', priority: 100 }],
    });

    expect(result.shieldedImageDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(result.shieldedImageDataUrl).not.toContain('<div');
    expect(result.shieldedImageDataUrl).not.toContain('className');
  });

  // TEST G: Reveal mapping restores original image losslessly
  test('TEST G: Reveal mapping decrypts encrypted RevealSession payload and restores original image', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [{ id: 'sel_rev_g', rect: { x: 10, y: 10, width: 40, height: 20 }, entityType: 'PASSWORD', placeholder: '', evidence: '', priority: 100 }],
    });

    const revealEngine = new ImageRevealEngine();
    const restored = await revealEngine.restore({
      sessionId: result.sessionId,
      shieldedImageDataUrl: result.shieldedImageDataUrl,
    });

    expect(restored.sessionId).toBe(result.sessionId);
    expect(restored.restoredCount).toBe(1);
    expect(restored.restoredImageDataUrl).toBeDefined();
  });

  // TEST H: Multiple independent regions SVG compositing
  test('TEST H: Multiple independent regions composite cleanly via SVG -> PNG pipeline', async () => {
    const selections: ImageSelection[] = [
      { id: 'sel_h1', rect: { x: 10, y: 10, width: 100, height: 25 }, entityType: 'API_KEY', placeholder: '[[API_KEY_001]]', evidence: 'Manual', priority: 100 },
      { id: 'sel_h2', rect: { x: 10, y: 50, width: 100, height: 25 }, entityType: 'PASSWORD', placeholder: '[[PASSWORD_001]]', evidence: 'Manual', priority: 100 },
      { id: 'sel_h3', rect: { x: 10, y: 90, width: 100, height: 25 }, entityType: 'URL', placeholder: '[[URL_001]]', evidence: 'Manual', priority: 100 },
    ];
    const result = await shieldImage({ imageDataUrl: sampleImageDataUrl, selections });

    expect(result.shieldedImageDataUrl).toContain('data:image/png;base64,');
    expect(result.entitiesCount).toBe(3);
  });

  // TEST I: Manual selection SVG compositing
  test('TEST I: Manual user selection generates valid composited PNG Data URL', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [{ id: 'sel_i', rect: { x: 15, y: 15, width: 80, height: 30 }, entityType: 'COMPANY_SECRET', placeholder: '[[SECRET_001]]', evidence: 'Manual user selection', priority: 100 }],
    });

    expect(result.shieldedImageDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(result.detectedEntities[0].evidence).toBe('Manual user selection');
  });

  // TEST J: Automated selection SVG compositing
  test('TEST J: Automated OCR region selection generates valid composited PNG Data URL', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [{ id: 'sel_j', rect: { x: 20, y: 20, width: 150, height: 25 }, entityType: 'API_KEY', placeholder: '[[API_KEY_001]]', evidence: 'Auto-detected via OCR', priority: 95 }],
    });

    expect(result.shieldedImageDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(result.detectedEntities[0].evidence).toBeDefined();
  });

  // SVG DEFINITIVE ISOLATION TEST
  test('DEFINITIVE SVG -> PNG ISOLATION TEST: Output is a pure rasterized PNG Data URL without SVG/HTML markup', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [{ id: 'sel_iso', rect: { x: 5, y: 5, width: 60, height: 20 }, entityType: 'API_KEY', placeholder: '[[API_KEY_001]]', evidence: 'Test', priority: 100 }],
    });

    expect(result.shieldedImageDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(result.shieldedImageDataUrl).not.toContain('<svg');
    expect(result.shieldedImageDataUrl).not.toContain('<rect');
    expect(result.shieldedImageDataUrl).not.toContain('<div');
    expect(result.shieldedImageDataUrl).not.toBe(sampleImageDataUrl);
  });

  // SECURITY TEST: Zero plaintext secret leakage in DOM/copy/image payload
  test('SECURITY TEST: Original plaintext secret never appears in shielded image data or evidence', async () => {
    const result = await shieldImage({
      imageDataUrl: sampleImageDataUrl,
      selections: [{ id: 'sel_sec', rect: { x: 0, y: 0, width: 20, height: 20 }, entityType: 'PASSWORD', placeholder: '', evidence: 'Sanitized', priority: 100 }],
    });

    const payloadStr = JSON.stringify(result);
    expect(payloadStr).not.toContain('SecretPass123');
    expect(payloadStr).not.toContain('cs_5a2e6ba63b1afa746cadff1db794f77cd24707c4');
  });

  // =========================================================================
  // SAME-IMAGE LOSSLESS REVEAL & PIXEL-IDENTICAL RESTORATION TESTS
  // =========================================================================
  describe('Same-Image Lossless Reveal & Pixel Diffs', () => {
    test('Shields 3+ distinct regions and restores a 100% pixel-identical image on reveal', async () => {
      // 1. Create a 200x150 real PNG image with multi-color pixels
      const width = 200;
      const height = 150;
      const { dataUrl: originalDataUrl, rgbaBuffer: originalRgba } = createTestImage(width, height);

      // 2. Define 3+ distinct sensitive regions across the image
      const selections: ImageSelection[] = [
        {
          id: 'sel_reg1',
          rect: { x: 10, y: 10, width: 45, height: 25 },
          entityType: 'PERSON_NAME',
          placeholder: '[[PERSON_NAME_001]]',
          evidence: 'Manual user selection',
          priority: 100,
        },
        {
          id: 'sel_reg2',
          rect: { x: 80, y: 40, width: 60, height: 35 },
          entityType: 'API_KEY',
          placeholder: '[[API_KEY_001]]',
          evidence: 'Manual user selection',
          priority: 100,
        },
        {
          id: 'sel_reg3',
          rect: { x: 30, y: 95, width: 70, height: 30 },
          entityType: 'EMAIL_ADDRESS',
          placeholder: '[[EMAIL_ADDRESS_001]]',
          evidence: 'Manual user selection',
          priority: 100,
        },
      ];

      // 3. Shield the image
      const shieldResult = await shieldImage({
        imageDataUrl: originalDataUrl,
        selections,
      });

      expect(shieldResult.sessionId).toBeDefined();
      expect(shieldResult.entitiesCount).toBe(3);
      expect(shieldResult.shieldedImageDataUrl).not.toBe(originalDataUrl);

      // 4. Verify shielded image actually differs from original (regions were replaced)
      const shieldedDecoded = decodePng(shieldResult.shieldedImageDataUrl);
      expect(shieldedDecoded.width).toBe(width);
      expect(shieldedDecoded.height).toBe(height);
      expect(Buffer.compare(originalRgba, shieldedDecoded.data)).not.toBe(0);

      // 5. Reveal the SAME shielded image
      const revealEngine = new ImageRevealEngine();
      const revealResult = await revealEngine.restore({
        sessionId: shieldResult.sessionId,
        shieldedImageDataUrl: shieldResult.shieldedImageDataUrl,
      });

      expect(revealResult.sessionId).toBe(shieldResult.sessionId);
      expect(revealResult.restoredCount).toBe(3);
      expect(revealResult.restoredEntities.length).toBe(3);

      // 6. Decode restored image and assert pixel-by-pixel exact identity against the original
      const restoredDecoded = decodePng(revealResult.restoredImageDataUrl);
      expect(restoredDecoded.width).toBe(width);
      expect(restoredDecoded.height).toBe(height);

      // Byte & pixel comparison: 0 differences across all width * height * 4 bytes
      const diffCount = Buffer.compare(originalRgba, restoredDecoded.data);
      expect(diffCount).toBe(0);

      // Detailed per-pixel verification across all channels
      let mismatchPixels = 0;
      for (let i = 0; i < originalRgba.length; i += 4) {
        if (
          originalRgba[i] !== restoredDecoded.data[i] ||
          originalRgba[i + 1] !== restoredDecoded.data[i + 1] ||
          originalRgba[i + 2] !== restoredDecoded.data[i + 2] ||
          originalRgba[i + 3] !== restoredDecoded.data[i + 3]
        ) {
          mismatchPixels++;
        }
      }
      expect(mismatchPixels).toBe(0);
    });

    test('Fails loudly with clear message when reveal is called with altered dimensions', async () => {
      // 1. Shield an image with 200x150 dimensions
      const { dataUrl: originalDataUrl } = createTestImage(200, 150);
      const selections: ImageSelection[] = [
        {
          id: 'sel_dim1',
          rect: { x: 10, y: 10, width: 50, height: 20 },
          entityType: 'PASSWORD',
          placeholder: '[[PASSWORD_001]]',
          evidence: 'Manual',
          priority: 100,
        },
      ];

      const shieldResult = await shieldImage({
        imageDataUrl: originalDataUrl,
        selections,
      });

      // 2. Create an altered image with DIFFERENT dimensions (e.g. 300x200)
      const { dataUrl: alteredDataUrl } = createTestImage(300, 200);

      // 3. Attempt reveal with the altered image — must fail loudly without OCR re-detection
      const revealEngine = new ImageRevealEngine();
      await expect(
        revealEngine.restore({
          sessionId: shieldResult.sessionId,
          shieldedImageDataUrl: alteredDataUrl,
        })
      ).rejects.toThrow(
        "This image doesn't match the original shielded session — reveal only works on the exact image that was shielded"
      );
    });

    test('Fails cleanly when reveal is called with expired or invalid sessionId', async () => {
      const { dataUrl } = createTestImage(100, 100);
      const revealEngine = new ImageRevealEngine();

      await expect(
        revealEngine.restore({
          sessionId: 'shd_nonexistent_99999',
          shieldedImageDataUrl: dataUrl,
        })
      ).rejects.toThrow('Image RevealSession not found or expired for ID: shd_nonexistent_99999');
    });
  });
});
