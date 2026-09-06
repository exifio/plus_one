-- Align seller submission with the current manual/screenshot registration contract.
-- Existing rows are preserved; NOT VALID constraints still protect every new row.

alter table public.sale_requests
  add column if not exists registration_method text;

update public.sale_requests
set registration_method = 'manual'
where registration_method is null;

alter table public.sale_requests
  alter column registration_method set default 'manual',
  alter column registration_method set not null,
  alter column evidence_image drop not null;

alter table public.sale_requests
  drop constraint if exists sale_requests_registration_method_check,
  drop constraint if exists sale_requests_required_evidence_check;

alter table public.sale_requests
  add constraint sale_requests_registration_method_check
    check (registration_method in ('manual', 'screenshot')),
  add constraint sale_requests_required_evidence_check
    check (
      (registration_method = 'manual' and evidence_image is null)
      or length(trim(coalesce(evidence_image, ''))) > 0
    ) not valid;

alter table public.stored_items
  alter column product_name drop not null,
  alter column expiration_date drop not null,
  alter column original_price drop not null;

alter table public.stored_items
  drop constraint if exists stored_items_required_fields_check;

alter table public.stored_items
  add constraint stored_items_required_fields_check
  check (
    asking_price is not null
    and asking_price > 0
    and (
      (
        product_name is not null
        and length(trim(product_name)) > 0
        and original_price is not null
        and original_price > 0
      )
      or (
        product_name is null
        and expiration_date is null
        and original_price is null
      )
    )
  ) not valid;

drop function if exists public.create_sale_request(text, text, text, text, text, jsonb);
drop function if exists public.create_sale_request(text, text, text, text, text, jsonb, text);

create function public.create_sale_request(
  p_contact_type text,
  p_contact_value text,
  p_convenience_store text,
  p_promotion_type text,
  p_evidence_image text,
  p_items jsonb,
  p_registration_method text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recruitment_status text;
  v_contact_value text;
  v_seller_id uuid;
  v_sale_request_id uuid;
  v_item jsonb;
  v_price text;
  v_expiration_date text;
begin
  select status
  into v_recruitment_status
  from public.recruitment_settings
  where id = 1
  for share;

  if v_recruitment_status is distinct from 'open' then
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

  if p_contact_type = 'phone' and v_contact_value !~ '^(010|011)[0-9]{8}$' then
    raise exception 'invalid phone number';
  end if;

  if p_convenience_store is null or p_convenience_store not in ('gs25', 'cu') then
    raise exception 'invalid convenience store';
  end if;

  if p_promotion_type is null or p_promotion_type not in ('one_plus_one', 'two_plus_one') then
    raise exception 'invalid promotion type';
  end if;

  if p_registration_method is null
    or p_registration_method not in ('manual', 'screenshot') then
    raise exception 'invalid registration method';
  end if;

  if p_registration_method = 'screenshot'
    and trim(coalesce(p_evidence_image, '')) = '' then
    raise exception 'evidence image is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'at least one stored item is required';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'at least one stored item is required';
  end if;

  for v_item in select jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'stored item must be an object';
    end if;

    if p_registration_method = 'manual' then
      if trim(coalesce(v_item->>'product_name', '')) = '' then
        raise exception 'product name is required';
      end if;

      v_expiration_date := nullif(trim(v_item->>'expiration_date'), '');
      if v_expiration_date is not null then
        if v_expiration_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
          raise exception 'expiration date is invalid';
        end if;
        if v_expiration_date::date < (now() at time zone 'Asia/Seoul')::date then
          raise exception 'expiration date cannot be in the past';
        end if;
      end if;

      v_price := v_item->>'original_price';
      if v_price is null or v_price !~ '^[0-9]+$'
        or v_price::numeric <= 0 or v_price::numeric > 2147483647 then
        raise exception 'original price must be a positive integer';
      end if;
    end if;

    v_price := v_item->>'asking_price';
    if v_price is null or v_price !~ '^[0-9]+$'
      or v_price::numeric <= 0 or v_price::numeric > 2147483647 then
      raise exception 'asking price must be a positive integer';
    end if;
  end loop;

  insert into public.sellers (contact_type, contact_value)
  values (p_contact_type, v_contact_value)
  on conflict (contact_type, contact_value) do update
    set contact_type = excluded.contact_type
  returning seller_id into v_seller_id;

  insert into public.sale_requests (
    seller_id,
    convenience_store,
    promotion_type,
    registration_method,
    evidence_image
  )
  values (
    v_seller_id,
    p_convenience_store,
    p_promotion_type,
    p_registration_method,
    nullif(trim(coalesce(p_evidence_image, '')), '')
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
      case when p_registration_method = 'manual'
        then trim(v_item->>'product_name') else null end,
      case when p_registration_method = 'manual'
        then nullif(trim(v_item->>'expiration_date'), '')::date else null end,
      case when p_registration_method = 'manual'
        then (v_item->>'original_price')::integer else null end,
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

revoke all on function public.create_sale_request(text, text, text, text, text, jsonb, text)
  from public;
grant execute on function public.create_sale_request(text, text, text, text, text, jsonb, text)
  to anon, authenticated, service_role;
