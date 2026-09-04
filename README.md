# +1

편의점 앱에 남아 있는 **1+1 / 2+1 보관상품을 실제로 판매하려는 사람이 존재하는지 검증하기 위한 MVP 서비스**입니다.

이 프로젝트의 목적은 완성된 중고거래 플랫폼을 만드는 것이 아니라, 사용자가 실제 상품 정보·판매 희망 가격·증빙·연락처를 입력하고 **판매 신청까지 완료하는 행동이 발생하는지 검증하는 것**입니다.

## 핵심 검증

1차 핵심 행동:

> 실제 보관상품 정보를 포함한 판매 신청 완료

더 강한 검증 신호:

> 운영자 연락 후 StoredItem이 실제 `purchased` 처리됨

반복 가능성 참고 신호:

> 동일 Seller가 새로운 SaleRequest를 다시 제출함

## MVP 범위

판매자는 다음 행동만 수행합니다.

```text
홈
↓
판매 조건 선택
↓
보관상품 등록
↓
보관상품 증빙 업로드
↓
연락처 입력
↓
신청 내용 확인
↓
판매 신청 완료
```

운영자는 다음 행동만 수행합니다.

```text
신청 확인
↓
판매자 연락 시작
↓
상품별 구매 또는 거절 처리
↓
모든 상품 처리 시 신청 자동 완료
```

## 지원 범위

편의점:

- GS25
- CU

행사:

- 1+1
- 2+1

한 판매 신청 안에서는 편의점과 행사 유형을 하나로 고정합니다.

## 기술 스택

### Frontend

- React
- Vite
- JavaScript
- React Router

### Backend / Data

- Supabase PostgreSQL
- Supabase Storage
- PostgreSQL RPC
- RLS
- Supabase Edge Functions

### Testing

- Jest
- React Testing Library
- Local Supabase Integration Test

### Deployment / Measurement

- Vercel
- Vercel Web Analytics

> 프론트엔드와 일반 애플리케이션 코드는 JavaScript를 사용합니다. Supabase Edge Functions는 플랫폼 요구에 따라 `admin-api`에 한해 TypeScript를 허용합니다.

## 핵심 데이터 모델

```text
Seller
  │ 1:N
  ▼
SaleRequest
  │ 1:N
  ▼
StoredItem
```

### Seller

동일 판매자 식별 기준:

```text
contact_type + contact_value
```

회원가입이나 로그인은 사용하지 않습니다.

### SaleRequest

한 번에 제출하는 판매 신청 묶음입니다.

상태:

```text
received
contacting
completed
```

### StoredItem

실제로 판매하려는 보관상품 1개입니다.

결과:

```text
pending
purchased
rejected
```

핵심 규칙:

- `purchased` → 구매 증빙 필수
- `rejected` → 거절 이유 필수
- 최종 처리된 결과는 다시 변경하지 않음
- 모든 StoredItem이 최종 처리되면 SaleRequest는 자동 `completed`

## 문서 구조

```text
.
├─ README.md
├─ AGENTS.md
│
├─ docs/
│  ├─ PRD.md
│  ├─ DESIGN.md
│  ├─ ARCHITECTURE.md
│  ├─ TESTING.md
│  ├─ PLAN.md
│  └─ TASKS.md
│
├─ src/
├─ supabase/
└─ tests/
```

문서 역할:

| 문서 | 역할 |
|---|---|
| `PRD.md` | 무엇을 만들고 무엇을 검증하는지 정의 |
| `DESIGN.md` | 화면, UX, 디자인 시스템 정의 |
| `ARCHITECTURE.md` | 애플리케이션 구조와 데이터 책임 정의 |
| `TESTING.md` | Jest 및 Integration Test 전략 정의 |
| `PLAN.md` | 실제 구현 순서와 Task별 구현 방법 정의 |
| `TASKS.md` | 현재 진행 상태 기록 |
| `AGENTS.md` | 작업 AI가 반드시 따라야 할 개발 규칙 |

문서 간 요구사항이 충돌할 경우 다음 우선순위를 따릅니다.

```text
PRD
↓
DESIGN
↓
ARCHITECTURE
↓
TESTING
↓
PLAN
↓
TASKS
```

`AGENTS.md`는 위 문서를 구현할 때 따라야 하는 작업 규칙입니다.

## 개발 원칙

- 기존 프로젝트 구현을 참고하지 않고 새 프로젝트로 구축합니다.
- 검증에 필요하지 않은 기능을 추가하지 않습니다.
- React UI와 핵심 비즈니스 로직을 분리합니다.
- 핵심 데이터 규칙은 PostgreSQL에서도 보장합니다.
- 테스트 커버리지 100%를 목표로 하지 않습니다.
- 잘못됐을 때 핵심 사용자 행동이나 데이터가 깨질 가능성이 높은 로직만 적극 테스트합니다.
- 모바일 퍼스트로 구현합니다.
- 운영자는 한 명으로 제한합니다.

## 구현 시작 방법

작업을 시작하기 전에 반드시 다음 순서로 문서를 확인합니다.

```text
AGENTS.md
↓
docs/PRD.md
↓
docs/DESIGN.md
↓
docs/ARCHITECTURE.md
↓
docs/TESTING.md
↓
docs/PLAN.md
↓
docs/TASKS.md
```

실제 구현은 `docs/PLAN.md`의 **Task 1부터 순서대로** 진행합니다.

각 Task는 다음 원칙을 따릅니다.

```text
테스트 작성
↓
실패 확인
↓
최소 구현
↓
테스트 통과 확인
↓
전체 관련 테스트 확인
↓
TASKS.md 업데이트
```

한 Task가 검증되기 전에 다음 Task로 넘어가지 않습니다.

## 명시적 제외 범위

이번 MVP에는 다음을 만들지 않습니다.

- 판매자 회원가입 / 로그인
- 마이페이지
- 판매 신청 조회 / 취소
- 구매자 회원
- 채팅
- 결제 / 정산
- 상품 마스터
- 가격 추천
- 알림센터
- 상태 변경 이력
- 연락 이력
- 여러 관리자
- 관리자 권한 시스템
- PostHog
- 복잡한 통계 대시보드

## 현재 상태

설계 문서 작성은 완료되었으며, 실제 구현은 아직 시작하지 않은 상태입니다.

구현 진행 상황은 `docs/TASKS.md`를 기준으로 확인합니다.
