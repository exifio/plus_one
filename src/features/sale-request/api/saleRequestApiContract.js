import { assertApiContract } from '../../api/apiContract';

/**
 * 판매자 API 계약 명세.
 *
 * 모든 sale-request 어댑터는 다음 함수를
 * 동일한 시그니처로 구현해야 한다.
 *
 * - submitSaleRequest(draft)
 *   - draft: 판매 등록 Draft (reducer 상태)
 *   - 반환: 성공 시 { saleRequestId, sellerId, itemsCount }
 *   - 모집 상태가 open이 아니면 RECRUITMENT_NOT_OPEN 계열 오류를 반환한다 (Backend 강제 규칙)
 * - getRecruitmentStatus()
 *   - 반환: { status } (status: 'open' | 'paused' | 'closed')
 */
export const SALE_REQUEST_API_CONTRACT = [
  { name: 'submitSaleRequest', arity: 1 },
  { name: 'getRecruitmentStatus', arity: 0 },
];

export function assertSaleRequestApiContract(api) {
  return assertApiContract(api, SALE_REQUEST_API_CONTRACT);
}