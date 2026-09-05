import { useEffect, useState } from 'react';
import { useServer } from '../../server/ServerContext';
import {
  RECRUITMENT_STATUS_OPTIONS,
  getRecruitmentStatusInfo,
  isBlockingRecruitmentChange,
} from '../../recruitment/domain/recruitmentStatus';
import { createUpdateRecruitmentStatusService } from '../services/updateRecruitmentStatus';
import RecruitmentConfirmModal from '../components/RecruitmentConfirmModal';
import AdminNav from '../components/AdminNav';

/**
 * Admin 모집 관리 화면. (명세 §7~§10, DESIGN 41.3)
 *
 * - 현재 상태 카드: 현재 상태 Badge + 상태별 안내 문구
 * - 상태 변경 카드: 모집 중 / 일시중지 / 마감 선택
 * - 저장: 현재 상태와 같으면 비활성화, 차단 방향 변경은 확인 Dialog를 거친다
 */
export default function AdminRecruitmentPage() {
  const { adminApi } = useServer();
  const [current, setCurrent] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getRecruitmentStatus()
      .then((data) => {
        if (!cancelled) {
          setCurrent(data.status);
          setSelected(data.status);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [adminApi]);

  const info = getRecruitmentStatusInfo(current);
  const canSave = Boolean(current) && Boolean(selected) && selected !== current && !saving;

  const save = async (status) => {
    setSaving(true);
    setResult(null);

    const service = createUpdateRecruitmentStatusService({ adminApi });
    const outcome = await service(status);

    setSaving(false);
    setPendingConfirm(null);

    if (!outcome.ok) {
      // 기존 상태를 유지하고 성공한 것처럼 UI를 변경하지 않는다. (명세 §21)
      setSelected(current);
      setResult({
        kind: 'error',
        message: '모집 상태를 변경하지 못했습니다. 다시 시도해주세요.',
      });
      return;
    }

    setCurrent(status);
    setResult({ kind: 'success', message: '모집 상태가 변경되었습니다.' });
  };

  const handleSaveClick = () => {
    if (!canSave) return;

    if (isBlockingRecruitmentChange(current, selected)) {
      setPendingConfirm(selected);
      return;
    }
    save(selected);
  };

  if (loadError) {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <span className="brand-logo">
            <span className="brand-logo-plus">+</span>
            <span className="brand-logo-num">1</span>
            <span className="brand-logo-suffix">관리자 페이지</span>
          </span>
          <AdminNav />
        </header>
        <main className="admin-main">
          <p className="admin-empty">모집 상태를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <span className="brand-logo">
          <span className="brand-logo-plus">+</span>
          <span className="brand-logo-num">1</span>
          <span className="brand-logo-suffix">관리자 페이지</span>
        </span>
        <AdminNav />
      </header>

      <main className="admin-main">
        <h1 className="admin-title">모집 관리</h1>
        <p className="recruitment-page-desc">
          판매자 신청 접수를 제어합니다. 상태를 변경하면 즉시 판매자 화면에 반영됩니다.
        </p>

        {current === null ? (
          <p className="admin-loading">불러오는 중…</p>
        ) : (
          <div className="recruitment-cards">
            <section className="recruitment-card">
              <h2 className="recruitment-card-title">현재 상태</h2>
              <div className="recruitment-status-row" data-testid="recruitment-current-status">
                <span className={`status-badge ${info.badgeClass}`}>{info.label}</span>
              </div>
              <p className="recruitment-notice-text">{info.adminNotice}</p>
            </section>

            <section className="recruitment-card">
              <h2 className="recruitment-card-title">상태 변경</h2>
              <p className="recruitment-card-desc">
                한 번에 하나의 상태만 활성화할 수 있습니다. 변경 사항은 저장 즉시 적용됩니다.
              </p>
              <div className="recruitment-option-group">
                {RECRUITMENT_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`recruitment-option${selected === option.value ? ' selected' : ''}`}
                    aria-pressed={selected === option.value}
                    onClick={() => setSelected(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn-primary recruitment-save"
                onClick={handleSaveClick}
                disabled={!canSave}
              >
                {saving ? '저장 중…' : '변경 사항 저장'}
              </button>

              {result && (
                <p
                  className={`recruitment-result ${result.kind === 'success' ? 'success' : 'error'}`}
                  role="status"
                >
                  {result.message}
                </p>
              )}
            </section>
          </div>
        )}
      </main>

      {pendingConfirm && (
        <RecruitmentConfirmModal
          status={pendingConfirm}
          busy={saving}
          onCancel={() => setPendingConfirm(null)}
          onConfirm={() => save(pendingConfirm)}
        />
      )}
    </div>
  );
}
