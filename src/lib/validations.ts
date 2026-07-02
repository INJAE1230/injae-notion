import { z } from "zod";

const projects = ["청초수", "씨푸드", "JS코퍼", "JKK", "646미터퍼세크", "아일랜드", "청초수(신관)", "에그롤린대전", "개인일정"] as const;
const statuses = ["예정", "대기중", "언젠가", "진행 중", "완료"] as const;
const priorities = ["긴급+중요", "중요", "긴급", "낮음"] as const;
const tags = ["회의", "개발", "기획", "리뷰", "버그"] as const;
const ratings = ["상", "중", "하"] as const;

const fileAttachment = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
});

export const workLogFormSchema = z.object({
  title: z.string().min(1, "업무 제목은 필수입니다"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  projects: z.array(z.enum(projects)).min(1),
  status: z.enum(statuses),
  content: z.string(),
  tags: z.array(z.enum(tags)),
  hours: z.number().min(0).nullable(),
  link: z.string().nullable(),
  priority: z.enum(priorities).nullable().optional(),
  outcome: z.string().nullable().optional(),
  rating: z.enum(ratings).nullable().optional(),
  attachments: z.array(fileAttachment).optional(),
  appendTo: z.string().nullable().optional(),
  trackId: z.string().nullable().optional(),
});

export const workLogPatchSchema = workLogFormSchema.partial();

const trackStatuses = ["계획", "진행중", "완료", "보류"] as const;

export const trackFormSchema = z.object({
  title: z.string().min(1, "트랙명은 필수입니다"),
  entity: z.string().nullable(),
  startDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  status: z.enum(trackStatuses),
  description: z.string().nullable(),
});

export const trackPatchSchema = trackFormSchema.partial();

const frequencies = ["매주", "매월", "매분기"] as const;

export const templateFormSchema = z.object({
  name: z.string().min(1, "템플릿명은 필수입니다"),
  frequency: z.enum(frequencies),
  dayValues: z.array(z.number()),
  defaultProjects: z.array(z.enum(projects)),
  defaultStatus: z.enum(statuses),
  defaultTags: z.array(z.enum(tags)),
  defaultHours: z.number().nullable(),
  content: z.string(),
  active: z.boolean(),
  autoGenerate: z.boolean(),
});

export const templatePatchSchema = templateFormSchema.partial();

export const payrollFormSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "월 형식이 올바르지 않습니다"),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  basePay: z.number(),
  overtimePay: z.number(),
  overtimeHours: z.number(),
  holidayPay: z.number(),
  nightPay: z.number(),
  annualLeavePay: z.number(),
  positionPay: z.number(),
  mealAllowance: z.number(),
  vehicleAllowance: z.number(),
  otherPay: z.number(),
  incomeTax: z.number(),
  residentTax: z.number(),
  healthInsurance: z.number(),
  longTermCare: z.number(),
  nationalPension: z.number(),
  employmentInsurance: z.number(),
  yearEndSettlement: z.number(),
  otherDeduction: z.number(),
  totalWorkHours: z.number(),
  workDays: z.number(),
  hourlyWage: z.number(),
  note: z.string(),
});

const employmentStatuses = ["재직", "퇴사"] as const;
const positions = ["사원", "주임", "팀장", "과장", "차장", "대표"] as const;
const entities = ["청초수", "청초수씨푸드", "646미터퍼세크", "아일랜드프로젝트646미터퍼세크", "JS코퍼레이션", "JKK인터내셔널", "에그롤린대전", "바비캐럿", "이니셜뮤직코리아"] as const;

export const employeeFormSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  entity: z.enum(entities).nullable(),
  department: z.string(),
  position: z.enum(positions).nullable(),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(employmentStatuses),
  annualLeaveTotal: z.number().min(0),
  restDays: z.array(z.string()),
});

export const employeePatchSchema = employeeFormSchema.partial();

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const msg = result.error.issues.map((i) => i.message).join(", ");
  return { success: false, error: msg };
}
