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

**현재 단계:** Phase 4 완료 — Vercel Production 운영 확인 완료

**현재 Task:** 없음. 새 버그 또는 기능 요청이 들어올 때만 작업한다.

**한 줄 요약:** Seller와 Admin 신청·처리·모집·실험 현황을 기존 Supabase에 연결했고, Vercel Production의 `/admin`에서 실제 신청 목록을 확인했다.

**완료된 것:**

- 판매자 화면과 관리자 화면 구현
- Supabase DB/RPC/RLS/Storage 구현
- 관리자 Auth 계정 방식 구현
- 등록 방식 조건부 7인자 `create_sale_request` 원격 적용 및 판매 신청 실제 연결
- Admin 신청 목록/상세·signed URL·연락·구매·거절 실제 연결
- Admin Auth gate/login·실험 현황·모집 상태 실제 연결
- Phase 3 Gate 실제 end-to-end 검증 및 non-production 데이터 정리
- Phase 4 `VERIFY-HARD` / `VERIFY-SCOPE` 검증
- Vercel Production 환경 변수와 실제 `/admin` 운영 화면 확인

**남은 것:** 없음.

새 버그 또는 기능 요청이 생길 때만 현재 상태를 다시 확인한다.

**다음 작업:** 없음.

---

# 2. 현재 작업

## BE-1 — Local Supabase + Integration Harness (Docker 미사용 — 사용자 결정) `[x]`

- [x] Docker/Podman 미사용 확정 (사용자 결정) → B안(전용 non-production 테스트 프로젝트)로 진행
- [x] Supabase CLI 확인 — `node_modules` 내 CLI v2.116.0 (`./node_modules/.bin/supabase`), `config.toml` 존재
- [x] migration 디렉터리 확인 — 001~004 + 날짜 기반 전진 migration, 정렬 순서 정상
- [x] `jest.integration.config.cjs` 확인 — `tests/integration/**/*.test.js` 전용 config, 현재 12 suites
- [x] harness 요구 환경변수 확인 — `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY|PUBLISHABLE_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY|SECRET_KEY`, `SUPABASE_TEST_PROJECT=non-production`
- [x] 설정 템플릿 작성 — `.env.test.example` (로컬 전용, Git 미추적)
- [x] `.env.test.local` 구성 — 사용자가 non-production 프로젝트 생성 후 4개 값 입력 완료 (2026-09-05)
- [x] harness 파서 보강 — 따옴표로 감싼 .env 값 허용하도록 `tests/integration/supabase/clients.js` 최소 수정
  - 이후 `npm run test:integration`이 env 오류 없이 실제 프로젝트에 연결됨을 확인 (실패 원인이 env → 미적용 schema로 변경)
  - Unit Test 회귀 없음 (245 PASS)
- [x] `20260905130051_restore_required_sale_request_contract.sql` 원격 적용 확인 및 당시 6인자 계약 통합 검증
- [x] 테스트 프로젝트 스키마/권한 drift 보정 — 모집 상태 소문자 계약, `update_recruitment_status`, 민감 테이블/RPC anon 접근 차단
- [x] 과거 계약 기준 `npm run test:integration` PASS — 5 suites / 25 tests

→ Docker 없이 전용 non-production Supabase와 원격 migration 적용으로 BE-1 harness 검증 완료

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
- [x] 과거 계약 기준 원격 non-production 전체 Integration Test PASS — 9 suites / 56 tests
- [x] 등록 방식 조건부 7인자 계약으로 원격 Backend 전체 재검증 — 11 suites / 65 tests PASS
- [x] Phase 2 Backend Gate 통과

## LINK-1 — 모집 상태 실제 Supabase 연결 (2026-09-05) `[x]`

- [x] 판매자 `getRecruitmentStatus()` → 공개 `get_recruitment_status()` RPC 연결
- [x] Admin `getRecruitmentStatus()` / `updateRecruitmentStatus()` → Auth `admin-api` Edge Function 연결
- [x] Admin API 계약에 모집 상태 조회를 추가하고 fixture/화면 호출 경로 통일
- [x] VITE Supabase 설정이 있을 때 실제 adapter를 주입하고, 미설정 로컬에서는 기존 fixture 유지
- [x] adapter Unit Test PASS — 34 suites / 243 tests
- [x] migration 적용 전 원격 non-production adapter 검증 PASS — 10 suites / 58 tests
- [x] 계약 교정 후 원격 integration 재검증 PASS
- [x] Production Build PASS

## 2026-09-05 (판매 신청 계약 교정)

- [x] PRD/DESIGN 기준 판매 신청 계약으로 Seller UI 통일
- [x] 등록 방식 분기 제거 및 상품명·양의 정수 가격·보관 증빙 필수화, 유효기간 선택 입력
- [x] fixture와 도메인 테스트를 현재 계약으로 교정 — 34 suites / 243 tests PASS
- [x] 유효기간 미입력 상태에서 보관 증빙 입력 단계로 이동하는 것을 실제 브라우저에서 확인
- [x] 6-arg RPC와 기존 원격 데이터 보존용 `NOT VALID` 제약 migration 추가 (유효기간 선택)
- [x] `20260905130051_restore_required_sale_request_contract.sql` 원격 적용 및 당시 계약 integration 재검증

## 2026-09-06 (판매자 흐름 3단계 복원)

- [x] 1단계 판매 조건, 2단계 상품·보관 증빙, 3단계 연락처·신청으로 Seller UI 축약
- [x] 유효기간 선택 입력을 유지하면서 2단계 증빙 필수 검증 연결
- [x] 3단계 직접 신청 CTA와 중복 제출 방지 동작 확인
- [x] 전체 Unit Test 및 Production Build 재검증 — 34 suites / 243 tests PASS
- [x] 실제 브라우저에서 3단계 이동·신청 CTA 확인 — 완료 화면까지 PASS

## 2026-09-06 (2단계 등록 방식 분기 복원)

- [x] 2단계에서 `스크린샷으로 등록`과 `직접 입력하기` 중 하나를 선택하도록 복원
- [x] 스크린샷 방식은 상품명·행사 당시 가격 없이 이미지와 판매 희망 가격만 입력
- [x] 직접 입력 방식은 상품 정보만 입력하고 이미지 업로드 없이 진행
- [x] 방식별 Domain validation / payload / fixture 제출 분기 추가
- [x] 관리자 상세에서 등록 방식과 스크린샷 등록 상품을 구분해 표시
- [x] 관련 Unit/React Test — 7 suites / 75 tests PASS
- [x] 등록 방식 조건부 7인자 RPC migration 적용 및 실제 Supabase 재검증

## LINK-2 — 판매 신청 실제 Supabase 연결 (2026-09-06) `[x]`

- [x] `20260905231609_registration_method_submission_contract.sql` 전진 migration 추가·원격 non-production 적용
- [x] 직접 입력은 증빙 없이 구조화 상품을 저장하고, 스크린샷은 증빙·희망 가격만 저장하도록 RPC/제약 교정
- [x] `sale-evidence` private bucket 업로드 adapter와 7인자 RPC adapter 연결
- [x] validation/upload/RPC 실패 분기와 모집 상태 재검증 경로 유지
- [x] RED 확인 — 원격 7인자 호출 `PGRST202`, 실제 adapter 모듈 없음
- [x] Unit/React Test PASS — 35 suites / 259 tests
- [x] non-production Supabase Integration Test PASS — 11 suites / 65 tests
- [x] Production Build PASS
- [x] 실제 브라우저 스크린샷 등록 → Storage upload → RPC → `/sell/complete` 확인
- [x] 브라우저/통합 테스트 신청·Seller·Storage 데이터 정리 및 모집 상태 `open` 복원

## LINK-3 — Admin 신청 실제 Supabase 연결 (2026-09-06) `[x]`

- [x] Admin 목록/상세/연락 시작/구매/거절 adapter를 Auth `admin-api` Edge Function에 연결
- [x] 판매 증빙과 구매 증빙을 private bucket signed URL로만 Admin 화면에 전달
- [x] 구매 증빙은 multipart `admin-api` 업로드 후 `process_stored_item` RPC로 처리
- [x] 마지막 상품 처리 후 `completed` 상태가 Admin 상세에 반영되는 실제 흐름 검증
- [x] Admin 목록 조회 실패를 빈 목록으로 위장하지 않고 안전한 오류 상태로 표시
- [x] Unit/React Test PASS — 39 suites / 270 tests

## LINK-4 — Experiment Metrics 실제 Supabase 연결 (2026-09-06) `[x]`

- [x] `/admin/experiment`를 Auth `admin-api`의 `getExperimentMetrics` 응답에 연결
- [x] 모집 상태·요약·가격/비율/편의점/행사/상태/결과 집계와 empty/error 분기 확인
- [x] metrics 응답에 연락처·증빙 path가 포함되지 않는 실제 응답 검증

## LINK-5 — Error/Secret/Build Safety (2026-09-06) `[x]`

- [x] duplicate submit/upload/RPC/Edge/Auth 실패 시 성공 화면·가짜 0 데이터로 전환하지 않는 경로 확인
- [x] `/admin/login` Auth gate와 실패 시 원본 Auth 오류 비노출 구현
- [x] browser bundle에서 `service_role`·Admin credential 검색 결과 없음
- [x] `.env.test.local` Git 미추적 및 `git diff --check` 통과
- [x] Admin Edge Function CORS 보강 후 non-production version 6 / `verify_jwt=true` 재배포
- [x] Production Build PASS — 119 modules

### Phase 3 Gate (2026-09-06) `[x]`

- [x] 실제 non-production 통합 Gate PASS — 12 suites / 66 tests
- [x] `open → Seller 제출 → Admin 목록/상세 → 연락 시작 → 구매/거절 → 자동 completed` PASS
- [x] Admin 모집 상태 `paused/closed`에서 Seller 신규 제출이 Backend RPC에서 차단됨을 확인
- [x] 실험 현황 집계가 새 신청/구매/완료 상태를 반영함을 확인
- [x] 실제 브라우저에서 Admin Auth → 목록/상세/signed evidence/연락/실험 현황/paused 차단 UI 확인
- [x] 검증용 SaleRequest·Seller·Storage 정리 및 모집 상태 `open` 복원 확인

---

# 3. 현재 Blocker

- 없음.

---

# 4. 완료된 작업

## 2026-09-06 (Vercel Production 운영 확인)

- [x] Vercel Production에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정 확인
- [x] `https://plus-hana.vercel.app/admin` 접속 및 실제 판매 신청 목록 표시 확인
- [x] Vercel Production과 기존 Supabase 연결 완료 확인

## 2026-09-06 (테스트 이름 한글화와 누락 케이스 보강)

- [x] 테스트 제목을 작성 이유가 보이게 쉬운 한글로 바꿈 — 51개 파일
- [x] 신청 버튼을 여러 번 눌러도 한 번만 저장되는지 확인하는 테스트 추가
- [x] 모집 저장 버튼을 여러 번 눌러도 한 번만 변경되는지 확인하는 테스트 추가
- [x] 카카오톡 아이디 대소문자를 바꾸지 않는 테스트 추가
- [x] 관리자 목록 상태 필터가 실제로 목록을 가리는지 확인하는 테스트로 교체
- [x] 단위 테스트 PASS — 39 suites / 279 tests

## 2026-09-06 (VERIFY-HARD / VERIFY-SCOPE)

- [x] non-production Supabase RLS·private Storage·Admin API·metrics 보안 검증 — 4 suites / 22 tests PASS
- [x] 임시 비관리자 Auth 계정의 Admin API 403 확인 후 즉시 삭제
- [x] 판매자 경로의 `purchase-evidence` 미참조, production bundle의 service role/Admin credential 미포함 확인
- [x] `vercel.json` SPA rewrite와 PRD 금지 기능 정적 검사 통과
- [x] Production Build PASS — 119 modules

## 2026-09-06 (관리자 로그인 후 판매자 제출 오류)

- [x] 관리자 Auth 세션과 판매자 공개 API의 Supabase client를 분리
- [x] 판매자 모집 조회·증빙 업로드·신청 RPC가 `persistSession: false` client를 사용하도록 수정
- [x] 관련 Unit Test 및 Production Build 통과 — 39 suites / 276 tests

## 2026-09-06 (연락처 입력 필드 조건부 표시)

- [x] 연락 방식을 선택하기 전에는 휴대폰/카카오톡 연락처 입력 필드를 숨김
- [x] 연락 방식 선택 후 해당 유형의 입력 필드가 표시되는 회귀 테스트 추가
- [x] 관련 Seller 테스트 PASS — 13 tests

## 2026-09-06 (Admin 목록 401을 빈/오류 화면으로 오인하던 문제)

- [x] 로컬 세션만 있고 Auth `getUser`가 거부되면 `/admin`이 로그인으로 돌아가게 수정
- [x] Admin Edge Function 호출에 현재 access token을 명시적으로 첨부
- [x] 관련 Auth/Admin adapter·Gate 테스트 PASS — 18 suites / 106 tests

## 2026-09-06 (Phase 4 검증 역할 분리)

- [x] 로컬 클릭·`npm` 명령·배포 환경 설정은 사람 확인으로 옮김
- [x] AI 검증은 `VERIFY-HARD`(교차 계층 보안)와 `VERIFY-SCOPE`(PRD 범위/secret 정적 검사)만 남김
- [x] Phase 3 Gate가 이미 통과한 Seller/Admin happy path를 AI 재클릭 대상으로 두지 않음
- [x] `docs/PLAN.md` Phase 4, `docs/TESTING.md` §21, 이 문서 현재 상태를 맞춤

## 2026-09-05 (테스트 코드 한글 설명 보강)

- [x] 현재 작성된 테스트 파일 41개에 관련 작업·작성 이유·확인 내용을 쉬운 한글 주석으로 추가
- [x] 통합 테스트 연결 도우미와 공통 테스트 설정의 역할 설명 추가
- [x] 단위·서비스·React 테스트 PASS — 32 suites / 246 tests
- [x] non-production Supabase 통합 테스트 PASS — 9 suites / 56 tests
- [x] 설명 주석 누락 파일 확인 — 41개 전체 확인

## 2026-09-05 (BE-1)

- [x] 전용 non-production Supabase 프로젝트 연결 확인 (`SUPABASE_TEST_PROJECT=non-production`)
- [x] SQL Editor에서 당시 판매 신청 RPC와 권한을 검증
- [x] 당시 RPC 폐기 후 등록 방식 조건부 7인자 계약으로 교체·원격 재검증
- [x] 기존 테스트 프로젝트의 스키마/권한 drift를 데이터 삭제 없이 현재 계약에 맞게 보정
- [x] 당시 계약 기준 실제 Supabase 통합 테스트 통과 — 5 suites / 25 tests
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
- [x] 초기 V3 판매자 Flow 확정 (이후 3단계로 복원)
- [x] JavaScript + React + Vite + Supabase + Jest 기술 방향 확정
- [x] 모바일 퍼스트 +1 디자인 방향 확정

---

# 5. 다음 작업

```text
사람: 로컬에서 Seller/Admin/UI 확인. 이슈를 넘긴다.
AI: 넘어온 버그 수정. 요청 시에만 VERIFY-HARD / VERIFY-SCOPE.
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
