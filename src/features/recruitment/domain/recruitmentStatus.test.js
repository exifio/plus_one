/*
 * 관련 작업: FE-2·FE-9 — 모집 상태 도메인 규칙과 관리자 모집 관리.
 * 작성 이유: 모집 상태는 open/paused/closed만 허용하고, 신규 신청 차단 여부도 같은 규칙을 써야 하기 때문.
 * 확인 내용: 허용 상태, 화면 표시 정보, 잘못된 값, 차단되는 상태 변경.
 */
import {
  RECRUITMENT_STATUS_OPTIONS,
  getRecruitmentStatusInfo,
  isBlockingRecruitmentChange,
  validateRecruitmentStatus,
} from './recruitmentStatus';

describe('모집 상태 검증', () => {
  test.each(['open', 'paused', 'closed'])('유효한 모집 상태 %s는 통과한다', (status) => {
    expect(validateRecruitmentStatus(status)).toEqual({ valid: true });
  });

  test.each([undefined, null, '', 'active', 'OPEN', ' paused', 'paused '])(
    '무효한 모집 상태 값은 거부한다: %s',
    (value) => {
      const result = validateRecruitmentStatus(value);
      expect(result.valid).toBe(false);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    },
  );
});

describe('모집 상태 옵션', () => {
  test('상태는 open, paused, closed 세 가지뿐이다', () => {
    expect(RECRUITMENT_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      'open',
      'paused',
      'closed',
    ]);
  });

  test('상태별 UI 표시는 모집 중 / 일시중지 / 마감이다', () => {
    expect(getRecruitmentStatusInfo('open').label).toBe('모집 중');
    expect(getRecruitmentStatusInfo('paused').label).toBe('일시중지');
    expect(getRecruitmentStatusInfo('closed').label).toBe('마감');
  });

  test('상태별 Admin 안내 문구를 제공한다', () => {
    expect(getRecruitmentStatusInfo('open').adminNotice).toContain('판매 신청');
    expect(getRecruitmentStatusInfo('paused').adminNotice).toContain('판매 신청');
    expect(getRecruitmentStatusInfo('closed').adminNotice).toContain('모집');
  });

  test('상태별 판매자 안내 제목과 문구를 제공한다', () => {
    expect(getRecruitmentStatusInfo('paused').sellerTitle).toBe('판매 신청을 잠시 쉬고 있어요');
    expect(getRecruitmentStatusInfo('paused').sellerDescription).toContain('다시 모집을 시작하면');
    expect(getRecruitmentStatusInfo('closed').sellerTitle).toBe('현재 모집이 마감됐어요');
    expect(getRecruitmentStatusInfo('closed').sellerDescription).toContain('종료');
  });

  test('알 수 없는 상태에는 안전한 기본값을 반환한다', () => {
    const unknown = getRecruitmentStatusInfo('mystery');
    expect(unknown.label).toBe('알 수 없는 상태');
    expect(unknown.sellerTitle).toBeTruthy();
    expect(unknown.adminNotice).toBeTruthy();
  });
});

describe('모집 차단 변경 여부', () => {
  test.each([
    ['open', 'paused'],
    ['open', 'closed'],
    ['paused', 'closed'],
  ])('%s → %s는 신규 신청을 차단하는 변경이다', (from, to) => {
    expect(isBlockingRecruitmentChange(from, to)).toBe(true);
  });

  test.each([
    ['paused', 'open'],
    ['closed', 'open'],
    ['open', 'open'],
    ['paused', 'paused'],
  ])('%s → %s는 차단 변경이 아니다', (from, to) => {
    expect(isBlockingRecruitmentChange(from, to)).toBe(false);
  });
});
