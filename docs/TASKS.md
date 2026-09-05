# TASKS — +1

## 0. 문서 목적

이 문서는 프로젝트의 **현재 작업 위치를 한눈에 확인하기 위한 현황판**이다.

역할:

```text
PLAN.md
→ 앞으로 해야 할 전체 작업과 순서

TASKS.md
→ 지금 하는 작업 / 완료한 작업 / Blocker / 바로 다음 작업
```

미래의 모든 Task를 이 문서에 복사하지 않는다.

상태 표기:

- `[ ]` 시작 전
- `[-]` 진행 중
- `[x]` 완료
- `[!]` Blocked

---

# 1. 현재 상태

**현재 단계:** 모집 상태 실제 Supabase 연결 완료 → 판매 신청 연결 전

**현재 Task:** LINK-2 — 판매 신청을 실제 Supabase와 연결하기 `[ ]`

**한 줄 요약:** 판매자와 Admin의 모집 상태는 실제 Supabase를 사용한다. 판매 신청·관리자 신청 데이터·실험 현황은 다음 연결 작업에서 전환한다.

**완료된 것:**

- 판매자 화면과 관리자 화면 구현
- Supabase DB/RPC/RLS/Storage 구현
- 관리자 Auth 계정 방식 구현
- non-production Supabase에서 Backend 테스트 56개 전부 통과

**남은 것:**

- 판매 신청이 실제 Supabase에 저장되도록 연결
- 관리자 화면이 실제 신청 데이터를 읽고 처리하도록 연결
- 실험 현황이 실제 DB 데이터를 보여주도록 연결
- 실제 연결 후 전체 화면을 다시 검증

**사용자님이 할 일:** 현재 없음.

**제가 할 일:** 위 순서대로 실제 연결을 진행하고, 각 단계마다 테스트와 화면 검증을 실행한다.

---

# 2. 현재 작업

## BE-1 — Local Supabase + Integration Harness (Docker 미사용 — 사용자 결정) `[x]`

- [x] Docker/Podman 미사용 확정 (사용자 결정) → B안(전용 non-production 테스트 프로젝트)로 진행
- [x] Supabase CLI 확인 — `node_modules` 내 CLI v2.116.0 (`./node_modules/.bin/supabase`), `config.toml` 존재
- [x] migration 디렉터리 확인 — 001~004 + 신규 2개, 정렬 순서 정상 (001→004 → 2026...)
- [x] `jest.integration.config.cjs` 확인 — `tests/integration/**/*.test.js` 전용 config, 5 suites 존재
- [x] harness 요구 환경변수 확인 — `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY|PUBLISHABLE_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY|SECRET_KEY`, `SUPABASE_TEST_PROJECT=non-production`
- [x] 설정 템플릿 작성 — `.env.test.example` (로컬 전용, Git 미추적)
- [x] `.env.test.local` 구성 — 사용자가 non-production 프로젝트 생성 후 4개 값 입력 완료 (2026-09-05)
- [x] harness 파서 보강 — 따옴표로 감싼 .env 값 허용하도록 `tests/integration/supabase/clients.js` 최소 수정
  - 이후 `npm run test:integration`이 env 오류 없이 실제 프로젝트에 연결됨을 확인 (실패 원인이 env → 미적용 schema로 변경)
  - Unit Test 회귀 없음 (245 PASS)
- [x] migration 적용 — Supabase SQL Editor로 최종 7-arg `create_sale_request` 스크립트와 `20260905053440_registration_method_support.sql` 실행
- [x] 테스트 프로젝트 스키마/권한 drift 보정 — 모집 상태 소문자 계약, `update_recruitment_status`, 민감 테이블/RPC anon 접근 차단
- [x] `npm run test:integration` PASS — 5 suites / 25 tests

→ Docker 없이 전용 non-production Supabase와 SQL Editor 수동 적용으로 BE-1 검증 완료

## BE-2 — Core Schema + recruitment_settings `[x]`

- [x] sellers / sale_requests / stored_items 핵심 제약과 FK 실제 검증
- [x] StoredItem 결과 보조 필드 불변 제약 RED → migration → GREEN
- [x] recruitment_settings singleton / status / 초기 `open` 실제 검증
- [x] 관련 전체 Supabase 통합 테스트 PASS — 6 suites / 34 tests
- [x] `npm test` PASS — 31 suites / 245 tests
- [x] `npm run build` PASS

## BE-3 — RLS + Public Recruitment Read `[x]`

- [x] 실패 테스트 작성 — `get_recruitment_status()` 공개 read RPC
- [x] 의도한 권한 오류 확인
- [x] 최소 migration 구현 — `20260905095112_public_recruitment_read.sql`
- [x] anon 공개 RPC read PASS 및 recruitment table 직접 read/CRUD 차단
- [x] 관련 전체 integration test PASS — 8 suites / 52 tests

## BE-4 — create_sale_request Transaction `[x]`

- [x] open 정상 생성 / 동일 Seller 재사용 / 다중 item 검증
- [x] invalid StoredItem rollback 검증
- [x] paused / closed / 설정 row 누락 fail-closed 검증

## BE-5 — Private Storage `[x]`

- [x] sale-evidence private bucket 및 anonymous upload 정책 검증
- [x] anon read/update/list/delete 비노출·비삭제 검증
- [x] purchase-evidence anon upload 차단 및 service-role signed URL 검증
- [x] 최소 보강 migration — `20260905095606_storage_access_hardening.sql`

## BE-6 — Admin DB Functions `[x]`

- [x] start_contact 단방향 전이 및 finalized StoredItem 재처리 차단
- [x] 자동 `completed` 전이와 구매/거절 필수 필드 검증
- [x] `get_experiment_metrics()` seeded delta / 개인정보 제외 검증
- [x] 최소 보강 migration — `20260905095835_admin_state_guards.sql`, `20260905100119_experiment_metrics.sql`

## BE-7 — Admin Auth 전환 (2026-09-05) `[x]`

- [x] 기존 공유 `ADMIN_SECRET` 방식 폐기 방향을 문서에 반영
- [x] Supabase Auth access token / 단일 `ADMIN_USER_ID` 검증으로 Edge Function 전환
- [x] `admin-api` `verify_jwt=true` 재배포 — `ACTIVE`, version 3
- [x] no token / invalid token HTTP 검증 및 Auth CORS 확인 — 3 tests PASS
- [x] service_role / Admin credential 브라우저 bundle 비노출 확인
- [x] 허용된 Admin Auth 계정 token 및 주요 action HTTP 검증 — `getRecruitmentStatus` 200
- [x] 유효한 non-admin Auth user의 403 HTTP 검증 — 임시 계정으로 403 확인 후 삭제
- [x] Unit Test PASS — 32 suites / 246 tests
- [x] 관련 Integration Test 회귀 PASS — 9 suites / 56 tests PASS
- [x] Production Build PASS

## BE-8 — Backend Integration Suite (2026-09-05) `[x]`

- [x] Schema Constraint / RLS / Seller reuse / Transaction rollback 검증
- [x] recruitment open allow 및 paused/closed block 검증
- [x] Storage policy / contact / purchase / reject / auto completed 검증
- [x] recruitment update / experiment metrics 검증
- [x] Admin Auth no token / invalid token / non-admin / admin token 검증
- [x] 원격 non-production 전체 Integration Test PASS — 9 suites / 56 tests
- [x] Phase 2 Backend Gate 통과

## LINK-1 — 모집 상태 실제 Supabase 연결 (2026-09-05) `[x]`

- [x] 판매자 `getRecruitmentStatus()` → 공개 `get_recruitment_status()` RPC 연결
- [x] Admin `getRecruitmentStatus()` / `updateRecruitmentStatus()` → Auth `admin-api` Edge Function 연결
- [x] Admin API 계약에 모집 상태 조회를 추가하고 fixture/화면 호출 경로 통일
- [x] VITE Supabase 설정이 있을 때 실제 adapter를 주입하고, 미설정 로컬에서는 기존 fixture 유지
- [x] adapter Unit Test PASS — 34 suites / 253 tests
- [x] 원격 non-production adapter 검증 PASS — 10 suites / 58 tests
- [x] Production Build PASS

---

# 3. 현재 Blocker

없음. 다음 작업은 판매 신청 실제 연결이다.

---

# 4. 완료된 작업

## 2026-09-05 (테스트 코드 한글 설명 보강)

- [x] 현재 작성된 테스트 파일 41개에 관련 작업·작성 이유·확인 내용을 쉬운 한글 주석으로 추가
- [x] 통합 테스트 연결 도우미와 공통 테스트 설정의 역할 설명 추가
- [x] 단위·서비스·React 테스트 PASS — 32 suites / 246 tests
- [x] non-production Supabase 통합 테스트 PASS — 9 suites / 56 tests
- [x] 설명 주석 누락 파일 확인 — 41개 전체 확인

## 2026-09-05 (BE-1)

- [x] 전용 non-production Supabase 프로젝트 연결 확인 (`SUPABASE_TEST_PROJECT=non-production`)
- [x] SQL Editor에서 최종 7-arg `create_sale_request` 스크립트 실행
- [x] `20260905053440_registration_method_support.sql` 실행
- [x] 기존 테스트 프로젝트의 스키마/권한 drift를 데이터 삭제 없이 현재 계약에 맞게 보정
- [x] 실제 Supabase 통합 테스트 통과 — 5 suites / 25 tests
- [x] `process_stored_item`의 단일 item 자동 `completed` 규칙을 보존하고, `contacting` 분기는 두 번째 pending item fixture로 검증

## 2026-09-05 (BE-2)

- [x] `sellers` / `sale_requests` / `stored_items` 핵심 제약과 FK 실제 검증
- [x] `stored_items` 결과 보조 필드 불변 제약 migration 추가 — `20260905094606_stored_item_result_invariant.sql`
- [x] `recruitment_settings` singleton / status / 초기 `open` 실제 검증
- [x] RED → GREEN 및 관련 전체 통합 테스트 PASS — 6 suites / 34 tests
- [x] Unit Test PASS — 31 suites / 245 tests
- [x] Production Build PASS

## 2026-09-05 (BE-3)

- [x] `get_recruitment_status()` anon-only public read RPC 추가 — `20260905095112_public_recruitment_read.sql`
- [x] anon/authenticated의 민감 테이블 직접 권한 및 기존 recruitment read/update policy 제거
- [x] 공개 RPC 성공, 직접 read/CRUD 차단 실제 검증
- [x] 관련 전체 통합 테스트 PASS — 8 suites / 52 tests

## 2026-09-05 (BE-4~6)

- [x] `create_sale_request` transaction rollback 및 recruitment fail-closed 검증
- [x] private Storage 정책과 signed URL 검증 — `20260905095606_storage_access_hardening.sql`
- [x] Admin 상태 전이 불변성/자동 completed 구현 — `20260905095835_admin_state_guards.sql`
- [x] 실험 현황 DB 집계 구현 — `20260905100119_experiment_metrics.sql`
- [x] 관련 전체 통합 테스트 PASS — 8 suites / 52 tests
- [x] Unit Test PASS — 31 suites / 245 tests
- [x] Production Build PASS

## 2026-09-05 (BE-7)

- [x] Supabase Auth 관리자 계정의 access token 및 `ADMIN_USER_ID` 검증
- [x] no token / invalid token / non-admin token 차단 — 401/403 HTTP 확인
- [x] 허용된 관리자 token의 주요 action 성공 — `getRecruitmentStatus` 200
- [x] 전체 Integration Test PASS — 9 suites / 56 tests
- [x] Unit Test PASS — 32 suites / 246 tests
- [x] Production Build PASS

## 2026-09-05 (LINK-1)

- [x] 판매자 모집 상태를 공개 RPC로 연결
- [x] Admin 모집 상태 조회·변경을 Auth Edge Function으로 연결
- [x] 실제 non-production Supabase에서 paused / closed / open 상태 반영 확인
- [x] Unit Test PASS — 34 suites / 253 tests
- [x] 원격 Integration Test PASS — 10 suites / 58 tests
- [x] Production Build PASS

## 2026-09-05 (FE-11)

- [x] Color/Typography/Radius token이 DESIGN §2와 일치하는지 코드 대조 검증
- [x] Button/Input/Card/Badge/Selection/Upload/Dialog 기존 컴포넌트 재사용 확인
- [x] 모바일 하단 CTA sticky, 판매 폼 560px, Admin 720px desktop layout 확인
- [x] 모집/실험 화면의 기존 Admin 스타일 재사용 확인 (새 Design System 생성 없음)
- [x] 375/768/1280px 수동 확인 (사용자 확인 완료)
- [x] **Phase 1 Gate 통과** — `npm test`(245 PASS), `npm run build`(PASS), fixture flow 수동 확인
- 코드 수정 0건 (기존 구현이 기준 충족)

## 2026-09-05 (FE-10)

- [x] `getExperimentMetrics` Admin API contract 추가 (7종)
- [x] fixture `getExperimentMetrics` 집계 구현
  - 요약: 전체 신청/고유 판매자/구매 상품/완료 신청
  - 분석: 희망금액 분포, 희망가격 비율 구간(5구간), 편의점/행사/상태/상품 결과별 집계, 재신청 판매자
  - 현재 모집 상태 포함, 개인정보/증빙 path 미포함 테스트 검증
- [x] `/admin/experiment` 페이지 구현 (summary cards / analysis cards / empty state / error state / loading)
- [x] Admin 상단 navigation에 `실험 현황` 추가
- [x] 관련 전체 Unit Test PASS (31 suites / 245 tests)
- [x] Production Build PASS

## 2026-09-05 (문서)

- [x] Admin `모집 관리` 요구사항 확정
- [x] 모집 상태 `open / paused / closed` 확정
- [x] `create_sale_request`가 `open`에서만 성공하도록 Backend 강제 규칙 확정
- [x] Admin `실험 현황`을 MVP 범위에 다시 포함
- [x] 실험 현황을 범용 Dashboard와 구분
- [x] 실험 현황 핵심 지표 재정의
- [x] `무상 양도(0원)` 지표 제외 — 가격 양의 정수 규칙과 충돌
- [x] `등록 방식별 신청 수` 제외 — 현재 데이터 모델에 필드 없음
- [x] PRD 최신 기준 재작성
- [x] DESIGN 최신 기준 재작성
- [x] ARCHITECTURE 최신 기준 재작성
- [x] TESTING 최신 기준 재작성
- [x] PLAN을 FE → BE → LINK → VERIFY 기준으로 재작성

## 2026-09-04

- [x] Seller / SaleRequest / StoredItem 핵심 데이터 모델 확정
- [x] 5단계 판매자 Flow 확정
- [x] JavaScript + React + Vite + Supabase + Jest 기술 방향 확정
- [x] 모바일 퍼스트 +1 디자인 방향 확정

---

# 5. 다음 작업

```text
1. 판매 신청 연결 — 이미지 업로드 / 신청 저장
2. 관리자 기능 연결 — 목록 / 상세 / 연락 시작 / 구매 / 거절
3. 실험 현황 연결 — 실제 DB 집계 표시
4. 전체 화면 검증 — 실제 Supabase에서 판매자·관리자 흐름 확인
```

---

# 6. 갱신 규칙

Task 시작:

```text
현재 Task → 해당 Task
상태 → [-]
```

Task 완료:

```text
완료된 작업에 날짜와 함께 기록
```

환경 문제:

```text
현재 Blocker에 실제 오류 기록
완료 [x] 처리 금지
```

비즈니스 규칙 변경은 TASKS에서 결정하지 않는다.

상위 문서를 먼저 수정한다.
