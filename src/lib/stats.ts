import { startOfWeek, format } from "date-fns";
import { ko } from "date-fns/locale";
import type { WorkLog, DashboardStats, Project, Status, Tag } from "./types";
import { PROJECTS, STATUSES, TAGS } from "./constants";

export function computeStats(logs: WorkLog[]): DashboardStats {
  const byProject = Object.fromEntries(
    PROJECTS.map((p) => [p, 0])
  ) as Record<Project, number>;
  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s, 0])
  ) as Record<Status, number>;
  const byTag = Object.fromEntries(
    TAGS.map((t) => [t, 0])
  ) as Record<Tag, number>;

  let totalHours = 0;
  const weekMap = new Map<string, { count: number; hours: number }>();

  for (const log of logs) {
    if (byProject[log.project] !== undefined) byProject[log.project]++;
    if (byStatus[log.status] !== undefined) byStatus[log.status]++;
    for (const tag of log.tags) {
      if (byTag[tag] !== undefined) byTag[tag]++;
    }
    totalHours += log.hours || 0;

    if (log.date) {
      const weekStart = startOfWeek(new Date(log.date), { weekStartsOn: 1 });
      const weekKey = format(weekStart, "M/d", { locale: ko });
      const existing = weekMap.get(weekKey) || { count: 0, hours: 0 };
      existing.count++;
      existing.hours += log.hours || 0;
      weekMap.set(weekKey, existing);
    }
  }

  const weeklyVolume = Array.from(weekMap.entries())
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return {
    totalLogs: logs.length,
    totalHours: Math.round(totalHours * 10) / 10,
    byProject,
    byStatus,
    byTag,
    weeklyVolume,
  };
}
