import { assertApiContract } from '../../api/apiContract';

/**
 * Admin API 계약 명세.
 *
 * 모든 admin 어댑터는 다음 함수를 동일한 시그니처로 구현해야 한다.
 *
 * - getSaleRequests()
 *   - 반환: SaleRequest 목록
 * - getSaleRequest(saleRequestId)
 *   - 반환: 단건 SaleRequest 상세 (Seller, StoredItem 포함)
 * - getRecruitmentStatus()
 *   - 반환: { status } (status: 'open' | 'paused' | 'closed')
 * - startContact(saleRequestId)
 *   - 반환: 변경된 SaleRequest 상태
 * - purchaseStoredItem(storedItemId, purchaseEvidence)
 *   - 반환: 변경 후 SaleRequest 상태
 * - rejectStoredItem(storedItemId, rejectionReason)
 *   - 반환: 변경 후 SaleRequest 상태
 * - updateRecruitmentStatus(status)
 *   - status: 'open' | 'paused' | 'closed' (다른 값은 Frontend와 Backend 모두 거부)
 *   - 반환: 변경된 모집 상태
 * - getExperimentMetrics()
 *   - 반환: 개인정보 없는 실험 현황 집계 (ARCHITECTURE §16)
 *
 * getExperimentMetrics 반환 shape:
 *   {
 *     recruitmentStatus,
 *     totalSaleRequests,
 *     uniqueSellers,
 *     purchasedItems,
 *     completedSaleRequests,
 *     repeatSellers,
 *     askingPriceDistribution,        // [{ price, count }] 오름차순
 *     askingPriceRatioDistribution,   // { lte_25, mid_26_50, mid_51_75, mid_76_100, gt_100 }
 *     convenienceStoreCounts,         // { gs25, cu }
 *     promotionTypeCounts,            // { one_plus_one, two_plus_one }
 *     saleRequestStatusCounts,        // { received, contacting, completed }
 *     itemResultCounts,               // { pending, purchased, rejected }
 *   }
 */
export const ADMIN_API_CONTRACT = [
  { name: 'getSaleRequests', arity: 0 },
  { name: 'getSaleRequest', arity: 1 },
  { name: 'getRecruitmentStatus', arity: 0 },
  { name: 'startContact', arity: 1 },
  { name: 'purchaseStoredItem', arity: 2 },
  { name: 'rejectStoredItem', arity: 2 },
  { name: 'updateRecruitmentStatus', arity: 1 },
  { name: 'getExperimentMetrics', arity: 0 },
];

export function assertAdminApiContract(api) {
  return assertApiContract(api, ADMIN_API_CONTRACT);
}
