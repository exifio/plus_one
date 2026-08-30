import { useState, type ReactNode } from 'react';
import type { PriceOption } from '../../types';
import {
  calculateUnitBasePrice,
  generatePriceOptions,
  getLowerPriceOffer,
} from '../../utils/price';
import type { ProductInfo } from './productInfoSchema';

type PriceSelectionValue = Pick<PriceOption, 'ratio' | 'price'>;
type PriceStep = 'select' | 'offer' | 'complete';

type PriceSelectionProps = {
  readonly productInfo: ProductInfo;
};

const formatWon = (price: number): string => `${price.toLocaleString('ko-KR')}원`;

function assertNever(value: never): never {
  throw new Error(`Unexpected price step: ${value}`);
}

export function PriceSelection({ productInfo }: PriceSelectionProps) {
  const unitBasePrice = calculateUnitBasePrice(
    productInfo.originalPaidPrice,
    productInfo.promotionType,
  );
  const priceOptions = generatePriceOptions(unitBasePrice);
  const [step, setStep] = useState<PriceStep>('select');
  const [selectedRatio, setSelectedRatio] = useState<number | null>(null);
  const [initialSelection, setInitialSelection] = useState<PriceSelectionValue | null>(null);
  const [offeredSelection, setOfferedSelection] = useState<PriceSelectionValue | null>(null);
  const [finalSelection, setFinalSelection] = useState<PriceSelectionValue | null>(null);
  const [offerAccepted, setOfferAccepted] = useState<boolean | null>(null);

  const selectedOption = priceOptions.find((option) => option.ratio === selectedRatio);

  const handleInitialPriceSubmit = () => {
    if (selectedOption === undefined) {
      return;
    }

    const initialPrice = {
      ratio: selectedOption.ratio,
      price: selectedOption.price,
    };
    const lowerPriceOffer = getLowerPriceOffer(unitBasePrice, initialPrice.ratio);

    setInitialSelection(initialPrice);
    setOfferedSelection(lowerPriceOffer);

    if (lowerPriceOffer === null) {
      setFinalSelection(initialPrice);
      setOfferAccepted(null);
      setStep('complete');
      return;
    }

    setStep('offer');
  };

  const handleOfferDecision = (accepted: boolean) => {
    if (initialSelection === null || offeredSelection === null) {
      return;
    }

    setOfferAccepted(accepted);
    setFinalSelection(accepted ? offeredSelection : initialSelection);
    setStep('complete');
  };

  let priceContent: ReactNode;
  switch (step) {
    case 'select':
      priceContent = (
        <section className="price-selection-card card" aria-labelledby="price-selection-title">
          <div className="base-price-panel">
            <span className="base-price-label">행사 기준 1개 가격</span>
            <strong className="base-price-value">{formatWon(unitBasePrice)}</strong>
            <span className="base-price-note">
              {productInfo.promotionType} 행사에서 실제 결제금액을 나눈 금액이에요.
            </span>
          </div>

          <div className="price-section-header">
            <span className="price-eyebrow">가격 선택</span>
            <h2 className="price-section-title" id="price-selection-title">
              얼마에 판매하시겠어요?
            </h2>
            <p className="price-section-desc">
              행사 기준 1개 가격을 확인한 뒤, 판매하고 싶은 가격을 선택해주세요.
            </p>
          </div>

          <div className="price-options-group">
            <span className="form-label" id="price-options-label">판매 희망가격</span>
            <div className="price-options" role="radiogroup" aria-labelledby="price-options-label">
              {priceOptions.map((option) => (
                <label
                  className={selectedRatio === option.ratio ? 'price-option is-selected' : 'price-option'}
                  key={option.ratio}
                >
                  <input
                    type="radio"
                    name="price-option"
                    value={option.ratio}
                    checked={selectedRatio === option.ratio}
                    onChange={() => setSelectedRatio(option.ratio)}
                  />
                  <span className="price-option-content">
                    <strong className="price-option-price">{formatWon(option.price)}</strong>
                    <span className="price-option-ratio">행사 기준가의 {option.ratio}%</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            disabled={selectedOption === undefined}
            onClick={handleInitialPriceSubmit}
          >
            이 가격으로 선택하기
          </button>
        </section>
      );
      break;
    case 'offer':
      if (initialSelection === null || offeredSelection === null) {
        priceContent = null;
        break;
      }

      priceContent = (
        <section className="price-offer-card card" aria-labelledby="price-offer-title">
          <div className="price-section-header">
            <span className="price-eyebrow">가격 확인</span>
            <h2 className="price-section-title" id="price-offer-title">
              판매 희망가를 한 번 더 확인해주세요.
            </h2>
            <p className="price-offer-question">
              <strong>{formatWon(offeredSelection.price)}</strong>으로도 판매할 의향이 있으신가요?
            </p>
          </div>

          <dl className="price-offer-summary">
            <div className="price-offer-row">
              <dt>처음 선택한 가격</dt>
              <dd>{formatWon(initialSelection.price)} · {initialSelection.ratio}%</dd>
            </div>
            <div className="price-offer-row is-offered">
              <dt>한 번 더 확인하는 가격</dt>
              <dd>{formatWon(offeredSelection.price)} · {offeredSelection.ratio}%</dd>
            </div>
          </dl>

          <div className="price-offer-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => handleOfferDecision(true)}
            >
              {formatWon(offeredSelection.price)}으로 변경
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => handleOfferDecision(false)}
            >
              {formatWon(initialSelection.price)} 유지
            </button>
          </div>
          <p className="price-note">가격 확인은 한 번만 진행되며, 선택한 가격을 다음 단계에 반영합니다.</p>
        </section>
      );
      break;
    case 'complete':
      if (initialSelection === null || finalSelection === null) {
        priceContent = null;
        break;
      }

      priceContent = (
        <section className="price-complete-card card" aria-live="polite">
          <div className="price-complete-heading">
            <span className="price-eyebrow">가격 선택 완료</span>
            <h2 className="price-section-title">판매 희망가격을 선택했어요.</h2>
          </div>

          <dl className="price-result-list">
            <div>
              <dt>처음 선택한 가격</dt>
              <dd>{formatWon(initialSelection.price)} · {initialSelection.ratio}%</dd>
            </div>
            <div className="is-final-price">
              <dt>최종 판매 희망가격</dt>
              <dd>{formatWon(finalSelection.price)} · {finalSelection.ratio}%</dd>
            </div>
          </dl>

          <p className="price-complete-note">
            {offerAccepted === true && '한 번 더 확인한 가격을 최종 희망가격으로 선택했습니다.'}
            {offerAccepted === false && '처음 선택한 가격을 최종 희망가격으로 유지했습니다.'}
            {offerAccepted === null && '선택한 가격을 최종 희망가격으로 반영합니다.'}
          </p>
          {finalSelection.price === 0 && (
            <p className="price-complete-note">최종 가격 0원은 무상 양도/처분 의향으로 기록됩니다.</p>
          )}
          <p className="price-complete-next">다음 단계에서 연락 수단을 입력합니다.</p>
        </section>
      );
      break;
    default:
      priceContent = assertNever(step);
  }

  return <div className="price-selection-section">{priceContent}</div>;
}
