export function isSaleRequestCompleted(results) {
  if (!Array.isArray(results) || results.length === 0) return false;
  return results.every((result) => result === 'purchased' || result === 'rejected');
}
