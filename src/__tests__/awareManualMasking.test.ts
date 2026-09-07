import {
  extractTextFromRegion,
  findMatchingPhraseOccurrences,
  isSignificantOverlap,
  clampRect,
  ExtractedWord,
  ExtractedTextRegion,
} from '../lib/engine/image/awareMasking';
import { autoDetectImageSensitiveRegionsServer } from '../lib/engine/image/autoImageShieldEngine';

describe('Aware Manual Masking Engine', () => {
  const sampleWords: ExtractedWord[] = [
    { text: 'Project', rect: { x: 50, y: 100, width: 60, height: 20 }, confidence: 95 },
    { text: 'Orion', rect: { x: 120, y: 100, width: 50, height: 20 }, confidence: 98 },
    { text: 'Status:', rect: { x: 50, y: 140, width: 55, height: 20 }, confidence: 90 },
    { text: 'Active', rect: { x: 115, y: 140, width: 50, height: 20 }, confidence: 92 },
    // Repeat occurrence 2 of Orion
    { text: 'Target', rect: { x: 50, y: 200, width: 50, height: 20 }, confidence: 95 },
    { text: 'Orion', rect: { x: 110, y: 200, width: 50, height: 20 }, confidence: 99 },
    // Repeat occurrence 3 of Orion
    { text: 'Codename:', rect: { x: 50, y: 300, width: 80, height: 20 }, confidence: 94 },
    { text: 'Orion', rect: { x: 140, y: 300, width: 50, height: 20 }, confidence: 99 },
    // Multi-word phrase test
    { text: 'First', rect: { x: 50, y: 400, width: 45, height: 20 }, confidence: 96 },
    { text: 'Continental', rect: { x: 100, y: 400, width: 95, height: 20 }, confidence: 97 },
    { text: 'Bank', rect: { x: 200, y: 400, width: 45, height: 20 }, confidence: 98 },
    // Multi-word phrase repeat
    { text: 'Payee:', rect: { x: 50, y: 500, width: 50, height: 20 }, confidence: 95 },
    { text: 'First', rect: { x: 110, y: 500, width: 45, height: 20 }, confidence: 96 },
    { text: 'Continental', rect: { x: 160, y: 500, width: 95, height: 20 }, confidence: 97 },
    { text: 'Bank', rect: { x: 260, y: 500, width: 45, height: 20 }, confidence: 98 },
  ];

  const sampleRegions: ExtractedTextRegion[] = [
    {
      text: 'Project Orion',
      rect: { x: 50, y: 100, width: 120, height: 20 },
      confidence: 96,
      words: sampleWords.slice(0, 2),
    },
    {
      text: 'Status: Active',
      rect: { x: 50, y: 140, width: 115, height: 20 },
      confidence: 91,
      words: sampleWords.slice(2, 4),
    },
    {
      text: 'Target Orion',
      rect: { x: 50, y: 200, width: 110, height: 20 },
      confidence: 97,
      words: sampleWords.slice(4, 6),
    },
    {
      text: 'Codename: Orion',
      rect: { x: 50, y: 300, width: 140, height: 20 },
      confidence: 96,
      words: sampleWords.slice(6, 8),
    },
    {
      text: 'First Continental Bank',
      rect: { x: 50, y: 400, width: 195, height: 20 },
      confidence: 97,
      words: sampleWords.slice(8, 11),
    },
    {
      text: 'Payee: First Continental Bank',
      rect: { x: 50, y: 500, width: 255, height: 20 },
      confidence: 96,
      words: sampleWords.slice(11, 15),
    },
  ];

  describe('extractTextFromRegion', () => {
    it('accurately extracts a single word from a manual user selection box', () => {
      // User draws a box directly over "Orion" at (120, 100, 50, 20)
      const userBox = { x: 118, y: 98, width: 55, height: 24 };
      const extracted = extractTextFromRegion(userBox, sampleWords, sampleRegions);
      expect(extracted).toBe('Orion');
    });

    it('accurately extracts a multi-word phrase in reading order', () => {
      // User draws a box over "First Continental Bank" on line 1
      const userBox = { x: 45, y: 395, width: 205, height: 30 };
      const extracted = extractTextFromRegion(userBox, sampleWords, sampleRegions);
      expect(extracted).toBe('First Continental Bank');
    });

    it('returns empty string if user selection contains no text', () => {
      const emptyBox = { x: 500, y: 500, width: 100, height: 50 };
      const extracted = extractTextFromRegion(emptyBox, sampleWords, sampleRegions);
      expect(extracted).toBe('');
    });
  });

  describe('findMatchingPhraseOccurrences', () => {
    it('scans and finds all other occurrences of a single entity across the image', () => {
      // User manually masked the first occurrence of Orion at (120, 100)
      const userBox = { x: 118, y: 98, width: 55, height: 24 };
      const occurrences = findMatchingPhraseOccurrences(
        'Orion',
        sampleWords,
        sampleRegions,
        1000,
        800,
        userBox
      );

      // Should find the other 2 occurrences (at y=200 and y=300), excluding the initial user box
      expect(occurrences.length).toBe(2);

      // Verify that none of the returned occurrences overlap with the initial user box
      occurrences.forEach((occ) => {
        expect(isSignificantOverlap(occ, userBox)).toBe(false);
      });

      // Occurrence 1 should be around y=200
      expect(occurrences.some((o) => Math.abs(o.y - 200) < 10)).toBe(true);
      // Occurrence 2 should be around y=300
      expect(occurrences.some((o) => Math.abs(o.y - 300) < 10)).toBe(true);
    });

    it('scans and finds all other occurrences of a multi-word phrase across the image', () => {
      // User manually masks the first "First Continental Bank" at y=400
      const userBox = { x: 48, y: 398, width: 200, height: 24 };
      const occurrences = findMatchingPhraseOccurrences(
        'First Continental Bank',
        sampleWords,
        sampleRegions,
        1000,
        800,
        userBox
      );

      // Should find the second occurrence at y=500
      expect(occurrences.length).toBe(1);
      expect(Math.abs(occurrences[0].y - 500)).toBeLessThan(10);
      expect(occurrences[0].width).toBeGreaterThanOrEqual(190);
      expect(isSignificantOverlap(occurrences[0], userBox)).toBe(false);
    });

    it('returns empty array when no other occurrences exist', () => {
      const userBox = { x: 113, y: 138, width: 55, height: 24 }; // over "Active"
      const occurrences = findMatchingPhraseOccurrences(
        'Active',
        sampleWords,
        sampleRegions,
        1000,
        800,
        userBox
      );
      expect(occurrences.length).toBe(0);
    });
  });

  describe('Server OCR Attachment', () => {
    it('attaches ocrWords and ocrRegions to SVG auto-detect selections', async () => {
      const sampleSvg = `<svg width="500" height="200" xmlns="http://www.w3.org/2000/svg">
        <text x="20" y="40">Confidential Employee Record</text>
        <text x="20" y="80">Name: John Doe</text>
        <text x="20" y="120">Email: john.doe@acme.org</text>
      </svg>`;
      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(sampleSvg)}`;

      const selections = await autoDetectImageSensitiveRegionsServer(dataUrl);
      expect(Array.isArray(selections)).toBe(true);
      expect(selections.length).toBeGreaterThan(0);

      // OCR metadata attached directly to array
      const ocrWords = (selections as any).ocrWords;
      const ocrRegions = (selections as any).ocrRegions;
      expect(Array.isArray(ocrWords)).toBe(true);
      expect(ocrWords.length).toBeGreaterThan(0);
      expect(Array.isArray(ocrRegions)).toBe(true);
      expect(ocrRegions.length).toBeGreaterThan(0);

      // Verify that extractTextFromRegion works with the returned OCR data
      const nameWord = ocrWords.find((w: any) => w.text.toLowerCase().includes('john'));
      expect(nameWord).toBeDefined();

      if (nameWord) {
        const text = extractTextFromRegion(nameWord.rect, ocrWords, ocrRegions);
        expect(text.toLowerCase()).toContain('john');
      }
    });
  });
});
