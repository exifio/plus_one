-- +1 MVP: 판매 희망금액(desired_price) 단일 저장 모델로 전환 (PRD 6장)
-- 이전 가격 흐름(최초/제안/최종) 컬럼과 RPC 파라미터를 제거한다.

ALTER TABLE public.applications
  DROP COLUMN IF EXISTS initial_ratio,
  DROP COLUMN IF EXISTS initial_price,
  DROP COLUMN IF EXISTS had_price_offer,
  DROP COLUMN IF EXISTS offered_ratio,
  DROP COLUMN IF EXISTS offered_price,
  DROP COLUMN IF EXISTS offer_accepted,
  DROP COLUMN IF EXISTS final_ratio,
  DROP COLUMN IF EXISTS final_price;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS desired_price INTEGER NOT NULL DEFAULT 0 CHECK (desired_price >= 0);

DROP INDEX IF EXISTS idx_applications_final_price;
CREATE INDEX IF NOT EXISTS idx_applications_desired_price ON public.applications (desired_price);

DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN,
  INTEGER, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT
);

DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, INTEGER, INTEGER, BOOLEAN,
  INTEGER, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.submit_application(
  p_store TEXT,
  p_promotion_type TEXT,
  p_product_name TEXT,
  p_original_paid_price INTEGER,
  p_quantity INTEGER,
  p_expiry_date DATE DEFAULT NULL,
  p_unit_base_price INTEGER DEFAULT 0,
  p_desired_price INTEGER DEFAULT 0,
  p_contact_type TEXT DEFAULT 'phone',
  p_contact_value TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recruitment_status TEXT;
  v_new_id UUID;
BEGIN
  IF p_store NOT IN ('GS25', 'CU') THEN
    RAISE EXCEPTION '편의점을 확인해주세요.';
  END IF;
  IF p_promotion_type NOT IN ('1+1', '2+1') THEN
    RAISE EXCEPTION '행사 유형을 확인해주세요.';
  END IF;
  IF p_product_name IS NULL OR length(btrim(p_product_name)) = 0 OR length(btrim(p_product_name)) > 200 THEN
    RAISE EXCEPTION '상품명을 확인해주세요.';
  END IF;
  IF p_original_paid_price IS NULL OR p_original_paid_price <= 0 THEN
    RAISE EXCEPTION '결제금액을 확인해주세요.';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION '수량을 확인해주세요.';
  END IF;
  IF p_unit_base_price IS NULL OR p_unit_base_price < 0
    OR p_desired_price IS NULL OR p_desired_price < 0 THEN
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
    RAISE EXCEPTION '현재는 판매 신청을 받고 있지 않습니다. (상태: %)',
      coalesce(v_recruitment_status, 'UNKNOWN');
  END IF;

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
    status
  ) VALUES (
    p_store,
    p_promotion_type,
    btrim(p_product_name),
    p_original_paid_price,
    p_quantity,
    p_expiry_date,
    p_unit_base_price,
    p_desired_price,
    p_contact_type,
    btrim(p_contact_value),
    'SUBMITTED'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, INTEGER, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, INTEGER, TEXT, TEXT
) TO anon, authenticated;
