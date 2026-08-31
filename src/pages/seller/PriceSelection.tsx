import { useEffect, useState, type ReactNode } from "react";
import type { PriceOption } from "../../types";
import { StepProgressBar } from "../../components/StepProgressBar";
import {
  calculateUnitBasePrice,
  generatePriceOptions,
  getLowerPriceOffer,
} from "../../utils/price";
import type { ProductInfo } from "./productInfoSchema";

export type PriceResult = {
  unitBasePrice: number;
  initialRatio: number;
  initialPrice: number;
  hadPriceOffer: boolean;
  offeredRatio?: number;
  offeredPrice?: number;
  offerAccepted?: boolean;
  finalRatio: number;
  finalPrice: number;
};

type PriceSelectionValue = Pick<PriceOption, "ratio" | "price">;
type PriceStep = "select" | "offer" | "complete";

type PriceSelectionProps = {
  readonly productInfo: ProductInfo;
  readonly initialPriceResult?: PriceResult | null;
  readonly onPriceSelect?: (result: PriceResult) => void;
  readonly onBack?: () => void;
};

const formatWon = (price: number): string => `${price.toLocaleString("ko-KR")}원`;

function assertNever(value: never): never {
  throw new Error(`Unexpected price step: ${value}`);
}

export function PriceSelection({
  productInfo,
  initialPriceResult,
  onPriceSelect,
  onBack,
}: PriceSelectionProps) {
  const unitBasePrice = calculateUnitBasePrice(
    productInfo.originalPaidPrice,
    productInfo.promotionType,
  );
  const priceOptions = generatePriceOptions(unitBasePrice);

  const [step, setStep] = useState<PriceStep>(
    initialPriceResult ? "complete" : "select",
  );
  const [selectedRatio, setSelectedRatio] = useState<number | null>(
    initialPriceResult ? initialPriceResult.initialRatio : null,
  );
  const [initialSelection, setInitialSelection] = useState<PriceSelectionValue | null>(
    initialPriceResult
      ? {
          ratio: initialPriceResult.initialRatio,
          price: initialPriceResult.initialPrice,
        }
      : null,
  );
  const [offeredSelection, setOfferedSelection] = useState<PriceSelectionValue | null>(
    initialPriceResult &&
      initialPriceResult.hadPriceOffer &&
      initialPriceResult.offeredRatio !== undefined &&
      initialPriceResult.offeredPrice !== undefined
      ? {
          ratio: initialPriceResult.offeredRatio,
          price: initialPriceResult.offeredPrice,
        }
      : null,
  );
  const [finalSelection, setFinalSelection] = useState<PriceSelectionValue | null>(
    initialPriceResult
      ? {
          ratio: initialPriceResult.finalRatio,
          price: initialPriceResult.finalPrice,
        }
      : null,
  );
  const [offerAccepted, setOfferAccepted] = useState<boolean | null>(
    initialPriceResult?.offerAccepted ?? null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (!isSheetOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSheetOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSheetOpen]);

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
      setStep("complete");
      return;
    }

    setStep("offer");
  };

  const handleOfferDecision = (accepted: boolean) => {
    if (initialSelection === null || offeredSelection === null) {
      return;
    }

    setOfferAccepted(accepted);
    setFinalSelection(accepted ? offeredSelection : initialSelection);
    setStep("complete");
  };

  const handleProceedToContact = () => {
    if (initialSelection === null || finalSelection === null || onPriceSelect === undefined) {
      return;
    }

    const result: PriceResult = {
      unitBasePrice,
      initialRatio: initialSelection.ratio,
      initialPrice: initialSelection.price,
      hadPriceOffer: offeredSelection !== null,
      offeredRatio: offeredSelection?.ratio,
      offeredPrice: offeredSelection?.price,
      offerAccepted: offerAccepted ?? undefined,
      finalRatio: finalSelection.ratio,
      finalPrice: finalSelection.price,
    };

    onPriceSelect(result);
  };

  let priceContent: ReactNode;
  switch (step) {
    case "select":
      priceContent = (
        <section className="price-selection-card card" aria-labelledby="price-selection-title">
          <StepProgressBar
            currentStep={3}
            stepTitle="판매 희망가격 선택"
            tags={[productInfo.store, productInfo.promotionType]}
          />

          <div className="base-price-slim">
            <div className="base-price-slim-info">
              <span className="base-price-slim-label">행사 기준 1개 가격</span>
              <span className="base-price-slim-note">
                ({productInfo.originalPaidPrice.toLocaleString('ko-KR')}원 ÷ {productInfo.promotionType === '1+1' ? 2 : 3}개)
              </span>
            </div>
            <strong className="base-price-slim-value">{formatWon(unitBasePrice)}</strong>
          </div>

          <div className="price-section-header">
            <h2 className="price-section-title" id="price-selection-title">
              얼마에 판매하시겠어요?
            </h2>
            <p className="price-section-desc">
              행사 기준 1개 가격 대비 판매하고 싶은 가격을 선택해주세요.
            </p>
          </div>

          <div className="price-select-group">
            <label className="form-label" id="price-sheet-trigger-label">
              판매 희망가격
            </label>
            <button
              type="button"
              className="price-select-button"
              onClick={() => setIsSheetOpen(true)}
              aria-labelledby="price-sheet-trigger-label"
              aria-haspopup="dialog"
            >
              {selectedOption ? (
                <div className="price-select-value">
                  <span className="price-select-main">{formatWon(selectedOption.price)}</span>
                  <span className="price-select-sub">
                    {selectedOption.price === 0 ? "무상 양도 (0%)" : "기준가의 " + selectedOption.ratio + "%"}
                  </span>
                </div>
              ) : (
                <span className="price-select-placeholder">희망 판매가격을 선택해주세요</span>
              )}
              <span className="price-select-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
          </div>

          <div className="price-step-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              disabled={selectedOption === undefined}
              onClick={handleInitialPriceSubmit}
            >
              이 가격으로 선택하기
            </button>
            {onBack && (
              <button
                type="button"
                className="btn btn-secondary btn-lg btn-block"
                onClick={onBack}
              >
                상품 정보 수정하기
              </button>
            )}
          </div>

          {isSheetOpen && (
            <div className="bottom-sheet-overlay" onClick={() => setIsSheetOpen(false)}>
              <div
                className="bottom-sheet-container"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="sheet-title"
              >
                <div className="bottom-sheet-handle" aria-hidden="true" />
                <div className="bottom-sheet-header">
                  <div className="bottom-sheet-title-box">
                    <h3 className="bottom-sheet-title" id="sheet-title">판매 희망가격 선택</h3>
                    <span className="bottom-sheet-subtitle">
                      행사 기준가 {formatWon(unitBasePrice)} 대비 비율을 선택해주세요
                    </span>
                  </div>
                  <button
                    type="button"
                    className="bottom-sheet-close"
                    onClick={() => setIsSheetOpen(false)}
                    aria-label="닫기"
                  >
                    ✕
                  </button>
                </div>

                <div className="bottom-sheet-body">
                  <div className="sheet-price-list" role="radiogroup" aria-labelledby="sheet-title">
                    {priceOptions.map((option) => {
                      const isSelected = selectedRatio === option.ratio;
                      return (
                        <button
                          key={option.ratio}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={"sheet-price-item" + (isSelected ? " is-selected" : "")}
                          onClick={() => {
                            setSelectedRatio(option.ratio);
                            setIsSheetOpen(false);
                          }}
                        >
                          <div className="sheet-price-info">
                            <strong className="sheet-price-val">{formatWon(option.price)}</strong>
                            <span className="sheet-price-ratio">
                              {option.price === 0 ? "무상 양도 / 처분 (0%)" : "행사 기준가의 " + option.ratio + "%"}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="sheet-check-icon" aria-hidden="true">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      );
      break;
    case "offer":
      if (initialSelection === null || offeredSelection === null) {
        priceContent = null;
        break;
      }

      priceContent = (
        <section className="price-offer-card card" aria-labelledby="price-offer-title">
          <StepProgressBar
            currentStep={3}
            stepTitle="판매가격 확인"
            tags={[productInfo.store, productInfo.promotionType]}
          />

          <div className="price-section-header">
            <h2 className="price-section-title" id="price-offer-title">
              판매가를 다시<br />
              한번 생각해보세요
            </h2>
            <p className="price-offer-question">
              <strong>{formatWon(offeredSelection.price)}</strong>으로 판매 의향이 있으신가요?
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
              className="btn btn-secondary btn-lg"
              onClick={() => handleOfferDecision(true)}
            >
              {formatWon(offeredSelection.price)} 변경
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => handleOfferDecision(false)}
            >
              {formatWon(initialSelection.price)} 유지
            </button>
          </div>
        </section>
      );
      break;
    case "complete":
      if (initialSelection === null || finalSelection === null) {
        priceContent = null;
        break;
      }

      priceContent = (
        <section className="price-complete-card card" aria-live="polite">
          <StepProgressBar
            currentStep={3}
            stepTitle="판매가격 선택 완료"
            tags={[productInfo.store, productInfo.promotionType]}
          />

          <div className="price-complete-heading">
            <span className="price-eyebrow">가격 선택 완료</span>
            <h2 className="price-section-title">판매 희망가격을 선택했어요.</h2>
          </div>

          <dl className="price-result-list">
            <div className="is-final-price">
              <dt>확정 가격</dt>
              <dd>{formatWon(finalSelection.price)}</dd>
            </div>
          </dl>

          {finalSelection.price === 0 && (
            <p className="price-complete-note">최종 가격 0원은 무상 양도/처분 의향으로 기록됩니다.</p>
          )}

          <div className="price-step-actions">
            {onPriceSelect ? (
              <button
                type="button"
                className="btn btn-primary btn-lg btn-block"
                onClick={handleProceedToContact}
              >
                연락 수단 입력하기
              </button>
            ) : (
              <p className="price-complete-next">다음 단계에서 연락 수단을 입력합니다.</p>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-lg btn-block"
              onClick={() => setStep("select")}
            >
              가격 다시 선택하기
            </button>
          </div>
        </section>
      );
      break;
    default:
      priceContent = assertNever(step);
  }

  return <div className="price-selection-section">{priceContent}</div>;
}
