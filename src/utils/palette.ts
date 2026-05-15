/**
 * Extract dominant color palette from an image element.
 * Runs on a tiny offscreen canvas for performance.
 */
export function extractPalette(img: HTMLImageElement, count = 5): string[] {
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 80;
    const ctx = cv.getContext('2d');
    if (!ctx) return [];

    ctx.drawImage(img, 0, 0, 80, 80);
    const px = ctx.getImageData(0, 0, 80, 80).data;
    const buckets: Record<string, number> = {};
    const Q = 32;

    for (let i = 0; i < px.length; i += 4) {
      const r = Math.round(px[i] / Q) * Q;
      const g = Math.round(px[i + 1] / Q) * Q;
      const b = Math.round(px[i + 2] / Q) * Q;
      const mn = Math.min(r, g, b);
      const mx = Math.max(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      const lum = (r + g + b) / 3;
      const w = sat > 0.2 ? 5 : lum < 30 || lum > 230 ? 0.5 : 1;
      const k = `${r},${g},${b}`;
      buckets[k] = (buckets[k] || 0) + w;
    }

    const ranked = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    const picked: string[] = [];

    const cdist = (a: string, b: string) => {
      const ar = a.split(',').map(Number);
      const br = b.split(',').map(Number);
      return Math.sqrt(
        (ar[0] - br[0]) ** 2 + (ar[1] - br[1]) ** 2 + (ar[2] - br[2]) ** 2
      );
    };

    for (const [k] of ranked) {
      if (picked.length >= count) break;
      if (picked.every((p) => cdist(k, p) > 60)) picked.push(k);
    }

    return picked.map(
      (k) =>
        '#' +
        k
          .split(',')
          .map((v) =>
            Math.min(255, Math.max(0, +v))
              .toString(16)
              .padStart(2, '0')
          )
          .join('')
    );
  } catch {
    return [];
  }
}

/**
 * Extract palette from an image URL (loads the image first)
 */
export function extractPaletteFromUrl(url: string, count = 5): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(extractPalette(img, count));
    img.onerror = () => resolve([]);
    img.src = url;
  });
}
