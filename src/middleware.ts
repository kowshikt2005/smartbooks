import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/customers',
  '/items',
  '/inventory',
  '/invoices',
  '/reports',
  '/settings',
  '/api/customers',
  '/api/items',
  '/api/invoices',
  '/api/inventory',
  '/api/reports',
  '/api/whatsapp',
];

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/auth',
  '/api/auth',
  '/api/health',
];

// Define admin-only routes (for future use)
const adminRoutes = [
  '/admin',
  '/api/admin',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TEMPORARY: Allow access to customer pages for testing
  if (pathname.startsWith('/customers') || pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Create a Supabase client configured to use cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  // Check if the current route is admin-only
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Handle authentication for protected routes
  if (isProtectedRoute) {
    if (!session) {
      // Redirect to login if not authenticated
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check for admin routes (future implementation)
    if (isAdminRoute) {
      // Add admin role check here when user roles are implemented
      // For now, allow all authenticated users
    }
  }

  // Handle public routes when user is already authenticated
  if (pathname === '/login' && session) {
    // Redirect to dashboard if already logged in
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Handle root route
  if (pathname === '/') {
    if (session) {
      // Redirect authenticated users to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      // Redirect unauthenticated users to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Add security headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Set security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  // Add CSRF protection for API routes
  if (pathname.startsWith('/api/') && request.method !== 'GET') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    if (!origin || !host || !origin.includes(host)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

// Helper function to check if user has admin role (for future use)
export const isAdmin = (session: any): boolean => {
  // This will be implemented when user roles are added to the database
  // For now, return false
  return false;
};

// Helper function to get user role (for future use)
export const getUserRole = (session: any): string => {
  // This will be implemented when user roles are added to the database
  // For now, return 'user'
  return 'user';
};