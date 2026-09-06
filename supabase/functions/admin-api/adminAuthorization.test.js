/** @jest-environment node */

/*
 * 관련 작업: BE-7 — 단일 로그인한 사람 중 정해진 관리자만 통과하는지.
 * 작성 이유: 로그인했다는 이유만으로 모든 사용자가 관리자 API를 쓸 수 있으면 안 되기 때문.
 * 확인 내용: 설정된 ADMIN_USER_ID와 정확히 일치하는 사용자만 통과하는지.
 */
import { isAllowedAdminUser } from './adminAuthorization';

describe('로그인한 사람 중 정해진 관리자만 통과하는지', () => {
  test('정해진 관리자 계정과 정확히 같은 사람만 관리자 API를 쓸 수 있다', () => {
    expect(isAllowedAdminUser('admin-user-id', 'admin-user-id')).toBe(true);
    expect(isAllowedAdminUser('other-user-id', 'admin-user-id')).toBe(false);
    expect(isAllowedAdminUser('', 'admin-user-id')).toBe(false);
    expect(isAllowedAdminUser('admin-user-id', '')).toBe(false);
  });
});
