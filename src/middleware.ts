import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "auth-token";
const LOGIN_PATH = "/login";

function isAuthenticated(request: NextRequest): boolean {
  const secret = process.env.API_SECRET;
  if (!secret) return true;

  const cookie = request.cookies.get(COOKIE_NAME);
  return cookie?.value === secret;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === LOGIN_PATH || pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  if (pathname === "/api/cron/generate" || pathname === "/api/cron/leave-recalc") {
    return NextResponse.next();
  }

  if (isAuthenticated(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|manifest).*)",
  ],
};
