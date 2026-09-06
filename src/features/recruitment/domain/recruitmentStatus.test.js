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

describe('모집 상태가 모집 중·일시중지·마감만 허용되는지', () => {
  test.each(['open', 'paused', 'closed'])('모집 중·일시중지·마감(%s)은 허용한다', (status) => {
    expect(validateRecruitmentStatus(status)).toEqual({ valid: true });
  });

  test.each([undefined, null, '', 'active', 'OPEN', ' paused', 'paused '])(
    '허용되지 않은 모집 상태 값(%s)은 막는다',
    (value) => {
      const result = validateRecruitmentStatus(value);
      expect(result.valid).toBe(false);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    },
  );
});

describe('모집 상태를 화면에 어떻게 보여줄지', () => {
  test('모집 상태는 모집 중·일시중지·마감 세 가지만 있다', () => {
    expect(RECRUITMENT_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      'open',
      'paused',
      'closed',
    ]);
  });

  test('운영자 화면에는 모집 중·일시중지·마감으로 보여준다', () => {
    expect(getRecruitmentStatusInfo('open').label).toBe('모집 중');
    expect(getRecruitmentStatusInfo('paused').label).toBe('일시중지');
    expect(getRecruitmentStatusInfo('closed').label).toBe('마감');
  });

  test('운영자에게 각 모집 상태가 무슨 뜻인지 안내한다', () => {
    expect(getRecruitmentStatusInfo('open').adminNotice).toContain('판매 신청');
    expect(getRecruitmentStatusInfo('paused').adminNotice).toContain('판매 신청');
    expect(getRecruitmentStatusInfo('closed').adminNotice).toContain('모집');
  });

  test('판매자에게 일시중지·마감일 때 신청할 수 없다고 안내한다', () => {
    expect(getRecruitmentStatusInfo('paused').sellerTitle).toBe('판매 신청을 잠시 쉬고 있어요');
    expect(getRecruitmentStatusInfo('paused').sellerDescription).toContain('다시 모집을 시작하면');
    expect(getRecruitmentStatusInfo('closed').sellerTitle).toBe('현재 모집이 마감됐어요');
    expect(getRecruitmentStatusInfo('closed').sellerDescription).toContain('종료');
  });

  test('모르는 모집 상태가 와도 화면이 비지 않게 기본 안내를 준다', () => {
    const unknown = getRecruitmentStatusInfo('mystery');
    expect(unknown.label).toBe('알 수 없는 상태');
    expect(unknown.sellerTitle).toBeTruthy();
    expect(unknown.adminNotice).toBeTruthy();
  });
});

describe('모집을 닫는 변경인지 다시 여는 변경인지', () => {
  test.each([
    ['open', 'paused'],
    ['open', 'closed'],
    ['paused', 'closed'],
  ])('모집을 닫는 변경(%s → %s)은 한 번 더 확인하게 한다', (from, to) => {
    expect(isBlockingRecruitmentChange(from, to)).toBe(true);
  });

  test.each([
    ['paused', 'open'],
    ['closed', 'open'],
    ['open', 'open'],
    ['paused', 'paused'],
  ])('모집을 다시 여는 변경(%s → %s)은 바로 저장할 수 있다', (from, to) => {
    expect(isBlockingRecruitmentChange(from, to)).toBe(false);
  });
});
