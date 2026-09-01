import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { AdminRecruitmentPage } from './AdminRecruitmentPage';
import { getRecruitmentStatus, setRecruitmentStatus } from '../../mocks/recruitmentStore';

vi.mock('../../services/supabaseClient', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

function renderPage(): string {
  return renderToStaticMarkup(h(AdminRecruitmentPage));
}

describe('AdminRecruitmentPage', () => {
  const original = getRecruitmentStatus();
  afterEach(() => setRecruitmentStatus(original));

  it('현재 상태 뱃지와 모든 옵션 버튼을 보여준다', () => {
    setRecruitmentStatus('PAUSED');
    const html = renderPage();
    expect(html).toContain('일시중지');
    expect(html).toContain('recruitment-badge-paused');
    expect(html).toContain('모집 중');
    expect(html).toContain('일시중지');
    expect(html).toContain('마감');
  });

  it('상태 변경이 저장소에 반영된다', () => {
    renderPage();
    setRecruitmentStatus('CLOSED');
    expect(getRecruitmentStatus()).toBe('CLOSED');
  });
});
