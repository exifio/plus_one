-- 002_create_sale_request_rpc.sql
-- create_sale_request RPC: atomic seller lookup/creation + sale_request + stored_items

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
  v_seller_id uuid;
  v_sale_request_id uuid;
  v_item jsonb;
begin
  -- upsert seller
  insert into public.sellers (contact_type, contact_value)
  values (p_contact_type, p_contact_value)
  on conflict (contact_type, contact_value) do update
    set contact_type = excluded.contact_type
  returning seller_id into v_seller_id;

  -- create sale request
  insert into public.sale_requests (seller_id, convenience_store, promotion_type, evidence_image)
  values (v_seller_id, p_convenience_store, p_promotion_type, p_evidence_image)
  returning sale_request_id into v_sale_request_id;

  -- insert stored items
  for v_item in
    select jsonb_array_elements(p_items)
  loop
    insert into public.stored_items (
      sale_request_id, product_name, expiration_date,
      original_price, asking_price
    ) values (
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

revoke all on function public.create_sale_request from public;
grant execute on function public.create_sale_request to anon, authenticated;
