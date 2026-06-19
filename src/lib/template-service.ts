import { notion, templateDatabaseId } from "./notion";
import { createWorkLog } from "./notion-service";
import type {
  RecurringTemplate,
  RecurringTemplateFormData,
  Tag,
  WorkLogFormData,
  Frequency,
} from "./types";

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

function getTemplateDbId(): string {
  if (!templateDatabaseId) {
    throw new Error("NOTION_TEMPLATE_DATABASE_ID 환경변수가 설정되지 않았습니다.");
  }
  return templateDatabaseId;
}

function mapPageToTemplate(page: NotionPage): RecurringTemplate {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const titleArr = p["템플릿명"]?.title as { plain_text: string }[] | undefined;
  const freqObj = p["반복주기"]?.select as { name: string } | null | undefined;
  const dayNum = p["반복일"]?.number as number | null | undefined;
  const projObj = p["기본프로젝트"]?.select as { name: string } | null | undefined;
  const statusObj = p["기본상태"]?.select as { name: string } | null | undefined;
  const tagsArr = p["기본태그"]?.multi_select as { name: string }[] | undefined;
  const hoursNum = p["기본소요시간"]?.number as number | null | undefined;
  const richText = p["업무내용"]?.rich_text as { plain_text: string }[] | undefined;
  const activeVal = p["활성"]?.checkbox as boolean | undefined;

  return {
    id: page.id,
    name: titleArr?.[0]?.plain_text || "",
    frequency: (freqObj?.name || "매주") as Frequency,
    dayValue: dayNum ?? 1,
    defaultProject: (projObj?.name || "업무") as RecurringTemplate["defaultProject"],
    defaultStatus: (statusObj?.name || "예정") as RecurringTemplate["defaultStatus"],
    defaultTags: (tagsArr?.map((t) => t.name) || []) as Tag[],
    defaultHours: hoursNum ?? null,
    content: richText?.[0]?.plain_text || "",
    active: activeVal ?? true,
  };
}

export async function getAllTemplates(): Promise<RecurringTemplate[]> {
  const dbId = getTemplateDbId();
  const allResults: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const query: Record<string, unknown> = {
      database_id: dbId,
      page_size: 100,
    };
    if (cursor) query.start_cursor = cursor;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (notion.databases as any).query(query);
    const typed = response as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };
    allResults.push(...typed.results);
    cursor = typed.has_more && typed.next_cursor ? typed.next_cursor : undefined;
  } while (cursor);

  return allResults.map(mapPageToTemplate);
}

export async function createTemplate(data: RecurringTemplateFormData): Promise<string> {
  const dbId = getTemplateDbId();

  const properties: Record<string, unknown> = {
    "템플릿명": { title: [{ text: { content: data.name } }] },
    "반복주기": { select: { name: data.frequency } },
    "반복일": { number: data.dayValue },
    "기본프로젝트": { select: { name: data.defaultProject } },
    "기본상태": { select: { name: data.defaultStatus } },
    "업무내용": { rich_text: [{ text: { content: data.content || "" } }] },
    "활성": { checkbox: data.active },
  };

  if (data.defaultTags.length > 0) {
    properties["기본태그"] = {
      multi_select: data.defaultTags.map((t) => ({ name: t })),
    };
  }
  if (data.defaultHours !== null) {
    properties["기본소요시간"] = { number: data.defaultHours };
  }

  const page = await notion.pages.create({
    parent: { database_id: dbId },
    properties,
  } as Parameters<typeof notion.pages.create>[0]);

  return page.id;
}

export async function updateTemplate(
  pageId: string,
  data: Partial<RecurringTemplateFormData>
): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (data.name !== undefined) {
    properties["템플릿명"] = { title: [{ text: { content: data.name } }] };
  }
  if (data.frequency !== undefined) {
    properties["반복주기"] = { select: { name: data.frequency } };
  }
  if (data.dayValue !== undefined) {
    properties["반복일"] = { number: data.dayValue };
  }
  if (data.defaultProject !== undefined) {
    properties["기본프로젝트"] = { select: { name: data.defaultProject } };
  }
  if (data.defaultStatus !== undefined) {
    properties["기본상태"] = { select: { name: data.defaultStatus } };
  }
  if (data.defaultTags !== undefined) {
    properties["기본태그"] = {
      multi_select: data.defaultTags.map((t) => ({ name: t })),
    };
  }
  if (data.defaultHours !== undefined) {
    properties["기본소요시간"] = { number: data.defaultHours };
  }
  if (data.content !== undefined) {
    properties["업무내용"] = { rich_text: [{ text: { content: data.content } }] };
  }
  if (data.active !== undefined) {
    properties["활성"] = { checkbox: data.active };
  }

  await notion.pages.update({
    page_id: pageId,
    properties,
  } as Parameters<typeof notion.pages.update>[0]);
}

export async function deleteTemplate(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    in_trash: true,
  } as Parameters<typeof notion.pages.update>[0]);
}

function getKSTNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekDate(dayOfWeek: number): string {
  const now = getKSTNow();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const targetOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const target = new Date(monday);
  target.setDate(monday.getDate() + targetOffset);
  return formatDate(target);
}

function getMonthDate(dayOfMonth: number): string {
  const now = getKSTNow();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(dayOfMonth, lastDay);
  return formatDate(new Date(year, month, clampedDay));
}

export async function generateWorkLogs(
  mode: "이번주" | "이번달",
  templateIds?: string[]
): Promise<{ generated: number; titles: string[] }> {
  let templates = await getAllTemplates();
  templates = templates.filter((t) => t.active);

  if (templateIds && templateIds.length > 0) {
    const idSet = new Set(templateIds);
    templates = templates.filter((t) => idSet.has(t.id));
  }

  if (mode === "이번주") {
    templates = templates.filter((t) => t.frequency === "매주");
  } else {
    templates = templates.filter((t) => t.frequency === "매월");
  }

  const titles: string[] = [];

  for (const tmpl of templates) {
    const date =
      mode === "이번주"
        ? getWeekDate(tmpl.dayValue)
        : getMonthDate(tmpl.dayValue);

    const formData: WorkLogFormData = {
      title: tmpl.name,
      date,
      project: tmpl.defaultProject,
      status: tmpl.defaultStatus,
      content: tmpl.content,
      tags: tmpl.defaultTags,
      hours: tmpl.defaultHours,
      link: null,
    };

    await createWorkLog(formData, { inputSource: "웹" });
    titles.push(tmpl.name);
  }

  return { generated: titles.length, titles };
}
