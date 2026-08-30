import { RECRUITMENT_OPTIONS, getRecruitmentStatus, setRecruitmentStatus } from '../../mocks/recruitmentStore';
import { useState } from 'react';
import type { RecruitmentStatus } from '../../types';

export const AdminRecruitmentPage: React.FC = () => {
  const [current, setCurrent] = useState<RecruitmentStatus>(getRecruitmentStatus());

  const handleChange = (next: RecruitmentStatus) => {
    setCurrent(next);
    setRecruitmentStatus(next);
  };

  return (
    <div className="admin-recruitment-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">모집 관리</h1>
        <p className="admin-page-subtitle">
          판매자 신청 접수를 제어합니다. 상태를 변경하면 즉시 판매자 화면에 반영됩니다.
        </p>
      </div>

      <section className="detail-card">
        <h2 className="detail-section-title">현재 상태</h2>
        <div className="recruitment-status-card">
          <span className={`recruitment-badge recruitment-badge-${current.toLowerCase()}`}>
            {RECRUITMENT_OPTIONS.find((option) => option.value === current)?.label}
          </span>
          <p className="recruitment-hint">
            {current === 'OPEN' && '신청을 받고 있어요. 다른 상태로 전환하면 즉시 접수가 중단됩니다.'}
            {current === 'PAUSED' && '임시로 신청을 중단했어요. 다시 시작하거나 마감할 수 있습니다.'}
            {current === 'CLOSED' && '모집을 마감했어요. 다시 열 수 있습니다.'}
          </p>
        </div>
      </section>

      <section className="detail-card">
        <h2 className="detail-section-title">상태 변경</h2>
        <p className="detail-hint">
          한 번에 하나의 상태만 활성화할 수 있습니다. 변경 사항은 저장 즉시 적용됩니다.
        </p>
        <div className="recruitment-select-grid" role="radiogroup" aria-label="모집 상태 변경">
          {RECRUITMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={current === option.value}
              className={
                current === option.value
                  ? 'recruitment-option is-active'
                  : 'recruitment-option'
              }
              onClick={() => handleChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
