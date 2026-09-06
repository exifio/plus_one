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

describe('Admin Auth Gate', () => {
  test('세션이 없으면 관리자 화면 대신 로그인 route로 보낸다', async () => {
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

  test('로컬 세션만 있고 서버 사용자가 없으면 로그인 route로 보낸다', async () => {
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

  test('유효한 세션이 있으면 관리자 route를 통과시킨다', async () => {
    const authApi = {
      getUser: jest.fn(async () => ({ id: 'admin-user' })),
      signOut: jest.fn(async () => {}),
      onAuthStateChange: jest.fn(() => jest.fn()),
    };

    renderGate(authApi);

    expect(await screen.findByText('보호된 관리자 화면')).toBeInTheDocument();
  });
});
