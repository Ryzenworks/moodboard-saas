import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

/**
 * Raw JSON response helper — bypasses Next.js response pipeline entirely.
 * This prevents Next.js from injecting Link preload headers (fonts, etc.)
 * into extension API responses, which would pollute the extension popup console.
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

/**
 * GET /api/extension/boards?userId=xxx
 * Returns the user's boards for the extension popup dropdown.
 *
 * Uses service role key to bypass RLS (the extension doesn't have the user's session).
 * Falls back to anon key if service role key is not configured.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return json({ error: 'Missing userId parameter' }, 400);
  }

  // Use service role key if available (bypasses RLS), otherwise anon key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = serviceKey || anonKey;

  if (!serviceKey) {
    console.warn('[API/extension/boards] ⚠ SUPABASE_SERVICE_ROLE_KEY not set — using anon key. RLS may block queries.');
  }

  const supabase = createClient(supabaseUrl, key);

  try {
    console.log('[API/extension/boards] Fetching boards for userId:', userId);
    const { data: boards, error } = await supabase
      .from('boards')
      .select('id, name, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[API/extension/boards] DB error:', error.message, error.code, error.details);
      return json({
        error: error.message,
        hint: 'Check if SUPABASE_SERVICE_ROLE_KEY is set in .env.local',
      }, 500);
    }

    const count = boards?.length ?? 0;
    console.log('[API/extension/boards] Found', count, 'boards');

    // If 0 boards returned and no service key, it's likely an RLS issue
    if (count === 0 && !serviceKey) {
      console.warn('[API/extension/boards] 0 boards returned. This may be due to RLS blocking. Set SUPABASE_SERVICE_ROLE_KEY.');
      return json({
        boards: [],
        warning: 'No boards found. If boards exist, add SUPABASE_SERVICE_ROLE_KEY to .env.local',
        debug: { userId, usingServiceKey: false },
      });
    }

    return json({
      boards: (boards || []).map((b: { id: string; name: string }) => ({
        id: b.id,
        name: b.name,
      })),
      debug: { userId, count, usingServiceKey: !!serviceKey },
    });
  } catch (err) {
    console.error('[API/extension/boards] Exception:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}
