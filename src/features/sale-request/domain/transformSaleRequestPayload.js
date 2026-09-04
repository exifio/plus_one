import { normalizeSellerContact } from './normalizeSellerContact';

export function transformSaleRequestPayload(draft, evidencePath) {
  return {
    contact_type: draft.contactType,
    contact_value: normalizeSellerContact(draft.contactType, draft.contactValue),
    convenience_store: draft.convenienceStore,
    promotion_type: draft.promotionType,
    evidence_image: evidencePath,
    items: draft.items.map((item) => ({
      product_name: String(item.productName ?? '').trim(),
      expiration_date: item.expirationDate,
      original_price: item.originalPrice,
      asking_price: item.askingPrice,
    })),
  };
}
