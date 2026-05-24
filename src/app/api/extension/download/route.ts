import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/extension/download
 * 
 * Serves the extension ZIP with byte-for-byte binary integrity.
 * Uses Web Response API directly to avoid any Next.js body transforms.
 */
export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'moodboard-extension.zip');
    const buffer = readFileSync(filePath);

    // Convert Node Buffer → Uint8Array (pure binary, no encoding)
    const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="moodboard-extension.zip"',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'no-cache, no-store',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Extension file not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
