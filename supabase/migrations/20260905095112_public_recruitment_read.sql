-- Expose only the current recruitment status, not the settings table.

drop policy if exists recruitment_settings_read on public.recruitment_settings;
drop policy if exists recruitment_status_read on public.recruitment_settings;
drop policy if exists recruitment_status_admin_update on public.recruitment_settings;

revoke all on table
  public.sellers,
  public.sale_requests,
  public.stored_items,
  public.recruitment_settings
from anon, authenticated;

create or replace function public.get_recruitment_status()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select status
  from public.recruitment_settings
  where id = 1;
$$;

revoke all on function public.get_recruitment_status() from public, anon, authenticated;
grant execute on function public.get_recruitment_status() to anon, authenticated, service_role;
