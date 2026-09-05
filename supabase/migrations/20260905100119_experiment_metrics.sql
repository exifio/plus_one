-- Return the current experiment metrics without exposing raw seller or evidence data.

create or replace function public.get_experiment_metrics()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with request_summary as (
  select
    count(*)::integer as total_sale_requests,
    count(distinct seller_id)::integer as unique_sellers,
    count(*) filter (where status = 'completed')::integer as completed_sale_requests,
    count(*) filter (where status = 'received')::integer as received_requests,
    count(*) filter (where status = 'contacting')::integer as contacting_requests,
    count(*) filter (where convenience_store = 'gs25')::integer as gs25_requests,
    count(*) filter (where convenience_store = 'cu')::integer as cu_requests,
    count(*) filter (where promotion_type = 'one_plus_one')::integer as one_plus_one_requests,
    count(*) filter (where promotion_type = 'two_plus_one')::integer as two_plus_one_requests
  from public.sale_requests
),
repeat_seller_summary as (
  select count(*)::integer as repeat_sellers
  from (
    select seller_id
    from public.sale_requests
    group by seller_id
    having count(*) >= 2
  ) repeat_sellers
),
item_summary as (
  select
    count(*) filter (where result = 'pending')::integer as pending_items,
    count(*) filter (where result = 'purchased')::integer as purchased_items,
    count(*) filter (where result = 'rejected')::integer as rejected_items
  from public.stored_items
),
asking_prices as (
  select asking_price as price, count(*)::integer as item_count
  from public.stored_items
  where asking_price is not null
  group by asking_price
),
ratio_summary as (
  select
    count(*) filter (where asking_price::numeric / original_price * 100 <= 25)::integer as lte_25,
    count(*) filter (where asking_price::numeric / original_price * 100 > 25 and asking_price::numeric / original_price * 100 <= 50)::integer as mid_26_50,
    count(*) filter (where asking_price::numeric / original_price * 100 > 50 and asking_price::numeric / original_price * 100 <= 75)::integer as mid_51_75,
    count(*) filter (where asking_price::numeric / original_price * 100 > 75 and asking_price::numeric / original_price * 100 <= 100)::integer as mid_76_100,
    count(*) filter (where asking_price::numeric / original_price * 100 > 100)::integer as gt_100
  from public.stored_items
  where asking_price is not null
    and original_price is not null
)
select jsonb_build_object(
  'recruitmentStatus', (select status from public.recruitment_settings where id = 1),
  'totalSaleRequests', request_summary.total_sale_requests,
  'uniqueSellers', request_summary.unique_sellers,
  'purchasedItems', item_summary.purchased_items,
  'completedSaleRequests', request_summary.completed_sale_requests,
  'repeatSellers', repeat_seller_summary.repeat_sellers,
  'askingPriceDistribution', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('price', price, 'count', item_count)
        order by price
      )
      from asking_prices
    ),
    '[]'::jsonb
  ),
  'askingPriceRatioDistribution', jsonb_build_object(
    'lte_25', ratio_summary.lte_25,
    'mid_26_50', ratio_summary.mid_26_50,
    'mid_51_75', ratio_summary.mid_51_75,
    'mid_76_100', ratio_summary.mid_76_100,
    'gt_100', ratio_summary.gt_100
  ),
  'convenienceStoreCounts', jsonb_build_object(
    'gs25', request_summary.gs25_requests,
    'cu', request_summary.cu_requests
  ),
  'promotionTypeCounts', jsonb_build_object(
    'one_plus_one', request_summary.one_plus_one_requests,
    'two_plus_one', request_summary.two_plus_one_requests
  ),
  'saleRequestStatusCounts', jsonb_build_object(
    'received', request_summary.received_requests,
    'contacting', request_summary.contacting_requests,
    'completed', request_summary.completed_sale_requests
  ),
  'itemResultCounts', jsonb_build_object(
    'pending', item_summary.pending_items,
    'purchased', item_summary.purchased_items,
    'rejected', item_summary.rejected_items
  )
)
from request_summary, item_summary, repeat_seller_summary, ratio_summary;
$$;

revoke all on function public.get_experiment_metrics() from public, anon, authenticated;
grant execute on function public.get_experiment_metrics() to service_role;
