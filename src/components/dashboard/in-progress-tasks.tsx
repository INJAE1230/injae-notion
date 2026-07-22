"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROJECT_COLORS } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { WorkLog } from "@/lib/types";

/** 날짜와 무관하게 "진행 중" 상태인 업무를 모아 보여준다. 오늘의 업무(TodayTasks)는
 * 날짜가 오늘인 것만 보므로, 여러 날에 걸쳐 진행 중인 업무는 여기가 아니면 대시보드
 * 어디에도 목록으로 나오지 않는다. */
export function InProgressTasks({ logs }: { logs: WorkLog[] }) {
  const inProgress = logs.filter((log) => log.status === "진행 중");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">진행 중인 업무</CardTitle>
          {inProgress.length > 0 && (
            <span className="text-xs text-blue-500 font-medium">{inProgress.length}건</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {inProgress.length === 0 ? (
          <EmptyState
            icon={Loader2}
            title="진행 중인 업무가 없어요"
            description="시작한 업무를 진행 중으로 바꾸면 여기 모아서 보여줘요"
          />
        ) : (
          <div className="space-y-1">
            {inProgress.map((log) => (
              <Link
                key={log.id}
                href={`/logs/${log.id}`}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 -mx-2.5 transition-colors hover:bg-accent/50"
              >
                <Loader2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{log.title}</p>
                  <p className="text-[11px] text-muted-foreground">{log.date}</p>
                </div>
                {log.projects.map((proj) => (
                  <Badge key={proj} variant="secondary" className={`text-[11px] shrink-0 ${PROJECT_COLORS[proj]}`}>
                    {proj}
                  </Badge>
                ))}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
