import { NextResponse } from "next/server";
import { createWorkLog } from "@/lib/notion-service";
import type { WorkLogFormData, InputSource } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { entries, originalText, source } = (await request.json()) as {
      entries: WorkLogFormData[];
      originalText: string;
      source?: InputSource;
    };

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: "저장할 업무가 없습니다." },
        { status: 400 }
      );
    }

    const results: string[] = [];
    for (const entry of entries) {
      const id = await createWorkLog(entry, {
        inputSource: source || "빠른메모",
        originalText,
      });
      results.push(id);
    }

    return NextResponse.json({ ids: results, count: results.length });
  } catch (error) {
    console.error("업무 저장 실패:", error);
    const message = error instanceof Error ? error.message : "업무 저장 중 오류가 발생했습니다.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
