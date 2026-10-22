import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import {
  CameraPresetType,
  enhanceTransformGizmo,
  RotationProtractorVisualizer,
  SurfaceNormalVisualizer,
} from './viewportHelpers';
import { createPrimitiveGeometry, PRIMITIVE_META } from './primitives';
import { SnappingEngine, SnapVisualizer } from './SnappingEngine';
import { SurfaceAlignEngine } from './SurfaceAlignEngine';
import { buildSubdividedGeometry, computeGeometryStats } from './SubdivisionEngine';
import { GridTerrainSystem } from './GridTerrainSystem';
import {
  DEFAULT_GRID_SETTINGS,
  DEFAULT_SNAP_SETTINGS,
  DEFAULT_SUBDIVISION_SETTINGS,
  DEFAULT_SURFACE_SETTINGS,
  DragFeedback,
  GridSettings,
  ObjectSubdivisionSettings,
  PaintInteractionMode,
  PrimitiveKind,
  SceneObjectData,
  SnapSettings,
  SubdivisionStats,
  SurfaceSettings,
  TransformMode,
  TransformSpace,
  Vec3,
} from '../types/studio';

interface HistorySnapshot {
  objects: SceneObjectData[];
  selectedId: string | null;
}

interface InternalTransformControls {
  rotationAngle?: number;
  rotationAxis?: THREE.Vector3;
  _quaternionStart?: THREE.Quaternion;
}

export interface PaintBrushPayload {
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  flatShading: boolean;
}

export interface StudioEngineCallbacks {
  onStateChange: (state: {
    objects: SceneObjectData[];
    selectedId: string | null;
    canUndo: boolean;
    canRedo: boolean;
    selectedSubdivStats: SubdivisionStats | null;
  }) => void;
  onDragFeedback: (feedback: DragFeedback) => void;
  onEyedropperSample?: (sample: PaintBrushPayload, objectName: string) => void;
  onPaintApplied?: (objectName: string) => void;
}

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

const BOX_FACE_LOCAL_NORMALS: THREE.Vector3[] = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export class StudioEngine {
  private container: HTMLElement;
  private callbacks: StudioEngineCallbacks;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbitControls: OrbitControls;
  private transformControls: TransformControls;
  private viewHelper: ViewHelper;
  private clock = new THREE.Clock();

  private gridSystem = new GridTerrainSystem();
  private objectGroup = new THREE.Group();
  private meshMap = new Map<string, THREE.Mesh>();
  private baseGeometryCache = new Map<PrimitiveKind, THREE.BufferGeometry>();
  private hiddenFaceMaterial = new THREE.MeshBasicMaterial({ visible: false });

  private selectedId: string | null = null;
  private transformMode: TransformMode = 'translate';
  private transformSpace: TransformSpace = 'world';
  private snapSettings: SnapSettings = { ...DEFAULT_SNAP_SETTINGS };
  private surfaceSettings: SurfaceSettings = { ...DEFAULT_SURFACE_SETTINGS };
  private gridSettings: GridSettings = { ...DEFAULT_GRID_SETTINGS };

  // Paint / Eyedropper viewport interaction
  private paintMode: PaintInteractionMode = 'none';
  private activeBrush: PaintBrushPayload = {
    color: '#3b82f6',
    roughness: 0.55,
    metalness: 0.1,
    opacity: 1,
    emissive: '#000000',
    emissiveIntensity: 0,
    flatShading: false,
  };

  private snappingEngine = new SnappingEngine();
  private surfaceEngine = new SurfaceAlignEngine();
  private snapVisualizer = new SnapVisualizer();
  private protractorVisualizer = new RotationProtractorVisualizer();
  private surfaceNormalVisualizer = new SurfaceNormalVisualizer();
  private isApplyingCustomTransform = false;

  // Direct surface-sliding & gizmo probe offset state
  private isSurfaceSliding = false;
  private didMoveDuringSurfaceSlide = false;
  private gizmoSurfaceProbeOffset = new THREE.Vector3(0, -0.5, 0);

  private counters: Partial<Record<PrimitiveKind, number>> = {};

  private history: HistorySnapshot[] = [];
  private historyIndex = -1;
  private maxHistory = 60;

  private pointerDownPos = { x: 0, y: 0 };
  private wasGizmoDragging = false;
  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2();
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver;

  private cameraTween: {
    active: boolean;
    elapsed: number;
    duration: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null = null;

  constructor(container: HTMLElement, callbacks: StudioEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#171a21');
    this.scene.fog = new THREE.Fog('#171a21', 45, 130);

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.05, 300);
    this.camera.position.set(4.6, 3.6, 5.2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.autoClear = false;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.outline = 'none';
    container.appendChild(this.renderer.domElement);

    this.setupLighting();

    this.scene.add(this.gridSystem.group);

    this.objectGroup.name = 'PerabotSceneObjects';
    this.scene.add(this.objectGroup);
    this.scene.add(this.snapVisualizer.group);
    this.scene.add(this.protractorVisualizer.group);
    this.scene.add(this.surfaceNormalVisualizer.group);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.maxDistance = 120;
    this.orbitControls.minDistance = 0.6;
    this.orbitControls.maxPolarAngle = Math.PI * 0.92;
    this.orbitControls.target.set(0, 0.5, 0);
    this.orbitControls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this.transformControls = new TransformControls(
      this.camera,
      this.renderer.domElement
    );
    this.transformControls.setMode('translate');
    this.transformControls.setSpace('world');
    this.updateGizmoResponsiveSize();
    enhanceTransformGizmo(this.transformControls);
    this.applyControlSnapConfig();
    this.scene.add(this.transformControls.getHelper());

    this.transformControls.addEventListener('dragging-changed', (event) => {
      const isDragging = Boolean(event.value);
      this.orbitControls.enabled = !isDragging;
      if (isDragging) {
        this.wasGizmoDragging = true;
        if (this.selectedId && this.transformControls.getMode() === 'translate') {
          const selMesh = this.meshMap.get(this.selectedId);
          if (selMesh) {
            const halfDiag = this.getMeshHalfDiagonal(selMesh);
            const others = Array.from(this.meshMap.values());
            const startHit = this.surfaceEngine.findClosestSurface3D(
              selMesh.position,
              selMesh.position,
              selMesh,
              others,
              this.gridSystem,
              this.gridSettings.style === 'terrain',
              Math.max(0.65, halfDiag * 1.2)
            );
            if (startHit) {
              this.gizmoSurfaceProbeOffset
                .copy(startHit.point)
                .sub(selMesh.position);
            } else {
              this.gizmoSurfaceProbeOffset.set(
                0,
                -Math.max(0.25, selMesh.scale.y * 0.5),
                0
              );
            }
          }
        }
      } else {
        this.snapVisualizer.clear();
        this.protractorVisualizer.hide();
        this.surfaceNormalVisualizer.hide();
        this.updateSeamlessTouchFaces();
        this.pushHistorySnapshot();
        this.emitDragFeedback(false);
        this.emitState();
      }
    });

    this.transformControls.addEventListener('objectChange', () => {
      if (this.isApplyingCustomTransform) return;
      this.handleGizmoObjectChange();
    });

    this.viewHelper = new ViewHelper(this.camera, this.renderer.domElement);
    this.viewHelper.setLabelStyle('bold 24px system-ui, sans-serif', '#0d1016', 16);
    this.viewHelper.setLabels('X', 'Y', 'Z');
    this.viewHelper.center.copy(this.orbitControls.target);

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);

    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);

    this.spawnPrimitive('cube', false);
    this.pushHistorySnapshot();
    this.emitState();

    this.animate();
  }

  private getOrCreateBaseGeometry(kind: PrimitiveKind): THREE.BufferGeometry {
    let base = this.baseGeometryCache.get(kind);
    if (!base) {
      base = createPrimitiveGeometry(kind);
      this.baseGeometryCache.set(kind, base);
    }
    return base;
  }

  private getBaseMaterial(mesh: THREE.Mesh): THREE.MeshStandardMaterial {
    return mesh.userData.baseMaterial as THREE.MeshStandardMaterial;
  }

  private syncWireframeOverlay(mesh: THREE.Mesh, showWireframe: boolean): void {
    const existing = mesh.getObjectByName('__subdivWireframe') as THREE.Mesh | undefined;
    if (!showWireframe) {
      if (existing) {
        mesh.remove(existing);
        (existing.material as THREE.Material).dispose();
      }
      return;
    }

    if (existing) {
      existing.geometry = mesh.geometry;
      return;
    }

    const wireMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      wireframe: true,
      transparent: true,
      opacity: 0.42,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const wireMesh = new THREE.Mesh(mesh.geometry, wireMat);
    wireMesh.name = '__subdivWireframe';
    wireMesh.raycast = () => {}; // Never block raycasting on parent mesh
    mesh.add(wireMesh);
  }

  private getMeshHalfDiagonal(mesh: THREE.Mesh): number {
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (!bb) return 0.75;
    return (
      0.5 *
      Math.hypot(
        (bb.max.x - bb.min.x) * mesh.scale.x,
        (bb.max.y - bb.min.y) * mesh.scale.y,
        (bb.max.z - bb.min.z) * mesh.scale.z
      )
    );
  }

  private handleGizmoObjectChange(): void {
    if (!this.selectedId) return;
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return;

    const mode = this.transformControls.getMode();
    const axis = this.transformControls.axis;

    this.isApplyingCustomTransform = true;
    try {
      if (mode === 'translate') {
        const rawPos = mesh.position.clone();
        const others = Array.from(this.meshMap.values());
        const groundY = this.gridSystem.sampleHeight(rawPos.x, rawPos.z);

        let conformedToSurface = false;
        let finalLabel: string | null = null;

        // 1. Smart Omni-Directional 3D Surface Adaptation (works on ALL gizmo axes X, Y, Z, planes!)
        if (this.surfaceSettings.enabled && this.surfaceSettings.autoOnMove) {
          const halfDiag = this.getMeshHalfDiagonal(mesh);
          const probePt = rawPos.clone().add(this.gizmoSurfaceProbeOffset);
          const captureRadius = Math.max(0.72, halfDiag * 1.18);

          const surfHit = this.surfaceEngine.findClosestSurface3D(
            probePt,
            rawPos,
            mesh,
            others,
            this.gridSystem,
            this.gridSettings.style === 'terrain',
            captureRadius
          );

          if (surfHit) {
            const gridStep =
              surfHit.isGround &&
              this.snapSettings.enabled &&
              this.snapSettings.grid
                ? this.snapSettings.gridStep
                : 0;

            const applied = this.surfaceEngine.applySurfaceHit(
              mesh,
              surfHit,
              this.surfaceSettings,
              this.gridSystem,
              others,
              true,
              gridStep
            );
            this.surfaceNormalVisualizer.show(
              applied.contactPoint,
              applied.contactNormal
            );
            this.snapVisualizer.clear();
            finalLabel = applied.label;
            conformedToSurface = true;
          }
        }

        // 2. Standard Smart Snapping when Surface is off OR when object is lifted far into the air
        if (!conformedToSurface) {
          this.surfaceNormalVisualizer.hide();
          const snapRes = this.snappingEngine.computeSnap(
            mesh,
            rawPos,
            axis,
            others,
            this.snapSettings,
            groundY
          );
          mesh.position.copy(snapRes.snappedPosition);
          this.snapVisualizer.update(snapRes);
          finalLabel = snapRes.snapLabel;
        }

        this.updateSeamlessTouchFaces();
        this.protractorVisualizer.hide();
        this.emitDragFeedback(true, { snapLabel: finalLabel });
      } else if (mode === 'rotate') {
        this.snapVisualizer.clear();
        this.surfaceNormalVisualizer.hide();
        const internal = this.transformControls as unknown as InternalTransformControls;
        const rawAngle = internal.rotationAngle ?? 0;
        const startQuat = internal._quaternionStart;
        const rotAxis = internal.rotationAxis;

        let controlledAngle = rawAngle * 0.42;
        const stepDeg = this.snapSettings.rotationSnapDeg;
        if (stepDeg > 0) {
          const stepRad = stepDeg * DEG2RAD;
          controlledAngle = Math.round(controlledAngle / stepRad) * stepRad;
        }

        if (startQuat && rotAxis && (axis === 'X' || axis === 'Y' || axis === 'Z')) {
          const deltaQ = new THREE.Quaternion().setFromAxisAngle(
            rotAxis.clone().normalize(),
            controlledAngle
          );
          if (this.transformSpace === 'local') {
            mesh.quaternion.copy(startQuat).multiply(deltaQ).normalize();
          } else {
            mesh.quaternion.copy(deltaQ).multiply(startQuat).normalize();
          }

          const radiusScale =
            Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z, 0.9) * 0.88;
          this.protractorVisualizer.show(mesh.position, axis, controlledAngle, radiusScale);
        }

        this.updateSeamlessTouchFaces();
        const deltaDeg = Math.round(controlledAngle * RAD2DEG);
        this.emitDragFeedback(true, {
          deltaAngleDeg: deltaDeg,
          snapLabel: stepDeg > 0 ? `Kunci Sudut ${stepDeg}°` : 'Putar Halus Bebas',
        });
      } else {
        this.snapVisualizer.clear();
        this.protractorVisualizer.hide();
        this.surfaceNormalVisualizer.hide();
        mesh.scale.set(
          Math.max(0.05, mesh.scale.x),
          Math.max(0.05, mesh.scale.y),
          Math.max(0.05, mesh.scale.z)
        );
        this.updateSeamlessTouchFaces();
        this.emitDragFeedback(true, {
          snapLabel:
            this.snapSettings.enabled && this.snapSettings.grid
              ? `Skala Grid ${this.snapSettings.gridStep}m`
              : null,
        });
      }
    } finally {
      this.isApplyingCustomTransform = false;
    }

    this.emitState();
  }

  private updateSeamlessTouchFaces(): void {
    const cubes: Array<{
      mesh: THREE.Mesh;
      box: THREE.Box3;
      center: THREE.Vector3;
    }> = [];

    for (const mesh of this.meshMap.values()) {
      const subdiv = mesh.userData.subdivision as ObjectSubdivisionSettings | undefined;
      const baseMat = this.getBaseMaterial(mesh);
      // Only cull coplanar interior faces on opaque un-subdivided cubes
      if (
        !mesh.visible ||
        mesh.userData.kind !== 'cube' ||
        (subdiv && subdiv.level > 0) ||
        baseMat.transparent
      ) {
        if (Array.isArray(mesh.material)) {
          mesh.material = baseMat;
        }
        continue;
      }

      const testX = new THREE.Vector3(1, 0, 0).applyQuaternion(mesh.quaternion);
      const testY = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.quaternion);
      const isOrtho =
        (Math.abs(testX.x) > 0.999 ||
          Math.abs(testX.y) > 0.999 ||
          Math.abs(testX.z) > 0.999) &&
        (Math.abs(testY.x) > 0.999 ||
          Math.abs(testY.y) > 0.999 ||
          Math.abs(testY.z) > 0.999);

      if (!isOrtho) {
        mesh.material = baseMat;
        continue;
      }

      const box = this.computeWorldBounds(mesh);
      const center = new THREE.Vector3();
      box.getCenter(center);
      cubes.push({ mesh, box, center });
    }

    const EPS = 0.004;

    for (const item of cubes) {
      const baseMat = this.getBaseMaterial(item.mesh);
      const faceMats: THREE.Material[] = [
        baseMat,
        baseMat,
        baseMat,
        baseMat,
        baseMat,
        baseMat,
      ];
      let anyHidden = false;

      for (let g = 0; g < 6; g++) {
        const worldNormal = BOX_FACE_LOCAL_NORMALS[g]
          .clone()
          .applyQuaternion(item.mesh.quaternion);

        let ax: 'x' | 'y' | 'z' = 'x';
        let dir: 1 | -1 = 1;
        if (Math.abs(worldNormal.x) > 0.9) {
          ax = 'x';
          dir = worldNormal.x > 0 ? 1 : -1;
        } else if (Math.abs(worldNormal.y) > 0.9) {
          ax = 'y';
          dir = worldNormal.y > 0 ? 1 : -1;
        } else {
          ax = 'z';
          dir = worldNormal.z > 0 ? 1 : -1;
        }

        const [p1, p2]: ['x' | 'y' | 'z', 'x' | 'y' | 'z'] =
          ax === 'x' ? ['y', 'z'] : ax === 'y' ? ['x', 'z'] : ['x', 'y'];

        const faceCoord = dir === 1 ? item.box.max[ax] : item.box.min[ax];

        for (const other of cubes) {
          if (other.mesh === item.mesh) continue;
          if ((other.center[ax] - item.center[ax]) * dir <= 0.01) continue;

          const neighborOppCoord = dir === 1 ? other.box.min[ax] : other.box.max[ax];
          if (Math.abs(faceCoord - neighborOppCoord) > EPS) continue;

          const coversP1 =
            other.box.min[p1] <= item.box.min[p1] + EPS &&
            other.box.max[p1] >= item.box.max[p1] - EPS;
          const coversP2 =
            other.box.min[p2] <= item.box.min[p2] + EPS &&
            other.box.max[p2] >= item.box.max[p2] - EPS;

          if (coversP1 && coversP2) {
            faceMats[g] = this.hiddenFaceMaterial;
            anyHidden = true;
            break;
          }
        }
      }

      item.mesh.material = anyHidden ? faceMats : baseMat;
    }
  }

  private applyControlSnapConfig(): void {
    this.transformControls.setTranslationSnap(null);
    this.transformControls.setRotationSnap(null);
    if (this.snapSettings.enabled && this.snapSettings.grid) {
      this.transformControls.setScaleSnap(this.snapSettings.gridStep);
    } else {
      this.transformControls.setScaleSnap(null);
    }
  }

  private setupLighting(): void {
    const hemiLight = new THREE.HemisphereLight('#dce8ff', '#282d38', 0.98);
    hemiLight.position.set(0, 25, 0);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff8ed', 1.85);
    keyLight.position.set(11, 18, 13);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 75;
    const d = 18;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.normalBias = 0.045;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#9ec5ff', 0.55);
    fillLight.position.set(-12, 9, -10);
    this.scene.add(fillLight);
  }

  private updateGizmoResponsiveSize(): void {
    const isCompact = window.innerWidth < 768 || 'ontouchstart' in window;
    this.transformControls.setSize(isCompact ? 1.24 : 1.08);
  }

  private handleResize = (): void => {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.updateGizmoResponsiveSize();
  };

  private setPointerNDCFromEvent(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointerDownPos = { x: event.clientX, y: event.clientY };
    this.wasGizmoDragging = false;

    // When Surface Alignment is enabled and user presses directly on the selected object
    // (without grabbing a TransformControls gizmo axis!), allow smooth direct surface sliding!
    if (
      this.surfaceSettings.enabled &&
      this.paintMode === 'none' &&
      this.selectedId &&
      event.button <= 0 &&
      !this.transformControls.axis
    ) {
      const selMesh = this.meshMap.get(this.selectedId);
      if (selMesh && selMesh.visible) {
        this.setPointerNDCFromEvent(event);
        this.raycaster.setFromCamera(this.pointerNDC, this.camera);
        const hitSel = this.raycaster.intersectObject(selMesh, false);
        if (hitSel.length > 0) {
          this.isSurfaceSliding = true;
          this.didMoveDuringSurfaceSlide = false;
          this.orbitControls.enabled = false;
          this.renderer.domElement.setPointerCapture?.(event.pointerId);
        }
      }
    }
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isSurfaceSliding || !this.selectedId) return;
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    if (!this.didMoveDuringSurfaceSlide && Math.hypot(dx, dy) < 4) return;
    this.didMoveDuringSurfaceSlide = true;

    const selMesh = this.meshMap.get(this.selectedId);
    if (!selMesh) return;

    this.setPointerNDCFromEvent(event);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    const others = Array.from(this.meshMap.values());
    const hit = this.surfaceEngine.raycastPointerSurface(
      this.raycaster,
      selMesh,
      others,
      this.gridSystem,
      this.gridSettings.visible,
      this.gridSettings.style === 'terrain'
    );
    if (!hit) return;

    const gridStep =
      this.snapSettings.enabled && this.snapSettings.grid
        ? this.snapSettings.gridStep
        : 0;

    const applied = this.surfaceEngine.applySurfaceHit(
      selMesh,
      hit,
      this.surfaceSettings,
      this.gridSystem,
      others,
      true,
      gridStep
    );

    this.surfaceNormalVisualizer.show(
      applied.contactPoint,
      applied.contactNormal
    );
    this.updateSeamlessTouchFaces();
    this.emitDragFeedback(true, { snapLabel: applied.label, forceSurfaceMode: true });
    this.emitState();
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (this.isSurfaceSliding) {
      const moved = this.didMoveDuringSurfaceSlide;
      this.isSurfaceSliding = false;
      this.didMoveDuringSurfaceSlide = false;
      this.surfaceNormalVisualizer.hide();
      this.orbitControls.enabled = true;
      this.renderer.domElement.releasePointerCapture?.(event.pointerId);

      if (moved) {
        this.updateSeamlessTouchFaces();
        this.pushHistorySnapshot();
        this.emitDragFeedback(false);
        this.emitState();
        return;
      }
    }

    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 6 || this.wasGizmoDragging || this.transformControls.dragging) {
      this.wasGizmoDragging = false;
      return;
    }

    this.viewHelper.center.copy(this.orbitControls.target);
    if (this.viewHelper.handleClick(event as unknown as MouseEvent)) {
      return;
    }

    this.setPointerNDCFromEvent(event);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const selectableMeshes = Array.from(this.meshMap.values()).filter((m) => m.visible);
    const hits = this.raycaster.intersectObjects(selectableMeshes, false);

    // 1. Handle Eyedropper or Paint Bucket viewport click
    if (this.paintMode !== 'none' && hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const hitId = hitMesh.userData.objectId as string | undefined;
      if (hitId) {
        const objData = this.serializeObject(hitId);
        if (this.paintMode === 'eyedropper' && objData) {
          this.callbacks.onEyedropperSample?.(
            {
              color: objData.color,
              roughness: objData.roughness,
              metalness: objData.metalness,
              opacity: objData.opacity,
              emissive: objData.emissive,
              emissiveIntensity: objData.emissiveIntensity,
              flatShading: objData.flatShading,
            },
            objData.name
          );
          return;
        }
        if (this.paintMode === 'bucket') {
          this.updateObjectMaterial(hitId, { ...this.activeBrush }, true);
          this.selectObject(hitId, true);
          this.callbacks.onPaintApplied?.(hitMesh.name);
          return;
        }
      }
    }

    // 2. Handle Surface Click-to-Place mode when enabled & an object is currently selected!
    if (
      this.surfaceSettings.enabled &&
      this.surfaceSettings.clickToPlace &&
      this.selectedId
    ) {
      const selMesh = this.meshMap.get(this.selectedId);
      if (selMesh) {
        const hitSurf = this.surfaceEngine.raycastPointerSurface(
          this.raycaster,
          selMesh,
          selectableMeshes,
          this.gridSystem,
          this.gridSettings.visible,
          this.gridSettings.style === 'terrain'
        );
        if (hitSurf) {
          const gridStep =
            this.snapSettings.enabled && this.snapSettings.grid
              ? this.snapSettings.gridStep
              : 0;
          this.surfaceEngine.applySurfaceHit(
            selMesh,
            hitSurf,
            this.surfaceSettings,
            this.gridSystem,
            selectableMeshes,
            true,
            gridStep
          );
          this.updateSeamlessTouchFaces();
          this.pushHistorySnapshot();
          this.emitState();
          return;
        }
      }
    }

    // 3. Normal Object Selection
    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const hitId = hitMesh.userData.objectId as string | undefined;
      if (hitId) {
        this.selectObject(hitId);
      }
    } else {
      this.selectObject(null);
    }
  };

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.viewHelper.animating) {
      this.orbitControls.enabled = false;
      this.viewHelper.update(delta);
    } else if (this.cameraTween?.active) {
      this.updateCameraTween(delta);
    } else if (!this.transformControls.dragging && !this.isSurfaceSliding) {
      this.orbitControls.enabled = true;
      this.orbitControls.update();
    }

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.viewHelper.render(this.renderer);
  };

  private updateCameraTween(delta: number): void {
    if (!this.cameraTween) return;
    this.cameraTween.elapsed += delta;
    const rawT = Math.min(this.cameraTween.elapsed / this.cameraTween.duration, 1);
    const t = 1 - Math.pow(1 - rawT, 3);

    this.camera.position.lerpVectors(this.cameraTween.fromPos, this.cameraTween.toPos, t);
    this.orbitControls.target.lerpVectors(
      this.cameraTween.fromTarget,
      this.cameraTween.toTarget,
      t
    );
    this.camera.lookAt(this.orbitControls.target);

    if (rawT >= 1) {
      this.cameraTween = null;
      this.orbitControls.update();
    }
  }

  private findCleanSpawnXZ(): [number, number] {
    const step = Math.max(1.5, this.gridSettings.spacing * 1.5);
    const candidates: Array<[number, number]> = [
      [0, 0],
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
      [step, step],
      [-step, step],
      [step, -step],
      [-step, -step],
      [step * 2, 0],
      [-step * 2, 0],
      [0, step * 2],
      [0, -step * 2],
    ];

    const existing = Array.from(this.meshMap.values()).filter((m) => m.visible);

    for (const [cx, cz] of candidates) {
      const groundY = this.gridSystem.sampleHeight(cx, cz);
      const occupied = existing.some(
        (m) =>
          Math.abs(m.position.x - cx) < 0.75 &&
          Math.abs(m.position.z - cz) < 0.75 &&
          Math.abs(m.position.y - (groundY + 0.5)) < 0.85
      );
      if (!occupied) {
        return [cx, cz];
      }
    }

    const idx = existing.length;
    const angle = idx * 0.9;
    const radius = 2 + Math.floor(idx / 6) * 1.5;
    return [
      Math.round(Math.cos(angle) * radius * 2) / 2,
      Math.round(Math.sin(angle) * radius * 2) / 2,
    ];
  }

  public spawnPrimitive(kind: PrimitiveKind, recordHistory = true): string {
    const nextNum = (this.counters[kind] ?? 0) + 1;
    this.counters[kind] = nextNum;

    const meta = PRIMITIVE_META[kind];
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const name = `${meta.label} ${nextNum}`;

    const [sx, sz] = this.findCleanSpawnXZ();
    const baseGeo = this.getOrCreateBaseGeometry(kind);
    baseGeo.computeBoundingBox();
    const minY = baseGeo.boundingBox?.min.y ?? -0.5;
    const groundY = this.gridSystem.sampleHeight(sx, sz);

    const data: SceneObjectData = {
      id,
      name,
      kind,
      position: { x: sx, y: round3(groundY - minY), z: sz },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: meta.defaultColor,
      roughness: meta.roughness,
      metalness: meta.metalness,
      opacity: 1,
      emissive: '#000000',
      emissiveIntensity: 0,
      flatShading: false,
      subdivision: { ...DEFAULT_SUBDIVISION_SETTINGS },
      visible: true,
    };

    const mesh = this.buildMeshFromData(data);
    this.objectGroup.add(mesh);
    this.meshMap.set(id, mesh);

    // If Surface Alignment is active on spawn, conform immediately to surface/terrain at (sx, sz)
    if (this.surfaceSettings.enabled) {
      const others = Array.from(this.meshMap.values());
      const hit = this.surfaceEngine.projectVerticalAtXZ(
        sx,
        sz,
        groundY + 5,
        mesh,
        others,
        this.gridSystem,
        this.gridSettings.style === 'terrain'
      );
      this.surfaceEngine.applySurfaceHit(
        mesh,
        hit,
        this.surfaceSettings,
        this.gridSystem,
        others,
        false,
        0
      );
    }

    this.updateSeamlessTouchFaces();

    if (this.transformMode === 'select') {
      this.transformMode = 'translate';
      this.transformControls.setMode('translate');
    }

    this.selectObject(id, false);

    if (recordHistory) {
      this.pushHistorySnapshot();
    }
    this.emitState();
    return id;
  }

  private buildMeshFromData(data: SceneObjectData): THREE.Mesh {
    const subdiv = data.subdivision ?? { ...DEFAULT_SUBDIVISION_SETTINGS };
    const baseGeo = this.getOrCreateBaseGeometry(data.kind);
    const { geometry, stats } = buildSubdividedGeometry(baseGeo, subdiv);

    const opacity = data.opacity ?? 1;
    const emissiveHex = data.emissive ?? '#000000';
    const emissiveIntensity = data.emissiveIntensity ?? 0;
    const flatShading = Boolean(data.flatShading);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      roughness: data.roughness,
      metalness: data.metalness,
      transparent: opacity < 0.995,
      opacity,
      depthWrite: opacity >= 0.98,
      emissive: new THREE.Color(emissiveHex),
      emissiveIntensity,
      flatShading,
    });

    const mesh = new THREE.Mesh(geometry, baseMaterial);
    mesh.name = data.name;
    mesh.castShadow = opacity > 0.35;
    mesh.receiveShadow = true;
    mesh.visible = data.visible;
    mesh.position.set(data.position.x, data.position.y, data.position.z);
    mesh.rotation.set(
      data.rotation.x * DEG2RAD,
      data.rotation.y * DEG2RAD,
      data.rotation.z * DEG2RAD
    );
    mesh.scale.set(data.scale.x, data.scale.y, data.scale.z);
    mesh.userData = {
      objectId: data.id,
      kind: data.kind,
      baseMaterial,
      userEmissiveHex: emissiveHex,
      userEmissiveIntensity: emissiveIntensity,
      subdivision: { ...subdiv },
      subdivStats: stats,
    };

    this.syncWireframeOverlay(mesh, subdiv.wireframe);
    return mesh;
  }

  private updateSelectionHighlight(): void {
    for (const [id, mesh] of this.meshMap.entries()) {
      const mat = this.getBaseMaterial(mesh);
      const userEmissive = (mesh.userData.userEmissiveHex as string) ?? '#000000';
      const userIntensity = (mesh.userData.userEmissiveIntensity as number) ?? 0;

      if (id === this.selectedId && this.transformMode === 'select' && userIntensity === 0) {
        mat.emissive.set('#221808');
        mat.emissiveIntensity = 1;
      } else {
        mat.emissive.set(userEmissive);
        mat.emissiveIntensity = userIntensity;
      }
    }
  }

  public selectObject(id: string | null, emit = true): void {
    if (id && !this.meshMap.has(id)) {
      id = null;
    }
    this.selectedId = id;
    this.snapVisualizer.clear();
    this.protractorVisualizer.hide();
    this.surfaceNormalVisualizer.hide();
    this.updateSelectionHighlight();

    if (id && this.transformMode !== 'select') {
      const mesh = this.meshMap.get(id);
      if (mesh && mesh.visible) {
        this.transformControls.attach(mesh);
      } else {
        this.transformControls.detach();
      }
    } else {
      this.transformControls.detach();
    }

    if (emit) {
      this.emitState();
    }
  }

  public setTransformMode(mode: TransformMode): void {
    this.transformMode = mode;
    this.snapVisualizer.clear();
    this.protractorVisualizer.hide();
    this.surfaceNormalVisualizer.hide();
    this.updateSelectionHighlight();

    if (mode === 'select') {
      this.transformControls.detach();
    } else {
      this.transformControls.setMode(mode);
      if (this.selectedId) {
        const mesh = this.meshMap.get(this.selectedId);
        if (mesh && mesh.visible) {
          this.transformControls.attach(mesh);
        }
      }
    }
    this.emitState();
  }

  public getTransformMode(): TransformMode {
    return this.transformMode;
  }

  public setTransformSpace(space: TransformSpace): void {
    this.transformSpace = space;
    this.transformControls.setSpace(space);
    this.emitState();
  }

  public getTransformSpace(): TransformSpace {
    return this.transformSpace;
  }

  public updateSnapSettings(patch: Partial<SnapSettings>): SnapSettings {
    this.snapSettings = {
      ...this.snapSettings,
      ...patch,
    };
    this.applyControlSnapConfig();
    return { ...this.snapSettings };
  }

  public getSnapSettings(): SnapSettings {
    return { ...this.snapSettings };
  }

  public updateSurfaceSettings(patch: Partial<SurfaceSettings>): SurfaceSettings {
    const wasEnabled = this.surfaceSettings.enabled;
    this.surfaceSettings = {
      ...this.surfaceSettings,
      ...patch,
    };

    // When toggling Surface ON while an object is selected near another 3D surface,
    // immediately adapt & seat it flush so the user sees instant precision!
    if (!wasEnabled && this.surfaceSettings.enabled && this.selectedId) {
      const selMesh = this.meshMap.get(this.selectedId);
      if (selMesh && selMesh.visible) {
        const halfDiag = this.getMeshHalfDiagonal(selMesh);
        const others = Array.from(this.meshMap.values());
        const nearHit = this.surfaceEngine.findClosestSurface3D(
          selMesh.position,
          selMesh.position,
          selMesh,
          others,
          this.gridSystem,
          this.gridSettings.style === 'terrain',
          Math.max(0.85, halfDiag * 1.35)
        );
        if (nearHit && !nearHit.isGround) {
          this.surfaceEngine.applySurfaceHit(
            selMesh,
            nearHit,
            this.surfaceSettings,
            this.gridSystem,
            others,
            true,
            0
          );
          this.updateSeamlessTouchFaces();
          this.pushHistorySnapshot();
          this.emitState();
        }
      }
    }

    return { ...this.surfaceSettings };
  }

  public getSurfaceSettings(): SurfaceSettings {
    return { ...this.surfaceSettings };
  }

  public setPaintInteraction(
    mode: PaintInteractionMode,
    brush?: Partial<PaintBrushPayload>
  ): void {
    this.paintMode = mode;
    if (brush) {
      this.activeBrush = { ...this.activeBrush, ...brush };
    }
    this.renderer.domElement.style.cursor =
      mode === 'eyedropper'
        ? 'crosshair'
        : mode === 'bucket'
        ? 'cell'
        : 'default';
  }

  public updatePaintBrush(brush: Partial<PaintBrushPayload>): void {
    this.activeBrush = { ...this.activeBrush, ...brush };
  }

  public updateGridSettings(patch: Partial<GridSettings>): GridSettings {
    this.gridSettings = this.gridSystem.updateSettings(patch);
    if (this.gridSettings.syncSnap && patch.spacing !== undefined) {
      this.snapSettings.gridStep = patch.spacing;
      this.applyControlSnapConfig();
    }
    return { ...this.gridSettings };
  }

  public getGridSettings(): GridSettings {
    return { ...this.gridSettings };
  }

  public updateObjectSubdivision(
    id: string,
    patch: Partial<ObjectSubdivisionSettings>,
    recordHistory = true
  ): SubdivisionStats | null {
    const mesh = this.meshMap.get(id);
    if (!mesh) return null;

    const currentSubdiv =
      (mesh.userData.subdivision as ObjectSubdivisionSettings | undefined) ?? {
        ...DEFAULT_SUBDIVISION_SETTINGS,
      };
    const nextSubdiv: ObjectSubdivisionSettings = {
      ...currentSubdiv,
      ...patch,
    };

    const geomChanged =
      nextSubdiv.level !== currentSubdiv.level ||
      nextSubdiv.mode !== currentSubdiv.mode ||
      Math.abs(nextSubdiv.crease - currentSubdiv.crease) > 0.001 ||
      nextSubdiv.lockBase !== currentSubdiv.lockBase;

    const kind = mesh.userData.kind as PrimitiveKind;
    const baseGeo = this.getOrCreateBaseGeometry(kind);

    if (geomChanged) {
      const { geometry, stats } = buildSubdividedGeometry(baseGeo, nextSubdiv);
      mesh.geometry.dispose();
      mesh.geometry = geometry;
      mesh.userData.subdivStats = stats;
    }

    mesh.userData.subdivision = nextSubdiv;
    this.syncWireframeOverlay(mesh, nextSubdiv.wireframe);
    this.updateSeamlessTouchFaces();

    if (recordHistory) {
      this.pushHistorySnapshot();
    }
    this.emitState();
    return (mesh.userData.subdivStats as SubdivisionStats) ?? null;
  }

  public rotateSelectedBy(axis: 'x' | 'y' | 'z', deltaDeg: number): boolean {
    if (!this.selectedId) return false;
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return false;

    const unitAxis =
      axis === 'x'
        ? new THREE.Vector3(1, 0, 0)
        : axis === 'y'
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);

    const q = new THREE.Quaternion().setFromAxisAngle(unitAxis, deltaDeg * DEG2RAD);
    if (this.transformSpace === 'local') {
      mesh.quaternion.multiply(q).normalize();
    } else {
      mesh.quaternion.premultiply(q).normalize();
    }

    mesh.rotation.set(
      (Math.round(mesh.rotation.x * RAD2DEG * 100) / 100) * DEG2RAD,
      (Math.round(mesh.rotation.y * RAD2DEG * 100) / 100) * DEG2RAD,
      (Math.round(mesh.rotation.z * RAD2DEG * 100) / 100) * DEG2RAD
    );

    this.updateSeamlessTouchFaces();
    this.pushHistorySnapshot();
    this.emitState();
    return true;
  }

  public resetSelectedRotation(): boolean {
    if (!this.selectedId) return false;
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return false;

    mesh.rotation.set(0, 0, 0);
    this.updateSeamlessTouchFaces();
    this.pushHistorySnapshot();
    this.emitState();
    return true;
  }

  public updateObjectTransform(
    id: string,
    patch: Partial<{ position: Vec3; rotation: Vec3; scale: Vec3 }>,
    recordHistory = true
  ): void {
    const mesh = this.meshMap.get(id);
    if (!mesh) return;

    if (patch.position) {
      mesh.position.set(patch.position.x, patch.position.y, patch.position.z);
    }
    if (patch.rotation) {
      mesh.rotation.set(
        patch.rotation.x * DEG2RAD,
        patch.rotation.y * DEG2RAD,
        patch.rotation.z * DEG2RAD
      );
    }
    if (patch.scale) {
      mesh.scale.set(
        Math.max(0.05, patch.scale.x),
        Math.max(0.05, patch.scale.y),
        Math.max(0.05, patch.scale.z)
      );
    }

    this.updateSeamlessTouchFaces();
    if (recordHistory) {
      this.pushHistorySnapshot();
    }
    this.emitState();
  }

  private computeWorldBounds(mesh: THREE.Mesh): THREE.Box3 {
    mesh.updateMatrixWorld(true);
    const geo = mesh.geometry;
    geo.computeBoundingBox();
    const bb = geo.boundingBox ?? new THREE.Box3();
    const out = new THREE.Box3();

    const corners = [
      new THREE.Vector3(bb.min.x, bb.min.y, bb.min.z),
      new THREE.Vector3(bb.max.x, bb.min.y, bb.min.z),
      new THREE.Vector3(bb.min.x, bb.min.y, bb.max.z),
      new THREE.Vector3(bb.max.x, bb.min.y, bb.max.z),
      new THREE.Vector3(bb.min.x, bb.max.y, bb.min.z),
      new THREE.Vector3(bb.max.x, bb.max.y, bb.min.z),
      new THREE.Vector3(bb.min.x, bb.max.y, bb.max.z),
      new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z),
    ];

    for (const c of corners) {
      c.applyMatrix4(mesh.matrixWorld);
      out.expandByPoint(c);
    }
    return out;
  }

  /**
   * Conforms selected object downward onto the highest 3D surface or terrain underneath it,
   * using exact vertex support-plane projection and the configured SurfaceSettings!
   */
  public dropSelectedToFloor(): string {
    if (!this.selectedId) return '';
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return '';

    const others = Array.from(this.meshMap.values());
    const hit = this.surfaceEngine.findBestConformTarget(
      mesh,
      others,
      this.gridSystem,
      this.gridSettings.style === 'terrain'
    );

    const applied = this.surfaceEngine.applySurfaceHit(
      mesh,
      hit,
      this.surfaceSettings,
      this.gridSystem,
      others,
      true,
      0
    );

    this.surfaceNormalVisualizer.hide();
    this.updateSeamlessTouchFaces();
    this.pushHistorySnapshot();
    this.emitState();
    return applied.label;
  }

  public updateObjectMaterial(
    id: string,
    patch: Partial<{
      name: string;
      color: string;
      roughness: number;
      metalness: number;
      opacity: number;
      emissive: string;
      emissiveIntensity: number;
      flatShading: boolean;
      visible: boolean;
    }>,
    recordHistory = true
  ): void {
    const mesh = this.meshMap.get(id);
    if (!mesh) return;
    const mat = this.getBaseMaterial(mesh);

    if (patch.name !== undefined) {
      mesh.name = patch.name;
    }
    if (patch.color !== undefined) {
      mat.color.set(patch.color);
    }
    if (patch.roughness !== undefined) {
      mat.roughness = patch.roughness;
    }
    if (patch.metalness !== undefined) {
      mat.metalness = patch.metalness;
    }
    if (patch.opacity !== undefined) {
      const op = Math.max(0.08, Math.min(1, patch.opacity));
      mat.opacity = op;
      mat.transparent = op < 0.995;
      mat.depthWrite = op >= 0.98;
      mesh.castShadow = op > 0.35;
      mat.needsUpdate = true;
    }
    if (patch.emissive !== undefined) {
      mesh.userData.userEmissiveHex = patch.emissive;
      mat.emissive.set(patch.emissive);
    }
    if (patch.emissiveIntensity !== undefined) {
      mesh.userData.userEmissiveIntensity = patch.emissiveIntensity;
      mat.emissiveIntensity = patch.emissiveIntensity;
    }
    if (patch.flatShading !== undefined) {
      mat.flatShading = patch.flatShading;
      mat.needsUpdate = true;
    }
    if (patch.visible !== undefined) {
      mesh.visible = patch.visible;
      if (!patch.visible && this.selectedId === id) {
        this.transformControls.detach();
      } else if (
        patch.visible &&
        this.selectedId === id &&
        this.transformMode !== 'select'
      ) {
        this.transformControls.attach(mesh);
      }
    }

    this.updateSeamlessTouchFaces();

    if (recordHistory) {
      this.pushHistorySnapshot();
    }
    this.emitState();
  }

  public duplicateSelected(): string | null {
    if (!this.selectedId) return null;
    const current = this.serializeObject(this.selectedId);
    if (!current) return null;

    this.counters[current.kind] = (this.counters[current.kind] ?? 0) + 1;
    const newId = `${current.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const copyData: SceneObjectData = {
      ...current,
      id: newId,
      name: `${current.name} (Salinan)`,
      position: {
        x: round3(current.position.x + current.scale.x),
        y: current.position.y,
        z: round3(current.position.z),
      },
      subdivision: { ...current.subdivision },
    };

    const mesh = this.buildMeshFromData(copyData);
    this.objectGroup.add(mesh);
    this.meshMap.set(newId, mesh);
    this.updateSeamlessTouchFaces();
    this.selectObject(newId, false);
    this.pushHistorySnapshot();
    this.emitState();
    return newId;
  }

  public deleteObject(id: string | null = this.selectedId): void {
    if (!id) return;
    const mesh = this.meshMap.get(id);
    if (!mesh) return;

    if (this.selectedId === id) {
      this.transformControls.detach();
      this.selectedId = null;
    }

    this.disposeMesh(mesh);
    this.objectGroup.remove(mesh);
    this.meshMap.delete(id);
    this.updateSeamlessTouchFaces();

    this.pushHistorySnapshot();
    this.emitState();
  }

  public clearScene(): void {
    this.transformControls.detach();
    this.snapVisualizer.clear();
    this.protractorVisualizer.hide();
    this.surfaceNormalVisualizer.hide();
    this.selectedId = null;

    for (const mesh of this.meshMap.values()) {
      this.disposeMesh(mesh);
      this.objectGroup.remove(mesh);
    }
    this.meshMap.clear();
    this.counters = {};

    this.pushHistorySnapshot();
    this.emitState();
  }

  public focusSelectedOrReset(): void {
    if (this.selectedId) {
      const mesh = this.meshMap.get(this.selectedId);
      if (mesh) {
        const target = mesh.position.clone();
        const maxScale = Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z, 1);
        const offset = new THREE.Vector3(3.4, 2.6, 3.8).multiplyScalar(
          Math.max(0.85, maxScale * 0.75)
        );
        this.animateCameraTo(target.clone().add(offset), target);
        return;
      }
    }
    this.setCameraPreset('perspective');
  }

  public setCameraPreset(preset: CameraPresetType): void {
    const target = this.selectedId
      ? (this.meshMap.get(this.selectedId)?.position.clone() ??
          new THREE.Vector3(0, this.gridSettings.elevationY + 0.5, 0))
      : new THREE.Vector3(0, this.gridSettings.elevationY + 0.5, 0);

    const dist = 7.2;
    let toPos = new THREE.Vector3(4.6, 3.6, 5.2);

    switch (preset) {
      case 'perspective':
        toPos = target.clone().add(new THREE.Vector3(4.6, 3.2, 5.2));
        break;
      case 'front':
        toPos = target.clone().add(new THREE.Vector3(0, 0.4, dist));
        break;
      case 'right':
        toPos = target.clone().add(new THREE.Vector3(dist, 0.4, 0));
        break;
      case 'top':
        toPos = target.clone().add(new THREE.Vector3(0, dist + 1.5, 0.01));
        break;
    }

    this.animateCameraTo(toPos, target);
  }

  private animateCameraTo(toPos: THREE.Vector3, toTarget: THREE.Vector3): void {
    this.cameraTween = {
      active: true,
      elapsed: 0,
      duration: 0.34,
      fromPos: this.camera.position.clone(),
      toPos,
      fromTarget: this.orbitControls.target.clone(),
      toTarget,
    };
  }

  public async exportScene(format: 'glb' | 'gltf'): Promise<{ blob: Blob; filename: string }> {
    const exportScene = new THREE.Scene();
    exportScene.name = 'PerabotScene';

    for (const mesh of this.meshMap.values()) {
      if (!mesh.visible) continue;
      const baseMat = this.getBaseMaterial(mesh).clone();
      const userEmissive = (mesh.userData.userEmissiveHex as string) ?? '#000000';
      const userIntensity = (mesh.userData.userEmissiveIntensity as number) ?? 0;
      baseMat.emissive.set(userEmissive);
      baseMat.emissiveIntensity = userIntensity;

      const cleanMesh = new THREE.Mesh(mesh.geometry.clone(), baseMat);
      cleanMesh.name = mesh.name;
      cleanMesh.position.copy(mesh.position);
      cleanMesh.quaternion.copy(mesh.quaternion);
      cleanMesh.scale.copy(mesh.scale);
      exportScene.add(cleanMesh);
    }

    const exporter = new GLTFExporter();
    const binary = format === 'glb';
    const result = await exporter.parseAsync(exportScene, {
      binary,
      trs: true,
      onlyVisible: true,
    });

    exportScene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    if (binary && result instanceof ArrayBuffer) {
      return {
        blob: new Blob([result], { type: 'model/gltf-binary' }),
        filename: `perabot-model-${timestamp}.glb`,
      };
    }

    const json = JSON.stringify(result, null, 2);
    return {
      blob: new Blob([json], { type: 'model/gltf+json' }),
      filename: `perabot-model-${timestamp}.gltf`,
    };
  }

  private serializeObject(id: string): SceneObjectData | null {
    const mesh = this.meshMap.get(id);
    if (!mesh) return null;
    const mat = this.getBaseMaterial(mesh);
    const subdiv =
      (mesh.userData.subdivision as ObjectSubdivisionSettings | undefined) ?? {
        ...DEFAULT_SUBDIVISION_SETTINGS,
      };
    const userEmissive = (mesh.userData.userEmissiveHex as string) ?? '#000000';
    const userIntensity = (mesh.userData.userEmissiveIntensity as number) ?? 0;

    return {
      id,
      name: mesh.name,
      kind: mesh.userData.kind as PrimitiveKind,
      position: {
        x: round3(mesh.position.x),
        y: round3(mesh.position.y),
        z: round3(mesh.position.z),
      },
      rotation: {
        x: round3(mesh.rotation.x * RAD2DEG),
        y: round3(mesh.rotation.y * RAD2DEG),
        z: round3(mesh.rotation.z * RAD2DEG),
      },
      scale: {
        x: round3(mesh.scale.x),
        y: round3(mesh.scale.y),
        z: round3(mesh.scale.z),
      },
      color: `#${mat.color.getHexString()}`,
      roughness: round3(mat.roughness),
      metalness: round3(mat.metalness),
      opacity: round3(mat.opacity),
      emissive: userEmissive,
      emissiveIntensity: round3(userIntensity),
      flatShading: Boolean(mat.flatShading),
      subdivision: { ...subdiv },
      visible: mesh.visible,
    };
  }

  private serializeAllObjects(): SceneObjectData[] {
    const list: SceneObjectData[] = [];
    for (const id of this.meshMap.keys()) {
      const item = this.serializeObject(id);
      if (item) list.push(item);
    }
    return list;
  }

  private getSelectedSubdivStats(): SubdivisionStats | null {
    if (!this.selectedId) return null;
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return null;
    if (mesh.userData.subdivStats) {
      return mesh.userData.subdivStats as SubdivisionStats;
    }
    const baseGeo = this.getOrCreateBaseGeometry(mesh.userData.kind as PrimitiveKind);
    return computeGeometryStats(baseGeo, mesh.geometry, false);
  }

  public pushHistoryFromUI(): void {
    this.pushHistorySnapshot();
    this.emitState();
  }

  private pushHistorySnapshot(): void {
    const snapshot: HistorySnapshot = {
      objects: this.serializeAllObjects(),
      selectedId: this.selectedId,
    };

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex += 1;
    }
  }

  public canUndo(): boolean {
    return this.historyIndex > 0;
  }

  public canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  public undo(): void {
    if (!this.canUndo()) return;
    this.historyIndex -= 1;
    this.restoreSnapshot(this.history[this.historyIndex]);
  }

  public redo(): void {
    if (!this.canRedo()) return;
    this.historyIndex += 1;
    this.restoreSnapshot(this.history[this.historyIndex]);
  }

  private restoreSnapshot(snapshot: HistorySnapshot): void {
    this.transformControls.detach();
    this.snapVisualizer.clear();
    this.protractorVisualizer.hide();
    this.surfaceNormalVisualizer.hide();

    for (const mesh of this.meshMap.values()) {
      this.disposeMesh(mesh);
      this.objectGroup.remove(mesh);
    }
    this.meshMap.clear();

    for (const item of snapshot.objects) {
      const cloned: SceneObjectData = {
        ...item,
        position: { ...item.position },
        rotation: { ...item.rotation },
        scale: { ...item.scale },
        subdivision: { ...(item.subdivision ?? DEFAULT_SUBDIVISION_SETTINGS) },
      };
      const mesh = this.buildMeshFromData(cloned);
      this.objectGroup.add(mesh);
      this.meshMap.set(cloned.id, mesh);
    }

    this.updateSeamlessTouchFaces();
    this.selectObject(snapshot.selectedId, false);
    this.emitState();
  }

  private emitDragFeedback(
    active: boolean,
    extra?: {
      deltaAngleDeg?: number;
      snapLabel?: string | null;
      forceSurfaceMode?: boolean;
    }
  ): void {
    const effectiveMode: TransformMode | 'surface' = extra?.forceSurfaceMode
      ? 'surface'
      : this.transformControls.getMode();

    if (!active || !this.selectedId) {
      this.callbacks.onDragFeedback({
        active: false,
        axis: null,
        mode: effectiveMode,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        deltaAngleDeg: 0,
        snapLabel: null,
      });
      return;
    }

    const obj = this.serializeObject(this.selectedId);
    if (!obj) return;

    this.callbacks.onDragFeedback({
      active: true,
      axis: extra?.forceSurfaceMode ? 'SURFACE' : this.transformControls.axis,
      mode: effectiveMode,
      position: obj.position,
      rotation: obj.rotation,
      scale: obj.scale,
      deltaAngleDeg: extra?.deltaAngleDeg,
      snapLabel: extra?.snapLabel ?? null,
    });
  }

  private emitState(): void {
    this.callbacks.onStateChange({
      objects: this.serializeAllObjects(),
      selectedId: this.selectedId,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      selectedSubdivStats: this.getSelectedSubdivStats(),
    });
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    const wire = mesh.getObjectByName('__subdivWireframe') as THREE.Mesh | undefined;
    if (wire) {
      mesh.remove(wire);
      (wire.material as THREE.Material).dispose();
    }
    mesh.geometry.dispose();
    const baseMat = mesh.userData.baseMaterial as THREE.Material | undefined;
    if (baseMat) {
      baseMat.dispose();
    }
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);

    this.transformControls.detach();
    this.transformControls.dispose();
    this.orbitControls.dispose();
    this.viewHelper.dispose();
    this.gridSystem.dispose();
    this.snapVisualizer.dispose();
    this.protractorVisualizer.dispose();
    this.surfaceNormalVisualizer.dispose();
    this.hiddenFaceMaterial.dispose();

    for (const mesh of this.meshMap.values()) {
      this.disposeMesh(mesh);
    }
    this.meshMap.clear();
    for (const geo of this.baseGeometryCache.values()) {
      geo.dispose();
    }
    this.baseGeometryCache.clear();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
