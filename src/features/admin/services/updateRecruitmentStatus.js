import { validateRecruitmentStatus } from '../../recruitment/domain/recruitmentStatus';

/**
 * Admin 모집 상태 변경 Service.
 *
 * 실행 순서를 조율한다.
 *
 * ```text
 * Status 검증 (open / paused / closed 이외 거부, API 호출 없음)
 * ↓
 * adminApi.updateRecruitmentStatus(status)
 * ↓
 * 성공/실패 결과 반환
 * ```
 *
 * API 실패 시 기존 상태를 유지해야 하므로,
 * 호출한 화면은 성공한 것처럼 UI를 변경하지 않는다. (명세 §21)
 *
 * @param {object} deps
 * @param {object} deps.adminApi Admin API 계약
 */
export function createUpdateRecruitmentStatusService({ adminApi }) {
  return async function updateRecruitmentStatus(status) {
    if (!validateRecruitmentStatus(status).valid) {
      return { ok: false, error: 'validation' };
    }

    try {
      await adminApi.updateRecruitmentStatus(status);
      return { ok: true, status };
    } catch {
      return { ok: false, error: 'api' };
    }
  };
}
