import { describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

import {
  buildScreenshotObjectPath,
  fetchRecruitmentStatus,
  submitApplication,
} from './applicationService';

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
        desiredPrice: 600,
        contactType: 'phone',
        contactValue: '010-1234-5678',
      }),
    ).rejects.toThrow('database unavailable');
  });

  it('익명 모집 상태 조회는 공개된 status 컬럼만 사용한다', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'PAUSED' }, error: null });
    const query = { maybeSingle };
    const select = vi.fn().mockReturnValue(query);
    supabaseMock.from.mockReturnValue({ select });

    await expect(fetchRecruitmentStatus()).resolves.toBe('PAUSED');
    expect(supabaseMock.from).toHaveBeenCalledWith('recruitment_settings');
    expect(select).toHaveBeenCalledWith('status');
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
        desiredPrice: 1400,
        contactType: 'kakao',
        contactValue: '111',
      }),
    ).resolves.toBe('00000000-0000-0000-0000-000000000001');

    expect(supabaseMock.rpc).toHaveBeenLastCalledWith(
      'submit_application',
      expect.objectContaining({
        p_expiry_date: null,
        p_desired_price: 1400,
        p_registration_method: 'MANUAL',
        p_screenshot_file_name: null,
      }),
    );
    expect(supabaseMock.rpc.mock.calls.at(-1)?.[1]).not.toHaveProperty('p_unit_base_price');
  });

  it('스크린샷 신청은 RPC에 SCREENSHOT과 파일명을 전달한다', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: '00000000-0000-0000-0000-000000000002',
      error: null,
    });

    await expect(
      submitApplication({
        store: 'GS25',
        promotionType: '1+1',
        registrationMethod: 'SCREENSHOT',
        screenshotFileName: 'a1b2c3d4.png',
        productName: '',
        originalPaidPrice: 0,
        quantity: 1,
        desiredPrice: 1500,
        contactType: 'phone',
        contactValue: '010-1234-5678',
      }),
    ).resolves.toBe('00000000-0000-0000-0000-000000000002');

    expect(supabaseMock.rpc).toHaveBeenLastCalledWith(
      'submit_application',
      expect.objectContaining({
        p_registration_method: 'SCREENSHOT',
        p_screenshot_file_name: 'a1b2c3d4.png',
        p_product_name: '',
        p_original_paid_price: 0,
      }),
    );
  });

  it('buildScreenshotObjectPath는 확장자를 유지한 uuid 기반 경로를 생성한다', () => {
    const path = buildScreenshotObjectPath('보관함 상품.png');
    expect(path).toMatch(/^[0-9a-f-]{36}\.png$/);
  });
});
