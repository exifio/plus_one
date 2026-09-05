import { normalizeSellerContact } from './normalizeSellerContact';

export function transformSaleRequestPayload(draft, evidencePath) {
  const registrationMethod = draft.registrationMethod === undefined
    ? 'manual'
    : draft.registrationMethod;
  const isScreenshot = registrationMethod === 'screenshot';

  return {
    contact_type: draft.contactType,
    contact_value: normalizeSellerContact(draft.contactType, draft.contactValue),
    convenience_store: draft.convenienceStore,
    promotion_type: draft.promotionType,
    registration_method: registrationMethod,
    evidence_image: evidencePath ?? null,
    items: draft.items.map((item) => ({
        product_name: isScreenshot ? null : String(item.productName ?? '').trim(),
        expiration_date: isScreenshot || !item.expirationDate ? null : item.expirationDate,
        original_price: isScreenshot ? null : item.originalPrice,
        asking_price: item.askingPrice,
    })),
  };
}
