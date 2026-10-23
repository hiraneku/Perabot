import React, { useEffect, useState } from 'react';
import {
  MousePointer2,
  RotateCw,
  Maximize2,
  Globe,
  Compass,
  ArrowDownToLine,
  Copy,
  Repeat,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Palette,
  CopyPlus,
  Scan,
  CheckSquare,
  Link2,
  Unlink2,
  Lock,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  AxisLockMode,
  SelectionSubMode,
  StudioMode,
  TransformMode,
  TransformSpace,
} from '../types/studio';
import { RgbGizmoIcon } from './ShapeIcons';

interface TransformToolbarProps {
  language: AppLanguage;
  studioMode?: StudioMode;
  mode: TransformMode;
  selectionSubMode: SelectionSubMode;
  axisLock: AxisLockMode;
  space: TransformSpace;
  hasSelection: boolean;
  selectedCount: number;
  canUngroup: boolean;
  collapsed: boolean;
  suppressRollouts?: boolean;
  wallEditAngleLock?: boolean;
  onToggleWallEditAngleLock?: () => void;
  onToggleCollapse: () => void;
  onChangeMode: (mode: TransformMode) => void;
  onChangeSelectionSubMode: (sub: SelectionSubMode) => void;
  onSelectAll: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onChangeAxisLock: (lock: AxisLockMode) => void;
  onToggleSpace: () => void;
  onOpenColorStudio: () => void;
  onDropToFloor: () => void;
  onDuplicate: () => void;
  onOpenRepeatModal: () => void;
  onDelete: () => void;
}

export const TransformToolbar: React.FC<TransformToolbarProps> = ({
  language,
  studioMode = 'modeling',
  mode,
  selectionSubMode,
  axisLock,
  space,
  hasSelection,
  selectedCount,
  canUngroup,
  collapsed,
  suppressRollouts = false,
  wallEditAngleLock = true,
  onToggleWallEditAngleLock,
  onToggleCollapse,
  onChangeMode,
  onChangeSelectionSubMode,
  onSelectAll,
  onGroupSelected,
  onUngroupSelected,
  onChangeAxisLock,
  onToggleSpace,
  onOpenColorStudio,
  onDropToFloor,
  onDuplicate,
  onOpenRepeatModal,
  onDelete,
}) => {
  const t = TRANSLATIONS[language];
  const [selectRolloutOpen, setSelectRolloutOpen] = useState(false);
  const [axisRolloutOpen, setAxisRolloutOpen] = useState(false);

  useEffect(() => {
    if (suppressRollouts) {
      setSelectRolloutOpen(false);
      setAxisRolloutOpen(false);
    }
  }, [suppressRollouts]);

  useEffect(() => {
    if (mode !== 'select') {
      setSelectRolloutOpen(false);
    }
  }, [mode]);

  if (collapsed) {
    return (
      <button
        type="button"
        className={`left-toolbar-expand-tab ${
          studioMode === 'house' ? 'house-mode' : ''
        }`}
        onClick={onToggleCollapse}
        title={t.showLeftToolbar}
        aria-label={t.showLeftToolbar}
      >
        <ChevronRight size={18} />
      </button>
    );
  }

  const handleSelectBtnClick = () => {
    if (mode !== 'select') {
      onChangeMode('select');
      setSelectRolloutOpen(true);
    } else {
      setSelectRolloutOpen((prev) => !prev);
    }
  };

  return (
    <div
      className={`left-toolbar-shell ${
        studioMode === 'house' ? 'house-mode' : ''
      }`}
    >
      <aside
        className={`left-toolbar ${studioMode === 'house' ? 'house-mode' : ''}`}
        aria-label={t.tabTransform}
      >
        <div className="toolbar-collapse-sticky-head">
          <button
            type="button"
            className="toolbar-collapse-icon-btn"
            onClick={onToggleCollapse}
            title={t.hideLeftToolbar}
            aria-label={t.hideLeftToolbar}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="toolbar-sep" />
        </div>

        {/* #6 Select Button with Horizontal Right-Expanding Rollout Indicator */}
        <button
          type="button"
          className={`tool-btn select-rollout-trigger ${
            mode === 'select' ? 'active' : ''
          }`}
          onClick={handleSelectBtnClick}
          title={`${t.select} (Q)`}
        >
          <div className="tool-icon-rel">
            {selectionSubMode === 'multi' ? (
              <CopyPlus size={18} />
            ) : selectionSubMode === 'box' ? (
              <Scan size={18} />
            ) : (
              <MousePointer2 size={18} />
            )}
            {selectedCount > 1 && (
              <span className="tool-count-pip">{selectedCount}</span>
            )}
          </div>
          <span className="tool-label">{t.select}</span>
          <ChevronRight
            size={11}
            className={`rollout-mini-arrow ${
              mode === 'select' && selectRolloutOpen ? 'open' : ''
            }`}
          />
        </button>

        <button
          type="button"
          className={`tool-btn ${mode === 'translate' ? 'active' : ''}`}
          onClick={() => onChangeMode('translate')}
          title={`${t.move} (G)`}
        >
          <RgbGizmoIcon size={19} />
          <span className="tool-label">{t.move}</span>
        </button>

        <button
          type="button"
          className={`tool-btn ${mode === 'rotate' ? 'active' : ''}`}
          onClick={() => onChangeMode('rotate')}
          title={`${t.rotate} (R)`}
        >
          <RotateCw size={18} />
          <span className="tool-label">{t.rotate}</span>
        </button>

        <button
          type="button"
          className={`tool-btn ${mode === 'scale' ? 'active' : ''}`}
          onClick={() => onChangeMode('scale')}
          title={`${t.scale} (S)`}
        >
          <Maximize2 size={17} />
          <span className="tool-label">{t.scale}</span>
        </button>

        {/* #9 Axis Lock Trigger */}
        <button
          type="button"
          className={`tool-btn axis-lock-trigger ${
            axisLock !== 'free' ? `active lock-${axisLock}` : ''
          }`}
          onClick={() => setAxisRolloutOpen((prev) => !prev)}
          title={t.axisLockTitle}
        >
          <Lock size={16} />
          <span className="tool-label">
            {axisLock === 'free' ? t.axisLockTitle : axisLock.toUpperCase()}
          </span>
        </button>

        {/* #7 Wall Angle Lock Toggle (0°/45°/90°) in Buat Rumah */}
        {studioMode === 'house' && onToggleWallEditAngleLock && (
          <button
            type="button"
            className={`tool-btn ${wallEditAngleLock ? 'active' : ''}`}
            onClick={onToggleWallEditAngleLock}
            title={t.wallEditAngleLockLabel}
          >
            <Compass size={16} />
            <span className="tool-label">
              {wallEditAngleLock ? '90° ON' : 'Bebas'}
            </span>
          </button>
        )}

        <div className="toolbar-sep" />

        <button
          type="button"
          className="tool-btn color-shortcut-btn"
          onClick={onOpenColorStudio}
          title={`${t.paint} (C)`}
        >
          <Palette size={17} />
          <span className="tool-label">{t.paint}</span>
        </button>

        <button
          type="button"
          className="tool-btn"
          onClick={onToggleSpace}
          title={space === 'world' ? t.worldAxis : t.localAxis}
        >
          {space === 'world' ? <Globe size={17} /> : <Compass size={17} />}
          <span className="tool-label">
            {space === 'world' ? t.worldAxis : t.localAxis}
          </span>
        </button>

        <button
          type="button"
          className="tool-btn"
          disabled={!hasSelection}
          onClick={onDropToFloor}
          title={t.stickSurface}
        >
          <ArrowDownToLine size={17} />
          <span className="tool-label">{t.stickSurface}</span>
        </button>

        <button
          type="button"
          className="tool-btn"
          disabled={!hasSelection}
          onClick={onDuplicate}
          title={`${t.copy} (Shift+D)`}
        >
          <Copy size={17} />
          <span className="tool-label">{t.copy}</span>
        </button>

        {/* #5 Duplicate & Repeat Placement */}
        <button
          type="button"
          className="tool-btn"
          disabled={!hasSelection}
          onClick={onOpenRepeatModal}
          title={t.repeatModalTitle}
        >
          <Repeat size={17} />
          <span className="tool-label">{t.repeatArrayBtn}</span>
        </button>

        <button
          type="button"
          className="tool-btn danger"
          disabled={!hasSelection}
          onClick={onDelete}
          title={`${t.delete} (Del)`}
        >
          <Trash2 size={17} />
          <span className="tool-label">{t.delete}</span>
        </button>
      </aside>

      {/* #6 Horizontal Right-Expanding Select Rollout Bar */}
      {mode === 'select' && selectRolloutOpen && (
        <div
          className="select-rollout-bar"
          role="toolbar"
          aria-label={t.select}
        >
          <button
            type="button"
            className={`rollout-pill ${
              selectionSubMode === 'single' ? 'active' : ''
            }`}
            onClick={() => onChangeSelectionSubMode('single')}
            title={t.selSingle}
          >
            <MousePointer2 size={14} />
            <span>{t.selSingle}</span>
          </button>

          <button
            type="button"
            className={`rollout-pill ${
              selectionSubMode === 'multi' ? 'active' : ''
            }`}
            onClick={() => onChangeSelectionSubMode('multi')}
            title={t.selMultiTap}
          >
            <CopyPlus size={14} />
            <span>{t.selMultiTap}</span>
          </button>

          <button
            type="button"
            className={`rollout-pill ${
              selectionSubMode === 'box' ? 'active' : ''
            }`}
            onClick={() => onChangeSelectionSubMode('box')}
            title={t.selBoxDrag}
          >
            <Scan size={14} />
            <span>{t.selBoxDrag}</span>
          </button>

          <span className="rollout-divider" />

          <button
            type="button"
            className="rollout-pill"
            onClick={onSelectAll}
            title={t.selSelectAll}
          >
            <CheckSquare size={14} />
            <span>{t.selSelectAll}</span>
          </button>

          <button
            type="button"
            className="rollout-pill accent"
            disabled={selectedCount < 2}
            onClick={onGroupSelected}
            title={t.selGroupSelected}
          >
            <Link2 size={14} />
            <span>{t.selGroupSelected}</span>
          </button>

          {canUngroup && (
            <button
              type="button"
              className="rollout-pill"
              onClick={onUngroupSelected}
              title={t.ungroupAction}
            >
              <Unlink2 size={14} />
              <span>{t.ungroupAction}</span>
            </button>
          )}

          {selectedCount > 1 && (
            <span className="rollout-count-badge">
              {selectedCount} {t.multiSelectedCount}
            </span>
          )}

          <button
            type="button"
            className="rollout-close-btn"
            onClick={() => setSelectRolloutOpen(false)}
            aria-label={t.done}
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      )}

      {/* #9 Horizontal Right-Expanding Axis Lock Rollout Bar */}
      {(axisRolloutOpen || axisLock !== 'free') && (
        <div
          className="axis-rollout-bar"
          role="toolbar"
          aria-label={t.axisLockTitle}
        >
          {(
            [
              { id: 'free', label: t.axisLockFree, cls: 'free' },
              { id: 'x', label: 'X', cls: 'x' },
              { id: 'y', label: 'Y', cls: 'y' },
              { id: 'z', label: 'Z', cls: 'z' },
              { id: 'xz', label: 'XZ', cls: 'xz' },
            ] as Array<{ id: AxisLockMode; label: string; cls: string }>
          ).map((ax) => (
            <button
              key={ax.id}
              type="button"
              className={`axis-lock-pill axis-${ax.cls} ${
                axisLock === ax.id ? 'active' : ''
              }`}
              onClick={() => onChangeAxisLock(ax.id)}
            >
              {ax.label}
            </button>
          ))}
          {axisRolloutOpen && axisLock === 'free' && (
            <button
              type="button"
              className="rollout-close-btn"
              onClick={() => setAxisRolloutOpen(false)}
              aria-label={t.done}
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
