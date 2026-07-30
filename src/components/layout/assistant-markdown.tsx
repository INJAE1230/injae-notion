import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";

/**
 * AI 비서 답변용 경량 마크다운 렌더러.
 *
 * 모델이 목록·굵은 글씨를 자주 쓰는데 평문으로 출력하면 `-`, `**`가 그대로 보인다.
 * 답변에 필요한 최소 문법(불렛/번호 목록, 굵게, 인라인 코드)만 처리하고,
 * 업무 id(Notion UUID)는 상세 페이지 링크로 바꾼다.
 *
 * 외부 마크다운 라이브러리를 쓰지 않는 이유: 필요한 문법이 적고, 모델 출력을
 * HTML로 넣지 않고 React 엘리먼트로만 만들어 XSS 여지를 없애기 위함.
 */

// Notion 페이지 id — 하이픈 있는 형태와 없는 32자리 모두 허용
const NOTION_ID_RE = /\b([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})\b/gi;
const BOLD_OR_CODE_RE = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;

/** 업무 id를 상세 페이지 링크로 변환 */
function linkifyIds(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  NOTION_ID_RE.lastIndex = 0;

  while ((m = NOTION_ID_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const id = m[1];
    out.push(
      <Link
        key={`${keyPrefix}-id-${m.index}`}
        href={`/logs/${id}`}
        className="underline underline-offset-2 hover:opacity-70"
      >
        업무 보기
      </Link>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** 굵게·인라인 코드 처리 후 남은 텍스트는 id 링크 변환 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(BOLD_OR_CODE_RE).filter(Boolean);

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold">
          {linkifyIds(part.slice(2, -2), key)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={key} className="rounded bg-background/60 px-1 py-0.5 text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={key}>{linkifyIds(part, key)}</React.Fragment>;
  });
}

/** 목록 항목 — depth로 중첩 단계를 표현 (모델이 하위 불렛을 자주 쓴다) */
interface ListItem {
  text: string;
  depth: number;
  ordered: boolean;
  children: ListItem[];
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: ListItem[] };

/** 들여쓰기 2칸을 한 단계로 보되, 과도한 중첩은 2단계로 제한.
 * 모델이 번호 목록 하위를 3칸으로 들여쓰는 경우가 많아 1칸 이상이면 하위로 본다. */
function indentDepth(raw: string): number {
  const spaces = raw.match(/^[ \t]*/)?.[0] ?? "";
  const width = spaces.replace(/\t/g, "  ").length;
  if (width === 0) return 0;
  return Math.min(Math.max(1, Math.floor(width / 2)), 2);
}

/** depth에 맞는 위치에 항목을 꽂는다 (없는 단계는 가장 가까운 상위에 붙임) */
function insertItem(items: ListItem[], item: ListItem) {
  if (item.depth === 0 || items.length === 0) {
    items.push(item);
    return;
  }
  const parent = items[items.length - 1];
  if (item.depth > parent.depth) {
    insertItem(parent.children, item);
  } else {
    items.push(item);
  }
}

/** 줄 단위로 훑어 목록/문단 블록으로 묶는다 */
function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const prev = blocks[blocks.length - 1];

    if (bullet || numbered) {
      const m = (bullet ?? numbered)!;
      const ordered = !bullet;
      const item: ListItem = { text: m[1], depth: indentDepth(line), ordered, children: [] };

      // 들여쓴 하위 항목은 목록 종류가 달라도 위 목록에 이어 붙인다.
      // 새 블록으로 끊으면 상위 번호가 매번 1부터 다시 시작한다.
      if (prev?.kind === "list" && (item.depth > 0 || prev.ordered === ordered)) {
        insertItem(prev.items, item);
      } else {
        blocks.push({ kind: "list", ordered, items: [item] });
      }
    } else if (line.trim() === "") {
      // 빈 줄은 블록 경계로만 쓴다
      if (prev?.kind === "p") blocks.push({ kind: "p", lines: [] });
    } else {
      if (prev?.kind === "p" && prev.lines.length > 0) prev.lines.push(line);
      else blocks.push({ kind: "p", lines: [line] });
    }
  }

  return blocks.filter((b) => (b.kind === "p" ? b.lines.length > 0 : b.items.length > 0));
}

function ItemList({ items, ordered, keyPrefix }: { items: ListItem[]; ordered: boolean; keyPrefix: string }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={cn("space-y-0.5 pl-4", ordered ? "list-decimal" : "list-disc")}>
      {items.map((item, i) => (
        <li key={i}>
          {renderInline(item.text, `${keyPrefix}-${i}`)}
          {item.children.length > 0 && (
            <ItemList
              items={item.children}
              ordered={item.children[0].ordered}
              keyPrefix={`${keyPrefix}-${i}c`}
            />
          )}
        </li>
      ))}
    </Tag>
  );
}

export function AssistantMarkdown({ text }: { text: string }) {
  const blocks = toBlocks(text);

  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        if (block.kind === "list") {
          return (
            <ItemList key={bi} items={block.items} ordered={block.ordered} keyPrefix={String(bi)} />
          );
        }
        return (
          <p key={bi} className="whitespace-pre-wrap">
            {block.lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(line, `${bi}-${li}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
