/*
 * 관련 작업: FE-7 — 판매자 보관상품 증빙 입력 단계.
 * 작성 이유: 신청에 필요한 이미지가 없거나 잘못된 파일일 때 다음 단계로 넘어가면 안 되기 때문.
 * 확인 내용: 업로드 안내, 이미지 선택 액션, 이미지가 아닌 파일 차단, 미리보기·교체 UI.
 */
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import StepEvidence from './StepEvidence';
import { SALE_REQUEST_ACTION } from '../../../sale-request/state/saleRequestReducer';

describe('증빙 이미지 단계', () => {
  test('이미지가 없으면 업로드 안내를 보여준다', () => {
    render(<StepEvidence draft={{ evidenceImage: null }} dispatch={() => {}} />);

    expect(screen.getByText(/스크린샷 올리기/)).toBeInTheDocument();
  });

  test('파일을 선택하면 증빙 이미지 설정 액션이 dispatch된다', () => {
    const dispatch = jest.fn();
    const file = new File(['image'], 'evidence.png', { type: 'image/png' });

    const { container } = render(
      <StepEvidence draft={{ evidenceImage: null }} dispatch={dispatch} />,
    );

    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    expect(dispatch).toHaveBeenCalledWith({
      type: SALE_REQUEST_ACTION.SET_EVIDENCE_IMAGE,
      payload: file,
    });
  });

  test('이미지가 아닌 파일은 선택할 수 없다', () => {
    const dispatch = jest.fn();
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });

    const { container } = render(
      <StepEvidence draft={{ evidenceImage: null }} dispatch={dispatch} />,
    );

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByText('이미지 파일만 선택해주세요.')).toBeInTheDocument();
  });

  test('이미지 등록 후에는 미리보기와 다른 이미지 선택을 보여준다', () => {
    const createObjectURL = jest.fn(() => 'blob:mock-evidence');
    global.URL.createObjectURL = createObjectURL;

    const file = new File(['image'], 'evidence.png', { type: 'image/png' });
    render(<StepEvidence draft={{ evidenceImage: file }} dispatch={() => {}} />);

    expect(screen.getByText('다른 이미지 선택')).toBeInTheDocument();
    expect(screen.getByAltText('보관상품 확인 이미지')).toHaveAttribute('src', 'blob:mock-evidence');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});
