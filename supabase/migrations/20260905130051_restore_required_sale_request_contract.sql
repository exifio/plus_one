-- Restore the PRD contract after the non-production registration-method experiment.
-- Existing legacy rows are preserved; NOT VALID checks enforce the contract for new rows.

alter table public.sale_requests
  drop constraint if exists sale_requests_required_evidence_check;

alter table public.sale_requests
  add constraint sale_requests_required_evidence_check
  check (evidence_image is not null and length(trim(evidence_image)) > 0)
  not valid;

alter table public.stored_items
  drop constraint if exists stored_items_required_fields_check;

alter table public.stored_items
  add constraint stored_items_required_fields_check
  check (
    product_name is not null
    and length(trim(product_name)) > 0
    and expiration_date is not null
    and original_price is not null
    and original_price > 0
    and asking_price is not null
    and asking_price > 0
  )
  not valid;

drop function if exists public.create_sale_request(text, text, text, text, text, jsonb, text) cascade;
drop function if exists public.create_sale_request(text, text, text, text, text, jsonb) cascade;

create or replace function public.create_sale_request(
  p_contact_type text,
  p_contact_value text,
  p_convenience_store text,
  p_promotion_type text,
  p_evidence_image text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_value text;
  v_seller_id uuid;
  v_sale_request_id uuid;
  v_item jsonb;
  v_price text;
  v_expiration_date text;
begin
  -- The gate runs before the first write and fails closed when the row is absent.
  if not exists (
    select 1 from public.recruitment_settings where id = 1 and status = 'open'
  ) then
    raise exception 'RECRUITMENT_NOT_OPEN';
  end if;

  if p_contact_type is null or p_contact_type not in ('phone', 'kakao') then
    raise exception 'invalid contact type';
  end if;

  v_contact_value := case
    when p_contact_type = 'phone'
      then regexp_replace(trim(coalesce(p_contact_value, '')), '[^0-9]', '', 'g')
    else trim(coalesce(p_contact_value, ''))
  end;

  if v_contact_value = '' then
    raise exception 'contact value is required';
  end if;

  if p_convenience_store is null or p_convenience_store not in ('gs25', 'cu') then
    raise exception 'invalid convenience store';
  end if;

  if p_promotion_type is null or p_promotion_type not in ('one_plus_one', 'two_plus_one') then
    raise exception 'invalid promotion type';
  end if;

  if trim(coalesce(p_evidence_image, '')) = '' then
    raise exception 'evidence image is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one stored item is required';
  end if;

  for v_item in select jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or trim(coalesce(v_item->>'product_name', '')) = '' then
      raise exception 'product name is required';
    end if;

    v_expiration_date := nullif(trim(v_item->>'expiration_date'), '');
    if v_expiration_date is null then
      raise exception 'expiration date is required';
    end if;
    if v_expiration_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'expiration date is invalid';
    end if;
    if v_expiration_date::date < (now() at time zone 'Asia/Seoul')::date then
      raise exception 'expiration date cannot be in the past';
    end if;

    v_price := v_item->>'original_price';
    if v_price is null or v_price !~ '^[0-9]+$' then
      raise exception 'original price must be a positive integer';
    end if;
    if v_price::numeric <= 0 or v_price::numeric > 2147483647 then
      raise exception 'original price must be a positive integer';
    end if;

    v_price := v_item->>'asking_price';
    if v_price is null or v_price !~ '^[0-9]+$' then
      raise exception 'asking price must be a positive integer';
    end if;
    if v_price::numeric <= 0 or v_price::numeric > 2147483647 then
      raise exception 'asking price must be a positive integer';
    end if;
  end loop;

  insert into public.sellers (contact_type, contact_value)
  values (p_contact_type, v_contact_value)
  on conflict (contact_type, contact_value) do update
    set contact_type = excluded.contact_type
  returning seller_id into v_seller_id;

  -- The legacy remote registration_method column, when present, keeps its default;
  -- it is intentionally not part of the application contract.
  insert into public.sale_requests (
    seller_id,
    convenience_store,
    promotion_type,
    evidence_image
  )
  values (
    v_seller_id,
    p_convenience_store,
    p_promotion_type,
    trim(p_evidence_image)
  )
  returning sale_request_id into v_sale_request_id;

  for v_item in select jsonb_array_elements(p_items)
  loop
    insert into public.stored_items (
      sale_request_id,
      product_name,
      expiration_date,
      original_price,
      asking_price
    )
    values (
      v_sale_request_id,
      trim(v_item->>'product_name'),
      (v_item->>'expiration_date')::date,
      (v_item->>'original_price')::integer,
      (v_item->>'asking_price')::integer
    );
  end loop;

  return jsonb_build_object(
    'sale_request_id', v_sale_request_id,
    'seller_id', v_seller_id,
    'items_count', jsonb_array_length(p_items)
  );
end;
$$;

revoke all on function public.create_sale_request(text, text, text, text, text, jsonb)
  from public;
grant execute on function public.create_sale_request(text, text, text, text, text, jsonb)
  to anon, authenticated, service_role;
