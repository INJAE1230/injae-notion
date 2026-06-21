"use client";

import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, eachDayOfInterval, parseISO } from "date-fns";
import { FileText, Copy, Download, Loader2, Check, Hash, ClipboardCopy, FileDown } from "lucide-react";
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
import { PROJECTS } from "@/lib/constants";
import type { ReportType, Project } from "@/lib/types";

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
  const [project, setProject] = useState<Project | "all">("all");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const periodInfo = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    try {
      const days = eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(dateTo) });
      const total = days.length;
      const workingDays = days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6).length;
      return { total, workingDays };
    } catch { return null; }
  }, [dateFrom, dateTo]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, dateFrom, dateTo, project: project === "all" ? undefined : project }),
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

  async function handleCopyMarkdown() {
    if (!report) return;
    const md = convertToMarkdown(report.content);
    await navigator.clipboard.writeText(md);
    setCopiedMd(true);
    toast.success("마크다운으로 복사되었습니다");
    setTimeout(() => setCopiedMd(false), 2000);
  }

  function convertToMarkdown(text: string): string {
    return text
      .split("\n")
      .map((line) => {
        if (line.startsWith("■ ")) return `## ${line.slice(2)}`;
        if (line.startsWith("─")) return "---";
        if (/^\d+\.\s/.test(line)) return `- ${line}`;
        if (line.startsWith("   ")) return `  ${line.trim()}`;
        return line;
      })
      .join("\n");
  }

  function parseReportSections(content: string) {
    const lines = content.split("\n");
    const sections: { type: "title" | "section" | "summary" | "divider"; heading?: string; lines: string[] }[] = [];
    let current: (typeof sections)[0] | null = null;
    let inSummary = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0) {
        sections.push({ type: "title", lines: [line] });
        continue;
      }

      if (line.startsWith("─")) {
        inSummary = true;
        current = { type: "summary", lines: [] };
        sections.push(current);
        continue;
      }

      if (inSummary) {
        if (line.startsWith("■ ")) {
          current = { type: "section", heading: line.slice(2), lines: [] };
          sections.push(current);
        } else if (line.trim()) {
          current?.lines.push(line);
        }
        continue;
      }

      if (line.startsWith("■ ")) {
        current = { type: "section", heading: line.slice(2), lines: [] };
        sections.push(current);
      } else if (line.trim() && current) {
        current.lines.push(line);
      }
    }

    return sections;
  }

  async function handleDownloadPdf() {
    if (!report) return;
    setPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 190;
      const pageHeight = 277;
      const marginLeft = 10;
      let y = 15;

      const fontUrl = "https://cdn.jsdelivr.net/gh/niceplugin/font-storage/NanumGothic-Regular.ttf";
      const fontBoldUrl = "https://cdn.jsdelivr.net/gh/niceplugin/font-storage/NanumGothic-Bold.ttf";

      const [fontData, fontBoldData] = await Promise.all([
        fetch(fontUrl).then((r) => r.arrayBuffer()),
        fetch(fontBoldUrl).then((r) => r.arrayBuffer()),
      ]);

      const toBase64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      };

      pdf.addFileToVFS("NanumGothic.ttf", toBase64(fontData));
      pdf.addFont("NanumGothic.ttf", "NanumGothic", "normal");
      pdf.addFileToVFS("NanumGothicBold.ttf", toBase64(fontBoldData));
      pdf.addFont("NanumGothicBold.ttf", "NanumGothic", "bold");

      pdf.setFont("NanumGothic", "normal");

      function checkPage(needed: number) {
        if (y + needed > pageHeight) {
          pdf.addPage();
          y = 15;
        }
      }

      function writeText(text: string, size: number, bold = false, indent = 0) {
        pdf.setFontSize(size);
        pdf.setFont("NanumGothic", bold ? "bold" : "normal");
        const lines = pdf.splitTextToSize(text, pageWidth - indent);
        for (const line of lines) {
          checkPage(size * 0.5);
          pdf.text(line, marginLeft + indent, y);
          y += size * 0.45;
        }
      }

      const contentLines = report.content.split("\n");

      for (const line of contentLines) {
        if (!line.trim()) {
          y += 3;
          continue;
        }

        if (line.startsWith("─")) {
          checkPage(5);
          pdf.setDrawColor(180);
          pdf.line(marginLeft, y, marginLeft + pageWidth, y);
          y += 5;
          continue;
        }

        if (contentLines.indexOf(line) === 0) {
          writeText(line, 13, true);
          y += 2;
        } else if (line.startsWith("■ ")) {
          y += 2;
          writeText(line.slice(2), 11, true);
          y += 1;
        } else if (line.startsWith("   ")) {
          writeText(line.trim(), 9, false, 8);
        } else if (/^\d+\.\s/.test(line)) {
          writeText(line, 10, false, 4);
        } else if (line.startsWith("  - ")) {
          writeText(line.trim(), 9, false, 6);
        } else {
          writeText(line, 10);
        }
      }

      pdf.save(`${report.title.replace(/[\[\]]/g, "")}.pdf`);
      toast.success("PDF가 다운로드되었습니다");
    } catch (e) {
      console.error("PDF generation error:", e);
      toast.error("PDF 생성에 실패했습니다");
    } finally {
      setPdfLoading(false);
    }
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">사업장</label>
              <Select value={project} onValueChange={(v) => setProject(v as Project | "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {PROJECTS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              보고서 생성
            </Button>
            {periodInfo && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {periodInfo.total}일 중 근무일 {periodInfo.workingDays}일
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {report && (() => {
        const parsed = parseReportSections(report.content);
        const taskSections = parsed.filter((s) => s.type === "section" && !parsed.some((p) => p.type === "summary" && p === s));
        const summarySection = parsed.find((s) => s.type === "summary");
        const summarySubSections = parsed.filter((s, i) => {
          const summaryIdx = parsed.indexOf(summarySection!);
          return s.type === "section" && i > summaryIdx;
        });

        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      텍스트
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyMarkdown}>
                      {copiedMd ? <Check className="h-3.5 w-3.5 mr-1" /> : <ClipboardCopy className="h-3.5 w-3.5 mr-1" />}
                      마크다운
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      TXT
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
                      {pdfLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1" />}
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {taskSections.filter((s) => !summarySubSections.includes(s)).map((section, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{section.heading}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.lines.map((line, j) => {
                      const isSubLine = line.startsWith("   ");
                      return (
                        <p key={j} className={`text-sm ${isSubLine ? "text-muted-foreground pl-4" : ""}`}>
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {summarySection && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">요약</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {summarySection.lines.map((line, j) => {
                      const [label, ...rest] = line.split(": ");
                      const value = rest.join(": ");
                      if (!value) return <p key={j} className="text-sm col-span-2">{line}</p>;
                      return (
                        <div key={j} className="flex justify-between sm:flex-col gap-1 rounded-lg bg-background p-2.5 border">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <span className="text-sm font-semibold">{value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {summarySubSections.map((sub, i) => (
                    <div key={i} className="mt-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{sub.heading}</p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {sub.lines.map((line, j) => (
                          <p key={j} className="text-sm">{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}
    </div>
  );
}
