/**
 * Image format detection via magic bytes.
 * This is the ONLY reliable way to determine image format —
 * Content-Type headers and file extensions can be wrong.
 */

export interface ImageFormat {
  mime: string;
  ext: string;
}

/**
 * Detect image format from the first bytes of the buffer.
 * Returns null if format is unrecognized.
 */
export function detectImageFormat(buffer: ArrayBuffer | Uint8Array): ImageFormat | null {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (bytes.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return { mime: 'image/gif', ext: 'gif' };
  }

  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
    return { mime: 'image/bmp', ext: 'bmp' };
  }

  // AVIF: starts with ftyp box containing 'avif'
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    // Check for 'avif' or 'avis' brand
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === 'avif' || brand === 'avis') {
      return { mime: 'image/avif', ext: 'avif' };
    }
  }

  // SVG: starts with '<' or '<?xml'
  if (bytes[0] === 0x3C) {
    const head = new TextDecoder().decode(bytes.slice(0, 256)).toLowerCase();
    if (head.includes('<svg')) {
      return { mime: 'image/svg+xml', ext: 'svg' };
    }
  }

  // ICO: 00 00 01 00
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return { mime: 'image/x-icon', ext: 'ico' };
  }

  return null;
}

/**
 * Get the correct file extension for a MIME type.
 */
export function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
    'image/x-icon': 'ico',
  };
  return map[mime] || 'png';
}

/**
 * Get MIME type from file extension.
 */
export function extToMime(ext: string): string {
  const map: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'avif': 'image/avif',
    'ico': 'image/x-icon',
  };
  return map[ext.toLowerCase()] || 'image/png';
}
