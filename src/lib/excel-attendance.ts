import ExcelJS from "exceljs";
import type { AttendanceCategory } from "./hr-types";

const CELL_TO_CATEGORY: Record<string, AttendanceCategory | null> = {
  "정·근": null,
  "정근": null,
  "휴무": "정휴무",
  "관공": "관공휴일",
  "연차": "연차",
  "반차": "반차",
  "대출": "대출",
  "출장": "출장",
  "조퇴": "조퇴",
  "결근": "결근",
  "근로자의날": "근로자의날",
};

export interface ParsedAttendanceRow {
  name: string;
  department: string;
  position: string;
  records: { date: string; category: AttendanceCategory }[];
}

function getCellText(row: ExcelJS.Row, col: number): string {
  const cell = row.getCell(col);
  const val = cell.value;
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && "richText" in val) {
    return (val as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
  }
  return String(val).trim();
}

export function parseAttendanceExcel(buffer: ArrayBuffer, year?: number): Promise<ParsedAttendanceRow[]> {
  return parseAttendanceExcelAsync(buffer, year ?? new Date().getFullYear());
}

async function parseAttendanceExcelAsync(buffer: ArrayBuffer, year: number): Promise<ParsedAttendanceRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws = workbook.worksheets[0];
  if (!ws) return [];

  const results: ParsedAttendanceRow[] = [];
  let dateColumns: { col: number; date: string }[] = [];

  ws.eachRow((row, rowNumber) => {
    const firstCell = getCellText(row, 1);
    const secondCell = getCellText(row, 2);

    if (secondCell === "구분" || firstCell === "구분") {
      dateColumns = [];
      const startCol = firstCell === "구분" ? 8 : 9;
      for (let c = startCol; c <= row.cellCount; c++) {
        const header = getCellText(row, c);
        const match = header.match(/^(\d{1,2})\/(\d{1,2})$/);
        if (match) {
          const m = parseInt(match[1]);
          const d = parseInt(match[2]);
          if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            dateColumns.push({ col: c, date: dateStr });
          }
        }
      }
      return;
    }

    if (firstCell.includes("부") && firstCell.includes("서")) return;
    if (dateColumns.length === 0) return;

    const dept = firstCell;
    const pos = secondCell;
    const rawName = getCellText(row, 3);
    const name = rawName.replace(/\s+/g, "").replace(/\(.*\)$/, "");

    if (!name || name.length < 2) return;
    if (["구분", "부서", "부 서"].includes(dept)) return;

    const records: { date: string; category: AttendanceCategory }[] = [];
    for (const { col, date } of dateColumns) {
      const cellVal = getCellText(row, col);
      if (!cellVal) continue;
      const baseVal = cellVal.split("/")[0].split("(")[0].trim();
      const category = CELL_TO_CATEGORY[baseVal];
      if (category) {
        records.push({ date, category });
      }
    }

    if (records.length > 0 || name) {
      results.push({ name, department: dept, position: pos, records });
    }
  });

  return results;
}

export interface AttendanceExportEmployee {
  name: string;
  department: string;
  position: string;
  restDays: string[]; // 정휴무 요일 라벨 (예: ["토", "일"])
  workStart: string; // "HH:MM"
  workEnd: string; // "HH:MM"
  dailyRecords: Record<string, { category: AttendanceCategory; note: string }>;
}

// 근태현황.xlsx 원본 양식과 맞춘 휴무성 카테고리 (출근 없이 비고에 순번만 표기)
const LEAVE_CATEGORIES: AttendanceCategory[] = ["관공휴일", "정휴무", "연차", "반차", "미사용휴무"];
const LEAVE_LABELS: Record<string, string> = {
  "관공휴일": "관공휴무",
  "정휴무": "정 휴무",
  "연차": "연차",
  "반차": "반차",
  "미사용휴무": "미사용휴무",
};

function parseHHMM(v: string): [number, number] {
  const [h, m] = (v || "").split(":").map((n) => parseInt(n, 10));
  return [Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0];
}

function setWorkTime(row: ExcelJS.Row, startH: number, startM: number, endH: number, endM: number) {
  const inCell = row.getCell(6);
  inCell.value = new Date(1899, 11, 30, startH, startM);
  inCell.numFmt = "hh:mm";
  const outCell = row.getCell(9);
  outCell.value = new Date(1899, 11, 30, endH, endM);
  outCell.numFmt = "hh:mm";
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// "근태현황.xlsx" 원본 양식: 직원별 시트, 하루 1행(근무일자/출퇴근/비고), 하단 카테고리별 집계
export async function generateAttendanceExcel(
  monthStr: string,
  employees: AttendanceExportEmployee[]
): Promise<ArrayBuffer> {
  const [yearStr, monthNumStr] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const workbook = new ExcelJS.Workbook();

  for (const emp of employees) {
    const ws = workbook.addWorksheet((emp.name || "직원").slice(0, 31));

    const titleRow = ws.addRow([`${year}년 ${String(month).padStart(2, "0")}월 근태현황`]);
    ws.mergeCells(titleRow.number, 1, titleRow.number, 10);
    titleRow.font = { bold: true, size: 13 };
    titleRow.alignment = { horizontal: "center" };

    const headerRow = ws.addRow(["사용자ID", "성 명", "부 서", "직 급", "근무일자", "출 근", "외 출", "복 귀", "퇴 근", "비 고"]);
    headerRow.font = { bold: true };

    const restSet = new Set(emp.restDays);
    const [startH, startM] = parseHHMM(emp.workStart || "10:00");
    const [endH, endM] = parseHHMM(emp.workEnd || "21:00");

    let leaveSeq = 0;
    const categoryCounts: Record<string, number> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dow = new Date(year, month - 1, d).getDay();
      const dayLabel = DAY_LABELS[dow];
      const record = emp.dailyRecords[dateStr];

      const row = ws.addRow([
        "",
        d === 1 ? emp.name : "",
        d === 1 ? emp.department : "",
        d === 1 ? emp.position : "",
        null, null, null, null, null, "",
      ]);

      const dateCell = row.getCell(5);
      dateCell.value = new Date(year, month - 1, d);
      dateCell.numFmt = "yyyy-mm-dd";

      const isImplicitRest = !record && (dow === 0 || dow === 6 || restSet.has(dayLabel));

      if (record && LEAVE_CATEGORIES.includes(record.category)) {
        leaveSeq++;
        row.getCell(10).value = String(leaveSeq);
        categoryCounts[record.category] = (categoryCounts[record.category] || 0) + 1;
      } else if (isImplicitRest) {
        leaveSeq++;
        row.getCell(10).value = String(leaveSeq);
        categoryCounts["정휴무"] = (categoryCounts["정휴무"] || 0) + 1;
      } else if (record && record.category === "정상근무") {
        setWorkTime(row, startH, startM, endH, endM);
        if (record.note) row.getCell(10).value = record.note;
      } else if (record) {
        // 대출/출장/조퇴/결근/근로자의날: 정상 출퇴근이 아니므로 비고에 사유만 표기
        row.getCell(10).value = record.note || record.category;
      } else {
        setWorkTime(row, startH, startM, endH, endM);
      }
    }

    ws.addRow([]);

    const totalLeave = LEAVE_CATEGORIES.reduce((s, c) => s + (categoryCounts[c] || 0), 0);
    const summaryLines: string[] = [];
    if (totalLeave > 0) summaryLines.push(`총휴무 ${totalLeave}회`);
    for (const cat of LEAVE_CATEGORIES) {
      const count = categoryCounts[cat] || 0;
      if (count > 0) summaryLines.push(`${LEAVE_LABELS[cat]} ${count}회`);
    }
    for (const line of summaryLines) {
      const r = ws.addRow(["", "", "", "", line]);
      ws.mergeCells(r.number, 5, r.number, 7);
      r.getCell(5).alignment = { horizontal: "center" };
    }

    ws.getColumn(1).width = 10;
    ws.getColumn(2).width = 10;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 8;
    ws.getColumn(5).width = 13;
    for (let c = 6; c <= 9; c++) ws.getColumn(c).width = 9;
    ws.getColumn(10).width = 26;
  }

  return (await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}
