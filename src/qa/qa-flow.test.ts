import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../services/supabaseClient', () => ({ supabase: null }));
import { calculateUnitBasePrice } from '../utils/price';
import { productInfoSchema } from '../pages/seller/productInfoSchema';
import { contactInfoSchema } from '../pages/seller/contactSchema';
import {
  submitApplication,
  fetchApplications,
  fetchApplicationById,
  updateApplicationStatus,
  fetchRecruitmentStatus,
  updateRecruitmentStatus,
} from '../services/applicationService';
import { resetApplicationsStore } from '../mocks/applicationsStore';
import { setRecruitmentStatus } from '../mocks/recruitmentStore';
import type { ApplicationStatus } from '../types';

describe('Q-01: 핵심 판매자/관리자 흐름 및 가격 예외 QA', () => {
  beforeEach(() => {
    resetApplicationsStore();
    setRecruitmentStatus('OPEN');
  });

  describe('1. 행사 기준가격 계산 예외 케이스', () => {
    it('1+1 행사: 결제금액 / 2 후 100원 단위 반올림 기준가 산출', () => {
      expect(calculateUnitBasePrice(3600, '1+1')).toBe(1800);
      expect(calculateUnitBasePrice(3500, '1+1')).toBe(1800); // 1750 -> 1800
      expect(calculateUnitBasePrice(3300, '1+1')).toBe(1700); // 1650 -> 1700
      expect(calculateUnitBasePrice(3100, '1+1')).toBe(1600); // 1550 -> 1600
    });

    it('2+1 행사: 결제금액 / 3 후 100원 단위 반올림 기준가 산출', () => {
      expect(calculateUnitBasePrice(4500, '2+1')).toBe(1500);
      expect(calculateUnitBasePrice(5000, '2+1')).toBe(1700); // 1666.6 -> 1700
      expect(calculateUnitBasePrice(2000, '2+1')).toBe(700);  // 666.6 -> 700
    });
  });

  describe('2. 입력 검증(Schema Validation) QA', () => {
    it('상품 정보: 유효기간 미입력(선택) 허용 및 정상 케이스 통과', () => {
      const valid = productInfoSchema.safeParse({
        store: 'GS25',
        promotionType: '1+1',
        productName: '비빔면',
        originalPaidPrice: '3200',
        quantity: '1',
        expiryDate: '',
      });
      expect(valid.success).toBe(true);
    });

    it('상품 정보: 결제금액 0원 이하, 빈 상품명 차단', () => {
      const invalidPrice = productInfoSchema.safeParse({
        store: 'CU',
        promotionType: '2+1',
        productName: '삼각김밥',
        originalPaidPrice: '0',
        quantity: '1',
      });
      expect(invalidPrice.success).toBe(false);

      const invalidName = productInfoSchema.safeParse({
        store: 'CU',
        promotionType: '2+1',
        productName: '   ',
        originalPaidPrice: '2000',
        quantity: '1',
      });
      expect(invalidName.success).toBe(false);
    });

    it('연락처 정보: 전화번호 정규화 및 카카오톡 ID 검증', () => {
      const validPhone = contactInfoSchema.safeParse({
        contactType: 'phone',
        contactValue: '010-1234-5678',
      });
      expect(validPhone.success).toBe(true);

      const validKakao = contactInfoSchema.safeParse({
        contactType: 'kakao',
        contactValue: 'kakao_user_id',
      });
      expect(validKakao.success).toBe(true);

      const invalidPhone = contactInfoSchema.safeParse({
        contactType: 'phone',
        contactValue: '02-123-4567', // 휴대폰이 아닌 일반 유선 번호
      });
      expect(invalidPhone.success).toBe(false);
    });
  });

  describe('3. 판매 신청 및 모집 상태 제어 흐름 QA', () => {
    it('모집 OPEN 상태에서 판매 신청이 정상 접수된다', async () => {
      const newId = await submitApplication({
        store: 'GS25',
        promotionType: '1+1',
        productName: '하겐다즈 바닐라',
        originalPaidPrice: 5900,
        quantity: 1,
        expiryDate: '2026-12-31',
        desiredPrice: 2100,
        contactType: 'phone',
        contactValue: '010-5555-6666',
      });

      expect(newId).toBeDefined();
      const created = await fetchApplicationById(newId);
      expect(created).not.toBeNull();
      expect(created?.productName).toBe('하겐다즈 바닐라');
      expect(created?.desiredPrice).toBe(2100);
      expect(created?.status).toBe('SUBMITTED');
    });

    it('모집 상태 조회 및 변경(OPEN -> PAUSED -> CLOSED)이 즉시 반영된다', async () => {
      await updateRecruitmentStatus('PAUSED');
      expect(await fetchRecruitmentStatus()).toBe('PAUSED');

      await updateRecruitmentStatus('CLOSED');
      expect(await fetchRecruitmentStatus()).toBe('CLOSED');

      await updateRecruitmentStatus('OPEN');
      expect(await fetchRecruitmentStatus()).toBe('OPEN');
    });
  });

  describe('4. 관리자 상태 변경 및 7단계 라이프사이클 QA', () => {
    const ALL_STATUSES: ApplicationStatus[] = [
      'SUBMITTED',
      'CONTACTED',
      'EVIDENCE_VERIFIED',
      'QR_RECEIVED',
      'COMPLETED',
      'NOT_PURCHASED',
      'FAILED',
    ];

    it('7개 모든 상태로 변경이 정상 작동하고 목록 필터링에 반영된다', async () => {
      const apps = await fetchApplications();
      const target = apps[0];
      expect(target).toBeDefined();

      for (const st of ALL_STATUSES) {
        await updateApplicationStatus(target.id, st);
        const updated = await fetchApplicationById(target.id);
        expect(updated?.status).toBe(st);

        const filtered = await fetchApplications(st);
        expect(filtered.some((a) => a.id === target.id)).toBe(true);
      }
    });
  });
});
