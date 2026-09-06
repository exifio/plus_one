import { useState } from 'react';
import SelectionCard from '../SelectionCard';
import FormField from '../FormField';
import { SALE_REQUEST_ACTION } from '../../../sale-request/state/saleRequestReducer';
import { CONTACT_OPTIONS } from '../../utils/options';
import { formatPhoneNumber, isValidPhoneNumber } from '../../utils/format';

export default function StepContact({ draft, dispatch }) {
  const [touched, setTouched] = useState(false);
  const isPhone = draft.contactType === 'phone';
  const phoneError =
    isPhone && touched && draft.contactValue && !isValidPhoneNumber(draft.contactValue)
      ? '010 또는 011로 시작하는 11자리 번호를 입력해주세요.'
      : null;

  const setContactType = (value) => {
    setTouched(false);
    dispatch({ type: SALE_REQUEST_ACTION.SET_CONTACT_TYPE, payload: value });
  };

  return (
    <section className="step">
      <h1 className="step-title">어떻게 연락드리면 될까요?</h1>
      <p className="step-desc">
        상품 확인 후 입력하신 연락처로 연락드려요.
      </p>

      <fieldset className="field-group">
        <legend className="field-label">연락 방식</legend>
        <div className="selection-row">
          {CONTACT_OPTIONS.map((option) => (
            <SelectionCard
              key={option.value}
              label={option.label}
              selected={draft.contactType === option.value}
              onSelect={() => setContactType(option.value)}
            />
          ))}
        </div>
      </fieldset>

      {draft.contactType && (
        <FormField
          label={isPhone ? '휴대폰 번호' : '카카오톡 연락처'}
          htmlFor="contact-value"
          error={phoneError}
        >
          <input
            id="contact-value"
            className={`text-input${phoneError ? ' invalid' : ''}`}
            type={isPhone ? 'tel' : 'text'}
            inputMode={isPhone ? 'tel' : undefined}
            placeholder={isPhone ? '010-1234-5678' : '연락 가능한 정보를 입력해주세요'}
            value={draft.contactValue}
            maxLength={isPhone ? 13 : undefined}
            onBlur={() => setTouched(true)}
            onChange={(event) =>
              dispatch({
                type: SALE_REQUEST_ACTION.SET_CONTACT_VALUE,
                payload: isPhone ? formatPhoneNumber(event.target.value) : event.target.value,
              })
            }
          />
        </FormField>
      )}

      <p className="step-notice">판매 신청 확인 및 연락을 위해 사용됩니다.</p>
    </section>
  );
}
