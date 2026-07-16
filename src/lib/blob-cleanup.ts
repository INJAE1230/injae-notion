import { del, list } from "@vercel/blob";

/**
 * Blob 삭제는 Notion(30일 휴지통)과 달리 영구적이다. 따라서 호출부는 반드시
 * Notion 레코드를 먼저 지운 뒤 이 함수들을 호출한다 — 순서가 반대면 Notion
 * 삭제가 실패했을 때 살아있는 레코드의 첨부만 날아간다.
 *
 * 정리 실패가 삭제 자체를 실패로 만들면 안 되므로(레코드는 이미 지워짐)
 * 모든 함수는 예외를 삼키고 로그만 남긴다. 남은 파일은 고아가 되지만
 * 데이터 정합성을 깨지는 않는다.
 */

export async function deleteTrackFiles(trackId: string): Promise<void> {
  try {
    const prefix = `tracks/${trackId}/`;
    const { blobs } = await list({ prefix });
    if (blobs.length === 0) return;
    await del(blobs.map((b) => b.url));
  } catch (error) {
    console.error(`트랙 첨부 정리 실패 (track=${trackId}):`, error);
  }
}

export async function deleteAttachmentBlobs(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  try {
    await del(urls);
  } catch (error) {
    console.error("첨부 blob 정리 실패:", error);
  }
}

/** 해당 URL이 이 트랙의 prefix 소속인지 확인 (임의 URL 삭제 방지) */
export function isTrackFileUrl(url: string, trackId: string): boolean {
  try {
    return new URL(url).pathname.startsWith(`/tracks/${trackId}/`);
  } catch {
    return false;
  }
}
