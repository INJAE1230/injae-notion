"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-utils";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_COLORS, PROJECT_COLORS, PRIORITY_COLORS, PROJECTS } from "@/lib/constants";
import { Layers } from "lucide-react";
import { KanbanCard } from "./kanban-card";
import type { WorkLog, Status, Project } from "@/lib/types";

const KANBAN_STATUSES: Status[] = ["예정", "진행 중", "대기중", "완료", "언젠가"];

interface KanbanBoardProps {
  initialLogs: WorkLog[];
}

function KanbanColumn({
  status,
  logs,
}: {
  status: Status;
  logs: WorkLog[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] w-[260px] shrink-0 rounded-xl border bg-muted/30 transition-colors ${
        isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[status]}`}>
            {status}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {logs.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            업무 없음
          </p>
        ) : (
          logs.map((log) => <KanbanCard key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ initialLogs }: KanbanBoardProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [activeLog, setActiveLog] = useState<WorkLog | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<Project | "all">("all");
  const [trackFilter, setTrackFilter] = useState<"all" | "own" | "track">("own");

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  const filteredLogs = logs
    .filter((l) => filterProject === "all" || l.projects.includes(filterProject))
    .filter((l) => {
      if (trackFilter === "own") return !l.trackId;
      if (trackFilter === "track") return !!l.trackId;
      return true;
    });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const log = event.active.data.current?.log as WorkLog | undefined;
    setActiveLog(log || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLog(null);
    const { active, over } = event;
    if (!over) return;

    const logId = active.id as string;
    const newStatus = over.id as Status;
    const currentLog = logs.find((l) => l.id === logId);
    if (!currentLog || currentLog.status === newStatus) return;

    setLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, status: newStatus } : l))
    );
    setUpdatingId(logId);

    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`"${currentLog.title}" → ${newStatus}`);
    } catch {
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId ? { ...l, status: currentLog.status } : l
        )
      );
      toastError("상태 변경에 실패했습니다");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">칸반 보드</h1>
          <p className="text-sm text-muted-foreground">
            카드를 드래그하여 상태를 변경하세요 · {filteredLogs.length}건
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTrackFilter((v) => v === "own" ? "all" : "own")}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm transition-colors select-none ${
              trackFilter === "own"
                ? "bg-violet-100 border-violet-300 text-violet-700 dark:bg-violet-900/40 dark:border-violet-600 dark:text-violet-300"
                : "border-dashed text-muted-foreground hover:text-foreground hover:border-solid"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            트랙 숨기기
          </button>
          <button
            onClick={() => setTrackFilter((v) => v === "track" ? "all" : "track")}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm transition-colors select-none ${
              trackFilter === "track"
                ? "bg-violet-100 border-violet-300 text-violet-700 dark:bg-violet-900/40 dark:border-violet-600 dark:text-violet-300"
                : "border-dashed text-muted-foreground hover:text-foreground hover:border-solid"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            트랙만 보기
          </button>
          <Select value={filterProject} onValueChange={(v) => setFilterProject(v as Project | "all")}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="사업장" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 사업장</SelectItem>
              {PROJECTS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              logs={filteredLogs.filter((l) => l.status === status)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLog ? (
            <div className="rounded-lg border bg-card p-3 shadow-xl ring-2 ring-primary/30 w-[244px] rotate-2">
              <p className="text-sm font-medium truncate">{activeLog.title}</p>
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {activeLog.projects.map((proj) => (
                  <Badge key={proj} variant="secondary" className={`text-[10px] ${PROJECT_COLORS[proj]}`}>
                    {proj}
                  </Badge>
                ))}
                {activeLog.priority && (
                  <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS[activeLog.priority]}`}>
                    {activeLog.priority}
                  </Badge>
                )}
              </div>
              {activeLog.date && (
                <p className="text-[11px] text-muted-foreground mt-1.5">{activeLog.date}</p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
