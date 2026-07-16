"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, X, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "이번 주 업무 몇 건이야?",
  "완료 안 된 긴급 업무 보여줘",
  "미사용휴무 며칠 남았어?",
  "진행 중인 트랙 알려줘",
];

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  // 외부 트리거 이벤트로도 열 수 있게 (커맨드 팔레트 등에서 재사용 가능)
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("ai-assistant:open", onOpen);
    return () => window.removeEventListener("ai-assistant:open", onOpen);
  }, []);

  // 새 메시지·스트리밍 시 맨 아래로 스크롤
  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <>
      {/* 플로팅 버튼 — 모바일 하단탭(pb-28)과 겹치지 않게 위치 조정 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="AI 비서 열기"
          className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {/* 채팅 패널 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-0 md:p-6">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative flex h-full w-full flex-col border bg-background shadow-2xl md:h-[min(600px,85vh)] md:w-[400px] md:rounded-2xl">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">AI 비서</span>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="대화 초기화"
                    onClick={() => setMessages([])}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="닫기"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 메시지 영역 */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    업무·트랙·근태·연차·급여에 대해
                    <br />
                    무엇이든 물어보세요
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => submit(s)}
                        className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => <MessageBubble key={m.id} message={m} />)
              )}

              {busy && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  생각하는 중…
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  오류가 발생했습니다. 다시 시도해주세요.
                </div>
              )}
            </div>

            {/* 입력 영역 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
              className="flex items-center gap-2 border-t px-3 py-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="메시지를 입력하세요…"
                className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
              {busy ? (
                <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => stop()} aria-label="중지">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Button>
              ) : (
                <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim()} aria-label="전송">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}

type ChatMessage = ReturnType<typeof useChat>["messages"][number];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // 텍스트 파트만 이어붙여 표시. tool 호출 파트는 진행 표시만.
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  const usedTool = message.parts.some((p) => p.type.startsWith("tool-") || p.type === "dynamic-tool");

  if (!text && !usedTool) return null;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {text || (usedTool && <span className="text-muted-foreground">데이터 조회 중…</span>)}
      </div>
    </div>
  );
}
