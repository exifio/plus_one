/*
 * 관련 작업: FE-8 — 관리자 판매 신청 목록.
 * 작성 이유: 운영자가 들어온 신청을 확인하고 상태별로 구분할 수 있어야 하기 때문.
 * 확인 내용: 빈 목록, 제출된 신청 표시, 상태 필터, 조회 실패.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('운영자가 들어온 신청을 보고 상태별로 가릴 수 있는지', () => {
  test('신청이 없을 때는 빈 화면이지 가짜 목록이 아니다', async () => {
    renderWithAdapters(<AdminListPage />);

    expect(
      await screen.findByText('아직 접수된 판매 신청이 없습니다.'),
    ).toBeInTheDocument();
  });

  test('목록에서 연락처·편의점·등록 방식을 바로 볼 수 있다', async () => {
    const adapters = createFixtureAdapters();
    await adapters.saleRequestApi.submitSaleRequest(validDraft);

    render(
      <MemoryRouter>
        <ServerContext.Provider value={adapters}><AdminListPage /></ServerContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('010-1234-5678')).toBeInTheDocument();
    expect(await screen.findByText(/GS25/)).toBeInTheDocument();
    expect(screen.getByText(/휴대폰/)).toBeInTheDocument();
    expect(screen.getByText(/이미지/)).toBeInTheDocument();
    expect(screen.getAllByText('접수됨').length).toBeGreaterThan(0);
  });

  test('상태 버튼을 누르면 그 상태 신청만 보이게 한다', async () => {
    const user = userEvent.setup();
    const adapters = createFixtureAdapters();
    await adapters.saleRequestApi.submitSaleRequest(validDraft);

    render(
      <MemoryRouter>
        <ServerContext.Provider value={adapters}><AdminListPage /></ServerContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('010-1234-5678')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '접수됨' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '처리완료' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '연락중' }));
    expect(screen.queryByText('010-1234-5678')).not.toBeInTheDocument();
    expect(screen.getByText('아직 접수된 판매 신청이 없습니다.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '접수됨' }));
    expect(screen.getByText('010-1234-5678')).toBeInTheDocument();
  });

  test('목록을 못 불러오면 빈 목록인 척하지 않는다', async () => {
    const adapters = createFixtureAdapters();
    adapters.adminApi.getSaleRequests = jest.fn(async () => {
      throw new Error('admin api failed');
    });

    render(
      <MemoryRouter>
        <ServerContext.Provider value={adapters}><AdminListPage /></ServerContext.Provider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('신청을 불러오지 못했어요. 잠시 후 다시 시도해주세요.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('아직 접수된 판매 신청이 없습니다.')).not.toBeInTheDocument();
  });
});
