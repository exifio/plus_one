/*
 * 관련 작업: FE-9 — 관리자 모집 관리 화면.
 * 작성 이유: 운영자가 모집 상태를 바꿀 수 있어야 하지만 저장 실패 때 기존 상태를 잃으면 안 되기 때문.
 * 확인 내용: 현재 상태 표시, 같은 상태 저장 차단, 차단 변경 확인, 성공·실패·취소 흐름.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ServerContext } from '../../server/ServerContext';
import AdminRecruitmentPage from './AdminRecruitmentPage';

function renderPage({ status = 'open', updateRecruitmentStatus } = {}) {
  const adminApi = {
    getRecruitmentStatus: jest.fn(async () => ({ status })),
    updateRecruitmentStatus:
      updateRecruitmentStatus ?? jest.fn(async (next) => next),
  };

  render(
    <MemoryRouter>
      <ServerContext.Provider value={{ adminApi }}>
        <AdminRecruitmentPage />
      </ServerContext.Provider>
    </MemoryRouter>,
  );

  return { adminApi };
}

describe('관리자 모집 관리 페이지', () => {
  test('현재 상태와 상태별 안내 문구를 보여준다', async () => {
    renderPage({ status: 'open' });

    const current = await screen.findByTestId('recruitment-current-status');
    expect(within(current).getByText('모집 중')).toBeInTheDocument();
    expect(screen.getByText('현재 판매 신청을 받고 있습니다.')).toBeInTheDocument();
  });

  test('현재 상태와 선택 상태가 같으면 저장 버튼이 비활성화된다', async () => {
    renderPage({ status: 'open' });

    await screen.findByTestId('recruitment-current-status');
    expect(screen.getByRole('button', { name: '변경 사항 저장' })).toBeDisabled();
  });

  test('open → paused는 확인 대화상자를 거쳐 저장된다', async () => {
    const user = userEvent.setup();
    const { adminApi } = renderPage({ status: 'open' });

    await user.click(await screen.findByRole('button', { name: '일시중지' }));
    await user.click(screen.getByRole('button', { name: '변경 사항 저장' }));

    const dialog = await screen.findByRole('dialog');
    expect(screen.getByText('판매 신청 접수를 일시중지할까요?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '일시중지' }));

    expect(adminApi.updateRecruitmentStatus).toHaveBeenCalledWith('paused');
    expect(await screen.findByText('모집 상태가 변경되었습니다.')).toBeInTheDocument();
  });

  test('paused → open은 확인 대화상자 없이 저장된다', async () => {
    const user = userEvent.setup();
    const { adminApi } = renderPage({ status: 'paused' });

    await user.click(await screen.findByRole('button', { name: '모집 중' }));
    await user.click(screen.getByRole('button', { name: '변경 사항 저장' }));

    expect(adminApi.updateRecruitmentStatus).toHaveBeenCalledWith('open');
    expect(await screen.findByText('모집 상태가 변경되었습니다.')).toBeInTheDocument();
  });

  test('저장 실패 시 기존 상태를 유지하고 재시도 안내를 보여준다', async () => {
    const user = userEvent.setup();
    const { adminApi } = renderPage({
      status: 'open',
      updateRecruitmentStatus: jest.fn(async () => {
        throw new Error('db failed');
      }),
    });

    await user.click(await screen.findByRole('button', { name: '마감' }));
    await user.click(screen.getByRole('button', { name: '변경 사항 저장' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: '마감' }));

    expect(
      await screen.findByText('모집 상태를 변경하지 못했습니다. 다시 시도해주세요.'),
    ).toBeInTheDocument();
    // 선택 상태가 현재 상태로 복원되어 저장 버튼은 다시 비활성화된다.
    expect(screen.getByRole('button', { name: '변경 사항 저장' })).toBeDisabled();
  });

  test('확인 대화상자에서 취소하면 저장하지 않는다', async () => {
    const user = userEvent.setup();
    const { adminApi } = renderPage({ status: 'open' });

    await user.click(await screen.findByRole('button', { name: '마감' }));
    await user.click(screen.getByRole('button', { name: '변경 사항 저장' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(adminApi.updateRecruitmentStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
