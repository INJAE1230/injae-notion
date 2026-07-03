import type { AttendanceRecord, DeductionMethod } from "./hr-types";

const DEDUCTION_PREFIX_ANNUAL = "[연차차감]";
const DEDUCTION_PREFIX_REGULAR = "[정휴무차감]";

export function parseDeductionMethod(note: string): DeductionMethod | undefined {
  if (note.startsWith(DEDUCTION_PREFIX_ANNUAL)) return "연차";
  if (note.startsWith(DEDUCTION_PREFIX_REGULAR)) return "정휴무";
  return undefined;
}

export function encodeDeductionMethod(method: DeductionMethod, note: string): string {
  const prefix = method === "연차" ? DEDUCTION_PREFIX_ANNUAL : DEDUCTION_PREFIX_REGULAR;
  return `${prefix} ${note}`.trim();
}

export function stripDeductionPrefix(note: string): string {
  return note.replace(/^\[(연차|정휴무)차감\]\s*/, "");
}

export function calculateUsedLeave(records: AttendanceRecord[]): number {
  let used = 0;
  for (const r of records) {
    switch (r.category) {
      case "연차":
        used += 1;
        break;
      case "반차":
        used += 0.5;
        break;
      case "조퇴": {
        const method = r.deductionMethod || parseDeductionMethod(r.note);
        if (method === "연차") used += 0.5;
        break;
      }
      // 관공휴일, 근로자의날, 정상근무, 정휴무, 대출, 출장, 결근 → 연차 차감 없음
    }
  }
  return used;
}

export function calculateRemainingLeave(annualLeaveTotal: number, records: AttendanceRecord[]): number {
  return annualLeaveTotal - calculateUsedLeave(records);
}

export function calculateUsedUnusedRest(records: AttendanceRecord[]): number {
  return records.filter((r) => r.category === "미사용휴무").length;
}

export function calculateRemainingUnusedRest(unusedRestTotal: number, records: AttendanceRecord[]): number {
  return unusedRestTotal - calculateUsedUnusedRest(records);
}

export function isEarlyLeavePayDeductible(deductionMethod: DeductionMethod | undefined): boolean {
  return deductionMethod === "연차" || deductionMethod === "정휴무";
}

// 입사일부터 기준일까지 개근한 만 개월 수 (해당 일자가 안 지났으면 그 달은 미포함)
export function monthsElapsed(joinDate: string, asOf: Date = new Date()): number {
  const join = new Date(joinDate + "T00:00:00");
  let months = (asOf.getFullYear() - join.getFullYear()) * 12 + (asOf.getMonth() - join.getMonth());
  if (asOf.getDate() < join.getDate()) months--;
  return Math.max(0, months);
}

// 근로기준법 60조 기준 법정 연차 발생일수
export function calcLegalLeave(joinDate: string, asOf: Date = new Date()): number {
  if (!joinDate) return 15;
  const join = new Date(joinDate + "T00:00:00");
  const years = (asOf.getTime() - join.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  // 1년 미만: 개근한 달마다 1일씩, 최대 11일
  if (years < 1) return Math.min(monthsElapsed(joinDate, asOf), 11);
  if (years < 3) return 15;
  return Math.min(15 + Math.floor((years - 1) / 2), 25);
}
