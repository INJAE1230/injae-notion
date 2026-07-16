# 로드맵

2026-07-16 전체 프로젝트 감사(11개 카테고리 점검) 결과로 도출된 로드맵. 단기/중기/장기
18개 항목 전부 완료되어 이 문서는 완료 이력으로 남긴다. 각 항목의 커밋 해시로 상세 변경
내용을 확인할 수 있다.

## 단기 (1주 이내) — 완료 (`d3eafd0`)

- [x] middleware에 `/api/cron/leave-recalc` 인증 예외 추가 — 누락으로 연차 자동 재계산이
      프로덕션에서 전혀 실행되지 않던 버그
- [x] `templateFormSchema` frequency enum을 8종으로 확장 — 3종만 허용해 5종은 저장 시
      400 에러가 나던 버그
- [x] `memo/confirm`에 zod 검증 추가, `payrollFormSchema` 금액 필드에 `min(0)` 추가
- [x] `next` 16.2.9 → 16.2.10 패치 업그레이드
- [x] 죽은 코드 정리 (`header.tsx`, `index.js` 삭제, `template-service.ts` import 정리)
- [x] 메모 파싱 입력 길이 상한(10만자) 추가
- [x] Vercel 프로덕션 환경변수 확인 — 필요한 값 전부 존재 확인, `BULK_DELETE_PASSWORD`는
      이미 없어 조치 불요

## 중기 (1개월 이내) — 완료 (`1688ec1`)

- [x] 캘린더 등 KST 관련 UTC 버그 수정 (`todayStr`, 업무 등록 기본 날짜, CSV 파일명,
      영수증 OCR 날짜 — 총 4곳)
- [x] 사이드바 로그아웃 버튼 추가 (쿠키 파기 경로가 없었음)
- [x] 급여명세서 OCR: Blob에 영구 저장하지 않고 파일을 직접 인식으로 전환
- [x] 문서 갱신 (`PROJECT_CONTEXT.md`의 폐지된 "다음행동" 상태값, `CLAUDE.md` 모델명)
- [x] 트랙/로그 삭제 시 Blob 첨부 정리 + 임의 URL 삭제 방지
- [x] 로그인 rate limit (IP당 10분 5회) + 타이밍 안전 비교
- [x] 월 1회 Notion 전체 백업 크론 — Blob 스토어가 public 전용이라 내용을
      AES-256-GCM으로 암호화해 저장, 데이터 소스별 실패 격리, 최근 12개 보관

## 장기 (그 이후) — 완료 (`733d56c`, `e57840f`)

- [x] payroll/track 대형 컴포넌트 분해 (payroll 1694→1172줄, track 1059→933줄 + 목적별
      파일 분리). hr-dashboard(798줄)는 이득 대비 응집도 저하 우려로 보류
- [x] 대시보드 쿼리 슬림화 — `hideTrackLinked`를 전체 fetch 후 JS 필터에서 Notion
      `relation is_empty` 서버 필터로 전환. 나머지 최적화(기간 필터 등)는 데이터가
      500건을 넘을 때 착수 (현재 49건으로 시기상조)
- [x] 카톡 그룹 파싱 맵-리듀스 재설계 — 청크 단위 MAP(상세 추출) 후 REDUCE(그룹
      배정만 LLM, 실제 병합은 코드)로 전환. 실측으로 유실 디테일 복구 확인
- [x] injae-ops(Supabase) 이관 여부 — **보류로 판단**. 이 앱 HR은 본인 전용, injae-ops는
      타 직원용으로 대상이 겹치지 않아 지금 이관할 이유 없음. 재검토 트리거: 이 앱으로
      본인 외 직원을 관리하게 되거나, injae-ops가 이 앱의 기능(OCR·미사용휴무 등)을
      중복 구현해야 할 때
