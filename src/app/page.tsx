import { getAllWorkLogs } from "@/lib/notion-service";
import { computeStats } from "@/lib/stats";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { StatusChart } from "@/components/dashboard/status-chart";
import { ProjectChart } from "@/components/dashboard/project-chart";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { RecentLogs } from "@/components/dashboard/recent-logs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const logs = await getAllWorkLogs();
  const stats = computeStats(logs);
  const recentLogs = logs.slice(0, 5);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>
      <SummaryCards stats={stats} />
      <div className="grid gap-4 md:grid-cols-2">
        <ProjectChart stats={stats} />
        <StatusChart stats={stats} />
      </div>
      <WeeklyChart stats={stats} />
      <RecentLogs logs={recentLogs} />
    </div>
  );
}
