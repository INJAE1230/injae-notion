"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 매일 보지는 않지만 없애기는 아까운 섹션을 접어두는 래퍼.
 *
 * storageKey를 주면 열림 상태가 다음 방문에도 유지된다. 닫혀 있을 때 children을
 * 아예 렌더링하지 않는 것은 의도적이다 — CSS로 숨기면 Recharts가 폭 0에서 그려진 뒤
 * 펼칠 때 깨진 크기로 남는다.
 */
export function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = true,
  children,
}: {
  title: string;
  storageKey?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) setOpen(saved === "1");
  }, [storageKey]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, next ? "1" : "0");
        } catch {
          // 저장 실패는 무시 — 이번 세션 동안만 유지된다
        }
      }
      return next;
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            !open && "-rotate-90"
          )}
        />
        {title}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
