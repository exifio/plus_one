/*
 * 관련 작업: FE-6·FE-7 — 판매자 3단계 신청 화면과 모집 상태 가드.
 * 작성 이유: 사용자가 조건 선택부터 연락처·확인 단계까지 이동하고, 닫힌 모집에는 접근하지 못해야 하기 때문.
 * 확인 내용: 선택 필수값, 상품 입력 방식, 증빙 이미지, 전화번호, 확인 화면, paused/closed/error 차단.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ServerContext } from '../../server/ServerContext';
import { createFixtureAdapters } from '../../../adapters/fixture';
import SellPage from './SellPage';

function renderSellPage() {
  return render(
    <MemoryRouter>
      <ServerContext.Provider value={createFixtureAdapters()}>
        <SellPage />
      </ServerContext.Provider>
    </MemoryRouter>,
  );
}

async function openSellPage() {
  renderSellPage();
  // 모집 상태 확인(open)이 끝나면 등록 폼이 표시된다.
  return screen.findByRole('button', { name: '상품 등록하기' });
}

function renderSellPageWithRecruitment(getRecruitmentStatus) {
  const saleRequestApi = { getRecruitmentStatus };
  return render(
    <MemoryRouter>
      <ServerContext.Provider value={{ saleRequestApi, storageApi: {} }}>
        <SellPage />
      </ServerContext.Provider>
    </MemoryRouter>,
  );
}

describe('판매 페이지 1단계', () => {
  test('편의점과 행사 유형을 모두 선택해야 상품 등록하기가 활성화된다', async () => {
    const user = userEvent.setup();
    const nextButton = await openSellPage();
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'GS25' }));
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '1+1' }));
    expect(nextButton).toBeEnabled();
  });

  test('두 값을 선택하고 다음을 누르면 2단계 상품 등록으로 이동한다', async () => {
    const user = userEvent.setup();
    await openSellPage();

    await user.click(screen.getByRole('button', { name: 'GS25' }));
    await user.click(screen.getByRole('button', { name: '1+1' }));
    await user.click(screen.getByRole('button', { name: '상품 등록하기' }));

    expect(
      screen.getByRole('heading', { name: '판매할 상품을 등록해주세요' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '스크린샷으로 등록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '직접 입력하기' })).toBeInTheDocument();
  });

  test('직접 입력을 선택하면 이미지 없이 상품 정보를 입력할 수 있다', async () => {
    const user = userEvent.setup();
    await openSellPage();

    await user.click(screen.getByRole('button', { name: 'GS25' }));
    await user.click(screen.getByRole('button', { name: '1+1' }));
    await user.click(screen.getByRole('button', { name: '상품 등록하기' }));
    await user.click(screen.getByRole('button', { name: '직접 입력하기' }));

    await user.type(screen.getByLabelText('상품명', { exact: false }), '코카콜라 제로 500ml');
    await user.type(screen.getByLabelText('행사 당시 가격', { exact: false }), '2200');
    await user.type(screen.getByLabelText('판매 희망 가격', { exact: false }), '1000');

    await user.click(screen.getByRole('button', { name: '연락처 입력하기' }));

    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '어떻게 연락드리면 될까요?' })).toBeInTheDocument();
  });

  test('스크린샷으로 등록을 선택하면 이미지 첨부 후 연락처 단계로 이동한다', async () => {
    const user = userEvent.setup();
    const file = new File(['image'], 'stored-item.png', { type: 'image/png' });
    await openSellPage();

    await user.click(screen.getByRole('button', { name: 'GS25' }));
    await user.click(screen.getByRole('button', { name: '1+1' }));
    await user.click(screen.getByRole('button', { name: '상품 등록하기' }));
    await user.click(screen.getByRole('button', { name: '스크린샷으로 등록' }));

    const nextButton = screen.getByRole('button', { name: '연락처 입력하기' });
    expect(nextButton).toBeDisabled();
    await user.upload(screen.getByLabelText('보관상품 확인 이미지'), file);
    expect(nextButton).toBeEnabled();

    await user.click(nextButton);

    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  test('3단계 연락처에서 휴대폰 번호는 11자리가 완성되어야 다음 단계가 활성화된다', async () => {
    const user = userEvent.setup();
    await openSellPage();

    await user.click(screen.getByRole('button', { name: 'GS25' }));
    await user.click(screen.getByRole('button', { name: '1+1' }));
    await user.click(screen.getByRole('button', { name: '상품 등록하기' }));
    await user.click(screen.getByRole('button', { name: '직접 입력하기' }));

    await user.type(screen.getByLabelText('상품명', { exact: false }), '코카콜라');
    await user.type(screen.getByLabelText('행사 당시 가격', { exact: false }), '2200');
    await user.type(screen.getByLabelText('판매 희망 가격', { exact: false }), '1000');
    await user.click(screen.getByRole('button', { name: '연락처 입력하기' }));

    const nextButton = screen.getByRole('button', { name: '신청 내용 확인하기' });
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '휴대폰' }));
    const phoneInput = screen.getByLabelText('휴대폰 번호', { exact: false });

    // 1자리만 입력했을 때는 비활성화
    await user.type(phoneInput, '1');
    expect(nextButton).toBeDisabled();

    // 11자리 완성 시 010-1234-5678 형태로 포맷되고 버튼 활성화
    await user.clear(phoneInput);
    await user.type(phoneInput, '01012345678');
    expect(phoneInput).toHaveValue('010-1234-5678');
    expect(nextButton).toBeEnabled();

    // 확인하기 클릭 시 바텀시트 오픈
    await user.click(nextButton);
    expect(
      screen.getByRole('heading', { name: '판매 신청 내용 확인' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '판매 신청하기' })).toBeInTheDocument();

    // 바텀시트 닫기 동작
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(
      screen.queryByRole('heading', { name: '판매 신청 내용 확인' }),
    ).not.toBeInTheDocument();
  });
});

describe('판매 페이지 모집 상태 가드', () => {
  test('paused이면 등록 폼 대신 일시중지 안내를 보여준다', async () => {
    renderSellPageWithRecruitment(jest.fn(async () => ({ status: 'paused' })));

    expect(await screen.findByText('판매 신청을 잠시 쉬고 있어요')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '어떤 상품을 판매하시나요?' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈으로' })).toBeInTheDocument();
  });

  test('closed이면 등록 폼 대신 마감 안내를 보여준다', async () => {
    renderSellPageWithRecruitment(jest.fn(async () => ({ status: 'closed' })));

    expect(await screen.findByText('현재 모집이 마감됐어요')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '어떤 상품을 판매하시나요?' }),
    ).not.toBeInTheDocument();
  });

  test('조회 실패 시 등록 폼을 보여주지 않는다', async () => {
    renderSellPageWithRecruitment(jest.fn(async () => {
      throw new Error('recruitment status failed');
    }));

    expect(
      await screen.findByText('판매 신청 가능 여부를 확인하지 못했어요'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '어떤 상품을 판매하시나요?' }),
    ).not.toBeInTheDocument();
  });
});
