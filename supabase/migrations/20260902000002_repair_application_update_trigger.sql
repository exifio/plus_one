-- +1 MVP: 이전 가격 흐름 컬럼을 참조하는 상태 변경 보호 trigger를 현재 모델에 맞춘다.

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

  -- status와 updated_at 외의 컬럼은 기존 값으로 보존한다.
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
