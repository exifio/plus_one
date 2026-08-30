import { z } from 'zod';

export type ContactType = 'phone' | 'kakao';

const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value.trim();
};

const isValidPhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    return false;
  }
  return true;
};

export const contactInfoSchema = z
  .object({
    contactType: z.enum(['phone', 'kakao'], {
      errorMap: () => ({ message: '연락 수단을 선택해주세요.' }),
    }),
    contactValue: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (data.contactType === 'phone') {
      if (data.contactValue.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contactValue'],
          message: '휴대전화 번호를 입력해주세요.',
        });
        return;
      }
      if (!isValidPhone(data.contactValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contactValue'],
          message: '올바른 휴대전화 번호를 입력해주세요 (예: 010-1234-5678).',
        });
        return;
      }
    } else if (data.contactType === 'kakao') {
      if (data.contactValue.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contactValue'],
          message: '카카오톡 ID 또는 오픈채팅 링크를 입력해주세요.',
        });
        return;
      }
    }
  })
  .transform((data) => ({
    contactType: data.contactType,
    contactValue:
      data.contactType === 'phone' ? normalizePhone(data.contactValue) : data.contactValue,
  }));

export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type ContactInfoInput = z.input<typeof contactInfoSchema>;

export type ContactFieldErrors = Partial<Record<'contactType' | 'contactValue', string>>;

export function fieldErrorsFromContactZod(error: z.ZodError): ContactFieldErrors {
  const next: ContactFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if ((key === 'contactType' || key === 'contactValue') && next[key] === undefined) {
      next[key] = issue.message;
    }
  }
  return next;
}

