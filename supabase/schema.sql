-- Supabase SQL Editor용. 기존 모집 설정 행(id=1)과 신청 데이터는 삭제하지 않는다.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.recruitment_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAUSED', 'CLOSED')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.recruitment_settings (id, status)
VALUES (1, 'OPEN')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  store TEXT NOT NULL CHECK (store IN ('GS25', 'CU')),
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('1+1', '2+1')),
  product_name TEXT NOT NULL,
  original_paid_price INTEGER NOT NULL CHECK (original_paid_price > 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  expiry_date DATE,
  unit_base_price INTEGER NOT NULL CHECK (unit_base_price >= 0),
  initial_ratio INTEGER NOT NULL CHECK (initial_ratio BETWEEN 0 AND 100),
  initial_price INTEGER NOT NULL CHECK (initial_price >= 0),
  had_price_offer BOOLEAN NOT NULL DEFAULT false,
  offered_ratio INTEGER CHECK (offered_ratio IS NULL OR offered_ratio BETWEEN 0 AND 100),
  offered_price INTEGER CHECK (offered_price IS NULL OR offered_price >= 0),
  offer_accepted BOOLEAN,
  final_ratio INTEGER NOT NULL CHECK (final_ratio BETWEEN 0 AND 100),
  final_price INTEGER NOT NULL CHECK (final_price >= 0),
  contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'kakao')),
  contact_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (
    status IN (
      'SUBMITTED', 'CONTACTED', 'EVIDENCE_VERIFIED', 'QR_RECEIVED',
      'COMPLETED', 'NOT_PURCHASED', 'FAILED'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON public.applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_final_price ON public.applications (final_price);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_recruitment_settings_updated_at ON public.recruitment_settings;
CREATE TRIGGER set_recruitment_settings_updated_at
  BEFORE UPDATE ON public.recruitment_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.recruitment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('recruitment_settings', 'admin_users', 'applications')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, policy_row.tablename);
  END LOOP;
END;
$$;

CREATE POLICY "recruitment_status_read"
  ON public.recruitment_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "recruitment_status_admin_update"
  ON public.recruitment_settings FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_users_self_read"
  ON public.admin_users FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "applications_admin_read"
  ON public.applications FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "applications_admin_status_update"
  ON public.applications FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON TABLE public.recruitment_settings FROM anon, authenticated;
GRANT SELECT (status) ON TABLE public.recruitment_settings TO anon;
GRANT SELECT ON TABLE public.recruitment_settings TO authenticated;
GRANT UPDATE (status) ON TABLE public.recruitment_settings TO authenticated;
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;
GRANT SELECT (user_id) ON TABLE public.admin_users TO authenticated;
REVOKE ALL ON TABLE public.applications FROM anon, authenticated;
GRANT SELECT ON TABLE public.applications TO authenticated;
GRANT UPDATE (status) ON TABLE public.applications TO authenticated;

DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN,
  INTEGER, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.submit_application(
  p_store TEXT, p_promotion_type TEXT, p_product_name TEXT,
  p_original_paid_price INTEGER, p_quantity INTEGER, p_expiry_date DATE,
  p_unit_base_price INTEGER, p_initial_ratio INTEGER, p_initial_price INTEGER,
  p_had_price_offer BOOLEAN, p_offered_ratio INTEGER DEFAULT NULL,
  p_offered_price INTEGER DEFAULT NULL, p_offer_accepted BOOLEAN DEFAULT NULL,
  p_final_ratio INTEGER DEFAULT NULL, p_final_price INTEGER DEFAULT NULL,
  p_contact_type TEXT DEFAULT 'phone', p_contact_value TEXT DEFAULT ''
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_recruitment_status TEXT; v_new_id UUID;
BEGIN
  IF p_store NOT IN ('GS25', 'CU') OR p_promotion_type NOT IN ('1+1', '2+1') THEN
    RAISE EXCEPTION '상품 유형을 확인해주세요.';
  END IF;
  IF p_product_name IS NULL OR length(btrim(p_product_name)) = 0 OR length(btrim(p_product_name)) > 200 THEN
    RAISE EXCEPTION '상품명을 확인해주세요.';
  END IF;
  IF p_original_paid_price IS NULL OR p_original_paid_price <= 0 OR p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION '상품 정보를 확인해주세요.';
  END IF;
  IF p_unit_base_price IS NULL OR p_unit_base_price < 0
    OR p_initial_ratio IS NULL OR p_initial_ratio NOT BETWEEN 0 AND 100
    OR p_final_ratio IS NULL OR p_final_ratio NOT BETWEEN 0 AND 100
    OR p_initial_price IS NULL OR p_initial_price < 0
    OR p_final_price IS NULL OR p_final_price < 0 THEN
    RAISE EXCEPTION '판매가격을 확인해주세요.';
  END IF;
  IF p_had_price_offer AND (p_offered_ratio IS NULL OR p_offered_price IS NULL OR p_offer_accepted IS NULL) THEN
    RAISE EXCEPTION '가격 제안 정보를 확인해주세요.';
  END IF;
  IF p_contact_type NOT IN ('phone', 'kakao') OR length(btrim(coalesce(p_contact_value, ''))) = 0 THEN
    RAISE EXCEPTION '연락처를 확인해주세요.';
  END IF;
  IF p_contact_type = 'phone' AND btrim(p_contact_value) !~ '^01[016789]-[0-9]{3,4}-[0-9]{4}$' THEN
    RAISE EXCEPTION '휴대전화 번호 형식을 확인해주세요.';
  END IF;

  SELECT status INTO v_recruitment_status
  FROM public.recruitment_settings WHERE id = 1 FOR UPDATE;
  IF v_recruitment_status IS NULL OR v_recruitment_status <> 'OPEN' THEN
    RAISE EXCEPTION '현재는 판매 신청을 받고 있지 않습니다. (상태: %)', coalesce(v_recruitment_status, 'UNKNOWN');
  END IF;

  INSERT INTO public.applications (
    store, promotion_type, product_name, original_paid_price, quantity,
    expiry_date, unit_base_price, initial_ratio, initial_price, had_price_offer,
    offered_ratio, offered_price, offer_accepted, final_ratio, final_price,
    contact_type, contact_value, status
  ) VALUES (
    p_store, p_promotion_type, btrim(p_product_name), p_original_paid_price, p_quantity,
    p_expiry_date, p_unit_base_price, p_initial_ratio,
    p_initial_price, p_had_price_offer, p_offered_ratio, p_offered_price,
    p_offer_accepted, p_final_ratio, p_final_price, p_contact_type,
    btrim(p_contact_value), 'SUBMITTED'
  ) RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, INTEGER, INTEGER, BOOLEAN,
  INTEGER, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, INTEGER, INTEGER, BOOLEAN,
  INTEGER, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT
) TO anon, authenticated;
