import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/login/";
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/") || request.nextUrl.pathname.startsWith("/auth");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isSharePage = request.nextUrl.pathname.startsWith("/share");
  const isOfflinePage = request.nextUrl.pathname.startsWith("/offline");

  // Allow auth callback, API routes, share pages, and offline page to proceed (they handle auth themselves)
  if (isAuthCallback || isApiRoute || isSharePage || isOfflinePage) return response;

  // Redirect to login if not authenticated (301 to preserve current page for after-login redirect)
  if (!user && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    // Save the current URL so we can redirect back after login
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect away from login if already authenticated
  if (user && isLoginPage) {
    const redirectTo = request.nextUrl.searchParams.get("redirect") || "/";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|mediapipe|equipment|icons|manifest|logo\\.svg|offline).*)"],
};
