import { detectImageFormat } from './image-format';

/**
 * Download an image with guaranteed format integrity.
 *
 * Pipeline:
 *   1. Fetch raw bytes from URL
 *   2. Detect TRUE format from magic bytes (not headers/extension)
 *   3. Create Blob with verified MIME type
 *   4. Ensure filename extension matches actual binary format
 *   5. Trigger download
 *
 * This ensures downloaded files work when uploaded to:
 * Discord, Canva, Figma, Twitter/X, Google Drive, etc.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 8) throw new Error('File too small');

    // ── Detect TRUE format from magic bytes ──
    const detected = detectImageFormat(buffer);
    const mime = detected?.mime || 'image/png';
    const detectedExt = detected?.ext || 'png';

    // ── Ensure filename extension matches actual format ──
    const finalFilename = fixExtension(filename, detectedExt);

    // ── Create blob with CORRECT MIME type ──
    // Use Uint8Array (not raw ArrayBuffer) for maximum compatibility
    const blob = new Blob([new Uint8Array(buffer)], { type: mime });
    const blobUrl = URL.createObjectURL(blob);

    // ── Trigger download ──
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = finalFilename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup after a short delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (err) {
    console.error('[Download] Failed:', err);
    // Fallback: open in new tab and let browser handle it
    window.open(url, '_blank');
  }
}

/**
 * Fix filename extension to match the actual detected format.
 * Replaces wrong extensions and adds missing ones.
 */
function fixExtension(filename: string, correctExt: string): string {
  // Strip any query params or hash from filename
  const clean = filename.split('?')[0].split('#')[0];

  // Check if filename already has the correct extension
  const dotExt = '.' + correctExt;
  if (clean.toLowerCase().endsWith(dotExt)) return clean;

  // Replace existing wrong image extension
  const replaced = clean.replace(/\.(jpe?g|png|gif|webp|bmp|svg|avif|ico)$/i, dotExt);
  if (replaced !== clean) return replaced;

  // No image extension found — append correct one
  return clean + dotExt;
}
