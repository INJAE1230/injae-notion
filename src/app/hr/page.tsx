import { getAllEmployees, getAllAttendance } from "@/lib/hr-service";
import { HrDashboard } from "@/components/hr/hr-dashboard";

export const dynamic = "force-dynamic";

export default async function HrPage() {
  const [employees, attendance] = await Promise.all([
    getAllEmployees(),
    getAllAttendance(),
  ]);

  return <HrDashboard initialEmployees={employees} initialAttendance={attendance} />;
}
