export const SALE_REQUEST_ACTION = {
  SET_CONVENIENCE_STORE: 'SET_CONVENIENCE_STORE',
  SET_PROMOTION_TYPE: 'SET_PROMOTION_TYPE',
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  SET_EVIDENCE_IMAGE: 'SET_EVIDENCE_IMAGE',
  SET_CONTACT_TYPE: 'SET_CONTACT_TYPE',
  SET_CONTACT_VALUE: 'SET_CONTACT_VALUE',
};

export function createEmptyStoredItem(id) {
  return {
    id,
    productName: '',
    expirationDate: '',
    originalPrice: null,
    askingPrice: null,
  };
}

export function createInitialSaleRequestDraft() {
  return {
    convenienceStore: '',
    promotionType: '',
    items: [createEmptyStoredItem('item-1')],
    evidenceImage: null,
    contactType: '',
    contactValue: '',
  };
}

export function saleRequestReducer(state, action) {
  switch (action.type) {
    case SALE_REQUEST_ACTION.SET_CONVENIENCE_STORE:
      return { ...state, convenienceStore: action.payload };

    case SALE_REQUEST_ACTION.SET_PROMOTION_TYPE:
      return { ...state, promotionType: action.payload };

    case SALE_REQUEST_ACTION.ADD_ITEM:
      return { ...state, items: [...state.items, action.payload] };

    case SALE_REQUEST_ACTION.REMOVE_ITEM:
      if (state.items.length <= 1) return state;
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };

    case SALE_REQUEST_ACTION.UPDATE_ITEM:
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.changes }
            : item,
        ),
      };

    case SALE_REQUEST_ACTION.SET_EVIDENCE_IMAGE:
      return { ...state, evidenceImage: action.payload };

    case SALE_REQUEST_ACTION.SET_CONTACT_TYPE:
      return { ...state, contactType: action.payload };

    case SALE_REQUEST_ACTION.SET_CONTACT_VALUE:
      return { ...state, contactValue: action.payload };

    default:
      return state;
  }
}
