import type { Application, ApplicationStatus } from '../types';
import { MOCK_APPLICATIONS } from './applications';

// Frontend Phase Mock 저장소. Redux 같은 전역 상태관리 없이,
// 목록 ↔ 상세에서 상태 변경이 세션 내에서 유지되도록 시드 기반 배열로 보관한다.
// 실제 테이블/RLS는 Backend Phase에서 정의한다.
let store: Application[] = MOCK_APPLICATIONS.map((application) => ({ ...application }));

export function getApplications(): Application[] {
  return store;
}

export function getApplicationById(id: string): Application | undefined {
  return store.find((application) => application.id === id);
}

export function updateApplicationStatus(id: string, status: ApplicationStatus): void {
  const target = store.find((application) => application.id === id);
  if (target) {
    target.status = status;
  }
}
