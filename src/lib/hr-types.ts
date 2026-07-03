import type { Entity } from "./constants";

export type EmploymentStatus = "재직" | "퇴사";
export type Position = "사원" | "주임" | "팀장" | "과장" | "차장" | "대표";
export type AttendanceCategory =
  | "정상근무" | "연차" | "반차" | "정휴무" | "관공휴일"
  | "대출" | "출장" | "조퇴" | "결근" | "근로자의날" | "미사용휴무";
export type DeductionMethod = "연차" | "정휴무";

export interface Employee {
  id: string;
  name: string;
  entity: Entity | null;
  department: string;
  position: Position | null;
  joinDate: string;
  status: EmploymentStatus;
  annualLeaveTotal: number;
  remainingLeave: number;
  unusedRestTotal: number;
  remainingUnusedRest: number;
  restDays: string[];
}

export interface EmployeeFormData {
  name: string;
  entity: Entity | null;
  department: string;
  position: Position | null;
  joinDate: string;
  status: EmploymentStatus;
  annualLeaveTotal: number;
  unusedRestTotal: number;
  restDays: string[];
}

export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export interface AttendanceRecord {
  id: string;
  title: string;
  employeeId: string | null;
  date: string;
  category: AttendanceCategory;
  note: string;
  deductionMethod?: DeductionMethod;
}

export interface AttendanceFormData {
  employeeId: string;
  date: string;
  category: AttendanceCategory;
  note: string;
  deductionMethod?: DeductionMethod;
}

export interface LeaveBalance {
  employee: Employee;
  usedLeave: number;
  remainingLeave: number;
  usedUnusedRest: number;
  remainingUnusedRest: number;
}

export const POSITIONS: Position[] = ["사원", "주임", "팀장", "과장", "차장", "대표"];
export const EMPLOYMENT_STATUSES: EmploymentStatus[] = ["재직", "퇴사"];
export const ATTENDANCE_CATEGORIES: AttendanceCategory[] = [
  "정상근무", "연차", "반차", "정휴무", "관공휴일",
  "대출", "출장", "조퇴", "결근", "근로자의날", "미사용휴무",
];

export const ATTENDANCE_CATEGORY_COLORS: Record<AttendanceCategory, string> = {
  "정상근무": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "연차": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "반차": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "정휴무": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "관공휴일": "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
  "대출": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "출장": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "조퇴": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "결근": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "근로자의날": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "미사용휴무": "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300",
};

export const EMPLOYMENT_STATUS_COLORS: Record<EmploymentStatus, string> = {
  "재직": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "퇴사": "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
};
