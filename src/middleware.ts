import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/forgot-password", "/reset-password"]);
const AUTH_ROUTES = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

export default auth((request) => {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const isSignedIn = Boolean(request.auth?.user);

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  if (isSignedIn && AUTH_ROUTES.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (!isSignedIn && !PUBLIC_ROUTES.has(pathname)) {
    const redirectUrl = new URL("/login", nextUrl);
    if (pathname !== "/") redirectUrl.searchParams.set("callbackUrl", pathname + nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Everything except Next internals, static assets and the API surface,
     * which performs its own per-route authentication and authorization.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
