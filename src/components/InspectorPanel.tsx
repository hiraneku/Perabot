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
  Move3d,
  RotateCw,
  Maximize2,
  Sparkles,
  Ungroup,
  Boxes,
  RotateCcw,
  LayoutGrid,
} from 'lucide-react';
import { getLocalizedShapeMeta } from '../i18n/shapeTranslations';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  DEFAULT_SUBDIVISION_SETTINGS,
  isSubdivisionActive,
  normalizeSubdivisionSettings,
  ObjectSubdivisionSettings,
  PaintInteractionMode,
  PrimitiveKind,
  SceneObjectData,
  SubdivisionStats,
  Vec3,
} from '../types/studio';
import { PRIMITIVE_META } from '../engine/primitives';
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
  language: AppLanguage;
  objects: SceneObjectData[];
  selectedId: string | null;
  editSinglePartMode: boolean;
  subdivStats: SubdivisionStats | null;
  paintMode: PaintInteractionMode;
  activeBrush: PaintBrushPayload;
  inspectorSubTab: InspectorSubTab;
  onChangeSubTab: (tab: InspectorSubTab) => void;
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
  onCollapseDesktop?: () => void;
  onSelectObject: (id: string) => void;
  onToggleEditSinglePart: (enabled: boolean) => void;
  onGroupSceneObjects: () => void;
  onUngroupSelected: () => void;
  onSaveAsCustomAsset: (customName?: string) => void;
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
  onSplitSubBlocks: () => void;
  onChangePaintMode: (mode: PaintInteractionMode) => void;
  onCommitHistory: () => void;
  onDeleteObject: (id: string) => void;
  onDuplicateSelected: () => void;
  onDropToFloor: () => void;
  onResetImportedMaterial?: (id: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  language,
  objects,
  selectedId,
  editSinglePartMode,
  subdivStats,
  paintMode,
  activeBrush,
  inspectorSubTab,
  onChangeSubTab,
  isMobileDrawer = false,
  onCloseMobile,
  onCollapseDesktop,
  onSelectObject,
  onToggleEditSinglePart,
  onGroupSceneObjects,
  onUngroupSelected,
  onSaveAsCustomAsset,
  onUpdateTransform,
  onUpdateMaterial,
  onUpdateSubdivision,
  onSplitSubBlocks,
  onChangePaintMode,
  onCommitHistory,
  onDeleteObject,
  onDuplicateSelected,
  onDropToFloor,
  onResetImportedMaterial,
}) => {
  const t = TRANSLATIONS[language];
  const [mobileSection, setMobileSection] = useState<'inspector' | 'outliner'>(
    'inspector'
  );
  const [uniformScale, setUniformScale] = useState(false);

  const selected = objects.find((o) => o.id === selectedId) ?? null;

  const currentSubdiv = normalizeSubdivisionSettings(
    selected?.subdivision ?? DEFAULT_SUBDIVISION_SETTINGS
  );
  const subdivActive = isSubdivisionActive(currentSubdiv);
  const totalCells =
    currentSubdiv.cutsX * currentSubdiv.cutsY * currentSubdiv.cutsZ;

  const activeColor = selected ? selected.color : activeBrush.color;
  const activeRoughness = selected ? selected.roughness : activeBrush.roughness;
  const activeMetalness = selected ? selected.metalness : activeBrush.metalness;
  const activeOpacity = selected
    ? selected.opacity ?? 1
    : activeBrush.opacity ?? 1;
  const activeEmissive = selected
    ? selected.emissive ?? '#000000'
    : activeBrush.emissive ?? '#000000';
  const activeEmissiveIntensity = selected
    ? selected.emissiveIntensity ?? 0
    : activeBrush.emissiveIntensity ?? 0;
  const activeFlatShading = selected
    ? selected.flatShading ?? false
    : activeBrush.flatShading ?? false;

  const handleScaleChange = (axis: 'x' | 'y' | 'z', nextVal: number) => {
    if (!selected) return;
    const safeVal = Math.max(0.05, nextVal);
    if (!uniformScale) {
      onUpdateTransform(selected.id, {
        scale: { ...selected.scale, [axis]: safeVal },
      });
      return;
    }
    const prevAxisVal = Math.max(0.05, selected.scale[axis]);
    const ratio = safeVal / prevAxisVal;
    onUpdateTransform(selected.id, {
      scale: {
        x: Math.max(0.05, Number((selected.scale.x * ratio).toFixed(3))),
        y: Math.max(0.05, Number((selected.scale.y * ratio).toFixed(3))),
        z: Math.max(0.05, Number((selected.scale.z * ratio).toFixed(3))),
      },
    });
  };

  const selectedKindMeta = selected
    ? getLocalizedShapeMeta(PRIMITIVE_META[selected.kind], language)
    : null;

  return (
    <aside
      className={`inspector-panel ${isMobileDrawer ? 'mobile-drawer' : ''}`}
      aria-label={t.properties}
    >
      {/* Mobile Drawer Handle + Tab Header */}
      {isMobileDrawer && (
        <div className="drawer-top">
          <div className="drawer-pill-handle" />
          <div className="drawer-tabs-row">
            <div className="segmented-tabs">
              <button
                type="button"
                className={`seg-btn ${
                  mobileSection === 'inspector' ? 'active' : ''
                }`}
                onClick={() => setMobileSection('inspector')}
              >
                <Sliders size={14} />
                <span>{t.objectStudio}</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${
                  mobileSection === 'outliner' ? 'active' : ''
                }`}
                onClick={() => setMobileSection('outliner')}
              >
                <Layers size={14} />
                <span>
                  {t.objectList} ({objects.length})
                </span>
              </button>
            </div>
            {onCloseMobile && (
              <button
                type="button"
                className="icon-close-btn"
                onClick={onCloseMobile}
                aria-label={t.done}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Outliner Section */}
      {(!isMobileDrawer || mobileSection === 'outliner') && (
        <section className="panel-section outliner-section">
          <div className="section-header">
            <div className="section-title">
              <Layers size={14} />
              <span>{t.objectList}</span>
            </div>
            <div className="section-header-right">
              <span className="count-pill">{objects.length}</span>
              {!isMobileDrawer && onCollapseDesktop && (
                <button
                  type="button"
                  className="panel-collapse-plain-btn"
                  onClick={onCollapseDesktop}
                  title={t.toggleRightPanel}
                  aria-label={t.toggleRightPanel}
                >
                  <ChevronRight size={17} />
                </button>
              )}
            </div>
          </div>

          {objects.length > 0 && (
            <div className="outliner-group-bar">
              {objects.length >= 2 && (
                <button
                  type="button"
                  className="outliner-mini-btn"
                  onClick={onGroupSceneObjects}
                  title={t.groupAction}
                >
                  <Boxes size={12} />
                  <span>{t.groupAction}</span>
                </button>
              )}
              <button
                type="button"
                className="outliner-mini-btn accent"
                onClick={() => onSaveAsCustomAsset()}
                title={t.saveToAssets}
              >
                <Sparkles size={12} />
                <span>{t.saveToAssets}</span>
              </button>
            </div>
          )}

          {objects.length === 0 ? (
            <div className="empty-box">{t.emptyOutlinerHint}</div>
          ) : (
            <div className="outliner-list">
              {objects.map((obj) => {
                const isSelected = obj.id === selectedId;
                const isGrouped = Boolean(obj.groupId);
                return (
                  <div
                    key={obj.id}
                    className={`outliner-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onSelectObject(obj.id);
                      if (isMobileDrawer) setMobileSection('inspector');
                    }}
                  >
                    <span
                      className="swatch-dot"
                      style={{ backgroundColor: obj.color }}
                    />
                    <span className="kind-icon">{renderKindIcon(obj.kind)}</span>
                    <span className="outliner-name">
                      {obj.name}
                      {isGrouped && (
                        <span className="group-tag-badge">GRP</span>
                      )}
                      {obj.modelAssetId && (
                        <span className="group-tag-badge">3D</span>
                      )}
                      {obj.subdivision &&
                        isSubdivisionActive(obj.subdivision) && (
                          <span className="subdiv-mini-tag">
                            {obj.subdivision.cutsX}×{obj.subdivision.cutsY}×
                            {obj.subdivision.cutsZ}
                          </span>
                        )}
                    </span>

                    <div
                      className="outliner-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="tiny-icon-btn"
                        title={obj.visible ? t.hideObject : t.showObject}
                        onClick={() =>
                          onUpdateMaterial(obj.id, { visible: !obj.visible })
                        }
                      >
                        {obj.visible ? (
                          <Eye size={13} />
                        ) : (
                          <EyeOff size={13} />
                        )}
                      </button>
                      <button
                        type="button"
                        className="tiny-icon-btn danger"
                        title={t.delete}
                        onClick={() => onDeleteObject(obj.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Inspector Section with 3 Sub-Tabs: Transform | Warna RGB | Subdiv */}
      {(!isMobileDrawer || mobileSection === 'inspector') && (
        <section className="panel-section props-section">
          <div className="inspector-subtabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={inspectorSubTab === 'transform'}
              className={`insp-tab-btn ${
                inspectorSubTab === 'transform' ? 'active' : ''
              }`}
              onClick={() => onChangeSubTab('transform')}
            >
              <Sliders size={13} />
              <span>{t.tabTransform}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={inspectorSubTab === 'color'}
              className={`insp-tab-btn ${
                inspectorSubTab === 'color' ? 'active' : ''
              }`}
              onClick={() => onChangeSubTab('color')}
            >
              <Palette size={13} />
              <span>{t.tabColor}</span>
              <span
                className="insp-color-pip"
                style={{ backgroundColor: activeColor }}
              />
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={inspectorSubTab === 'subdiv'}
              className={`insp-tab-btn ${
                inspectorSubTab === 'subdiv' ? 'active' : ''
              }`}
              onClick={() => onChangeSubTab('subdiv')}
            >
              <Grid size={13} />
              <span>{t.tabSubdiv}</span>
              {subdivActive && <span className="insp-subdiv-dot" />}
            </button>
          </div>

          {/* Selected Object Header Card */}
          {selected && selectedKindMeta && (
            <div className="selected-head-card">
              <div className="selected-head-main">
                <span className="selected-kind-badge">
                  <PrimitiveShapePreview kind={selected.kind} size={26} />
                </span>
                <div className="selected-name-col">
                  <input
                    className="name-input"
                    type="text"
                    value={selected.name}
                    onChange={(e) =>
                      onUpdateMaterial(selected.id, { name: e.target.value })
                    }
                    placeholder={t.objectNamePlaceholder}
                  />
                  <span className="selected-kind-sub">
                    {selected.modelAssetId
                      ? `${t.imported3DModelTag} (${(
                          selected.modelFormat || 'glb'
                        ).toUpperCase()})`
                      : selectedKindMeta.subtitle}
                  </span>
                </div>
              </div>
              <div className="quick-mini-actions">
                <button
                  type="button"
                  className="mini-chip-btn"
                  onClick={onDropToFloor}
                  title={t.stickSurface}
                >
                  <ArrowDownToLine size={13} />
                </button>
                <button
                  type="button"
                  className="mini-chip-btn"
                  onClick={onDuplicateSelected}
                  title={`${t.copy} (Shift+D)`}
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  className="mini-chip-btn danger"
                  onClick={() => onDeleteObject(selected.id)}
                  title={`${t.delete} (Del)`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Group & Asset Quick Controls when Selected Object is Part of a Group */}
          {selected && selected.groupId && (
            <div className="group-Banner-controls">
              <button
                type="button"
                className={`group-ctrl-pill ${editSinglePartMode ? 'active' : ''}`}
                onClick={() => onToggleEditSinglePart(!editSinglePartMode)}
              >
                <Boxes size={13} />
                <span>
                  {editSinglePartMode ? t.editingSinglePart : t.editGroupParts}
                </span>
              </button>
              <button
                type="button"
                className="group-ctrl-pill"
                onClick={onUngroupSelected}
              >
                <Ungroup size={13} />
                <span>{t.ungroupAction}</span>
              </button>
            </div>
          )}

          {/* TAB 1: TRANSFORM */}
          {inspectorSubTab === 'transform' && (
            <>
              {!selected ? (
                <div className="empty-box">{t.emptyInspectorHint}</div>
              ) : (
                <div className="props-body">
                  {/* Position */}
                  <div className="transform-group-card">
                    <div className="transform-card-header">
                      <span className="transform-card-title">
                        <Move3d size={13} />
                        <span>{t.positionLabel}</span>
                      </span>
                      <button
                        type="button"
                        className="transform-reset-chip"
                        title={t.resetBtn}
                        onClick={() =>
                          onUpdateTransform(selected.id, {
                            position: {
                              x: 0,
                              y: selected.position.y,
                              z: 0,
                            },
                          })
                        }
                      >
                        0, Y, 0
                      </button>
                    </div>
                    <div className="vec3-grid">
                      <AxisInput
                        axis="X"
                        value={selected.position.x}
                        step={0.1}
                        onChange={(v) =>
                          onUpdateTransform(selected.id, {
                            position: { ...selected.position, x: v },
                          })
                        }
                      />
                      <AxisInput
                        axis="Y"
                        value={selected.position.y}
                        step={0.1}
                        onChange={(v) =>
                          onUpdateTransform(selected.id, {
                            position: { ...selected.position, y: v },
                          })
                        }
                      />
                      <AxisInput
                        axis="Z"
                        value={selected.position.z}
                        step={0.1}
                        onChange={(v) =>
                          onUpdateTransform(selected.id, {
                            position: { ...selected.position, z: v },
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Rotation */}
                  <div className="transform-group-card">
                    <div className="transform-card-header">
                      <span className="transform-card-title">
                        <RotateCw size={13} />
                        <span>{t.rotationLabel}</span>
                      </span>
                      <button
                        type="button"
                        className="transform-reset-chip"
                        onClick={() =>
                          onUpdateTransform(selected.id, {
                            rotation: { x: 0, y: 0, z: 0 },
                          })
                        }
                      >
                        {t.resetBtn} 0°
                      </button>
                    </div>
                    <div className="vec3-grid">
                      <AxisInput
                        axis="X"
                        value={selected.rotation.x}
                        step={15}
                        onChange={(v) =>
                          onUpdateTransform(selected.id, {
                            rotation: { ...selected.rotation, x: v },
                          })
                        }
                      />
                      <AxisInput
                        axis="Y"
                        value={selected.rotation.y}
                        step={15}
                        onChange={(v) =>
                          onUpdateTransform(selected.id, {
                            rotation: { ...selected.rotation, y: v },
                          })
                        }
                      />
                      <AxisInput
                        axis="Z"
                        value={selected.rotation.z}
                        step={15}
                        onChange={(v) =>
                          onUpdateTransform(selected.id, {
                            rotation: { ...selected.rotation, z: v },
                          })
                        }
                      />
                    </div>
                    <div className="quick-angle-row">
                      {[-90, -45, 45, 90].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          className="quick-angle-pill"
                          onClick={() =>
                            onUpdateTransform(selected.id, {
                              rotation: {
                                ...selected.rotation,
                                y: Math.round(selected.rotation.y + deg),
                              },
                            })
                          }
                        >
                          Y {deg > 0 ? `+${deg}°` : `${deg}°`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scale */}
                  <div className="transform-group-card">
                    <div className="transform-card-header">
                      <span className="transform-card-title">
                        <Maximize2 size={13} />
                        <span>{t.scaleLabel}</span>
                      </span>
                      <div className="transform-header-actions">
                        <button
                          type="button"
                          className={`transform-lock-chip ${
                            uniformScale ? 'active' : ''
                          }`}
                          onClick={() => setUniformScale((prev) => !prev)}
                        >
                          {uniformScale
                            ? t.uniformScaleLock
                            : t.uniformScaleFree}
                        </button>
                        <button
                          type="button"
                          className="transform-reset-chip"
                          onClick={() =>
                            onUpdateTransform(selected.id, {
                              scale: { x: 1, y: 1, z: 1 },
                            })
                          }
                        >
                          1×
                        </button>
                      </div>
                    </div>
                    <div className="vec3-grid">
                      <AxisInput
                        axis="X"
                        value={selected.scale.x}
                        step={0.1}
                        min={0.05}
                        onChange={(v) => handleScaleChange('x', v)}
                      />
                      <AxisInput
                        axis="Y"
                        value={selected.scale.y}
                        step={0.1}
                        min={0.05}
                        onChange={(v) => handleScaleChange('y', v)}
                      />
                      <AxisInput
                        axis="Z"
                        value={selected.scale.z}
                        step={0.1}
                        min={0.05}
                        onChange={(v) => handleScaleChange('z', v)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: TRUE RGB COLOR STUDIO & PBR MATERIALS */}
          {inspectorSubTab === 'color' && (
            <div className="props-body">
              {selected?.modelAssetId &&
                selected.useCustomMaterial &&
                onResetImportedMaterial && (
                  <button
                    type="button"
                    className="restore-orig-mat-btn"
                    onClick={() => onResetImportedMaterial(selected.id)}
                  >
                    <RotateCcw size={13} />
                    <span>{t.restoreOriginalMaterial}</span>
                  </button>
                )}
              <ColorWheelPicker
                language={language}
                color={activeColor}
                roughness={activeRoughness}
                metalness={activeMetalness}
                opacity={activeOpacity}
                emissive={activeEmissive}
                emissiveIntensity={activeEmissiveIntensity}
                flatShading={activeFlatShading}
                paintMode={paintMode}
                hasSelection={Boolean(selected)}
                compact={isMobileDrawer}
                onUpdateMaterial={(patch, commit) =>
                  onUpdateMaterial(selected ? selected.id : null, patch, commit)
                }
                onChangePaintMode={onChangePaintMode}
                onCommitHistory={onCommitHistory}
              />
            </div>
          )}

          {/* TAB 3: REVAMPED BOX & SURFACE SUBDIVISION */}
          {inspectorSubTab === 'subdiv' && (
            <>
              {!selected ? (
                <div className="empty-box">{t.emptyInspectorHint}</div>
              ) : (
                <div className="props-body subdiv-panel-body">
                  {/* Subdivision Header & Description */}
                  <div className="subdiv-intro-card">
                    <div className="subdiv-intro-head">
                      <LayoutGrid size={15} />
                      <strong>{t.subdivHeaderTitle}</strong>
                    </div>
                    <p>{t.subdivHeaderDesc}</p>
                  </div>

                  {/* Live Subdivision Stats */}
                  {subdivStats && (
                    <div className="subdiv-stats-card">
                      <div className="subdiv-stat-col">
                        <span className="subdiv-stat-label">
                          {t.subdivCellsLabel}
                        </span>
                        <strong>{totalCells.toLocaleString()}</strong>
                        <small>
                          {currentSubdiv.cutsX}×{currentSubdiv.cutsY}×
                          {currentSubdiv.cutsZ}
                        </small>
                      </div>
                      <div className="subdiv-stat-divider" />
                      <div className="subdiv-stat-col">
                        <span className="subdiv-stat-label">
                          {t.subdivTrianglesLabel}
                        </span>
                        <strong>
                          {subdivStats.subdivTriangles.toLocaleString()}
                        </strong>
                        <small>
                          Base: {subdivStats.baseTriangles.toLocaleString()}
                        </small>
                      </div>
                      <div className="subdiv-stat-divider" />
                      <div className="subdiv-stat-col">
                        <span className="subdiv-stat-label">
                          {t.subdivVerticesLabel}
                        </span>
                        <strong>
                          {subdivStats.vertexCount.toLocaleString()}
                        </strong>
                        <small>3D Mesh</small>
                      </div>
                    </div>
                  )}

                  {/* Quick Uniform Division Presets */}
                  <div className="subdiv-block">
                    <div className="subdiv-row-head">
                      <span className="prop-label">{t.subdivQuickPresets}</span>
                      {subdivActive && (
                        <button
                          type="button"
                          className="subdiv-reset-link"
                          onClick={() =>
                            onUpdateSubdivision(
                              selected.id,
                              {
                                cutsX: 1,
                                cutsY: 1,
                                cutsZ: 1,
                                panelGroove: 0,
                              },
                              true
                            )
                          }
                        >
                          {t.subdivResetOriginal}
                        </button>
                      )}
                    </div>
                    <div className="subdiv-level-pills">
                      {[1, 2, 3, 4, 6].map((n) => {
                        const isUni =
                          currentSubdiv.cutsX === n &&
                          currentSubdiv.cutsY === n &&
                          currentSubdiv.cutsZ === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            className={`subdiv-lvl-btn ${isUni ? 'active' : ''}`}
                            onClick={() =>
                              onUpdateSubdivision(
                                selected.id,
                                { cutsX: n, cutsY: n, cutsZ: n },
                                true
                              )
                            }
                          >
                            <strong>
                              {n}×{n}×{n}
                            </strong>
                            <small>{n * n * n}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-Axis X / Y / Z Division Sliders */}
                  <div className="subdiv-block">
                    <span className="prop-label">{t.subdivPerAxisTitle}</span>
                    {(
                      [
                        {
                          key: 'cutsX',
                          label: t.subdivAxisX,
                          badge: 'X',
                          cls: 'rgb-r',
                          val: currentSubdiv.cutsX,
                        },
                        {
                          key: 'cutsY',
                          label: t.subdivAxisY,
                          badge: 'Y',
                          cls: 'rgb-g',
                          val: currentSubdiv.cutsY,
                        },
                        {
                          key: 'cutsZ',
                          label: t.subdivAxisZ,
                          badge: 'Z',
                          cls: 'rgb-b',
                          val: currentSubdiv.cutsZ,
                        },
                      ] as const
                    ).map((ax) => (
                      <div key={ax.key} className="subdiv-axis-slider-row">
                        <div className="subdiv-axis-top">
                          <span className="subdiv-axis-name">
                            <span className={`rgb-badge ${ax.cls}`}>
                              {ax.badge}
                            </span>
                            <span>{ax.label}</span>
                          </span>
                          <strong>{ax.val}×</strong>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={12}
                          step={1}
                          value={ax.val}
                          onChange={(e) =>
                            onUpdateSubdivision(
                              selected.id,
                              { [ax.key]: parseInt(e.target.value, 10) },
                              false
                            )
                          }
                          onPointerUp={onCommitHistory}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Show Clean Quad Partition Lines */}
                  <button
                    type="button"
                    className={`subdiv-check-card ${
                      currentSubdiv.showGridLines ? 'checked' : ''
                    }`}
                    onClick={() =>
                      onUpdateSubdivision(
                        selected.id,
                        { showGridLines: !currentSubdiv.showGridLines },
                        true
                      )
                    }
                  >
                    <span className="snap-check-box">
                      {currentSubdiv.showGridLines && <Check size={13} />}
                    </span>
                    <div className="snap-mode-info">
                      <strong>{t.subdivShowLinesTitle}</strong>
                      <small>{t.subdivShowLinesDesc}</small>
                    </div>
                  </button>

                  {/* Optional 3D Panel Groove / Tile Seam */}
                  <div className="slider-row">
                    <div className="slider-head">
                      <span>{t.subdivGrooveLabel}</span>
                      <span>
                        {currentSubdiv.panelGroove <= 0.005
                          ? t.subdivGrooveFlat
                          : `${Math.round(currentSubdiv.panelGroove * 100)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.35}
                      step={0.01}
                      value={currentSubdiv.panelGroove}
                      disabled={!subdivActive}
                      onChange={(e) =>
                        onUpdateSubdivision(
                          selected.id,
                          { panelGroove: parseFloat(e.target.value) },
                          false
                        )
                      }
                      onPointerUp={onCommitHistory}
                    />
                  </div>

                  {/* Split into Separate Editable Sub-Blocks CTA */}
                  <div className="subdiv-split-box">
                    <button
                      type="button"
                      className="subdiv-split-cta-btn"
                      disabled={totalCells <= 1}
                      onClick={onSplitSubBlocks}
                    >
                      <Boxes size={15} />
                      <span>
                        {t.subdivSplitBlocksBtn} (
                        {totalCells > 1 ? `${totalCells}` : '2×2×2'})
                      </span>
                    </button>
                    <p className="subdiv-split-hint">
                      {t.subdivSplitBlocksHint}
                    </p>
                  </div>

                  {subdivStats?.capped && (
                    <div className="subdiv-cap-notice">{t.subdivCapNotice}</div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </aside>
  );
};
