import { isSaleRequestCompleted } from './isSaleRequestCompleted';

test.each([
  [['purchased'], true],
  [['rejected'], true],
  [['purchased', 'rejected'], true],
  [['purchased', 'pending'], false],
  [['rejected', 'pending'], false],
  [['pending'], false],
  [[], false],
])('results=%p의 완료 여부는 %p다', (results, expected) => {
  expect(isSaleRequestCompleted(results)).toBe(expected);
});
