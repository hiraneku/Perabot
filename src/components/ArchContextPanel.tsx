import React, { useState } from 'react';
import {
  ArrowLeftRight,
  BrickWall,
  Compass,
  Cuboid,
  DoorOpen,
  Download,
  Eye,
  Home,
  MousePointer,
  PaintBucket,
  PenTool,
  Plus,
  RotateCw,
  Ruler,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { StudioStrings } from '../i18n/translations';
import {
  ArchBuildPhase,
  ArchDetectedRoom,
  ArchHouseData,
  ArchOpeningItem,
  ArchOpeningKind,
  ArchRoofItem,
  ArchRoofStyle,
  ArchRoomMeta,
  ArchSelection,
  ArchStairItem,
  ArchStairKind,
  ArchSubTool,
  ArchWallSegment,
  ArchWallStyle,
  BuildingFloorLayer,
  ProceduralPatternKind,
  SunEnvironmentSettings,
  WallDrawDefaults,
} from '../types/studio';
import { computeWallLength } from '../engine/ArchBuilderEngine';

interface ArchContextPanelProps {
  t: StudioStrings;
  phase: ArchBuildPhase;
  onClose: () => void;
  archData: ArchHouseData;
  detectedRooms: ArchDetectedRoom[];
  archSelection: ArchSelection;
  onSelectArch: (sel: ArchSelection) => void;
  archTool: ArchSubTool;
  onSetArchTool: (tool: ArchSubTool) => void;
  wallDefaults: WallDrawDefaults;
  onChangeWallDefaults: (patch: Partial<WallDrawDefaults>) => void;
  onSpawnWallTemplate: () => void;
  onUpdateWall: (id: string, patch: Partial<ArchWallSegment>, commit?: boolean) => void;
  onBakeSelectedWall: () => void;
  activeOpeningKind: ArchOpeningKind;
  onSelectOpeningKind: (kind: ArchOpeningKind) => void;
  onUpdateOpening: (id: string, patch: Partial<ArchOpeningItem>, commit?: boolean) => void;
  onAddStair: (kind: ArchStairKind) => void;
  onUpdateStair: (id: string, patch: Partial<ArchStairItem>, commit?: boolean) => void;
  onGenerateAutoRoof: (style: ArchRoofStyle) => void;
  onAddRoofWing?: (style: ArchRoofStyle) => void;
  onUpdateRoof: (id: string, patch: Partial<ArchRoofItem>, commit?: boolean) => void;
  onUpdateRoomMeta: (
    roomId: string,
    patch: Partial<
      Pick<ArchRoomMeta, 'name' | 'floorColor' | 'floorPattern' | 'ceilingVisible'>
    >,
    commit?: boolean
  ) => void;
  onApplyAllWallsColor: (
    extColor: string,
    intColor: string,
    extPattern?: ProceduralPatternKind,
    intPattern?: ProceduralPatternKind
  ) => void;
  onDeleteSelectedArch: () => void;
  onChangeSun: (patch: Partial<SunEnvironmentSettings>, commit?: boolean) => void;
  cameraLensFov: number;
  onChangeLensFov: (fov: number) => void;
  onExportBlueprintPNG: () => void;
  activeFloor: BuildingFloorLayer | undefined;
}

const ARCH_WALL_SWATCHES = [
  '#f1f5f9',
  '#e2e8f0',
  '#f8fafc',
  '#fef3c7',
  '#e7e5e4',
  '#cbd5e1',
  '#94a3b8',
  '#475569',
  '#d6b38c',
  '#b45309',
  '#bbf7d0',
  '#bae6fd',
];

const ARCH_FLOOR_SWATCHES = [
  '#d6c7b2',
  '#b77946',
  '#854d0e',
  '#cbd5e1',
  '#94a3b8',
  '#475569',
  '#e7e5e4',
  '#fde68a',
];

const ARCH_ROOF_SWATCHES = [
  '#b85d3b',
  '#9a3412',
  '#334155',
  '#1e293b',
  '#57534e',
  '#0f766e',
  '#64748b',
];

function formatHourClock(hourFloat: number): string {
  const totalMins = Math.round(hourFloat * 60);
  const hh = Math.floor(totalMins / 60);
  const mm = totalMins % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export const ArchContextPanel: React.FC<ArchContextPanelProps> = ({
  t,
  phase,
  onClose,
  archData,
  detectedRooms,
  archSelection,
  onSelectArch,
  archTool,
  onSetArchTool,
  wallDefaults,
  onChangeWallDefaults,
  onSpawnWallTemplate,
  onUpdateWall,
  onBakeSelectedWall,
  activeOpeningKind,
  onSelectOpeningKind,
  onUpdateOpening,
  onAddStair,
  onUpdateStair,
  onGenerateAutoRoof,
  onAddRoofWing,
  onUpdateRoof,
  onUpdateRoomMeta,
  onApplyAllWallsColor,
  onDeleteSelectedArch,
  onChangeSun,
  cameraLensFov,
  onChangeLensFov,
  onExportBlueprintPNG,
  activeFloor,
}) => {
  const [roofStyleDraft, setRoofStyleDraft] = useState<ArchRoofStyle>('gable');

  const selectedWall =
    archSelection?.kind === 'wall'
      ? archData.walls.find((w) => w.id === archSelection.id) ?? null
      : null;

  const selectedOpening =
    archSelection?.kind === 'opening'
      ? archData.openings.find((o) => o.id === archSelection.id) ?? null
      : null;

  const selectedStair =
    archSelection?.kind === 'stair'
      ? archData.stairs.find((s) => s.id === archSelection.id) ?? null
      : null;

  const selectedRoof =
    archSelection?.kind === 'roof'
      ? archData.roofs.find((r) => r.id === archSelection.id) ?? null
      : null;

  const floorRooms = activeFloor
    ? detectedRooms.filter((r) => r.floorId === activeFloor.id)
    : detectedRooms;

  const totalAreaSqm = detectedRooms.reduce((s, r) => s + r.areaSqm, 0);
  const totalWallLenM = archData.walls.reduce(
    (s, w) => s + computeWallLength(w),
    0
  );

  const phaseTitle =
    phase === 'walls'
      ? t.archPhaseWalls
      : phase === 'openings'
      ? t.archPhaseOpenings
      : phase === 'roofs'
      ? t.archPhaseRoofs
      : phase === 'finishing'
      ? t.archPhaseFinishing
      : t.archPhaseEnv;

  const openingCards: Array<{ id: ArchOpeningKind; label: string }> = [
    { id: 'door-single', label: t.archOpenDoorSingle },
    { id: 'door-double', label: t.archOpenDoorDouble },
    { id: 'window-std', label: t.archOpenWinStd },
    { id: 'window-wide', label: t.archOpenWinWide },
    { id: 'window-tall', label: t.archOpenWinTall },
    { id: 'archway', label: t.archOpenArchway },
  ];

  const roofStyles: Array<{ id: ArchRoofStyle; label: string }> = [
    { id: 'gable', label: t.archRoofGable },
    { id: 'hip', label: t.archRoofHip },
    { id: 'shed', label: t.archRoofShed },
    { id: 'flat', label: t.archRoofFlat },
  ];

  const roomPresets = [
    t.archRoomPresetLiving,
    t.archRoomPresetBedroom,
    t.archRoomPresetKitchen,
    t.archRoomPresetBath,
    t.archRoomPresetStudy,
    t.archRoomPresetTerrace,
  ];

  return (
    <div className="arch-context-panel" onPointerDown={(e) => e.stopPropagation()}>
      <div className="arch-panel-header">
        <div className="arch-panel-title-wrap">
          <span className="arch-panel-title">{phaseTitle}</span>
          {activeFloor && (
            <span className="arch-panel-floor-chip">{activeFloor.name}</span>
          )}
        </div>
        <button
          type="button"
          className="frameless-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="arch-panel-body">
        {/* =====================================================
            PHASE 1: PLAN & SMART WALLS (3.0m x 3.0m x 0.15m Default)
            ===================================================== */}
        {phase === 'walls' && (
          <>
            <div className="arch-segmented-row">
              <button
                type="button"
                className={`arch-seg-btn ${archTool === 'select' ? 'active' : ''}`}
                onClick={() => onSetArchTool('select')}
              >
                <MousePointer size={14} />
                <span>{t.archToolSelect}</span>
              </button>
              <button
                type="button"
                className={`arch-seg-btn ${archTool === 'draw-wall' ? 'active' : ''}`}
                onClick={() => onSetArchTool('draw-wall')}
              >
                <PenTool size={14} />
                <span>{t.archToolDrawWall}</span>
              </button>
            </div>

            {/* Wall Style Pills: Full / Half / Balcony Railing */}
            <div className="arch-style-pills">
              {(
                [
                  { id: 'full', label: t.archWallStyleFull },
                  { id: 'half', label: t.archWallStyleHalf },
                  { id: 'railing', label: t.archWallStyleRailing },
                ] as Array<{ id: ArchWallStyle; label: string }>
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={`arch-pill-btn ${
                    wallDefaults.style === st.id ? 'active' : ''
                  }`}
                  onClick={() => onChangeWallDefaults({ style: st.id })}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Standard House Wall Dimensions (Customizable: 3.0m H, 0.15m T, 3.0m W) */}
            <div className="arch-slider-group">
              <div className="arch-slider-head">
                <span>{t.archWallHeightLabel}</span>
                <strong>{wallDefaults.height.toFixed(2)} m</strong>
              </div>
              <input
                type="range"
                min={0.8}
                max={6.0}
                step={0.1}
                value={wallDefaults.height}
                onChange={(e) =>
                  onChangeWallDefaults({ height: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="arch-slider-group">
              <div className="arch-slider-head">
                <span>{t.archWallThickLabel}</span>
                <strong>
                  {wallDefaults.thickness.toFixed(2)} m (
                  {Math.round(wallDefaults.thickness * 100)} cm)
                </strong>
              </div>
              <input
                type="range"
                min={0.08}
                max={0.5}
                step={0.01}
                value={wallDefaults.thickness}
                onChange={(e) =>
                  onChangeWallDefaults({ thickness: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="arch-slider-group">
              <div className="arch-slider-head">
                <span>{t.archWallLenLabel}</span>
                <strong>{wallDefaults.lengthTemplate.toFixed(2)} m</strong>
              </div>
              <input
                type="range"
                min={0.5}
                max={10.0}
                step={0.25}
                value={wallDefaults.lengthTemplate}
                onChange={(e) =>
                  onChangeWallDefaults({
                    lengthTemplate: parseFloat(e.target.value),
                  })
                }
              />
            </div>

            <div className="arch-slider-group">
              <div className="arch-slider-head">
                <span>{t.archWallCurveLabel}</span>
                <div className="arch-inline-val">
                  <strong>{wallDefaults.curveBulge.toFixed(2)} m</strong>
                  {Math.abs(wallDefaults.curveBulge) > 0.01 && (
                    <button
                      type="button"
                      className="arch-mini-reset"
                      onClick={() => onChangeWallDefaults({ curveBulge: 0 })}
                    >
                      0m
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={-2.5}
                max={2.5}
                step={0.05}
                value={wallDefaults.curveBulge}
                onChange={(e) =>
                  onChangeWallDefaults({ curveBulge: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="arch-check-grid">
              <label className="arch-check-row">
                <input
                  type="checkbox"
                  checked={wallDefaults.angleSnap}
                  onChange={(e) =>
                    onChangeWallDefaults({ angleSnap: e.target.checked })
                  }
                />
                <span>{t.archWallAngleSnap}</span>
              </label>
              <label className="arch-check-row">
                <input
                  type="checkbox"
                  checked={wallDefaults.hasBaseboard}
                  onChange={(e) =>
                    onChangeWallDefaults({ hasBaseboard: e.target.checked })
                  }
                />
                <span>{t.archWallBaseboard}</span>
              </label>
            </div>

            {/* 1-Tap Standard House Wall Template Spawner */}
            <button
              type="button"
              className="arch-primary-cta"
              onClick={onSpawnWallTemplate}
            >
              <BrickWall size={15} />
              <span>{t.archSpawnWallTemplateBtn}</span>
            </button>
            <p className="arch-subtle-note">{t.archWallTemplateSub}</p>

            {/* Selected Smart Wall Live Editor + Bake to Blender Mesh */}
            {selectedWall && (
              <div className="arch-selected-card">
                <div className="arch-selected-head">
                  <span>
                    {t.archSelectedWallTitle} (
                    {computeWallLength(selectedWall).toFixed(2)}m)
                  </span>
                  <button
                    type="button"
                    className="arch-icon-danger"
                    onClick={onDeleteSelectedArch}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archWallHeightLabel}</span>
                    <strong>{selectedWall.height.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={6.0}
                    step={0.1}
                    value={selectedWall.height}
                    onChange={(e) =>
                      onUpdateWall(
                        selectedWall.id,
                        { height: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateWall(selectedWall.id, {}, true)}
                    onTouchEnd={() => onUpdateWall(selectedWall.id, {}, true)}
                  />
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archWallThickLabel}</span>
                    <strong>{selectedWall.thickness.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={0.08}
                    max={0.5}
                    step={0.01}
                    value={selectedWall.thickness}
                    onChange={(e) =>
                      onUpdateWall(
                        selectedWall.id,
                        { thickness: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateWall(selectedWall.id, {}, true)}
                    onTouchEnd={() => onUpdateWall(selectedWall.id, {}, true)}
                  />
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archWallCurveLabel}</span>
                    <strong>{selectedWall.curveBulge.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={-2.5}
                    max={2.5}
                    step={0.05}
                    value={selectedWall.curveBulge}
                    onChange={(e) =>
                      onUpdateWall(
                        selectedWall.id,
                        { curveBulge: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateWall(selectedWall.id, {}, true)}
                    onTouchEnd={() => onUpdateWall(selectedWall.id, {}, true)}
                  />
                </div>

                <button
                  type="button"
                  className="arch-secondary-cta"
                  onClick={onBakeSelectedWall}
                >
                  <Cuboid size={14} />
                  <span>{t.archBakeToMeshBtn}</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* =====================================================
            PHASE 2: LIVE BOOLEAN WALL CUTOUTS & STAIRS
            ===================================================== */}
        {phase === 'openings' && (
          <>
            <div className="arch-card-grid">
              {openingCards.map((oc) => {
                const isActive =
                  archTool === 'place-opening' && activeOpeningKind === oc.id;
                return (
                  <button
                    key={oc.id}
                    type="button"
                    className={`arch-opening-card ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectOpeningKind(oc.id);
                      onSetArchTool('place-opening');
                    }}
                  >
                    <DoorOpen size={15} />
                    <span>{oc.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedOpening && (
              <div className="arch-selected-card">
                <div className="arch-selected-head">
                  <span>{selectedOpening.kind}</span>
                  <button
                    type="button"
                    className="arch-icon-danger"
                    onClick={onDeleteSelectedArch}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archOpenPosLabel}</span>
                    <strong>{Math.round(selectedOpening.offsetRatio * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min={0.12}
                    max={0.88}
                    step={0.01}
                    value={selectedOpening.offsetRatio}
                    onChange={(e) =>
                      onUpdateOpening(
                        selectedOpening.id,
                        { offsetRatio: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateOpening(selectedOpening.id, {}, true)}
                    onTouchEnd={() => onUpdateOpening(selectedOpening.id, {}, true)}
                  />
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archOpenWidthLabel}</span>
                    <strong>{selectedOpening.width.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={3.6}
                    step={0.05}
                    value={selectedOpening.width}
                    onChange={(e) =>
                      onUpdateOpening(
                        selectedOpening.id,
                        { width: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateOpening(selectedOpening.id, {}, true)}
                    onTouchEnd={() => onUpdateOpening(selectedOpening.id, {}, true)}
                  />
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archOpenHeightLabel}</span>
                    <strong>{selectedOpening.height.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={0.45}
                    max={2.85}
                    step={0.05}
                    value={selectedOpening.height}
                    onChange={(e) =>
                      onUpdateOpening(
                        selectedOpening.id,
                        { height: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateOpening(selectedOpening.id, {}, true)}
                    onTouchEnd={() => onUpdateOpening(selectedOpening.id, {}, true)}
                  />
                </div>

                {selectedOpening.kind.startsWith('window') && (
                  <div className="arch-slider-group">
                    <div className="arch-slider-head">
                      <span>{t.archOpenSillLabel}</span>
                      <strong>{selectedOpening.sillHeight.toFixed(2)} m</strong>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1.8}
                      step={0.05}
                      value={selectedOpening.sillHeight}
                      onChange={(e) =>
                        onUpdateOpening(
                          selectedOpening.id,
                          { sillHeight: parseFloat(e.target.value) },
                          false
                        )
                      }
                      onMouseUp={() =>
                        onUpdateOpening(selectedOpening.id, {}, true)
                      }
                      onTouchEnd={() =>
                        onUpdateOpening(selectedOpening.id, {}, true)
                      }
                    />
                  </div>
                )}

                {selectedOpening.kind.startsWith('door') && (
                  <div className="arch-segmented-row">
                    <button
                      type="button"
                      className={`arch-seg-btn ${
                        selectedOpening.isOpen !== false ? 'active' : ''
                      }`}
                      onClick={() =>
                        onUpdateOpening(
                          selectedOpening.id,
                          {
                            isOpen:
                              selectedOpening.isOpen === false ? true : false,
                          },
                          true
                        )
                      }
                    >
                      <DoorOpen size={14} />
                      <span>
                        {selectedOpening.isOpen !== false
                          ? t.archDoorStateOpen
                          : t.archDoorStateClosed}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="arch-seg-btn"
                      onClick={() =>
                        onUpdateOpening(
                          selectedOpening.id,
                          { flipSwing: !selectedOpening.flipSwing },
                          true
                        )
                      }
                    >
                      <ArrowLeftRight size={14} />
                      <span>{t.archOpenFlipSwing}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="arch-section-divider" />
            <div className="arch-subhead">{t.archStairSectionTitle}</div>
            <div className="arch-segmented-row">
              <button
                type="button"
                className="arch-seg-btn"
                onClick={() => onAddStair('straight')}
              >
                <Plus size={14} />
                <span>{t.archStairStraightBtn}</span>
              </button>
              <button
                type="button"
                className="arch-seg-btn"
                onClick={() => onAddStair('l-shape')}
              >
                <Plus size={14} />
                <span>{t.archStairLShapeBtn}</span>
              </button>
            </div>

            {selectedStair && (
              <div className="arch-selected-card">
                <div className="arch-selected-head">
                  <span>{selectedStair.kind === 'straight' ? 'Straight' : 'L-Stair'}</span>
                  <div className="arch-inline-val">
                    <button
                      type="button"
                      className="arch-mini-reset"
                      onClick={() =>
                        onUpdateStair(
                          selectedStair.id,
                          { rotationY: (selectedStair.rotationY + 90) % 360 },
                          true
                        )
                      }
                      title="Rotate 90°"
                    >
                      <RotateCw size={13} /> 90°
                    </button>
                    <button
                      type="button"
                      className="arch-icon-danger"
                      onClick={onDeleteSelectedArch}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>X</span>
                    <strong>{selectedStair.position.x.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={15}
                    step={0.25}
                    value={selectedStair.position.x}
                    onChange={(e) =>
                      onUpdateStair(
                        selectedStair.id,
                        {
                          position: {
                            ...selectedStair.position,
                            x: parseFloat(e.target.value),
                          },
                        },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateStair(selectedStair.id, {}, true)}
                    onTouchEnd={() => onUpdateStair(selectedStair.id, {}, true)}
                  />
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>Z</span>
                    <strong>{selectedStair.position.z.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={15}
                    step={0.25}
                    value={selectedStair.position.z}
                    onChange={(e) =>
                      onUpdateStair(
                        selectedStair.id,
                        {
                          position: {
                            ...selectedStair.position,
                            z: parseFloat(e.target.value),
                          },
                        },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateStair(selectedStair.id, {}, true)}
                    onTouchEnd={() => onUpdateStair(selectedStair.id, {}, true)}
                  />
                </div>

                <label className="arch-check-row">
                  <input
                    type="checkbox"
                    checked={selectedStair.autoCutoutUpper}
                    onChange={(e) =>
                      onUpdateStair(
                        selectedStair.id,
                        { autoCutoutUpper: e.target.checked },
                        true
                      )
                    }
                  />
                  <span>{t.archStairAutoCutout}</span>
                </label>
              </div>
            )}
          </>
        )}

        {/* =====================================================
            PHASE 3: PARAMETRIC SMART ROOFS
            ===================================================== */}
        {phase === 'roofs' && (
          <>
            <div className="arch-card-grid">
              {roofStyles.map((rs) => {
                const active = (selectedRoof?.style ?? roofStyleDraft) === rs.id;
                return (
                  <button
                    key={rs.id}
                    type="button"
                    className={`arch-opening-card ${active ? 'active' : ''}`}
                    onClick={() => {
                      setRoofStyleDraft(rs.id);
                      if (selectedRoof) {
                        onUpdateRoof(selectedRoof.id, { style: rs.id }, true);
                      }
                    }}
                  >
                    <Home size={15} />
                    <span>{rs.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="arch-primary-cta"
              onClick={() => onGenerateAutoRoof(roofStyleDraft)}
            >
              <Home size={15} />
              <span>{t.archRoofAutoBtn}</span>
            </button>

            {onAddRoofWing && (
              <button
                type="button"
                className="arch-secondary-cta"
                onClick={() => onAddRoofWing(roofStyleDraft)}
              >
                <Plus size={14} />
                <span>{t.archRoofAddWingBtn}</span>
              </button>
            )}

            {selectedRoof && (
              <div className="arch-selected-card">
                <div className="arch-selected-head">
                  <span>{selectedRoof.name}</span>
                  <button
                    type="button"
                    className="arch-icon-danger"
                    onClick={onDeleteSelectedArch}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {selectedRoof.style !== 'flat' && (
                  <div className="arch-slider-group">
                    <div className="arch-slider-head">
                      <span>{t.archRoofPitchLabel}</span>
                      <strong>{selectedRoof.pitchDeg}°</strong>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={52}
                      step={1}
                      value={selectedRoof.pitchDeg}
                      onChange={(e) =>
                        onUpdateRoof(
                          selectedRoof.id,
                          { pitchDeg: parseFloat(e.target.value) },
                          false
                        )
                      }
                      onMouseUp={() => onUpdateRoof(selectedRoof.id, {}, true)}
                      onTouchEnd={() => onUpdateRoof(selectedRoof.id, {}, true)}
                    />
                  </div>
                )}

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archRoofOverhangLabel}</span>
                    <strong>{selectedRoof.overhang.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.4}
                    step={0.05}
                    value={selectedRoof.overhang}
                    onChange={(e) =>
                      onUpdateRoof(
                        selectedRoof.id,
                        { overhang: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateRoof(selectedRoof.id, {}, true)}
                    onTouchEnd={() => onUpdateRoof(selectedRoof.id, {}, true)}
                  />
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archRoofWidthLabel}</span>
                    <strong>{selectedRoof.width.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={28.0}
                    step={0.25}
                    value={selectedRoof.width}
                    onChange={(e) =>
                      onUpdateRoof(
                        selectedRoof.id,
                        { width: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateRoof(selectedRoof.id, {}, true)}
                    onTouchEnd={() => onUpdateRoof(selectedRoof.id, {}, true)}
                  />
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archRoofDepthLabel}</span>
                    <strong>{selectedRoof.depth.toFixed(2)} m</strong>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={28.0}
                    step={0.25}
                    value={selectedRoof.depth}
                    onChange={(e) =>
                      onUpdateRoof(
                        selectedRoof.id,
                        { depth: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onUpdateRoof(selectedRoof.id, {}, true)}
                    onTouchEnd={() => onUpdateRoof(selectedRoof.id, {}, true)}
                  />
                </div>

                <div className="arch-segmented-row">
                  <button
                    type="button"
                    className={`arch-seg-btn ${
                      selectedRoof.ridgeAxis === 'x' ? 'active' : ''
                    }`}
                    onClick={() =>
                      onUpdateRoof(selectedRoof.id, { ridgeAxis: 'x' }, true)
                    }
                  >
                    <span>{t.archRoofRidgeAxisLabel}: X</span>
                  </button>
                  <button
                    type="button"
                    className={`arch-seg-btn ${
                      selectedRoof.ridgeAxis === 'z' ? 'active' : ''
                    }`}
                    onClick={() =>
                      onUpdateRoof(selectedRoof.id, { ridgeAxis: 'z' }, true)
                    }
                  >
                    <span>{t.archRoofRidgeAxisLabel}: Z</span>
                  </button>
                </div>

                <div className="arch-swatch-row">
                  {ARCH_ROOF_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={`arch-color-swatch ${
                        selectedRoof.color.toLowerCase() === hex ? 'active' : ''
                      }`}
                      style={{ backgroundColor: hex }}
                      onClick={() =>
                        onUpdateRoof(selectedRoof.id, { color: hex }, true)
                      }
                    />
                  ))}
                  <input
                    type="color"
                    className="arch-native-color"
                    value={selectedRoof.color}
                    onChange={(e) =>
                      onUpdateRoof(
                        selectedRoof.id,
                        { color: e.target.value },
                        true
                      )
                    }
                  />
                </div>

                {/* Roof Surface Pattern */}
                <div className="pattern-chip-grid" style={{ marginTop: 6 }}>
                  {(
                    [
                      { id: 'roof-tile', label: t.patternRoofTile },
                      { id: 'concrete', label: t.patternConcrete },
                      { id: 'wood', label: t.patternWood },
                      { id: 'none', label: t.patternNone },
                    ] as const
                  ).map((rp) => {
                    const activePat =
                      (selectedRoof.roofPattern ??
                        (selectedRoof.style === 'flat'
                          ? 'concrete'
                          : 'roof-tile')) === rp.id;
                    return (
                      <button
                        key={rp.id}
                        type="button"
                        className={`pattern-chip-btn ${activePat ? 'active' : ''}`}
                        onClick={() =>
                          onUpdateRoof(
                            selectedRoof.id,
                            { roofPattern: rp.id },
                            true
                          )
                        }
                      >
                        {rp.label}
                      </button>
                    );
                  })}
                </div>

                {/* Architectural Daylight Glass Skylight */}
                <label className="arch-check-row" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedRoof.hasSkylight)}
                    onChange={(e) =>
                      onUpdateRoof(
                        selectedRoof.id,
                        { hasSkylight: e.target.checked },
                        true
                      )
                    }
                  />
                  <span>{t.archRoofSkylightToggle}</span>
                </label>

                {selectedRoof.hasSkylight && (
                  <>
                    <div className="arch-slider-group">
                      <div className="arch-slider-head">
                        <span>{t.archRoofSkylightSizeLabel} (X)</span>
                        <strong>
                          {(selectedRoof.skylightWidth ?? 1.8).toFixed(2)} m
                        </strong>
                      </div>
                      <input
                        type="range"
                        min={0.8}
                        max={5.0}
                        step={0.1}
                        value={selectedRoof.skylightWidth ?? 1.8}
                        onChange={(e) =>
                          onUpdateRoof(
                            selectedRoof.id,
                            { skylightWidth: parseFloat(e.target.value) },
                            false
                          )
                        }
                        onMouseUp={() => onUpdateRoof(selectedRoof.id, {}, true)}
                        onTouchEnd={() => onUpdateRoof(selectedRoof.id, {}, true)}
                      />
                    </div>
                    <div className="arch-slider-group">
                      <div className="arch-slider-head">
                        <span>{t.archRoofSkylightSizeLabel} (Z)</span>
                        <strong>
                          {(selectedRoof.skylightDepth ?? 1.4).toFixed(2)} m
                        </strong>
                      </div>
                      <input
                        type="range"
                        min={0.8}
                        max={5.0}
                        step={0.1}
                        value={selectedRoof.skylightDepth ?? 1.4}
                        onChange={(e) =>
                          onUpdateRoof(
                            selectedRoof.id,
                            { skylightDepth: parseFloat(e.target.value) },
                            false
                          )
                        }
                        onMouseUp={() => onUpdateRoof(selectedRoof.id, {}, true)}
                        onTouchEnd={() => onUpdateRoof(selectedRoof.id, {}, true)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* =====================================================
            PHASE 4: AUTO ROOM DETECTION (m²) & DUAL-SIDED WALL PAINT
            ===================================================== */}
        {phase === 'finishing' && (
          <>
            <div className="arch-subhead">{t.archRoomsTitle}</div>
            {floorRooms.length === 0 ? (
              <p className="arch-subtle-note">{t.archNoRoomsHint}</p>
            ) : (
              <div className="arch-room-list">
                {floorRooms.map((room) => {
                  const isSel =
                    archSelection?.kind === 'room' &&
                    archSelection.id === room.id;
                  return (
                    <div
                      key={room.id}
                      className={`arch-room-card ${isSel ? 'active' : ''}`}
                      onClick={() => onSelectArch({ kind: 'room', id: room.id })}
                    >
                      <div className="arch-room-top">
                        <input
                          type="text"
                          className="arch-room-name-input"
                          value={room.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onUpdateRoomMeta(
                              room.id,
                              { name: e.target.value },
                              false
                            )
                          }
                          onBlur={() => onUpdateRoomMeta(room.id, {}, true)}
                        />
                        <span className="arch-room-sqm">
                          {room.areaSqm.toFixed(1)} {t.archRoomAreaUnit}
                        </span>
                      </div>

                      <div className="arch-preset-chips">
                        {roomPresets.map((rp) => (
                          <button
                            key={rp}
                            type="button"
                            className="arch-tiny-chip"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateRoomMeta(room.id, { name: rp }, true);
                            }}
                          >
                            {rp}
                          </button>
                        ))}
                      </div>

                      <div className="arch-room-controls">
                        <span className="arch-mini-label">
                          {t.archRoomFloorColor}
                        </span>
                        <div className="arch-swatch-row">
                          {ARCH_FLOOR_SWATCHES.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              className={`arch-color-swatch ${
                                room.floorColor.toLowerCase() === hex
                                  ? 'active'
                                  : ''
                              }`}
                              style={{ backgroundColor: hex }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateRoomMeta(
                                  room.id,
                                  { floorColor: hex },
                                  true
                                );
                              }}
                            />
                          ))}
                          <input
                            type="color"
                            className="arch-native-color"
                            value={room.floorColor}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              onUpdateRoomMeta(
                                room.id,
                                { floorColor: e.target.value },
                                true
                              )
                            }
                          />
                        </div>
                        <div
                          className="pattern-chip-grid"
                          style={{ marginTop: 6 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(
                            [
                              { id: 'wood', label: t.patternWood },
                              { id: 'tile', label: t.patternTile },
                              { id: 'marble', label: t.patternMarble },
                              { id: 'concrete', label: t.patternConcrete },
                              { id: 'none', label: t.patternNone },
                            ] as const
                          ).map((fp) => {
                            const isPat =
                              (room.floorPattern ?? 'wood') === fp.id;
                            return (
                              <button
                                key={fp.id}
                                type="button"
                                className={`pattern-chip-btn ${
                                  isPat ? 'active' : ''
                                }`}
                                onClick={() =>
                                  onUpdateRoomMeta(
                                    room.id,
                                    { floorPattern: fp.id },
                                    true
                                  )
                                }
                              >
                                {fp.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label
                        className="arch-check-row"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={room.ceilingVisible}
                          onChange={(e) =>
                            onUpdateRoomMeta(
                              room.id,
                              { ceilingVisible: e.target.checked },
                              true
                            )
                          }
                        />
                        <span>{t.archRoomAutoCeiling}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="arch-section-divider" />
            <div className="arch-subhead">{t.archDualWallTitle}</div>

            {/* Exterior Side Color */}
            <div className="arch-dual-paint-block">
              <div className="arch-slider-head">
                <span>{t.archWallExtColor}</span>
                <code>
                  {selectedWall
                    ? selectedWall.exteriorColor
                    : wallDefaults.exteriorColor}
                </code>
              </div>
              <div className="arch-swatch-row">
                {ARCH_WALL_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`arch-color-swatch ${
                      (selectedWall?.exteriorColor ??
                        wallDefaults.exteriorColor) === hex
                        ? 'active'
                        : ''
                    }`}
                    style={{ backgroundColor: hex }}
                    onClick={() => {
                      onChangeWallDefaults({ exteriorColor: hex });
                      if (selectedWall) {
                        onUpdateWall(
                          selectedWall.id,
                          { exteriorColor: hex },
                          true
                        );
                      }
                    }}
                  />
                ))}
                <input
                  type="color"
                  className="arch-native-color"
                  value={
                    selectedWall
                      ? selectedWall.exteriorColor
                      : wallDefaults.exteriorColor
                  }
                  onChange={(e) => {
                    onChangeWallDefaults({ exteriorColor: e.target.value });
                    if (selectedWall) {
                      onUpdateWall(
                        selectedWall.id,
                        { exteriorColor: e.target.value },
                        true
                      );
                    }
                  }}
                />
              </div>
              <div className="pattern-chip-grid" style={{ marginTop: 6 }}>
                {(
                  [
                    { id: 'none', label: t.patternNone },
                    { id: 'brick', label: t.patternBrick },
                    { id: 'concrete', label: t.patternConcrete },
                    { id: 'wood', label: t.patternWood },
                    { id: 'marble', label: t.patternMarble },
                  ] as const
                ).map((wp) => {
                  const cur =
                    (selectedWall
                      ? selectedWall.exteriorPattern
                      : wallDefaults.exteriorPattern) ?? 'none';
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      className={`pattern-chip-btn ${cur === wp.id ? 'active' : ''}`}
                      onClick={() => {
                        onChangeWallDefaults({ exteriorPattern: wp.id });
                        if (selectedWall) {
                          onUpdateWall(
                            selectedWall.id,
                            { exteriorPattern: wp.id },
                            true
                          );
                        }
                      }}
                    >
                      {wp.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interior Side Color & Pattern */}
            <div className="arch-dual-paint-block">
              <div className="arch-slider-head">
                <span>{t.archWallIntColor}</span>
                <code>
                  {selectedWall
                    ? selectedWall.interiorColor
                    : wallDefaults.interiorColor}
                </code>
              </div>
              <div className="arch-swatch-row">
                {ARCH_WALL_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`arch-color-swatch ${
                      (selectedWall?.interiorColor ??
                        wallDefaults.interiorColor) === hex
                        ? 'active'
                        : ''
                    }`}
                    style={{ backgroundColor: hex }}
                    onClick={() => {
                      onChangeWallDefaults({ interiorColor: hex });
                      if (selectedWall) {
                        onUpdateWall(
                          selectedWall.id,
                          { interiorColor: hex },
                          true
                        );
                      }
                    }}
                  />
                ))}
                <input
                  type="color"
                  className="arch-native-color"
                  value={
                    selectedWall
                      ? selectedWall.interiorColor
                      : wallDefaults.interiorColor
                  }
                  onChange={(e) => {
                    onChangeWallDefaults({ interiorColor: e.target.value });
                    if (selectedWall) {
                      onUpdateWall(
                        selectedWall.id,
                        { interiorColor: e.target.value },
                        true
                      );
                    }
                  }}
                />
              </div>
              <div className="pattern-chip-grid" style={{ marginTop: 6 }}>
                {(
                  [
                    { id: 'none', label: t.patternNone },
                    { id: 'wood', label: t.patternWood },
                    { id: 'tile', label: t.patternTile },
                    { id: 'brick', label: t.patternBrick },
                    { id: 'marble', label: t.patternMarble },
                  ] as const
                ).map((wp) => {
                  const cur =
                    (selectedWall
                      ? selectedWall.interiorPattern
                      : wallDefaults.interiorPattern) ?? 'none';
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      className={`pattern-chip-btn ${cur === wp.id ? 'active' : ''}`}
                      onClick={() => {
                        onChangeWallDefaults({ interiorPattern: wp.id });
                        if (selectedWall) {
                          onUpdateWall(
                            selectedWall.id,
                            { interiorPattern: wp.id },
                            true
                          );
                        }
                      }}
                    >
                      {wp.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="arch-secondary-cta"
              onClick={() =>
                onApplyAllWallsColor(
                  wallDefaults.exteriorColor,
                  wallDefaults.interiorColor,
                  wallDefaults.exteriorPattern,
                  wallDefaults.interiorPattern
                )
              }
            >
              <PaintBucket size={14} />
              <span>{t.archApplyAllWallsBtn}</span>
            </button>
          </>
        )}

        {/* =====================================================
            PHASE 5: SUN TIME & COMPASS, LENS FOV, LASER MEASURE & 2D PNG BLUEPRINT
            ===================================================== */}
        {phase === 'environment' && (
          <>
            <label className="arch-check-row arch-highlight-toggle">
              <input
                type="checkbox"
                checked={archData.sun.sunOverride}
                onChange={(e) =>
                  onChangeSun({ sunOverride: e.target.checked }, true)
                }
              />
              <Sun size={15} />
              <span>{t.archSunToggleTitle}</span>
            </label>

            {archData.sun.sunOverride && (
              <div className="arch-selected-card">
                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>{t.archSunTimeLabel}</span>
                    <strong>{formatHourClock(archData.sun.hour)}</strong>
                  </div>
                  <input
                    type="range"
                    min={6.0}
                    max={20.0}
                    step={0.25}
                    value={archData.sun.hour}
                    onChange={(e) =>
                      onChangeSun({ hour: parseFloat(e.target.value) }, false)
                    }
                    onMouseUp={() => onChangeSun({}, true)}
                    onTouchEnd={() => onChangeSun({}, true)}
                  />
                </div>

                <div className="arch-slider-group">
                  <div className="arch-slider-head">
                    <span>
                      <Compass size={13} style={{ verticalAlign: 'middle' }} />{' '}
                      {t.archCompassNorthLabel}
                    </span>
                    <strong>{archData.sun.northDeg}°</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={355}
                    step={5}
                    value={archData.sun.northDeg}
                    onChange={(e) =>
                      onChangeSun(
                        { northDeg: parseFloat(e.target.value) },
                        false
                      )
                    }
                    onMouseUp={() => onChangeSun({}, true)}
                    onTouchEnd={() => onChangeSun({}, true)}
                  />
                </div>
              </div>
            )}

            <div className="arch-subhead">{t.archLensSectionTitle}</div>
            <div className="arch-style-pills">
              {[
                { fov: 46, label: t.archLensStd },
                { fov: 64, label: t.archLensWide },
                { fov: 78, label: t.archLensUltra },
              ].map((ln) => (
                <button
                  key={ln.fov}
                  type="button"
                  className={`arch-pill-btn ${
                    cameraLensFov === ln.fov ? 'active' : ''
                  }`}
                  onClick={() => onChangeLensFov(ln.fov)}
                >
                  <Eye size={13} />
                  <span>{ln.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`arch-secondary-cta ${
                archTool === 'measure' ? 'is-active-measure' : ''
              }`}
              onClick={() =>
                onSetArchTool(archTool === 'measure' ? 'select' : 'measure')
              }
            >
              <Ruler size={14} />
              <span>{t.archToolMeasure}</span>
            </button>

            <div className="arch-section-divider" />
            <div className="arch-subhead">{t.archSummaryTitle}</div>
            <div className="arch-metrics-box">
              <div className="arch-metric-item">
                <span>{t.archTotalAreaLabel}</span>
                <strong>
                  {totalAreaSqm.toFixed(1)} {t.archRoomAreaUnit}
                </strong>
              </div>
              <div className="arch-metric-item">
                <span>{t.archRoomCountLabel}</span>
                <strong>{detectedRooms.length}</strong>
              </div>
              <div className="arch-metric-item">
                <span>{t.archWallTotalLenLabel}</span>
                <strong>{totalWallLenM.toFixed(1)} m</strong>
              </div>
            </div>

            <button
              type="button"
              className="arch-primary-cta"
              onClick={onExportBlueprintPNG}
            >
              <Download size={15} />
              <span>{t.archExportBlueprintBtn}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
