import type { Frequency, PresetCategory, Priority, Project, Status, Tag, AchievementRating, InputSource, TrackStatus } from "./types";

export const PROJECTS: Project[] = ["청초수", "씨푸드", "JS코퍼", "JKK", "646미터퍼세크", "아일랜드", "청초수(신관)", "에그롤린대전", "개인일정"];

export const PROJECT_TO_ENTITY: Record<Project, string | null> = {
  "청초수": "청초수",
  "청초수(신관)": "청초수",
  "씨푸드": "청초수씨푸드",
  "646미터퍼세크": "646미터퍼세크",
  "아일랜드": "아일랜드프로젝트646미터퍼세크",
  "JS코퍼": "JS코퍼레이션",
  "JKK": "JKK인터내셔널",
  "에그롤린대전": "에그롤린대전",
  "개인일정": null,
};

export const ENTITIES = [
  "청초수",
  "청초수씨푸드",
  "646미터퍼세크",
  "아일랜드프로젝트646미터퍼세크",
  "JS코퍼레이션",
  "JKK인터내셔널",
  "에그롤린대전",
  "바비캐럿",
  "이니셜뮤직코리아",
] as const;

export type Entity = (typeof ENTITIES)[number];
export const STATUSES: Status[] = ["진행 중", "대기중", "예정", "언젠가", "완료"];
export const PRIORITIES: Priority[] = ["긴급+중요", "중요", "긴급", "낮음"];
export const TAGS: Tag[] = ["회의", "개발", "기획", "리뷰", "버그"];
export const ACHIEVEMENT_RATINGS: AchievementRating[] = ["상", "중", "하"];
export const INPUT_SOURCES: InputSource[] = ["웹", "카카오톡", "슬랙", "빠른메모"];

export const STATUS_COLORS: Record<Status, string> = {
  "대기중": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "언젠가": "bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400",
  "예정": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "진행 중": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "완료": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  "긴급+중요": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "중요": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "긴급": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "낮음": "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  "긴급+중요": "Q1: 즉시 실행",
  "중요": "Q2: 계획 수립",
  "긴급": "Q3: 위임 가능",
  "낮음": "Q4: 제거 검토",
};

export const PROJECT_COLORS: Record<Project, string> = {
  "청초수": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "씨푸드": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "JS코퍼": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "JKK": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "646미터퍼세크": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "아일랜드": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "청초수(신관)": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "에그롤린대전": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "개인일정": "bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400",
};

export const TAG_COLORS: Record<Tag, string> = {
  "회의": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "개발": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "기획": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "리뷰": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "버그": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export const TRACK_STATUSES: TrackStatus[] = ["계획", "진행중", "완료", "보류"];

export const TRACK_STATUS_COLORS: Record<TrackStatus, string> = {
  "계획": "bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400",
  "진행중": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "완료": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "보류": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export const FREQUENCIES: Frequency[] = ["매일", "매주", "격주", "매월", "매월N번째요일", "매분기", "반기", "매년"];

export const PRESET_CATEGORIES: PresetCategory[] = ["정기 보고", "정산/회계", "회의", "관리 업무"];

// 메모/카톡 파싱 기준 길이(글자 수).
// - 이 값 이상이면 클라이언트에서 그룹 파싱 모드로 전환
// - 서버에서 비그룹 파싱 시 이 크기 단위로 청크 분할
export const MEMO_CHUNK_SIZE = 6000;

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: "일요일",
  1: "월요일",
  2: "화요일",
  3: "수요일",
  4: "목요일",
  5: "금요일",
  6: "토요일",
};
