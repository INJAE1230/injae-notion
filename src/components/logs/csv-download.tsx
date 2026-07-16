"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getKSTToday } from "@/lib/date-utils";
import type { WorkLog } from "@/lib/types";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function CsvDownload({ logs }: { logs: WorkLog[] }) {
  if (logs.length === 0) return null;

  const handleDownload = () => {
    const header = "날짜,제목,프로젝트,상태,우선순위,태그,소요시간,업무내용";
    const rows = logs.map((log) =>
      [
        log.date,
        escapeCsv(log.title),
        escapeCsv(log.projects.join("/")),
        log.status,
        log.priority || "",
        escapeCsv(log.tags.join("/")),
        log.hours !== null ? String(log.hours) : "",
        escapeCsv(log.content),
      ].join(",")
    );

    const bom = "﻿";
    const csv = bom + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `업무일지_${getKSTToday()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex justify-end">
      <Button variant="outline" size="sm" className="h-9" onClick={handleDownload}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        CSV 다운로드 ({logs.length}건)
      </Button>
    </div>
  );
}
