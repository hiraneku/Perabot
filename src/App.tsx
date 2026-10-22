import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StudioEngine } from './engine/StudioEngine';
import { CameraPresetType } from './engine/viewportHelpers';
import { PRIMITIVE_META } from './engine/primitives';
import {
  DEFAULT_SNAP_SETTINGS,
  DragFeedback,
  PrimitiveKind,
  RotationSnapStep,
  SceneObjectData,
  SnapSettings,
  TransformMode,
  TransformSpace,
  Vec3,
} from './types/studio';
import { TopBar } from './components/TopBar';
import { TransformToolbar } from './components/TransformToolbar';
import { DesktopSpawnDock, MobileBottomBar } from './components/SpawnDock';
import { InspectorPanel } from './components/InspectorPanel';
import { HelpModal } from './components/HelpModal';
import { RotationControlBar } from './components/RotationControlBar';

export const App: React.FC = () => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudioEngine | null>(null);

  const [objects, setObjects] = useState<SceneObjectData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [transformSpace, setTransformSpace] = useState<TransformSpace>('world');
  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    ...DEFAULT_SNAP_SETTINGS,
  });
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
    }, 2200);
  }, []);

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

  const handleUpdateSnap = useCallback((patch: Partial<SnapSettings>) => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = engine.updateSnapSettings(patch);
    setSnapSettings(next);
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

  const formatDragAxis = (axis: string | null, mode: string) => {
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
    <div className="studio-shell">
      <TopBar
        canUndo={canUndo}
        canRedo={canRedo}
        snapSettings={snapSettings}
        gridVisible={gridVisible}
        inspectorOpen={inspectorOpen}
        objectCount={objects.length}
        onUndo={() => engineRef.current?.undo()}
        onRedo={() => engineRef.current?.redo()}
        onUpdateSnap={handleUpdateSnap}
        onToggleGrid={handleToggleGrid}
        onFocusCamera={handleFocusCamera}
        onCameraPreset={handleCameraPreset}
        onExport={handleExport}
        onClearScene={handleClearScene}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <main className="workspace-main">
        <div className="viewport-area">
          <div ref={viewportRef} className="viewport-canvas-host" />

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

          {/* Live Gizmo + Smart Snap Readout Pill */}
          {dragFeedback.active && (
            <div className="drag-hud-pill" aria-live="polite">
              <span className="drag-hud-axis">
                {formatDragAxis(dragFeedback.axis, dragFeedback.mode)}
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

          {/* Controlled Rotation Quick Bar (only in Rotate mode when an object is selected) */}
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
                ? 'Mode Geser (Panah RGB)'
                : transformMode === 'rotate'
                ? `Mode Putar Terkendali (${
                    snapSettings.rotationSnapDeg > 0
                      ? `${snapSettings.rotationSnapDeg}°`
                      : 'Bebas'
                  })`
                : transformMode === 'scale'
                ? 'Mode Skala'
                : 'Mode Pilih'}
            </span>
          </div>
        </div>

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
