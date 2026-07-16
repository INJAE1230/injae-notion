import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  checkRateLimit,
  recordFailure,
  resetRateLimit,
  getClientKey,
} from "@/lib/rate-limit";

const COOKIE_NAME = "auth-token";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10분
const FAILURE_DELAY_MS = 500;

// 길이 차이로 인한 예외/길이 노출을 피하려고 해시로 고정 길이를 만든 뒤 비교
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  const secret = process.env.API_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "API_SECRET이 설정되지 않았습니다" }, { status: 500 });
  }

  const key = getClientKey(request);
  const limit = checkRateLimit(key, MAX_ATTEMPTS, WINDOW_MS);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: `로그인 시도가 너무 많습니다. ${limit.retryAfterSec}초 후 다시 시도해주세요` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const { password } = await request.json();

  if (typeof password !== "string" || !safeEqual(password, secret)) {
    recordFailure(key, WINDOW_MS);
    // 무차별 대입 속도를 떨어뜨린다 (Fluid는 Active CPU 과금이라 대기는 저렴)
    await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  resetRateLimit(key);

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
