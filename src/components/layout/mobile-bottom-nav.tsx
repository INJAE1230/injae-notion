"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Plus,
  Layers,
  MoreHorizontal,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { NavContent } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/logs", label: "목록", icon: ClipboardList },
  { href: "/logs/new", label: "추가", icon: Plus, primary: true },
  { href: "/tracks", label: "트랙", icon: Layers },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="px-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}>
        <div className="flex items-center justify-around h-16 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl px-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-background">
                    <item.icon className="h-5 w-5" />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl"
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-primary/10" />
                )}
                <item.icon
                  className={cn(
                    "h-[22px] w-[22px] relative transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium relative transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="더보기"
                className="relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl"
              >
                <MoreHorizontal className="h-[22px] w-[22px] text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">더보기</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <SheetTitle className="sr-only">전체 메뉴</SheetTitle>
              <NavContent onNavigate={() => setMoreOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
