import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { PaintBrushPayload, StudioEngine } from './engine/StudioEngine';
import { CameraPresetType } from './engine/viewportHelpers';
import { PRIMITIVE_META } from './engine/primitives';
import {
  DEFAULT_GRID_SETTINGS,
  DEFAULT_SNAP_SETTINGS,
  DEFAULT_SURFACE_SETTINGS,
  DragFeedback,
  GridSettings,
  ObjectSubdivisionSettings,
  PaintInteractionMode,
  PrimitiveKind,
  RotationSnapStep,
  SceneObjectData,
  SnapSettings,
  SubdivisionStats,
  SurfaceSettings,
  TransformMode,
  TransformSpace,
  Vec3,
} from './types/studio';
import { TopBar } from './components/TopBar';
import { TransformToolbar } from './components/TransformToolbar';
import { DesktopSpawnDock, MobileBottomBar } from './components/SpawnDock';
import { InspectorPanel, InspectorSubTab } from './components/InspectorPanel';
import { HelpModal } from './components/HelpModal';
import { RotationControlBar } from './components/RotationControlBar';
import { AdvancedColorMaterialPatch } from './components/ColorWheelPicker';

export const App: React.FC = () => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudioEngine | null>(null);

  const [objects, setObjects] = useState<SceneObjectData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2300);
  }, []);

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
        showToast('Keluar mode layar penuh');
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
        showToast('Mode Layar Penuh aktif');
      }
    } catch {
      // Graceful fallback when sandbox/iOS blocks native Fullscreen API
      const next = !isFullscreen;
      docEl.classList.toggle('zen-fullscreen-fallback', next);
      setIsFullscreen(next);
      showToast(next ? 'Mode Layar Penuh aktif' : 'Keluar mode layar penuh');
    }
  }, [isFullscreen, showToast]);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const engine = new StudioEngine(container, {
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
        showToast(`Warna diambil dari ${objName} (Siap mengecat!)`);
      },
      onPaintApplied: (objName) => {
        showToast(`${objName} diwarnai`);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [showToast]);

  const handleSpawn = useCallback(
    (kind: PrimitiveKind) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.spawnPrimitive(kind);
      setTransformMode(engine.getTransformMode());
      showToast(`${PRIMITIVE_META[kind].label} ditambahkan`);
    },
    [showToast]
  );

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
      if (mode === 'bucket') {
        showToast('Mode Cat Klik aktif: Ketuk objek di kanvas untuk mewarnai');
      } else if (mode === 'eyedropper') {
        showToast('Pipet aktif: Ketuk objek di kanvas untuk mengambil warnanya');
      }
    },
    [activeBrush, showToast]
  );

  const handleToggleSpace = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next: TransformSpace = transformSpace === 'world' ? 'local' : 'world';
    engine.setTransformSpace(next);
    setTransformSpace(next);
    showToast(next === 'world' ? 'Mode Sumbu Global' : 'Mode Sumbu Lokal');
  }, [transformSpace, showToast]);

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
      if (patch.enabled !== undefined && !reconformNow) {
        showToast(
          next.enabled
            ? 'Surface Alignment Aktif: Seret objek / panah XZ mengikuti permukaan'
            : 'Surface Alignment Nonaktif'
        );
      }
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
      showToast(step > 0 ? `Kunci putaran ${step}°` : 'Putaran halus bebas');
    },
    [handleUpdateSnap, showToast]
  );

  const handleRotateStep = useCallback(
    (axis: 'x' | 'y' | 'z', deltaDeg: number) => {
      const ok = engineRef.current?.rotateSelectedBy(axis, deltaDeg);
      if (ok) {
        const sign = deltaDeg > 0 ? '+' : '';
        showToast(`Diputar ${axis.toUpperCase()} ${sign}${deltaDeg}°`);
      }
    },
    [showToast]
  );

  const handleResetRotation = useCallback(() => {
    const ok = engineRef.current?.resetSelectedRotation();
    if (ok) {
      showToast('Rotasi ditegakkan ke 0°');
    }
  }, [showToast]);

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
        showToast(`Berhasil diekspor: ${filename}`);
      } catch (err) {
        console.error(err);
        showToast('Gagal mengekspor file 3D');
      }
    },
    [showToast]
  );

  const handleClearScene = useCallback(() => {
    engineRef.current?.clearScene();
    showToast('Scene dibersihkan');
  }, [showToast]);

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
      // Keep active paint brush synced with color/PBR edits
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
      showToast('Objek dihapus');
    },
    [showToast]
  );

  const handleDuplicateSelected = useCallback(() => {
    const newId = engineRef.current?.duplicateSelected();
    if (newId) {
      showToast('Objek diduplikat');
    }
  }, [showToast]);

  const handleDropToFloor = useCallback(() => {
    const msg = engineRef.current?.dropSelectedToFloor();
    if (msg) {
      showToast(msg);
    }
  }, [showToast]);

  useEffect(() => {
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
      if (axis === 'X') return 'Putar Sumbu X';
      if (axis === 'Y') return 'Putar Mendatar Y';
      if (axis === 'Z') return 'Putar Sumbu Z';
    }
    if (axis === 'X') return 'Sumbu X (Merah)';
    if (axis === 'Y') return 'Sumbu Y (Hijau)';
    if (axis === 'Z') return 'Sumbu Z (Biru)';
    return `Bidang ${axis}`;
  };

  return (
    <div className={`studio-shell ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <TopBar
        canUndo={canUndo}
        canRedo={canRedo}
        snapSettings={snapSettings}
        surfaceSettings={surfaceSettings}
        gridSettings={gridSettings}
        inspectorOpen={inspectorOpen}
        isFullscreen={isFullscreen}
        hasSelection={Boolean(selectedId)}
        objectCount={objects.length}
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
        <div className="viewport-area">
          <div ref={viewportRef} className="viewport-canvas-host" />

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

          {/* Right-edge Expand Tab when Desktop Inspector Sidebar is hidden */}
          {!inspectorOpen && (
            <button
              type="button"
              className="right-inspector-expand-tab desktop-only"
              onClick={() => setInspectorOpen(true)}
              title="Tampilkan Sidebar Properti (<)"
              aria-label="Tampilkan Sidebar Properti"
            >
              <ChevronLeft size={17} />
              <span>Properti</span>
            </button>
          )}

          {/* Active Paint / Click-to-Place Floating Pill */}
          {(paintMode !== 'none' ||
            (surfaceSettings.enabled && surfaceSettings.clickToPlace)) &&
            !dragFeedback.active && (
              <div className="interactive-mode-banner">
                {paintMode === 'bucket' && (
                  <>
                    <span>🎨 Mode Cat Klik Aktif — Ketuk objek untuk mewarnai</span>
                    <button
                      type="button"
                      onClick={() => handleChangePaintMode('none')}
                    >
                      Selesai
                    </button>
                  </>
                )}
                {paintMode === 'eyedropper' && (
                  <>
                    <span>💧 Mode Pipet — Ketuk objek untuk menyalin warna</span>
                    <button
                      type="button"
                      onClick={() => handleChangePaintMode('none')}
                    >
                      Batal
                    </button>
                  </>
                )}
                {paintMode === 'none' &&
                  surfaceSettings.enabled &&
                  surfaceSettings.clickToPlace && (
                    <>
                      <span>
                        🧲 Klik Permukaan Aktif — Ketuk atap/dinding/bukit tujuan
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSurface({ clickToPlace: false })
                        }
                      >
                        Matikan
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
          {transformMode === 'rotate' && selectedId && (
            <RotationControlBar
              rotationSnapDeg={snapSettings.rotationSnapDeg}
              onChangeRotationSnap={handleChangeRotationSnap}
              onRotateStep={handleRotateStep}
              onResetRotation={handleResetRotation}
            />
          )}

          <DesktopSpawnDock onSpawn={handleSpawn} />

          <div className="viewport-status-chip">
            <span>{objects.length} Objek</span>
            <span className="dot-sep">•</span>
            <span>
              {transformMode === 'translate'
                ? 'Geser (RGB)'
                : transformMode === 'rotate'
                ? `Putar (${
                    snapSettings.rotationSnapDeg > 0
                      ? `${snapSettings.rotationSnapDeg}°`
                      : 'Bebas'
                  })`
                : transformMode === 'scale'
                ? 'Skala'
                : 'Pilih'}
            </span>
            {surfaceSettings.enabled && (
              <>
                <span className="dot-sep">•</span>
                <span className="status-emerald">Surface ON</span>
              </>
            )}
          </div>
        </div>

        {inspectorOpen && (
          <InspectorPanel
            objects={objects}
            selectedId={selectedId}
            subdivStats={selectedSubdivStats}
            paintMode={paintMode}
            activeBrush={activeBrush}
            inspectorSubTab={inspectorSubTab}
            onChangeSubTab={setInspectorSubTab}
            onCollapseDesktop={() => setInspectorOpen(false)}
            onSelectObject={handleSelectObject}
            onUpdateTransform={handleUpdateTransform}
            onUpdateMaterial={handleUpdateMaterial}
            onUpdateSubdivision={handleUpdateSubdivision}
            onChangePaintMode={handleChangePaintMode}
            onCommitHistory={handleCommitHistory}
            onDeleteObject={(id) => handleDeleteObject(id)}
            onDuplicateSelected={handleDuplicateSelected}
            onDropToFloor={handleDropToFloor}
          />
        )}

        {mobileDrawerOpen && (
          <InspectorPanel
            objects={objects}
            selectedId={selectedId}
            subdivStats={selectedSubdivStats}
            paintMode={paintMode}
            activeBrush={activeBrush}
            inspectorSubTab={inspectorSubTab}
            onChangeSubTab={setInspectorSubTab}
            isMobileDrawer
            onCloseMobile={() => setMobileDrawerOpen(false)}
            onSelectObject={handleSelectObject}
            onUpdateTransform={handleUpdateTransform}
            onUpdateMaterial={handleUpdateMaterial}
            onUpdateSubdivision={handleUpdateSubdivision}
            onChangePaintMode={handleChangePaintMode}
            onCommitHistory={handleCommitHistory}
            onDeleteObject={(id) => handleDeleteObject(id)}
            onDuplicateSelected={handleDuplicateSelected}
            onDropToFloor={handleDropToFloor}
          />
        )}
      </main>

      <MobileBottomBar
        onSpawn={handleSpawn}
        objectCount={objects.length}
        drawerOpen={mobileDrawerOpen}
        onToggleDrawer={() => setMobileDrawerOpen((v) => !v)}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default App;
