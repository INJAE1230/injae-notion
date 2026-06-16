"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { STATUS_COLORS, PROJECT_COLORS, TAG_COLORS } from "@/lib/constants";
import { DeleteDialog } from "./delete-dialog";
import { useState } from "react";
import type { WorkLog } from "@/lib/types";

export function LogTable({ logs }: { logs: WorkLog[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<WorkLog | null>(null);

  if (logs.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        조회된 업무가 없습니다
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>업무</TableHead>
            <TableHead className="w-[100px]">날짜</TableHead>
            <TableHead className="w-[90px]">프로젝트</TableHead>
            <TableHead className="w-[80px]">상태</TableHead>
            <TableHead className="w-[140px]">태그</TableHead>
            <TableHead className="w-[80px] text-right">소요시간</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="transition-colors hover:bg-muted/50">
              <TableCell className="font-medium">
                <Link href={`/logs/${log.id}`} className="hover:text-primary hover:underline">
                  {log.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{log.date}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={PROJECT_COLORS[log.project]}>
                  {log.project}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={STATUS_COLORS[log.status]}>
                  {log.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {log.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className={`text-xs ${TAG_COLORS[tag]}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {log.hours !== null ? `${log.hours}h` : "-"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/logs/${log.id}/edit`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(log)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DeleteDialog
        log={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </>
  );
}
