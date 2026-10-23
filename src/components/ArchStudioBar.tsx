import React, { useState } from 'react';
import {
  BrickWall,
  Check,
  DoorOpen,
  Home,
  Layers2,
  MousePointer,
  PaintBucket,
  Ruler,
  Sun,
  X,
} from 'lucide-react';
import { StudioStrings } from '../i18n/translations';
import { ArchBuildPhase, ArchSubTool } from '../types/studio';

interface ArchStudioBarProps {
  t: StudioStrings;
  activePhase: ArchBuildPhase | null;
  onSelectPhase: (phase: ArchBuildPhase | null) => void;
  isBlueprint2D: boolean;
  onToggleBlueprint2D: (next: boolean) => void;
  archTool: ArchSubTool;
  onResetToSelectTool: () => void;
  detectedRoomCount: number;
  onCommitExactWallLength?: (meters: number) => void;
}

export const ArchStudioBar: React.FC<ArchStudioBarProps> = ({
  t,
  activePhase,
  onSelectPhase,
  isBlueprint2D,
  onToggleBlueprint2D,
  archTool,
  onResetToSelectTool,
  detectedRoomCount,
  onCommitExactWallLength,
}) => {
  const [exactLenDraft, setExactLenDraft] = useState('3.0');

  const phases: Array<{
    id: ArchBuildPhase;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'walls',
      label: t.archPhaseWalls,
      icon: <BrickWall size={15} />,
    },
    {
      id: 'openings',
      label: t.archPhaseOpenings,
      icon: <DoorOpen size={15} />,
    },
    {
      id: 'roofs',
      label: t.archPhaseRoofs,
      icon: <Home size={15} />,
    },
    {
      id: 'finishing',
      label: t.archPhaseFinishing,
      icon: <PaintBucket size={15} />,
      badge: detectedRoomCount > 0 ? detectedRoomCount : undefined,
    },
    {
      id: 'environment',
      label: t.archPhaseEnv,
      icon: <Sun size={15} />,
    },
  ];

  const activeHint =
    archTool === 'draw-wall'
      ? t.archDrawWallHint
      : archTool === 'place-opening'
      ? t.archPlaceOpeningHint
      : archTool === 'measure'
      ? t.archMeasureHint
      : null;

  const submitExactWall = () => {
    const val = parseFloat(exactLenDraft);
    if (Number.isFinite(val) && val >= 0.25 && onCommitExactWallLength) {
      onCommitExactWallLength(val);
    }
  };

  return (
    <div className="arch-studio-hud" onPointerDown={(e) => e.stopPropagation()}>
      <div className="arch-phase-strip">
        {/* 2D Blueprint <-> 3D Studio Switcher */}
        <button
          type="button"
          className={`arch-view-switch-btn ${isBlueprint2D ? 'is-2d' : ''}`}
          onClick={() => onToggleBlueprint2D(!isBlueprint2D)}
          title={isBlueprint2D ? t.archView3DBtn : t.archView2DBtn}
        >
          <Layers2 size={14} />
          <span>{isBlueprint2D ? t.archView2DBtn : t.archView3DBtn}</span>
        </button>

        <span className="arch-strip-divider" />

        {/* Quick Blender Select Return Button when an interactive Arch tool is active */}
        {archTool !== 'select' && (
          <button
            type="button"
            className="arch-phase-btn is-tool-return"
            onClick={onResetToSelectTool}
            title={t.archToolSelect}
          >
            <MousePointer size={14} />
            <span>{t.archToolSelect}</span>
          </button>
        )}

        {/* 5 Architect Life × Blender Workflow Phases */}
        {phases.map((ph) => {
          const isOpen = activePhase === ph.id;
          return (
            <button
              key={ph.id}
              type="button"
              className={`arch-phase-btn ${isOpen ? 'active' : ''}`}
              onClick={() => onSelectPhase(isOpen ? null : ph.id)}
            >
              {ph.icon}
              <span>{ph.label}</span>
              {ph.badge !== undefined && (
                <span className="arch-phase-badge">{ph.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeHint && (
        <div className="arch-tool-hint-pill">
          {archTool === 'measure' ? <Ruler size={13} /> : <BrickWall size={13} />}
          <span>{activeHint}</span>

          {archTool === 'draw-wall' && onCommitExactWallLength && (
            <div className="arch-exact-len-inline">
              <input
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0.25"
                max="40"
                value={exactLenDraft}
                onChange={(e) => setExactLenDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitExactWall();
                  }
                }}
                aria-label={t.archExactLengthPlaceholder}
              />
              <span className="arch-exact-unit">m</span>
              <button
                type="button"
                className="arch-exact-commit-btn"
                onClick={submitExactWall}
              >
                <Check size={12} />
                <span>{t.archApplyLengthBtn}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="frameless-close-btn"
            onClick={onResetToSelectTool}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
