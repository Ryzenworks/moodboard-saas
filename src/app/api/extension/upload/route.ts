import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { PLAN_LIMITS } from '@/types';
import { detectImageFormat } from '@/utils/image-format';

/**
 * Raw JSON response — bypasses Next.js response pipeline to prevent
 * font preload Link headers from leaking into extension popup context.
 */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const key = serviceKey || anonKey;
  if (!serviceKey) {
    console.warn('[API/upload] ⚠ No SUPABASE_SERVICE_ROLE_KEY — using anon key. RLS may block.');
  }
  return createClient(supabaseUrl, key);
}

/**
 * POST /api/extension/upload
 * 
 * Body (JSON):
 *   userId:    string — user ID
 *   boardId:   string — target board ID
 *   imageUrl:  string — source image URL to download
 *   filename:  string — desired filename
 * 
 * Flow:
 *   1. Validate params
 *   2. Check plan limits (upload count)
 *   3. Verify board ownership
 *   4. Download image from source URL
 *   5. Upload to Supabase Storage
 *   6. Insert DB image row
 *   7. Update board timestamp
 *   8. Return image data
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  // ── Parse body ──
  let body: { userId?: string; boardId?: string; imageUrl?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { userId, boardId, imageUrl, filename } = body;

  if (!userId || !boardId || !imageUrl) {
    return json({
      error: 'Missing required fields',
      required: ['userId', 'boardId', 'imageUrl'],
    }, 400);
  }

  console.log('[API/upload] Request:', { userId: userId.slice(0, 8) + '...', boardId: boardId.slice(0, 8) + '...', imageUrl: imageUrl.slice(0, 80) });

  // ── Step 0: Server-side dedup — reject duplicate source URLs ──
  try {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: existing } = await supabase
      .from('images')
      .select('id, url, filename')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .gte('created_at', oneMinuteAgo)
      .limit(20);

    if (existing && existing.length > 0) {
      // Check if any existing image came from the same source URL
      // The source URL is stored indirectly via filename pattern or direct URL match
      const duplicate = existing.find((img: { url: string; filename: string }) => {
        // Same filename within 60s is almost certainly a duplicate
        return img.filename === (filename || '').replace(/[^a-zA-Z0-9_.-]/g, '_');
      });

      if (duplicate) {
        console.log('[API/upload] Duplicate detected — returning existing:', duplicate.id);
        return json({
          success: true,
          duplicate: true,
          image: {
            id: duplicate.id,
            url: duplicate.url,
            filename: duplicate.filename,
            boardId,
          },
        });
      }
    }
  } catch (err) {
    // Dedup check is non-critical — continue with upload
    console.warn('[API/upload] Dedup check failed (continuing):', err);
  }

  // ── Step 1: Check plan limits ──
  try {
    const { count: imageCount, error: countErr } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countErr) {
      console.error('[API/upload] Image count query failed:', countErr.message);
    } else {
      // Determine user's plan
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .single();

      const plan = (sub?.plan === 'pro' ? 'pro' : 'free') as 'free' | 'pro';
      const limit = PLAN_LIMITS[plan].maxUploads;
      const current = imageCount ?? 0;

      console.log('[API/upload] Plan:', plan, 'Current:', current, 'Limit:', limit);

      if (limit !== Infinity && current >= limit) {
        return json({
          error: 'Upload limit reached',
          current,
          limit,
          plan,
        }, 403);
      }
    }
  } catch (err) {
    console.warn('[API/upload] Plan check failed (continuing):', err);
    // Fail open — don't block upload on plan check failure
  }

  // ── Step 2: Verify board ownership ──
  try {
    const { data: board, error: boardErr } = await supabase
      .from('boards')
      .select('id, user_id')
      .eq('id', boardId)
      .single();

    if (boardErr || !board) {
      return json({ error: 'Board not found' }, 404);
    }

    if (board.user_id !== userId) {
      return json({ error: 'Board access denied' }, 403);
    }
  } catch (err) {
    console.error('[API/upload] Board verification failed:', err);
    return json({ error: 'Board verification failed' }, 500);
  }

  // ── Step 3: Download image from source URL ──
  let imageBuffer: ArrayBuffer;
  let contentType: string;
  try {
    console.log('[API/upload] Downloading image...');
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MoodboardBot/1.0)',
        'Accept': 'image/*',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!imgRes.ok) {
      return json({
        error: 'Failed to download image',
        status: imgRes.status,
        statusText: imgRes.statusText,
      }, 422);
    }

    contentType = imgRes.headers.get('content-type') || 'image/png';
    imageBuffer = await imgRes.arrayBuffer();
    console.log('[API/upload] Downloaded:', imageBuffer.byteLength, 'bytes, header type:', contentType);

    if (imageBuffer.byteLength < 100) {
      return json({ error: 'Downloaded image too small (likely not an image)' }, 422);
    }
  } catch (err) {
    console.error('[API/upload] Image download failed:', err);
    return json({ error: 'Image download failed: ' + (err instanceof Error ? err.message : 'Unknown error') }, 422);
  }

  // ── Step 4: Detect TRUE format from magic bytes ──
  // Content-Type headers from source servers are unreliable.
  // Magic byte detection is the only way to guarantee correct format.
  const imageBytes = new Uint8Array(imageBuffer);
  const detected = detectImageFormat(imageBytes);

  if (detected) {
    contentType = detected.mime;
    console.log('[API/upload] Magic bytes detected:', detected.mime, '(ext:', detected.ext + ')');
  } else {
    // Clean the header-based contentType (strip charset, etc.)
    contentType = contentType.split(';')[0].trim();
    if (!contentType.startsWith('image/')) {
      contentType = 'image/png';
    }
    console.warn('[API/upload] Magic bytes unrecognized, using header:', contentType);
  }

  const ext = detected?.ext || 'png';
  const safeName = (filename || 'img-' + Date.now()).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const storagePath = `${userId}/${boardId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // ── Step 5: Upload to Supabase Storage ──
  // Use Uint8Array (not raw ArrayBuffer) for cross-platform SDK compatibility.
  try {
    console.log('[API/upload] Uploading to storage:', storagePath, 'as', contentType);
    const { error: uploadErr } = await supabase.storage
      .from('images')
      .upload(storagePath, imageBytes, {
        contentType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadErr) {
      console.error('[API/upload] Storage upload failed:', uploadErr);
      return json({ error: 'Storage upload failed: ' + uploadErr.message }, 500);
    }
    console.log('[API/upload] ✅ Storage upload success');
  } catch (err) {
    console.error('[API/upload] Storage exception:', err);
    return json({ error: 'Storage upload exception' }, 500);
  }

  // ── Step 6: Get public URL ──
  const { data: urlData } = supabase.storage.from('images').getPublicUrl(storagePath);
  const publicUrl = urlData?.publicUrl;

  if (!publicUrl) {
    // Cleanup orphaned file
    await supabase.storage.from('images').remove([storagePath]);
    return json({ error: 'Failed to get public URL' }, 500);
  }

  // ── Step 7: Insert DB row ──
  const sortOrder = Math.floor(Date.now() / 1000) % 2147483647;
  const payload = {
    board_id: boardId,
    user_id: userId,
    filename: safeName,
    storage_path: storagePath,
    url: publicUrl,
    width: null,
    height: null,
    size_bytes: imageBytes.byteLength,
    note: '',
    is_favorite: false,
    palette: '{}',
    sort_order: sortOrder,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: imageRow, error: insertErr } = await (supabase.from('images') as any)
    .insert(payload)
    .select()
    .single();

  if (insertErr) {
    console.error('[API/upload] DB insert failed:', insertErr);
    // Cleanup storage
    await supabase.storage.from('images').remove([storagePath]);
    return json({ error: 'DB insert failed: ' + insertErr.message }, 500);
  }

  console.log('[API/upload] ✅ Image inserted:', imageRow.id);

  // ── Step 8: Update board timestamp ──
  try {
    await supabase
      .from('boards')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', boardId);
  } catch {
    // Non-critical
  }

  return json({
    success: true,
    image: {
      id: imageRow.id,
      url: publicUrl,
      filename: safeName,
      boardId,
    },
  });
}
