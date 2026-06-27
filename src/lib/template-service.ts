import { notion, templateDatabaseId } from "./notion";
import { queryAllPages, type NotionPage } from "./notion-helpers";
import { createWorkLog, queryWorkLogs } from "./notion-service";
import type {
  RecurringTemplate,
  RecurringTemplateFormData,
  Tag,
  WorkLogFormData,
  Frequency,
} from "./types";

function getTemplateDbId(): string {
  if (!templateDatabaseId) {
    throw new Error("NOTION_TEMPLATE_DATABASE_ID 환경변수가 설정되지 않았습니다.");
  }
  return templateDatabaseId;
}

function parseDayValues(raw: string | null | undefined, fallback: number | null | undefined): number[] {
  if (raw) {
    const parsed = raw.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n));
    if (parsed.length > 0) return parsed;
  }
  return [fallback ?? 1];
}

function mapPageToTemplate(page: NotionPage): RecurringTemplate {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const titleArr = p["템플릿명"]?.title as { plain_text: string }[] | undefined;
  const freqObj = p["반복주기"]?.select as { name: string } | null | undefined;
  const dayNum = p["반복일"]?.number as number | null | undefined;
  const dayListArr = p["반복요일목록"]?.rich_text as { plain_text: string }[] | undefined;
  const projArr = p["기본프로젝트"]?.multi_select as { name: string }[] | undefined;
  const statusObj = p["기본상태"]?.select as { name: string } | null | undefined;
  const tagsArr = p["기본태그"]?.multi_select as { name: string }[] | undefined;
  const hoursNum = p["기본소요시간"]?.number as number | null | undefined;
  const richText = p["업무내용"]?.rich_text as { plain_text: string }[] | undefined;
  const activeVal = p["활성"]?.checkbox as boolean | undefined;
  const autoVal = p["자동생성"]?.checkbox as boolean | undefined;

  return {
    id: page.id,
    name: titleArr?.[0]?.plain_text || "",
    frequency: (freqObj?.name || "매주") as Frequency,
    dayValues: parseDayValues(dayListArr?.[0]?.plain_text, dayNum),
    defaultProjects: (projArr?.map((p) => p.name) || ["청초수"]) as RecurringTemplate["defaultProjects"],
    defaultStatus: (statusObj?.name || "예정") as RecurringTemplate["defaultStatus"],
    defaultTags: (tagsArr?.map((t) => t.name) || []) as Tag[],
    defaultHours: hoursNum ?? null,
    content: richText?.[0]?.plain_text || "",
    active: activeVal ?? true,
    autoGenerate: autoVal ?? false,
  };
}

export async function getAllTemplates(): Promise<RecurringTemplate[]> {
  const dbId = getTemplateDbId();
  const pages = await queryAllPages(dbId, []);
  return pages.map(mapPageToTemplate);
}

export async function createTemplate(data: RecurringTemplateFormData): Promise<string> {
  const dbId = getTemplateDbId();

  const properties: Record<string, unknown> = {
    "템플릿명": { title: [{ text: { content: data.name } }] },
    "반복주기": { select: { name: data.frequency } },
    "반복일": { number: data.dayValues[0] },
    "반복요일목록": { rich_text: [{ text: { content: data.dayValues.join(",") } }] },
    "기본프로젝트": { multi_select: data.defaultProjects.map((p) => ({ name: p })) },
    "기본상태": { select: { name: data.defaultStatus } },
    "업무내용": { rich_text: [{ text: { content: data.content || "" } }] },
    "활성": { checkbox: data.active },
    "자동생성": { checkbox: data.autoGenerate },
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
  if (data.dayValues !== undefined) {
    properties["반복일"] = { number: data.dayValues[0] };
    properties["반복요일목록"] = { rich_text: [{ text: { content: data.dayValues.join(",") } }] };
  }
  if (data.defaultProjects !== undefined) {
    properties["기본프로젝트"] = { multi_select: data.defaultProjects.map((p) => ({ name: p })) };
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
  if (data.autoGenerate !== undefined) {
    properties["자동생성"] = { checkbox: data.autoGenerate };
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

import { getKSTNow, formatDate } from "./date-utils";

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
  const clampedDay = dayOfMonth === 0 ? lastDay : Math.min(dayOfMonth, lastDay);
  return formatDate(new Date(year, month, clampedDay));
}

function getQuarterDate(dayOfMonth: number): string {
  const now = getKSTNow();
  const month = now.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const year = now.getFullYear();
  const lastDay = new Date(year, quarterStartMonth + 1, 0).getDate();
  const clampedDay = dayOfMonth === 0 ? lastDay : Math.min(dayOfMonth, lastDay);
  return formatDate(new Date(year, quarterStartMonth, clampedDay));
}

export async function generateWorkLogs(
  mode: "이번주" | "이번달" | "이번분기",
  templateIds?: string[]
): Promise<{ generated: number; titles: string[]; skipped: string[] }> {
  let templates = await getAllTemplates();
  templates = templates.filter((t) => t.active);

  if (templateIds && templateIds.length > 0) {
    const idSet = new Set(templateIds);
    templates = templates.filter((t) => idSet.has(t.id));
  }

  if (mode === "이번주") {
    templates = templates.filter((t) => t.frequency === "매주");
  } else if (mode === "이번분기") {
    templates = templates.filter((t) => t.frequency === "매분기");
  } else {
    templates = templates.filter((t) => t.frequency === "매월");
  }

  const titles: string[] = [];
  const skipped: string[] = [];

  for (const tmpl of templates) {
    for (const day of tmpl.dayValues) {
      const date =
        mode === "이번주" ? getWeekDate(day) : mode === "이번분기" ? getQuarterDate(day) : getMonthDate(day);

      const existing = await queryWorkLogs({
        search: tmpl.name,
        dateFrom: date,
        dateTo: date,
      });
      if (existing.some((log) => log.title === tmpl.name)) {
        skipped.push(tmpl.name);
        continue;
      }

      const formData: WorkLogFormData = {
        title: tmpl.name,
        date,
        projects: tmpl.defaultProjects,
        status: tmpl.defaultStatus,
        content: tmpl.content,
        tags: tmpl.defaultTags,
        hours: tmpl.defaultHours,
        link: null,
      };

      await createWorkLog(formData, { inputSource: "웹" });
      titles.push(tmpl.name);
    }
  }

  return { generated: titles.length, titles, skipped };
}

export async function generateAutoWorkLogs(): Promise<{ generated: number; titles: string[]; skipped: string[] }> {
  const templates = (await getAllTemplates()).filter((t) => t.active && t.autoGenerate);

  const weeklyTemplates = templates.filter((t) => t.frequency === "매주");
  const monthlyTemplates = templates.filter((t) => t.frequency === "매월");
  const quarterlyTemplates = templates.filter((t) => t.frequency === "매분기");

  const titles: string[] = [];
  const skipped: string[] = [];

  const now = getKSTNow();
  const isFirstOfMonth = now.getDate() === 1;
  const isQuarterStart = isFirstOfMonth && [0, 3, 6, 9].includes(now.getMonth());

  for (const tmpl of weeklyTemplates) {
    for (const day of tmpl.dayValues) {
      const date = getWeekDate(day);
      const existing = await queryWorkLogs({ search: tmpl.name, dateFrom: date, dateTo: date });
      if (existing.some((log) => log.title === tmpl.name)) {
        skipped.push(tmpl.name);
        continue;
      }
      await createWorkLog({
        title: tmpl.name, date, projects: tmpl.defaultProjects,
        status: tmpl.defaultStatus, content: tmpl.content,
        tags: tmpl.defaultTags, hours: tmpl.defaultHours, link: null,
      }, { inputSource: "웹" });
      titles.push(tmpl.name);
    }
  }

  if (isFirstOfMonth) {
    for (const tmpl of monthlyTemplates) {
      for (const day of tmpl.dayValues) {
        const date = getMonthDate(day);
        const existing = await queryWorkLogs({ search: tmpl.name, dateFrom: date, dateTo: date });
        if (existing.some((log) => log.title === tmpl.name)) {
          skipped.push(tmpl.name);
          continue;
        }
        await createWorkLog({
          title: tmpl.name, date, projects: tmpl.defaultProjects,
          status: tmpl.defaultStatus, content: tmpl.content,
          tags: tmpl.defaultTags, hours: tmpl.defaultHours, link: null,
        }, { inputSource: "웹" });
        titles.push(tmpl.name);
      }
    }
  }

  if (isQuarterStart) {
    for (const tmpl of quarterlyTemplates) {
      for (const day of tmpl.dayValues) {
        const date = getQuarterDate(day);
        const existing = await queryWorkLogs({ search: tmpl.name, dateFrom: date, dateTo: date });
        if (existing.some((log) => log.title === tmpl.name)) {
          skipped.push(tmpl.name);
          continue;
        }
        await createWorkLog({
          title: tmpl.name, date, projects: tmpl.defaultProjects,
          status: tmpl.defaultStatus, content: tmpl.content,
          tags: tmpl.defaultTags, hours: tmpl.defaultHours, link: null,
        }, { inputSource: "웹" });
        titles.push(tmpl.name);
      }
    }
  }

  return { generated: titles.length, titles, skipped };
}
