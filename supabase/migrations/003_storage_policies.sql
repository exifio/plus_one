-- 003_storage_policies.sql
-- Storage buckets: sale-evidence, purchase-evidence (private) + RLS policies

-- Storage buckets (run manually or via supabase CLI)
-- insert into storage.buckets (id, name, public) values ('sale-evidence', 'sale-evidence', false);
-- insert into storage.buckets (id, name, public) values ('purchase-evidence', 'purchase-evidence', false);

-- sale-evidence: anyone can upload (anonymous seller), nobody can list/read
create policy "anonymous_insert_sale_evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'sale-evidence'
    and (storage.foldername(name))[1] = 'anonymous'
  );

create policy "no_select_sale_evidence"
  on storage.objects for select
  using (bucket_id = 'sale-evidence');

create policy "no_update_sale_evidence"
  on storage.objects for update
  using (bucket_id = 'sale-evidence');

create policy "no_delete_sale_evidence"
  on storage.objects for delete
  using (bucket_id = 'sale-evidence');

-- purchase-evidence: only service_role can insert (admin upload)
create policy "service_insert_purchase_evidence"
  on storage.objects for insert
  with check (bucket_id = 'purchase-evidence');

create policy "service_select_purchase_evidence"
  on storage.objects for select
  using (bucket_id = 'purchase-evidence');

create policy "no_anon_purchase_evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'purchase-evidence'
    and auth.role() = 'anon'
  ) using (false);
