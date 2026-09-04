# +1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 편의점 앱에 남아 있는 GS25/CU 1+1·2+1 보관상품을 실제로 판매하려는 사용자가 판매 신청을 완료하고, 운영자가 실제 연락·구매·거절 결과까지 처리할 수 있는 모바일 퍼스트 MVP를 구축한다.

**Architecture:** React + Vite + JavaScript로 판매자/운영자 UI를 만들고, 핵심 비즈니스 규칙은 React 밖의 순수 JavaScript Domain 모듈로 분리한다. Supabase PostgreSQL RPC와 Constraint가 판매 신청 Transaction, Seller 식별, 상품 처리 상태 무결성을 최종 보장하며, 증빙 이미지는 Private Storage에 저장한다. Admin은 단일 운영자만 사용하며 Supabase Edge Function을 통해 민감한 데이터와 관리 작업을 보호한다.

**Tech Stack:** React, Vite, JavaScript, React Router, Supabase PostgreSQL, Supabase Storage, Supabase Edge Functions, Jest, React Testing Library, Vercel Web Analytics

**Spec:** `docs/PRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`

## Global Constraints

- 기존 프로젝트 코드를 참고하지 않고 새 프로젝트로 구축한다.
- 프론트엔드는 React + Vite + JavaScript로 작성한다.
- 판매자 로그인/회원가입/마이페이지/신청 조회/신청 취소는 만들지 않는다.
- 편의점은 GS25와 CU만 지원한다.
- 행사 유형은 1+1과 2+1만 지원한다.
- 한 SaleRequest 안에서는 편의점과 행사 유형을 하나로 고정한다.
- Seller는 `contact_type + contact_value` 조합으로 식별한다.
- StoredItem 하나는 보관상품 1개이며 `quantity`를 만들지 않는다.
- StoredItem의 최종 결과는 한 번 `purchased` 또는 `rejected`가 되면 변경하지 않는다.
- `purchased`에는 구매 증빙이 반드시 필요하다.
- `rejected`에는 거절 이유가 반드시 필요하다.
- 모든 StoredItem이 최종 처리되면 SaleRequest는 자동으로 `completed`가 된다.
- 운영자는 한 명이며 별도의 관리자 테이블/권한 시스템은 만들지 않는다.
- UI보다 비즈니스 규칙과 데이터 무결성을 우선해 Jest 테스트를 작성한다.
- 전체 Coverage 목표는 두지 않는다.
- 모바일 퍼스트로 구현하고 판매 등록 CTA는 모바일에서 하단 고정한다.
- 유효기간의 '오늘' 판단은 한국 서비스 기준 `Asia/Seoul` 날짜를 사용한다.
- Admin은 데스크탑 정보 밀도를 허용하되 기능은 신청 목록/상세/연락 시작/구매/거절로 제한한다.
- PostHog, 결제, 정산, 채팅, 알림센터, 상품 마스터, 가격 추천은 추가하지 않는다.

## Platform Note — 2026-09-04

현재 Supabase 공식 문서 기준으로 Edge Functions는 Deno 기반 TypeScript로 생성·운영한다. 따라서 **프론트엔드 및 일반 애플리케이션 코드는 JavaScript로 유지하되 `supabase/functions/admin-api/index.ts`만 플랫폼 요구에 따른 TypeScript 예외**로 둔다. 이 예외 외에 TypeScript를 프로젝트에 도입하지 않는다.

Vite SPA를 Vercel에 배포할 때 React Router의 deep link가 동작하도록 `vercel.json`에서 모든 경로를 `/index.html`로 rewrite한다. 방문 수와 `/sell` 진입 수는 별도 분석 백엔드를 만들지 않고 Vercel Web Analytics의 page view를 사용한다.

---

## Planned File Structure

```text
.
├─ docs/
│  ├─ PRD.md
│  ├─ DESIGN.md
│  ├─ ARCHITECTURE.md
│  └─ TESTING.md
├─ src/
│  ├─ app/
│  │  ├─ App.jsx
│  │  └─ router/AppRouter.jsx
│  ├─ features/
│  │  ├─ sale-request/
│  │  │  ├─ pages/
│  │  │  │  ├─ HomePage.jsx
│  │  │  │  ├─ SellPage.jsx
│  │  │  │  └─ SellCompletePage.jsx
│  │  │  ├─ components/
│  │  │  │  ├─ SellLayout.jsx
│  │  │  │  ├─ ConditionsStep.jsx
│  │  │  │  ├─ StoredItemsStep.jsx
│  │  │  │  ├─ EvidenceStep.jsx
│  │  │  │  ├─ ContactStep.jsx
│  │  │  │  ├─ ReviewStep.jsx
│  │  │  │  ├─ StoredItemFormCard.jsx
│  │  │  │  └─ EvidenceUploader.jsx
│  │  │  ├─ state/
│  │  │  │  └─ saleRequestReducer.js
│  │  │  ├─ domain/
│  │  │  │  ├─ normalizeSellerContact.js
│  │  │  │  ├─ validatePrice.js
│  │  │  │  ├─ validateExpirationDate.js
│  │  │  │  ├─ validateStoredItem.js
│  │  │  │  ├─ validateSaleRequest.js
│  │  │  │  ├─ validateStoredItemResult.js
│  │  │  │  ├─ isSaleRequestCompleted.js
│  │  │  │  └─ transformSaleRequestPayload.js
│  │  │  ├─ services/
│  │  │  │  └─ submitSaleRequest.js
│  │  │  └─ api/
│  │  │     ├─ saleRequestApi.js
│  │  │     └─ saleEvidenceStorage.js
│  │  └─ admin/
│  │     ├─ pages/
│  │     │  ├─ AdminListPage.jsx
│  │     │  └─ AdminDetailPage.jsx
│  │     ├─ components/
│  │     │  ├─ AdminAccessGate.jsx
│  │     │  ├─ SaleRequestListItem.jsx
│  │     │  ├─ StoredItemAdminCard.jsx
│  │     │  ├─ PurchaseDialog.jsx
│  │     │  └─ RejectDialog.jsx
│  │     ├─ services/
│  │     │  ├─ startContact.js
│  │     │  ├─ purchaseStoredItem.js
│  │     │  └─ rejectStoredItem.js
│  │     └─ api/
│  │        └─ adminApi.js
│  ├─ shared/
│  │  ├─ components/
│  │  │  ├─ Button.jsx
│  │  │  ├─ Input.jsx
│  │  │  ├─ SelectionCard.jsx
│  │  │  └─ StatusBadge.jsx
│  │  ├─ lib/
│  │  │  └─ supabaseClient.js
│  │  └─ utils/
│  │     └─ formatters.js
│  ├─ styles/
│  │  ├─ tokens.css
│  │  └─ global.css
│  ├─ test/setup.js
│  └─ main.jsx
├─ supabase/
│  ├─ migrations/
│  │  ├─ 001_initial_schema.sql
│  │  ├─ 002_create_sale_request_rpc.sql
│  │  ├─ 003_storage_policies.sql
│  │  └─ 004_admin_rpcs.sql
│  └─ functions/
│     └─ admin-api/
│        └─ index.ts
├─ tests/
│  └─ integration/
│     └─ supabase/
│        ├─ clients.js
│        ├─ createSaleRequest.test.js
│        ├─ processStoredItem.test.js
│        ├─ startContact.test.js
│        ├─ rls.test.js
│        └─ adminEdgeFunction.test.js
├─ babel.config.cjs
├─ jest.config.cjs
├─ vercel.json
└─ package.json
```

---

### Task 1: 프로젝트 기반 + Jest + Seller 연락처 정규화

**Files:**
- Create: `src/features/sale-request/domain/normalizeSellerContact.js`
- Create: `src/features/sale-request/domain/normalizeSellerContact.test.js`
- Create: `src/test/setup.js`
- Create: `babel.config.cjs`
- Create: `jest.config.cjs`
- Modify: `package.json`
- Modify: `src/main.jsx`

**Interfaces:**
- Consumes: 없음
- Produces: `normalizeSellerContact(contactType, contactValue) -> string`

- [ ] **Step 1: React/Vite 프로젝트와 필수 의존성 설치**

Run:

```bash
npm create vite@latest . -- --template react
npm install react-router-dom @supabase/supabase-js @vercel/analytics
npm install --save-dev jest jest-environment-jsdom babel-jest @babel/core @babel/preset-env @babel/preset-react @testing-library/react @testing-library/jest-dom @testing-library/user-event supabase dotenv
```

`package.json` scripts에 다음을 넣는다.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:integration": "jest tests/integration --runInBand"
  }
}
```

- [ ] **Step 2: Jest/Babel 설정 작성**

`babel.config.cjs`:

```js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
```

`jest.config.cjs`:

```js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
};
```

`src/test/setup.js`:

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 3: 실패하는 Seller 정규화 테스트 작성**

`src/features/sale-request/domain/normalizeSellerContact.test.js`:

```js
import { normalizeSellerContact } from './normalizeSellerContact';

describe('normalizeSellerContact', () => {
  test.each([
    ['010-1234-5678', '01012345678'],
    ['010 1234 5678', '01012345678'],
    ['01012345678', '01012345678'],
  ])('휴대폰 번호 %s를 %s로 정규화한다', (input, expected) => {
    expect(normalizeSellerContact('phone', input)).toBe(expected);
  });

  test('카카오톡 연락처는 앞뒤 공백만 제거한다', () => {
    expect(normalizeSellerContact('kakao', '  seller-id  ')).toBe('seller-id');
  });

  test('빈 연락처는 빈 문자열로 반환한다', () => {
    expect(normalizeSellerContact('phone', '   ')).toBe('');
  });
});
```

- [ ] **Step 4: 테스트가 실패하는지 확인**

Run:

```bash
npm test -- src/features/sale-request/domain/normalizeSellerContact.test.js --runInBand
```

Expected: `normalizeSellerContact` 모듈이 없어서 FAIL.

- [ ] **Step 5: 최소 구현 작성**

`src/features/sale-request/domain/normalizeSellerContact.js`:

```js
export function normalizeSellerContact(contactType, contactValue) {
  const trimmed = String(contactValue ?? '').trim();

  if (!trimmed) return '';
  if (contactType === 'phone') return trimmed.replace(/\D/g, '');
  if (contactType === 'kakao') return trimmed;

  return trimmed;
}
```

- [ ] **Step 6: 테스트와 빌드 확인**

Run:

```bash
npm test -- src/features/sale-request/domain/normalizeSellerContact.test.js --runInBand
npm run build
```

Expected: 모두 PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json babel.config.cjs jest.config.cjs src
 git commit -m "chore: initialize React app and Jest domain tests"
```

---

### Task 2: 핵심 Domain Validation과 DB Payload 변환

**Files:**
- Create: `src/features/sale-request/domain/validatePrice.js`
- Create: `src/features/sale-request/domain/validatePrice.test.js`
- Create: `src/features/sale-request/domain/validateExpirationDate.js`
- Create: `src/features/sale-request/domain/validateExpirationDate.test.js`
- Create: `src/features/sale-request/domain/validateStoredItem.js`
- Create: `src/features/sale-request/domain/validateStoredItem.test.js`
- Create: `src/features/sale-request/domain/validateSaleRequest.js`
- Create: `src/features/sale-request/domain/validateSaleRequest.test.js`
- Create: `src/features/sale-request/domain/validateStoredItemResult.js`
- Create: `src/features/sale-request/domain/validateStoredItemResult.test.js`
- Create: `src/features/sale-request/domain/isSaleRequestCompleted.js`
- Create: `src/features/sale-request/domain/isSaleRequestCompleted.test.js`
- Create: `src/features/sale-request/domain/transformSaleRequestPayload.js`
- Create: `src/features/sale-request/domain/transformSaleRequestPayload.test.js`

**Interfaces:**
- Consumes: `normalizeSellerContact(contactType, contactValue)`
- Produces:
  - `validatePrice(value) -> { valid, message }`
  - `validateExpirationDate(value, today) -> { valid, message }`
  - `validateStoredItem(item, today) -> { valid, errors }`
  - `validateSaleRequest(draft, today) -> { valid, errors }`
  - `validateStoredItemResult(input) -> { valid, message }`
  - `isSaleRequestCompleted(results) -> boolean`
  - `transformSaleRequestPayload(draft, evidencePath) -> object`

- [ ] **Step 1: 가격/유효기간 실패 테스트 작성**

`validatePrice.test.js` 핵심 케이스:

```js
import { validatePrice } from './validatePrice';

test.each([
  [1000, true],
  [1, true],
  [0, false],
  [-1, false],
  [1.5, false],
  ['abc', false],
  ['', false],
])('가격 %p의 유효성은 %p다', (value, expected) => {
  expect(validatePrice(value).valid).toBe(expected);
});
```

`validateExpirationDate.test.js`:

```js
import { validateExpirationDate } from './validateExpirationDate';

const today = '2026-09-04';

test('어제 만료된 상품은 거부한다', () => {
  expect(validateExpirationDate('2026-09-03', today).valid).toBe(false);
});

test('오늘 만료되는 상품은 허용한다', () => {
  expect(validateExpirationDate('2026-09-04', today).valid).toBe(true);
});

test('내일 만료되는 상품은 허용한다', () => {
  expect(validateExpirationDate('2026-09-05', today).valid).toBe(true);
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/features/sale-request/domain --runInBand
```

Expected: 새 Validation 모듈이 없어서 FAIL.

- [ ] **Step 3: 가격/유효기간 최소 구현**

```js
export function validatePrice(value) {
  const valid = Number.isInteger(value) && value > 0;
  return {
    valid,
    message: valid ? null : '0보다 큰 원 단위 정수를 입력해주세요.',
  };
}
```

```js
export function validateExpirationDate(value, today) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today;
  return {
    valid,
    message: valid ? null : '이미 유효기간이 지난 상품은 등록할 수 없어요.',
  };
}
```

- [ ] **Step 4: StoredItem/SaleRequest/Result/완료 판단 테스트 작성**

`isSaleRequestCompleted.test.js`:

```js
import { isSaleRequestCompleted } from './isSaleRequestCompleted';

test.each([
  [['purchased'], true],
  [['rejected'], true],
  [['purchased', 'rejected'], true],
  [['purchased', 'pending'], false],
  [['rejected', 'pending'], false],
  [['pending'], false],
  [[], false],
])('results=%p의 완료 여부는 %p다', (results, expected) => {
  expect(isSaleRequestCompleted(results)).toBe(expected);
});
```

`validateStoredItemResult.test.js`:

```js
import { validateStoredItemResult } from './validateStoredItemResult';

test('구매는 구매 증빙이 필요하다', () => {
  expect(validateStoredItemResult({
    result: 'purchased',
    purchaseEvidence: null,
    rejectionReason: null,
  }).valid).toBe(false);
});

test('거절은 거절 이유가 필요하다', () => {
  expect(validateStoredItemResult({
    result: 'rejected',
    purchaseEvidence: null,
    rejectionReason: '',
  }).valid).toBe(false);
});

test('미처리 상태에는 구매 증빙과 거절 이유가 없어야 한다', () => {
  expect(validateStoredItemResult({
    result: 'pending',
    purchaseEvidence: 'path/image.jpg',
    rejectionReason: null,
  }).valid).toBe(false);
});
```

`validateStoredItem.test.js`와 `validateSaleRequest.test.js`에는 다음 정상 입력을 기준 fixture로 사용한다.

```js
export const validDraft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  items: [{
    productName: '코카콜라 제로 500ml',
    expirationDate: '2026-09-30',
    originalPrice: 2200,
    askingPrice: 1000,
  }],
  evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
  contactType: 'phone',
  contactValue: '010-1234-5678',
};
```

반드시 다음 케이스를 각각 별도 테스트로 작성한다.

```text
StoredItem
- 상품명 없음 -> 실패
- 유효기간 없음 -> 실패
- 과거 유효기간 -> 실패
- originalPrice <= 0 -> 실패
- askingPrice <= 0 -> 실패
- askingPrice > originalPrice -> 성공

SaleRequest
- gs25 -> 성공
- cu -> 성공
- 다른 편의점 -> 실패
- one_plus_one -> 성공
- two_plus_one -> 성공
- 다른 행사 유형 -> 실패
- items 0개 -> 실패
- evidenceImage 없음 -> 실패
- phone/kakao 이외 contactType -> 실패
- contactValue 빈 값 -> 실패
```

- [ ] **Step 5: Domain 최소 구현 작성**

`isSaleRequestCompleted.js`:

```js
export function isSaleRequestCompleted(results) {
  if (!Array.isArray(results) || results.length === 0) return false;
  return results.every((result) => result === 'purchased' || result === 'rejected');
}
```

`validateStoredItemResult.js`:

```js
export function validateStoredItemResult({ result, purchaseEvidence, rejectionReason }) {
  if (result === 'pending') {
    const valid = !purchaseEvidence && !rejectionReason;
    return { valid, message: valid ? null : '미처리 상품에는 처리 정보가 없어야 합니다.' };
  }

  if (result === 'purchased') {
    const valid = Boolean(purchaseEvidence) && !rejectionReason;
    return { valid, message: valid ? null : '구매 상품에는 구매 증빙만 필요합니다.' };
  }

  if (result === 'rejected') {
    const valid = Boolean(String(rejectionReason ?? '').trim()) && !purchaseEvidence;
    return { valid, message: valid ? null : '거절 상품에는 거절 이유만 필요합니다.' };
  }

  return { valid: false, message: '알 수 없는 처리 결과입니다.' };
}
```

`transformSaleRequestPayload.js`는 snake_case DB payload로 변환한다.

```js
import { normalizeSellerContact } from './normalizeSellerContact';

export function transformSaleRequestPayload(draft, evidencePath) {
  return {
    contact_type: draft.contactType,
    contact_value: normalizeSellerContact(draft.contactType, draft.contactValue),
    convenience_store: draft.convenienceStore,
    promotion_type: draft.promotionType,
    evidence_image: evidencePath,
    items: draft.items.map((item) => ({
      product_name: item.productName.trim(),
      expiration_date: item.expirationDate,
      original_price: item.originalPrice,
      asking_price: item.askingPrice,
    })),
  };
}
```

- [ ] **Step 6: 전체 Domain 테스트 확인**

Run:

```bash
npm test -- src/features/sale-request/domain --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/sale-request/domain
 git commit -m "test: define core sale request business rules"
```

---

### Task 3: Local Supabase + 핵심 Schema + RLS Integration Harness

**Files:**
- Create: `supabase/config.toml` via CLI
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `tests/integration/supabase/clients.js`
- Create: `tests/integration/supabase/rls.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 없음
- Produces: `sellers`, `sale_requests`, `stored_items` schema와 Local Supabase Integration Test 환경

- [ ] **Step 1: Local Supabase 초기화**

Run:

```bash
npx supabase init
npx supabase start
npx supabase status -o env > .env.test.local
```

`.gitignore`에 다음을 추가한다.

```text
.env.test.local
```

- [ ] **Step 2: DB Schema migration 작성**

`001_initial_schema.sql`에 다음 SQL을 작성한다.

```sql
create table public.sellers (
  seller_id uuid primary key default gen_random_uuid(),
  contact_type text not null check (contact_type in ('phone', 'kakao')),
  contact_value text not null check (length(trim(contact_value)) > 0),
  created_at timestamptz not null default now(),
  unique (contact_type, contact_value)
);

create table public.sale_requests (
  sale_request_id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(seller_id),
  convenience_store text not null check (convenience_store in ('gs25', 'cu')),
  promotion_type text not null check (promotion_type in ('one_plus_one', 'two_plus_one')),
  status text not null default 'received' check (status in ('received', 'contacting', 'completed')),
  evidence_image text not null check (length(trim(evidence_image)) > 0),
  created_at timestamptz not null default now()
);

create table public.stored_items (
  stored_item_id uuid primary key default gen_random_uuid(),
  sale_request_id uuid not null references public.sale_requests(sale_request_id),
  product_name text not null check (length(trim(product_name)) > 0),
  expiration_date date not null,
  original_price integer not null check (original_price > 0),
  asking_price integer not null check (asking_price > 0),
  result text not null default 'pending' check (result in ('pending', 'purchased', 'rejected')),
  rejection_reason text,
  purchase_evidence text,
  created_at timestamptz not null default now(),
  constraint stored_item_result_fields_check check (
    (result = 'pending' and rejection_reason is null and purchase_evidence is null)
    or
    (result = 'purchased' and rejection_reason is null and purchase_evidence is not null and length(trim(purchase_evidence)) > 0)
    or
    (result = 'rejected' and purchase_evidence is null and rejection_reason is not null and length(trim(rejection_reason)) > 0)
  )
);

alter table public.sellers enable row level security;
alter table public.sale_requests enable row level security;
alter table public.stored_items enable row level security;

revoke all on public.sellers from anon, authenticated;
revoke all on public.sale_requests from anon, authenticated;
revoke all on public.stored_items from anon, authenticated;
```

유효기간이 현재 날짜보다 과거인지 여부는 table CHECK로 두지 않는다. 시간이 흐르면 기존 정상 Row도 과거 날짜가 되기 때문에 신규 신청 시 RPC에서만 검사한다.

- [ ] **Step 3: Integration test client 작성**

`tests/integration/supabase/clients.js`:

```js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error('Run: npx supabase status -o env > .env.test.local, then load it before integration tests.');
}

export const anonClient = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export const serviceClient = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
```

`package.json`의 `test:integration` script는 `.env.test.local`을 shell에서 로드하도록 변경한다.

```json
{
  "scripts": {
    "test:integration": "set -a && . ./.env.test.local && set +a && jest tests/integration --runInBand"
  }
}
```

- [ ] **Step 4: RLS 실패 테스트 작성**

`rls.test.js`:

```js
/** @jest-environment node */
import { anonClient } from './clients';

test.each(['sellers', 'sale_requests', 'stored_items'])('anon 사용자는 %s를 직접 조회할 수 없다', async (table) => {
  const { error } = await anonClient.from(table).select('*');
  expect(error).not.toBeNull();
});
```

- [ ] **Step 5: Migration reset 후 테스트**

Run:

```bash
npx supabase db reset
npm run test:integration -- tests/integration/supabase/rls.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase .gitignore tests package.json
 git commit -m "feat: add Supabase schema and locked-down RLS"
```

---

### Task 4: `create_sale_request` Transaction RPC

**Files:**
- Create: `supabase/migrations/002_create_sale_request_rpc.sql`
- Create: `tests/integration/supabase/createSaleRequest.test.js`
- Create: `src/features/sale-request/api/saleRequestApi.js`

**Interfaces:**
- Consumes: DB schema
- Produces:
  - PostgreSQL: `create_sale_request(p_payload jsonb) -> uuid`
  - JS: `createSaleRequest(payload) -> Promise<{ saleRequestId }>`

- [ ] **Step 1: Integration 실패 테스트 작성**

반드시 다음 네 가지를 실제 Local Supabase에서 검증한다.

```js
/** @jest-environment node */
import { anonClient, serviceClient } from './clients';

const basePayload = {
  contact_type: 'phone',
  contact_value: '01012345678',
  convenience_store: 'gs25',
  promotion_type: 'one_plus_one',
  evidence_image: 'anonymous/test/evidence.png',
  items: [{
    product_name: '코카콜라 제로 500ml',
    expiration_date: '2099-09-30',
    original_price: 2200,
    asking_price: 1000,
  }],
};

test('한 번의 RPC로 Seller, SaleRequest, StoredItem을 생성한다', async () => {
  const { data, error } = await anonClient.rpc('create_sale_request', { p_payload: basePayload });
  expect(error).toBeNull();
  expect(data).toMatch(/[0-9a-f-]{36}/);
});

test('같은 연락처의 두 신청은 Seller 한 명을 재사용한다', async () => {
  await anonClient.rpc('create_sale_request', { p_payload: basePayload });
  await anonClient.rpc('create_sale_request', { p_payload: basePayload });
  const { count } = await serviceClient.from('sellers').select('*', { count: 'exact', head: true });
  expect(count).toBe(1);
});

test('상품이 하나라도 잘못되면 전체 Transaction을 롤백한다', async () => {
  const bad = {
    ...basePayload,
    contact_value: '01099999999',
    items: [basePayload.items[0], { ...basePayload.items[0], original_price: 0 }],
  };
  const { error } = await anonClient.rpc('create_sale_request', { p_payload: bad });
  expect(error).not.toBeNull();

  const { data: seller } = await serviceClient
    .from('sellers')
    .select('*')
    .eq('contact_value', '01099999999');
  expect(seller).toHaveLength(0);
});
```

각 테스트 전/후에는 service role client로 세 테이블을 정리해 독립성을 보장한다.

- [ ] **Step 2: RPC SQL 구현**

`supabase/migrations/002_create_sale_request_rpc.sql`:

```sql
create or replace function public.create_sale_request(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_contact_type text := p_payload->>'contact_type';
  v_contact_value text;
  v_store text := p_payload->>'convenience_store';
  v_promotion text := p_payload->>'promotion_type';
  v_evidence text := trim(coalesce(p_payload->>'evidence_image', ''));
  v_seller_id uuid;
  v_sale_request_id uuid;
begin
  if v_contact_type not in ('phone', 'kakao') then
    raise exception 'invalid contact_type';
  end if;

  if v_contact_type = 'phone' then
    v_contact_value := regexp_replace(trim(coalesce(p_payload->>'contact_value', '')), '\D', '', 'g');
  else
    v_contact_value := trim(coalesce(p_payload->>'contact_value', ''));
  end if;

  if v_contact_value = '' then
    raise exception 'contact_value is required';
  end if;

  if v_store not in ('gs25', 'cu') then
    raise exception 'invalid convenience_store';
  end if;

  if v_promotion not in ('one_plus_one', 'two_plus_one') then
    raise exception 'invalid promotion_type';
  end if;

  if v_evidence = '' then
    raise exception 'evidence_image is required';
  end if;

  if jsonb_typeof(p_payload->'items') <> 'array'
     or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'at least one stored item is required';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payload->'items') item
    where trim(coalesce(item->>'product_name', '')) = ''
       or coalesce(item->>'expiration_date', '') = ''
       or coalesce(item->>'original_price', '') !~ '^[0-9]+$'
       or coalesce(item->>'asking_price', '') !~ '^[0-9]+$'
       or (item->>'original_price')::integer <= 0
       or (item->>'asking_price')::integer <= 0
       or (item->>'expiration_date')::date < (now() at time zone 'Asia/Seoul')::date
  ) then
    raise exception 'invalid stored item';
  end if;

  insert into public.sellers (contact_type, contact_value)
  values (v_contact_type, v_contact_value)
  on conflict (contact_type, contact_value)
  do update set contact_value = excluded.contact_value
  returning seller_id into v_seller_id;

  insert into public.sale_requests (
    seller_id,
    convenience_store,
    promotion_type,
    evidence_image
  )
  values (
    v_seller_id,
    v_store,
    v_promotion,
    v_evidence
  )
  returning sale_request_id into v_sale_request_id;

  insert into public.stored_items (
    sale_request_id,
    product_name,
    expiration_date,
    original_price,
    asking_price
  )
  select
    v_sale_request_id,
    trim(item->>'product_name'),
    (item->>'expiration_date')::date,
    (item->>'original_price')::integer,
    (item->>'asking_price')::integer
  from jsonb_array_elements(p_payload->'items') item;

  return v_sale_request_id;
end;
$$;

revoke all on function public.create_sale_request(jsonb) from public;
grant execute on function public.create_sale_request(jsonb) to anon;
```

이 함수 내부에서 하나라도 예외가 발생하면 PostgreSQL Transaction 전체가 롤백된다.

- [ ] **Step 3: DB reset 후 Integration Test**

Run:

```bash
npx supabase db reset
npm run test:integration -- tests/integration/supabase/createSaleRequest.test.js
```

Expected: PASS.

- [ ] **Step 4: Frontend API wrapper 작성**

`src/features/sale-request/api/saleRequestApi.js`:

```js
import { supabase } from '../../../shared/lib/supabaseClient';

export async function createSaleRequest(payload) {
  const { data, error } = await supabase.rpc('create_sale_request', {
    p_payload: payload,
  });

  if (error) throw error;
  return { saleRequestId: data };
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/002_create_sale_request_rpc.sql tests/integration/supabase/createSaleRequest.test.js src/features/sale-request/api/saleRequestApi.js
 git commit -m "feat: create sale requests atomically"
```

---

### Task 5: Private Storage + 판매자 증빙 업로드

**Files:**
- Create: `supabase/migrations/003_storage_policies.sql`
- Create: `src/features/sale-request/api/saleEvidenceStorage.js`
- Create: `src/features/sale-request/services/submitSaleRequest.js`
- Create: `src/features/sale-request/services/submitSaleRequest.test.js`
- Create: `src/shared/lib/supabaseClient.js`

**Interfaces:**
- Consumes: `validateSaleRequest`, `transformSaleRequestPayload`, `createSaleRequest`
- Produces:
  - `uploadSaleEvidence(file) -> Promise<string>`
  - `submitSaleRequest(draft, today) -> Promise<{ saleRequestId }>`

- [ ] **Step 1: Private Bucket과 Storage Policy migration 작성**

`supabase/migrations/003_storage_policies.sql`:

```sql
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'sale-evidence',
    'sale-evidence',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'purchase-evidence',
    'purchase-evidence',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "anon can upload sale evidence"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'sale-evidence'
  and (storage.foldername(name))[1] = 'anonymous'
);
```

다른 Storage policy는 만들지 않는다. 따라서 anon 사용자는 `sale-evidence`에 제한된 INSERT만 가능하고, SELECT/UPDATE/DELETE 및 `purchase-evidence` 접근은 모두 거부된다.

파일 경로는 다음 형식으로 생성한다.

```text
anonymous/<uuid>/<uuid>.<ext>
```

- [ ] **Step 2: Service 실패 테스트 작성**

`submitSaleRequest.test.js`:

```js
import { submitSaleRequest } from './submitSaleRequest';
import * as storage from '../api/saleEvidenceStorage';
import * as api from '../api/saleRequestApi';

jest.mock('../api/saleEvidenceStorage');
jest.mock('../api/saleRequestApi');

const today = '2026-09-04';

const validDraft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  items: [{
    productName: '코카콜라 제로 500ml',
    expirationDate: '2026-09-30',
    originalPrice: 2200,
    askingPrice: 1000,
  }],
  evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
  contactType: 'phone',
  contactValue: '010-1234-5678',
};

test('유효하지 않은 신청은 업로드와 RPC를 호출하지 않는다', async () => {
  await expect(submitSaleRequest({ ...validDraft, items: [] }, today)).rejects.toThrow();
  expect(storage.uploadSaleEvidence).not.toHaveBeenCalled();
  expect(api.createSaleRequest).not.toHaveBeenCalled();
});

test('이미지 업로드 실패 시 RPC를 호출하지 않는다', async () => {
  storage.uploadSaleEvidence.mockRejectedValue(new Error('upload failed'));
  await expect(submitSaleRequest(validDraft, today)).rejects.toThrow('upload failed');
  expect(api.createSaleRequest).not.toHaveBeenCalled();
});

test('업로드된 path를 포함한 payload로 RPC를 한 번 호출한다', async () => {
  storage.uploadSaleEvidence.mockResolvedValue('anonymous/a/evidence.png');
  api.createSaleRequest.mockResolvedValue({ saleRequestId: '11111111-1111-1111-1111-111111111111' });

  const result = await submitSaleRequest(validDraft, today);

  expect(api.createSaleRequest).toHaveBeenCalledTimes(1);
  expect(result.saleRequestId).toBe('11111111-1111-1111-1111-111111111111');
});
```

- [ ] **Step 3: Storage/API/Service 최소 구현**

`submitSaleRequest.js`:

```js
import { validateSaleRequest } from '../domain/validateSaleRequest';
import { transformSaleRequestPayload } from '../domain/transformSaleRequestPayload';
import { uploadSaleEvidence } from '../api/saleEvidenceStorage';
import { createSaleRequest } from '../api/saleRequestApi';

export async function submitSaleRequest(draft, today) {
  const validation = validateSaleRequest(draft, today);
  if (!validation.valid) throw new Error('INVALID_SALE_REQUEST');

  const evidencePath = await uploadSaleEvidence(draft.evidenceImage);
  const payload = transformSaleRequestPayload(draft, evidencePath);
  return createSaleRequest(payload);
}
```

Storage upload helper는 `crypto.randomUUID()` 두 개로 경로를 만든다.

- [ ] **Step 4: Unit + Integration 확인**

Run:

```bash
npm test -- src/features/sale-request/services/submitSaleRequest.test.js --runInBand
npx supabase db reset
npm run test:integration -- tests/integration/supabase/rls.test.js
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/003_storage_policies.sql src/features/sale-request src/shared/lib
 git commit -m "feat: upload private sale evidence before submission"
```

---

### Task 6: 판매 등록 State + 5단계 Seller UI

**Files:**
- Create: `src/features/sale-request/state/saleRequestReducer.js`
- Create: `src/features/sale-request/pages/HomePage.jsx`
- Create: `src/features/sale-request/pages/SellPage.jsx`
- Create: `src/features/sale-request/pages/SellCompletePage.jsx`
- Create: `src/features/sale-request/components/SellLayout.jsx`
- Create: `src/features/sale-request/components/ConditionsStep.jsx`
- Create: `src/features/sale-request/components/StoredItemsStep.jsx`
- Create: `src/features/sale-request/components/EvidenceStep.jsx`
- Create: `src/features/sale-request/components/ContactStep.jsx`
- Create: `src/features/sale-request/components/ReviewStep.jsx`
- Create: `src/features/sale-request/components/StoredItemFormCard.jsx`
- Create: `src/features/sale-request/components/EvidenceUploader.jsx`
- Create: `src/features/sale-request/pages/SellPage.test.jsx`

**Interfaces:**
- Consumes: Domain validators, `submitSaleRequest`
- Produces: `/`, `/sell`, `/sell/complete` 판매자 사용자 흐름

- [ ] **Step 1: Reducer 계약 정의**

초기 상태:

```js
export const initialSaleRequestDraft = {
  step: 1,
  convenienceStore: '',
  promotionType: '',
  items: [{
    productName: '',
    expirationDate: '',
    originalPrice: '',
    askingPrice: '',
  }],
  evidenceImage: null,
  contactType: '',
  contactValue: '',
  submitting: false,
};
```

Reducer action:

```text
SET_CONDITION
UPDATE_ITEM
ADD_ITEM
REMOVE_ITEM
SET_EVIDENCE
SET_CONTACT
NEXT_STEP
PREVIOUS_STEP
SET_SUBMITTING
RESET
```

- [ ] **Step 2: 핵심 Interaction 실패 테스트 작성**

`SellPage.test.jsx`에서는 모든 UI 문구를 테스트하지 않고 다음 두 동작만 테스트한다.

```js
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SellPage } from './SellPage';
import * as service from '../services/submitSaleRequest';

jest.mock('../services/submitSaleRequest');

test('판매 신청 중에는 최종 제출 버튼이 비활성화되어 중복 제출하지 않는다', async () => {
  let resolveRequest;
  service.submitSaleRequest.mockReturnValue(new Promise((resolve) => {
    resolveRequest = resolve;
  }));

  const validReviewDraft = {
    convenienceStore: 'gs25',
    promotionType: 'one_plus_one',
    items: [{
      productName: '코카콜라 제로 500ml',
      expirationDate: '2026-09-30',
      originalPrice: 2200,
      askingPrice: 1000,
    }],
    evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
    contactType: 'phone',
    contactValue: '010-1234-5678',
  };

  render(
    <MemoryRouter>
      <SellPage initialStep={5} initialDraft={validReviewDraft} />
    </MemoryRouter>
  );

  const button = screen.getByRole('button', { name: '판매 신청하기' });
  await userEvent.click(button);
  await userEvent.click(button);

  expect(service.submitSaleRequest).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();

  resolveRequest({ saleRequestId: '11111111-1111-1111-1111-111111111111' });
});
```

실제 테스트 파일에는 `initialDraft`를 주석이 아닌 완전한 valid fixture 객체로 작성한다.

- [ ] **Step 3: 5단계 화면 구현**

`SellPage`는 실제 Route에서는 기본값으로 실행하고, React Interaction Test에서만 초기 상태를 주입할 수 있게 다음 signature를 사용한다.

```jsx
export function SellPage({
  initialStep = 1,
  initialDraft = initialSaleRequestDraft,
}) {
  // useReducer로 draft를 관리하고 initialStep에 따라 현재 Step을 렌더링한다.
}
```

DESIGN.md의 화면 명세를 그대로 적용한다.

```text
1. ConditionsStep
   - GS25 / CU SelectionCard
   - 1+1 / 2+1 SelectionCard

2. StoredItemsStep
   - StoredItemFormCard 1개 기본
   - 상품 추가/삭제
   - 상품명/유효기간/행사가/희망가

3. EvidenceStep
   - 이미지 1장 업로드
   - 미리보기

4. ContactStep
   - 휴대폰/카카오 선택
   - contactValue 입력

5. ReviewStep
   - 모든 입력 요약
   - 판매 신청하기
```

각 단계의 CTA는 해당 단계 검증이 통과할 때만 다음 단계로 이동한다.

유효기간 검증에 전달하는 기준일은 다음처럼 한국 날짜로 만든다.

```js
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
}).format(new Date());
```

- [ ] **Step 4: 완료 화면 연결**

`submitSaleRequest()` 성공 시에만 `/sell/complete`로 이동한다.

실패 시 현재 ReviewStep을 유지하고 다음 메시지를 표시한다.

```text
판매 신청을 완료하지 못했어요.
입력한 내용을 확인한 뒤 다시 시도해주세요.
```

- [ ] **Step 5: 테스트/빌드 확인**

Run:

```bash
npm test -- src/features/sale-request --runInBand
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/sale-request
 git commit -m "feat: build five-step seller submission flow"
```

---

### Task 7: Design System + 공통 UI + 반응형 스타일

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/shared/components/Button.jsx`
- Create: `src/shared/components/Input.jsx`
- Create: `src/shared/components/SelectionCard.jsx`
- Create: `src/shared/components/StatusBadge.jsx`
- Modify: Seller UI components

**Interfaces:**
- Consumes: DESIGN.md
- Produces: `+1` 공통 UI와 모바일 퍼스트 스타일

- [ ] **Step 1: 디자인 토큰 작성**

`tokens.css`에 다음 값을 그대로 정의한다.

```css
:root {
  --color-primary: #16B8C8;
  --color-primary-dark: #087F8C;
  --color-primary-soft: #E6F8FA;
  --color-navy: #172536;
  --color-text: #344454;
  --color-sub-text: #758391;
  --color-background: #F7F9FA;
  --color-surface: #FFFFFF;
  --color-border: #E3E8EB;
  --color-success: #1D9A6C;
  --color-danger: #D95252;

  --radius-input: 12px;
  --radius-button: 14px;
  --radius-selection: 16px;
  --radius-card: 18px;

  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;
}
```

- [ ] **Step 2: 모바일 공통 Layout 구현**

필수 기준:

```text
본문 기본 16px
좌우 20px
터치 영역 최소 44px
Primary CTA 52~56px
판매 등록 최대 폭 약 560px
모바일 CTA 하단 고정
데스크탑 CTA 본문 아래 배치
```

- [ ] **Step 3: DESIGN 수동 검수**

다음 viewport에서 직접 확인한다.

```text
390 x 844
430 x 932
1440 x 900
```

검수 항목:

```text
- CTA가 입력창을 가리지 않음
- 상품 카드가 좌우 overflow하지 않음
- 데스크탑에서 Form이 과도하게 늘어나지 않음
- GS25 공식 로고/캐릭터/화면을 사용하지 않음
```

- [ ] **Step 4: 기존 테스트와 build 재확인**

Run:

```bash
npm test -- --runInBand
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/styles src/shared/components src/features/sale-request
 git commit -m "feat: apply +1 mobile-first design system"
```

---

### Task 8: Admin DB RPC — 연락 시작 / 구매 / 거절 / 자동 완료

**Files:**
- Create: `supabase/migrations/004_admin_rpcs.sql`
- Create: `tests/integration/supabase/startContact.test.js`
- Create: `tests/integration/supabase/processStoredItem.test.js`

**Interfaces:**
- Consumes: `sale_requests`, `stored_items`
- Produces:
  - `start_contact(p_sale_request_id uuid)`
  - `process_stored_item(p_stored_item_id uuid, p_result text, p_purchase_evidence text, p_rejection_reason text)`

- [ ] **Step 1: `start_contact` 실패 테스트 작성**

다음만 허용한다.

```text
received -> contacting
```

다음 호출은 실패해야 한다.

```text
contacting -> contacting 재호출
completed -> contacting
```

- [ ] **Step 2: `process_stored_item` 실패 테스트 작성**

반드시 다음을 검증한다.

```text
pending + purchased + purchase_evidence -> 성공
pending + purchased + evidence 없음 -> 실패
pending + rejected + rejection_reason -> 성공
pending + rejected + reason 없음 -> 실패
purchased -> rejected -> 실패
rejected -> purchased -> 실패
```

그리고 3개 상품 중 마지막 pending이 처리되는 순간 SaleRequest가 `completed`가 되는지 확인한다.

- [ ] **Step 3: RPC 구현**

`supabase/migrations/004_admin_rpcs.sql`:

```sql
create or replace function public.start_contact(p_sale_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select status
  into v_status
  from public.sale_requests
  where sale_request_id = p_sale_request_id
  for update;

  if not found then
    raise exception 'sale request not found';
  end if;

  if v_status <> 'received' then
    raise exception 'sale request is not received';
  end if;

  update public.sale_requests
  set status = 'contacting'
  where sale_request_id = p_sale_request_id;
end;
$$;

create or replace function public.process_stored_item(
  p_stored_item_id uuid,
  p_result text,
  p_purchase_evidence text default null,
  p_rejection_reason text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_result text;
  v_sale_request_id uuid;
  v_sale_request_status text;
  v_next_status text;
begin
  select
    i.result,
    i.sale_request_id,
    r.status
  into
    v_current_result,
    v_sale_request_id,
    v_sale_request_status
  from public.stored_items i
  join public.sale_requests r
    on r.sale_request_id = i.sale_request_id
  where i.stored_item_id = p_stored_item_id
  for update of i, r;

  if not found then
    raise exception 'stored item not found';
  end if;

  if v_current_result <> 'pending' then
    raise exception 'stored item is already finalized';
  end if;

  if v_sale_request_status <> 'contacting' then
    raise exception 'sale request is not contacting';
  end if;

  if p_result = 'purchased' then
    if trim(coalesce(p_purchase_evidence, '')) = ''
       or p_rejection_reason is not null then
      raise exception 'purchase evidence is required';
    end if;

    update public.stored_items
    set
      result = 'purchased',
      purchase_evidence = trim(p_purchase_evidence),
      rejection_reason = null
    where stored_item_id = p_stored_item_id;

  elsif p_result = 'rejected' then
    if trim(coalesce(p_rejection_reason, '')) = ''
       or p_purchase_evidence is not null then
      raise exception 'rejection reason is required';
    end if;

    update public.stored_items
    set
      result = 'rejected',
      rejection_reason = trim(p_rejection_reason),
      purchase_evidence = null
    where stored_item_id = p_stored_item_id;

  else
    raise exception 'invalid final result';
  end if;

  if not exists (
    select 1
    from public.stored_items
    where sale_request_id = v_sale_request_id
      and result = 'pending'
  ) then
    update public.sale_requests
    set status = 'completed'
    where sale_request_id = v_sale_request_id;
    v_next_status := 'completed';
  else
    v_next_status := 'contacting';
  end if;

  return v_next_status;
end;
$$;

revoke all on function public.start_contact(uuid) from public;
revoke all on function public.process_stored_item(uuid, text, text, text) from public;

grant execute on function public.start_contact(uuid) to service_role;
grant execute on function public.process_stored_item(uuid, text, text, text) to service_role;
```

- [ ] **Step 4: Integration Test 실행**

Run:

```bash
npx supabase db reset
npm run test:integration -- tests/integration/supabase/startContact.test.js tests/integration/supabase/processStoredItem.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/004_admin_rpcs.sql tests/integration/supabase
 git commit -m "feat: enforce admin item processing rules in database"
```

---

### Task 9: Admin Edge Function + 단일 운영자 Secret

**Files:**
- Create: `supabase/functions/admin-api/index.ts`
- Modify: `supabase/config.toml`
- Create: `tests/integration/supabase/adminEdgeFunction.test.js`
- Create: `src/features/admin/api/adminApi.js`

**Interfaces:**
- Consumes: `start_contact`, `process_stored_item`, Private Storage
- Produces:
  - Admin action API: `listSaleRequests`, `getSaleRequest`, `startContact`, `purchaseItem`, `rejectItem`

- [ ] **Step 1: Function auth contract 고정**

모든 요청은 다음 Header를 요구한다.

```text
x-admin-secret: local-admin-secret  # Local Integration Test 기준
```

Edge Function 환경변수:

```text
ADMIN_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

브라우저 bundle에는 `ADMIN_SECRET`과 service role key를 절대 넣지 않는다.

- [ ] **Step 2: Local secret와 Function config 작성**

`.gitignore`에 다음을 추가한다.

```text
supabase/functions/.env.local
```

`supabase/functions/.env.local`:

```text
ADMIN_SECRET=local-admin-secret
```

`supabase/config.toml`에 다음을 추가한다.

```toml
[functions.admin-api]
verify_jwt = false
```

Custom secret을 Function 내부에서 검증하므로 Supabase JWT 검증은 이 Function에 사용하지 않는다.

- [ ] **Step 3: 실패하는 인증 Integration Test 작성**

`adminEdgeFunction.test.js`:

```js
/** @jest-environment node */

test('잘못된 admin secret은 401을 반환한다', async () => {
  const response = await fetch('http://127.0.0.1:54321/functions/v1/admin-api', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-secret': 'wrong-secret',
    },
    body: JSON.stringify({ action: 'listSaleRequests' }),
  });

  expect(response.status).toBe(401);
});

test('올바른 admin secret은 목록 요청을 허용한다', async () => {
  const response = await fetch('http://127.0.0.1:54321/functions/v1/admin-api', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-secret': 'local-admin-secret',
    },
    body: JSON.stringify({ action: 'listSaleRequests' }),
  });

  expect(response.status).toBe(200);
});
```

Local Function은 다음 명령으로 실행한다.

```bash
npx supabase functions serve admin-api --env-file supabase/functions/.env.local
```

- [ ] **Step 4: Edge Function 구현**

`supabase/functions/admin-api/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

async function signedUrl(bucket: string, path: string | null) {
  if (!path) return null
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 600)
  if (error) throw error
  return data.signedUrl
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.headers.get('x-admin-secret') !== Deno.env.get('ADMIN_SECRET')) {
    return json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const contentType = req.headers.get('content-type') ?? ''
    const form = contentType.includes('multipart/form-data') ? await req.formData() : null
    const body = form ? null : await req.json()
    const action = form ? String(form.get('action') ?? '') : String(body?.action ?? '')

    if (action === 'listSaleRequests') {
      const status = body?.status
      let query = supabaseAdmin
        .from('sale_requests')
        .select('sale_request_id, convenience_store, promotion_type, status, created_at, sellers(contact_type), stored_items(stored_item_id)')
        .order('created_at', { ascending: false })

      if (status && status !== 'all') query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw error

      return json(data.map((row) => ({
        saleRequestId: row.sale_request_id,
        convenienceStore: row.convenience_store,
        promotionType: row.promotion_type,
        status: row.status,
        createdAt: row.created_at,
        contactType: row.sellers?.contact_type ?? null,
        itemCount: row.stored_items?.length ?? 0,
      })))
    }

    if (action === 'getSaleRequest') {
      const { data, error } = await supabaseAdmin
        .from('sale_requests')
        .select('sale_request_id, convenience_store, promotion_type, status, evidence_image, created_at, sellers(contact_type, contact_value), stored_items(*)')
        .eq('sale_request_id', body.saleRequestId)
        .single()

      if (error) throw error

      const evidenceUrl = await signedUrl('sale-evidence', data.evidence_image)
      const items = await Promise.all(data.stored_items.map(async (item) => ({
        ...item,
        purchaseEvidenceUrl: await signedUrl('purchase-evidence', item.purchase_evidence),
      })))

      return json({ ...data, evidenceUrl, stored_items: items })
    }

    if (action === 'startContact') {
      const { error } = await supabaseAdmin.rpc('start_contact', {
        p_sale_request_id: body.saleRequestId,
      })
      if (error) throw error
      return json({ ok: true })
    }

    if (action === 'purchaseItem') {
      const storedItemId = String(form?.get('storedItemId') ?? '')
      const file = form?.get('file')
      if (!(file instanceof File)) return json({ error: 'PURCHASE_EVIDENCE_REQUIRED' }, 400)

      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
      if (!allowed.has(file.type) || file.size > 5 * 1024 * 1024) {
        return json({ error: 'INVALID_IMAGE' }, 400)
      }

      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `admin/${crypto.randomUUID()}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('purchase-evidence')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { data, error } = await supabaseAdmin.rpc('process_stored_item', {
        p_stored_item_id: storedItemId,
        p_result: 'purchased',
        p_purchase_evidence: path,
        p_rejection_reason: null,
      })
      if (error) throw error

      return json({ status: data })
    }

    if (action === 'rejectItem') {
      const reason = String(body?.rejectionReason ?? '').trim()
      if (!reason) return json({ error: 'REJECTION_REASON_REQUIRED' }, 400)

      const { data, error } = await supabaseAdmin.rpc('process_stored_item', {
        p_stored_item_id: body.storedItemId,
        p_result: 'rejected',
        p_purchase_evidence: null,
        p_rejection_reason: reason,
      })
      if (error) throw error

      return json({ status: data })
    }

    return json({ error: 'UNKNOWN_ACTION' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: 'INTERNAL_ERROR' }, 500)
  }
})
```

구매 증빙 Storage와 DB RPC는 하나의 Transaction이 아니므로 RPC 실패 시 orphan image가 남을 수 있다. MVP에서는 cleanup worker를 만들지 않는다.

- [ ] **Step 5: Admin API wrapper 작성**

`adminApi.js`는 sessionStorage에서 secret을 직접 읽지 않는다. 각 호출자가 secret을 명시적으로 넘긴다.

```js
import { supabase } from '../../../shared/lib/supabaseClient';

async function invokeJson(secret, body) {
  const { data, error } = await supabase.functions.invoke('admin-api', {
    headers: { 'x-admin-secret': secret },
    body,
  });
  if (error) throw error;
  return data;
}

export function listSaleRequests(secret, status = 'all') {
  return invokeJson(secret, { action: 'listSaleRequests', status });
}

export function getSaleRequest(secret, saleRequestId) {
  return invokeJson(secret, { action: 'getSaleRequest', saleRequestId });
}

export function startContactRequest(secret, saleRequestId) {
  return invokeJson(secret, { action: 'startContact', saleRequestId });
}

export async function purchaseItemRequest(secret, storedItemId, file) {
  const form = new FormData();
  form.append('action', 'purchaseItem');
  form.append('storedItemId', storedItemId);
  form.append('file', file);

  const { data, error } = await supabase.functions.invoke('admin-api', {
    headers: { 'x-admin-secret': secret },
    body: form,
  });
  if (error) throw error;
  return data;
}

export function rejectItemRequest(secret, storedItemId, rejectionReason) {
  return invokeJson(secret, {
    action: 'rejectItem',
    storedItemId,
    rejectionReason,
  });
}
```

- [ ] **Step 6: Local Function + Integration 검증**

Terminal A:

```bash
npx supabase start
npx supabase functions serve admin-api --env-file supabase/functions/.env.local
```

Terminal B:

```bash
npm run test:integration -- tests/integration/supabase/adminEdgeFunction.test.js
```

Expected: wrong secret 401, correct secret 200.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions supabase/config.toml tests/integration/supabase/adminEdgeFunction.test.js src/features/admin/api
 git commit -m "feat: protect admin operations behind edge function"
```

---

### Task 10: Admin UI + 운영 Service

**Files:**
- Create: `src/features/admin/pages/AdminListPage.jsx`
- Create: `src/features/admin/pages/AdminDetailPage.jsx`
- Create: `src/features/admin/components/AdminAccessGate.jsx`
- Create: `src/features/admin/components/SaleRequestListItem.jsx`
- Create: `src/features/admin/components/StoredItemAdminCard.jsx`
- Create: `src/features/admin/components/PurchaseDialog.jsx`
- Create: `src/features/admin/components/RejectDialog.jsx`
- Create: `src/features/admin/services/startContact.js`
- Create: `src/features/admin/services/purchaseStoredItem.js`
- Create: `src/features/admin/services/rejectStoredItem.js`
- Create: `src/features/admin/services/purchaseStoredItem.test.js`
- Create: `src/features/admin/services/rejectStoredItem.test.js`

**Interfaces:**
- Consumes: `adminApi.js`
- Produces: `/admin`, `/admin/:saleRequestId`

- [ ] **Step 1: Service 실패 테스트 작성**

`purchaseStoredItem.test.js`:

```js
import { purchaseStoredItem } from './purchaseStoredItem';
import * as api from '../api/adminApi';

jest.mock('../api/adminApi');

test('구매 증빙이 없으면 API를 호출하지 않는다', async () => {
  await expect(purchaseStoredItem('secret', 'item-id', null)).rejects.toThrow();
  expect(api.purchaseItemRequest).not.toHaveBeenCalled();
});
```

`rejectStoredItem.test.js`:

```js
import { rejectStoredItem } from './rejectStoredItem';
import * as api from '../api/adminApi';

jest.mock('../api/adminApi');

test('거절 이유가 비어 있으면 API를 호출하지 않는다', async () => {
  await expect(rejectStoredItem('secret', 'item-id', '   ')).rejects.toThrow();
  expect(api.rejectItemRequest).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Service 구현**

```js
export async function purchaseStoredItem(secret, storedItemId, file) {
  if (!file) throw new Error('PURCHASE_EVIDENCE_REQUIRED');
  return purchaseItemRequest(secret, storedItemId, file);
}
```

```js
export async function rejectStoredItem(secret, storedItemId, rejectionReason) {
  const reason = String(rejectionReason ?? '').trim();
  if (!reason) throw new Error('REJECTION_REASON_REQUIRED');
  return rejectItemRequest(secret, storedItemId, reason);
}
```

- [ ] **Step 3: AdminAccessGate 구현**

운영 비밀키는 다음 sessionStorage key로 현재 탭 세션에만 저장한다.

```text
plus1_admin_secret
```

Admin 페이지 진입 시 secret이 없으면 키 입력 UI를 보여준다.

관리자 회원가입/아이디/프로필 UI는 만들지 않는다.

- [ ] **Step 4: 신청 목록 구현**

상태 필터는 정확히 다음 네 개만 둔다.

```text
전체
접수됨
연락중
처리완료
```

목록에 표시:

```text
신청 시점
편의점
행사 유형
상품 개수
연락 방식
상태
```

검색/날짜 필터는 추가하지 않는다.

- [ ] **Step 5: 신청 상세 + 처리 UI 구현**

상세에 표시:

```text
신청 정보
판매자 연락처
판매 의향 이미지
StoredItem 전체
```

`received` 상태에서는 `판매자에게 연락 시작` 버튼을 보여준다.

`pending` StoredItem에는 `구매` / `거절` 버튼을 보여준다.

이미 `purchased` 또는 `rejected`인 StoredItem에는 수정/되돌리기 버튼을 보여주지 않는다.

- [ ] **Step 6: Unit Test + Build**

Run:

```bash
npm test -- src/features/admin --runInBand
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/admin
 git commit -m "feat: add single-operator admin workflow"
```

---

### Task 11: Router + Vercel Web Analytics + SPA 배포 설정

**Files:**
- Create: `src/app/router/AppRouter.jsx`
- Create: `src/app/App.jsx`
- Modify: `src/main.jsx`
- Create: `vercel.json`

**Interfaces:**
- Consumes: Seller/Admin pages
- Produces: 실제 앱 Routing과 방문 측정

- [ ] **Step 1: Route 연결**

정확히 다음 Route만 만든다.

```text
/
/sell
/sell/complete
/admin
/admin/:saleRequestId
```

`/sell/step1` 같은 추가 Route는 만들지 않는다.

- [ ] **Step 2: Vercel Analytics 연결**

`App.jsx`에서 `@vercel/analytics/react`의 `Analytics`를 렌더링한다.

`/admin` 경로는 검증용 사용자 방문 수에 섞이지 않도록 `beforeSend`에서 제외한다.

```jsx
<Analytics
  beforeSend={(event) => (
    event.url.includes('/admin') ? null : event
  )}
/>
```

측정 기준:

```text
서비스 방문 수
-> / page view

판매 신청 시작 수의 MVP proxy
-> /sell page view

판매 신청 완료 수
-> sale_requests row count

고유 판매자 수
-> sellers row count

반복 신청 판매자 수
-> seller별 sale_requests 2개 이상 집계
```

별도 analytics DB/table은 만들지 않는다.

- [ ] **Step 3: SPA deep-link 설정**

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

- [ ] **Step 4: Production build 확인**

Run:

```bash
npm run build
```

Expected: `dist/` 생성, build error 없음.

- [ ] **Step 5: Commit**

```bash
git add src/app src/main.jsx vercel.json
 git commit -m "feat: wire app routes and production analytics"
```

---

### Task 12: 최종 통합 검증 + 배포 전 체크

**Files:**
- Modify only if verification exposes a real defect.

**Interfaces:**
- Consumes: 전체 앱
- Produces: 배포 가능한 MVP

- [ ] **Step 1: 전체 Unit Test**

Run:

```bash
npm test -- --runInBand
```

Expected: PASS.

- [ ] **Step 2: Local Supabase Integration Test**

Run:

```bash
npx supabase start
npx supabase db reset
npm run test:integration
```

Expected: PASS.

- [ ] **Step 3: Production Build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: 판매자 수동 검수**

다음 시나리오를 실제 브라우저에서 한 번씩 수행한다.

```text
A. GS25 + 1+1 + 상품 1개 + 휴대폰 -> 정상 신청
B. CU + 2+1 + 상품 2개 + 카카오 -> 정상 신청
C. 과거 유효기간 -> 다음 단계 진행 불가
D. 이미지 없음 -> 연락처 단계 진행 불가
E. 최종 제출 중 버튼 재클릭 -> 중복 신청 없음
```

- [ ] **Step 5: Admin 수동 검수**

```text
A. 잘못된 Admin Secret -> 접근 거부
B. 정상 Secret -> 신청 목록 조회
C. received -> contacting
D. 구매 증빙 없이 구매 처리 -> 불가
E. 거절 이유 없이 거절 처리 -> 불가
F. 최종 처리된 상품 -> 수정 버튼 없음
G. 마지막 pending 처리 -> SaleRequest completed 자동 변경
```

- [ ] **Step 6: 보안 수동 검수**

Browser DevTools에서 anon key로 직접 다음 요청이 실패하는지 확인한다.

```text
sellers SELECT
sale_requests SELECT
stored_items SELECT
sale-evidence LIST/SELECT
purchase-evidence INSERT/SELECT
```

브라우저 bundle에 다음 문자열/값이 포함되지 않는지 확인한다.

```text
service_role key
ADMIN_SECRET 실제 값
```

- [ ] **Step 7: 모바일/데스크탑 최종 검수**

```text
390 x 844
430 x 932
1440 x 900
```

DESIGN.md와 비교하여 기능 추가 없이 레이아웃만 수정한다.

- [ ] **Step 8: 최종 Commit**

```bash
git add .
 git commit -m "chore: verify +1 MVP for deployment"
```

---

## Recommended Implementation Order

```text
Task 1  프로젝트/Jest 기반
↓
Task 2  Domain 비즈니스 규칙
↓
Task 3  Supabase Schema/RLS
↓
Task 4  판매 신청 Transaction RPC
↓
Task 5  Storage + submit service
↓
Task 6  판매자 5단계 UI
↓
Task 7  디자인 시스템/반응형
↓
Task 8  Admin DB 상태 처리
↓
Task 9  Admin Edge Function
↓
Task 10 Admin UI
↓
Task 11 Router/Analytics/Vercel
↓
Task 12 최종 검증
```

이 순서는 **비즈니스 규칙 → 데이터 무결성 → 사용자 UI → 운영 UI → 배포** 순으로 진행한다. 핵심 규칙을 UI보다 먼저 만들기 때문에 Jest를 단순 사후 테스트가 아니라 개발 과정의 일부로 경험할 수 있다.

## Plan Completion Criteria

- PRD의 핵심 행동인 실제 판매 신청 제출이 구현된다.
- Seller 중복 식별이 DB까지 보장된다.
- SaleRequest와 StoredItem 생성이 Transaction으로 처리된다.
- 구매/거절 상태 규칙이 JavaScript와 PostgreSQL 양쪽에서 보호된다.
- 모든 상품 처리 시 SaleRequest가 자동 완료된다.
- Seller 개인정보와 증빙이 anon 사용자의 직접 조회로 노출되지 않는다.
- 판매자 7개 화면과 Admin 2개 화면이 DESIGN 범위 안에서 구현된다.
- 핵심 Jest Unit Test와 Local Supabase Integration Test가 모두 통과한다.
- Vercel에 배포 가능한 production build가 생성된다.
- 검증과 무관한 기능이 추가되지 않는다.
