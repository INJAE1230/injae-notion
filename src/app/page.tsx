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
import { RecentLogs } from "@/components/dashboard/recent-logs";
import { QuickMemoInput } from "@/components/memo/quick-memo-input";
import { MorningBriefing } from "@/components/dashboard/morning-briefing";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { InProgressTasks } from "@/components/dashboard/in-progress-tasks";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { DeadlineAlert } from "@/components/dashboard/deadline-alert";
import { TemplateQuickActions } from "@/components/dashboard/template-quick-actions";
import { TrackStatusWidget } from "@/components/dashboard/track-status-widget";
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
  const recentLogs = ownLogs.slice(0, 5);

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

      {/* 오늘의 업무 + 진행 중 + 마감 임박 (오늘 처리할 것 우선) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <TodayTasks logs={todayLogs} />
        <InProgressTasks logs={ownLogs} />
        <UpcomingDeadlines logs={ownLogs} />
      </div>

      {/* 반복 업무 */}
      {templateDatabaseId && <TemplateQuickActions />}

      {/* 트랙 현황 */}
      <TrackStatusWidget tracks={tracks} allLogs={allLogs} today={todayStr} />

      {/* 최근 업무 */}
      <RecentLogs logs={recentLogs} />

      {/* 분석 (심층 지표는 하단에 모아서) */}
      <section className="space-y-6 pt-2">
        <h2 className="text-sm font-semibold text-muted-foreground">분석</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <ProjectChart stats={stats} />
          <StatusChart stats={stats} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <PriorityChart stats={stats} />
          <WeeklyChart stats={stats} />
        </div>
        <CompletionRateChart stats={stats} />
      </section>
    </div>
  );
}
