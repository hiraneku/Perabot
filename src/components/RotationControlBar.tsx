import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { RotationSnapStep } from '../types/studio';

interface RotationControlBarProps {
  rotationSnapDeg: RotationSnapStep;
  onChangeRotationSnap: (step: RotationSnapStep) => void;
  onRotateStep: (axis: 'x' | 'y' | 'z', deltaDeg: number) => void;
  onResetRotation: () => void;
}

const SNAP_STEPS: Array<{ value: RotationSnapStep; label: string }> = [
  { value: 0, label: 'Bebas' },
  { value: 5, label: '5°' },
  { value: 15, label: '15°' },
  { value: 45, label: '45°' },
  { value: 90, label: '90°' },
];

export const RotationControlBar: React.FC<RotationControlBarProps> = ({
  rotationSnapDeg,
  onChangeRotationSnap,
  onRotateStep,
  onResetRotation,
}) => {
  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | 'z'>('y');

  return (
    <div className="rotate-control-bar" role="region" aria-label="Kontrol Putar Terkendali">
      <div className="rotate-bar-top">
        <div className="rotate-axis-pills" role="tablist" aria-label="Pilih Sumbu Putar">
          <button
            type="button"
            className={`rot-axis-btn axis-y ${activeAxis === 'y' ? 'active' : ''}`}
            onClick={() => setActiveAxis('y')}
            title="Putar Mendatar Kiri/Kanan (Sumbu Hijau Y)"
          >
            <i className="dot-y" />
            <span>Mendatar (Y)</span>
          </button>
          <button
            type="button"
            className={`rot-axis-btn axis-x ${activeAxis === 'x' ? 'active' : ''}`}
            onClick={() => setActiveAxis('x')}
            title="Miringkan Depan/Belakang (Sumbu Merah X)"
          >
            <i className="dot-x" />
            <span>Depan (X)</span>
          </button>
          <button
            type="button"
            className={`rot-axis-btn axis-z ${activeAxis === 'z' ? 'active' : ''}`}
            onClick={() => setActiveAxis('z')}
            title="Miringkan Kiri/Kanan (Sumbu Biru Z)"
          >
            <i className="dot-z" />
            <span>Samping (Z)</span>
          </button>
        </div>

        <div className="rotate-snap-pills" title="Kunci langkah derajat saat memutar cincin 3D">
          <span className="rot-snap-caption">Kunci:</span>
          {SNAP_STEPS.map((st) => (
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
          title="Kembalikan posisi objek tegak lurus (0°, 0°, 0°)"
        >
          <RotateCcw size={13} />
          <span>Tegakkan 0°</span>
        </button>
      </div>
    </div>
  );
};
