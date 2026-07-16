"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  ClipboardList,
  ClipboardCheck,
  Columns3,
  LayoutDashboard,
  Plus,
  Moon,
  Sun,
  Menu,
  Trophy,
  FileText,
  BarChart3,
  Calendar,
  Repeat,
  Users,
  Building2,
  Wallet,
  Layers,
  Smartphone,
  Search,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const NAV_GROUPS = [
  {
    items: [
      { href: "/", label: "대시보드", icon: LayoutDashboard },
    ],
  },
  {
    label: "업무",
    items: [
      { href: "/logs", label: "업무 목록", icon: ClipboardList },
      { href: "/logs/new", label: "업무 추가", icon: Plus },
      { href: "/board", label: "칸반 보드", icon: Columns3 },
      { href: "/calendar", label: "캘린더", icon: Calendar },
    ],
  },
  {
    label: "계획",
    items: [
      { href: "/templates", label: "반복 템플릿", icon: Repeat },
      { href: "/tracks", label: "트랙", icon: Layers },
      { href: "/review", label: "주간 리뷰", icon: ClipboardCheck },
    ],
  },
  {
    label: "분석",
    items: [
      { href: "/achievements", label: "성과 관리", icon: Trophy },
      { href: "/analytics", label: "통계 분석", icon: BarChart3 },
      { href: "/reports", label: "보고서", icon: FileText },
    ],
  },
  {
    label: "운영",
    items: [
      { href: "/entities", label: "법인 통합", icon: Building2 },
      { href: "/hr", label: "인사/연차", icon: Users },
      { href: "/payroll", label: "급여 관리", icon: Wallet },
    ],
  },
  {
    label: "앱",
    items: [
      { href: "/install", label: "앱 설치", icon: Smartphone },
    ],
  },
];

export function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      onNavigate?.();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <span className="text-base font-semibold tracking-tight text-foreground/90">
          업무일지
        </span>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("command-palette:open"))}
          className="flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent/50"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">검색</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-4 px-3 py-1">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="mb-0.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 px-3 pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-[13px] text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="ml-4">테마 변경</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-[13px] text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "로그아웃 중..." : "로그아웃"}
        </Button>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:block">
      <div className="sticky top-0 h-screen overflow-y-auto">
        <NavContent />
      </div>
    </aside>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/": "대시보드",
  "/logs": "업무 목록",
  "/logs/new": "업무 추가",
  "/board": "칸반 보드",
  "/calendar": "캘린더",
  "/templates": "반복 템플릿",
  "/tracks": "트랙",
  "/review": "주간 리뷰",
  "/analytics": "통계 분석",
  "/achievements": "성과 관리",
  "/reports": "보고서",
  "/entities": "법인 통합",
  "/hr": "인사/연차",
  "/payroll": "급여 관리",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/logs/") && pathname.endsWith("/edit")) return "업무 수정";
  if (pathname.startsWith("/logs/")) return "업무 상세";
  return "업무일지";
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="메뉴 열기">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <SheetTitle className="sr-only">메뉴</SheetTitle>
          <NavContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <span className="flex-1 truncate px-2 text-center text-[15px] font-semibold">{title}</span>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        aria-label="검색"
        onClick={() => window.dispatchEvent(new Event("command-palette:open"))}
      >
        <Search className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        aria-label="테마 변경"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
    </header>
  );
}
