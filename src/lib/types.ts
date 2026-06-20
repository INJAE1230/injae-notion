export type Frequency = "매주" | "매월";
export type PresetCategory = "정기 보고" | "정산/회계" | "회의" | "관리 업무";
export type Project = "업무" | "개인일정";
export type Status = "예정" | "다음행동" | "대기중" | "언젠가" | "진행 중" | "완료";
export type Priority = "긴급+중요" | "중요" | "긴급" | "낮음";
export type Tag = "회의" | "개발" | "기획" | "리뷰" | "버그";
export type AchievementRating = "상" | "중" | "하";
export type InputSource = "웹" | "카카오톡" | "슬랙" | "빠른메모";

export interface FileAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface WorkLog {
  id: string;
  title: string;
  date: string;
  project: Project;
  status: Status;
  content: string;
  tags: Tag[];
  hours: number | null;
  link: string | null;
  priority: Priority | null;
  outcome: string | null;
  rating: AchievementRating | null;
  inputSource: InputSource | null;
  originalText: string | null;
  attachments: FileAttachment[];
}

export interface WorkLogFilters {
  dateFrom?: string;
  dateTo?: string;
  project?: Project;
  status?: Status;
  tags?: Tag[];
  priority?: Priority;
  search?: string;
}

export interface WorkLogFormData {
  title: string;
  date: string;
  project: Project;
  status: Status;
  content: string;
  tags: Tag[];
  hours: number | null;
  link: string | null;
  priority?: Priority | null;
  outcome?: string | null;
  rating?: AchievementRating | null;
  attachments?: FileAttachment[];
  appendTo?: string | null;
}

export interface DashboardStats {
  totalLogs: number;
  totalHours: number;
  byProject: Record<Project, number>;
  byStatus: Record<Status, number>;
  byPriority: Record<Priority, number>;
  byTag: Record<Tag, number>;
  weeklyVolume: { week: string; count: number; hours: number }[];
}

export interface MemoParseRequest {
  text: string;
  source?: InputSource;
}

export interface MemoParseResponse {
  entries: WorkLogFormData[];
  originalText: string;
}

export type ReportType = "daily" | "weekly" | "monthly";

export interface ReportRequest {
  type: ReportType;
  dateFrom: string;
  dateTo: string;
}

export interface GeneratedReport {
  title: string;
  content: string;
  period: { from: string; to: string };
  stats: { totalLogs: number; totalHours: number; completionRate: number };
}

export interface TimeAllocation {
  project: Project;
  hours: number;
  percentage: number;
}

export interface CompletionTrend {
  period: string;
  total: number;
  completed: number;
  rate: number;
}

export interface ProductivityPattern {
  dayOfWeek: number;
  dayName: string;
  count: number;
  hours: number;
}

export interface RecurringTemplate {
  id: string;
  name: string;
  frequency: Frequency;
  dayValue: number;
  defaultProject: Project;
  defaultStatus: Status;
  defaultTags: Tag[];
  defaultHours: number | null;
  content: string;
  active: boolean;
}

export interface TemplatePreset {
  id: string;
  category: PresetCategory;
  name: string;
  description: string;
  frequency: Frequency;
  dayValue: number;
  defaultProject: Project;
  defaultStatus: Status;
  defaultTags: Tag[];
  defaultHours: number | null;
  content: string;
}

export interface RecurringTemplateFormData {
  name: string;
  frequency: Frequency;
  dayValue: number;
  defaultProject: Project;
  defaultStatus: Status;
  defaultTags: Tag[];
  defaultHours: number | null;
  content: string;
  active: boolean;
}
