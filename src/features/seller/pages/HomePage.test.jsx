/*
 * 관련 작업: FE-6 — 홈 화면의 모집 상태 차단.
 * 작성 이유: 모집이 멈췄거나 상태 조회에 실패했을 때 새 판매 신청을 시작시키면 안 되기 때문.
 * 확인 내용: open/paused/closed와 조회 실패에 따른 CTA와 안내 문구.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServerContext } from '../../server/ServerContext';
import HomePage from './HomePage';

function renderHome(getRecruitmentStatus) {
  const saleRequestApi = { getRecruitmentStatus };
  render(
    <MemoryRouter>
      <ServerContext.Provider value={{ saleRequestApi }}>
        <HomePage />
      </ServerContext.Provider>
    </MemoryRouter>,
  );
  return { saleRequestApi };
}

describe('홈에서 모집이 열려 있을 때만 판매 등록을 시작하는지', () => {
  test('로고를 눌러도 판매 홈으로 돌아온다', async () => {
    renderHome(jest.fn(async () => ({ status: 'open' })));

    const logoLink = await screen.findByRole('link', { name: '홈으로 이동' });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  test('모집 중일 때만 판매 등록을 시작할 수 있다', async () => {
    renderHome(jest.fn(async () => ({ status: 'open' })));

    const cta = await screen.findByRole('link', { name: '판매 등록 시작' });
    expect(cta).toHaveAttribute('href', '/sell');
  });

  test('모집이 일시중지면 판매 등록을 시작하지 못하게 한다', async () => {
    renderHome(jest.fn(async () => ({ status: 'paused' })));

    expect(await screen.findByText('판매 신청을 잠시 쉬고 있어요')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '판매 등록 시작' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '판매 등록 시작' })).toBeDisabled();
  });

  test('모집이 마감이면 새 신청을 시작하지 못하게 한다', async () => {
    renderHome(jest.fn(async () => ({ status: 'closed' })));

    expect(await screen.findByText('현재 모집이 마감됐어요')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '판매 등록 시작' })).not.toBeInTheDocument();
  });

  test('모집 상태를 모르면 신청을 시작시키지 않는다', async () => {
    renderHome(jest.fn(async () => {
      throw new Error('recruitment status failed');
    }));

    expect(
      await screen.findByText('판매 신청 가능 여부를 확인하지 못했어요'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '판매 등록 시작' })).toBeDisabled();
  });
});
