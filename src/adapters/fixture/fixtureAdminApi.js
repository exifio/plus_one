import { assertAdminApiContract } from '../../features/admin/api/adminApiContract';
import { isSaleRequestCompleted } from '../../features/sale-request/domain/isSaleRequestCompleted';
import { validateStoredItemResult } from '../../features/sale-request/domain/validateStoredItemResult';
import { validateRecruitmentStatus } from '../../features/recruitment/domain/recruitmentStatus';

function findSaleRequestOrThrow(store, saleRequestId) {
  const request = store.saleRequests.find(
    (candidate) => candidate.sale_request_id === saleRequestId,
  );
  if (!request) {
    throw new Error('fixture: sale request not found');
  }
  return request;
}

function findStoredItemOrThrow(store, storedItemId) {
  const item = store.storedItems.find(
    (candidate) => candidate.stored_item_id === storedItemId,
  );
  if (!item) {
    throw new Error('fixture: stored item not found');
  }
  return item;
}

/**
 * Admin Fixture API.
 *
 * `start_contact`, `process_stored_item` RPC가 수행하는 상태 전이를
 * pending 존재 여부 기반 completed 판단까지 포함해 메모리에서 재현한다.
 */
export function createFixtureAdminApi(store) {
  const api = {
    async getSaleRequests() {
      return store.saleRequests.map((request) => {
        const items = store.storedItems.filter(
          (item) => item.sale_request_id === request.sale_request_id,
        );
        const seller = store.sellers.find(
          (candidate) => candidate.seller_id === request.seller_id,
        );

        return {
          ...request,
          items_count: items.length,
          seller_contact: {
            contact_type: seller.contact_type,
            contact_value: seller.contact_value,
          },
        };
      });
    },

    async getSaleRequest(saleRequestId) {
      const request = findSaleRequestOrThrow(store, saleRequestId);
      const seller = store.sellers.find(
        (candidate) => candidate.seller_id === request.seller_id,
      );
      const items = store.storedItems.filter(
        (item) => item.sale_request_id === saleRequestId,
      );

      return { ...request, seller, items };
    },

    async startContact(saleRequestId) {
      const request = findSaleRequestOrThrow(store, saleRequestId);

      if (request.status !== 'received') {
        throw new Error('fixture: only received request can start contact');
      }

      request.status = 'contacting';
      return request.status;
    },

    async purchaseStoredItem(storedItemId, purchaseEvidence) {
      return finalizeItem(storedItemId, { result: 'purchased', purchaseEvidence });
    },

    async rejectStoredItem(storedItemId, rejectionReason) {
      return finalizeItem(storedItemId, { result: 'rejected', rejectionReason });
    },

    async getRecruitmentStatus() {
      return { status: store.recruitment.status };
    },

    /**
     * `update_recruitment_status` RPC(service_role 전용)를 재현한다.
     * 허용 값은 open / paused / closed뿐이며, 다른 값은 거부한다. (명세 §16)
     */
    async updateRecruitmentStatus(status) {
      const check = validateRecruitmentStatus(status);
      if (!check.valid) {
        throw new Error(check.message);
      }

      store.recruitment = { status, updated_at: new Date().toISOString() };
      return status;
    },

    /**
     * `get_experiment_metrics` DB 함수(service_role 경유)를 재현한다.
     * 운영 데이터에서 즉시 집계하며 개인정보/증빙 path는 포함하지 않는다.
     * (PRD §13, ARCHITECTURE §16)
     */
    async getExperimentMetrics() {
      const ratioDistribution = {
        lte_25: 0,
        mid_26_50: 0,
        mid_51_75: 0,
        mid_76_100: 0,
        gt_100: 0,
      };
      const priceCounts = new Map();
      const convenienceStoreCounts = { gs25: 0, cu: 0 };
      const promotionTypeCounts = { one_plus_one: 0, two_plus_one: 0 };
      const saleRequestStatusCounts = { received: 0, contacting: 0, completed: 0 };
      const itemResultCounts = { pending: 0, purchased: 0, rejected: 0 };

      for (const request of store.saleRequests) {
        if (request.convenience_store in convenienceStoreCounts) {
          convenienceStoreCounts[request.convenience_store] += 1;
        }
        if (request.promotion_type in promotionTypeCounts) {
          promotionTypeCounts[request.promotion_type] += 1;
        }
        if (request.status in saleRequestStatusCounts) {
          saleRequestStatusCounts[request.status] += 1;
        }
      }

      for (const item of store.storedItems) {
        if (item.result in itemResultCounts) {
          itemResultCounts[item.result] += 1;
        }

        priceCounts.set(item.asking_price, (priceCounts.get(item.asking_price) || 0) + 1);

        const ratio = (item.asking_price / item.original_price) * 100;
        if (ratio <= 25) ratioDistribution.lte_25 += 1;
        else if (ratio <= 50) ratioDistribution.mid_26_50 += 1;
        else if (ratio <= 75) ratioDistribution.mid_51_75 += 1;
        else if (ratio <= 100) ratioDistribution.mid_76_100 += 1;
        else ratioDistribution.gt_100 += 1;
      }

      const requestsPerSeller = new Map();
      for (const request of store.saleRequests) {
        requestsPerSeller.set(
          request.seller_id,
          (requestsPerSeller.get(request.seller_id) || 0) + 1,
        );
      }

      return {
        recruitmentStatus: store.recruitment.status,
        totalSaleRequests: store.saleRequests.length,
        uniqueSellers: requestsPerSeller.size,
        purchasedItems: itemResultCounts.purchased,
        completedSaleRequests: saleRequestStatusCounts.completed,
        repeatSellers: [...requestsPerSeller.values()].filter((count) => count >= 2).length,
        askingPriceDistribution: [...priceCounts.entries()]
          .map(([price, count]) => ({ price, count }))
          .sort((a, b) => a.price - b.price),
        askingPriceRatioDistribution: ratioDistribution,
        convenienceStoreCounts,
        promotionTypeCounts,
        saleRequestStatusCounts,
        itemResultCounts,
      };
    },
  };

  function finalizeItem(storedItemId, { result, purchaseEvidence, rejectionReason }) {
    const item = findStoredItemOrThrow(store, storedItemId);

    if (item.result !== 'pending') {
      throw new Error('fixture: final result cannot be changed');
    }

    const check = validateStoredItemResult({
      result,
      purchaseEvidence: purchaseEvidence ?? null,
      rejectionReason: rejectionReason ?? null,
    });
    if (!check.valid) {
      throw new Error(check.message);
    }

    if (result === 'purchased') {
      item.result = 'purchased';
      item.purchase_evidence = purchaseEvidence;
      item.rejection_reason = null;
    } else {
      item.result = 'rejected';
      item.rejection_reason = rejectionReason;
      item.purchase_evidence = null;
    }

    return advanceStatus(item.sale_request_id);
  }

  function advanceStatus(saleRequestId) {
    const request = findSaleRequestOrThrow(store, saleRequestId);
    const results = store.storedItems
      .filter((item) => item.sale_request_id === saleRequestId)
      .map((item) => item.result);

    request.status = isSaleRequestCompleted(results) ? 'completed' : 'contacting';
    return request.status;
  }

  assertAdminApiContract(api);
  return api;
}
