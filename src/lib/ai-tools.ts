import { tool } from "ai";
import { z } from "zod";
import { queryWorkLogs } from "./notion-service";
import { getAllTracks } from "./track-service";
import { getAllEmployees, getAllAttendance } from "./hr-service";
import { getAllPayrolls } from "./payroll-service";
import { PROJECTS, STATUSES, PRIORITIES } from "./constants";
import type { WorkLogFilters } from "./types";

/**
 * AI 비서가 호출하는 조회 전용 도구 모음.
 *
 * 모두 읽기 전용이다 — AI가 데이터를 생성·수정·삭제하지 않는다. 잘못된 tool
 * 호출이 데이터를 망가뜨릴 수 없어야 하기 때문. 각 도구는 기존 서비스 함수를
 * 감싸고, 토큰을 아끼려 응답에서 꼭 필요한 필드만 추려 반환한다.
 */

export const aiTools = {
  searchWorkLogs: tool({
    description:
      "업무일지를 조건으로 검색한다. 사용자가 명시적으로 언급한 조건만 값을 넣고, 언급하지 않은 필터는 반드시 null로 둔다. " +
      "예: '이번주 업무'는 기간만 넣고 project·status·priority·search는 null. '청초수 완료 업무'는 project·status만 넣고 나머지는 null.",
    inputSchema: z.object({
      project: z.enum(PROJECTS as [string, ...string[]]).nullable().describe("사업장. 사용자가 특정 사업장을 말했을 때만 값, 아니면 null"),
      status: z.enum(STATUSES as [string, ...string[]]).nullable().describe("진행 상태. 사용자가 상태를 말했을 때만 값, 아니면 null"),
      priority: z.enum(PRIORITIES as [string, ...string[]]).nullable().describe("우선순위. 사용자가 우선순위를 말했을 때만 값, 아니면 null"),
      dateFrom: z.string().nullable().describe("시작일 (YYYY-MM-DD). 기간 조건일 때만, 아니면 null"),
      dateTo: z.string().nullable().describe("종료일 (YYYY-MM-DD). 기간 조건일 때만, 아니면 null"),
      search: z.string().nullable().describe("제목·내용 키워드. 키워드 검색일 때만, 아니면 null"),
    }),
    execute: async (args) => {
      const filters: WorkLogFilters = {};
      if (args.project) filters.project = args.project as WorkLogFilters["project"];
      if (args.status) filters.status = args.status as WorkLogFilters["status"];
      if (args.priority) filters.priority = args.priority as WorkLogFilters["priority"];
      if (args.dateFrom) filters.dateFrom = args.dateFrom;
      if (args.dateTo) filters.dateTo = args.dateTo;
      if (args.search) filters.search = args.search;

      const logs = await queryWorkLogs(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      // 토큰 절약: 최대 40건, 필드 축약
      return {
        count: logs.length,
        logs: logs.slice(0, 40).map((l) => ({
          id: l.id,
          title: l.title,
          date: l.date,
          status: l.status,
          projects: l.projects,
          priority: l.priority,
          hours: l.hours,
        })),
        truncated: logs.length > 40,
      };
    },
  }),

  getTracks: tool({
    description:
      "진행 중인 트랙(장기 프로젝트) 목록을 가져온다. '진행 중인 트랙', '일본 법인 트랙 상태' 같은 질문에 사용.",
    inputSchema: z.object({}),
    execute: async () => {
      const tracks = await getAllTracks();
      return {
        count: tracks.length,
        tracks: tracks.map((t) => ({
          id: t.id,
          title: t.title,
          entity: t.entity,
          status: t.status,
          startDate: t.startDate,
          targetDate: t.targetDate,
        })),
      };
    },
  }),

  getLeaveStatus: tool({
    description:
      "직원의 연차·미사용휴무 잔여 현황을 가져온다. '내 연차 며칠 남았어', '미사용휴무 잔액' 같은 질문에 사용.",
    inputSchema: z.object({}),
    execute: async () => {
      const employees = await getAllEmployees();
      return {
        employees: employees.map((e) => ({
          name: e.name,
          status: e.status,
          joinDate: e.joinDate,
          annualLeaveTotal: e.annualLeaveTotal,
          remainingLeave: e.remainingLeave,
          unusedRestTotal: e.unusedRestTotal,
          remainingUnusedRest: e.remainingUnusedRest,
        })),
      };
    },
  }),

  getAttendance: tool({
    description:
      "근태 기록을 가져온다. 기간을 지정하면 그 범위만 반환. '이번달 근태', '지난주 휴무' 같은 질문에 사용.",
    inputSchema: z.object({
      dateFrom: z.string().nullable().describe("시작일 (YYYY-MM-DD). 기간 조건일 때만, 아니면 null"),
      dateTo: z.string().nullable().describe("종료일 (YYYY-MM-DD). 기간 조건일 때만, 아니면 null"),
    }),
    execute: async (args) => {
      const [records, employees] = await Promise.all([
        getAllAttendance(),
        getAllEmployees(),
      ]);
      const nameById = new Map(employees.map((e) => [e.id, e.name]));

      let filtered = records;
      if (args.dateFrom) filtered = filtered.filter((r) => r.date >= args.dateFrom!);
      if (args.dateTo) filtered = filtered.filter((r) => r.date <= args.dateTo!);

      return {
        count: filtered.length,
        records: filtered.slice(0, 60).map((r) => ({
          date: r.date,
          employee: r.employeeId ? nameById.get(r.employeeId) ?? null : null,
          category: r.category,
          note: r.note,
        })),
        truncated: filtered.length > 60,
      };
    },
  }),

  getPayrolls: tool({
    description:
      "급여 명세 요약을 가져온다. 월별 실수령액·지급액·공제 합계. '지난달 실수령액', '올해 급여 추이' 같은 질문에 사용.",
    inputSchema: z.object({
      month: z.string().nullable().describe("특정 월 (YYYY-MM). 특정 월을 물었을 때만, 아니면 null(전체)"),
    }),
    execute: async (args) => {
      const payrolls = await getAllPayrolls();
      const filtered = args.month
        ? payrolls.filter((p) => p.month === args.month)
        : payrolls;
      return {
        count: filtered.length,
        payrolls: filtered.map((p) => ({
          month: p.month,
          totalPay: p.totalPay,
          totalDeduction: p.totalDeduction,
          netPay: p.netPay,
          overtimeHours: p.overtimeHours,
        })),
      };
    },
  }),
};
