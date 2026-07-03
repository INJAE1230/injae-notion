import { NextResponse } from "next/server";
import { getAllEmployees, getAllAttendance } from "@/lib/hr-service";
import { generateAttendanceExcel, type AttendanceExportEmployee } from "@/lib/excel-attendance";

const DEFAULT_WORK_START = "10:00";
const DEFAULT_WORK_END = "21:00";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month 파라미터가 필요합니다 (YYYY-MM)" }, { status: 400 });
    }

    const [employees, attendance] = await Promise.all([
      getAllEmployees(),
      getAllAttendance(),
    ]);

    const activeEmployees = employees.filter((e) => e.status === "재직");
    const monthAttendance = attendance.filter((a) => a.date.startsWith(month));

    const attendanceByEmployee = new Map<string, Record<string, { category: typeof monthAttendance[number]["category"]; note: string }>>();
    for (const a of monthAttendance) {
      if (!a.employeeId) continue;
      if (!attendanceByEmployee.has(a.employeeId)) {
        attendanceByEmployee.set(a.employeeId, {});
      }
      attendanceByEmployee.get(a.employeeId)![a.date] = { category: a.category, note: a.note };
    }

    const exportEmployees: AttendanceExportEmployee[] = activeEmployees.map((emp) => ({
      name: emp.name,
      department: emp.department,
      position: emp.position || "",
      restDays: emp.restDays,
      workStart: DEFAULT_WORK_START,
      workEnd: DEFAULT_WORK_END,
      dailyRecords: attendanceByEmployee.get(emp.id) || {},
    }));

    const buf = await generateAttendanceExcel(month, exportEmployees);
    const [y, m] = month.split("-");
    const filename = encodeURIComponent(`${y}년 ${parseInt(m)}월 근태현황.xlsx`);

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    console.error("엑셀 내보내기 실패:", error);
    return NextResponse.json({ error: "엑셀 생성 실패" }, { status: 500 });
  }
}
