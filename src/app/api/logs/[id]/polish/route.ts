import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { modelPolish } from "@/lib/ai";
import { getWorkLog, updateWorkLog } from "@/lib/notion-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const log = await getWorkLog(id);
    if (!log.content || log.content.trim().length === 0) {
      return NextResponse.json({ error: "다듬을 내용이 없습니다" }, { status: 400 });
    }

    const { text } = await generateText({
      model: modelPolish,
      maxOutputTokens: 4096,
      prompt: `당신은 한국 직장인의 업무일지 작성을 도와주는 어시스턴트입니다.
아래 업무 내용을 깔끔하고 전문적인 업무일지 문체로 다듬어주세요.

규칙:
- 핵심 정보를 유지하되, 문장을 간결하고 명확하게 정리
- 구어체/메모체를 업무 보고 문체로 변환
- 불필요한 조사나 반복 제거
- 줄바꿈으로 항목을 구분 (필요시)
- 원래 의미를 절대 변경하지 않기
- 없는 내용을 추가하지 않기
- 다듬어진 텍스트만 출력 (설명, 따옴표, 접두어 없이)

업무 제목: ${log.title}
원본 내용:
${log.content}`,
    });

    await updateWorkLog(id, { content: text.trim() });

    return NextResponse.json({ content: text.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "다듬기에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
