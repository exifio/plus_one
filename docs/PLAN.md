# +1 Frontend-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 판매자 신청, 모집 관리, 실험 현황을 포함한 `+1` MVP를 프론트엔드 전체 구현 → 백엔드 전체 구현 → 실제 연결 → 통합 검증 순서로 완성한다.

**Architecture:** React + Vite + JavaScript UI를 먼저 fixture adapter로 완성하고, Supabase PostgreSQL/RPC/RLS/Storage/Edge Function 백엔드를 별도로 구축한다. 이후 같은 API Contract를 유지한 채 fixture adapter를 실제 Supabase adapter로 교체한다. 모집 상태는 DB에서 최종 강제하며, 실험 현황은 기존 운영 데이터에서 즉시 집계하고 별도 Analytics table을 만들지 않는다.

**Tech Stack:** React, Vite, JavaScript, React Router, Jest, React Testing Library, Supabase PostgreSQL, Supabase Storage, PostgreSQL RPC, RLS, Supabase Edge Functions, Vercel

**Spec:** `docs/PRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `AGENTS.md`

## Global Constraints

- 문서 우선순위: `PRD > DESIGN > ARCHITECTURE > TESTING > PLAN > TASKS`.
- 일반 Frontend/Application 코드는 JavaScript.
- TypeScript는 `supabase/functions/admin-api/index.ts`에만 허용.
- Seller/SaleRequest/StoredItem 핵심 모델은 변경하지 않음.
- 추가 운영 table은 singleton `recruitment_settings`만 허용.
- 실험 지표 저장용 table은 만들지 않음.
- `quantity` 필드 금지.
- 가격은 양의 정수, 0원 금지.
- 판매 신청은 모집 상태 `open`에서만 최종 생성 가능.
- 범용 통계 Dashboard는 만들지 않지만 `/admin/experiment` 실험 현황은 필수 범위.
- 판매자는 비로그인으로 유지하고, Admin은 Supabase Auth 관리자 계정 1개만 허용.
- Admin Edge Function은 `Authorization` access token과 단일 `ADMIN_USER_ID`를 검증.
- Realtime/polling/PostHog/별도 Backend server 추가 금지.
- 핵심 로직과 서비스는 TDD.
- 검증하지 않은 Task를 완료 처리하지 않음.

---

# 0. 실행 전 저장소 조사 Gate

이 PLAN을 실행하기 전에 현재 저장소를 조사한다.

확인:

```text
현재 branch
git status
최근 commit
사용자 미커밋 변경
실제 src/tests/supabase/docs 파일
현재 unit test
현재 build
Docker
Supabase CLI
Local Supabase
```

기존 코드가 있으면 재사용 가능성을 먼저 확인한다.

사용자 변경을 삭제하지 않는다.

금지:

```text
git reset --hard
git checkout -- <user-file>
```

조사 결과가 문서와 충돌하면 임의 구현하지 않고 보고한다.

---

# Phase 1 — Frontend 전체 구현

Supabase/Docker 없이 완료할 수 있어야 한다.

---

## FE-1 — React/Vite/Jest/Router 기반

**목표:** Unit Test와 Production Build가 가능한 Frontend 기반 확정.

**확인/예상 파일:**

```text
package.json
vite.config.js
jest.config.cjs
babel.config.cjs
src/main.jsx
src/App.jsx
src/app/router/*
```

**Steps:**

- [ ] 기존 React/Vite 기반 조사
- [ ] React Router 확인
- [ ] Jest/RTL 설정 확인
- [ ] Unit config에서 `tests/integration` 제외
- [ ] Integration config와 충돌하지 않도록 script 구조 준비
- [ ] `npm test` PASS
- [ ] `npm run build` PASS
- [ ] TASKS 갱신

**완료 조건:** Docker 없이 Unit Test + Build PASS.

---

## FE-2 — Core Domain Logic

**목표:** React/Supabase와 독립된 핵심 비즈니스 규칙 구현.

**권장 파일:**

```text
src/features/sale-request/domain/contact.js
src/features/sale-request/domain/validation.js
src/features/sale-request/domain/result.js
src/features/recruitment/domain/recruitment.js
```

**Interfaces:**

```text
normalizeSellerContact(type, value)
validatePrice(value)
validateExpirationDate(value, now)
validateStoredItem(item, now)
validateSaleRequest(draft, now)
validateStoredItemResult(result)
isSaleRequestCompleted(items)
validateRecruitmentStatus(status)
transformSaleRequestPayload(draft)
```

**TDD:**

- [ ] 연락처 실패 테스트 → 구현 → PASS
- [ ] 가격 실패 테스트 → 구현 → PASS
- [ ] Asia/Seoul 날짜 테스트 → 구현 → PASS
- [ ] StoredItem validation → PASS
- [ ] SaleRequest validation → PASS
- [ ] result invariant → PASS
- [ ] completion 판단 → PASS
- [ ] recruitment status → PASS
- [ ] payload transform → PASS
- [ ] 전체 Unit Test PASS

---

## FE-3 — SaleRequest Draft State

**목표:** 5단계 입력 상태를 `useReducer`로 유지.

**권장 파일:**

```text
src/features/sale-request/state/saleRequestReducer.js
src/features/sale-request/state/initialSaleRequestDraft.js
```

**상태:**

```text
convenienceStore
promotionType
items[]
evidenceImage
contactType
contactValue
currentStep
```

**Steps:**

- [ ] initial draft
- [ ] store/promotion update
- [ ] item add/update/remove
- [ ] 최소 1 item 보호
- [ ] evidence/contact update
- [ ] 단계 이동
- [ ] 뒤로가도 입력 유지
- [ ] reducer 핵심 test PASS

---

## FE-4 — API Contracts

**목표:** UI와 data source 분리.

**Contract:**

```text
getRecruitmentStatus()
submitSaleRequest(draft)

listSaleRequests(status?)
getSaleRequest(id)
startContact(id)
purchaseStoredItem(itemId, evidence)
rejectStoredItem(itemId, reason)
updateRecruitmentStatus(status)
getExperimentMetrics()
```

**Steps:**

- [ ] Seller API interface/wrapper 정의
- [ ] Admin API interface/wrapper 정의
- [ ] Recruitment API interface/wrapper 정의
- [ ] UI가 Supabase client를 직접 import하지 않도록 경계 확인

---

## FE-5 — Fixture/In-memory Adapter

**목표:** 실제 DB 없이 모든 UI를 검증.

**권장 위치:**

```text
src/adapters/fixture/
```

**Fixture가 지원할 동작:**

- [ ] recruitment open/paused/closed
- [ ] SaleRequest submit
- [ ] Admin list/detail
- [ ] contact start
- [ ] purchased/rejected
- [ ] auto completed
- [ ] experiment metrics

**규칙:**

- 새로고침 영속화 요구 없음
- 실제 운영 데이터처럼 가장하지 않음
- Component direct fixture import 금지
- Supabase Adapter와 같은 return shape

---

## FE-6 — Seller Home + Recruitment Gate

**목표:** 모집 상태에 따라 시작 가능 여부 표시.

**화면:** `/`

**Steps:**

- [ ] open CTA 활성
- [ ] paused 안내
- [ ] closed 안내
- [ ] status load error 안내
- [ ] `/sell` direct access gate와 공유 가능한 상태 UI 분리
- [ ] 핵심 interaction test PASS

---

## FE-7 — Seller 5단계 UI

**목표:** DESIGN 기준 전체 판매 신청 flow 구현.

**화면:** `/sell`

**Steps:**

- [ ] 1단계 편의점/행사 선택
- [ ] 2단계 상품 등록
- [ ] item add/remove
- [ ] 가격/date validation 연결
- [ ] 3단계 증빙 이미지 local preview
- [ ] 4단계 연락처
- [ ] 5단계 신청 확인
- [ ] fixture submit
- [ ] 중복 제출 방지
- [ ] `/sell/complete`
- [ ] paused/closed direct access 차단
- [ ] Unit/interaction test PASS

---

## FE-8 — Admin 신청 목록/상세 UI

**목표:** fixture 기반 기존 운영 flow 완료.

**화면:**

```text
/admin
/admin/:saleRequestId
```

**Steps:**

- [ ] Supabase Auth Admin Access Gate UI
- [ ] 목록
- [ ] 상태 filter
- [ ] 상세
- [ ] 증빙 image preview
- [ ] 연락 시작
- [ ] 구매 dialog + evidence
- [ ] 거절 dialog + reason
- [ ] 처리 결과 readonly
- [ ] 자동 completed UI 반영

---

## FE-9 — Admin 모집 관리 UI

**목표:** `/admin/recruitment` 구현.

**Steps:**

- [ ] Admin 상단 최소 navigation에 `모집 관리` 추가
- [ ] 현재 상태 카드
- [ ] open/paused/closed 선택
- [ ] 현재 상태와 동일 시 저장 비활성
- [ ] `변경 사항 저장`
- [ ] 저장 중 중복 요청 방지
- [ ] paused/closed 확인 dialog
- [ ] success/error UI
- [ ] fixture 상태가 Seller Home에 반영되는지 수동 검증

---

## FE-10 — Admin 실험 현황 UI

**목표:** `/admin/experiment` 구현.

**Summary:**

```text
전체 판매 신청 수
고유 판매자 수
실제 구매 상품 수
처리 완료 신청 수
```

**Analysis:**

```text
판매 희망금액 분포
희망가격 비율 분포
편의점별 신청 수
행사 유형별 신청 수
상태별 신청 수
상품 결과별 수
재신청 판매자 수
```

**Steps:**

- [ ] 상단 navigation `실험 현황`
- [ ] 현재 모집 상태 Badge
- [ ] summary cards
- [ ] analysis cards/tables
- [ ] empty state
- [ ] error state
- [ ] fake data/증가율 없음
- [ ] chart library 추가 없음
- [ ] fixture metrics 정상 반영

---

## FE-11 — Design System / Responsive

**목표:** 판매자와 Admin의 시각 일관성 완료.

**Steps:**

- [ ] Color/Typography token
- [ ] Button/Input/Card/Badge
- [ ] Selection Card
- [ ] Upload Area
- [ ] Dialog/Bottom Sheet
- [ ] 모바일 하단 CTA
- [ ] 판매 폼 desktop max-width
- [ ] Admin desktop layout
- [ ] 모집/실험 화면 기존 Admin 스타일 재사용
- [ ] 375/768/1280px 주요 수동 확인

### Phase 1 Gate

다음 모두 PASS 후 Phase 2:

```text
npm test
npm run build
Seller fixture flow
Admin request flow
Admin recruitment flow
Admin experiment flow
```

---

# Phase 2 — Backend 전체 구현

이 단계부터 Docker + Local Supabase 필요.

---

## BE-1 — Local Supabase + Integration Harness

**목표:** PostgreSQL/RLS/RPC 실제 검증 환경.

**Steps:**

- [ ] Docker/Podman 확인
- [ ] Supabase CLI 확인
- [ ] `supabase start`
- [ ] migration 디렉터리 확인
- [ ] `jest.integration.config.cjs` 또는 동등 config
- [ ] `npm run test:integration`이 실제 integration file을 찾는지 확인

Docker가 없으면 `[!] Blocked`.

---

## BE-2 — Core Schema + recruitment_settings

**목표:** 4개 table과 Constraint.

**Tables:**

```text
sellers
sale_requests
stored_items
recruitment_settings
```

**Steps:**

- [ ] sellers migration
- [ ] sale_requests migration
- [ ] stored_items migration
- [ ] result invariant CHECK
- [ ] price CHECK > 0
- [ ] recruitment singleton + status CHECK
- [ ] initial `open` row
- [ ] schema integration test PASS

---

## BE-3 — RLS + Public Recruitment Read

**목표:** 민감 데이터 직접 접근 차단.

**Steps:**

- [ ] core table RLS enable
- [ ] anon direct select/insert/update/delete 차단
- [ ] `get_recruitment_status()` read RPC
- [ ] anon execute only this read function 허용
- [ ] recruitment update anon 차단
- [ ] Integration PASS

---

## BE-4 — create_sale_request Transaction

**목표:** 모집 상태 + Seller 재사용 + 전체 Transaction.

**Steps:**

- [ ] 실패 integration: open 정상 기대 전 FAIL
- [ ] recruitment 상태 검사
- [ ] paused/closed/설정 오류 reject
- [ ] Seller normalize/lookup/create
- [ ] SaleRequest insert
- [ ] StoredItem bulk insert
- [ ] rollback test
- [ ] same Seller reuse test
- [ ] multiple items test
- [ ] 전체 PASS

---

## BE-5 — Private Storage

**목표:** 판매/구매 증빙 보호.

**Buckets:**

```text
sale-evidence
purchase-evidence
```

**Steps:**

- [ ] private bucket 생성
- [ ] sale-evidence 제한 anon upload
- [ ] anon read/list/update/delete 차단
- [ ] purchase-evidence anon 접근 차단
- [ ] storage integration test

---

## BE-6 — Admin DB Functions

**목표:** 상태 전이와 자동 completed.

**Functions:**

```text
start_contact(...)
process_stored_item(...)
set_recruitment_status(...)
get_experiment_metrics()
```

**Steps:**

- [ ] start_contact TDD
- [ ] purchase TDD
- [ ] reject TDD
- [ ] immutable result TDD
- [ ] auto completed TDD
- [ ] recruitment update validation
- [ ] experiment metrics seeded integration
- [ ] metrics response 개인정보 제외 확인

---

## BE-7 — Admin Edge Function

**파일:**

```text
supabase/functions/admin-api/index.ts
```

**목표:** 단일 운영자 민감 작업 gate.

**Actions:**

```text
listSaleRequests
getSaleRequest
startContact
purchaseItem
rejectItem
getRecruitmentStatus
updateRecruitmentStatus
getExperimentMetrics
```

**Steps:**

- [ ] Supabase Auth access token / `ADMIN_USER_ID` 검증
- [ ] list/detail
- [ ] Signed URL
- [ ] contact/purchase/reject
- [ ] recruitment get/update
- [ ] experiment metrics
- [ ] service_role 브라우저 비노출
- [ ] no token / invalid token / non-admin / admin token test

---

## BE-8 — Backend Integration Suite

다음 전체 PASS:

- [ ] Schema Constraint
- [ ] RLS
- [ ] Seller reuse
- [ ] Transaction rollback
- [ ] recruitment open allow
- [ ] paused/closed block
- [ ] Storage policy
- [ ] contact/purchase/reject
- [ ] auto completed
- [ ] recruitment update
- [ ] experiment metrics
- [ ] Admin Auth

### Phase 2 Gate

```text
Local Supabase 정상
npm run test:integration PASS
```

---

# Phase 3 — 실제 연결

새 UI/비즈니스 규칙을 추가하지 않는다.

Fixture Adapter를 Supabase Adapter로 교체한다.

---

## LINK-1 — Recruitment Real Adapter

**목표:** Seller/Admin 모두 실제 모집 상태 사용.

**Steps:**

- [ ] Seller `getRecruitmentStatus()` → public RPC
- [ ] Admin get/update → Edge Function
- [ ] open/paused/closed 실제 반영
- [ ] status load 실패 시 fail-closed

---

## LINK-2 — Seller Submission Real Adapter

**흐름:**

```text
Validation
→ sale-evidence upload
→ object path
→ create_sale_request
→ success
```

**Steps:**

- [ ] upload adapter
- [ ] RPC adapter
- [ ] validation fail: upload/RPC 없음
- [ ] upload fail: RPC 없음
- [ ] recruitment changed mid-flow: 완료 화면 이동 없음
- [ ] generic DB error safe UI

---

## LINK-3 — Admin Request Real Adapter

- [ ] list
- [ ] detail
- [ ] Signed URL
- [ ] startContact
- [ ] purchase evidence + process
- [ ] reject
- [ ] auto completed 반영

---

## LINK-4 — Experiment Metrics Real Adapter

- [ ] `/admin/experiment` → `getExperimentMetrics`
- [ ] recruitment status 포함
- [ ] empty real DB 처리
- [ ] API error를 0 데이터처럼 표시하지 않음
- [ ] 개인정보 response 미포함 재확인

---

## LINK-5 — Error/Secret/Build Safety

- [ ] duplicate submit
- [ ] upload error
- [ ] RPC error
- [ ] Edge error
- [ ] Admin Auth error / expired session
- [ ] browser bundle에서 `service_role` 검색
- [ ] browser bundle에서 Admin credential 검색
- [ ] `.env` Git 추적 여부 확인

### Phase 3 Gate

실제 Local/Dev Supabase에서 다음 end-to-end가 정상:

```text
open → Seller 제출
Admin 목록/상세
연락 시작
구매/거절
자동 completed
모집 상태 변경
paused/closed 신규 제출 차단
실험 현황 집계 갱신
```

---

# Phase 4 — 통합 검증 및 배포 준비

## VERIFY-1 — 자동 검증

```bash
npm test
npm run test:integration
npm run build
```

전부 PASS.

---

## VERIFY-2 — Seller Flow

- [ ] Home open
- [ ] 5단계
- [ ] multi item
- [ ] image upload
- [ ] phone/kakao
- [ ] submit
- [ ] DB 저장
- [ ] paused/closed direct `/sell` block
- [ ] mid-flow 모집 변경 submit block

---

## VERIFY-3 — Admin Request Flow

- [ ] Admin Auth login
- [ ] unauthorized/non-admin access blocked
- [ ] list
- [ ] detail
- [ ] evidence view
- [ ] contacting
- [ ] purchased
- [ ] rejected
- [ ] completed

---

## VERIFY-4 — Recruitment Flow

- [ ] open → paused
- [ ] paused → open
- [ ] open → closed
- [ ] closed → open
- [ ] Seller Home 반영
- [ ] Backend create 차단

---

## VERIFY-5 — Experiment Flow

Seed/실제 테스트 데이터 기준:

- [ ] total requests
- [ ] unique sellers
- [ ] purchased items
- [ ] completed requests
- [ ] repeat sellers
- [ ] price distribution
- [ ] ratio distribution
- [ ] store/promo/status/result counts
- [ ] empty state

---

## VERIFY-6 — Security

- [ ] anon sellers SELECT 실패
- [ ] anon sale_requests SELECT 실패
- [ ] anon stored_items SELECT 실패
- [ ] anon recruitment table 직접 SELECT 실패
- [ ] public recruitment RPC 성공
- [ ] private storage direct read 실패
- [ ] signed URL 성공
- [ ] service role/secret bundle 없음

---

## VERIFY-7 — UI

모바일 판매자:

- [ ] 375px
- [ ] keyboard/CTA
- [ ] long product name
- [ ] multiple items
- [ ] image preview
- [ ] paused/closed/error

Admin:

- [ ] 768px
- [ ] 1280px
- [ ] top nav
- [ ] request list/detail
- [ ] recruitment cards
- [ ] experiment summary/analysis grid

---

## VERIFY-8 — Vercel 배포 준비

- [ ] SPA rewrite
- [ ] Frontend env
- [ ] Production Supabase migration
- [ ] Storage bucket/policy
- [ ] Edge Function deploy
- [ ] Admin Auth account / `ADMIN_USER_ID` env
- [ ] Vercel Web Analytics
- [ ] Production Build
- [ ] PRD 제외 기능이 추가되지 않았는지 확인

---

# Task 운영 규칙

각 Task:

```text
TASKS 현재 작업 변경
↓
실패 test
↓
실패 이유 확인
↓
최소 구현
↓
test PASS
↓
관련 전체 test
↓
필요 시 build
↓
TASKS 완료 기록
```

`TASKS.md`에는 미래 전체 PLAN을 복사하지 않는다.

현재 작업, 완료 기록, Blocker, 다음 작업만 유지한다.
