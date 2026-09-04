import { z } from 'zod';

// 판매 희망금액은 사용자가 원 단위로 직접 입력한다. (PRD 6장)
// 0원은 무상 양도/처분 의향으로 허용한다.
export const desiredPriceSchema = z.object({
  desiredPrice: z
    .string()
    .trim()
    .min(1, '판매 희망금액을 입력해주세요.')
    .regex(/^\d+$/, '판매 희망금액은 숫자만 입력해주세요.')
    .transform((value) => Number(value)),
});

export type DesiredPriceInfo = z.infer<typeof desiredPriceSchema>;

export type DesiredPriceFieldErrors = Partial<Record<'desiredPrice', string>>;

export function fieldErrorsFromDesiredPriceZod(error: z.ZodError): DesiredPriceFieldErrors {
  const next: DesiredPriceFieldErrors = {};
  for (const issue of error.issues) {
    if (issue.path[0] === 'desiredPrice' && next.desiredPrice === undefined) {
      next.desiredPrice = issue.message;
    }
  }
  return next;
}
