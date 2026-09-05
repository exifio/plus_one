/*
 * 관련 작업: FE-6·FE-7 — 판매자 3단계 신청 화면과 모집 상태 가드.
 * 작성 이유: 필수 상품 정보·증빙·연락처를 순서대로 받은 뒤에만 신청할 수 있어야 하기 때문.
 * 확인 내용: 단계 이동, 필수값 비활성화, 증빙 업로드, 제출 완료, paused/closed/error 차단.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Route, Routes } from 'react-router-dom';
import { ServerContext } from '../../server/ServerContext';
import { createFixtureAdapters } from '../../../adapters/fixture';
import SellPage from './SellPage';
import SellCompletePage from './SellCompletePage';

function renderSellPage(adapters = createFixtureAdapters()) {
  return render(
    <MemoryRouter initialEntries={['/sell']}>
      <ServerContext.Provider value={adapters}>
        <Routes>
          <Route path="/sell" element={<SellPage />} />
          <Route path="/sell/complete" element={<SellCompletePage />} />
        </Routes>
      </ServerContext.Provider>
    </MemoryRouter>,
  );
}

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-review-evidence');
});

async function openSellPage() {
  renderSellPage();
  return screen.findByRole('button', { name: '상품 등록하기' });
}

async function fillFirstItem(user) {
  await user.type(screen.getByLabelText('상품명', { exact: false }), '코카콜라 제로 500ml');
  fireEvent.change(screen.getByLabelText('유효기간', { exact: false }), {
    target: { value: '2026-09-30' },
  });
  await user.type(screen.getByLabelText('행사 당시 가격', { exact: false }), '2200');
  await user.type(screen.getByLabelText('판매 희망 가격', { exact: false }), '1000');
}

async function moveToItems(user) {
  await openSellPage();
  await user.click(screen.getByRole('button', { name: 'GS25' }));
  await user.click(screen.getByRole('button', { name: '1+1' }));
  await user.click(screen.getByRole('button', { name: '상품 등록하기' }));
}

async function moveToContact(user) {
  await moveToItems(user);
  await user.click(screen.getByRole('button', { name: '직접 입력하기' }));
  await fillFirstItem(user);
  await user.click(screen.getByRole('button', { name: '연락처 입력하기' }));
  await user.click(screen.getByRole('button', { name: '휴대폰' }));
  await user.type(screen.getByLabelText('휴대폰 번호', { exact: false }), '01012345678');
}

describe('판매자 3단계 신청', () => {
  test('2단계에서 스크린샷 등록과 직접 입력 중 하나를 선택한다', async () => {
    const user = userEvent.setup();
    await moveToItems(user);

    expect(screen.getByRole('button', { name: '스크린샷으로 등록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '직접 입력하기' })).toBeInTheDocument();
    expect(screen.queryByLabelText('상품명', { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('보관상품 확인 이미지')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '스크린샷으로 등록' }));
    expect(screen.getByLabelText('보관상품 확인 이미지')).toBeInTheDocument();
    expect(screen.queryByLabelText('상품명', { exact: false })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '직접 입력하기' }));
    expect(screen.getByLabelText('상품명', { exact: false })).toBeInTheDocument();
    expect(screen.queryByLabelText('보관상품 확인 이미지')).not.toBeInTheDocument();
  });

  test('스크린샷 등록은 이미지와 판매 희망 가격만으로 다음 단계로 이동한다', async () => {
    const user = userEvent.setup();
    await moveToItems(user);
    await user.click(screen.getByRole('button', { name: '스크린샷으로 등록' }));
    await user.type(screen.getByLabelText('판매 희망 가격', { exact: false }), '1000');
    await user.upload(
      screen.getByLabelText('보관상품 확인 이미지'),
      new File(['image'], 'stored-item.png', { type: 'image/png' }),
    );

    const nextButton = screen.getByRole('button', { name: '연락처 입력하기' });
    expect(nextButton).toBeEnabled();
    await user.click(nextButton);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  test('스크린샷 등록에서는 스크린샷이 판매 희망 가격보다 먼저 보인다', async () => {
    const user = userEvent.setup();
    await moveToItems(user);
    await user.click(screen.getByRole('button', { name: '스크린샷으로 등록' }));

    const evidenceTitle = screen.getByText('보관 중인 상품을 확인할게요');
    const askingPrice = screen.getByLabelText('판매 희망 가격', { exact: false });

    expect(evidenceTitle.compareDocumentPosition(askingPrice)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  test('직접 입력은 상품 정보만으로 다음 단계로 이동한다', async () => {
    const user = userEvent.setup();
    await moveToItems(user);
    await user.click(screen.getByRole('button', { name: '직접 입력하기' }));
    await fillFirstItem(user);

    const nextButton = screen.getByRole('button', { name: '연락처 입력하기' });
    expect(nextButton).toBeEnabled();
    expect(screen.queryByLabelText('보관상품 확인 이미지')).not.toBeInTheDocument();
  });

  test('편의점과 행사 유형을 모두 선택해야 상품 등록하기가 활성화된다', async () => {
    const user = userEvent.setup();
    const nextButton = await openSellPage();
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'GS25' }));
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '1+1' }));
    expect(nextButton).toBeEnabled();
  });

  test('직접 입력 방식을 고르면 상품 정보만 보여준다', async () => {
    const user = userEvent.setup();
    await openSellPage();

    await user.click(screen.getByRole('button', { name: 'GS25' }));
    await user.click(screen.getByRole('button', { name: '1+1' }));
    await user.click(screen.getByRole('button', { name: '상품 등록하기' }));
    await user.click(screen.getByRole('button', { name: '직접 입력하기' }));

    const nextButton = screen.getByRole('button', { name: '연락처 입력하기' });
    expect(nextButton).toBeDisabled();
    expect(screen.getByText('꼭 입력하지 않으셔도 괜찮아요.')).toBeInTheDocument();
    expect(screen.queryByLabelText('보관상품 확인 이미지')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('상품명', { exact: false }), '코카콜라 제로 500ml');
    await user.type(screen.getByLabelText('행사 당시 가격', { exact: false }), '2200');
    await user.type(screen.getByLabelText('판매 희망 가격', { exact: false }), '1000');
    expect(nextButton).toBeEnabled();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  test('직접 입력 정보가 있으면 이미지 없이 연락처 단계로 이동한다', async () => {
    const user = userEvent.setup();
    await moveToItems(user);
    await user.click(screen.getByRole('button', { name: '직접 입력하기' }));
    await fillFirstItem(user);

    const nextButton = screen.getByRole('button', { name: '연락처 입력하기' });
    expect(nextButton).toBeEnabled();
    expect(screen.queryByLabelText('보관상품 확인 이미지')).not.toBeInTheDocument();

    await user.click(nextButton);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '어떻게 연락드리면 될까요?' })).toBeInTheDocument();
  });

  test('연락처가 유효하면 3단계에서 신청할 수 있다', async () => {
    const user = userEvent.setup();
    await moveToContact(user);

    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '어떻게 연락드리면 될까요?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '판매 신청하기' })).toBeEnabled();
  });

  test('최종 신청을 완료하면 완료 화면으로 이동한다', async () => {
    const user = userEvent.setup();
    await moveToContact(user);

    await user.click(screen.getByRole('button', { name: '판매 신청하기' }));

    expect(await screen.findByText('판매 신청이 접수됐어요')).toBeInTheDocument();
  });
});

describe('판매 페이지 모집 상태 가드', () => {
  function renderWithRecruitment(getRecruitmentStatus) {
    const adapters = {
      saleRequestApi: { getRecruitmentStatus },
      storageApi: {},
    };
    return renderSellPage(adapters);
  }

  test('paused이면 등록 폼 대신 일시중지 안내를 보여준다', async () => {
    renderWithRecruitment(jest.fn(async () => ({ status: 'paused' })));

    expect(await screen.findByText('판매 신청을 잠시 쉬고 있어요')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '어떤 상품을 판매하시나요?' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈으로' })).toBeInTheDocument();
  });

  test('closed이면 등록 폼 대신 마감 안내를 보여준다', async () => {
    renderWithRecruitment(jest.fn(async () => ({ status: 'closed' })));

    expect(await screen.findByText('현재 모집이 마감됐어요')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '어떤 상품을 판매하시나요?' })).not.toBeInTheDocument();
  });

  test('조회 실패 시 등록 폼을 보여주지 않는다', async () => {
    renderWithRecruitment(jest.fn(async () => {
      throw new Error('recruitment status failed');
    }));

    expect(await screen.findByText('판매 신청 가능 여부를 확인하지 못했어요')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '어떤 상품을 판매하시나요?' })).not.toBeInTheDocument();
  });
});
