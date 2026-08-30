import type { ApplicationStatus } from '../types';

export type StatusFilter = 'ALL' | ApplicationStatus;

export const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'SUBMITTED', label: '신청됨' },
  { value: 'CONTACTED', label: '연락함' },
  { value: 'EVIDENCE_VERIFIED', label: '증빙 확인' },
  { value: 'QR_RECEIVED', label: 'QR 전달' },
  { value: 'COMPLETED', label: '거래 완료' },
  { value: 'NOT_PURCHASED', label: '매입 안 함' },
  { value: 'FAILED', label: '진행 실패' },
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: '신청됨',
  CONTACTED: '연락함',
  EVIDENCE_VERIFIED: '증빙 확인',
  QR_RECEIVED: 'QR 전달',
  COMPLETED: '거래 완료',
  NOT_PURCHASED: '매입 안 함',
  FAILED: '진행 실패',
};

export const formatWon = (price: number): string =>
  price === 0 ? '무상 양도' : `${price.toLocaleString('ko-KR')}원`;

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function statusBadgeClass(status: ApplicationStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'status-badge status-badge-success';
    case 'NOT_PURCHASED':
    case 'FAILED':
      return 'status-badge status-badge-danger';
    case 'CONTACTED':
    case 'EVIDENCE_VERIFIED':
    case 'QR_RECEIVED':
      return 'status-badge status-badge-warning';
    default:
      return 'status-badge status-badge-neutral';
  }
}
