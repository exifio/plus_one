import { validatePrice } from './validatePrice';

test.each([
  [1000, true],
  [1, true],
  [0, false],
  [-1, false],
  [1.5, false],
  ['abc', false],
  ['', false],
])('가격 %p의 유효성은 %p다', (value, expected) => {
  expect(validatePrice(value).valid).toBe(expected);
});
