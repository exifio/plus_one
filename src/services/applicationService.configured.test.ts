import { describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchRecruitmentStatus, submitApplication } from './applicationService';

describe('applicationService configured mode', () => {
  it('Supabase 연결 오류를 Mock 성공으로 숨기지 않는다', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'database unavailable' },
    });

    await expect(
      submitApplication({
        store: 'GS25',
        promotionType: '1+1',
        productName: '오류 검증 상품',
        originalPaidPrice: 2000,
        quantity: 1,
        unitBasePrice: 1000,
        initialRatio: 60,
        initialPrice: 600,
        hadPriceOffer: false,
        finalRatio: 60,
        finalPrice: 600,
        contactType: 'phone',
        contactValue: '010-1234-5678',
      }),
    ).rejects.toThrow('database unavailable');
  });

  it('모집 singleton을 숫자형 id 1로 조회한다', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'PAUSED' }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ select });

    await expect(fetchRecruitmentStatus()).resolves.toBe('PAUSED');
    expect(supabaseMock.from).toHaveBeenCalledWith('recruitment_settings');
    expect(eq).toHaveBeenCalledWith('id', 1);
  });

  it('유효기간을 입력하지 않으면 RPC에 null을 전달한다', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: '00000000-0000-0000-0000-000000000001',
      error: null,
    });

    await expect(
      submitApplication({
        store: 'GS25',
        promotionType: '2+1',
        productName: '날짜 없음 상품',
        originalPaidPrice: 5200,
        quantity: 1,
        unitBasePrice: 1700,
        initialRatio: 80,
        initialPrice: 1400,
        hadPriceOffer: false,
        finalRatio: 80,
        finalPrice: 1400,
        contactType: 'kakao',
        contactValue: '111',
      }),
    ).resolves.toBe('00000000-0000-0000-0000-000000000001');

    expect(supabaseMock.rpc).toHaveBeenLastCalledWith(
      'submit_application',
      expect.objectContaining({ p_expiry_date: null }),
    );
  });
});
