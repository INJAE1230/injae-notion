import { NextRequest, NextResponse } from "next/server";
import { generateWorkLogs } from "@/lib/template-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode: "이번주" | "이번달" | "이번분기" = body.mode;
    const templateIds: string[] | undefined = body.templateIds;

    if (mode !== "이번주" && mode !== "이번달" && mode !== "이번분기") {
      return NextResponse.json(
        { error: "mode는 '이번주', '이번달', '이번분기' 중 하나여야 합니다" },
        { status: 400 }
      );
    }

    const result = await generateWorkLogs(mode, templateIds);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
