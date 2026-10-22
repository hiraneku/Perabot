import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Magnet,
  Grid3x3,
  Focus,
  Download,
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
} from 'lucide-react';
import { CameraPresetType } from '../engine/viewportHelpers';
import {
  GridSettings,
  GridStyle,
  MagnetStrength,
  SnapSettings,
  SurfaceAttachAxis,
  SurfaceConformMode,
  SurfaceSettings,
  TerrainPreset,
} from '../types/studio';

interface TopBarProps {
  canUndo: boolean;
  canRedo: boolean;
  snapSettings: SnapSettings;
  surfaceSettings: SurfaceSettings;
  gridSettings: GridSettings;
  inspectorOpen: boolean;
  isFullscreen: boolean;
  hasSelection: boolean;
  objectCount: number;
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
  canUndo,
  canRedo,
  snapSettings,
  surfaceSettings,
  gridSettings,
  inspectorOpen,
  isFullscreen,
  hasSelection,
  objectCount,
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [snapMenuOpen, setSnapMenuOpen] = useState(false);
  const [surfaceMenuOpen, setSurfaceMenuOpen] = useState(false);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
      if (snapRef.current && !snapRef.current.contains(e.target as Node)) {
        setSnapMenuOpen(false);
      }
      if (surfaceRef.current && !surfaceRef.current.contains(e.target as Node)) {
        setSurfaceMenuOpen(false);
      }
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setGridMenuOpen(false);
      }
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleClickOutside);
    return () => window.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const activeSnapCount = [
    snapSettings.objectMagnet,
    snapSettings.alignment,
    snapSettings.grid,
  ].filter(Boolean).length;

  return (
    <header className="topbar">
      {/* Left: Brand + Undo/Redo */}
      <div className="topbar-group">
        <div className="brand-badge" title="Perabot 3D Studio">
          <span className="brand-dot-group" aria-hidden="true">
            <span className="axis-dot axis-x" />
            <span className="axis-dot axis-y" />
            <span className="axis-dot axis-z" />
          </span>
          <span className="brand-title">Perabot</span>
          <span className="brand-tag hide-xs">3D</span>
        </div>

        <div className="topbar-divider hide-xs" />

        <div className="btn-cluster">
          <button
            type="button"
            className="icon-btn"
            disabled={!canUndo}
            onClick={onUndo}
            title="Urungkan (Ctrl+Z)"
            aria-label="Urungkan"
          >
            <Undo2 size={17} />
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={!canRedo}
            onClick={onRedo}
            title="Ulangi (Ctrl+Y)"
            aria-label="Ulangi"
          >
            <Redo2 size={17} />
          </button>
        </div>
      </div>

      {/* Center: Snap, Surface Alignment, World/Terrain Grid, Focus, Camera */}
      <div className="topbar-group topbar-center">
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
              <span className="hide-xs">Snap</span>
              {snapSettings.enabled && (
                <span className="snap-badge">{activeSnapCount}</span>
              )}
            </button>
            <button
              type="button"
              className={`chip-caret ${snapSettings.enabled ? 'active' : ''}`}
              onClick={() => setSnapMenuOpen((v) => !v)}
              aria-label="Pengaturan Snap Pintar"
              title="Atur Magnet Blok, Garis Sejajar & Snap Grid"
            >
              <ChevronDown size={13} />
            </button>
          </div>

          {snapMenuOpen && (
            <div className="dropdown-menu snap-popover">
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
            </div>
          )}
        </div>

        {/* 2. Standalone Surface Alignment & Terrain Conforming Split Button */}
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
              <span className="hide-xs">Surface</span>
            </button>
            <button
              type="button"
              className={`chip-caret ${
                surfaceSettings.enabled ? 'active-emerald' : ''
              }`}
              onClick={() => setSurfaceMenuOpen((v) => !v)}
              aria-label="Pengaturan Surface Alignment & Terrain Conforming"
              title="Atur Align to Surface Normal, Sisi Tempel & Terrain Conforming"
            >
              <ChevronDown size={13} />
            </button>
          </div>

          {surfaceMenuOpen && (
            <div className="dropdown-menu surface-popover">
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

              {/* Orientation / Conform Mode */}
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

              {/* Attach Face Selector (for Align to Normal) */}
              {surfaceSettings.conformMode === 'align-normal' && (
                <div className="snap-subblock">
                  <div className="grid-section-title">
                    Sisi Objek yang Menempel ke Permukaan
                  </div>
                  <div className="segmented-pills">
                    {(
                      [
                        { id: '-y', label: 'Alas (-Y)' },
                        { id: '-z', label: 'Belakang (-Z Dinding)' },
                        { id: '+y', label: 'Atas (+Y Plafon)' },
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

              {/* Interaction Toggles */}
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

              {/* Spin around normal & Normal offset */}
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
                onClick={onConformNow}
              >
                <ArrowDownToLine size={15} />
                <span>Tempel Objek Terpilih ke Bawah Sekarang</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Advanced World / Tile / Terrain Grid Split Button */}
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
              <span className="hide-sm">
                {gridSettings.style === 'terrain'
                  ? 'Terrain'
                  : gridSettings.style === 'tile'
                  ? 'Tile'
                  : 'Grid'}
              </span>
              <span className="grid-step-tag hide-md">{gridSettings.spacing}m</span>
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
              onClick={() => setGridMenuOpen((v) => !v)}
              aria-label="Pengaturan World Grid, Tile Grid & Terrain Grid"
              title="Atur Gaya Grid, Spasi Petak, Tile & 3D Terrain"
            >
              <ChevronDown size={13} />
            </button>
          </div>

          {gridMenuOpen && (
            <div className="dropdown-menu grid-popover">
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
                    {gridSettings.syncSnap ? '✓ Sinkron Snap' : 'Sinkron Snap'}
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
                    {gridSettings.showAxes ? '✓ Sumbu X/Z Aktif' : 'Sumbu X/Z Mati'}
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
            </div>
          )}
        </div>

        <button
          type="button"
          className="chip-btn hide-xs"
          onClick={onFocusCamera}
          title="Fokus ke Objek / Reset Kamera (F)"
        >
          <Focus size={15} />
          <span className="hide-md">Fokus</span>
        </button>

        <div className="dropdown-wrap hide-sm" ref={viewRef}>
          <button
            type="button"
            className="chip-btn"
            onClick={() => setViewMenuOpen((v) => !v)}
            title="Sudut Pandang Kamera"
          >
            <Camera size={15} />
            <span className="hide-md">Sudut</span>
            <ChevronDown size={13} />
          </button>

          {viewMenuOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-label">Kamera Cepat</div>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onCameraPreset('perspective');
                  setViewMenuOpen(false);
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
                  setViewMenuOpen(false);
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
                  setViewMenuOpen(false);
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
                  setViewMenuOpen(false);
                }}
              >
                <span>Tampak Atas (Y)</span>
                <kbd>7</kbd>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Fullscreen, Clear, Help, Export, Toggle Right Sidebar */}
      <div className="topbar-group">
        <button
          type="button"
          className={`icon-btn ${isFullscreen ? 'active' : ''}`}
          onClick={onToggleFullscreen}
          title={
            isFullscreen
              ? 'Keluar Mode Layar Penuh (Esc)'
              : 'Mode Layar Penuh (Fullscreen)'
          }
          aria-label="Mode Layar Penuh"
        >
          {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
        </button>

        {objectCount > 0 && (
          <button
            type="button"
            className="icon-btn danger-hover hide-sm"
            onClick={onClearScene}
            title="Bersihkan Semua Objek"
            aria-label="Bersihkan Scene"
          >
            <Trash2 size={16} />
          </button>
        )}

        <button
          type="button"
          className="icon-btn"
          onClick={onOpenHelp}
          title="Panduan Kontrol & Pintasan"
          aria-label="Panduan"
        >
          <HelpCircle size={17} />
        </button>

        <div className="dropdown-wrap" ref={exportRef}>
          <button
            type="button"
            className="primary-btn"
            onClick={() => setExportMenuOpen((v) => !v)}
            disabled={objectCount === 0}
            title="Ekspor ke file 3D (.glb / .gltf)"
          >
            <Download size={15} />
            <span className="hide-xs">Ekspor</span>
            <ChevronDown size={13} />
          </button>

          {exportMenuOpen && (
            <div className="dropdown-menu dropdown-right">
              <div className="dropdown-label">Format File 3D</div>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onExport('glb');
                  setExportMenuOpen(false);
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
                  setExportMenuOpen(false);
                }}
              >
                <div>
                  <strong>Ekspor .GLTF</strong>
                  <div className="dropdown-sub">Format JSON standar glTF 2.0</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`icon-btn desktop-only ${inspectorOpen ? 'active' : ''}`}
          onClick={onToggleInspector}
          title="Buka / Tutup Sidebar Properti"
          aria-label="Panel Properti"
        >
          <PanelRight size={17} />
        </button>
      </div>
    </header>
  );
};
