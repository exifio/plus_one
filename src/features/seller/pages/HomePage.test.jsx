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

describe('홈 페이지 모집 상태 반영', () => {
  test('open이면 판매 등록 버튼이 활성화된다', async () => {
    renderHome(jest.fn(async () => ({ status: 'open' })));

    const cta = await screen.findByRole('link', { name: '판매 등록 시작' });
    expect(cta).toHaveAttribute('href', '/sell');
  });

  test('paused이면 모집 중단 안내를 보여주고 판매 등록 링크를 비활성 버튼으로 대체한다', async () => {
    renderHome(jest.fn(async () => ({ status: 'paused' })));

    expect(await screen.findByText('판매 신청을 잠시 쉬고 있어요')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '판매 등록 시작' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '판매 등록 시작' })).toBeDisabled();
  });

  test('closed이면 모집 마감 안내를 보여준다', async () => {
    renderHome(jest.fn(async () => ({ status: 'closed' })));

    expect(await screen.findByText('현재 모집이 마감됐어요')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '판매 등록 시작' })).not.toBeInTheDocument();
  });

  test('조회 실패 시 신청을 허용하지 않고 안전한 오류 안내를 보여준다', async () => {
    renderHome(jest.fn(async () => {
      throw new Error('recruitment status failed');
    }));

    expect(
      await screen.findByText('판매 신청 가능 여부를 확인하지 못했어요'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '판매 등록 시작' })).toBeDisabled();
  });
});
