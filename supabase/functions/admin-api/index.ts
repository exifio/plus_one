import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isAllowedAdminUser } from './adminAuthorization.js';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const RECRUITMENT_STATUSES = new Set(['open', 'paused', 'closed']);
const REQUEST_STATUSES = new Set(['received', 'contacting', 'completed']);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function accessToken(request) {
  const value = request.headers.get('authorization') ?? '';
  if (!value.toLowerCase().startsWith('bearer ')) return '';
  return value.slice(7).trim();
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    ?? Deno.env.get('SUPABASE_SECRET_KEY')
    ?? '';

  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function failed(message = 'admin action failed', status = 400) {
  return json({ error: message }, status);
}

async function authorizeAdmin(supabase, request) {
  const token = accessToken(request);
  if (!token) return { status: 401, message: 'unauthorized' };

  const adminUserId = (Deno.env.get('ADMIN_USER_ID') ?? '').trim();
  if (!adminUserId) return { status: 500, message: 'server configuration error' };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { status: 401, message: 'unauthorized' };
  if (!isAllowedAdminUser(user.id, adminUserId)) {
    return { status: 403, message: 'forbidden' };
  }

  return { status: 200, user };
}

async function listSaleRequests(supabase, body) {
  let query = supabase
    .from('sale_requests')
    .select('sale_request_id, seller_id, convenience_store, promotion_type, status, created_at')
    .order('created_at', { ascending: false });

  if (body.status !== undefined) {
    if (!REQUEST_STATUSES.has(body.status)) return failed('invalid status');
    query = query.eq('status', body.status);
  }

  const { data: requests, error } = await query;
  if (error) return failed();

  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('seller_id, contact_type, contact_value');
  if (sellersError) return failed();

  const { data: items, error: itemsError } = await supabase
    .from('stored_items')
    .select('sale_request_id');
  if (itemsError) return failed();

  const sellerById = new Map(sellers.map((seller) => [seller.seller_id, seller]));
  const itemCounts = new Map();
  for (const item of items) {
    itemCounts.set(item.sale_request_id, (itemCounts.get(item.sale_request_id) ?? 0) + 1);
  }

  return json(requests.map((request) => ({
    ...request,
    items_count: itemCounts.get(request.sale_request_id) ?? 0,
    seller_contact: sellerById.get(request.seller_id) ?? null,
  })));
}

async function getSaleRequest(supabase, body) {
  if (!body.saleRequestId) return failed('sale request id is required');

  const { data: request, error } = await supabase
    .from('sale_requests')
    .select('*')
    .eq('sale_request_id', body.saleRequestId)
    .maybeSingle();
  if (error) return failed();
  if (!request) return failed('sale request not found', 404);

  const [{ data: seller, error: sellerError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase.from('sellers').select('*').eq('seller_id', request.seller_id).single(),
      supabase.from('stored_items').select('*').eq('sale_request_id', request.sale_request_id),
    ]);
  if (sellerError || itemsError) return failed();

  let saleEvidenceUrl = null;
  if (request.evidence_image) {
    const { data, error: signedUrlError } = await supabase.storage
      .from('sale-evidence')
      .createSignedUrl(request.evidence_image, 3600);
    if (signedUrlError) return failed();
    saleEvidenceUrl = data.signedUrl;
  }

  return json({ ...request, seller, items, sale_evidence_url: saleEvidenceUrl });
}

async function handleAction(supabase, body) {
  switch (body.action) {
    case 'listSaleRequests':
      return listSaleRequests(supabase, body);
    case 'getSaleRequest':
      return getSaleRequest(supabase, body);
    case 'startContact': {
      if (!body.saleRequestId) return failed('sale request id is required');
      const { data, error } = await supabase.rpc('start_contact', {
        p_sale_request_id: body.saleRequestId,
      });
      return error ? failed() : json({ status: data });
    }
    case 'purchaseItem': {
      const evidence = String(body.purchaseEvidence ?? '').trim();
      if (!body.storedItemId || !evidence) return failed('purchase evidence is required');
      const { data, error } = await supabase.rpc('process_stored_item', {
        p_stored_item_id: body.storedItemId,
        p_result: 'purchased',
        p_purchase_evidence: evidence,
        p_rejection_reason: null,
      });
      return error ? failed() : json({ status: data });
    }
    case 'rejectItem': {
      const reason = String(body.rejectionReason ?? '').trim();
      if (!body.storedItemId || !reason) return failed('rejection reason is required');
      const { data, error } = await supabase.rpc('process_stored_item', {
        p_stored_item_id: body.storedItemId,
        p_result: 'rejected',
        p_purchase_evidence: null,
        p_rejection_reason: reason,
      });
      return error ? failed() : json({ status: data });
    }
    case 'getRecruitmentStatus': {
      const { data, error } = await supabase.rpc('get_recruitment_status');
      return error ? failed() : json({ status: data });
    }
    case 'updateRecruitmentStatus': {
      if (!RECRUITMENT_STATUSES.has(body.status)) return failed('invalid recruitment status');
      const { data, error } = await supabase.rpc('update_recruitment_status', {
        p_status: body.status,
      });
      return error ? failed() : json({ status: data });
    }
    case 'getExperimentMetrics': {
      const { data, error } = await supabase.rpc('get_experiment_metrics');
      return error ? failed() : json(data);
    }
    default:
      return failed('unknown admin action');
  }
}

export async function handleRequest(request) {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return failed('method not allowed', 405);

  const supabase = serviceClient();
  if (!supabase) return failed('server configuration error', 500);

  const authorization = await authorizeAdmin(supabase, request);
  if (authorization.status !== 200) {
    return failed(authorization.message, authorization.status);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return failed('invalid request', 400);
  }

  return handleAction(supabase, body ?? {});
}

Deno.serve(handleRequest);
