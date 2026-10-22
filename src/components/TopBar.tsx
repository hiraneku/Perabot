import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Undo2,
  Redo2,
  Magnet,
  Grid3x3,
  Focus,
  Download,
  FileUp,
  PanelRight,
  HelpCircle,
  Trash2,
  ChevronDown,
  Camera,
  Check,
  Mountain,
  Layers,
  Maximize,
  Minimize,
  ArrowDownToLine,
  Home,
  Settings,
  Eye,
  Footprints,
  Sun,
  Sunset,
  Moon,
  Loader2,
  Ruler,
  ScanLine,
  BoxSelect,
} from 'lucide-react';
import { CameraPresetType } from '../engine/viewportHelpers';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  GridSettings,
  GridStyle,
  GridVerticalMode,
  LightingMood,
  MagnetStrength,
  SnapSettings,
  StudioMode,
  SurfaceAttachAxis,
  SurfaceConformMode,
  SurfaceSettings,
  TerrainPreset,
} from '../types/studio';

interface PortalDropdownProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  className?: string;
  align?: 'left' | 'right';
  children: React.ReactNode;
}

const PortalDropdown: React.FC<PortalDropdownProps> = ({
  open,
  anchorRef,
  onClose,
  className = '',
  align = 'left',
  children,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 58,
    left: 12,
  });

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const menuWidth = menu?.offsetWidth || 300;
      const vw = window.innerWidth;
      const desiredLeft =
        align === 'right' ? rect.right - menuWidth : rect.left;
      const clampedLeft = Math.max(8, Math.min(vw - menuWidth - 8, desiredLeft));
      setCoords({
        top: Math.max(52, rect.bottom + 8),
        left: clampedLeft,
      });
    };

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, align, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [open, anchorRef, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`dropdown-menu portal-dropdown-menu ${className}`}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        right: 'auto',
      }}
    >
      {children}
    </div>,
    document.body
  );
};

const QUICK_PLOT_PRESETS: Array<{ label: string; w: number; d: number }> = [
  { label: '4×4m', w: 4, d: 4 },
  { label: '6×6m', w: 6, d: 6 },
  { label: '8×12m', w: 8, d: 12 },
  { label: '10×15m', w: 10, d: 15 },
];

export type SaveIndicatorState = 'saved' | 'dirty' | 'saving';

interface TopBarProps {
  language: AppLanguage;
  studioMode: StudioMode;
  projectName: string;
  saveState: SaveIndicatorState;
  isImporting3D?: boolean;
  lightingMood: LightingMood;
  interiorPeek: boolean;
  walkthroughActive: boolean;
  canUndo: boolean;
  canRedo: boolean;
  snapSettings: SnapSettings;
  surfaceSettings: SurfaceSettings;
  gridSettings: GridSettings;
  inspectorOpen: boolean;
  isFullscreen: boolean;
  hasSelection: boolean;
  objectCount: number;
  onGoHome: () => void;
  onSaveNow: () => void;
  onRenameProject: (name: string) => void;
  onTriggerImport3D: () => void;
  onCycleLightingMood: () => void;
  onToggleInteriorPeek: () => void;
  onToggleWalkthrough: () => void;
  onOpenSettings: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateSnap: (patch: Partial<SnapSettings>) => void;
  onUpdateSurface: (patch: Partial<SurfaceSettings>, reconformNow?: boolean) => void;
  onConformNow: () => void;
  onUpdateGrid: (patch: Partial<GridSettings>) => void;
  onAlignGridToSelection: () => void;
  onFocusCamera: () => void;
  onCameraPreset: (preset: CameraPresetType) => void;
  onExport: (format: 'glb' | 'gltf') => void;
  onClearScene: () => void;
  onToggleInspector: () => void;
  onToggleFullscreen: () => void;
  onOpenHelp: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  language,
  studioMode,
  projectName,
  saveState,
  isImporting3D = false,
  lightingMood,
  interiorPeek,
  walkthroughActive,
  canUndo,
  canRedo,
  snapSettings,
  surfaceSettings,
  gridSettings,
  inspectorOpen,
  isFullscreen,
  hasSelection,
  objectCount,
  onGoHome,
  onSaveNow,
  onRenameProject,
  onTriggerImport3D,
  onCycleLightingMood,
  onToggleInteriorPeek,
  onToggleWalkthrough,
  onOpenSettings,
  onUndo,
  onRedo,
  onUpdateSnap,
  onUpdateSurface,
  onConformNow,
  onUpdateGrid,
  onAlignGridToSelection,
  onFocusCamera,
  onCameraPreset,
  onExport,
  onClearScene,
  onToggleInspector,
  onToggleFullscreen,
  onOpenHelp,
}) => {
  const t = TRANSLATIONS[language];
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(projectName);

  useEffect(() => {
    setTitleDraft(projectName);
  }, [projectName]);

  const [openMenu, setOpenMenu] = useState<
    null | 'snap' | 'surface' | 'grid' | 'view' | 'export'
  >(null);

  const exportRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (id: 'snap' | 'surface' | 'grid' | 'view' | 'export') => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  const activeSnapCount = [
    snapSettings.objectMagnet,
    snapSettings.alignment,
    snapSettings.grid,
  ].filter(Boolean).length;

  const saveTooltip =
    saveState === 'saving'
      ? t.savingNow
      : saveState === 'dirty'
      ? t.unsavedChanges
      : t.savedAuto;

  return (
    <header className="topbar">
      {/* Pinned Left: Home + Compact Project Title + Smart Save Pill + Undo/Redo */}
      <div className="topbar-group topbar-left">
        <button
          type="button"
          className="chip-btn home-nav-btn"
          onClick={onGoHome}
          title={t.backHome}
        >
          <Home size={15} />
          <span className="hide-md">{t.backHome}</span>
        </button>

        <div className="project-title-pill">
          <span
            className={`project-mode-dot ${studioMode}`}
            title={studioMode === 'house' ? t.modeHouseTitle : t.modeModelingTitle}
          />
          {editingTitle ? (
            <input
              type="text"
              className="project-title-input"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                const v = titleDraft.trim();
                if (v) onRenameProject(v);
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = titleDraft.trim();
                  if (v) onRenameProject(v);
                  setEditingTitle(false);
                } else if (e.key === 'Escape') {
                  setTitleDraft(projectName);
                  setEditingTitle(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="project-title-btn"
              onClick={() => setEditingTitle(true)}
              title={t.rename}
            >
              <span className="project-title-text">{projectName}</span>
            </button>
          )}
          <button
            type="button"
            className={`project-save-dot state-${saveState}`}
            title={saveTooltip}
            onClick={onSaveNow}
            aria-label={saveTooltip}
          >
            {saveState === 'saving' ? (
              <Loader2 size={11} className="spin-icon" />
            ) : saveState === 'dirty' ? (
              <span className="dirty-pulse-dot" />
            ) : (
              <Check size={11} />
            )}
          </button>
        </div>

        <div className="btn-cluster">
          <button
            type="button"
            className="icon-btn"
            disabled={!canUndo}
            onClick={onUndo}
            title={t.undo}
            aria-label={t.undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={!canRedo}
            onClick={onRedo}
            title={t.redo}
            aria-label={t.redo}
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      {/* Horizontally Scrollable Center Track — NEVER clips off-screen */}
      <div className="topbar-scroll-zone">
        <div className="topbar-scroll-inner">
          {/* Import 3D Button (TopBar ONLY, as requested) */}
          <button
            type="button"
            className={`chip-btn import-3d-chip ${isImporting3D ? 'active' : ''}`}
            onClick={onTriggerImport3D}
            disabled={isImporting3D}
            title={t.import3DHint}
          >
            {isImporting3D ? (
              <Loader2 size={15} className="spin-icon" />
            ) : (
              <FileUp size={15} />
            )}
            <span>{t.import3DBtn}</span>
          </button>

          {/* 3-Mode Smart Snapping Popover */}
          <div className="dropdown-wrap" ref={snapRef}>
            <button
              type="button"
              className={`chip-btn ${
                snapSettings.enabled && activeSnapCount > 0 ? 'active' : ''
              }`}
              onClick={() => toggleMenu('snap')}
              title={t.snapSystemTitle}
            >
              <Magnet size={15} />
              <span>{t.snap}</span>
              <span className="mini-badge">
                {snapSettings.enabled ? activeSnapCount : 0}
              </span>
              <ChevronDown size={13} />
            </button>

            <PortalDropdown
              open={openMenu === 'snap'}
              anchorRef={snapRef}
              onClose={() => setOpenMenu(null)}
              className="snap-popover"
            >
              <div className="snap-popover-head">
                <span>{t.snapSystemTitle}</span>
                <button
                  type="button"
                  className={`mini-master-toggle ${
                    snapSettings.enabled ? 'on' : ''
                  }`}
                  onClick={() =>
                    onUpdateSnap({ enabled: !snapSettings.enabled })
                  }
                >
                  {snapSettings.enabled ? t.activeState : t.inactiveState}
                </button>
              </div>

              <div
                className={`snap-mode-card ${
                  snapSettings.objectMagnet ? 'selected' : ''
                }`}
              >
                <button
                  type="button"
                  className="snap-mode-row"
                  onClick={() =>
                    onUpdateSnap({ objectMagnet: !snapSettings.objectMagnet })
                  }
                >
                  <span className="snap-check-box">
                    {snapSettings.objectMagnet && <Check size={13} />}
                  </span>
                  <div className="snap-mode-info">
                    <strong>{t.snapMagnetTitle}</strong>
                    <small>{t.snapMagnetDesc}</small>
                  </div>
                </button>

                {snapSettings.objectMagnet && (
                  <div className="snap-sub-chips">
                    {(
                      [
                        { id: 'subtle', label: t.strengthSubtle },
                        { id: 'normal', label: t.strengthNormal },
                        { id: 'strong', label: t.strengthStrong },
                      ] as Array<{ id: MagnetStrength; label: string }>
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        className={`sub-chip ${
                          snapSettings.magnetStrength === st.id ? 'active' : ''
                        }`}
                        onClick={() => onUpdateSnap({ magnetStrength: st.id })}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                className={`snap-mode-card ${
                  snapSettings.alignment ? 'selected' : ''
                }`}
              >
                <button
                  type="button"
                  className="snap-mode-row"
                  onClick={() =>
                    onUpdateSnap({ alignment: !snapSettings.alignment })
                  }
                >
                  <span className="snap-check-box">
                    {snapSettings.alignment && <Check size={13} />}
                  </span>
                  <div className="snap-mode-info">
                    <strong>{t.snapAlignTitle}</strong>
                    <small>{t.snapAlignDesc}</small>
                  </div>
                </button>
              </div>

              <div
                className={`snap-mode-card ${snapSettings.grid ? 'selected' : ''}`}
              >
                <button
                  type="button"
                  className="snap-mode-row"
                  onClick={() => onUpdateSnap({ grid: !snapSettings.grid })}
                >
                  <span className="snap-check-box">
                    {snapSettings.grid && <Check size={13} />}
                  </span>
                  <div className="snap-mode-info">
                    <strong>{t.snapGridTitle}</strong>
                    <small>{t.snapGridDesc}</small>
                  </div>
                </button>

                {snapSettings.grid && (
                  <div className="snap-sub-chips">
                    {[0.1, 0.25, 0.5, 1.0].map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`sub-chip ${
                          Math.abs(snapSettings.gridStep - st) < 0.001
                            ? 'active'
                            : ''
                        }`}
                        onClick={() => onUpdateSnap({ gridStep: st })}
                      >
                        {st}m
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PortalDropdown>
          </div>

          {/* Surface Alignment Popover */}
          <div className="dropdown-wrap" ref={surfaceRef}>
            <button
              type="button"
              className={`chip-btn ${
                surfaceSettings.enabled || surfaceSettings.clickToPlace
                  ? 'active'
                  : ''
              }`}
              onClick={() => toggleMenu('surface')}
              title={`${t.surfaceSystemTitle} (T)`}
            >
              <Layers size={15} />
              <span>{t.surface}</span>
              <ChevronDown size={13} />
            </button>

            <PortalDropdown
              open={openMenu === 'surface'}
              anchorRef={surfaceRef}
              onClose={() => setOpenMenu(null)}
              className="snap-popover surface-popover"
            >
              <div className="snap-popover-head">
                <span>{t.surfaceSystemTitle}</span>
                <button
                  type="button"
                  className={`mini-master-toggle ${
                    surfaceSettings.enabled ? 'on' : ''
                  }`}
                  onClick={() =>
                    onUpdateSurface({ enabled: !surfaceSettings.enabled })
                  }
                >
                  {surfaceSettings.enabled ? t.activeState : t.inactiveState}
                </button>
              </div>

              <div className="grid-section-label">{t.surfaceOrientSection}</div>
              {(
                [
                  {
                    id: 'align-normal',
                    title: t.surfModeNormalTitle,
                    desc: t.surfModeNormalDesc,
                  },
                  {
                    id: 'upright-follow',
                    title: t.surfModeUprightTitle,
                    desc: t.surfModeUprightDesc,
                  },
                  {
                    id: 'foundation-seat',
                    title: t.surfModeFoundationTitle,
                    desc: t.surfModeFoundationDesc,
                  },
                ] as Array<{
                  id: SurfaceConformMode;
                  title: string;
                  desc: string;
                }>
              ).map((m) => (
                <div
                  key={m.id}
                  className={`snap-mode-card ${
                    surfaceSettings.conformMode === m.id ? 'selected' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="snap-mode-row"
                    onClick={() =>
                      onUpdateSurface(
                        { enabled: true, conformMode: m.id },
                        true
                      )
                    }
                  >
                    <span className="snap-check-box">
                      {surfaceSettings.conformMode === m.id && (
                        <Check size={13} />
                      )}
                    </span>
                    <div className="snap-mode-info">
                      <strong>{m.title}</strong>
                      <small>{m.desc}</small>
                    </div>
                  </button>
                </div>
              ))}

              <div className="grid-section-label">{t.surfAttachFaceSection}</div>
              <div className="snap-sub-chips" style={{ paddingLeft: 0 }}>
                {(
                  [
                    { id: 'auto', label: t.surfAttachAuto },
                    { id: '-y', label: t.surfAttachBottom },
                    { id: '-z', label: t.surfAttachBack },
                    { id: '+y', label: t.surfAttachTop },
                  ] as Array<{ id: SurfaceAttachAxis; label: string }>
                ).map((ax) => (
                  <button
                    key={ax.id}
                    type="button"
                    className={`sub-chip ${
                      surfaceSettings.attachAxis === ax.id ? 'active' : ''
                    }`}
                    onClick={() =>
                      onUpdateSurface({ attachAxis: ax.id }, true)
                    }
                  >
                    {ax.label}
                  </button>
                ))}
              </div>

              <div
                className={`snap-mode-card ${
                  surfaceSettings.autoOnMove ? 'selected' : ''
                }`}
              >
                <button
                  type="button"
                  className="snap-mode-row"
                  onClick={() =>
                    onUpdateSurface({
                      enabled: true,
                      autoOnMove: !surfaceSettings.autoOnMove,
                    })
                  }
                >
                  <span className="snap-check-box">
                    {surfaceSettings.autoOnMove && <Check size={13} />}
                  </span>
                  <div className="snap-mode-info">
                    <strong>{t.surfAutoMoveTitle}</strong>
                    <small>{t.surfAutoMoveDesc}</small>
                  </div>
                </button>
              </div>

              <div
                className={`snap-mode-card ${
                  surfaceSettings.clickToPlace ? 'selected' : ''
                }`}
              >
                <button
                  type="button"
                  className="snap-mode-row"
                  onClick={() =>
                    onUpdateSurface({
                      enabled: true,
                      clickToPlace: !surfaceSettings.clickToPlace,
                    })
                  }
                >
                  <span className="snap-check-box">
                    {surfaceSettings.clickToPlace && <Check size={13} />}
                  </span>
                  <div className="snap-mode-info">
                    <strong>{t.surfClickPlaceTitle}</strong>
                    <small>{t.surfClickPlaceDesc}</small>
                  </div>
                </button>
              </div>

              <div className="grid-slider-row">
                <div className="grid-slider-head">
                  <span>{t.surfSpinLabel}</span>
                  <strong>{Math.round(surfaceSettings.spinDeg)}°</strong>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={15}
                  value={surfaceSettings.spinDeg}
                  onChange={(e) =>
                    onUpdateSurface(
                      { spinDeg: parseFloat(e.target.value) },
                      true
                    )
                  }
                />
              </div>

              <div className="grid-slider-row">
                <div className="grid-slider-head">
                  <span>{t.surfOffsetLabel}</span>
                  <strong>{surfaceSettings.offset.toFixed(2)}m</strong>
                </div>
                <input
                  type="range"
                  min={-0.3}
                  max={0.5}
                  step={0.01}
                  value={surfaceSettings.offset}
                  onChange={(e) =>
                    onUpdateSurface(
                      { offset: parseFloat(e.target.value) },
                      true
                    )
                  }
                />
              </div>

              <button
                type="button"
                className="surface-conform-cta"
                disabled={!hasSelection}
                onClick={() => {
                  onConformNow();
                  setOpenMenu(null);
                }}
              >
                <ArrowDownToLine size={15} />
                <span>{t.surfConformNowCta}</span>
              </button>
            </PortalDropdown>
          </div>

          {/* Advanced Architectural Grid & Guides Popover */}
          <div className="dropdown-wrap" ref={gridRef}>
            <button
              type="button"
              className={`chip-btn ${gridSettings.visible ? 'active' : ''}`}
              onClick={() => toggleMenu('grid')}
              title={t.gridSystemTitle}
            >
              {gridSettings.style === 'terrain' ? (
                <Mountain size={15} />
              ) : (
                <Grid3x3 size={15} />
              )}
              <span>{t.grid}</span>
              <span className="mini-badge">{gridSettings.spacing}m</span>
              <ChevronDown size={13} />
            </button>

            <PortalDropdown
              open={openMenu === 'grid'}
              anchorRef={gridRef}
              onClose={() => setOpenMenu(null)}
              className="snap-popover grid-popover"
            >
              <div className="snap-popover-head">
                <span>{t.gridSystemTitle}</span>
                <button
                  type="button"
                  className={`mini-master-toggle ${
                    gridSettings.visible ? 'on' : ''
                  }`}
                  onClick={() =>
                    onUpdateGrid({ visible: !gridSettings.visible })
                  }
                >
                  {gridSettings.visible ? t.visibleState : t.hiddenState}
                </button>
              </div>

              {/* 1. Precision Cell Size + Sync Snap */}
              <div className="grid-section-row">
                <span className="grid-section-label">
                  {t.gridCellSizeSection}
                </span>
                <button
                  type="button"
                  className="grid-inline-action"
                  onClick={() => {
                    onUpdateGrid({ syncSnap: true });
                    onUpdateSnap({
                      enabled: true,
                      grid: true,
                      gridStep: gridSettings.spacing,
                    });
                  }}
                >
                  {t.gridSyncSnapBtn} ({gridSettings.spacing}m)
                </button>
              </div>
              <div className="snap-sub-chips" style={{ paddingLeft: 0 }}>
                {[0.1, 0.25, 0.5, 1.0].map((cell) => (
                  <button
                    key={cell}
                    type="button"
                    className={`sub-chip ${
                      Math.abs(gridSettings.spacing - cell) < 0.001
                        ? 'active'
                        : ''
                    }`}
                    onClick={() => {
                      onUpdateGrid({ spacing: cell });
                      if (snapSettings.grid || gridSettings.syncSnap) {
                        onUpdateSnap({ gridStep: cell });
                      }
                    }}
                  >
                    {cell}m
                  </button>
                ))}
              </div>

              {/* 2. Smart Architectural Measurement & Plot Guides */}
              <div className="grid-section-label">
                {t.gridSmartGuidesSection}
              </div>

              {/* Meter Coordinate Ruler */}
              <div
                className={`snap-mode-card ${
                  gridSettings.showRuler ? 'selected' : ''
                }`}
              >
                <button
                  type="button"
                  className="snap-mode-row"
                  onClick={() =>
                    onUpdateGrid({ showRuler: !gridSettings.showRuler })
                  }
                >
                  <span className="snap-check-box">
                    {gridSettings.showRuler && <Check size={13} />}
                  </span>
                  <div className="snap-mode-info">
                    <strong>
                      <Ruler
                        size={12}
                        style={{ display: 'inline', marginRight: 5 }}
                      />
                      {t.gridRulerTitle}
                    </strong>
                    <small>{t.gridRulerDesc}</small>
                  </div>
                </button>
              </div>

              {/* Live Selected Object Footprint */}
              <div
                className={`snap-mode-card ${
                  gridSettings.showSelectionFootprint ? 'selected' : ''
                }`}
              >
                <button
                  type="button"
                  className="snap-mode-row"
                  onClick={() =>
                    onUpdateGrid({
                      showSelectionFootprint:
                        !gridSettings.showSelectionFootprint,
                    })
                  }
                >
                  <span className="snap-check-box">
                    {gridSettings.showSelectionFootprint && <Check size={13} />}
                  </span>
                  <div className="snap-mode-info">
                    <strong>
                      <ScanLine
                        size={12}
                        style={{ display: 'inline', marginRight: 5 }}
                      />
                      {t.gridFootprintTitle}
                    </strong>
                    <small>{t.gridFootprintDesc}</small>
                  </div>
                </button>
              </div>

              {/* Plot / Room Boundary Frame */}
              <div
                className={`snap-mode-card ${
                  gridSettings.showPlotBoundary ? 'selected' : ''
                }`}
              >
                <button
                  type="button"
                  className="snap-mode-row"
                  onClick={() =>
                    onUpdateGrid({
                      showPlotBoundary: !gridSettings.showPlotBoundary,
                    })
                  }
                >
                  <span className="snap-check-box">
                    {gridSettings.showPlotBoundary && <Check size={13} />}
                  </span>
                  <div className="snap-mode-info">
                    <strong>
                      <BoxSelect
                        size={12}
                        style={{ display: 'inline', marginRight: 5 }}
                      />
                      {t.gridPlotTitle}
                    </strong>
                    <small>{t.gridPlotDesc}</small>
                  </div>
                </button>

                {gridSettings.showPlotBoundary && (
                  <div className="grid-plot-config">
                    <div className="snap-sub-chips" style={{ paddingLeft: 0 }}>
                      {QUICK_PLOT_PRESETS.map((pr) => (
                        <button
                          key={pr.label}
                          type="button"
                          className={`sub-chip ${
                            gridSettings.plotWidth === pr.w &&
                            gridSettings.plotDepth === pr.d
                              ? 'active'
                              : ''
                          }`}
                          onClick={() =>
                            onUpdateGrid({ plotWidth: pr.w, plotDepth: pr.d })
                          }
                        >
                          {pr.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid-plot-dims-row">
                      <label className="grid-dim-field">
                        <span>{t.gridPlotWidth}</span>
                        <input
                          type="number"
                          min={1}
                          max={80}
                          step={0.5}
                          value={gridSettings.plotWidth}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v) && v >= 1) {
                              onUpdateGrid({ plotWidth: Math.min(80, v) });
                            }
                          }}
                        />
                      </label>
                      <span className="grid-dim-times">×</span>
                      <label className="grid-dim-field">
                        <span>{t.gridPlotDepth}</span>
                        <input
                          type="number"
                          min={1}
                          max={80}
                          step={0.5}
                          value={gridSettings.plotDepth}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v) && v >= 1) {
                              onUpdateGrid({ plotDepth: Math.min(80, v) });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Vertical Wall Height Reference Grid */}
              <div className="grid-section-label">{t.gridVertSection}</div>
              <div className="snap-sub-chips" style={{ paddingLeft: 0 }}>
                {(
                  [
                    { id: 'none', label: t.gridVertOff },
                    { id: 'back', label: t.gridVertBack },
                    { id: 'corner', label: t.gridVertCorner },
                  ] as Array<{ id: GridVerticalMode; label: string }>
                ).map((vm) => (
                  <button
                    key={vm.id}
                    type="button"
                    className={`sub-chip ${
                      gridSettings.verticalGrid === vm.id ? 'active' : ''
                    }`}
                    onClick={() => onUpdateGrid({ verticalGrid: vm.id })}
                  >
                    {vm.label}
                  </button>
                ))}
              </div>

              {/* 3. Visual Floor Style */}
              <div className="grid-section-label">{t.gridStyleSection}</div>
              <div className="grid-style-cards">
                {(
                  [
                    {
                      id: 'wire',
                      label: t.gridStyleWire,
                      sub: t.gridStyleWireSub,
                    },
                    {
                      id: 'tile',
                      label: t.gridStyleTile,
                      sub: t.gridStyleTileSub,
                    },
                    {
                      id: 'blueprint',
                      label: t.gridStyleBlueprint,
                      sub: t.gridStyleBlueprintSub,
                    },
                    {
                      id: 'terrain',
                      label: t.gridStyleTerrain,
                      sub: t.gridStyleTerrainSub,
                    },
                  ] as Array<{ id: GridStyle; label: string; sub: string }>
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className={`grid-style-btn ${
                      gridSettings.style === st.id ? 'active' : ''
                    }`}
                    onClick={() => onUpdateGrid({ style: st.id })}
                  >
                    <strong>{st.label}</strong>
                    <small>{st.sub}</small>
                  </button>
                ))}
              </div>

              {/* 3D Terrain Sub-panel */}
              {gridSettings.style === 'terrain' && (
                <div className="terrain-subpanel">
                  <div className="grid-section-label">
                    {t.terrainShapeSection}
                  </div>
                  <div className="snap-sub-chips" style={{ paddingLeft: 0 }}>
                    {(
                      [
                        { id: 'hills', label: t.terrainHills },
                        { id: 'valley', label: t.terrainValley },
                        { id: 'terraced', label: t.terrainTerraced },
                        { id: 'flat', label: t.terrainFlat },
                      ] as Array<{ id: TerrainPreset; label: string }>
                    ).map((tp) => (
                      <button
                        key={tp.id}
                        type="button"
                        className={`sub-chip ${
                          gridSettings.terrainPreset === tp.id ? 'active' : ''
                        }`}
                        onClick={() => onUpdateGrid({ terrainPreset: tp.id })}
                      >
                        {tp.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid-slider-row">
                    <div className="grid-slider-head">
                      <span>{t.terrainHeightLabel}</span>
                      <strong>
                        {gridSettings.terrainAmplitude.toFixed(1)}m
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={4}
                      step={0.1}
                      value={gridSettings.terrainAmplitude}
                      onChange={(e) =>
                        onUpdateGrid({
                          terrainAmplitude: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {/* 4. Workplane Elevation + Match Object Base */}
              <div className="grid-slider-row">
                <div className="grid-slider-head">
                  <span>{t.gridElevationLabel}</span>
                  <div className="grid-elev-actions">
                    <strong>{gridSettings.elevationY.toFixed(2)}m</strong>
                    {hasSelection && (
                      <button
                        type="button"
                        className="grid-inline-action"
                        onClick={onAlignGridToSelection}
                      >
                        {t.gridFitObjectBaseBtn}
                      </button>
                    )}
                    {Math.abs(gridSettings.elevationY) > 0.005 && (
                      <button
                        type="button"
                        className="grid-inline-action subtle"
                        onClick={() => onUpdateGrid({ elevationY: 0 })}
                      >
                        0m
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={-3}
                  max={6}
                  step={0.25}
                  value={gridSettings.elevationY}
                  onChange={(e) =>
                    onUpdateGrid({ elevationY: parseFloat(e.target.value) })
                  }
                />
              </div>

              {/* 5. World Size & Axes / Opacity */}
              <div className="grid-slider-row">
                <div className="grid-slider-head">
                  <span>{t.gridWorldSizeLabel}</span>
                  <strong>
                    {gridSettings.worldSize}×{gridSettings.worldSize}m
                  </strong>
                </div>
                <div className="snap-sub-chips" style={{ paddingLeft: 0 }}>
                  {[16, 28, 48, 80].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`sub-chip ${
                        gridSettings.worldSize === sz ? 'active' : ''
                      }`}
                      onClick={() => onUpdateGrid({ worldSize: sz })}
                    >
                      {sz}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-footer-toggles">
                <button
                  type="button"
                  className={`sub-chip ${gridSettings.showAxes ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateGrid({ showAxes: !gridSettings.showAxes })
                  }
                >
                  {gridSettings.showAxes ? t.gridAxesOn : t.gridAxesOff}
                </button>
                <div className="grid-opacity-inline">
                  <span>{t.gridOpacityLabel}</span>
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.05}
                    value={gridSettings.opacity}
                    onChange={(e) =>
                      onUpdateGrid({ opacity: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
            </PortalDropdown>
          </div>

          {/* Interior Peek Cutaway */}
          <button
            type="button"
            className={`chip-btn ${interiorPeek ? 'active' : ''}`}
            onClick={onToggleInteriorPeek}
            title={t.peekInterior}
          >
            <Eye size={15} />
            <span>{t.peekInterior}</span>
          </button>

          {/* First-Person Walkthrough */}
          <button
            type="button"
            className={`chip-btn ${walkthroughActive ? 'active' : ''}`}
            onClick={onToggleWalkthrough}
            title={t.walkthrough}
          >
            <Footprints size={15} />
            <span>{t.walkthrough}</span>
          </button>

          {/* Focus Camera */}
          <button
            type="button"
            className="chip-btn"
            onClick={onFocusCamera}
            title={`${t.focusBtn} (F)`}
          >
            <Focus size={15} />
            <span>{t.focusBtn}</span>
          </button>

          {/* Quick Camera Views */}
          <div className="dropdown-wrap" ref={viewRef}>
            <button
              type="button"
              className="chip-btn"
              onClick={() => toggleMenu('view')}
              title={t.quickCameraHeader}
            >
              <Camera size={15} />
              <span>{t.cameraViewsBtn}</span>
              <ChevronDown size={13} />
            </button>

            <PortalDropdown
              open={openMenu === 'view'}
              anchorRef={viewRef}
              onClose={() => setOpenMenu(null)}
            >
              <div className="dropdown-label">{t.quickCameraHeader}</div>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onCameraPreset('perspective');
                  setOpenMenu(null);
                }}
              >
                <span>{t.camPerspective}</span>
                <kbd>0</kbd>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onCameraPreset('front');
                  setOpenMenu(null);
                }}
              >
                <span>{t.camFront}</span>
                <kbd>1</kbd>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onCameraPreset('right');
                  setOpenMenu(null);
                }}
              >
                <span>{t.camSide}</span>
                <kbd>3</kbd>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onCameraPreset('top');
                  setOpenMenu(null);
                }}
              >
                <span>{t.camTop}</span>
                <kbd>7</kbd>
              </button>
            </PortalDropdown>
          </div>

          {/* Lighting Mood Cycle */}
          <button
            type="button"
            className="icon-btn"
            onClick={onCycleLightingMood}
            title={
              lightingMood === 'sunset'
                ? t.moodSunset
                : lightingMood === 'night'
                ? t.moodNight
                : t.moodMorning
            }
          >
            {lightingMood === 'sunset' ? (
              <Sunset size={16} />
            ) : lightingMood === 'night' ? (
              <Moon size={16} />
            ) : (
              <Sun size={16} />
            )}
          </button>

          {objectCount > 0 && (
            <button
              type="button"
              className="icon-btn danger-hover"
              onClick={onClearScene}
              title={t.clearScene}
              aria-label={t.clearScene}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Pinned Right: Compact Export + Settings + Fullscreen + Help + Sidebar */}
      <div className="topbar-group topbar-right">
        <div className="dropdown-wrap" ref={exportRef}>
          <button
            type="button"
            className="primary-btn export-btn"
            onClick={() => toggleMenu('export')}
            disabled={objectCount === 0}
            title={t.exportFormatHeader}
          >
            <Download size={15} />
            <span className="hide-sm">{t.exportBtn}</span>
            <ChevronDown size={12} />
          </button>

          <PortalDropdown
            open={openMenu === 'export'}
            anchorRef={exportRef}
            onClose={() => setOpenMenu(null)}
            align="right"
          >
            <div className="dropdown-label">{t.exportFormatHeader}</div>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExport('glb');
                setOpenMenu(null);
              }}
            >
              <div>
                <strong>{t.exportGlbTitle}</strong>
                <div className="dropdown-sub">{t.exportGlbSub}</div>
              </div>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExport('gltf');
                setOpenMenu(null);
              }}
            >
              <div>
                <strong>{t.exportGltfTitle}</strong>
                <div className="dropdown-sub">{t.exportGltfSub}</div>
              </div>
            </button>
          </PortalDropdown>
        </div>

        <button
          type="button"
          className="icon-btn"
          onClick={onOpenSettings}
          title={t.settingsTitle}
          aria-label={t.settingsTitle}
        >
          <Settings size={16} />
        </button>

        <button
          type="button"
          className={`icon-btn ${isFullscreen ? 'active' : ''}`}
          onClick={onToggleFullscreen}
          title={t.fullscreen}
          aria-label={t.fullscreen}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

        <button
          type="button"
          className="icon-btn hide-xs"
          onClick={onOpenHelp}
          title={t.help}
          aria-label={t.help}
        >
          <HelpCircle size={16} />
        </button>

        <button
          type="button"
          className={`icon-btn desktop-only ${inspectorOpen ? 'active' : ''}`}
          onClick={onToggleInspector}
          title={t.toggleRightPanel}
          aria-label={t.toggleRightPanel}
        >
          <PanelRight size={16} />
        </button>
      </div>
    </header>
  );
};
