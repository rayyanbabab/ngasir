import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Better Auth session cookie
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthenticated = !!sessionCookie;

  // Protected routes
  const protectedPaths = ["/dashboard", "/pos", "/inventory", "/transactions", "/settings"];
  const isProtectedRoute = protectedPaths.some((p) => pathname.startsWith(p));

  // Auth pages: redirect to dashboard if already authenticated
  const isAuthPage = pathname === "/login";
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pos/:path*",
    "/inventory/:path*",
    "/transactions/:path*",
    "/settings/:path*",
  ],
};
