import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { AppLanguage, RotationSnapStep } from '../types/studio';

interface RotationControlBarProps {
  language: AppLanguage;
  rotationSnapDeg: RotationSnapStep;
  onChangeRotationSnap: (step: RotationSnapStep) => void;
  onRotateStep: (axis: 'x' | 'y' | 'z', deltaDeg: number) => void;
  onResetRotation: () => void;
}

export const RotationControlBar: React.FC<RotationControlBarProps> = ({
  language,
  rotationSnapDeg,
  onChangeRotationSnap,
  onRotateStep,
  onResetRotation,
}) => {
  const t = TRANSLATIONS[language];
  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | 'z'>('y');

  const snapSteps: Array<{ value: RotationSnapStep; label: string }> = [
    { value: 0, label: t.rotSnapFree },
    { value: 5, label: '5°' },
    { value: 15, label: '15°' },
    { value: 45, label: '45°' },
    { value: 90, label: '90°' },
  ];

  return (
    <div className="rotate-control-bar" role="region" aria-label={t.rotate}>
      <div className="rotate-bar-top">
        <div className="rotate-axis-pills" role="tablist">
          <button
            type="button"
            className={`rot-axis-btn axis-y ${activeAxis === 'y' ? 'active' : ''}`}
            onClick={() => setActiveAxis('y')}
          >
            <i className="dot-y" />
            <span>{t.rotAxisHorizontal}</span>
          </button>
          <button
            type="button"
            className={`rot-axis-btn axis-x ${activeAxis === 'x' ? 'active' : ''}`}
            onClick={() => setActiveAxis('x')}
          >
            <i className="dot-x" />
            <span>{t.rotAxisFront}</span>
          </button>
          <button
            type="button"
            className={`rot-axis-btn axis-z ${activeAxis === 'z' ? 'active' : ''}`}
            onClick={() => setActiveAxis('z')}
          >
            <i className="dot-z" />
            <span>{t.rotAxisSide}</span>
          </button>
        </div>

        <div className="rotate-snap-pills">
          <span className="rot-snap-caption">{t.rotSnapLabel}</span>
          {snapSteps.map((st) => (
            <button
              key={st.value}
              type="button"
              className={`rot-snap-chip ${rotationSnapDeg === st.value ? 'active' : ''}`}
              onClick={() => onChangeRotationSnap(st.value)}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rotate-bar-actions">
        {[-90, -45, -15, 15, 45, 90].map((deg) => (
          <button
            key={deg}
            type="button"
            className="rot-step-btn"
            onClick={() => onRotateStep(activeAxis, deg)}
          >
            {deg > 0 ? `+${deg}°` : `${deg}°`}
          </button>
        ))}

        <button
          type="button"
          className="rot-reset-btn"
          onClick={onResetRotation}
        >
          <RotateCcw size={13} />
          <span>{t.rotResetZero}</span>
        </button>
      </div>
    </div>
  );
};
