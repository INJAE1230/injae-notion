import { notion } from "./notion";
import { queryAllPages, type NotionPage } from "./notion-helpers";
import { ENTITIES } from "./constants";
import type { Entity } from "./constants";
import type {
  Employee,
  EmployeeFormData,
  AttendanceRecord,
  AttendanceFormData,
  EmploymentStatus,
  Position,
  AttendanceCategory,
} from "./hr-types";
import { parseDeductionMethod, encodeDeductionMethod, calculateRemainingLeave, calculateRemainingUnusedRest, calcLegalLeave } from "./leave-utils";

function getEmployeeDbId(): string {
  const id = process.env.NOTION_HR_EMPLOYEE_DB_ID;
  if (!id) throw new Error("NOTION_HR_EMPLOYEE_DB_ID 환경변수가 설정되지 않았습니다.");
  return id;
}

function getAttendanceDbId(): string {
  const id = process.env.NOTION_HR_ATTENDANCE_DB_ID;
  if (!id) throw new Error("NOTION_HR_ATTENDANCE_DB_ID 환경변수가 설정되지 않았습니다.");
  return id;
}

const VALID_ENTITIES = new Set(ENTITIES);

function mapEmployee(page: NotionPage): Employee {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const titleArr = p["이름"]?.title as { plain_text: string }[] | undefined;
  const entityObj = p["법인"]?.select as { name: string } | null | undefined;
  const deptText = p["부서"]?.rich_text as { plain_text: string }[] | undefined;
  const positionObj = p["직급"]?.select as { name: string } | null | undefined;
  const dateObj = p["입사일"]?.date as { start: string } | null | undefined;
  const statusObj = p["재직상태"]?.select as { name: string } | null | undefined;
  const leaveTotal = p["연차발생일수"]?.number as number | null | undefined;
  const leaveRemain = p["잔여연차"]?.number as number | null | undefined;
  const unusedRestTotalNum = p["미사용휴무발생"]?.number as number | null | undefined;
  const unusedRestRemainNum = p["잔여미사용휴무"]?.number as number | null | undefined;
  const restDaysText = p["정휴무요일"]?.rich_text as { plain_text: string }[] | undefined;

  const entityName = entityObj?.name;
  const restDaysStr = restDaysText?.[0]?.plain_text || "";
  const restDays = restDaysStr
    ? restDaysStr.split(/[,\s·\/]+/).map((s) => s.trim().replace(/요일$/, "")).filter(Boolean)
    : [];

  return {
    id: page.id,
    name: titleArr?.[0]?.plain_text || "",
    entity: (entityName && VALID_ENTITIES.has(entityName as Entity)) ? entityName as Entity : null,
    department: deptText?.[0]?.plain_text || "",
    position: (positionObj?.name as Position) || null,
    joinDate: dateObj?.start || "",
    status: (statusObj?.name as EmploymentStatus) || "재직",
    annualLeaveTotal: leaveTotal ?? 15,
    remainingLeave: leaveRemain ?? 0,
    unusedRestTotal: unusedRestTotalNum ?? 0,
    remainingUnusedRest: unusedRestRemainNum ?? 0,
    restDays,
  };
}

function mapAttendance(page: NotionPage): AttendanceRecord {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const titleArr = p["제목"]?.title as { plain_text: string }[] | undefined;
  const empRelation = p["직원"]?.relation as { id: string }[] | undefined;
  const dateObj = p["날짜"]?.date as { start: string } | null | undefined;
  const categoryObj = p["구분"]?.select as { name: string } | null | undefined;
  const noteText = p["비고"]?.rich_text as { plain_text: string }[] | undefined;

  const note = noteText?.[0]?.plain_text || "";
  const category = (categoryObj?.name as AttendanceCategory) || "정상근무";

  return {
    id: page.id,
    title: titleArr?.[0]?.plain_text || "",
    employeeId: empRelation?.[0]?.id || null,
    date: dateObj?.start || "",
    category,
    note,
    deductionMethod: category === "조퇴" ? parseDeductionMethod(note) : undefined,
  };
}

// ── Employee CRUD ──

export async function getAllEmployees(): Promise<Employee[]> {
  const pages = await queryAllPages(getEmployeeDbId(), [{ property: "이름", direction: "ascending" }]);
  return pages.map(mapEmployee);
}

export async function createEmployee(data: EmployeeFormData): Promise<string> {
  const properties: Record<string, unknown> = {
    "이름": { title: [{ text: { content: data.name } }] },
    "입사일": { date: { start: data.joinDate } },
    "재직상태": { select: { name: data.status } },
    "연차발생일수": { number: data.annualLeaveTotal },
    "잔여연차": { number: data.annualLeaveTotal },
    "미사용휴무발생": { number: data.unusedRestTotal },
    "잔여미사용휴무": { number: data.unusedRestTotal },
  };

  if (data.entity) properties["법인"] = { select: { name: data.entity } };
  if (data.department) properties["부서"] = { rich_text: [{ text: { content: data.department } }] };
  if (data.position) properties["직급"] = { select: { name: data.position } };
  if (data.restDays?.length) properties["정휴무요일"] = { rich_text: [{ text: { content: data.restDays.join(",") } }] };

  const page = await notion.pages.create({
    parent: { database_id: getEmployeeDbId() },
    properties,
  } as Parameters<typeof notion.pages.create>[0]);
  return page.id;
}

export async function updateEmployee(id: string, data: Partial<EmployeeFormData>): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (data.name !== undefined) properties["이름"] = { title: [{ text: { content: data.name } }] };
  if (data.entity !== undefined) properties["법인"] = data.entity ? { select: { name: data.entity } } : { select: null };
  if (data.department !== undefined) properties["부서"] = { rich_text: [{ text: { content: data.department } }] };
  if (data.position !== undefined) properties["직급"] = data.position ? { select: { name: data.position } } : { select: null };
  if (data.joinDate !== undefined) properties["입사일"] = { date: { start: data.joinDate } };
  if (data.status !== undefined) properties["재직상태"] = { select: { name: data.status } };
  if (data.annualLeaveTotal !== undefined) properties["연차발생일수"] = { number: data.annualLeaveTotal };
  if (data.unusedRestTotal !== undefined) properties["미사용휴무발생"] = { number: data.unusedRestTotal };
  if (data.restDays !== undefined) properties["정휴무요일"] = { rich_text: [{ text: { content: data.restDays.join(",") } }] };

  await notion.pages.update({
    page_id: id,
    properties,
  } as Parameters<typeof notion.pages.update>[0]);
}

export async function patchRemainingLeave(employeeId: string, remainingLeave: number): Promise<void> {
  await notion.pages.update({
    page_id: employeeId,
    properties: { "잔여연차": { number: remainingLeave } },
  } as Parameters<typeof notion.pages.update>[0]);
}

export async function patchRemainingUnusedRest(employeeId: string, remainingUnusedRest: number): Promise<void> {
  await notion.pages.update({
    page_id: employeeId,
    properties: { "잔여미사용휴무": { number: remainingUnusedRest } },
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
  const pages = await queryAllPages(getAttendanceDbId(), [{ property: "날짜", direction: "descending" }]);
  return pages.map(mapAttendance);
}

export async function createAttendance(data: AttendanceFormData, employeeName: string): Promise<string> {
  const title = `${employeeName} - ${data.category}`;
  const note = data.category === "조퇴" && data.deductionMethod
    ? encodeDeductionMethod(data.deductionMethod, data.note)
    : data.note;

  const properties: Record<string, unknown> = {
    "제목": { title: [{ text: { content: title } }] },
    "직원": { relation: [{ id: data.employeeId }] },
    "날짜": { date: { start: data.date } },
    "구분": { select: { name: data.category } },
    "비고": { rich_text: [{ text: { content: note || "" } }] },
  };

  const page = await notion.pages.create({
    parent: { database_id: getAttendanceDbId() },
    properties,
  } as Parameters<typeof notion.pages.create>[0]);
  return page.id;
}

export async function updateAttendance(id: string, data: AttendanceFormData, employeeName: string): Promise<void> {
  const title = `${employeeName} - ${data.category}`;
  const note = data.category === "조퇴" && data.deductionMethod
    ? encodeDeductionMethod(data.deductionMethod, data.note)
    : data.note;

  const properties: Record<string, unknown> = {
    "제목": { title: [{ text: { content: title } }] },
    "직원": { relation: [{ id: data.employeeId }] },
    "날짜": { date: { start: data.date } },
    "구분": { select: { name: data.category } },
    "비고": { rich_text: [{ text: { content: note || "" } }] },
  };

  await notion.pages.update({
    page_id: id,
    properties,
  } as Parameters<typeof notion.pages.update>[0]);
}

export async function deleteAttendance(id: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    in_trash: true,
  } as Parameters<typeof notion.pages.update>[0]);
}

// ── Bulk attendance creation ──

export async function createAttendanceBulk(
  records: { employeeId: string; employeeName: string; date: string; category: string }[]
): Promise<number> {
  const BATCH_SIZE = 10;
  let created = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (rec) => {
        const title = `${rec.employeeName} - ${rec.category}`;
        const properties: Record<string, unknown> = {
          "제목": { title: [{ text: { content: title } }] },
          "직원": { relation: [{ id: rec.employeeId }] },
          "날짜": { date: { start: rec.date } },
          "구분": { select: { name: rec.category } },
          "비고": { rich_text: [{ text: { content: "" } }] },
        };
        await notion.pages.create({
          parent: { database_id: getAttendanceDbId() },
          properties,
        } as Parameters<typeof notion.pages.create>[0]);
        created++;
      })
    );
  }
  return created;
}

// ── Leave recalculation ──

export async function recalculateLeave(employeeId: string): Promise<number> {
  const [employees, allAttendance] = await Promise.all([
    getAllEmployees(),
    getAllAttendance(),
  ]);

  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) throw new Error("직원을 찾을 수 없습니다");

  const empRecords = allAttendance.filter((a) => a.employeeId === employeeId);
  const remaining = calculateRemainingLeave(emp.annualLeaveTotal, empRecords);
  const remainingUnusedRest = calculateRemainingUnusedRest(emp.unusedRestTotal, empRecords);

  await Promise.all([
    patchRemainingLeave(employeeId, remaining),
    patchRemainingUnusedRest(employeeId, remainingUnusedRest),
  ]);
  return remaining;
}

// 입사 1년 미만 직원의 연차발생일수를 매달 자동 갱신 (근로기준법 60조 2항 — 개근 개월당 1일, 최대 11일)
// 수동으로 더 높게 조정해둔 값은 덮어쓰지 않도록 계산값이 더 큰 경우에만 갱신
export async function recalcJuniorEmployeeLeave(): Promise<
  { id: string; name: string; from: number; to: number }[]
> {
  const employees = await getAllEmployees();
  const now = new Date();
  const updated: { id: string; name: string; from: number; to: number }[] = [];

  for (const emp of employees) {
    if (emp.status !== "재직" || !emp.joinDate) continue;
    const years = (now.getTime() - new Date(emp.joinDate + "T00:00:00").getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (years >= 1) continue;

    const legal = calcLegalLeave(emp.joinDate, now);
    if (legal > emp.annualLeaveTotal) {
      await updateEmployee(emp.id, { annualLeaveTotal: legal });
      await recalculateLeave(emp.id);
      updated.push({ id: emp.id, name: emp.name, from: emp.annualLeaveTotal, to: legal });
    }
  }

  return updated;
}
