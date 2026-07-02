"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROJECT_COLORS } from "@/lib/constants";
import { CheckCircle2, Circle, Clock, Hourglass, Bookmark, ListTodo } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { WorkLog, Status } from "@/lib/types";

const STATUS_ICONS: Record<Status, typeof Circle> = {
  "완료": CheckCircle2,
  "진행 중": Clock,
  "대기중": Hourglass,
  "언젠가": Bookmark,
  "예정": Circle,
};

export function TodayTasks({ logs }: { logs: WorkLog[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">오늘의 업무</CardTitle>
          {logs.length > 0 && (
            <span className="text-xs text-muted-foreground">{logs.length}건</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="오늘 등록된 업무가 없어요"
            description="위 빠른 메모로 오늘 할 일을 적어보세요"
            action={{ label: "업무 추가", href: "/logs/new" }}
          />
        ) : (
          <div className="space-y-1">
            {logs.map((log) => {
              const Icon = STATUS_ICONS[log.status] || Circle;
              const iconColor =
                log.status === "완료" ? "text-emerald-500" :
                log.status === "진행 중" ? "text-blue-500" :
                log.status === "대기중" ? "text-orange-500" :
                log.status === "언젠가" ? "text-slate-400" :
                "text-muted-foreground/50";
              return (
                <Link
                  key={log.id}
                  href={`/logs/${log.id}`}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 -mx-2.5 transition-colors hover:bg-accent/50"
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
                  <span className={`flex-1 text-sm truncate ${
                    log.status === "완료" ? "line-through text-muted-foreground" : ""
                  }`}>
                    {log.title}
                  </span>
                  {log.projects.map((proj) => (
                    <Badge key={proj} variant="secondary" className={`text-[11px] shrink-0 ${PROJECT_COLORS[proj]}`}>
                      {proj}
                    </Badge>
                  ))}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
