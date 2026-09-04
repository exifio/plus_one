import type { PromotionType } from '../types';

export function getPromotionQuantity(promotionType: PromotionType): 2 | 3 {
  return promotionType === '1+1' ? 2 : 3;
}

export function round100(value: number): number {
  return Math.round(value / 100) * 100;
}

export function calculateUnitBasePrice(
  originalPaidPrice: number,
  promotionType: PromotionType,
): number {
  return round100(originalPaidPrice / getPromotionQuantity(promotionType));
}

// 희망가격 비율 = 판매 희망금액 / 행사 기준 1개 가격 × 100 (PRD 6장, 분석용)
export function calculateDesiredRatio(unitBasePrice: number, desiredPrice: number): number {
  return unitBasePrice > 0 ? Math.round((desiredPrice / unitBasePrice) * 100) : 0;
}

