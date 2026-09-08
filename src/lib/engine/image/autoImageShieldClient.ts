import { ImageSelection } from '../../../types';
import { parseSvgToRegions } from './svgParser';
import { runMultiLayerDetectionPipeline } from '../multiLayerPipeline';
import {
  extractTextFromRegion,
  findMatchingPhraseOccurrences,
  type ExtractedWord,
  type ExtractedTextRegion,
} from './awareMasking';

export {
  extractTextFromRegion,
  findMatchingPhraseOccurrences,
  type ExtractedWord,
  type ExtractedTextRegion,
};

export interface OcrDetectionResult {
  selections: ImageSelection[];
  ocrWords: ExtractedWord[];
  ocrRegions: ExtractedTextRegion[];
  ocrText: string;
}

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
  maxDimension = 1200
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

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, scanW, scanH);
      const scanUrl = canvas.toDataURL('image/jpeg', 0.88);
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
interface BrowserWord {
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  confidence?: number;
}

interface BrowserRegion {
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  confidence: number;
  words?: BrowserWord[];
}

function parseBrowserPageData(pageData: any): { regions: BrowserRegion[]; allWords: BrowserWord[] } {
  const regions: BrowserRegion[] = [];
  const allWords: BrowserWord[] = [];

  let rawLines: any[] = [];
  if (pageData && Array.isArray(pageData.lines) && pageData.lines.length > 0) {
    rawLines = pageData.lines;
  } else if (pageData && Array.isArray(pageData.blocks)) {
    for (const b of pageData.blocks) {
      if (Array.isArray(b.paragraphs)) {
        for (const p of b.paragraphs) {
          if (Array.isArray(p.lines)) {
            rawLines.push(...p.lines);
          }
        }
      } else if (Array.isArray(b.lines)) {
        rawLines.push(...b.lines);
      }
    }
  }

  for (const line of rawLines) {
    if (!line.text || !line.text.trim()) continue;

    const lx0 = line.bbox ? line.bbox.x0 : 0;
    const ly0 = line.bbox ? line.bbox.y0 : 0;
    const lx1 = line.bbox ? line.bbox.x1 : lx0 + 100;
    const ly1 = line.bbox ? line.bbox.y1 : ly0 + 24;

    const lineWords: BrowserWord[] = [];
    if (line.words && Array.isArray(line.words) && line.words.length > 0) {
      for (const w of line.words) {
        if (!w.text || !w.text.trim()) continue;
        const wx0 = w.bbox ? w.bbox.x0 : lx0;
        const wy0 = w.bbox ? w.bbox.y0 : ly0;
        const wx1 = w.bbox ? w.bbox.x1 : wx0 + 10;
        const wy1 = w.bbox ? w.bbox.y1 : wy0 + 10;

        const wordObj: BrowserWord = {
          text: w.text.trim(),
          rect: { x: wx0, y: wy0, width: Math.max(10, wx1 - wx0), height: Math.max(10, wy1 - wy0) },
          confidence: w.confidence || 90,
        };
        lineWords.push(wordObj);
        allWords.push(wordObj);
      }
    }

    regions.push({
      text: line.text.trim(),
      rect: { x: lx0, y: ly0, width: Math.max(20, lx1 - lx0), height: Math.max(14, ly1 - ly0) },
      confidence: line.confidence || 90,
      words: lineWords,
    });
  }

  return { regions, allWords };
}

async function runBrowserOcrFallback(
  imageDataUrl: string,
  sampleTextFallback?: string
): Promise<OcrDetectionResult> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1);
    const ret = await worker.recognize(imageDataUrl, {}, { blocks: true, hocr: true, tsv: true });
    await worker.terminate();

    const { regions, allWords } = parseBrowserPageData(ret.data);
    const ocrText = ret.data.text || '';

    // Construct 1:1 character-offset mapping
    interface WordSpan {
      text: string;
      charStart: number;
      charEnd: number;
      rect: { x: number; y: number; width: number; height: number };
    }

    const wordSpans: WordSpan[] = [];
    let fullOcrText = '';

    if (regions.length > 0) {
      for (let rIdx = 0; rIdx < regions.length; rIdx++) {
        const line = regions[rIdx];
        const lineWords = line.words || [];

        if (lineWords.length > 0) {
          const realLineText = line.text || '';
          const lineOffsetInFull = fullOcrText.length;
          let searchPos = 0;

          for (let wIdx = 0; wIdx < lineWords.length; wIdx++) {
            const word = lineWords[wIdx];
            const wordText = word.text;
            let foundIdx = realLineText.indexOf(wordText, searchPos);
            if (foundIdx === -1) {
              foundIdx = searchPos;
            }
            const charStart = lineOffsetInFull + foundIdx;
            const charEnd = charStart + wordText.length;
            searchPos = foundIdx + wordText.length;

            wordSpans.push({
              text: wordText,
              charStart,
              charEnd,
              rect: word.rect,
            });
          }
          fullOcrText += (realLineText.length > 0 ? realLineText : lineWords.map(w => w.text).join(' '));
        } else if (line.text) {
          const charStart = fullOcrText.length;
          fullOcrText += line.text;
          const charEnd = fullOcrText.length;
          wordSpans.push({
            text: line.text,
            charStart,
            charEnd,
            rect: line.rect,
          });
        }

        if (rIdx < regions.length - 1) {
          fullOcrText += '\n';
        }
      }
    } else {
      fullOcrText = ocrText;
    }

    const textToScan = sampleTextFallback || (fullOcrText.trim().length > 0 ? fullOcrText : ocrText);
    if (!textToScan || textToScan.trim().length === 0) {
      return {
        selections: [],
        ocrWords: allWords,
        ocrRegions: regions,
        ocrText: fullOcrText,
      };
    }

    const detectedEntities = await runMultiLayerDetectionPipeline(textToScan);
    if (!detectedEntities || detectedEntities.length === 0) {
      return {
        selections: [],
        ocrWords: allWords,
        ocrRegions: regions,
        ocrText: fullOcrText,
      };
    }

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
      const typeKey = (entity.placeholderPrefix || entity.type).toUpperCase();

      if (!placeholder) {
        typeCounters[typeKey] = (typeCounters[typeKey] || 0) + 1;
        const typeSeqStr = String(typeCounters[typeKey]).padStart(3, '0');
        placeholder = `[[${typeKey}_${typeSeqStr}]]`;
        valueToPlaceholderMap.set(normalizedValue, placeholder);
      }

      const matchedRects: { x: number; y: number; width: number; height: number }[] = [];

      if (wordSpans.length > 0 && typeof entity.start === 'number' && typeof entity.end === 'number') {
        const overlapping = wordSpans.filter(
          (w) => w.charEnd > entity.start && w.charStart < entity.end
        );

        if (overlapping.length > 0) {
          const sortedWords = [...overlapping].sort((a, b) => {
            const yDiff = a.rect.y - b.rect.y;
            if (Math.abs(yDiff) > Math.min(a.rect.height, b.rect.height) * 0.4) {
              return yDiff;
            }
            return a.rect.x - b.rect.x;
          });

          const lineClusters: WordSpan[][] = [];
          for (const w of sortedWords) {
            const wMidY = w.rect.y + w.rect.height / 2;
            const matchingCluster = lineClusters.find((cluster) => {
              const clusterMidY = cluster.reduce((sum, cw) => sum + (cw.rect.y + cw.rect.height / 2), 0) / cluster.length;
              const avgH = cluster.reduce((sum, cw) => sum + cw.rect.height, 0) / cluster.length;
              return Math.abs(wMidY - clusterMidY) <= avgH * 0.55;
            });

            if (matchingCluster) {
              matchingCluster.push(w);
            } else {
              lineClusters.push([w]);
            }
          }

          for (const cluster of lineClusters) {
            const minX = Math.min(...cluster.map((w) => w.rect.x));
            const maxX = Math.max(...cluster.map((w) => w.rect.x + w.rect.width));
            const minY = Math.min(...cluster.map((w) => w.rect.y));
            const maxY = Math.max(...cluster.map((w) => w.rect.y + w.rect.height));

            const matchTextH = cluster[0].rect.height || 20;
            const padX = Math.max(4, Math.round(matchTextH * 0.25));
            const padY = Math.max(2, Math.round(matchTextH * 0.15));

            matchedRects.push({
              x: Math.max(0, minX - padX),
              y: Math.max(0, minY - padY),
              width: Math.max(20, (maxX - minX) + padX * 2),
              height: Math.max(14, (maxY - minY) + padY * 2),
            });
          }
        }
      }

      // Fallback matching by word substrings
      if (matchedRects.length === 0) {
        const matchedWords = allWords.filter((w) => {
          const wt = w.text.toLowerCase();
          return wt && (normalizedValue.includes(wt) || wt.includes(normalizedValue));
        });

        if (matchedWords.length > 0) {
          const minX = Math.min(...matchedWords.map((w) => w.rect.x));
          const maxX = Math.max(...matchedWords.map((w) => w.rect.x + w.rect.width));
          const minY = Math.min(...matchedWords.map((w) => w.rect.y));
          const maxY = Math.max(...matchedWords.map((w) => w.rect.y + w.rect.height));

          const matchTextH = matchedWords[0].rect.height || 20;
          const padX = Math.max(4, Math.round(matchTextH * 0.25));
          const padY = Math.max(2, Math.round(matchTextH * 0.15));

          matchedRects.push({
            x: Math.max(0, minX - padX),
            y: Math.max(0, minY - padY),
            width: Math.max(20, (maxX - minX) + padX * 2),
            height: Math.max(14, (maxY - minY) + padY * 2),
          });
        }
      }

      for (let bIdx = 0; bIdx < matchedRects.length; bIdx++) {
        selections.push({
          id: `auto_sel_${entity.type.toLowerCase()}_${globalIndex}_${bIdx}_${Date.now()}`,
          rect: matchedRects[bIdx],
          entityType: entity.type,
          placeholder,
          evidence: `Auto-detected: ${entity.reason}`,
          priority: (entity as any).priority || 95,
        });
      }

      globalIndex++;
    }

    return {
      selections,
      ocrWords: allWords,
      ocrRegions: regions,
      ocrText: fullOcrText,
    };
  } catch (err) {
    console.warn('[Browser OCR Fallback Execution Error]:', err);
    return {
      selections: [],
      ocrWords: [],
      ocrRegions: [],
      ocrText: '',
    };
  }
}

/**
 * Performs full OCR and entity detection on an image, returning both sensitive selections
 * and underlying OCR word/region coordinate tokens for aware manual masking propagation.
 */
export async function scanImageOcrAndEntities(
  imageDataUrl: string,
  sampleTextFallback?: string
): Promise<OcrDetectionResult> {
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
        svgText = decodeURIComponent(
          payloadUrl.split('data:image/svg+xml,')[1] ||
            payloadUrl.split('data:image/svg+xml;charset=utf-8,')[1] ||
            payloadUrl
        );
      }

      const { regions, allWords } = parseSvgToRegions(svgText);
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

      return {
        selections,
        ocrWords: allWords,
        ocrRegions: regions,
        ocrText: fullText,
      };
    } catch (e) {
      console.warn('Client SVG fast-path fallback:', e);
    }
  }

  // 2. Serverless OCR Scanning with 7.5s Fast Timeout Protection
  const { scanUrl, scaleFactor } = await optimizeImageForScan(payloadUrl, 950);

  const controller = new AbortController();
  let isTimedOut = false;
  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, 7500);

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

    if (data.success) {
      let finalSelections: ImageSelection[] = Array.isArray(data.selections) ? data.selections : [];
      let finalWords: ExtractedWord[] = Array.isArray(data.ocrWords) ? data.ocrWords : [];
      let finalRegions: ExtractedTextRegion[] = Array.isArray(data.ocrRegions) ? data.ocrRegions : [];

      if (scaleFactor !== 1.0 && scaleFactor > 0) {
        finalSelections = finalSelections.map((s: ImageSelection) => ({
          ...s,
          rect: {
            x: Math.round(s.rect.x / scaleFactor),
            y: Math.round(s.rect.y / scaleFactor),
            width: Math.round(s.rect.width / scaleFactor),
            height: Math.round(s.rect.height / scaleFactor),
          },
        }));
        finalWords = finalWords.map((w: ExtractedWord) => ({
          ...w,
          rect: {
            x: Math.round(w.rect.x / scaleFactor),
            y: Math.round(w.rect.y / scaleFactor),
            width: Math.round(w.rect.width / scaleFactor),
            height: Math.round(w.rect.height / scaleFactor),
          },
        }));
        finalRegions = finalRegions.map((r: ExtractedTextRegion) => ({
          ...r,
          rect: {
            x: Math.round(r.rect.x / scaleFactor),
            y: Math.round(r.rect.y / scaleFactor),
            width: Math.round(r.rect.width / scaleFactor),
            height: Math.round(r.rect.height / scaleFactor),
          },
          words: (r.words || []).map((w: ExtractedWord) => ({
            ...w,
            rect: {
              x: Math.round(w.rect.x / scaleFactor),
              y: Math.round(w.rect.y / scaleFactor),
              width: Math.round(w.rect.width / scaleFactor),
              height: Math.round(w.rect.height / scaleFactor),
            },
          })),
        }));
      }

      if (finalSelections.length > 0 || finalWords.length > 0) {
        return {
          selections: finalSelections,
          ocrWords: finalWords,
          ocrRegions: finalRegions,
          ocrText: data.ocrText || '',
        };
      }
    }

    // If server returned 0 selections, try in-browser fallback
    const browserRes = await runBrowserOcrFallback(payloadUrl, sampleTextFallback);
    return browserRes;
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.warn('Server OCR failed or timed out, executing in-browser fallback...', e);

    // 3. Resilient In-Browser WASM OCR Fallback
    try {
      const fallbackRes = await runBrowserOcrFallback(payloadUrl, sampleTextFallback);
      if (fallbackRes.selections.length > 0 || fallbackRes.ocrWords.length > 0) {
        return fallbackRes;
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

/**
 * Hybrid Client-Side Auto-Detect Trigger.
 * Retains 100% backward compatibility by returning ImageSelection[] with attached OCR metadata.
 */
export async function autoDetectImageSensitiveRegions(
  imageDataUrl: string,
  sampleTextFallback?: string
): Promise<ImageSelection[]> {
  const result = await scanImageOcrAndEntities(imageDataUrl, sampleTextFallback);
  const selections = result.selections;
  (selections as any).ocrWords = result.ocrWords;
  (selections as any).ocrRegions = result.ocrRegions;
  (selections as any).ocrText = result.ocrText;
  return selections;
}


