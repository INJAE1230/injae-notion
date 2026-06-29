import { NextResponse } from "next/server";
import { generateTrackReport } from "@/lib/ai-parser";
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
    const report = await generateTrackReport(track, logs, today);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("진행 보고서 생성 실패:", error);
    return NextResponse.json({ error: "보고서 생성 실패" }, { status: 500 });
  }
}
