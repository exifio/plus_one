import { assertSaleRequestApiContract } from '../../features/sale-request/api/saleRequestApiContract';
import { transformSaleRequestPayload } from '../../features/sale-request/domain/transformSaleRequestPayload';
import { validateSaleRequest } from '../../features/sale-request/domain/validateSaleRequest';
import { getKoreanTodayString } from '../../features/sale-request/domain/getKoreanTodayString';

function toEvidencePath(evidenceImage) {
  if (typeof evidenceImage === 'string') return evidenceImage;
  if (evidenceImage && typeof evidenceImage.name === 'string') return evidenceImage.name;
  return 'fixture-evidence';
}

/**
 * create_sale_request RPC의 모집 상태 검사를 재현한다.
 * open이 아니면 Seller/SaleRequest/StoredItem이 생성되기 전에 차단한다. (명세 §14)
 */
function assertRecruitmentOpen(store) {
  if (store.recruitment?.status !== 'open') {
    const error = new Error('RECRUITMENT_NOT_OPEN');
    error.code = 'RECRUITMENT_NOT_OPEN';
    throw error;
  }
}

/**
 * 판매자 Fixture API.
 *
 * `create_sale_request` RPC가 수행하는 모집 상태 검사, Seller 조회/생성,
 * SaleRequest 생성, StoredItem 일괄 생성, 연락처 정규화를
 * 메모리에서 동일한 순서로 재현한다.
 */
export function createFixtureSaleRequestApi(store) {
  const api = {
    async getRecruitmentStatus() {
      return { status: store.recruitment.status };
    },

    async submitSaleRequest(draft) {
      assertRecruitmentOpen(store);

      if (!validateSaleRequest(draft, getKoreanTodayString()).valid) {
        throw new Error('invalid sale request');
      }

      const payload = transformSaleRequestPayload(draft, toEvidencePath(draft.evidenceImage));

      let seller = store.sellers.find(
        (candidate) =>
          candidate.contact_type === payload.contact_type
          && candidate.contact_value === payload.contact_value,
      );

      if (!seller) {
        seller = {
          seller_id: store.nextId('seller'),
          contact_type: payload.contact_type,
          contact_value: payload.contact_value,
          created_at: new Date().toISOString(),
        };
        store.sellers.push(seller);
      }

      const saleRequest = {
        sale_request_id: store.nextId('sr'),
        seller_id: seller.seller_id,
        convenience_store: payload.convenience_store,
        promotion_type: payload.promotion_type,
        status: 'received',
        evidence_image: payload.evidence_image,
        created_at: new Date().toISOString(),
      };
      store.saleRequests.push(saleRequest);

      const storedItems = payload.items.map((item) => ({
        stored_item_id: store.nextId('item'),
        sale_request_id: saleRequest.sale_request_id,
        product_name: item.product_name,
        expiration_date: item.expiration_date,
        original_price: item.original_price,
        asking_price: item.asking_price,
        result: 'pending',
        purchase_evidence: null,
        rejection_reason: null,
        created_at: new Date().toISOString(),
      }));
      store.storedItems.push(...storedItems);

      return {
        saleRequestId: saleRequest.sale_request_id,
        sellerId: seller.seller_id,
        itemsCount: storedItems.length,
      };
    },
  };

  assertSaleRequestApiContract(api);
  return api;
}
