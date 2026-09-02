import { ImageSelection } from '../../../types';
import { parseSvgToRegions } from './svgParser';
import { runMultiLayerDetectionPipeline } from '../multiLayerPipeline';

/**
 * Helper to convert a browser blob: URL to a Base64 data URL
 */
async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed reading image blob data'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Downscales large images to a maximum dimension for lightning-fast OCR server scanning.
 */
async function optimizeImageForScan(
  dataUrl: string,
  maxDimension = 1400
): Promise<{ scanUrl: string; scaleFactor: number }> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { scanUrl: dataUrl, scaleFactor: 1.0 };
  }

  // If SVG, return immediately with zero downscaling
  if (dataUrl.includes('data:image/svg+xml') || dataUrl.includes('<svg')) {
    return { scanUrl: dataUrl, scaleFactor: 1.0 };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      if (!origW || !origH || (origW <= maxDimension && origH <= maxDimension)) {
        return resolve({ scanUrl: dataUrl, scaleFactor: 1.0 });
      }

      const scaleFactor = maxDimension / Math.max(origW, origH);
      const scanW = Math.round(origW * scaleFactor);
      const scanH = Math.round(origH * scaleFactor);

      const canvas = document.createElement('canvas');
      canvas.width = scanW;
      canvas.height = scanH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve({ scanUrl: dataUrl, scaleFactor: 1.0 });
      }

      ctx.drawImage(img, 0, 0, scanW, scanH);
      const scanUrl = canvas.toDataURL('image/jpeg', 0.90);
      resolve({ scanUrl, scaleFactor });
    };
    img.onerror = () => resolve({ scanUrl: dataUrl, scaleFactor: 1.0 });
    img.src = dataUrl;
  });
}

/**
 * In-Browser Client-Side Web Worker WASM OCR Fallback
 * Guaranteed to run in 100% of modern browsers with zero backend server dependencies.
 */
async function runBrowserOcrFallback(
  imageDataUrl: string,
  sampleTextFallback?: string
): Promise<ImageSelection[]> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1);
    const ret = await worker.recognize(imageDataUrl, {}, { blocks: true, hocr: true, tsv: true });
    await worker.terminate();

    const textToScan = sampleTextFallback || (ret.data.text && ret.data.text.trim().length > 0 ? ret.data.text : '');
    if (!textToScan || textToScan.trim().length === 0) {
      return [];
    }

    const detectedEntities = await runMultiLayerDetectionPipeline(textToScan);
    if (!detectedEntities || detectedEntities.length === 0) {
      return [];
    }

    const words = (ret.data as any).words || [];
    const selections: ImageSelection[] = [];
    const typeCounters: Record<string, number> = {};
    const valueToPlaceholderMap = new Map<string, string>();

    let globalIndex = 1;
    for (const entity of detectedEntities) {
      const entityText = (entity.text || '').trim();
      if (entityText.length < 3 && !['US', 'UK', 'ID', 'IP'].includes(entityText.toUpperCase())) {
        continue;
      }

      const normalizedValue = entityText.toLowerCase();
      let placeholder = valueToPlaceholderMap.get(normalizedValue);
      const typeKey = entity.type.toUpperCase();

      if (!placeholder) {
        typeCounters[typeKey] = (typeCounters[typeKey] || 0) + 1;
        const typeSeqStr = String(typeCounters[typeKey]).padStart(3, '0');
        placeholder = `[[${typeKey}_${typeSeqStr}]]`;
        valueToPlaceholderMap.set(normalizedValue, placeholder);
      }

      const matchedWords = words.filter((w: any) => {
        const wt = (w.text || '').toLowerCase().trim();
        return wt && (normalizedValue.includes(wt) || wt.includes(normalizedValue));
      });

      if (matchedWords.length > 0) {
        const minX = Math.min(...matchedWords.map((w: any) => w.bbox.x0));
        const minY = Math.min(...matchedWords.map((w: any) => w.bbox.y0));
        const maxX = Math.max(...matchedWords.map((w: any) => w.bbox.x1));
        const maxY = Math.max(...matchedWords.map((w: any) => w.bbox.y1));

        const h = maxY - minY;
        const padX = Math.max(4, Math.round(h * 0.2));
        const padY = Math.max(2, Math.round(h * 0.1));

        selections.push({
          id: `auto_sel_${entity.type.toLowerCase()}_${globalIndex}_${Date.now()}`,
          rect: {
            x: Math.max(0, minX - padX),
            y: Math.max(0, minY - padY),
            width: Math.max(20, (maxX - minX) + padX * 2),
            height: Math.max(14, (maxY - minY) + padY * 2),
          },
          entityType: entity.type,
          placeholder,
          evidence: `Auto-detected via Browser WASM OCR: ${entity.reason}`,
          priority: (entity as any).priority || 95,
        });
      }
      globalIndex++;
    }

    return selections;
  } catch (err) {
    console.warn('[Browser OCR Fallback Execution]:', err);
    return [];
  }
}

/**
 * Hybrid Client-Side Auto-Detect Trigger.
 * 1. Instant client-side SVG fast path (<5ms)
 * 2. High-speed serverless OCR API with 25s timeout
 * 3. Resilient In-Browser WASM OCR fallback if server route is unavailable/restricted
 */
export async function autoDetectImageSensitiveRegions(
  imageDataUrl: string,
  sampleTextFallback?: string
): Promise<ImageSelection[]> {
  let payloadUrl = imageDataUrl;
  if (imageDataUrl && imageDataUrl.startsWith('blob:')) {
    try {
      payloadUrl = await blobUrlToDataUrl(imageDataUrl);
    } catch (err: any) {
      console.warn('Failed to convert blob URL to data URL:', err);
    }
  }

  // 1. Instant Client-Side Fast Path for SVG Images (<5ms)
  if (payloadUrl.includes('data:image/svg+xml') || payloadUrl.includes('<svg')) {
    try {
      let svgText = '';
      if (payloadUrl.includes('base64,')) {
        svgText = atob(payloadUrl.split('base64,')[1]);
      } else {
        svgText = decodeURIComponent(payloadUrl.split('data:image/svg+xml,')[1] || payloadUrl.split('data:image/svg+xml;charset=utf-8,')[1] || payloadUrl);
      }

      const { regions } = parseSvgToRegions(svgText);
      const fullText = regions.map((r) => r.text).join('\n');
      const pipelineEntities = await runMultiLayerDetectionPipeline(fullText);

      const selections: ImageSelection[] = [];
      let globalIndex = 1;

      for (const entity of pipelineEntities) {
        const placeholder = `[[${entity.type}_${String(globalIndex).padStart(3, '0')}]]`;
        const matched = regions.find((r) => r.text.toLowerCase().includes(entity.text.toLowerCase()));
        if (matched) {
          selections.push({
            id: `auto_sel_${entity.type.toLowerCase()}_${globalIndex}_${Date.now()}`,
            rect: matched.rect,
            entityType: entity.type,
            placeholder,
            evidence: `Auto-detected: ${entity.reason}`,
            priority: (entity as any).priority || 95,
          });
        }
        globalIndex++;
      }

      if (selections.length > 0) return selections;
    } catch (e) {
      console.warn('Client SVG fast-path fallback:', e);
    }
  }

  // 2. Serverless OCR Scanning with 25s Timeout Protection
  const { scanUrl, scaleFactor } = await optimizeImageForScan(payloadUrl, 1400);

  const controller = new AbortController();
  let isTimedOut = false;
  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, 25000);

  try {
    const res = await fetch('/api/v1/mask/image/auto-detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl: scanUrl, sampleTextFallback }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Server auto-detect returned status ${res.status}`);
    }

    if (data.success && Array.isArray(data.selections)) {
      if (scaleFactor !== 1.0 && scaleFactor > 0) {
        return data.selections.map((s: ImageSelection) => ({
          ...s,
          rect: {
            x: Math.round(s.rect.x / scaleFactor),
            y: Math.round(s.rect.y / scaleFactor),
            width: Math.round(s.rect.width / scaleFactor),
            height: Math.round(s.rect.height / scaleFactor),
          },
        }));
      }
      return data.selections;
    }

    return [];
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.warn('Server OCR failed or timed out, executing in-browser fallback...', e);

    // 3. Resilient In-Browser WASM OCR Fallback
    try {
      const fallbackSelections = await runBrowserOcrFallback(payloadUrl, sampleTextFallback);
      if (fallbackSelections.length > 0) {
        return fallbackSelections;
      }
    } catch (browserErr) {
      console.error('Browser OCR fallback failed:', browserErr);
    }

    if (e?.name === 'AbortError' || isTimedOut) {
      throw new Error('Image scan timed out. You can also drag boxes over sensitive areas manually.');
    }
    throw new Error(e?.message || 'Failed to auto-detect sensitive regions.');
  }
}

