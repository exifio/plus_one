# TESTING — +1

## 0. 목표

이 문서는 `+1` MVP에서 테스트 가치가 높은 로직만 Jest와 Local Supabase Integration Test로 검증하기 위한 기준을 정의한다.

핵심 판단 기준:

> 이 코드가 잘못됐을 때 핵심 사용자 행동이나 저장 데이터가 잘못될 가능성이 큰가?

Coverage 100%를 목표로 하지 않는다.

---

# 1. 테스트 계층

## 1. Domain Unit Test

React/Supabase 없이 순수 JavaScript 규칙 검증.

## 2. Application Service Test

Storage/API/RPC 호출 순서와 오류 흐름 검증.

## 3. Supabase Integration Test

실제 PostgreSQL Constraint/RPC/RLS/Storage 정책 검증.

## 4. 최소 React Interaction Test

중복 제출, 상태 차단 등 핵심 사용자 행동만 검증.

---

# 2. Jest 구성 원칙

Unit과 Integration 설정을 분리한다.

```text
npm test
→ Unit / Service / 필요한 React Test

npm run test:integration
→ tests/integration 전용
```

기본 Jest config는 `tests/integration`을 제외한다.

Integration 전용 config는 다음 경로만 실행한다.

```text
tests/integration/**/*.test.js
```

Integration `testEnvironment`는 `node`를 사용한다.

---

# 3. Domain Unit Test

## normalizeSellerContact

phone:

```text
010-1234-5678 → 01012345678
010 1234 5678 → 01012345678
01012345678   → 01012345678
```

kakao:

- 앞뒤 공백 제거
- 내용 자체는 임의 case 변환하지 않음

## validatePrice

허용:

```text
1
1000
2200
```

거부:

```text
0
-1
1.5
""
"abc"
```

`asking_price > original_price`는 허용한다.

## validateExpirationDate

테스트 시간은 고정한다.

Asia/Seoul 기준:

```text
과거 → false
오늘 → true
미래 → true
```

실행 날짜에 따라 테스트가 바뀌지 않도록 한다.

## validateStoredItem

필수:

- productName
- expirationDate
- originalPrice
- askingPrice

최소 하나라도 invalid이면 실패.

## validateSaleRequest

필수:

- convenienceStore
- promotionType
- items.length >= 1
- evidenceImage
- contactType
- contactValue

허용 값:

```text
convenienceStore: gs25 | cu
promotionType: one_plus_one | two_plus_one
```

## validateStoredItemResult

```text
pending
→ reason/evidence 없음

purchased
→ purchaseEvidence 필수
→ rejectionReason 없음

rejected
→ rejectionReason 필수
→ purchaseEvidence 없음
```

## isSaleRequestCompleted

```text
모두 purchased/rejected → true
pending 1개 이상 → false
items 빈 배열 → false
```

## validateRecruitmentStatus

허용:

```text
open
paused
closed
```

거부:

```text
undefined
null
""
"active"
"OPEN"
```

UI label 변환이 순수 함수라면 같이 테스트한다.

---

# 4. Payload/Transform Test

검증:

- 전화번호 정규화
- 가격 문자열 → integer
- 날짜 `YYYY-MM-DD` 유지
- timezone off-by-one 방지
- React field name → DB field name 변환
- `quantity` 생성 금지

---

# 5. 판매 신청 Service Test

개념적 service:

```text
submitSaleRequest()
```

정상:

```text
Validation
→ sale-evidence upload
→ create_sale_request RPC
→ success
```

반드시 검증:

## Validation 실패

- Storage 호출 X
- RPC 호출 X

## Upload 실패

- RPC 호출 X
- 성공 반환 X

## RPC 실패

- 성공 반환 X
- 완료 화면 이동을 허용하는 상태 반환 X

## 모집 중단 오류

Backend가 `RECRUITMENT_NOT_OPEN` 계열 오류를 반환하면:

- 성공 처리 X
- 최신 모집 상태 안내 가능

Rare orphan file cleanup worker는 현재 범위가 아니므로 자동 cleanup test를 만들지 않는다.

---

# 6. Recruitment Service Test

Frontend contract:

```text
getRecruitmentStatus()
updateRecruitmentStatus(status)
```

검증:

- open/paused/closed 정상 처리
- 잘못된 status를 API 호출 전에 거부할 수 있으면 거부
- update 실패 시 기존 UI 상태 유지 가능한 결과
- 중복 저장 방지가 service 책임이면 해당 동작 검증

Realtime/polling test는 만들지 않는다.

---

# 7. Admin 처리 Service Test

## startContact

정상 request만 API 호출.

## purchaseStoredItem

- purchaseEvidence 없으면 API 호출 X
- evidence가 있으면 호출
- 실패 시 purchased UI 확정 X

## rejectStoredItem

- rejectionReason 없으면 API 호출 X
- reason 있으면 호출
- 실패 시 rejected UI 확정 X

---

# 8. Experiment Metrics Unit Test

집계가 순수 함수/DB 결과 변환 로직을 포함한다면 다음을 검증한다.

## Summary

Seed 개념:

- Seller A: request 2개
- Seller B: request 1개
- purchased item 2개
- completed request 1개

예상:

```text
totalSaleRequests = 3
uniqueSellers = 2
repeatSellers = 1
purchasedItems = 2
completedSaleRequests = 1
```

## 희망가격 비율 Bucket

```text
20%  → <=25
50%  → 26-50
51%  → 51-75
100% → 76-100
120% → >100
```

경계값을 테스트한다.

## Empty

데이터 없음:

```text
summary 숫자 = 0
배열 = [] 또는 0 count group
```

실패를 성공한 0 데이터로 변환하는 로직은 금지한다.

---

# 9. React Interaction Test — 최소

필요한 경우만 작성한다.

## 판매 제출 중복 방지

한 번 submit 중일 때 CTA 재클릭으로 service가 두 번 호출되지 않음.

## 모집 상태

- open → 판매 등록 CTA 가능
- paused → Form 차단
- closed → Form 차단
- load error → Form 차단

모든 정적 카피를 test하지 않는다.

## Admin 모집 저장

- 현재 상태와 동일하면 저장 비활성
- 저장 중 중복 요청 방지

## 실험 현황

- metrics load error를 "0"으로 위장하지 않음
- empty successful data는 `데이터가 없어요.` 표시

---

# 10. Supabase Integration — Schema

Local Supabase에서 검증한다.

## sellers

- contact_type invalid 실패
- 동일 contact_type + contact_value 중복 방지

## sale_requests

- invalid store 실패
- invalid promotion 실패
- invalid status 실패

## stored_items

- price 0 실패
- negative price 실패
- result invalid 실패
- result auxiliary constraint 검증

## recruitment_settings

- singleton 유지
- open/paused/closed만 허용
- 초기 row open 확인

---

# 11. Integration — RLS

anon key로 다음 직접 SELECT가 실패해야 한다.

```text
sellers
sale_requests
stored_items
recruitment_settings
```

특히 연락처/증빙 path 보호를 확인한다.

`get_recruitment_status()`는 anon 실행 가능해야 한다.

상태 update 함수는 anon이 직접 실행할 수 없어야 한다.

---

# 12. Integration — create_sale_request

## 정상 open 상태

- Seller 생성
- SaleRequest 생성
- StoredItem N개 생성

## 동일 Seller

동일 normalized contact로 두 번 신청:

```text
Seller 1개
SaleRequest 2개
```

## Transaction rollback

StoredItem 중 하나 invalid:

- Seller 신규 생성도 rollback
- SaleRequest 없음
- StoredItem 없음

## paused

```text
create_sale_request 실패
신규 Seller 0
신규 SaleRequest 0
신규 StoredItem 0
```

## closed

위와 동일.

## 설정 row 누락/오류

신청을 허용하지 않음.

---

# 13. Integration — Admin 상태 처리

## start_contact

```text
received → contacting 성공
contacting → received 불가
completed → contacting 불가
```

## process_stored_item purchased

- evidence 필수
- pending에서만 가능
- 처리 후 재변경 불가

## rejected

- reason 필수
- pending에서만 가능
- 처리 후 재변경 불가

## 자동 completed

마지막 pending item 처리 후 parent SaleRequest가 completed.

---

# 14. Integration — Admin Auth and Recruitment

## Admin Auth

단일 Supabase Auth 관리자 계정만 Admin Edge Function을 호출할 수 있다.

- `Authorization` 헤더 없음 → 401
- 유효하지 않은 access token → 401
- 허용되지 않은 Auth user → 403
- `ADMIN_USER_ID`와 일치하는 user → 주요 action 성공
- 브라우저 bundle에 service role key / Admin credential 없음

## Recruitment Admin

Admin 경유 상태 변경:

```text
open → paused
paused → open
open → closed
closed → open
```

가능.

잘못된 status:

- DB 변경 없음

---

# 15. Integration — Storage

## sale-evidence anon

- 신규 제한 upload 허용
- list/read/update/delete 차단

## purchase-evidence anon

- upload/read 차단

Admin Signed URL:

- 유효한 Admin 요청에서 생성 가능

---

# 16. Integration — Experiment Metrics

Seed 데이터를 넣고 `get_experiment_metrics` 또는 Edge action 결과를 검증한다.

반드시 포함:

- total SaleRequest
- unique Seller
- repeat Seller
- purchased StoredItem
- completed SaleRequest
- asking price counts
- price ratio buckets
- convenience_store counts
- promotion_type counts
- request status counts
- item result counts
- recruitment status

개인정보가 response에 포함되지 않는지 확인한다.

금지 field 예:

```text
contact_value
evidence_image
purchase_evidence
```

---

# 17. 테스트하지 않을 대상

특별한 이유가 없다면 테스트하지 않는다.

- 색상 값
- Margin/Padding
- Radius
- 정적 제목/설명
- 단순 Card Wrapper
- 단순 Badge
- 단순 Router wrapper
- 모든 Empty state 문구
- Snapshot 대량 생성
- 디자인 토큰 값

---

# 18. TDD 규칙

핵심 로직/서비스:

```text
1. 실패 테스트 작성
2. 의도한 이유로 실패 확인
3. 최소 구현
4. 해당 테스트 PASS
5. 관련 전체 테스트 PASS
6. 필요한 경우 리팩터링
```

Production code를 먼저 작성한 뒤 테스트를 맞추지 않는다.

---

# 19. 우선순위

## P0

- Seller 연락처 정규화
- 가격/날짜 검증
- StoredItem result 규칙
- 모집 상태 검증
- create_sale_request transaction
- paused/closed 신청 차단
- 구매/거절 불변성
- 자동 completed
- RLS
- Admin Auth
- Private Storage

## P1

- Service 호출 순서
- Experiment metrics 집계
- duplicate submit
- recruitment UI behavior

## P2

- 단순 UI interaction

---

# 20. 완료 기준

최종 단계에서 다음이 모두 통과해야 한다.

```text
npm test
npm run test:integration
npm run build
```

환경 문제로 Integration을 실행하지 못하면 성공으로 기록하지 않는다.

`[!] Blocked`로 기록하고 실제 오류를 남긴다.
