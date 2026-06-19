import type { Frequency, PresetCategory, Project, Status, Tag, AchievementRating, InputSource } from "./types";

export const PROJECTS: Project[] = ["업무", "개인일정"];
export const STATUSES: Status[] = ["예정", "진행 중", "완료"];
export const TAGS: Tag[] = ["회의", "개발", "기획", "리뷰", "버그"];
export const ACHIEVEMENT_RATINGS: AchievementRating[] = ["상", "중", "하"];
export const INPUT_SOURCES: InputSource[] = ["웹", "카카오톡", "슬랙", "빠른메모"];

export const STATUS_COLORS: Record<Status, string> = {
  "예정": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "진행 중": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "완료": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export const PROJECT_COLORS: Record<Project, string> = {
  "업무": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "개인일정": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
};

export const TAG_COLORS: Record<Tag, string> = {
  "회의": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "개발": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "기획": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "리뷰": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "버그": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export const FREQUENCIES: Frequency[] = ["매주", "매월"];

export const PRESET_CATEGORIES: PresetCategory[] = ["정기 보고", "정산/회계", "회의", "관리 업무"];

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: "일요일",
  1: "월요일",
  2: "화요일",
  3: "수요일",
  4: "목요일",
  5: "금요일",
  6: "토요일",
};
