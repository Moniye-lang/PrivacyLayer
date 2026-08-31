import { ImageSelection } from '../../../types';

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
  maxDimension = 1600
): Promise<{ scanUrl: string; scaleFactor: number }> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
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
      const scanUrl = canvas.toDataURL('image/jpeg', 0.95);
      resolve({ scanUrl, scaleFactor });
    };
    img.onerror = () => resolve({ scanUrl: dataUrl, scaleFactor: 1.0 });
    img.src = dataUrl;
  });
}

/**
 * Client-Side Auto-Detect Trigger.
 * Calls the secure backend OCR endpoint /api/v1/mask/image/auto-detect.
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

  const { scanUrl, scaleFactor } = await optimizeImageForScan(payloadUrl, 1600);

  const controller = new AbortController();
  let isTimedOut = false;
  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, 60000);

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
      throw new Error(data.error || `Server auto-detect request failed (status ${res.status})`);
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
    if (e?.name === 'AbortError') {
      if (isTimedOut) {
        throw new Error('Image scan timed out after 60s. Please try again or crop the image.');
      }
      throw new Error('Image scan request was interrupted or cancelled. Please click auto-detect again.');
    }
    console.error('Browser auto-detect error:', e);
    throw new Error(e?.message || 'Failed to auto-detect sensitive regions from server');
  }
}
