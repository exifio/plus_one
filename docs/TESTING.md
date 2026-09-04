# TESTING — +1 Jest 테스트 전략

## 0. 문서 목적

이 문서는 편의점 앱에 남아 있는 1+1 / 2+1 보관상품 판매자 검증 MVP 서비스 `+1`에서 어떤 코드를 Jest로 테스트하고, 어떤 코드는 테스트하지 않을지 정의한다.

목표는 테스트 커버리지 100%가 아니다.

이번 프로젝트의 테스트 기준은 다음 한 문장이다.

> 이 코드가 잘못됐을 때 핵심 사용자 행동이나 데이터가 잘못될 가능성이 있는가?

테스트는 이 기준을 통과한 로직에 집중한다.

---

# 1. 테스트 전략의 목표

이번 프로젝트에서 테스트는 다음 네 가지를 보호하는 데 사용한다.

1. 판매 신청 데이터가 잘못 저장되지 않도록 한다.
2. 같은 판매자가 중복 Seller로 생성되는 문제를 방지한다.
3. StoredItem의 구매/거절 상태 규칙이 깨지지 않도록 한다.
4. SaleRequest의 처리완료 상태가 잘못 결정되지 않도록 한다.

반대로 다음 목적을 위해 테스트를 늘리지 않는다.

- 커버리지 수치 높이기
- 모든 React 컴포넌트 테스트하기
- CSS 확인하기
- 단순 텍스트 렌더링 확인하기
- 의미 없는 Snapshot 만들기

---

# 2. 권장 테스트 구성

이번 프로젝트는 세 층으로 나누어 테스트한다.

```text
1. Domain Unit Test
   ↓
2. Application Service Test
   ↓
3. Supabase Integration Test
```

필요한 경우에만 매우 적은 수의 React Interaction Test를 추가한다.

테스트의 중심은 **Domain Unit Test + 핵심 DB Integration Test**다.

---

# 3. 테스트 전략 선택

가능한 접근은 세 가지다.

## A. JavaScript 순수 함수만 테스트

장점:

- 가장 빠르다.
- Jest 학습이 쉽다.
- 테스트 실행 속도가 빠르다.

단점:

- 실제 데이터 규칙의 최종 권한인 PostgreSQL RPC와 Constraint가 검증되지 않는다.
- JavaScript 테스트가 통과해도 DB 구현이 잘못될 수 있다.

이번 프로젝트에는 부족하다.

---

## B. 핵심 로직 + 핵심 DB 동작 테스트 — 채택

구성:

```text
Domain
→ Jest Unit Test

Application Service
→ Jest + Mock

PostgreSQL RPC / RLS
→ Jest Integration Test + Local Supabase

React
→ 꼭 필요한 상호작용만 선택적으로 테스트
```

장점:

- 핵심 비즈니스 규칙을 빠르게 검증할 수 있다.
- DB가 실제로 규칙을 지키는지도 확인할 수 있다.
- 테스트 범위를 과도하게 키우지 않는다.

이번 프로젝트에서 사용한다.

---

## C. 대부분의 UI와 전체 사용자 흐름까지 자동화

장점:

- 자동화 범위가 넓다.

단점:

- 개발 시간이 크게 증가한다.
- UI 변경 때 테스트 유지비가 높다.
- 판매자 가설 검증 MVP 목적에는 과하다.

이번 MVP에서는 사용하지 않는다.

---

# 4. 테스트 피라미드

권장 비중은 다음과 같다.

```text
          적음
     UI Interaction
          ▲
          │
   Service Integration
          ▲
          │
     Domain Unit
          많음
```

가장 많은 테스트는 순수 JavaScript Domain Logic에 둔다.

UI 테스트는 매우 제한적으로 사용한다.

---

# 5. Domain Unit Test 원칙

Domain 함수는 다음 조건을 만족해야 한다.

- React에 의존하지 않는다.
- Supabase에 의존하지 않는다.
- Network 요청을 하지 않는다.
- 입력을 받아 결과를 반환한다.
- 동일한 입력에는 동일한 결과를 반환한다.

예:

```text
normalizeSellerContact()
validateSeller()
validatePrice()
validateExpirationDate()
validateStoredItem()
validateSaleRequest()
validateStoredItemResult()
isSaleRequestCompleted()
transformSaleRequestPayload()
```

이 함수들이 Jest 테스트의 핵심 대상이다.

---

# 6. 반드시 테스트할 로직 — Seller

## normalizeSellerContact

### phone

다음 입력은 동일한 결과가 되어야 한다.

```text
010-1234-5678
010 1234 5678
01012345678
```

기대 결과:

```text
01012345678
```

테스트할 항목:

- 하이픈 제거
- 공백 제거
- 이미 정규화된 값 유지
- 빈 값 처리
- 잘못된 값 처리

## kakao

테스트할 항목:

- 앞 공백 제거
- 뒤 공백 제거
- 내부 값은 임의 변경하지 않음
- 빈 문자열 거부

---

# 7. 반드시 테스트할 로직 — 가격

## validatePrice

가격 규칙:

```text
정수
0보다 큼
원화 단위
```

테스트할 값:

```text
1000      → 허용
1         → 허용
0         → 거부
-1000     → 거부
1.5       → 거부
"abc"     → 거부
빈 값      → 거부
```

판매 희망 가격이 행사 당시 가격보다 높은 경우는 거부하지 않는다.

이는 PRD에서 의도적으로 허용한 규칙이므로 테스트에서도 보장한다.

예:

```text
original_price = 1000
asking_price = 1500

→ 유효
```

---

# 8. 반드시 테스트할 로직 — 유효기간

## validateExpirationDate

규칙:

```text
과거 날짜
→ 거부

오늘
→ 허용

미래
→ 허용
```

날짜 테스트는 실제 현재 시간에 의존하지 않도록 고정된 시스템 시간을 사용한다.

예:

```text
기준일
2026-09-04
```

테스트:

```text
2026-09-03 → 거부
2026-09-04 → 허용
2026-09-05 → 허용
```

날짜 테스트가 실행 날짜에 따라 실패하는 구조를 만들지 않는다.

---

# 9. 반드시 테스트할 로직 — StoredItem 입력

## validateStoredItem

필수값:

```text
product_name
expiration_date
original_price
asking_price
```

테스트:

- 정상 상품
- 상품명 없음
- 유효기간 없음
- 지난 유효기간
- 행사 당시 가격 없음
- 잘못된 행사 당시 가격
- 판매 희망 가격 없음
- 잘못된 판매 희망 가격

한 번의 Validation에서 어떤 필드가 잘못됐는지 확인할 수 있는 구조를 권장한다.

---

# 10. 반드시 테스트할 로직 — SaleRequest

## validateSaleRequest

검증 대상:

```text
convenience_store
promotion_type
items
evidence_image
contact_type
contact_value
```

테스트할 규칙:

### 편의점

허용:

```text
gs25
cu
```

다른 값:

```text
→ 거부
```

### 행사 유형

허용:

```text
one_plus_one
two_plus_one
```

다른 값:

```text
→ 거부
```

### StoredItem

```text
0개
→ 거부

1개 이상
→ 허용
```

### 판매 의향 이미지

```text
없음
→ 거부
```

### 연락 방식

허용:

```text
phone
kakao
```

다른 값:

```text
→ 거부
```

---

# 11. 반드시 테스트할 로직 — StoredItem 처리 결과

가장 중요한 테스트 영역 중 하나다.

## pending

유효:

```text
result = pending
rejection_reason = null
purchase_evidence = null
```

잘못된 경우:

```text
pending + rejection_reason
pending + purchase_evidence
```

모두 거부한다.

---

## purchased

유효:

```text
result = purchased
purchase_evidence 존재
rejection_reason = null
```

잘못된 경우:

```text
purchase_evidence 없음
rejection_reason 존재
```

거부한다.

---

## rejected

유효:

```text
result = rejected
rejection_reason 존재
purchase_evidence = null
```

잘못된 경우:

```text
rejection_reason 없음
purchase_evidence 존재
```

거부한다.

---

# 12. 반드시 테스트할 로직 — SaleRequest 처리완료

## isSaleRequestCompleted

테스트:

```text
[purchased]
→ true
```

```text
[rejected]
→ true
```

```text
[purchased, rejected]
→ true
```

```text
[purchased, pending]
→ false
```

```text
[rejected, pending]
→ false
```

```text
[pending]
→ false
```

빈 배열은 정상 SaleRequest 상태가 아니므로 완료로 판단하지 않는다.

```text
[]
→ false
```

---

# 13. 반드시 테스트할 로직 — 데이터 변환

UI 입력과 DB 저장 형식 사이의 변환은 테스트한다.

## 가격

```text
"2,200"
→
2200
```

```text
"1,000원"
```

과 같은 값의 허용 여부는 구현 전에 한 가지 규칙으로 고정하고 테스트한다.

UI에서 숫자만 내부 상태로 관리한다면 불필요한 문자열 파싱 로직을 만들지 않는 것을 우선한다.

---

## 전화번호

```text
"010-1234-5678"
→
"01012345678"
```

## 날짜

UI Date 값을 DB DATE 형식으로 변환한다.

```text
→ YYYY-MM-DD
```

Timezone 때문에 날짜가 하루 바뀌는 문제가 발생하지 않도록 테스트한다.

---

# 14. Application Service Test

Service는 사용자 행동의 실행 순서를 담당하므로, 순서가 잘못되면 데이터 문제가 발생하는 경우에만 테스트한다.

외부 I/O는 Mock 처리한다.

---

# 15. submitSaleRequest 테스트

정상 흐름:

```text
Validation
↓
Storage Upload
↓
RPC
↓
성공 반환
```

테스트할 항목:

### 정상 제출

- 이미지 업로드 실행
- 업로드 결과 path를 RPC에 전달
- RPC가 정확히 한 번 호출
- 성공 결과 반환

### Validation 실패

```text
Storage Upload 호출 안 함
RPC 호출 안 함
```

### 이미지 업로드 실패

```text
RPC 호출 안 함
실패 반환
```

### RPC 실패

```text
성공 결과를 반환하지 않음
```

MVP에서는 RPC 실패 후 이미 업로드된 orphan 파일 자동 삭제를 요구하지 않는다.

따라서 Cleanup 로직 테스트도 만들지 않는다.

---

# 16. purchaseStoredItem 테스트

정상 흐름:

```text
구매 증빙 확인
↓
구매 증빙 Upload
↓
Admin API 호출
```

테스트:

- 증빙이 없으면 처리 요청하지 않음
- Upload 실패 시 Admin API 호출하지 않음
- Upload 성공 시 object path 전달
- 구매 결과가 정확하게 전달됨

---

# 17. rejectStoredItem 테스트

테스트:

- 거절 이유가 없으면 요청하지 않음
- 정상 이유가 있으면 Admin API 호출
- purchase_evidence를 잘못 전달하지 않음

---

# 18. Mock 원칙

Mock은 외부 I/O 경계에서만 사용한다.

Mock 대상:

- Supabase Storage
- Supabase RPC
- Admin Edge Function API

Mock하지 않는 대상:

- Domain 함수
- 가격 검증
- 날짜 검증
- Seller 정규화
- 상태 판단

비즈니스 로직 자체를 Mock하면 실제 테스트 가치가 사라지므로 사용하지 않는다.

---

# 19. Supabase Integration Test가 필요한 이유

애플리케이션의 최종 데이터 규칙은 PostgreSQL에 있다.

따라서 JavaScript Unit Test만 통과한다고 해서 충분하지 않다.

예:

```text
JavaScript
isSaleRequestCompleted() 정상

하지만

DB RPC
completed 변경 로직 오류
```

가 존재할 수 있다.

따라서 핵심 RPC와 RLS는 실제 Local Supabase 환경에서 최소 Integration Test를 작성한다.

---

# 20. Integration Test 환경

개발 시 Local Supabase를 사용한다.

테스트 대상:

```text
PostgreSQL
RPC
Constraint
RLS
```

운영 Production DB를 테스트 대상으로 사용하지 않는다.

각 테스트는 다른 테스트에 의존하지 않도록 필요한 데이터를 생성하고 정리할 수 있어야 한다.

---

# 21. create_sale_request Integration Test

반드시 확인할 동작:

## 정상 생성

한 번의 호출로:

```text
Seller
SaleRequest
StoredItem
```

이 모두 생성되는지 확인한다.

## 동일 Seller 재사용

첫 번째 신청:

```text
phone + 01012345678
```

두 번째 신청:

```text
phone + 01012345678
```

결과:

```text
Seller 1명
SaleRequest 2개
```

가 되어야 한다.

Seller가 2명 생성되면 실패다.

## 여러 StoredItem

입력된 상품 개수와 저장된 StoredItem 개수가 일치해야 한다.

## Transaction Rollback

StoredItem 중 하나가 DB Constraint를 위반하도록 입력한다.

기대 결과:

```text
SaleRequest 일부 저장 ×
StoredItem 일부 저장 ×
```

전체 Transaction이 실패해야 한다.

---

# 22. process_stored_item Integration Test

## 구매

구매 증빙이 있으면:

```text
pending
→
purchased
```

가능.

증빙이 없으면 실패.

## 거절

거절 이유가 있으면:

```text
pending
→
rejected
```

가능.

이유가 없으면 실패.

## 결과 변경 금지

```text
purchased → rejected
rejected → purchased
purchased → pending
rejected → pending
```

모두 실패해야 한다.

---

# 23. SaleRequest 자동 완료 Integration Test

SaleRequest에 상품 3개가 있다고 가정한다.

```text
A → purchased
B → rejected
C → pending
```

기대 상태:

```text
contacting
```

마지막 C가 처리된 후:

```text
A → purchased
B → rejected
C → purchased
```

기대 상태:

```text
completed
```

이 테스트는 반드시 실제 RPC를 대상으로 실행한다.

---

# 24. start_contact Integration Test

허용:

```text
received
→
contacting
```

금지:

```text
contacting
→
received

completed
→
contacting

completed
→
received
```

---

# 25. RLS Integration Test

보안상 가치가 높기 때문에 최소한의 테스트를 작성한다.

익명 사용자로 다음 조회가 실패하는지 확인한다.

```text
sellers SELECT
sale_requests SELECT
stored_items SELECT
```

특히 Seller 연락처가 anon key만으로 조회되지 않는지 확인하는 테스트는 필수다.

---

# 26. Storage Policy 테스트

Storage 정책이 구현된 후 최소한 다음 동작을 확인한다.

익명 판매자:

```text
sale-evidence upload
→ 허용된 방식에서 성공

다른 이미지 목록 조회
→ 실패

다른 이미지 읽기
→ 실패

기존 이미지 수정
→ 실패
```

`purchase-evidence`는 판매자 익명 사용자가 업로드하거나 읽을 수 없어야 한다.

Storage Policy 테스트가 환경상 지나치게 복잡해지는 경우 수동 보안 검증 체크리스트로 대체할 수 있지만, RLS 테스트를 대신 생략하지는 않는다.

---

# 27. React 테스트 범위

React 컴포넌트를 전부 테스트하지 않는다.

UI 테스트를 추가하는 기준:

> 이 연결이 깨지면 사용자가 핵심 판매 신청을 완료하지 못하거나 중복 제출될 가능성이 있는가?

그렇지 않으면 테스트하지 않는다.

---

# 28. 권장하는 최소 React Interaction Test

React Testing Library를 사용할 경우 다음 정도만 고려한다.

## 판매 신청 중 중복 제출 방지

사용자가 `판매 신청하기`를 누른 후 Service가 처리 중이면:

- 버튼 비활성
- 두 번째 클릭으로 Service가 다시 호출되지 않음

이 동작은 중복 SaleRequest 생성과 연결될 수 있으므로 테스트 가치가 있다.

## Validation 오류 표시 연결

잘못된 입력 상태에서 다음 단계로 진행하려 할 때:

- Domain Validation 결과가 화면 오류로 연결되는지

단, 모든 필드의 모든 오류 문구를 React 테스트에서 다시 확인하지 않는다.

세부 Validation은 Domain Unit Test가 담당한다.

---

# 29. 테스트하지 않을 React 코드

특별한 이유가 없다면 다음은 테스트하지 않는다.

- 홈 정적 문구
- 로고 렌더링
- 색상
- 여백
- Border Radius
- 아이콘
- 단순 Status Badge
- 단순 Label
- 단순 Wrapper Component
- 단순 Card
- 단순 Loading Spinner
- 단순 Router Wrapper
- 디자인 시스템 값

이 항목은 DESIGN 검수 대상이지 Jest 대상이 아니다.

---

# 30. Snapshot Test

Snapshot Test는 기본적으로 사용하지 않는다.

사용하지 않는 예:

```text
HomePage snapshot
Button snapshot
StoredItemCard snapshot
AdminPage snapshot
```

이유:

- UI 변경 때 의미 없는 Snapshot 갱신이 반복된다.
- 핵심 비즈니스 규칙을 보호하지 못한다.
- 실패 원인의 가치가 낮다.

---

# 31. 구현 방식 — 핵심 로직은 Test First

핵심 Domain Logic은 가능하면 다음 순서로 개발한다.

```text
1. 실패하는 Jest Test 작성
2. 최소 구현
3. Test 통과
4. Refactor
```

우선 대상:

- Seller 연락처 정규화
- 가격 검증
- 유효기간 검증
- StoredItem 검증
- 처리 결과 검증
- SaleRequest 완료 판단
- DB payload 변환

모든 UI를 TDD 방식으로 만들 필요는 없다.

---

# 32. 테스트 작성 규칙

각 테스트는 한 가지 행동을 명확하게 검증한다.

권장 형태:

```text
Arrange
↓
Act
↓
Assert
```

테스트 이름은 구현 방법보다 행동을 설명한다.

좋은 예:

```text
오늘이 유효기간인 상품은 등록할 수 있다

구매 증빙이 없는 상품은 구매 처리할 수 없다

미처리 상품이 하나라도 있으면 신청은 완료되지 않는다
```

좋지 않은 예:

```text
function test 1

validation works

component test
```

---

# 33. Boundary Case 우선

모든 가능한 값을 테스트하려 하지 않는다.

경계값을 우선한다.

예:

가격:

```text
-1
0
1
```

유효기간:

```text
어제
오늘
내일
```

상품 수:

```text
0개
1개
여러 개
```

상태:

```text
pending
첫 최종 처리
모든 상품 최종 처리
이미 최종 처리된 상품 재처리
```

---

# 34. 날짜 테스트 규칙

날짜 테스트는 실제 현재 날짜를 직접 사용하지 않는다.

고정 시간을 사용한다.

예:

```text
2026-09-04T12:00:00+09:00
```

이를 기준으로 과거/오늘/미래를 검증한다.

테스트가 다음 날이 되었다는 이유로 실패해서는 안 된다.

---

# 35. 테스트 데이터 원칙

테스트 데이터는 읽었을 때 의미를 바로 이해할 수 있게 작성한다.

예:

```text
GS25
1+1
코카콜라 제로 500ml
original_price 2200
asking_price 1000
```

무의미한 `foo`, `bar`, `123` 값을 핵심 비즈니스 테스트에 남발하지 않는다.

---

# 36. Coverage 원칙

프로젝트 전체 Coverage 목표를 강제하지 않는다.

예:

```text
100% Coverage
80% Coverage
```

같은 수치를 성공 기준으로 사용하지 않는다.

Coverage는 다음 용도로만 본다.

> 중요한 Domain 분기 중 테스트하지 않은 부분을 찾는 보조 도구

테스트 완료 여부는 Coverage 숫자가 아니라 **필수 비즈니스 규칙 테스트 목록이 모두 존재하고 통과하는가**로 판단한다.

---

# 37. 테스트 우선순위

## P0 — 반드시 테스트

문제가 생기면 핵심 데이터가 잘못될 수 있다.

- Seller 연락처 정규화
- Seller 중복 식별
- 가격 검증
- 유효기간 검증
- StoredItem 입력 검증
- StoredItem result 규칙
- 구매 증빙 필수
- 거절 이유 필수
- 결과 불변성
- SaleRequest 완료 판단
- create_sale_request Transaction
- process_stored_item
- SaleRequest 자동 완료
- Seller/SaleRequest/StoredItem RLS

---

## P1 — 테스트 권장

핵심 사용자 행동의 실행 순서를 보호한다.

- submitSaleRequest Service
- purchaseStoredItem Service
- rejectStoredItem Service
- DB payload 변환
- 중복 제출 방지 UI 연결

---

## P2 — 특별한 문제가 생기면 테스트

현재는 테스트하지 않는다.

- 단순 UI 컴포넌트
- Static Page
- 디자인 요소
- 일반적인 Router 동작
- 단순 Modal 열기/닫기
- 단순 Badge 표현

---

# 38. 권장 테스트 파일 구조

프로덕션 코드와 가까운 위치에 테스트를 둔다.

예:

```text
src/

features/
  sale-request/
    domain/
      normalizeSellerContact.js
      normalizeSellerContact.test.js

      validateStoredItem.js
      validateStoredItem.test.js

      validateSaleRequest.js
      validateSaleRequest.test.js

      isSaleRequestCompleted.js
      isSaleRequestCompleted.test.js

    services/
      submitSaleRequest.js
      submitSaleRequest.test.js

  admin/
    services/
      purchaseStoredItem.js
      purchaseStoredItem.test.js

      rejectStoredItem.js
      rejectStoredItem.test.js
```

Supabase Integration Test는 별도로 구분한다.

```text
tests/

integration/
  supabase/
    createSaleRequest.test.js
    processStoredItem.test.js
    startContact.test.js
    rls.test.js
```

테스트 파일을 한 거대한 폴더에 모두 모으지 않는다.

---

# 39. Unit Test와 Integration Test 분리

일상적인 개발 중에는 빠른 Unit Test를 자주 실행한다.

```text
Domain + Service Unit Test
→ 빠르게 반복
```

DB 구조나 RPC가 변경되었을 때는 Integration Test도 실행한다.

```text
Local Supabase
+
Integration Test
```

최종 배포 전에는 둘 다 통과해야 한다.

---

# 40. 실패 시 판단 기준

테스트가 실패하면 테스트를 바로 수정하지 않는다.

먼저 다음을 판단한다.

```text
비즈니스 규칙이 변경되었는가?
```

YES:

```text
PRD / ARCHITECTURE 확인
↓
변경이 확정되었다면 테스트 수정
```

NO:

```text
구현 오류로 판단
↓
코드 수정
```

테스트를 통과시키기 위해 비즈니스 규칙을 임의로 변경하지 않는다.

---

# 41. 테스트와 PRD 관계

테스트의 최상위 기준은 PRD다.

예:

PRD:

```text
오늘이 유효기간인 상품은 등록 가능
```

그러면 테스트는 반드시 이를 보호한다.

PRD:

```text
purchased 상품에는 구매 증빙 필수
```

그러면 JavaScript와 DB Integration Test 모두 이를 보호한다.

ARCHITECTURE는 이 규칙을 어디에서 실행할지 결정하고, TESTING은 그 실행이 올바른지를 확인한다.

---

# 42. 이번 TESTING 범위에서 제외하는 것

이번 MVP에서는 다음 테스트 시스템을 만들지 않는다.

- 모든 화면 E2E 자동화
- 100% Coverage
- Visual Regression Test
- Screenshot Test
- 모든 컴포넌트 Snapshot
- Performance Benchmark Suite
- Load Test
- Contract Testing Framework
- Mutation Testing
- 복잡한 Test Data Factory Framework
- Production DB를 사용하는 자동 테스트

필요성이 실제로 확인되기 전에는 추가하지 않는다.

---

# 43. 최종 테스트 전략

`+1`의 Jest 테스트 전략은 다음과 같다.

```text
핵심 비즈니스 규칙
→ Jest Unit Test

사용자 행동 조율
→ 선택적 Jest Service Test

DB Transaction / Constraint / RLS
→ Local Supabase Integration Test

React UI
→ 핵심 행동 연결만 최소 테스트

정적 UI / 디자인
→ 테스트하지 않음
```

---

# 44. 테스트 완료 조건

다음 조건을 충족하면 MVP의 테스트 기반이 충분하다고 판단한다.

1. Seller 정규화와 식별 규칙 테스트가 있다.
2. 가격과 유효기간 경계값 테스트가 있다.
3. StoredItem 입력 규칙 테스트가 있다.
4. pending / purchased / rejected 규칙 테스트가 있다.
5. 구매 증빙 필수 규칙 테스트가 있다.
6. 거절 이유 필수 규칙 테스트가 있다.
7. 최종 처리 상태를 다시 변경할 수 없음을 테스트한다.
8. 모든 상품 처리 시 SaleRequest 완료 규칙을 테스트한다.
9. `create_sale_request`가 Transaction으로 동작함을 Integration Test로 확인한다.
10. 동일 연락처 신청이 기존 Seller를 재사용함을 확인한다.
11. 핵심 RLS 정책이 익명 사용자의 개인정보 조회를 막는지 확인한다.
12. 핵심 Unit Test와 Integration Test가 모두 통과한다.

커버리지 숫자는 이 완료 조건에 포함하지 않는다.

---

# 45. 최종 정의

이번 프로젝트에서는 테스트의 양보다 **잘못됐을 때 실제 검증 데이터나 핵심 사용자 행동을 망가뜨리는 코드인지**를 우선한다.

따라서 테스트 전략을 다음 한 문장으로 정의한다.

> Seller 식별, 입력 검증, 가격·유효기간, StoredItem 처리 규칙, SaleRequest 완료 판단과 같은 핵심 비즈니스 로직은 Jest로 적극 테스트하고, PostgreSQL RPC·Transaction·RLS처럼 데이터 무결성을 최종 보장하는 영역은 Local Supabase Integration Test로 확인하며, 정적 UI와 단순 표현 코드는 의도적으로 테스트하지 않는다.
