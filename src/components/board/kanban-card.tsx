"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { PROJECT_COLORS, PRIORITY_COLORS } from "@/lib/constants";
import type { WorkLog } from "@/lib/types";

interface KanbanCardProps {
  log: WorkLog;
}

export function KanbanCard({ log }: KanbanCardProps) {
  const router = useRouter();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: log.id, data: { log } });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        listeners?.onPointerDown?.(e as never);
      }}
      onPointerUp={(e) => {
        if (pointerStart.current) {
          const dx = Math.abs(e.clientX - pointerStart.current.x);
          const dy = Math.abs(e.clientY - pointerStart.current.y);
          if (dx < 5 && dy < 5) {
            router.push(`/logs/${log.id}?from=/board`);
          }
        }
        pointerStart.current = null;
      }}
      className={`rounded-lg border bg-card p-3 shadow-sm cursor-pointer transition-shadow ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
      }`}
    >
      <p className="text-sm font-medium truncate">{log.title}</p>
      <div className="flex flex-wrap items-center gap-1 mt-1.5">
        {log.projects.map((proj) => (
          <Badge key={proj} variant="secondary" className={`text-[10px] ${PROJECT_COLORS[proj]}`}>
            {proj}
          </Badge>
        ))}
        {log.priority && (
          <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS[log.priority]}`}>
            {log.priority}
          </Badge>
        )}
      </div>
      {log.date && (
        <p className="text-[11px] text-muted-foreground mt-1.5">{log.date}</p>
      )}
    </div>
  );
}
