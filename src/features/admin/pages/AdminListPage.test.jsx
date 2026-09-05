/*
 * 관련 작업: FE-8 — 관리자 판매 신청 목록.
 * 작성 이유: 운영자가 들어온 신청을 확인하고 상태별로 구분할 수 있어야 하기 때문.
 * 확인 내용: 빈 목록, 제출된 신청 표시, 접수 상태 필터.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServerContext } from '../../server/ServerContext';
import { createFixtureAdapters } from '../../../adapters/fixture';
import AdminListPage from './AdminListPage';

function renderWithAdapters(ui) {
  return render(
    <MemoryRouter>
      <ServerContext.Provider value={createFixtureAdapters()}>{ui}</ServerContext.Provider>
    </MemoryRouter>,
  );
}

const validDraft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  items: [
    { productName: '코카콜라 제로 500ml', expirationDate: '2026-09-30', originalPrice: 2200, askingPrice: 1000 },
  ],
  evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
  contactType: 'phone',
  contactValue: '010-1234-5678',
};

describe('관리자 신청 목록 페이지', () => {
  test('신청이 없으면 빈 상태를 보여준다', async () => {
    renderWithAdapters(<AdminListPage />);

    expect(
      await screen.findByText('아직 접수된 판매 신청이 없습니다.'),
    ).toBeInTheDocument();
  });

  test('제출된 신청이 목록에 보인다', async () => {
    const adapters = createFixtureAdapters();
    await adapters.saleRequestApi.submitSaleRequest(validDraft);

    render(
      <MemoryRouter>
        <ServerContext.Provider value={adapters}><AdminListPage /></ServerContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/GS25/)).toBeInTheDocument();
    expect(screen.getByText(/상품 1개/)).toBeInTheDocument();
    expect(screen.getAllByText('접수됨').length).toBeGreaterThan(0);
  });

  test('상태 필터 칩이 렌더링된다', () => {
    renderWithAdapters(<AdminListPage />);

    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '접수됨' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '연락중' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '처리완료' })).toBeInTheDocument();
  });
});
