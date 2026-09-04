# AGENTS.md

이 파일은 `+1` 프로젝트를 구현하는 작업 AI가 따라야 할 필수 규칙입니다.

## 1. 시작 전 필수 확인

작업을 시작하기 전에 다음 문서를 순서대로 읽습니다.

1. `docs/PRD.md`
2. `docs/DESIGN.md`
3. `docs/ARCHITECTURE.md`
4. `docs/TESTING.md`
5. `docs/PLAN.md`
6. `docs/TASKS.md`

요구사항 충돌 시 우선순위:

```text
PRD > DESIGN > ARCHITECTURE > TESTING > PLAN > TASKS
```

모호하거나 충돌하는 요구사항을 임의로 해석하지 않습니다.

## 2. 프로젝트 목적

이 프로젝트의 핵심 목표는 다음 하나입니다.

> 편의점 앱에 남아 있는 1+1 / 2+1 보관상품을 실제로 판매하려는 사람이 존재하는지 검증한다.

완성된 거래 플랫폼을 만드는 것이 목적이 아닙니다.

## 3. 기술 스택

기본 기술:

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

프론트엔드와 일반 애플리케이션 코드는 JavaScript로 작성합니다.

예외:

- `supabase/functions/admin-api/index.ts`
- Supabase Edge Functions의 플랫폼 요구로 인한 TypeScript만 허용

그 외 TypeScript 도입은 금지합니다.

## 4. 구현 순서

`docs/PLAN.md`의 Task 순서를 따릅니다.

Task를 임의로 건너뛰거나 합치지 않습니다.

현재 진행 상태는 `docs/TASKS.md`에 기록합니다.

한 Task가 완료되기 전에 다음 Task로 넘어가지 않습니다.

## 5. TDD 원칙

핵심 비즈니스 로직은 테스트를 먼저 작성합니다.

순서:

```text
1. 실패하는 테스트 작성
2. 테스트가 의도한 이유로 실패하는지 확인
3. 최소 구현
4. 해당 테스트 통과 확인
5. 관련 전체 테스트 통과 확인
6. 필요하면 리팩터링
```

Production code를 먼저 작성한 뒤 테스트를 맞추지 않습니다.

단순 정적 UI에는 불필요한 테스트를 만들지 않습니다.

## 6. 반드시 보호할 비즈니스 규칙

다음 규칙은 JavaScript와 DB 중 적절한 위치에서 반드시 보장합니다.

- Seller는 `contact_type + contact_value` 조합으로 식별
- 전화번호는 저장 전에 정규화
- 편의점은 `gs25`, `cu`만 허용
- 행사 유형은 `one_plus_one`, `two_plus_one`만 허용
- SaleRequest에는 최소 1개 StoredItem 필요
- StoredItem 하나는 보관상품 1개
- `quantity` 필드 금지
- 가격은 양의 정수
- 오늘이 유효기간인 상품은 등록 가능
- 지난 유효기간 상품은 등록 불가
- 새 StoredItem 결과는 `pending`
- `pending`에는 거절 이유/구매 증빙 없음
- `purchased`에는 구매 증빙 필수
- `purchased`에는 거절 이유 없음
- `rejected`에는 거절 이유 필수
- `rejected`에는 구매 증빙 없음
- `purchased` / `rejected`는 다시 변경 불가
- 모든 StoredItem이 최종 처리되면 SaleRequest 자동 `completed`

## 7. React 책임

React 컴포넌트는 다음에 집중합니다.

- 화면 렌더링
- 사용자 입력
- 단계 이동
- 로딩 / 오류 표현
- 사용자 액션 전달

React 컴포넌트 안에 다음을 직접 넣지 않습니다.

- Seller 식별 규칙
- DB Transaction 순서
- 상태 전이 규칙
- 복잡한 데이터 변환
- 여러 곳에서 반복되는 Supabase Query

## 8. 모듈 경계

기본 의존 방향:

```text
UI
↓
Service
↓
Domain / API
```

`domain/`은 React와 Supabase에 의존하지 않는 순수 JavaScript를 우선합니다.

`services/`는 사용자 행동의 실행 순서를 조율합니다.

`api/`는 Supabase와 실제 통신합니다.

## 9. Supabase 원칙

익명 사용자가 테이블을 직접 자유롭게 조회/수정하도록 RLS를 열지 않습니다.

특히 다음 데이터는 보호합니다.

- Seller 연락처
- SaleRequest 전체 목록
- StoredItem 전체 목록
- 판매 증빙
- 구매 증빙

판매 신청 생성은 Transaction 가능한 RPC를 사용합니다.

Admin의 민감한 데이터 접근은 Edge Function을 통과시킵니다.

`service_role` key를 프론트엔드 코드에 절대 포함하지 않습니다.

## 10. Storage 원칙

Bucket:

- `sale-evidence`
- `purchase-evidence`

둘 다 Private을 기본으로 합니다.

DB에는 Public URL이 아니라 object path를 저장합니다.

판매자 증빙 업로드 후 RPC 실패로 orphan 파일이 남을 수 있는 문제를 해결하기 위해 Draft 시스템이나 Worker를 추가하지 않습니다.

## 11. Admin 범위

운영자는 한 명입니다.

허용 기능:

- 신청 목록
- 신청 상세
- 판매자 연락 시작
- StoredItem 구매 처리
- StoredItem 거절 처리
- 구매 증빙 확인
- 거절 이유 확인

추가하지 않는 것:

- 관리자 테이블
- 관리자 회원가입
- 여러 관리자
- 역할/권한 시스템
- 통계 대시보드
- 연락 이력

## 12. 디자인 원칙

`docs/DESIGN.md`를 기준으로 구현합니다.

핵심:

- 모바일 퍼스트
- 편의점 앱처럼 친숙한 생활형 톤
- `+1` 독립 브랜드
- GS25 공식 UI/로고/캐릭터 직접 복제 금지
- 모바일 판매 등록 CTA 하단 고정
- 판매 등록은 5단계 유지
- 데스크탑 판매 폼은 단일 Column 유지
- Admin은 데스크탑 정보 밀도 허용

디자인이 허전하다는 이유로 기능을 추가하지 않습니다.

## 13. 테스트하지 않을 대상

특별한 이유가 없다면 다음 Jest 테스트를 추가하지 않습니다.

- 색상
- 여백
- Border Radius
- 정적 카피
- 단순 Wrapper
- 단순 Card
- 단순 Badge
- 의미 없는 Snapshot

Coverage 숫자를 목표로 개발하지 않습니다.

## 14. 범위 확장 금지

PRD에 없는 다음 기능을 임의로 추가하지 않습니다.

- 로그인
- 회원가입
- 마이페이지
- 신청 취소
- 구매자 기능
- 결제
- 정산
- 채팅
- 검색
- 상품 마스터
- 가격 추천
- 알림센터
- PostHog
- Redux / Zustand
- Express / NestJS
- Prisma / ORM
- 별도 API 서버

필요하다고 판단되어도 먼저 제안하고 승인받습니다.

## 15. 오류 처리

Supabase의 원본 기술 오류를 사용자에게 그대로 노출하지 않습니다.

오류 유형을 구분합니다.

- 입력 오류 → 해당 필드 근처 표시
- 이미지 업로드 실패 → 현재 단계 유지 + 재시도
- RPC / DB 실패 → 완료 화면 이동 금지

중복 제출을 방지합니다.

## 16. 날짜 기준

유효기간의 `오늘` 판단은 한국 서비스 기준 날짜를 사용합니다.

기준 Timezone:

```text
Asia/Seoul
```

테스트에서는 실제 실행 날짜에 의존하지 않고 시간을 고정합니다.

## 17. 작업 완료 기준

Task 완료 전 최소 확인:

- 해당 Task의 요구사항 구현
- 계획된 테스트 작성
- 실패 테스트 확인 기록
- 구현 후 테스트 통과
- 관련 전체 테스트 통과
- Build가 필요한 Task라면 Build 통과
- `docs/TASKS.md` 상태 업데이트

검증하지 않은 작업을 완료 처리하지 않습니다.

## 18. 변경 관리

PRD 또는 핵심 비즈니스 규칙을 변경해야 하는 상황이면 구현을 중단합니다.

다음 순서로 처리합니다.

```text
문제 설명
↓
영향 받는 문서 확인
↓
사용자 승인
↓
문서 수정
↓
테스트 수정
↓
구현 재개
```

테스트를 통과시키기 위해 요구사항을 임의로 변경하지 않습니다.

## 19. 커밋 원칙

가능한 한 Task 단위로 작고 명확한 커밋을 남깁니다.

커밋 전:

- 관련 테스트 확인
- 불필요한 파일 제거
- Secret 포함 여부 확인
- `TASKS.md` 갱신 확인

`.env`, 관리자 Secret, Supabase service key를 커밋하지 않습니다.

## 20. 최종 원칙

새 기능을 더 만드는 것보다 다음을 우선합니다.

> 핵심 판매 행동을 실제로 검증할 수 있는가?

> 저장되는 데이터가 신뢰할 수 있는가?

> 현재 PRD 범위 안에서 가장 단순한 구현인가?
