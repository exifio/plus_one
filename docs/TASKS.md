# TASKS — +1

## 0. 문서 목적

이 문서는 `docs/PLAN.md`에 정의된 구현 Task의 실제 진행 상태를 기록합니다.

`PLAN.md`는 **무엇을 어떤 순서로 구현할지** 정의하고, 이 문서는 **현재 어디까지 완료되었는지**만 추적합니다.

## 1. 상태 규칙

사용 상태:

- `[ ]` 시작 전
- `[-]` 진행 중
- `[x]` 완료
- `[!]` Blocked

Task는 테스트와 검증이 끝난 경우에만 `[x]`로 변경합니다.

진행 중 발견한 요구사항 변경은 이 문서에서 임의로 확정하지 않습니다. PRD 또는 관련 설계 문서를 먼저 수정합니다.

---

# 2. 현재 단계

**상태: Task 1 완료**

설계 및 구현 계획은 완료되었습니다.

다음 시작 Task:

> **Task 2 — 핵심 Domain Validation과 DB Payload 변환**

---

# 3. 설계 문서

- [x] PRD 확정
- [x] DESIGN 확정
- [x] ARCHITECTURE 확정
- [x] Jest TESTING 전략 확정
- [x] 구현 PLAN 확정
- [x] README 작성
- [x] AGENTS 작성
- [x] TASKS 작성

---

# 4. 구현 Task

## Task 1 — 프로젝트 기반 + Jest + Seller 연락처 정규화

- [x] React + Vite 프로젝트 생성
- [x] 필수 의존성 설치
- [x] Jest / Babel / Testing Library 설정
- [x] Seller 연락처 정규화 실패 테스트 작성
- [x] 실패 확인
- [x] `normalizeSellerContact()` 최소 구현
- [x] 관련 테스트 통과
- [x] Task 1 전체 검증

**상태:** 완료

---

## Task 2 — 핵심 Domain Validation과 DB Payload 변환

- [ ] 가격 검증
- [ ] 유효기간 검증
- [ ] StoredItem 입력 검증
- [ ] SaleRequest 입력 검증
- [ ] StoredItem 결과 규칙 검증
- [ ] SaleRequest 완료 판단
- [ ] DB Payload 변환
- [ ] 각 로직 TDD 수행
- [ ] Task 2 전체 검증

**상태:** 시작 전

---

## Task 3 — Local Supabase + 핵심 Schema + RLS Integration Harness

- [ ] Local Supabase 개발 환경 구성
- [ ] `sellers` Schema
- [ ] `sale_requests` Schema
- [ ] `stored_items` Schema
- [ ] FK / CHECK / UNIQUE 제약
- [ ] RLS 기본 차단 정책
- [ ] Integration Test Harness 구성
- [ ] 익명 조회 차단 테스트
- [ ] Task 3 전체 검증

**상태:** 시작 전

---

## Task 4 — `create_sale_request` Transaction RPC

- [ ] RPC 실패 테스트 작성
- [ ] Seller 조회 또는 생성
- [ ] 동일 Seller 재사용
- [ ] SaleRequest 생성
- [ ] StoredItem 일괄 생성
- [ ] Transaction Rollback 검증
- [ ] 여러 StoredItem 생성 검증
- [ ] Task 4 전체 검증

**상태:** 시작 전

---

## Task 5 — Private Storage + 판매자 증빙 업로드

- [ ] `sale-evidence` Private Bucket 구성
- [ ] 판매자 제한 업로드 정책
- [ ] 읽기 / 목록 조회 차단 정책
- [ ] 증빙 업로드 API 구현
- [ ] `submitSaleRequest` Service 구현
- [ ] 업로드 실패 시 RPC 미호출 검증
- [ ] Storage Policy 검증
- [ ] Task 5 전체 검증

**상태:** 시작 전

---

## Task 6 — 판매 등록 State + 5단계 Seller UI

- [ ] `saleRequestReducer`
- [ ] 홈 화면
- [ ] 1단계 판매 조건
- [ ] 2단계 상품 등록
- [ ] 3단계 보관상품 확인
- [ ] 4단계 연락처
- [ ] 5단계 신청 확인
- [ ] 신청 완료 화면
- [ ] StoredItem 추가 / 삭제
- [ ] 입력 Validation 연결
- [ ] 중복 제출 방지
- [ ] Task 6 전체 검증

**상태:** 시작 전

---

## Task 7 — Design System + 공통 UI + 반응형 스타일

- [ ] Color / Typography Token
- [ ] Global Style
- [ ] Button
- [ ] Input
- [ ] Selection Card
- [ ] Status Badge
- [ ] StoredItem Card 스타일
- [ ] 모바일 하단 고정 CTA
- [ ] 데스크탑 판매 폼 최대 폭
- [ ] `+1` 브랜드 스타일 반영
- [ ] Task 7 전체 검증

**상태:** 시작 전

---

## Task 8 — Admin DB RPC: 연락 시작 / 구매 / 거절 / 자동 완료

- [ ] `start_contact` 테스트 및 구현
- [ ] `process_stored_item` 구매 처리
- [ ] 구매 증빙 필수 규칙
- [ ] 거절 처리
- [ ] 거절 이유 필수 규칙
- [ ] 최종 결과 변경 금지
- [ ] 모든 상품 처리 시 SaleRequest 자동 완료
- [ ] Integration Test
- [ ] Task 8 전체 검증

**상태:** 시작 전

---

## Task 9 — Admin Edge Function + 단일 운영자 Secret

- [ ] `admin-api` Edge Function 구성
- [ ] `ADMIN_SECRET` 검증
- [ ] 신청 목록 조회
- [ ] 신청 상세 조회
- [ ] 연락 시작 RPC 연결
- [ ] 구매 / 거절 RPC 연결
- [ ] Private Storage Signed URL 처리
- [ ] service_role 프론트엔드 비노출 확인
- [ ] Edge Function Integration Test
- [ ] Task 9 전체 검증

**상태:** 시작 전

---

## Task 10 — Admin UI + 운영 Service

- [ ] Admin Access Gate
- [ ] 신청 목록 화면
- [ ] 상태 필터
- [ ] 신청 상세 화면
- [ ] 판매 의향 증빙 확인
- [ ] 연락 시작 Service / UI
- [ ] 구매 처리 Dialog / Service
- [ ] 거절 처리 Dialog / Service
- [ ] 처리완료 상태 표현
- [ ] Task 10 전체 검증

**상태:** 시작 전

---

## Task 11 — Router + Vercel Web Analytics + SPA 배포 설정

- [ ] React Router 전체 Route 연결
- [ ] `/`
- [ ] `/sell`
- [ ] `/sell/complete`
- [ ] `/admin`
- [ ] `/admin/:saleRequestId`
- [ ] Vercel Web Analytics 적용
- [ ] SPA deep link rewrite 설정
- [ ] Production Build 확인
- [ ] Task 11 전체 검증

**상태:** 시작 전

---

## Task 12 — 최종 통합 검증 + 배포 전 체크

- [ ] 전체 Unit Test
- [ ] 전체 Supabase Integration Test
- [ ] Production Build
- [ ] Seller 전체 판매 신청 플로우 수동 검증
- [ ] Admin 전체 처리 플로우 수동 검증
- [ ] RLS / Storage 접근 재검증
- [ ] 환경 변수 / Secret 노출 확인
- [ ] PRD 제외 기능이 추가되지 않았는지 확인
- [ ] 모바일 주요 화면 확인
- [ ] 데스크탑 Admin 확인
- [ ] 배포 준비 완료 판단

**상태:** 시작 전

---

# 5. 현재 Blocker

없음.

---

# 6. 진행 로그

## 2026-09-04

- PRD 확정
- DESIGN 확정
- ARCHITECTURE 확정
- TESTING 전략 확정
- PLAN 확정
- README / AGENTS / TASKS 문서 준비
- Task 1 구현 및 검증 완료

---

# 7. 다음 작업

다음 작업은 `docs/PLAN.md`의 **Task 2**입니다.

시작 시 다음 순서를 지킵니다.

```text
AGENTS.md 확인
↓
PLAN Task 2 확인
↓
Task 2를 진행 중으로 변경
↓
실패 테스트 작성
↓
실패 확인
↓
최소 구현
↓
테스트 통과
↓
Task 2 검증
↓
TASKS.md 완료 처리
```

Task 2 완료 전 Task 3으로 넘어가지 않습니다.
