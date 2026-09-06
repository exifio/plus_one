/*
 * 관련 작업: FE-7 — 보관상품 증빙 이미지 미리보기.
 * 작성 이유: 선택한 파일을 미리 본 뒤 화면을 닫을 때 임시 브라우저 주소를 정리해야 하기 때문.
 * 확인 내용: 파일 미리보기와 컴포넌트가 사라질 때 object URL 해제.
 */
import { render, screen } from '@testing-library/react';
import EvidenceThumb from './EvidenceThumb';

test('화면을 닫을 때 사진 미리보기 주소를 정리한다', () => {
  const createObjectURL = jest.fn(() => 'blob:review-evidence');
  const revokeObjectURL = jest.fn();
  global.URL.createObjectURL = createObjectURL;
  global.URL.revokeObjectURL = revokeObjectURL;

  const file = new File(['image'], 'evidence.png', { type: 'image/png' });
  const { unmount } = render(<EvidenceThumb image={file} alt="상품 정보 스크린샷" />);

  expect(screen.getByAltText('상품 정보 스크린샷')).toHaveAttribute(
    'src',
    'blob:review-evidence',
  );

  unmount();

  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:review-evidence');
});
