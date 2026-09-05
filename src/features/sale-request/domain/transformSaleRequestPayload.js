import { normalizeSellerContact } from './normalizeSellerContact';

export function transformSaleRequestPayload(draft, evidencePath) {
  const registrationMethod = draft.registrationMethod ?? 'manual';

  return {
    contact_type: draft.contactType,
    contact_value: normalizeSellerContact(draft.contactType, draft.contactValue),
    convenience_store: draft.convenienceStore,
    promotion_type: draft.promotionType,
    registration_method: registrationMethod,
    evidence_image: registrationMethod === 'screenshot' ? evidencePath : null,
    items: registrationMethod === 'screenshot'
      ? []
      : draft.items.map((item) => ({
        product_name: String(item.productName ?? '').trim(),
        expiration_date: item.expirationDate ? item.expirationDate : null,
        original_price: item.originalPrice,
        asking_price: item.askingPrice,
      })),
  };
}
