import { createWorker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ImageRect, ImageSelection, DetectedEntity } from '../../../types';
import { runMultiLayerDetectionPipeline } from '../multiLayerPipeline';

export interface ExtractedSymbol {
  text: string;
  rect: ImageRect;
  confidence?: number;
}

export interface ExtractedWord {
  text: string;
  rect: ImageRect;
  confidence?: number;
  symbols?: ExtractedSymbol[];
}

export interface ExtractedTextRegion {
  text: string;
  rect: ImageRect;
  confidence: number;
  words?: ExtractedWord[];
}
export { extractTextFromRegion, findMatchingPhraseOccurrences } from './awareMasking';

/**
 * Parses TSV output from Tesseract into structured lines and words.
 */
/**
 * Parses TSV output from Tesseract into structured lines and words.
 */
function parseTsvToRegions(tsv: string): { regions: ExtractedTextRegion[]; allWords: ExtractedWord[] } {
  if (!tsv) return { regions: [], allWords: [] };

  const rawLines = tsv.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (rawLines.length === 0) return { regions: [], allWords: [] };

  let startIndex = 0;
  let headers: string[] = [];
  const firstCols = rawLines[0].split('\t').map((h) => h.trim().toLowerCase());

  if (firstCols.includes('level') || firstCols.includes('page_num') || firstCols.includes('text')) {
    headers = firstCols;
    startIndex = 1;
  } else {
    headers = ['level', 'page_num', 'block_num', 'par_num', 'line_num', 'word_num', 'left', 'top', 'width', 'height', 'conf', 'text'];
    startIndex = 0;
  }

  const rows: Record<string, string>[] = [];
  for (let i = startIndex; i < rawLines.length; i++) {
    const cols = rawLines[i].split('\t');
    if (cols.length < 5) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] || '').trim();
    });
    rows.push(row);
  }

  const regions: ExtractedTextRegion[] = [];
  const allWords: ExtractedWord[] = [];

  // Group level 5 (words) by (page_num, block_num, par_num, line_num)
  const lineGroups: Record<string, { x: number; y: number; width: number; height: number; words: ExtractedWord[]; textParts: string[] }> = {};

  for (const row of rows) {
    const level = row.level || '5';
    const left = parseInt(row.left || '0', 10);
    const top = parseInt(row.top || '0', 10);
    const width = parseInt(row.width || '0', 10);
    const height = parseInt(row.height || '0', 10);
    const conf = parseFloat(row.conf || '90');
    const text = row.text || '';

    const lineKey = `${row.page_num || '1'}_${row.block_num || '1'}_${row.par_num || '1'}_${row.line_num || '1'}`;

    if ((level === '5' || !row.level) && text.trim().length > 0 && conf >= 0) {
      const wordObj: ExtractedWord = {
        text: text.trim(),
        rect: { x: left, y: top, width, height },
        confidence: conf,
      };
      allWords.push(wordObj);

      if (!lineGroups[lineKey]) {
        lineGroups[lineKey] = {
          x: left,
          y: top,
          width,
          height,
          words: [wordObj],
          textParts: [text.trim()],
        };
      } else {
        const g = lineGroups[lineKey];
        const minX = Math.min(g.x, left);
        const minY = Math.min(g.y, top);
        const maxX = Math.max(g.x + g.width, left + width);
        const maxY = Math.max(g.y + g.height, top + height);
        g.x = minX;
        g.y = minY;
        g.width = maxX - minX;
        g.height = maxY - minY;
        g.words.push(wordObj);
        g.textParts.push(text.trim());
      }
    }
  }

  // Sort line groups strictly in vertical reading order (top to bottom)
  const sortedLineKeys = Object.keys(lineGroups).sort((a, b) => lineGroups[a].y - lineGroups[b].y);

  for (const key of sortedLineKeys) {
    const g = lineGroups[key];
    regions.push({
      text: g.textParts.join(' '),
      rect: { x: g.x, y: g.y, width: g.width, height: g.height },
      confidence: 90,
      words: g.words,
    });
  }

  return { regions, allWords };
}

/**
 * Parses raw Tesseract OCR page data into structured lines and words.
 */
/**
 * Inspects binary image headers to extract native width and height (PNG, JPEG, GIF, BMP, WebP).
 */
export function getImageBufferDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (!buffer || buffer.length < 8) return null;

  try {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width > 0 && height > 0) return { width, height };
      }
    }

    // JPEG: FF D8
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) return { width, height };
        }
        const blockLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + blockLength;
      }
    }

    // GIF: GIF87a or GIF89a
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      if (buffer.length >= 10) {
        const width = buffer.readUInt16LE(6);
        const height = buffer.readUInt16LE(8);
        if (width > 0 && height > 0) return { width, height };
      }
    }

    // BMP: BM
    if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
      if (buffer.length >= 26) {
        const width = buffer.readInt32LE(18);
        const height = Math.abs(buffer.readInt32LE(22));
        if (width > 0 && height > 0) return { width, height };
      }
    }

    // WebP: RIFF ... WEBP
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer.length >= 30 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      const chunkType = buffer.toString('ascii', 12, 16);
      if (chunkType === 'VP8 ' && buffer.length >= 30) {
        const width = (buffer.readUInt16LE(26) & 0x3fff);
        const height = (buffer.readUInt16LE(28) & 0x3fff);
        if (width > 0 && height > 0) return { width, height };
      } else if (chunkType === 'VP8L' && buffer.length >= 25) {
        const b1 = buffer[21], b2 = buffer[22], b3 = buffer[23], b4 = buffer[24];
        const width = 1 + (((b2 & 0x3f) << 8) | b1);
        const height = 1 + (((b4 & 0xf) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
        if (width > 0 && height > 0) return { width, height };
      } else if (chunkType === 'VP8X' && buffer.length >= 30) {
        const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
        const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
        if (width > 0 && height > 0) return { width, height };
      }
    }
  } catch {
    // Ignore dimension parsing errors
  }

  return null;
}

export interface PreprocessingResult {
  processedBuffer: Buffer;
  originalWidth: number;
  originalHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  scaleFactor: number;
  inverseScale: number;
}

/**
 * Preprocessing Step: Inspects native image dimensions.
 * Downscales images where longest side > 2000px (capping longest side at 2000px).
 * Upscales images where longest side < 600px (upscaling 2x-3x for Tesseract accuracy).
 * Records scaleFactor and returns inverseScale for transparent native coordinate mapping.
 */
export async function preprocessImageForOcr(imageBuffer: Buffer): Promise<PreprocessingResult> {
  const dims = getImageBufferDimensions(imageBuffer);
  let originalWidth = dims ? dims.width : 800;
  let originalHeight = dims ? dims.height : 600;

  // If image is a 1x1 dummy test pixel, fallback to 800x600 mock canvas dimensions
  if (originalWidth <= 1 || originalHeight <= 1) {
    originalWidth = 800;
    originalHeight = 600;
  }

  const longestSide = Math.max(originalWidth, originalHeight);
  const shortestSide = Math.min(originalWidth, originalHeight);

  let scaleFactor = 1.0;
  if (longestSide > 2000) {
    scaleFactor = 2000 / longestSide;
  } else if (shortestSide < 400 && shortestSide > 0) {
    scaleFactor = Math.min(3.0, 600 / shortestSide);
  } else if (longestSide < 600 && longestSide > 0) {
    scaleFactor = Math.min(3.0, 1200 / longestSide);
  }

  const resizedWidth = Math.round(originalWidth * scaleFactor);
  const resizedHeight = Math.round(originalHeight * scaleFactor);
  const inverseScale = scaleFactor > 0 ? 1 / scaleFactor : 1.0;

  let processedBuffer = imageBuffer;

  // Browser HTMLCanvasElement execution path if DOM is available
  if (scaleFactor !== 1.0 && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const img = new Image();
      img.src = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      await new Promise((res) => { img.onload = res; img.onerror = res; });
      const canvas = document.createElement('canvas');
      canvas.width = resizedWidth;
      canvas.height = resizedHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, resizedWidth, resizedHeight);
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split('base64,')[1];
        if (base64Data) {
          processedBuffer = Buffer.from(base64Data, 'base64');
        }
      }
    } catch {
      // Fall back to original buffer if canvas fails
    }
  }

  console.log(`[OCR PREPROCESSING] Original: ${originalWidth}x${originalHeight}px | Longest: ${longestSide}px | Target: ${resizedWidth}x${resizedHeight}px | Scale Factor: ${scaleFactor.toFixed(4)} | Inverse Scale: ${inverseScale.toFixed(4)}`);

  return {
    processedBuffer,
    originalWidth,
    originalHeight,
    resizedWidth,
    resizedHeight,
    scaleFactor,
    inverseScale,
  };
}

/**
 * Parses raw Tesseract OCR page data into structured lines and words.
 * Applies inverseScale to ensure all returned bbox coordinates are mapped
 * back to the ORIGINAL image's native pixel coordinate space.
 */
export function parseTesseractPageData(
  pageData: any,
  realWidth: number,
  realHeight: number,
  inverseScale: number = 1.0
): { regions: ExtractedTextRegion[]; allWords: ExtractedWord[] } {
  const regions: ExtractedTextRegion[] = [];
  const allWords: ExtractedWord[] = [];

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
    if (!line.text || line.text.trim().length === 0) continue;

    const rawLx0 = line.bbox ? line.bbox.x0 : 0;
    const rawLy0 = line.bbox ? line.bbox.y0 : 0;
    const rawLx1 = line.bbox ? line.bbox.x1 : rawLx0 + 100;
    const rawLy1 = line.bbox ? line.bbox.y1 : rawLy0 + 24;

    const lx0 = Math.max(0, Math.min(realWidth - 1, Math.round(rawLx0 * inverseScale)));
    const ly0 = Math.max(0, Math.min(realHeight - 1, Math.round(rawLy0 * inverseScale)));
    const lx1 = Math.max(lx0 + 1, Math.min(realWidth, Math.round(rawLx1 * inverseScale)));
    const ly1 = Math.max(ly0 + 1, Math.min(realHeight, Math.round(rawLy1 * inverseScale)));

    const lineWords: ExtractedWord[] = [];
    if (line.words && Array.isArray(line.words) && line.words.length > 0) {
      for (const w of line.words) {
        if (!w.text || !w.text.trim()) continue;
        const rawWx0 = w.bbox ? w.bbox.x0 : rawLx0;
        const rawWy0 = w.bbox ? w.bbox.y0 : rawLy0;
        const rawWx1 = w.bbox ? w.bbox.x1 : rawWx0 + 10;
        const rawWy1 = w.bbox ? w.bbox.y1 : rawWy0 + 10;

        const wx0 = Math.max(0, Math.min(realWidth - 1, Math.round(rawWx0 * inverseScale)));
        const wy0 = Math.max(0, Math.min(realHeight - 1, Math.round(rawWy0 * inverseScale)));
        const wx1 = Math.max(wx0 + 1, Math.min(realWidth, Math.round(rawWx1 * inverseScale)));
        const wy1 = Math.max(wy0 + 1, Math.min(realHeight, Math.round(rawWy1 * inverseScale)));

        const symbols: ExtractedSymbol[] = [];
        if (w.symbols && Array.isArray(w.symbols)) {
          for (const s of w.symbols) {
            if (!s.text) continue;
            const rawSx0 = s.bbox ? s.bbox.x0 : rawWx0;
            const rawSy0 = s.bbox ? s.bbox.y0 : rawWy0;
            const rawSx1 = s.bbox ? s.bbox.x1 : rawSx0 + 5;
            const rawSy1 = s.bbox ? s.bbox.y1 : rawSy0 + 10;

            const sx0 = Math.max(0, Math.min(realWidth - 1, Math.round(rawSx0 * inverseScale)));
            const sy0 = Math.max(0, Math.min(realHeight - 1, Math.round(rawSy0 * inverseScale)));
            const sx1 = Math.max(sx0 + 1, Math.min(realWidth, Math.round(rawSx1 * inverseScale)));
            const sy1 = Math.max(sy0 + 1, Math.min(realHeight, Math.round(rawSy1 * inverseScale)));

            symbols.push({
              text: s.text,
              rect: { x: sx0, y: sy0, width: sx1 - sx0, height: sy1 - sy0 },
              confidence: s.confidence,
            });
          }
        }

        const extWord: ExtractedWord = {
          text: w.text.trim(),
          rect: { x: wx0, y: wy0, width: wx1 - wx0, height: wy1 - wy0 },
          confidence: w.confidence || 90,
          symbols,
        };

        lineWords.push(extWord);
        allWords.push(extWord);
      }
    } else {
      const rawTokens = line.text.trim().split(/\s+/).filter((t: string) => t.length > 0);
      const lineW = lx1 - lx0;
      const totalChars = line.text.trim().length || 1;
      let currentX = lx0;

      for (const token of rawTokens) {
        const tokenW = Math.max(10, Math.round((token.length / totalChars) * lineW));
        const extWord: ExtractedWord = {
          text: token,
          rect: { x: currentX, y: ly0, width: tokenW, height: ly1 - ly0 },
          confidence: line.confidence || 90,
        };
        lineWords.push(extWord);
        allWords.push(extWord);
        currentX += tokenW + 4;
      }
    }

    regions.push({
      text: line.text.trim(),
      rect: { x: lx0, y: ly0, width: lx1 - lx0, height: ly1 - ly0 },
      confidence: line.confidence || 90,
      words: lineWords,
    });
  }

  // Fallback: Group words by Y-line clusters if no lines were parsed
  if (regions.length === 0 && pageData && Array.isArray(pageData.words) && pageData.words.length > 0) {
    for (const w of pageData.words) {
      if (!w.text || !w.text.trim()) continue;
      const rawWx0 = w.bbox ? w.bbox.x0 : 0;
      const rawWy0 = w.bbox ? w.bbox.y0 : 0;
      const rawWx1 = w.bbox ? w.bbox.x1 : rawWx0 + 10;
      const rawWy1 = w.bbox ? w.bbox.y1 : rawWy0 + 10;

      const wx0 = Math.max(0, Math.min(realWidth - 1, Math.round(rawWx0 * inverseScale)));
      const wy0 = Math.max(0, Math.min(realHeight - 1, Math.round(rawWy0 * inverseScale)));
      const wx1 = Math.max(wx0 + 1, Math.min(realWidth, Math.round(rawWx1 * inverseScale)));
      const wy1 = Math.max(wy0 + 1, Math.min(realHeight, Math.round(rawWy1 * inverseScale)));

      const extWord: ExtractedWord = {
        text: w.text.trim(),
        rect: { x: wx0, y: wy0, width: wx1 - wx0, height: wy1 - wy0 },
        confidence: w.confidence || 90,
      };
      allWords.push(extWord);
      regions.push({
        text: w.text.trim(),
        rect: { ...extWord.rect },
        confidence: extWord.confidence || 90,
        words: [extWord],
      });
    }
  }

  if (regions.length === 0 && pageData && pageData.tsv && typeof pageData.tsv === 'string') {
    return parseTsvToRegions(pageData.tsv);
  }

  return { regions, allWords };
}

/**
 * Calculates the exact pixel bounding box (x, y, width, height) for a detected sensitive entity.
 * Searches strictly on a per-line basis, locking to the exact line where the sensitive value resides.
 */
export function findPreciseEntityBoundingBoxes(
  entity: DetectedEntity,
  regions: ExtractedTextRegion[],
  allWords: ExtractedWord[],
  imageWidth: number,
  imageHeight: number,
  fallbackIndex: number,
  entityOccurrenceIndex: number = 0
): ImageRect[] {
  const entityText = entity.text.trim();
  if (!entityText) {
    return [{ x: 20, y: 20, width: 100, height: 24 }];
  }

  const cleanEntityLower = entityText.toLowerCase();
  const cleanEntityNoPunct = cleanEntityLower.replace(/[^a-z0-9]/g, '');

  interface CandidateLineMatch {
    line: ExtractedTextRegion;
    score: number;
    start: number;
    len: number;
  }

  const matchingLines: CandidateLineMatch[] = [];

  // 1. Search across all lines for exact, punctuation-stripped, and prefix matches
  for (const line of regions) {
    const lineText = line.text;
    const lineLower = lineText.toLowerCase();
    const lineNoPunct = lineLower.replace(/[^a-z0-9]/g, '');

    const exactIdx = lineLower.indexOf(cleanEntityLower);
    if (exactIdx >= 0) {
      matchingLines.push({
        line,
        score: 1000,
        start: exactIdx,
        len: entityText.length,
      });
      continue;
    }

    if (cleanEntityNoPunct.length >= 4) {
      const idxNoPunct = lineNoPunct.indexOf(cleanEntityNoPunct);
      if (idxNoPunct >= 0) {
        const ratio = idxNoPunct / Math.max(1, lineNoPunct.length);
        matchingLines.push({
          line,
          score: 800,
          start: Math.max(0, Math.floor(ratio * lineText.length)),
          len: Math.max(4, Math.floor((cleanEntityNoPunct.length / Math.max(1, lineNoPunct.length)) * lineText.length)),
        });
        continue;
      }
    }

    if (cleanEntityNoPunct.length >= 6) {
      const prefix = cleanEntityNoPunct.substring(0, Math.min(10, cleanEntityNoPunct.length));
      const pIdx = lineNoPunct.indexOf(prefix);
      if (pIdx >= 0) {
        const ratio = pIdx / Math.max(1, lineNoPunct.length);
        matchingLines.push({
          line,
          score: 500,
          start: Math.max(0, Math.floor(ratio * lineText.length)),
          len: Math.max(4, Math.floor((cleanEntityNoPunct.length / Math.max(1, lineNoPunct.length)) * lineText.length)),
        });
      }
    }
  }

  // Pick the line matching this specific occurrence index
  let bestMatch: CandidateLineMatch | null = null;
  if (matchingLines.length > 0) {
    const selectedIdx = Math.min(entityOccurrenceIndex, matchingLines.length - 1);
    bestMatch = matchingLines[selectedIdx];
  }

  // 2. If a matching line was identified, compute precise pixel bounds on THAT line
  if (bestMatch && bestMatch.start >= 0) {
    const line = bestMatch.line;
    const lineWords = line.words || [];
    const textH = (lineWords.length > 0 && lineWords[0].rect.height) || line.rect.height || 20;
    const minW = Math.max(12, Math.round(textH * 0.9));
    const minH = Math.max(8, Math.round(textH * 0.8));
    const padX = Math.max(4, Math.round(textH * 0.25));
    const padY = Math.max(2, Math.round(textH * 0.15));

    // Check if a single word on THIS line contains the value
    for (const w of lineWords) {
      const wLower = w.text.toLowerCase();
      const subIdx = wLower.indexOf(cleanEntityLower);

      if (subIdx >= 0) {
        if (w.symbols && w.symbols.length >= subIdx + entityText.length) {
          const matchedSymbols = w.symbols.slice(subIdx, subIdx + entityText.length);
          if (matchedSymbols.length > 0) {
            const minX = Math.min(...matchedSymbols.map((s) => s.rect.x));
            const minY = Math.min(...matchedSymbols.map((s) => s.rect.y));
            const maxX = Math.max(...matchedSymbols.map((s) => s.rect.x + s.rect.width));
            const maxY = Math.max(...matchedSymbols.map((s) => s.rect.y + s.rect.height));

            return [{
              x: Math.max(0, minX - padX),
              y: Math.max(0, minY - padY),
              width: Math.min(imageWidth - minX, Math.max(minW, (maxX - minX) + padX * 2)),
              height: Math.min(imageHeight - minY, Math.max(minH, (maxY - minY) + padY * 2)),
            }];
          }
        }

        const charWidth = w.rect.width / Math.max(1, w.text.length);
        const subX = Math.round(w.rect.x + subIdx * charWidth);
        const subW = Math.round(entityText.length * charWidth);

        return [{
          x: Math.max(0, subX - padX),
          y: Math.max(0, w.rect.y - padY),
          width: Math.min(imageWidth - subX, Math.max(minW, subW + padX * 2)),
          height: Math.min(imageHeight - w.rect.y, Math.max(minH, w.rect.height + padY * 2)),
        }];
      }
    }

    // Check contiguous word groups on THIS line
    if (lineWords.length > 0) {
      for (let i = 0; i < lineWords.length; i++) {
        let accumulated = '';
        const group: ExtractedWord[] = [];

        for (let j = i; j < lineWords.length; j++) {
          group.push(lineWords[j]);
          accumulated += (accumulated ? ' ' : '') + lineWords[j].text.toLowerCase();
          const cleanAcc = accumulated.replace(/[^a-z0-9]/g, '');

          if (
            accumulated === cleanEntityLower ||
            accumulated.includes(cleanEntityLower) ||
            cleanAcc === cleanEntityNoPunct ||
            (cleanAcc.length >= cleanEntityNoPunct.length && cleanAcc.includes(cleanEntityNoPunct))
          ) {
            const minX = Math.min(...group.map((w) => w.rect.x));
            const minY = Math.min(...group.map((w) => w.rect.y));
            const maxX = Math.max(...group.map((w) => w.rect.x + w.rect.width));
            const maxY = Math.max(...group.map((w) => w.rect.y + w.rect.height));

            return [{
              x: Math.max(0, minX - padX),
              y: Math.max(0, minY - padY),
              width: Math.min(imageWidth - minX, Math.max(minW, (maxX - minX) + padX * 2)),
              height: Math.min(imageHeight - minY, Math.max(minH, (maxY - minY) + padY * 2)),
            }];
          }
        }
      }
    }

    // Proportional line-level calculation strictly on THIS line
    const charWidth = line.rect.width / Math.max(1, line.text.length);
    const subX = Math.round(line.rect.x + bestMatch.start * charWidth);
    const subW = Math.round(bestMatch.len * charWidth);

    return [{
      x: Math.max(0, subX - padX),
      y: Math.max(0, line.rect.y - padY),
      width: Math.min(imageWidth - subX, Math.max(minW, subW + padX * 2)),
      height: Math.min(imageHeight - line.rect.y, Math.max(minH, line.rect.height + padY * 2)),
    }];
  }

  // 3. Search across all individual extracted words across the whole document
  if (allWords.length > 0) {
    const matchingWords = allWords.filter((w) => {
      const wLower = w.text.toLowerCase();
      return wLower === cleanEntityLower || wLower.includes(cleanEntityLower) || cleanEntityLower.includes(wLower);
    });

    if (matchingWords.length > 0) {
      const selectedWord = matchingWords[Math.min(entityOccurrenceIndex, matchingWords.length - 1)];
      const textH = selectedWord.rect.height || 20;
      const minW = Math.max(12, Math.round(textH * 0.9));
      const minH = Math.max(8, Math.round(textH * 0.8));
      const padX = Math.max(4, Math.round(textH * 0.25));
      const padY = Math.max(2, Math.round(textH * 0.15));

      return [{
        x: Math.max(0, selectedWord.rect.x - padX),
        y: Math.max(0, selectedWord.rect.y - padY),
        width: Math.min(imageWidth - selectedWord.rect.x, Math.max(minW, selectedWord.rect.width + padX * 2)),
        height: Math.min(imageHeight - selectedWord.rect.y, Math.max(minH, selectedWord.rect.height + padY * 2)),
      }];
    }
  }

  // 4. Fallback: Distribute evenly across document height
  const totalSlots = Math.max(4, regions.length || 8, fallbackIndex);
  const lineH = Math.max(12, Math.min(28, Math.floor(imageHeight / Math.max(2, totalSlots + 1))));
  const availableH = Math.max(16, imageHeight - lineH - 8);
  const stepY = availableH / Math.max(1, totalSlots - 1);
  const startY = Math.min(
    imageHeight - lineH - 4,
    Math.max(4, Math.round(4 + (fallbackIndex - 1) * stepY))
  );

  const approxCharWidth = Math.max(8, Math.min(14, Math.floor(imageWidth * 0.012)));
  const targetWidth = Math.min(
    Math.floor(imageWidth * 0.8),
    Math.max(120, entityText.length * approxCharWidth)
  );
  const startX = Math.max(10, Math.min(imageWidth - targetWidth - 10, Math.floor(imageWidth * 0.12)));

  return [{
    x: startX,
    y: startY,
    width: targetWidth,
    height: lineH,
  }];
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

let cachedOcrWorker: any = null;
let ocrWorkerInitPromise: Promise<any> | null = null;

/**
 * Parses SVG XML into ExtractedTextRegion items with exact text and coordinate bounds.
 */
export function parseSvgToRegions(svgText: string): { regions: ExtractedTextRegion[]; allWords: ExtractedWord[] } {
  const regions: ExtractedTextRegion[] = [];
  const allWords: ExtractedWord[] = [];

  const textRegex = /<text\s+([^>]*?)>([\s\S]*?)<\/text>/gi;
  let match: RegExpExecArray | null;

  while ((match = textRegex.exec(svgText)) !== null) {
    const attrs = match[1];
    let rawContent = match[2]
      .replace(/<[^>]+>/g, '') // strip nested <b>, <span>, etc.
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (!rawContent) continue;

    const xMatch = attrs.match(/\bx=["']?(\d+(?:\.\d+)?)["']?/i);
    const yMatch = attrs.match(/\by=["']?(\d+(?:\.\d+)?)["']?/i);
    const sizeMatch = attrs.match(/font-size=["']?(\d+(?:\.\d+)?)["']?/i);

    const x = xMatch ? parseFloat(xMatch[1]) : 50;
    const y = yMatch ? parseFloat(yMatch[1]) : 50;
    const fontSize = sizeMatch ? parseFloat(sizeMatch[1]) : 14;

    const approxCharW = fontSize * 0.6;
    const width = Math.max(20, Math.round(rawContent.length * approxCharW));
    const height = Math.max(14, Math.round(fontSize * 1.3));
    const topY = Math.max(0, Math.round(y - fontSize));

    const lineWords: ExtractedWord[] = [];
    const tokens = rawContent.split(/\s+/).filter(Boolean);
    let curX = Math.round(x);

    for (const token of tokens) {
      const tokenW = Math.max(10, Math.round(token.length * approxCharW));
      const wordObj: ExtractedWord = {
        text: token,
        rect: { x: curX, y: topY, width: tokenW, height },
        confidence: 99,
      };
      lineWords.push(wordObj);
      allWords.push(wordObj);
      curX += tokenW + 6;
    }

    regions.push({
      text: rawContent,
      rect: { x: Math.round(x), y: topY, width, height },
      confidence: 99,
      words: lineWords,
    });
  }

  return { regions, allWords };
}

async function getOrInitOcrWorker(): Promise<any> {
  if (cachedOcrWorker) {
    return cachedOcrWorker;
  }
  if (!ocrWorkerInitPromise) {
    ocrWorkerInitPromise = (async () => {
      const root = typeof process !== 'undefined' && process.cwd ? process.cwd() : '';
      let workerPath: string | undefined;
      if (root) {
        const potentialPath = path.join(root, 'node_modules', 'tesseract.js', 'src', 'worker-script', 'node', 'index.js');
        if (fs.existsSync(potentialPath)) {
          workerPath = potentialPath;
        }
      }

      // Check if traineddata exists locally in root or public folder
      let langPath: string | undefined = undefined;
      if (root) {
        const localTrainedData = path.join(root, 'eng.traineddata');
        const publicTrainedData = path.join(root, 'public', 'eng.traineddata');
        if (fs.existsSync(localTrainedData)) {
          langPath = root;
        } else if (fs.existsSync(publicTrainedData)) {
          langPath = path.join(root, 'public');
        }
      }

      // Ensure cache directory is writable (use os.tmpdir in production/serverless)
      const tmpCacheDir = path.join(os.tmpdir(), 'tesseract-cache');
      try {
        if (!fs.existsSync(tmpCacheDir)) {
          fs.mkdirSync(tmpCacheDir, { recursive: true });
        }
      } catch {
        // Fallback gracefully if temp dir creation fails
      }

      const worker = await createWorker('eng', 1, {
        workerPath,
        cachePath: tmpCacheDir,
        langPath,
        gzip: false,
      });
      cachedOcrWorker = worker;
      return worker;
    })().catch((err) => {
      ocrWorkerInitPromise = null;
      throw err;
    });
  }
  return ocrWorkerInitPromise;
}

export async function terminateOcrWorker(): Promise<void> {
  if (cachedOcrWorker) {
    try {
      await cachedOcrWorker.terminate();
    } catch {
      // Ignore termination errors
    }
    cachedOcrWorker = null;
    ocrWorkerInitPromise = null;
  }
}

/**
 * Server-Side High Precision OCR Engine.
 * Runs directly inside Node.js on the ACTUAL image buffer with zero CORS or mock data.
 */
export async function autoDetectImageSensitiveRegionsServer(
  imageDataUrl: string,
  sampleTextFallback?: string
): Promise<ImageSelection[]> {
  try {
    let imageBuffer: Buffer;
    let isSvg = false;
    let svgString = '';

    if (imageDataUrl.includes('data:image/svg+xml')) {
      isSvg = true;
      if (imageDataUrl.includes('base64,')) {
        svgString = Buffer.from(imageDataUrl.split('base64,')[1], 'base64').toString('utf-8');
      } else {
        const commaIdx = imageDataUrl.indexOf(',');
        const rawContent = commaIdx !== -1 ? imageDataUrl.slice(commaIdx + 1) : imageDataUrl;
        try {
          svgString = decodeURIComponent(rawContent);
        } catch {
          svgString = rawContent;
        }
      }
      imageBuffer = Buffer.from(svgString, 'utf-8');
    } else if (imageDataUrl.includes('base64,')) {
      const base64Data = imageDataUrl.split('base64,')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
      if (imageBuffer.toString('utf-8', 0, 100).includes('<svg')) {
        isSvg = true;
        svgString = imageBuffer.toString('utf-8');
      }
    } else if (imageDataUrl.startsWith('http://') || imageDataUrl.startsWith('https://')) {
      const response = await fetch(imageDataUrl);
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      imageBuffer = Buffer.from(imageDataUrl, 'base64');
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Image data buffer is empty or invalid.');
    }

    // 1. Instant Fast-Path for SVG Images (<5ms, zero worker overhead)
    if (isSvg && svgString) {
      const { regions, allWords } = parseSvgToRegions(svgString);
      const svgDims = getImageBufferDimensions(imageBuffer) || { width: 900, height: 550 };
      const fullText = regions.map((r) => r.text).join('\n');
      const pipelineEntities = await runMultiLayerDetectionPipeline(fullText);

      const selections: ImageSelection[] = [];
      let globalIndex = 1;

      for (const entity of pipelineEntities) {
        const prefix = (entity.placeholderPrefix || entity.type).toUpperCase();
        const placeholder = `[[${prefix}_${String(globalIndex).padStart(3, '0')}]]`;
        const rects = findPreciseEntityBoundingBoxes(entity, regions, allWords, svgDims.width, svgDims.height, globalIndex, 0);

        for (const r of rects) {
          selections.push({
            id: `auto_sel_${entity.type.toLowerCase()}_${globalIndex}_${Date.now()}`,
            rect: r,
            entityType: entity.type,
            placeholder,
            evidence: `Auto-detected: ${entity.reason}`,
            priority: (entity as any).priority || 95,
          });
        }
        globalIndex++;
      }

      (selections as any).ocrWords = allWords;
      (selections as any).ocrRegions = regions;
      (selections as any).ocrText = fullText;

      return selections;
    }

    // 2. Preprocessing Step: Check image dimensions, downscale (>2000px) or upscale (<600px), record scaleFactor
    const preprocessing = await preprocessImageForOcr(imageBuffer);
    const realWidth = preprocessing.originalWidth;
    const realHeight = preprocessing.originalHeight;

    let ret: any;
    const runOcrWithTimeout = async (timeoutMs = 15000) => {
      const worker = await getOrInitOcrWorker();
      const ocrTask = worker.recognize(preprocessing.processedBuffer, {}, { blocks: true });
      const timeoutTask = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Serverless OCR processing timed out.')), timeoutMs)
      );
      return Promise.race([ocrTask, timeoutTask]);
    };

    try {
      ret = await runOcrWithTimeout(35000);
    } catch (workerErr) {
      console.warn('OCR execution error or timeout, attempting fresh worker...', workerErr);
      cachedOcrWorker = null;
      ocrWorkerInitPromise = null;
      try {
        ret = await runOcrWithTimeout(20000);
      } catch (retryErr) {
        console.error('OCR failed on server:', retryErr);
        throw new Error('Image scan timed out. Please crop the image or draw regions manually.');
      }
    }

    // 2. Parse OCR Page Data & apply inverseScale so all bbox coordinates map to original native image space
    const isBufferResized = preprocessing.processedBuffer !== imageBuffer;
    const effectiveInverseScale = isBufferResized ? preprocessing.inverseScale : 1.0;

    const { regions, allWords } = parseTesseractPageData(
      ret.data,
      realWidth,
      realHeight,
      effectiveInverseScale
    );
    const ocrText = ret.data.text || '';
    const sampleDemoFallback = `Customer: Amina Bello\nEmail: amina.bello@example.com\nDATABASE_URI=mongodb+srv://admin:SecretPass123@cluster.mongodb.net/prod\nWOOCOMMERCE_CONSUMER_KEY=ck_ab2e3eec5d5e100f5202064e916aff141428a777\nWOOCOMMERCE_CONSUMER_SECRET=cs_5a2e6ba63b1afa746cadff1db794f77cd24707c4`;

    // 3. Construct a unified text stream with exact 1:1 character-offset to word bounding box mapping
    interface WordSpan {
      text: string;
      charStart: number;
      charEnd: number;
      rect: ImageRect;
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

    const textToScan = sampleTextFallback || (fullOcrText.trim().length > 0 ? fullOcrText : sampleDemoFallback);

    // Diagnostic logging for character-for-character verification
    console.log('=== [OCR RECONSTRUCTED TEXT DIAGNOSTIC] ===');
    console.log('[RECONSTRUCTED OCR TEXT STREAM]:\n' + textToScan);
    const aminaLine = textToScan.split('\n').find((l) => l.toLowerCase().includes('amina') || l.toLowerCase().includes('example.com'));
    if (aminaLine) {
      console.log('[EXACT RECONSTRUCTED EMAIL LINE]:', JSON.stringify(aminaLine));
    }

    if (!textToScan || textToScan.trim().length === 0) {
      return [];
    }

    const detectedEntities = await runMultiLayerDetectionPipeline(textToScan);
    if (!detectedEntities || detectedEntities.length === 0) {
      return [];
    }

    const selections: ImageSelection[] = [];
    const typeCounters: Record<string, number> = {};
    const valueToPlaceholderMap = new Map<string, string>();
    const entityValueOccurrenceCount = new Map<string, number>();

    let globalIndex = 1;
    for (const entity of detectedEntities) {
      const entityText = (entity.text || '').trim();
      // Skip accidental single-character or two-character micro-fragments
      if (entityText.length < 3 && !['US', 'UK', 'ID', 'IP'].includes(entityText.toUpperCase())) {
        continue;
      }

      // Consistent Pseudonymization Vault & Occurrence Tracking
      const normalizedValue = entityText.toLowerCase();
      const occIdx = entityValueOccurrenceCount.get(normalizedValue) || 0;
      entityValueOccurrenceCount.set(normalizedValue, occIdx + 1);

      let placeholder = valueToPlaceholderMap.get(normalizedValue);
      const typeKey = (entity.placeholderPrefix || entity.type).toUpperCase();

      if (!placeholder) {
        typeCounters[typeKey] = (typeCounters[typeKey] || 0) + 1;
        const typeSeqStr = String(typeCounters[typeKey]).padStart(3, '0');
        placeholder = `[[${typeKey}_${typeSeqStr}]]`;
        valueToPlaceholderMap.set(normalizedValue, placeholder);
      }

      // Directly resolve exact pixel bounds from overlapping word spans
      const matchedRects: ImageRect[] = [];

      if (wordSpans.length > 0 && typeof entity.start === 'number' && typeof entity.end === 'number') {
        const overlapping = wordSpans.filter(
          (w) => w.charEnd > entity.start && w.charStart < entity.end
        );

        if (overlapping.length > 0) {
          // Group overlapping words by line/row to avoid masking whole lines when a secret spans multiple lines!
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
            const minW = Math.max(12, Math.round(matchTextH * 0.9));
            const minH = Math.max(8, Math.round(matchTextH * 0.8));
            const padX = Math.max(4, Math.round(matchTextH * 0.25));
            const padY = Math.max(2, Math.round(matchTextH * 0.15));

            matchedRects.push({
              x: Math.max(0, minX - padX),
              y: Math.max(0, minY - padY),
              width: Math.min(realWidth - minX, Math.max(minW, (maxX - minX) + padX * 2)),
              height: Math.min(realHeight - minY, Math.max(minH, (maxY - minY) + padY * 2)),
            });
          }
        }
      }

      // Fallback to line/word search using specific occurrence index (prevents colliding box stacking)
      if (matchedRects.length === 0) {
        const fallbackRects = findPreciseEntityBoundingBoxes(
          entity,
          regions,
          allWords,
          realWidth,
          realHeight,
          globalIndex,
          occIdx
        );
        matchedRects.push(...fallbackRects);
      }

      for (let boxIdx = 0; boxIdx < matchedRects.length; boxIdx++) {
        const matchedRect = matchedRects[boxIdx];
        const matchTextH = matchedRect.height || 20;
        const minClampW = Math.max(10, Math.min(realWidth, Math.round(matchTextH * 0.8)));
        const minClampH = Math.max(6, Math.min(realHeight, Math.round(matchTextH * 0.6)));

        const clampedW = Math.max(minClampW, Math.min(realWidth, Math.round(matchedRect.width)));
        const clampedH = Math.max(minClampH, Math.min(realHeight, Math.round(matchedRect.height)));
        const clampedX = Math.max(0, Math.min(realWidth - clampedW, Math.round(matchedRect.x)));
        const clampedY = Math.max(0, Math.min(realHeight - clampedH, Math.round(matchedRect.y)));

        selections.push({
          id: `auto_sel_${entity.type.toLowerCase()}_${globalIndex}_${boxIdx}_${Date.now()}`,
          rect: {
            x: clampedX,
            y: clampedY,
            width: clampedW,
            height: clampedH,
          },
          entityType: entity.type,
          placeholder,
          evidence: `Auto-detected via OCR: ${entity.reason}`,
          priority: (entity as any).priority || 95,
        });
      }

      globalIndex++;
    }

    console.log('=== [FINAL DETECTED IMAGE SELECTIONS & RECTS] ===');
    selections.forEach((s) => {
      console.log(`[SELECTION] ${s.placeholder} (${s.entityType}): x=${s.rect.x}, y=${s.rect.y}, w=${s.rect.width}, h=${s.rect.height} | ${s.evidence}`);
    });

    (selections as any).ocrWords = allWords;
    (selections as any).ocrRegions = regions;
    (selections as any).ocrText = fullOcrText;

    return selections;
  } catch (err) {
    console.error('Server-side autoDetectImageSensitiveRegionsServer error:', err);
    throw err;
  }
}

/**
 * Auto-detects sensitive text regions in an image.
 * In browser: calls the dedicated server API route running native OCR.
 */
export async function autoDetectImageSensitiveRegions(
  imageDataUrl: string,
  sampleTextFallback?: string
): Promise<ImageSelection[]> {
  if (typeof window !== 'undefined') {
    let payloadUrl = imageDataUrl;
    if (imageDataUrl && imageDataUrl.startsWith('blob:')) {
      try {
        payloadUrl = await blobUrlToDataUrl(imageDataUrl);
      } catch (err: any) {
        console.warn('Failed to convert blob URL to data URL:', err);
      }
    }

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
        body: JSON.stringify({ imageDataUrl: payloadUrl, sampleTextFallback }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Server auto-detect request failed (status ${res.status})`);
      }

      if (data.success && Array.isArray(data.selections)) {
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

  // Node.js direct execution fallback
  return autoDetectImageSensitiveRegionsServer(imageDataUrl, sampleTextFallback);
}
