import React, { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  Trash2,
  Layers,
  Sliders,
  Palette,
  X,
  Copy,
  ArrowDownToLine,
  ChevronRight,
  Grid,
  Check,
} from 'lucide-react';
import {
  DEFAULT_SUBDIVISION_SETTINGS,
  ObjectSubdivisionSettings,
  PaintInteractionMode,
  PrimitiveKind,
  SceneObjectData,
  SubdivisionStats,
  Vec3,
} from '../types/studio';
import { PrimitiveShapePreview } from './ShapeIcons';
import {
  AdvancedColorMaterialPatch,
  ColorWheelPicker,
} from './ColorWheelPicker';
import { PaintBrushPayload } from '../engine/StudioEngine';

export type InspectorSubTab = 'transform' | 'color' | 'subdiv';

interface AxisInputProps {
  axis: 'X' | 'Y' | 'Z';
  value: number;
  step?: number;
  min?: number;
  onChange: (nextVal: number) => void;
}

const AxisInput: React.FC<AxisInputProps> = ({
  axis,
  value,
  step = 0.1,
  min,
  onChange,
}) => {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(Number(value.toFixed(2))));
    }
  }, [value, focused]);

  const commitValue = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      const clamped = min !== undefined ? Math.max(min, parsed) : parsed;
      onChange(clamped);
      setDraft(String(Number(clamped.toFixed(2))));
    } else {
      setDraft(String(Number(value.toFixed(2))));
    }
  };

  return (
    <label className={`axis-field axis-field-${axis.toLowerCase()}`}>
      <span className={`axis-pill axis-pill-${axis.toLowerCase()}`}>{axis}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = parseFloat(raw);
          if (Number.isFinite(parsed)) {
            const clamped = min !== undefined ? Math.max(min, parsed) : parsed;
            onChange(clamped);
          }
        }}
        onBlur={() => {
          setFocused(false);
          commitValue(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
};

function renderKindIcon(kind: PrimitiveKind) {
  return <PrimitiveShapePreview kind={kind} size={22} />;
}

interface InspectorPanelProps {
  objects: SceneObjectData[];
  selectedId: string | null;
  subdivStats: SubdivisionStats | null;
  paintMode: PaintInteractionMode;
  activeBrush: PaintBrushPayload;
  inspectorSubTab: InspectorSubTab;
  onChangeSubTab: (tab: InspectorSubTab) => void;
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
  onCollapseDesktop?: () => void;
  onSelectObject: (id: string) => void;
  onUpdateTransform: (
    id: string,
    patch: Partial<{ position: Vec3; rotation: Vec3; scale: Vec3 }>
  ) => void;
  onUpdateMaterial: (
    id: string | null,
    patch: AdvancedColorMaterialPatch & { name?: string; visible?: boolean },
    commitHistory?: boolean
  ) => void;
  onUpdateSubdivision: (
    id: string,
    patch: Partial<ObjectSubdivisionSettings>,
    commitHistory?: boolean
  ) => void;
  onChangePaintMode: (mode: PaintInteractionMode) => void;
  onCommitHistory: () => void;
  onDeleteObject: (id: string) => void;
  onDuplicateSelected: () => void;
  onDropToFloor: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  objects,
  selectedId,
  subdivStats,
  paintMode,
  activeBrush,
  inspectorSubTab,
  onChangeSubTab,
  isMobileDrawer = false,
  onCloseMobile,
  onCollapseDesktop,
  onSelectObject,
  onUpdateTransform,
  onUpdateMaterial,
  onUpdateSubdivision,
  onChangePaintMode,
  onCommitHistory,
  onDeleteObject,
  onDuplicateSelected,
  onDropToFloor,
}) => {
  const [mobileSection, setMobileSection] = useState<'inspector' | 'outliner'>(
    'inspector'
  );
  const selectedObject = objects.find((o) => o.id === selectedId) ?? null;
  const subdiv = selectedObject?.subdivision ?? DEFAULT_SUBDIVISION_SETTINGS;

  // Color source: selected object if any, otherwise active brush
  const displayColor = selectedObject?.color ?? activeBrush.color;
  const displayRoughness = selectedObject?.roughness ?? activeBrush.roughness;
  const displayMetalness = selectedObject?.metalness ?? activeBrush.metalness;
  const displayOpacity = selectedObject?.opacity ?? activeBrush.opacity;
  const displayEmissive = selectedObject?.emissive ?? activeBrush.emissive;
  const displayEmissiveInt =
    selectedObject?.emissiveIntensity ?? activeBrush.emissiveIntensity;
  const displayFlatShading =
    selectedObject?.flatShading ?? activeBrush.flatShading;

  return (
    <aside
      className={isMobileDrawer ? 'mobile-inspector-sheet' : 'desktop-inspector'}
      aria-label="Panel Properti, Warna RGB & Subdivision"
    >
      {isMobileDrawer ? (
        <div className="sheet-header">
          <div className="sheet-tabs">
            <button
              type="button"
              className={`sheet-tab ${
                mobileSection === 'inspector' ? 'active' : ''
              }`}
              onClick={() => setMobileSection('inspector')}
            >
              <Sliders size={14} />
              <span>Studio Objek</span>
            </button>
            <button
              type="button"
              className={`sheet-tab ${
                mobileSection === 'outliner' ? 'active' : ''
              }`}
              onClick={() => setMobileSection('outliner')}
            >
              <Layers size={14} />
              <span>Daftar ({objects.length})</span>
            </button>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onCloseMobile}
            aria-label="Tutup Panel"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div className="inspector-top-CollapseBar">
          <div className="section-title">
            <Layers size={14} />
            <span>Daftar Objek ({objects.length})</span>
          </div>
          {onCollapseDesktop && (
            <button
              type="button"
              className="sidebar-hide-arrow-btn"
              onClick={onCollapseDesktop}
              title="Sembunyikan Sidebar Kanan (>)"
              aria-label="Sembunyikan Sidebar Kanan"
            >
              <span>Sembunyi</span>
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      )}

      {/* Scene Outliner Section */}
      {(!isMobileDrawer || mobileSection === 'outliner') && (
        <section className="panel-section outliner-section">
          {objects.length === 0 ? (
            <div className="empty-hint">
              Belum ada objek. Buka menu <strong>Basic Shapes</strong> di bawah untuk mulai membangun.
            </div>
          ) : (
            <ul className="outliner-list">
              {objects.map((obj) => {
                const isSelected = obj.id === selectedId;
                return (
                  <li
                    key={obj.id}
                    className={`outliner-row ${isSelected ? 'selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="outliner-select-btn"
                      onClick={() => onSelectObject(obj.id)}
                    >
                      <span
                        className="outliner-color-dot"
                        style={{ backgroundColor: obj.color }}
                      />
                      {renderKindIcon(obj.kind)}
                      <span className="outliner-name">{obj.name}</span>
                      {obj.subdivision?.level > 0 && (
                        <span className="subdiv-mini-badge">
                          S{obj.subdivision.level}
                        </span>
                      )}
                    </button>

                    <div className="outliner-actions">
                      <button
                        type="button"
                        className="mini-icon-btn"
                        onClick={() =>
                          onUpdateMaterial(obj.id, { visible: !obj.visible }, true)
                        }
                        title={obj.visible ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {obj.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        className="mini-icon-btn danger"
                        onClick={() => onDeleteObject(obj.id)}
                        title="Hapus Objek"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Selected Object Studio: 3 Tabs (Transform | Warna RGB | Subdivision) */}
      {(!isMobileDrawer || mobileSection === 'inspector') && (
        <section className="panel-section properties-section">
          <div className="inspector-mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={inspectorSubTab === 'transform'}
              className={`insp-subtab ${
                inspectorSubTab === 'transform' ? 'active' : ''
              }`}
              onClick={() => onChangeSubTab('transform')}
            >
              <Sliders size={13} />
              <span>Transform</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorSubTab === 'color'}
              className={`insp-subtab ${
                inspectorSubTab === 'color' ? 'active' : ''
              }`}
              onClick={() => onChangeSubTab('color')}
            >
              <Palette size={13} />
              <span>Warna RGB</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorSubTab === 'subdiv'}
              className={`insp-subtab ${
                inspectorSubTab === 'subdiv' ? 'active' : ''
              }`}
              onClick={() => onChangeSubTab('subdiv')}
            >
              <Grid size={13} />
              <span>Subdiv</span>
            </button>
          </div>

          {/* TAB 2: WARNA RGB & MATERIAL (works both with selected object & Paint Bucket mode!) */}
          {inspectorSubTab === 'color' && (
            <ColorWheelPicker
              color={displayColor}
              roughness={displayRoughness}
              metalness={displayMetalness}
              opacity={displayOpacity}
              emissive={displayEmissive}
              emissiveIntensity={displayEmissiveInt}
              flatShading={displayFlatShading}
              paintMode={paintMode}
              hasSelection={Boolean(selectedObject)}
              onUpdateMaterial={(patch, commit) =>
                onUpdateMaterial(selectedObject?.id ?? null, patch, commit)
              }
              onChangePaintMode={onChangePaintMode}
              onCommitHistory={onCommitHistory}
            />
          )}

          {/* TAB 1: TRANSFORMASI */}
          {inspectorSubTab === 'transform' &&
            (!selectedObject ? (
              <div className="empty-hint">
                Ketuk salah satu bentuk 3D di kanvas untuk mengatur posisi, rotasi, dan ukurannya.
              </div>
            ) : (
              <div className="inspector-body">
                <div className="prop-group">
                  <label className="field-label" htmlFor="obj-name-input">
                    Nama Objek
                  </label>
                  <div className="name-row">
                    <input
                      id="obj-name-input"
                      type="text"
                      className="text-input"
                      value={selectedObject.name}
                      onChange={(e) =>
                        onUpdateMaterial(
                          selectedObject.id,
                          { name: e.target.value },
                          true
                        )
                      }
                    />
                  </div>

                  <div className="quick-action-row">
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={onDropToFloor}
                      title="Tempelkan ke permukaan atau lantai di bawahnya"
                    >
                      <ArrowDownToLine size={14} />
                      <span>Tempel</span>
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={onDuplicateSelected}
                      title="Duplikat Objek"
                    >
                      <Copy size={14} />
                      <span>Salin</span>
                    </button>
                    <button
                      type="button"
                      className="quick-btn danger"
                      onClick={() => onDeleteObject(selectedObject.id)}
                      title="Hapus Objek"
                    >
                      <Trash2 size={14} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>

                <div className="prop-group">
                  <div className="group-label-row">
                    <span className="field-label">Posisi (Meter)</span>
                  </div>
                  <div className="xyz-grid">
                    <AxisInput
                      axis="X"
                      value={selectedObject.position.x}
                      onChange={(x) =>
                        onUpdateTransform(selectedObject.id, {
                          position: { ...selectedObject.position, x },
                        })
                      }
                    />
                    <AxisInput
                      axis="Y"
                      value={selectedObject.position.y}
                      onChange={(y) =>
                        onUpdateTransform(selectedObject.id, {
                          position: { ...selectedObject.position, y },
                        })
                      }
                    />
                    <AxisInput
                      axis="Z"
                      value={selectedObject.position.z}
                      onChange={(z) =>
                        onUpdateTransform(selectedObject.id, {
                          position: { ...selectedObject.position, z },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="prop-group">
                  <div className="group-label-row">
                    <span className="field-label">Rotasi (Derajat °)</span>
                    <button
                      type="button"
                      className="reset-link"
                      onClick={() =>
                        onUpdateTransform(selectedObject.id, {
                          rotation: { x: 0, y: 0, z: 0 },
                        })
                      }
                    >
                      0°
                    </button>
                  </div>
                  <div className="xyz-grid">
                    <AxisInput
                      axis="X"
                      step={5}
                      value={selectedObject.rotation.x}
                      onChange={(x) =>
                        onUpdateTransform(selectedObject.id, {
                          rotation: { ...selectedObject.rotation, x },
                        })
                      }
                    />
                    <AxisInput
                      axis="Y"
                      step={5}
                      value={selectedObject.rotation.y}
                      onChange={(y) =>
                        onUpdateTransform(selectedObject.id, {
                          rotation: { ...selectedObject.rotation, y },
                        })
                      }
                    />
                    <AxisInput
                      axis="Z"
                      step={5}
                      value={selectedObject.rotation.z}
                      onChange={(z) =>
                        onUpdateTransform(selectedObject.id, {
                          rotation: { ...selectedObject.rotation, z },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="prop-group">
                  <div className="group-label-row">
                    <span className="field-label">Ukuran / Skala (Meter)</span>
                    <button
                      type="button"
                      className="reset-link"
                      onClick={() =>
                        onUpdateTransform(selectedObject.id, {
                          scale: { x: 1, y: 1, z: 1 },
                        })
                      }
                    >
                      1×1×1
                    </button>
                  </div>
                  <div className="xyz-grid">
                    <AxisInput
                      axis="X"
                      min={0.05}
                      value={selectedObject.scale.x}
                      onChange={(x) =>
                        onUpdateTransform(selectedObject.id, {
                          scale: { ...selectedObject.scale, x },
                        })
                      }
                    />
                    <AxisInput
                      axis="Y"
                      min={0.05}
                      value={selectedObject.scale.y}
                      onChange={(y) =>
                        onUpdateTransform(selectedObject.id, {
                          scale: { ...selectedObject.scale, y },
                        })
                      }
                    />
                    <AxisInput
                      axis="Z"
                      min={0.05}
                      value={selectedObject.scale.z}
                      onChange={(z) =>
                        onUpdateTransform(selectedObject.id, {
                          scale: { ...selectedObject.scale, z },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

          {/* TAB 3: ADVANCED SUBDIVISION SURFACE MODIFIER */}
          {inspectorSubTab === 'subdiv' &&
            (!selectedObject ? (
              <div className="empty-hint">
                Pilih objek 3D di kanvas terlebih dahulu untuk mengatur <strong>Subdivision Surface</strong> secara non-destruktif.
              </div>
            ) : (
              <div className="subdiv-studio-wrap">
                {/* Live Topology Telemetry */}
                <div className="subdiv-telemetry-card">
                  <div className="subdiv-stat-col">
                    <small>Segitiga Dasar</small>
                    <strong>{subdivStats?.baseTriangles ?? '—'}</strong>
                  </div>
                  <div className="subdiv-stat-arrow">→</div>
                  <div className="subdiv-stat-col highlight">
                    <small>Segitiga Aktif</small>
                    <strong>
                      {subdivStats?.subdivTriangles.toLocaleString() ?? '—'}
                    </strong>
                  </div>
                  <div className="subdiv-stat-col">
                    <small>Vertex</small>
                    <strong>
                      {subdivStats?.vertexCount.toLocaleString() ?? '—'}
                    </strong>
                  </div>
                </div>

                {subdivStats?.capped && (
                  <div className="subdiv-cap-notice">
                    Batas aman performa aktif (~42k segitiga) agar tetap mulus 60 FPS.
                  </div>
                )}

                {/* Subdivision Level (0..3) */}
                <div className="prop-group">
                  <div className="group-label-row">
                    <span className="field-label">Level Subdivision (0 – 3)</span>
                    {subdiv.level > 0 && (
                      <button
                        type="button"
                        className="reset-link"
                        onClick={() =>
                          onUpdateSubdivision(
                            selectedObject.id,
                            { ...DEFAULT_SUBDIVISION_SETTINGS },
                            true
                          )
                        }
                      >
                        Reset Asli
                      </button>
                    )}
                  </div>

                  <div className="segmented-pills">
                    {([0, 1, 2, 3] as const).map((lv) => (
                      <button
                        key={lv}
                        type="button"
                        className={`seg-pill ${
                          subdiv.level === lv ? 'active' : ''
                        }`}
                        onClick={() =>
                          onUpdateSubdivision(
                            selectedObject.id,
                            { level: lv },
                            true
                          )
                        }
                      >
                        Lv.{lv}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Algorithm Mode: Smooth Loop vs Simple Planar */}
                <div className="prop-group">
                  <span className="field-label">Algoritma Subdivision</span>
                  <div className="subdiv-mode-cards">
                    <button
                      type="button"
                      className={`grid-style-card ${
                        subdiv.mode === 'smooth' ? 'active' : ''
                      }`}
                      onClick={() =>
                        onUpdateSubdivision(
                          selectedObject.id,
                          {
                            mode: 'smooth',
                            level: subdiv.level === 0 ? 1 : subdiv.level,
                          },
                          true
                        )
                      }
                    >
                      <strong>Smooth (Loop)</strong>
                      <small>Membulatkan sudut secara organik</small>
                    </button>

                    <button
                      type="button"
                      className={`grid-style-card ${
                        subdiv.mode === 'simple' ? 'active' : ''
                      }`}
                      onClick={() =>
                        onUpdateSubdivision(
                          selectedObject.id,
                          {
                            mode: 'simple',
                            level: subdiv.level === 0 ? 1 : subdiv.level,
                          },
                          true
                        )
                      }
                    >
                      <strong>Simple (Planar)</strong>
                      <small>Pecah poligon rapat tetap siku</small>
                    </button>
                  </div>
                </div>

                {/* Edge Crease / Sharpness Control */}
                {subdiv.mode === 'smooth' && (
                  <div className="prop-group">
                    <div className="slider-head">
                      <span className="field-label">
                        Ketajaman Rusuk (Edge Crease)
                      </span>
                      <span>{Math.round(subdiv.crease * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      className="studio-range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={subdiv.crease}
                      onChange={(e) =>
                        onUpdateSubdivision(
                          selectedObject.id,
                          {
                            crease: parseFloat(e.target.value),
                            level: subdiv.level === 0 ? 1 : subdiv.level,
                          },
                          false
                        )
                      }
                      onPointerUp={onCommitHistory}
                    />
                    <div className="segmented-pills">
                      {[
                        { v: 0, label: '0% Organik' },
                        { v: 0.35, label: '35% Bantal' },
                        { v: 0.6, label: '60% Siku' },
                        { v: 0.9, label: '90% Tegas' },
                      ].map((p) => (
                        <button
                          key={p.v}
                          type="button"
                          className={`seg-pill ${
                            Math.abs(subdiv.crease - p.v) < 0.03 ? 'active' : ''
                          }`}
                          onClick={() =>
                            onUpdateSubdivision(
                              selectedObject.id,
                              {
                                crease: p.v,
                                level: subdiv.level === 0 ? 1 : subdiv.level,
                              },
                              true
                            )
                          }
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boundary Lock & Wireframe Overlay Toggles */}
                <div className="prop-group">
                  <button
                    type="button"
                    className={`snap-option-row compact ${
                      subdiv.lockBase ? 'checked' : ''
                    }`}
                    onClick={() =>
                      onUpdateSubdivision(
                        selectedObject.id,
                        { lockBase: !subdiv.lockBase },
                        true
                      )
                    }
                  >
                    <div className="snap-option-text">
                      <strong>Kunci Alas Bawah Tetap Rata</strong>
                      <span>
                        Jaga bagian bawah objek tetap menapak datar di lantai saat di-smooth
                      </span>
                    </div>
                    <span className="snap-check-box">
                      {subdiv.lockBase && <Check size={13} />}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`snap-option-row compact ${
                      subdiv.wireframe ? 'checked' : ''
                    }`}
                    onClick={() =>
                      onUpdateSubdivision(
                        selectedObject.id,
                        { wireframe: !subdiv.wireframe },
                        false
                      )
                    }
                  >
                    <div className="snap-option-text">
                      <strong>Tampilkan Jaring Poligon (Wireframe)</strong>
                      <span>
                        Perlihatkan garis pembelahan poligon hasil subdivision secara langsung
                      </span>
                    </div>
                    <span className="snap-check-box">
                      {subdiv.wireframe && <Check size={13} />}
                    </span>
                  </button>
                </div>
              </div>
            ))}
        </section>
      )}
    </aside>
  );
};
