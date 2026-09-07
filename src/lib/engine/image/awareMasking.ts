import { ImageRect } from '../../../types';

export interface ExtractedWord {
  text: string;
  rect: ImageRect;
  confidence?: number;
}

export interface ExtractedTextRegion {
  text: string;
  rect: ImageRect;
  confidence?: number;
  words?: ExtractedWord[];
}

/**
 * Clamps an ImageRect inside image coordinate bounds.
 */
export function clampRect(rect: ImageRect, imgWidth: number, imgHeight: number): ImageRect {
  const maxW = Math.max(10, imgWidth || 1000);
  const maxH = Math.max(10, imgHeight || 1000);

  const x = Math.max(0, Math.min(maxW - 4, Math.round(rect.x)));
  const y = Math.max(0, Math.min(maxH - 4, Math.round(rect.y)));
  const width = Math.max(4, Math.min(maxW - x, Math.round(rect.width)));
  const height = Math.max(4, Math.min(maxH - y, Math.round(rect.height)));

  return { x, y, width, height };
}

/**
 * Determines whether two rectangles have significant geometric overlap.
 */
export function isSignificantOverlap(r1: ImageRect, r2: ImageRect, threshold = 0.25): boolean {
  const x1 = Math.max(r1.x, r2.x);
  const y1 = Math.max(r1.y, r2.y);
  const x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
  const y2 = Math.min(r1.y + r1.height, r2.y + r2.height);

  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);
  const intersectArea = w * h;

  if (intersectArea <= 0) return false;

  const a1 = r1.width * r1.height;
  const a2 = r2.width * r2.height;
  const iou = intersectArea / (a1 + a2 - intersectArea);
  const minOverlap = intersectArea / Math.min(a1, a2);

  return iou >= threshold || minOverlap >= 0.45;
}

/**
 * Extracts the recognized text underneath a user-specified bounding box.
 * Evaluates OCR word bounds and lines to accurately reconstruct the masked entity.
 */
export function extractTextFromRegion(
  rect: ImageRect,
  allWords: ExtractedWord[] = [],
  regions: ExtractedTextRegion[] = []
): string {
  if (!rect || rect.width <= 0 || rect.height <= 0) return '';

  const matchedWords: ExtractedWord[] = [];

  for (const word of allWords) {
    if (!word.text || !word.text.trim()) continue;

    const x1 = Math.max(rect.x, word.rect.x);
    const y1 = Math.max(rect.y, word.rect.y);
    const x2 = Math.min(rect.x + rect.width, word.rect.x + word.rect.width);
    const y2 = Math.min(rect.y + rect.height, word.rect.y + word.rect.height);

    const overlapW = Math.max(0, x2 - x1);
    const overlapH = Math.max(0, y2 - y1);
    const overlapArea = overlapW * overlapH;
    const wordArea = Math.max(1, word.rect.width * word.rect.height);

    // Center point checks
    const wordCenterX = word.rect.x + word.rect.width / 2;
    const wordCenterY = word.rect.y + word.rect.height / 2;
    const wordCenterInRect =
      wordCenterX >= rect.x &&
      wordCenterX <= rect.x + rect.width &&
      wordCenterY >= rect.y &&
      wordCenterY <= rect.y + rect.height;

    const rectCenterX = rect.x + rect.width / 2;
    const rectCenterY = rect.y + rect.height / 2;
    const rectCenterInWord =
      rectCenterX >= word.rect.x &&
      rectCenterX <= word.rect.x + word.rect.width &&
      rectCenterY >= word.rect.y &&
      rectCenterY <= word.rect.y + word.rect.height;

    if (wordCenterInRect || rectCenterInWord || overlapArea / wordArea >= 0.2) {
      matchedWords.push(word);
    }
  }

  // If matched individual words, sort them into reading order and return
  if (matchedWords.length > 0) {
    const avgH =
      matchedWords.reduce((sum, w) => sum + w.rect.height, 0) / matchedWords.length;
    const lineThreshold = Math.max(10, avgH * 0.6);

    // Group words into lines
    const lines: { y: number; words: ExtractedWord[] }[] = [];
    for (const w of matchedWords) {
      const centerY = w.rect.y + w.rect.height / 2;
      const existingLine = lines.find((l) => Math.abs(l.y - centerY) < lineThreshold);
      if (existingLine) {
        existingLine.words.push(w);
      } else {
        lines.push({ y: centerY, words: [w] });
      }
    }

    // Sort lines top to bottom, and words left to right
    lines.sort((a, b) => a.y - b.y);
    const assembledParts: string[] = [];

    for (const line of lines) {
      line.words.sort((a, b) => a.rect.x - b.rect.x);
      assembledParts.push(line.words.map((w) => w.text.trim()).join(' '));
    }

    return assembledParts.join(' ').trim();
  }

  // Fallback: check regions (lines) if allWords was empty
  for (const reg of regions) {
    if (!reg.text || !reg.text.trim()) continue;
    if (isSignificantOverlap(rect, reg.rect, 0.2)) {
      return reg.text.trim();
    }
  }

  return '';
}

/**
 * Scans an image's OCR words and line regions to find all other occurrences of a target entity phrase.
 * Returns precise bounding boxes for all matching entities across the document.
 */
export function findMatchingPhraseOccurrences(
  phrase: string,
  allWords: ExtractedWord[] = [],
  regions: ExtractedTextRegion[] = [],
  imageWidth: number,
  imageHeight: number,
  excludeRect?: ImageRect
): ImageRect[] {
  if (!phrase || phrase.trim().length < 2) {
    return [];
  }

  const rawPhrase = phrase.trim();
  const lowerPhrase = rawPhrase.toLowerCase();
  const cleanPhrase = lowerPhrase.replace(/[^a-z0-9]/gi, '');
  const tokens = rawPhrase.split(/\s+/).filter(Boolean);
  const lowerTokens = tokens.map((t) => t.toLowerCase());
  const cleanTokens = lowerTokens.map((t) => t.replace(/[^a-z0-9]/gi, '')).filter(Boolean);

  const foundMatches: ImageRect[] = [];

  // 1. Multi-Word Phrase Matching
  if (tokens.length >= 2) {
    // Check across regions lines first (natural reading order)
    const linesToScan: { text: string; rect: ImageRect; words: ExtractedWord[] }[] = [];

    if (regions.length > 0) {
      for (const reg of regions) {
        const lineWords =
          reg.words && reg.words.length > 0
            ? reg.words
            : allWords.filter(
                (w) =>
                  w.rect.y >= reg.rect.y - 8 &&
                  w.rect.y + w.rect.height <= reg.rect.y + reg.rect.height + 8
              );
        linesToScan.push({ text: reg.text, rect: reg.rect, words: lineWords });
      }
    } else {
      // Group allWords into synthetic lines
      const sortedWords = [...allWords].sort((a, b) => a.rect.y - b.rect.y);
      const groups: ExtractedWord[][] = [];
      for (const w of sortedWords) {
        const lastGroup = groups[groups.length - 1];
        if (
          lastGroup &&
          lastGroup.length > 0 &&
          Math.abs(lastGroup[0].rect.y - w.rect.y) <= Math.max(12, w.rect.height * 0.7)
        ) {
          lastGroup.push(w);
        } else {
          groups.push([w]);
        }
      }
      for (const g of groups) {
        g.sort((a, b) => a.rect.x - b.rect.x);
        const minX = Math.min(...g.map((w) => w.rect.x));
        const minY = Math.min(...g.map((w) => w.rect.y));
        const maxX = Math.max(...g.map((w) => w.rect.x + w.rect.width));
        const maxY = Math.max(...g.map((w) => w.rect.y + w.rect.height));
        linesToScan.push({
          text: g.map((w) => w.text).join(' '),
          rect: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
          words: g,
        });
      }
    }

    for (const line of linesToScan) {
      const lineWords = line.words;
      if (!lineWords || lineWords.length < tokens.length) continue;

      // Sliding window over line words
      for (let i = 0; i <= lineWords.length - tokens.length; i++) {
        const windowSlice = lineWords.slice(i, i + tokens.length);
        const sliceText = windowSlice.map((w) => w.text).join(' ').toLowerCase();
        const sliceClean = windowSlice.map((w) => w.text.toLowerCase().replace(/[^a-z0-9]/gi, '')).join(' ');
        const targetCleanJoined = cleanTokens.join(' ');

        const isMatch =
          sliceText === lowerPhrase ||
          sliceClean === targetCleanJoined ||
          (cleanTokens.length > 0 && sliceClean.includes(targetCleanJoined));

        if (isMatch) {
          const minX = Math.min(...windowSlice.map((w) => w.rect.x));
          const minY = Math.min(...windowSlice.map((w) => w.rect.y));
          const maxX = Math.max(...windowSlice.map((w) => w.rect.x + w.rect.width));
          const maxY = Math.max(...windowSlice.map((w) => w.rect.y + w.rect.height));

          foundMatches.push(
            clampRect(
              {
                x: minX - 2,
                y: minY - 2,
                width: maxX - minX + 4,
                height: maxY - minY + 4,
              },
              imageWidth,
              imageHeight
            )
          );
        }
      }
    }
  } else {
    // 2. Single-Token Matching across allWords
    const targetToken = lowerTokens[0] || '';
    const targetTokenClean = cleanTokens[0] || '';

    for (const word of allWords) {
      if (!word.text || !word.text.trim()) continue;
      const wLower = word.text.trim().toLowerCase();
      const wClean = wLower.replace(/[^a-z0-9]/gi, '');

      // Exact match, clean match, or substring match for tokens >= 4 characters
      const isExact = wLower === targetToken;
      const isClean = targetTokenClean.length >= 2 && wClean === targetTokenClean;
      const isSub =
        targetTokenClean.length >= 4 &&
        wClean.length >= targetTokenClean.length &&
        wClean.includes(targetTokenClean);

      if (isExact || isClean || isSub) {
        foundMatches.push(
          clampRect(
            {
              x: word.rect.x - 2,
              y: word.rect.y - 2,
              width: word.rect.width + 4,
              height: word.rect.height + 4,
            },
            imageWidth,
            imageHeight
          )
        );
      }
    }
  }

  // 3. Filter out the original selection rectangle (excludeRect)
  const nonExcluded = foundMatches.filter((m) => {
    if (!excludeRect) return true;
    return !isSignificantOverlap(m, excludeRect, 0.25);
  });

  // 4. Deduplicate overlapping matches
  const uniqueMatches: ImageRect[] = [];
  for (const match of nonExcluded) {
    const alreadyExists = uniqueMatches.some((existing) =>
      isSignificantOverlap(match, existing, 0.4)
    );
    if (!alreadyExists) {
      uniqueMatches.push(match);
    }
  }

  return uniqueMatches;
}
