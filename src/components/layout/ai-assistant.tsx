"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, X, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssistantMarkdown } from "@/components/layout/assistant-markdown";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "이번 주 업무 몇 건이야?",
  "완료 안 된 긴급 업무 보여줘",
  "내일 거래처 미팅 일정 추가해줘",
  "미사용휴무 며칠 남았어?",
];

const STORAGE_KEY = "ai-assistant-messages";
const MAX_STORED = 40;

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // transport는 한 번만 만들고, 매 요청 시점의 pathname을 함수로 읽어 보낸다
  // (경로가 바뀔 때마다 transport를 새로 만들면 진행 중인 스트림이 끊긴다).
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ pathname: pathnameRef.current }),
      }),
    []
  );

  const { messages, sendMessage, status, error, setMessages, stop } = useChat({
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  // 대화 복원 — 새로고침·페이지 이동에도 맥락이 유지되도록
  const restoredRef = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 대화 저장 (스트리밍이 끝난 뒤에만 저장해 중간 상태가 남지 않게).
  // 복원 전에는 저장하지 않는다 — 마운트 시점의 빈 messages로 기존 기록을 지워버리기 때문.
  useEffect(() => {
    if (busy || !restoredRef.current) return;
    try {
      if (messages.length === 0) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      // 용량 초과 등은 무시 — 저장 실패가 대화를 막으면 안 됨
    }
  }, [messages, busy]);

  // 비서가 데이터를 바꿨으면 화면을 갱신해 결과가 즉시 보이게 한다
  const prevBusyRef = useRef(false);
  useEffect(() => {
    const wroteData =
      !busy &&
      prevBusyRef.current &&
      messages[messages.length - 1]?.parts.some(
        (p) => p.type === "tool-addWorkLog" || p.type === "tool-updateWorkLogFields"
      );
    prevBusyRef.current = busy;
    if (wroteData) router.refresh();
  }, [busy, messages, router]);

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
                    업무·트랙·근태·연차·급여를 묻고,
                    <br />
                    업무 등록·상태 변경까지 시킬 수 있어요
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

  const toolTypes = message.parts
    .filter((p) => p.type.startsWith("tool-") || p.type === "dynamic-tool")
    .map((p) => p.type);
  const usedTool = toolTypes.length > 0;

  // 쓰기 도구는 조회와 구분해 표시 — 데이터가 바뀌는 중임을 사용자가 알아야 한다
  const pendingLabel = toolTypes.some((t) => t === "tool-addWorkLog")
    ? "업무를 등록하는 중…"
    : toolTypes.some((t) => t === "tool-updateWorkLogFields")
      ? "업무를 수정하는 중…"
      : "데이터 조회 중…";

  if (!text && !usedTool) return null;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words",
          isUser
            ? "whitespace-pre-wrap bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {text ? (
          // 사용자 입력은 쓴 그대로 보여주고, 비서 답변만 마크다운으로 렌더링
          isUser ? text : <AssistantMarkdown text={text} />
        ) : (
          usedTool && <span className="text-muted-foreground">{pendingLabel}</span>
        )}
      </div>
    </div>
  );
}
