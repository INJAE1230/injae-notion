import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
function getDatabaseId(): string {
  const id = process.env.NOTION_DATABASE_ID;
  if (!id) throw new Error("NOTION_DATABASE_ID 환경변수가 설정되지 않았습니다.");
  return id;
}

const templateDatabaseId = process.env.NOTION_TEMPLATE_DATABASE_ID;

export { notion, getDatabaseId, templateDatabaseId };
