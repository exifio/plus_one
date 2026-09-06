/*
 * 관련 작업: FE-3 — 3단계 판매 신청 초안 상태.
 * 작성 이유: 단계가 바뀌어도 사용자가 입력한 조건·상품·증빙·연락처가 사라지면 안 되기 때문.
 * 확인 내용: 초기값, 각 입력 액션, 상품 추가·수정·삭제, 최소 1개 보호, 불변성, 알 수 없는 액션.
 */
import {
  SALE_REQUEST_ACTION,
  createInitialSaleRequestDraft,
  createEmptyStoredItem,
  saleRequestReducer,
} from './saleRequestReducer';

describe('단계가 바뀌어도 입력한 내용이 사라지지 않는지', () => {
  test('처음에는 빈 신청서에 상품 칸 하나만 둔다', () => {
    const state = createInitialSaleRequestDraft();

    expect(state.convenienceStore).toBe('');
    expect(state.promotionType).toBe('');
    expect(state.items).toHaveLength(1);
    expect(state.items[0].productName).toBe('');
    expect(state.items[0].expirationDate).toBe('');
    expect(state.items[0].originalPrice).toBeNull();
    expect(state.items[0].askingPrice).toBeNull();
    expect(state.registrationMethod).toBe('');
    expect(state.evidenceImage).toBeNull();
    expect(state.contactType).toBe('');
    expect(state.contactValue).toBe('');
  });

  test('편의점을 고르면 그 값이 신청서에 남는다', () => {
    const state = saleRequestReducer(createInitialSaleRequestDraft(), {
      type: SALE_REQUEST_ACTION.SET_CONVENIENCE_STORE,
      payload: 'gs25',
    });

    expect(state.convenienceStore).toBe('gs25');
    expect(state.items).toHaveLength(1);
  });

  test('행사 종류를 고르면 그 값이 신청서에 남는다', () => {
    const state = saleRequestReducer(createInitialSaleRequestDraft(), {
      type: SALE_REQUEST_ACTION.SET_PROMOTION_TYPE,
      payload: 'two_plus_one',
    });

    expect(state.promotionType).toBe('two_plus_one');
  });

  test('등록 방식을 고르면 그 값이 신청서에 남는다', () => {
    const state = saleRequestReducer(createInitialSaleRequestDraft(), {
      type: SALE_REQUEST_ACTION.SET_REGISTRATION_METHOD,
      payload: 'screenshot',
    });

    expect(state.registrationMethod).toBe('screenshot');
  });

  test('상품을 더 넣으면 기존 상품은 그대로 두고 한 줄을 추가한다', () => {
    const initial = createInitialSaleRequestDraft();
    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.ADD_ITEM,
      payload: createEmptyStoredItem('item-2'),
    });

    expect(state.items).toHaveLength(2);
    expect(state.items[0].id).toBe(initial.items[0].id);
    expect(state.items[1].id).toBe('item-2');
  });

  test('한 상품의 이름·가격만 바꿔도 다른 값은 유지한다', () => {
    const initial = createInitialSaleRequestDraft();
    const id = initial.items[0].id;
    let state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.UPDATE_ITEM,
      payload: { id, changes: { productName: '코카콜라 제로 500ml' } },
    });
    state = saleRequestReducer(state, {
      type: SALE_REQUEST_ACTION.UPDATE_ITEM,
      payload: { id, changes: { originalPrice: 2200 } },
    });
    state = saleRequestReducer(state, {
      type: SALE_REQUEST_ACTION.UPDATE_ITEM,
      payload: { id, changes: { askingPrice: 1000 } },
    });

    expect(state.items[0]).toEqual({
      id,
      productName: '코카콜라 제로 500ml',
      expirationDate: '',
      originalPrice: 2200,
      askingPrice: 1000,
    });
  });

  test('한 상품의 여러 칸을 한 번에 바꿔도 된다', () => {
    const initial = createInitialSaleRequestDraft();
    const id = initial.items[0].id;
    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.UPDATE_ITEM,
      payload: { id, changes: { expirationDate: '2026-09-30', askingPrice: 1500 } },
    });

    expect(state.items[0].expirationDate).toBe('2026-09-30');
    expect(state.items[0].askingPrice).toBe(1500);
    expect(state.items[0].productName).toBe('');
  });

  test('없는 상품을 바꾸려 해도 목록을 망가뜨리지 않는다', () => {
    const initial = createInitialSaleRequestDraft();
    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.UPDATE_ITEM,
      payload: { id: 'missing', changes: { productName: 'x' } },
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].productName).toBe('');
  });

  test('상품을 지우면 그 줄만 빠진다', () => {
    const initial = createInitialSaleRequestDraft();
    let state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.ADD_ITEM,
      payload: createEmptyStoredItem('item-2'),
    });

    state = saleRequestReducer(state, {
      type: SALE_REQUEST_ACTION.REMOVE_ITEM,
      payload: 'item-2',
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe(initial.items[0].id);
  });

  test('마지막 상품 한 개는 지울 수 없다', () => {
    const initial = createInitialSaleRequestDraft();
    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.REMOVE_ITEM,
      payload: initial.items[0].id,
    });

    expect(state.items).toHaveLength(1);
  });

  test('선택한 보관 확인 이미지가 신청서에 남는다', () => {
    const state = saleRequestReducer(createInitialSaleRequestDraft(), {
      type: SALE_REQUEST_ACTION.SET_EVIDENCE_IMAGE,
      payload: 'evidence/sale/screen.png',
    });

    expect(state.evidenceImage).toBe('evidence/sale/screen.png');
  });

  test('연락 방법과 연락처가 신청서에 남는다', () => {
    let state = saleRequestReducer(createInitialSaleRequestDraft(), {
      type: SALE_REQUEST_ACTION.SET_CONTACT_TYPE,
      payload: 'phone',
    });
    state = saleRequestReducer(state, {
      type: SALE_REQUEST_ACTION.SET_CONTACT_VALUE,
      payload: '010-1234-5678',
    });

    expect(state.contactType).toBe('phone');
    expect(state.contactValue).toBe('010-1234-5678');
  });

  test('이전 단계로 돌아가도 이미 입력한 내용은 지워지지 않는다', () => {
    const initial = createInitialSaleRequestDraft();
    const firstItemId = initial.items[0].id;

    // 1단계 — 판매 조건
    let state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.SET_CONVENIENCE_STORE,
      payload: 'cu',
    });
    state = saleRequestReducer(state, {
      type: SALE_REQUEST_ACTION.SET_PROMOTION_TYPE,
      payload: 'one_plus_one',
    });

    // 2단계 — 상품 및 보관 증빙
    state = saleRequestReducer(state, {
      type: SALE_REQUEST_ACTION.UPDATE_ITEM,
      payload: { id: firstItemId, changes: { productName: '딸기우유', originalPrice: 1500, askingPrice: 800 } },
    });

    // 2단계 — 증빙
    state = saleRequestReducer(state, {
      type: SALE_REQUEST_ACTION.SET_EVIDENCE_IMAGE,
      payload: 'evidence/sale/pic.png',
    });

    // 3단계 — 연락처
    state = saleRequestReducer(state, {
      type: SALE_REQUEST_ACTION.SET_CONTACT_TYPE,
      payload: 'kakao',
    });
    state = saleRequestReducer(state, {
      type: SALE_REQUEST_ACTION.SET_CONTACT_VALUE,
      payload: 'seller-id',
    });

    // 1단계로 돌아온 뒤에도 2~3단계 값이 유지되어야 한다
    expect(state.convenienceStore).toBe('cu');
    expect(state.promotionType).toBe('one_plus_one');
    expect(state.items[0].productName).toBe('딸기우유');
    expect(state.items[0].originalPrice).toBe(1500);
    expect(state.items[0].askingPrice).toBe(800);
    expect(state.evidenceImage).toBe('evidence/sale/pic.png');
    expect(state.contactType).toBe('kakao');
    expect(state.contactValue).toBe('seller-id');
  });

  test('값을 바꿔도 이전 신청서 원본은 그대로 둔다', () => {
    const initial = createInitialSaleRequestDraft();

    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.SET_CONVENIENCE_STORE,
      payload: 'gs25',
    });

    expect(state).not.toBe(initial);
    expect(initial.convenienceStore).toBe('');
    expect(initial.promotionType).toBe('');
  });

  test('상품을 바꾸면 기존 상품 목록을 직접 고치지 않는다', () => {
    const initial = createInitialSaleRequestDraft();

    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.UPDATE_ITEM,
      payload: { id: initial.items[0].id, changes: { productName: '물' } },
    });

    expect(state.items).not.toBe(initial.items);
    expect(initial.items[0].productName).toBe('');
    expect(state.items[0].productName).toBe('물');
  });

  test('모르는 동작이 와도 신청서를 바꾸지 않는다', () => {
    const initial = createInitialSaleRequestDraft();
    const state = saleRequestReducer(initial, { type: 'UNKNOWN', payload: 'x' });

    expect(state).toBe(initial);
  });
});
