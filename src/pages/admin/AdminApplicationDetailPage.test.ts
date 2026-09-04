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

  it('신청 전체 정보와 단일 판매 희망금액을 보여준다', () => {
    const html = renderDetail('APP-1003');
    expect(html).toContain('오뚜기 진비빔면');
    expect(html).toContain('판매 희망금액');
    expect(html).toContain('1,100원'); // 희망금액 (1개당)
    expect(html).toContain('73%'); // 분석용 비율 (1,100원 / 1,500원 기준가)
    // 이전 가격 흐름(최초/제안/수락) 표시는 제거되어야 한다
    expect(html).not.toContain('제안 수락 여부');
    expect(html).not.toContain('최초 비율');
    expect(html).toContain('010-9876-5432');
    expect(html).toContain('증빙 확인'); // 현재 상태 배지
    expect(html).toContain('안내 메시지 템플릿');
  });

  it('스크린샷 등록 신청은 등록 방식과 업로드 이미지를 구분해 보여준다', () => {
    const html = renderDetail('APP-1001');

    expect(html).toContain('등록 방식');
    expect(html).toContain('스크린샷 등록');
    expect(html).toContain('업로드한 보관상품 스크린샷');
    expect(html).not.toContain('실제 결제금액');
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
