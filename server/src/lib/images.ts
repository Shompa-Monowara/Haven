export interface ImageDimensions {
  width: number;
  height: number;
}

interface ImageRules {
  minWidth: number;
  minHeight: number;
  maxDimension: number;
  maxPixels: number;
}

const DEFAULT_RULES: ImageRules = {
  minWidth: 1,
  minHeight: 1,
  maxDimension: 8000,
  maxPixels: 40_000_000,
};

/**
 * Reads width/height from PNG, JPEG, or WebP headers without decoding pixels.
 * Returns null when the format is not recognized.
 */
export function readImageDimensions(buffer: Buffer, mimetype: string): ImageDimensions | null {
  if (mimetype === "image/png") return readPng(buffer);
  if (mimetype === "image/jpeg") return readJpeg(buffer);
  if (mimetype === "image/webp") return readWebp(buffer);
  return null;
}

function readPng(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpeg(buffer: Buffer): ImageDimensions | null {
  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1]!;

    // Start-of-frame markers carry the dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    offset += 2 + length;
  }

  return null;
}

function readWebp(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return null;
}

/**
 * Validates an uploaded image against size/dimension rules.
 * Returns an error message, or null when the image is acceptable.
 */
export function validateImage(
  buffer: Buffer,
  mimetype: string,
  rules: Partial<ImageRules> = {},
): string | null {
  const limits = { ...DEFAULT_RULES, ...rules };
  const dimensions = readImageDimensions(buffer, mimetype);

  // Unknown/unparseable formats still have a byte cap via multer; only enforce
  // dimension rules when we can read them (WebP variants are the common case).
  if (!dimensions) return null;

  const { width, height } = dimensions;

  if (width < limits.minWidth || height < limits.minHeight) {
    return `Image is too small (minimum ${limits.minWidth}×${limits.minHeight}px)`;
  }

  if (width > limits.maxDimension || height > limits.maxDimension) {
    return `Image dimensions are too large (maximum ${limits.maxDimension}px per side)`;
  }

  if (width * height > limits.maxPixels) {
    return "Image resolution is too high";
  }

  return null;
}