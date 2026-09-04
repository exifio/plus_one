export function normalizeSellerContact(contactType, contactValue) {
  const trimmed = String(contactValue ?? '').trim();

  if (!trimmed) return '';
  if (contactType === 'phone') return trimmed.replace(/\D/g, '');
  if (contactType === 'kakao') return trimmed;

  return trimmed;
}
