import { notion } from "./notion";
import { queryAllPages, type NotionPage } from "./notion-helpers";
import type { Track, TrackFormData, TrackStatus } from "./types";

function getTrackDbId(): string {
  const id = process.env.NOTION_TRACK_DATABASE_ID;
  if (!id) throw new Error("NOTION_TRACK_DATABASE_ID 환경변수가 설정되지 않았습니다.");
  return id;
}

function mapPageToTrack(page: NotionPage): Track {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const titleArr = p["트랙명"]?.title as { plain_text: string }[] | undefined;
  const entityObj = p["법인"]?.select as { name: string } | null | undefined;
  const startDate = p["시작일"]?.date as { start: string } | null | undefined;
  const targetDate = p["목표완료일"]?.date as { start: string } | null | undefined;
  const statusObj = p["상태"]?.select as { name: string } | null | undefined;
  const descArr = p["설명"]?.rich_text as { plain_text: string }[] | undefined;

  return {
    id: page.id,
    title: titleArr?.[0]?.plain_text || "",
    entity: entityObj?.name || null,
    startDate: startDate?.start || null,
    targetDate: targetDate?.start || null,
    status: (statusObj?.name as TrackStatus) || "계획",
    description: descArr?.[0]?.plain_text || null,
  };
}

export async function getAllTracks(): Promise<Track[]> {
  const pages = await queryAllPages(getTrackDbId(), [{ property: "시작일", direction: "descending" }]);
  return pages.map(mapPageToTrack);
}

export async function createTrack(data: TrackFormData): Promise<string> {
  const properties: Record<string, unknown> = {
    "트랙명": { title: [{ text: { content: data.title } }] },
    "상태": { select: { name: data.status } },
  };

  if (data.entity) properties["법인"] = { select: { name: data.entity } };
  if (data.startDate) properties["시작일"] = { date: { start: data.startDate } };
  if (data.targetDate) properties["목표완료일"] = { date: { start: data.targetDate } };
  if (data.description) properties["설명"] = { rich_text: [{ text: { content: data.description } }] };

  const page = await notion.pages.create({
    parent: { database_id: getTrackDbId() },
    properties,
  } as Parameters<typeof notion.pages.create>[0]);

  return page.id;
}

export async function updateTrack(pageId: string, data: Partial<TrackFormData>): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (data.title !== undefined) properties["트랙명"] = { title: [{ text: { content: data.title } }] };
  if (data.status !== undefined) properties["상태"] = { select: { name: data.status } };
  if (data.entity !== undefined) properties["법인"] = data.entity ? { select: { name: data.entity } } : { select: null };
  if (data.startDate !== undefined) properties["시작일"] = data.startDate ? { date: { start: data.startDate } } : { date: null };
  if (data.targetDate !== undefined) properties["목표완료일"] = data.targetDate ? { date: { start: data.targetDate } } : { date: null };
  if (data.description !== undefined) properties["설명"] = { rich_text: data.description ? [{ text: { content: data.description } }] : [] };

  await notion.pages.update({
    page_id: pageId,
    properties,
  } as Parameters<typeof notion.pages.update>[0]);
}

export async function deleteTrack(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    in_trash: true,
  } as Parameters<typeof notion.pages.update>[0]);
}
