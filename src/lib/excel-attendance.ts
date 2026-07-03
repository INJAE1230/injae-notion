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

const CATEGORY_TO_CELL: Record<string, string> = {
  "정상근무": "정·근",
  "정휴무": "휴무",
  "관공휴일": "관공",
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

export async function generateAttendanceExcel(
  monthStr: string,
  sections: {
    entity: string;
    employees: {
      department: string;
      position: string;
      name: string;
      joinDate: string;
      annualLeaveTotal: number;
      dailyRecords: Record<string, string>;
    }[];
  }[]
): Promise<ArrayBuffer> {
  const [yearStr, monthNum] = monthStr.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthNum);
  const daysInMonth = new Date(year, month, 0).getDate();

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(`${year}년 ${String(month).padStart(2, "0")}`);

  for (const section of sections) {
    const entityRow = ws.addRow([section.entity]);
    entityRow.font = { bold: true };

    const headerCells: (string | number | null)[] = ["구분", "", "", "", "전월 이월 현황", "", "", `${month}월 발생 휴무합`];
    for (let d = 1; d <= daysInMonth; d++) {
      headerCells.push(`${month}/${d}`);
    }
    headerCells.push("휴일합");
    const hRow = ws.addRow(headerCells);
    hRow.font = { bold: true };

    ws.addRow(["부 서", "직급", "성 명", "입사일", "연차", "미*휴", "대출"]);

    for (const emp of section.employees) {
      const empCells: (string | number | null)[] = [
        emp.department,
        emp.position,
        emp.name,
        emp.joinDate,
        emp.annualLeaveTotal,
        null,
        null,
        null,
      ];

      let restCount = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const category = emp.dailyRecords[dateStr];
        if (category) {
          const cellVal = CATEGORY_TO_CELL[category] || category;
          empCells.push(cellVal);
          if (["정휴무", "관공휴일", "연차", "반차"].includes(category)) restCount++;
        } else {
          const dow = new Date(year, month - 1, d).getDay();
          if (dow === 0 || dow === 6) {
            empCells.push("휴무");
            restCount++;
          } else {
            empCells.push("정·근");
          }
        }
      }
      empCells[7] = restCount;
      empCells.push(restCount);
      ws.addRow(empCells);
    }

    ws.addRow([]);
  }

  return await workbook.xlsx.writeBuffer() as unknown as ArrayBuffer;
}
