import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { getAllWorkLogs } from "@/lib/notion-service";
import { getAllTracks } from "@/lib/track-service";
import { getAllTemplates } from "@/lib/template-service";
import { getAllEmployees, getAllAttendance } from "@/lib/hr-service";
import { getAllPayrolls } from "@/lib/payroll-service";
import { getKSTToday } from "@/lib/date-utils";
import { encryptBackup } from "@/lib/backup-crypto";

const PREFIX = "backups/";
const KEEP = 12; // 월 1회 × 12 = 최근 1년치 보관

// 백업이 커질 수 있어 기본 타임아웃(300s)을 넉넉히 쓴다
export const maxDuration = 300;

const SOURCES = {
  workLogs: getAllWorkLogs,
  tracks: getAllTracks,
  templates: getAllTemplates,
  employees: getAllEmployees,
  attendance: getAllAttendance,
  payrolls: getAllPayrolls,
} as const;

type SourceName = keyof typeof SOURCES;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};
    const failed: Record<string, string> = {};

    // Notion은 초당 요청 수 제한이 있어 순차로 가져온다 (월 1회라 지연은 무의미).
    // 한 소스가 실패해도 나머지는 백업한다 — 부분 백업이 무(無)백업보다 낫다.
    for (const name of Object.keys(SOURCES) as SourceName[]) {
      try {
        const rows = await SOURCES[name]();
        data[name] = rows;
        counts[name] = rows.length;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed[name] = message;
        console.error(`백업 중 ${name} 수집 실패:`, error);
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "모든 데이터 소스 수집에 실패했습니다", failed },
        { status: 500 }
      );
    }

    const today = getKSTToday();
    const generatedAt = new Date().toISOString();

    // 스토어가 public 전용이라 내용 자체를 암호화한다. counts/date 같은
    // 비민감 메타데이터만 평문으로 남겨 복호화 없이 확인할 수 있게 한다.
    const envelope = encryptBackup(JSON.stringify({ data }));
    const file = { ...envelope, generatedAt, date: today, counts, failed };

    const blob = await put(`${PREFIX}${today}.json`, JSON.stringify(file), {
      access: "public",
      contentType: "application/json",
    });

    const pruned = await pruneOldBackups();

    return NextResponse.json({
      pathname: blob.pathname,
      counts,
      failed,
      pruned,
      partial: Object.keys(failed).length > 0,
    });
  } catch (error) {
    console.error("백업 실패:", error);
    const message = error instanceof Error ? error.message : "백업 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 오래된 백업을 지워 무한 축적을 막는다 */
async function pruneOldBackups(): Promise<number> {
  try {
    const { blobs } = await list({ prefix: PREFIX });
    if (blobs.length <= KEEP) return 0;

    // 파일명이 backups/YYYY-MM-DD.json 이라 사전순 내림차순 = 최신순
    const stale = blobs
      .sort((a, b) => b.pathname.localeCompare(a.pathname))
      .slice(KEEP);

    if (stale.length === 0) return 0;
    await del(stale.map((b) => b.url));
    return stale.length;
  } catch (error) {
    console.error("오래된 백업 정리 실패:", error);
    return 0;
  }
}
