import { describe, expect, it } from 'vitest';
import { contactInfoSchema, fieldErrorsFromContactZod } from './contactSchema';

describe('contactInfoSchema', () => {
  it('accepts valid phone numbers with dashes', () => {
    const parsed = contactInfoSchema.safeParse({
      contactType: 'phone',
      contactValue: '010-1234-5678',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        contactType: 'phone',
        contactValue: '010-1234-5678',
      });
    }
  });

  it('accepts valid phone numbers without dashes and normalizes format', () => {
    const parsed = contactInfoSchema.safeParse({
      contactType: 'phone',
      contactValue: '01098765432',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.contactValue).toBe('010-9876-5432');
    }
  });

  it('rejects invalid phone numbers with Korean error message', () => {
    const parsed = contactInfoSchema.safeParse({
      contactType: 'phone',
      contactValue: '02-123-4567',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromContactZod(parsed.error)).toEqual({
        contactValue: '올바른 휴대전화 번호를 입력해주세요 (예: 010-1234-5678).',
      });
    }
  });

  it('rejects empty phone input', () => {
    const parsed = contactInfoSchema.safeParse({
      contactType: 'phone',
      contactValue: '',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromContactZod(parsed.error)).toEqual({
        contactValue: '휴대전화 번호를 입력해주세요.',
      });
    }
  });

  it('accepts valid kakao ID or openchat link', () => {
    const parsed = contactInfoSchema.safeParse({
      contactType: 'kakao',
      contactValue: 'open.kakao.com/o/plusone123',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        contactType: 'kakao',
        contactValue: 'open.kakao.com/o/plusone123',
      });
    }
  });

  it('rejects empty kakao input', () => {
    const parsed = contactInfoSchema.safeParse({
      contactType: 'kakao',
      contactValue: '   ',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrorsFromContactZod(parsed.error)).toEqual({
        contactValue: '카카오톡 ID 또는 오픈채팅 링크를 입력해주세요.',
      });
    }
  });
});

