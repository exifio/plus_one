import { validateExpirationDate } from './validateExpirationDate';

const today = '2026-09-04';

test('어제 만료된 상품은 거부한다', () => {
  expect(validateExpirationDate('2026-09-03', today).valid).toBe(false);
});

test('오늘 만료되는 상품은 허용한다', () => {
  expect(validateExpirationDate('2026-09-04', today).valid).toBe(true);
});

test('내일 만료되는 상품은 허용한다', () => {
  expect(validateExpirationDate('2026-09-05', today).valid).toBe(true);
});
