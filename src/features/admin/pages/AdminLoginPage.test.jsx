import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ServerContext } from '../../server/ServerContext';
import AdminLoginPage from './AdminLoginPage';

function renderPage(authApi) {
  return render(
    <MemoryRouter initialEntries={['/admin/login']}>
      <ServerContext.Provider value={{ authApi }}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<p>관리자 목록</p>} />
        </Routes>
      </ServerContext.Provider>
    </MemoryRouter>,
  );
}

describe('Admin 로그인 페이지', () => {
  test('로그인 실패 시 원본 Auth 오류 대신 안전한 안내를 보여준다', async () => {
    const user = userEvent.setup();
    const authApi = {
      getUser: jest.fn(async () => {
        throw Object.assign(new Error('AUTH_USER_REQUEST_FAILED'), { code: 'AUTH_USER_REQUEST_FAILED' });
      }),
      signIn: jest.fn(async () => { throw new Error('raw auth error'); }),
    };
    renderPage(authApi);

    await screen.findByRole('heading', { name: '관리자 로그인' });
    await user.type(screen.getByLabelText('이메일'), 'admin@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인에 실패했어요. 이메일과 비밀번호를 확인해주세요.',
    );
    expect(screen.queryByText('raw auth error')).not.toBeInTheDocument();
  });
});
