import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Magnet, PaintBucket, Pipette } from 'lucide-react';
import { PaintBrushPayload, StudioEngine } from './engine/StudioEngine';
import { CameraPresetType } from './engine/viewportHelpers';
import { PRIMITIVE_META } from './engine/primitives';
import { renderPartsThumbnailDataUrl } from './engine/housePresets';
import {
  ACCEPTED_3D_EXTENSIONS,
  hydrateImportedModelsForObjects,
  importExternal3DFile,
  LoadedImportedModelAsset,
} from './engine/modelImporter';
import { TRANSLATIONS } from './i18n/translations';
import {
  deleteCustomAssetRecord,
  deleteProjectRecord,
  downloadProjectBackup,
  duplicateProjectRecord,
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
  AppScreen,
  CustomAssetRecord,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_SNAP_SETTINGS,
  DEFAULT_SURFACE_SETTINGS,
  DragFeedback,
  GlobalAppSettings,
  GridSettings,
  LightingMood,
  ObjectSubdivisionSettings,
  PaintInteractionMode,
  PrimitiveKind,
  RotationSnapStep,
  SavedProjectRecord,
  SceneObjectData,
  SnapSettings,
  StudioMode,
  STUDIO_THEMES,
  SubdivisionStats,
  SurfaceSettings,
  TransformMode,
  TransformSpace,
  Vec3,
} from './types/studio';
import { MainMenu } from './components/MainMenu';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { TopBar } from './components/TopBar';
import { TransformToolbar } from './components/TransformToolbar';
import { DesktopSpawnDock, MobileBottomBar } from './components/SpawnDock';
import { InspectorPanel, InspectorSubTab } from './components/InspectorPanel';
import { HelpModal } from './components/HelpModal';
import { RotationControlBar } from './components/RotationControlBar';
import { WalkthroughOverlay } from './components/WalkthroughOverlay';
import { AdvancedColorMaterialPatch } from './components/ColorWheelPicker';

function buildEmptyProjectRecord(
  mode: StudioMode,
  name: string,
  lightingMood: LightingMood
): SavedProjectRecord {
  const now = Date.now();
  const id = `proj_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const gridSettings: GridSettings =
    mode === 'house'
      ? {
          ...DEFAULT_GRID_SETTINGS,
          style: 'tile',
          spacing: 0.5,
          worldSize: 32,
        }
      : { ...DEFAULT_GRID_SETTINGS };

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
      snapSettings: { ...DEFAULT_SNAP_SETTINGS },
      surfaceSettings: { ...DEFAULT_SURFACE_SETTINGS },
      lightingMood,
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
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Studio Scene State
  const [objects, setObjects] = useState<SceneObjectData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // House Builder & Exploration States
  const [lightingMood, setLightingMood] = useState<LightingMood>(
    globalSettings.lightingMood
  );
  const [interiorPeek, setInteriorPeek] = useState(false);
  const [walkthroughActive, setWalkthroughActive] = useState(false);

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
  const autoSaveTimerRef = useRef<number | null>(null);

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
  }, [globalSettings]);

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

  // Flush current studio state to IndexedDB
  const persistCurrentProjectNow = useCallback(
    async (overrideName?: string) => {
      if (!activeProject || !engineRef.current) return;
      setIsSavingProject(true);
      const currentObjects = engineRef.current.getSerializedObjects();
      const thumb =
        currentObjects.length > 0
          ? engineRef.current.captureThumbnailDataUrl()
          : '';
      const now = Date.now();
      const nextName = overrideName ?? activeProject.name;

      const updated: SavedProjectRecord = {
        ...activeProject,
        name: nextName,
        updatedAt: now,
        objectCount: currentObjects.length,
        thumbnailDataUrl: thumb,
        scene: {
          ...activeProject.scene,
          name: nextName,
          updatedAt: now,
          objects: currentObjects,
          gridSettings: engineRef.current.getGridSettings(),
          snapSettings: engineRef.current.getSnapSettings(),
          surfaceSettings: engineRef.current.getSurfaceSettings(),
          lightingMood: engineRef.current.getLightingMood(),
        },
      };

      await saveProjectRecord(updated);
      setActiveProject(updated);
      setIsSavingProject(false);
    },
    [activeProject]
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
          setCanUndo(state.canUndo);
          setCanRedo(state.canRedo);
          setSelectedSubdivStats(state.selectedSubdivStats);
        },
        onDragFeedback: (feedback) => {
          setDragFeedback(feedback);
        },
        onEyedropperSample: (sample, objName) => {
          setActiveBrush(sample);
          setPaintMode('bucket');
          engine.setPaintInteraction('bucket', sample);
          showToast(`${objName} — OK`);
        },
        onPaintApplied: (objName) => {
          showToast(objName);
        },
      },
      activeProject.scene.objects
    );

    const themeSpec =
      STUDIO_THEMES.find((th) => th.id === globalSettings.theme) ??
      STUDIO_THEMES[0];
    engine.setThemeCanvasColor(themeSpec.canvasBg);
    engine.setGraphicsQuality(globalSettings.graphicsQuality);
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
    setGridSettings(restoredGrid);
    setSnapSettings(restoredSnap);
    setSurfaceSettings(restoredSurf);
    setLightingMood(projMood);
    setInteriorPeek(false);
    setWalkthroughActive(false);
    setEditSinglePartMode(false);
    setPaintMode('none');

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
        }
      });
    }

    return () => {
      cancelled = true;
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen, activeProject?.id]);

  // Debounced auto-save whenever studio objects or settings change
  useEffect(() => {
    if (activeScreen !== 'editor' || !activeProject || !engineRef.current) return;

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    setIsSavingProject(true);
    autoSaveTimerRef.current = window.setTimeout(() => {
      void persistCurrentProjectNow();
    }, 1050);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    activeScreen,
    objects,
    gridSettings,
    snapSettings,
    surfaceSettings,
    lightingMood,
    persistCurrentProjectNow,
    activeProject,
  ]);

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
    }
    await persistCurrentProjectNow();
    await refreshLibraries();
    setWalkthroughActive(false);
    setInteriorPeek(false);
    setActiveScreen('home');
  }, [persistCurrentProjectNow, refreshLibraries]);

  const handleRenameProjectInMenu = useCallback(
    async (proj: SavedProjectRecord, newName: string) => {
      await renameProjectRecord(proj, newName);
      await refreshLibraries();
    },
    [refreshLibraries]
  );

  const handleRenameActiveProject = useCallback(
    async (newName: string) => {
      if (!activeProject) return;
      setActiveProject((prev) =>
        prev
          ? {
              ...prev,
              name: newName,
              scene: { ...prev.scene, name: newName },
            }
          : prev
      );
      await persistCurrentProjectNow(newName);
    },
    [activeProject, persistCurrentProjectNow]
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
        showToast('Invalid .perabot file');
      }
    },
    [refreshLibraries, showToast]
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
      showToast(`+ ${PRIMITIVE_META[kind].label}`);
    },
    [showToast]
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
          showToast(`+ ${loadedAssets.length} Model 3D`);
        }
      } else if (failedCount > 0) {
        showToast(
          globalSettings.language === 'en'
            ? 'Failed to import 3D file (.glb/.obj/.stl/.ply/.fbx)'
            : globalSettings.language === 'ja'
            ? '3Dファイルの読み込みに失敗しました'
            : 'Gagal memuat file 3D (gunakan .glb, .gltf, .obj, .stl, .ply, .fbx)'
        );
      }
    },
    [globalSettings.language, showToast, t.importing3DToast]
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

  const handleSaveAsCustomAsset = useCallback(
    async (customName?: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      const extracted = engine.extractPartsForCustomAsset();
      if (!extracted) return;

      const finalName = (customName || extracted.defaultName).trim();
      const thumb = renderPartsThumbnailDataUrl(extracted.parts);

      const record: CustomAssetRecord = {
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: finalName,
        createdAt: Date.now(),
        thumbnailDataUrl: thumb,
        parts: extracted.parts,
      };

      await saveCustomAssetRecord(record);
      await refreshLibraries();
      showToast(t.savedToAssetsToast);
    },
    [refreshLibraries, showToast, t.savedToAssetsToast]
  );

  const handleToggleEditSinglePart = useCallback((enabled: boolean) => {
    engineRef.current?.setEditSinglePartMode(enabled);
    setEditSinglePartMode(enabled);
  }, []);

  const handleGroupSceneObjects = useCallback(() => {
    const gid = engineRef.current?.groupAllSceneObjects(
      activeProject?.name || 'Grup Rakitan'
    );
    if (gid) {
      setEditSinglePartMode(false);
      showToast(t.groupedToast);
    }
  }, [activeProject?.name, showToast, t.groupedToast]);

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
      showToast(next ? `${t.peekInterior}: ON` : `${t.peekInterior}: OFF`);
      return next;
    });
  }, [showToast, t.peekInterior]);

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
    async (format: 'glb' | 'gltf') => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const { blob, filename } = await engine.exportScene(format);
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

  const handleClearScene = useCallback(() => {
    engineRef.current?.clearScene();
    showToast(t.clearScene);
  }, [showToast, t.clearScene]);

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
      patch: AdvancedColorMaterialPatch & { name?: string; visible?: boolean },
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

  const handleCommitHistory = useCallback(() => {
    engineRef.current?.pushHistoryFromUI();
  }, []);

  const handleDeleteObject = useCallback(
    (id?: string) => {
      engineRef.current?.deleteObject(id);
      showToast(t.delete);
    },
    [showToast, t.delete]
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

      if (e.shiftKey && key === 'd') {
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
          }
          break;
        case 'delete':
        case 'backspace':
        case 'x':
          if (selectedId) {
            e.preventDefault();
            handleDeleteObject(selectedId);
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
    paintMode,
    surfaceSettings.enabled,
    handleChangeMode,
    handleUpdateSurface,
    handleOpenColorStudio,
    handleFocusCamera,
    handleDeleteObject,
    handleDuplicateSelected,
    handleCameraPreset,
  ]);

  const formatDragAxis = (axis: string | null, mode: string) => {
    if (mode === 'surface') return 'Surface Align';
    if (!axis) return '';
    if (mode === 'rotate') {
      if (axis === 'X') return 'Rotate X';
      if (axis === 'Y') return 'Rotate Y';
      if (axis === 'Z') return 'Rotate Z';
    }
    if (axis === 'X') return 'X';
    if (axis === 'Y') return 'Y';
    if (axis === 'Z') return 'Z';
    return axis;
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
        isSavingProject={isSavingProject}
        isImporting3D={isImporting3D}
        lightingMood={lightingMood}
        interiorPeek={interiorPeek}
        walkthroughActive={walkthroughActive}
        canUndo={canUndo}
        canRedo={canRedo}
        snapSettings={snapSettings}
        surfaceSettings={surfaceSettings}
        gridSettings={gridSettings}
        inspectorOpen={inspectorOpen}
        isFullscreen={isFullscreen}
        hasSelection={Boolean(selectedId)}
        objectCount={objects.length}
        onGoHome={() => void handleGoHome()}
        onRenameProject={(name) => void handleRenameActiveProject(name)}
        onTriggerImport3D={handleTriggerImport3D}
        onCycleLightingMood={handleCycleLightingMood}
        onToggleInteriorPeek={handleToggleInteriorPeek}
        onToggleWalkthrough={handleToggleWalkthrough}
        onOpenSettings={() => setSettingsOpen(true)}
        onUndo={() => engineRef.current?.undo()}
        onRedo={() => engineRef.current?.redo()}
        onUpdateSnap={handleUpdateSnap}
        onUpdateSurface={handleUpdateSurface}
        onConformNow={handleDropToFloor}
        onUpdateGrid={handleUpdateGrid}
        onFocusCamera={handleFocusCamera}
        onCameraPreset={handleCameraPreset}
        onExport={handleExport}
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

          {!walkthroughActive && (
            <TransformToolbar
              mode={transformMode}
              space={transformSpace}
              hasSelection={Boolean(selectedId)}
              collapsed={leftSidebarCollapsed}
              onToggleCollapse={() => setLeftSidebarCollapsed((v) => !v)}
              onChangeMode={handleChangeMode}
              onToggleSpace={handleToggleSpace}
              onOpenColorStudio={handleOpenColorStudio}
              onDropToFloor={handleDropToFloor}
              onDuplicate={handleDuplicateSelected}
              onDelete={() => handleDeleteObject()}
            />
          )}

          {/* First-Person Walkthrough HUD + Mobile Virtual Joystick */}
          <WalkthroughOverlay
            active={walkthroughActive}
            language={globalSettings.language}
            onJoystickChange={(x, y) => engineRef.current?.setWalkJoystick(x, y)}
            onExit={() => {
              setWalkthroughActive(false);
              engineRef.current?.setWalkthroughMode(false);
            }}
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
                      <span>Eyedropper</span>
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
          {!walkthroughActive && transformMode === 'rotate' && selectedId && (
            <RotationControlBar
              rotationSnapDeg={snapSettings.rotationSnapDeg}
              onChangeRotationSnap={handleChangeRotationSnap}
              onRotateStep={handleRotateStep}
              onResetRotation={handleResetRotation}
            />
          )}

          {!walkthroughActive && (
            <DesktopSpawnDock
              studioMode={activeProject.mode}
              language={globalSettings.language}
              customAssets={customAssets}
              onSpawn={handleSpawn}
              onSpawnCustomAsset={handleSpawnCustomAsset}
              onDeleteCustomAsset={(id) => void handleDeleteCustomAsset(id)}
              onTriggerImport3D={handleTriggerImport3D}
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
                      : 'Free'
                  })`
                : transformMode === 'scale'
                ? t.scale
                : t.select}
            </span>
            {interiorPeek && (
              <>
                <span className="dot-sep">•</span>
                <span className="status-emerald">{t.peekInterior}</span>
              </>
            )}
            {surfaceSettings.enabled && (
              <>
                <span className="dot-sep">•</span>
                <span className="status-emerald">Surface ON</span>
              </>
            )}
          </div>
        </div>

        {inspectorOpen && !walkthroughActive && (
          <InspectorPanel
            language={globalSettings.language}
            objects={objects}
            selectedId={selectedId}
            editSinglePartMode={editSinglePartMode}
            subdivStats={selectedSubdivStats}
            paintMode={paintMode}
            activeBrush={activeBrush}
            inspectorSubTab={inspectorSubTab}
            onChangeSubTab={setInspectorSubTab}
            onCollapseDesktop={() => setInspectorOpen(false)}
            onSelectObject={handleSelectObject}
            onToggleEditSinglePart={handleToggleEditSinglePart}
            onGroupSceneObjects={handleGroupSceneObjects}
            onUngroupSelected={handleUngroupSelected}
            onSaveAsCustomAsset={(name) => void handleSaveAsCustomAsset(name)}
            onUpdateTransform={handleUpdateTransform}
            onUpdateMaterial={handleUpdateMaterial}
            onUpdateSubdivision={handleUpdateSubdivision}
            onChangePaintMode={handleChangePaintMode}
            onCommitHistory={handleCommitHistory}
            onDeleteObject={(id) => handleDeleteObject(id)}
            onDuplicateSelected={handleDuplicateSelected}
            onDropToFloor={handleDropToFloor}
            onResetImportedMaterial={handleResetImportedMaterial}
          />
        )}

        {mobileDrawerOpen && !walkthroughActive && (
          <InspectorPanel
            language={globalSettings.language}
            objects={objects}
            selectedId={selectedId}
            editSinglePartMode={editSinglePartMode}
            subdivStats={selectedSubdivStats}
            paintMode={paintMode}
            activeBrush={activeBrush}
            inspectorSubTab={inspectorSubTab}
            onChangeSubTab={setInspectorSubTab}
            isMobileDrawer
            onCloseMobile={() => setMobileDrawerOpen(false)}
            onSelectObject={handleSelectObject}
            onToggleEditSinglePart={handleToggleEditSinglePart}
            onGroupSceneObjects={handleGroupSceneObjects}
            onUngroupSelected={handleUngroupSelected}
            onSaveAsCustomAsset={(name) => void handleSaveAsCustomAsset(name)}
            onUpdateTransform={handleUpdateTransform}
            onUpdateMaterial={handleUpdateMaterial}
            onUpdateSubdivision={handleUpdateSubdivision}
            onChangePaintMode={handleChangePaintMode}
            onCommitHistory={handleCommitHistory}
            onDeleteObject={(id) => handleDeleteObject(id)}
            onDuplicateSelected={handleDuplicateSelected}
            onDropToFloor={handleDropToFloor}
            onResetImportedMaterial={handleResetImportedMaterial}
          />
        )}
      </main>

      {!walkthroughActive && (
        <MobileBottomBar
          studioMode={activeProject.mode}
          language={globalSettings.language}
          customAssets={customAssets}
          onSpawn={handleSpawn}
          onSpawnCustomAsset={handleSpawnCustomAsset}
          onDeleteCustomAsset={(id) => void handleDeleteCustomAsset(id)}
          onTriggerImport3D={handleTriggerImport3D}
          objectCount={objects.length}
          drawerOpen={mobileDrawerOpen}
          onToggleDrawer={() => setMobileDrawerOpen((v) => !v)}
        />
      )}

      <GlobalSettingsModal
        open={settingsOpen}
        settings={globalSettings}
        onUpdateSettings={handleUpdateGlobalSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default App;
