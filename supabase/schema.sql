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
  original_paid_price INTEGER NOT NULL CHECK (original_paid_price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  expiry_date DATE,
  unit_base_price INTEGER NOT NULL CHECK (unit_base_price >= 0),
  desired_price INTEGER NOT NULL DEFAULT 0 CHECK (desired_price >= 0),
  contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'kakao')),
  contact_value TEXT NOT NULL,
  registration_method TEXT NOT NULL DEFAULT 'MANUAL' CHECK (registration_method IN ('SCREENSHOT', 'MANUAL')),
  screenshot_file_name TEXT,
  CONSTRAINT applications_product_name_check CHECK (
    registration_method = 'SCREENSHOT' OR length(btrim(product_name)) > 0
  ),
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (
    status IN (
      'SUBMITTED', 'CONTACTED', 'EVIDENCE_VERIFIED', 'QR_RECEIVED',
      'COMPLETED', 'NOT_PURCHASED', 'FAILED'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON public.applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_desired_price ON public.applications (desired_price);

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

CREATE OR REPLACE FUNCTION public.protect_application_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_status TEXT := NEW.status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ADMIN_ONLY';
  END IF;
  NEW := jsonb_populate_record(
    NULL::public.applications,
    to_jsonb(OLD) || jsonb_build_object(
      'status', v_status,
      'updated_at', to_jsonb(now())
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_protect_update ON public.applications;
CREATE TRIGGER applications_protect_update
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.protect_application_update();

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

DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, INTEGER, INTEGER, BOOLEAN,
  INTEGER, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT
);

DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, INTEGER, TEXT, TEXT
);

DROP FUNCTION IF EXISTS public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.submit_application(
  p_store TEXT, p_promotion_type TEXT, p_product_name TEXT,
  p_original_paid_price INTEGER, p_quantity INTEGER, p_expiry_date DATE DEFAULT NULL,
  p_desired_price INTEGER DEFAULT 0,
  p_contact_type TEXT DEFAULT 'phone', p_contact_value TEXT DEFAULT '',
  p_registration_method TEXT DEFAULT 'MANUAL',
  p_screenshot_file_name TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
  IF p_contact_type = 'phone' AND btrim(p_contact_value) !~ '^01[016789]-[0-9]{3,4}-[0-9]{4}$' THEN
    RAISE EXCEPTION '휴대전화 번호 형식을 확인해주세요.';
  END IF;

  SELECT status INTO v_recruitment_status
  FROM public.recruitment_settings WHERE id = 1 FOR UPDATE;
  IF v_recruitment_status IS NULL OR v_recruitment_status <> 'OPEN' THEN
    RAISE EXCEPTION '현재는 판매 신청을 받고 있지 않습니다. (상태: %)', coalesce(v_recruitment_status, 'UNKNOWN');
  END IF;

  v_unit_base_price := (
    round(
      (p_original_paid_price::numeric /
        CASE p_promotion_type WHEN '1+1' THEN 2 WHEN '2+1' THEN 3 END) / 100
    ) * 100
  )::integer;

  INSERT INTO public.applications (
    store, promotion_type, product_name, original_paid_price, quantity,
    expiry_date, unit_base_price, desired_price, contact_type, contact_value,
    registration_method, screenshot_file_name, status
  ) VALUES (
    p_store, p_promotion_type, btrim(p_product_name), p_original_paid_price, p_quantity,
    p_expiry_date, v_unit_base_price, p_desired_price, p_contact_type,
    btrim(p_contact_value), p_registration_method, p_screenshot_file_name, 'SUBMITTED'
  ) RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

-- 스크린샷 Storage bucket 및 정책 (private)
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

REVOKE ALL ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_application(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;
