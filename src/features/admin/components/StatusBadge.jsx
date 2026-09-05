const STATUS_META = {
  received: { label: '접수됨', className: 'badge-info' },
  contacting: { label: '연락중', className: 'badge-primary' },
  completed: { label: '처리완료', className: 'badge-success' },
  pending: { label: '미처리', className: 'badge-gray' },
  purchased: { label: '구매', className: 'badge-success' },
  rejected: { label: '거절', className: 'badge-danger' },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, className: 'badge-gray' };
  return <span className={`status-badge ${meta.className}`}>{meta.label}</span>;
}