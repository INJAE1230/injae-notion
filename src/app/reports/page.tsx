"use client";

import { useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { FileText, Copy, Download, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ReportType } from "@/lib/types";

const PRESETS = [
  { label: "오늘", getRange: () => {
    const d = format(new Date(), "yyyy-MM-dd");
    return { from: d, to: d };
  }},
  { label: "이번 주", getRange: () => ({
    from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  })},
  { label: "이번 달", getRange: () => ({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  })},
];

export default function ReportsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [type, setType] = useState<ReportType>("daily");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [report, setReport] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, dateFrom, dateTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "보고서 생성 실패");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!report) return;
    await navigator.clipboard.writeText(report.content);
    setCopied(true);
    toast.success("클립보드에 복사되었습니다");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!report) return;
    const blob = new Blob([report.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/[\[\]]/g, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyPreset(idx: number) {
    const range = PRESETS[idx].getRange();
    setDateFrom(range.from);
    setDateTo(range.to);
    if (range.from === range.to) setType("daily");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-500" />
          보고서
        </h1>
        <p className="text-sm text-muted-foreground">
          업무 보고서를 자동으로 생성합니다
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">보고서 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset, i) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(i)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">보고서 유형</label>
              <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">일간</SelectItem>
                  <SelectItem value="weekly">주간</SelectItem>
                  <SelectItem value="monthly">월간</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">시작일</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">종료일</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            보고서 생성
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{report.title}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" />
                  )}
                  복사
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  다운로드
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
              {report.content}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
