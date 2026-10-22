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
} from 'lucide-react';
import {
  MATERIAL_PRESETS,
  PrimitiveKind,
  SceneObjectData,
  Vec3,
} from '../types/studio';
import {
  CubeShapeIcon,
  CylinderShapeIcon,
  TriangleShapeIcon,
} from './ShapeIcons';

interface AxisInputProps {
  axis: 'X' | 'Y' | 'Z';
  value: number;
  step?: number;
  min?: number;
  unit?: string;
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
  switch (kind) {
    case 'cube':
      return <CubeShapeIcon size={18} />;
    case 'triangle':
      return <TriangleShapeIcon size={18} />;
    case 'cylinder':
      return <CylinderShapeIcon size={18} />;
  }
}

interface InspectorPanelProps {
  objects: SceneObjectData[];
  selectedId: string | null;
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
  onSelectObject: (id: string) => void;
  onUpdateTransform: (
    id: string,
    patch: Partial<{ position: Vec3; rotation: Vec3; scale: Vec3 }>
  ) => void;
  onUpdateMaterial: (
    id: string,
    patch: Partial<{
      name: string;
      color: string;
      roughness: number;
      metalness: number;
      visible: boolean;
    }>
  ) => void;
  onDeleteObject: (id: string) => void;
  onDuplicateSelected: () => void;
  onDropToFloor: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  objects,
  selectedId,
  isMobileDrawer = false,
  onCloseMobile,
  onSelectObject,
  onUpdateTransform,
  onUpdateMaterial,
  onDeleteObject,
  onDuplicateSelected,
  onDropToFloor,
}) => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'outliner'>('inspector');
  const selectedObject = objects.find((o) => o.id === selectedId) ?? null;

  return (
    <aside
      className={isMobileDrawer ? 'mobile-inspector-sheet' : 'desktop-inspector'}
      aria-label="Panel Properti & Daftar Objek"
    >
      {isMobileDrawer && (
        <div className="sheet-header">
          <div className="sheet-tabs">
            <button
              type="button"
              className={`sheet-tab ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveTab('inspector')}
            >
              <Sliders size={14} />
              <span>Properti</span>
            </button>
            <button
              type="button"
              className={`sheet-tab ${activeTab === 'outliner' ? 'active' : ''}`}
              onClick={() => setActiveTab('outliner')}
            >
              <Layers size={14} />
              <span>Objek ({objects.length})</span>
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
      )}

      {/* Scene Outliner Section */}
      {(!isMobileDrawer || activeTab === 'outliner') && (
        <section className="panel-section outliner-section">
          {!isMobileDrawer && (
            <div className="section-header">
              <div className="section-title">
                <Layers size={14} />
                <span>Daftar Objek</span>
              </div>
              <span className="section-badge">{objects.length}</span>
            </div>
          )}

          {objects.length === 0 ? (
            <div className="empty-hint">
              Belum ada objek. Pilih <strong>Kubus</strong>, <strong>Segitiga</strong>, atau{' '}
              <strong>Silinder</strong> untuk mulai membangun.
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
                    </button>

                    <div className="outliner-actions">
                      <button
                        type="button"
                        className="mini-icon-btn"
                        onClick={() =>
                          onUpdateMaterial(obj.id, { visible: !obj.visible })
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

      {/* Selected Object Properties Section */}
      {(!isMobileDrawer || activeTab === 'inspector') && (
        <section className="panel-section inspector-body">
          {!isMobileDrawer && (
            <div className="section-header">
              <div className="section-title">
                <Sliders size={14} />
                <span>Transformasi & Material</span>
              </div>
            </div>
          )}

          {!selectedObject ? (
            <div className="empty-hint">
              Klik salah satu objek di area 3D untuk memunculkan{' '}
              <strong>panah Merah, Hijau, Biru</strong> dan mengatur ukuran atau warnanya.
            </div>
          ) : (
            <div className="prop-stack">
              {/* Name + Quick Actions */}
              <div className="prop-name-row">
                <input
                  type="text"
                  className="name-input"
                  value={selectedObject.name}
                  onChange={(e) =>
                    onUpdateMaterial(selectedObject.id, { name: e.target.value })
                  }
                  aria-label="Nama Objek"
                />
                <button
                  type="button"
                  className="mini-action-btn"
                  onClick={onDropToFloor}
                  title="Turunkan ke Lantai (Y=0)"
                >
                  <ArrowDownToLine size={15} />
                </button>
                <button
                  type="button"
                  className="mini-action-btn"
                  onClick={onDuplicateSelected}
                  title="Duplikat Objek"
                >
                  <Copy size={15} />
                </button>
              </div>

              {/* Axis Legend Reminder */}
              <div className="axis-legend">
                <span>
                  <i className="dot-x" /> X Kanan/Kiri
                </span>
                <span>
                  <i className="dot-y" /> Y Atas/Bawah
                </span>
                <span>
                  <i className="dot-z" /> Z Depan/Belakang
                </span>
              </div>

              {/* Position */}
              <div className="prop-group">
                <div className="prop-label">Posisi (meter)</div>
                <div className="axis-grid">
                  <AxisInput
                    axis="X"
                    value={selectedObject.position.x}
                    step={0.1}
                    onChange={(x) =>
                      onUpdateTransform(selectedObject.id, {
                        position: { ...selectedObject.position, x },
                      })
                    }
                  />
                  <AxisInput
                    axis="Y"
                    value={selectedObject.position.y}
                    step={0.1}
                    onChange={(y) =>
                      onUpdateTransform(selectedObject.id, {
                        position: { ...selectedObject.position, y },
                      })
                    }
                  />
                  <AxisInput
                    axis="Z"
                    value={selectedObject.position.z}
                    step={0.1}
                    onChange={(z) =>
                      onUpdateTransform(selectedObject.id, {
                        position: { ...selectedObject.position, z },
                      })
                    }
                  />
                </div>
              </div>

              {/* Scale / Dimensions */}
              <div className="prop-group">
                <div className="prop-label">Ukuran / Skala (meter)</div>
                <div className="axis-grid">
                  <AxisInput
                    axis="X"
                    value={selectedObject.scale.x}
                    step={0.1}
                    min={0.05}
                    onChange={(x) =>
                      onUpdateTransform(selectedObject.id, {
                        scale: { ...selectedObject.scale, x },
                      })
                    }
                  />
                  <AxisInput
                    axis="Y"
                    value={selectedObject.scale.y}
                    step={0.1}
                    min={0.05}
                    onChange={(y) =>
                      onUpdateTransform(selectedObject.id, {
                        scale: { ...selectedObject.scale, y },
                      })
                    }
                  />
                  <AxisInput
                    axis="Z"
                    value={selectedObject.scale.z}
                    step={0.1}
                    min={0.05}
                    onChange={(z) =>
                      onUpdateTransform(selectedObject.id, {
                        scale: { ...selectedObject.scale, z },
                      })
                    }
                  />
                </div>
              </div>

              {/* Rotation */}
              <div className="prop-group">
                <div className="prop-label">Rotasi (derajat °)</div>
                <div className="axis-grid">
                  <AxisInput
                    axis="X"
                    value={selectedObject.rotation.x}
                    step={15}
                    onChange={(x) =>
                      onUpdateTransform(selectedObject.id, {
                        rotation: { ...selectedObject.rotation, x },
                      })
                    }
                  />
                  <AxisInput
                    axis="Y"
                    value={selectedObject.rotation.y}
                    step={15}
                    onChange={(y) =>
                      onUpdateTransform(selectedObject.id, {
                        rotation: { ...selectedObject.rotation, y },
                      })
                    }
                  />
                  <AxisInput
                    axis="Z"
                    value={selectedObject.rotation.z}
                    step={15}
                    onChange={(z) =>
                      onUpdateTransform(selectedObject.id, {
                        rotation: { ...selectedObject.rotation, z },
                      })
                    }
                  />
                </div>
              </div>

              {/* Material & Color */}
              <div className="prop-group">
                <div className="prop-label-row">
                  <span className="prop-label">
                    <Palette size={13} /> Material & Warna
                  </span>
                  <label className="color-picker-chip" title="Pilih warna bebas">
                    <input
                      type="color"
                      value={selectedObject.color}
                      onChange={(e) =>
                        onUpdateMaterial(selectedObject.id, { color: e.target.value })
                      }
                    />
                    <span
                      className="color-swatch-preview"
                      style={{ backgroundColor: selectedObject.color }}
                    />
                    <code>{selectedObject.color.toUpperCase()}</code>
                  </label>
                </div>

                <div className="preset-grid">
                  {MATERIAL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`preset-swatch ${
                        selectedObject.color.toLowerCase() === preset.color.toLowerCase()
                          ? 'active'
                          : ''
                      }`}
                      onClick={() =>
                        onUpdateMaterial(selectedObject.id, {
                          color: preset.color,
                          roughness: preset.roughness,
                          metalness: preset.metalness,
                        })
                      }
                      title={preset.label}
                    >
                      <span
                        className="preset-dot"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="preset-name">{preset.label}</span>
                    </button>
                  ))}
                </div>

                <div className="slider-row">
                  <div className="slider-head">
                    <span>Kekasaran (Roughness)</span>
                    <span>{Math.round(selectedObject.roughness * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={selectedObject.roughness}
                    onChange={(e) =>
                      onUpdateMaterial(selectedObject.id, {
                        roughness: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="slider-row">
                  <div className="slider-head">
                    <span>Efek Logam (Metalness)</span>
                    <span>{Math.round(selectedObject.metalness * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={selectedObject.metalness}
                    onChange={(e) =>
                      onUpdateMaterial(selectedObject.id, {
                        metalness: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </aside>
  );
};
