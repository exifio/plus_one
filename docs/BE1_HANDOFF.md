# BE-1 핸드오프 (2026-09-05)

## 현재 위치
- Phase 1(Frontend) 완료, Phase 2(BE-1) 진행 중
- Docker 없이 **B안(전용 non-production Supabase 프로젝트)** 으로 Integration 환경 구성
- `.env.test.local`에 `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY`, `SUPABASE_TEST_PROJECT=non-production` 입력 완료
- migration은 Supabase SQL Editor로 수동 적용 중 (`supabase db push` 미사용)

## 테스트 DB에 이미 적용된 것
- 001_initial_schema.sql ✅ — sellers/sale_requests/stored_items 테이블 + RLS
- 003_storage_policies.sql ✅ — storage bucket 2개 (sale-evidence, purchase-evidence)
- 004_admin_rpcs.sql ✅ — start_contact, process_stored_item RPC
- 20260905120000_recruitment_settings.sql 중 일부 ✅ — recruitment_settings 테이블 + update_recruitment_status 함수
- `create_sale_request` 함수: 002로 만든 6-arg 버전이 drop(cascade)된 상태 → **최종 7-arg 버전 미적용**

## 로컬 migration 파일에 수정해둔 버그 (유지할 것)
1. **003_storage_policies.sql** — `for insert` 정책의 `using(false)` 문법 오버로 제거 + 오픈 허용 정책 오류 수정, bucket insert 활성화
2. **20260905120000 / 20260905053440** — `create_sale_request` 중복 정의 시그니처 충돌 해결을 위해 `drop function ... cascade` 추가
3. **20260905120000 / 20260905053440** — 정규식 `\d` → `[0-9]` 수정 (PostgreSQL POSIX 정규식 미지원 버그)

## 남은 작업 (아래 순서대로)
1. 테스트 DB에 `create_sale_request` 최종 7-arg 함수 생성 (아래 스크립트 실행)
2. 20260905053440_registration_method_support.sql 실행 (같은 함수를 다시 정의하지만 cascade drop 있어 성공)
3. `npm run test:integration` 실행 → 25 tests PASS 확인
4. BE-1 완료 기록, BE-2부터 TDD 순서 진행

## 테스트 DB에 실행할 create_sale_request 최종 스크립트

```sql
drop function if exists public.create_sale_request(text, text, text, text, text, jsonb) cascade;
drop function if exists public.create_sale_request(text, text, text, text, text, jsonb, text) cascade;

create or replace function public.create_sale_request(
  p_contact_type text, p_contact_value text, p_convenience_store text,
  p_promotion_type text, p_evidence_image text, p_items jsonb,
  p_registration_method text default 'manual'
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_contact_value text; v_seller_id uuid; v_sale_request_id uuid;
  v_item jsonb; v_items jsonb; v_price text; v_expiration_date text;
begin
  if not exists (select 1 from public.recruitment_settings where status = 'open') then
    raise exception 'RECRUITMENT_NOT_OPEN'; end if;
  if p_contact_type is null or p_contact_type not in ('phone', 'kakao') then
    raise exception 'invalid contact type'; end if;
  v_contact_value := case when p_contact_type = 'phone'
    then regexp_replace(p_contact_value, '[^0-9]', '', 'g') else trim(p_contact_value) end;
  if v_contact_value is null or v_contact_value = '' then raise exception 'invalid contact value'; end if;
  insert into public.sellers (contact_type, contact_value) values (p_contact_type, v_contact_value)
    on conflict (contact_type, contact_value) do update set contact_type = excluded.contact_type
    returning seller_id into v_seller_id;
  insert into public.sale_requests (seller_id, convenience_store, promotion_type, registration_method, evidence_image)
    values (v_seller_id, p_convenience_store, p_promotion_type, p_registration_method, nullif(trim(p_evidence_image), ''))
    returning sale_request_id into v_sale_request_id;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'at least one stored item is required'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'at least one stored item is required'; end if;
  v_items := p_items;
  for v_item in select jsonb_array_elements(v_items) loop
    if p_registration_method = 'manual' then
      if jsonb_typeof(v_item) <> 'object' or trim(coalesce(v_item->>'product_name', '')) = '' then raise exception 'product name is required'; end if;
      v_price := v_item->>'original_price';
      if v_price is null or v_price !~ '^[0-9]+$' or v_price::numeric <= 0 or v_price::numeric > 2147483647 then raise exception 'original price must be a positive integer'; end if;
      v_price := v_item->>'asking_price';
      if v_price is null or v_price !~ '^[0-9]+$' or v_price::numeric <= 0 or v_price::numeric > 2147483647 then raise exception 'asking price must be a positive integer'; end if;
      v_expiration_date := nullif(trim(v_item->>'expiration_date'), '');
      if v_expiration_date is not null then
        if v_expiration_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'expiration date is invalid'; end if;
        if v_expiration_date::date < (now() at time zone 'Asia/Seoul')::date then raise exception 'expiration date cannot be in the past'; end if;
      end if;
    end if;
    insert into public.stored_items (sale_request_id, product_name, expiration_date, original_price, asking_price) values (
      v_sale_request_id,
      case when p_registration_method = 'screenshot' then null else trim(v_item->>'product_name') end,
      case when p_registration_method = 'screenshot' then null when nullif(trim(v_item->>'expiration_date'), '') is null then null else (v_item->>'expiration_date')::date end,
      case when p_registration_method = 'screenshot' then null else (v_item->>'original_price')::integer end,
      case when p_registration_method = 'screenshot' then null else (v_item->>'asking_price')::integer end);
  end loop;
  return jsonb_build_object('sale_request_id', v_sale_request_id, 'seller_id', v_seller_id, 'items_count', jsonb_array_length(v_items));
end;
$$;
revoke all on function public.create_sale_request(text, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_sale_request(text, text, text, text, text, jsonb, text) to anon, authenticated;
```

## 참고
- 이 프로젝트는 AGENTS.md 규칙이 있으므로 작업 전 반드시 `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/PLAN.md`, `docs/TASKS.md` 를 읽을 것
- `service_role` / Admin Auth credential 브라우저 노출 금지, `.env` 값 Git 커밋 금지
- Integration test는 `tests/integration/supabase/clients.js`가 `.env.test.local`에서 읽음 (fallback 없음)
