"use client";

import { useState, useRef } from "react";
import { Send, Loader2, Sparkles, Paperclip, X, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { MemoPreview } from "./memo-preview";
import type { WorkLogFormData, FileAttachment } from "@/lib/types";

export function QuickMemoInput() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<WorkLogFormData[] | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [error, setError] = useState("");
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setFiles((prev) => [...prev, data]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleOcr(file: FileAttachment) {
    if (!file.type?.startsWith("image/")) return;
    setOcrLoading(true);
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: file.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const ocrText = data.summary || `${data.storeName} ${data.totalAmount ? data.totalAmount.toLocaleString() + "원" : ""}`;
      setText((prev) => (prev ? `${prev}\n${ocrText}` : ocrText));
      toast.success("영수증 인식 완료");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "인식 실패");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleParse() {
    if (!text.trim() && files.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text || "파일 첨부", attachments: files }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const entriesWithFiles = data.entries.map((entry: WorkLogFormData) => ({
        ...entry,
        attachments: files,
      }));
      setEntries(entriesWithFiles);
      setOriginalText(data.originalText);
    } catch (e) {
      setError(e instanceof Error ? e.message : "파싱 실패");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setEntries(null);
    setOriginalText("");
    setText("");
    setError("");
    setFiles([]);
  }

  if (entries) {
    return (
      <MemoPreview
        entries={entries}
        originalText={originalText}
        onReset={handleReset}
        onUpdate={setEntries}
      />
    );
  }

  return (
    <Card className="border-dashed border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            빠른 메모
          </span>
          <span className="text-xs text-muted-foreground">
            — 자유롭게 적으면 AI가 알아서 정리합니다
          </span>
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="예: 오전에 A사 미팅 2시간, 오후에 버그 수정함, 내일 기획서 마감"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleParse();
              }
            }}
            className="min-h-[60px] resize-none bg-white dark:bg-background"
            rows={2}
          />
          <div className="flex flex-col gap-1">
            <Button
              onClick={handleParse}
              disabled={loading || (!text.trim() && files.length === 0)}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="파일 첨부"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.xlsx,.xls,.docx,.doc"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {files.map((file, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
              >
                {file.name}
                {file.type?.startsWith("image/") && (
                  <button
                    type="button"
                    onClick={() => handleOcr(file)}
                    disabled={ocrLoading}
                    className="text-blue-500 hover:text-blue-700"
                    title="AI 영수증 인식"
                  >
                    <ScanSearch className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Ctrl+Enter로 빠르게 전송 · 📎 파일 첨부 가능
        </p>
      </CardContent>
    </Card>
  );
}
