import { ImageRect } from '../../../types';

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

/**
 * Client and Server safe SVG XML text parser.
 * Pure string parsing with zero Node.js/browser binary dependencies.
 */
export function parseSvgToRegions(svgText: string): { regions: ExtractedTextRegion[]; allWords: ExtractedWord[] } {
  const regions: ExtractedTextRegion[] = [];
  const allWords: ExtractedWord[] = [];

  const textRegex = /<text\s+([^>]*?)>([\s\S]*?)<\/text>/gi;
  let match: RegExpExecArray | null;

  while ((match = textRegex.exec(svgText)) !== null) {
    const attrs = match[1];
    let rawContent = match[2]
      .replace(/<[^>]+>/g, '') // strip nested tags
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
