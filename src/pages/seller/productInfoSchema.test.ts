import { describe, expect, it } from 'vitest';
import { fieldErrorsFromZod, productInfoSchema } from './productInfoSchema';

const validInput = {
  store: 'GS25',
  promotionType: '1+1',
  productName: '서울우유 1L',
  originalPaidPrice: '3600',
  quantity: '2',
  expiryDate: '2026-09-01',
};

describe('productInfoSchema', () => {
  it('accepts valid product info and converts amounts to numbers', () => {
    const parsed = productInfoSchema.safeParse(validInput);

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data).toEqual({
      store: 'GS25',
      promotionType: '1+1',
      productName: '서울우유 1L',
      originalPaidPrice: 3600,
      quantity: 2,
      expiryDate: '2026-09-01',
    });
  });

  it('trims product name before validation', () => {
    const parsed = productInfoSchema.safeParse({
      ...validInput,
      productName: '  바나나우유  ',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.productName).toBe('바나나우유');
    }
  });

  it('rejects missing required fields with Korean messages', () => {
    const parsed = productInfoSchema.safeParse({
      store: '',
      promotionType: '',
      productName: '',
      originalPaidPrice: '',
      quantity: '',
      expiryDate: '',
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(fieldErrorsFromZod(parsed.error)).toEqual({
      store: '편의점을 선택해주세요.',
      promotionType: '행사 유형을 선택해주세요.',
      productName: '상품명을 입력해주세요.',
      originalPaidPrice: '결제금액을 입력해주세요.',
      quantity: '수량을 입력해주세요.',
    });
  });

  it('rejects non-numeric paid price and quantity', () => {
    const parsed = productInfoSchema.safeParse({
      ...validInput,
      originalPaidPrice: '3,600',
      quantity: '2개',
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(fieldErrorsFromZod(parsed.error)).toEqual({
      originalPaidPrice: '결제금액은 숫자만 입력해주세요.',
      quantity: '수량은 숫자만 입력해주세요.',
    });
  });

  it('rejects zero paid price and quantity', () => {
    const parsed = productInfoSchema.safeParse({
      ...validInput,
      originalPaidPrice: '0',
      quantity: '0',
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(fieldErrorsFromZod(parsed.error)).toEqual({
      originalPaidPrice: '결제금액은 1원 이상이어야 해요.',
      quantity: '수량은 1개 이상이어야 해요.',
    });
  });

  it('does not reject a short remaining expiry date', () => {
    const parsed = productInfoSchema.safeParse({
      ...validInput,
      expiryDate: '2026-08-31',
    });

    expect(parsed.success).toBe(true);
  });

  it('allows empty expiry date as optional', () => {
    const parsed = productInfoSchema.safeParse({
      ...validInput,
      expiryDate: '',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.expiryDate).toBe('');
    }
  });
});
