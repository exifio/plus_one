# PRD — +1 판매자 검증 MVP

## 0. 문서 목적

이 문서는 편의점 앱에 남아 있는 1+1 / 2+1 보관상품을 실제로 판매하려는 사람이 존재하는지 검증하기 위한 MVP 서비스 `+1`의 제품 요구사항을 정의한다.

현재 목표는 완성된 C2C 거래 플랫폼을 만드는 것이 아니다.

> 실제 보관상품을 가진 사용자가 상품 정보, 판매 희망 가격, 보관 증빙, 연락처를 남기고 판매 신청까지 완료하는가?

이 질문에 답할 수 있는 최소한의 판매자 흐름과 운영자 도구만 만든다.

---

# 1. 핵심 검증 가설

검증 신호의 우선순위는 다음과 같다.

## Level 1 — 핵심 신호

유효한 `SaleRequest`가 실제로 제출된다.

유효한 신청은 최소 다음을 포함한다.

- 편의점
- 행사 유형
- StoredItem 1개 이상
- 각 상품의 상품명
- 유효기간(선택 입력)
- 행사 당시 가격
- 판매 희망 가격
- 보관상품 증빙 이미지 1장
- 연락 방법과 연락처

## Level 2 — 강한 신호

운영자 연락 이후 StoredItem이 실제 `purchased` 처리된다.

## Level 3 — 반복 가능성 신호

동일 Seller가 새로운 SaleRequest를 다시 제출한다.

이 신호는 참고 지표이며 MVP GO/NO-GO의 단독 기준으로 사용하지 않는다.

---

# 2. 사용자

## 판매자

- 회원가입/로그인 없음
- 편의점 앱에 남아 있는 보관상품을 판매하려는 사용자
- 상품 정보와 판매 희망 가격을 직접 입력
- 보관상품 화면 스크린샷 1장을 제출
- 연락 방법은 휴대폰 또는 카카오톡 중 하나만 선택

## 운영자

- 한 명만 존재하며 Supabase Auth 관리자 계정 1개로 접근한다.
- 공개 관리자 회원가입은 제공하지 않는다.
- 판매 신청 확인
- 판매자 연락 시작 기록
- 상품별 구매 또는 거절 처리
- 모집 상태 제어
- 핵심 실험 지표 확인

구매자용 회원/상품 탐색 기능은 이번 MVP에 포함하지 않는다.

---

# 3. 판매자 플로우

판매 등록은 5단계로 유지한다.

```text
홈
↓
1. 판매 조건
↓
2. 상품 등록
↓
3. 보관상품 확인
↓
4. 연락처
↓
5. 신청 확인
↓
신청 완료
```

## 3.1 판매 조건

필수 선택:

- 편의점: `GS25 | CU`
- 행사 유형: `1+1 | 2+1`

한 SaleRequest에서는 하나의 편의점과 하나의 행사 유형만 사용할 수 있다.

## 3.2 상품 등록

StoredItem 1개당 다음을 입력한다.

- 상품명
- 유효기간(선택 입력)
- 행사 당시 가격
- 판매 희망 가격

한 SaleRequest에는 StoredItem이 최소 1개 존재해야 한다.

상품은 제출 전 여러 개 추가/삭제할 수 있다.

StoredItem 하나는 보관상품 1개이며 `quantity` 필드를 만들지 않는다.

## 3.3 보관상품 확인

SaleRequest당 스크린샷 1장을 필수로 제출한다.

이미지 OCR, QR 판독, 자동 상품 추출은 하지 않는다.

## 3.4 연락처

연락 방식:

- `phone`
- `kakao`

둘 중 정확히 하나를 선택한다.

Seller는 `contact_type + contact_value` 조합으로 식별한다.

## 3.5 신청 확인 및 제출

사용자가 입력한 내용을 최종 확인한다.

최종 CTA:

> 판매 신청하기

이 행동이 1차 핵심 검증 행동이다.

---

# 4. 가격과 유효기간 규칙

## 가격

`original_price`, `asking_price`는 모두 원 단위 양의 정수다.

- 0 불가
- 음수 불가
- 소수 불가
- `asking_price > original_price` 허용

판매자의 실제 희망 가격 자체를 보존하는 것이 목적이므로 임의 상한을 두지 않는다.

따라서 `무상 양도(0원)`은 현재 제품 규칙상 존재하지 않는다.

## 유효기간

기준 Timezone:

```text
Asia/Seoul
```

- 유효기간은 입력하지 않아도 등록 가능
- 입력한 과거 날짜: 등록 불가
- 입력한 오늘 날짜: 등록 가능
- 입력한 미래 날짜: 등록 가능

---

# 5. 데이터 모델

핵심 거래 데이터 모델:

```text
Seller
  │ 1:N
  ▼
SaleRequest
  │ 1:N
  ▼
StoredItem
```

운영 전역 상태를 위해 `RecruitmentSettings` singleton을 추가한다.

실험 지표를 저장하는 별도 Analytics/Metric 테이블은 만들지 않는다.

---

# 6. Seller

필드:

- `seller_id` UUID
- `contact_type`: `phone | kakao`
- `contact_value`
- `created_at`

동일 Seller 판단:

```text
contact_type + normalized contact_value
```

휴대폰 번호는 저장 전 정규화한다.

카카오톡 연락 정보는 앞뒤 공백만 제거하며 임의 소문자화 같은 추측성 변환은 하지 않는다.

---

# 7. SaleRequest

필드:

- `sale_request_id` UUID
- `seller_id` FK
- `convenience_store`: `gs25 | cu`
- `promotion_type`: `one_plus_one | two_plus_one`
- `status`: `received | contacting | completed`
- `evidence_image`
- `created_at`

상태 의미:

- `received`: 판매자가 제출함
- `contacting`: 운영자가 판매자에게 첫 연락을 시작함
- `completed`: 포함된 모든 StoredItem 처리가 최종 완료됨

한 신청에서 편의점/행사 유형을 섞을 수 없다.

---

# 8. StoredItem

필드:

- `stored_item_id` UUID
- `sale_request_id` FK
- `product_name`
- `expiration_date` DATE NULL
- `original_price` INTEGER
- `asking_price` INTEGER
- `result`: `pending | purchased | rejected`
- `rejection_reason`
- `purchase_evidence`
- `created_at`

결과 규칙:

```text
pending
→ rejection_reason = null
→ purchase_evidence = null

purchased
→ purchase_evidence 필수
→ rejection_reason = null

rejected
→ rejection_reason 필수
→ purchase_evidence = null
```

`purchased`, `rejected`는 MVP에서 되돌리거나 수정할 수 없다.

모든 StoredItem이 `purchased` 또는 `rejected`가 되면 SaleRequest는 자동 `completed`가 된다.

---

# 9. 판매자 모집 관리

서비스 전체에는 하나의 모집 상태만 존재한다.

DB/API 값:

```text
open
paused
closed
```

UI 의미:

- `open` → 모집 중
- `paused` → 일시중지
- `closed` → 마감

## open

- 홈 CTA 활성화
- `/sell` 접근 가능
- 최종 SaleRequest 생성 가능

## paused

- 신규 판매 등록 시작 불가
- `/sell` 직접 접근 시 Form 미노출
- 이미 등록 화면을 열었어도 최종 제출 시 생성 거부
- 다시 `open`으로 변경 가능

## closed

- 신규 판매 등록 시작 불가
- `/sell` 직접 접근 시 Form 미노출
- 최종 SaleRequest 생성 거부

`paused`와 `closed`는 기능적으로 신규 신청을 차단하지만 사용자 안내 문구는 구분한다.

## 최종 강제 규칙

프론트엔드 상태와 무관하게 `create_sale_request`는 현재 모집 상태가 `open`일 때만 성공해야 한다.

설정 Row 누락 또는 모집 상태 조회 실패 시 신청을 허용하는 방향으로 fallback하지 않는다.

## 즉시 반영의 정의

- Admin 저장 성공 직후 DB 상태가 변경된다.
- 이후 Home 또는 `/sell` 진입에서 최신 상태를 사용한다.
- 이미 열린 판매 화면도 최종 제출 시 Backend에서 최신 상태를 다시 검사한다.
- Realtime subscription/polling은 현재 MVP에 포함하지 않는다.

---

# 10. Admin 정보 구조

Admin 주요 영역은 다음 세 가지다.

```text
판매 신청
모집 관리
실험 현황
```

Sidebar를 새로 만들지 않는다.

기존 Admin Header 안에서 최소한의 상단 Navigation 또는 동일 수준의 route 접근 방법을 제공한다.

주요 route:

```text
/admin
/admin/:saleRequestId
/admin/recruitment
/admin/experiment
/admin/login
```

---

# 11. Admin — 판매 신청

## 신청 목록

최소 정보:

- 신청 시점
- 편의점 / 행사 유형
- 상품 개수
- 연락 방식
- 상태

상태 필터:

```text
전체
접수됨
연락중
처리완료
```

초기 MVP에서 검색/날짜 필터는 만들지 않는다.

## 신청 상세

최소 정보:

- 판매 조건
- Seller 연락 정보
- 판매 증빙 이미지
- StoredItem 목록
- 각 상품 가격/유효기간/처리 결과

## 연락 시작

```text
received → contacting
```

사이트 내 메시지 전송 기능은 아니다.

## 구매

`purchase_evidence`가 반드시 필요하다.

## 거절

`rejection_reason`이 반드시 필요하다.

---

# 12. Admin — 모집 관리

Route:

```text
/admin/recruitment
```

페이지 역할:

> 판매자 신청 접수를 운영자가 직접 open / paused / closed로 제어한다.

구성:

1. 현재 상태 카드
2. 상태 변경 카드

상태 선택만으로 저장하지 않는다.

```text
상태 선택
↓
변경 사항 저장
↓
성공 후 현재 상태 갱신
```

`open → paused`, `open → closed`처럼 신규 신청을 차단하는 변경에는 기존 Admin 확인 Dialog 패턴을 재사용할 수 있다.

여러 관리자나 범용 관리자 권한 시스템은 만들지 않는다. 단일 Supabase Auth 관리자 계정만 허용한다.

---

# 13. Admin — 실험 현황

Route:

```text
/admin/experiment
```

이 화면은 일반적인 BI/통계 Dashboard가 아니라 **이번 MVP의 핵심 검증 질문에 답하기 위한 읽기 전용 운영 화면**이다.

별도의 Analytics DB나 이벤트 추적 시스템을 추가하지 않는다.

Supabase의 현재 운영 데이터를 조회해 즉시 계산한다.

## 13.1 상단

- 제목: `실험 현황`
- 현재 모집 상태 Badge

## 13.2 핵심 요약 카드

최소 4개:

1. 전체 판매 신청 수
2. 고유 판매자 수
3. 실제 구매 상품 수
4. 처리 완료 신청 수

추가 핵심 신호로 재신청 판매자 수를 하단 분석 항목에서 보여준다.

## 13.3 분석 항목

### 판매 희망금액 분포

`asking_price`별 신청 상품 수를 집계한다.

데이터가 적은 MVP이므로 복잡한 차트는 필수가 아니다. 표/단순 목록으로 충분하다.

### 희망가격 비율 분포 — 분석용

다음 값을 사용한다.

```text
asking_price / original_price × 100
```

권장 구간:

```text
25% 이하
26~50%
51~75%
76~100%
100% 초과
```

이 비율은 판매자 UI에 노출하거나 가격 제안에 사용하지 않는다.

### 편의점별 신청 수

- GS25
- CU

### 행사 유형별 신청 수

- 1+1
- 2+1

### 신청 상태별 수

- received
- contacting
- completed

### 상품 처리 결과별 수

- pending
- purchased
- rejected

### 재신청 판매자 수

SaleRequest가 2개 이상인 Seller 수를 표시한다.

## 13.4 제외하는 지표

현재 데이터 모델과 맞지 않거나 의미 없는 항목은 만들지 않는다.

- `무상 양도(0원)` — asking_price가 양의 정수이므로 존재하지 않음
- `유상 판매 의향` — 모든 유효 StoredItem이 유상 판매이므로 독립 지표 가치가 낮음
- `등록 방식별 신청 수` — 현재 등록 방식 필드가 없음
- 방문자 수 — Vercel Web Analytics에서 확인하며 Admin 실험 현황에 별도 연동하지 않음

## 13.5 Empty State

집계 데이터가 없으면 숫자는 `0`, 분포/목록은 다음처럼 표시한다.

> 데이터가 없어요.

가짜 데이터로 화면을 채우지 않는다.

---

# 14. 핵심 측정 지표

외부 유입:

- 방문자 수 — Vercel Web Analytics
- Page Views — 보조 지표

제품 내부 행동:

- 전체 SaleRequest 수
- 고유 Seller 수
- 전체 StoredItem 수
- purchased StoredItem 수
- rejected StoredItem 수
- completed SaleRequest 수
- asking_price 분포
- 희망가격 비율 분포
- repeat Seller 수

현재 단계에서 임의의 숫자 GO/NO-GO threshold를 정하지 않는다.

유입 규모와 채널이 정해진 뒤 행동 데이터를 함께 보고 판단한다.

---

# 15. 오류 처리

판매자:

- 입력 오류 → 필드 근처 표시
- 이미지 업로드 실패 → 현재 단계 유지 + 재시도
- 모집 상태 조회 실패 → 신규 신청을 허용하지 않고 안전한 오류 안내
- RPC 실패 → 완료 화면 이동 금지
- 중복 제출 방지

Admin:

- 상태 변경 실패 → 기존 상태 유지
- 지표 조회 실패 → 오류 상태 표시, 가짜 0 데이터로 성공처럼 보이지 않음
- Supabase 원본 오류를 그대로 노출하지 않음

---

# 16. 이번 MVP에서 만들지 않는 것

- 판매자 로그인 / 회원가입
- 공개 관리자 회원가입
- 마이페이지
- 판매 신청 조회 / 취소
- 구매자 회원
- 구매자 상품 목록
- 플랫폼 내 결제 / 정산
- 채팅
- 상품 마스터
- 상품 검색 / 자동완성
- 가격 추천 / 자동 협상
- QR OCR / 이미지 OCR
- 알림센터 / Push / Email
- 여러 관리자
- 여러 관리자 계정 / 범용 관리자 역할 시스템
- 연락 이력 / 상태 변경 이력
- 모집 시작/종료 예약
- 자동 모집 오픈/마감
- 모집 인원 제한
- 편의점별/행사별 별도 모집 상태
- Realtime subscription / polling
- 범용 BI Dashboard
- 별도 Analytics DB
- PostHog

단, `실험 현황`은 범용 Dashboard가 아니라 현재 MVP 검증에 필요한 최소 운영 화면이므로 포함한다.

---

# 17. 완료 기준

MVP가 완료되려면 다음이 가능해야 한다.

## 판매자

- open 상태에서 5단계 판매 신청 완료
- paused/closed 상태에서 신규 신청 차단
- `/sell` 직접 접근 보호
- 최종 Backend 신청 차단 규칙 적용

## Admin

- 신청 목록/상세 조회
- 연락 시작
- 상품 구매/거절
- 자동 completed
- 모집 상태 변경
- 실험 현황 조회

## 기술

- 핵심 Unit Test 통과
- Supabase Integration Test 통과
- RLS/Private Storage 검증
- Production Build 통과
- service_role / Admin Auth credential 브라우저 비노출
