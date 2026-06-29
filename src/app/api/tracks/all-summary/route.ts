import { NextResponse } from "next/server";
import { generateAllTracksSummary } from "@/lib/ai-parser";
import { getKSTToday } from "@/lib/date-utils";
import type { Track } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { tracks, statsMap } = (await request.json()) as {
      tracks: Track[];
      statsMap: Record<string, { total: number; completed: number; inProgress: number; hours: number; rate: number }>;
    };
    const today = getKSTToday();
    const summary = await generateAllTracksSummary(tracks, statsMap, today);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("전체 트랙 요약 생성 실패:", error);
    return NextResponse.json({ error: "요약 생성 실패" }, { status: 500 });
  }
}
