
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMessage = "CRITICAL ERROR: Your Supabase URL and Key are not configured in your hosting provider's environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your project settings and re-deploy.";
    return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(errorMessage)}`, request.url));
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            response.cookies.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            response.cookies.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define protected routes
  const protectedPaths = ['/dashboard']
  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // If user is not logged in and is trying to access a protected route, redirect to login
  if (!user && isProtectedRoute) {
    // prevent redirect loop if somehow on login page
    if (request.nextUrl.pathname.startsWith('/login')) {
        return response;
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const hasRefCode = request.nextUrl.searchParams.has('ref');

  // If user is logged in...
  if (user) {
    // ...and tries to access login page, redirect to dashboard
    if (request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // ...and tries to access signup page WITHOUT a referral code, redirect to dashboard.
    // This allows them (and others) to view the signup page when a referral link is used.
    if (request.nextUrl.pathname === '/signup' && !hasRefCode) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /auth/callback (Supabase auth callback)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}
