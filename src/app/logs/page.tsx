import { Suspense } from "react";
import Link from "next/link";
import { queryWorkLogs } from "@/lib/notion-service";
import { LogTable } from "@/components/logs/log-table";
import { LogFilters } from "@/components/logs/log-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import type { WorkLogFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

async function LogList({ searchParams }: { searchParams: Record<string, string> }) {
  const filters: WorkLogFilters = {};
  if (searchParams.dateFrom) filters.dateFrom = searchParams.dateFrom;
  if (searchParams.dateTo) filters.dateTo = searchParams.dateTo;
  if (searchParams.project) filters.project = searchParams.project as WorkLogFilters["project"];
  if (searchParams.status) filters.status = searchParams.status as WorkLogFilters["status"];
  if (searchParams.tags) filters.tags = searchParams.tags.split(",") as WorkLogFilters["tags"];
  if (searchParams.search) filters.search = searchParams.search;

  const logs = await queryWorkLogs(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  return <LogTable logs={logs} />;
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">업무 목록</h1>
        <Link href="/logs/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            업무 추가
          </Button>
        </Link>
      </div>

      <Suspense fallback={null}>
        <LogFilters />
      </Suspense>

      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        }
      >
        <LogList searchParams={params} />
      </Suspense>
    </div>
  );
}
