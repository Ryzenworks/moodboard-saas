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

  // If logged in and trying to access auth pages, redirect to dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/boards';
    return NextResponse.redirect(url);
  }

  // Onboarding redirect — check if user needs onboarding
  // Only for authenticated users on dashboard routes (not /welcome, /api, /auth)
  if (user && !isAuthPage && !isPublicPage && !isApiRoute && !isWelcomePage && !isExtAuthPage) {
    // FAST PATH: cookie bypass — set by client when onboarding is completed
    // This prevents the deadlock where DB update fails but user should still proceed
    const onboardedCookie = request.cookies.get('moodboard_onboarded');
    if (onboardedCookie?.value === '1') {
      // User has completed onboarding (cookie set by client)
      return supabaseResponse;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single();

      if (profile && profile.onboarding_complete === false) {
        const url = request.nextUrl.clone();
        url.pathname = '/welcome';
        return NextResponse.redirect(url);
      }
    } catch {
      // Fail open — don't block navigation if profile check fails
    }
  }

  return supabaseResponse;
}
