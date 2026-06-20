"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUSES, PRIORITIES, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants";
import type { Status, Priority } from "@/lib/types";

interface StatusQuickChangeProps {
  logId: string;
  currentStatus: Status;
  currentPriority: Priority | null;
}

export function StatusQuickChange({ logId, currentStatus, currentPriority }: StatusQuickChangeProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [loading, setLoading] = useState(false);

  async function handleChange(field: "status" | "priority", value: string | null) {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      if (field === "status") setStatus(value as Status);
      else setPriority(value as Priority | null);
      toast.success(`${field === "status" ? "상태" : "우선순위"} 변경 완료`);
      router.refresh();
    } catch {
      toast.error("변경에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger disabled={loading} asChild>
          <button className="cursor-pointer">
            <Badge variant="secondary" className={`${STATUS_COLORS[status]} hover:opacity-80 transition-opacity`}>
              {status} ▾
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {STATUSES.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => handleChange("status", s)}
              className={s === status ? "font-bold" : ""}
            >
              {s}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger disabled={loading} asChild>
          <button className="cursor-pointer">
            <Badge
              variant="secondary"
              className={`${priority ? PRIORITY_COLORS[priority] : "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400"} hover:opacity-80 transition-opacity`}
            >
              {priority || "우선순위 없음"} ▾
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {PRIORITIES.map((p) => (
            <DropdownMenuItem
              key={p}
              onClick={() => handleChange("priority", p)}
              className={p === priority ? "font-bold" : ""}
            >
              {p} — {PRIORITY_LABELS[p]}
            </DropdownMenuItem>
          ))}
          {priority && (
            <DropdownMenuItem onClick={() => handleChange("priority", null)}>
              우선순위 제거
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
