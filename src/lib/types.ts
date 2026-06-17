export type Project = "업무" | "개인일정";
export type Status = "예정" | "진행 중" | "완료";
export type Tag = "회의" | "개발" | "기획" | "리뷰" | "버그";
export type AchievementRating = "상" | "중" | "하";
export type InputSource = "웹" | "카카오톡" | "슬랙" | "빠른메모";

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
  outcome: string | null;
  rating: AchievementRating | null;
  inputSource: InputSource | null;
  originalText: string | null;
}

export interface WorkLogFilters {
  dateFrom?: string;
  dateTo?: string;
  project?: Project;
  status?: Status;
  tags?: Tag[];
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
  outcome?: string | null;
  rating?: AchievementRating | null;
}

export interface DashboardStats {
  totalLogs: number;
  totalHours: number;
  byProject: Record<Project, number>;
  byStatus: Record<Status, number>;
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
