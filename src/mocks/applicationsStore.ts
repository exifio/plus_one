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

export type CreateApplicationInput = Omit<Application, 'id' | 'createdAt' | 'status'>;

export function createApplication(input: CreateApplicationInput): Application {
  const maxIdNum = store.reduce((max, app) => {
    const match = app.id.match(/^APP-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 1000);

  const newId = `APP-${maxIdNum + 1}`;
  const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kstDate.getUTCFullYear();
  const mm = pad(kstDate.getUTCMonth() + 1);
  const dd = pad(kstDate.getUTCDate());
  const hh = pad(kstDate.getUTCHours());
  const mi = pad(kstDate.getUTCMinutes());
  const ss = pad(kstDate.getUTCSeconds());
  const createdAt = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+09:00`;

  const newApplication: Application = {
    ...input,
    id: newId,
    createdAt,
    status: 'SUBMITTED',
  };

  store.unshift(newApplication);
  return newApplication;
}

export function resetApplicationsStore(): void {
  store = MOCK_APPLICATIONS.map((application) => ({ ...application }));
}
