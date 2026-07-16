import { NextResponse } from "next/server";
import { createWorkLog, queryWorkLogs, getWorkLog, updateWorkLog } from "@/lib/notion-service";
import { workLogFormSchema, validateBody } from "@/lib/validations";
import type { WorkLogFormData, InputSource } from "@/lib/types";

async function findMatchingLog(keyword: string) {
  const logs = await queryWorkLogs({ search: keyword });
  if (logs.length === 0) return null;
  return logs[0];
}

export async function POST(request: Request) {
  try {
    const { entries, originalText, source } = (await request.json()) as {
      entries: WorkLogFormData[];
      originalText: string;
      source?: InputSource;
    };

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: "저장할 업무가 없습니다." },
        { status: 400 }
      );
    }

    for (const entry of entries) {
      const parsed = validateBody(workLogFormSchema, entry);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
    }

    const results: string[] = [];
    const appendResults: { id: string; title: string }[] = [];

    for (const entry of entries) {
      if (entry.appendTo) {
        const existing = await findMatchingLog(entry.appendTo);
        if (existing) {
          const newContent = existing.content
            ? `${existing.content}\n\n[추가] ${entry.content}`
            : entry.content;

          const updateData: Partial<WorkLogFormData> = { content: newContent };

          if (entry.hours !== null && existing.hours !== null) {
            updateData.hours = existing.hours + entry.hours;
          } else if (entry.hours !== null) {
            updateData.hours = entry.hours;
          }

          if (entry.status && entry.status !== "진행 중") {
            updateData.status = entry.status;
          }

          await updateWorkLog(existing.id, updateData);
          results.push(existing.id);
          appendResults.push({ id: existing.id, title: existing.title });
          continue;
        }
      }

      const id = await createWorkLog(entry, {
        inputSource: source || "빠른메모",
        originalText,
      });
      results.push(id);
    }

    return NextResponse.json({
      ids: results,
      count: results.length,
      appended: appendResults,
    });
  } catch (error) {
    console.error("업무 저장 실패:", error);
    const message = error instanceof Error ? error.message : "업무 저장 중 오류가 발생했습니다.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
