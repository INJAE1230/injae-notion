import { NextResponse } from "next/server";
import { parseMemoText, parseMemoTextGrouped } from "@/lib/ai-parser";
import { getKSTToday } from "@/lib/date-utils";
import { MEMO_CHUNK_SIZE } from "@/lib/constants";

const CHUNK_SIZE = MEMO_CHUNK_SIZE;

// 카카오톡 날짜 구분선 패턴: "--- 2024년 6월 29일 토요일 ---"
const DATE_HEADER_RE = /^-{3,}.*\d{4}년.*\d{1,2}월.*\d{1,2}일.*-{3,}$/;

// PC 내보내기 메시지: "[이름] [오전/오후 H:MM] 내용"
const PC_MSG_RE = /^\[[^\]]+\]\s*\[(?:오전|오후)\s*\d{1,2}:\d{2}\]\s*(.*)$/;
// 모바일 공유 메시지: "오전/오후 HH:MM, 이름 : 내용"
const MOBILE_MSG_RE = /^(?:오전|오후)\s*\d{1,2}:\d{2},\s*.+?\s*:\s*(.+)$/;

// 미디어/플레이스홀더: "사진", "사진 3장", "동영상", "이모티콘" 등 (파일명은 정보이므로 제외 안 함)
const MEDIA_RE = /^(사진|동영상|이모티콘)(\s*\d+\s*(장|개))?$/;
// 단순 반응 (정보 없는 짧은 확인·인사)
const REACTION_RE =
  /^(읽었어요|확인|확인했습니다|알겠습니다|넵|넹|네|넵넵|ㅇㅋ|ㅇㅇ|👍|✅|😊|🙏|ㅎㅎ|ㄱㅅ|감사합니다|감사해요|수고하셨습니다|수고하세요|고생하셨어요|고생했다|고생많으십니다|잘됐네요|잘 됐네요|좋습니다|오케이|오케이!|굿모닝|좋은 아침입니다|좋은아침입니다|안녕하세요|다녀오겠습니다|네 알겠습니다|넵 알겠습니다|네 알겠어요)$/;

function isNoiseContent(content: string): boolean {
  const c = content.trim();
  if (!c) return true;
  if (MEDIA_RE.test(c)) return true;
  if (REACTION_RE.test(c)) return true;
  return false;
}

// 카카오톡 내보내기 파일 상단 메타 정보, 시스템 메시지, 단순 반응/미디어 제거
function prefilterKakaoExport(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      // 내보내기 헤더 라인
      if (/^카카오톡 대화$/.test(t)) return false;
      if (/님과 카카오톡 대화$/.test(t)) return false;
      if (/^대화상대\s*:/.test(t)) return false;
      if (/^저장한 날짜\s*:/.test(t)) return false;
      // 시스템 메시지
      if (/님이 .*초대했습니다\.?$/.test(t)) return false;
      if (/방장이 되어 팀채팅을 시작했어요/.test(t)) return false;
      if (/^.+님이 나갔습니다\.?$/.test(t)) return false;
      if (/^메시지가 삭제되었습니다\.?$/.test(t)) return false;

      // 메시지 라인이면 내용만 뽑아 노이즈 여부 판단, 아니면(멀티라인 연속 내용) 유지
      const msgMatch = t.match(PC_MSG_RE) ?? t.match(MOBILE_MSG_RE);
      if (msgMatch && isNoiseContent(msgMatch[1])) return false;

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

    if (text.length > 100_000) {
      return NextResponse.json(
        { error: "메모가 너무 깁니다 (최대 10만자)." },
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
