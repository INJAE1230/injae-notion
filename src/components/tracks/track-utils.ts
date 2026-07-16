import type { TrackFormData } from "@/lib/types";

export const ENTITY_COLORS: Record<string, string> = {
  "청초수": "#3b82f6",
  "청초수씨푸드": "#06b6d4",
  "646미터퍼세크": "#f59e0b",
  "아일랜드프로젝트646미터퍼세크": "#22c55e",
  "JS코퍼레이션": "#8b5cf6",
  "JKK인터내셔널": "#6366f1",
  "에그롤린대전": "#f97316",
  "바비캐럿": "#ec4899",
  "이니셜뮤직코리아": "#14b8a6",
};

export const STATUS_CHART_COLORS: Record<string, string> = {
  "진행 중": "#6366f1",
  "대기중": "#fb923c",
  "예정": "#eab308",
  "언젠가": "#94a3b8",
  "완료": "#22c55e",
};

export const TOOLTIP_STYLE = {
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--background)",
  fontSize: "12px",
};

export function getDday(targetDate: string | null): { label: string; urgent: boolean } {
  if (!targetDate) return { label: "기한 없음", urgent: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + "T00:00:00");
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `D+${Math.abs(diff)}`, urgent: true };
  if (diff === 0) return { label: "D-day", urgent: true };
  return { label: `D-${diff}`, urgent: diff <= 7 };
}

export function emptyForm(): TrackFormData {
  return { title: "", entity: null, startDate: null, targetDate: null, status: "계획", description: null };
}
