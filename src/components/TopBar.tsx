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
} from 'lucide-react';
import { CameraPresetType } from '../engine/viewportHelpers';
import {
  GridSettings,
  GridStyle,
  MagnetStrength,
  SnapSettings,
  SurfaceConformMode,
  TerrainPreset,
} from '../types/studio';

interface TopBarProps {
  canUndo: boolean;
  canRedo: boolean;
  snapSettings: SnapSettings;
  gridSettings: GridSettings;
  inspectorOpen: boolean;
  objectCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateSnap: (patch: Partial<SnapSettings>) => void;
  onUpdateGrid: (patch: Partial<GridSettings>) => void;
  onFocusCamera: () => void;
  onCameraPreset: (preset: CameraPresetType) => void;
  onExport: (format: 'glb' | 'gltf') => void;
  onClearScene: () => void;
  onToggleInspector: () => void;
  onOpenHelp: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  canUndo,
  canRedo,
  snapSettings,
  gridSettings,
  inspectorOpen,
  objectCount,
  onUndo,
  onRedo,
  onUpdateSnap,
  onUpdateGrid,
  onFocusCamera,
  onCameraPreset,
  onExport,
  onClearScene,
  onToggleInspector,
  onOpenHelp,
}) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [snapMenuOpen, setSnapMenuOpen] = useState(false);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef<HTMLDivElement>(null);
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

      {/* Center: Smart Snapping, Advanced Grid & Terrain, Focus, Camera Views */}
      <div className="topbar-group topbar-center">
        {/* 1. Smart Snapping + Surface Conform Split Button */}
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
              aria-label="Pengaturan Snap & Surface Alignment"
              title="Atur Snap Pintar & Surface Conforming"
            >
              <ChevronDown size={13} />
            </button>
          </div>

          {snapMenuOpen && (
            <div className="dropdown-menu snap-popover">
              <div className="snap-popover-head">
                <span>Snap Pintar & Permukaan</span>
                <button
                  type="button"
                  className={`mini-toggle-pill ${snapSettings.enabled ? 'on' : ''}`}
                  onClick={() => onUpdateSnap({ enabled: !snapSettings.enabled })}
                >
                  {snapSettings.enabled ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {/* 1. Unified Magnet Blok & Sudut */}
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

              {/* 2. Garis Sejajar */}
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

              {/* 3. Snap Grid */}
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

              {/* Surface Alignment & Terrain Conforming Quick Preset */}
              <div className="snap-subblock">
                <div className="grid-section-title">
                  Mode Tempel Permukaan & Terrain (Alat Tempel / Conform)
                </div>
                <div className="segmented-pills">
                  {(
                    [
                      { id: 'align-normal', label: 'Ikuti Normal' },
                      { id: 'upright-follow', label: 'Tegak Kontur' },
                      { id: 'foundation-seat', label: 'Fondasi' },
                    ] as Array<{ id: SurfaceConformMode; label: string }>
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`seg-pill ${
                        snapSettings.surfaceConformMode === m.id ? 'active' : ''
                      }`}
                      onClick={() => onUpdateSnap({ surfaceConformMode: m.id })}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Advanced World / Tile / Terrain Grid Split Button */}
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

              {/* Grid Style Selector */}
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

              {/* Adjustable Grid Spacing */}
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

              {/* 3D Terrain Specific Controls */}
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

              {/* Subdivisions & World Size */}
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

              {/* Workplane Elevation & Axes / Opacity */}
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
          className="chip-btn"
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

      {/* Right: Clear, Help, Export (.glb/.gltf), Toggle Inspector */}
      <div className="topbar-group">
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
          title="Buka / Tutup Panel Properti"
          aria-label="Panel Properti"
        >
          <PanelRight size={17} />
        </button>
      </div>
    </header>
  );
};
