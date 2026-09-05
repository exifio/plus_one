-- 003_storage_policies.sql
-- Storage buckets: sale-evidence, purchase-evidence (private) + RLS policies
-- 주의: storage.objects 정책은 역할을 명시하지 않으면 모든 역할에 허용(permissive)으로 적용된다.
--       따라서 "차단"하려면 정책을 아예 두지 않아 default deny에 맡기거나,
--       명시적으로 `to anon` 등을 제한해야 한다.

-- Private buckets (idempotent)
insert into storage.buckets (id, name, public)
values ('sale-evidence', 'sale-evidence', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('purchase-evidence', 'purchase-evidence', false)
on conflict (id) do nothing;

-- sale-evidence: anon 제한 업로드만 허용, list/read/update/delete는 정책 없음 → 기본 차단
-- (service_role은 RLS를 bypass하므로 관리자 조회/서명 URL 생성에 지장 없음)
drop policy if exists "anonymous_insert_sale_evidence" on storage.objects;
create policy "anonymous_insert_sale_evidence"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'sale-evidence'
    and (storage.foldername(name))[1] = 'anonymous'
  );

-- purchase-evidence: 정책 자체를 두지 않아 anon 업로드/조회 모두 기본 차단.
-- 오직 service_role(Admin Edge Function)만 RLS bypass로 접근한다.
