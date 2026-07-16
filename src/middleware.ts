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

  // 크론 라우트는 각자 CRON_SECRET Bearer로 인증한다. 개별 경로를 나열하면
  // 새 크론을 추가할 때 빠뜨리기 쉬워(실제로 leave-recalc가 그랬음) prefix로 처리.
  if (pathname.startsWith("/api/cron/")) {
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
