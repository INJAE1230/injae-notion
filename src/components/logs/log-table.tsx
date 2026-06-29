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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Pencil, Trash2, X, Layers } from "lucide-react";
import { STATUS_COLORS, PROJECT_COLORS, TAG_COLORS, PRIORITY_COLORS, STATUSES } from "@/lib/constants";
import { DeleteDialog } from "./delete-dialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { WorkLog, Status, Track } from "@/lib/types";

const DAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];
function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${DAY_SHORT[d.getDay()]})`;
}

export function LogTable({ logs: initialLogs, tracks = [] }: { logs: WorkLog[]; tracks?: Track[] }) {
  const trackMap = new Map(tracks.map((t) => [t.id, t.title]));
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [deleteTarget, setDeleteTarget] = useState<WorkLog | null>(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<Status | "">("");
  const [bulkLoading, setBulkLoading] = useState(false);

  if (logs.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        조회된 업무가 없습니다
      </div>
    );
  }

  const allSelected = logs.length > 0 && selected.size === logs.length;
  const someSelected = selected.size > 0 && selected.size < logs.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(logs.map((l) => l.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkStatusChange() {
    if (!bulkStatus || selected.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/logs/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: bulkStatus }),
          })
        )
      );
      setLogs((prev) =>
        prev.map((l) => selected.has(l.id) ? { ...l, status: bulkStatus as Status } : l)
      );
      toast.success(`${selected.size}건 → ${bulkStatus} 변경 완료`);
      setSelected(new Set());
      setBulkStatus("");
    } catch {
      toast.error("일부 항목 변경에 실패했습니다");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <>
      {/* 일괄 작업 바 */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-accent px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size}개 선택됨</span>
          <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as Status)}>
            <SelectTrigger className="h-8 w-[130px] bg-background">
              <SelectValue placeholder="상태 변경" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8"
            disabled={!bulkStatus || bulkLoading}
            onClick={handleBulkStatusChange}
          >
            {bulkLoading ? "변경 중..." : "적용"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={() => { setSelected(new Set()); setBulkStatus(""); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 모바일 카드 뷰 */}
      <div className="space-y-3 md:hidden">
        {logs.map((log) => (
          <div key={log.id} className="rounded-lg border bg-card p-4 transition-colors active:bg-muted/50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Checkbox
                  checked={selected.has(log.id)}
                  onCheckedChange={() => toggleOne(log.id)}
                  className="mt-0.5 shrink-0"
                />
                <Link href={`/logs/${log.id}`} className="flex-1 min-w-0">
                  <p className="font-medium truncate">{log.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateShort(log.date)}</p>
                </Link>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/logs/${log.id}/edit`)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(log)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {log.projects.slice(0, 2).map((proj) => (
                <Badge key={proj} variant="secondary" className={PROJECT_COLORS[proj]}>{proj}</Badge>
              ))}
              {log.projects.length > 2 && (
                <span className="text-xs text-muted-foreground">+{log.projects.length - 2}</span>
              )}
              <Badge variant="secondary" className={STATUS_COLORS[log.status]}>{log.status}</Badge>
              {log.priority && (
                <Badge variant="secondary" className={PRIORITY_COLORS[log.priority]}>{log.priority}</Badge>
              )}
              {log.tags.slice(0, 1).map((tag) => (
                <Badge key={tag} variant="secondary" className={`text-xs ${TAG_COLORS[tag]}`}>{tag}</Badge>
              ))}
              {log.tags.length > 1 && (
                <span className="text-xs text-muted-foreground">+{log.tags.length - 1}</span>
              )}
              {log.trackId && (
                <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 gap-1 shrink-0">
                  <Layers className="h-2.5 w-2.5" />
                  {trackMap.get(log.trackId) ?? "트랙"}
                </Badge>
              )}
              {log.hours !== null && (
                <span className="text-xs text-muted-foreground ml-auto">{log.hours}h</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => { if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected; }}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>업무</TableHead>
              <TableHead className="w-[100px]">날짜</TableHead>
              <TableHead className="w-[90px]">프로젝트</TableHead>
              <TableHead className="w-[80px]">상태</TableHead>
              <TableHead className="w-[90px]">우선순위</TableHead>
              <TableHead className="w-[140px]">태그</TableHead>
              <TableHead className="w-[80px] text-right">소요시간</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className={`transition-colors hover:bg-muted/50 ${selected.has(log.id) ? "bg-accent/50" : ""}`}
              >
                <TableCell>
                  <Checkbox
                    checked={selected.has(log.id)}
                    onCheckedChange={() => toggleOne(log.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/logs/${log.id}`} className="hover:text-primary hover:underline">
                    {log.title}
                  </Link>
                  {log.trackId && (
                    <div className="mt-0.5">
                      <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 gap-1">
                        <Layers className="h-2.5 w-2.5" />
                        {trackMap.get(log.trackId) ?? "트랙"}
                      </Badge>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateShort(log.date)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {log.projects.map((proj) => (
                      <Badge key={proj} variant="secondary" className={PROJECT_COLORS[proj]}>
                        {proj}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={STATUS_COLORS[log.status]}>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.priority ? (
                    <Badge variant="secondary" className={PRIORITY_COLORS[log.priority]}>
                      {log.priority}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
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
      </div>

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
