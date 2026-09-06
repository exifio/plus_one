import { validateRecruitmentStatus } from '../../features/recruitment/domain/recruitmentStatus';
import { assertAdminApiContract } from '../../features/admin/api/adminApiContract';

function adapterError(code, cause) {
  const error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function statusResult(status) {
  if (!validateRecruitmentStatus(status).valid) {
    throw adapterError('INVALID_RECRUITMENT_STATUS');
  }
  return { status };
}

const REQUEST_STATUSES = new Set(['received', 'contacting', 'completed']);
const METRIC_KEYS = [
  'recruitmentStatus',
  'totalSaleRequests',
  'uniqueSellers',
  'purchasedItems',
  'completedSaleRequests',
  'repeatSellers',
  'askingPriceDistribution',
  'askingPriceRatioDistribution',
  'convenienceStoreCounts',
  'promotionTypeCounts',
  'saleRequestStatusCounts',
  'itemResultCounts',
];

async function invokeAdmin(supabase, functionName, body) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (sessionError || !accessToken) {
    throw adapterError('ADMIN_RECRUITMENT_REQUEST_FAILED', sessionError);
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) throw adapterError('ADMIN_RECRUITMENT_REQUEST_FAILED', error);
  return data;
}

function requestStatusResult(data) {
  if (!REQUEST_STATUSES.has(data?.status)) {
    throw adapterError('ADMIN_RESPONSE_INVALID');
  }
  return data.status;
}

function saleRequestDetailResult(data) {
  if (!data?.sale_request_id || !data.seller || !Array.isArray(data.items)) {
    throw adapterError('ADMIN_RESPONSE_INVALID');
  }

  const { sale_evidence_url: saleEvidenceUrl, items, ...request } = data;
  return {
    ...request,
    evidence_image: saleEvidenceUrl ?? null,
    items: items.map(({ purchase_evidence_url: purchaseEvidenceUrl, ...item }) => ({
      ...item,
      purchase_evidence: purchaseEvidenceUrl ?? null,
    })),
  };
}

function metricsResult(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || METRIC_KEYS.some((key) => !(key in data))) {
    throw adapterError('ADMIN_RESPONSE_INVALID');
  }
  if (!validateRecruitmentStatus(data.recruitmentStatus).valid) {
    throw adapterError('ADMIN_RESPONSE_INVALID');
  }
  if (METRIC_KEYS.slice(1, 6).some((key) => !Number.isInteger(data[key]))) {
    throw adapterError('ADMIN_RESPONSE_INVALID');
  }
  if (!Array.isArray(data.askingPriceDistribution)) {
    throw adapterError('ADMIN_RESPONSE_INVALID');
  }
  return data;
}

/**
 * LINK-1 모집 상태의 실제 Supabase adapter.
 * 판매자는 공개 RPC, Admin은 Auth 세션을 전달하는 Edge Function을 사용한다.
 */
export function createSupabaseRecruitmentApis(supabase, functionName = 'admin-api') {
  const saleRequestApi = {
    async getRecruitmentStatus() {
      const { data, error } = await supabase.rpc('get_recruitment_status');
      if (error) throw adapterError('RECRUITMENT_STATUS_REQUEST_FAILED', error);
      return statusResult(data);
    },
  };

  const adminRecruitmentApi = {
    async getSaleRequests() {
      const data = await invokeAdmin(supabase, functionName, {
        action: 'listSaleRequests',
      });
      if (!Array.isArray(data)) throw adapterError('ADMIN_RESPONSE_INVALID');
      return data;
    },

    async getSaleRequest(saleRequestId) {
      if (!saleRequestId) throw adapterError('ADMIN_REQUEST_INVALID');
      const data = await invokeAdmin(supabase, functionName, {
        action: 'getSaleRequest',
        saleRequestId,
      });
      return saleRequestDetailResult(data);
    },

    async getRecruitmentStatus() {
      const data = await invokeAdmin(supabase, functionName, {
        action: 'getRecruitmentStatus',
      });
      return statusResult(data?.status);
    },

    async updateRecruitmentStatus(status) {
      if (!validateRecruitmentStatus(status).valid) {
        throw adapterError('INVALID_RECRUITMENT_STATUS');
      }

      const data = await invokeAdmin(supabase, functionName, {
        action: 'updateRecruitmentStatus',
        status,
      });
      return statusResult(data?.status).status;
    },

    async startContact(saleRequestId) {
      if (!saleRequestId) throw adapterError('ADMIN_REQUEST_INVALID');
      const data = await invokeAdmin(supabase, functionName, {
        action: 'startContact',
        saleRequestId,
      });
      return requestStatusResult(data);
    },

    async purchaseStoredItem(storedItemId, purchaseEvidence) {
      if (!storedItemId || !String(purchaseEvidence ?? '').trim()) {
        throw adapterError('ADMIN_REQUEST_INVALID');
      }
      const data = await invokeAdmin(supabase, functionName, {
        action: 'purchaseItem',
        storedItemId,
        purchaseEvidence: String(purchaseEvidence).trim(),
      });
      return requestStatusResult(data);
    },

    async rejectStoredItem(storedItemId, rejectionReason) {
      const reason = String(rejectionReason ?? '').trim();
      if (!storedItemId || !reason) throw adapterError('ADMIN_REQUEST_INVALID');
      const data = await invokeAdmin(supabase, functionName, {
        action: 'rejectItem',
        storedItemId,
        rejectionReason: reason,
      });
      return requestStatusResult(data);
    },

    async getExperimentMetrics() {
      const data = await invokeAdmin(supabase, functionName, {
        action: 'getExperimentMetrics',
      });
      return metricsResult(data);
    },
  };

  const adminStorageApi = {
    async uploadPurchaseEvidence(image) {
      if (!image || typeof image.type !== 'string' || !image.type.startsWith('image/')) {
        throw adapterError('PURCHASE_EVIDENCE_UPLOAD_FAILED');
      }

      const body = new FormData();
      body.append('action', 'uploadPurchaseEvidence');
      body.append('file', image);

      try {
        const data = await invokeAdmin(supabase, functionName, body);
        if (!data?.path) throw adapterError('PURCHASE_EVIDENCE_UPLOAD_FAILED');
        return data.path;
      } catch (error) {
        if (error?.code === 'PURCHASE_EVIDENCE_UPLOAD_FAILED') throw error;
        throw adapterError('PURCHASE_EVIDENCE_UPLOAD_FAILED', error);
      }
    },
  };

  assertAdminApiContract(adminRecruitmentApi);
  return { saleRequestApi, adminRecruitmentApi, adminStorageApi };
}
