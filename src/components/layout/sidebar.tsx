"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/logs", label: "업무 목록", icon: ClipboardList },
  { href: "/logs/new", label: "업무 추가", icon: Plus },
  { href: "/templates", label: "반복 템플릿", icon: Repeat },
  { href: "/review", label: "주간 리뷰", icon: ClipboardCheck },
  { href: "/board", label: "칸반 보드", icon: Columns3 },
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/achievements", label: "성과 관리", icon: Trophy },
  { href: "/reports", label: "보고서", icon: FileText },
  { href: "/analytics", label: "통계 분석", icon: BarChart3 },
  { href: "/hr", label: "인사/연차", icon: Users },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <span className="text-base font-semibold tracking-tight text-foreground/90">
          업무일지
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
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
      </nav>

      <div className="px-3 pb-4">
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

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-12 items-center gap-3 border-b bg-card px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <SheetTitle className="sr-only">메뉴</SheetTitle>
          <NavContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <span className="text-sm font-semibold">업무일지</span>
    </header>
  );
}
