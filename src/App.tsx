import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  Magnet,
  PaintBucket,
  Pencil,
  Pipette,
  Sparkles,
  X,
} from 'lucide-react';
import {
  BoxSelectRect,
  PaintBrushPayload,
  StudioEngine,
} from './engine/StudioEngine';
import { CameraPresetType } from './engine/viewportHelpers';
import { PRIMITIVE_META } from './engine/primitives';
import { renderPartsThumbnailDataUrl } from './engine/housePresets';
import { ModularConstructionItem } from './engine/modularConstruction';
import {
  ACCEPTED_3D_EXTENSIONS,
  hydrateImportedModelsForObjects,
  importExternal3DFile,
  LoadedImportedModelAsset,
} from './engine/modelImporter';
import { getLocalizedShapeMeta } from './i18n/shapeTranslations';
import { TRANSLATIONS } from './i18n/translations';
import {
  deleteCustomAssetRecord,
  deleteProjectRecord,
  downloadCustomAssetsPack,
  downloadProjectBackup,
  duplicateProjectRecord,
  importCustomAssetsPackFile,
  importProjectBackupFile,
  listCustomAssets,
  listProjects,
  loadGlobalSettings,
  renameProjectRecord,
  saveCustomAssetRecord,
  saveGlobalSettings,
  saveProjectRecord,
} from './services/projectStorage';
import {
  AlignDistributeAction,
  AppScreen,
  ArchBuildPhase,
  ArchDetectedRoom,
  ArchHouseData,
  ArchReviewNote,
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
  ArchWorkflowTab,
  AxisLockMode,
  BuildingFloorLayer,
  ConstructionMaterialDef,
  createEmptyArchHouseData,
  CsgBooleanMode,
  CustomAssetCategory,
  CustomAssetRecord,
  CustomProfileData,
  DEFAULT_BUILDING_FLOORS,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_SECTION_CUT_CONFIG,
  DEFAULT_SNAP_SETTINGS,
  DEFAULT_SURFACE_SETTINGS,
  DEFAULT_TERRAIN_SCULPT_SETTINGS,
  DEFAULT_WALL_DRAW,
  DesignAlternativeRecord,
  DesignAlternativeSnapshot,
  DocumentationExportSettings,
  DragFeedback,
  FloorViewMode,
  GlobalAppSettings,
  GridSettings,
  LightingMood,
  LiveSectionCutConfig,
  ObjectModifierSettings,
  ObjectPointLightConfig,
  ObjectSubdivisionSettings,
  PaintInteractionMode,
  PendingArchCommit,
  PlacementValidationStatus,
  PrimitiveKind,
  ProceduralPatternKind,
  ProjectBriefData,
  RepeatArrayConfig,
  RoomSemanticType,
  RotationSnapStep,
  SavedProjectRecord,
  SceneObjectData,
  SelectionSubMode,
  SitePlanningData,
  SnapSettings,
  StudioMode,
  StudioSnapshotOptions,
  STUDIO_THEMES,
  SubdivisionStats,
  SunEnvironmentSettings,
  SurfacePlacementRule,
  SurfaceSettings,
  TerrainSculptSettings,
  TouchLoupeState,
  TransformMode,
  TransformSpace,
  ValidationAutoFixAction,
  Vec3,
  ViewportShadingMode,
  WalkthroughInteractPrompt,
  WallDrawDefaults,
  WallTemplateId,
} from './types/studio';
import { MainMenu } from './components/MainMenu';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { SaveIndicatorState, TopBar } from './components/TopBar';
import { TransformToolbar } from './components/TransformToolbar';
import {
  CatalogTabMode,
  DesktopSpawnDock,
  MobileBottomBar,
} from './components/SpawnDock';
import { InspectorPanel, InspectorSubTab } from './components/InspectorPanel';
import { HelpModal } from './components/HelpModal';
import { RotationControlBar } from './components/RotationControlBar';
import { WalkthroughOverlay } from './components/WalkthroughOverlay';
import { RepeatArrayModal } from './components/RepeatArrayModal';
import { TerrainSculptBar } from './components/TerrainSculptBar';
import { FloorLayerWidget } from './components/FloorLayerWidget';
import { ArchStudioBar } from './components/ArchStudioBar';
import { ArchContextPanel } from './components/ArchContextPanel';
import { ArchProjectDrawer } from './components/ArchProjectDrawer';
import { StudioPhotoModal } from './components/StudioPhotoModal';
import { CustomProfileModal } from './components/CustomProfileModal';
import { QuickDimensionPill } from './components/QuickDimensionPill';
import { TouchLoupeOverlay } from './components/TouchLoupeOverlay';
import {
  IntegratedProjectAnalysisBundle,
  runIntegratedProjectAnalysis,
} from './engine/archAnalysis/alternativesService';
import { createDefaultConstructionMaterialCatalog } from './engine/archAnalysis/materialTakeoff';
import { exportFloorBlueprintPNG } from './engine/blueprintExporter';
import { AdvancedColorMaterialPatch } from './components/ColorWheelPicker';

const SMART_AUTOSAVE_IDLE_MS = 5000;
const SMART_AUTOSAVE_MAX_WAIT_MS = 15000;

/**
 * Computes a deterministic content-only signature of the scene & project settings.
 * Pure viewport interactions (orbiting camera, selecting objects, toggling panels)
 * or timestamp updates NEVER alter this signature, preventing redundant auto-saves.
 */
function computeProjectContentSignature(
  projectName: string,
  objects: SceneObjectData[],
  grid: GridSettings,
  snap: SnapSettings,
  surface: SurfaceSettings,
  mood: LightingMood,
  sculptedHeightsB64?: string | null,
  floors?: BuildingFloorLayer[],
  archData?: ArchHouseData,
  designAlternatives?: DesignAlternativeRecord[]
): string {
  const objSig = objects
    .map((o) => {
      const sub = o.subdivision
        ? `${o.subdivision.cutsX},${o.subdivision.cutsY},${o.subdivision.cutsZ},${
            o.subdivision.showGridLines ? 1 : 0
          },${o.subdivision.panelGroove.toFixed(2)}`
        : '1,1,1,1,0';
      const pl = o.pointLight
        ? `${o.pointLight.enabled ? 1 : 0}:${o.pointLight.lightType || 'point'}:${o.pointLight.color}:${o.pointLight.intensity.toFixed(
            1
          )}:${o.pointLight.distance.toFixed(1)}:${Math.round(o.pointLight.coneAngleDeg ?? 48)}:${o.pointLight.autoNightOnly ? 1 : 0}`
        : '0';
      const md = o.modifiers
        ? `${o.modifiers.bevel.toFixed(2)},${o.modifiers.taperX.toFixed(2)},${o.modifiers.taperZ.toFixed(
            2
          )},${o.modifiers.mirrorX ? 1 : 0},${o.modifiers.mirrorZ ? 1 : 0},${o.modifiers.mirrorOffset.toFixed(2)}`
        : '0';
      const csgSig = o.csgOperations?.length ?? 0;
      const profSig = o.customProfile
        ? `${o.customProfile.mode}:${o.customProfile.points.length}:${o.customProfile.depth.toFixed(2)}:${(o.customProfile.hollowThickness ?? 0).toFixed(2)}`
        : '';
      return [
        o.id,
        o.kind,
        o.name,
        o.visible ? 1 : 0,
        o.locked ? 1 : 0,
        o.groupId || '',
        o.floorId || '',
        o.constructionMaterialId || '',
        o.surfaceRule || '',
        o.modelAssetId || '',
        o.useCustomMaterial ? 1 : 0,
        o.position.x.toFixed(3),
        o.position.y.toFixed(3),
        o.position.z.toFixed(3),
        o.rotation.x.toFixed(2),
        o.rotation.y.toFixed(2),
        o.rotation.z.toFixed(2),
        o.scale.x.toFixed(3),
        o.scale.y.toFixed(3),
        o.scale.z.toFixed(3),
        o.color,
        o.roughness.toFixed(2),
        o.metalness.toFixed(2),
        (o.opacity ?? 1).toFixed(2),
        o.emissive ?? '',
        (o.emissiveIntensity ?? 0).toFixed(2),
        o.flatShading ? 1 : 0,
        o.proceduralPattern || 'none',
        (o.patternScale ?? 1).toFixed(1),
        Math.round(o.patternRotationDeg ?? 0),
        o.patternWorldScale !== false ? 1 : 0,
        csgSig,
        profSig,
        md,
        sub,
        pl,
      ].join(':');
    })
    .join('|');

  const gridSig = [
    grid.visible ? 1 : 0,
    grid.style ?? 'wire',
    grid.spacing ?? 1,
    grid.adaptive ? 1 : 0,
    grid.worldSize ?? 40,
    (grid.elevationY ?? 0).toFixed(2),
    grid.showAxes ? 1 : 0,
    (grid.opacity ?? 0.88).toFixed(2),
    grid.showRuler ? 1 : 0,
    grid.showSelectionFootprint ? 1 : 0,
    grid.verticalGrid ?? 'none',
    grid.showPlotBoundary ? 1 : 0,
    grid.plotWidth ?? 8,
    grid.plotDepth ?? 12,
    grid.terrainPreset ?? 'hills',
    (grid.terrainAmplitude ?? 1.4).toFixed(2),
  ].join(',');

  const snapSig = [
    snap.enabled ? 1 : 0,
    snap.objectMagnet ? 1 : 0,
    snap.magnetStrength ?? 'normal',
    snap.alignment ? 1 : 0,
    snap.grid ? 1 : 0,
    snap.gridStep ?? 0.25,
    snap.rotationSnapDeg ?? 15,
    snap.modularSocket ? 1 : 0,
    snap.heightSnap ? 1 : 0,
    snap.heightStep ?? 0.5,
  ].join(',');

  const surfSig = [
    surface.enabled ? 1 : 0,
    surface.conformMode ?? 'align-normal',
    surface.attachAxis ?? 'auto',
    surface.autoOnMove ? 1 : 0,
    surface.clickToPlace ? 1 : 0,
    surface.spinDeg ?? 0,
    (surface.offset ?? 0).toFixed(2),
    surface.surfaceAware ? 1 : 0,
    surface.maxFlatSlopeDeg ?? 14,
  ].join(',');

  const floorSig = (floors ?? [])
    .map(
      (f) =>
        `${f.id}:${f.name}:${(f.elevation ?? 0).toFixed(2)}:${
          f.visible ? 1 : 0
        }:${f.locked ? 1 : 0}`
    )
    .join(';');

  const archSig = archData
    ? JSON.stringify(archData)
    : '';
  const altSig = (designAlternatives ?? [])
    .map((a) => `${a.id}:${a.name}:${a.description}`)
    .join('|');

  return `${projectName}##${mood}##${gridSig}##${snapSig}##${surfSig}##${floorSig}##${
    sculptedHeightsB64 ?? ''
  }##${archSig}##${altSig}##${objSig}`;
}

function buildEmptyProjectRecord(
  mode: StudioMode,
  name: string,
  lightingMood: LightingMood
): SavedProjectRecord {
  const now = Date.now();
  const id = `proj_${now}_${Math.random().toString(36).slice(2, 7)}`;
  // All Grid feature checkboxes default to OFF (`false`) on every new project in both modes!
  const gridSettings: GridSettings =
    mode === 'house'
      ? {
          ...DEFAULT_GRID_SETTINGS,
          style: 'tile',
          spacing: 0.5,
          worldSize: 32,
          showPlotBoundary: false,
          plotWidth: 12,
          plotDepth: 12,
        }
      : { ...DEFAULT_GRID_SETTINGS };

  const snapSettings: SnapSettings =
    mode === 'house'
      ? { ...DEFAULT_SNAP_SETTINGS, modularSocket: true }
      : { ...DEFAULT_SNAP_SETTINGS, modularSocket: false };

  const surfaceSettings: SurfaceSettings =
    mode === 'house'
      ? { ...DEFAULT_SURFACE_SETTINGS, surfaceAware: true }
      : { ...DEFAULT_SURFACE_SETTINGS, surfaceAware: false };

  return {
    id,
    name,
    mode,
    thumbnailDataUrl: '',
    objectCount: 0,
    createdAt: now,
    updatedAt: now,
    scene: {
      format: 'perabot-project-v1',
      id,
      name,
      mode,
      createdAt: now,
      updatedAt: now,
      objects: [],
      gridSettings,
      snapSettings,
      surfaceSettings,
      lightingMood,
      sculptedHeightsB64: null,
      floors:
        mode === 'house'
          ? DEFAULT_BUILDING_FLOORS.map((f: BuildingFloorLayer) => ({ ...f }))
          : undefined,
      activeFloorId: mode === 'house' ? 'floor_1' : undefined,
      floorViewMode: mode === 'house' ? 'all' : undefined,
      archData: mode === 'house' ? createEmptyArchHouseData() : undefined,
    },
  };
}

export const App: React.FC = () => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudioEngine | null>(null);
  const import3DInputRef = useRef<HTMLInputElement>(null);
  const [isImporting3D, setIsImporting3D] = useState(false);
  const [isDragOverViewport, setIsDragOverViewport] = useState(false);

  // Global App Settings (Language, Theme, Graphics, Camera Speed, Density)
  const [globalSettings, setGlobalSettings] = useState<GlobalAppSettings>(() =>
    loadGlobalSettings()
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Screen & Project Library State
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');
  const [projects, setProjects] = useState<SavedProjectRecord[]>([]);
  const [customAssets, setCustomAssets] = useState<CustomAssetRecord[]>([]);
  const [activeProject, setActiveProject] = useState<SavedProjectRecord | null>(
    null
  );
  const activeProjectRef = useRef<SavedProjectRecord | null>(null);
  activeProjectRef.current = activeProject;

  const [saveState, setSaveState] = useState<SaveIndicatorState>('saved');
  const lastSavedSigRef = useRef<string>('');
  const dirtySinceRef = useRef<number | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Studio Scene State
  const [objects, setObjects] = useState<SceneObjectData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionSubMode, setSelectionSubMode] =
    useState<SelectionSubMode>('single');
  const [boxSelectRect, setBoxSelectRect] = useState<BoxSelectRect | null>(null);
  const [axisLock, setAxisLock] = useState<AxisLockMode>('free');
  const [placementValidationEnabled, setPlacementValidationEnabled] =
    useState(false);
  const [validationStatus, setValidationStatus] =
    useState<PlacementValidationStatus | null>(null);
  const [adaptiveSpacing, setAdaptiveSpacing] = useState(1);

  const [editSinglePartMode, setEditSinglePartMode] = useState(false);
  const [selectedSubdivStats, setSelectedSubdivStats] =
    useState<SubdivisionStats | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [transformSpace, setTransformSpace] = useState<TransformSpace>('world');
  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    ...DEFAULT_SNAP_SETTINGS,
  });
  const [surfaceSettings, setSurfaceSettings] = useState<SurfaceSettings>({
    ...DEFAULT_SURFACE_SETTINGS,
  });
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    ...DEFAULT_GRID_SETTINGS,
  });
  const [terrainSculptSettings, setTerrainSculptSettings] =
    useState<TerrainSculptSettings>({ ...DEFAULT_TERRAIN_SCULPT_SETTINGS });
  const [sculptedHeightsB64, setSculptedHeightsB64] = useState<string | null>(
    null
  );

  // Repeat Array Modal (#5) & Floor Layer Widget (#12)
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [floorWidgetOpen, setFloorWidgetOpen] = useState(false);
  const [floors, setFloors] = useState<BuildingFloorLayer[]>(() =>
    DEFAULT_BUILDING_FLOORS.map((f: BuildingFloorLayer) => ({ ...f }))
  );
  const [activeFloorId, setActiveFloorId] = useState('floor_1');
  const [floorViewMode, setFloorViewMode] = useState<FloorViewMode>('all');

  // House Builder & Exploration States
  const [lightingMood, setLightingMood] = useState<LightingMood>(
    globalSettings.lightingMood
  );
  const [interiorPeek, setInteriorPeek] = useState(false);
  const [walkthroughActive, setWalkthroughActive] = useState(false);

  // Architect Life × Blender House Studio States (`Buat Rumah` only)
  const [activeArchPhase, setActiveArchPhase] =
    useState<ArchBuildPhase | null>(null);
  const [archData, setArchData] = useState<ArchHouseData>(() =>
    createEmptyArchHouseData()
  );
  const [detectedRooms, setDetectedRooms] = useState<ArchDetectedRoom[]>([]);
  const [archSelection, setArchSelection] = useState<ArchSelection>(null);
  const [selectedArchItems, setSelectedArchItems] = useState<
    Array<NonNullable<ArchSelection>>
  >([]);
  const [archTool, setArchTool] = useState<ArchSubTool>('select');
  const [archNavPanMode, setArchNavPanMode] = useState(false);
  const [wallEditAngleLock, setWallEditAngleLock] = useState(true);
  const [isBlueprint2D, setIsBlueprint2D] = useState(false);
  const [cameraLensFov, setCameraLensFov] = useState(46);
  const [wallDefaults, setWallDefaults] = useState<WallDrawDefaults>({
    ...DEFAULT_WALL_DRAW,
  });
  const [activeOpeningKind, setActiveOpeningKind] =
    useState<ArchOpeningKind>('door-single');
  const [isArchActivelyDrawing, setIsArchActivelyDrawing] = useState(false);
  const [pendingArchCommit, setPendingArchCommit] =
    useState<PendingArchCommit | null>(null);

  // Advanced Visuals, Section Cut, 3D Measure, Custom Profile Studio, Walkthrough Gen-2 & Touch Loupe
  const [viewportShading, setViewportShading] =
    useState<ViewportShadingMode>('shaded');
  const [sectionCut, setSectionCut] = useState<LiveSectionCutConfig>({
    ...DEFAULT_SECTION_CUT_CONFIG,
  });
  const [universalMeasureActive, setUniversalMeasureActive] = useState(false);
  const [measuredSpan, setMeasuredSpan] = useState<{
    total: number;
    dx: number;
    dy: number;
    dz: number;
  } | null>(null);
  const [walkPrompt, setWalkPrompt] =
    useState<WalkthroughInteractPrompt | null>(null);
  const [walkGhostMode, setWalkGhostMode] = useState(false);
  const [walkEyeHeight, setWalkEyeHeight] = useState(1.65);
  const [touchLoupeState, setTouchLoupeState] = useState<TouchLoupeState>({
    active: false,
    clientX: 0,
    clientY: 0,
    targetX: 0,
    targetY: 0,
    snapped: false,
    label: null,
  });
  const [profileStudioModal, setProfileStudioModal] = useState<{
    open: boolean;
    editTargetId: string | null;
  }>({ open: false, editTargetId: null });

  // Integrated 6-System Architectural Project Workflow States (`Buat Rumah` only)
  const [archWorkflowOpen, setArchWorkflowOpen] = useState(false);
  const [archWorkflowTab, setArchWorkflowTab] =
    useState<ArchWorkflowTab>('brief');
  const [designAlternatives, setDesignAlternatives] = useState<
    DesignAlternativeRecord[]
  >([]);
  const designAlternativesRef = useRef<DesignAlternativeRecord[]>([]);
  designAlternativesRef.current = designAlternatives;
  const [validationRerunTick, setValidationRerunTick] = useState(0);
  const [isUpdatingAnalysis, setIsUpdatingAnalysis] = useState(false);

  // Collapsible sidebars + Fullscreen state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [inspectorSubTab, setInspectorSubTab] =
    useState<InspectorSubTab>('transform');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Paint / Eyedropper state
  const [paintMode, setPaintMode] = useState<PaintInteractionMode>('none');
  const [activeBrush, setActiveBrush] = useState<PaintBrushPayload>({
    color: '#3b82f6',
    roughness: 0.55,
    metalness: 0.1,
    opacity: 1,
    emissive: '#000000',
    emissiveIntensity: 0,
    flatShading: false,
  });

  const [dragFeedback, setDragFeedback] = useState<DragFeedback>({
    active: false,
    axis: null,
    mode: 'translate',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    deltaAngleDeg: 0,
    snapLabel: null,
  });

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const t = TRANSLATIONS[globalSettings.language];

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2400);
  }, []);

  const refreshLibraries = useCallback(async () => {
    const [projList, assetList] = await Promise.all([
      listProjects(),
      listCustomAssets(),
    ]);
    setProjects(projList);
    setCustomAssets(assetList);
  }, []);

  useEffect(() => {
    void refreshLibraries();
  }, [refreshLibraries]);

  // Apply theme & UI density CSS attributes to <html>
  useEffect(() => {
    document.documentElement.dataset.theme = globalSettings.theme;
    document.documentElement.dataset.density = globalSettings.uiDensity;
    document.documentElement.lang = globalSettings.language;

    const themeSpec =
      STUDIO_THEMES.find((th) => th.id === globalSettings.theme) ??
      STUDIO_THEMES[0];
    engineRef.current?.setThemeCanvasColor(themeSpec.canvasBg);
    engineRef.current?.setGraphicsQuality(globalSettings.graphicsQuality);
    engineRef.current?.setOrbitSensitivity(globalSettings.orbitSensitivity);
    const locStr = TRANSLATIONS[globalSettings.language];
    engineRef.current?.setHudLabels({
      angleLockOn: locStr.angleLockHudOn,
      angleLockFree: locStr.angleLockHudFree,
      freeRotate: locStr.freeRotateHud,
      gridScale: locStr.gridScaleHud,
      wallInner: locStr.wallInnerFaceLabel,
      wallOuter: locStr.wallOuterFaceLabel,
      endpointLocked: locStr.archEndpointSnappedBadge,
    });
    engineRef.current?.setDefaultRoomPrefix(
      globalSettings.language === 'ja'
        ? '部屋'
        : globalSettings.language === 'en'
        ? 'Room'
        : 'Ruang'
    );
  }, [globalSettings]);

  // Keep open ArchContextPanel synchronized when user clicks an architectural element in 3D
  useEffect(() => {
    if (!archSelection || activeArchPhase === null) return;
    if (archSelection.kind === 'wall' && activeArchPhase !== 'finishing') {
      setActiveArchPhase('walls');
    } else if (
      archSelection.kind === 'opening' ||
      archSelection.kind === 'stair'
    ) {
      setActiveArchPhase('openings');
    } else if (archSelection.kind === 'roof') {
      setActiveArchPhase('roofs');
    } else if (archSelection.kind === 'room') {
      setActiveArchPhase('finishing');
    }
  }, [archSelection]);

  const handleUpdateGlobalSettings = useCallback(
    (patch: Partial<GlobalAppSettings>) => {
      setGlobalSettings((prev) => {
        const next: GlobalAppSettings = { ...prev, ...patch };
        saveGlobalSettings(next);
        if (patch.lightingMood && activeScreen === 'home') {
          setLightingMood(patch.lightingMood);
        }
        return next;
      });
    },
    [activeScreen]
  );

  // Sync browser Fullscreen API events
  useEffect(() => {
    const syncFs = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const nativeFs = Boolean(
        document.fullscreenElement || doc.webkitFullscreenElement
      );
      setIsFullscreen((prev) =>
        document.documentElement.classList.contains('zen-fullscreen-fallback')
          ? prev
          : nativeFs
      );
    };
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    return () => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange', syncFs);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };

    try {
      if (
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        docEl.classList.contains('zen-fullscreen-fallback')
      ) {
        docEl.classList.remove('zen-fullscreen-fallback');
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        setIsFullscreen(false);
      } else {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
          setIsFullscreen(true);
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
          setIsFullscreen(true);
        } else {
          docEl.classList.add('zen-fullscreen-fallback');
          setIsFullscreen(true);
        }
      }
    } catch {
      const next = !isFullscreen;
      docEl.classList.toggle('zen-fullscreen-fallback', next);
      setIsFullscreen(next);
    }
  }, [isFullscreen]);

  // Smart Auto-Save: Persist current project only when genuinely dirty (or forced)
  const persistCurrentProjectNow = useCallback(
    async (options?: { overrideName?: string; force?: boolean }) => {
      // Serialize overlapping timer/pagehide/manual saves. Each queued save snapshots the
      // latest engine state only after the previous IndexedDB write has completed.
      const previousSave = saveQueueRef.current;
      let releaseSave!: () => void;
      saveQueueRef.current = new Promise<void>((resolve) => {
        releaseSave = resolve;
      });
      await previousSave;
      try {
      const proj = activeProjectRef.current;
      const engine = engineRef.current;
      if (!proj || !engine) return;

      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      const currentObjects = engine.getSerializedObjects();
      const curGrid = engine.getGridSettings();
      const curSnap = engine.getSnapSettings();
      const curSurf = engine.getSurfaceSettings();
      const curMood = engine.getLightingMood();
      const curSculptB64 = engine.exportSculptedHeightsBase64();
      const curFloorState = engine.getFloorSystemState();
      const curArchData =
        proj.mode === 'house' ? engine.getArchData() : undefined;
      const curAlts =
        proj.mode === 'house' ? designAlternativesRef.current : undefined;
      const nextName = options?.overrideName ?? proj.name;

      const nextSig = computeProjectContentSignature(
        nextName,
        currentObjects,
        curGrid,
        curSnap,
        curSurf,
        curMood,
        curSculptB64,
        proj.mode === 'house' ? curFloorState.floors : undefined,
        curArchData,
        curAlts
      );

      if (!options?.force && nextSig === lastSavedSigRef.current) {
        dirtySinceRef.current = null;
        setSaveState('saved');
        return;
      }

      setSaveState('saving');

      const hasArchStructure = Boolean(
        curArchData &&
          (curArchData.walls.length > 0 ||
            curArchData.stairs.length > 0 ||
            curArchData.roofs.length > 0)
      );
      const thumb =
        currentObjects.length > 0 || hasArchStructure
          ? engine.captureThumbnailDataUrl()
          : '';
      const totalItemCount =
        currentObjects.length +
        (curArchData
          ? curArchData.walls.length +
            curArchData.stairs.length +
            curArchData.roofs.length
          : 0);
      const now = Date.now();

      const updated: SavedProjectRecord = {
        ...proj,
        name: nextName,
        updatedAt: now,
        objectCount: totalItemCount,
        thumbnailDataUrl: thumb,
        scene: {
          ...proj.scene,
          name: nextName,
          updatedAt: now,
          objects: currentObjects,
          gridSettings: curGrid,
          snapSettings: curSnap,
          surfaceSettings: curSurf,
          lightingMood: curMood,
          sculptedHeightsB64: curSculptB64,
          floors: proj.mode === 'house' ? curFloorState.floors : undefined,
          activeFloorId:
            proj.mode === 'house' ? curFloorState.activeFloorId : undefined,
          floorViewMode:
            proj.mode === 'house' ? curFloorState.floorViewMode : undefined,
          archData: curArchData,
          designAlternatives: curAlts,
        },
      };

      activeProjectRef.current = updated;
      await saveProjectRecord(updated);
      // Commit the signature only after persistence resolves; failures stay visibly dirty.
      lastSavedSigRef.current = nextSig;
      dirtySinceRef.current = null;
      setActiveProject(updated);
      setSaveState('saved');
      } catch (error) {
        console.error('Project autosave failed', error);
        dirtySinceRef.current ??= Date.now();
        setSaveState('dirty');
      } finally {
        releaseSave();
      }
    },
    []
  );

  // Mount StudioEngine when entering the 'editor' screen
  useEffect(() => {
    if (activeScreen !== 'editor' || !activeProject) return;
    const container = viewportRef.current;
    if (!container) return;

    const engine = new StudioEngine(
      container,
      {
        onStateChange: (state) => {
          setObjects(state.objects);
          setSelectedId(state.selectedId);
          setSelectedIds(state.selectedIds);
          setCanUndo(state.canUndo);
          setCanRedo(state.canRedo);
          setSelectedSubdivStats(state.selectedSubdivStats);
          setValidationStatus(state.validationStatus);
          setAdaptiveSpacing(state.adaptiveSpacing);
          setFloors(state.floors);
          setActiveFloorId(state.activeFloorId);
          setFloorViewMode(state.floorViewMode);
          setSculptedHeightsB64(state.sculptedHeightsB64);
          setArchData(state.archData);
          setDetectedRooms(state.detectedRooms);
          setArchSelection(state.archSelection);
          setSelectedArchItems(state.selectedArchItems);
          setArchTool(state.archTool);
          setArchNavPanMode(state.archNavPanMode);
          setWallEditAngleLock(state.wallEditAngleLock);
          setIsBlueprint2D(state.isBlueprint2D);
          setCameraLensFov(state.cameraLensFov);
          setIsArchActivelyDrawing(state.isArchActivelyDrawing);
          setPendingArchCommit(state.pendingArchCommit);
          setViewportShading(state.viewportShading);
          setSectionCut(state.sectionCut);
          setUniversalMeasureActive(state.universalMeasureActive);
          setMeasuredSpan(state.measuredSpan);
          setWalkPrompt(state.walkPrompt);
          setWalkGhostMode(state.walkGhostMode);
          setWalkEyeHeight(state.walkEyeHeight);
        },
        onDragFeedback: (feedback) => {
          setDragFeedback(feedback);
        },
        onEyedropperSample: (sample, objName) => {
          setActiveBrush(sample);
          setPaintMode('bucket');
          engineRef.current?.setPaintInteraction('bucket', sample);
          showToast(`${objName} — OK`);
        },
        onPaintApplied: (objName) => {
          showToast(objName);
        },
        onBoxSelectRect: (rect) => {
          setBoxSelectRect(rect);
        },
        onTouchLoupeChange: (loupe) => {
          setTouchLoupeState(loupe);
        },
      },
      activeProject.scene.objects
    );

    engine.setStudioMode(activeProject.mode);
    engine.importSculptedHeightsBase64(
      activeProject.scene.sculptedHeightsB64 ?? null
    );
    if (activeProject.mode === 'house') {
      engine.setFloorSystemState(
        activeProject.scene.floors,
        activeProject.scene.activeFloorId,
        activeProject.scene.floorViewMode
      );
      engine.loadArchData(
        activeProject.scene.archData ?? createEmptyArchHouseData(),
        true
      );
    } else {
      engine.loadArchData(createEmptyArchHouseData(), true);
    }

    const themeSpec =
      STUDIO_THEMES.find((th) => th.id === globalSettings.theme) ??
      STUDIO_THEMES[0];
    engine.setThemeCanvasColor(themeSpec.canvasBg);
    engine.setGraphicsQuality(globalSettings.graphicsQuality);
    const initStr = TRANSLATIONS[globalSettings.language];
    engine.setHudLabels({
      angleLockOn: initStr.angleLockHudOn,
      angleLockFree: initStr.angleLockHudFree,
      freeRotate: initStr.freeRotateHud,
      gridScale: initStr.gridScaleHud,
      wallInner: initStr.wallInnerFaceLabel,
      wallOuter: initStr.wallOuterFaceLabel,
      endpointLocked: initStr.archEndpointSnappedBadge,
    });
    engine.setOrbitSensitivity(globalSettings.orbitSensitivity);

    const projMood = activeProject.scene.lightingMood || lightingMood;
    engine.setLightingMood(projMood);

    const restoredGrid = engine.updateGridSettings(
      activeProject.scene.gridSettings ?? DEFAULT_GRID_SETTINGS
    );
    const restoredSnap = engine.updateSnapSettings(
      activeProject.scene.snapSettings ?? DEFAULT_SNAP_SETTINGS
    );
    const restoredSurf = engine.updateSurfaceSettings(
      activeProject.scene.surfaceSettings ?? DEFAULT_SURFACE_SETTINGS
    );

    const initFloors = engine.getFloorSystemState().floors;
    const initSculptB64 = engine.exportSculptedHeightsBase64();
    const initArchData =
      activeProject.mode === 'house' ? engine.getArchData() : undefined;
    const initAlts =
      activeProject.mode === 'house'
        ? activeProject.scene.designAlternatives ?? []
        : [];
    setDesignAlternatives(initAlts);
    designAlternativesRef.current = initAlts;
    setArchWorkflowOpen(false);

    // Record baseline content signature on open so opening a project triggers 0 redundant saves
    lastSavedSigRef.current = computeProjectContentSignature(
      activeProject.name,
      engine.getSerializedObjects(),
      restoredGrid,
      restoredSnap,
      restoredSurf,
      projMood,
      initSculptB64,
      activeProject.mode === 'house' ? initFloors : undefined,
      initArchData,
      initAlts
    );
    dirtySinceRef.current = null;
    setSaveState('saved');

    setGridSettings(restoredGrid);
    setSnapSettings(restoredSnap);
    setSurfaceSettings(restoredSurf);
    setLightingMood(projMood);
    setInteriorPeek(false);
    setWalkthroughActive(false);
    setEditSinglePartMode(false);
    setPaintMode('none');
    setAxisLock('free');
    setSelectionSubMode('single');
    setPlacementValidationEnabled(false);
    setTerrainSculptSettings({ ...DEFAULT_TERRAIN_SCULPT_SETTINGS });
    setRepeatModalOpen(false);
    setFloorWidgetOpen(false);
    setActiveArchPhase(null);
    setIsBlueprint2D(false);
    setCameraLensFov(46);
    setWallDefaults({ ...DEFAULT_WALL_DRAW });
    setActiveOpeningKind('door-single');

    engineRef.current = engine;

    // Hydrate any binary 3D models referenced in saved projects from IndexedDB
    let cancelled = false;
    const savedObjs = activeProject.scene.objects;
    if (savedObjs.some((o) => Boolean(o.modelAssetId))) {
      void hydrateImportedModelsForObjects(
        savedObjs,
        restoredGrid.worldSize
      ).then(() => {
        if (!cancelled && engineRef.current === engine) {
          engine.loadSceneObjects(savedObjs, true);
          lastSavedSigRef.current = computeProjectContentSignature(
            activeProjectRef.current?.name ?? activeProject.name,
            engine.getSerializedObjects(),
            engine.getGridSettings(),
            engine.getSnapSettings(),
            engine.getSurfaceSettings(),
            engine.getLightingMood(),
            engine.exportSculptedHeightsBase64(),
            activeProject.mode === 'house'
              ? engine.getFloorSystemState().floors
              : undefined,
            activeProject.mode === 'house' ? engine.getArchData() : undefined,
            activeProject.mode === 'house'
              ? designAlternativesRef.current
              : undefined
          );
          dirtySinceRef.current = null;
          setSaveState('saved');
        }
      });
    }

    return () => {
      cancelled = true;
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen, activeProject?.id]);

  // Compute current content signature in editor
  const currentSceneSignature = useMemo(() => {
    if (activeScreen !== 'editor' || !activeProject) return '';
    return computeProjectContentSignature(
      activeProject.name,
      objects,
      gridSettings,
      snapSettings,
      surfaceSettings,
      lightingMood,
      sculptedHeightsB64,
      activeProject.mode === 'house' ? floors : undefined,
      activeProject.mode === 'house' ? archData : undefined,
      activeProject.mode === 'house' ? designAlternatives : undefined
    );
  }, [
    activeScreen,
    activeProject?.name,
    activeProject?.mode,
    objects,
    gridSettings,
    snapSettings,
    surfaceSettings,
    lightingMood,
    sculptedHeightsB64,
    floors,
    archData,
    designAlternatives,
  ]);

  // Debounced Integrated Architectural Analysis (`Buat Rumah` only — never lags 60fps pointer drags!)
  const [debouncedAnalysisInput, setDebouncedAnalysisInput] = useState(() => ({
    archData,
    floors,
    objects,
    detectedRooms,
  }));

  useEffect(() => {
    if (activeScreen !== 'editor' || activeProject?.mode !== 'house') return;
    const isBusyDragging = dragFeedback.active || isArchActivelyDrawing;
    if (!isBusyDragging) {
      setDebouncedAnalysisInput({ archData, floors, objects, detectedRooms });
      setIsUpdatingAnalysis(false);
      return;
    }
    setIsUpdatingAnalysis(true);
    const timer = window.setTimeout(() => {
      setDebouncedAnalysisInput({ archData, floors, objects, detectedRooms });
      setIsUpdatingAnalysis(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [
    activeScreen,
    activeProject?.mode,
    archData,
    floors,
    objects,
    detectedRooms,
    dragFeedback.active,
    isArchActivelyDrawing,
    validationRerunTick,
  ]);

  const liveArchAnalysis = useMemo<IntegratedProjectAnalysisBundle>(() => {
    return runIntegratedProjectAnalysis({
      archData: debouncedAnalysisInput.archData,
      floors: debouncedAnalysisInput.floors,
      objects: debouncedAnalysisInput.objects,
      detectedRoomsOverride: debouncedAnalysisInput.detectedRooms,
      lang: globalSettings.language,
    });
  }, [debouncedAnalysisInput, globalSettings.language, validationRerunTick]);

  // Smart Auto-Save scheduler:
  // - Never runs when nothing changed (`currentSceneSignature === lastSavedSigRef.current`)
  // - Never interrupts an active 3D drag (`dragFeedback.active === true`)
  // - Waits 5,000 ms after the last real edit (with a 15,000 ms ceiling for continuous rapid edits)
  useEffect(() => {
    if (activeScreen !== 'editor' || !engineRef.current || !currentSceneSignature) {
      return;
    }

    if (currentSceneSignature === lastSavedSigRef.current) {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      dirtySinceRef.current = null;
      setSaveState((prev) => (prev === 'saving' ? prev : 'saved'));
      return;
    }

    if (dirtySinceRef.current === null) {
      dirtySinceRef.current = Date.now();
    }
    setSaveState('dirty');

    // Pause timer while user is actively dragging a 3D gizmo/handle
    if (dragFeedback.active) {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    const elapsedDirty = Date.now() - dirtySinceRef.current;
    const waitMs =
      elapsedDirty >= SMART_AUTOSAVE_MAX_WAIT_MS
        ? 400
        : Math.min(
            SMART_AUTOSAVE_IDLE_MS,
            Math.max(800, SMART_AUTOSAVE_MAX_WAIT_MS - elapsedDirty)
          );

    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      void persistCurrentProjectNow();
    }, waitMs);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    activeScreen,
    currentSceneSignature,
    dragFeedback.active,
    persistCurrentProjectNow,
  ]);

  // Flush unsaved edits safely if user switches browser tab or closes page
  useEffect(() => {
    if (activeScreen !== 'editor') return;
    const flushIfDirty = () => {
      if (dirtySinceRef.current !== null) {
        void persistCurrentProjectNow();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushIfDirty();
      }
    };
    window.addEventListener('pagehide', flushIfDirty);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushIfDirty);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [activeScreen, persistCurrentProjectNow]);

  /* =========================================================
     Main Menu Handlers (Empty-Canvas Launch, Open, Manage)
     ========================================================= */
  const handleCreateNewProject = useCallback(
    async (mode: StudioMode, pendingAssetToSpawn?: CustomAssetRecord) => {
      const count = projects.filter((p) => p.mode === mode).length + 1;
      const defaultTitle =
        mode === 'house'
          ? `${t.untitledHouse} ${count}`
          : `${t.untitledProject} ${count}`;

      const fresh = buildEmptyProjectRecord(
        mode,
        defaultTitle,
        globalSettings.lightingMood
      );
      await saveProjectRecord(fresh);
      setActiveProject(fresh);
      setActiveScreen('editor');

      if (pendingAssetToSpawn) {
        window.setTimeout(() => {
          engineRef.current?.spawnCompoundParts(
            pendingAssetToSpawn.parts,
            pendingAssetToSpawn.name,
            'prop'
          );
        }, 120);
      }
    },
    [projects, t, globalSettings.lightingMood]
  );

  const handleOpenProject = useCallback((proj: SavedProjectRecord) => {
    setActiveProject(proj);
    setActiveScreen('editor');
  }, []);

  const handleGoHome = useCallback(async () => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    await persistCurrentProjectNow();
    await refreshLibraries();
    setWalkthroughActive(false);
    setInteriorPeek(false);
    setActiveScreen('home');
  }, [persistCurrentProjectNow, refreshLibraries]);

  const handleSaveProjectManual = useCallback(async () => {
    await persistCurrentProjectNow({ force: true });
    showToast(t.savedAuto);
  }, [persistCurrentProjectNow, showToast, t.savedAuto]);

  const handleRenameProjectInMenu = useCallback(
    async (proj: SavedProjectRecord, newName: string) => {
      await renameProjectRecord(proj, newName);
      await refreshLibraries();
    },
    [refreshLibraries]
  );

  const handleRenameActiveProject = useCallback(
    async (newName: string) => {
      if (!activeProjectRef.current) return;
      setActiveProject((prev) =>
        prev
          ? {
              ...prev,
              name: newName,
              scene: { ...prev.scene, name: newName },
            }
          : prev
      );
      await persistCurrentProjectNow({ overrideName: newName, force: true });
    },
    [persistCurrentProjectNow]
  );

  const handleDuplicateProject = useCallback(
    async (proj: SavedProjectRecord) => {
      const copySuffix =
        globalSettings.language === 'en'
          ? ' (Copy)'
          : globalSettings.language === 'ja'
          ? ' (コピー)'
          : ' (Salinan)';
      await duplicateProjectRecord(proj, copySuffix);
      await refreshLibraries();
      showToast(t.duplicate);
    },
    [globalSettings.language, refreshLibraries, showToast, t.duplicate]
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      await deleteProjectRecord(id);
      await refreshLibraries();
      showToast(t.delete);
    },
    [refreshLibraries, showToast, t.delete]
  );

  const handleImportProjectFile = useCallback(
    async (file: File) => {
      try {
        const imported = await importProjectBackupFile(file);
        await refreshLibraries();
        setActiveProject(imported);
        setActiveScreen('editor');
      } catch {
        showToast(t.import3DFailedToast);
      }
    },
    [refreshLibraries, showToast, t.import3DFailedToast]
  );

  const handleDeleteCustomAsset = useCallback(
    async (id: string) => {
      await deleteCustomAssetRecord(id);
      await refreshLibraries();
      showToast(t.delete);
    },
    [refreshLibraries, showToast, t.delete]
  );

  /* =========================================================
     Studio Action Handlers
     ========================================================= */
  const handleSpawn = useCallback(
    (kind: PrimitiveKind) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.spawnPrimitive(kind);
      setTransformMode(engine.getTransformMode());
      const loc = getLocalizedShapeMeta(
        PRIMITIVE_META[kind],
        globalSettings.language
      );
      showToast(`+ ${loc.label}`);
    },
    [globalSettings.language, showToast]
  );

  const handleTriggerImport3D = useCallback(() => {
    import3DInputRef.current?.click();
  }, []);

  const handleImport3DFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const engine = engineRef.current;
      if (files.length === 0 || !engine) return;

      setIsImporting3D(true);
      showToast(t.importing3DToast);

      const domainSize = engine.getDomainWorldSize();
      const loadedAssets: LoadedImportedModelAsset[] = [];
      let failedCount = 0;

      for (const file of files) {
        try {
          const asset = await importExternal3DFile(file, domainSize);
          loadedAssets.push(asset);
        } catch {
          failedCount++;
        }
      }

      setIsImporting3D(false);

      if (loadedAssets.length > 0) {
        engine.spawnImportedModels(loadedAssets);
        setTransformMode(engine.getTransformMode());
        if (loadedAssets.length === 1) {
          const one = loadedAssets[0];
          showToast(`+ ${one.name} (.${one.format})`);
        } else {
          showToast(`+ ${loadedAssets.length} 3D`);
        }
      } else if (failedCount > 0) {
        showToast(t.import3DFailedToast);
      }
    },
    [showToast, t.importing3DToast, t.import3DFailedToast]
  );

  const handleResetImportedMaterial = useCallback(
    (id: string) => {
      engineRef.current?.resetImportedObjectMaterial(id);
      showToast(t.restoreOriginalMaterial);
    },
    [showToast, t.restoreOriginalMaterial]
  );

  const handleSpawnCustomAsset = useCallback(
    (asset: CustomAssetRecord) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.spawnCompoundParts(asset.parts, asset.name, 'prop');
      setEditSinglePartMode(false);
      showToast(`+ ${asset.name}`);
    },
    [showToast]
  );

  const handleSpawnModularItem = useCallback(
    (item: ModularConstructionItem, label: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.spawnModularItem(item, label);
      setEditSinglePartMode(false);
      showToast(`+ ${label}`);
    },
    [showToast]
  );

  const handleChangeSelectionSubMode = useCallback((sub: SelectionSubMode) => {
    setSelectionSubMode(sub);
    engineRef.current?.setSelectionSubMode(sub);
  }, []);

  const handleSelectAll = useCallback(() => {
    const count = engineRef.current?.selectAllObjects() ?? 0;
    if (count > 0) {
      showToast(`${count} ${t.multiSelectedCount}`);
    }
  }, [showToast, t.multiSelectedCount]);

  const handleToggleSelectObject = useCallback((id: string) => {
    engineRef.current?.toggleSelectObject(id);
  }, []);

  const handleChangeAxisLock = useCallback((lock: AxisLockMode) => {
    setAxisLock(lock);
    engineRef.current?.setAxisLock(lock);
  }, []);

  const handleTogglePlacementValidation = useCallback(() => {
    setPlacementValidationEnabled((prev) => {
      const next = !prev;
      engineRef.current?.setPlacementValidationEnabled(next);
      return next;
    });
  }, []);

  const handleToggleTerrainSculpt = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const nextActive = !terrainSculptSettings.active;
    const updated = engine.updateTerrainSculptSettings({
      active: nextActive,
    });
    setTerrainSculptSettings(updated);
    setGridSettings(engine.getGridSettings());
  }, [terrainSculptSettings.active]);

  const handleUpdateTerrainSculpt = useCallback(
    (patch: Partial<TerrainSculptSettings>) => {
      const engine = engineRef.current;
      if (!engine) return;
      const updated = engine.updateTerrainSculptSettings(patch);
      setTerrainSculptSettings(updated);
      setGridSettings(engine.getGridSettings());
    },
    []
  );

  const handleLevelPlotPad = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.levelTerrainPlotPad();
    setGridSettings(engine.getGridSettings());
    showToast(t.sculptLevelPlotBtn);
  }, [showToast, t.sculptLevelPlotBtn]);

  const handleResetSculptedTerrain = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.resetSculptedTerrain();
    setGridSettings(engine.getGridSettings());
    showToast(t.sculptResetFlatBtn);
  }, [showToast, t.sculptResetFlatBtn]);

  const handlePreviewRepeatArray = useCallback(
    (config: RepeatArrayConfig | null): number => {
      return engineRef.current?.previewRepeatArray(config) ?? 0;
    },
    []
  );

  const handleCommitRepeatArray = useCallback(
    (config: RepeatArrayConfig) => {
      const created = engineRef.current?.commitRepeatArray(config) ?? 0;
      setRepeatModalOpen(false);
      if (created > 0) {
        showToast(`${t.repeatAppliedToast} (+${created})`);
      }
    },
    [showToast, t.repeatAppliedToast]
  );

  const handleSelectFloor = useCallback((floorId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setActiveFloor(floorId, true);
    setGridSettings(engine.getGridSettings());
  }, []);

  const handleAddFloor = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const fl = engine.addBuildingFloor(t.floorSystemTitle);
    setGridSettings(engine.getGridSettings());
    showToast(`+ ${fl.name} (${fl.elevation}m)`);
  }, [showToast, t.floorSystemTitle]);

  const handleRemoveFloor = useCallback((floorId: string) => {
    engineRef.current?.removeBuildingFloor(floorId);
  }, []);

  const handleUpdateFloor = useCallback(
    (floorId: string, patch: Partial<BuildingFloorLayer>) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.updateBuildingFloor(floorId, patch);
      setGridSettings(engine.getGridSettings());
    },
    []
  );

  const handleChangeFloorViewMode = useCallback((mode: FloorViewMode) => {
    engineRef.current?.setFloorViewMode(mode);
  }, []);

  const handleCopyLowerFloorWalls = useCallback(() => {
    const copied = engineRef.current?.copyLowerFloorWallsToActiveFloor() ?? 0;
    if (copied > 0) {
      showToast(`${t.archCopiedLowerWallsToast} (+${copied})`);
    }
  }, [showToast, t.archCopiedLowerWallsToast]);

  const handleConfirmPendingArchCommit = useCallback(() => {
    engineRef.current?.confirmPendingArchCommit();
  }, []);

  const handleCancelPendingArchCommit = useCallback(() => {
    engineRef.current?.cancelPendingArchCommit();
  }, []);

  const handleRotateSelectedArch90 = useCallback(() => {
    engineRef.current?.rotateSelectedArchElement90();
  }, []);

  const handleOpenSelectedArchProps = useCallback(() => {
    if (!archSelection) return;
    setInspectorSubTab('transform');
    if (window.innerWidth < 768) {
      setMobileDrawerOpen(true);
    } else {
      setInspectorOpen(true);
    }
  }, [archSelection]);

  const handleToggleWallEditAngleLock = useCallback(() => {
    setWallEditAngleLock((prev) => {
      const next = !prev;
      engineRef.current?.setWallEditAngleLock(next);
      setWallDefaults((wd) => {
        const nextWd = { ...wd, angleSnap: next };
        engineRef.current?.setWallDrawDefaults(nextWd);
        return nextWd;
      });
      return next;
    });
  }, []);

  const handleToggleArchNavPanMode = useCallback((panOnly: boolean) => {
    setArchNavPanMode(panOnly);
    engineRef.current?.setArchNavPanMode(panOnly);
  }, []);

  const handleSelectArchElement = useCallback(
    (sel: ArchSelection, additive = false) => {
      engineRef.current?.selectArchElement(sel, additive);
    },
    []
  );

  const handleToggleDoorOpen = useCallback((openingId: string) => {
    engineRef.current?.toggleArchDoorOpen(openingId);
  }, []);

  const handleToggleObjectLock = useCallback((id: string) => {
    engineRef.current?.toggleObjectLocked(id);
  }, []);

  const handleAlignDistribute = useCallback(
    (action: AlignDistributeAction) => {
      const moved = engineRef.current?.alignOrDistributeSelected(action) ?? 0;
      if (moved > 0) {
        showToast(t.alignedToast);
      }
    },
    [showToast, t.alignedToast]
  );

  const handleSetExactDimensions = useCallback(
    (
      size: [number, number, number],
      proportional: boolean,
      changedAxis?: 0 | 1 | 2
    ) => {
      engineRef.current?.setSelectedExactDimensions(
        size,
        proportional,
        changedAxis
      );
    },
    []
  );

  const selectedExactDimensions = useMemo(() => {
    if (!selectedId && (!archSelection || archSelection.kind === 'room')) {
      return null;
    }
    return engineRef.current?.getSelectedCombinedDimensions() ?? null;
  }, [objects, selectedId, selectedIds, archData, archSelection]);

  const handleExportAssetsPack = useCallback(async () => {
    const count = await downloadCustomAssetsPack();
    if (count > 0) {
      showToast(`${t.assetsPackExportedToast} (${count})`);
    }
  }, [showToast, t.assetsPackExportedToast]);

  const handleImportAssetsPack = useCallback(
    async (file: File) => {
      try {
        const added = await importCustomAssetsPackFile(file);
        await refreshLibraries();
        showToast(`${t.assetsPackImportedToast} (+${added})`);
      } catch {
        showToast(t.import3DFailedToast);
      }
    },
    [refreshLibraries, showToast, t.assetsPackImportedToast, t.import3DFailedToast]
  );

  const handleAssignObjectFloor = useCallback(
    (objectId: string, floorId: string, moveY = true) => {
      engineRef.current?.assignObjectToFloor(objectId, floorId, moveY);
    },
    []
  );

  const handleUpdateSurfaceRule = useCallback(
    (objectId: string, rule: SurfacePlacementRule) => {
      engineRef.current?.updateObjectSurfaceRule(objectId, rule);
    },
    []
  );

  const [photoStudioOpen, setPhotoStudioOpen] = useState(false);
  const [editingCustomAsset, setEditingCustomAsset] =
    useState<CustomAssetRecord | null>(null);
  const [saveAssetModal, setSaveAssetModal] = useState<{
    name: string;
    category: CustomAssetCategory;
    bundleAll?: boolean;
  } | null>(null);

  const handleSaveAsCustomAsset = useCallback(
    async (
      customName?: string,
      bundleAll = false,
      categoryOverride?: CustomAssetCategory
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      const extracted = engine.extractPartsForCustomAsset(bundleAll);
      if (!extracted) return;

      if (!customName) {
        setSaveAssetModal({
          name: editingCustomAsset?.name || extracted.defaultName,
          category: editingCustomAsset?.category || 'other',
          bundleAll,
        });
        return;
      }

      const finalName = (customName || extracted.defaultName).trim();
      const thumb =
        extracted.thumbnailDataUrl ||
        renderPartsThumbnailDataUrl(extracted.parts);

      const record: CustomAssetRecord = {
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: finalName,
        category: categoryOverride ?? 'other',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        thumbnailDataUrl: thumb,
        parts: extracted.parts,
        dimensions: extracted.dimensions,
      };

      await saveCustomAssetRecord(record);
      await refreshLibraries();
      setSaveAssetModal(null);
      showToast(t.savedToAssetsToast);
    },
    [editingCustomAsset, refreshLibraries, showToast, t.savedToAssetsToast]
  );

  const handleEditCustomAsset = useCallback(
    (asset: CustomAssetRecord) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.loadCustomAssetPartsForEdit(asset.parts, asset.name);
      setEditSinglePartMode(true);
      setEditingCustomAsset(asset);
      showToast(`${t.assetReEditLoadedToast} (${asset.name})`);
    },
    [showToast, t.assetReEditLoadedToast]
  );

  const handleUpdateExistingCustomAsset = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !editingCustomAsset) return;
    const extracted = engine.extractPartsForCustomAsset(true);
    if (!extracted) return;

    const thumb =
      extracted.thumbnailDataUrl ||
      renderPartsThumbnailDataUrl(extracted.parts);
    const updated: CustomAssetRecord = {
      ...editingCustomAsset,
      updatedAt: Date.now(),
      thumbnailDataUrl: thumb,
      parts: extracted.parts,
      dimensions: extracted.dimensions,
    };
    await saveCustomAssetRecord(updated);
    await refreshLibraries();
    setEditingCustomAsset(updated);
    showToast(t.assetUpdatedToast);
  }, [editingCustomAsset, refreshLibraries, showToast, t.assetUpdatedToast]);

  const handleToggleEditSinglePart = useCallback((enabled: boolean) => {
    engineRef.current?.setEditSinglePartMode(enabled);
    setEditSinglePartMode(enabled);
  }, []);

  const handleGroupSceneObjects = useCallback(() => {
    const gid = engineRef.current?.groupAllSceneObjects(
      activeProject?.name || t.untitledProject
    );
    if (gid) {
      setEditSinglePartMode(false);
      showToast(t.groupedToast);
    }
  }, [activeProject?.name, showToast, t.groupedToast, t.untitledProject]);

  const handleUngroupSelected = useCallback(() => {
    const ok = engineRef.current?.ungroupSelected();
    if (ok) {
      setEditSinglePartMode(false);
      showToast(t.ungroupedToast);
    }
  }, [showToast, t.ungroupedToast]);

  const handleCycleLightingMood = useCallback(() => {
    const order: LightingMood[] = ['morning', 'sunset', 'night'];
    const next = order[(order.indexOf(lightingMood) + 1) % order.length];
    setLightingMood(next);
    engineRef.current?.setLightingMood(next);
    const label =
      next === 'sunset'
        ? t.moodSunset
        : next === 'night'
        ? t.moodNight
        : t.moodMorning;
    showToast(label);
  }, [lightingMood, showToast, t]);

  const handleToggleInteriorPeek = useCallback(() => {
    setInteriorPeek((prev) => {
      const next = !prev;
      engineRef.current?.setInteriorPeek(next);
      showToast(
        `${t.peekInterior}: ${next ? t.activeState : t.inactiveState}`
      );
      return next;
    });
  }, [showToast, t.peekInterior, t.activeState, t.inactiveState]);

  const handleToggleWalkthrough = useCallback(() => {
    setWalkthroughActive((prev) => {
      const next = !prev;
      engineRef.current?.setWalkthroughMode(next);
      return next;
    });
  }, []);

  const handleChangeMode = useCallback((mode: TransformMode) => {
    const engine = engineRef.current;
    if (!engine) return;
    setPaintMode('none');
    engine.setPaintInteraction('none');
    engine.setTransformMode(mode);
    setTransformMode(mode);
  }, []);

  const handleOpenColorStudio = useCallback(() => {
    setInspectorSubTab('color');
    if (window.innerWidth < 768) {
      setMobileDrawerOpen(true);
    } else {
      setInspectorOpen(true);
    }
  }, []);

  const handleChangePaintMode = useCallback(
    (mode: PaintInteractionMode) => {
      setPaintMode(mode);
      engineRef.current?.setPaintInteraction(mode, activeBrush);
    },
    [activeBrush]
  );

  const handleToggleSpace = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next: TransformSpace = transformSpace === 'world' ? 'local' : 'world';
    engine.setTransformSpace(next);
    setTransformSpace(next);
  }, [transformSpace]);

  const handleUpdateSnap = useCallback((patch: Partial<SnapSettings>) => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = engine.updateSnapSettings(patch);
    setSnapSettings(next);
  }, []);

  const handleUpdateSurface = useCallback(
    (patch: Partial<SurfaceSettings>, reconformNow = false) => {
      const engine = engineRef.current;
      if (!engine) return;
      const next = engine.updateSurfaceSettings(patch);
      setSurfaceSettings(next);
      if (reconformNow && selectedId) {
        const label = engine.dropSelectedToFloor();
        if (label) showToast(label);
      }
    },
    [selectedId, showToast]
  );

  const handleUpdateGrid = useCallback((patch: Partial<GridSettings>) => {
    const engine = engineRef.current;
    if (!engine) return;
    const nextGrid = engine.updateGridSettings(patch);
    setGridSettings(nextGrid);
    setSnapSettings(engine.getSnapSettings());
  }, []);

  const handleAlignGridToSelection = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const nextGrid = engine.alignGridToSelectedBase();
    if (nextGrid) {
      setGridSettings(nextGrid);
      showToast(`${t.gridElevationLabel}: ${nextGrid.elevationY.toFixed(2)}m`);
    }
  }, [showToast, t.gridElevationLabel]);

  const handleChangeRotationSnap = useCallback(
    (step: RotationSnapStep) => {
      handleUpdateSnap({ rotationSnapDeg: step });
    },
    [handleUpdateSnap]
  );

  const handleRotateStep = useCallback(
    (axis: 'x' | 'y' | 'z', deltaDeg: number) => {
      const ok = engineRef.current?.rotateSelectedBy(axis, deltaDeg);
      if (ok) {
        const sign = deltaDeg > 0 ? '+' : '';
        showToast(`${axis.toUpperCase()} ${sign}${deltaDeg}°`);
      }
    },
    [showToast]
  );

  const handleResetRotation = useCallback(() => {
    engineRef.current?.resetSelectedRotation();
  }, []);

  const handleFocusCamera = useCallback(() => {
    engineRef.current?.focusSelectedOrReset();
  }, []);

  const handleCameraPreset = useCallback((preset: CameraPresetType) => {
    engineRef.current?.setCameraPreset(preset);
  }, []);

  const handleExport = useCallback(
    async (format: 'glb' | 'gltf' | 'obj', onlySelected = false) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const { blob, filename } = await engine.exportScene(
          format,
          onlySelected
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(filename);
      } catch (err) {
        console.error(err);
      }
    },
    [showToast]
  );

  const handleApplyBooleanCSG = useCallback(
    (mode: CsgBooleanMode) => {
      const ok = engineRef.current?.applyBooleanCSGSelected(mode);
      if (ok) {
        showToast(t.csgAppliedToast);
      }
    },
    [showToast, t.csgAppliedToast]
  );

  const handleClearObjectCSG = useCallback(
    (id: string) => {
      const ok = engineRef.current?.clearObjectCSG(id);
      if (ok) {
        showToast(t.csgResetBtn);
      }
    },
    [showToast, t.csgResetBtn]
  );

  const handleOpenCustomProfileModal = useCallback(
    (editSelected = false) => {
      setProfileStudioModal({
        open: true,
        editTargetId: editSelected && selectedId ? selectedId : null,
      });
    },
    [selectedId]
  );

  const handleApplyCustomProfile = useCallback(
    (profile: CustomProfileData, customName?: string) => {
      engineRef.current?.spawnOrUpdateCustomProfile(
        profile,
        profileStudioModal.editTargetId,
        customName
      );
      setProfileStudioModal({ open: false, editTargetId: null });
    },
    [profileStudioModal.editTargetId]
  );

  const handleClearScene = useCallback(() => {
    engineRef.current?.clearScene();
    if (activeProjectRef.current?.mode === 'house') {
      engineRef.current?.loadArchData(createEmptyArchHouseData(), false);
      engineRef.current?.pushHistoryFromUI();
    }
    showToast(t.clearScene);
  }, [showToast, t.clearScene]);

  const handleUpdatePointLight = useCallback(
    (
      id: string,
      patch: Partial<ObjectPointLightConfig>,
      commitHistory = true
    ) => {
      engineRef.current?.updateObjectPointLight(id, patch, commitHistory);
    },
    []
  );

  // Architect Life × Blender Handlers (`Buat Rumah` only)
  const handleSelectArchPhase = useCallback((phase: ArchBuildPhase | null) => {
    setActiveArchPhase(phase);
    if (phase !== null) {
      setFloorWidgetOpen(false);
      setRepeatModalOpen(false);
    }
  }, []);

  const handleSetArchTool = useCallback((tool: ArchSubTool) => {
    setArchTool(tool);
    engineRef.current?.setArchTool(tool);
    if (
      tool !== 'select' &&
      typeof window !== 'undefined' &&
      window.innerWidth <= 920
    ) {
      setActiveArchPhase(null);
    }
  }, []);

  const handleChangeWallDefaults = useCallback(
    (patch: Partial<WallDrawDefaults>) => {
      setWallDefaults((prev) => {
        const next = { ...prev, ...patch };
        engineRef.current?.setWallDrawDefaults(next);
        return next;
      });
    },
    []
  );

  const [externalCatalogRequest, setExternalCatalogRequest] = useState<{
    tab: CatalogTabMode;
    seq: number;
  } | null>(null);

  const handleOpenWallTemplatesShelf = useCallback(() => {
    setExternalCatalogRequest((prev) => ({
      tab: 'walls',
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, []);

  const handleSpawnWallTemplate = useCallback(() => {
    const created = engineRef.current?.spawnStandardWallTemplate(wallDefaults);
    if (created) {
      setArchTool('select');
      setTransformMode(engineRef.current?.getTransformMode() ?? 'translate');
      showToast(
        `${t.archPhaseWalls} (${wallDefaults.lengthTemplate.toFixed(1)}m × ${wallDefaults.height.toFixed(1)}m × ${Math.round(
          wallDefaults.thickness * 100
        )}cm)`
      );
    }
  }, [wallDefaults, showToast, t.archPhaseWalls]);

  const handleSpawnWallTemplateById = useCallback(
    (templateId: WallTemplateId, label: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      const created = engine.spawnWallTemplateById(templateId);
      if (created.length > 0) {
        setArchTool('select');
        setTransformMode(engine.getTransformMode());
        showToast(`+ ${label}`);
      }
    },
    [showToast]
  );

  const handleActivateWallDrawTemplate = useCallback(
    (templateId: WallTemplateId, label: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (engine.activateWallDrawTemplate(templateId)) {
        setWallDefaults(engine.getWallDrawDefaults());
        setArchTool(engine.getArchTool());
        if (engine.getArchTool() === 'draw-wall') {
          setActiveArchPhase('walls');
          showToast(`${t.wallTemplateDrawSelectedToast} ${label}`);
        } else {
          setTransformMode(engine.getTransformMode());
          showToast(`+ ${label}`);
        }
      }
    },
    [showToast, t.wallTemplateDrawSelectedToast]
  );

  const handleApplyTemplateToWall = useCallback(
    (wallId: string, templateId: WallTemplateId) => {
      const ok = engineRef.current?.applyTemplateToArchWall(wallId, templateId);
      if (ok) {
        showToast(t.wallTemplateProfileTitle);
      }
    },
    [showToast, t.wallTemplateProfileTitle]
  );

  const handleUpdateArchWall = useCallback(
    (id: string, patch: Partial<ArchWallSegment>, commit = true) => {
      engineRef.current?.updateArchWall(id, patch, commit);
    },
    []
  );

  const handleBakeSelectedWall = useCallback(() => {
    const ok = engineRef.current?.bakeSelectedWallToEditableMeshes();
    if (ok) {
      showToast(t.archBakeSuccessToast);
    }
  }, [showToast, t.archBakeSuccessToast]);

  const handleSelectOpeningKind = useCallback((kind: ArchOpeningKind) => {
    setActiveOpeningKind(kind);
    engineRef.current?.setActiveOpeningKind(kind);
  }, []);

  const handleUpdateArchOpening = useCallback(
    (id: string, patch: Partial<ArchOpeningItem>, commit = true) => {
      engineRef.current?.updateArchOpening(id, patch, commit);
    },
    []
  );

  const handleAddArchStair = useCallback(
    (kind: ArchStairKind) => {
      const created = engineRef.current?.addArchStaircase(kind);
      if (created) {
        showToast(t.archStairPlacedToast);
      }
    },
    [showToast, t.archStairPlacedToast]
  );

  const handleUpdateArchStair = useCallback(
    (id: string, patch: Partial<ArchStairItem>, commit = true) => {
      engineRef.current?.updateArchStair(id, patch, commit);
    },
    []
  );

  const handleGenerateAutoRoof = useCallback(
    (style: ArchRoofStyle) => {
      const created = engineRef.current?.generateSmartAutoRoof(
        style,
        t.archPhaseRoofs
      );
      if (created) {
        showToast(t.archRoofAddedToast);
      }
    },
    [showToast, t.archPhaseRoofs, t.archRoofAddedToast]
  );

  const handleUpdateArchRoof = useCallback(
    (id: string, patch: Partial<ArchRoofItem>, commit = true) => {
      engineRef.current?.updateArchRoof(id, patch, commit);
    },
    []
  );

  const handleUpdateArchRoomMeta = useCallback(
    (
      roomId: string,
      patch: Partial<
        Pick<
          ArchRoomMeta,
          | 'name'
          | 'roomType'
          | 'floorColor'
          | 'floorPattern'
          | 'floorMaterialId'
          | 'ceilingVisible'
          | 'isVoid'
        >
      >,
      commit = true
    ) => {
      engineRef.current?.updateArchRoomMeta(roomId, patch, commit);
    },
    []
  );

  const handleUpdateArchBrief = useCallback((nextBrief: ProjectBriefData) => {
    engineRef.current?.updateArchBrief(nextBrief, true);
  }, []);

  const handleUpdateArchMaterialCatalog = useCallback(
    (nextCatalog: ConstructionMaterialDef[]) => {
      engineRef.current?.updateArchMaterialCatalog(nextCatalog, true);
    },
    []
  );

  const handleUpdateArchSite = useCallback((nextSite: SitePlanningData) => {
    engineRef.current?.updateArchSitePlanning(nextSite, true);
  }, []);

  const handleUpdateArchDocSettings = useCallback(
    (nextDocSettings: DocumentationExportSettings) => {
      engineRef.current?.updateArchDocSettings(nextDocSettings);
    },
    []
  );

  const handleUpdateArchReviewNotes = useCallback((notes: ArchReviewNote[]) => {
    engineRef.current?.updateArchReviewNotes(notes);
  }, []);

  const handleAutoAssignDefaultMaterials = useCallback(() => {
    const count = engineRef.current?.assignDefaultMaterialsToUnassigned() ?? 0;
    if (count > 0) {
      showToast(t.constMatAutoAssignedToast);
    }
  }, [showToast, t.constMatAutoAssignedToast]);

  const handleShiftBuildingOnSite = useCallback((dx: number, dz: number) => {
    engineRef.current?.translateBuildingWithinSite(dx, dz);
  }, []);

  const handleRotateBuilding90 = useCallback(() => {
    engineRef.current?.rotateBuildingWithinSite90();
  }, []);

  const handleApplyValidationAutoFix = useCallback(
    (action: ValidationAutoFixAction) => {
      const ok = engineRef.current?.applyValidationAutoFix(action);
      if (ok) {
        showToast(t.valAutoFixedToast);
      }
    },
    [showToast, t.valAutoFixedToast]
  );

  const handleFocusArchitecturalElement = useCallback(
    (
      domain:
        | 'wall'
        | 'opening'
        | 'room'
        | 'stair'
        | 'roof'
        | 'object'
        | 'site'
        | 'brief',
      id: string
    ) => {
      engineRef.current?.focusArchitecturalElement(domain, id);
    },
    []
  );

  const handleRestoreDesignAlternative = useCallback(
    (snapshot: DesignAlternativeSnapshot) => {
      engineRef.current?.restoreDesignAlternativeSnapshot(snapshot);
      showToast(t.altRestoredToast);
    },
    [showToast, t.altRestoredToast]
  );

  const handleUpdateObjectConstructionMaterial = useCallback(
    (objectId: string, materialId: string | undefined) => {
      engineRef.current?.updateObjectConstructionMaterial(
        objectId,
        materialId,
        true
      );
    },
    []
  );

  const activeMaterialCatalog = useMemo(
    () =>
      archData.materialCatalog && archData.materialCatalog.length > 0
        ? archData.materialCatalog
        : createDefaultConstructionMaterialCatalog(),
    [archData.materialCatalog]
  );

  const handleApplyAllWallsColor = useCallback(
    (
      extColor: string,
      intColor: string,
      extPattern?: ProceduralPatternKind,
      intPattern?: ProceduralPatternKind
    ) => {
      const count =
        engineRef.current?.applyFloorWallsDualColor(
          extColor,
          intColor,
          extPattern,
          intPattern
        ) ?? 0;
      if (count > 0) {
        showToast(`${count} × ${t.archPhaseWalls}`);
      }
    },
    [showToast, t.archPhaseWalls]
  );

  const handleCommitExactWallLength = useCallback(
    (meters: number) => {
      const ok = engineRef.current?.commitWallWithExactLength(meters);
      if (ok) {
        showToast(`${meters.toFixed(2)} m`);
      }
    },
    [showToast]
  );

  const handleAddRoofWing = useCallback(
    (style: ArchRoofStyle) => {
      engineRef.current?.addSmartRoofWing(style, t.archPhaseRoofs);
    },
    [t.archPhaseRoofs]
  );

  const handleDeleteSelectedArch = useCallback(() => {
    const ok = engineRef.current?.deleteSelectedArchItem();
    if (ok) {
      showToast(t.delete);
    }
  }, [showToast, t.delete]);

  const handleChangeSun = useCallback(
    (patch: Partial<SunEnvironmentSettings>, commit = false) => {
      engineRef.current?.setSunEnvironment(patch, commit);
    },
    []
  );

  const handleToggleBlueprint2D = useCallback((next: boolean) => {
    engineRef.current?.setBlueprint2DView(next);
  }, []);

  const handleChangeLensFov = useCallback((fov: number) => {
    engineRef.current?.setCameraLensFov(fov);
  }, []);

  const handleExportBlueprintPNG = useCallback(() => {
    const proj = activeProjectRef.current;
    if (!proj) return;
    const fl = floors.find((f) => f.id === activeFloorId) ?? floors[0];
    if (!fl) return;
    exportFloorBlueprintPNG({
      projectName: proj.name,
      floor: fl,
      archData,
      detectedRooms,
    });
    showToast(t.archBlueprintExportedToast);
  }, [floors, activeFloorId, archData, detectedRooms, showToast, t.archBlueprintExportedToast]);

  const handleSelectObject = useCallback((id: string) => {
    engineRef.current?.selectObject(id);
  }, []);

  const handleUpdateTransform = useCallback(
    (id: string, patch: Partial<{ position: Vec3; rotation: Vec3; scale: Vec3 }>) => {
      engineRef.current?.updateObjectTransform(id, patch);
    },
    []
  );

  const handleUpdateMaterial = useCallback(
    (
      id: string | null,
      patch: AdvancedColorMaterialPatch & {
        name?: string;
        visible?: boolean;
        proceduralPattern?: ProceduralPatternKind;
        patternScale?: number;
        patternRotationDeg?: number;
        patternWorldScale?: boolean;
      },
      commitHistory = true
    ) => {
      const brushPatch: Partial<PaintBrushPayload> = {};
      if (patch.color !== undefined) brushPatch.color = patch.color;
      if (patch.roughness !== undefined) brushPatch.roughness = patch.roughness;
      if (patch.metalness !== undefined) brushPatch.metalness = patch.metalness;
      if (patch.opacity !== undefined) brushPatch.opacity = patch.opacity;
      if (patch.emissive !== undefined) brushPatch.emissive = patch.emissive;
      if (patch.emissiveIntensity !== undefined)
        brushPatch.emissiveIntensity = patch.emissiveIntensity;
      if (patch.flatShading !== undefined)
        brushPatch.flatShading = patch.flatShading;

      if (Object.keys(brushPatch).length > 0) {
        setActiveBrush((prev) => {
          const next = { ...prev, ...brushPatch };
          engineRef.current?.updatePaintBrush(next);
          return next;
        });
      }

      if (id) {
        engineRef.current?.updateObjectMaterial(id, patch, commitHistory);
      }
    },
    []
  );

  const handleUpdateSubdivision = useCallback(
    (
      id: string,
      patch: Partial<ObjectSubdivisionSettings>,
      commitHistory = true
    ) => {
      engineRef.current?.updateObjectSubdivision(id, patch, commitHistory);
    },
    []
  );

  const handleUpdateModifiers = useCallback(
    (
      id: string,
      patch: Partial<ObjectModifierSettings>,
      commitHistory = true
    ) => {
      engineRef.current?.updateObjectModifiers(id, patch, commitHistory);
    },
    []
  );

  const handleBakeMirrorTwins = useCallback(() => {
    const count = engineRef.current?.bakeSelectedMirrorTwins() ?? 0;
    if (count > 0) {
      showToast(`+${count}`);
    }
  }, [showToast]);

  const handleCaptureStudioPhoto = useCallback(
    (options: StudioSnapshotOptions) => {
      return engineRef.current?.captureStudioSnapshot(options) ?? '';
    },
    []
  );

  const handleSplitSubBlocks = useCallback(() => {
    const count = engineRef.current?.splitSelectedIntoSubBlocks() ?? 0;
    if (count > 0) {
      setEditSinglePartMode(true);
      showToast(`${t.subdivSplitToast} (${count})`);
    }
  }, [showToast, t.subdivSplitToast]);

  const handleCommitHistory = useCallback(() => {
    engineRef.current?.pushHistoryFromUI();
  }, []);

  const handleDeleteObject = useCallback(
    (id?: string) => {
      if (id || selectedId || selectedIds.length > 0) {
        engineRef.current?.deleteObject(id);
        showToast(t.delete);
      } else if (engineRef.current?.deleteSelectedArchItem()) {
        showToast(t.delete);
      }
    },
    [selectedId, selectedIds.length, showToast, t.delete]
  );

  const handleDuplicateSelected = useCallback(() => {
    const newId = engineRef.current?.duplicateSelected();
    if (newId) {
      showToast(t.copy);
    }
  }, [showToast, t.copy]);

  const handleDropToFloor = useCallback(() => {
    const msg = engineRef.current?.dropSelectedToFloor();
    if (msg) {
      showToast(msg);
    }
  }, [showToast]);

  // Studio Keyboard Shortcuts
  useEffect(() => {
    if (activeScreen !== 'editor') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (walkthroughActive) {
        if (e.key === 'Escape') {
          setWalkthroughActive(false);
          engineRef.current?.setWalkthroughMode(false);
        }
        return;
      }

      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        void handleSaveProjectManual();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          engineRef.current?.redo();
        } else {
          engineRef.current?.undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        engineRef.current?.redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'g') {
        e.preventDefault();
        handleGroupSceneObjects();
        return;
      }

      if ((e.shiftKey || e.ctrlKey || e.metaKey) && key === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      switch (key) {
        case 'q':
          handleChangeMode('select');
          break;
        case 'g':
          handleChangeMode('translate');
          break;
        case 'r':
          handleChangeMode('rotate');
          break;
        case 's':
          handleChangeMode('scale');
          break;
        case 't':
          handleUpdateSurface({ enabled: !surfaceSettings.enabled });
          break;
        case 'c':
          handleOpenColorStudio();
          break;
        case 'f':
          handleFocusCamera();
          break;
        case 'escape':
          if (paintMode !== 'none') {
            setPaintMode('none');
            engineRef.current?.setPaintInteraction('none');
          } else if (pendingArchCommit) {
            engineRef.current?.cancelPendingArchCommit();
          } else if (universalMeasureActive) {
            engineRef.current?.setUniversalMeasureMode(false);
          } else if (archTool !== 'select') {
            handleSetArchTool('select');
          }
          break;
        case 'delete':
        case 'backspace':
        case 'x':
          if (selectedId) {
            e.preventDefault();
            handleDeleteObject(selectedId);
          } else if (archSelection && archSelection.kind !== 'room') {
            e.preventDefault();
            handleDeleteSelectedArch();
          }
          break;
        case '0':
          handleCameraPreset('perspective');
          break;
        case '1':
          handleCameraPreset('front');
          break;
        case '3':
          handleCameraPreset('right');
          break;
        case '7':
          handleCameraPreset('top');
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeScreen,
    walkthroughActive,
    selectedId,
    archSelection,
    handleDeleteSelectedArch,
    paintMode,
    surfaceSettings.enabled,
    handleSaveProjectManual,
    handleChangeMode,
    handleUpdateSurface,
    handleOpenColorStudio,
    handleFocusCamera,
    handleDeleteObject,
    handleDuplicateSelected,
    handleCameraPreset,
    handleSelectAll,
    handleGroupSceneObjects,
    pendingArchCommit,
    universalMeasureActive,
    archTool,
    handleSetArchTool,
  ]);

  const formatValidationWarning = (status: PlacementValidationStatus): string => {
    if (status.valid || status.issues.length === 0) return t.validPositionBadge;
    const first = status.issues[0];
    if (first.kind === 'collision') {
      return `${t.warnCollisionWith}: ${first.targetName ?? ''}`;
    }
    if (first.kind === 'out-of-plot') return t.warnOutOfPlot;
    if (first.kind === 'out-of-domain') return t.warnOutOfDomain;
    if (first.kind === 'steep-slope') {
      return `${t.warnSteepSlope} (${first.slopeDeg ?? 0}°)`;
    }
    return t.warnWrongSurface;
  };

  const canUngroupSelection = useMemo(() => {
    return objects.some(
      (o) =>
        (o.id === selectedId || selectedIds.includes(o.id)) &&
        Boolean(o.groupId)
    );
  }, [objects, selectedId, selectedIds]);

  const formatDragAxis = (axis: string | null, mode: string) => {
    if (mode === 'surface') return t.hudSurfaceAlign;
    if (!axis) return '';
    if (mode === 'rotate') {
      return `${t.hudRotate} ${axis}`;
    }
    if (mode === 'scale') {
      return `${t.hudScale} ${axis}`;
    }
    return `${t.hudMove} ${axis}`;
  };

  /* =========================================================
     Render Main Menu OR Studio Workspace
     ========================================================= */
  if (activeScreen === 'home' || !activeProject) {
    return (
      <>
        <MainMenu
          settings={globalSettings}
          projects={projects}
          customAssets={customAssets}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenSettings={() => setSettingsOpen(true)}
          onChangeLanguage={(language) =>
            handleUpdateGlobalSettings({ language })
          }
          onChangeLightingMood={(mood) =>
            handleUpdateGlobalSettings({ lightingMood: mood })
          }
          onCreateNewProject={(mode) => void handleCreateNewProject(mode)}
          onOpenProject={handleOpenProject}
          onRenameProject={(proj, name) =>
            void handleRenameProjectInMenu(proj, name)
          }
          onDuplicateProject={(proj) => void handleDuplicateProject(proj)}
          onExportProjectBackup={(proj) => downloadProjectBackup(proj)}
          onDeleteProject={(id) => void handleDeleteProject(id)}
          onImportProjectFile={(file) => void handleImportProjectFile(file)}
          onDeleteCustomAsset={(id) => void handleDeleteCustomAsset(id)}
          onUseAssetInHouseMode={(asset) =>
            void handleCreateNewProject('house', asset)
          }
        />

        <GlobalSettingsModal
          open={settingsOpen}
          settings={globalSettings}
          onUpdateSettings={handleUpdateGlobalSettings}
          onClose={() => setSettingsOpen(false)}
        />

        {toast && (
          <div className="toast-pill global-toast" role="status">
            {toast}
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`studio-shell ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <input
        ref={import3DInputRef}
        type="file"
        multiple
        accept={ACCEPTED_3D_EXTENSIONS}
        style={{ display: 'none' }}
        onChange={(e) => {
          const picked = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = '';
          if (picked.length > 0) {
            void handleImport3DFiles(picked);
          }
        }}
      />

      <TopBar
        language={globalSettings.language}
        studioMode={activeProject.mode}
        projectName={activeProject.name}
        saveState={saveState}
        isImporting3D={isImporting3D}
        lightingMood={lightingMood}
        interiorPeek={interiorPeek}
        walkthroughActive={walkthroughActive}
        terrainSculptActive={terrainSculptSettings.active}
        floorWidgetOpen={floorWidgetOpen}
        floors={floors}
        activeFloorId={activeFloorId}
        placementValidationEnabled={placementValidationEnabled}
        validationStatus={validationStatus}
        adaptiveSpacing={adaptiveSpacing}
        canUndo={canUndo}
        canRedo={canRedo}
        snapSettings={snapSettings}
        surfaceSettings={surfaceSettings}
        gridSettings={gridSettings}
        inspectorOpen={inspectorOpen}
        isFullscreen={isFullscreen}
        hasSelection={
          Boolean(selectedId) ||
          Boolean(activeProject.mode === 'house' && archSelection)
        }
        objectCount={
          objects.length +
          (activeProject.mode === 'house'
            ? archData.walls.length +
              archData.openings.length +
              archData.stairs.length +
              archData.roofs.length
            : 0)
        }
        hasExportableContent={
          objects.length > 0 ||
          archData.walls.length > 0 ||
          archData.roofs.length > 0 ||
          archData.stairs.length > 0
        }
        onGoHome={() => void handleGoHome()}
        onSaveNow={() => void handleSaveProjectManual()}
        onRenameProject={(name) => void handleRenameActiveProject(name)}
        onTriggerImport3D={handleTriggerImport3D}
        onOpenPhotoStudio={() => setPhotoStudioOpen(true)}
        onCycleLightingMood={handleCycleLightingMood}
        onToggleInteriorPeek={handleToggleInteriorPeek}
        onToggleWalkthrough={handleToggleWalkthrough}
        onToggleTerrainSculpt={handleToggleTerrainSculpt}
        onToggleFloorWidget={() => setFloorWidgetOpen((v) => !v)}
        onTogglePlacementValidation={handleTogglePlacementValidation}
        onOpenSettings={() => setSettingsOpen(true)}
        onUndo={() => engineRef.current?.undo()}
        onRedo={() => engineRef.current?.redo()}
        onUpdateSnap={handleUpdateSnap}
        onUpdateSurface={handleUpdateSurface}
        onConformNow={handleDropToFloor}
        onUpdateGrid={handleUpdateGrid}
        onAlignGridToSelection={handleAlignGridToSelection}
        onFocusCamera={handleFocusCamera}
        onCameraPreset={handleCameraPreset}
        onExport={handleExport}
        viewportShading={viewportShading}
        sectionCut={sectionCut}
        universalMeasureActive={universalMeasureActive}
        onChangeViewportShading={(mode) =>
          engineRef.current?.setViewportShadingMode(mode)
        }
        onChangeSectionCut={(patch) =>
          engineRef.current?.setLiveSectionCut(patch)
        }
        onToggleUniversalMeasure={() =>
          engineRef.current?.setUniversalMeasureMode(!universalMeasureActive)
        }
        onClearScene={handleClearScene}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
        onToggleFullscreen={handleToggleFullscreen}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <main className="workspace-main">
        <div
          className={`viewport-area ${
            !leftSidebarCollapsed ? 'sidebar-left-open' : ''
          } ${isDragOverViewport ? 'drag-over-3d' : ''}`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) {
              e.preventDefault();
              setIsDragOverViewport(true);
            }
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) {
              setIsDragOverViewport(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverViewport(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              void handleImport3DFiles(e.dataTransfer.files);
            }
          }}
        >
          <div ref={viewportRef} className="viewport-canvas-host" />

          {/* #6 2D Screen Box Marquee Selection Overlay */}
          {boxSelectRect && (
            <div
              className="box-select-marquee"
              style={{
                left: `${boxSelectRect.x}px`,
                top: `${boxSelectRect.y}px`,
                width: `${boxSelectRect.width}px`,
                height: `${boxSelectRect.height}px`,
              }}
            />
          )}

          {/* #2 Non-Blocking Placement Validation Status Banner */}
          {!walkthroughActive &&
            placementValidationEnabled &&
            selectedId &&
            validationStatus && (
              <div
                className={`validation-hud-banner ${
                  validationStatus.valid ? 'valid' : 'warn'
                }`}
                role="status"
              >
                {validationStatus.valid ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <AlertTriangle size={14} />
                )}
                <span>{formatValidationWarning(validationStatus)}</span>
              </div>
            )}

          {!walkthroughActive && (
            <TransformToolbar
              language={globalSettings.language}
              studioMode={activeProject.mode}
              mode={transformMode}
              selectionSubMode={selectionSubMode}
              axisLock={axisLock}
              space={transformSpace}
              suppressRollouts={
                activeProject.mode === 'house' && archTool !== 'select'
              }
              hasSelection={
                Boolean(selectedId) ||
                selectedArchItems.some((s) => s.kind !== 'room')
              }
              selectedCount={selectedIds.length + selectedArchItems.length}
              canUngroup={canUngroupSelection}
              collapsed={leftSidebarCollapsed}
              wallEditAngleLock={wallEditAngleLock}
              wallAngleSnapStepDeg={wallDefaults.angleSnapStepDeg}
              onToggleWallEditAngleLock={handleToggleWallEditAngleLock}
              onToggleCollapse={() => setLeftSidebarCollapsed((v) => !v)}
              onChangeMode={handleChangeMode}
              onChangeSelectionSubMode={handleChangeSelectionSubMode}
              onSelectAll={handleSelectAll}
              onGroupSelected={handleGroupSceneObjects}
              onUngroupSelected={handleUngroupSelected}
              onChangeAxisLock={handleChangeAxisLock}
              onToggleSpace={handleToggleSpace}
              onOpenColorStudio={handleOpenColorStudio}
              onDropToFloor={handleDropToFloor}
              onDuplicate={handleDuplicateSelected}
              onOpenRepeatModal={() => setRepeatModalOpen(true)}
              onDelete={() => handleDeleteObject()}
            />
          )}

          {/* #5 Duplicate & Repeat Placement Live 3D Array Modal */}
          <RepeatArrayModal
            open={
              repeatModalOpen &&
              (Boolean(selectedId) ||
                selectedArchItems.some((s) => s.kind !== 'room')) &&
              !walkthroughActive
            }
            language={globalSettings.language}
            studioMode={activeProject.mode}
            onPreview={handlePreviewRepeatArray}
            onApply={handleCommitRepeatArray}
            onClose={() => setRepeatModalOpen(false)}
          />

          {/* Architect Life × Blender Contextual Bar & Phase Panel (`Buat Rumah` ONLY) */}
          {activeProject.mode === 'house' && !walkthroughActive && (
            <>
              <ArchStudioBar
                t={t}
                activePhase={activeArchPhase}
                onSelectPhase={(ph) => {
                  if (ph) setArchWorkflowOpen(false);
                  handleSelectArchPhase(ph);
                }}
                isBlueprint2D={isBlueprint2D}
                onToggleBlueprint2D={handleToggleBlueprint2D}
                onZoom2DIn={() => engineRef.current?.zoomViewportBy(0.72)}
                onZoom2DOut={() => engineRef.current?.zoomViewportBy(1.38)}
                onReset2DZoom={() => engineRef.current?.resetBlueprint2DZoom()}
                archTool={archTool}
                onSetArchTool={handleSetArchTool}
                onResetToSelectTool={() => handleSetArchTool('select')}
                archNavPanMode={archNavPanMode}
                onToggleArchNavPanMode={handleToggleArchNavPanMode}
                wallEditAngleLock={wallEditAngleLock}
                onToggleWallEditAngleLock={handleToggleWallEditAngleLock}
                detectedRoomCount={detectedRooms.length}
                onCommitExactWallLength={handleCommitExactWallLength}
                pendingArchCommit={pendingArchCommit}
                onConfirmPendingCommit={handleConfirmPendingArchCommit}
                onCancelPendingCommit={handleCancelPendingArchCommit}
                archSelection={archSelection}
                onRotateSelectedArch={handleRotateSelectedArch90}
                onDuplicateSelectedArch={handleDuplicateSelected}
                onDeleteSelectedArch={handleDeleteSelectedArch}
                onOpenSelectedArchProps={handleOpenSelectedArchProps}
                workflowOpen={archWorkflowOpen}
                onToggleWorkflow={() => {
                  setArchWorkflowOpen((v) => {
                    const next = !v;
                    if (next) setActiveArchPhase(null);
                    return next;
                  });
                }}
                workflowAlertCount={
                  liveArchAnalysis.validation.errorCount +
                  liveArchAnalysis.validation.warningCount
                }
              />

              {activeArchPhase && (
                <ArchContextPanel
                  lang={globalSettings.language}
                  t={t}
                  phase={activeArchPhase}
                  onClose={() => setActiveArchPhase(null)}
                  archData={archData}
                  detectedRooms={detectedRooms}
                  archSelection={archSelection}
                  onSelectArch={(sel) => engineRef.current?.selectArchItem(sel)}
                  archTool={archTool}
                  onSetArchTool={handleSetArchTool}
                  wallDefaults={wallDefaults}
                  onChangeWallDefaults={handleChangeWallDefaults}
                  onSpawnWallTemplate={handleSpawnWallTemplate}
                  onOpenWallTemplatesShelf={handleOpenWallTemplatesShelf}
                  onUpdateWall={handleUpdateArchWall}
                  onBakeSelectedWall={handleBakeSelectedWall}
                  activeOpeningKind={activeOpeningKind}
                  onSelectOpeningKind={handleSelectOpeningKind}
                  onUpdateOpening={handleUpdateArchOpening}
                  onAddStair={handleAddArchStair}
                  onUpdateStair={handleUpdateArchStair}
                  onGenerateAutoRoof={handleGenerateAutoRoof}
                  onAddRoofWing={handleAddRoofWing}
                  onUpdateRoof={handleUpdateArchRoof}
                  onUpdateRoomMeta={handleUpdateArchRoomMeta}
                  onApplyAllWallsColor={handleApplyAllWallsColor}
                  onDeleteSelectedArch={handleDeleteSelectedArch}
                  onChangeSun={handleChangeSun}
                  cameraLensFov={cameraLensFov}
                  onChangeLensFov={handleChangeLensFov}
                  onExportBlueprintPNG={handleExportBlueprintPNG}
                  activeFloor={floors.find((f) => f.id === activeFloorId)}
                  isActivelyDrawing={isArchActivelyDrawing}
                />
              )}

              <ArchProjectDrawer
                open={archWorkflowOpen}
                activeTab={archWorkflowTab}
                onSelectTab={setArchWorkflowTab}
                onClose={() => setArchWorkflowOpen(false)}
                lang={globalSettings.language}
                t={t}
                projectName={activeProject.name}
                archData={archData}
                archSelection={archSelection}
                floors={floors}
                activeFloorId={activeFloorId}
                floorViewMode={floorViewMode}
                objects={objects}
                gridSettings={gridSettings}
                sculptedHeightsB64={sculptedHeightsB64}
                liveAnalysis={liveArchAnalysis}
                isUpdatingAnalysis={isUpdatingAnalysis}
                alternatives={designAlternatives}
                onChangeAlternatives={setDesignAlternatives}
                onCaptureThumbnail={() =>
                  engineRef.current?.captureThumbnailDataUrl()
                }
                onUpdateBrief={handleUpdateArchBrief}
                onUpdateCatalog={handleUpdateArchMaterialCatalog}
                onUpdateSite={handleUpdateArchSite}
                onUpdateDocSettings={handleUpdateArchDocSettings}
                onUpdateReviewNotes={handleUpdateArchReviewNotes}
                onUpdateRoomType={(roomId: string, roomType: RoomSemanticType) =>
                  handleUpdateArchRoomMeta(roomId, { roomType }, true)
                }
                onAutoAssignDefaultMaterials={handleAutoAssignDefaultMaterials}
                onShiftBuildingOnSite={handleShiftBuildingOnSite}
                onRotateBuilding90={handleRotateBuilding90}
                onApplyAutoFix={handleApplyValidationAutoFix}
                onFocusElement={handleFocusArchitecturalElement}
                onRestoreAlternative={handleRestoreDesignAlternative}
                onRerunValidation={() => setValidationRerunTick((n) => n + 1)}
              />
            </>
          )}

          {/* #3 Terrain Sculpting Bar — Buat Rumah ONLY */}
          {activeProject.mode === 'house' && !walkthroughActive && (
            <TerrainSculptBar
              open={terrainSculptSettings.active}
              language={globalSettings.language}
              settings={terrainSculptSettings}
              onUpdate={handleUpdateTerrainSculpt}
              onLevelPlotPad={handleLevelPlotPad}
              onResetTerrain={handleResetSculptedTerrain}
              onClose={() => handleUpdateTerrainSculpt({ active: false })}
            />
          )}

          {/* #12 Building Story / Floor System Widget — Buat Rumah ONLY */}
          {activeProject.mode === 'house' && !walkthroughActive && (
            <FloorLayerWidget
              open={floorWidgetOpen}
              language={globalSettings.language}
              floors={floors}
              activeFloorId={activeFloorId}
              floorViewMode={floorViewMode}
              objects={objects}
              onSelectFloor={handleSelectFloor}
              onAddFloor={handleAddFloor}
              onRemoveFloor={handleRemoveFloor}
              onUpdateFloor={handleUpdateFloor}
              onChangeViewMode={handleChangeFloorViewMode}
              onCopyLowerFloorWalls={handleCopyLowerFloorWalls}
              onClose={() => setFloorWidgetOpen(false)}
            />
          )}

          {/* First-Person Walkthrough HUD + Dual-Thumb Mobile Virtual Joysticks */}
          <WalkthroughOverlay
            active={walkthroughActive}
            language={globalSettings.language}
            floors={activeProject.mode === 'house' ? floors : []}
            walkPrompt={walkPrompt}
            ghostMode={walkGhostMode}
            eyeHeight={walkEyeHeight}
            onJoystickChange={(x, y) => engineRef.current?.setWalkJoystick(x, y)}
            onLookVelocityChange={(yawRate, pitchRate) =>
              engineRef.current?.setWalkLookVelocity(yawRate, pitchRate)
            }
            onToggleGhostMode={(enabled) =>
              engineRef.current?.setWalkGhostMode(enabled)
            }
            onChangeEyeHeight={(meters) =>
              engineRef.current?.setWalkEyeHeight(meters)
            }
            onTeleportToFloor={(floorId) =>
              engineRef.current?.teleportWalkToFloor(floorId)
            }
            onTriggerInteract={() => engineRef.current?.triggerWalkInteract()}
            onExit={() => {
              setWalkthroughActive(false);
              engineRef.current?.setWalkthroughMode(false);
            }}
          />

          {/* Universal 3D Tape Measure Readout & Selected Object Quick Meter Input Pill */}
          {!walkthroughActive &&
            !dragFeedback.active &&
            (universalMeasureActive ||
              !(activeProject.mode === 'house' && archTool !== 'select')) && (
              <QuickDimensionPill
                t={t}
                universalMeasureActive={universalMeasureActive}
                measuredSpan={measuredSpan}
                onClearMeasure={() =>
                  engineRef.current?.clearUniversalMeasure()
                }
                onExitMeasure={() =>
                  engineRef.current?.setUniversalMeasureMode(false)
                }
                selectedDimensions={selectedExactDimensions}
                isObjectLocked={Boolean(
                  selectedId && objects.find((o) => o.id === selectedId)?.locked
                )}
                onApplyExactDimensions={(dims) =>
                  handleSetExactDimensions(dims, false)
                }
              />
            )}

          {/* Touch Precision Magnifier Loupe locked onto exact 3D snapped point */}
          <TouchLoupeOverlay
            enabled={globalSettings.touchLoupe !== false}
            active={touchLoupeState.active}
            clientX={touchLoupeState.clientX}
            clientY={touchLoupeState.clientY}
            targetX={touchLoupeState.targetX}
            targetY={touchLoupeState.targetY}
            snapped={touchLoupeState.snapped}
            label={touchLoupeState.label}
            getSourceCanvas={() =>
              engineRef.current?.getCanvasElement() ?? null
            }
          />

          {/* Right-edge Expand Tab when Desktop Inspector Sidebar is hidden */}
          {!inspectorOpen && !walkthroughActive && (
            <button
              type="button"
              className="right-inspector-expand-tab desktop-only"
              onClick={() => setInspectorOpen(true)}
              title={t.properties}
              aria-label={t.properties}
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Active Paint / Click-to-Place Floating Pill */}
          {!walkthroughActive &&
            (paintMode !== 'none' ||
              (surfaceSettings.enabled && surfaceSettings.clickToPlace)) &&
            !dragFeedback.active && (
              <div className="interactive-mode-banner">
                {paintMode === 'bucket' && (
                  <>
                    <span className="banner-icon-label">
                      <PaintBucket size={13} />
                      <span>{t.paint}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChangePaintMode('none')}
                    >
                      {t.done}
                    </button>
                  </>
                )}
                {paintMode === 'eyedropper' && (
                  <>
                    <span className="banner-icon-label">
                      <Pipette size={13} />
                      <span>{t.eyedropperBtn}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChangePaintMode('none')}
                    >
                      {t.done}
                    </button>
                  </>
                )}
                {paintMode === 'none' &&
                  surfaceSettings.enabled &&
                  surfaceSettings.clickToPlace && (
                    <>
                      <span className="banner-icon-label">
                        <Magnet size={13} />
                        <span>{t.stickSurface}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSurface({ clickToPlace: false })
                        }
                      >
                        {t.done}
                      </button>
                    </>
                  )}
              </div>
            )}

          {/* Live Gizmo + Smart Snap + Surface Align Readout Pill */}
          {dragFeedback.active && (
            <div className="drag-hud-pill" aria-live="polite">
              <span className="drag-hud-axis">
                {formatDragAxis(dragFeedback.axis, dragFeedback.mode)}
              </span>

              {(dragFeedback.mode === 'translate' ||
                dragFeedback.mode === 'surface') && (
                <span className="drag-hud-coords">
                  <b className="txt-x">X {dragFeedback.position.x.toFixed(2)}m</b>
                  <b className="txt-y">Y {dragFeedback.position.y.toFixed(2)}m</b>
                  <b className="txt-z">Z {dragFeedback.position.z.toFixed(2)}m</b>
                </span>
              )}

              {dragFeedback.mode === 'scale' && (
                <span className="drag-hud-coords">
                  <b className="txt-x">X {dragFeedback.scale.x.toFixed(2)}m</b>
                  <b className="txt-y">Y {dragFeedback.scale.y.toFixed(2)}m</b>
                  <b className="txt-z">Z {dragFeedback.scale.z.toFixed(2)}m</b>
                </span>
              )}

              {dragFeedback.mode === 'rotate' && (
                <span className="drag-hud-coords">
                  <b className="rot-delta-badge">
                    {(dragFeedback.deltaAngleDeg ?? 0) > 0
                      ? `+${dragFeedback.deltaAngleDeg}°`
                      : `${dragFeedback.deltaAngleDeg ?? 0}°`}
                  </b>
                  <b className="txt-x">X {dragFeedback.rotation.x.toFixed(0)}°</b>
                  <b className="txt-y">Y {dragFeedback.rotation.y.toFixed(0)}°</b>
                  <b className="txt-z">Z {dragFeedback.rotation.z.toFixed(0)}°</b>
                </span>
              )}

              {dragFeedback.snapLabel && (
                <span className="snap-live-tag">{dragFeedback.snapLabel}</span>
              )}
            </div>
          )}

          {toast && !dragFeedback.active && (
            <div className="toast-pill" role="status">
              {toast}
            </div>
          )}

          {/* Controlled Rotation Quick Bar */}
          {!walkthroughActive &&
            transformMode === 'rotate' &&
            (Boolean(selectedId) ||
              Boolean(archSelection && archSelection.kind !== 'room')) && (
              <RotationControlBar
                language={globalSettings.language}
                rotationSnapDeg={snapSettings.rotationSnapDeg}
                onChangeRotationSnap={handleChangeRotationSnap}
                onRotateStep={handleRotateStep}
                onResetRotation={handleResetRotation}
              />
            )}

          {/* In-Place Custom Asset Re-Editing Banner */}
          {!walkthroughActive && editingCustomAsset && (
            <div className="asset-edit-live-banner">
              <span className="banner-icon-label">
                <Pencil size={13} />
                <span>
                  {t.assetReEditBtn}: <strong>{editingCustomAsset.name}</strong>
                </span>
              </span>
              <button
                type="button"
                className="asset-update-confirm-btn"
                onClick={() => void handleUpdateExistingCustomAsset()}
              >
                <Check size={13} />
                <span>{t.assetUpdateSavedBtn}</span>
              </button>
              <button
                type="button"
                className="frameless-close-btn"
                onClick={() => setEditingCustomAsset(null)}
                aria-label={t.done}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {!walkthroughActive && (
            <DesktopSpawnDock
              studioMode={activeProject.mode}
              language={globalSettings.language}
              customAssets={customAssets}
              activeWallTemplateId={wallDefaults.activeTemplateId}
              externalCatalogRequest={externalCatalogRequest}
              onSpawn={handleSpawn}
              onSpawnWallTemplate={handleSpawnWallTemplateById}
              onActivateWallDrawTemplate={handleActivateWallDrawTemplate}
              onSpawnModularItem={handleSpawnModularItem}
              onSpawnCustomAsset={handleSpawnCustomAsset}
              onEditCustomAsset={handleEditCustomAsset}
              onDeleteCustomAsset={(id) => void handleDeleteCustomAsset(id)}
              onExportAssetsPack={handleExportAssetsPack}
              onImportAssetsPackFile={(f) => void handleImportAssetsPack(f)}
              onOpenCustomProfileStudio={() =>
                handleOpenCustomProfileModal(false)
              }
            />
          )}

          <div className="viewport-status-chip">
            <span>
              {objects.length} {t.objectsUnit}
            </span>
            <span className="dot-sep">•</span>
            <span>
              {transformMode === 'translate'
                ? t.move
                : transformMode === 'rotate'
                ? `${t.rotate} (${
                    snapSettings.rotationSnapDeg > 0
                      ? `${snapSettings.rotationSnapDeg}°`
                      : t.rotSnapFree
                  })`
                : transformMode === 'scale'
                ? t.scale
                : t.select}
            </span>
            {axisLock !== 'free' && (
              <>
                <span className="dot-sep">•</span>
                <span className="status-emerald">
                  {t.axisLockTitle}: {axisLock.toUpperCase()}
                </span>
              </>
            )}
            {interiorPeek && activeProject.mode === 'house' && (
              <>
                <span className="dot-sep">•</span>
                <span className="status-emerald">{t.peekInterior}</span>
              </>
            )}
            {surfaceSettings.enabled && (
              <>
                <span className="dot-sep">•</span>
                <span className="status-emerald">
                  {t.surface}: {t.activeState}
                </span>
              </>
            )}
          </div>
        </div>

        {inspectorOpen && !walkthroughActive && (
          <InspectorPanel
            language={globalSettings.language}
            studioMode={activeProject.mode}
            objects={objects}
            selectedId={selectedId}
            selectedIds={selectedIds}
            floors={floors}
            editSinglePartMode={editSinglePartMode}
            subdivStats={selectedSubdivStats}
            paintMode={paintMode}
            activeBrush={activeBrush}
            inspectorSubTab={inspectorSubTab}
            onChangeSubTab={setInspectorSubTab}
            onCollapseDesktop={() => setInspectorOpen(false)}
            onSelectObject={handleSelectObject}
            onToggleSelectObject={handleToggleSelectObject}
            onToggleEditSinglePart={handleToggleEditSinglePart}
            onGroupSceneObjects={handleGroupSceneObjects}
            onUngroupSelected={handleUngroupSelected}
            onSaveAsCustomAsset={(name, bundleAll) =>
              void handleSaveAsCustomAsset(name, bundleAll)
            }
            onApplyBooleanCSG={handleApplyBooleanCSG}
            onClearObjectCSG={handleClearObjectCSG}
            onOpenCustomProfileModal={handleOpenCustomProfileModal}
            onUpdateTransform={handleUpdateTransform}
            onUpdateMaterial={handleUpdateMaterial}
            onUpdateSubdivision={handleUpdateSubdivision}
            onUpdateModifiers={handleUpdateModifiers}
            onBakeMirrorTwins={handleBakeMirrorTwins}
            onSplitSubBlocks={handleSplitSubBlocks}
            onChangePaintMode={handleChangePaintMode}
            onCommitHistory={handleCommitHistory}
            onDeleteObject={(id) => handleDeleteObject(id)}
            onDuplicateSelected={handleDuplicateSelected}
            onOpenRepeatModal={() => setRepeatModalOpen(true)}
            onDropToFloor={handleDropToFloor}
            onAssignFloor={handleAssignObjectFloor}
            onUpdateSurfaceRule={handleUpdateSurfaceRule}
            onResetImportedMaterial={handleResetImportedMaterial}
            onUpdatePointLight={handleUpdatePointLight}
            onToggleObjectLock={handleToggleObjectLock}
            onAlignDistribute={handleAlignDistribute}
            selectedExactDimensions={selectedExactDimensions}
            onSetExactDimensions={handleSetExactDimensions}
            materialCatalog={
              activeProject.mode === 'house' ? activeMaterialCatalog : undefined
            }
            onUpdateConstructionMaterial={
              activeProject.mode === 'house'
                ? handleUpdateObjectConstructionMaterial
                : undefined
            }
            archData={activeProject.mode === 'house' ? archData : undefined}
            detectedRooms={
              activeProject.mode === 'house' ? detectedRooms : undefined
            }
            archSelection={
              activeProject.mode === 'house' ? archSelection : null
            }
            selectedArchItems={
              activeProject.mode === 'house' ? selectedArchItems : undefined
            }
            wallEditAngleLock={wallEditAngleLock}
            onToggleWallEditAngleLock={handleToggleWallEditAngleLock}
            onSelectArchElement={handleSelectArchElement}
            onUpdateArchWall={handleUpdateArchWall}
            onApplyTemplateToWall={handleApplyTemplateToWall}
            onUpdateArchOpening={handleUpdateArchOpening}
            onToggleDoorOpen={handleToggleDoorOpen}
            onUpdateArchStair={handleUpdateArchStair}
            onUpdateArchRoof={handleUpdateArchRoof}
            onUpdateArchRoomMeta={handleUpdateArchRoomMeta}
            onRotateSelectedArch={handleRotateSelectedArch90}
            onDeleteSelectedArch={handleDeleteSelectedArch}
            onBakeSelectedWall={handleBakeSelectedWall}
          />
        )}

        {mobileDrawerOpen && !walkthroughActive && (
          <InspectorPanel
            language={globalSettings.language}
            studioMode={activeProject.mode}
            objects={objects}
            selectedId={selectedId}
            selectedIds={selectedIds}
            floors={floors}
            editSinglePartMode={editSinglePartMode}
            subdivStats={selectedSubdivStats}
            paintMode={paintMode}
            activeBrush={activeBrush}
            inspectorSubTab={inspectorSubTab}
            onChangeSubTab={setInspectorSubTab}
            isMobileDrawer
            onCloseMobile={() => setMobileDrawerOpen(false)}
            onSelectObject={handleSelectObject}
            onToggleSelectObject={handleToggleSelectObject}
            onToggleEditSinglePart={handleToggleEditSinglePart}
            onGroupSceneObjects={handleGroupSceneObjects}
            onUngroupSelected={handleUngroupSelected}
            onSaveAsCustomAsset={(name, bundleAll) =>
              void handleSaveAsCustomAsset(name, bundleAll)
            }
            onApplyBooleanCSG={handleApplyBooleanCSG}
            onClearObjectCSG={handleClearObjectCSG}
            onOpenCustomProfileModal={handleOpenCustomProfileModal}
            onUpdateTransform={handleUpdateTransform}
            onUpdateMaterial={handleUpdateMaterial}
            onUpdateSubdivision={handleUpdateSubdivision}
            onUpdateModifiers={handleUpdateModifiers}
            onBakeMirrorTwins={handleBakeMirrorTwins}
            onSplitSubBlocks={handleSplitSubBlocks}
            onChangePaintMode={handleChangePaintMode}
            onCommitHistory={handleCommitHistory}
            onDeleteObject={(id) => handleDeleteObject(id)}
            onDuplicateSelected={handleDuplicateSelected}
            onOpenRepeatModal={() => setRepeatModalOpen(true)}
            onDropToFloor={handleDropToFloor}
            onAssignFloor={handleAssignObjectFloor}
            onUpdateSurfaceRule={handleUpdateSurfaceRule}
            onResetImportedMaterial={handleResetImportedMaterial}
            onUpdatePointLight={handleUpdatePointLight}
            onToggleObjectLock={handleToggleObjectLock}
            onAlignDistribute={handleAlignDistribute}
            selectedExactDimensions={selectedExactDimensions}
            onSetExactDimensions={handleSetExactDimensions}
            materialCatalog={
              activeProject.mode === 'house' ? activeMaterialCatalog : undefined
            }
            onUpdateConstructionMaterial={
              activeProject.mode === 'house'
                ? handleUpdateObjectConstructionMaterial
                : undefined
            }
            archData={activeProject.mode === 'house' ? archData : undefined}
            detectedRooms={
              activeProject.mode === 'house' ? detectedRooms : undefined
            }
            archSelection={
              activeProject.mode === 'house' ? archSelection : null
            }
            selectedArchItems={
              activeProject.mode === 'house' ? selectedArchItems : undefined
            }
            wallEditAngleLock={wallEditAngleLock}
            onToggleWallEditAngleLock={handleToggleWallEditAngleLock}
            onSelectArchElement={handleSelectArchElement}
            onUpdateArchWall={handleUpdateArchWall}
            onApplyTemplateToWall={handleApplyTemplateToWall}
            onUpdateArchOpening={handleUpdateArchOpening}
            onToggleDoorOpen={handleToggleDoorOpen}
            onUpdateArchStair={handleUpdateArchStair}
            onUpdateArchRoof={handleUpdateArchRoof}
            onUpdateArchRoomMeta={handleUpdateArchRoomMeta}
            onRotateSelectedArch={handleRotateSelectedArch90}
            onDeleteSelectedArch={handleDeleteSelectedArch}
            onBakeSelectedWall={handleBakeSelectedWall}
          />
        )}
      </main>

      {!walkthroughActive && (
        <MobileBottomBar
          studioMode={activeProject.mode}
          language={globalSettings.language}
          customAssets={customAssets}
          activeWallTemplateId={wallDefaults.activeTemplateId}
          externalCatalogRequest={externalCatalogRequest}
          onSpawn={handleSpawn}
          onSpawnWallTemplate={handleSpawnWallTemplateById}
          onActivateWallDrawTemplate={handleActivateWallDrawTemplate}
          onSpawnModularItem={handleSpawnModularItem}
          onSpawnCustomAsset={handleSpawnCustomAsset}
          onEditCustomAsset={handleEditCustomAsset}
          onDeleteCustomAsset={(id) => void handleDeleteCustomAsset(id)}
          onExportAssetsPack={handleExportAssetsPack}
          onImportAssetsPackFile={(f) => void handleImportAssetsPack(f)}
          onOpenCustomProfileStudio={() => handleOpenCustomProfileModal(false)}
          objectCount={
            objects.length +
            (activeProject.mode === 'house'
              ? archData.walls.length +
                archData.openings.length +
                archData.stairs.length +
                archData.roofs.length
              : 0)
          }
          drawerOpen={mobileDrawerOpen}
          onToggleDrawer={() => setMobileDrawerOpen((v) => !v)}
        />
      )}

      {/* Save Custom Asset with Category Modal */}
      {saveAssetModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSaveAssetModal(null);
          }}
        >
          <div className="modal-card save-asset-modal">
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon-badge">
                  <Sparkles size={17} />
                </span>
                <div>
                  <h3>{t.saveToAssets}</h3>
                </div>
              </div>
              <button
                type="button"
                className="panel-close-icon"
                onClick={() => setSaveAssetModal(null)}
                aria-label={t.done}
              >
                <X size={18} />
              </button>
            </div>

            <div className="save-asset-form-body">
              <input
                type="text"
                className="name-input"
                value={saveAssetModal.name}
                onChange={(e) =>
                  setSaveAssetModal((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev
                  )
                }
                placeholder={t.objectNamePlaceholder}
              />

              <span className="prop-label">{t.assetCategoryLabel}</span>
              <div className="pattern-chip-grid">
                {(
                  [
                    { id: 'chair', label: t.assetCatChair },
                    { id: 'table', label: t.assetCatTable },
                    { id: 'lamp', label: t.assetCatLamp },
                    { id: 'cabinet', label: t.assetCatCabinet },
                    { id: 'decor', label: t.assetCatDecor },
                    { id: 'other', label: t.assetCatOther },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`pattern-chip-btn ${
                      saveAssetModal.category === cat.id ? 'active' : ''
                    }`}
                    onClick={() =>
                      setSaveAssetModal((prev) =>
                        prev ? { ...prev, category: cat.id } : prev
                      )
                    }
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions-row">
              {editingCustomAsset && (
                <button
                  type="button"
                  className="studio-secondary-action-btn"
                  onClick={() => {
                    setSaveAssetModal(null);
                    void handleUpdateExistingCustomAsset();
                  }}
                >
                  <Check size={15} />
                  <span>{t.assetUpdateSavedBtn}</span>
                </button>
              )}
              <button
                type="button"
                className="studio-primary-action-btn"
                onClick={() =>
                  void handleSaveAsCustomAsset(
                    saveAssetModal.name,
                    Boolean(saveAssetModal.bundleAll),
                    saveAssetModal.category
                  )
                }
              >
                <Sparkles size={15} />
                <span>{t.saveToAssets}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomProfileModal
        open={profileStudioModal.open}
        language={globalSettings.language}
        t={t}
        initialProfile={
          profileStudioModal.editTargetId
            ? objects.find((o) => o.id === profileStudioModal.editTargetId)
                ?.customProfile ?? null
            : null
        }
        initialName={
          profileStudioModal.editTargetId
            ? objects.find((o) => o.id === profileStudioModal.editTargetId)
                ?.name ?? ''
            : ''
        }
        isUpdatingExisting={Boolean(profileStudioModal.editTargetId)}
        onApply={handleApplyCustomProfile}
        onClose={() =>
          setProfileStudioModal({ open: false, editTargetId: null })
        }
      />

      <StudioPhotoModal
        open={photoStudioOpen}
        projectName={activeProject.name}
        t={t}
        onCapture={handleCaptureStudioPhoto}
        onCaptureAsync={(opts) =>
          engineRef.current
            ? engineRef.current.captureStudioPhotoAsync(opts)
            : Promise.resolve(null)
        }
        onClose={() => setPhotoStudioOpen(false)}
        onSavedToast={(msg) => showToast(msg)}
      />

      <GlobalSettingsModal
        open={settingsOpen}
        settings={globalSettings}
        onUpdateSettings={handleUpdateGlobalSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <HelpModal
        language={globalSettings.language}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
};

export default App;
