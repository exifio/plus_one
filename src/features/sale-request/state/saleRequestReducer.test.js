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

describe('판매 신청 상태 reducer', () => {
  test('초기 초안은 빈 편의점/행사/연락처와 빈 보관상품 1개를 가진다', () => {
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

  test('편의점을 선택한다', () => {
    const state = saleRequestReducer(createInitialSaleRequestDraft(), {
      type: SALE_REQUEST_ACTION.SET_CONVENIENCE_STORE,
      payload: 'gs25',
    });

    expect(state.convenienceStore).toBe('gs25');
    expect(state.items).toHaveLength(1);
  });

  test('행사 유형을 선택한다', () => {
    const state = saleRequestReducer(createInitialSaleRequestDraft(), {
      type: SALE_REQUEST_ACTION.SET_PROMOTION_TYPE,
      payload: 'two_plus_one',
    });

    expect(state.promotionType).toBe('two_plus_one');
  });

  test('등록 방식을 선택한다', () => {
    const state = saleRequestReducer(createInitialSaleRequestDraft(), {
      type: SALE_REQUEST_ACTION.SET_REGISTRATION_METHOD,
      payload: 'screenshot',
    });

    expect(state.registrationMethod).toBe('screenshot');
  });

  test('보관상품을 추가한다', () => {
    const initial = createInitialSaleRequestDraft();
    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.ADD_ITEM,
      payload: createEmptyStoredItem('item-2'),
    });

    expect(state.items).toHaveLength(2);
    expect(state.items[0].id).toBe(initial.items[0].id);
    expect(state.items[1].id).toBe('item-2');
  });

  test('보관상품 필드를 수정한다', () => {
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

  test('한 번에 여러 필드를 수정할 수 있다', () => {
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

  test('없는 id를 수정하면 상품 목록은 그대로다', () => {
    const initial = createInitialSaleRequestDraft();
    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.UPDATE_ITEM,
      payload: { id: 'missing', changes: { productName: 'x' } },
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].productName).toBe('');
  });

  test('보관상품을 삭제한다', () => {
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

  test('마지막 하나 남은 보관상품은 삭제되지 않는다', () => {
    const initial = createInitialSaleRequestDraft();
    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.REMOVE_ITEM,
      payload: initial.items[0].id,
    });

    expect(state.items).toHaveLength(1);
  });

  test('증빙 이미지를 설정한다', () => {
    const state = saleRequestReducer(createInitialSaleRequestDraft(), {
      type: SALE_REQUEST_ACTION.SET_EVIDENCE_IMAGE,
      payload: 'evidence/sale/screen.png',
    });

    expect(state.evidenceImage).toBe('evidence/sale/screen.png');
  });

  test('연락 방식과 연락처를 설정한다', () => {
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

  test('단계를 오가도 이전 단계에서 입력한 값이 유지된다', () => {
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

  test('dispatch는 기존 상태를 변경하지 않는다', () => {
    const initial = createInitialSaleRequestDraft();

    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.SET_CONVENIENCE_STORE,
      payload: 'gs25',
    });

    expect(state).not.toBe(initial);
    expect(initial.convenienceStore).toBe('');
    expect(initial.promotionType).toBe('');
  });

  test('상품 변경 액션은 새 items 배열을 만든다', () => {
    const initial = createInitialSaleRequestDraft();

    const state = saleRequestReducer(initial, {
      type: SALE_REQUEST_ACTION.UPDATE_ITEM,
      payload: { id: initial.items[0].id, changes: { productName: '물' } },
    });

    expect(state.items).not.toBe(initial.items);
    expect(initial.items[0].productName).toBe('');
    expect(state.items[0].productName).toBe('물');
  });

  test('알 수 없는 액션은 상태를 그대로 반환한다', () => {
    const initial = createInitialSaleRequestDraft();
    const state = saleRequestReducer(initial, { type: 'UNKNOWN', payload: 'x' });

    expect(state).toBe(initial);
  });
});
