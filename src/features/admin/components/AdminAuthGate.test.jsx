import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ServerContext } from '../../server/ServerContext';
import AdminAuthGate from './AdminAuthGate';

function renderGate(authApi, initialEntries = ['/admin']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ServerContext.Provider value={{ authApi }}>
        <Routes>
          <Route element={<AdminAuthGate />}>
            <Route path="/admin" element={<p>보호된 관리자 화면</p>} />
          </Route>
          <Route path="/admin/login" element={<p>로그인 화면</p>} />
        </Routes>
      </ServerContext.Provider>
    </MemoryRouter>,
  );
}

describe('관리자 화면 입장 검사', () => {
  test('로그인이 없으면 관리자 화면을 열어주지 않는다', async () => {
    const authApi = {
      getUser: jest.fn(async () => {
        throw Object.assign(new Error('AUTH_USER_REQUEST_FAILED'), { code: 'AUTH_USER_REQUEST_FAILED' });
      }),
      signOut: jest.fn(async () => {}),
      onAuthStateChange: jest.fn(() => jest.fn()),
    };

    renderGate(authApi);

    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
    expect(screen.queryByText('보호된 관리자 화면')).not.toBeInTheDocument();
  });

  test('브라우저에만 남은 로그인으로는 관리자 화면에 들어가지 못하게 한다', async () => {
    const authApi = {
      getUser: jest.fn(async () => {
        throw Object.assign(new Error('AUTH_USER_REQUEST_FAILED'), { code: 'AUTH_USER_REQUEST_FAILED' });
      }),
      signOut: jest.fn(async () => {}),
      onAuthStateChange: jest.fn(() => jest.fn()),
    };

    renderGate(authApi);

    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
    expect(authApi.signOut).toHaveBeenCalled();
  });

  test('허용된 관리자 로그인이면 관리자 화면을 열어준다', async () => {
    const authApi = {
      getUser: jest.fn(async () => ({ id: 'admin-user' })),
      signOut: jest.fn(async () => {}),
      onAuthStateChange: jest.fn(() => jest.fn()),
    };

    renderGate(authApi);

    expect(await screen.findByText('보호된 관리자 화면')).toBeInTheDocument();
  });
});
