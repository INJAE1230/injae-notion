import { NextResponse } from "next/server";
import { parseMemoText } from "@/lib/ai-parser";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "메모 텍스트를 입력해주세요." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const entries = await parseMemoText(text.trim(), today);

    return NextResponse.json({ entries, originalText: text.trim() });
  } catch (error) {
    console.error("메모 파싱 실패:", error);
    return NextResponse.json(
      { error: "메모 파싱 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
