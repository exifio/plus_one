/** @jest-environment node */

/*
 * 관련 작업: Phase 3 Gate — Seller/Admin 실제 연결 종단 간 검증.
 * 작성 이유: 각 RPC/Edge Function/adapter 테스트만으로는 실제 한 신청의
 * 생성부터 Admin 처리와 모집 차단, 지표 갱신까지 이어지는 계약을 보장할 수 없기 때문.
 * 확인 내용: open 제출 → 목록/상세 → 연락 시작 → 구매/거절 → completed →
 * paused/closed 제출 차단 → 실험 현황 갱신.
 */
import {
  createAnonClient,
  createAuthClient,
  createServiceClient,
  getTestAdminCredentials,
} from './clients';
import { createSupabaseRecruitmentApis } from '../../../src/adapters/supabase/supabaseRecruitmentApi';
import { createSupabaseSubmissionApis } from '../../../src/adapters/supabase/supabaseSubmissionApi';
import { TEST_CONTACT } from './testFixtures';

const { email, password } = getTestAdminCredentials();
const adminAuthTest = email && password ? test : test.skip;

const saleImage = new File(['phase3-sale-evidence'], 'phase3-gate.png', { type: 'image/png' });
const purchaseImage = new File(['phase3-purchase-evidence'], 'phase3-purchase.png', { type: 'image/png' });

function draft(contactValue = TEST_CONTACT.PHASE3_GATE) {
  return {
    registrationMethod: 'screenshot',
    convenienceStore: 'gs25',
    promotionType: 'one_plus_one',
    items: [
      { productName: '', expirationDate: '', originalPrice: null, askingPrice: 700 },
      { productName: '', expirationDate: '', originalPrice: null, askingPrice: 900 },
    ],
    contactType: 'phone',
    contactValue,
    evidenceImage: 'anonymous/phase3-gate.png',
  };
}

describe('실제 서버에서 신청부터 처리·모집 차단·실험 현황까지 한 번에 이어지는지', () => {
  adminAuthTest('연습용 서버에서 신청·연락·구매·거절·완료·모집 차단·실험 현황이 이어진다', async () => {
    const anonClient = createAnonClient();
    const authClient = createAuthClient();
    const serviceClient = createServiceClient();
    const sellerApis = createSupabaseSubmissionApis(anonClient, () => 'phase3-gate.png');
    let purchasePath;

    const { error: signInError } = await authClient.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    try {
      const { adminRecruitmentApi: adminApi, adminStorageApi } =
        createSupabaseRecruitmentApis(authClient);
      const baseline = await adminApi.getExperimentMetrics();

      await expect(
        createSupabaseRecruitmentApis(anonClient).saleRequestApi.getRecruitmentStatus(),
      ).resolves.toEqual({ status: 'open' });

      const evidencePath = await sellerApis.uploadEvidence(saleImage);
      const submission = await sellerApis.submitSaleRequest({
        ...draft(),
        evidenceImage: evidencePath,
      });

      const requests = await adminApi.getSaleRequests();
      const listed = requests.find((request) => request.sale_request_id === submission.saleRequestId);
      expect(listed).toMatchObject({
        sale_request_id: submission.saleRequestId,
        items_count: 2,
        seller_contact: { contact_type: 'phone', contact_value: TEST_CONTACT.PHASE3_GATE },
      });

      const detail = await adminApi.getSaleRequest(submission.saleRequestId);
      expect(detail.evidence_image).toMatch(/^https:\/\//);
      expect(detail.items).toHaveLength(2);
      expect(detail.items.every((item) => item.result === 'pending')).toBe(true);

      await expect(adminApi.startContact(submission.saleRequestId)).resolves.toBe('contacting');

      purchasePath = await adminStorageApi.uploadPurchaseEvidence(purchaseImage);
      await expect(
        adminApi.purchaseStoredItem(detail.items[0].stored_item_id, purchasePath),
      ).resolves.toBe('contacting');
      await expect(
        adminApi.rejectStoredItem(detail.items[1].stored_item_id, 'Phase 3 Gate 거절 확인'),
      ).resolves.toBe('completed');

      const completed = await adminApi.getSaleRequest(submission.saleRequestId);
      expect(completed.status).toBe('completed');
      expect(completed.items[0].result).toBe('purchased');
      expect(completed.items[0].purchase_evidence).toMatch(/^https:\/\//);
      expect(completed.items[1]).toEqual(expect.objectContaining({
        result: 'rejected',
        rejection_reason: 'Phase 3 Gate 거절 확인',
        purchase_evidence: null,
      }));

      const completedMetrics = await adminApi.getExperimentMetrics();
      expect(completedMetrics.totalSaleRequests).toBe(baseline.totalSaleRequests + 1);
      expect(completedMetrics.purchasedItems).toBe(baseline.purchasedItems + 1);
      expect(completedMetrics.completedSaleRequests).toBe(baseline.completedSaleRequests + 1);
      expect(JSON.stringify(completedMetrics)).not.toContain(TEST_CONTACT.PHASE3_GATE);
      expect(JSON.stringify(completedMetrics)).not.toContain(purchasePath);

      for (const status of ['paused', 'closed']) {
        await expect(adminApi.updateRecruitmentStatus(status)).resolves.toBe(status);
        await expect(
          createSupabaseRecruitmentApis(anonClient).saleRequestApi.getRecruitmentStatus(),
        ).resolves.toEqual({ status });
        await expect(
          sellerApis.submitSaleRequest({
            ...draft(status === 'paused' ? '01022223334' : '01022223335'),
            evidenceImage: evidencePath,
          }),
        ).rejects.toMatchObject({ code: 'RECRUITMENT_NOT_OPEN' });
      }
    } finally {
      if (purchasePath) {
        await serviceClient.storage.from('purchase-evidence').remove([purchasePath]);
      }
      await serviceClient.rpc('update_recruitment_status', { p_status: 'open' });
      await authClient.auth.signOut();
    }
  });
});
