"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarDays, CalendarRange, CalendarCheck } from "lucide-react";

export function GenerateButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleGenerate = async (mode: "이번주" | "이번달" | "이번분기") => {
    setLoading(mode);
    try {
      const res = await fetch("/api/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.generated === 0) {
        const label = mode === "이번주" ? "주간" : mode === "이번달" ? "월간" : "분기";
        toast.info(`생성할 ${label} 템플릿이 없습니다`);
      } else {
        toast.success(`${data.generated}건의 업무가 생성되었습니다`);
      }
      router.refresh();
    } catch {
      toast.error("업무 생성에 실패했습니다");
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        onClick={() => handleGenerate("이번주")}
        disabled={isLoading}
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        {loading === "이번주" ? "생성 중..." : "이번 주 업무 생성"}
      </Button>
      <Button
        variant="outline"
        onClick={() => handleGenerate("이번달")}
        disabled={isLoading}
      >
        <CalendarRange className="mr-2 h-4 w-4" />
        {loading === "이번달" ? "생성 중..." : "이번 달 업무 생성"}
      </Button>
      <Button
        variant="outline"
        onClick={() => handleGenerate("이번분기")}
        disabled={isLoading}
      >
        <CalendarCheck className="mr-2 h-4 w-4" />
        {loading === "이번분기" ? "생성 중..." : "이번 분기 업무 생성"}
      </Button>
    </div>
  );
}
