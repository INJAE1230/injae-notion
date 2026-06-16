import { format, parseISO, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import type { WorkLog, Project, Tag, TimeAllocation, CompletionTrend, ProductivityPattern } from "./types";

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

export function computeTimeAllocation(logs: WorkLog[]): TimeAllocation[] {
  const projectHours: Record<string, number> = {};
  let total = 0;

  for (const log of logs) {
    const h = log.hours || 0;
    projectHours[log.project] = (projectHours[log.project] || 0) + h;
    total += h;
  }

  return Object.entries(projectHours)
    .map(([project, hours]) => ({
      project: project as Project,
      hours: Math.round(hours * 10) / 10,
      percentage: total > 0 ? Math.round((hours / total) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours);
}

export function computeCompletionTrend(logs: WorkLog[]): CompletionTrend[] {
  const weeks: Record<string, { total: number; completed: number }> = {};

  for (const log of logs) {
    if (!log.date) continue;
    const weekStart = format(
      startOfWeek(parseISO(log.date), { weekStartsOn: 1 }),
      "MM/dd",
      { locale: ko }
    );
    if (!weeks[weekStart]) weeks[weekStart] = { total: 0, completed: 0 };
    weeks[weekStart].total++;
    if (log.status === "완료") weeks[weekStart].completed++;
  }

  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([period, data]) => ({
      period,
      total: data.total,
      completed: data.completed,
      rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
}

export function computeProductivityPatterns(logs: WorkLog[]): ProductivityPattern[] {
  const days: Record<number, { count: number; hours: number }> = {};
  for (let i = 0; i < 7; i++) days[i] = { count: 0, hours: 0 };

  for (const log of logs) {
    if (!log.date) continue;
    let dow = parseISO(log.date).getDay();
    dow = dow === 0 ? 6 : dow - 1;
    days[dow].count++;
    days[dow].hours += log.hours || 0;
  }

  return Object.entries(days).map(([dow, data]) => ({
    dayOfWeek: Number(dow),
    dayName: DAY_NAMES[Number(dow)],
    count: data.count,
    hours: Math.round(data.hours * 10) / 10,
  }));
}

export function computeTagDistribution(logs: WorkLog[]): { tag: string; count: number; hours: number }[] {
  const tagData: Record<string, { count: number; hours: number }> = {};

  for (const log of logs) {
    for (const tag of log.tags) {
      if (!tagData[tag]) tagData[tag] = { count: 0, hours: 0 };
      tagData[tag].count++;
      tagData[tag].hours += log.hours || 0;
    }
  }

  return Object.entries(tagData)
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      hours: Math.round(data.hours * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}

export function computePeriodComparison(
  currentLogs: WorkLog[],
  previousLogs: WorkLog[]
) {
  const current = {
    count: currentLogs.length,
    hours: Math.round(currentLogs.reduce((s, l) => s + (l.hours || 0), 0) * 10) / 10,
    completed: currentLogs.filter((l) => l.status === "완료").length,
  };
  const previous = {
    count: previousLogs.length,
    hours: Math.round(previousLogs.reduce((s, l) => s + (l.hours || 0), 0) * 10) / 10,
    completed: previousLogs.filter((l) => l.status === "완료").length,
  };

  return {
    current,
    previous,
    countDelta: current.count - previous.count,
    hoursDelta: Math.round((current.hours - previous.hours) * 10) / 10,
    completedDelta: current.completed - previous.completed,
  };
}
