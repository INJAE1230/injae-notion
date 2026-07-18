import { NextResponse } from "next/server";
import { generateMorningBriefing, type BriefingPayload } from "@/lib/ai-parser";
import { getKSTToday } from "@/lib/date-utils";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BriefingPayload;
    const briefing = await generateMorningBriefing(payload, getKSTToday());
    return NextResponse.json({ briefing });
  } catch (error) {
    console.error("아침 브리핑 생성 실패:", error);
    return NextResponse.json({ error: "브리핑 생성 실패" }, { status: 500 });
  }
}
