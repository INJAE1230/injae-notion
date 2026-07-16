# 업무일지 (injae-notion) 프로젝트 컨텍스트

## 프로젝트 개요

Notion API를 백엔드로 사용하는 업무일지 관리 웹 애플리케이션.
다중 사업장(10개)을 운영하는 사용자를 위해, GTD 방법론 + 아이젠하워 매트릭스 기반으로 업무를 체계적으로 관리합니다.

- **배포 URL**: `https://injae-notion.vercel.app`
- **GitHub**: `https://github.com/INJAE1230/injae-notion.git`
- **Notion 통합명**: "청초수업무관리"

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16.2.9 (App Router, Turbopack) |
| 배포 | Vercel |
| 백엔드/DB | Notion API (@notionhq/client 5.22.0) |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| 차트 | Recharts |
| 드래그앤드롭 | @dnd-kit/core 6.3.1 |
| AI | @ai-sdk/openai (gpt-4o-mini) — 메모 파싱, 내용 다듬기 |
| 자동화 | Vercel Cron Jobs (매주 월요일 00:00 UTC) |
| 언어 | TypeScript |

### Notion SDK v5 주의사항
- `databases.query` 제거됨 → `dataSources.query` 사용
- Data Source ID는 `collection://` 형식으로 변환 필요
- 스키마 변경은 Notion MCP `notion-update-data-source` 도구로만 가능

---

## Notion 데이터베이스

### 메인 DB (업무일지)
- **Database ID**: `3819fed550b08083b363e2c07e1c6611`
- **Data Source**: `collection://3819fed5-50b0-8036-9fad-000b7af4353f`

| 속성명 | 타입 | 설명 |
|--------|------|------|
| 업무 | title | 업무 제목 |
| 날짜 | date | 업무 날짜 |
| 프로젝트 | multi_select | 사업장 (다중 선택) |
| 진행상태 | status | GTD 상태 |
| 우선순위 | select | 아이젠하워 매트릭스 |
| 업무내용 | rich_text | 상세 내용 |
| 태그 | multi_select | 업무 분류 태그 |
| 소요시간(시간) | number | 투입 시간 |
| 관련 링크 | url | 참고 URL |
| 성과/결과 | rich_text | 완료 시 성과 기록 |
| 성과등급 | select | 상/중/하 |
| 입력소스 | select | 웹/빠른메모 |
| 입력원본 | rich_text | AI 파싱 전 원본 |
| 첨부파일 | files | 첨부 파일 |

### 템플릿 DB (반복 업무)
- **Database ID**: `aba7b72286b546caadb26cc5f67caab6`
- **Data Source**: `collection://7da88dcb-3979-4f91-b1d1-299db7265e68`

| 속성명 | 타입 | 설명 |
|--------|------|------|
| 템플릿명 | title | 템플릿 이름 |
| 반복주기 | select | 매주/매월 |
| 반복일 | number | 반복 요일/날짜 |
| 반복요일목록 | rich_text | 쉼표 구분 다중 요일 |
| 기본프로젝트 | multi_select | 기본 사업장 |
| 기본상태 | select | 기본 진행상태 |
| 기본태그 | multi_select | 기본 태그 |
| 기본소요시간 | number | 기본 시간 |
| 업무내용 | rich_text | 기본 내용 |
| 활성 | checkbox | 활성 여부 |
| 자동생성 | checkbox | Cron 자동 생성 |

### 직원 마스터 DB (인사관리)
- **Database ID**: `778f3192f20c43e7a0291225b8b8add5`
- **Data Source**: `collection://dc8e47d4-eeb4-4791-abed-a85f27498dad`

| 속성명 | 타입 | 설명 |
|--------|------|------|
| 이름 | title | 직원 이름 |
| 법인 | select | 소속 법인 (9개 Entity) |
| 부서 | rich_text | 부서명 |
| 직급 | select | 사원/주임/팀장/과장/차장/대표 |
| 입사일 | date | 입사 날짜 |
| 재직상태 | select | 재직/퇴사 |
| 연차발생일수 | number | 근로기준법 60조 기준 |
| 잔여연차 | number | API에서 계산해서 PATCH 갱신 |
| 근태기록 | relation | 근태 기록 DB 양방향 연결 |

### 근태 기록 DB
- **Database ID**: `b030d94bd5d54eecb2331ecaf0bc8b30`
- **Data Source**: `collection://c79ab7ad-ff81-4a1b-82e0-202f10384f65`

| 속성명 | 타입 | 설명 |
|--------|------|------|
| 제목 | title | "직원명 - 구분" 자동 생성 |
| 직원 | relation | 직원 마스터 DB 연결 |
| 날짜 | date | 근태 날짜 |
| 구분 | select | 정상근무/연차/반차/정휴무/관공휴일/대출/출장/조퇴/결근/근로자의날 |
| 비고 | rich_text | 비고 (조퇴 시 `[연차차감]`/`[정휴무차감]` 프리픽스) |

---

## 핵심 데이터 모델

### 사업장 (Project)
```typescript
type Project = "청초수" | "씨푸드" | "JS코퍼" | "JKK" | "646미터퍼세크" | "아일랜드" | "청초수(신관)" | "에그롤린대전" | "개인일정";
```
- 다중 선택 가능 (배열)
- 기본값: `["청초수"]`
- 각 사업장별 고유 색상 지정 (`PROJECT_COLORS`)

### 법인 (Entity)
```typescript
type Entity = "청초수" | "청초수씨푸드" | "646미터퍼세크" | "아일랜드프로젝트646미터퍼세크" | "JS코퍼레이션" | "JKK인터내셔널" | "에그롤린대전" | "바비캐럿" | "이니셜뮤직코리아";
```
- `PROJECT_TO_ENTITY` 매핑으로 사업장→법인 연결
- "개인일정"은 법인 매핑 없음 (null)
- "바비캐럿", "이니셜뮤직코리아"는 현재 사업장 매핑 없음

### GTD 상태 (Status)
```typescript
type Status = "예정" | "대기중" | "언젠가" | "진행 중" | "완료";
```

### 아이젠하워 우선순위 (Priority)
```typescript
type Priority = "긴급+중요" | "중요" | "긴급" | "낮음";
```

### 태그 (Tag)
```typescript
type Tag = "회의" | "개발" | "기획" | "리뷰" | "버그" | "디자인" | "문서" | "배포" | "테스트" | "운영";
```

---

## 앱 구조 (10개 탭)

### 1. 대시보드 (`/`) — `src/app/page.tsx`
- 서버 컴포넌트, `getAllWorkLogs()` 호출
- 인사말 (KST 시간 기준), 핵심 수치 카드 4개
- 빠른 메모 (AI 파싱), 반복 업무 퀵 액션
- 마감 알림 (기한 초과/오늘 마감), 오늘의 업무 + 마감 임박
- 차트: 프로젝트별, 상태별, 우선순위+주간 업무량 (2-col)
- 최근 업무 5건

### 2. 업무 목록 (`/logs`) — `src/app/logs/page.tsx`
- 서버 컴포넌트 + Suspense 로딩
- 필터: 날짜 범위, 사업장, 상태, 우선순위, 검색(디바운스 300ms), 태그 토글
- 업무 건수 표시, CSV 다운로드
- 데스크톱: 테이블 뷰 / 모바일: 카드 뷰
- 날짜 표시: `6/21(토)` 형식

### 3. 업무 추가 (`/logs/new`) — `src/app/logs/new/page.tsx`
- URL `?date=` 파라미터로 날짜 프리셋 가능 (캘린더 연동)
- 폼 순서: 제목 → **사업장(상단)** → 날짜/상태/우선순위 → 내용 → 태그 → 시간/링크 → 파일 → 성과
- 인라인 유효성 검사 (제목 필수)
- 파일 업로드 + OCR 영수증 인식

### 4. 반복 템플릿 (`/templates`) — `src/app/templates/page.tsx`
- 템플릿 CRUD + 갤러리 (12개 프리셋)
- **활성/비활성 토글 스위치** (클릭 한 번으로 전환)
- 개별/일괄 업무 생성 (이번 주/이번 달)
- 자동 생성 (Cron)

### 5. 주간 리뷰 (`/review`) — `src/app/review/page.tsx`
- GTD 주간 리뷰 워크플로우
- 주차 네비게이션 (이전 주/다음 주)
- 섹션: 완료 업무, 미완료 점검(다음 주로/언젠가로/삭제), 대기중 점검, 언젠가 점검, 다음 주 계획
- 모바일에서 액션 버튼 세로 배치

### 6. 칸반 보드 (`/board`) — `src/app/board/page.tsx`
- 6개 GTD 상태 열, 드래그앤드롭으로 상태 변경
- **사업장 필터** 드롭다운
- 낙관적 업데이트 + 실패 시 롤백
- 모바일 터치 드래그 지원

### 7. 캘린더 (`/calendar`) — `src/app/calendar/page.tsx`
- 월간 캘린더 뷰, 날짜별 업무 표시
- 모바일: **업무 건수 숫자** + 상태 점
- 날짜 선택 시 상세 목록 + **업무 추가 버튼**
- Google Calendar 임베드

### 8. 성과 관리 (`/achievements`) — `src/app/achievements/page.tsx`
- 완료 업무 중 성과 기록이 있는 업무 목록
- 통계 카드: 성과 기록 수, 상급 성과 수, 총 투입 시간
- **필터**: 사업장, 등급(상/중/하), 기간

### 9. 보고서 (`/reports`) — `src/app/reports/page.tsx`
- 일간/주간/월간 업무 보고서 자동 생성
- 프리셋: 오늘, 이번 주, 이번 달
- **사업장별 보고서** 생성 가능
- 클립보드 복사 + .txt 다운로드

### 10. 통계 분석 (`/analytics`) — `src/app/analytics/page.tsx`
- 주간 비교 카드 (이번 주 vs 지난 주)
- **기간 필터**: 전체/이번주/이번달/최근30일 + 날짜 직접 선택
- 차트: 시간 배분(프로젝트별), 태그 분포(15색), 주간 완료율 추이, 요일별 업무량 히트맵

### 11. 법인 통합 뷰 (`/entities`) — `src/app/entities/page.tsx`
- 9개 법인 카드 그리드: 이번 달 업무량, 완료율, 진행 중 업무 수
- 카드 클릭 → 해당 법인 소속 사업장 업무 목록 드릴다운
- `getEntityStats()` (lib/stats.ts) 법인별 집계

### 12. 인사/연차 관리 (`/hr`) — `src/app/hr/page.tsx`
- **직원 관리**: Notion 직원 마스터 DB 연동 (법인/부서/직급/입사일/연차발생일수/잔여연차/재직상태)
- **근태 기록**: Notion 근태 기록 DB 연동 (구분 10종: 정상근무/연차/반차/정휴무/관공휴일/대출/출장/조퇴/결근/근로자의날)
- **연차 현황**: 잔여연차 자동 계산 (연차발생일수 - 사용량), 프로그레스바
- **조퇴 차감 로직**: 연차/정휴무 선택, 비고에 `[연차차감]`/`[정휴무차감]` 프리픽스 인코딩
- **잔여연차 자동 갱신**: 근태 생성/삭제 시 해당 직원의 잔여연차를 재계산하여 Notion PATCH
- 관공휴일/근로자의날은 차감 계산에서 제외

---

## 주요 파일 구조

```
src/
├── app/
│   ├── layout.tsx              # 레이아웃 (사이드바 + 모바일 하단 네비)
│   ├── loading.tsx             # 글로벌 로딩 스켈레톤
│   ├── page.tsx                # 대시보드
│   ├── logs/
│   │   ├── page.tsx            # 업무 목록
│   │   ├── new/page.tsx        # 업무 추가
│   │   └── [id]/
│   │       ├── page.tsx        # 업무 상세
│   │       └── edit/page.tsx   # 업무 수정
│   ├── board/page.tsx          # 칸반 보드
│   ├── calendar/page.tsx       # 캘린더
│   ├── review/page.tsx         # 주간 리뷰
│   ├── templates/page.tsx      # 반복 템플릿
│   ├── achievements/page.tsx   # 성과 관리
│   ├── reports/page.tsx        # 보고서
│   ├── analytics/page.tsx      # 통계 분석
│   └── api/
│       ├── logs/               # 업무 CRUD API
│       ├── memo/               # AI 메모 파싱 API
│       ├── reports/generate/   # 보고서 생성 API
│       ├── templates/          # 템플릿 CRUD API
│       ├── upload/             # 파일 업로드 API
│       ├── ocr/                # OCR API
│       └── cron/generate/      # 자동 생성 Cron API
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx         # 데스크톱 사이드바 + 모바일 헤더
│   │   └── mobile-bottom-nav.tsx # 모바일 하단 탭 바
│   ├── dashboard/              # 대시보드 위젯들
│   ├── logs/                   # 업무 관련 컴포넌트
│   ├── board/                  # 칸반 보드 컴포넌트
│   ├── calendar/               # 캘린더 컴포넌트
│   ├── review/                 # 주간 리뷰 컴포넌트
│   ├── templates/              # 템플릿 컴포넌트
│   ├── achievements/           # 성과 관리 컴포넌트
│   ├── analytics/              # 통계 차트 컴포넌트
│   ├── memo/                   # AI 메모 컴포넌트
│   └── ui/                     # shadcn/ui 기본 컴포넌트
├── lib/
│   ├── notion.ts               # Notion 클라이언트 설정
│   ├── notion-service.ts       # 업무 CRUD 서비스
│   ├── template-service.ts     # 템플릿 CRUD + 자동 생성
│   ├── types.ts                # TypeScript 타입 정의
│   ├── constants.ts            # 상수 (프로젝트, 상태, 색상 등)
│   ├── stats.ts                # 대시보드 통계 계산
│   ├── analytics.ts            # 통계 분석 계산
│   ├── report-generator.ts     # 보고서 텍스트 생성
│   ├── review-utils.ts         # 주간 리뷰 유틸리티
│   ├── ai-parser.ts            # AI 메모 파싱 (gpt-4o-mini)
│   ├── date-utils.ts           # KST 날짜 유틸리티
│   └── template-presets.ts     # 12개 프리셋 템플릿
└── vercel.json                 # Cron 스케줄 설정
```

---

## API 라우트

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/logs` | GET | 업무 목록 (필터 지원) |
| `/api/logs` | POST | 업무 생성 |
| `/api/logs/[id]` | GET | 업무 상세 |
| `/api/logs/[id]` | PATCH | 업무 수정 (부분 업데이트) |
| `/api/logs/[id]` | DELETE | 업무 삭제 (휴지통) |
| `/api/logs/[id]/polish` | POST | AI 내용 다듬기 |
| `/api/memo` | POST | AI 메모 파싱 |
| `/api/memo/confirm` | POST | 파싱 결과 확인 후 업무 생성 |
| `/api/templates` | GET | 템플릿 목록 |
| `/api/templates` | POST | 템플릿 생성 |
| `/api/templates/[id]` | PATCH | 템플릿 수정 |
| `/api/templates/[id]` | DELETE | 템플릿 삭제 |
| `/api/templates/generate` | POST | 템플릿 기반 업무 일괄 생성 |
| `/api/reports/generate` | POST | 보고서 생성 (사업장 필터 포함) |
| `/api/upload` | POST | 파일 업로드 |
| `/api/ocr` | POST | 영수증 OCR |
| `/api/cron/generate` | GET | 자동 생성 (Vercel Cron) |
| `/api/hr/employees` | GET, POST | 직원 목록/등록 |
| `/api/hr/employees/[id]` | PATCH, DELETE | 직원 수정/삭제 |
| `/api/hr/attendance` | GET, POST | 근태 목록/등록 (POST 시 잔여연차 재계산) |
| `/api/hr/attendance/[id]` | DELETE | 근태 삭제 (잔여연차 재계산) |

---

## 환경변수

```env
NOTION_TOKEN=                  # Notion 통합 API 키
NOTION_DATABASE_ID=            # 메인 DB ID (3819fed550b08083b363e2c07e1c6611)
NOTION_TEMPLATE_DATABASE_ID=   # 템플릿 DB ID (aba7b72286b546caadb26cc5f67caab6)
NOTION_HR_EMPLOYEE_DB_ID=      # 직원 마스터 DB ID (778f3192f20c43e7a0291225b8b8add5)
NOTION_HR_ATTENDANCE_DB_ID=    # 근태 기록 DB ID (b030d94bd5d54eecb2331ecaf0bc8b30)
OPENAI_API_KEY=                # OpenAI API 키 (gpt-4o-mini)
CRON_SECRET=                   # Vercel Cron 인증
```

---

## 최근 주요 변경 이력

| 날짜 | 커밋 | 설명 |
|------|------|------|
| 2026-06-22 | — | /hr 스키마 불일치 수정 + 휴무 차감 우선순위 로직 추가 |
| 2026-06-22 | `0b02acd` | 법인 통합 뷰 (/entities) + 사업장 이름 변경 (에이전트 삭제, 646코퍼→646미터퍼세크) |
| 2026-06-22 | `6ce6912` | 인사/연차 관리 (/hr) 최초 추가 |
| 2026-06-21 | `6ae1ae8` | 전체 탭 UI/UX 개선 21개 항목 |
| 2026-06-19 | `10c8d10` | 프로젝트(사업장) 다중 선택 기능 |
| 2026-06-19 | `e641570` | 사업장별 프로젝트 분류 추가 (10개) |
| 2026-06-19 | `83a96b8` | 템플릿 갤러리 추가 |
| 2026-06-19 | `cf4a0f2` | 반복 템플릿 기능 추가 |

### UI/UX 개선 상세 (최신)

1. 모바일 하단 네비게이션 바 (5개 탭)
2. 페이지 헤더 스타일 통일 (아이콘+제목)
3. 빈 상태 아이콘 통일 (이모지 → lucide)
4. 로딩 스켈레톤 UI
5. 대시보드 날짜 KST 수정
6. 우선순위+주간 차트 2-col 레이아웃
7. 검색 디바운스 300ms
8. 날짜 형식 개선 (`6/21(토)`)
9. 업무 건수 표시
10. 폼 사업장 위치 상단 이동
11. 인라인 유효성 검사
12. 템플릿 활성/비활성 토글 스위치
13. 주간 리뷰 페이지 제목 추가
14. 모바일 액션 버튼 레이아웃 개선
15. 칸반 보드 사업장 필터
16. 캘린더 모바일 업무 건수 표시
17. 캘린더 업무 추가 버튼
18. 성과 관리 필터 (사업장/등급/기간)
19. 보고서 사업장 필터
20. 태그 차트 색상 15개 확장
21. 통계 기간 필터

---

## 개발 시 주의사항

1. **Notion SDK v5**: `databases.query` 없음. `dataSources.query` 사용
2. **Data Source ID**: DB ID와 다름. `getDataSourceId()` / `getTemplateDataSourceId()`로 변환
3. **KST 시간**: 서버에서 날짜 관련은 반드시 `getKSTNow()` / `getKSTToday()` 사용
4. **프로젝트는 배열**: `projects: Project[]` — 단일 값이 아닌 배열로 처리
5. **Notion DB 스키마 변경**: 코드로 불가, Notion MCP 도구 사용 필요
6. **선택적 속성 fallback**: `updateWorkLog`에서 Notion에 없는 속성은 별도 try-catch 처리
7. **HR 근태 기록의 직원 필드**: relation 타입 (rich_text 아님). 생성 시 `{ relation: [{ id: employeePageId }] }` 형식
8. **잔여연차 자동 갱신**: 근태 생성/삭제 시 `recalculateLeave(employeeId)` 호출 필수
9. **조퇴 차감방식**: 비고 필드에 `[연차차감]`/`[정휴무차감]` 프리픽스로 인코딩 (DB에 별도 필드 없음)
10. **휴무 차감 제외 대상**: 관공휴일, 근로자의날은 연차 차감 계산에서 제외
