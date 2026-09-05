import { validateSaleRequest } from '../../sale-request/domain/validateSaleRequest';
import { getKoreanTodayString } from '../../sale-request/domain/getKoreanTodayString';

/**
 * 판매 신청 제출 Service.
 *
 * 실행 순서를 조율한다.
 *
 * ```text
 * Validation
 * ↓
 * 보관상품 확인 이미지 Storage Upload
 * ↓
 * create_sale_request (saleRequestApi)
 * ↓
 * 성공/실패 결과 반환
 * ```
 *
 * 실패 시 다음 단계를 실행하지 않는다.
 * MVP에서는 RPC 실패 후 업로드된 orphan 파일 자동 정리를 요구하지 않는다.
 *
 * @param {object} deps
 * @param {object} deps.storageApi { uploadEvidence(image) → path }
 * @param {object} deps.saleRequestApi FE-4 판매자 API 계약
 * @param {string} [deps.today] Asia/Seoul 기준 YYYY-MM-DD (기본: getKoreanTodayString)
 */
export function createSubmitSaleRequestService({ storageApi, saleRequestApi, today }) {
  const referenceDate = today ?? getKoreanTodayString();

  return async function submitSaleRequest(draft) {
    const validation = validateSaleRequest(draft, referenceDate);
    if (!validation.valid) {
      return { ok: false, error: 'validation', fieldErrors: validation.errors };
    }

    let evidencePath;
    try {
      evidencePath = await storageApi.uploadEvidence(draft.evidenceImage);
    } catch {
      return { ok: false, error: 'upload' };
    }

    try {
      const data = await saleRequestApi.submitSaleRequest({
        ...draft,
        evidenceImage: evidencePath,
      });
      return { ok: true, data };
    } catch (error) {
      // Backend(최종 제출 시 재검증)가 모집 중단/마감을 반환한 경우. (명세 §13)
      // 완료 화면으로 이동해야 하는 성공 결과가 아니므로 별도 오류 유형으로 구분한다.
      if (
        error?.code === 'RECRUITMENT_NOT_OPEN'
        || String(error?.message ?? '') === 'RECRUITMENT_NOT_OPEN'
      ) {
        return { ok: false, error: 'recruitment' };
      }
      return { ok: false, error: 'submit' };
    }
  };
}
