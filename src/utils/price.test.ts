import { describe, expect, it } from 'vitest';
import {
  calculateRatioPrice,
  calculateUnitBasePrice,
  generatePriceOptions,
  getLowerPriceOffer,
  getPromotionQuantity,
  isPaidSaleIntent,
  round100,
} from './price';

describe('getPromotionQuantity', () => {
  it('uses 2 for 1+1 and 3 for 2+1', () => {
    expect(getPromotionQuantity('1+1')).toBe(2);
    expect(getPromotionQuantity('2+1')).toBe(3);
  });
});

describe('round100', () => {
  it('keeps values already on a 100-won unit', () => {
    expect(round100(1800)).toBe(1800);
    expect(round100(0)).toBe(0);
  });

  it('rounds .50 up to the next 100-won unit', () => {
    expect(round100(50)).toBe(100);
    expect(round100(1850)).toBe(1900);
  });

  it('rounds values below .50 down', () => {
    expect(round100(49)).toBe(0);
    expect(round100(1849)).toBe(1800);
  });
});

describe('calculateUnitBasePrice', () => {
  it('divides 1+1 paid price by 2 and rounds to 100 won', () => {
    expect(calculateUnitBasePrice(3600, '1+1')).toBe(1800);
  });

  it('divides 2+1 paid price by 3 and rounds to 100 won', () => {
    expect(calculateUnitBasePrice(3600, '2+1')).toBe(1200);
  });

  it('rounds a 1+1 halfway amount up', () => {
    expect(calculateUnitBasePrice(3700, '1+1')).toBe(1900);
  });
});

describe('calculateRatioPrice', () => {
  it('returns the unit base price at 100% and 0 at 0%', () => {
    expect(calculateRatioPrice(1800, 100)).toBe(1800);
    expect(calculateRatioPrice(1800, 0)).toBe(0);
  });

  it('rounds a 90% option of 1800 to 1600', () => {
    expect(calculateRatioPrice(1800, 90)).toBe(1600);
  });
});

describe('generatePriceOptions', () => {
  it('keeps every 10% step when rounded amounts stay unique', () => {
    expect(generatePriceOptions(1800)).toEqual([
      { ratio: 100, price: 1800, isRepresentative: true },
      { ratio: 90, price: 1600, isRepresentative: true },
      { ratio: 80, price: 1400, isRepresentative: true },
      { ratio: 70, price: 1300, isRepresentative: true },
      { ratio: 60, price: 1100, isRepresentative: true },
      { ratio: 50, price: 900, isRepresentative: true },
      { ratio: 40, price: 700, isRepresentative: true },
      { ratio: 30, price: 500, isRepresentative: true },
      { ratio: 20, price: 400, isRepresentative: true },
      { ratio: 10, price: 200, isRepresentative: true },
      { ratio: 0, price: 0, isRepresentative: true },
    ]);
  });

  it('shows a collapsed amount once and keeps the highest ratio', () => {
    expect(generatePriceOptions(100)).toEqual([
      { ratio: 100, price: 100, isRepresentative: true },
      { ratio: 0, price: 0, isRepresentative: true },
    ]);
  });

  it('uses the highest ratio as the representative for each amount', () => {
    expect(generatePriceOptions(500)).toEqual([
      { ratio: 100, price: 500, isRepresentative: true },
      { ratio: 80, price: 400, isRepresentative: true },
      { ratio: 60, price: 300, isRepresentative: true },
      { ratio: 40, price: 200, isRepresentative: true },
      { ratio: 20, price: 100, isRepresentative: true },
      { ratio: 0, price: 0, isRepresentative: true },
    ]);
  });

  it('keeps 0 won as 0% even when a higher ratio also rounds to 0', () => {
    const options = generatePriceOptions(100);
    expect(options).toEqual([
      { ratio: 100, price: 100, isRepresentative: true },
      { ratio: 0, price: 0, isRepresentative: true },
    ]);
    expect(options.find((option) => option.price === 0)).toEqual({
      ratio: 0,
      price: 0,
      isRepresentative: true,
    });
  });
});

describe('getLowerPriceOffer', () => {
  it('does not offer when the initial ratio is 60% or lower', () => {
    expect(getLowerPriceOffer(1800, 60)).toBeNull();
    expect(getLowerPriceOffer(1800, 0)).toBeNull();
  });

  it('offers 10%p lower when the initial ratio is 70% or higher', () => {
    expect(getLowerPriceOffer(1800, 90)).toEqual({ ratio: 80, price: 1400 });
    expect(getLowerPriceOffer(1800, 70)).toEqual({ ratio: 60, price: 1100 });
  });

  it('does not offer when the lower ratio rounds to the same amount', () => {
    expect(getLowerPriceOffer(100, 100)).toBeNull();
  });
});

describe('isPaidSaleIntent', () => {
  it('treats 0 won as unpaid and any higher amount as paid', () => {
    expect(isPaidSaleIntent(0)).toBe(false);
    expect(isPaidSaleIntent(100)).toBe(true);
  });
});
