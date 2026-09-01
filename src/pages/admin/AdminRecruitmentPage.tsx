import { RECRUITMENT_OPTIONS, getRecruitmentStatus } from '../../mocks/recruitmentStore';
import {
  fetchRecruitmentStatus,
  updateRecruitmentStatus as svcUpdateRecruitmentStatus,
} from '../../services/applicationService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { useEffect, useState } from 'react';
import type { RecruitmentStatus } from '../../types';

export const AdminRecruitmentPage: React.FC = () => {
  const [current, setCurrent] = useState<RecruitmentStatus | null>(() =>
    isSupabaseConfigured ? null : getRecruitmentStatus(),
  );
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let active = true;
    fetchRecruitmentStatus()
      .then((status) => {
        if (active) {
          setCurrent(status);
        }
      })
      .catch(() => {
        if (active) {
          setError('모집 상태를 불러오지 못했어요.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = async (next: RecruitmentStatus) => {
    if (isSaving || current === next) return;
    setIsSaving(true);
    setError(null);
    try {
      await svcUpdateRecruitmentStatus(next);
      setCurrent(next);
    } catch {
      setError('모집 상태를 저장하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
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
        {isLoading ? (
          <p className="recruitment-hint">모집 상태를 불러오고 있어요.</p>
        ) : current ? (
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
        ) : (
          <p className="recruitment-hint">{error ?? '모집 상태를 확인할 수 없어요.'}</p>
        )}
      </section>

      {error && <div className="status-notice status-notice-closed" role="alert">{error}</div>}

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
              onClick={() => void handleChange(option.value)}
              disabled={isLoading || isSaving}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
