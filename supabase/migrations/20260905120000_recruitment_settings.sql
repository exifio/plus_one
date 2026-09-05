-- Recruitment settings: global seller-recruitment status (open / paused / closed).
-- A single singleton row controls whether new sale requests are accepted.
-- The final enforcement lives inside create_sale_request (frontend bypass proof).

create table if not exists public.recruitment_settings (
  id integer primary key default 1 check (id = 1),
  status text not null default 'open',
  updated_at timestamptz not null default now(),
  constraint recruitment_settings_status_check check (status in ('open', 'paused', 'closed'))
);

-- Initial state keeps the current service behaviour: recruitment open.
insert into public.recruitment_settings (id, status)
values (1, 'open')
on conflict (id) do nothing;

alter table public.recruitment_settings enable row level security;

drop policy if exists recruitment_settings_read on public.recruitment_settings;

-- Recruitment status carries no personal data; anonymous clients may read it only.
create policy recruitment_settings_read
  on public.recruitment_settings
  for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policies: writes go through update_recruitment_status
-- (service_role only, called from the Admin Edge Function).

create or replace function public.update_recruitment_status(p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status is null or p_status not in ('open', 'paused', 'closed') then
    raise exception 'invalid recruitment status';
  end if;

  insert into public.recruitment_settings (id, status)
  values (1, p_status)
  on conflict (id) do update
    set status = excluded.status,
        updated_at = now();

  return p_status;
end;
$$;

revoke all on function public.update_recruitment_status(text) from public;
grant execute on function public.update_recruitment_status(text) to service_role;

-- ---------------------------------------------------------------------------
-- create_sale_request: enforce the recruitment check inside the same
-- transaction, before the seller upsert. If the status row is missing or not
-- 'open', nothing is written.
-- ---------------------------------------------------------------------------

drop function if exists public.create_sale_request(text, text, text, text, text, jsonb) cascade;
drop function if exists public.create_sale_request(text, text, text, text, text, jsonb, text) cascade;

create or replace function public.create_sale_request(
  p_contact_type text,
  p_contact_value text,
  p_convenience_store text,
  p_promotion_type text,
  p_evidence_image text,
  p_items jsonb,
  p_registration_method text default 'manual'
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
  v_items jsonb;
  v_price text;
  v_expiration_date text;
begin
  -- Recruitment gate: sale requests are only accepted while status = 'open'.
  -- A missing settings row also blocks submissions (fail closed).
  if not exists (
    select 1 from public.recruitment_settings where status = 'open'
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

  if p_registration_method is null or p_registration_method not in ('screenshot', 'manual') then
    raise exception 'invalid registration method';
  end if;

  if p_registration_method = 'screenshot' then
    if trim(coalesce(p_evidence_image, '')) = '' then
      raise exception 'screenshot is required';
    end if;

    -- Keep the SaleRequest -> StoredItem invariant without inventing OCR data.
    v_items := jsonb_build_array(jsonb_build_object(
      'product_name', null,
      'expiration_date', null,
      'original_price', null,
      'asking_price', null
    ));
  else
    if p_items is null or jsonb_typeof(p_items) <> 'array' then
      raise exception 'at least one stored item is required';
    end if;
    if jsonb_array_length(p_items) = 0 then
      raise exception 'at least one stored item is required';
    end if;
    v_items := p_items;
  end if;

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
    nullif(trim(p_evidence_image), '')
  )
  returning sale_request_id into v_sale_request_id;

  for v_item in select jsonb_array_elements(v_items)
  loop
    if p_registration_method = 'manual' then
      if jsonb_typeof(v_item) <> 'object'
        or trim(coalesce(v_item->>'product_name', '')) = '' then
        raise exception 'product name is required';
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

      v_expiration_date := nullif(trim(v_item->>'expiration_date'), '');
      if v_expiration_date is not null then
        if v_expiration_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
          raise exception 'expiration date is invalid';
        end if;
        if v_expiration_date::date < (now() at time zone 'Asia/Seoul')::date then
          raise exception 'expiration date cannot be in the past';
        end if;
      end if;
    end if;

    insert into public.stored_items (
      sale_request_id,
      product_name,
      expiration_date,
      original_price,
      asking_price
    )
    values (
      v_sale_request_id,
      case
        when p_registration_method = 'screenshot' then null
        else trim(v_item->>'product_name')
      end,
      case
        when p_registration_method = 'screenshot' then null
        when nullif(trim(v_item->>'expiration_date'), '') is null then null
        else (v_item->>'expiration_date')::date
      end,
      case when p_registration_method = 'screenshot' then null else (v_item->>'original_price')::integer end,
      case when p_registration_method = 'screenshot' then null else (v_item->>'asking_price')::integer end
    );
  end loop;

  return jsonb_build_object(
    'sale_request_id', v_sale_request_id,
    'seller_id', v_seller_id,
    'items_count', jsonb_array_length(v_items)
  );
end;
$$;

revoke all on function public.create_sale_request(text, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_sale_request(text, text, text, text, text, jsonb, text) to anon, authenticated;
