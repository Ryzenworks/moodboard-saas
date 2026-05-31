import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: don't remove this
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes: redirect to login if not authenticated
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith('/login') || path.startsWith('/signup');
  const isPublicPage = path === '/' || path.startsWith('/auth/');
  const isApiRoute = path.startsWith('/api/');
  const isWelcomePage = path === '/welcome';
  const isExtAuthPage = path === '/extension-auth';

  if (!user && !isAuthPage && !isPublicPage && !isApiRoute && !isExtAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If logged in and trying to access auth pages or landing page, redirect to dashboard
  if (user && (isAuthPage || path === '/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/boards';
    return NextResponse.redirect(url);
  }

  // Onboarding redirect — check if user needs onboarding
  // Only for authenticated users on dashboard routes (not /welcome, /api, /auth)
  if (user && !isAuthPage && !isPublicPage && !isApiRoute && !isWelcomePage && !isExtAuthPage) {
    // FAST PATH: cookie bypass — set by client when onboarding is completed
    const onboardedCookie = request.cookies.get('moodboard_onboarded');
    if (onboardedCookie?.value === '1') {
      return supabaseResponse;
    }

    // No cookie — check DB as authoritative source
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        // No profile row or query failed — fail open, don't block returning users
        // Self-heal: set the cookie so we don't hit DB again
        supabaseResponse.cookies.set('moodboard_onboarded', '1', {
          path: '/',
          maxAge: 31536000,
          sameSite: 'lax',
        });
        return supabaseResponse;
      }

      if (profile.onboarding_complete === true) {
        // DB confirms onboarding is done — self-heal the missing cookie
        // so future requests skip the DB query entirely
        supabaseResponse.cookies.set('moodboard_onboarded', '1', {
          path: '/',
          maxAge: 31536000,
          sameSite: 'lax',
        });
        return supabaseResponse;
      }

      if (profile.onboarding_complete === false) {
        // Onboarding genuinely not completed — redirect to /welcome
        const url = request.nextUrl.clone();
        url.pathname = '/welcome';
        return NextResponse.redirect(url);
      }
    } catch {
      // Fail open — don't block navigation if profile check fails
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}
