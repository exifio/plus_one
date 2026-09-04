import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { AdminMetricsPage } from './AdminMetricsPage';

vi.mock('../../services/supabaseClient', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

describe('AdminMetricsPage', () => {
  it('집계 카드와 가격/상태 분포 표를 보여준다', () => {
    const html = renderToStaticMarkup(h(AdminMetricsPage));
    expect(html).toContain('전체 신청 수');
    expect(html).toContain('유상 판매 의향');
    expect(html).toContain('무상 양도(0원)');
    expect(html).toContain('판매 희망금액 분포');
    expect(html).toContain('희망가격 비율 분포');
    expect(html).toContain('등록 방식별 신청 수');
    expect(html).toContain('스크린샷 등록');
    expect(html).toContain('직접 입력');
    expect(html).toContain('편의점별 신청 수');
    expect(html).toContain('행사 유형별 신청 수');
    expect(html).toContain('상태별 신청 수');
    // 이전 가격 흐름(제안) 지표는 제거되어야 한다
    expect(html).not.toContain('제안 수락률');
    // Mock 데이터에 거래 완료 상태가 존재하므로 0보다 큰 값 렌더링
    expect(html).toContain('거래 완료');
  });
});
