import { notion } from "./notion";
import type { Project } from "./types";
import type {
  Employee,
  EmployeeFormData,
  AttendanceRecord,
  AttendanceFormData,
  EmploymentStatus,
  Position,
  AttendanceType,
} from "./hr-types";

const employeeDbId = process.env.NOTION_HR_EMPLOYEE_DB_ID!;
const attendanceDbId = process.env.NOTION_HR_ATTENDANCE_DB_ID!;

let cachedEmployeeDsId: string | null = null;
let cachedAttendanceDsId: string | null = null;

async function getEmployeeDsId(): Promise<string> {
  if (cachedEmployeeDsId) return cachedEmployeeDsId;
  const db = await notion.databases.retrieve({ database_id: employeeDbId }) as Record<string, unknown>;
  const ds = db.data_sources as { id: string }[];
  cachedEmployeeDsId = ds[0].id;
  return cachedEmployeeDsId;
}

async function getAttendanceDsId(): Promise<string> {
  if (cachedAttendanceDsId) return cachedAttendanceDsId;
  const db = await notion.databases.retrieve({ database_id: attendanceDbId }) as Record<string, unknown>;
  const ds = db.data_sources as { id: string }[];
  cachedAttendanceDsId = ds[0].id;
  return cachedAttendanceDsId;
}

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

const VALID_PROJECTS = new Set(["청초수", "씨푸드", "JS코퍼", "JKK", "646코퍼", "아일랜드", "청초수(신관)", "에이전트", "에그롤린대전", "개인일정"]);

function mapProjects(items: { name: string }[] | undefined | null): Project[] {
  if (!items || items.length === 0) return [];
  return items.map((i) => i.name).filter((n) => VALID_PROJECTS.has(n)) as Project[];
}

function mapEmployee(page: NotionPage): Employee {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const titleArr = p["이름"]?.title as { plain_text: string }[] | undefined;
  const projectMulti = p["사업장"]?.multi_select as { name: string }[] | undefined;
  const positionObj = p["직급"]?.select as { name: string } | null | undefined;
  const dateObj = p["입사일"]?.date as { start: string } | null | undefined;
  const phoneText = p["연락처"]?.rich_text as { plain_text: string }[] | undefined;
  const leaveNum = p["연차일수"]?.number as number | null | undefined;
  const statusObj = p["재직상태"]?.select as { name: string } | null | undefined;
  const memoText = p["메모"]?.rich_text as { plain_text: string }[] | undefined;

  return {
    id: page.id,
    name: titleArr?.[0]?.plain_text || "",
    projects: mapProjects(projectMulti),
    position: (positionObj?.name as Position) || null,
    joinDate: dateObj?.start || "",
    phone: phoneText?.[0]?.plain_text || "",
    annualLeave: leaveNum ?? 15,
    status: (statusObj?.name as EmploymentStatus) || "재직",
    memo: memoText?.[0]?.plain_text || "",
  };
}

function mapAttendance(page: NotionPage): AttendanceRecord {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const empText = p["직원명"]?.rich_text as { plain_text: string }[] | undefined;
  const dateObj = p["날짜"]?.date as { start: string } | null | undefined;
  const typeObj = p["근태유형"]?.select as { name: string } | null | undefined;
  const reasonText = p["사유"]?.rich_text as { plain_text: string }[] | undefined;
  const deductNum = p["차감일수"]?.number as number | null | undefined;
  const projectMulti = p["사업장"]?.multi_select as { name: string }[] | undefined;

  return {
    id: page.id,
    employeeName: empText?.[0]?.plain_text || "",
    date: dateObj?.start || "",
    type: (typeObj?.name as AttendanceType) || "연차",
    reason: reasonText?.[0]?.plain_text || "",
    deductDays: deductNum ?? 0,
    projects: mapProjects(projectMulti),
  };
}

// ── Employee CRUD ──

export async function getAllEmployees(): Promise<Employee[]> {
  const dsId = await getEmployeeDsId();
  const allResults: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const query: Record<string, unknown> = {
      data_source_id: dsId,
      sorts: [{ property: "이름", direction: "ascending" }],
      page_size: 100,
    };
    if (cursor) query.start_cursor = cursor;

    const response = await (notion.dataSources as Record<string, Function>).query(query);
    const typed = response as { results: NotionPage[]; has_more: boolean; next_cursor: string | null };
    allResults.push(...typed.results);
    cursor = typed.has_more && typed.next_cursor ? typed.next_cursor : undefined;
  } while (cursor);

  return allResults.map(mapEmployee);
}

export async function createEmployee(data: EmployeeFormData): Promise<string> {
  const properties: Record<string, unknown> = {
    "이름": { title: [{ text: { content: data.name } }] },
    "사업장": { multi_select: data.projects.map((p) => ({ name: p })) },
    "입사일": { date: { start: data.joinDate } },
    "연락처": { rich_text: [{ text: { content: data.phone || "" } }] },
    "연차일수": { number: data.annualLeave },
    "재직상태": { select: { name: data.status } },
    "메모": { rich_text: [{ text: { content: data.memo || "" } }] },
  };

  if (data.position) {
    properties["직급"] = { select: { name: data.position } };
  }

  const page = await notion.pages.create({
    parent: { database_id: employeeDbId },
    properties,
  } as Parameters<typeof notion.pages.create>[0]);
  return page.id;
}

export async function updateEmployee(id: string, data: Partial<EmployeeFormData>): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (data.name !== undefined) properties["이름"] = { title: [{ text: { content: data.name } }] };
  if (data.projects !== undefined) properties["사업장"] = { multi_select: data.projects.map((p) => ({ name: p })) };
  if (data.position !== undefined) properties["직급"] = data.position ? { select: { name: data.position } } : { select: null };
  if (data.joinDate !== undefined) properties["입사일"] = { date: { start: data.joinDate } };
  if (data.phone !== undefined) properties["연락처"] = { rich_text: [{ text: { content: data.phone } }] };
  if (data.annualLeave !== undefined) properties["연차일수"] = { number: data.annualLeave };
  if (data.status !== undefined) properties["재직상태"] = { select: { name: data.status } };
  if (data.memo !== undefined) properties["메모"] = { rich_text: [{ text: { content: data.memo } }] };

  await notion.pages.update({
    page_id: id,
    properties,
  } as Parameters<typeof notion.pages.update>[0]);
}

export async function deleteEmployee(id: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    in_trash: true,
  } as Parameters<typeof notion.pages.update>[0]);
}

// ── Attendance CRUD ──

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  const dsId = await getAttendanceDsId();
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
    const typed = response as { results: NotionPage[]; has_more: boolean; next_cursor: string | null };
    allResults.push(...typed.results);
    cursor = typed.has_more && typed.next_cursor ? typed.next_cursor : undefined;
  } while (cursor);

  return allResults.map(mapAttendance);
}

export async function createAttendance(data: AttendanceFormData): Promise<string> {
  const title = `${data.employeeName} - ${data.type}`;
  const properties: Record<string, unknown> = {
    "제목": { title: [{ text: { content: title } }] },
    "직원명": { rich_text: [{ text: { content: data.employeeName } }] },
    "날짜": { date: { start: data.date } },
    "근태유형": { select: { name: data.type } },
    "사유": { rich_text: [{ text: { content: data.reason || "" } }] },
    "차감일수": { number: data.deductDays },
    "사업장": { multi_select: data.projects.map((p) => ({ name: p })) },
  };

  const page = await notion.pages.create({
    parent: { database_id: attendanceDbId },
    properties,
  } as Parameters<typeof notion.pages.create>[0]);
  return page.id;
}

export async function deleteAttendance(id: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    in_trash: true,
  } as Parameters<typeof notion.pages.update>[0]);
}
