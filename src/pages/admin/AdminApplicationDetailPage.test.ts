import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminApplicationDetailPage } from './AdminApplicationDetailPage';
import {
  getApplicationById,
  updateApplicationStatus,
} from '../../mocks/applicationsStore';

vi.mock('../../services/supabaseClient', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

function renderDetail(id: string): string {
  return renderToStaticMarkup(
    h(
      MemoryRouter,
      { initialEntries: [`/admin/applications/${id}`] },
      h(
        Routes,
        null,
        h(Route, { path: '/admin/applications/:id', element: h(AdminApplicationDetailPage) }),
      ),
    ),
  );
}

describe('AdminApplicationDetailPage', () => {
  afterEach(() => {
    // 상태 변경 테스트가 다른 케이스에 영향을 주지 않도록 원복
    updateApplicationStatus('APP-1003', 'EVIDENCE_VERIFIED');
  });

  it('신청 전체 정보와 가격 결정 내역을 보여준다', () => {
    const html = renderDetail('APP-1003');
    expect(html).toContain('오뚜기 진비빔면');
    expect(html).toContain('70% · 1,100원'); // 최초
    expect(html).toContain('60% · 900원'); // 제안
    expect(html).toContain('제안 수락 여부');
    expect(html).toContain('거절');
    expect(html).toContain('010-9876-5432');
    expect(html).toContain('증빙 확인'); // 현재 상태 배지
    expect(html).toContain('안내 메시지 템플릿');
  });

  it('존재하지 않는 신청은 빈 상태를 보여준다', () => {
    const html = renderDetail('APP-0000');
    expect(html).toContain('찾을 수 없어요');
  });

  it('상태 변경은 저장소에 반영된다', () => {
    updateApplicationStatus('APP-1003', 'COMPLETED');
    expect(getApplicationById('APP-1003')?.status).toBe('COMPLETED');
  });
});
