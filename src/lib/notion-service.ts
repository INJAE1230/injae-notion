import { notion, databaseId, getDataSourceId } from "./notion";
import type { WorkLog, WorkLogFilters, WorkLogFormData, Tag, AchievementRating, InputSource, Priority, FileAttachment } from "./types";

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
  const priorityObj = p["우선순위"]?.select as { name: string } | null | undefined;
  const filesArr = p["첨부파일"]?.files as { name: string; type: string; external?: { url: string }; file?: { url: string } }[] | undefined;

  const attachments: FileAttachment[] = (filesArr || []).map((f) => ({
    name: f.name,
    url: (f.type === "external" ? f.external?.url : f.file?.url) || "",
  })).filter((a) => a.url);

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
    priority: (priorityObj?.name as Priority) || null,
    outcome: outcomeText?.[0]?.plain_text || null,
    rating: (ratingObj?.name as AchievementRating) || null,
    inputSource: (sourceObj?.name as InputSource) || null,
    originalText: originalTextArr?.[0]?.plain_text || null,
    attachments,
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
  if (filters.priority) {
    conditions.push({
      property: "우선순위",
      select: { equals: filters.priority },
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
  if (filters.search) {
    conditions.push({
      property: "업무",
      title: { contains: filters.search },
    });
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

  return results.map(mapPageToWorkLog);
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
    "업무내용": { rich_text: [{ text: { content: data.content || "" } }] },
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
  if (data.priority) {
    properties["우선순위"] = { select: { name: data.priority } };
  }
  if (data.outcome) {
    properties["성과/결과"] = { rich_text: [{ text: { content: data.outcome } }] };
  }
  if (data.rating) {
    properties["성과등급"] = { select: { name: data.rating } };
  }

  if (data.attachments && data.attachments.length > 0) {
    properties["첨부파일"] = {
      files: data.attachments.map((a) => ({
        type: "external" as const,
        name: a.name,
        external: { url: a.url },
      })),
    };
  }

  const metaProperties: Record<string, unknown> = {};
  if (meta?.inputSource) {
    metaProperties["입력소스"] = { select: { name: meta.inputSource } };
  }
  if (meta?.originalText) {
    metaProperties["입력원본"] = { rich_text: [{ text: { content: meta.originalText } }] };
  }

  try {
    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: { ...properties, ...metaProperties },
    } as Parameters<typeof notion.pages.create>[0]);
    return page.id;
  } catch (error) {
    if (Object.keys(metaProperties).length > 0) {
      const page = await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      } as Parameters<typeof notion.pages.create>[0]);
      return page.id;
    }
    throw error;
  }
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
  const optionalProperties: Record<string, unknown> = {};
  if (data.priority !== undefined) {
    optionalProperties["우선순위"] = data.priority ? { select: { name: data.priority } } : { select: null };
  }
  if (data.outcome !== undefined) {
    optionalProperties["성과/결과"] = {
      rich_text: data.outcome ? [{ text: { content: data.outcome } }] : [],
    };
  }
  if (data.rating !== undefined) {
    optionalProperties["성과등급"] = data.rating ? { select: { name: data.rating } } : { select: null };
  }
  if (data.attachments !== undefined) {
    optionalProperties["첨부파일"] = {
      files: data.attachments.map((a) => ({
        type: "external" as const,
        name: a.name,
        external: { url: a.url },
      })),
    };
  }

  try {
    await notion.pages.update({
      page_id: pageId,
      properties: { ...properties, ...optionalProperties },
    } as Parameters<typeof notion.pages.update>[0]);
  } catch (error) {
    if (Object.keys(optionalProperties).length > 0) {
      await notion.pages.update({
        page_id: pageId,
        properties,
      } as Parameters<typeof notion.pages.update>[0]);
    } else {
      throw error;
    }
  }
}

export async function deleteWorkLog(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    in_trash: true,
  } as Parameters<typeof notion.pages.update>[0]);
}
