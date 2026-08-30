import type { RecruitmentStatus } from '../types';

export const DEFAULT_RECRUITMENT_STATUS: RecruitmentStatus = 'OPEN';

export function getRecruitmentStatus(): RecruitmentStatus {
  const param = new URLSearchParams(window.location.search).get('status');
  if (param === 'OPEN' || param === 'PAUSED' || param === 'CLOSED') {
    return param;
  }
  return DEFAULT_RECRUITMENT_STATUS;
}
