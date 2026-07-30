import React from "react";
import type { WorkLog } from "@/lib/types";

/**
 * 검색 결과에 "왜 이 업무가 나왔는지"를 보여준다.
 *
 * 검색은 제목뿐 아니라 업무내용·입력원본·성과까지 훑기 때문에, 제목에 없는
 * 단어로 찾으면 매칭 근거가 화면에 전혀 드러나지 않았다. 제목 매칭은 이미
 * 눈에 보이므로 제외하고, 나머지 필드에서 맞은 구간만 발췌해 보여준다.
 */

const CONTEXT = 28; // 매칭 지점 앞뒤로 보여줄 글자 수

/** 검색어 문자열을 키워드 배열로 (서버 필터와 같은 규칙: 공백 분리 AND) */
export function toKeywords(search: string): string[] {
  return search.trim().split(/\s+/).filter(Boolean);
}

interface FieldMatch {
  label: string;
  excerpt: string;
  keyword: string;
  start: number; // excerpt 안에서 키워드가 시작하는 위치
}

/** 본문에서 키워드 주변을 잘라낸다 */
function findMatch(label: string, text: string | null, keywords: string[]): FieldMatch | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const kw of keywords) {
    const at = lower.indexOf(kw.toLowerCase());
    if (at === -1) continue;

    const from = Math.max(0, at - CONTEXT);
    const to = Math.min(text.length, at + kw.length + CONTEXT);

    const raw = text.slice(from, to);
    // trim이 앞쪽 공백을 지우면 그만큼 하이라이트 위치가 밀린다.
    // 한국어는 공백이 잦아 자를 지점이 공백일 확률이 높으므로 반드시 보정해야 한다.
    const trimmedFront = raw.length - raw.trimStart().length;
    const prefix = from > 0 ? "…" : "";
    const suffix = to < text.length ? "…" : "";

    return {
      label,
      excerpt: prefix + raw.trim() + suffix,
      keyword: kw,
      start: at - from - trimmedFront + prefix.length,
    };
  }
  return null;
}

/** 제목 외 필드에서 맞은 것만 (제목 매칭은 이미 화면에 보임) */
export function getMatchExcerpts(log: WorkLog, keywords: string[]): FieldMatch[] {
  if (keywords.length === 0) return [];

  const titleLower = log.title.toLowerCase();
  // 제목만으로 모든 키워드가 설명되면 굳이 근거를 덧붙이지 않는다
  if (keywords.every((k) => titleLower.includes(k.toLowerCase()))) return [];

  return [
    findMatch("내용", log.content, keywords),
    findMatch("입력원본", log.originalText, keywords),
    findMatch("성과", log.outcome, keywords),
  ].filter((m): m is FieldMatch => m !== null);
}

function Highlighted({ match }: { match: FieldMatch }) {
  const { excerpt, keyword, start } = match;
  const end = start + keyword.length;

  return (
    <>
      {excerpt.slice(0, start)}
      <mark className="rounded bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-500/30">
        {excerpt.slice(start, end)}
      </mark>
      {excerpt.slice(end)}
    </>
  );
}

export function MatchExcerpts({ log, keywords }: { log: WorkLog; keywords: string[] }) {
  const matches = getMatchExcerpts(log, keywords);
  if (matches.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5">
      {matches.map((m, i) => (
        <p key={i} className="text-[11px] leading-snug text-muted-foreground">
          <span className="mr-1 rounded bg-muted px-1 py-0.5 text-[10px] font-medium">
            {m.label}
          </span>
          <Highlighted match={m} />
        </p>
      ))}
    </div>
  );
}
