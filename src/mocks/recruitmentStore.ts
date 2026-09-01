import type { RecruitmentStatus } from '../types';

// Frontend Phase Mock 저장소. 모집 상태 변경은 세션 내에서 유지되며
// 실제 상태 컬럼은 Backend Phase에서 정의한다.
let currentStatus: RecruitmentStatus = 'OPEN';

export function getRecruitmentStatus(): RecruitmentStatus {
  return currentStatus;
}

export function setRecruitmentStatus(next: RecruitmentStatus): void {
  currentStatus = next;
}

export const RECRUITMENT_OPTIONS: ReadonlyArray<{
  value: RecruitmentStatus;
  label: string;
}> = [
  { value: 'OPEN', label: '모집 중' },
  { value: 'PAUSED', label: '일시중지' },
  { value: 'CLOSED', label: '마감' },
];
