import { NextResponse } from "next/server";
import { generateTrackSummary } from "@/lib/ai-parser";
import { getKSTToday } from "@/lib/date-utils";
import type { Track, WorkLog } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const { track, logs } = (await request.json()) as { track: Track; logs: WorkLog[] };
    const today = getKSTToday();
    const summary = await generateTrackSummary(track, logs, today);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("트랙 요약 생성 실패:", error);
    return NextResponse.json({ error: "요약 생성 실패" }, { status: 500 });
  }
}
