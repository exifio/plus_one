import type { RecruitmentStatus } from '../types';
import { DEFAULT_RECRUITMENT_STATUS } from './recruitment';

// Frontend Phase Mock 저장소. 모집 상태 변경은 세션 내에서 유지되며
// 실제 상태 컬럼은 Backend Phase에서 정의한다.
let currentStatus: RecruitmentStatus = DEFAULT_RECRUITMENT_STATUS;

export function getRecruitmentStatus(): RecruitmentStatus {
  return currentStatus;
}

export function setRecruitmentStatus(next: RecruitmentStatus): void {
  currentStatus = next;
}

export const RECRUITMENT_OPTIONS: ReadonlyArray<{
  value: RecruitmentStatus;
  label: string;
  variant: 'neutral' | 'warning' | 'danger';
}> = [
  { value: 'OPEN', label: '모집 중', variant: 'neutral' },
  { value: 'PAUSED', label: '일시중지', variant: 'warning' },
  { value: 'CLOSED', label: '마감', variant: 'danger' },
];
