import { describe, expect, it } from 'vitest';
import {
  calculateDesiredRatio,
  calculateUnitBasePrice,
  getPromotionQuantity,
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

describe('calculateDesiredRatio', () => {
  it('computes the desired price ratio against the unit base price', () => {
    expect(calculateDesiredRatio(1500, 1100)).toBe(73);
    expect(calculateDesiredRatio(1000, 900)).toBe(90);
    expect(calculateDesiredRatio(1000, 0)).toBe(0);
  });

  it('returns 0 when the unit base price is 0', () => {
    expect(calculateDesiredRatio(0, 900)).toBe(0);
  });
});

