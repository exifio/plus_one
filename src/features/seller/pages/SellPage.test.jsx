/*
 * 관련 작업: FE-6·FE-7 — 판매자 3단계 신청 화면과 모집 상태 가드.
 * 작성 이유: 필수 상품 정보·증빙·연락처를 순서대로 받은 뒤에만 신청할 수 있어야 하기 때문.
 * 확인 내용: 단계 이동, 필수값 비활성화, 중복 제출 방지, 제출 완료, paused/closed/error 차단.
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

async function openSellPage(adapters) {
  renderSellPage(adapters);
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

async function moveToItems(user, adapters) {
  await openSellPage(adapters);
  await user.click(screen.getByRole('button', { name: 'GS25' }));
  await user.click(screen.getByRole('button', { name: '1+1' }));
  await user.click(screen.getByRole('button', { name: '상품 등록하기' }));
}

async function moveToContact(user, adapters) {
  await moveToItems(user, adapters);
  await user.click(screen.getByRole('button', { name: '직접 입력하기' }));
  await fillFirstItem(user);
  await user.click(screen.getByRole('button', { name: '연락처 입력하기' }));
  await user.click(screen.getByRole('button', { name: '휴대폰' }));
  await user.type(screen.getByLabelText('휴대폰 번호', { exact: false }), '01012345678');
}

describe('판매자가 3단계로 신청을 마칠 수 있는지', () => {
  test('등록 방식을 고르기 전에는 상품 정보나 이미지를 받지 않는다', async () => {
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

  test('스크린샷으로 등록하면 상품명을 몰라도 다음으로 갈 수 있다', async () => {
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

  test('스크린샷을 먼저 올린 뒤에 희망 가격을 받게 한다', async () => {
    const user = userEvent.setup();
    await moveToItems(user);
    await user.click(screen.getByRole('button', { name: '스크린샷으로 등록' }));

    const evidenceTitle = screen.getByText('보관 중인 상품을 확인할게요');
    const askingPrice = screen.getByLabelText('판매 희망 가격', { exact: false });

    expect(evidenceTitle.compareDocumentPosition(askingPrice)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  test('직접 입력하면 사진을 올리지 않아도 다음으로 갈 수 있다', async () => {
    const user = userEvent.setup();
    await moveToItems(user);
    await user.click(screen.getByRole('button', { name: '직접 입력하기' }));
    await fillFirstItem(user);

    const nextButton = screen.getByRole('button', { name: '연락처 입력하기' });
    expect(nextButton).toBeEnabled();
    expect(screen.queryByLabelText('보관상품 확인 이미지')).not.toBeInTheDocument();
  });

  test('편의점과 행사 종류를 고르기 전에는 다음 단계로 못 가게 한다', async () => {
    const user = userEvent.setup();
    const nextButton = await openSellPage();
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'GS25' }));
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '1+1' }));
    expect(nextButton).toBeEnabled();
  });

  test('직접 입력을 고르면 사진 칸 없이 상품 정보만 받는다', async () => {
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

  test('직접 입력한 상품이 있으면 사진 없이 연락처로 넘어간다', async () => {
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

  test('연락 방법과 연락처가 있어야 마지막에 신청할 수 있다', async () => {
    const user = userEvent.setup();
    await moveToContact(user);

    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '어떻게 연락드리면 될까요?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '판매 신청하기' })).toBeEnabled();
  });

  test('연락 방법을 고르기 전에는 번호나 아이디 칸을 보여주지 않는다', async () => {
    const user = userEvent.setup();
    await moveToItems(user);
    await user.click(screen.getByRole('button', { name: '직접 입력하기' }));
    await fillFirstItem(user);
    await user.click(screen.getByRole('button', { name: '연락처 입력하기' }));

    expect(screen.queryByLabelText('휴대폰 번호')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('카카오톡 연락처')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '휴대폰' }));

    expect(screen.getByLabelText('휴대폰 번호')).toBeInTheDocument();
  });

  test('신청이 성공했을 때만 완료 화면으로 보낸다', async () => {
    const user = userEvent.setup();
    await moveToContact(user);

    await user.click(screen.getByRole('button', { name: '판매 신청하기' }));

    expect(await screen.findByText('판매 신청이 접수됐어요')).toBeInTheDocument();
  });

  test('신청 버튼을 여러 번 눌러도 신청이 두 번 나가지 않게 막는다', async () => {
    const user = userEvent.setup();
    let finishSubmit;
    const submitSaleRequest = jest.fn(() => new Promise((resolve) => {
      finishSubmit = () => resolve({
        saleRequestId: 'sr-1',
        sellerId: 'seller-1',
        itemsCount: 1,
      });
    }));
    const adapters = createFixtureAdapters();
    adapters.saleRequestApi.submitSaleRequest = submitSaleRequest;

    await moveToContact(user, adapters);
    await user.click(screen.getByRole('button', { name: '판매 신청하기' }));

    expect(await screen.findByRole('button', { name: '신청 중…' })).toBeDisabled();
    expect(submitSaleRequest).toHaveBeenCalledTimes(1);

    finishSubmit();
    expect(await screen.findByText('판매 신청이 접수됐어요')).toBeInTheDocument();
  });
});

describe('모집이 멈춰 있으면 판매 신청 화면을 열지 않는지', () => {
  function renderWithRecruitment(getRecruitmentStatus) {
    const adapters = {
      saleRequestApi: { getRecruitmentStatus },
      storageApi: {},
    };
    return renderSellPage(adapters);
  }

  test('모집이 일시중지면 신청 폼 대신 쉬는 중 안내만 보여준다', async () => {
    renderWithRecruitment(jest.fn(async () => ({ status: 'paused' })));

    expect(await screen.findByText('판매 신청을 잠시 쉬고 있어요')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '어떤 상품을 판매하시나요?' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈으로' })).toBeInTheDocument();
  });

  test('모집이 마감이면 신청 폼 대신 마감 안내만 보여준다', async () => {
    renderWithRecruitment(jest.fn(async () => ({ status: 'closed' })));

    expect(await screen.findByText('현재 모집이 마감됐어요')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '어떤 상품을 판매하시나요?' })).not.toBeInTheDocument();
  });

  test('모집 상태를 모르면 신청 폼을 열어주지 않는다', async () => {
    renderWithRecruitment(jest.fn(async () => {
      throw new Error('recruitment status failed');
    }));

    expect(await screen.findByText('판매 신청 가능 여부를 확인하지 못했어요')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '어떤 상품을 판매하시나요?' })).not.toBeInTheDocument();
  });
});
