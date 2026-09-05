/**
 * 모집 상태 Domain.
 *
 * 모집 상태는 `open` / `paused` / `closed` 세 가지뿐이다. (PRD 5.8)
 * 상태 Label과 상태별 안내 문구 Mapping은 이 모듈 한 곳에서만 관리한다.
 * (명세 §19, DESIGN 41.1 / 41.5)
 *
 * React와 Supabase에 의존하지 않는 순수 함수다.
 */

export const RECRUITMENT_STATUSES = ['open', 'paused', 'closed'];

export const RECRUITMENT_STATUS_INFO = {
  open: {
    label: '모집 중',
    badgeClass: 'badge-success',
    adminNotice: '현재 판매 신청을 받고 있습니다.',
    sellerTitle: null,
    sellerDescription: null,
  },
  paused: {
    label: '일시중지',
    badgeClass: 'badge-primary',
    adminNotice: '현재 새로운 판매 신청을 잠시 받고 있지 않습니다.',
    sellerTitle: '판매 신청을 잠시 쉬고 있어요',
    sellerDescription:
      '현재 새로운 판매 신청을 받고 있지 않습니다. 다시 모집을 시작하면 신청할 수 있어요.',
  },
  closed: {
    label: '마감',
    badgeClass: 'badge-danger',
    adminNotice: '현재 판매자 모집이 마감된 상태입니다.',
    sellerTitle: '현재 모집이 마감됐어요',
    sellerDescription: '판매 신청 모집이 종료되었습니다.',
  },
};

/**
 * 상태 선택 버튼(Admin 모집 관리 화면)에서 사용하는 옵션 목록.
 */
export const RECRUITMENT_STATUS_OPTIONS = RECRUITMENT_STATUSES.map((value) => ({
  value,
  label: RECRUITMENT_STATUS_INFO[value].label,
}));

/**
 * 모집 상태 값 검증.
 * open / paused / closed 외의 값은 Frontend와 Backend 모두 거부한다. (명세 §16)
 */
export function validateRecruitmentStatus(status) {
  if (typeof status !== 'string' || !RECRUITMENT_STATUSES.includes(status)) {
    return {
      valid: false,
      message: '모집 상태는 open, paused, closed 중 하나여야 합니다.',
    };
  }
  return { valid: true };
}

/**
 * 상태별 표시 정보 조회.
 * 알 수 없는 상태에는 허용 방향 fallback이 아닌 안전한 안내를 반환한다. (명세 §21)
 */
export function getRecruitmentStatusInfo(status) {
  return (
    RECRUITMENT_STATUS_INFO[status] ?? {
      label: '알 수 없는 상태',
      badgeClass: 'badge-gray',
      adminNotice: '모집 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.',
      sellerTitle: '판매 신청 가능 여부를 확인하지 못했어요',
      sellerDescription: '잠시 후 다시 시도해주세요.',
    }
  );
}

/**
 * 신규 판매 신청을 차단하는 방향의 변경인지 판단한다. (명세 §10)
 * open → paused, open → closed, paused → closed 는 확인 Dialog를 거친다.
 */
export function isBlockingRecruitmentChange(from, to) {
  return Boolean(to) && to !== 'open' && to !== from;
}
