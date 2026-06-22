import type { Project } from "./types";

export type EmploymentStatus = "재직" | "퇴직" | "휴직";
export type Position = "사원" | "주임" | "대리" | "과장" | "차장" | "부장" | "이사" | "대표";
export type AttendanceType = "연차" | "반차(오전)" | "반차(오후)" | "병가" | "경조사" | "무급휴가" | "출장" | "재택근무";

export interface Employee {
  id: string;
  name: string;
  projects: Project[];
  position: Position | null;
  joinDate: string;
  phone: string;
  annualLeave: number;
  status: EmploymentStatus;
  memo: string;
}

export interface EmployeeFormData {
  name: string;
  projects: Project[];
  position: Position | null;
  joinDate: string;
  phone: string;
  annualLeave: number;
  status: EmploymentStatus;
  memo: string;
}

export interface AttendanceRecord {
  id: string;
  employeeName: string;
  date: string;
  type: AttendanceType;
  reason: string;
  deductDays: number;
  projects: Project[];
}

export interface AttendanceFormData {
  employeeName: string;
  date: string;
  type: AttendanceType;
  reason: string;
  deductDays: number;
  projects: Project[];
}

export interface LeaveBalance {
  employeeName: string;
  totalLeave: number;
  usedLeave: number;
  remainingLeave: number;
  projects: Project[];
  position: Position | null;
}

export const POSITIONS: Position[] = ["사원", "주임", "대리", "과장", "차장", "부장", "이사", "대표"];
export const EMPLOYMENT_STATUSES: EmploymentStatus[] = ["재직", "퇴직", "휴직"];
export const ATTENDANCE_TYPES: AttendanceType[] = ["연차", "반차(오전)", "반차(오후)", "병가", "경조사", "무급휴가", "출장", "재택근무"];

export const ATTENDANCE_DEDUCT_DAYS: Record<AttendanceType, number> = {
  "연차": 1,
  "반차(오전)": 0.5,
  "반차(오후)": 0.5,
  "병가": 0,
  "경조사": 0,
  "무급휴가": 0,
  "출장": 0,
  "재택근무": 0,
};

export const ATTENDANCE_TYPE_COLORS: Record<AttendanceType, string> = {
  "연차": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "반차(오전)": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "반차(오후)": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "병가": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "경조사": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "무급휴가": "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
  "출장": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "재택근무": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export const EMPLOYMENT_STATUS_COLORS: Record<EmploymentStatus, string> = {
  "재직": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "퇴직": "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
  "휴직": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};
