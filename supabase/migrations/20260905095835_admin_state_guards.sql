-- Enforce one-way admin state transitions at the database boundary.

create or replace function public.start_contact(p_sale_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sale_requests
  set status = 'contacting'
  where sale_request_id = p_sale_request_id
    and status = 'received';

  if not found then
    raise exception 'sale request cannot start contact';
  end if;

  return 'contacting';
end;
$$;

create or replace function public.process_stored_item(
  p_stored_item_id uuid,
  p_result text,
  p_purchase_evidence text,
  p_rejection_reason text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_request_id uuid;
  v_current_result text;
  v_next_status text;
begin
  select sale_request_id, result
  into v_sale_request_id, v_current_result
  from public.stored_items
  where stored_item_id = p_stored_item_id
  for update;

  if not found then
    raise exception 'stored_item not found';
  end if;

  if v_current_result <> 'pending' then
    raise exception 'stored_item is already finalized';
  end if;

  if p_result = 'purchased' then
    if trim(coalesce(p_purchase_evidence, '')) = '' then
      raise exception 'purchase evidence is required';
    end if;
    if p_rejection_reason is not null then
      raise exception 'rejection reason must be null for purchase';
    end if;

    update public.stored_items
    set
      result = 'purchased',
      purchase_evidence = trim(p_purchase_evidence),
      rejection_reason = null
    where stored_item_id = p_stored_item_id;
  elsif p_result = 'rejected' then
    if trim(coalesce(p_rejection_reason, '')) = '' then
      raise exception 'rejection reason is required';
    end if;
    if p_purchase_evidence is not null then
      raise exception 'purchase evidence must be null for rejection';
    end if;

    update public.stored_items
    set
      result = 'rejected',
      rejection_reason = trim(p_rejection_reason),
      purchase_evidence = null
    where stored_item_id = p_stored_item_id;
  else
    raise exception 'invalid final result';
  end if;

  if not exists (
    select 1
    from public.stored_items
    where sale_request_id = v_sale_request_id
      and result = 'pending'
  ) then
    update public.sale_requests
    set status = 'completed'
    where sale_request_id = v_sale_request_id;
    v_next_status := 'completed';
  else
    v_next_status := 'contacting';
  end if;

  return v_next_status;
end;
$$;

revoke all on function public.start_contact(uuid) from public, anon, authenticated;
revoke all on function public.process_stored_item(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.start_contact(uuid) to service_role;
grant execute on function public.process_stored_item(uuid, text, text, text) to service_role;
