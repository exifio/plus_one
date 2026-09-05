export function isAllowedAdminUser(userId, adminUserId) {
  return Boolean(userId && adminUserId && userId === adminUserId);
}
