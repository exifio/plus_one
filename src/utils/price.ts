import type { PriceOption, PromotionType } from '../types';

export const PRICE_RATIOS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0] as const;

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

export function calculateRatioPrice(unitBasePrice: number, ratio: number): number {
  return round100((unitBasePrice * ratio) / 100);
}

export function generatePriceOptions(unitBasePrice: number): PriceOption[] {
  const byPrice = new Map<number, number>();

  for (const ratio of PRICE_RATIOS) {
    const price = calculateRatioPrice(unitBasePrice, ratio);
    if (price === 0) {
      byPrice.set(0, 0);
      continue;
    }
    if (!byPrice.has(price)) {
      byPrice.set(price, ratio);
    }
  }

  return [...byPrice.entries()].map(([price, ratio]) => ({
    ratio,
    price,
  }));
}

export function getLowerPriceOffer(
  unitBasePrice: number,
  initialRatio: number,
): { ratio: number; price: number } | null {
  if (initialRatio < 70) {
    return null;
  }

  const offeredRatio = initialRatio - 10;
  const initialPrice = calculateRatioPrice(unitBasePrice, initialRatio);
  const offeredPrice = calculateRatioPrice(unitBasePrice, offeredRatio);

  if (offeredPrice === initialPrice) {
    return null;
  }

  return { ratio: offeredRatio, price: offeredPrice };
}
