import { startOfWeek, endOfWeek, addWeeks, format } from "date-fns";
import { getKSTNow } from "./date-utils";
import type { WorkLog } from "./types";

export function getWeekRange(weekOffset: number = 0) {
  const now = getKSTNow();
  const target = addWeeks(now, weekOffset);
  const start = format(startOfWeek(target, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const end = format(endOfWeek(target, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return { start, end };
}

export function categorizeForReview(logs: WorkLog[], weekStart: string, weekEnd: string) {
  const completed = logs.filter(
    (l) => l.status === "완료" && l.date >= weekStart && l.date <= weekEnd
  );
  const incomplete = logs.filter(
    (l) => l.status !== "완료" && l.date >= weekStart && l.date <= weekEnd
  );
  const overdue = logs.filter(
    (l) => l.status !== "완료" && l.status !== "언젠가" && l.date && l.date < weekStart
  );
  const waiting = logs.filter((l) => l.status === "대기중");
  const someday = logs.filter((l) => l.status === "언젠가");
  const nextActions = logs.filter((l) => l.status === "다음행동");

  return { completed, incomplete, overdue, waiting, someday, nextActions };
}
