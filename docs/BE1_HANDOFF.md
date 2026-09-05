# Backend 핸드오프 (2026-09-05)

## 현재 위치

- Docker/Local Supabase 없이 사용자가 관리하는 non-production Supabase 프로젝트를 사용한다.
- 프론트엔드와 migration 파일은 PRD의 5단계 판매 신청 계약(상품 정보·유효기간·가격·증빙 이미지 필수)을 기준으로 정리되어 있다.
- `supabase/migrations/20260905130051_restore_required_sale_request_contract.sql`이 strict 6-arg `create_sale_request` RPC와 신규 데이터용 필수 필드 제약을 정의한다.
- 원격 non-production에는 이전 실험의 7-arg RPC와 nullable legacy 행이 남아 있다. 기존 행은 삭제하지 않으며, corrective migration의 `NOT VALID` 제약으로 신규 행부터 계약을 강제한다.
- corrective migration의 원격 적용은 별도 승인 후 진행한다.

## 최종 판매 신청 계약

```text
create_sale_request(
  p_contact_type,
  p_contact_value,
  p_convenience_store,
  p_promotion_type,
  p_evidence_image,
  p_items
)
```

- `phone`은 숫자만, `kakao`는 trim한 값을 저장한다.
- `p_evidence_image`는 비어 있을 수 없다.
- `p_items`는 하나 이상의 object이며 상품명·유효기간·양의 정수 가격을 모두 포함해야 한다.
- 유효기간은 `Asia/Seoul` 기준 오늘 또는 미래만 허용한다.
- 모집 상태가 `open`이 아니거나 singleton row가 없으면 `RECRUITMENT_NOT_OPEN`으로 fail-closed 한다.

## 적용 및 검증 순서

1. 원격 non-production에 `20260905130051_restore_required_sale_request_contract.sql`을 승인된 방식으로 적용한다.
2. 실제 값을 Git에 저장하지 않은 `.env.test.local`을 준비한다.
3. `npm run test:integration`을 실행한다.
4. `npm test -- --runInBand`와 `npm run build`를 실행한다.

## 보안 경계

- `.env.test.local`, service role key, Admin Auth 비밀번호는 커밋하지 않는다.
- Seller 연락처·신청·상품·증빙 path는 anon direct CRUD로 노출하지 않는다.
- 판매 증빙은 private Storage에 저장하고 DB에는 object path만 저장한다.
