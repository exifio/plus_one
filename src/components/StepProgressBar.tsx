import React from 'react';

type StepProgressBarProps = {
  currentStep: number;
  totalSteps?: number;
  stepTitle: string;
  tags?: Array<string | undefined | null>;
};

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  currentStep,
  totalSteps = 5,
  stepTitle,
  tags,
}) => {
  const percent = Math.min(100, Math.max(0, Math.round((currentStep / totalSteps) * 100)));
  const validTags = tags?.filter((t): t is string => Boolean(t)) ?? [];

  return (
    <div
      className="step-progress-wrapper"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`${currentStep} / ${totalSteps}단계 ${stepTitle}`}
    >
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="step-progress-info">
        <div className="step-progress-text">
          <strong className="step-progress-num">{currentStep} / {totalSteps}단계</strong>
          <span className="step-progress-title">{stepTitle}</span>
        </div>
        {validTags.length > 0 && (
          <div className="selected-tags">
            {validTags.map((tag) => (
              <span key={tag} className="selected-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
