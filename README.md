# +1

편의점 앱에 남아 있는 1+1 / 2+1 보관상품을 **실제로 판매하려는 사람이 존재하는지** 검증하기 위한 MVP입니다.

완성된 중고거래 플랫폼이 아니라, 판매자가 상품 정보·희망 가격·보관 증빙·연락처를 입력하고 **판매 신청까지 완료하는 행동**을 검증하는 것이 목표입니다.

## 검증 신호

| 단계 | 신호 |
|------|------|
| Level 1 | 유효한 `SaleRequest` 제출 |
| Level 2 | 운영자 연락 후 `StoredItem`이 `purchased` 처리 |
| Level 3 | 동일 Seller의 재신청 |

## 주요 화면

### 판매자

```text
홈 → 판매 조건 → 상품 등록 → 보관상품 확인 → 연락처 → 신청 확인 → 완료
```

- 회원가입/로그인 없음
- 편의점(`GS25` / `CU`)과 행사 유형(`1+1` / `2+1`) 선택
- StoredItem 1개 이상, 보관 증빙 이미지 1장 필수

### 운영자

```text
판매 신청    신청 목록 / 상세, 연락 시작, 구매·거절
모집 관리    open / paused / closed
실험 현황    MVP 핵심 검증 지표 (read-only)
```

Supabase Auth 관리자 계정 1개로 Admin 접근을 보호합니다.

## Routes

```text
/                         판매자 홈
/sell                     판매 신청
/sell/complete            신청 완료
/admin                    신청 목록
/admin/:saleRequestId     신청 상세
/admin/recruitment        모집 관리
/admin/experiment         실험 현황
```

## 기술 스택

| 영역 | 스택 |
|------|------|
| Frontend | React, Vite, JavaScript, React Router |
| Backend | Supabase PostgreSQL, Storage, RPC, RLS, Edge Functions |
| Test | Jest, React Testing Library, Supabase Integration Test |
| Deploy | Vercel, Vercel Web Analytics |

프론트엔드와 일반 애플리케이션 코드는 JavaScript를 사용합니다.  
`supabase/functions/admin-api/index.ts`만 TypeScript 예외입니다.

## 시작하기

### 요구 사항

- Node.js 18+
- npm

### 설치

```bash
npm install
```

### 개발 서버

```bash
npm run dev
```

`VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`가 없으면 메모리 fixture로만 동작하고 DB에 저장되지 않습니다.  
실제 non-production Supabase에 신청을 저장하려면 루트에 `.env.local`을 만들고 아래 값을 설정한 뒤 `npm run dev`를 다시 시작합니다.  
`.env.test.local`은 통합 테스트 전용이라 Vite가 읽지 않습니다.

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
```

### 테스트

```bash
# Unit / Service / React test
npm test

# Supabase integration test (non-production 프로젝트 필요)
npm run test:integration
```

Integration test는 Docker 없이 **전용 non-production Supabase 프로젝트**를 사용합니다.

```bash
cp .env.test.example .env.test.local
# .env.test.local 값 입력 후
npm run test:integration
```

필수 변수:

```text
SUPABASE_TEST_URL
SUPABASE_TEST_ANON_KEY
SUPABASE_TEST_SERVICE_ROLE_KEY
SUPABASE_TEST_PROJECT=non-production
```

harness는 로컬/프로덕션 URL로 fallback하지 않습니다.  
migration은 `supabase/migrations/`를 non-production DB에 적용해야 합니다.

### 빌드

```bash
npm run build
```

## 프로젝트 구조

```text
src/
├─ adapters/           fixture / Supabase adapter
├─ features/
│  ├─ seller/          판매자 UI·서비스
│  ├─ admin/           운영자 UI·서비스
│  ├─ sale-request/    신청 도메인·계약
│  └─ recruitment/     모집 상태
└─ test/               Jest setup

supabase/
├─ migrations/         PostgreSQL schema / RPC / RLS
└─ functions/
   └─ admin-api/       Admin Edge Function (Auth 보호)

tests/integration/       Supabase integration test
docs/                  제품·설계·아키텍처·테스트·계획 문서
```

### 데이터 모델

```text
Seller
  └─ SaleRequest
       └─ StoredItem

RecruitmentSettings (singleton)
```

실험 지표는 별도 metrics table 없이 DB 집계 RPC로 조회합니다.

### 아키텍처

```text
React UI
  ↓
Service
  ↓
Domain / API Contract
  ↓
Adapter (fixture | Supabase)
  ↓
RPC / Edge Function / Storage
```

민감 데이터는 anon direct CRUD를 열지 않습니다.  
판매 신청은 transaction RPC, Admin 민감 작업은 Edge Function으로 처리합니다.

## 현재 진행 상태

```text
Phase 1  Frontend 전체 구현          완료
Phase 2  Backend 전체 구현            완료
Phase 3  실제 연결                    진행 중
Phase 4  통합 검증 및 배포 준비       대기
```

현재 연결 상태:

- 모집 상태 조회/변경 → 실제 Supabase 연결 완료
- 판매 신청 제출, Admin 신청 처리, 실험 현황 → 다음 연결 작업 예정

상세 현황은 `docs/TASKS.md`를 확인합니다.

## 문서

| 문서 | 내용 |
|------|------|
| [`docs/PRD.md`](docs/PRD.md) | 제품 요구사항·검증 가설 |
| [`docs/DESIGN.md`](docs/DESIGN.md) | 화면·UX·디자인 시스템 |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | 코드·DB·API 책임 |
| [`docs/TESTING.md`](docs/TESTING.md) | 테스트 전략 |
| [`docs/PLAN.md`](docs/PLAN.md) | 전체 구현 순서 |
| [`docs/TASKS.md`](docs/TASKS.md) | 현재 작업·완료·Blocker |
| [`AGENTS.md`](AGENTS.md) | 작업 AI 필수 규칙 |

문서 우선순위:

```text
PRD > DESIGN > ARCHITECTURE > TESTING > PLAN > TASKS
```

## 범위 밖

이 MVP에 포함하지 않습니다.

- 판매자 회원가입/로그인, 마이페이지
- 구매자 기능, 결제/정산, 채팅, 검색
- 상품 마스터, 가격 추천
- 여러 관리자, 연락 이력, 모집 예약
- Realtime/polling, PostHog, 별도 Analytics DB

검증용 `/admin/experiment` 화면은 명시적 MVP 범위입니다.

## 보안

Git에 커밋하지 않습니다.

- `.env`, `.env.local`, `.env.test.local` 등 secret 값
- `service_role` key
- Admin Auth 비밀번호/토큰

브라우저 bundle에 `service_role`을 넣지 않습니다.
