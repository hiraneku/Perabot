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
} from 'lucide-react';
import { CameraPresetType } from '../engine/viewportHelpers';
import { MagnetStrength, SnapSettings } from '../types/studio';

interface TopBarProps {
  canUndo: boolean;
  canRedo: boolean;
  snapSettings: SnapSettings;
  gridVisible: boolean;
  inspectorOpen: boolean;
  objectCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateSnap: (patch: Partial<SnapSettings>) => void;
  onToggleGrid: () => void;
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
  gridVisible,
  inspectorOpen,
  objectCount,
  onUndo,
  onRedo,
  onUpdateSnap,
  onToggleGrid,
  onFocusCamera,
  onCameraPreset,
  onExport,
  onClearScene,
  onToggleInspector,
  onOpenHelp,
}) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [snapMenuOpen, setSnapMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
      if (snapRef.current && !snapRef.current.contains(e.target as Node)) {
        setSnapMenuOpen(false);
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

      {/* Center: Consolidated Smart Snapping Menu, Grid, Focus, Camera Views */}
      <div className="topbar-group topbar-center">
        <div className="dropdown-wrap" ref={snapRef}>
          <div className="split-btn">
            <button
              type="button"
              className={`chip-btn ${snapSettings.enabled ? 'active' : ''}`}
              onClick={() => onUpdateSnap({ enabled: !snapSettings.enabled })}
              title="Aktifkan / Matikan Sistem Snap Pintar"
            >
              <Magnet size={15} />
              <span>Snap</span>
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

              {/* 1. Unified Magnet Blok & Sudut (Magnetic + Edge + Proximity combined) */}
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

              {/* 2. Garis Sejajar (Alignment Guides across distance) */}
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

              {/* 3. Snap to Grid */}
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
                    <strong>Snap Grid Lantai</strong>
                    <span>Kunci langkah geser & skala ke ukuran petak meter</span>
                  </div>
                  <span className="snap-check-box">
                    {snapSettings.grid && <Check size={13} />}
                  </span>
                </button>
                {snapSettings.grid && (
                  <div className="segmented-pills">
                    {[0.1, 0.25, 0.5, 1.0].map((step) => (
                      <button
                        key={step}
                        type="button"
                        className={`seg-pill ${
                          snapSettings.gridStep === step ? 'active' : ''
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

        <button
          type="button"
          className={`chip-btn hide-xs ${gridVisible ? 'active-subtle' : ''}`}
          onClick={onToggleGrid}
          title="Tampilkan / Sembunyikan Lantai Grid"
        >
          <Grid3x3 size={15} />
          <span className="hide-md">Grid</span>
        </button>

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
