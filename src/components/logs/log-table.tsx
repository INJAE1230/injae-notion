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
import { MoreHorizontal, Pencil, Trash2, X, Layers, ClipboardList, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { STATUS_COLORS, PROJECT_COLORS, TAG_COLORS, PRIORITY_COLORS, STATUSES, PRIORITIES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteDialog } from "./delete-dialog";
import { MatchExcerpts, toKeywords } from "./match-excerpt";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WorkLog, Status, Track } from "@/lib/types";

const DAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];
function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${DAY_SHORT[d.getDay()]})`;
}

type SortKey = "title" | "date" | "status" | "priority" | "hours";
type SortDir = "asc" | "desc";

// 상태·우선순위는 사전순이 아니라 의미 순서로 정렬해야 한다
const STATUS_ORDER = new Map(STATUSES.map((s, i) => [s, i]));
const PRIORITY_ORDER = new Map(PRIORITIES.map((p, i) => [p, i]));

/** 값이 없는 항목(우선순위 미설정·소요시간 없음)은 가장 낮은 값으로 취급한다 */
function compareLogs(a: WorkLog, b: WorkLog, key: SortKey): number {
  switch (key) {
    case "title":
      return a.title.localeCompare(b.title, "ko");
    case "date":
      return a.date.localeCompare(b.date);
    case "status":
      return (STATUS_ORDER.get(a.status) ?? 99) - (STATUS_ORDER.get(b.status) ?? 99);
    case "priority": {
      const av = a.priority ? PRIORITY_ORDER.get(a.priority) ?? 98 : 99;
      const bv = b.priority ? PRIORITY_ORDER.get(b.priority) ?? 98 : 99;
      return av - bv;
    }
    case "hours":
      return (a.hours ?? -1) - (b.hours ?? -1);
  }
}

export function LogTable({
  logs: initialLogs,
  tracks = [],
  searchQuery,
}: {
  logs: WorkLog[];
  tracks?: Track[];
  searchQuery?: string;
}) {
  const trackMap = new Map(tracks.map((t) => [t.id, t.title]));
  const keywords = useMemo(() => (searchQuery ? toKeywords(searchQuery) : []), [searchQuery]);
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [deleteTarget, setDeleteTarget] = useState<WorkLog | null>(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<Status | "">("");
  const [bulkLoading, setBulkLoading] = useState(false);
  // 서버가 날짜 내림차순으로 주므로 그것을 기본값으로 맞춘다
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedLogs = useMemo(() => {
    const arr = [...logs];
    arr.sort((a, b) => {
      const c = compareLogs(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return arr;
  }, [logs, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // 날짜·소요시간은 큰 값부터 보는 게 자연스럽고, 나머지는 오름차순이 자연스럽다
      setSortDir(key === "date" || key === "hours" ? "desc" : "asc");
    }
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="조회된 업무가 없어요"
        description="필터를 바꾸거나 새 업무를 추가해보세요"
        action={{ label: "업무 추가", href: "/logs/new" }}
        className="py-16"
      />
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
        {sortedLogs.map((log) => (
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
                  <MatchExcerpts log={log} keywords={keywords} />
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
              <SortableHead label="업무" sortKey="title" active={sortKey} dir={sortDir} onSort={toggleSort} />
              <SortableHead label="날짜" sortKey="date" active={sortKey} dir={sortDir} onSort={toggleSort} className="w-[100px]" />
              <TableHead className="w-[90px]">프로젝트</TableHead>
              <SortableHead label="상태" sortKey="status" active={sortKey} dir={sortDir} onSort={toggleSort} className="w-[80px]" />
              <SortableHead label="우선순위" sortKey="priority" active={sortKey} dir={sortDir} onSort={toggleSort} className="w-[90px]" />
              <TableHead className="w-[140px]">태그</TableHead>
              <SortableHead label="소요시간" sortKey="hours" active={sortKey} dir={sortDir} onSort={toggleSort} className="w-[80px]" align="right" />
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.map((log) => (
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
                  <MatchExcerpts log={log} keywords={keywords} />
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

function SortableHead({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  const Icon = !isActive ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;

  return (
    <TableHead className={className} aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex items-center gap-1 transition-colors hover:text-foreground",
          align === "right" && "ml-auto",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3 shrink-0", !isActive && "opacity-40")} />
      </button>
    </TableHead>
  );
}
