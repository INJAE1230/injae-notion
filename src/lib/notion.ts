import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID!;

let cachedDataSourceId: string | null = null;

export async function getDataSourceId(): Promise<string> {
  if (cachedDataSourceId) return cachedDataSourceId;
  const db = await notion.databases.retrieve({ database_id: databaseId }) as Record<string, unknown>;
  const dataSources = db.data_sources as { id: string }[];
  cachedDataSourceId = dataSources[0].id;
  return cachedDataSourceId;
}

export { notion, databaseId };
