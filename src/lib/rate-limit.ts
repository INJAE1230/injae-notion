/**
 * 인메모리 슬라이딩 윈도우 rate limiter.
 *
 * Vercel Fluid Compute는 함수 인스턴스를 재사용하므로 이 Map은 요청 간 유지된다.
 * 다만 인스턴스가 여러 개로 늘어나면 카운터도 인스턴스별로 나뉘므로, 이론상
 * 한도의 N배까지 허용될 수 있다. 완벽한 분산 제한이 필요하면 외부 저장소
 * (Upstash 등)가 필요하지만, 단일 사용자 개인 앱에서 로그인 무차별 대입을
 * 늦추는 목적에는 이 정도로 충분하다고 판단.
 */

type Attempt = { count: number; resetAt: number };

const buckets = new Map<string, Attempt>();

// 메모리 누수 방지: 만료된 항목이 쌓이면 정리
function sweep(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: limit - entry.count, retryAfterSec: 0 };
}

/** 실패를 기록한다. 성공 시에는 호출하지 말 것 */
export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Vercel은 x-forwarded-for를 세팅한다. 없으면 단일 버킷으로 폴백 */
export function getClientKey(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
