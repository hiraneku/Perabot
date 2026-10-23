import React, { useState } from 'react';
import {
  BrickWall,
  Check,
  ClipboardList,
  Compass,
  Copy,
  DoorOpen,
  Eraser,
  Hand,
  Home,
  Layers2,
  Maximize,
  MousePointer,
  PaintBucket,
  RotateCw,
  SlidersHorizontal,
  Sun,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { StudioStrings } from '../i18n/translations';
import {
  ArchBuildPhase,
  ArchSelection,
  ArchSubTool,
  PendingArchCommit,
} from '../types/studio';

interface ArchStudioBarProps {
  t: StudioStrings;
  activePhase: ArchBuildPhase | null;
  onSelectPhase: (phase: ArchBuildPhase | null) => void;
  isBlueprint2D: boolean;
  onToggleBlueprint2D: (next: boolean) => void;
  onZoom2DIn?: () => void;
  onZoom2DOut?: () => void;
  onReset2DZoom?: () => void;
  archTool: ArchSubTool;
  onSetArchTool: (tool: ArchSubTool) => void;
  onResetToSelectTool: () => void;
  archNavPanMode?: boolean;
  onToggleArchNavPanMode?: (panOnly: boolean) => void;
  wallEditAngleLock?: boolean;
  onToggleWallEditAngleLock?: () => void;
  detectedRoomCount: number;
  onCommitExactWallLength?: (meters: number) => void;
  pendingArchCommit?: PendingArchCommit | null;
  onConfirmPendingCommit?: () => void;
  onCancelPendingCommit?: () => void;
  archSelection?: ArchSelection;
  onRotateSelectedArch?: () => void;
  onDuplicateSelectedArch?: () => void;
  onDeleteSelectedArch?: () => void;
  onOpenSelectedArchProps?: () => void;
  workflowOpen?: boolean;
  onToggleWorkflow?: () => void;
  workflowAlertCount?: number;
}

export const ArchStudioBar: React.FC<ArchStudioBarProps> = ({
  t,
  activePhase,
  onSelectPhase,
  isBlueprint2D,
  onToggleBlueprint2D,
  onZoom2DIn,
  onZoom2DOut,
  onReset2DZoom,
  archTool,
  onSetArchTool,
  onResetToSelectTool,
  archNavPanMode = false,
  onToggleArchNavPanMode,
  wallEditAngleLock = true,
  onToggleWallEditAngleLock,
  detectedRoomCount,
  onCommitExactWallLength,
  pendingArchCommit,
  onConfirmPendingCommit,
  onCancelPendingCommit,
  archSelection,
  onRotateSelectedArch,
  onDuplicateSelectedArch,
  onDeleteSelectedArch,
  onOpenSelectedArchProps,
  workflowOpen,
  onToggleWorkflow,
  workflowAlertCount,
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
      : archTool === 'draw-room'
      ? t.archDrawRoomHint
      : archTool === 'place-opening'
      ? t.archPlaceOpeningHint
      : archTool === 'erase-arch'
      ? t.archEraseHint
      : archTool === 'measure'
      ? t.archMeasureHint
      : null;

  const submitExactWall = () => {
    const val = parseFloat(exactLenDraft);
    if (Number.isFinite(val) && val >= 0.25 && onCommitExactWallLength) {
      onCommitExactWallLength(val);
    }
  };

  const canRotateSel =
    archSelection?.kind === 'wall' ||
    archSelection?.kind === 'opening' ||
    archSelection?.kind === 'roof' ||
    archSelection?.kind === 'stair';

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

        {/* Dedicated 1-Tap 2D Denah Zoom In / Out / Fit Controls */}
        {isBlueprint2D && (
          <div className="arch-2d-zoom-group" role="group">
            {onZoom2DIn && (
              <button
                type="button"
                className="arch-2d-zoom-btn"
                onClick={onZoom2DIn}
                title={t.zoomIn2DBtn}
                aria-label={t.zoomIn2DBtn}
              >
                <ZoomIn size={14} />
              </button>
            )}
            {onZoom2DOut && (
              <button
                type="button"
                className="arch-2d-zoom-btn"
                onClick={onZoom2DOut}
                title={t.zoomOut2DBtn}
                aria-label={t.zoomOut2DBtn}
              >
                <ZoomOut size={14} />
              </button>
            )}
            {onReset2DZoom && (
              <button
                type="button"
                className="arch-2d-zoom-btn"
                onClick={onReset2DZoom}
                title={t.zoomReset2DBtn}
                aria-label={t.zoomReset2DBtn}
              >
                <Maximize size={13} />
              </button>
            )}
          </div>
        )}

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

        <span className="arch-strip-divider" />

        {/* #6 Quick Eraser Tool (`erase-arch`) */}
        <button
          type="button"
          className={`arch-phase-btn is-eraser ${
            archTool === 'erase-arch' ? 'active' : ''
          }`}
          onClick={() =>
            onSetArchTool(archTool === 'erase-arch' ? 'select' : 'erase-arch')
          }
          title={t.archToolQuickErase}
        >
          <Eraser size={14} />
          <span>{t.archToolQuickErase}</span>
        </button>

        {/* Integrated 6-System Architectural Project Workflow Drawer Trigger */}
        {onToggleWorkflow && (
          <>
            <span className="arch-strip-divider" />
            <button
              type="button"
              className={`arch-phase-btn is-workflow ${
                workflowOpen ? 'active' : ''
              }`}
              onClick={onToggleWorkflow}
              title={t.archWorkflowTitle}
            >
              <ClipboardList size={14} />
              <span>{t.archWorkflowBtn}</span>
              {workflowAlertCount !== undefined && workflowAlertCount > 0 && (
                <span className="arch-phase-badge warn">
                  {workflowAlertCount}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* #2 Optional Confirm Before Commit Floating Bar */}
      {pendingArchCommit && (
        <div className="arch-pending-commit-bar">
          <button
            type="button"
            className="arch-commit-ok-btn"
            onClick={onConfirmPendingCommit}
          >
            <Check size={14} />
            <span>{t.archConfirmPlaceBtn}</span>
          </button>
          <button
            type="button"
            className="arch-commit-cancel-btn"
            onClick={onCancelPendingCommit}
          >
            <X size={14} />
            <span>{t.archCancelPlaceBtn}</span>
          </button>
        </div>
      )}

      {/* #12 Selected Arch Element Floating Quick-Action Bar */}
      {!pendingArchCommit && archTool === 'select' && archSelection && (
        <div className="arch-quick-action-bar">
          {/* #7 Wall Angle Lock ON/OFF Pill right on Selected Wall */}
          {archSelection.kind === 'wall' && onToggleWallEditAngleLock && (
            <button
              type="button"
              className={`arch-qa-btn ${
                wallEditAngleLock ? 'angle-locked' : ''
              }`}
              onClick={onToggleWallEditAngleLock}
              title={t.wallEditAngleLockLabel}
            >
              <Compass size={13} />
              <span>
                {wallEditAngleLock
                  ? t.wallEditAngleLockedBadge
                  : t.wallEditAngleFreeBadge}
              </span>
            </button>
          )}

          {canRotateSel && onRotateSelectedArch && (
            <button
              type="button"
              className="arch-qa-btn"
              onClick={onRotateSelectedArch}
              title={
                archSelection.kind === 'opening'
                  ? t.archOpenFlipSwing
                  : t.archQuickRotate90
              }
            >
              <RotateCw size={13} />
              <span>
                {archSelection.kind === 'opening'
                  ? t.archOpenFlipSwing
                  : t.archQuickRotate90}
              </span>
            </button>
          )}

          {archSelection.kind !== 'room' && onDuplicateSelectedArch && (
            <button
              type="button"
              className="arch-qa-btn"
              onClick={onDuplicateSelectedArch}
              title={t.copy}
            >
              <Copy size={13} />
              <span>{t.copy}</span>
            </button>
          )}

          {onOpenSelectedArchProps && (
            <button
              type="button"
              className="arch-qa-btn"
              onClick={onOpenSelectedArchProps}
            >
              <SlidersHorizontal size={13} />
              <span>{t.properties}</span>
            </button>
          )}
          {onDeleteSelectedArch && (
            <button
              type="button"
              className="arch-qa-btn danger"
              onClick={onDeleteSelectedArch}
              title={t.delete}
            >
              <Trash2 size={13} />
              <span>{t.delete}</span>
            </button>
          )}
        </div>
      )}

      {/* Smart Draw vs Pan/Zoom Disambiguation + Angle Lock Pill */}
      {activeHint && !pendingArchCommit && (
        <div className="arch-tool-hint-pill">
          {(archTool === 'draw-wall' ||
            archTool === 'draw-room' ||
            archTool === 'place-opening') &&
            onToggleArchNavPanMode && (
              <div className="arch-draw-pan-switch" role="group">
                <button
                  type="button"
                  className={`arch-mode-seg-btn ${
                    !archNavPanMode ? 'active' : ''
                  }`}
                  onClick={() => onToggleArchNavPanMode(false)}
                >
                  <BrickWall size={12} />
                  <span>{t.archDrawModeBtn}</span>
                </button>
                <button
                  type="button"
                  className={`arch-mode-seg-btn is-pan ${
                    archNavPanMode ? 'active' : ''
                  }`}
                  onClick={() => onToggleArchNavPanMode(true)}
                >
                  <Hand size={12} />
                  <span>{t.archPanZoomModeBtn}</span>
                </button>
              </div>
            )}

          {archTool === 'draw-wall' && onToggleWallEditAngleLock && (
            <button
              type="button"
              className={`arch-angle-toggle-chip ${
                wallEditAngleLock ? 'active' : ''
              }`}
              onClick={onToggleWallEditAngleLock}
              title={t.wallEditAngleLockLabel}
            >
              <Compass size={12} />
              <span>
                {wallEditAngleLock
                  ? t.wallEditAngleLockedBadge
                  : t.wallEditAngleFreeBadge}
              </span>
            </button>
          )}

          <span className="arch-hint-text">
            {archNavPanMode ? t.archTwoFingerHint : activeHint}
          </span>

          {archTool === 'draw-wall' &&
            !archNavPanMode &&
            onCommitExactWallLength && (
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
