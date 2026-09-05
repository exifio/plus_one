-- Keep final item results mutually exclusive with their auxiliary fields.

alter table public.stored_items
  drop constraint if exists stored_items_result_invariant_check;

alter table public.stored_items
  add constraint stored_items_result_invariant_check
  check (
    (
      result = 'pending'
      and purchase_evidence is null
      and rejection_reason is null
    )
    or (
      result = 'purchased'
      and purchase_evidence is not null
      and length(trim(purchase_evidence)) > 0
      and rejection_reason is null
    )
    or (
      result = 'rejected'
      and rejection_reason is not null
      and length(trim(rejection_reason)) > 0
      and purchase_evidence is null
    )
  );
