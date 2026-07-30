import { getAllWorkLogs } from "@/lib/notion-service";
import { getAllTracks } from "@/lib/track-service";
import { computeStats } from "@/lib/stats";
import { getKSTNow, getKSTToday } from "@/lib/date-utils";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { StatusChart } from "@/components/dashboard/status-chart";
import { PriorityChart } from "@/components/dashboard/priority-chart";
import { ProjectChart } from "@/components/dashboard/project-chart";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { CompletionRateChart } from "@/components/dashboard/completion-rate-chart";
import { QuickMemoInput } from "@/components/memo/quick-memo-input";
import { MorningBriefing } from "@/components/dashboard/morning-briefing";
import { TaskPanels } from "@/components/dashboard/task-panels";
import { DeadlineAlert } from "@/components/dashboard/deadline-alert";
import { TemplateQuickActions } from "@/components/dashboard/template-quick-actions";
import { TrackStatusWidget } from "@/components/dashboard/track-status-widget";
import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { templateDatabaseId } from "@/lib/notion";

export const revalidate = 60;

function getGreeting() {
  const now = getKSTNow();
  const hour = now.getHours();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;

  if (isWeekend) return "쉬는 날이에요";
  if (hour < 10) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후에요";
  if (hour < 21) return "오늘도 힘내세요";
  return "퇴근 시간이에요";
}

export default async function DashboardPage() {
  const [allLogs, tracks] = await Promise.all([getAllWorkLogs(), getAllTracks()]);
  const ownLogs = allLogs.filter((l) => !l.trackId);
  const stats = computeStats(ownLogs);

  const todayStr = getKSTToday();
  const todayLogs = ownLogs.filter((log) => log.date === todayStr);

  const kstNow = getKSTNow();
  const today = kstNow.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <p className="text-sm text-muted-foreground">{today}</p>
        <h1 className="text-xl font-semibold tracking-tight mt-1">
          {getGreeting()} 👋
        </h1>
      </div>

      {/* AI 아침 브리핑 */}
      <MorningBriefing logs={ownLogs} />

      {/* 핵심 수치 */}
      <SummaryCards stats={stats} />

      {/* 빠른메모 */}
      <QuickMemoInput />

      {/* 마감 알림 */}
      <DeadlineAlert logs={ownLogs} />

      {/* 오늘의 업무 + 진행 중 + 마감 임박 (모바일은 세그먼트 전환) */}
      <TaskPanels todayLogs={todayLogs} allLogs={ownLogs} />

      {/* 반복 업무 */}
      {templateDatabaseId && <TemplateQuickActions />}

      {/* 트랙 현황 */}
      <TrackStatusWidget tracks={tracks} allLogs={allLogs} today={todayStr} />

      {/* 분석 — 매일 보는 지표가 아니라 기본은 접어둔다 (열림 상태는 기억됨) */}
      <CollapsibleSection title="분석" storageKey="dashboard-analytics-open" defaultOpen={false}>
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ProjectChart stats={stats} />
            <StatusChart stats={stats} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <PriorityChart stats={stats} />
            <WeeklyChart stats={stats} />
          </div>
          <CompletionRateChart stats={stats} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
