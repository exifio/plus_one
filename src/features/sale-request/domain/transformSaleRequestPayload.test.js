/*
 * 관련 작업: FE-2 및 LINK-2 — 판매 신청 입력을 DB 요청 형식으로 변환.
 * 작성 이유: 화면의 camelCase 값이 서버의 snake_case 계약으로 정확히 전달되어야 하기 때문.
 * 확인 내용: 연락처·상품·날짜·증빙 경로 변환과 quantity 같은 불필요한 필드 미생성.
 */
import { transformSaleRequestPayload } from './transformSaleRequestPayload';

const draft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  items: [
    {
      productName: '  코카콜라 제로 500ml  ',
      expirationDate: '2026-09-30',
      originalPrice: 2200,
      askingPrice: 1000,
    },
  ],
  contactType: 'phone',
  contactValue: '010-1234-5678',
};

test('DB 저장 형식으로 변환한다', () => {
  const payload = transformSaleRequestPayload(draft, 'sale-evidence/evidence.png');

  expect(payload).toEqual({
    contact_type: 'phone',
    contact_value: '01012345678',
    convenience_store: 'gs25',
    promotion_type: 'one_plus_one',
    evidence_image: 'sale-evidence/evidence.png',
    items: [
      {
        product_name: '코카콜라 제로 500ml',
        expiration_date: '2026-09-30',
        original_price: 2200,
        asking_price: 1000,
      },
    ],
  });
});

test('카카오톡 연락처는 앞뒤 공백만 정리한다', () => {
  const payload = transformSaleRequestPayload(
    { ...draft, contactType: 'kakao', contactValue: '  seller-id  ' },
    'sale-evidence/evidence.png',
  );

  expect(payload.contact_value).toBe('seller-id');
});

test('여러 상품을 모두 변환한다', () => {
  const payload = transformSaleRequestPayload(
    {
      ...draft,
      items: [
        draft.items[0],
        { ...draft.items[0], productName: '딸기우유 200ml' },
      ],
    },
    'sale-evidence/evidence.png',
  );

  expect(payload.items).toHaveLength(2);
  expect(payload.items[1].product_name).toBe('딸기우유 200ml');
});

test('quantity와 등록 방식 필드를 만들지 않는다', () => {
  const payload = transformSaleRequestPayload(draft, 'sale-evidence/evidence.png');

  expect(payload).not.toHaveProperty('quantity');
  expect(payload).not.toHaveProperty('registration_method');
  expect(payload.items[0]).not.toHaveProperty('quantity');
});
