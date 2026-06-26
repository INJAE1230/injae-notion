import { startOfWeek, format } from "date-fns";
import { ko } from "date-fns/locale";
import type { WorkLog, DashboardStats, Project, Status, Priority, Tag } from "./types";
import { PROJECTS, STATUSES, PRIORITIES, TAGS, PROJECT_TO_ENTITY, ENTITIES } from "./constants";
import type { Entity } from "./constants";

export function computeStats(logs: WorkLog[]): DashboardStats {
  const byProject = Object.fromEntries(
    PROJECTS.map((p) => [p, 0])
  ) as Record<Project, number>;
  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s, 0])
  ) as Record<Status, number>;
  const byPriority = Object.fromEntries(
    PRIORITIES.map((p) => [p, 0])
  ) as Record<Priority, number>;
  const byTag = Object.fromEntries(
    TAGS.map((t) => [t, 0])
  ) as Record<Tag, number>;

  let totalHours = 0;
  const weekMap = new Map<string, { count: number; hours: number }>();
  const monthMap = new Map<string, { total: number; completed: number }>();

  for (const log of logs) {
    for (const proj of log.projects) {
      if (byProject[proj] !== undefined) byProject[proj]++;
    }
    if (byStatus[log.status] !== undefined) byStatus[log.status]++;
    if (log.priority && byPriority[log.priority] !== undefined) byPriority[log.priority]++;
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

      const monthKey = log.date.substring(0, 7);
      const monthEntry = monthMap.get(monthKey) || { total: 0, completed: 0 };
      monthEntry.total++;
      if (log.status === "완료") monthEntry.completed++;
      monthMap.set(monthKey, monthEntry);
    }
  }

  const weeklyVolume = Array.from(weekMap.entries())
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => a.week.localeCompare(b.week));

  const monthlyCompletion = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => ({
      month: format(new Date(key + "-01"), "M월", { locale: ko }),
      total: data.total,
      completed: data.completed,
      rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));

  return {
    totalLogs: logs.length,
    totalHours: Math.round(totalHours * 10) / 10,
    byProject,
    byStatus,
    byPriority,
    byTag,
    weeklyVolume,
    monthlyCompletion,
  };
}

export interface EntityStats {
  entity: Entity;
  projects: Project[];
  totalLogs: number;
  completedLogs: number;
  inProgressLogs: number;
  completionRate: number;
  totalHours: number;
  thisMonthLogs: number;
}

export function getEntityStats(logs: WorkLog[]): EntityStats[] {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const entityProjectMap = new Map<string, Set<Project>>();
  for (const [proj, entity] of Object.entries(PROJECT_TO_ENTITY)) {
    if (!entity) continue;
    if (!entityProjectMap.has(entity)) entityProjectMap.set(entity, new Set());
    entityProjectMap.get(entity)!.add(proj as Project);
  }

  return ENTITIES.map((entity) => {
    const projects = Array.from(entityProjectMap.get(entity) || []);
    const entityLogs = logs.filter((log) =>
      log.projects.some((p) => projects.includes(p))
    );
    const completed = entityLogs.filter((l) => l.status === "완료").length;
    const inProgress = entityLogs.filter((l) => l.status === "진행 중" || l.status === "다음행동").length;
    const thisMonthLogs = entityLogs.filter((l) => l.date.startsWith(thisMonth)).length;
    const totalHours = entityLogs.reduce((s, l) => s + (l.hours || 0), 0);

    return {
      entity,
      projects,
      totalLogs: entityLogs.length,
      completedLogs: completed,
      inProgressLogs: inProgress,
      completionRate: entityLogs.length > 0 ? Math.round((completed / entityLogs.length) * 100) : 0,
      totalHours: Math.round(totalHours * 10) / 10,
      thisMonthLogs,
    };
  });
}
