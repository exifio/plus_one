/*
 * 관련 작업: FE-1 — React Router 기반 앱 진입 흐름.
 * 작성 이유: 홈의 CTA가 올바른 판매 등록 화면으로 연결되지 않으면 사용자가 핵심 실험을 시작할 수 없기 때문.
 * 확인 내용: 홈 렌더링과 판매 등록 시작 링크의 /sell 이동.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { createFixtureAdapters } from './adapters/fixture';

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App adapters={createFixtureAdapters()} />
    </MemoryRouter>,
  );
}

describe('App 라우팅', () => {
  test('홈에서 판매 등록 시작을 누르면 /sell 1단계로 이동한다', async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByRole('heading', { name: /남은 \+1 보관상품/ })).toBeInTheDocument();

    await user.click(await screen.findByRole('link', { name: '판매 등록 시작' }));

    expect(
      await screen.findByRole('heading', { name: '어떤 상품을 판매하시나요?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });
});
