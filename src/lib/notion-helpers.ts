import { notion } from "./notion";

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

interface PaginatedResult {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

const dsIdCache = new Map<string, string>();

export async function getDataSourceIdFor(databaseId: string): Promise<string> {
  const cached = dsIdCache.get(databaseId);
  if (cached) return cached;
  const db = (await notion.databases.retrieve({ database_id: databaseId })) as Record<string, unknown>;
  const ds = db.data_sources as { id: string }[];
  const id = ds[0].id;
  dsIdCache.set(databaseId, id);
  return id;
}

export async function queryAllPages(
  databaseId: string,
  sorts: Record<string, unknown>[],
  filter?: Record<string, unknown>
): Promise<NotionPage[]> {
  const dsId = await getDataSourceIdFor(databaseId);
  const allResults: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const query: Record<string, unknown> = {
      data_source_id: dsId,
      sorts,
      page_size: 100,
    };
    if (filter) query.filter = filter;
    if (cursor) query.start_cursor = cursor;

    const response = await (notion.dataSources as Record<string, Function>).query(query);
    const typed = response as PaginatedResult;
    allResults.push(...typed.results);
    cursor = typed.has_more && typed.next_cursor ? typed.next_cursor : undefined;
  } while (cursor);

  return allResults;
}

export type { NotionPage };
