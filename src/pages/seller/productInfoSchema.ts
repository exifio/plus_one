import { z } from 'zod';

export const productInfoSchema = z.object({
  store: z.enum(['GS25', 'CU'], {
    errorMap: () => ({ message: '편의점을 선택해주세요.' }),
  }),
  promotionType: z.enum(['1+1', '2+1'], {
    errorMap: () => ({ message: '행사 유형을 선택해주세요.' }),
  }),
  productName: z.string().trim().min(1, '상품명을 입력해주세요.'),
  originalPaidPrice: z
    .string()
    .trim()
    .min(1, '결제금액을 입력해주세요.')
    .regex(/^\d+$/, '결제금액은 숫자만 입력해주세요.')
    .transform((value) => Number(value))
    .refine((value) => value >= 1, '결제금액은 1원 이상이어야 해요.'),
  quantity: z
    .string()
    .trim()
    .min(1, '수량을 입력해주세요.')
    .regex(/^\d+$/, '수량은 숫자만 입력해주세요.')
    .transform((value) => Number(value))
    .refine((value) => value >= 1, '수량은 1개 이상이어야 해요.'),
  expiryDate: z.string().optional().default(''),
});

export type ProductInfo = z.infer<typeof productInfoSchema>;
export type ProductInfoInput = z.input<typeof productInfoSchema>;
export type FieldName = keyof ProductInfoInput;
export type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_NAMES = new Set<string>([
  'store',
  'promotionType',
  'productName',
  'originalPaidPrice',
  'quantity',
  'expiryDate',
]);

function isFieldName(value: unknown): value is FieldName {
  return typeof value === 'string' && FIELD_NAMES.has(value);
}

export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const next: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (isFieldName(key) && next[key] === undefined) {
      next[key] = issue.message;
    }
  }
  return next;
}
