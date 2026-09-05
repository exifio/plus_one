/**
 * Fixture Storage API.
 *
 * 실제 업로드 없이 이미지를 object path처럼 취급한다.
 * - string → 그대로 반환
 * - File/Object → name 사용
 *
 * 실제 Supabase Storage adapter가 같은 계약을 따라 교체되는 구조다.
 */
export const createFixtureStorageApi = () => ({
  async uploadEvidence(image) {
    if (typeof image === 'string') return image;
    if (image && typeof image.name === 'string') return image.name;
    throw new Error('fixture: invalid evidence image');
  },

  async uploadPurchaseEvidence(image) {
    if (typeof image === 'string') return image;
    if (image && typeof image.name === 'string') return `purchase-evidence/${image.name}`;
    throw new Error('fixture: invalid purchase evidence image');
  },
});