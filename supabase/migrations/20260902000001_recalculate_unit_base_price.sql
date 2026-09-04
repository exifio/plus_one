-- +1 MVP: 기준가격은 클라이언트 입력값이 아닌 서버 계산값만 저장한다.

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
  v_unit_base_price INTEGER;
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
    RAISE EXCEPTION '현재는 판매 신청을 받고 있지 않습니다. (상태: %)',
      coalesce(v_recruitment_status, 'UNKNOWN');
  END IF;

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
    'SUBMITTED'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT, TEXT
) TO anon, authenticated;
