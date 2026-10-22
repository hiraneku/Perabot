import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StudioEngine } from './engine/StudioEngine';
import { CameraPresetType } from './engine/viewportHelpers';
import { PRIMITIVE_META } from './engine/primitives';
import {
  DragFeedback,
  PrimitiveKind,
  SceneObjectData,
  TransformMode,
  TransformSpace,
  Vec3,
} from './types/studio';
import { TopBar } from './components/TopBar';
import { TransformToolbar } from './components/TransformToolbar';
import { DesktopSpawnDock, MobileBottomBar } from './components/SpawnDock';
import { InspectorPanel } from './components/InspectorPanel';
import { HelpModal } from './components/HelpModal';

export const App: React.FC = () => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudioEngine | null>(null);

  const [objects, setObjects] = useState<SceneObjectData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [transformSpace, setTransformSpace] = useState<TransformSpace>('world');
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [snapStep, setSnapStep] = useState(0.25);
  const [gridVisible, setGridVisible] = useState(true);

  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [dragFeedback, setDragFeedback] = useState<DragFeedback>({
    active: false,
    axis: null,
    mode: 'translate',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
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
    }, 2200);
  }, []);

  // Initialize Three.js StudioEngine
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const engine = new StudioEngine(container, {
      onStateChange: (state) => {
        setObjects(state.objects);
        setSelectedId(state.selectedId);
        setCanUndo(state.canUndo);
        setCanRedo(state.canRedo);
      },
      onDragFeedback: (feedback) => {
        setDragFeedback(feedback);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

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
    engine.setTransformMode(mode);
    setTransformMode(mode);
  }, []);

  const handleToggleSpace = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next: TransformSpace = transformSpace === 'world' ? 'local' : 'world';
    engine.setTransformSpace(next);
    setTransformSpace(next);
    showToast(next === 'world' ? 'Mode Sumbu Global' : 'Mode Sumbu Lokal');
  }, [transformSpace, showToast]);

  const handleToggleSnap = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !snapEnabled;
    setSnapEnabled(next);
    engine.setSnap(next, snapStep);
    showToast(next ? `Snap Grid Aktif (${snapStep}m)` : 'Snap Grid Nonaktif');
  }, [snapEnabled, snapStep, showToast]);

  const handleChangeSnapStep = useCallback(
    (step: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      setSnapStep(step);
      setSnapEnabled(true);
      engine.setSnap(true, step);
      showToast(`Snap Grid diatur ke ${step}m`);
    },
    [showToast]
  );

  const handleToggleGrid = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !gridVisible;
    setGridVisible(next);
    engine.setGridVisible(next);
  }, [gridVisible]);

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
      id: string,
      patch: Partial<{
        name: string;
        color: string;
        roughness: number;
        metalness: number;
        visible: boolean;
      }>
    ) => {
      engineRef.current?.updateObjectMaterial(id, patch);
    },
    []
  );

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
    engineRef.current?.dropSelectedToFloor();
    showToast('Ditempelkan ke lantai (Y=0)');
  }, [showToast]);

  // Blender-inspired Keyboard Shortcuts for Desktop testing
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

      // Undo / Redo
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

      // Duplicate (Shift+D)
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
        case 'f':
          handleFocusCamera();
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
    handleChangeMode,
    handleFocusCamera,
    handleDeleteObject,
    handleDuplicateSelected,
    handleCameraPreset,
  ]);

  const formatDragAxis = (axis: string | null) => {
    if (!axis) return '';
    if (axis === 'X') return 'Sumbu X (Merah • Samping)';
    if (axis === 'Y') return 'Sumbu Y (Hijau • Atas/Bawah)';
    if (axis === 'Z') return 'Sumbu Z (Biru • Depan/Belakang)';
    return `Bidang ${axis}`;
  };

  return (
    <div className="studio-shell">
      <TopBar
        canUndo={canUndo}
        canRedo={canRedo}
        snapEnabled={snapEnabled}
        snapStep={snapStep}
        gridVisible={gridVisible}
        inspectorOpen={inspectorOpen}
        objectCount={objects.length}
        onUndo={() => engineRef.current?.undo()}
        onRedo={() => engineRef.current?.redo()}
        onToggleSnap={handleToggleSnap}
        onChangeSnapStep={handleChangeSnapStep}
        onToggleGrid={handleToggleGrid}
        onFocusCamera={handleFocusCamera}
        onCameraPreset={handleCameraPreset}
        onExport={handleExport}
        onClearScene={handleClearScene}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <main className="workspace-main">
        {/* 3D Viewport Area */}
        <div className="viewport-area">
          <div ref={viewportRef} className="viewport-canvas-host" />

          {/* Left Floating Blender-style Transform Toolbar */}
          <TransformToolbar
            mode={transformMode}
            space={transformSpace}
            hasSelection={Boolean(selectedId)}
            onChangeMode={handleChangeMode}
            onToggleSpace={handleToggleSpace}
            onDropToFloor={handleDropToFloor}
            onDuplicate={handleDuplicateSelected}
            onDelete={() => handleDeleteObject()}
          />

          {/* Live Gizmo Drag Readout Pill (top-center of viewport) */}
          {dragFeedback.active && (
            <div className="drag-hud-pill" aria-live="polite">
              <span className="drag-hud-axis">
                {formatDragAxis(dragFeedback.axis)}
              </span>
              {dragFeedback.mode === 'translate' && (
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
                  <b className="txt-x">X {dragFeedback.rotation.x.toFixed(0)}°</b>
                  <b className="txt-y">Y {dragFeedback.rotation.y.toFixed(0)}°</b>
                  <b className="txt-z">Z {dragFeedback.rotation.z.toFixed(0)}°</b>
                </span>
              )}
            </div>
          )}

          {/* Subtle Action Toast */}
          {toast && !dragFeedback.active && (
            <div className="toast-pill" role="status">
              {toast}
            </div>
          )}

          {/* Desktop Bottom-Center Spawn Dock (Kubus, Segitiga, Silinder) */}
          <DesktopSpawnDock onSpawn={handleSpawn} />

          {/* Subtle Viewport Status Info (bottom-left) */}
          <div className="viewport-status-chip">
            <span>{objects.length} Objek</span>
            <span className="dot-sep">•</span>
            <span>
              {transformMode === 'translate'
                ? 'Mode Geser (Panah RGB)'
                : transformMode === 'rotate'
                ? 'Mode Putar'
                : transformMode === 'scale'
                ? 'Mode Skala'
                : 'Mode Pilih'}
            </span>
          </div>
        </div>

        {/* Desktop Collapsible Right Inspector */}
        {inspectorOpen && (
          <InspectorPanel
            objects={objects}
            selectedId={selectedId}
            onSelectObject={handleSelectObject}
            onUpdateTransform={handleUpdateTransform}
            onUpdateMaterial={handleUpdateMaterial}
            onDeleteObject={(id) => handleDeleteObject(id)}
            onDuplicateSelected={handleDuplicateSelected}
            onDropToFloor={handleDropToFloor}
          />
        )}

        {/* Mobile Slide-Up Inspector Drawer */}
        {mobileDrawerOpen && (
          <InspectorPanel
            objects={objects}
            selectedId={selectedId}
            isMobileDrawer
            onCloseMobile={() => setMobileDrawerOpen(false)}
            onSelectObject={handleSelectObject}
            onUpdateTransform={handleUpdateTransform}
            onUpdateMaterial={handleUpdateMaterial}
            onDeleteObject={(id) => handleDeleteObject(id)}
            onDuplicateSelected={handleDuplicateSelected}
            onDropToFloor={handleDropToFloor}
          />
        )}
      </main>

      {/* Mobile Bottom Spawn & Studio Bar */}
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
