"use client";

import { useState } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MemoPreview } from "./memo-preview";
import type { WorkLogFormData } from "@/lib/types";

export function QuickMemoInput() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<WorkLogFormData[] | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [error, setError] = useState("");

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEntries(data.entries);
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
          <Button
            onClick={handleParse}
            disabled={loading || !text.trim()}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Ctrl+Enter로 빠르게 전송
        </p>
      </CardContent>
    </Card>
  );
}
