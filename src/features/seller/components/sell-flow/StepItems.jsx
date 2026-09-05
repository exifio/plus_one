import { useState } from 'react';
import { SALE_REQUEST_ACTION } from '../../../sale-request/state/saleRequestReducer';
import { validateStoredItem } from '../../../sale-request/domain/validateStoredItem';
import { parsePriceInput } from '../../utils/format';
import FormField from '../FormField';
import SelectionCard from '../SelectionCard';
import StepEvidence from './StepEvidence';

const REGISTRATION_METHODS = [
  { value: 'screenshot', label: '스크린샷으로 등록' },
  { value: 'manual', label: '직접 입력하기' },
];

export default function StepItems({ draft, dispatch, today }) {
  const [touched, setTouched] = useState({});

  const markTouched = (key) =>
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  const updateItem = (id, changes) =>
    dispatch({ type: SALE_REQUEST_ACTION.UPDATE_ITEM, payload: { id, changes } });

  return (
    <section className="step">
      <h1 className="step-title">판매할 상품을 등록해주세요</h1>
      <p className="step-desc">등록 방식을 선택한 후 필요한 정보를 입력해주세요.</p>

      <fieldset className="field-group registration-method-group">
        <legend className="field-label">등록 방식 선택</legend>
        <div className="selection-row">
          {REGISTRATION_METHODS.map((method) => (
            <SelectionCard
              key={method.value}
              label={method.label}
              selected={draft.registrationMethod === method.value}
              onSelect={() => dispatch({
                type: SALE_REQUEST_ACTION.SET_REGISTRATION_METHOD,
                payload: method.value,
              })}
            />
          ))}
        </div>
      </fieldset>

      {draft.registrationMethod === 'screenshot' && (
        <div className="registration-method-panel">
          <h2 className="registration-method-title">스크린샷으로 등록</h2>
          <p className="registration-method-desc">
            보관함에서 상품 정보가 보이는 화면을 첨부해주세요.
          </p>
          <StepEvidence draft={draft} dispatch={dispatch} embedded />
        </div>
      )}

      {draft.registrationMethod === 'manual' && draft.items.map((item, index) => {
        const validation = validateStoredItem(item, today);
        const isNameTouched = touched[`${item.id}-name`] || Boolean(item.productName);
        const isOrigTouched = touched[`${item.id}-orig`] || item.originalPrice !== null;
        const isAskTouched = touched[`${item.id}-ask`] || item.askingPrice !== null;
        const isExpTouched = touched[`${item.id}-exp`] || Boolean(item.expirationDate);

        const nameError = isNameTouched ? validation.errors?.productName : null;
        const origError = isOrigTouched ? validation.errors?.originalPrice : null;
        const askError = isAskTouched ? validation.errors?.askingPrice : null;
        const expError = isExpTouched ? validation.errors?.expirationDate : null;

        return (
          <article key={item.id} className="item-card">
            {draft.items.length > 1 && (
              <div className="item-card-head">
                <button
                  type="button"
                  className="item-remove"
                  onClick={() => dispatch({ type: SALE_REQUEST_ACTION.REMOVE_ITEM, payload: item.id })}
                >
                  삭제
                </button>
              </div>
            )}

            <FormField
              label="상품명"
              htmlFor={`product-name-${item.id}`}
              required
              error={nameError}
            >
              <input
                id={`product-name-${item.id}`}
                className={`text-input${nameError ? ' invalid' : ''}`}
                placeholder="코카콜라 제로 500ml"
                value={item.productName}
                onBlur={() => markTouched(`${item.id}-name`)}
                onChange={(event) => updateItem(item.id, { productName: event.target.value })}
              />
            </FormField>

            <FormField
              label="유효기간 (선택)"
              htmlFor={`expiration-${item.id}`}
              error={expError}
            >
              <input
                id={`expiration-${item.id}`}
                className={`text-input${expError ? ' invalid' : ''}`}
                type="date"
                min={today}
                value={item.expirationDate}
                onBlur={() => markTouched(`${item.id}-exp`)}
                onChange={(event) =>
                  updateItem(item.id, { expirationDate: event.target.value })
                }
              />
            </FormField>

            <FormField
              label="행사 당시 가격"
              htmlFor={`original-price-${item.id}`}
              required
              error={origError}
            >
              <div
                className={`input-with-unit${origError ? ' invalid' : ''}`}
              >
                <input
                  id={`original-price-${item.id}`}
                  className="text-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="2,200"
                  value={item.originalPrice ?? ''}
                  onBlur={() => markTouched(`${item.id}-orig`)}
                  onChange={(event) =>
                    updateItem(item.id, { originalPrice: parsePriceInput(event.target.value) })
                  }
                />
                <span className="input-unit">원</span>
              </div>
            </FormField>

            <FormField
              label="판매 희망 가격"
              htmlFor={`asking-price-${item.id}`}
              hint="실제로 판매하고 싶은 가격을 입력해주세요."
              required
              error={askError}
            >
              <div
                className={`input-with-unit${askError ? ' invalid' : ''}`}
              >
                <input
                  id={`asking-price-${item.id}`}
                  className="text-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="1,000"
                  value={item.askingPrice ?? ''}
                  onBlur={() => markTouched(`${item.id}-ask`)}
                  onChange={(event) =>
                    updateItem(item.id, { askingPrice: parsePriceInput(event.target.value) })
                  }
                />
                <span className="input-unit">원</span>
              </div>
            </FormField>
          </article>
        );
      })}

    </section>
  );
}
