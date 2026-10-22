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
import {
  cloneImportedVisualGroup,
  getRegisteredImportedModel,
  LoadedImportedModelAsset,
} from './modelImporter';
import { SnappingEngine, SnapVisualizer } from './SnappingEngine';
import { SurfaceAlignEngine } from './SurfaceAlignEngine';
import { buildSubdividedGeometry, computeGeometryStats } from './SubdivisionEngine';
import { GridTerrainSystem } from './GridTerrainSystem';
import {
  ArchitecturalRole,
  CustomAssetPart,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_SNAP_SETTINGS,
  DEFAULT_SUBDIVISION_SETTINGS,
  DEFAULT_SURFACE_SETTINGS,
  DragFeedback,
  GraphicsQuality,
  GridSettings,
  isSubdivisionActive,
  LightingMood,
  normalizeSubdivisionSettings,
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
  new THREE.Vector3(0, -1, 0).set(0, 0, -1),
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

  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private themeBaseBgHex = '#151821';
  private currentLightingMood: LightingMood = 'morning';

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

  // Group rigid-transform state
  private editSinglePartMode = false;
  private activeGroupRelMatrices = new Map<string, THREE.Matrix4>();

  // Interior Peek ("Intip Ruang") state
  private interiorPeekEnabled = false;
  private ghostedMeshIds = new Set<string>();

  // First-Person Walkthrough ("Jalan Kaki") state
  private walkthroughEnabled = false;
  private walkYaw = 0;
  private walkPitch = 0;
  private walkJoystick = { x: 0, y: 0 }; // x = strafe (-1..1), y = forward (-1..1)
  private walkKeys = new Set<string>();
  private isWalkLooking = false;
  private walkLookPrev = { x: 0, y: 0 };
  private savedPreWalkCamera: {
    pos: THREE.Vector3;
    target: THREE.Vector3;
  } | null = null;

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
  private importedNameCounters: Record<string, number> = {};

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

  constructor(
    container: HTMLElement,
    callbacks: StudioEngineCallbacks,
    initialObjects?: SceneObjectData[]
  ) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.themeBaseBgHex);
    this.scene.fog = new THREE.Fog(this.themeBaseBgHex, 48, 140);

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.05, 300);
    this.camera.position.set(5.4, 4.1, 6.2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
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
    this.orbitControls.minDistance = 0.5;
    this.orbitControls.maxPolarAngle = Math.PI * 0.92;
    this.orbitControls.target.set(0, 0.6, 0);
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
      this.orbitControls.enabled = !isDragging && !this.walkthroughEnabled;
      if (isDragging) {
        this.wasGizmoDragging = true;
        if (this.selectedId) {
          const selMesh = this.meshMap.get(this.selectedId);
          if (selMesh) {
            this.captureGroupRelativeMatrices(selMesh);
            if (this.transformControls.getMode() === 'translate') {
              const halfDiag = this.getMeshHalfDiagonal(selMesh);
              const others = this.getNonSiblingMeshes(selMesh);
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
        }
      } else {
        this.activeGroupRelMatrices.clear();
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
    window.addEventListener('keydown', this.handleWalkKeyDown);
    window.addEventListener('keyup', this.handleWalkKeyUp);

    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);

    if (initialObjects && initialObjects.length > 0) {
      this.loadSceneObjects(initialObjects, false);
    }

    this.pushHistorySnapshot();
    this.emitState();

    this.animate();
  }

  /* =========================================================
     Group Sibling Rigid-Transform Helpers
     ========================================================= */
  private getGroupSiblings(leaderMesh: THREE.Mesh): THREE.Mesh[] {
    if (this.editSinglePartMode) return [];
    const gid = leaderMesh.userData.groupId as string | null | undefined;
    if (!gid) return [];
    const siblings: THREE.Mesh[] = [];
    for (const m of this.meshMap.values()) {
      if (m !== leaderMesh && m.userData.groupId === gid) {
        siblings.push(m);
      }
    }
    return siblings;
  }

  private getNonSiblingMeshes(leaderMesh: THREE.Mesh): THREE.Mesh[] {
    const gid = !this.editSinglePartMode
      ? (leaderMesh.userData.groupId as string | null | undefined)
      : null;
    const out: THREE.Mesh[] = [];
    for (const m of this.meshMap.values()) {
      if (m === leaderMesh) continue;
      if (gid && m.userData.groupId === gid) continue;
      if (this.ghostedMeshIds.has(m.userData.objectId as string)) continue;
      out.push(m);
    }
    return out;
  }

  private captureGroupRelativeMatrices(leaderMesh: THREE.Mesh): void {
    this.activeGroupRelMatrices.clear();
    const siblings = this.getGroupSiblings(leaderMesh);
    if (siblings.length === 0) return;

    leaderMesh.updateMatrixWorld(true);
    const invLeader = leaderMesh.matrixWorld.clone().invert();
    for (const sib of siblings) {
      sib.updateMatrixWorld(true);
      const rel = invLeader.clone().multiply(sib.matrixWorld);
      this.activeGroupRelMatrices.set(sib.userData.objectId as string, rel);
    }
  }

  private syncGroupSiblingsFromLeader(leaderMesh: THREE.Mesh): void {
    if (this.editSinglePartMode || this.activeGroupRelMatrices.size === 0) return;
    leaderMesh.updateMatrixWorld(true);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();

    for (const [sibId, relMat] of this.activeGroupRelMatrices.entries()) {
      const sib = this.meshMap.get(sibId);
      if (!sib) continue;
      const worldMat = leaderMesh.matrixWorld.clone().multiply(relMat);
      worldMat.decompose(pos, quat, scl);
      sib.position.copy(pos);
      sib.quaternion.copy(quat);
      sib.rotation.setFromQuaternion(quat);
      sib.scale.set(
        Math.max(0.02, scl.x),
        Math.max(0.02, scl.y),
        Math.max(0.02, scl.z)
      );
      sib.updateMatrixWorld(true);
    }
  }

  public setEditSinglePartMode(enabled: boolean): void {
    this.editSinglePartMode = enabled;
    this.updateSelectionHighlight();
    this.emitState();
  }

  public getEditSinglePartMode(): boolean {
    return this.editSinglePartMode;
  }

  public groupAllSceneObjects(groupName = 'Grup Rakitan'): string | null {
    const visibleMeshes = Array.from(this.meshMap.values()).filter((m) => m.visible);
    if (visibleMeshes.length < 2) return null;
    const newGid = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    for (const m of visibleMeshes) {
      m.userData.groupId = newGid;
      m.userData.groupName = groupName;
    }
    this.editSinglePartMode = false;
    this.updateSelectionHighlight();
    this.pushHistorySnapshot();
    this.emitState();
    return newGid;
  }

  public ungroupSelected(): boolean {
    if (!this.selectedId) return false;
    const sel = this.meshMap.get(this.selectedId);
    const gid = sel?.userData.groupId as string | null | undefined;
    if (!gid) return false;

    for (const m of this.meshMap.values()) {
      if (m.userData.groupId === gid) {
        m.userData.groupId = null;
        m.userData.groupName = undefined;
      }
    }
    this.editSinglePartMode = false;
    this.updateSelectionHighlight();
    this.pushHistorySnapshot();
    this.emitState();
    return true;
  }

  /* =========================================================
     Global Lighting Mood, Theme Background, Quality & Camera
     ========================================================= */
  public setThemeCanvasColor(hex: string): void {
    this.themeBaseBgHex = hex;
    this.applyAtmosphereColors();
  }

  public setLightingMood(mood: LightingMood): void {
    this.currentLightingMood = mood;
    this.applyAtmosphereColors();
  }

  public getLightingMood(): LightingMood {
    return this.currentLightingMood;
  }

  private applyAtmosphereColors(): void {
    if (!this.hemiLight || !this.keyLight || !this.fillLight) return;

    if (this.currentLightingMood === 'sunset') {
      const sunsetBg = new THREE.Color(this.themeBaseBgHex).lerp(
        new THREE.Color('#2d1b2e'),
        0.52
      );
      this.scene.background = sunsetBg;
      this.scene.fog = new THREE.Fog(sunsetBg.getHex(), 42, 130);
      this.hemiLight.color.set('#fed7aa');
      this.hemiLight.groundColor.set('#31202b');
      this.hemiLight.intensity = 0.88;
      this.keyLight.color.set('#fb923c');
      this.keyLight.intensity = 2.15;
      this.keyLight.position.set(15, 7.5, 11);
      this.fillLight.color.set('#c084fc');
      this.fillLight.intensity = 0.55;
      this.renderer.toneMappingExposure = 1.08;
    } else if (this.currentLightingMood === 'night') {
      const nightBg = new THREE.Color('#090d16');
      this.scene.background = nightBg;
      this.scene.fog = new THREE.Fog('#090d16', 36, 115);
      this.hemiLight.color.set('#3b82f6');
      this.hemiLight.groundColor.set('#0f172a');
      this.hemiLight.intensity = 0.42;
      this.keyLight.color.set('#93c5fd');
      this.keyLight.intensity = 0.65;
      this.keyLight.position.set(-10, 16, -8);
      this.fillLight.color.set('#1e3a8a');
      this.fillLight.intensity = 0.35;
      this.renderer.toneMappingExposure = 1.24;
    } else {
      // Morning / Standard bright studio
      const bg = new THREE.Color(this.themeBaseBgHex);
      this.scene.background = bg;
      this.scene.fog = new THREE.Fog(bg.getHex(), 48, 140);
      this.hemiLight.color.set('#e2eeff');
      this.hemiLight.groundColor.set('#282d38');
      this.hemiLight.intensity = 1.02;
      this.keyLight.color.set('#fff8ed');
      this.keyLight.intensity = 1.88;
      this.keyLight.position.set(11, 18, 13);
      this.fillLight.color.set('#9ec5ff');
      this.fillLight.intensity = 0.55;
      this.renderer.toneMappingExposure = 1.06;
    }
  }

  public setGraphicsQuality(quality: GraphicsQuality): void {
    const dpr = window.devicePixelRatio || 1;
    if (quality === 'light') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.keyLight.castShadow = false;
    } else if (quality === 'ultra') {
      this.renderer.setPixelRatio(Math.min(dpr, 2.5));
      this.renderer.shadowMap.enabled = true;
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(2048, 2048);
    } else {
      this.renderer.setPixelRatio(Math.min(dpr, 2));
      this.renderer.shadowMap.enabled = true;
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1536, 1536);
    }
    this.keyLight.shadow.map?.dispose();
    this.keyLight.shadow.map = null;
    this.handleResize();
  }

  public setOrbitSensitivity(speed: number): void {
    const clamped = Math.max(0.4, Math.min(2.2, speed));
    this.orbitControls.rotateSpeed = clamped;
    this.orbitControls.zoomSpeed = 0.8 + clamped * 0.25;
  }

  /* =========================================================
     Interior Peek ("Intip Ruang") & First-Person Walkthrough
     ========================================================= */
  public setInteriorPeek(enabled: boolean): void {
    this.interiorPeekEnabled = enabled;
    if (!enabled) {
      this.restoreAllPeekGhosts();
    } else {
      this.updateInteriorPeekVisibility();
    }
  }

  private restoreAllPeekGhosts(): void {
    for (const [id, mesh] of this.meshMap.entries()) {
      const userVis = mesh.userData.userVisible !== false;
      mesh.visible = userVis;
      if (this.ghostedMeshIds.has(id)) {
        const mat = this.getBaseMaterial(mesh);
        const origOp = (mesh.userData.userOpacity as number) ?? 1;
        mat.opacity = origOp;
        mat.transparent = origOp < 0.995;
        mat.depthWrite = origOp >= 0.98;
        mat.needsUpdate = true;
      }
    }
    this.ghostedMeshIds.clear();
    this.updateSeamlessTouchFaces();
  }

  private updateInteriorPeekVisibility(): void {
    if (!this.interiorPeekEnabled) return;

    const camPos = this.camera.position;
    const focusPt = this.orbitControls.target;
    const camToFocusDist = camPos.distanceTo(focusPt);
    const newlyGhosted = new Set<string>();

    for (const [id, mesh] of this.meshMap.entries()) {
      const userVis = mesh.userData.userVisible !== false;
      if (!userVis) {
        mesh.visible = false;
        continue;
      }

      const role = mesh.userData.archRole as ArchitecturalRole | undefined;
      if (role === 'roof') {
        mesh.visible = false;
        if (this.selectedId === id) {
          this.transformControls.detach();
        }
        continue;
      }

      mesh.visible = true;
      if (role === 'wall') {
        // Ghost wall if it sits between the camera and orbit target!
        const dCamToWall = camPos.distanceTo(mesh.position);
        const toWall = mesh.position.clone().sub(camPos).normalize();
        const toTarget = focusPt.clone().sub(camPos).normalize();
        const blocksView =
          dCamToWall < camToFocusDist * 0.94 && toWall.dot(toTarget) > 0.55;

        const mat = this.getBaseMaterial(mesh);
        const origOp = (mesh.userData.userOpacity as number) ?? 1;

        if (blocksView && this.selectedId !== id) {
          newlyGhosted.add(id);
          if (Math.abs(mat.opacity - 0.13) > 0.01) {
            mat.opacity = 0.13;
            mat.transparent = true;
            mat.depthWrite = false;
            mat.needsUpdate = true;
          }
        } else if (this.ghostedMeshIds.has(id)) {
          mat.opacity = origOp;
          mat.transparent = origOp < 0.995;
          mat.depthWrite = origOp >= 0.98;
          mat.needsUpdate = true;
        }
      }
    }

    this.ghostedMeshIds = newlyGhosted;
  }

  public setWalkthroughMode(enabled: boolean): void {
    if (this.walkthroughEnabled === enabled) return;
    this.walkthroughEnabled = enabled;
    this.walkJoystick = { x: 0, y: 0 };
    this.walkKeys.clear();

    if (enabled) {
      this.cameraTween = null;
      this.savedPreWalkCamera = {
        pos: this.camera.position.clone(),
        target: this.orbitControls.target.clone(),
      };
      this.transformControls.detach();
      this.orbitControls.enabled = false;

      // Start at comfortable human eye height (1.65m) slightly in front of the house/origin
      const startX = 0;
      const startZ = 3.8;
      const floorY = this.sampleWalkFloorHeight(startX, startZ, 1.8);
      this.camera.position.set(startX, floorY + 1.65, startZ);
      this.walkYaw = 0;
      this.walkPitch = -0.04;
      this.applyWalkCameraRotation();
    } else {
      this.isWalkLooking = false;
      if (this.savedPreWalkCamera) {
        this.camera.position.copy(this.savedPreWalkCamera.pos);
        this.orbitControls.target.copy(this.savedPreWalkCamera.target);
        this.camera.lookAt(this.orbitControls.target);
      }
      this.orbitControls.enabled = true;
      if (this.selectedId && this.transformMode !== 'select') {
        const m = this.meshMap.get(this.selectedId);
        if (m && m.visible) this.transformControls.attach(m);
      }
    }
  }

  public setWalkJoystick(x: number, y: number): void {
    this.walkJoystick = { x, y };
  }

  private handleWalkKeyDown = (e: KeyboardEvent): void => {
    if (!this.walkthroughEnabled) return;
    this.walkKeys.add(e.key.toLowerCase());
  };

  private handleWalkKeyUp = (e: KeyboardEvent): void => {
    if (!this.walkthroughEnabled) return;
    this.walkKeys.delete(e.key.toLowerCase());
  };

  private applyWalkCameraRotation(): void {
    const euler = new THREE.Euler(this.walkPitch, this.walkYaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  private sampleWalkFloorHeight(x: number, z: number, currentEyeY: number): number {
    const walkable = Array.from(this.meshMap.values()).filter((m) => {
      if (!m.visible) return false;
      const role = m.userData.archRole as ArchitecturalRole | undefined;
      return role === 'floor' || m.userData.kind === 'stair' || m.userData.kind === 'ramp' || m.userData.kind === 'cube' || m.userData.kind === 'thin-slab';
    });
    const ground = this.gridSystem.getGroundCollider();
    const targets: THREE.Object3D[] = [...walkable];
    if (ground) targets.push(ground);

    const ray = new THREE.Raycaster(
      new THREE.Vector3(x, currentEyeY + 0.55, z),
      new THREE.Vector3(0, -1, 0),
      0,
      20
    );
    const hits = ray.intersectObjects(targets, false);
    const valid = hits.find((h) => h.point.y <= currentEyeY - 0.55);
    if (valid) {
      return valid.point.y;
    }
    return this.gridSystem.sampleHeight(x, z);
  }

  private updateWalkthroughStep(delta: number): void {
    let moveForward = this.walkJoystick.y;
    let moveRight = this.walkJoystick.x;

    if (this.walkKeys.has('w') || this.walkKeys.has('arrowup')) moveForward += 1;
    if (this.walkKeys.has('s') || this.walkKeys.has('arrowdown')) moveForward -= 1;
    if (this.walkKeys.has('d') || this.walkKeys.has('arrowright')) moveRight += 1;
    if (this.walkKeys.has('a') || this.walkKeys.has('arrowleft')) moveRight -= 1;

    const mag = Math.hypot(moveForward, moveRight);
    if (mag > 0.01) {
      const normF = moveForward / Math.max(1, mag);
      const normR = moveRight / Math.max(1, mag);
      const speed = 3.6 * delta;

      const forwardVec = new THREE.Vector3(
        -Math.sin(this.walkYaw),
        0,
        -Math.cos(this.walkYaw)
      );
      const rightVec = new THREE.Vector3(
        Math.cos(this.walkYaw),
        0,
        -Math.sin(this.walkYaw)
      );

      this.camera.position.addScaledVector(forwardVec, normF * speed);
      this.camera.position.addScaledVector(rightVec, normR * speed);
    }

    const targetFloorY = this.sampleWalkFloorHeight(
      this.camera.position.x,
      this.camera.position.z,
      this.camera.position.y
    );
    const desiredEyeY = targetFloorY + 1.65;
    this.camera.position.y += (desiredEyeY - this.camera.position.y) * Math.min(1, delta * 10);
    this.applyWalkCameraRotation();
  }

  /* =========================================================
     Project Save/Load & Crisp Thumbnail Capture
     ========================================================= */
  public loadSceneObjects(objects: SceneObjectData[], resetHistory = true): void {
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
    this.importedNameCounters = {};

    for (const item of objects) {
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
    if (resetHistory) {
      this.history = [];
      this.historyIndex = -1;
      this.pushHistorySnapshot();
    }
    this.emitState();
  }

  public getSerializedObjects(): SceneObjectData[] {
    return this.serializeAllObjects();
  }

  public captureThumbnailDataUrl(): string {
    try {
      const helper = this.transformControls.getHelper();
      const prevHelperVis = helper.visible;
      helper.visible = false;
      this.snapVisualizer.group.visible = false;
      this.protractorVisualizer.group.visible = false;
      this.surfaceNormalVisualizer.group.visible = false;

      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);

      // Downscale smoothly onto an offscreen 420x260 canvas for crisp, lightweight IndexedDB thumbnails
      const srcCanvas = this.renderer.domElement;
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 420;
      thumbCanvas.height = 260;
      const ctx = thumbCanvas.getContext('2d');
      if (ctx) {
        const srcAspect = srcCanvas.width / Math.max(1, srcCanvas.height);
        const dstAspect = thumbCanvas.width / thumbCanvas.height;
        let sx = 0;
        let sy = 0;
        let sw = srcCanvas.width;
        let sh = srcCanvas.height;
        if (srcAspect > dstAspect) {
          sw = srcCanvas.height * dstAspect;
          sx = (srcCanvas.width - sw) * 0.5;
        } else {
          sh = srcCanvas.width / dstAspect;
          sy = (srcCanvas.height - sh) * 0.5;
        }
        ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }

      helper.visible = prevHelperVis;
      this.snapVisualizer.group.visible = true;
      this.protractorVisualizer.group.visible = true;
      this.surfaceNormalVisualizer.group.visible = true;

      return thumbCanvas.toDataURL('image/webp', 0.9);
    } catch {
      return '';
    }
  }

  /**
   * Extracts either the selected object/group (or all visible scene objects) normalized
   * around (0, minY=0, 0) for saving to "Koleksi Propertiku" (Custom Assets).
   */
  public extractPartsForCustomAsset(): {
    defaultName: string;
    parts: CustomAssetPart[];
  } | null {
    const allObjs = this.serializeAllObjects().filter((o) => o.visible);
    if (allObjs.length === 0) return null;

    let targetObjs: SceneObjectData[] = [];
    let defaultName = 'Properti Kustom';

    if (this.selectedId) {
      const sel = allObjs.find((o) => o.id === this.selectedId);
      if (sel) {
        if (sel.groupId && !this.editSinglePartMode) {
          targetObjs = allObjs.filter((o) => o.groupId === sel.groupId);
          defaultName = sel.groupName || sel.name;
        } else if (allObjs.length > 1) {
          // If user built a multi-part furniture piece on the modeling canvas without grouping yet,
          // include only selected if single, or if they want whole scene when nothing else:
          targetObjs = [sel];
          defaultName = sel.name;
        } else {
          targetObjs = [sel];
          defaultName = sel.name;
        }
      }
    } else {
      targetObjs = allObjs;
      defaultName = allObjs[0].groupName || allObjs[0].name;
    }

    if (targetObjs.length === 0) return null;

    // Compute world bounding box of targetObjs so we anchor center XZ = 0 and bottom Y = 0
    const totalBox = new THREE.Box3();
    for (const o of targetObjs) {
      const m = this.meshMap.get(o.id);
      if (m) {
        totalBox.union(this.computeWorldBounds(m));
      }
    }
    const center = new THREE.Vector3();
    totalBox.getCenter(center);
    const minY = Number.isFinite(totalBox.min.y) ? totalBox.min.y : 0;

    const parts: CustomAssetPart[] = targetObjs.map((o) => ({
      name: o.name,
      kind: o.kind,
      localPosition: {
        x: round3(o.position.x - center.x),
        y: round3(o.position.y - minY),
        z: round3(o.position.z - center.z),
      },
      rotation: { ...o.rotation },
      scale: { ...o.scale },
      color: o.color,
      roughness: o.roughness,
      metalness: o.metalness,
      opacity: o.opacity,
      emissive: o.emissive,
      emissiveIntensity: o.emissiveIntensity,
      flatShading: o.flatShading,
      subdivision: { ...o.subdivision },
      archRole: o.archRole ?? 'prop',
      modelAssetId: o.modelAssetId,
      modelFormat: o.modelFormat,
      modelThumbUrl: o.modelThumbUrl,
      useCustomMaterial: o.useCustomMaterial,
    }));

    return { defaultName, parts };
  }

  /* =========================================================
     Core Geometry, Gizmo, Snap & Smart Surface Engine
     ========================================================= */
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

  private syncSubdivisionGridLines(
    mesh: THREE.Mesh,
    gridLinesGeo: THREE.BufferGeometry | null,
    showGridLines: boolean
  ): void {
    const existing = mesh.getObjectByName('__subdivGridLines') as
      | THREE.LineSegments
      | undefined;
    if (existing) {
      mesh.remove(existing);
      existing.geometry.dispose();
      (existing.material as THREE.Material).dispose();
    }

    if (!showGridLines || !gridLinesGeo) {
      return;
    }

    const lineMat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.72,
      depthTest: true,
    });
    const lineSegs = new THREE.LineSegments(gridLinesGeo.clone(), lineMat);
    lineSegs.name = '__subdivGridLines';
    lineSegs.raycast = () => {};
    mesh.add(lineSegs);
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
        const others = this.getNonSiblingMeshes(mesh);
        const groundY = this.gridSystem.sampleHeight(rawPos.x, rawPos.z);

        let conformedToSurface = false;
        let finalLabel: string | null = null;

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

        this.syncGroupSiblingsFromLeader(mesh);
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
          mesh.rotation.setFromQuaternion(mesh.quaternion);

          const radiusScale =
            Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z, 0.9) * 0.88;
          this.protractorVisualizer.show(mesh.position, axis, controlledAngle, radiusScale);
        }

        this.syncGroupSiblingsFromLeader(mesh);
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
        this.syncGroupSiblingsFromLeader(mesh);
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

    for (const [id, mesh] of this.meshMap.entries()) {
      if (mesh.userData.modelAssetId) {
        mesh.material = this.hiddenFaceMaterial;
        continue;
      }
      const subdiv = mesh.userData.subdivision as ObjectSubdivisionSettings | undefined;
      const baseMat = this.getBaseMaterial(mesh);
      if (
        !mesh.visible ||
        this.ghostedMeshIds.has(id) ||
        mesh.userData.kind !== 'cube' ||
        isSubdivisionActive(subdiv) ||
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
    this.hemiLight = new THREE.HemisphereLight('#dce8ff', '#282d38', 1.02);
    this.hemiLight.position.set(0, 25, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#fff8ed', 1.88);
    this.keyLight.position.set(11, 18, 13);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1536;
    this.keyLight.shadow.mapSize.height = 1536;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 85;
    const d = 22;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0002;
    this.keyLight.shadow.normalBias = 0.045;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight('#9ec5ff', 0.55);
    this.fillLight.position.set(-12, 9, -10);
    this.scene.add(this.fillLight);
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

    if (this.walkthroughEnabled) {
      this.isWalkLooking = true;
      this.walkLookPrev = { x: event.clientX, y: event.clientY };
      this.renderer.domElement.setPointerCapture?.(event.pointerId);
      return;
    }

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
        const targetGroup = [selMesh, ...this.getGroupSiblings(selMesh)];
        const hitSel = this.raycaster.intersectObjects(targetGroup, false);
        if (hitSel.length > 0) {
          this.isSurfaceSliding = true;
          this.didMoveDuringSurfaceSlide = false;
          this.captureGroupRelativeMatrices(selMesh);
          this.orbitControls.enabled = false;
          this.renderer.domElement.setPointerCapture?.(event.pointerId);
        }
      }
    }
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (this.walkthroughEnabled) {
      if (!this.isWalkLooking) return;
      const dx = event.clientX - this.walkLookPrev.x;
      const dy = event.clientY - this.walkLookPrev.y;
      this.walkLookPrev = { x: event.clientX, y: event.clientY };
      this.walkYaw -= dx * 0.0042;
      this.walkPitch = Math.max(
        -Math.PI * 0.44,
        Math.min(Math.PI * 0.44, this.walkPitch - dy * 0.0038)
      );
      this.applyWalkCameraRotation();
      return;
    }

    if (!this.isSurfaceSliding || !this.selectedId) return;
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    if (!this.didMoveDuringSurfaceSlide && Math.hypot(dx, dy) < 4) return;
    this.didMoveDuringSurfaceSlide = true;

    const selMesh = this.meshMap.get(this.selectedId);
    if (!selMesh) return;

    this.setPointerNDCFromEvent(event);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    const others = this.getNonSiblingMeshes(selMesh);
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

    this.syncGroupSiblingsFromLeader(selMesh);
    this.surfaceNormalVisualizer.show(
      applied.contactPoint,
      applied.contactNormal
    );
    this.updateSeamlessTouchFaces();
    this.emitDragFeedback(true, { snapLabel: applied.label, forceSurfaceMode: true });
    this.emitState();
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (this.walkthroughEnabled) {
      if (this.isWalkLooking) {
        this.isWalkLooking = false;
        this.renderer.domElement.releasePointerCapture?.(event.pointerId);
      }
      return;
    }

    if (this.isSurfaceSliding) {
      const moved = this.didMoveDuringSurfaceSlide;
      this.isSurfaceSliding = false;
      this.didMoveDuringSurfaceSlide = false;
      this.activeGroupRelMatrices.clear();
      this.orbitControls.enabled = true;
      this.renderer.domElement.releasePointerCapture?.(event.pointerId);
      this.surfaceNormalVisualizer.hide();
      if (moved) {
        this.pushHistorySnapshot();
        this.emitDragFeedback(false);
        this.emitState();
        return;
      }
    }

    if (this.wasGizmoDragging) {
      this.wasGizmoDragging = false;
      return;
    }

    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    if (Math.hypot(dx, dy) > 6) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    if (localX > rect.width - 128 && localY > rect.height - 128) {
      if (this.viewHelper.handleClick(event)) {
        return;
      }
    }

    this.setPointerNDCFromEvent(event);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    const selectableMeshes = Array.from(this.meshMap.values()).filter(
      (m) => m.visible && !this.ghostedMeshIds.has(m.userData.objectId as string)
    );
    const hits = this.raycaster.intersectObjects(selectableMeshes, false);

    // 1. Paint / Eyedropper
    if (this.paintMode !== 'none' && hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const hitId = hitMesh.userData.objectId as string | undefined;
      if (hitId) {
        const mat = this.getBaseMaterial(hitMesh);
        if (this.paintMode === 'eyedropper') {
          const sample: PaintBrushPayload = {
            color: `#${mat.color.getHexString()}`,
            roughness: round3(mat.roughness),
            metalness: round3(mat.metalness),
            opacity: round3(mat.opacity),
            emissive: (hitMesh.userData.userEmissiveHex as string) ?? '#000000',
            emissiveIntensity: round3(
              (hitMesh.userData.userEmissiveIntensity as number) ?? 0
            ),
            flatShading: Boolean(mat.flatShading),
          };
          this.activeBrush = sample;
          this.paintMode = 'none';
          this.renderer.domElement.style.cursor = 'default';
          this.callbacks.onEyedropperSample?.(sample, hitMesh.name);
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

    // 2. Surface Click-to-Place
    if (
      this.surfaceSettings.enabled &&
      this.surfaceSettings.clickToPlace &&
      this.selectedId
    ) {
      const selMesh = this.meshMap.get(this.selectedId);
      if (selMesh) {
        this.captureGroupRelativeMatrices(selMesh);
        const others = this.getNonSiblingMeshes(selMesh);
        const hitSurf = this.surfaceEngine.raycastPointerSurface(
          this.raycaster,
          selMesh,
          others,
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
            others,
            true,
            gridStep
          );
          this.syncGroupSiblingsFromLeader(selMesh);
          this.activeGroupRelMatrices.clear();
          this.updateSeamlessTouchFaces();
          this.pushHistorySnapshot();
          this.emitState();
          return;
        }
        this.activeGroupRelMatrices.clear();
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

    if (this.walkthroughEnabled) {
      this.updateWalkthroughStep(delta);
    } else if (this.viewHelper.animating) {
      this.orbitControls.enabled = false;
      this.viewHelper.update(delta);
    } else if (this.cameraTween?.active) {
      this.updateCameraTween(delta);
    } else if (!this.transformControls.dragging && !this.isSurfaceSliding) {
      this.orbitControls.enabled = true;
      this.orbitControls.update();
    }

    if (this.interiorPeekEnabled) {
      this.updateInteriorPeekVisibility();
    }

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (!this.walkthroughEnabled) {
      this.viewHelper.render(this.renderer);
    }
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

  private findCleanSpawnXZ(footprintRadius = 0.75): [number, number] {
    const step = Math.max(1.5, this.gridSettings.spacing * 1.5, footprintRadius * 1.8);
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
          Math.abs(m.position.x - cx) < footprintRadius &&
          Math.abs(m.position.z - cz) < footprintRadius &&
          Math.abs(m.position.y - (groundY + 0.6)) < 1.1
      );
      if (!occupied) {
        return [cx, cz];
      }
    }

    const idx = existing.length;
    const angle = idx * 0.9;
    const radius = 2.5 + Math.floor(idx / 6) * 2.0;
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

    const [sx, sz] = this.findCleanSpawnXZ(0.75);
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

    if (this.surfaceSettings.enabled) {
      const others = this.getNonSiblingMeshes(mesh);
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
        true,
        0
      );
    }

    this.updateSeamlessTouchFaces();
    this.selectObject(id, false);

    if (recordHistory) {
      this.pushHistorySnapshot();
      this.emitState();
    }

    return id;
  }

  /**
   * Spawns a multi-part House Preset or user Custom Asset cleanly on the canvas.
   * Parts are linked by `groupId` when parts.length > 1 so they move, rotate, & snap as a single unit!
   */
  public spawnCompoundParts(
    parts: CustomAssetPart[],
    groupLabel: string,
    defaultRole: ArchitecturalRole = 'prop'
  ): string | null {
    if (parts.length === 0) return null;

    const [sx, sz] = this.findCleanSpawnXZ(1.4);
    const groundY = this.gridSystem.sampleHeight(sx, sz);
    const gid =
      parts.length > 1
        ? `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        : null;

    let leaderId: string | null = null;
    this.editSinglePartMode = false;

    parts.forEach((p, idx) => {
      const id = `part-${Date.now()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      if (idx === 0) leaderId = id;

      const data: SceneObjectData = {
        id,
        name: parts.length === 1 ? groupLabel : `${groupLabel} • ${p.name}`,
        kind: p.kind,
        position: {
          x: round3(sx + p.localPosition.x),
          y: round3(groundY + p.localPosition.y),
          z: round3(sz + p.localPosition.z),
        },
        rotation: { ...p.rotation },
        scale: { ...p.scale },
        color: p.color,
        roughness: p.roughness,
        metalness: p.metalness,
        opacity: p.opacity,
        emissive: p.emissive,
        emissiveIntensity: p.emissiveIntensity,
        flatShading: p.flatShading,
        subdivision: { ...(p.subdivision ?? DEFAULT_SUBDIVISION_SETTINGS) },
        visible: true,
        groupId: gid,
        groupName: gid ? groupLabel : undefined,
        archRole: p.archRole ?? defaultRole,
        modelAssetId: p.modelAssetId,
        modelFormat: p.modelFormat,
        modelThumbUrl: p.modelThumbUrl,
        useCustomMaterial: p.useCustomMaterial,
      };

      const mesh = this.buildMeshFromData(data);
      this.objectGroup.add(mesh);
      this.meshMap.set(id, mesh);
    });

    this.updateSeamlessTouchFaces();
    if (leaderId) {
      this.selectObject(leaderId, false);
    }
    this.pushHistorySnapshot();
    this.emitState();
    return leaderId;
  }

  public getDomainWorldSize(): number {
    return this.gridSettings.worldSize;
  }

  /**
   * Finds a clean, non-overlapping XZ placement strictly inside the active domain
   * anchored near the user's current camera target (so single or multiple imported
   * 3D files appear side-by-side right where the user is working inside the domain).
   */
  private findDomainBatchPlacementXZ(
    footprintW: number,
    footprintD: number,
    reservedBoxes: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>
  ): [number, number] {
    const halfDomain = Math.max(4, this.gridSettings.worldSize * 0.5 - 0.6);
    const halfW = Math.max(0.35, footprintW * 0.5);
    const halfD = Math.max(0.35, footprintD * 0.5);
    const margin = 0.28;

    const snapStep =
      this.snapSettings.enabled && this.snapSettings.grid
        ? Math.max(0.25, this.snapSettings.gridStep)
        : 0.5;
    const snapVal = (v: number) => Math.round(v / snapStep) * snapStep;
    const clampX = (x: number) =>
      Math.max(-halfDomain + halfW, Math.min(halfDomain - halfW, x));
    const clampZ = (z: number) =>
      Math.max(-halfDomain + halfD, Math.min(halfDomain - halfD, z));

    const anchorX = clampX(snapVal(this.orbitControls.target.x));
    const anchorZ = clampZ(snapVal(this.orbitControls.target.z));

    const stepX = Math.max(1.25, footprintW + 0.45);
    const stepZ = Math.max(1.25, footprintD + 0.45);

    const existingFootprints: Array<{
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      minY: number;
      maxY: number;
    }> = [];

    for (const m of this.meshMap.values()) {
      if (!m.visible) continue;
      // Ignore flat floor slabs (`archRole === 'floor'`) so imported furniture/models can stand ON floors!
      if (m.userData.archRole === 'floor') continue;
      const b = this.computeWorldBounds(m);
      if (!b.isEmpty() && b.max.y - b.min.y > 0.16) {
        existingFootprints.push({
          minX: b.min.x,
          maxX: b.max.x,
          minZ: b.min.z,
          maxZ: b.max.z,
          minY: b.min.y,
          maxY: b.max.y,
        });
      }
    }

    const isFree = (cx: number, cz: number): boolean => {
      const minX = cx - halfW - margin;
      const maxX = cx + halfW + margin;
      const minZ = cz - halfD - margin;
      const maxZ = cz + halfD + margin;

      for (const r of reservedBoxes) {
        if (maxX > r.minX && minX < r.maxX && maxZ > r.minZ && minZ < r.maxZ) {
          return false;
        }
      }
      const gY = this.gridSystem.sampleHeight(cx, cz);
      for (const e of existingFootprints) {
        if (e.maxY < gY + 0.12) continue;
        if (maxX > e.minX && minX < e.maxX && maxZ > e.minZ && minZ < e.maxZ) {
          return false;
        }
      }
      return true;
    };

    // Ordered outward grid spiral around (anchorX, anchorZ), clamped inside domain bounds
    for (let ring = 0; ring <= 10; ring++) {
      if (ring === 0) {
        if (isFree(anchorX, anchorZ)) return [anchorX, anchorZ];
        continue;
      }
      const ringCandidates: Array<[number, number]> = [];
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dz = -ring; dz <= ring; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          ringCandidates.push([
            clampX(snapVal(anchorX + dx * stepX)),
            clampZ(snapVal(anchorZ + dz * stepZ)),
          ]);
        }
      }
      // Prefer side-by-side along X first, then Z
      ringCandidates.sort(
        (a, b) =>
          Math.abs(a[1] - anchorZ) * 1.4 +
          Math.abs(a[0] - anchorX) -
          (Math.abs(b[1] - anchorZ) * 1.4 + Math.abs(b[0] - anchorX))
      );

      for (const [cx, cz] of ringCandidates) {
        if (isFree(cx, cz)) return [cx, cz];
      }
    }

    return [anchorX, anchorZ];
  }

  /**
   * Spawns one or multiple imported 3D models (same or different files) cleanly
   * side-by-side inside the active domain without overlapping.
   */
  public spawnImportedModels(assets: LoadedImportedModelAsset[]): string[] {
    if (assets.length === 0) return [];

    const reservedBoxes: Array<{
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
    }> = [];
    const spawnedIds: string[] = [];

    for (const asset of assets) {
      const nameKey = `imp_${asset.name}`;
      const count = (this.importedNameCounters[nameKey] ?? 0) + 1;
      this.importedNameCounters[nameKey] = count;

      const label = count > 1 ? `${asset.name} (${count})` : asset.name;
      const id = `mdl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const [sx, sz] = this.findDomainBatchPlacementXZ(
        asset.size.x,
        asset.size.z,
        reservedBoxes
      );
      reservedBoxes.push({
        minX: sx - asset.size.x * 0.5,
        maxX: sx + asset.size.x * 0.5,
        minZ: sz - asset.size.z * 0.5,
        maxZ: sz + asset.size.z * 0.5,
      });

      asset.colliderGeometry.computeBoundingBox();
      const minY = asset.colliderGeometry.boundingBox?.min.y ?? -asset.size.y * 0.5;
      const groundY = this.gridSystem.sampleHeight(sx, sz);

      // Also check if there is a floor slab directly at (sx, sz) so imported furniture sits ON house floors!
      let floorTopY = groundY;
      for (const m of this.meshMap.values()) {
        if (!m.visible || m.userData.archRole !== 'floor') continue;
        const b = this.computeWorldBounds(m);
        if (sx >= b.min.x && sx <= b.max.x && sz >= b.min.z && sz <= b.max.z) {
          floorTopY = Math.max(floorTopY, b.max.y);
        }
      }

      const data: SceneObjectData = {
        id,
        name: label,
        kind: 'cube',
        position: { x: round3(sx), y: round3(floorTopY - minY), z: round3(sz) },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: asset.dominantColorHex || '#cbd5e1',
        roughness: 0.5,
        metalness: 0.1,
        opacity: 1,
        emissive: '#000000',
        emissiveIntensity: 0,
        flatShading: false,
        subdivision: { ...DEFAULT_SUBDIVISION_SETTINGS },
        visible: true,
        archRole: 'prop',
        modelAssetId: asset.assetId,
        modelFormat: asset.format,
        modelThumbUrl: asset.thumbDataUrl,
        useCustomMaterial: false,
      };

      const mesh = this.buildMeshFromData(data);
      this.objectGroup.add(mesh);
      this.meshMap.set(id, mesh);
      spawnedIds.push(id);
    }

    const lastId = spawnedIds[spawnedIds.length - 1] ?? null;
    if (lastId) {
      this.selectObject(lastId, false);
    }

    // Gently frame the newly imported batch if the camera target was far away
    if (spawnedIds.length > 0) {
      const batchBox = new THREE.Box3();
      for (const sid of spawnedIds) {
        const m = this.meshMap.get(sid);
        if (m) batchBox.union(this.computeWorldBounds(m));
      }
      if (!batchBox.isEmpty()) {
        const batchCenter = new THREE.Vector3();
        const batchSize = new THREE.Vector3();
        batchBox.getCenter(batchCenter);
        batchBox.getSize(batchSize);
        if (batchCenter.distanceTo(this.orbitControls.target) > 4.5) {
          const span = Math.max(batchSize.x, batchSize.y, batchSize.z, 2);
          const curDir = this.camera.position
            .clone()
            .sub(this.orbitControls.target)
            .normalize();
          if (curDir.lengthSq() < 0.01) curDir.set(0.6, 0.5, 0.7).normalize();
          this.cameraTween = {
            active: true,
            elapsed: 0,
            duration: 0.36,
            fromPos: this.camera.position.clone(),
            toPos: batchCenter.clone().addScaledVector(curDir, Math.max(6.5, span * 2.3)),
            fromTarget: this.orbitControls.target.clone(),
            toTarget: batchCenter,
          };
        }
      }
    }

    this.updateSeamlessTouchFaces();
    this.pushHistorySnapshot();
    this.emitState();
    return spawnedIds;
  }

  private applyMaterialToImportedVisual(mesh: THREE.Mesh): void {
    const visualRoot = mesh.getObjectByName('__importedVisualRoot');
    if (!visualRoot) return;
    const useCustom = Boolean(mesh.userData.useCustomMaterial);
    const baseMat = this.getBaseMaterial(mesh);
    const op = (mesh.userData.userOpacity as number) ?? 1;
    const emissiveHex = (mesh.userData.userEmissiveHex as string) ?? '#000000';
    const emissiveIntensity = (mesh.userData.userEmissiveIntensity as number) ?? 0;

    visualRoot.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const m = node as THREE.Mesh;
      m.castShadow = op > 0.35;

      // Dispose any previously generated custom material before replacing
      const disposeCurrentCustom = () => {
        if (!m.userData.hasCustomMatApplied) return;
        if (Array.isArray(m.material)) {
          m.material.forEach((cm) => cm.dispose());
        } else if (m.material) {
          m.material.dispose();
        }
        m.userData.hasCustomMatApplied = false;
      };

      if (!useCustom) {
        disposeCurrentCustom();
        const orig = m.userData.origMaterials as
          | THREE.Material
          | THREE.Material[]
          | undefined;
        if (orig) {
          m.material = Array.isArray(orig)
            ? orig.map((om) => om.clone())
            : orig.clone();
        }
        return;
      }

      // TRUE COLOR REPLACEMENT:
      // Build a clean MeshStandardMaterial WITHOUT baked albedo textures (`map: null`)
      // and WITHOUT `vertexColors` so choosing White (#ffffff) on a yellow imported .glb cube
      // truly turns the cube pure White (#ffffff) instead of multiplying White * Yellow!
      const buildTrueColorMat = (origMat?: THREE.Material): THREE.MeshStandardMaterial => {
        const origStd = origMat as THREE.MeshStandardMaterial | undefined;
        const fresh = new THREE.MeshStandardMaterial({
          color: baseMat.color.clone(),
          map: null,
          vertexColors: false,
          roughness: baseMat.roughness,
          metalness: baseMat.metalness,
          transparent: op < 0.995,
          opacity: op,
          depthWrite: op >= 0.98,
          emissive: new THREE.Color(emissiveHex),
          emissiveIntensity,
          flatShading: baseMat.flatShading,
          side: origStd?.side ?? THREE.FrontSide,
          normalMap: origStd?.normalMap ?? null,
          bumpMap: origStd?.bumpMap ?? null,
          aoMap: origStd?.aoMap ?? null,
        });
        return fresh;
      };

      const orig = m.userData.origMaterials as
        | THREE.Material
        | THREE.Material[]
        | undefined;

      disposeCurrentCustom();
      if (Array.isArray(orig)) {
        m.material = orig.map((om) => buildTrueColorMat(om));
      } else {
        m.material = buildTrueColorMat(orig);
      }
      m.userData.hasCustomMatApplied = true;
    });
  }

  public resetImportedObjectMaterial(id: string): void {
    const mesh = this.meshMap.get(id);
    if (!mesh || !mesh.userData.modelAssetId) return;
    mesh.userData.useCustomMaterial = false;
    mesh.userData.userOpacity = 1;
    mesh.userData.userEmissiveHex = '#000000';
    mesh.userData.userEmissiveIntensity = 0;
    const entry = getRegisteredImportedModel(mesh.userData.modelAssetId as string);
    if (entry?.dominantColorHex) {
      this.getBaseMaterial(mesh).color.set(entry.dominantColorHex);
    }
    this.applyMaterialToImportedVisual(mesh);
    this.updateSelectionHighlight();
    this.pushHistorySnapshot();
    this.emitState();
  }

  private buildMeshFromData(data: SceneObjectData): THREE.Mesh {
    const importedEntry = data.modelAssetId
      ? getRegisteredImportedModel(data.modelAssetId)
      : undefined;

    const subdiv = normalizeSubdivisionSettings(data.subdivision);
    let geometry: THREE.BufferGeometry;
    let gridLinesGeometry: THREE.BufferGeometry | null = null;
    let stats: SubdivisionStats;

    if (importedEntry) {
      const built = buildSubdividedGeometry(
        importedEntry.colliderGeometry,
        subdiv
      );
      geometry = built.geometry;
      gridLinesGeometry = built.gridLinesGeometry;
      stats = built.stats;
    } else {
      const baseGeo = this.getOrCreateBaseGeometry(data.kind);
      const built = buildSubdividedGeometry(baseGeo, subdiv);
      geometry = built.geometry;
      gridLinesGeometry = built.gridLinesGeometry;
      stats = built.stats;
    }

    const opacity = data.opacity !== undefined ? data.opacity : 1;
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

    const mesh = new THREE.Mesh(
      geometry,
      importedEntry ? this.hiddenFaceMaterial : baseMaterial
    );
    mesh.name = data.name;
    mesh.castShadow = !importedEntry && opacity > 0.35;
    mesh.receiveShadow = !importedEntry;
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
      userOpacity: opacity,
      userVisible: data.visible,
      userEmissiveHex: emissiveHex,
      userEmissiveIntensity: emissiveIntensity,
      subdivision: { ...subdiv },
      subdivStats: stats,
      groupId: data.groupId ?? null,
      groupName: data.groupName,
      archRole: data.archRole,
      modelAssetId: data.modelAssetId,
      modelFormat: data.modelFormat ?? importedEntry?.format,
      modelThumbUrl: data.modelThumbUrl ?? importedEntry?.thumbDataUrl,
      useCustomMaterial: Boolean(data.useCustomMaterial),
    };

    if (importedEntry && data.modelAssetId) {
      const visualGroup = cloneImportedVisualGroup(data.modelAssetId);
      if (visualGroup) {
        mesh.add(visualGroup);
        if (data.useCustomMaterial) {
          this.applyMaterialToImportedVisual(mesh);
        }
      }
    }

    this.syncSubdivisionGridLines(
      mesh,
      gridLinesGeometry,
      subdiv.showGridLines && isSubdivisionActive(subdiv)
    );
    if (gridLinesGeometry) {
      gridLinesGeometry.dispose();
    }

    return mesh;
  }

  private updateSelectionHighlight(): void {
    const selMesh = this.selectedId ? this.meshMap.get(this.selectedId) : null;
    const selGroupId =
      selMesh && !this.editSinglePartMode
        ? (selMesh.userData.groupId as string | null | undefined)
        : null;

    for (const [id, mesh] of this.meshMap.entries()) {
      const mat = this.getBaseMaterial(mesh);
      const userEmissive = (mesh.userData.userEmissiveHex as string) ?? '#000000';
      const userIntensity = (mesh.userData.userEmissiveIntensity as number) ?? 0;

      const isHighlighted =
        id === this.selectedId ||
        (Boolean(selGroupId) && mesh.userData.groupId === selGroupId);

      if (isHighlighted && userIntensity === 0) {
        mat.emissive.set(id === this.selectedId ? '#241a08' : '#141e2e');
        mat.emissiveIntensity = 1;
      } else {
        mat.emissive.set(userEmissive);
        mat.emissiveIntensity = userIntensity;
      }

      const visualRoot = mesh.getObjectByName('__importedVisualRoot');
      if (visualRoot) {
        visualRoot.traverse((node) => {
          if (!(node as THREE.Mesh).isMesh) return;
          const m = node as THREE.Mesh;
          const applyGlow = (mMat: THREE.Material) => {
            const std = mMat as THREE.MeshStandardMaterial;
            if (!std.emissive) return;
            if (isHighlighted && userIntensity === 0) {
              std.emissive.set(id === this.selectedId ? '#241a08' : '#141e2e');
              std.emissiveIntensity = 1;
            } else {
              std.emissive.set(userEmissive);
              std.emissiveIntensity = userIntensity;
            }
          };
          if (Array.isArray(m.material)) m.material.forEach(applyGlow);
          else if (m.material) applyGlow(m.material);
        });
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

    if (id && this.transformMode !== 'select' && !this.walkthroughEnabled) {
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

    if (mode === 'select' || this.walkthroughEnabled) {
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

    if (!wasEnabled && this.surfaceSettings.enabled && this.selectedId) {
      const selMesh = this.meshMap.get(this.selectedId);
      if (selMesh && selMesh.visible) {
        this.captureGroupRelativeMatrices(selMesh);
        const halfDiag = this.getMeshHalfDiagonal(selMesh);
        const others = this.getNonSiblingMeshes(selMesh);
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
          this.syncGroupSiblingsFromLeader(selMesh);
          this.updateSeamlessTouchFaces();
          this.pushHistorySnapshot();
          this.emitState();
        }
        this.activeGroupRelMatrices.clear();
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

  public alignGridToSelectedBase(): GridSettings | null {
    if (!this.selectedId) return null;
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return null;
    const bounds = this.computeWorldBounds(mesh);
    if (bounds.isEmpty()) return null;
    const nextY = Math.round(bounds.min.y * 20) / 20;
    return this.updateGridSettings({ visible: true, elevationY: nextY });
  }

  public updateObjectSubdivision(
    id: string,
    patch: Partial<ObjectSubdivisionSettings>,
    recordHistory = true
  ): SubdivisionStats | null {
    const mesh = this.meshMap.get(id);
    if (!mesh) return null;

    const currentSubdiv = normalizeSubdivisionSettings(
      mesh.userData.subdivision as ObjectSubdivisionSettings | undefined
    );
    const nextSubdiv = normalizeSubdivisionSettings({
      ...currentSubdiv,
      ...patch,
    });

    const geomChanged =
      nextSubdiv.cutsX !== currentSubdiv.cutsX ||
      nextSubdiv.cutsY !== currentSubdiv.cutsY ||
      nextSubdiv.cutsZ !== currentSubdiv.cutsZ ||
      Math.abs(nextSubdiv.panelGroove - currentSubdiv.panelGroove) > 0.0005;

    const importedEntry = mesh.userData.modelAssetId
      ? getRegisteredImportedModel(mesh.userData.modelAssetId as string)
      : undefined;
    const baseGeo = importedEntry
      ? importedEntry.colliderGeometry
      : this.getOrCreateBaseGeometry(mesh.userData.kind as PrimitiveKind);

    if (geomChanged || nextSubdiv.showGridLines !== currentSubdiv.showGridLines) {
      const built = buildSubdividedGeometry(baseGeo, nextSubdiv);
      if (geomChanged) {
        mesh.geometry.dispose();
        mesh.geometry = built.geometry;
        mesh.userData.subdivStats = built.stats;
      } else {
        built.geometry.dispose();
      }
      this.syncSubdivisionGridLines(
        mesh,
        built.gridLinesGeometry,
        nextSubdiv.showGridLines && isSubdivisionActive(nextSubdiv)
      );
      if (built.gridLinesGeometry) {
        built.gridLinesGeometry.dispose();
      }
    }

    mesh.userData.subdivision = nextSubdiv;
    this.updateSeamlessTouchFaces();

    if (recordHistory) {
      this.pushHistorySnapshot();
    }
    this.emitState();
    return (mesh.userData.subdivStats as SubdivisionStats) ?? null;
  }

  /**
   * Splits the currently selected object physically into `cutsX * cutsY * cutsZ`
   * independent smaller 3D sub-blocks aligned with the object's exact orientation & bounds,
   * enabling per-block editing (delete individual squares to carve holes, extrude, paint)!
   */
  public splitSelectedIntoSubBlocks(): number {
    if (!this.selectedId) return 0;
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return 0;

    const curSub = normalizeSubdivisionSettings(
      mesh.userData.subdivision as ObjectSubdivisionSettings | undefined
    );
    const nx = curSub.cutsX > 1 || curSub.cutsY > 1 || curSub.cutsZ > 1 ? curSub.cutsX : 2;
    const ny = curSub.cutsX > 1 || curSub.cutsY > 1 || curSub.cutsZ > 1 ? curSub.cutsY : 2;
    const nz = curSub.cutsX > 1 || curSub.cutsY > 1 || curSub.cutsZ > 1 ? curSub.cutsZ : 2;

    if (nx * ny * nz <= 1) return 0;

    mesh.geometry.computeBoundingBox();
    const bb =
      mesh.geometry.boundingBox ??
      new THREE.Box3(
        new THREE.Vector3(-0.5, -0.5, -0.5),
        new THREE.Vector3(0.5, 0.5, 0.5)
      );

    const localSpanX = Math.max(0.02, bb.max.x - bb.min.x);
    const localSpanY = Math.max(0.02, bb.max.y - bb.min.y);
    const localSpanZ = Math.max(0.02, bb.max.z - bb.min.z);

    const cellLocalW = localSpanX / nx;
    const cellLocalH = localSpanY / ny;
    const cellLocalD = localSpanZ / nz;

    const worldScaleX = round3(Math.abs(mesh.scale.x) * cellLocalW);
    const worldScaleY = round3(Math.abs(mesh.scale.y) * cellLocalH);
    const worldScaleZ = round3(Math.abs(mesh.scale.z) * cellLocalD);

    const serializedParent = this.serializeObject(this.selectedId);
    if (!serializedParent) return 0;

    mesh.updateMatrixWorld(true);
    const rotDeg: Vec3 = {
      x: round3(mesh.rotation.x * RAD2DEG),
      y: round3(mesh.rotation.y * RAD2DEG),
      z: round3(mesh.rotation.z * RAD2DEG),
    };

    const gid = `grp_sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const groupTitle = serializedParent.name;

    // Remove parent object before spawning its split children
    this.transformControls.detach();
    this.disposeMesh(mesh);
    this.objectGroup.remove(mesh);
    this.meshMap.delete(serializedParent.id);
    this.ghostedMeshIds.delete(serializedParent.id);

    // If total grid >= 64 (e.g. >= 4x4x4), build outer shell blocks only to stay blazingly fast!
    const shellOnly = nx >= 4 && ny >= 4 && nz >= 4;
    const localPt = new THREE.Vector3();
    let createdCount = 0;
    let firstSubId: string | null = null;

    for (let iy = 0; iy < ny; iy++) {
      for (let iz = 0; iz < nz; iz++) {
        for (let ix = 0; ix < nx; ix++) {
          if (
            shellOnly &&
            ix > 0 &&
            ix < nx - 1 &&
            iy > 0 &&
            iy < ny - 1 &&
            iz > 0 &&
            iz < nz - 1
          ) {
            continue;
          }

          localPt.set(
            bb.min.x + (ix + 0.5) * cellLocalW,
            bb.min.y + (iy + 0.5) * cellLocalH,
            bb.min.z + (iz + 0.5) * cellLocalD
          );
          localPt.applyMatrix4(mesh.matrixWorld);

          createdCount++;
          const subId = `sub-${Date.now()}-${createdCount}-${Math.random()
            .toString(36)
            .slice(2, 6)}`;
          if (!firstSubId) firstSubId = subId;

          const subData: SceneObjectData = {
            id: subId,
            name: `${groupTitle} [${ix + 1},${iy + 1},${iz + 1}]`,
            kind: 'cube',
            position: {
              x: round3(localPt.x),
              y: round3(localPt.y),
              z: round3(localPt.z),
            },
            rotation: { ...rotDeg },
            scale: {
              x: Math.max(0.02, worldScaleX),
              y: Math.max(0.02, worldScaleY),
              z: Math.max(0.02, worldScaleZ),
            },
            color: serializedParent.color,
            roughness: serializedParent.roughness,
            metalness: serializedParent.metalness,
            opacity: serializedParent.opacity,
            emissive: serializedParent.emissive,
            emissiveIntensity: serializedParent.emissiveIntensity,
            flatShading: serializedParent.flatShading,
            subdivision: { ...DEFAULT_SUBDIVISION_SETTINGS },
            visible: true,
            groupId: gid,
            groupName: groupTitle,
            archRole: serializedParent.archRole,
          };

          const subMesh = this.buildMeshFromData(subData);
          this.objectGroup.add(subMesh);
          this.meshMap.set(subId, subMesh);
        }
      }
    }

    // Automatically enable single-part editing so user can immediately edit/delete/color individual sub-blocks!
    this.editSinglePartMode = true;
    this.updateSeamlessTouchFaces();
    if (firstSubId) {
      this.selectObject(firstSubId, false);
    }
    this.pushHistorySnapshot();
    this.emitState();
    return createdCount;
  }

  public rotateSelectedBy(axis: 'x' | 'y' | 'z', deltaDeg: number): boolean {
    if (!this.selectedId) return false;
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return false;

    this.captureGroupRelativeMatrices(mesh);

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

    this.syncGroupSiblingsFromLeader(mesh);
    this.activeGroupRelMatrices.clear();
    this.updateSeamlessTouchFaces();
    this.pushHistorySnapshot();
    this.emitState();
    return true;
  }

  public resetSelectedRotation(): boolean {
    if (!this.selectedId) return false;
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return false;

    this.captureGroupRelativeMatrices(mesh);
    mesh.rotation.set(0, 0, 0);
    mesh.quaternion.setFromEuler(mesh.rotation);
    this.syncGroupSiblingsFromLeader(mesh);
    this.activeGroupRelMatrices.clear();
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

    this.captureGroupRelativeMatrices(mesh);

    if (patch.position) {
      mesh.position.set(patch.position.x, patch.position.y, patch.position.z);
    }
    if (patch.rotation) {
      mesh.rotation.set(
        patch.rotation.x * DEG2RAD,
        patch.rotation.y * DEG2RAD,
        patch.rotation.z * DEG2RAD
      );
      mesh.quaternion.setFromEuler(mesh.rotation);
    }
    if (patch.scale) {
      mesh.scale.set(
        Math.max(0.05, patch.scale.x),
        Math.max(0.05, patch.scale.y),
        Math.max(0.05, patch.scale.z)
      );
    }

    this.syncGroupSiblingsFromLeader(mesh);
    this.activeGroupRelMatrices.clear();
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

  public dropSelectedToFloor(): string {
    if (!this.selectedId) return '';
    const mesh = this.meshMap.get(this.selectedId);
    if (!mesh) return '';

    this.captureGroupRelativeMatrices(mesh);
    const others = this.getNonSiblingMeshes(mesh);
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

    this.syncGroupSiblingsFromLeader(mesh);
    this.activeGroupRelMatrices.clear();
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
      mesh.userData.userOpacity = op;
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
      mesh.userData.userVisible = patch.visible;
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

    if (
      patch.color !== undefined ||
      patch.roughness !== undefined ||
      patch.metalness !== undefined ||
      patch.opacity !== undefined ||
      patch.emissive !== undefined ||
      patch.emissiveIntensity !== undefined ||
      patch.flatShading !== undefined
    ) {
      if (mesh.userData.modelAssetId) {
        mesh.userData.useCustomMaterial = true;
        this.applyMaterialToImportedVisual(mesh);
      }
    }

    this.updateSelectionHighlight();
    this.updateSeamlessTouchFaces();

    if (recordHistory) {
      this.pushHistorySnapshot();
    }
    this.emitState();
  }

  public duplicateSelected(): string | null {
    if (!this.selectedId) return null;
    const selMesh = this.meshMap.get(this.selectedId);
    if (!selMesh) return null;

    const gid = !this.editSinglePartMode
      ? (selMesh.userData.groupId as string | null | undefined)
      : null;

    if (gid) {
      // Duplicate the entire group cohesively!
      const groupMembers = Array.from(this.meshMap.keys())
        .map((id) => this.serializeObject(id))
        .filter((o): o is SceneObjectData => Boolean(o && o.groupId === gid));

      if (groupMembers.length > 0) {
        const groupBox = new THREE.Box3();
        for (const gm of groupMembers) {
          const m = this.meshMap.get(gm.id);
          if (m) groupBox.union(this.computeWorldBounds(m));
        }
        const spanX = Math.max(1.2, groupBox.max.x - groupBox.min.x + 0.35);
        const newGid = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        let newLeaderId: string | null = null;

        for (const gm of groupMembers) {
          const newId = `${gm.kind}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`;
          if (gm.id === this.selectedId || !newLeaderId) {
            newLeaderId = newId;
          }
          const copyData: SceneObjectData = {
            ...gm,
            id: newId,
            groupId: newGid,
            position: {
              x: round3(gm.position.x + spanX),
              y: gm.position.y,
              z: gm.position.z,
            },
            subdivision: { ...gm.subdivision },
          };
          const m = this.buildMeshFromData(copyData);
          this.objectGroup.add(m);
          this.meshMap.set(newId, m);
        }

        this.updateSeamlessTouchFaces();
        if (newLeaderId) this.selectObject(newLeaderId, false);
        this.pushHistorySnapshot();
        this.emitState();
        return newLeaderId;
      }
    }

    const current = this.serializeObject(this.selectedId);
    if (!current) return null;

    this.counters[current.kind] = (this.counters[current.kind] ?? 0) + 1;
    const newId = `${current.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const copyData: SceneObjectData = {
      ...current,
      id: newId,
      groupId: null,
      name: `${current.name} +`,
      position: {
        x: round3(current.position.x + Math.max(0.8, current.scale.x)),
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

    const gid = !this.editSinglePartMode
      ? (mesh.userData.groupId as string | null | undefined)
      : null;

    const idsToDelete = gid
      ? Array.from(this.meshMap.entries())
          .filter(([, m]) => m.userData.groupId === gid)
          .map(([k]) => k)
      : [id];

    if (this.selectedId && idsToDelete.includes(this.selectedId)) {
      this.transformControls.detach();
      this.selectedId = null;
    }

    for (const delId of idsToDelete) {
      const m = this.meshMap.get(delId);
      if (m) {
        this.disposeMesh(m);
        this.objectGroup.remove(m);
        this.meshMap.delete(delId);
        this.ghostedMeshIds.delete(delId);
      }
    }

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
    this.ghostedMeshIds.clear();

    for (const mesh of this.meshMap.values()) {
      this.disposeMesh(mesh);
      this.objectGroup.remove(mesh);
    }
    this.meshMap.clear();
    this.counters = {};
    this.importedNameCounters = {};

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
      const userVis = mesh.userData.userVisible !== false;
      if (!userVis) continue;

      const visualRoot = mesh.getObjectByName('__importedVisualRoot');
      if (visualRoot) {
        const exportedGroup = visualRoot.clone(true);
        exportedGroup.name = mesh.name;
        exportedGroup.position.copy(mesh.position);
        exportedGroup.quaternion.copy(mesh.quaternion);
        exportedGroup.scale.copy(mesh.scale);
        const userEmissive = (mesh.userData.userEmissiveHex as string) ?? '#000000';
        const userIntensity = (mesh.userData.userEmissiveIntensity as number) ?? 0;
        exportedGroup.traverse((n) => {
          if ((n as THREE.Mesh).isMesh) {
            const m = n as THREE.Mesh;
            m.geometry = m.geometry.clone();
            const cloneAndReset = (mat: THREE.Material) => {
              const c = mat.clone() as THREE.MeshStandardMaterial;
              if (c.emissive) {
                c.emissive.set(userEmissive);
                c.emissiveIntensity = userIntensity;
              }
              return c;
            };
            if (Array.isArray(m.material)) {
              m.material = m.material.map(cloneAndReset);
            } else if (m.material) {
              m.material = cloneAndReset(m.material);
            }
          }
        });
        exportScene.add(exportedGroup);
        continue;
      }

      const baseMat = this.getBaseMaterial(mesh).clone();
      const origOp = (mesh.userData.userOpacity as number) ?? 1;
      baseMat.opacity = origOp;
      baseMat.transparent = origOp < 0.995;
      baseMat.depthWrite = origOp >= 0.98;
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
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else if (m.material) {
          m.material.dispose();
        }
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
    const userOpacity = (mesh.userData.userOpacity as number) ?? round3(mat.opacity);
    const userVisible = mesh.userData.userVisible !== false;

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
      opacity: round3(userOpacity),
      emissive: userEmissive,
      emissiveIntensity: round3(userIntensity),
      flatShading: Boolean(mat.flatShading),
      subdivision: { ...subdiv },
      visible: userVisible,
      groupId: (mesh.userData.groupId as string | null | undefined) ?? null,
      groupName: mesh.userData.groupName as string | undefined,
      archRole: mesh.userData.archRole as ArchitecturalRole | undefined,
      modelAssetId: mesh.userData.modelAssetId as string | undefined,
      modelFormat: mesh.userData.modelFormat as string | undefined,
      modelThumbUrl: mesh.userData.modelThumbUrl as string | undefined,
      useCustomMaterial: mesh.userData.modelAssetId
        ? Boolean(mesh.userData.useCustomMaterial)
        : undefined,
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
    return computeGeometryStats(
      baseGeo,
      mesh.geometry,
      mesh.userData.subdivision as ObjectSubdivisionSettings | undefined,
      false
    );
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
    this.ghostedMeshIds.clear();

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

    this.refreshGridSelectionFootprint();

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

  private refreshGridSelectionFootprint(): void {
    if (!this.selectedId) {
      this.gridSystem.updateSelectionFootprint(null);
      return;
    }
    const selMesh = this.meshMap.get(this.selectedId);
    if (!selMesh || !selMesh.visible) {
      this.gridSystem.updateSelectionFootprint(null);
      return;
    }

    const gid = !this.editSinglePartMode
      ? (selMesh.userData.groupId as string | null | undefined)
      : null;

    if (gid) {
      const groupBox = new THREE.Box3();
      for (const m of this.meshMap.values()) {
        if (m.visible && m.userData.groupId === gid) {
          groupBox.union(this.computeWorldBounds(m));
        }
      }
      this.gridSystem.updateSelectionFootprint(groupBox);
    } else {
      this.gridSystem.updateSelectionFootprint(this.computeWorldBounds(selMesh));
    }
  }

  private emitState(): void {
    this.refreshGridSelectionFootprint();
    this.callbacks.onStateChange({
      objects: this.serializeAllObjects(),
      selectedId: this.selectedId,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      selectedSubdivStats: this.getSelectedSubdivStats(),
    });
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    const gridLines = mesh.getObjectByName('__subdivGridLines') as
      | THREE.LineSegments
      | undefined;
    if (gridLines) {
      mesh.remove(gridLines);
      gridLines.geometry.dispose();
      (gridLines.material as THREE.Material).dispose();
    }
    const visualRoot = mesh.getObjectByName('__importedVisualRoot');
    if (visualRoot) {
      visualRoot.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const m = node as THREE.Mesh;
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else if (m.material) {
            m.material.dispose();
          }
        }
      });
      mesh.remove(visualRoot);
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
    window.removeEventListener('keydown', this.handleWalkKeyDown);
    window.removeEventListener('keyup', this.handleWalkKeyUp);

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
