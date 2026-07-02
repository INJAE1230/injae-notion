import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { WorkLog, ReportType } from "./types";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function countWorkingDays(from: string, to: string): number {
  let count = 0;
  const start = parseISO(from);
  const end = parseISO(to);
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function isWeekend(dateStr: string): boolean {
  const d = parseISO(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

function formatDate(dateStr: string) {
  const d = parseISO(dateStr);
  return format(d, "yyyy-MM-dd (E)", { locale: ko });
}

function groupByStatus(logs: WorkLog[]) {
  const completed = logs.filter((l) => l.status === "완료");
  const inProgress = logs.filter((l) => l.status === "진행 중");
  const waiting = logs.filter((l) => l.status === "대기중");
  const someday = logs.filter((l) => l.status === "언젠가");
  const planned = logs.filter((l) => l.status === "예정");
  return { completed, inProgress, waiting, someday, planned };
}

function formatLogLine(log: WorkLog, idx: number) {
  const parts = [`${idx}. ${log.title}`];
  if (log.projects.length > 0) parts.push(`[${log.projects.join(", ")}]`);
  if (log.hours) parts.push(`(${log.hours}시간)`);
  let line = parts.join(" ");
  if (log.content) line += `\n   내용: ${log.content}`;
  if (log.outcome) line += `\n   성과: ${log.outcome}`;
  return line;
}

export function generateReport(
  type: ReportType,
  logs: WorkLog[],
  dateFrom: string,
  dateTo: string
): { title: string; content: string } {
  const typeLabel = type === "daily" ? "일일" : type === "weekly" ? "주간" : "월간";
  const title = `[${typeLabel} 업무 보고서] ${formatDate(dateFrom)}${dateFrom !== dateTo ? ` ~ ${formatDate(dateTo)}` : ""}`;

  const { completed, inProgress, waiting, someday, planned } = groupByStatus(logs);
  const totalHours = logs.reduce((sum, l) => sum + (l.hours || 0), 0);
  const completionRate = logs.length > 0 ? Math.round((completed.length / logs.length) * 100) : 0;

  const sections: string[] = [title, ""];

  if (completed.length > 0) {
    sections.push("■ 완료 업무");
    completed.forEach((log, i) => sections.push(formatLogLine(log, i + 1)));
    sections.push("");
  }

  if (inProgress.length > 0) {
    sections.push("■ 진행 중 업무");
    inProgress.forEach((log, i) => sections.push(formatLogLine(log, i + 1)));
    sections.push("");
  }

  if (waiting.length > 0) {
    sections.push("■ 대기중 업무");
    waiting.forEach((log, i) => sections.push(formatLogLine(log, i + 1)));
    sections.push("");
  }

  if (someday.length > 0) {
    sections.push("■ 언젠가 업무");
    someday.forEach((log, i) => sections.push(formatLogLine(log, i + 1)));
    sections.push("");
  }

  if (planned.length > 0) {
    sections.push("■ 예정 업무");
    planned.forEach((log, i) => sections.push(formatLogLine(log, i + 1)));
    sections.push("");
  }

  if (logs.length === 0) {
    sections.push("해당 기간에 기록된 업무가 없습니다.");
    sections.push("");
  }

  const weekendLogs = logs.filter((l) => l.date && isWeekend(l.date));
  if (weekendLogs.length > 0) {
    sections.push("■ 주말 업무");
    weekendLogs.forEach((log, i) => sections.push(formatLogLine(log, i + 1)));
    sections.push("");
  }

  sections.push("─".repeat(40));

  const workingDays = countWorkingDays(dateFrom, dateTo);
  const totalDays = Math.max(1, Math.round((parseISO(dateTo).getTime() - parseISO(dateFrom).getTime()) / (1000 * 60 * 60 * 24)) + 1);

  sections.push(`기간: ${totalDays}일 (근무일 ${workingDays}일)`);
  sections.push(`총 업무: ${logs.length}건`);
  if (workingDays > 0) {
    sections.push(`근무일 일평균: ${Math.round((logs.length / workingDays) * 10) / 10}건`);
  }
  sections.push(`총 소요시간: ${Math.round(totalHours * 10) / 10}시간`);
  if (workingDays > 0 && totalHours > 0) {
    sections.push(`근무일 일평균: ${Math.round((totalHours / workingDays) * 10) / 10}시간`);
  }
  sections.push(`완료율: ${completionRate}% (${completed.length}/${logs.length})`);
  if (weekendLogs.length > 0) {
    sections.push(`주말 업무: ${weekendLogs.length}건`);
  }

  const projectCounts: Record<string, number> = {};
  logs.forEach((l) => {
    for (const proj of l.projects) {
      projectCounts[proj] = (projectCounts[proj] || 0) + 1;
    }
  });
  if (Object.keys(projectCounts).length > 0) {
    sections.push("");
    sections.push("■ 프로젝트별 현황");
    Object.entries(projectCounts).forEach(([project, count]) => {
      sections.push(`  - ${project}: ${count}건`);
    });
  }

  return { title, content: sections.join("\n") };
}
