"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  FileText,
  CornerDownLeft,
  Sparkles,
  CalendarCheck,
  ListTodo,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NAV_GROUPS } from "@/components/layout/sidebar";
import { STATUS_COLORS } from "@/lib/constants";
import { getKSTToday } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkLog } from "@/lib/types";

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

type IconType = (typeof NAV_ITEMS)[number]["icon"];
type ActionItem = { id: string; label: string; icon: IconType; run: () => void };
type ActionResult = { kind: "action"; action: ActionItem };
type NavResult = { kind: "nav"; href: string; label: string; icon: IconType };
type LogResult = { kind: "log"; log: WorkLog };
type Result = ActionResult | NavResult | LogResult;

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // 전역 단축키(⌘/Ctrl+K) 및 외부 트리거 이벤트
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("command-palette:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("command-palette:open", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setLogs([]);
      setActive(0);
    }
  }, [open]);

  // 업무 검색(디바운스)
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/logs?search=${encodeURIComponent(q)}`);
        const data = await res.json();
        setLogs(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  const actions: ActionItem[] = [
    {
      id: "ai",
      label: "AI 비서에게 물어보기",
      icon: Sparkles,
      run: () => window.dispatchEvent(new Event("ai-assistant:open")),
    },
    {
      id: "today",
      label: "오늘 업무 보기",
      icon: CalendarCheck,
      run: () => {
        const t = getKSTToday();
        router.push(`/logs?dateFrom=${t}&dateTo=${t}`);
      },
    },
    {
      id: "open",
      label: "미완료 업무 보기",
      icon: ListTodo,
      run: () => router.push("/logs?status=exclude-done"),
    },
    {
      id: "theme",
      label: "테마 변경",
      icon: Moon,
      run: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
  ];

  const q = query.trim().toLowerCase();
  const actionMatches = actions.filter((a) => a.label.toLowerCase().includes(q));
  const navMatches = NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(q));

  const results: Result[] = [
    ...actionMatches.map((action) => ({ kind: "action" as const, action })),
    ...navMatches.map((n) => ({ kind: "nav" as const, ...n })),
    ...logs.map((log) => ({ kind: "log" as const, log })),
  ];

  useEffect(() => {
    setActive(0);
  }, [query, logs.length]);

  const go = useCallback(
    (r: Result) => {
      setOpen(false);
      if (r.kind === "action") r.action.run();
      else if (r.kind === "nav") router.push(r.href);
      else router.push(`/logs/${r.log.id}`);
    },
    [router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active]);
    }
  };

  // 활성 항목이 보이도록 스크롤
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">명령 팔레트</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="페이지 이동 또는 업무 검색…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        <div ref={listRef} className="max-h-[min(60vh,22rem)] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              {query.trim().length >= 2 ? "일치하는 결과가 없어요" : "검색어를 입력하세요"}
            </p>
          ) : (
            <>
              {actionMatches.length > 0 && (
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  액션
                </p>
              )}
              {actionMatches.map((a, i) => {
                const idx = i;
                return (
                  <button
                    key={a.id}
                    data-idx={idx}
                    onClick={() => go({ kind: "action", action: a })}
                    onMouseMove={() => setActive(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
                      active === idx ? "bg-accent text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <a.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{a.label}</span>
                    {active === idx && <CornerDownLeft className="h-3.5 w-3.5 opacity-50" />}
                  </button>
                );
              })}

              {navMatches.length > 0 && (
                <p className="px-2 py-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  이동
                </p>
              )}
              {navMatches.map((n, i) => {
                const idx = actionMatches.length + i;
                return (
                  <button
                    key={n.href}
                    data-idx={idx}
                    onClick={() => go({ kind: "nav", ...n })}
                    onMouseMove={() => setActive(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
                      active === idx ? "bg-accent text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <n.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{n.label}</span>
                    {active === idx && <CornerDownLeft className="h-3.5 w-3.5 opacity-50" />}
                  </button>
                );
              })}

              {logs.length > 0 && (
                <p className="px-2 py-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  업무
                </p>
              )}
              {logs.map((log, i) => {
                const idx = actionMatches.length + navMatches.length + i;
                return (
                  <button
                    key={log.id}
                    data-idx={idx}
                    onClick={() => go({ kind: "log", log })}
                    onMouseMove={() => setActive(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
                      active === idx ? "bg-accent text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-foreground">{log.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{log.date}</span>
                    <Badge variant="secondary" className={cn("shrink-0 text-[10px]", STATUS_COLORS[log.status])}>
                      {log.status}
                    </Badge>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
