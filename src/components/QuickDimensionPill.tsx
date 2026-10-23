import React, { useEffect, useState } from 'react';
import { Check, Pencil, RotateCcw, Ruler, X } from 'lucide-react';
import { StudioStrings } from '../i18n/translations';

interface QuickDimensionPillProps {
  t: StudioStrings;
  universalMeasureActive: boolean;
  measuredSpan: { total: number; dx: number; dy: number; dz: number } | null;
  onClearMeasure: () => void;
  onExitMeasure: () => void;
  selectedDimensions: [number, number, number] | null;
  isObjectLocked?: boolean;
  onApplyExactDimensions: (dims: [number, number, number]) => void;
}

export const QuickDimensionPill: React.FC<QuickDimensionPillProps> = ({
  t,
  universalMeasureActive,
  measuredSpan,
  onClearMeasure,
  onExitMeasure,
  selectedDimensions,
  isObjectLocked = false,
  onApplyExactDimensions,
}) => {
  const [editing, setEditing] = useState(false);
  const [draftX, setDraftX] = useState('1.00');
  const [draftY, setDraftY] = useState('1.00');
  const [draftZ, setDraftZ] = useState('1.00');

  useEffect(() => {
    if (selectedDimensions && !editing) {
      setDraftX(selectedDimensions[0].toFixed(2));
      setDraftY(selectedDimensions[1].toFixed(2));
      setDraftZ(selectedDimensions[2].toFixed(2));
    }
    if (!selectedDimensions) {
      setEditing(false);
    }
  }, [selectedDimensions, editing]);

  // 1. Universal 3D Laser Tape Measure HUD Pill
  if (universalMeasureActive) {
    return (
      <div className="quick-dim-pill measure-mode" role="status">
        <Ruler size={15} className="quick-dim-icon amber" />
        {measuredSpan ? (
          <div className="quick-measure-readout">
            <strong>{measuredSpan.total.toFixed(3)} m</strong>
            <span>
              ΔX {measuredSpan.dx.toFixed(2)} · ΔY {measuredSpan.dy.toFixed(2)}{' '}
              · ΔZ {measuredSpan.dz.toFixed(2)}
            </span>
          </div>
        ) : (
          <span className="quick-measure-hint">{t.measure3dHint}</span>
        )}
        {measuredSpan && (
          <button
            type="button"
            className="quick-dim-mini-btn"
            onClick={onClearMeasure}
            title="Reset"
          >
            <RotateCcw size={13} />
          </button>
        )}
        <button
          type="button"
          className="quick-dim-mini-btn"
          onClick={onExitMeasure}
          aria-label={t.done}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // 2. Selected Object Quick Meter Dimension Pill + 1-Tap Inline Editor
  if (!selectedDimensions || isObjectLocked) return null;

  const commitDraft = () => {
    const nx = Math.max(0.02, Math.min(80, parseFloat(draftX) || selectedDimensions[0]));
    const ny = Math.max(0.02, Math.min(80, parseFloat(draftY) || selectedDimensions[1]));
    const nz = Math.max(0.02, Math.min(80, parseFloat(draftZ) || selectedDimensions[2]));
    onApplyExactDimensions([nx, ny, nz]);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="quick-dim-pill clickable"
        onClick={() => {
          setDraftX(selectedDimensions[0].toFixed(2));
          setDraftY(selectedDimensions[1].toFixed(2));
          setDraftZ(selectedDimensions[2].toFixed(2));
          setEditing(true);
        }}
        title={t.quickDimEditTitle}
      >
        <Ruler size={14} className="quick-dim-icon" />
        <span>
          {selectedDimensions[0].toFixed(2)} × {selectedDimensions[1].toFixed(2)}{' '}
          × {selectedDimensions[2].toFixed(2)} m
        </span>
        <Pencil size={12} className="quick-dim-edit-cue" />
      </button>
    );
  }

  return (
    <div
      className="quick-dim-pill expanded"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="quick-dim-inputs-row">
        <label className="quick-dim-field">
          <span className="axis-x">X</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.05"
            min="0.02"
            value={draftX}
            onChange={(e) => setDraftX(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
          />
        </label>
        <label className="quick-dim-field">
          <span className="axis-y">Y</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.05"
            min="0.02"
            value={draftY}
            onChange={(e) => setDraftY(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
          />
        </label>
        <label className="quick-dim-field">
          <span className="axis-z">Z</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.05"
            min="0.02"
            value={draftZ}
            onChange={(e) => setDraftZ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
          />
        </label>
      </div>
      <button
        type="button"
        className="quick-dim-apply-btn"
        onClick={commitDraft}
      >
        <Check size={14} />
        <span>{t.quickDimApplyBtn}</span>
      </button>
      <button
        type="button"
        className="quick-dim-mini-btn"
        onClick={() => setEditing(false)}
      >
        <X size={14} />
      </button>
    </div>
  );
};
