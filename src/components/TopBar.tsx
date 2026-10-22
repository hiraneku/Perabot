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
} from 'lucide-react';
import { CameraPresetType } from '../engine/viewportHelpers';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  GridSettings,
  GridStyle,
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
      const menuWidth = menu?.offsetWidth || 280;
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

interface TopBarProps {
  language: AppLanguage;
  studioMode: StudioMode;
  projectName: string;
  isSavingProject: boolean;
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
  isSavingProject,
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

  return (
    <header className="topbar">
      {/* Pinned Left: Home + Compact Project Title + Undo/Redo */}
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
          <span className="project-save-dot" title={t.savedAuto}>
            {isSavingProject ? (
              <Loader2 size={11} className="spin-icon" />
            ) : (
              <Check size={11} />
            )}
          </span>
        </div>

        <div className="btn-cluster">
          <button
            type="button"
            className="icon-btn"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable Middle Track: Future-proof horizontal scroll container so new mechanics NEVER clip or push right buttons off-screen! */}
      <div className="topbar-center-scroll">
        <div className="topbar-center-inner">
          {/* Import 3D Model (.glb, .gltf, .obj, .stl, .ply, .fbx) */}
          <button
            type="button"
            className="chip-btn import-3d-chip"
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

          {/* 1. Smart Snapping Split Button */}
          <div className="dropdown-wrap" ref={snapRef}>
            <div className="split-btn">
              <button
                type="button"
                className={`chip-btn ${snapSettings.enabled ? 'active' : ''}`}
                onClick={() => onUpdateSnap({ enabled: !snapSettings.enabled })}
                title="Aktifkan / Matikan Sistem Snap Pintar"
              >
                <Magnet size={15} />
                <span>{t.snap}</span>
                {snapSettings.enabled && (
                  <span className="snap-badge">{activeSnapCount}</span>
                )}
              </button>
              <button
                type="button"
                className={`chip-caret ${snapSettings.enabled ? 'active' : ''}`}
                onClick={() => toggleMenu('snap')}
                aria-label="Pengaturan Snap Pintar"
                title="Atur Magnet Blok, Garis Sejajar & Snap Grid"
              >
                <ChevronDown size={13} />
              </button>
            </div>

            <PortalDropdown
              open={openMenu === 'snap'}
              anchorRef={snapRef}
              onClose={() => setOpenMenu(null)}
              className="snap-popover"
            >
              <div className="snap-popover-head">
                <span>Sistem Snap Pintar</span>
                <button
                  type="button"
                  className={`mini-toggle-pill ${snapSettings.enabled ? 'on' : ''}`}
                  onClick={() => onUpdateSnap({ enabled: !snapSettings.enabled })}
                >
                  {snapSettings.enabled ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <div className="snap-subblock">
                <button
                  type="button"
                  className={`snap-option-row compact ${
                    snapSettings.objectMagnet ? 'checked' : ''
                  }`}
                  onClick={() =>
                    onUpdateSnap({
                      enabled: true,
                      objectMagnet: !snapSettings.objectMagnet,
                    })
                  }
                >
                  <div className="snap-option-text">
                    <strong>Magnet Blok & Sudut</strong>
                    <span>
                      Tempel rapat permukaan, garis tepi & sudut otomatis saat blok berdekatan
                    </span>
                  </div>
                  <span className="snap-check-box">
                    {snapSettings.objectMagnet && <Check size={13} />}
                  </span>
                </button>
                {snapSettings.objectMagnet && (
                  <div className="segmented-pills">
                    {(
                      [
                        { id: 'subtle', label: 'Halus' },
                        { id: 'normal', label: 'Normal' },
                        { id: 'strong', label: 'Kuat' },
                      ] as Array<{ id: MagnetStrength; label: string }>
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`seg-pill ${
                          snapSettings.magnetStrength === item.id ? 'active' : ''
                        }`}
                        onClick={() =>
                          onUpdateSnap({
                            enabled: true,
                            magnetStrength: item.id,
                          })
                        }
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className={`snap-option-row ${snapSettings.alignment ? 'checked' : ''}`}
                onClick={() =>
                  onUpdateSnap({ enabled: true, alignment: !snapSettings.alignment })
                }
              >
                <div className="snap-option-text">
                  <strong>Garis Sejajar (Alignment)</strong>
                  <span>Garis bantu laser saat lurus tengah/tepi dengan objek jauh</span>
                </div>
                <span className="snap-check-box">
                  {snapSettings.alignment && <Check size={13} />}
                </span>
              </button>

              <div className="snap-subblock">
                <button
                  type="button"
                  className={`snap-option-row compact ${
                    snapSettings.grid ? 'checked' : ''
                  }`}
                  onClick={() =>
                    onUpdateSnap({ enabled: true, grid: !snapSettings.grid })
                  }
                >
                  <div className="snap-option-text">
                    <strong>Snap Grid ({snapSettings.gridStep}m)</strong>
                    <span>Kunci langkah geser & skala ke ukuran petak grid</span>
                  </div>
                  <span className="snap-check-box">
                    {snapSettings.grid && <Check size={13} />}
                  </span>
                </button>
                {snapSettings.grid && (
                  <div className="segmented-pills">
                    {[0.1, 0.25, 0.5, 1.0, 2.0].map((step) => (
                      <button
                        key={step}
                        type="button"
                        className={`seg-pill ${
                          Math.abs(snapSettings.gridStep - step) < 0.001 ? 'active' : ''
                        }`}
                        onClick={() =>
                          onUpdateSnap({ enabled: true, gridStep: step })
                        }
                      >
                        {step}m
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PortalDropdown>
          </div>

          {/* 2. Surface Alignment Split Button */}
          <div className="dropdown-wrap" ref={surfaceRef}>
            <div className="split-btn">
              <button
                type="button"
                className={`chip-btn ${surfaceSettings.enabled ? 'active-emerald' : ''}`}
                onClick={() =>
                  onUpdateSurface({ enabled: !surfaceSettings.enabled }, false)
                }
                title="Aktifkan / Matikan Fitur Surface Alignment & Terrain Conforming (T)"
              >
                <Layers size={15} />
                <span>{t.surface}</span>
              </button>
              <button
                type="button"
                className={`chip-caret ${
                  surfaceSettings.enabled ? 'active-emerald' : ''
                }`}
                onClick={() => toggleMenu('surface')}
                aria-label="Pengaturan Surface Alignment & Terrain Conforming"
                title="Atur Align to Surface Normal, Sisi Tempel & Terrain Conforming"
              >
                <ChevronDown size={13} />
              </button>
            </div>

            <PortalDropdown
              open={openMenu === 'surface'}
              anchorRef={surfaceRef}
              onClose={() => setOpenMenu(null)}
              className="surface-popover"
            >
              <div className="snap-popover-head">
                <span>Surface Alignment & Terrain</span>
                <button
                  type="button"
                  className={`mini-toggle-pill emerald ${
                    surfaceSettings.enabled ? 'on' : ''
                  }`}
                  onClick={() =>
                    onUpdateSurface({ enabled: !surfaceSettings.enabled }, false)
                  }
                >
                  {surfaceSettings.enabled ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <div className="snap-subblock">
                <div className="grid-section-title">Mode Orientasi Permukaan</div>
                <div className="surface-mode-cards">
                  {(
                    [
                      {
                        id: 'align-normal',
                        title: 'Ikuti Normal (Align Normal)',
                        sub: 'Miring presisi mengikuti kemiringan atap, dinding, kubah & bukit',
                      },
                      {
                        id: 'upright-follow',
                        title: 'Tegak Ikuti Kontur',
                        sub: 'Tetap berdiri tegak lurus sambil mengikuti tinggi permukaan / tanah',
                      },
                      {
                        id: 'foundation-seat',
                        title: 'Fondasi Lereng (Anti-Melayang)',
                        sub: 'Tanam sudut tapak terendah bangunan ke lereng miring',
                      },
                    ] as Array<{
                      id: SurfaceConformMode;
                      title: string;
                      sub: string;
                    }>
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`surface-mode-card ${
                        surfaceSettings.conformMode === item.id ? 'active' : ''
                      }`}
                      onClick={() =>
                        onUpdateSurface(
                          { enabled: true, conformMode: item.id },
                          true
                        )
                      }
                    >
                      <div className="surface-card-head">
                        <strong>{item.title}</strong>
                        {surfaceSettings.conformMode === item.id && (
                          <Check size={13} />
                        )}
                      </div>
                      <small>{item.sub}</small>
                    </button>
                  ))}
                </div>
              </div>

              {surfaceSettings.conformMode === 'align-normal' && (
                <div className="snap-subblock">
                  <div className="grid-section-title">
                    Sisi Objek yang Menempel ke Permukaan
                  </div>
                  <div className="segmented-pills">
                    {(
                      [
                        { id: 'auto', label: 'Pintar' },
                        { id: '-y', label: 'Alas (-Y)' },
                        { id: '-z', label: 'Belakang (-Z)' },
                        { id: '+y', label: 'Atas (+Y)' },
                      ] as Array<{ id: SurfaceAttachAxis; label: string }>
                    ).map((ax) => (
                      <button
                        key={ax.id}
                        type="button"
                        className={`seg-pill ${
                          surfaceSettings.attachAxis === ax.id ? 'active' : ''
                        }`}
                        onClick={() =>
                          onUpdateSurface(
                            { enabled: true, attachAxis: ax.id },
                            true
                          )
                        }
                      >
                        {ax.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="snap-subblock">
                <button
                  type="button"
                  className={`snap-option-row compact ${
                    surfaceSettings.autoOnMove ? 'checked' : ''
                  }`}
                  onClick={() =>
                    onUpdateSurface({
                      enabled: true,
                      autoOnMove: !surfaceSettings.autoOnMove,
                    })
                  }
                >
                  <div className="snap-option-text">
                    <strong>Ikuti Otomatis saat Geser</strong>
                    <span>
                      Seret objek terpilih atau panah XZ untuk meluncur mengikuti permukaan
                    </span>
                  </div>
                  <span className="snap-check-box">
                    {surfaceSettings.autoOnMove && <Check size={13} />}
                  </span>
                </button>

                <button
                  type="button"
                  className={`snap-option-row compact ${
                    surfaceSettings.clickToPlace ? 'checked' : ''
                  }`}
                  onClick={() =>
                    onUpdateSurface({
                      enabled: true,
                      clickToPlace: !surfaceSettings.clickToPlace,
                    })
                  }
                >
                  <div className="snap-option-text">
                    <strong>Klik Target Permukaan (1-Tap Place)</strong>
                    <span>
                      Ketuk bidang atap/dinding/bukit mana saja untuk memindahkan objek terpilih ke sana
                    </span>
                  </div>
                  <span className="snap-check-box">
                    {surfaceSettings.clickToPlace && <Check size={13} />}
                  </span>
                </button>
              </div>

              <div className="snap-subblock">
                <div className="grid-row-between">
                  <span className="grid-section-title">
                    Putar di Permukaan: <b>{surfaceSettings.spinDeg}°</b>
                  </span>
                  <div className="mini-preset-btns">
                    {[0, 90, 180, -90].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        className={`mini-floor-btn ${
                          surfaceSettings.spinDeg === deg ? 'active' : ''
                        }`}
                        onClick={() =>
                          onUpdateSurface({ spinDeg: deg }, true)
                        }
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  className="studio-range"
                  min={-180}
                  max={180}
                  step={15}
                  value={surfaceSettings.spinDeg}
                  onChange={(e) =>
                    onUpdateSurface(
                      { spinDeg: parseInt(e.target.value, 10) },
                      true
                    )
                  }
                />

                <div className="grid-row-between" style={{ marginTop: 8 }}>
                  <span className="grid-section-title">
                    Offset Jarak Normal: <b>{surfaceSettings.offset.toFixed(2)}m</b>
                  </span>
                  <button
                    type="button"
                    className="mini-floor-btn"
                    onClick={() => onUpdateSurface({ offset: 0 }, true)}
                  >
                    Reset 0m
                  </button>
                </div>
                <input
                  type="range"
                  className="studio-range"
                  min={-0.2}
                  max={0.3}
                  step={0.02}
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
                <span>Tempel Objek Terpilih ke Bawah Sekarang</span>
              </button>
            </PortalDropdown>
          </div>

          {/* 3. World / Tile / Terrain Grid Split Button */}
          <div className="dropdown-wrap" ref={gridRef}>
            <div className="split-btn">
              <button
                type="button"
                className={`chip-btn ${
                  gridSettings.visible
                    ? gridSettings.style === 'terrain'
                      ? 'active-emerald'
                      : 'active-subtle'
                    : ''
                }`}
                onClick={() => onUpdateGrid({ visible: !gridSettings.visible })}
                title="Tampilkan / Sembunyikan World Grid & Terrain"
              >
                {gridSettings.style === 'terrain' ? (
                  <Mountain size={15} />
                ) : (
                  <Grid3x3 size={15} />
                )}
                <span>
                  {gridSettings.style === 'terrain'
                    ? 'Terrain'
                    : gridSettings.style === 'tile'
                    ? 'Tile'
                    : t.grid}
                </span>
                <span className="grid-step-tag">{gridSettings.spacing}m</span>
              </button>
              <button
                type="button"
                className={`chip-caret ${
                  gridSettings.visible
                    ? gridSettings.style === 'terrain'
                      ? 'active-emerald'
                      : 'active-subtle'
                    : ''
                }`}
                onClick={() => toggleMenu('grid')}
                aria-label="Pengaturan World Grid, Tile Grid & Terrain Grid"
                title="Atur Gaya Grid, Spasi Petak, Tile & 3D Terrain"
              >
                <ChevronDown size={13} />
              </button>
            </div>

            <PortalDropdown
              open={openMenu === 'grid'}
              anchorRef={gridRef}
              onClose={() => setOpenMenu(null)}
              className="grid-popover"
            >
              <div className="snap-popover-head">
                <span>World, Tile & Terrain Grid</span>
                <button
                  type="button"
                  className={`mini-toggle-pill ${gridSettings.visible ? 'on' : ''}`}
                  onClick={() => onUpdateGrid({ visible: !gridSettings.visible })}
                >
                  {gridSettings.visible ? 'Tampil' : 'Sembunyi'}
                </button>
              </div>

              <div className="snap-subblock">
                <div className="grid-section-title">Gaya Lantai & Grid</div>
                <div className="grid-style-cards">
                  {(
                    [
                      { id: 'wire', title: 'World Grid', sub: 'Garis standar' },
                      { id: 'tile', title: 'Tile Grid', sub: 'Ubin arsitektur' },
                      { id: 'blueprint', title: 'Blueprint', sub: 'CAD biru teknis' },
                      { id: 'terrain', title: 'Terrain 3D', sub: 'Kontur tanah' },
                    ] as Array<{ id: GridStyle; title: string; sub: string }>
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`grid-style-card ${
                        gridSettings.style === st.id ? 'active' : ''
                      }`}
                      onClick={() =>
                        onUpdateGrid({ visible: true, style: st.id })
                      }
                    >
                      <strong>{st.title}</strong>
                      <small>{st.sub}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="snap-subblock">
                <div className="grid-row-between">
                  <span className="grid-section-title">
                    Spasi Petak Grid: <b>{gridSettings.spacing}m</b>
                  </span>
                  <button
                    type="button"
                    className={`mini-link-pill ${gridSettings.syncSnap ? 'active' : ''}`}
                    onClick={() => onUpdateGrid({ syncSnap: !gridSettings.syncSnap })}
                    title="Otomatis samakan langkah Snap Grid dengan spasi petak"
                  >
                    {gridSettings.syncSnap && <Check size={11} />}
                    <span>Sinkron Snap</span>
                  </button>
                </div>

                <div className="segmented-pills">
                  {[0.25, 0.5, 1.0, 2.0].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      className={`seg-pill ${
                        Math.abs(gridSettings.spacing - sp) < 0.001 ? 'active' : ''
                      }`}
                      onClick={() => onUpdateGrid({ spacing: sp })}
                    >
                      {sp}m
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  className="studio-range"
                  min={0.1}
                  max={2.5}
                  step={0.05}
                  value={gridSettings.spacing}
                  onChange={(e) =>
                    onUpdateGrid({ spacing: Number(e.target.value) })
                  }
                />
              </div>

              {gridSettings.style === 'terrain' && (
                <div className="snap-subblock terrain-highlight-block">
                  <div className="grid-section-title">Bentuk Kontur Terrain 3D</div>
                  <div className="segmented-pills">
                    {(
                      [
                        { id: 'hills', label: 'Bukit' },
                        { id: 'valley', label: 'Lembah' },
                        { id: 'terraced', label: 'Terasering' },
                        { id: 'flat', label: 'Datar' },
                      ] as Array<{ id: TerrainPreset; label: string }>
                    ).map((tp) => (
                      <button
                        key={tp.id}
                        type="button"
                        className={`seg-pill ${
                          gridSettings.terrainPreset === tp.id ? 'active' : ''
                        }`}
                        onClick={() => onUpdateGrid({ terrainPreset: tp.id })}
                      >
                        {tp.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid-slider-pair">
                    <label>
                      <span>
                        Tinggi Kontur ({gridSettings.terrainAmplitude.toFixed(1)}m)
                      </span>
                      <input
                        type="range"
                        className="studio-range"
                        min={0.3}
                        max={4.0}
                        step={0.1}
                        value={gridSettings.terrainAmplitude}
                        onChange={(e) =>
                          onUpdateGrid({ terrainAmplitude: Number(e.target.value) })
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="snap-subblock">
                <div className="grid-two-col">
                  <div>
                    <div className="grid-section-title">Subdivisi Petak</div>
                    <div className="segmented-pills">
                      {[2, 4, 5, 10].map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          className={`seg-pill ${
                            gridSettings.subdivisions === sub ? 'active' : ''
                          }`}
                          onClick={() => onUpdateGrid({ subdivisions: sub })}
                        >
                          {sub}×
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="grid-section-title">Luas Dunia</div>
                    <div className="segmented-pills">
                      {[20, 40, 80, 120].map((ws) => (
                        <button
                          key={ws}
                          type="button"
                          className={`seg-pill ${
                            gridSettings.worldSize === ws ? 'active' : ''
                          }`}
                          onClick={() => onUpdateGrid({ worldSize: ws })}
                        >
                          {ws}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="snap-subblock">
                <div className="grid-row-between">
                  <span className="grid-section-title">
                    Elevasi Lantai Kerja (Y = {gridSettings.elevationY.toFixed(1)}m)
                  </span>
                  <div className="mini-preset-btns">
                    {[
                      { y: 0, label: 'Lt.1 (0m)' },
                      { y: 3, label: 'Lt.2 (3m)' },
                      { y: 6, label: 'Lt.3 (6m)' },
                    ].map((lv) => (
                      <button
                        key={lv.y}
                        type="button"
                        className={`mini-floor-btn ${
                          Math.abs(gridSettings.elevationY - lv.y) < 0.05 ? 'active' : ''
                        }`}
                        onClick={() => onUpdateGrid({ elevationY: lv.y })}
                      >
                        {lv.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  className="studio-range"
                  min={-3}
                  max={12}
                  step={0.5}
                  value={gridSettings.elevationY}
                  onChange={(e) =>
                    onUpdateGrid({ elevationY: Number(e.target.value) })
                  }
                />

                <div className="grid-footer-row">
                  <button
                    type="button"
                    className={`mini-link-pill ${gridSettings.showAxes ? 'active' : ''}`}
                    onClick={() => onUpdateGrid({ showAxes: !gridSettings.showAxes })}
                  >
                    {gridSettings.showAxes && <Check size={11} />}
                    <span>{gridSettings.showAxes ? 'Sumbu X/Z Aktif' : 'Sumbu X/Z Mati'}</span>
                  </button>

                  <label className="opacity-inline">
                    <span>Opasitas</span>
                    <input
                      type="range"
                      className="studio-range compact"
                      min={0.2}
                      max={1}
                      step={0.05}
                      value={gridSettings.opacity}
                      onChange={(e) =>
                        onUpdateGrid({ opacity: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
              </div>
            </PortalDropdown>
          </div>

          {/* Interior Peek ("Intip Ruang") */}
          <button
            type="button"
            className={`chip-btn ${interiorPeek ? 'active' : ''}`}
            onClick={onToggleInteriorPeek}
            title={t.peekInterior}
          >
            <Eye size={15} />
            <span>{t.peekInterior}</span>
          </button>

          {/* First-Person Walkthrough ("Jalan Kaki") */}
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
            title="Fokus ke Objek / Reset Kamera (F)"
          >
            <Focus size={15} />
            <span>Fokus</span>
          </button>

          {/* Quick Camera Views */}
          <div className="dropdown-wrap" ref={viewRef}>
            <button
              type="button"
              className="chip-btn"
              onClick={() => toggleMenu('view')}
              title="Sudut Pandang Kamera"
            >
              <Camera size={15} />
              <span>Sudut</span>
              <ChevronDown size={13} />
            </button>

            <PortalDropdown
              open={openMenu === 'view'}
              anchorRef={viewRef}
              onClose={() => setOpenMenu(null)}
            >
              <div className="dropdown-label">Kamera Cepat</div>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onCameraPreset('perspective');
                  setOpenMenu(null);
                }}
              >
                <span>Perspektif 3D</span>
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
                <span>Tampak Depan (Z)</span>
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
                <span>Tampak Samping (X)</span>
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
                <span>Tampak Atas (Y)</span>
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
            title="Export 3D (.glb / .gltf)"
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
            <div className="dropdown-label">Format File 3D</div>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExport('glb');
                setOpenMenu(null);
              }}
            >
              <div>
                <strong>Ekspor .GLB</strong>
                <div className="dropdown-sub">Biner tunggal (Blender, Godot, Unity)</div>
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
                <strong>Ekspor .GLTF</strong>
                <div className="dropdown-sub">Format JSON standar glTF 2.0</div>
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
          title="Fullscreen"
          aria-label="Fullscreen"
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
          title="Buka / Tutup Sidebar Properti"
          aria-label="Panel Properti"
        >
          <PanelRight size={16} />
        </button>
      </div>
    </header>
  );
};
