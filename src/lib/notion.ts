import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID || (() => { throw new Error("NOTION_DATABASE_ID 환경변수가 설정되지 않았습니다."); })();

let cachedDataSourceId: string | null = null;

export async function getDataSourceId(): Promise<string> {
  if (cachedDataSourceId) return cachedDataSourceId;
  const db = await notion.databases.retrieve({ database_id: databaseId }) as Record<string, unknown>;
  const dataSources = db.data_sources as { id: string }[];
  cachedDataSourceId = dataSources[0].id;
  return cachedDataSourceId;
}

const templateDatabaseId = process.env.NOTION_TEMPLATE_DATABASE_ID;

let cachedTemplateDataSourceId: string | null = null;

export async function getTemplateDataSourceId(): Promise<string> {
  if (cachedTemplateDataSourceId) return cachedTemplateDataSourceId;
  if (!templateDatabaseId) throw new Error("NOTION_TEMPLATE_DATABASE_ID 환경변수가 설정되지 않았습니다.");
  const db = await notion.databases.retrieve({ database_id: templateDatabaseId }) as Record<string, unknown>;
  const dataSources = db.data_sources as { id: string }[];
  cachedTemplateDataSourceId = dataSources[0].id;
  return cachedTemplateDataSourceId;
}

export { notion, databaseId, templateDatabaseId };
