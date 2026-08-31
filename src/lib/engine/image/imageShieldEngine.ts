import {
  EncryptionProvider,
  ImageRect,
  ImageRevealEntity,
  ImageSelection,
  ProcessingRecord,
  RevealSession,
  ShieldImageRequestPayload,
  ShieldImageResponsePayload,
} from '../../../types';
import { AESGCMEncryptionProvider, NoOpEncryptionProvider } from '../../security/encryptionProvider';
import { revealStoreInstance } from '../../security/revealStore';
import { composeShieldedImageWithSvg } from './svgImageCompositor';

const encryptionProvider: EncryptionProvider =
  process.env.NODE_ENV === 'production'
    ? new AESGCMEncryptionProvider()
    : new NoOpEncryptionProvider();

/**
 * Renders placeholder badge over image region using HTML Canvas or Synthetic Base64
 */
export async function renderShieldedImageCanvas(
  imageDataUrl: string,
  selections: (ImageSelection & { assignedPlaceholder: string })[]
): Promise<{ shieldedImageDataUrl: string; imageWidth: number; imageHeight: number; originalCrops: Map<string, string> }> {
  const originalCrops = new Map<string, string>();

  // Browser HTMLCanvasElement execution path
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Failed to get 2D canvas context'));
        }

        // Draw original background
        ctx.drawImage(img, 0, 0, width, height);

        // Extract original crop & render placeholders in native image resolution
        for (const sel of selections) {
          // sel.rect is ALREADY in native image coordinates (0..width, 0..height)
          const x = Math.max(0, Math.min(width - 10, Math.round(sel.rect.x)));
          const y = Math.max(0, Math.min(height - 10, Math.round(sel.rect.y)));
          const rectW = Math.max(20, Math.min(width - x, Math.round(sel.rect.width)));
          const rectH = Math.max(14, Math.min(height - y, Math.round(sel.rect.height)));

          if (rectW <= 0 || rectH <= 0) continue;

          // 1. Extract crop for Reveal restoration payload
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = rectW;
          cropCanvas.height = rectH;
          const cropCtx = cropCanvas.getContext('2d');
          if (cropCtx) {
            cropCtx.drawImage(img, x, y, rectW, rectH, 0, 0, rectW, rectH);
            originalCrops.set(sel.id, cropCanvas.toDataURL('image/png'));
          }

          // 2. Completely erase underlying sensitive pixels from canvas buffer
          ctx.clearRect(x, y, rectW, rectH);
          ctx.fillStyle = '#0f172a'; // Opaque deep slate background
          ctx.fillRect(x, y, rectW, rectH);

          // 3. Render clean 1px fine cyber cyan border badge
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, rectW - 1, rectH - 1);

          // 4. Calculate dynamic font size to fit placeholder text perfectly inside rectW
          const text = sel.assignedPlaceholder;
          const targetWidth = rectW * 0.92;
          let fontSize = Math.max(9, Math.min(14, Math.floor(rectH * 0.55)));
          ctx.font = `bold ${fontSize}px monospace`;
          let measuredWidth = ctx.measureText(text).width;

          while (measuredWidth > targetWidth && fontSize > 7) {
            fontSize -= 0.5;
            ctx.font = `bold ${fontSize}px monospace`;
            measuredWidth = ctx.measureText(text).width;
          }

          // 5. Draw composited inline placeholder text onto canvas PNG buffer
          ctx.fillStyle = '#00f0ff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, x + rectW / 2, y + rectH / 2, targetWidth);
        }

        resolve({
          shieldedImageDataUrl: canvas.toDataURL('image/png'),
          imageWidth: width,
          imageHeight: height,
          originalCrops,
        });
      };
      img.onerror = (err) => reject(new Error('Failed to load image for canvas rendering: ' + String(err)));
      img.src = imageDataUrl;
    });
  }

  // Node.js test / server synthetic rendering fallback
  const mockWidth = 800;
  const mockHeight = 600;

  for (const sel of selections) {
    // Generate synthetic crop indicator for Node.js unit tests
    originalCrops.set(sel.id, `data:image/png;base64,synthetic_crop_${sel.id}_${sel.rect.x}_${sel.rect.y}`);
  }

  return {
    shieldedImageDataUrl: `data:image/png;base64,shielded_image_${Date.now()}_${selections.length}_entities`,
    imageWidth: mockWidth,
    imageHeight: mockHeight,
    originalCrops,
  };
}

/**
 * Main Image Shielding Pipeline Engine
 */
export async function shieldImage(
  payload: ShieldImageRequestPayload
): Promise<ShieldImageResponsePayload> {
  const startTimeMs = Date.now();
  const { imageDataUrl, selections = [], ttlMinutes = 60 } = payload;

  if (!imageDataUrl || !imageDataUrl.trim()) {
    throw new Error('Image data URL is required for shielding');
  }

  const documentId = payload.documentId || `doc_img_${Math.random().toString(36).substring(2, 9)}`;
  const documentVersionId = `ver_v1_shielded_${Date.now()}`;

  // Filter out invalid/cancelled selections
  const validSelections = selections.filter(
    (s) => s && s.rect && s.rect.width > 0 && s.rect.height > 0
  );

  // Assign 1-based incremental 3-digit counters per entity type with consistent value deduplication
  const typeCounters = new Map<string, number>();
  const valueToPlaceholderMap = new Map<string, string>();

  const selectionsWithPlaceholders = validSelections.map((sel) => {
    if (sel.placeholder && sel.placeholder.startsWith('[[')) {
      return {
        ...sel,
        assignedPlaceholder: sel.placeholder,
      };
    }

    const typeKey = (sel.customLabel && sel.customLabel.trim())
      ? sel.customLabel.trim().toUpperCase()
      : (sel.entityType || 'CUSTOM');

    const isGenericEvidence = !sel.evidence || sel.evidence === 'Manual user selection' || sel.evidence.startsWith('Auto-detected via OCR');
    const dedupKey = isGenericEvidence
      ? `${typeKey}_${sel.rect.x}_${sel.rect.y}_${sel.rect.width}_${sel.rect.height}`
      : sel.evidence.toLowerCase();
    let assignedPlaceholder = valueToPlaceholderMap.get(dedupKey);

    if (!assignedPlaceholder) {
      const currentCount = (typeCounters.get(typeKey) || 0) + 1;
      typeCounters.set(typeKey, currentCount);

      const indexStr = String(currentCount).padStart(3, '0');
      assignedPlaceholder = `[[${typeKey}_${indexStr}]]`;
      valueToPlaceholderMap.set(dedupKey, assignedPlaceholder);
    }

    return {
      ...sel,
      assignedPlaceholder,
    };
  });

  // Render shielded image via SVG -> PNG compositor pipeline
  const { shieldedImageDataUrl, originalCrops, nativeWidth, nativeHeight } = await composeShieldedImageWithSvg(
    imageDataUrl,
    selectionsWithPlaceholders
  );

  // Construct encrypted Reveal mapping payload
  const revealEntities: ImageRevealEntity[] = selectionsWithPlaceholders.map((sel) => ({
    entityId: sel.id || `img_ent_${Math.random().toString(36).substring(2, 8)}`,
    entityType: sel.entityType,
    sourceDocumentId: documentId,
    documentVersionId,
    imageWidth: nativeWidth,
    imageHeight: nativeHeight,
    rect: sel.rect,
    originalDataUrl: originalCrops.get(sel.id) || '',
    placeholder: sel.assignedPlaceholder,
  }));

  // Encrypt region mappings payload
  const encryptedMappings = await encryptionProvider.encrypt(JSON.stringify(revealEntities));

  const sessionId = `shd_img_${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

  const revealSession: RevealSession = {
    sessionId,
    documentId,
    documentVersionId,
    imageWidth: nativeWidth,
    imageHeight: nativeHeight,
    encryptedMappings,
    createdAt: now.toISOString(),
    lastActivity: now.toISOString(),
    expiresAt,
    isPurged: false,
  };

  // Save in encrypted RevealStore boundary
  await revealStoreInstance.save(revealSession);

  const executionTimeMs = Math.max(0, Date.now() - startTimeMs);

  const processingRecord: ProcessingRecord = {
    recordId: `rec_img_${Math.random().toString(36).substring(2, 9)}`,
    engineVersion: '2.0.0-deterministic-image',
    detectorsExecuted: ['manual-image-selection'],
    entitiesDetected: validSelections.length,
    entitiesMasked: validSelections.length,
    manualOverrideCount: validSelections.length,
    executionTimeMs,
    timestamp: now.toISOString(),
  };

  const detectedEntities = selectionsWithPlaceholders.map((sel) => ({
    placeholder: sel.assignedPlaceholder,
    type: sel.entityType,
    rect: sel.rect,
    evidence: 'Manual user selection', // Sanitized evidence - zero plaintext leak
  }));

  return {
    sessionId,
    documentId,
    documentVersionId,
    originalImageDataUrl: imageDataUrl,
    shieldedImageDataUrl,
    entitiesCount: validSelections.length,
    detectedEntities,
    processingTimeMs: executionTimeMs,
    expiresAt,
    processingRecord,
  };
}
