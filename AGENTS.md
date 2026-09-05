# AGENTS.md

이 파일은 `+1` 프로젝트를 구현하는 작업 AI가 반드시 따라야 할 규칙입니다.

## 1. 작업 시작 전

다음 문서를 순서대로 읽습니다.

1. `docs/PRD.md`
2. `docs/DESIGN.md`
3. `docs/ARCHITECTURE.md`
4. `docs/TESTING.md`
5. `docs/PLAN.md`
6. `docs/TASKS.md`

요구사항 충돌 시:

```text
PRD > DESIGN > ARCHITECTURE > TESTING > PLAN > TASKS
```

임의 해석하지 않습니다.

## 2. 프로젝트 목적

핵심 목표:

> 실제 보관상품을 가진 사용자가 판매 신청을 완료하는지 검증한다.

완성된 거래 플랫폼을 만드는 것이 목적이 아닙니다.

## 3. 기술

사용:

- React
- Vite
- JavaScript
- React Router
- Supabase PostgreSQL
- Supabase Storage
- PostgreSQL RPC
- Supabase Edge Functions
- Jest
- React Testing Library

TypeScript 허용 예외:

```text
supabase/functions/admin-api/index.ts
```

그 외 TypeScript 도입 금지.

## 4. 개발 순서

```text
Frontend 전체 구현
↓
Backend 전체 구현
↓
실제 연결
↓
통합 검증
```

`docs/PLAN.md`의 Phase/Task 순서를 따릅니다.

한 Task 검증 전 다음 Task로 넘어가지 않습니다.

## 5. TASKS 역할

`docs/TASKS.md`는 전체 PLAN 복사본이 아닙니다.

기록:

- 현재 작업
- 완료된 작업
- Blocker
- 바로 다음 작업

미래 전체 Task 목록은 PLAN에만 둡니다.

## 6. TDD

핵심 로직/서비스:

```text
실패 테스트
↓
의도한 실패 확인
↓
최소 구현
↓
해당 테스트 PASS
↓
관련 전체 테스트 PASS
↓
필요 시 리팩터링
```

정적 UI에는 의미 없는 test를 만들지 않습니다.

## 7. 핵심 데이터 규칙

### Seller

- `contact_type + normalized contact_value`로 식별
- phone 저장 전 정규화
- kakao는 trim만

### SaleRequest

- store: `gs25 | cu`
- promotion: `one_plus_one | two_plus_one`
- status: `received | contacting | completed`
- StoredItem 최소 1개
- 증빙 이미지 필수

### StoredItem

- 하나의 item = 보관상품 1개
- `quantity` 금지
- original/asking price 양의 정수
- asking > original 허용
- 유효기간은 선택 입력
- 입력한 유효기간은 오늘 또는 미래만 허용

결과:

```text
pending
→ reason/evidence 없음

purchased
→ purchase evidence 필수
→ rejection reason 없음

rejected
→ rejection reason 필수
→ purchase evidence 없음
```

purchased/rejected 재변경 금지.

모든 item 최종 처리 → parent SaleRequest 자동 completed.

## 8. 모집 관리 규칙

상태:

```text
open
paused
closed
```

`open`에서만 신규 SaleRequest 생성 가능.

Frontend CTA 차단만으로 끝내지 않습니다.

`create_sale_request` RPC가 최종 상태를 반드시 확인합니다.

모집 상태 조회 실패/row 누락 시 fail-open 하지 않습니다.

Realtime/polling은 추가하지 않습니다.

## 9. 실험 현황 규칙

`/admin/experiment`는 MVP 범위입니다.

이 화면은 범용 Dashboard가 아니라 핵심 가설 검증용 read-only 운영 화면입니다.

표시 가능:

- 전체 신청 수
- 고유 Seller 수
- 구매 item 수
- completed request 수
- repeat Seller 수
- asking price 분포
- asking/original ratio 분포
- store/promotion/status/result 집계
- 현재 모집 상태

금지:

- 0원 무상 양도 지표
- 등록 방식 지표
- 가짜 증가율
- 범용 Analytics 기능
- Chart library 도입
- 별도 Metrics table
- Vercel 방문자 API 연동

## 10. React 책임

React는:

- 렌더링
- 입력
- 단계 이동
- 로딩/오류
- 사용자 action 전달

을 담당합니다.

React Component 안에 직접 넣지 않습니다.

- Seller identity
- DB transaction
- 핵심 상태 전이
- Supabase query 반복
- metrics 집계 SQL 로직

## 11. 모듈 경계

```text
UI
↓
Service
↓
Domain / API Contract
↓
Adapter
```

Domain은 React/Supabase/Network 독립.

Fixture와 Supabase adapter를 같은 모듈에 섞지 않습니다.

## 12. Supabase

anon direct CRUD를 열지 않습니다.

특히 보호:

- Seller 연락처
- SaleRequest 목록
- StoredItem 전체 데이터
- 증빙 path
- recruitment_settings 직접 update

판매 신청은 Transaction RPC.

Admin 민감 작업은 Edge Function.

`service_role`을 Vite/브라우저에 넣지 않습니다.

## 13. Storage

Private buckets:

```text
sale-evidence
purchase-evidence
```

DB에는 object path만 저장.

판매자에게 purchase-evidence 접근을 열지 않습니다.

## 14. Admin 범위

운영자 한 명.

Supabase Auth 관리자 계정 1개로 Admin 접근을 보호합니다. 판매자는 계속 회원가입/로그인하지 않습니다.

허용:

- 신청 목록/상세
- 연락 시작
- 구매/거절
- 모집 관리
- 실험 현황

추가 금지:

- 여러 관리자
- admin user table / role system
- 범용 Dashboard
- 연락 이력
- 예약 모집

## 15. Admin Navigation

최소:

```text
판매 신청
모집 관리
실험 현황
```

별도 Sidebar를 새로 만들지 않습니다.

## 16. 디자인

`docs/DESIGN.md` 기준.

- 모바일 퍼스트 Seller
- 데스크탑 Admin 허용
- 기존 +1 Color/Card/Button/Typography 재사용
- 모집/실험 화면을 이유로 새 Design System 생성 금지
- GS25/CU 공식 자산 복제 금지

## 17. 오류

Seller:

- Validation → field 근처
- upload 실패 → 단계 유지
- 모집 상태 실패 → 신청 차단
- RPC 실패 → 완료 화면 금지
- duplicate submit 차단

Admin:

- 상태 update 실패 → 기존 상태 유지
- metrics fetch 실패 → 가짜 0 성공 상태 금지
- raw Supabase error 노출 금지

## 18. 날짜

Timezone:

```text
Asia/Seoul
```

테스트 clock 고정.

## 19. 범위 확장 금지

추가하지 않습니다.

- 판매자 로그인/회원가입
- 여러 관리자 계정 또는 관리자 role system
- 마이페이지
- 구매자 기능
- 결제/정산
- 채팅
- 검색
- 알림
- 상품 Master
- 가격 추천
- Redux/Zustand
- Express/Nest
- ORM
- PostHog
- Realtime/polling
- Metrics 저장 DB

필요해 보여도 먼저 사용자 승인.

## 20. Secret/Git

커밋 금지:

- `.env` 실제 값
- Admin Auth 계정 비밀번호/토큰
- Supabase service role key

사용자 변경을 임의 삭제하지 않습니다.

금지:

```text
git reset --hard
git checkout -- <user-work>
```

## 21. 완료 기준

Task 완료 전:

- 요구사항 구현
- 계획된 test
- 실패 확인
- PASS
- 관련 전체 test
- 필요 시 build
- TASKS 갱신

검증하지 못한 것은 `[x]` 금지.

환경 Blocker는 `[!]`와 실제 오류를 기록합니다.
