import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { WorkLog, ReportType } from "./types";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(dateStr: string) {
  const d = parseISO(dateStr);
  return format(d, "yyyy-MM-dd (E)", { locale: ko });
}

function groupByStatus(logs: WorkLog[]) {
  const completed = logs.filter((l) => l.status === "완료");
  const inProgress = logs.filter((l) => l.status === "진행 중");
  const planned = logs.filter((l) => l.status === "예정");
  return { completed, inProgress, planned };
}

function formatLogLine(log: WorkLog, idx: number) {
  const parts = [`${idx}. ${log.title}`];
  if (log.project) parts.push(`[${log.project}]`);
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

  const { completed, inProgress, planned } = groupByStatus(logs);
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

  if (planned.length > 0) {
    sections.push("■ 예정 업무");
    planned.forEach((log, i) => sections.push(formatLogLine(log, i + 1)));
    sections.push("");
  }

  if (logs.length === 0) {
    sections.push("해당 기간에 기록된 업무가 없습니다.");
    sections.push("");
  }

  sections.push("─".repeat(40));
  sections.push(`총 업무: ${logs.length}건`);
  sections.push(`총 소요시간: ${Math.round(totalHours * 10) / 10}시간`);
  sections.push(`완료율: ${completionRate}% (${completed.length}/${logs.length})`);

  if (type !== "daily") {
    const projectCounts: Record<string, number> = {};
    logs.forEach((l) => {
      projectCounts[l.project] = (projectCounts[l.project] || 0) + 1;
    });
    sections.push("");
    sections.push("■ 프로젝트별 현황");
    Object.entries(projectCounts).forEach(([project, count]) => {
      sections.push(`  - ${project}: ${count}건`);
    });
  }

  return { title, content: sections.join("\n") };
}
