import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { AdminMetricsPage } from './AdminMetricsPage';

describe('AdminMetricsPage', () => {
  it('집계 카드와 가격/상태 분포 표를 보여준다', () => {
    const html = renderToStaticMarkup(h(AdminMetricsPage));
    expect(html).toContain('전체 신청 수');
    expect(html).toContain('유상 판매 의향');
    expect(html).toContain('무상 양도(0%)');
    expect(html).toContain('최종 가격 분포');
    expect(html).toContain('상태별 신청 수');
    // Mock 데이터에 거래 완료 상태가 존재하므로 0보다 큰 값 렌더링
    expect(html).toContain('거래 완료');
  });
});
