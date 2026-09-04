-- +1 MVP V2: 스크린샷 등록 신청 지원
-- - applications에 등록 방식(registration_method)과 스크린샷 파일명(screenshot_file_name) 추가
-- - 스크린샷 등록은 상품명/결제금액을 입력받지 않으므로 original_paid_price 제약을 0 이상으로 완화
-- - submit_application RPC에 등록 방식·파일명 파라미터 추가
-- - 스크린샷 Storage bucket 및 정책 생성

-- 1) applications 컬럼 추가
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS registration_method TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (registration_method IN ('SCREENSHOT', 'MANUAL'));

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS screenshot_file_name TEXT;

-- 2) original_paid_price 제약 완화 (> 0 → >= 0)
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_original_paid_price_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_original_paid_price_check
  CHECK (original_paid_price >= 0);

-- 2-1) product_name 제약 완화 — 스크린샷 등록은 빈 상품명을 허용한다.
-- (실제 DB에 존재하는 applications_product_name_check를 방식 조건부 제약으로 교체)
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_product_name_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_product_name_check
  CHECK (registration_method = 'SCREENSHOT' OR length(btrim(product_name)) > 0);

-- 3) 기존 RPC 제거 후 V2 규격으로 재생성
DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT, TEXT
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

  SELECT status
  INTO v_recruitment_status
  FROM public.recruitment_settings
  WHERE id = 1
  FOR UPDATE;

  IF v_recruitment_status IS NULL OR v_recruitment_status <> 'OPEN' THEN
    RAISE EXCEPTION '현재는 판매 신청을 받고 있지 않습니다. (상태: %)', coalesce(v_recruitment_status, 'UNKNOWN');
  END IF;

  -- 분석용 기준가격은 서버에서 재계산한다. 스크린샷 등록은 0원이 되어 0으로 저장된다.
  v_unit_base_price := (
    round(
      (p_original_paid_price::numeric /
        CASE p_promotion_type WHEN '1+1' THEN 2 WHEN '2+1' THEN 3 END) / 100
    ) * 100
  )::integer;

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

-- 4) 스크린샷 Storage bucket 및 정책 (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('screenshots', 'screenshots', false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "screenshot_upload_anon" ON storage.objects;
CREATE POLICY "screenshot_upload_anon"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'screenshots');

-- 관리자 콘솔에 로그인한 브라우저에서 판매자 신청을 테스트하는 경우
-- supabase-js가 authenticated 토큰으로 업로드하므로 authenticated INSERT도 허용한다.
-- (이 MVP에서 authenticated 사용자는 admin_users에 등록된 관리자뿐이다.)
DROP POLICY IF EXISTS "screenshot_upload_authenticated" ON storage.objects;
CREATE POLICY "screenshot_upload_authenticated"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'screenshots');

DROP POLICY IF EXISTS "screenshot_read_admin" ON storage.objects;
CREATE POLICY "screenshot_read_admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'screenshots' AND public.is_admin());