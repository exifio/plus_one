import { useEffect, useState } from 'react';
import { SALE_REQUEST_ACTION } from '../../../sale-request/state/saleRequestReducer';

export default function StepEvidence({ draft, dispatch, embedded = false }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!draft.evidenceImage) {
      setPreviewUrl(null);
      return undefined;
    }

    if (typeof draft.evidenceImage === 'string') {
      setPreviewUrl(draft.evidenceImage);
      return undefined;
    }

    if (typeof URL.createObjectURL !== 'function') {
      setPreviewUrl(null);
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(draft.evidenceImage);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL?.(nextPreviewUrl);
  }, [draft.evidenceImage]);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 선택해주세요.');
      return;
    }

    setError(null);
    dispatch({ type: SALE_REQUEST_ACTION.SET_EVIDENCE_IMAGE, payload: file });
  };

  const content = (
    <>
      <div className="capture-guide" aria-hidden="true">
        <span className="capture-guide-title">전체 화면 스크린샷이면 돼요</span>
        <span className="capture-guide-box">보관함 화면 그대로 캡처해주세요</span>
      </div>

      <label className={`upload-area${previewUrl ? ' has-image' : ''}`}>
        <input
          id="evidence-image"
          type="file"
          accept="image/*"
          aria-label="보관상품 확인 이미지"
          onChange={handleFile}
          hidden
        />
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="보관상품 확인 이미지" className="upload-preview" />
            <span className="upload-change">다른 이미지 선택</span>
          </>
        ) : (
          <span className="upload-empty">
            <span className="upload-plus">＋</span>
            스크린샷 올리기
            <br />
            이미지 파일 1장
          </span>
        )}
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );

  if (embedded) return <div className="embedded-evidence">{content}</div>;

  return (
    <section className="step">
      <h1 className="step-title">스크린샷으로 상품을 등록할게요</h1>
      <p className="step-desc">
        편의점 앱에서 상품 정보가 보이는 화면을 첨부해주세요.
      </p>
      {content}
    </section>
  );
}
