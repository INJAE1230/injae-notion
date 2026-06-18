import { notion, databaseId, getDataSourceId } from "./notion";
import type { WorkLog, WorkLogFilters, WorkLogFormData, Tag, AchievementRating, InputSource } from "./types";

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

function mapProject(name: string | undefined | null): WorkLog["project"] {
  if (name === "개인" || name === "개인일정") return "개인일정";
  if (name === "업무" || name === "내부" || name === "클라이언트") return "업무";
  return "업무";
}

function mapPageToWorkLog(page: NotionPage): WorkLog {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const titleArr = p["업무"]?.title as { plain_text: string }[] | undefined;
  const dateObj = p["날짜"]?.date as { start: string } | null | undefined;
  const selectObj = p["프로젝트"]?.select as { name: string } | null | undefined;
  const statusObj = p["진행상태"]?.status as { name: string } | null | undefined;
  const richText = p["업무내용"]?.rich_text as { plain_text: string }[] | undefined;
  const multiSelect = p["태그"]?.multi_select as { name: string }[] | undefined;
  const numberVal = p["소요시간(시간)"]?.number as number | null | undefined;
  const urlVal = p["관련 링크"]?.url as string | null | undefined;
  const outcomeText = p["성과/결과"]?.rich_text as { plain_text: string }[] | undefined;
  const ratingObj = p["성과등급"]?.select as { name: string } | null | undefined;
  const sourceObj = p["입력소스"]?.select as { name: string } | null | undefined;
  const originalTextArr = p["입력원본"]?.rich_text as { plain_text: string }[] | undefined;

  return {
    id: page.id,
    title: titleArr?.[0]?.plain_text || "",
    date: dateObj?.start || "",
    project: mapProject(selectObj?.name),
    status: (statusObj?.name || "예정") as WorkLog["status"],
    content: richText?.[0]?.plain_text || "",
    tags: (multiSelect?.map((t) => t.name) || []) as Tag[],
    hours: numberVal ?? null,
    link: urlVal ?? null,
    outcome: outcomeText?.[0]?.plain_text || null,
    rating: (ratingObj?.name as AchievementRating) || null,
    inputSource: (sourceObj?.name as InputSource) || null,
    originalText: originalTextArr?.[0]?.plain_text || null,
  };
}

function buildFilter(filters: WorkLogFilters) {
  const conditions: Record<string, unknown>[] = [];

  if (filters.dateFrom) {
    conditions.push({
      property: "날짜",
      date: { on_or_after: filters.dateFrom },
    });
  }
  if (filters.dateTo) {
    conditions.push({
      property: "날짜",
      date: { on_or_before: filters.dateTo },
    });
  }
  if (filters.project) {
    conditions.push({
      property: "프로젝트",
      select: { equals: filters.project },
    });
  }
  if (filters.status) {
    conditions.push({
      property: "진행상태",
      status: { equals: filters.status },
    });
  }
  if (filters.tags && filters.tags.length > 0) {
    for (const tag of filters.tags) {
      conditions.push({
        property: "태그",
        multi_select: { contains: tag },
      });
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { and: conditions };
}

export async function queryWorkLogs(
  filters?: WorkLogFilters
): Promise<WorkLog[]> {
  const dsId = await getDataSourceId();
  const query: Record<string, unknown> = {
    data_source_id: dsId,
    sorts: [{ property: "날짜", direction: "descending" }],
    page_size: 100,
  };

  if (filters) {
    const filter = buildFilter(filters);
    if (filter) query.filter = filter;
  }

  const response = await (notion.dataSources as Record<string, Function>).query(query);
  const results = (response as { results: NotionPage[] }).results;

  let logs = results.map(mapPageToWorkLog);

  if (filters?.search) {
    const keyword = filters.search.toLowerCase();
    logs = logs.filter(
      (log) =>
        log.title.toLowerCase().includes(keyword) ||
        log.content.toLowerCase().includes(keyword)
    );
  }

  return logs;
}

export async function getAllWorkLogs(): Promise<WorkLog[]> {
  const dsId = await getDataSourceId();
  const allResults: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const query: Record<string, unknown> = {
      data_source_id: dsId,
      sorts: [{ property: "날짜", direction: "descending" }],
      page_size: 100,
    };
    if (cursor) query.start_cursor = cursor;

    const response = await (notion.dataSources as Record<string, Function>).query(query);
    const typed = response as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };
    allResults.push(...typed.results);
    cursor = typed.has_more && typed.next_cursor ? typed.next_cursor : undefined;
  } while (cursor);

  return allResults.map(mapPageToWorkLog);
}

export async function getWorkLog(pageId: string): Promise<WorkLog> {
  const page = (await notion.pages.retrieve({
    page_id: pageId,
  })) as unknown as NotionPage;
  return mapPageToWorkLog(page);
}

export async function createWorkLog(data: WorkLogFormData, meta?: { inputSource?: InputSource; originalText?: string }): Promise<string> {
  const properties: Record<string, unknown> = {
    "업무": { title: [{ text: { content: data.title } }] },
    "날짜": { date: { start: data.date } },
    "프로젝트": { select: { name: data.project } },
    "진행상태": { status: { name: data.status } },
    "업무내용": { rich_text: [{ text: { content: data.content } }] },
  };

  if (data.tags.length > 0) {
    properties["태그"] = {
      multi_select: data.tags.map((t) => ({ name: t })),
    };
  }
  if (data.hours !== null) {
    properties["소요시간(시간)"] = { number: data.hours };
  }
  if (data.link) {
    properties["관련 링크"] = { url: data.link };
  }

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  } as Parameters<typeof notion.pages.create>[0]);

  return page.id;
}

export async function updateWorkLog(
  pageId: string,
  data: Partial<WorkLogFormData>
): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (data.title !== undefined) {
    properties["업무"] = { title: [{ text: { content: data.title } }] };
  }
  if (data.date !== undefined) {
    properties["날짜"] = { date: { start: data.date } };
  }
  if (data.project !== undefined) {
    properties["프로젝트"] = { select: { name: data.project } };
  }
  if (data.status !== undefined) {
    properties["진행상태"] = { status: { name: data.status } };
  }
  if (data.content !== undefined) {
    properties["업무내용"] = {
      rich_text: [{ text: { content: data.content } }],
    };
  }
  if (data.tags !== undefined) {
    properties["태그"] = {
      multi_select: data.tags.map((t) => ({ name: t })),
    };
  }
  if (data.hours !== undefined) {
    properties["소요시간(시간)"] = {
      number: data.hours,
    };
  }
  if (data.link !== undefined) {
    properties["관련 링크"] = { url: data.link || null };
  }
  await notion.pages.update({
    page_id: pageId,
    properties,
  } as Parameters<typeof notion.pages.update>[0]);
}

export async function deleteWorkLog(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    in_trash: true,
  } as Parameters<typeof notion.pages.update>[0]);
}
