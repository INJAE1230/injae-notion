"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { STATUS_COLORS, PROJECT_COLORS } from "@/lib/constants";
import type { WorkLog } from "@/lib/types";

export function RecentLogs({ logs }: { logs: WorkLog[] }) {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">최근 업무일지</CardTitle>
          <Link
            href="/logs"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            전체 보기
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <div className="text-3xl">📝</div>
            <p className="text-sm">등록된 업무가 없습니다</p>
            <Link
              href="/logs/new"
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              첫 업무를 추가해보세요
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>업무</TableHead>
                <TableHead className="w-[100px]">날짜</TableHead>
                <TableHead className="w-[90px]">프로젝트</TableHead>
                <TableHead className="w-[80px]">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/logs/${log.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {log.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.date}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`${PROJECT_COLORS[log.project]} transition-transform hover:scale-105`}
                    >
                      {log.project}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`${STATUS_COLORS[log.status]} transition-transform hover:scale-105`}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
