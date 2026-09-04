# 판매자 공급 검증 MVP — BACKEND 설계서

## 1. 아키텍처 개요
- **구조**: `React (Vite + Vercel) → Supabase (PostgreSQL + Auth + RLS + RPC + Storage)` 직접 연동
- **설계 원칙**: 별도의 백엔드 프레임워크/서버 없이 Supabase의 RLS(Row Level Security)와 PostgreSQL 저장 프로시저(RPC)를 활용하여 보안과 최소 복잡도를 달성한다.
- **본 문서 기준**: V2 Frontend 승인(등록 방식 `SCREENSHOT`/`MANUAL`) 기준으로 갱신했다. 스크린샷 신청 지원은 마이그레이션 `20260904000001_support_screenshot_registration.sql`(작성 완료)로 준비되어 있으며, 원격 DB 적용 후 활성화된다.

```text
[ React Frontend (Vercel) ]
       │
       ├─ (익명 판매자) ── RPC: submit_application() / SELECT recruitment_settings
       │
       └─ (인증 관리자) ── Supabase Auth (JWT) ── RLS ── [ PostgreSQL Database ]
```

---

## 2. 데이터베이스 스키마

스키마는 `supabase/migrations/`로 관리하며 원격 DB에 적용 완료 상태다.
- `20260831000001_create_schema.sql` — 테이블/RLS/정책/트리거/초기 RPC 생성
- `20260831000002_simplify_desired_price.sql` — 이전 가격 흐름 컬럼 제거, 판매 희망금액 단일 모델 전환
- `20260902000001_recalculate_unit_base_price.sql` — `unit_base_price` 서버 재계산 및 RPC 입력 파라미터 제거
- `20260902000002_repair_application_update_trigger.sql` — 이전 가격 흐름 컬럼을 참조하던 상태 변경 보호 trigger 수정
- `20260904000001_support_screenshot_registration.sql` — 등록 방식(`registration_method`)·스크린샷 파일명(`screenshot_file_name`) 컬럼 추가, `original_paid_price` 제약 완화(≥ 0), RPC에 등록 방식·파일명 파라미터 추가, `screenshots` Storage 버킷/정책 생성 (**작성 완료, 원격 적용 대기**)

### 2.1 recruitment_settings (모집 설정)
모집 상태를 제어하는 단일 레코드 설정 테이블.

```sql
CREATE TABLE public.recruitment_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAUSED', 'CLOSED')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 초기 기본값 등록
INSERT INTO public.recruitment_settings (id, status)
VALUES (1, 'OPEN')
ON CONFLICT (id) DO NOTHING;
```

### 2.2 admin_users (관리자 허용 목록)
Supabase Auth 계정 중 관리자 권한을 가진 사용자를 식별하는 테이블.

```sql
CREATE TABLE public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 applications (판매 신청 내역)
판매자 신청 정보와 실험 분석 데이터를 보존하는 메인 테이블.

```sql
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 1. 상품 기본 정보
  store TEXT NOT NULL CHECK (store IN ('GS25', 'CU')),
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('1+1', '2+1')),
  product_name TEXT NOT NULL,
  original_paid_price INTEGER NOT NULL CHECK (original_paid_price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  expiry_date DATE,

  -- 2. 가격 데이터 (판매 희망금액 단일 저장 — PRD 6장)
  unit_base_price INTEGER NOT NULL CHECK (unit_base_price >= 0),
  desired_price INTEGER NOT NULL DEFAULT 0 CHECK (desired_price >= 0),

  -- 3. 연락처 정보 (개인정보)
  contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'kakao')),
  contact_value TEXT NOT NULL,

  -- 4. 등록 방식 (V2) — 스크린샷 등록은 상품명/결제금액 없이 접수
  registration_method TEXT NOT NULL DEFAULT 'MANUAL' CHECK (registration_method IN ('SCREENSHOT', 'MANUAL')),
  screenshot_file_name TEXT,

  -- 5. 운영 상태
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (
    status IN (
      'SUBMITTED',
      'CONTACTED',
      'EVIDENCE_VERIFIED',
      'QR_RECEIVED',
      'COMPLETED',
      'NOT_PURCHASED',
      'FAILED'
    )
  )
);

-- 인덱스
CREATE INDEX idx_applications_status ON public.applications (status);
CREATE INDEX idx_applications_created_at ON public.applications (created_at DESC);
CREATE INDEX idx_applications_desired_price ON public.applications (desired_price);
```

> **V2 반영 (마이그레이션 작성 완료)**: 위 DDL 중 `registration_method`, `screenshot_file_name` 컬럼과 `original_paid_price CHECK (>= 0)` 완화는 승인된 V2 기준으로 추가된다. 스크린샷 등록 신청은 PRD 5장에 따라 상품명·결제금액을 입력받지 않으므로 빈 상품명(`''`)·0원 결제금액을 허용하고, `unit_base_price`는 0으로 저장된다. 이를 위해 기존 `applications_product_name_check` 제약도 `registration_method = 'SCREENSHOT' OR length(btrim(product_name)) > 0` 조건부 제약으로 교체한다(실제 DB 적용 중 확인된 제약). 스크린샷 원본 저장은 3.3절 Storage 설계를 따른다. 실적용은 `20260904000001_support_screenshot_registration.sql`을 원격 DB에 실행하면 완료된다.

---

## 3. Row Level Security (RLS) 및 보안 정책

### 3.1 접근 제어 원칙
1. **판매자(익명 사용자)**:
   - 모집 상태(`recruitment_settings`)는 누구나 읽을 수 있다.
   - 신청 등록은 보안 RPC(`submit_application`)를 통해서만 가능하며, 테이블 직접 INSERT/SELECT/UPDATE/DELETE는 차단한다.
   - 개인정보(연락처 등) 및 다른 판매자의 신청 내역을 조회할 수 없다.
2. **관리자(인증 사용자)**:
   - Supabase Auth로 로그인하고 `admin_users`에 등록된 사용자만 `applications` 전체 조회, 상태 수정, `recruitment_settings` 수정을 수행할 수 있다.

```sql
-- RLS 활성화
ALTER TABLE public.recruitment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 헬퍼 함수: 현재 세션이 관리자인지 확인
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

-- 1. recruitment_settings 정책
CREATE POLICY "모집 상태는 누구나 조회 가능"
  ON public.recruitment_settings FOR SELECT
  USING (true);

CREATE POLICY "모집 상태 변경은 관리자만 가능"
  ON public.recruitment_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. admin_users 정책
CREATE POLICY "관리자 본인 정보 조회"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. applications 정책
CREATE POLICY "관리자 전용 신청 조회"
  ON public.applications FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "관리자 전용 신청 상태 수정"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### 3.2 권한 및 브라우저 키 제한
- `updated_at` 자동 갱신 트리거를 추가한다 (관리자 상태 변경 시 `updated_at` 갱신).
- 신청 수정 보호 trigger는 관리자 상태만 통과시키고 나머지 컬럼은 기존 값으로 보존한다.
- `is_admin()`, `submit_application()` 함수에 `SET search_path = ''`를 지정한다 (SECURITY DEFINER 보안 모범 사례).
- 브라우저에는 Project URL과 Publishable/anon key만 사용한다. `service_role` 또는 Secret key는 Vite/Vercel 환경 변수에 넣지 않는다.
- `applications`는 브라우저에서 직접 INSERT/DELETE할 수 없고, 판매자는 `submit_application()` RPC만 실행할 수 있다.

### 3.3 Supabase Storage (스크린샷 이미지)
스크린샷 등록 신청의 이미지는 전용 **private bucket**에 저장한다. (BP-02 결정: Storage 필요)

- **bucket**: `screenshots` (private)
- **객체 경로**: `{uuid}.{ext}` — 업로드 시점에 클라이언트가 생성한 고유 파일명을 `applications.screenshot_file_name`에 저장한다.
- **정책**:
  - `anon`: `INSERT`(업로드)만 허용 — 판매자가 신청 시 이미지를 직접 업로드할 수 있다.
  - `authenticated`(관리자): `INSERT` 허용 — 관리자 콘솔에 로그인한 브라우저에서 판매자 신청을 테스트하면 supabase-js가 관리자 토큰으로 업로드하므로 INSERT도 허용해야 한다.
  - `authenticated`(관리자): `SELECT` 허용 — 목록/상세에서 `createSignedUrl`로 원본을 조회한다.
  - `anon`·`public` 대상 `SELECT`는 허용하지 않으므로 원본 URL이 판매자·비로그인 사용자에게 공개되지 않는다.
- **삭제**: MVP 기본은 삭제 정책 없음. 운영 정리(오탐·실수 업로드)가 필요해지면 관리자 전용 삭제 정책을 추가한다.
- **프론트 연동**: 신청 화면 미리보기는 로컬 객체 URL만 사용하고, 완료/랜딩에 이미지를 영구 노출하지 않는다.
- **보안 주의**: 버킷 공개(read) 정책을 열지 않으며, 브라우저에는 anon key만 노출한다. 원본 조회는 관리자 세션의 signed URL로만 진행한다.

---

## 4. 저장 프로시저 (RPC)

### 4.1 submit_application (판매 신청 접수)

모집 상태가 `OPEN`인지 검증하고 신청 레코드를 안전하게 삽입한다. 실제 적용본은 `supabase/migrations/20260902000001_recalculate_unit_base_price.sql`이며 아래와 동일하다.

```sql
DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN,
  INTEGER, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT
);

DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, INTEGER, INTEGER, BOOLEAN,
  INTEGER, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT
);

DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, INTEGER, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.submit_application(
  p_store TEXT,
  p_promotion_type TEXT,
  p_product_name TEXT,
  p_original_paid_price INTEGER,
  p_quantity INTEGER,
  p_expiry_date DATE DEFAULT NULL,
  p_desired_price INTEGER DEFAULT 0,
  p_contact_type TEXT DEFAULT 'phone',
  p_contact_value TEXT DEFAULT '',
  p_registration_method TEXT DEFAULT 'MANUAL',
  p_screenshot_file_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recruitment_status TEXT;
  v_new_id UUID;
  v_unit_base_price INTEGER;
BEGIN
  -- 1. 입력 검증
  IF p_store NOT IN ('GS25', 'CU') THEN
    RAISE EXCEPTION '편의점을 확인해주세요.';
  END IF;
  IF p_promotion_type NOT IN ('1+1', '2+1') THEN
    RAISE EXCEPTION '행사 유형을 확인해주세요.';
  END IF;
  IF p_registration_method NOT IN ('SCREENSHOT', 'MANUAL') THEN
    RAISE EXCEPTION '등록 방식을 확인해주세요.';
  END IF;

  IF p_registration_method = 'MANUAL' THEN
    IF p_product_name IS NULL OR length(btrim(p_product_name)) = 0 OR length(btrim(p_product_name)) > 200 THEN
      RAISE EXCEPTION '상품명을 확인해주세요.';
    END IF;
    IF p_original_paid_price IS NULL OR p_original_paid_price <= 0 THEN
      RAISE EXCEPTION '결제금액을 확인해주세요.';
    END IF;
  ELSE
    -- 스크린샷 등록: 상품명·결제금액을 입력받지 않는다 (PRD 5장). 빈 상품명/0원 결제금액 허용.
    p_product_name := '';
    p_original_paid_price := 0;
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION '수량을 확인해주세요.';
  END IF;
  IF p_desired_price IS NULL OR p_desired_price < 0 THEN
    RAISE EXCEPTION '판매 희망금액을 확인해주세요.';
  END IF;
  IF p_contact_type NOT IN ('phone', 'kakao') OR length(btrim(coalesce(p_contact_value, ''))) = 0 THEN
    RAISE EXCEPTION '연락처를 확인해주세요.';
  END IF;
  IF p_contact_type = 'phone'
    AND btrim(p_contact_value) !~ '^01[016789]-[0-9]{3,4}-[0-9]{4}$' THEN
    RAISE EXCEPTION '휴대전화 번호 형식을 확인해주세요.';
  END IF;

  -- 2. 현재 모집 상태 확인
  SELECT status INTO v_recruitment_status
  FROM public.recruitment_settings
  WHERE id = 1
  FOR UPDATE;

  IF v_recruitment_status IS NULL OR v_recruitment_status <> 'OPEN' THEN
    RAISE EXCEPTION '현재는 판매 신청을 받고 있지 않습니다. (상태: %)', coalesce(v_recruitment_status, 'UNKNOWN');
  END IF;

  -- 3. 분석용 기준가격은 서버에서 재계산한다 (클라이언트 전달값을 신뢰하지 않음)
  v_unit_base_price := (
    round(
      (p_original_paid_price::numeric /
        CASE p_promotion_type WHEN '1+1' THEN 2 WHEN '2+1' THEN 3 END) / 100
    ) * 100
  )::integer;

  -- 4. 레코드 삽입
  INSERT INTO public.applications (
    store,
    promotion_type,
    product_name,
    original_paid_price,
    quantity,
    expiry_date,
    unit_base_price,
    desired_price,
    contact_type,
    contact_value,
    registration_method,
    screenshot_file_name,
    status
  ) VALUES (
    p_store,
    p_promotion_type,
    btrim(p_product_name),
    p_original_paid_price,
    p_quantity,
    p_expiry_date,
    v_unit_base_price,
    p_desired_price,
    p_contact_type,
    btrim(p_contact_value),
    p_registration_method,
    p_screenshot_file_name,
    'SUBMITTED'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;
```

> **※ 적용 상태 (Experiment Tracker 권고 반영)**: `20260902000001_recalculate_unit_base_price.sql` 적용 후 `unit_base_price`는 RPC 내부에서 재계산해 저장하며, `p_unit_base_price` 파라미터는 사용하지 않는다. 클라이언트는 행사 결제금액과 행사 유형만 전달한다.
>
> **※ V2 확장 (마이그레이션 작성 완료)**: 등록 방식 `p_registration_method`·스크린샷 파일명 `p_screenshot_file_name` 파라미터를 추가한다. `MANUAL`은 기존 상품명/결제금액 검증을 유지하고, `SCREENSHOT`은 입력 없이 접수한다(빈 상품명·0원 → `unit_base_price` 0). 프론트는 `applicationService.submitApplication`이 이 두 파라미터를 전달하도록 보완 완료했으며, 원격 적용은 `20260904000001_support_screenshot_registration.sql` 실행으로 완료된다.

---

## 5. 실험 데이터 필드 및 분석 (Experiment Tracker 대조)

PRD 섹션 10에서 요구하는 실험 데이터 항목과 DB 컬럼의 100% 매핑:

| PRD 요구 실험 데이터 | DB 컬럼명 | 데이터 타입 | 설명 |
| :--- | :--- | :--- | :--- |
| 편의점 | `store` | `TEXT` | GS25, CU |
| 행사 유형 | `promotion_type` | `TEXT` | 1+1, 2+1 |
| 등록 방식 | `registration_method` | `TEXT` | SCREENSHOT / MANUAL (V2 추가) |
| 상품명 | `product_name` | `TEXT` | 입력된 상품명 |
| 실제 결제금액 | `original_paid_price` | `INTEGER` | 원 단위 결제금액 |
| 판매 희망 수량 | `quantity` | `INTEGER` | 기본 1개 |
| 소비기한/유효기간 | `expiry_date` | `DATE` | 미입력 허용(선택) |
| 행사 기준 1개 가격 | `unit_base_price` | `INTEGER` | 100원 단위 반올림 기준가 (분석용) |
| 판매 희망금액 | `desired_price` | `INTEGER` | 판매자가 직접 입력한 1개당 희망금액. 0원은 무상 양도/처분 의향 |
| 희망가격 비율 | 계산식 (`desired_price / unit_base_price × 100`) | `INTEGER` | 저장하지 않고 조회 시 계산 (관리자 분석용) |
| 유상 판매 의향 여부 | 계산식 (`desired_price > 0`) | `BOOLEAN` | 0원은 무상 양도, 1원 이상은 유상 판매 |
| 연락 수단 종류/정보 | `contact_type`, `contact_value` | `TEXT`, `TEXT` | 전화번호/카카오톡 정보 |
| 관리자 처리 상태 | `status` | `TEXT` | SUBMITTED ~ FAILED (7단계) |
| 생성/수정 시각 | `created_at`, `updated_at` | `TIMESTAMPTZ` | 타임스탬프 |

최초/제안/최종 가격 구분은 존재하지 않는다. 판매자가 입력한 `desired_price` 하나만 저장하며, 가격 협상 반응은 이번 MVP의 핵심 가설이 아니다 (PRD 2장).

### 관리자 지표 집계

관리자 화면은 Supabase Auth 세션으로 보호된 `applications` 목록을 조회한 뒤 전체 신청 수, 편의점별/행사 유형별 신청 수, 판매 희망금액 분포, 희망가격 비율 분포, 상태별 신청 수, 거래 완료 수를 계산한다. 공개 지표 뷰는 만들지 않아 판매자나 익명 사용자가 신청 데이터에 접근할 수 없다.

---

## 6. Frontend 서비스 연동 인터페이스

```typescript
// src/services/applicationService.ts
export interface CreateApplicationParams {
  store: Store;
  promotionType: PromotionType;
  /** 등록 방식. 스크린샷 신청은 'SCREENSHOT'. 기본값 MANUAL. */
  registrationMethod?: RegistrationMethod;
  /** 스크린샷 등록 시 Storage에 업로드한 파일명. */
  screenshotFileName?: string;
  productName: string;
  originalPaidPrice: number;
  quantity: number;
  expiryDate?: string;
  /** 판매자가 직접 입력한 판매 희망금액 (원 단위, 1개당). */
  desiredPrice: number;
  contactType: 'phone' | 'kakao';
  contactValue: string;
}

// 판매자 신청 RPC 호출
export async function submitApplication(params: CreateApplicationParams): Promise<string>;

// 관리자 신청 목록 조회 (상태 필터링)
export async function fetchApplications(statusFilter?: StatusFilter): Promise<Application[]>;

// 관리자 신청 상세 조회
export async function fetchApplicationById(id: string): Promise<Application | null>;

// 관리자 상태 변경
export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<void>;

// 모집 상태 조회 및 변경
export async function fetchRecruitmentStatus(): Promise<RecruitmentStatus>;
export async function updateRecruitmentStatus(status: RecruitmentStatus): Promise<void>;
```

관리자 화면은 `supabase.auth.signInWithPassword()`로 로그인한 뒤 `admin_users.user_id = auth.uid()`인 경우에만 접근한다. 로그인 세션은 Supabase JS 클라이언트가 저장·갱신하며, 만료되면 관리자 화면에서 로그인 화면으로 돌아간다.

---

## 7. 환경 변수 설정
```env
# .env.example
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```
