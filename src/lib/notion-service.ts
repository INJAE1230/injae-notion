import { notion, getDatabaseId } from "./notion";
import { queryAllPages, type NotionPage } from "./notion-helpers";
import type { WorkLog, WorkLogFilters, WorkLogFormData, Tag, AchievementRating, InputSource, Priority, FileAttachment, Project } from "./types";

const VALID_PROJECTS = new Set(["청초수", "씨푸드", "JS코퍼", "JKK", "646미터퍼세크", "아일랜드", "청초수(신관)", "에그롤린대전", "개인일정"]);

function mapProjects(items: { name: string }[] | undefined | null): Project[] {
  if (!items || items.length === 0) return ["청초수"];
  const mapped = items.map((i) => i.name).filter((n) => VALID_PROJECTS.has(n)) as Project[];
  return mapped.length > 0 ? mapped : ["청초수"];
}

function mapPageToWorkLog(page: NotionPage): WorkLog {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const titleArr = p["업무"]?.title as { plain_text: string }[] | undefined;
  const dateObj = p["날짜"]?.date as { start: string } | null | undefined;
  const projectMulti = p["프로젝트"]?.multi_select as { name: string }[] | undefined;
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
  const trackRelation = p["트랙"]?.relation as { id: string }[] | undefined;

  const attachments: FileAttachment[] = (filesArr || []).map((f) => ({
    name: f.name,
    url: (f.type === "external" ? f.external?.url : f.file?.url) || "",
  })).filter((a) => a.url);

  return {
    id: page.id,
    title: titleArr?.[0]?.plain_text || "",
    date: dateObj?.start || "",
    projects: mapProjects(projectMulti),
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
    trackId: trackRelation?.[0]?.id || null,
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
      multi_select: { contains: filters.project },
    });
  }
  if (filters.status) {
    conditions.push({
      property: "진행상태",
      status: { equals: filters.status },
    });
  }
  if (filters.excludeStatus) {
    conditions.push({
      property: "진행상태",
      status: { does_not_equal: filters.excludeStatus },
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
      or: [
        {
          property: "업무",
          title: { contains: filters.search },
        },
        {
          property: "업무내용",
          rich_text: { contains: filters.search },
        },
      ],
    });
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { and: conditions };
}

export async function queryWorkLogs(
  filters?: WorkLogFilters
): Promise<WorkLog[]> {
  const filter = filters ? buildFilter(filters) : undefined;
  const pages = await queryAllPages(
    getDatabaseId(),
    [{ property: "날짜", direction: "descending" }],
    filter as Record<string, unknown> | undefined
  );
  return pages.map(mapPageToWorkLog);
}

export async function getAllWorkLogs(): Promise<WorkLog[]> {
  const pages = await queryAllPages(getDatabaseId(), [{ property: "날짜", direction: "descending" }]);
  return pages.map(mapPageToWorkLog);
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
    "프로젝트": { multi_select: data.projects.map((p) => ({ name: p })) },
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
  if (data.trackId) {
    properties["트랙"] = { relation: [{ id: data.trackId }] };
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
      parent: { database_id: getDatabaseId() },
      properties: { ...properties, ...metaProperties },
    } as Parameters<typeof notion.pages.create>[0]);
    return page.id;
  } catch (error) {
    if (Object.keys(metaProperties).length > 0) {
      const page = await notion.pages.create({
        parent: { database_id: getDatabaseId() },
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
  if (data.projects !== undefined) {
    properties["프로젝트"] = { multi_select: data.projects.map((p) => ({ name: p })) };
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
  if (data.trackId !== undefined) {
    optionalProperties["트랙"] = data.trackId
      ? { relation: [{ id: data.trackId }] }
      : { relation: [] };
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
