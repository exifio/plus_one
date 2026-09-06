/*
 * 관련 작업: FE-10 — 관리자 실험 현황 화면.
 * 작성 이유: 핵심 검증 지표를 실제 값·빈 상태·오류 상태로 구분해 보여줘야 하기 때문.
 * 확인 내용: 모집 상태, 요약 카드 4개, 분석 항목, 빈 데이터, 로딩, 조회 실패.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServerContext } from '../../server/ServerContext';
import AdminExperimentPage from './AdminExperimentPage';

const seededMetrics = {
  recruitmentStatus: 'open',
  totalSaleRequests: 3,
  uniqueSellers: 2,
  purchasedItems: 1,
  completedSaleRequests: 1,
  repeatSellers: 1,
  askingPriceDistribution: [
    { price: 500, count: 1 },
    { price: 1500, count: 1 },
  ],
  askingPriceRatioDistribution: {
    lte_25: 1,
    mid_26_50: 0,
    mid_51_75: 0,
    mid_76_100: 1,
    gt_100: 0,
  },
  convenienceStoreCounts: { gs25: 1, cu: 2 },
  promotionTypeCounts: { one_plus_one: 1, two_plus_one: 2 },
  saleRequestStatusCounts: { received: 1, contacting: 1, completed: 1 },
  itemResultCounts: { pending: 5, purchased: 1, rejected: 1 },
};

const emptyMetrics = {
  recruitmentStatus: 'open',
  totalSaleRequests: 0,
  uniqueSellers: 0,
  purchasedItems: 0,
  completedSaleRequests: 0,
  repeatSellers: 0,
  askingPriceDistribution: [],
  askingPriceRatioDistribution: {
    lte_25: 0,
    mid_26_50: 0,
    mid_51_75: 0,
    mid_76_100: 0,
    gt_100: 0,
  },
  convenienceStoreCounts: { gs25: 0, cu: 0 },
  promotionTypeCounts: { one_plus_one: 0, two_plus_one: 0 },
  saleRequestStatusCounts: { received: 0, contacting: 0, completed: 0 },
  itemResultCounts: { pending: 0, purchased: 0, rejected: 0 },
};

function renderPage({ metrics = seededMetrics, getExperimentMetrics } = {}) {
  const adminApi = {
    getExperimentMetrics:
      getExperimentMetrics ?? jest.fn(async () => metrics),
  };

  render(
    <MemoryRouter>
      <ServerContext.Provider value={{ adminApi }}>
        <AdminExperimentPage />
      </ServerContext.Provider>
    </MemoryRouter>,
  );

  return { adminApi };
}

describe('핵심 실험 숫자를 실제 값·빈 값·오류로 구분해 보여주는지', () => {
  test('실험 현황에서 지금 모집이 열려 있는지도 같이 보여준다', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '실험 현황' })).toBeInTheDocument();

    const badgeRow = screen.getByTestId('experiment-recruitment-status');
    expect(await within(badgeRow).findByText('모집 중')).toBeInTheDocument();
  });

  test('관리자 화면에서 실험 현황으로 바로 갈 수 있다', async () => {
    renderPage();

    expect(
      await screen.findByRole('link', { name: '실험 현황' }),
    ).toHaveAttribute('href', '/admin/experiment');
  });

  test('전체 신청·고유 판매자·구매 상품·완료 신청 숫자를 보여준다', async () => {
    renderPage();

    const summary = await screen.findByTestId('experiment-summary');
    const cards = Array.from(
      summary.querySelectorAll('.experiment-summary-card'),
    );
    expect(cards).toHaveLength(4);

    const values = cards.map((card) => ({
      label: card.querySelector('.experiment-summary-label').textContent,
      value: card.querySelector('.experiment-summary-value').textContent,
    }));

    expect(values).toEqual([
      { label: '전체 판매 신청 수', value: '3' },
      { label: '고유 판매자 수', value: '2' },
      { label: '실제 구매 상품 수', value: '1' },
      { label: '처리 완료 신청 수', value: '1' },
    ]);
  });

  test('가격·비율·편의점·행사·상태·결과 집계를 보여준다', async () => {
    renderPage();

    expect(await screen.findByText('판매 희망금액 분포')).toBeInTheDocument();
    expect(screen.getByText('희망가격 비율 분포')).toBeInTheDocument();
    expect(screen.getByText('편의점별 신청 수')).toBeInTheDocument();
    expect(screen.getByText('행사 유형별 신청 수')).toBeInTheDocument();
    expect(screen.getByText('신청 상태별 수')).toBeInTheDocument();
    expect(screen.getByText('상품 결과별 수')).toBeInTheDocument();
    expect(screen.getByText('재신청 판매자 수')).toBeInTheDocument();
  });

  test('진짜로 데이터가 없을 때만 데이터가 없어요를 보여준다', async () => {
    renderPage({ metrics: emptyMetrics });

    expect(await screen.findByText('데이터가 없어요.')).toBeInTheDocument();
  });

  test('숫자를 못 불러오면 0건인 척하지 않는다', async () => {
    renderPage({
      getExperimentMetrics: jest.fn(async () => {
        throw new Error('metrics failed');
      }),
    });

    expect(
      await screen.findByText('실험 현황을 불러오지 못했어요. 잠시 후 다시 시도해주세요.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('전체 판매 신청 수')).not.toBeInTheDocument();
  });

  test('숫자를 불러오는 동안에는 로딩 중이라고 보여준다', () => {
    renderPage({
      getExperimentMetrics: jest.fn(() => new Promise(() => {})),
    });

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument();
  });
});
