import { getAllEmployees, getAllAttendance } from "@/lib/hr-service";
import { HrDashboard } from "@/components/hr/hr-dashboard";

export const dynamic = "force-dynamic";

export default async function HrPage() {
  try {
    const [employees, attendance] = await Promise.all([
      getAllEmployees(),
      getAllAttendance(),
    ]);

    return <HrDashboard initialEmployees={employees} initialAttendance={attendance} />;
  } catch (error) {
    console.error("HR 페이지 로드 실패:", error);
    const message = error instanceof Error ? error.message : String(error);
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-xl font-bold text-red-500">HR 페이지 로드 실패</h1>
        <pre className="text-sm bg-accent p-4 rounded-md overflow-auto whitespace-pre-wrap">{message}</pre>
        <p className="text-sm text-muted-foreground">
          Notion DB 연결을 확인하세요. 환경변수(NOTION_HR_EMPLOYEE_DB_ID, NOTION_HR_ATTENDANCE_DB_ID)가 올바른지,
          Notion 통합에 해당 DB 접근 권한이 있는지 확인해주세요.
        </p>
      </div>
    );
  }
}
