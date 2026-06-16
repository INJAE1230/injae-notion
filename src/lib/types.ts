export type Project = "내부" | "클라이언트" | "개인";
export type Status = "예정" | "진행 중" | "완료";
export type Tag = "회의" | "개발" | "기획" | "리뷰" | "버그";

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
}

export interface DashboardStats {
  totalLogs: number;
  totalHours: number;
  byProject: Record<Project, number>;
  byStatus: Record<Status, number>;
  byTag: Record<Tag, number>;
  weeklyVolume: { week: string; count: number; hours: number }[];
}
