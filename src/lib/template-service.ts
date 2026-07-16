import { notion, templateDatabaseId } from "./notion";
import { queryAllPages, type NotionPage } from "./notion-helpers";
import { createWorkLog, queryWorkLogs } from "./notion-service";
import { getKSTNow, formatDate } from "./date-utils";
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

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDailyDate(): string {
  return formatDate(getKSTNow());
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

function getSemiannualDate(dayOfMonth: number): string {
  const now = getKSTNow();
  const month = now.getMonth();
  const halfStartMonth = month < 6 ? 0 : 6;
  const year = now.getFullYear();
  const lastDay = new Date(year, halfStartMonth + 1, 0).getDate();
  const clampedDay = dayOfMonth === 0 ? lastDay : Math.min(dayOfMonth, lastDay);
  return formatDate(new Date(year, halfStartMonth, clampedDay));
}

function getAnnualDate(month: number, day: number): string {
  const now = getKSTNow();
  const year = now.getFullYear();
  const lastDay = new Date(year, month, 0).getDate();
  const clampedDay = day === 0 ? lastDay : Math.min(day, lastDay);
  return formatDate(new Date(year, month - 1, clampedDay));
}

function getMonthlyNthWeekdayDate(weekOrdinal: number, dayOfWeek: number): string {
  const now = getKSTNow();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  let firstOccurrence = dayOfWeek - firstDayOfWeek;
  if (firstOccurrence < 0) firstOccurrence += 7;
  firstOccurrence += 1;

  const lastDay = new Date(year, month + 1, 0).getDate();

  let targetDay: number;
  if (weekOrdinal === 5) {
    let last = firstOccurrence;
    while (last + 7 <= lastDay) last += 7;
    targetDay = last;
  } else {
    targetDay = firstOccurrence + (weekOrdinal - 1) * 7;
    if (targetDay > lastDay) {
      let last = firstOccurrence;
      while (last + 7 <= lastDay) last += 7;
      targetDay = last;
    }
  }

  return formatDate(new Date(year, month, targetDay));
}

function getTemplateDates(tmpl: import("./types").RecurringTemplate): string[] {
  switch (tmpl.frequency) {
    case "매일":
      return [getDailyDate()];
    case "매주":
    case "격주":
      return tmpl.dayValues.map(getWeekDate);
    case "매월":
      return tmpl.dayValues.map(getMonthDate);
    case "매분기":
      return tmpl.dayValues.map(getQuarterDate);
    case "반기":
      return tmpl.dayValues.map(getSemiannualDate);
    case "매년":
      return [getAnnualDate(tmpl.dayValues[0] ?? 1, tmpl.dayValues[1] ?? 1)];
    case "매월N번째요일":
      return [getMonthlyNthWeekdayDate(tmpl.dayValues[0] ?? 1, tmpl.dayValues[1] ?? 1)];
    default:
      return tmpl.dayValues.map(getMonthDate);
  }
}

export async function generateWorkLogs(
  mode: "오늘" | "이번주" | "이번달" | "이번분기" | "이번반기" | "올해",
  templateIds?: string[]
): Promise<{ generated: number; titles: string[]; skipped: string[] }> {
  let templates = await getAllTemplates();
  templates = templates.filter((t) => t.active);

  if (templateIds && templateIds.length > 0) {
    const idSet = new Set(templateIds);
    templates = templates.filter((t) => idSet.has(t.id));
  }

  const modeFrequencyMap: Record<string, Frequency[]> = {
    오늘: ["매일"],
    이번주: ["매주", "격주"],
    이번달: ["매월", "매월N번째요일"],
    이번분기: ["매분기"],
    이번반기: ["반기"],
    올해: ["매년"],
  };
  const allowed = modeFrequencyMap[mode] ?? [];
  templates = templates.filter((t) => allowed.includes(t.frequency));

  const titles: string[] = [];
  const skipped: string[] = [];

  for (const tmpl of templates) {
    const dates = getTemplateDates(tmpl);
    for (const date of dates) {
      const existing = await queryWorkLogs({ search: tmpl.name, dateFrom: date, dateTo: date });
      if (existing.some((log) => log.title === tmpl.name)) {
        skipped.push(tmpl.name);
        continue;
      }
      await createWorkLog(
        { title: tmpl.name, date, projects: tmpl.defaultProjects, status: tmpl.defaultStatus, content: tmpl.content, tags: tmpl.defaultTags, hours: tmpl.defaultHours, link: null },
        { inputSource: "웹" }
      );
      titles.push(tmpl.name);
    }
  }

  return { generated: titles.length, titles, skipped };
}

async function autoGenerate(
  tmplList: import("./types").RecurringTemplate[],
  titles: string[],
  skipped: string[]
) {
  for (const tmpl of tmplList) {
    const dates = getTemplateDates(tmpl);
    for (const date of dates) {
      const existing = await queryWorkLogs({ search: tmpl.name, dateFrom: date, dateTo: date });
      if (existing.some((log) => log.title === tmpl.name)) {
        skipped.push(tmpl.name);
        continue;
      }
      await createWorkLog(
        { title: tmpl.name, date, projects: tmpl.defaultProjects, status: tmpl.defaultStatus, content: tmpl.content, tags: tmpl.defaultTags, hours: tmpl.defaultHours, link: null },
        { inputSource: "웹" }
      );
      titles.push(tmpl.name);
    }
  }
}

export async function generateAutoWorkLogs(): Promise<{ generated: number; titles: string[]; skipped: string[] }> {
  const templates = (await getAllTemplates()).filter((t) => t.active && t.autoGenerate);

  const titles: string[] = [];
  const skipped: string[] = [];

  const now = getKSTNow();
  const isFirstOfMonth = now.getDate() === 1;
  const isQuarterStart = isFirstOfMonth && [0, 3, 6, 9].includes(now.getMonth());
  const isHalfStart = isFirstOfMonth && [0, 6].includes(now.getMonth());
  const isOddWeek = getISOWeekNumber(now) % 2 === 1;

  await autoGenerate(templates.filter((t) => t.frequency === "매일"), titles, skipped);
  await autoGenerate(templates.filter((t) => t.frequency === "매주"), titles, skipped);

  if (isOddWeek) {
    await autoGenerate(templates.filter((t) => t.frequency === "격주"), titles, skipped);
  }

  if (isFirstOfMonth) {
    await autoGenerate(templates.filter((t) => t.frequency === "매월"), titles, skipped);
    await autoGenerate(templates.filter((t) => t.frequency === "매월N번째요일"), titles, skipped);
  }

  if (isQuarterStart) {
    await autoGenerate(templates.filter((t) => t.frequency === "매분기"), titles, skipped);
  }

  if (isHalfStart) {
    await autoGenerate(templates.filter((t) => t.frequency === "반기"), titles, skipped);
  }

  // 매년: 오늘 날짜가 템플릿의 월/일과 일치하는 경우에만 생성
  const annualTemplates = templates.filter((t) => {
    if (t.frequency !== "매년") return false;
    const month = t.dayValues[0] ?? 1;
    const day = t.dayValues[1] ?? 1;
    const lastDay = new Date(now.getFullYear(), month, 0).getDate();
    const targetDay = day === 0 ? lastDay : Math.min(day, lastDay);
    return now.getMonth() + 1 === month && now.getDate() === targetDay;
  });
  await autoGenerate(annualTemplates, titles, skipped);

  return { generated: titles.length, titles, skipped };
}
