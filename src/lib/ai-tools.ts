import { tool } from "ai";
import { z } from "zod";
import { queryWorkLogs, createWorkLog, updateWorkLog } from "./notion-service";
import { getAllTracks } from "./track-service";
import { getAllEmployees, getAllAttendance } from "./hr-service";
import { getAllPayrolls } from "./payroll-service";
import { getKSTToday } from "./date-utils";
import { PROJECTS, STATUSES, PRIORITIES, TAGS } from "./constants";
import type { WorkLogFilters, WorkLogFormData } from "./types";

/**
 * AI 비서가 호출하는 도구 모음.
 *
 * 조회 도구는 기존 서비스 함수를 감싸고, 토큰을 아끼려 응답에서 꼭 필요한
 * 필드만 추려 반환한다.
 *
 * 쓰기 도구는 생성·수정까지만 제공하고 삭제는 의도적으로 넣지 않는다. 생성과
 * 수정은 앱에서 되돌릴 수 있지만 삭제는 복구 수단이 없어, 잘못된 tool 호출의
 * 피해 상한을 낮추기 위함이다.
 */

export const aiTools = {
  searchWorkLogs: tool({
    description:
      "업무일지를 조건으로 검색한다. 사용자가 명시적으로 언급한 조건만 값을 넣고, 언급하지 않은 필터는 반드시 null로 둔다. " +
      "예: '이번주 업무'는 기간만 넣고 project·status·priority·search는 null. '청초수 완료 업무'는 project·status만 넣고 나머지는 null. " +
      "search는 공백 구분 다중 키워드를 AND 매칭한다(제목·내용·입력원본·성과 대상). " +
      "키워드 검색이 0건이거나 사용자 기억이 흐릿한 찾기 질문('그때 그 업체 견적 건')이면 search를 null로 두고 넓게 조회한 뒤, 반환된 content·originalText를 직접 읽고 의미로 골라낼 것.",
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
      // 토큰 절약: 최대 80건, 긴 텍스트는 앞부분만.
      // content·originalText를 포함해야 키워드가 안 맞아도 모델이 의미로 찾을 수 있다.
      return {
        count: logs.length,
        logs: logs.slice(0, 80).map((l) => ({
          id: l.id,
          title: l.title,
          date: l.date,
          status: l.status,
          projects: l.projects,
          priority: l.priority,
          hours: l.hours,
          content: l.content ? l.content.slice(0, 80) : null,
          originalText: l.originalText ? l.originalText.slice(0, 80) : null,
        })),
        truncated: logs.length > 80,
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

  addWorkLog: tool({
    description:
      "새 업무를 등록한다. 사용자가 명시적으로 등록·추가·기록을 요청했을 때만 사용한다. " +
      "여러 건을 요청하면 건마다 한 번씩 호출한다. 등록 후에는 무엇을 등록했는지 사용자에게 요약해 알린다.",
    inputSchema: z.object({
      title: z.string().describe("업무 제목. 간결하게"),
      date: z.string().nullable().describe("날짜 (YYYY-MM-DD). 사용자가 날짜를 말하지 않았으면 null이면 오늘로 등록됨"),
      projects: z.array(z.enum(PROJECTS as [string, ...string[]])).describe("사업장. 사용자가 말하지 않았으면 빈 배열"),
      status: z.enum(STATUSES as [string, ...string[]]).nullable().describe("진행 상태. 말하지 않았으면 null(예정으로 등록)"),
      priority: z.enum(PRIORITIES as [string, ...string[]]).nullable().describe("우선순위. 말하지 않았으면 null"),
      content: z.string().nullable().describe("업무 상세 내용. 없으면 null"),
      tags: z.array(z.enum(TAGS as [string, ...string[]])).describe("태그. 없으면 빈 배열"),
      hours: z.number().nullable().describe("소요 시간(시간 단위). 없으면 null"),
    }),
    execute: async (args) => {
      const data: WorkLogFormData = {
        title: args.title,
        date: args.date || getKSTToday(),
        projects: (args.projects.length > 0 ? args.projects : ["청초수"]) as WorkLogFormData["projects"],
        status: (args.status || "예정") as WorkLogFormData["status"],
        content: args.content || "",
        tags: args.tags as WorkLogFormData["tags"],
        hours: args.hours,
        link: null,
        priority: args.priority as WorkLogFormData["priority"],
      };
      const id = await createWorkLog(data, { inputSource: "빠른메모" });
      return { ok: true, id, title: data.title, date: data.date, status: data.status };
    },
  }),

  updateWorkLogFields: tool({
    description:
      "기존 업무의 상태·우선순위·날짜·소요시간을 수정한다. 반드시 searchWorkLogs로 대상 업무의 id를 먼저 확인한 뒤 호출한다. " +
      "후보가 여러 건이면 임의로 고르지 말고 사용자에게 어느 것인지 물어본다. 삭제는 할 수 없다.",
    inputSchema: z.object({
      id: z.string().describe("수정할 업무의 id (searchWorkLogs 결과의 id)"),
      status: z.enum(STATUSES as [string, ...string[]]).nullable().describe("바꿀 진행 상태. 변경 안 하면 null"),
      priority: z.enum(PRIORITIES as [string, ...string[]]).nullable().describe("바꿀 우선순위. 변경 안 하면 null"),
      date: z.string().nullable().describe("바꿀 날짜 (YYYY-MM-DD). 변경 안 하면 null"),
      hours: z.number().nullable().describe("바꿀 소요 시간. 변경 안 하면 null"),
    }),
    execute: async (args) => {
      const patch: Partial<WorkLogFormData> = {};
      if (args.status) patch.status = args.status as WorkLogFormData["status"];
      if (args.priority) patch.priority = args.priority as WorkLogFormData["priority"];
      if (args.date) patch.date = args.date;
      if (args.hours !== null) patch.hours = args.hours;

      if (Object.keys(patch).length === 0) {
        return { ok: false, reason: "변경할 항목이 지정되지 않았습니다" };
      }

      await updateWorkLog(args.id, patch);
      return { ok: true, id: args.id, changed: patch };
    },
  }),
};
