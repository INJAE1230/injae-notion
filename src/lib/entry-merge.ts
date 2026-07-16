import type { WorkLogFormData, Status } from "./types";

// 낮을수록 급함 → 병합 시 가장 시급한 상태를 채택
export const STATUS_URGENCY: Record<Status, number> = {
  "진행 중": 0,
  "대기중": 1,
  "예정": 2,
  "언젠가": 3,
  "완료": 4,
};

/**
 * 여러 항목을 하나로 합친다. content는 재작성하지 않고 그대로 이어붙인다 —
 * 요약을 거치면 정보가 사라지므로, 병합은 항상 무손실이어야 한다.
 *
 * 미리보기 화면의 수동 "합치기"와 그룹 파싱의 리듀스 단계가 이 함수를 공유해서
 * 두 경로의 병합 의미가 갈리지 않게 한다.
 */
export function mergeEntries(
  picked: WorkLogFormData[],
  overrides?: { title?: string }
): WorkLogFormData {
  if (picked.length === 0) throw new Error("병합할 항목이 없습니다");

  return {
    ...picked[0],
    title: overrides?.title || picked[0].title,
    date: picked.reduce((latest, e) => (e.date > latest ? e.date : latest), picked[0].date),
    projects: Array.from(new Set(picked.flatMap((e) => e.projects))),
    tags: Array.from(new Set(picked.flatMap((e) => e.tags))),
    status: picked.reduce((best, e) =>
      STATUS_URGENCY[e.status] < STATUS_URGENCY[best.status] ? e : best
    ).status,
    priority: picked.find((e) => e.priority)?.priority ?? null,
    hours: picked.some((e) => e.hours != null)
      ? picked.reduce((sum, e) => sum + (e.hours || 0), 0)
      : null,
    content: Array.from(new Set(picked.map((e) => e.content).filter(Boolean))).join("\n"),
    link: picked.find((e) => e.link)?.link ?? null,
    attachments: picked.flatMap((e) => e.attachments || []),
    appendTo: null,
  };
}
