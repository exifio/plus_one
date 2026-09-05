import SelectionCard from '../SelectionCard';
import { SALE_REQUEST_ACTION } from '../../../sale-request/state/saleRequestReducer';

const STORES = [
  { value: 'gs25', label: 'GS25' },
  { value: 'cu', label: 'CU' },
];

const PROMOTIONS = [
  { value: 'one_plus_one', label: '1+1' },
  { value: 'two_plus_one', label: '2+1' },
];

export default function StepStore({ draft, dispatch }) {
  return (
    <section className="step">
      <h1 className="step-title">어떤 상품을 판매하시나요?</h1>
      <p className="step-desc">편의점과 행사 종류를 먼저 선택해주세요.</p>

      <fieldset className="field-group">
        <legend className="field-label">보관 중인 편의점</legend>
        <div className="selection-row">
          {STORES.map((store) => (
            <SelectionCard
              key={store.value}
              label={store.label}
              selected={draft.convenienceStore === store.value}
              onSelect={() =>
                dispatch({ type: SALE_REQUEST_ACTION.SET_CONVENIENCE_STORE, payload: store.value })
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend className="field-label">행사 종류</legend>
        <div className="selection-row">
          {PROMOTIONS.map((promotion) => (
            <SelectionCard
              key={promotion.value}
              label={promotion.label}
              selected={draft.promotionType === promotion.value}
              onSelect={() =>
                dispatch({ type: SALE_REQUEST_ACTION.SET_PROMOTION_TYPE, payload: promotion.value })
              }
            />
          ))}
        </div>
      </fieldset>
    </section>
  );
}
