/*
 * 관련 작업: FE-8 — 관리자 판매 신청 상세와 상품 처리.
 * 작성 이유: 운영자가 판매자·상품 정보를 보고 연락, 구매, 거절을 정확히 처리해야 하기 때문.
 * 확인 내용: 상세 표시, 등록 방식별 증빙, 연락 시작, 구매 증빙 필수, 거절 사유 입력.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ServerContext } from '../../server/ServerContext';
import { createFixtureAdapters } from '../../../adapters/fixture';
import AdminDetailPage from './AdminDetailPage';

const validDraft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  registrationMethod: 'manual',
  items: [
    { productName: '코카콜라 제로 500ml', expirationDate: '2026-09-30', originalPrice: 2200, askingPrice: 1000 },
  ],
  evidenceImage: null,
  contactType: 'phone',
  contactValue: '010-1234-5678',
};

async function seedAndRender(draft = validDraft) {
  const adapters = createFixtureAdapters();
  const { saleRequestId } = await adapters.saleRequestApi.submitSaleRequest(draft);

  const utils = render(
    <MemoryRouter initialEntries={[`/admin/${saleRequestId}`]}>
      <ServerContext.Provider value={adapters}>
        <Routes>
          <Route path="/admin/:saleRequestId" element={<AdminDetailPage />} />
        </Routes>
      </ServerContext.Provider>
    </MemoryRouter>,
  );

  return { adapters, saleRequestId, ...utils };
}

describe('관리자 신청 상세 페이지', () => {
  test('상세 정보를 보여준다', async () => {
    await seedAndRender();

    expect(await screen.findByText(/코카콜라 제로 500ml/)).toBeInTheDocument();
    expect(screen.getByText('01012345678')).toBeInTheDocument();
    expect(screen.getByText('판매자에게 연락 시작')).toBeInTheDocument();
  });

  test('직접 입력 신청에는 상품 정보 스크린샷을 표시하지 않는다', async () => {
    await seedAndRender();

    await screen.findByText(/코카콜라 제로 500ml/);

    expect(screen.queryByAltText('판매 의향 증빙')).not.toBeInTheDocument();
  });

  test('스크린샷 신청은 이미지와 이미지 기반 상품을 표시한다', async () => {
    await seedAndRender({
      ...validDraft,
      registrationMethod: 'screenshot',
      items: [],
      evidenceImage: 'evidence/sale/screenshot.png',
    });

    expect(await screen.findByAltText('상품 정보 스크린샷')).toHaveAttribute(
      'src',
      'evidence/sale/screenshot.png',
    );
    expect(screen.getByText('스크린샷으로 등록한 상품')).toBeInTheDocument();
  });

  test('연락 시작 버튼 클릭 시 contacting으로 바뀌고 버튼이 사라진다', async () => {
    const user = userEvent.setup();
    await seedAndRender();

    await user.click(await screen.findByText('판매자에게 연락 시작'));

    expect(await screen.findByText('연락중')).toBeInTheDocument();
    expect(screen.queryByText('판매자에게 연락 시작')).not.toBeInTheDocument();
  });

  test('구매 처리: 증빙 없이 구매 처리를 누르면 처리되지 않는다', async () => {
    const user = userEvent.setup();
    await seedAndRender();

    await user.click(await screen.findByText('구매'));

    expect(await screen.findByText('이 상품을 구매 처리할까요?')).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: '구매 처리' });
    expect(submitButton).toBeDisabled();
  });

  test('구매 처리: 증빙을 선택하면 구매가 완료된다', async () => {
    const user = userEvent.setup();
    const file = new File(['purchase'], 'deal.png', { type: 'image/png' });

    await seedAndRender();

    await user.click(await screen.findByText('구매'));
    expect(await screen.findByText('이 상품을 구매 처리할까요?')).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: '구매 처리' }));

    expect(await screen.findByText('✓ 구매 완료')).toBeInTheDocument();
    expect(screen.queryByText('구매 처리할까요?')).not.toBeInTheDocument();
  });

  test('거절 처리: 이유를 입력하면 거절된다', async () => {
    const user = userEvent.setup();

    await seedAndRender();

    await user.click(await screen.findByText('거절'));
    expect(await screen.findByText('거절 이유를 입력해주세요')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('거절 이유를 입력해주세요'), '가격 협의 불가');
    await user.click(screen.getByRole('button', { name: '거절 처리' }));

    expect(await screen.getAllByText('거절').length).toBeGreaterThan(0);
    expect(screen.getByText('가격 협의 불가')).toBeInTheDocument();
  });
});
