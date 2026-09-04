import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseClient', () => ({ supabase: null }));
import {
  mapRowToApplication,
  fetchApplications,
  fetchApplicationById,
  fetchRecruitmentStatus,
  submitApplication,
} from './applicationService';

describe('applicationService', () => {
  it('mapRowToApplication이 DB row를 Application 타입으로 올바르게 변환한다', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      created_at: '2026-08-31T09:00:00Z',
      store: 'GS25',
      promotion_type: '1+1',
      registration_method: 'MANUAL',
      product_name: '오뚜기 진비빔면',
      original_paid_price: 3200,
      quantity: 1,
      expiry_date: '2026-12-31',
      unit_base_price: 1600,
      desired_price: 900,
      contact_type: 'phone',
      contact_value: '010-1234-5678',
      status: 'SUBMITTED',
    };

    const app = mapRowToApplication(row);
    expect(app.id).toBe(row.id);
    expect(app.store).toBe('GS25');
    expect(app.promotionType).toBe('1+1');
    expect(app.registrationMethod).toBe('MANUAL');
    expect(app.productName).toBe('오뚜기 진비빔면');
    expect(app.desiredPrice).toBe(900);
    expect(app.contactValue).toBe('010-1234-5678');
    expect(app.status).toBe('SUBMITTED');
  });

  it('V2 row 변환은 제거된 final_price를 fallback으로 사용하지 않는다', () => {
    const app = mapRowToApplication({ final_price: 750 });

    expect(app.desiredPrice).toBe(0);
  });

  it('fetchApplications가 목록을 반환한다', async () => {
    const apps = await fetchApplications();
    expect(apps.length).toBeGreaterThan(0);
  });

  it('fetchApplicationById가 존재하는 신청을 조회한다', async () => {
    const app = await fetchApplicationById('APP-1001');
    expect(app).not.toBeNull();
    expect(app?.id).toBe('APP-1001');
  });

  it('submitApplication이 신청을 생성하고 ID를 반환한다', async () => {
    const id = await submitApplication({
      store: 'CU',
      promotionType: '2+1',
      productName: '단위테스트 상품',
      originalPaidPrice: 4500,
      quantity: 1,
      expiryDate: '2026-10-31',
      desiredPrice: 1200,
      contactType: 'phone',
      contactValue: '010-9999-8888',
    });
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('스크린샷 신청은 mock store에 SCREENSHOT과 파일명으로 저장된다', async () => {
    const id = await submitApplication({
      store: 'GS25',
      promotionType: '1+1',
      registrationMethod: 'SCREENSHOT',
      screenshotFileName: 'test-shot.png',
      productName: '',
      originalPaidPrice: 0,
      quantity: 1,
      desiredPrice: 1500,
      contactType: 'phone',
      contactValue: '010-1234-5678',
    });

    const created = await fetchApplicationById(id);
    expect(created?.registrationMethod).toBe('SCREENSHOT');
    expect(created?.screenshotFileName).toBe('test-shot.png');
    expect(created?.desiredPrice).toBe(1500);
  });

  it('fetchRecruitmentStatus가 모집 상태를 반환한다', async () => {
    const status = await fetchRecruitmentStatus();
    expect(['OPEN', 'PAUSED', 'CLOSED']).toContain(status);
  });
});
