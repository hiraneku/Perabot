import React from 'react';
import {
  MousePointer2,
  RotateCw,
  Maximize2,
  Globe,
  Compass,
  ArrowDownToLine,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Palette,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { AppLanguage, TransformMode, TransformSpace } from '../types/studio';
import { RgbGizmoIcon } from './ShapeIcons';

interface TransformToolbarProps {
  language: AppLanguage;
  mode: TransformMode;
  space: TransformSpace;
  hasSelection: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onChangeMode: (mode: TransformMode) => void;
  onToggleSpace: () => void;
  onOpenColorStudio: () => void;
  onDropToFloor: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const TransformToolbar: React.FC<TransformToolbarProps> = ({
  language,
  mode,
  space,
  hasSelection,
  collapsed,
  onToggleCollapse,
  onChangeMode,
  onToggleSpace,
  onOpenColorStudio,
  onDropToFloor,
  onDuplicate,
  onDelete,
}) => {
  const t = TRANSLATIONS[language];

  if (collapsed) {
    return (
      <button
        type="button"
        className="left-toolbar-expand-tab"
        onClick={onToggleCollapse}
        title={t.showLeftToolbar}
        aria-label={t.showLeftToolbar}
      >
        <ChevronRight size={18} />
      </button>
    );
  }

  return (
    <aside className="left-toolbar" aria-label={t.tabTransform}>
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

      <button
        type="button"
        className={`tool-btn ${mode === 'select' ? 'active' : ''}`}
        onClick={() => onChangeMode('select')}
        title={`${t.select} (Q)`}
      >
        <MousePointer2 size={18} />
        <span className="tool-label">{t.select}</span>
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
  );
};
