# ARCHITECTURE — +1

## 0. 문서 목적

이 문서는 편의점 앱에 남아 있는 1+1 / 2+1 보관상품을 실제로 판매하려는 사람이 존재하는지 검증하기 위한 MVP 서비스 `+1`의 애플리케이션 아키텍처를 정의한다.

확정된 PRD와 DESIGN을 기준으로 하며, 이번 프로젝트는 기존 구현을 참고하지 않고 새 프로젝트로 구축한다.

기술 스택은 다음으로 확정한다.

```text
Frontend
- React
- Vite
- JavaScript
- React Router

Backend Platform
- Supabase PostgreSQL
- Supabase Storage
- PostgreSQL Function / RPC
- RLS
- 필요한 최소 범위의 Supabase Edge Function

Testing
- Jest
```

TypeScript는 사용하지 않는다.

---

# 1. 아키텍처 목표

이번 구조에서 가장 중요한 원칙은 다음 세 가지다.

> UI와 비즈니스 로직을 분리한다.  
> 중요한 데이터 규칙은 브라우저뿐 아니라 DB에서도 보장한다.  
> Jest로 테스트할 가치가 있는 JavaScript 로직을 독립시킨다.

React 컴포넌트 내부에서 Supabase Query, 비즈니스 규칙, 상태 변경 규칙을 모두 처리하는 구조는 사용하지 않는다.

---

# 2. 선택한 구조

이번 프로젝트는 다음 구조를 사용한다.

```text
React UI
   ↓
Application / Service
   ↓
Domain Logic
   ↓
Supabase API / RPC
   ↓
Supabase
```

필요한 서버 측 실행만 PostgreSQL Function(RPC) 또는 Supabase Edge Function을 사용한다.

별도의 Express / NestJS 서버는 만들지 않는다.

---

# 3. 전체 시스템 구조

```text
┌─────────────────────────────┐
│         React + Vite        │
│                             │
│  Seller UI        Admin UI  │
│      │                │     │
│      ▼                ▼     │
│ Application / Service Layer │
│      │                │     │
│ Domain Logic         Admin API
│      │                │
└──────┼────────────────┼─────┘
       │                │
       ▼                ▼
 Supabase RPC      Edge Function
       │                │
       └───────┬────────┘
               ▼
        Supabase Backend
       ┌───────────────┐
       │  PostgreSQL   │
       │               │
       │  sellers      │
       │  sale_requests│
       │  stored_items │
       ├───────────────┤
       │    Storage    │
       └───────────────┘
```

---

# 4. React의 책임

React는 사용자와의 상호작용과 화면 표현만 책임진다.

주요 책임:

- 화면 렌더링
- 사용자 입력
- 5단계 판매 등록 진행 상태
- 입력 오류 표시
- 이미지 선택 및 미리보기
- 로딩 표시
- 사용자 액션 전달

React 컴포넌트가 직접 판단하지 않는 것:

- 동일 Seller인지 판단
- 판매 신청 DB 생성 순서
- StoredItem 처리 결과의 유효성
- SaleRequest 처리완료 여부
- 구매 증빙 필수 여부
- 거절 이유 필수 여부
- DB 저장 형식 변환

개념적으로 React는 다음 정도만 수행한다.

```text
사용자 입력 수집
↓
Service 호출
↓
결과를 화면에 표시
```

---

# 5. 판매 등록 상태

판매 등록 5단계는 하나의 판매 신청 Draft 상태를 공유한다.

개념적 구조:

```text
saleRequestDraft

convenienceStore
promotionType

items[]
 ├ productName
 ├ expirationDate
 ├ originalPrice
 └ askingPrice

evidenceImage

contactType
contactValue
```

React에서는 `useReducer` 기반 상태 관리를 권장한다.

이유:

- 여러 필드가 하나의 판매 신청을 구성한다.
- StoredItem 추가/삭제가 존재한다.
- 단계 이동 시 같은 상태를 유지해야 한다.
- Redux 같은 별도 전역 상태 도구는 MVP에 과하다.

---

# 6. Routing

최소 Route만 사용한다.

```text
/
홈

/sell
5단계 판매 등록

/sell/complete
신청 완료

/admin
신청 목록

/admin/:saleRequestId
신청 상세
```

판매 등록 5단계를 각각 별도 Route로 나누지 않는다.

사용하지 않는 구조:

```text
/sell/step1
/sell/step2
/sell/step3
/sell/step4
/sell/step5
```

현재 단계는 `/sell` 내부 상태로 관리한다.

---

# 7. JavaScript Domain Logic

비즈니스 규칙은 React 밖의 순수 JavaScript 함수로 분리한다.

예:

```text
normalizeSellerContact()

validateSeller()

validateStoredItem()

validatePrice()

validateExpirationDate()

validateSaleRequest()

canPurchaseItem()

canRejectItem()

isSaleRequestCompleted()
```

가능하면 다음 형태를 유지한다.

```text
입력
↓
판단
↓
결과 반환
```

Domain 함수는 React와 Supabase에 의존하지 않는다.

이 계층은 이후 Jest 테스트의 핵심 대상이 된다.

---

# 8. Seller 식별 규칙

Seller 식별 기준은 PRD와 동일하다.

```text
contact_type + contact_value
```

동일 조합이면 같은 Seller로 본다.

DB에는 다음 UNIQUE 제약을 둔다.

```text
UNIQUE(contact_type, contact_value)
```

---

# 9. Seller 연락처 정규화

동일한 연락처가 다른 표기 때문에 다른 Seller로 생성되지 않도록 저장 전에 정규화한다.

## phone

예:

```text
010-1234-5678
010 1234 5678
01012345678
```

모두 다음 형태로 저장한다.

```text
01012345678
```

## kakao

불필요한 앞뒤 공백만 제거한다.

카카오톡 연락처의 의미를 임의로 변경할 수 있으므로 과도한 변환은 하지 않는다.

---

# 10. 판매 신청 생성

판매 신청 하나를 생성하려면 여러 DB 작업이 필요하다.

```text
Seller 확인 또는 생성
↓
SaleRequest 생성
↓
StoredItem 생성
↓
StoredItem 생성
↓
...
```

이를 브라우저에서 순서대로 INSERT하지 않는다.

중간 실패 시 불완전한 데이터가 남을 수 있기 때문이다.

예:

```text
Seller 생성 성공
SaleRequest 생성 성공
StoredItem 1 생성 성공
StoredItem 2 생성 실패
```

이 경우 일부 데이터만 저장될 수 있다.

따라서 판매 신청 생성은 PostgreSQL Function을 사용해 하나의 Transaction으로 처리한다.

개념적 함수:

```text
create_sale_request(...)
```

주요 책임:

```text
1. 연락처 정규화 및 검증
2. 기존 Seller 조회
3. Seller가 없으면 생성
4. SaleRequest 생성
5. 모든 StoredItem 생성
6. 전체 성공 시 COMMIT
7. 하나라도 실패하면 ROLLBACK
```

React에서는 이 RPC를 한 번 호출한다.

---

# 11. Seller 조회를 브라우저에서 하지 않는 이유

다음 구조는 사용하지 않는다.

```text
React

SELECT sellers
WHERE contact_type = ...
AND contact_value = ...
```

Seller 테이블에는 판매자의 연락처가 저장된다.

익명 사용자가 Seller 테이블을 조회할 수 있게 열어두면 다른 사용자의 개인정보가 노출될 수 있다.

따라서 Seller 식별은 PostgreSQL Function 내부에서 수행한다.

판매자는 Seller 정보 자체를 응답받을 필요가 없다.

판매 신청 성공 시 최소한의 식별 값만 반환한다.

예:

```text
sale_request_id
```

---

# 12. 데이터베이스

핵심 테이블은 PRD에서 확정한 세 개만 사용한다.

```text
sellers
sale_requests
stored_items
```

추가 핵심 테이블은 만들지 않는다.

---

# 13. sellers

구조:

```text
seller_id
contact_type
contact_value
created_at
```

권장 타입:

```text
seller_id       UUID
contact_type    TEXT
contact_value   TEXT
created_at      TIMESTAMPTZ
```

제약:

```text
contact_type IN ('phone', 'kakao')

contact_value NOT NULL

UNIQUE(contact_type, contact_value)
```

---

# 14. sale_requests

구조:

```text
sale_request_id
seller_id
convenience_store
promotion_type
status
evidence_image
created_at
```

권장 타입:

```text
sale_request_id     UUID
seller_id           UUID
convenience_store   TEXT
promotion_type      TEXT
status              TEXT
evidence_image      TEXT
created_at          TIMESTAMPTZ
```

제약:

```text
convenience_store
IN ('gs25', 'cu')

promotion_type
IN ('one_plus_one', 'two_plus_one')

status
IN ('received', 'contacting', 'completed')
```

새로운 판매 신청의 기본 상태:

```text
received
```

---

# 15. stored_items

구조:

```text
stored_item_id
sale_request_id
product_name
expiration_date
original_price
asking_price
result
rejection_reason
purchase_evidence
created_at
```

권장 타입:

```text
stored_item_id       UUID
sale_request_id      UUID
product_name         TEXT
expiration_date      DATE
original_price       INTEGER
asking_price         INTEGER
result               TEXT
rejection_reason     TEXT
purchase_evidence    TEXT
created_at           TIMESTAMPTZ
```

새로운 StoredItem의 기본 결과:

```text
pending
```

---

# 16. 상태값 저장 방식

PostgreSQL ENUM보다 `TEXT + CHECK constraint` 방식을 사용한다.

이유:

- MVP 단계에서 상태값 변경이 생겨도 수정이 상대적으로 단순하다.
- DB에서 허용 값은 충분히 제한할 수 있다.
- UI 문구와 저장 값을 분리할 수 있다.

예:

```text
DB
received
contacting
completed

UI
접수됨
연락중
처리완료
```

StoredItem:

```text
DB
pending
purchased
rejected

UI
미처리
구매
거절
```

---

# 17. DB가 보장해야 하는 규칙

JavaScript validation만으로는 데이터 무결성을 보장하지 않는다.

최종 데이터 규칙은 DB에서도 강제한다.

## Seller

```text
contact_type 필수
contact_value 필수

contact_type
→ phone | kakao
```

## SaleRequest

```text
seller_id 필수

convenience_store
→ gs25 | cu

promotion_type
→ one_plus_one | two_plus_one

status
→ received | contacting | completed
```

## StoredItem

```text
product_name 필수
expiration_date 필수
original_price 필수
asking_price 필수

result
→ pending | purchased | rejected
```

모든 관계에는 Foreign Key를 적용한다.

---

# 18. StoredItem 처리 결과 규칙

StoredItem의 result와 부가 필드는 반드시 서로 일치해야 한다.

## pending

```text
result = pending

rejection_reason = NULL
purchase_evidence = NULL
```

## purchased

```text
result = purchased

purchase_evidence != NULL
rejection_reason = NULL
```

## rejected

```text
result = rejected

rejection_reason != NULL
purchase_evidence = NULL
```

이 규칙은 JavaScript와 DB 양쪽에서 검증한다.

---

# 19. StoredItem 처리

Admin에서 Row를 자유롭게 직접 UPDATE하는 구조는 사용하지 않는다.

전용 DB 작업을 사용한다.

개념적 함수:

```text
process_stored_item(...)
```

입력 개념:

```text
stored_item_id
result

purchase_evidence
또는
rejection_reason
```

주요 규칙:

```text
현재 result가 pending인가?
↓
purchased이면 구매 증빙이 있는가?
↓
rejected이면 거절 이유가 있는가?
↓
유효하면 결과 저장
```

이미 다음 상태인 상품은 변경을 거부한다.

```text
purchased
rejected
```

즉 다음 변경은 불가능하다.

```text
purchased → rejected
rejected → purchased
purchased → pending
rejected → pending
```

PRD의 처리 결과 불변성을 DB에서도 보장한다.

---

# 20. SaleRequest 자동 완료

`process_stored_item()`이 StoredItem을 처리한 후 같은 Transaction 안에서 해당 SaleRequest의 미처리 상품 여부를 확인한다.

```text
pending StoredItem이 남아 있는가?
```

남아 있으면:

```text
contacting 유지
```

남아 있지 않으면:

```text
status = completed
```

로 변경한다.

React가 최종 상태를 결정하지 않는다.

최종 데이터 상태는 PostgreSQL이 책임진다.

---

# 21. 연락 시작 처리

판매자가 제출한 신청을 운영자가 처음 연락하기 시작할 때 전용 작업을 사용한다.

개념적 함수:

```text
start_contact(...)
```

허용하는 상태 변경:

```text
received
→
contacting
```

허용하지 않는 상태 변경:

```text
contacting → received
completed → contacting
completed → received
```

---

# 22. Supabase Storage

이미지 파일 자체는 PostgreSQL에 저장하지 않는다.

Supabase Storage에 저장하고 DB에는 object path만 저장한다.

예:

```text
sale-evidence/
abc-def-123/image.jpg
```

DB:

```text
evidence_image =
"abc-def-123/image.jpg"
```

Public URL은 DB에 저장하지 않는다.

Signed URL도 DB에 저장하지 않는다.

---

# 23. Storage Bucket

두 개의 Private Bucket으로 분리한다.

```text
sale-evidence
purchase-evidence
```

## sale-evidence

판매자가 제출하는 판매 의향 및 보관상품 확인 스크린샷.

## purchase-evidence

운영자가 실제 구매 처리 시 등록하는 구매 증빙.

두 Bucket 모두 Private으로 유지한다.

---

# 24. Storage를 Private으로 두는 이유

보관상품 스크린샷에는 사용자가 의도하지 않은 정보가 포함될 가능성이 있다.

구매 증빙 역시 운영 데이터다.

따라서 누구나 URL만 알면 열 수 있는 Public Bucket으로 두지 않는다.

Admin에서 이미지를 확인할 때만 일정 시간 유효한 Signed URL을 사용한다.

---

# 25. 판매자 이미지 업로드

판매자는 로그인하지 않는다.

따라서 `sale-evidence` Bucket에는 판매 신청에 필요한 제한적인 익명 업로드만 허용한다.

기본 방향:

```text
익명 사용자

UPLOAD / INSERT
→ 제한적으로 허용

SELECT
→ 금지

LIST
→ 금지

UPDATE
→ 금지

DELETE
→ 금지
```

파일 경로는 추측하기 어려운 UUID 기반으로 생성한다.

React는 로컬 파일을 미리보기로 사용할 수 있으므로 업로드한 이미지를 다시 Storage에서 조회할 필요가 없다.

---

# 26. Storage와 DB Transaction

Supabase Storage 업로드와 PostgreSQL Transaction은 하나의 DB Transaction으로 묶을 수 없다.

따라서 판매 신청은 다음 순서로 처리한다.

```text
1. 이미지 Storage 업로드
2. object path 획득
3. create_sale_request RPC 실행
```

RPC 실패 시 DB에는 판매 신청이 남지 않는다.

단, Storage에 사용되지 않는 이미지가 남을 수 있다.

초기 MVP에서는 이를 막기 위한 Draft 테이블, Cleanup Worker, Background Job 등을 만들지 않는다.

이유:

> 검증에 필요하지 않은 인프라 복잡성을 추가하지 않기 위해서다.

MVP에서는 DB 무결성을 우선하고, 매우 드문 orphan 파일은 허용한다.

---

# 27. Admin 보안

React + Vite는 정적 클라이언트다.

따라서 다음 값은 브라우저 코드에 절대 포함하지 않는다.

```text
Supabase service_role key
```

service_role key는 브라우저에 노출되면 안 된다.

또한 익명 사용자가 직접 다음 작업을 할 수 있도록 RLS를 열어두지 않는다.

```text
Seller 연락처 조회
SaleRequest 전체 조회
증빙 이미지 조회
StoredItem 상태 변경
```

Admin 작업은 Supabase Edge Function을 통과시킨다.

---

# 28. Admin 구조

```text
Admin React UI
↓
Supabase Edge Function
↓
운영자 접근 확인
↓
Supabase Service 권한
↓
PostgreSQL / Storage
```

브라우저에는 service_role key를 넣지 않는다.

---

# 29. 단일 운영자 인증

PRD에 따라 별도의 관리자 테이블이나 다중 관리자 시스템은 만들지 않는다.

MVP에서는 하나의 운영 비밀키를 사용한다.

개념:

```text
ADMIN_SECRET
```

이 값은 Supabase Edge Function의 환경변수에만 저장한다.

Admin UI에서 운영자가 키를 입력하고, 현재 브라우저 세션에서만 유지한다.

개념적 흐름:

```text
Admin UI
↓
운영 비밀키 전달
↓
Edge Function
↓
키 일치 여부 확인
├─ 성공 → 요청 실행
└─ 실패 → 요청 거부
```

이 방식은 다음을 추가하지 않으면서 최소 접근 제어를 제공한다.

- 관리자 테이블
- 관리자 회원가입
- 관리자 프로필
- 다중 역할
- 권한 관리 시스템

이 인증은 사용자용 회원 시스템이 아니라 Admin 접근 보호를 위한 최소 장치다.

---

# 30. Admin Edge Function 책임

Admin Edge Function은 운영자 접근 제어를 담당한다.

주요 작업:

```text
관리자 인증 확인
신청 목록 조회
신청 상세 조회
연락 시작
구매 처리
거절 처리
```

단, 비즈니스 상태 규칙을 Edge Function에 중복 구현하지 않는다.

예:

```text
Admin UI
↓
Edge Function
↓
process_stored_item RPC
```

역할 분리:

```text
Edge Function
→ Admin 접근 제어

PostgreSQL
→ 최종 비즈니스 규칙과 데이터 무결성
```

---

# 31. RLS 기본 원칙

RLS는 기본적으로 모든 직접 접근을 차단하는 방향으로 설계한다.

## sellers

익명 사용자:

```text
SELECT ×
INSERT ×
UPDATE ×
DELETE ×
```

## sale_requests

익명 사용자:

```text
SELECT ×
INSERT ×
UPDATE ×
DELETE ×
```

## stored_items

익명 사용자:

```text
SELECT ×
INSERT ×
UPDATE ×
DELETE ×
```

판매 신청 생성은 허용된 RPC를 통해서만 실행한다.

따라서 anon key가 브라우저에 존재하더라도 판매자 연락처나 다른 판매 신청을 직접 조회할 수 없어야 한다.

---

# 32. 판매 신청 전체 데이터 흐름

```text
사용자
↓
React 판매 등록
↓
JavaScript Validation
↓
스크린샷 Storage 업로드
↓
submitSaleRequest Service
↓
create_sale_request RPC
↓
DB Validation
↓
Seller 조회 또는 생성
↓
SaleRequest 생성
↓
StoredItem 전체 생성
↓
COMMIT
↓
성공 응답
↓
신청 완료 화면
```

DB 작업 중 하나라도 실패하면:

```text
ROLLBACK
↓
신청 완료 화면으로 이동하지 않음
```

---

# 33. Admin 전체 데이터 흐름

신청 조회:

```text
운영자
↓
Admin UI
↓
운영 비밀키
↓
Edge Function
↓
PostgreSQL 조회
↓
Admin UI
```

구매 처리:

```text
구매 선택
↓
구매 증빙 업로드
↓
Admin Edge Function
↓
process_stored_item()
↓
StoredItem → purchased
↓
pending 상품 존재 여부 확인
↓
없음
↓
SaleRequest → completed
```

거절 처리도 같은 방식으로 동작한다.

---

# 34. JavaScript 데이터 변환

UI에서 입력한 값을 DB 저장 형식으로 변환하는 로직은 별도 함수로 분리한다.

예:

```text
"2,200"
→
2200
```

```text
"010-1234-5678"
→
"01012345678"
```

```text
Date / UI Value
→
YYYY-MM-DD
```

이 변환 로직은 React 컴포넌트 안에 넣지 않는다.

Jest 테스트 가치가 높은 영역이다.

---

# 35. Application Service

Application Service는 하나의 사용자 행동을 조율한다.

예:

```text
submitSaleRequest()

startContact()

purchaseStoredItem()

rejectStoredItem()
```

Service는 다음 책임을 맡는다.

- 필요한 Domain Validation 호출
- API / Storage 호출 순서 조율
- 성공/실패 결과 반환

Service가 UI 렌더링을 담당하지 않는다.

---

# 36. API Layer

Supabase와 직접 통신하는 코드는 API Layer로 분리한다.

예:

```text
saleRequestApi
storageApi
adminApi
```

주요 책임:

- Supabase RPC 호출
- Storage upload
- Edge Function 호출
- 응답 형태 변환

React Component에서 직접 `supabase.from(...)` 등을 여러 곳에 작성하지 않는다.

---

# 37. 권장 Frontend 모듈 구조

기능 중심으로 나눈다.

```text
src/

app/
  router/

features/
  sale-request/
    pages/
    components/
    state/
    domain/
    services/
    api/

  admin/
    pages/
    components/
    services/
    api/

shared/
  components/
  lib/
  utils/
```

---

# 38. 모듈 역할

## pages

화면 단위 조합.

예:

```text
HomePage
SellPage
SellCompletePage
AdminListPage
AdminDetailPage
```

## components

작은 UI 단위.

예:

```text
StoreSelection
PromotionSelection
StoredItemCard
EvidenceUploader
ContactForm
StatusBadge
```

## state

판매 등록 Draft 상태와 reducer.

## domain

순수 JavaScript 비즈니스 규칙.

예:

```text
validateStoredItem
validateSaleRequest
normalizeSellerContact
isSaleRequestCompleted
```

## services

하나의 사용자 행동을 조율한다.

예:

```text
submitSaleRequest
purchaseStoredItem
rejectStoredItem
```

## api

Supabase RPC, Storage, Edge Function 통신.

---

# 39. 의존 방향

의존 방향은 다음으로 제한한다.

```text
UI
↓
Service
↓
Domain / API
```

Domain 로직은 React에 의존하지 않는다.

사용하지 않는 방향:

```text
Domain
→ React Component
```

Domain 함수는 브라우저 UI 없이도 실행할 수 있어야 한다.

---

# 40. 에러 처리

에러는 크게 세 종류로 구분한다.

## 사용자 입력 오류

예:

```text
상품명 누락
가격 누락
유효기간 오류
연락처 오류
```

처리:

- 해당 입력 필드 아래에 메시지 표시
- 가능하면 첫 번째 오류 필드로 이동

## 이미지 업로드 오류

처리:

- 현재 단계 유지
- 다시 시도 가능
- 완료 화면으로 이동하지 않음

## 서버 / DB 오류

예:

```text
RPC 실패
DB Constraint 실패
Network 오류
```

처리:

- 신청 완료 화면으로 이동하지 않음
- 사용자에게 기술적인 Supabase 오류를 그대로 노출하지 않음
- 재시도 가능

---

# 41. 환경 분리

최소한 다음 환경을 구분한다.

```text
development
production
```

가능하면 Supabase 프로젝트 역시 개발용과 실제 검증용을 분리한다.

별도 staging 환경은 MVP에서 필수로 두지 않는다.

---

# 42. 이번 ARCHITECTURE에서 제외하는 것

다음 기술과 구조는 명시적으로 사용하지 않는다.

- Next.js
- TypeScript
- Express
- NestJS
- 별도 API 서버
- Redux
- Zustand
- GraphQL
- ORM
- Prisma
- 복잡한 Repository Framework
- Event Bus
- Message Queue
- Background Worker
- Redis
- Microservice
- Docker 기반 서버 운영
- 관리자 테이블
- 관리자 역할 시스템
- 사용자 인증 시스템
- 판매 신청 Draft 테이블
- 상태 변경 History 테이블
- 별도 Analytics Backend

---

# 43. 책임 경계 최종 정리

## React

> 사용자와 상호작용하고 화면을 표현한다.

## JavaScript Domain Logic

> 값이 올바른지 판단하고 데이터를 변환한다.

## Application Service

> 하나의 사용자 행동에 필요한 작업 순서를 조율한다.

## API Layer

> Supabase와 실제 통신한다.

## Supabase RPC

> 여러 DB 작업과 핵심 상태 변경을 Transaction으로 처리한다.

## PostgreSQL Constraint

> 잘못된 데이터가 최종적으로 저장되지 않게 한다.

## Supabase Storage

> 판매 의향 및 구매 증빙 이미지를 저장한다.

## Admin Edge Function

> 운영자만 민감한 데이터와 관리 작업에 접근하도록 한다.

---

# 44. 최종 아키텍처

```text
                    +1

             React + Vite
              JavaScript
                  │
         ┌────────┴────────┐
         │                 │
     Seller UI          Admin UI
         │                 │
    Application         Admin API
      Service              │
         │            Edge Function
    Domain Logic            │
         │                  │
    Supabase API            │
         └────────┬─────────┘
                  │
              Supabase
        ┌─────────┴─────────┐
        │                   │
   PostgreSQL             Storage
        │
     RPC / RLS
```

---

# 45. 최종 정의

`+1`의 애플리케이션 구조는 다음과 같이 정의한다.

> React + Vite + JavaScript를 기반으로 사용자 UI를 구성하고, UI와 비즈니스 로직을 분리한다. 핵심 판매 신청과 상태 변경은 Supabase PostgreSQL RPC와 DB Constraint가 최종 무결성을 책임지며, 증빙 이미지는 Private Storage에 저장한다. 운영자 기능은 별도 관리자 계정 시스템 없이 단일 운영 비밀키와 Supabase Edge Function으로 보호한다.

이 구조는 MVP 범위를 불필요하게 확장하지 않으면서도 핵심 비즈니스 로직을 독립적으로 테스트하고 데이터 무결성을 유지하는 것을 목표로 한다.
