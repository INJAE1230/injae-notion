import { MEMO_CHUNK_SIZE } from "./constants";

// 카카오톡 날짜 구분선 패턴: "--- 2024년 6월 29일 토요일 ---"
const DATE_HEADER_RE = /^-{3,}.*\d{4}년.*\d{1,2}월.*\d{1,2}일.*-{3,}$/;

/**
 * 긴 대화를 LLM이 한 번에 처리할 수 있는 크기로 자른다.
 * 청크 경계를 넘어가면 직전 날짜 헤더를 다음 청크 첫 줄에 붙여 날짜 맥락을 유지한다.
 */
export function splitIntoChunks(text: string, size: number = MEMO_CHUNK_SIZE): string[] {
  if (text.length <= size) return [text];

  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";
  let lastDateHeader = "";

  for (const line of lines) {
    if (DATE_HEADER_RE.test(line.trim())) {
      lastDateHeader = line;
    }

    const toAdd = line + "\n";

    if (current.length + toAdd.length > size && current.trim()) {
      chunks.push(current.trim());
      current = lastDateHeader ? lastDateHeader + "\n" + toAdd : toAdd;
    } else {
      current += toAdd;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
