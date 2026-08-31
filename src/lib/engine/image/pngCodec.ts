import * as zlib from 'zlib';

/**
 * Standard CRC32 table and calculation for PNG chunks
 */
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function calcCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = calcCrc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

export interface DecodedPng {
  width: number;
  height: number;
  data: Buffer; // Raw RGBA buffer (width * height * 4 bytes)
}

/**
 * Decodes a PNG buffer or Data URL into raw RGBA pixels.
 */
export function decodePng(pngInput: Buffer | string): DecodedPng {
  let buf: Buffer;
  if (typeof pngInput === 'string') {
    const base64Index = pngInput.indexOf('base64,');
    const base64Str = base64Index !== -1 ? pngInput.substring(base64Index + 7) : pngInput;
    buf = Buffer.from(base64Str, 'base64');
  } else {
    buf = pngInput;
  }

  // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  if (buf.length < 8 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6; // 6 = RGBA, 2 = RGB, 0 = Grayscale
  const idatChunks: Buffer[] = [];

  while (offset < buf.length) {
    const chunkLen = buf.readUInt32BE(offset);
    const chunkType = buf.toString('ascii', offset + 4, offset + 8);
    const chunkData = buf.subarray(offset + 8, offset + 8 + chunkLen);

    if (chunkType === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8];
      colorType = chunkData[9];
    } else if (chunkType === 'IDAT') {
      idatChunks.push(chunkData);
    } else if (chunkType === 'IEND') {
      break;
    }

    offset += 12 + chunkLen;
  }

  if (width === 0 || height === 0) {
    throw new Error('Invalid PNG: IHDR chunk missing or empty dimensions');
  }

  const compressedData = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressedData);

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const rawRgba = Buffer.alloc(width * height * 4);
  const rowBytes = width * bytesPerPixel;
  let inOffset = 0;

  // Unfilter scanlines
  const prevRow = Buffer.alloc(rowBytes);
  const curRow = Buffer.alloc(rowBytes);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[inOffset++];
    for (let x = 0; x < rowBytes; x++) {
      const val = decompressed[inOffset++];
      const a = x >= bytesPerPixel ? curRow[x - bytesPerPixel] : 0;
      const b = prevRow[x];
      const c = x >= bytesPerPixel ? prevRow[x - bytesPerPixel] : 0;

      let unfiltered = val;
      if (filterType === 1) {
        // Sub
        unfiltered = (val + a) & 0xff;
      } else if (filterType === 2) {
        // Up
        unfiltered = (val + b) & 0xff;
      } else if (filterType === 3) {
        // Average
        unfiltered = (val + Math.floor((a + b) / 2)) & 0xff;
      } else if (filterType === 4) {
        // Paeth
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        unfiltered = (val + pr) & 0xff;
      }

      curRow[x] = unfiltered;
    }

    // Convert row to RGBA
    for (let px = 0; px < width; px++) {
      const outIdx = (y * width + px) * 4;
      if (colorType === 6) {
        const inIdx = px * 4;
        rawRgba[outIdx] = curRow[inIdx];
        rawRgba[outIdx + 1] = curRow[inIdx + 1];
        rawRgba[outIdx + 2] = curRow[inIdx + 2];
        rawRgba[outIdx + 3] = curRow[inIdx + 3];
      } else if (colorType === 2) {
        const inIdx = px * 3;
        rawRgba[outIdx] = curRow[inIdx];
        rawRgba[outIdx + 1] = curRow[inIdx + 1];
        rawRgba[outIdx + 2] = curRow[inIdx + 2];
        rawRgba[outIdx + 3] = 255;
      } else {
        const inIdx = px;
        rawRgba[outIdx] = curRow[inIdx];
        rawRgba[outIdx + 1] = curRow[inIdx];
        rawRgba[outIdx + 2] = curRow[inIdx];
        rawRgba[outIdx + 3] = 255;
      }
    }

    curRow.copy(prevRow);
  }

  return {
    width,
    height,
    data: rawRgba,
  };
}

/**
 * Encodes RGBA pixel buffer to a PNG buffer.
 */
export function encodePng(rgbaData: Buffer, width: number, height: number): Buffer {
  const rowBytes = width * 4;
  const filteredData = Buffer.alloc(height * (rowBytes + 1));

  for (let y = 0; y < height; y++) {
    filteredData[y * (rowBytes + 1)] = 0; // Filter: 0 (None)
    rgbaData.copy(
      filteredData,
      y * (rowBytes + 1) + 1,
      y * rowBytes,
      (y + 1) * rowBytes
    );
  }

  const deflated = zlib.deflateSync(filteredData);

  // 1. Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // 2. IHDR Chunk (13 bytes)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: 0
  ihdrData[11] = 0; // Filter: 0
  ihdrData[12] = 0; // Interlace: 0
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // 3. IDAT Chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // 4. IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Encodes RGBA pixel buffer to PNG Data URL.
 */
export function encodePngDataUrl(rgbaData: Buffer, width: number, height: number): string {
  const pngBuf = encodePng(rgbaData, width, height);
  return `data:image/png;base64,${pngBuf.toString('base64')}`;
}

/**
 * Extracts a rectangular sub-region from an RGBA buffer.
 */
export function cropRgba(
  src: Buffer,
  srcW: number,
  srcH: number,
  rect: { x: number; y: number; width: number; height: number }
): { data: Buffer; width: number; height: number } {
  const x = Math.max(0, Math.min(srcW - 1, Math.round(rect.x)));
  const y = Math.max(0, Math.min(srcH - 1, Math.round(rect.y)));
  const w = Math.max(1, Math.min(srcW - x, Math.round(rect.width)));
  const h = Math.max(1, Math.min(srcH - y, Math.round(rect.height)));

  const dst = Buffer.alloc(w * h * 4);

  for (let row = 0; row < h; row++) {
    const srcStart = ((y + row) * srcW + x) * 4;
    const srcEnd = srcStart + w * 4;
    const dstStart = row * w * 4;
    src.copy(dst, dstStart, srcStart, srcEnd);
  }

  return { data: dst, width: w, height: h };
}

/**
 * Composites a rectangular crop buffer back onto an RGBA canvas at (x, y).
 */
export function pasteRgba(
  dst: Buffer,
  dstW: number,
  dstH: number,
  cropData: Buffer,
  rect: { x: number; y: number; width: number; height: number }
): void {
  const x = Math.max(0, Math.min(dstW - 1, Math.round(rect.x)));
  const y = Math.max(0, Math.min(dstH - 1, Math.round(rect.y)));
  const w = Math.max(1, Math.min(dstW - x, Math.round(rect.width)));
  const h = Math.max(1, Math.min(dstH - y, Math.round(rect.height)));

  for (let row = 0; row < h; row++) {
    const cropStart = row * w * 4;
    const cropEnd = cropStart + w * 4;
    const dstStart = ((y + row) * dstW + x) * 4;
    cropData.copy(dst, dstStart, cropStart, cropEnd);
  }
}

/**
 * Fills a rectangle on an RGBA canvas with a solid color.
 */
export function fillRgbaRect(
  dst: Buffer,
  dstW: number,
  dstH: number,
  rect: { x: number; y: number; width: number; height: number },
  color: [number, number, number, number] = [15, 23, 42, 255] // Default dark slate #0f172a
): void {
  const x = Math.max(0, Math.min(dstW - 1, Math.round(rect.x)));
  const y = Math.max(0, Math.min(dstH - 1, Math.round(rect.y)));
  const w = Math.max(1, Math.min(dstW - x, Math.round(rect.width)));
  const h = Math.max(1, Math.min(dstH - y, Math.round(rect.height)));

  const [r, g, b, a] = color;

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const idx = ((y + row) * dstW + (x + col)) * 4;
      dst[idx] = r;
      dst[idx + 1] = g;
      dst[idx + 2] = b;
      dst[idx + 3] = a;
    }
  }
}

/**
 * Creates a synthetic multi-color test image for unit tests.
 */
export function createTestImage(
  width: number = 200,
  height: number = 150
): { dataUrl: string; rgbaBuffer: Buffer } {
  const rgbaBuffer = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rgbaBuffer[idx] = (x * 7 + y * 3) % 256; // R
      rgbaBuffer[idx + 1] = (y * 5 + 50) % 256; // G
      rgbaBuffer[idx + 2] = (x * y + 100) % 256; // B
      rgbaBuffer[idx + 3] = 255; // A
    }
  }

  const dataUrl = encodePngDataUrl(rgbaBuffer, width, height);
  return { dataUrl, rgbaBuffer };
}
