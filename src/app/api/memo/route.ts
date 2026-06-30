import { NextResponse } from "next/server";
import { parseMemoText, parseMemoTextGrouped } from "@/lib/ai-parser";
import { getKSTToday } from "@/lib/date-utils";

const CHUNK_SIZE = 6000;

// 카카오톡 날짜 구분선 패턴: "--- 2024년 6월 29일 토요일 ---"
const DATE_HEADER_RE = /^-{3,}.*\d{4}년.*\d{1,2}월.*\d{1,2}일.*-{3,}$/;

// 카카오톡 내보내기 파일 상단 메타 정보 및 단순 반응 제거
function prefilterKakaoExport(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      // 카카오톡 내보내기 헤더 라인
      if (/^카카오톡 대화$/.test(t)) return false;
      if (/^대화상대\s*:/.test(t)) return false;
      if (/^저장한 날짜\s*:/.test(t)) return false;
      // 단순 읽음/확인 반응 (메시지 패턴: "오전/오후 HH:MM, 이름 : 짧은 반응")
      const msgMatch = t.match(/^(?:오전|오후)\s*\d{1,2}:\d{2},\s*.+?\s*:\s*(.+)$/);
      if (msgMatch) {
        const content = msgMatch[1].trim();
        if (/^(읽었어요|확인|확인했습니다|알겠습니다|넵|넹|네|ㅇㅋ|ㅇㅇ|👍|✅|😊|🙏|ㅎㅎ|ㄱㅅ|감사합니다|수고하셨습니다|고생하셨어요|잘됐네요|잘 됐네요|좋습니다)$/.test(content)) {
          return false;
        }
      }
      return true;
    })
    .join("\n");
}

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";
  let lastDateHeader = "";

  for (const line of lines) {
    if (DATE_HEADER_RE.test(line.trim())) {
      lastDateHeader = line;
    }

    const toAdd = line + "\n";

    if (current.length + toAdd.length > CHUNK_SIZE && current.trim()) {
      chunks.push(current.trim());
      // 청크 경계 넘어가면 날짜 헤더를 다음 청크 첫 줄에 붙여 날짜 맥락 유지
      current = lastDateHeader ? lastDateHeader + "\n" + toAdd : toAdd;
    } else {
      current += toAdd;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function POST(request: Request) {
  try {
    const { text, grouped } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "메모 텍스트를 입력해주세요." },
        { status: 400 }
      );
    }

    const today = getKSTToday();
    const trimmed = prefilterKakaoExport(text.trim());

    if (grouped) {
      const entries = await parseMemoTextGrouped(trimmed, today);
      return NextResponse.json({ entries, originalText: trimmed, grouped: true });
    }

    const chunks = splitIntoChunks(trimmed);
    const results = await Promise.all(
      chunks.map((chunk) => parseMemoText(chunk, today))
    );
    const entries = results.flat();

    return NextResponse.json({ entries, originalText: trimmed });
  } catch (error) {
    console.error("메모 파싱 실패:", error);
    return NextResponse.json(
      { error: "메모 파싱 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
