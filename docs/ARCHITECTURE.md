# ARCHITECTURE — +1

## 0. 목적

이 문서는 `+1` MVP의 프론트엔드, Supabase, 운영자 기능 사이의 책임과 데이터 흐름을 정의한다.

핵심 원칙:

```text
UI는 입력과 표시를 담당한다.
Domain은 비즈니스 규칙을 담당한다.
Service는 작업 순서를 조율한다.
Adapter/API는 외부 시스템과 통신한다.
DB Constraint/RPC는 최종 데이터 무결성을 보장한다.
```

---

# 1. 기술 스택

Frontend:

- React
- Vite
- JavaScript
- React Router

Backend/Data:

- Supabase PostgreSQL
- Supabase Storage
- PostgreSQL Functions/RPC
- RLS
- Supabase Edge Functions

Testing:

- Jest
- React Testing Library
- Local Supabase Integration Test

Deployment/Measurement:

- Vercel
- Vercel Web Analytics

TypeScript는 다음 파일에만 허용한다.

```text
supabase/functions/admin-api/index.ts
```

---

# 2. Route

```text
/
/sell
/sell/complete
/admin
/admin/:saleRequestId
/admin/recruitment
/admin/experiment
```

Admin 별도 Sidebar는 만들지 않는다.

---

# 3. Frontend 책임 분리

권장 의존 방향:

```text
React UI
↓
Application Service
↓
Domain / API Contract
↓
Adapter
```

Domain은 React/Supabase/Network에 의존하지 않는다.

Component에 직접 넣지 않는 것:

- Seller 식별 규칙
- 전화번호 정규화
- DB Transaction 순서
- StoredItem 최종 상태 전이 규칙
- 모집 상태 최종 승인 규칙
- Supabase Query 반복 코드

---

# 4. 권장 Frontend 구조

```text
src/
├─ app/
│  └─ router/
├─ features/
│  ├─ sale-request/
│  │  ├─ pages/
│  │  ├─ components/
│  │  ├─ state/
│  │  ├─ domain/
│  │  ├─ services/
│  │  └─ api/
│  ├─ recruitment/
│  │  ├─ domain/
│  │  ├─ services/
│  │  └─ api/
│  └─ admin/
│     ├─ pages/
│     ├─ components/
│     ├─ services/
│     └─ api/
├─ adapters/
│  ├─ fixture/
│  └─ supabase/
└─ shared/
   ├─ components/
   ├─ lib/
   └─ utils/
```

실제 저장소에 이미 일관된 구조가 있으면 강제 재배치하지 않는다.

---

# 5. 판매 신청 Draft

개념적 상태:

```text
saleRequestDraft

convenienceStore
promotionType
items[]
  productName
  expirationDate
  originalPrice
  askingPrice
evidenceImage
contactType
contactValue
```

`useReducer`를 우선한다.

Redux/Zustand는 추가하지 않는다.

---

# 6. Domain 함수

최소 핵심 함수:

```text
normalizeSellerContact()
validatePrice()
validateExpirationDate()
validateStoredItem()
validateSaleRequest()
validateStoredItemResult()
isSaleRequestCompleted()
validateRecruitmentStatus()
transformSaleRequestPayload()
```

전화번호 예:

```text
010-1234-5678
010 1234 5678
01012345678
→ 01012345678
```

카카오톡 연락 정보는 trim만 적용한다.

---

# 7. Frontend API Contract

판매자/공통:

```text
getRecruitmentStatus()
submitSaleRequest(draft)
```

Admin:

```text
listSaleRequests(status?)
getSaleRequest(saleRequestId)
startContact(saleRequestId)
purchaseStoredItem(storedItemId, purchaseEvidence)
rejectStoredItem(storedItemId, rejectionReason)
updateRecruitmentStatus(status)
getExperimentMetrics()
```

UI는 fixture/Supabase 구현 차이를 알지 않는다.

---

# 8. Fixture Adapter

Frontend Phase에서는 실제 DB 없이 같은 Contract를 구현한다.

```text
src/adapters/fixture/
```

예:

```text
fixtureSaleRequestApi
fixtureAdminApi
fixtureRecruitmentApi
```

원칙:

- 메모리에서만 상태 변경
- 새로고침 영속화 요구 없음
- 운영 데이터처럼 가장하지 않음
- Component가 fixture를 직접 import하지 않음
- Supabase Adapter와 반환 shape 유지

---

# 9. PostgreSQL Schema

## sellers

```text
seller_id UUID PK
contact_type TEXT NOT NULL
contact_value TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
```

Constraint:

```text
contact_type IN ('phone', 'kakao')
UNIQUE(contact_type, contact_value)
```

## sale_requests

```text
sale_request_id UUID PK
seller_id UUID FK NOT NULL
convenience_store TEXT NOT NULL
promotion_type TEXT NOT NULL
status TEXT NOT NULL DEFAULT 'received'
evidence_image TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
```

Constraint:

```text
convenience_store IN ('gs25', 'cu')
promotion_type IN ('one_plus_one', 'two_plus_one')
status IN ('received', 'contacting', 'completed')
```

## stored_items

```text
stored_item_id UUID PK
sale_request_id UUID FK NOT NULL
product_name TEXT NOT NULL
expiration_date DATE NOT NULL
original_price INTEGER NOT NULL
asking_price INTEGER NOT NULL
result TEXT NOT NULL DEFAULT 'pending'
rejection_reason TEXT NULL
purchase_evidence TEXT NULL
created_at TIMESTAMPTZ NOT NULL
```

Constraint:

```text
original_price > 0
asking_price > 0
result IN ('pending', 'purchased', 'rejected')
```

결과 제약:

```text
pending
→ rejection_reason IS NULL
→ purchase_evidence IS NULL

purchased
→ purchase_evidence IS NOT NULL
→ rejection_reason IS NULL

rejected
→ rejection_reason IS NOT NULL
→ purchase_evidence IS NULL
```

`quantity` 컬럼은 만들지 않는다.

## recruitment_settings

서비스 전체 singleton row.

```text
setting_key TEXT PK DEFAULT 'global'
status TEXT NOT NULL DEFAULT 'open'
updated_at TIMESTAMPTZ NOT NULL
```

Constraint:

```text
setting_key = 'global'
status IN ('open', 'paused', 'closed')
```

Migration 초기값:

```text
open
```

별도 모집 이력 테이블은 만들지 않는다.

---

# 10. Recruitment API

공개 판매자 화면은 table 직접 SELECT 대신 읽기 전용 RPC를 사용한다.

```text
get_recruitment_status()
```

반환:

```text
open | paused | closed
```

anon에게 이 함수 실행만 허용한다.

상태 변경은 Admin Edge Function을 통과한 뒤 서버 권한으로 처리한다.

개념적 DB 함수:

```text
set_recruitment_status(p_status)
```

이 함수는 브라우저 anon에게 직접 grant하지 않는다.

---

# 11. create_sale_request RPC

판매 신청은 브라우저에서 sellers/sale_requests/stored_items를 순차 INSERT하지 않는다.

하나의 Transaction RPC로 처리한다.

```text
create_sale_request(...)
```

순서:

```text
1. 모집 상태 조회
2. status != open 이면 즉시 실패
3. 입력값 검증
4. Seller 정규화/조회
5. 없으면 Seller 생성
6. SaleRequest 생성
7. StoredItem 전체 생성
8. 전체 성공 시 COMMIT
```

중간 실패 시 전부 rollback한다.

모집 상태가 `paused` 또는 `closed`이면 Seller를 포함해 신규 데이터가 남아서는 안 된다.

오류는 애플리케이션에서 식별 가능한 코드로 변환할 수 있다.

예:

```text
RECRUITMENT_NOT_OPEN
```

---

# 12. Storage

Private Bucket:

```text
sale-evidence
purchase-evidence
```

DB에는 Public URL이 아니라 object path를 저장한다.

## sale-evidence

판매자 anon:

- 제한된 신규 upload 허용
- list/read/update/delete 차단

업로드 후 DB RPC 실패로 orphan file이 남을 수 있다.

현재 MVP에서는 Draft table/cleanup worker를 추가하지 않는다.

## purchase-evidence

판매자 anon 접근 금지.

Admin 구매 증빙 업로드는 Admin Edge Function 또는 서버 권한을 경유해 처리한다.

---

# 13. Admin 보안

브라우저에 `service_role` key를 절대 노출하지 않는다.

판매자는 인증하지 않으며, Admin은 Supabase Auth 관리자 계정 1개로 인증한다.
Edge Function에는 해당 관리자 `user.id`만 `ADMIN_USER_ID`로 설정한다.

흐름:

```text
Admin UI
↓
Supabase Auth 로그인
↓
Authorization: Bearer <access token>
↓
Edge Function JWT 검증
↓
user.id == ADMIN_USER_ID 확인
↓
민감 데이터/관리 작업
```

공개 관리자 회원가입은 제공하지 않는다.
관리자 계정/role table은 만들지 않으며, 여러 관리자 계정도 허용하지 않는다.

---

# 14. Admin Edge Function

파일:

```text
supabase/functions/admin-api/index.ts
```

이 파일만 TypeScript 허용.

책임:

- Supabase Auth access token 및 단일 `ADMIN_USER_ID` 검증
- SaleRequest 목록
- SaleRequest 상세
- Seller 연락처 조회
- 판매 증빙 Signed URL
- 연락 시작
- 구매/거절
- 모집 상태 조회/변경
- 실험 현황 조회

예시 action:

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

---

# 15. Admin 상태 RPC

## start_contact

허용:

```text
received → contacting
```

역방향/완료 상태 변경은 금지.

## process_stored_item

구매:

```text
pending → purchased
purchase_evidence 필수
```

거절:

```text
pending → rejected
rejection_reason 필수
```

`purchased/rejected` 재처리 금지.

처리 후 같은 Transaction 안에서 parent SaleRequest의 pending item 수를 확인한다.

0개면:

```text
sale_requests.status = completed
```

---

# 16. 실험 현황 Architecture

실험 지표를 저장하는 별도 table을 만들지 않는다.

Source of Truth:

```text
sellers
sale_requests
stored_items
recruitment_settings
```

Admin Edge Function의 `getExperimentMetrics`가 서버 권한으로 집계한다.

복잡한 원시 row 전체를 브라우저에 보내고 UI에서 통계를 계산하지 않는다.

권장 DB 읽기 함수:

```text
get_experiment_metrics()
```

Edge Function service role만 호출하고 결과 JSON만 Admin UI로 전달한다.

반환 예시 개념:

```text
{
  recruitmentStatus,
  totalSaleRequests,
  uniqueSellers,
  purchasedItems,
  completedSaleRequests,
  repeatSellers,
  askingPriceDistribution,
  askingPriceRatioDistribution,
  convenienceStoreCounts,
  promotionTypeCounts,
  saleRequestStatusCounts,
  itemResultCounts
}
```

개인 연락처, 이미지 path 등은 이 response에 포함하지 않는다.

## 희망가격 비율

```text
asking_price / original_price * 100
```

구간:

```text
<=25
26-50
51-75
76-100
>100
```

0원 상품은 데이터 규칙상 존재하지 않는다.

---

# 17. RLS

기본 방향:

anon 사용자는 다음 table을 직접 자유롭게 SELECT/INSERT/UPDATE/DELETE할 수 없다.

```text
sellers
sale_requests
stored_items
recruitment_settings
```

판매 신청:

- 허용 RPC만 사용

모집 상태 읽기:

- `get_recruitment_status()`만 anon 실행 허용

Admin:

- Edge Function service role 경유

특히 Seller 연락처와 증빙 object path가 anon SELECT로 노출되면 실패다.

---

# 18. 판매자 제출 흐름

```text
Home
↓
getRecruitmentStatus()
↓
open이면 /sell 허용
↓
5단계 Draft 작성
↓
최종 submit
↓
Domain Validation
↓
sale-evidence upload
↓
object path
↓
create_sale_request RPC
↓
RPC 내부에서 모집 상태 재확인
↓
성공
↓
/sell/complete
```

Validation 실패:

```text
Storage 호출 X
RPC 호출 X
```

Upload 실패:

```text
RPC 호출 X
현재 화면 유지
```

RPC 모집 중단 오류:

```text
완료 화면 이동 X
최신 모집 상태 안내
```

---

# 19. Admin 모집 상태 흐름

```text
/admin/recruitment
↓
Admin Edge Function getRecruitmentStatus
↓
상태 선택
↓
저장
↓
Admin Edge Function updateRecruitmentStatus
↓
DB set_recruitment_status
↓
성공 후 UI 갱신
```

Realtime은 사용하지 않는다.

서버 상태 변경 자체는 저장 성공 직후 효력을 가진다.

---

# 20. Admin 실험 현황 흐름

```text
/admin/experiment
↓
Admin Edge Function getExperimentMetrics
↓
서버 집계
↓
개인정보 없는 summary JSON
↓
카드/표 렌더링
```

Vercel 방문자 수를 가져오기 위한 Vercel API 연동은 하지 않는다.

방문자 수는 Vercel Web Analytics에서 별도 확인한다.

---

# 21. 환경 변수

Frontend에 허용:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY 또는 publishable key
```

Frontend에 금지:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Edge Function 환경:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_USER_ID
```

실제 값은 Git에 커밋하지 않는다.

---

# 22. 아키텍처 제외 범위

추가하지 않는다.

- Express/Nest 별도 서버
- Prisma/ORM
- Redux/Zustand
- Admin user/role table
- 여러 관리자 Role system
- Metric/Analytics 저장 table
- PostHog
- Realtime subscription
- Polling system
- 모집 변경 이력 table
- 예약 scheduler
- 복잡한 Event architecture
