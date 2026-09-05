-- 001_initial_schema.sql
-- sellers, sale_requests, stored_items tables with constraints and indexes

create table public.sellers (
  seller_id uuid primary key default gen_random_uuid(),
  contact_type text not null check (contact_type in ('phone', 'kakao')),
  contact_value text not null check (length(trim(contact_value)) > 0),
  created_at timestamptz not null default now(),
  unique (contact_type, contact_value)
);

create table public.sale_requests (
  sale_request_id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(seller_id),
  convenience_store text not null check (convenience_store in ('gs25', 'cu')),
  promotion_type text not null check (promotion_type in ('one_plus_one', 'two_plus_one')),
  status text not null default 'received' check (status in ('received', 'contacting', 'completed')),
  evidence_image text not null check (length(trim(evidence_image)) > 0),
  created_at timestamptz not null default now()
);

create table public.stored_items (
  stored_item_id uuid primary key default gen_random_uuid(),
  sale_request_id uuid not null references public.sale_requests(sale_request_id) on delete cascade,
  product_name text not null check (length(trim(product_name)) > 0),
  expiration_date date,
  original_price integer not null check (original_price > 0),
  asking_price integer not null check (asking_price > 0),
  result text not null default 'pending' check (result in ('pending', 'purchased', 'rejected')),
  purchase_evidence text,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index idx_sale_requests_seller_id on public.sale_requests(seller_id);
create index idx_sale_requests_status on public.sale_requests(status);
create index idx_stored_items_sale_request_id on public.stored_items(sale_request_id);
create index idx_stored_items_result on public.stored_items(result);

alter table public.sale_requests enable row level security;
alter table public.sellers enable row level security;
alter table public.stored_items enable row level security;
