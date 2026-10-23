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
  PlacementValidationVisualizer,
  PlacementValidator,
} from './PlacementValidator';
import { ModularConstructionItem } from './modularConstruction';
import { ArchBuilderEngine } from './ArchBuilderEngine';
import {
  applyGeometryDeformModifiers,
  normalizeModifierSettings,
  syncMeshMirrorTwins,
} from './ModifierEngine';
import { applyProceduralPatternToMaterial } from './proceduralTextures';
import {
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
  ArchitecturalRole,
  AxisLockMode,
  BuildingFloorLayer,
  createEmptyArchHouseData,
  CustomAssetPart,
  DEFAULT_BUILDING_FLOORS,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_MODIFIER_SETTINGS,
  DEFAULT_SNAP_SETTINGS,
  DEFAULT_SUBDIVISION_SETTINGS,
  DEFAULT_SURFACE_SETTINGS,
  DEFAULT_TERRAIN_SCULPT_SETTINGS,
  DEFAULT_WALL_DRAW,
  DragFeedback,
  FloorViewMode,
  GraphicsQuality,
  GridSettings,
  isSubdivisionActive,
  LightingMood,
  normalizeSubdivisionSettings,
  ObjectModifierSettings,
  ObjectPointLightConfig,
  ObjectSubdivisionSettings,
  PaintInteractionMode,
  PlacementValidationStatus,
  PrimitiveKind,
  ProceduralPatternKind,
  RepeatArrayConfig,
  SceneObjectData,
  SelectionSubMode,
  SnapSettings,
  StudioMode,
  StudioSnapshotOptions,
  SubdivisionStats,
  SunEnvironmentSettings,
  SurfacePlacementRule,
  SurfaceSettings,
  TerrainSculptSettings,
  TransformMode,
  TransformSpace,
  Vec2XZ,
  Vec3,
  WallDrawDefaults,
} from '../types/studio';

interface HistorySnapshot {
  objects: SceneObjectData[];
  selectedId: string | null;
  selectedIds: string[];
  sculptedHeightsB64?: string | null;
  floors?: BuildingFloorLayer[];
  activeFloorId?: string;
  archData?: ArchHouseData;
  archSelection?: ArchSelection;
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

export interface BoxSelectRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StudioEngineCallbacks {
  onStateChange: (state: {
    objects: SceneObjectData[];
    selectedId: string | null;
    selectedIds: string[];
    canUndo: boolean;
    canRedo: boolean;
    selectedSubdivStats: SubdivisionStats | null;
    validationStatus: PlacementValidationStatus | null;
    adaptiveSpacing: number;
    floors: BuildingFloorLayer[];
    activeFloorId: string;
    floorViewMode: FloorViewMode;
    sculptedHeightsB64: string | null;
    archData: ArchHouseData;
    detectedRooms: ArchDetectedRoom[];
    archSelection: ArchSelection;
    archTool: ArchSubTool;
    isBlueprint2D: boolean;
    cameraLensFov: number;
    wallChainActive: boolean;
  }) => void;
  onDragFeedback: (feedback: DragFeedback) => void;
  onEyedropperSample?: (sample: PaintBrushPayload, objectName: string) => void;
  onPaintApplied?: (objectName: string) => void;
  onBoxSelectRect?: (rect: BoxSelectRect | null) => void;
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
  private selectedIds: string[] = [];
  private selectionSubMode: SelectionSubMode = 'single';
  private studioMode: StudioMode = 'modeling';
  private axisLock: AxisLockMode = 'free';
  private transformMode: TransformMode = 'translate';
  private transformSpace: TransformSpace = 'world';
  private snapSettings: SnapSettings = { ...DEFAULT_SNAP_SETTINGS };
  private surfaceSettings: SurfaceSettings = { ...DEFAULT_SURFACE_SETTINGS };
  private gridSettings: GridSettings = { ...DEFAULT_GRID_SETTINGS };
  private terrainSculpt: TerrainSculptSettings = { ...DEFAULT_TERRAIN_SCULPT_SETTINGS };

  // Placement Validation (#2)
  private placementValidationEnabled = false;
  private placementValidator = new PlacementValidator();
  private validationVisualizer = new PlacementValidationVisualizer();

  // Duplicate & Repeat Array Ghost Preview (#5)
  private repeatPreviewGroup = new THREE.Group();

  // Layer / Building Floor System (#12 - house mode)
  private floors: BuildingFloorLayer[] = DEFAULT_BUILDING_FLOORS.map((f) => ({ ...f }));
  private activeFloorId = 'floor_1';
  private floorViewMode: FloorViewMode = 'all';
  private floorGhostedIds = new Set<string>();

  // Architect Life × Blender Smart Architecture System (`house` mode only)
  private archEngine = new ArchBuilderEngine(createEmptyArchHouseData());
  private archTool: ArchSubTool = 'select';
  private wallDrawDefaults: WallDrawDefaults = { ...DEFAULT_WALL_DRAW };
  private activeOpeningKind: ArchOpeningKind = 'door-single';
  private wallChainStart: Vec2XZ | null = null;
  private lastHoverWallXZ: Vec2XZ | null = null;
  private activeArchDrag:
    | {
        kind: 'wall-node';
        floorId: string;
        curXZ: Vec2XZ;
        moved: boolean;
      }
    | {
        kind: 'opening-slide';
        openingId: string;
        moved: boolean;
      }
    | {
        kind: 'stair-move';
        stairId: string;
        offsetXZ: Vec2XZ;
        moved: boolean;
      }
    | {
        kind: 'roof-move';
        roofId: string;
        offsetXZ: Vec2XZ;
        moved: boolean;
      }
    | null = null;
  private bounceLight!: THREE.HemisphereLight;
  private measureStart: THREE.Vector3 | null = null;
  private measureEnd: THREE.Vector3 | null = null;
  private isBlueprint2D = false;
  private cameraLensFov = 46;
  private savedPre2DCamera: {
    pos: THREE.Vector3;
    target: THREE.Vector3;
    fov: number;
  } | null = null;
  private defaultRoomPrefix = 'Ruang';

  // Group & Multi-Selection rigid-transform state
  private editSinglePartMode = false;
  private activeGroupRelMatrices = new Map<string, THREE.Matrix4>();
  private dragStartLeaderPos = new THREE.Vector3();

  // Terrain Sculpting & Box Marquee pointer states
  private isSculptingStroke = false;
  private isBoxSelecting = false;
  private boxSelectStart = { x: 0, y: 0 };
  private lastAdaptiveSpacing = 1;

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
    this.repeatPreviewGroup.name = '__repeatPreviewGroup';
    this.scene.add(this.archEngine.structuralGroup);
    this.scene.add(this.archEngine.overlayGroup);
    this.scene.add(this.objectGroup);
    this.scene.add(this.repeatPreviewGroup);
    this.scene.add(this.snapVisualizer.group);
    this.scene.add(this.protractorVisualizer.group);
    this.scene.add(this.surfaceNormalVisualizer.group);
    this.scene.add(this.validationVisualizer.group);

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
      this.orbitControls.enabled =
        !isDragging && !this.walkthroughEnabled && !this.terrainSculpt.active;
      if (isDragging) {
        this.wasGizmoDragging = true;
        if (this.selectedId) {
          const selMesh = this.meshMap.get(this.selectedId);
          if (selMesh) {
            this.dragStartLeaderPos.copy(selMesh.position);
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

    requestAnimationFrame(() => {
      this.handleResize();
    });

    this.animate();
  }

  /* =========================================================
     Group & Multi-Selection Rigid-Transform Helpers (#6)
     ========================================================= */
  private getGroupSiblings(leaderMesh: THREE.Mesh): THREE.Mesh[] {
    const companionSet = new Set<THREE.Mesh>();

    // 1. Group siblings of the leader mesh (unless editing single part)
    if (!this.editSinglePartMode) {
      const gid = leaderMesh.userData.groupId as string | null | undefined;
      if (gid) {
        for (const m of this.meshMap.values()) {
          if (m !== leaderMesh && m.userData.groupId === gid) {
            companionSet.add(m);
          }
        }
      }
    }

    // 2. Any other objects in the active Multi-Selection (`this.selectedIds`) + their group siblings!
    if (this.selectedIds.length > 1) {
      for (const sid of this.selectedIds) {
        const sm = this.meshMap.get(sid);
        if (!sm || sm === leaderMesh) continue;
        companionSet.add(sm);
        if (!this.editSinglePartMode) {
          const sgid = sm.userData.groupId as string | null | undefined;
          if (sgid) {
            for (const m of this.meshMap.values()) {
              if (m !== leaderMesh && m.userData.groupId === sgid) {
                companionSet.add(m);
              }
            }
          }
        }
      }
    }

    return Array.from(companionSet);
  }

  private getNonSiblingMeshes(leaderMesh: THREE.Mesh): THREE.Mesh[] {
    const companions = new Set<THREE.Mesh>(this.getGroupSiblings(leaderMesh));
    companions.add(leaderMesh);
    const out: THREE.Mesh[] = [];
    for (const m of this.meshMap.values()) {
      if (companions.has(m)) continue;
      const oid = m.userData.objectId as string;
      if (this.ghostedMeshIds.has(oid) || this.floorGhostedIds.has(oid)) continue;
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
    if (this.activeGroupRelMatrices.size === 0) return;
    if (this.editSinglePartMode && this.selectedIds.length <= 1) return;
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

  /**
   * Groups ONLY the currently selected objects (plus their existing group members),
   * or falls back to all visible objects if <2 selected and explicitly requested via groupAllSceneObjects.
   */
  public groupSelectedObjects(groupName = 'Grup Pilihan'): string | null {
    const targetMeshes = new Set<THREE.Mesh>();
    for (const sid of this.selectedIds) {
      const m = this.meshMap.get(sid);
      if (!m || !m.visible) continue;
      targetMeshes.add(m);
      const gid = m.userData.groupId as string | null | undefined;
      if (gid) {
        for (const gm of this.meshMap.values()) {
          if (gm.userData.groupId === gid) targetMeshes.add(gm);
        }
      }
    }
    if (targetMeshes.size < 2) return null;

    const newGid = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    for (const m of targetMeshes) {
      m.userData.groupId = newGid;
      m.userData.groupName = groupName;
    }
    this.editSinglePartMode = false;
    this.updateSelectionHighlight();
    this.pushHistorySnapshot();
    this.emitState();
    return newGid;
  }

  public groupAllSceneObjects(groupName = 'Grup Rakitan'): string | null {
    if (this.selectedIds.length >= 2) {
      return this.groupSelectedObjects(groupName);
    }
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
    const gidsToClear = new Set<string>();
    for (const sid of this.selectedIds) {
      const m = this.meshMap.get(sid);
      const gid = m?.userData.groupId as string | null | undefined;
      if (gid) gidsToClear.add(gid);
    }
    if (gidsToClear.size === 0) return false;

    for (const m of this.meshMap.values()) {
      const gid = m.userData.groupId as string | null | undefined;
      if (gid && gidsToClear.has(gid)) {
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
     Studio Mode, Selection Sub-Modes (#6), Axis Lock (#9) & Validation (#2)
     ========================================================= */
  public setStudioMode(mode: StudioMode): void {
    this.studioMode = mode;
    if (mode !== 'house') {
      // Ensure house-exclusive modes (Terrain Sculpt, Arch Tools, 2D Blueprint, Cutaway Floors) pause in Modeling mode
      if (this.terrainSculpt.active) {
        this.terrainSculpt.active = false;
        this.gridSystem.updateSculptCursor(null);
        this.renderer.domElement.style.cursor = 'default';
      }
      if (this.isBlueprint2D) {
        this.setBlueprint2DView(false);
      }
      this.archTool = 'select';
      this.wallChainStart = null;
      this.archEngine.clearPreview();
      this.archEngine.structuralGroup.visible = false;
      this.archEngine.overlayGroup.visible = false;
      this.applyFloorVisibilityAndGhosting();
    } else {
      this.archEngine.structuralGroup.visible = true;
      this.archEngine.overlayGroup.visible = true;
      this.applyFloorVisibilityAndGhosting();
    }
    this.applyAtmosphereColors();
    this.emitState();
  }

  public getStudioMode(): StudioMode {
    return this.studioMode;
  }

  public setSelectionSubMode(mode: SelectionSubMode): void {
    this.selectionSubMode = mode;
    if (mode !== 'box' && this.isBoxSelecting) {
      this.isBoxSelecting = false;
      this.callbacks.onBoxSelectRect?.(null);
    }
  }

  public getSelectionSubMode(): SelectionSubMode {
    return this.selectionSubMode;
  }

  public getSelectedIds(): string[] {
    return [...this.selectedIds];
  }

  public selectAllObjects(): number {
    const ids: string[] = [];
    for (const [id, mesh] of this.meshMap.entries()) {
      if (
        mesh.visible &&
        !this.ghostedMeshIds.has(id) &&
        !this.floorGhostedIds.has(id) &&
        !this.isMeshFloorLocked(mesh)
      ) {
        ids.push(id);
      }
    }
    this.selectedIds = ids;
    this.selectedId = ids.length > 0 ? ids[ids.length - 1] : null;
    this.reattachTransformAfterSelectionChange();
    this.emitState();
    return ids.length;
  }

  public setAxisLock(lock: AxisLockMode): void {
    this.axisLock = lock;
    this.applyAxisLockToGizmo();
    this.emitState();
  }

  public getAxisLock(): AxisLockMode {
    return this.axisLock;
  }

  private applyAxisLockToGizmo(): void {
    if (this.axisLock === 'free') {
      this.transformControls.showX = true;
      this.transformControls.showY = true;
      this.transformControls.showZ = true;
    } else if (this.axisLock === 'x') {
      this.transformControls.showX = true;
      this.transformControls.showY = false;
      this.transformControls.showZ = false;
    } else if (this.axisLock === 'y') {
      this.transformControls.showX = false;
      this.transformControls.showY = true;
      this.transformControls.showZ = false;
    } else if (this.axisLock === 'z') {
      this.transformControls.showX = false;
      this.transformControls.showY = false;
      this.transformControls.showZ = true;
    } else if (this.axisLock === 'xz') {
      this.transformControls.showX = true;
      this.transformControls.showY = false;
      this.transformControls.showZ = true;
    }
  }

  private clampPositionByAxisLock(pos: THREE.Vector3): void {
    if (this.axisLock === 'free') return;
    if (this.axisLock === 'x') {
      pos.y = this.dragStartLeaderPos.y;
      pos.z = this.dragStartLeaderPos.z;
    } else if (this.axisLock === 'y') {
      pos.x = this.dragStartLeaderPos.x;
      pos.z = this.dragStartLeaderPos.z;
    } else if (this.axisLock === 'z') {
      pos.x = this.dragStartLeaderPos.x;
      pos.y = this.dragStartLeaderPos.y;
    } else if (this.axisLock === 'xz') {
      pos.y = this.dragStartLeaderPos.y;
    }
  }

  public setPlacementValidationEnabled(enabled: boolean): void {
    this.placementValidationEnabled = enabled;
    if (!enabled) {
      this.validationVisualizer.clear();
    }
    this.emitState();
  }

  public getPlacementValidationEnabled(): boolean {
    return this.placementValidationEnabled;
  }

  public updateObjectSurfaceRule(
    id: string,
    rule: SurfacePlacementRule,
    recordHistory = true
  ): void {
    const mesh = this.meshMap.get(id);
    if (!mesh) return;
    mesh.userData.surfaceRule = rule;
    if (recordHistory) this.pushHistorySnapshot();
    this.emitState();
  }

  /* =========================================================
     #3 Terrain Sculpting API (`house` mode)
     ========================================================= */
  public updateTerrainSculptSettings(
    patch: Partial<TerrainSculptSettings>
  ): TerrainSculptSettings {
    this.terrainSculpt = { ...this.terrainSculpt, ...patch };
    if (this.terrainSculpt.active) {
      this.transformControls.detach();
      if (!this.gridSettings.visible || this.gridSettings.style !== 'terrain') {
        this.gridSettings = this.gridSystem.updateSettings({
          visible: true,
          style: 'terrain',
        });
      }
      this.renderer.domElement.style.cursor = 'crosshair';
    } else {
      this.gridSystem.updateSculptCursor(null);
      this.renderer.domElement.style.cursor = 'default';
      this.reattachTransformAfterSelectionChange();
    }
    this.emitState();
    return { ...this.terrainSculpt };
  }

  public getTerrainSculptSettings(): TerrainSculptSettings {
    return { ...this.terrainSculpt };
  }

  public levelTerrainPlotPad(): void {
    this.gridSettings = this.gridSystem.levelPlotPad();
    this.pushHistorySnapshot();
    this.emitState();
  }

  public resetSculptedTerrain(): void {
    this.gridSettings = this.gridSystem.resetSculptedTerrain();
    this.pushHistorySnapshot();
    this.emitState();
  }

  public exportSculptedHeightsBase64(): string | null {
    return this.gridSystem.exportSculptedHeightsBase64();
  }

  public importSculptedHeightsBase64(b64: string | null | undefined): void {
    this.gridSystem.importSculptedHeightsBase64(b64);
    this.emitState();
  }

  /* =========================================================
     #12 Building Floor / Story Layer System (`house` mode)
     ========================================================= */
  private isMeshFloorLocked(mesh: THREE.Mesh): boolean {
    if (this.studioMode !== 'house') return false;
    const fid = mesh.userData.floorId as string | undefined;
    if (!fid) return false;
    const fl = this.floors.find((f) => f.id === fid);
    return Boolean(fl?.locked);
  }

  public getFloorSystemState(): {
    floors: BuildingFloorLayer[];
    activeFloorId: string;
    floorViewMode: FloorViewMode;
  } {
    return {
      floors: this.floors.map((f) => ({ ...f })),
      activeFloorId: this.activeFloorId,
      floorViewMode: this.floorViewMode,
    };
  }

  public setFloorSystemState(
    floors?: BuildingFloorLayer[],
    activeFloorId?: string,
    floorViewMode?: FloorViewMode
  ): void {
    if (floors && floors.length > 0) {
      this.floors = floors.map((f) => ({ ...f }));
    } else {
      this.floors = DEFAULT_BUILDING_FLOORS.map((f) => ({ ...f }));
    }
    this.activeFloorId =
      activeFloorId && this.floors.some((f) => f.id === activeFloorId)
        ? activeFloorId
        : this.floors[0].id;
    this.floorViewMode = floorViewMode ?? 'all';
    this.applyFloorVisibilityAndGhosting();
    this.emitState();
  }

  public setActiveFloor(floorId: string, syncWorkplane = true): void {
    const target = this.floors.find((f) => f.id === floorId);
    if (!target) return;
    this.activeFloorId = target.id;
    if (syncWorkplane && this.studioMode === 'house') {
      this.gridSettings = this.gridSystem.updateSettings({
        elevationY: target.elevation,
      });
    }
    this.applyFloorVisibilityAndGhosting();
    this.emitState();
  }

  public addBuildingFloor(labelPrefix = 'Lantai'): BuildingFloorLayer {
    const sorted = [...this.floors].sort((a, b) => a.elevation - b.elevation);
    const top = sorted[sorted.length - 1];
    const nextElevation = top ? round3(top.elevation + top.height) : 0;
    const nextNum = this.floors.length + 1;
    const newFloor: BuildingFloorLayer = {
      id: `floor_${Date.now().toString(36)}`,
      name: `${labelPrefix} ${nextNum}`,
      elevation: nextElevation,
      height: 3.0,
      visible: true,
      locked: false,
    };
    this.floors.push(newFloor);
    this.setActiveFloor(newFloor.id, true);
    this.pushHistorySnapshot();
    return { ...newFloor };
  }

  public removeBuildingFloor(floorId: string): boolean {
    if (this.floors.length <= 1) return false;
    const idx = this.floors.findIndex((f) => f.id === floorId);
    if (idx === -1) return false;
    this.floors.splice(idx, 1);
    const fallbackId = this.floors[Math.max(0, idx - 1)].id;
    for (const m of this.meshMap.values()) {
      if (m.userData.floorId === floorId) {
        m.userData.floorId = fallbackId;
      }
    }
    if (this.activeFloorId === floorId) {
      this.activeFloorId = fallbackId;
    }
    this.applyFloorVisibilityAndGhosting();
    this.pushHistorySnapshot();
    this.emitState();
    return true;
  }

  public updateBuildingFloor(
    floorId: string,
    patch: Partial<BuildingFloorLayer>
  ): void {
    const fl = this.floors.find((f) => f.id === floorId);
    if (!fl) return;
    Object.assign(fl, patch);
    if (fl.id === this.activeFloorId && patch.elevation !== undefined && this.studioMode === 'house') {
      this.gridSettings = this.gridSystem.updateSettings({
        elevationY: fl.elevation,
      });
    }
    this.applyFloorVisibilityAndGhosting();
    this.emitState();
  }

  public setFloorViewMode(mode: FloorViewMode): void {
    this.floorViewMode = mode;
    this.applyFloorVisibilityAndGhosting();
    this.emitState();
  }

  public assignObjectToFloor(
    objectId: string,
    floorId: string,
    moveToElevation = false
  ): void {
    const mesh = this.meshMap.get(objectId);
    const fl = this.floors.find((f) => f.id === floorId);
    if (!mesh || !fl) return;
    mesh.userData.floorId = fl.id;

    if (moveToElevation) {
      this.captureGroupRelativeMatrices(mesh);
      const bounds = this.computeWorldBounds(mesh);
      const deltaY = fl.elevation - bounds.min.y;
      mesh.position.y = round3(mesh.position.y + deltaY);
      this.syncGroupSiblingsFromLeader(mesh);
      this.activeGroupRelMatrices.clear();
      for (const sib of this.getGroupSiblings(mesh)) {
        sib.userData.floorId = fl.id;
      }
    }
    this.applyFloorVisibilityAndGhosting();
    this.pushHistorySnapshot();
    this.emitState();
  }

  private resolveAutoFloorIdForY(minY: number): string | undefined {
    if (this.studioMode !== 'house' || this.floors.length === 0) return undefined;
    const activeFl = this.floors.find((f) => f.id === this.activeFloorId);
    if (
      activeFl &&
      minY >= activeFl.elevation - 0.35 &&
      minY < activeFl.elevation + activeFl.height - 0.1
    ) {
      return activeFl.id;
    }
    let best = this.floors[0];
    let bestDist = Infinity;
    for (const fl of this.floors) {
      const d = Math.abs(minY - fl.elevation);
      if (d < bestDist) {
        bestDist = d;
        best = fl;
      }
    }
    return best.id;
  }

  private applyFloorVisibilityAndGhosting(): void {
    // Restore previous floor ghosts first
    for (const id of this.floorGhostedIds) {
      const m = this.meshMap.get(id);
      if (!m) continue;
      const mat = this.getBaseMaterial(m);
      const origOp = (m.userData.userOpacity as number) ?? 1;
      mat.opacity = origOp;
      mat.transparent = origOp < 0.995;
      mat.depthWrite = origOp >= 0.98;
      mat.needsUpdate = true;
      m.visible = m.userData.userVisible !== false;
    }
    this.floorGhostedIds.clear();

    if (this.studioMode !== 'house') {
      for (const m of this.meshMap.values()) {
        m.visible = m.userData.userVisible !== false;
      }
      return;
    }

    const activeFl =
      this.floors.find((f) => f.id === this.activeFloorId) ?? this.floors[0];

    for (const [id, mesh] of this.meshMap.entries()) {
      const userVis = mesh.userData.userVisible !== false;
      if (!userVis) {
        mesh.visible = false;
        continue;
      }

      let fid = mesh.userData.floorId as string | undefined;
      if (!fid) {
        const b = this.computeWorldBounds(mesh);
        fid = this.resolveAutoFloorIdForY(b.min.y);
        mesh.userData.floorId = fid;
      }
      const fl = this.floors.find((f) => f.id === fid);
      if (!fl) {
        mesh.visible = true;
        continue;
      }

      if (!fl.visible) {
        mesh.visible = false;
        continue;
      }

      if (
        this.floorViewMode === 'cutaway-above' &&
        activeFl &&
        fl.elevation > activeFl.elevation + 0.08
      ) {
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;

      if (
        this.floorViewMode === 'ghost-others' &&
        activeFl &&
        fl.id !== activeFl.id &&
        !this.selectedIds.includes(id)
      ) {
        const mat = this.getBaseMaterial(mesh);
        mat.transparent = true;
        mat.opacity = 0.18;
        mat.depthWrite = false;
        mat.needsUpdate = true;
        this.floorGhostedIds.add(id);
      }
    }

    this.rebuildArchitecture();
  }

  /* =========================================================
     Architect Life × Blender Smart Architecture API (`house` mode)
     ========================================================= */
  private rebuildArchitecture(): void {
    const isHouse = this.studioMode === 'house';
    this.archEngine.structuralGroup.visible = isHouse;
    this.archEngine.overlayGroup.visible = isHouse;
    this.archEngine.rebuildAll(
      this.floors,
      this.activeFloorId,
      this.floorViewMode,
      isHouse,
      this.defaultRoomPrefix
    );
  }

  public setDefaultRoomPrefix(prefix: string): void {
    this.defaultRoomPrefix = prefix || 'Ruang';
  }

  public loadArchData(data?: ArchHouseData, resetHistorySnapshot = false): void {
    this.archEngine.setData(data ?? createEmptyArchHouseData());
    this.archEngine.setSelection(null);
    this.wallChainStart = null;
    this.measureStart = null;
    this.measureEnd = null;
    this.archEngine.clearPreview();
    this.archEngine.updateMeasureOverlay(null, null);
    this.rebuildArchitecture();
    this.applyAtmosphereColors();
    if (resetHistorySnapshot && this.history.length > 0) {
      this.history[this.historyIndex] = {
        ...this.history[this.historyIndex],
        archData: this.archEngine.getData(),
        archSelection: null,
      };
    }
    this.emitState();
  }

  public getArchData(): ArchHouseData {
    return this.archEngine.getData();
  }

  public setArchTool(tool: ArchSubTool): void {
    this.archTool = tool;
    this.wallChainStart = null;
    this.archEngine.clearPreview();
    if (tool !== 'measure') {
      this.measureStart = null;
      this.measureEnd = null;
      this.archEngine.updateMeasureOverlay(null, null);
    }
    if (tool !== 'select') {
      if (this.terrainSculpt.active) {
        this.terrainSculpt.active = false;
        this.gridSystem.updateSculptCursor(null);
      }
      this.selectObject(null, false);
      this.renderer.domElement.style.cursor = 'crosshair';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
    this.emitState();
  }

  public cancelArchChain(): void {
    if (this.wallChainStart) {
      this.wallChainStart = null;
      this.archEngine.clearPreview();
    } else if (this.archTool !== 'select') {
      this.setArchTool('select');
    }
  }

  public setWallDrawDefaults(patch: Partial<WallDrawDefaults>): void {
    this.wallDrawDefaults = { ...this.wallDrawDefaults, ...patch };
  }

  public getWallDrawDefaults(): WallDrawDefaults {
    return { ...this.wallDrawDefaults };
  }

  public setActiveOpeningKind(kind: ArchOpeningKind): void {
    this.activeOpeningKind = kind;
  }

  public selectArchItem(sel: ArchSelection): void {
    if (sel) {
      this.selectObject(null, false);
    }
    this.archEngine.setSelection(sel);
    this.rebuildArchitecture();
    this.emitState();
  }

  public spawnStandardWallTemplate(customDefaults?: Partial<WallDrawDefaults>): ArchWallSegment | null {
    if (this.studioMode !== 'house') return null;
    const merged: WallDrawDefaults = {
      ...this.wallDrawDefaults,
      ...(customDefaults ?? {}),
    };
    const [sx, sz] = this.findCleanSpawnXZ(merged.lengthTemplate * 0.5);
    const created = this.archEngine.spawnWallTemplate(
      this.activeFloorId,
      { x: sx, z: sz },
      merged
    );
    if (created) {
      this.selectObject(null, false);
      this.rebuildArchitecture();
      this.pushHistorySnapshot();
      this.emitState();
    }
    return created;
  }

  public updateArchWall(
    wallId: string,
    patch: Partial<ArchWallSegment>,
    commitHistory = true
  ): void {
    if (!this.archEngine.updateWall(wallId, patch)) return;
    this.rebuildArchitecture();
    if (commitHistory) this.pushHistorySnapshot();
    this.emitState();
  }

  public applyFloorWallsDualColor(
    exteriorColor: string,
    interiorColor: string,
    exteriorPattern?: ProceduralPatternKind,
    interiorPattern?: ProceduralPatternKind
  ): number {
    const updated = this.archEngine.applyWallColorsOnFloor(
      this.activeFloorId,
      exteriorColor,
      interiorColor,
      exteriorPattern,
      interiorPattern
    );
    this.wallDrawDefaults.exteriorColor = exteriorColor;
    this.wallDrawDefaults.interiorColor = interiorColor;
    if (exteriorPattern !== undefined) {
      this.wallDrawDefaults.exteriorPattern = exteriorPattern;
    }
    if (interiorPattern !== undefined) {
      this.wallDrawDefaults.interiorPattern = interiorPattern;
    }
    if (updated > 0) {
      this.rebuildArchitecture();
      this.pushHistorySnapshot();
      this.emitState();
    }
    return updated;
  }

  public commitWallWithExactLength(exactLengthM: number): boolean {
    if (this.studioMode !== 'house' || this.archTool !== 'draw-wall') {
      return false;
    }
    const startPt: Vec2XZ = this.wallChainStart ?? { x: 0, z: 0 };
    const res = this.archEngine.commitWallByExactLength(
      this.activeFloorId,
      startPt,
      this.lastHoverWallXZ,
      exactLengthM,
      this.wallDrawDefaults
    );
    if (!res) return false;
    this.wallChainStart = res.endPoint;
    const activeFl =
      this.floors.find((f) => f.id === this.activeFloorId) ?? this.floors[0];
    this.archEngine.updateWallDrawPreview(
      this.wallChainStart,
      null,
      activeFl ? activeFl.elevation : 0,
      this.wallDrawDefaults,
      this.wallChainStart
    );
    this.rebuildArchitecture();
    this.pushHistorySnapshot();
    this.emitState();
    return true;
  }

  public updateArchOpening(
    openingId: string,
    patch: Partial<ArchOpeningItem>,
    commitHistory = true
  ): void {
    if (!this.archEngine.updateOpening(openingId, patch)) return;
    this.rebuildArchitecture();
    if (commitHistory) this.pushHistorySnapshot();
    this.emitState();
  }

  public updateArchRoomMeta(
    roomId: string,
    patch: Partial<
      Pick<ArchRoomMeta, 'name' | 'floorColor' | 'floorPattern' | 'ceilingVisible'>
    >,
    commitHistory = true
  ): void {
    if (!this.archEngine.updateRoomMeta(roomId, patch)) return;
    this.rebuildArchitecture();
    if (commitHistory) this.pushHistorySnapshot();
    this.emitState();
  }

  public addArchStaircase(kind: ArchStairKind): ArchStairItem | null {
    if (this.studioMode !== 'house') return null;
    const activeFl =
      this.floors.find((f) => f.id === this.activeFloorId) ?? this.floors[0];
    const [sx, sz] = this.findCleanSpawnXZ(1.4);
    const created = this.archEngine.addStaircase(
      activeFl.id,
      kind,
      { x: sx, y: activeFl.elevation, z: sz },
      activeFl.height
    );
    this.selectObject(null, false);
    this.rebuildArchitecture();
    this.pushHistorySnapshot();
    this.emitState();
    return created;
  }

  public updateArchStair(
    stairId: string,
    patch: Partial<ArchStairItem>,
    commitHistory = true
  ): void {
    if (!this.archEngine.updateStair(stairId, patch)) return;
    this.rebuildArchitecture();
    if (commitHistory) this.pushHistorySnapshot();
    this.emitState();
  }

  public generateSmartAutoRoof(
    style: ArchRoofStyle = 'gable',
    roofName = 'Atap Pintar'
  ): ArchRoofItem | null {
    if (this.studioMode !== 'house') return null;
    const created = this.archEngine.generateAutoRoof(
      this.floors,
      this.activeFloorId,
      style,
      roofName
    );
    this.selectObject(null, false);
    this.rebuildArchitecture();
    this.pushHistorySnapshot();
    this.emitState();
    return created;
  }

  public addSmartRoofWing(
    style: ArchRoofStyle = 'gable',
    roofName = 'Sayap Atap'
  ): ArchRoofItem | null {
    if (this.studioMode !== 'house') return null;
    const created = this.archEngine.addCustomRoofWing(
      this.floors,
      this.activeFloorId,
      style,
      roofName
    );
    this.selectObject(null, false);
    this.rebuildArchitecture();
    this.pushHistorySnapshot();
    this.emitState();
    return created;
  }

  public updateArchRoof(
    roofId: string,
    patch: Partial<ArchRoofItem>,
    commitHistory = true
  ): void {
    if (!this.archEngine.updateRoof(roofId, patch)) return;
    this.rebuildArchitecture();
    if (commitHistory) this.pushHistorySnapshot();
    this.emitState();
  }

  public deleteSelectedArchItem(): boolean {
    if (!this.archEngine.deleteSelectedArchElement()) return false;
    this.rebuildArchitecture();
    this.pushHistorySnapshot();
    this.emitState();
    return true;
  }

  public bakeSelectedWallToEditableMeshes(): boolean {
    const extracted = this.archEngine.extractSelectedWallAsParts(this.floors);
    if (!extracted || extracted.parts.length === 0) return false;

    this.archEngine.removeWallById(extracted.wallId);
    const gid =
      extracted.parts.length > 1
        ? `grp_baked_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
        : null;
    const createdIds: string[] = [];

    extracted.parts.forEach((p, idx) => {
      const id = `wallmesh-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`;
      createdIds.push(id);
      const objData: SceneObjectData = {
        id,
        name:
          extracted.parts.length === 1
            ? extracted.name
            : `${extracted.name} • ${idx + 1}`,
        kind: p.kind,
        position: {
          x: round3(extracted.center.x + p.localPosition.x),
          y: round3(extracted.center.y + p.localPosition.y),
          z: round3(extracted.center.z + p.localPosition.z),
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
        subdivision: { ...p.subdivision },
        visible: true,
        groupId: gid,
        groupName: gid ? extracted.name : undefined,
        archRole: 'wall',
        floorId: this.activeFloorId,
      };
      const mesh = this.buildMeshFromData(objData);
      this.objectGroup.add(mesh);
      this.meshMap.set(id, mesh);
    });

    this.archTool = 'select';
    this.renderer.domElement.style.cursor = 'default';
    this.rebuildArchitecture();
    this.updateSeamlessTouchFaces();
    if (createdIds.length > 0) {
      this.selectObject(createdIds[0], false);
    }
    this.pushHistorySnapshot();
    this.emitState();
    return true;
  }

  public setSunEnvironment(patch: Partial<SunEnvironmentSettings>, commitHistory = false): void {
    const cur = this.archEngine.getData();
    cur.sun = { ...cur.sun, ...patch };
    this.archEngine.setData(cur);
    this.applyAtmosphereColors();
    if (commitHistory) this.pushHistorySnapshot();
    this.emitState();
  }

  public setBlueprint2DView(active: boolean): void {
    if (this.isBlueprint2D === active) return;
    if (active && this.walkthroughEnabled) {
      this.setWalkthroughMode(false);
    }
    this.isBlueprint2D = active;
    this.archEngine.setBlueprint2DMode(active);

    if (active) {
      this.savedPre2DCamera = {
        pos: this.camera.position.clone(),
        target: this.orbitControls.target.clone(),
        fov: this.cameraLensFov,
      };
      const focus = this.orbitControls.target.clone();
      const activeFl =
        this.floors.find((f) => f.id === this.activeFloorId) ?? this.floors[0];
      focus.y = activeFl ? activeFl.elevation : 0;

      // Low-FOV overhead top-down architectural projection (zero perspective distortion + smooth pan/zoom!)
      this.camera.fov = 22;
      this.camera.updateProjectionMatrix();
      this.orbitControls.enableRotate = false;
      this.orbitControls.touches = {
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
      this.orbitControls.target.copy(focus);
      this.camera.position.set(focus.x, focus.y + 34, focus.z + 0.001);
      this.camera.lookAt(focus);
      this.orbitControls.update();
    } else {
      this.orbitControls.enableRotate = true;
      this.orbitControls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
      this.camera.fov = this.savedPre2DCamera?.fov ?? this.cameraLensFov;
      this.camera.updateProjectionMatrix();
      if (this.savedPre2DCamera) {
        this.camera.position.copy(this.savedPre2DCamera.pos);
        this.orbitControls.target.copy(this.savedPre2DCamera.target);
        this.camera.lookAt(this.orbitControls.target);
        this.orbitControls.update();
      }
    }

    this.rebuildArchitecture();
    this.emitState();
  }

  public setCameraLensFov(fovDeg: number): void {
    const clamped = Math.max(30, Math.min(86, Math.round(fovDeg)));
    this.cameraLensFov = clamped;
    if (!this.isBlueprint2D) {
      this.camera.fov = clamped;
      this.camera.updateProjectionMatrix();
    } else if (this.savedPre2DCamera) {
      this.savedPre2DCamera.fov = clamped;
    }
    this.emitState();
  }

  private raycastActiveFloorXZ(event: PointerEvent): Vec2XZ | null {
    const touchYOffset =
      event.pointerType === 'touch' &&
      (this.archTool === 'draw-wall' || this.archTool === 'place-opening')
        ? -26
        : 0;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y =
      -((event.clientY + touchYOffset - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const activeFl =
      this.floors.find((f) => f.id === this.activeFloorId) ?? this.floors[0];
    const elevY = activeFl ? activeFl.elevation : 0;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -elevY);
    const hitPt = new THREE.Vector3();
    const ok = this.raycaster.ray.intersectPlane(plane, hitPt);
    return ok ? { x: hitPt.x, z: hitPt.z } : null;
  }

  /**
   * Collects all visible Smart Architectural Meshes (Walls, Room Floor Slabs, Stairs, Roofs & Ceilings)
   * so Surface Align & Drop-to-Floor snap custom furniture flush onto walls, floors, and ceilings!
   */
  private collectArchSurfaceMeshes(): THREE.Mesh[] {
    if (this.studioMode !== 'house') return [];
    const out: THREE.Mesh[] = [];
    this.archEngine.structuralGroup.traverse((node) => {
      if ((node as THREE.Mesh).isMesh && node.visible) {
        out.push(node as THREE.Mesh);
      }
    });
    return out;
  }

  private raycastAnyScenePoint(event: PointerEvent): THREE.Vector3 | null {
    this.setPointerNDCFromEvent(event);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const targets: THREE.Object3D[] = [
      ...Array.from(this.meshMap.values()).filter((m) => m.visible),
      this.archEngine.structuralGroup,
    ];
    const ground = this.gridSystem.getGroundCollider();
    if (ground) targets.push(ground);
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length > 0) return hits[0].point.clone();

    const xz = this.raycastActiveFloorXZ(event);
    if (!xz) return null;
    const activeFl =
      this.floors.find((f) => f.id === this.activeFloorId) ?? this.floors[0];
    return new THREE.Vector3(xz.x, activeFl ? activeFl.elevation : 0, xz.z);
  }

  /* =========================================================
     #7 Modular Construction Spawner (`house` mode)
     ========================================================= */
  public spawnModularItem(item: ModularConstructionItem, labelName: string): string | null {
    const activeFl =
      this.floors.find((f) => f.id === this.activeFloorId) ?? this.floors[0];
    const baseElevation =
      this.studioMode === 'house' && activeFl
        ? activeFl.elevation
        : this.gridSettings.elevationY;

    const [sx, sz] = this.findDomainBatchPlacementXZ(
      item.moduleSize.x,
      item.moduleSize.z,
      []
    );
    const terrainY = this.gridSystem.sampleHeight(sx, sz);
    const spawnBaseY =
      item.surfaceRule === 'ground-foliage' || item.surfaceRule === 'slope-rock'
        ? terrainY
        : Math.max(baseElevation, terrainY);

    const gid =
      item.parts.length > 1
        ? `grp_mod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        : null;

    let leaderId: string | null = null;
    this.editSinglePartMode = false;

    item.parts.forEach((p, idx) => {
      const id = `mod-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      if (idx === 0) leaderId = id;

      const data: SceneObjectData = {
        id,
        name: item.parts.length === 1 ? labelName : `${labelName} • ${p.name}`,
        kind: p.kind,
        position: {
          x: round3(sx + p.localPosition.x),
          y: round3(spawnBaseY + p.localPosition.y),
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
        proceduralPattern: p.proceduralPattern,
        patternScale: p.patternScale,
        modifiers: p.modifiers ? { ...p.modifiers } : undefined,
        subdivision: { ...(p.subdivision ?? DEFAULT_SUBDIVISION_SETTINGS) },
        visible: true,
        groupId: gid,
        groupName: gid ? labelName : undefined,
        archRole: p.archRole ?? item.archRole,
        surfaceRule: item.surfaceRule,
        floorId: activeFl?.id,
        pointLight: p.pointLight ? { ...p.pointLight } : undefined,
      };

      const mesh = this.buildMeshFromData(data);
      this.objectGroup.add(mesh);
      this.meshMap.set(id, mesh);
    });

    this.updateSeamlessTouchFaces();
    this.applyFloorVisibilityAndGhosting();
    if (leaderId) {
      this.selectObject(leaderId, false);
    }
    this.pushHistorySnapshot();
    this.emitState();
    return leaderId;
  }

  /* =========================================================
     #5 Duplicate & Repeat Array Placement (Linear / Grid / Radial)
     ========================================================= */
  private computeRepeatArrayOffsets(
    config: RepeatArrayConfig,
    sourceBox: THREE.Box3
  ): Array<{ offset: THREE.Vector3; rotYDeg: number }> {
    const out: Array<{ offset: THREE.Vector3; rotYDeg: number }> = [];
    const spanX = Math.max(0.2, sourceBox.max.x - sourceBox.min.x);
    const spanY = Math.max(0.2, sourceBox.max.y - sourceBox.min.y);
    const spanZ = Math.max(0.2, sourceBox.max.z - sourceBox.min.z);
    const isFlush = config.spacingMode === 'flush';

    if (config.mode === 'linear') {
      const total = Math.max(2, Math.min(48, Math.round(config.count)));
      const dir = config.axis;
      const baseSpan =
        dir === '+x' || dir === '-x'
          ? spanX
          : dir === '+z' || dir === '-z'
          ? spanZ
          : spanY;
      const stepDist = isFlush ? baseSpan : Math.max(0.05, config.stepDistance);

      for (let i = 1; i < total; i++) {
        const d = stepDist * i;
        const off = new THREE.Vector3(
          dir === '+x' ? d : dir === '-x' ? -d : 0,
          dir === '+y' ? d : config.stepElevationY * i,
          dir === '+z' ? d : dir === '-z' ? -d : 0
        );
        out.push({
          offset: off,
          rotYDeg: config.rotationStepYDeg * i,
        });
      }
    } else if (config.mode === 'grid') {
      const nx = Math.max(1, Math.min(16, Math.round(config.count)));
      const nz = Math.max(1, Math.min(16, Math.round(config.countZ)));
      const sx = isFlush ? spanX : Math.max(0.1, config.stepDistance);
      const sz = isFlush ? spanZ : Math.max(0.1, config.stepDistanceZ);

      for (let ix = 0; ix < nx; ix++) {
        for (let iz = 0; iz < nz; iz++) {
          if (ix === 0 && iz === 0) continue;
          out.push({
            offset: new THREE.Vector3(
              ix * sx,
              (ix + iz) * config.stepElevationY,
              iz * sz
            ),
            rotYDeg: 0,
          });
        }
      }
    } else if (config.mode === 'radial') {
      const count = Math.max(2, Math.min(36, Math.round(config.count)));
      const totalAngleRad =
        Math.max(15, Math.min(360, config.fullAngleDeg)) * DEG2RAD;
      const isFullCircle = Math.abs(config.fullAngleDeg - 360) < 0.5;
      const stepRad = isFullCircle
        ? totalAngleRad / count
        : totalAngleRad / Math.max(1, count - 1);
      const r = Math.max(0.3, config.radius);

      // Anchor circle center `-Z` by `r` from source so index 0 sits right at source!
      const centerOffsetZ = r;
      for (let i = 1; i < count; i++) {
        const theta = stepRad * i;
        const ox = Math.sin(theta) * r;
        const oz = centerOffsetZ - Math.cos(theta) * r;
        out.push({
          offset: new THREE.Vector3(ox, config.stepElevationY * i, oz),
          rotYDeg: theta * RAD2DEG,
        });
      }
    }

    return out;
  }

  private getSelectedSourceMeshesForArray(): THREE.Mesh[] {
    if (!this.selectedId) return [];
    const primary = this.meshMap.get(this.selectedId);
    if (!primary) return [];
    return [primary, ...this.getGroupSiblings(primary)];
  }

  public clearRepeatPreview(): void {
    while (this.repeatPreviewGroup.children.length > 0) {
      const ch = this.repeatPreviewGroup.children[0] as THREE.Mesh;
      this.repeatPreviewGroup.remove(ch);
      ch.geometry?.dispose();
      (ch.material as THREE.Material)?.dispose();
    }
  }

  public previewRepeatArray(config: RepeatArrayConfig | null): number {
    this.clearRepeatPreview();
    if (!config) return 0;

    const sourceMeshes = this.getSelectedSourceMeshesForArray();
    if (sourceMeshes.length === 0) return 0;

    const combinedBox = new THREE.Box3();
    for (const sm of sourceMeshes) {
      combinedBox.union(this.computeWorldBounds(sm));
    }
    const pivot = new THREE.Vector3();
    combinedBox.getCenter(pivot);
    const sourceGroundY = this.gridSystem.sampleHeight(pivot.x, pivot.z);

    const instances = this.computeRepeatArrayOffsets(config, combinedBox);
    const ghostMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      roughness: 0.4,
    });

    const yAxis = new THREE.Vector3(0, 1, 0);

    for (const inst of instances) {
      const qYaw = new THREE.Quaternion().setFromAxisAngle(
        yAxis,
        inst.rotYDeg * DEG2RAD
      );
      const targetPivot = pivot.clone().add(inst.offset);
      const terrainDeltaY = config.followTerrain
        ? this.gridSystem.sampleHeight(targetPivot.x, targetPivot.z) -
          sourceGroundY
        : 0;

      for (const sm of sourceMeshes) {
        const relPos = sm.position.clone().sub(pivot).applyQuaternion(qYaw);
        const finalPos = targetPivot.clone().add(relPos);
        finalPos.y += terrainDeltaY;

        const ghost = new THREE.Mesh(sm.geometry.clone(), ghostMat.clone());
        ghost.position.copy(finalPos);
        ghost.quaternion.copy(sm.quaternion).premultiply(qYaw);
        ghost.scale.copy(sm.scale);
        ghost.raycast = () => {};
        this.repeatPreviewGroup.add(ghost);
      }
    }

    ghostMat.dispose();
    return instances.length;
  }

  public commitRepeatArray(config: RepeatArrayConfig): number {
    this.clearRepeatPreview();
    const sourceMeshes = this.getSelectedSourceMeshesForArray();
    if (sourceMeshes.length === 0) return 0;

    const combinedBox = new THREE.Box3();
    for (const sm of sourceMeshes) {
      combinedBox.union(this.computeWorldBounds(sm));
    }
    const pivot = new THREE.Vector3();
    combinedBox.getCenter(pivot);
    const sourceGroundY = this.gridSystem.sampleHeight(pivot.x, pivot.z);

    const instances = this.computeRepeatArrayOffsets(config, combinedBox);
    if (instances.length === 0) return 0;

    const sharedArrayGroupId = config.groupResult
      ? `grp_arr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      : null;
    const arrayGroupLabel = `${sourceMeshes[0].userData.groupName || sourceMeshes[0].name} (Array)`;

    if (sharedArrayGroupId) {
      for (const sm of sourceMeshes) {
        sm.userData.groupId = sharedArrayGroupId;
        sm.userData.groupName = arrayGroupLabel;
      }
    }

    const yAxis = new THREE.Vector3(0, 1, 0);
    let createdCopies = 0;

    instances.forEach((inst, copyIdx) => {
      const qYaw = new THREE.Quaternion().setFromAxisAngle(
        yAxis,
        inst.rotYDeg * DEG2RAD
      );
      const targetPivot = pivot.clone().add(inst.offset);
      const terrainDeltaY = config.followTerrain
        ? this.gridSystem.sampleHeight(targetPivot.x, targetPivot.z) -
          sourceGroundY
        : 0;

      const perInstanceGid = sharedArrayGroupId
        ? sharedArrayGroupId
        : sourceMeshes.length > 1
        ? `grp_rep_${Date.now()}_${copyIdx}_${Math.random().toString(36).slice(2, 5)}`
        : null;

      for (const sm of sourceMeshes) {
        const ser = this.serializeObject(sm.userData.objectId as string);
        if (!ser) continue;

        const relPos = sm.position.clone().sub(pivot).applyQuaternion(qYaw);
        const finalPos = targetPivot.clone().add(relPos);
        finalPos.y += terrainDeltaY;

        const finalQuat = sm.quaternion.clone().premultiply(qYaw);
        const finalEuler = new THREE.Euler().setFromQuaternion(finalQuat);

        const newId = `${ser.kind}-arr-${Date.now()}-${copyIdx}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        const copyData: SceneObjectData = {
          ...ser,
          id: newId,
          name: `${ser.name} #${copyIdx + 2}`,
          position: {
            x: round3(finalPos.x),
            y: round3(finalPos.y),
            z: round3(finalPos.z),
          },
          rotation: {
            x: round3(finalEuler.x * RAD2DEG),
            y: round3(finalEuler.y * RAD2DEG),
            z: round3(finalEuler.z * RAD2DEG),
          },
          subdivision: { ...ser.subdivision },
          groupId: perInstanceGid,
          groupName: perInstanceGid ? arrayGroupLabel : undefined,
        };

        const newMesh = this.buildMeshFromData(copyData);
        this.objectGroup.add(newMesh);
        this.meshMap.set(newId, newMesh);
      }
      createdCopies++;
    });

    this.updateSeamlessTouchFaces();
    this.applyFloorVisibilityAndGhosting();
    this.updateSelectionHighlight();
    this.pushHistorySnapshot();
    this.emitState();
    return createdCopies;
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

    // Architectural Sun Path & Compass Simulator (`Buat Rumah` mode)
    const sunCfg = this.archEngine.getData().sun;
    if (this.studioMode === 'house' && sunCfg.sunOverride) {
      const hour = Math.max(5.5, Math.min(20.5, sunCfg.hour));
      // Solar arc: 06:00 East sunrise -> 12:00 zenith -> 18:00 West sunset -> 20:00 dusk
      const dayT = (hour - 6) / 12; // 0 at 06:00, 0.5 at 12:00, 1.0 at 18:00
      const elevRad = Math.sin(Math.max(-0.18, Math.min(1.18, dayT)) * Math.PI) * (Math.PI * 0.42);
      const azimRad = (dayT * Math.PI) + sunCfg.northDeg * DEG2RAD;
      const sunRadius = 26;
      const sy = Math.max(2.2, Math.sin(Math.max(0.08, elevRad)) * sunRadius);
      const horiz = Math.cos(Math.max(0.08, elevRad)) * sunRadius;
      const sx = Math.cos(azimRad) * horiz;
      const sz = Math.sin(azimRad) * horiz;
      this.keyLight.position.set(sx, sy, sz);

      if (hour >= 18.4) {
        const duskBg = new THREE.Color('#0b1120');
        this.scene.background = duskBg;
        this.scene.fog = new THREE.Fog('#0b1120', 38, 120);
        this.hemiLight.color.set('#3b82f6');
        this.hemiLight.groundColor.set('#0f172a');
        this.hemiLight.intensity = 0.46;
        this.keyLight.color.set('#93c5fd');
        this.keyLight.intensity = 0.72;
        this.fillLight.color.set('#1e3a8a');
        this.fillLight.intensity = 0.35;
        this.renderer.toneMappingExposure = 1.22;
      } else if (hour < 7.8 || hour > 16.4) {
        // Golden hour (sunrise / sunset)
        const goldBg = new THREE.Color(this.themeBaseBgHex).lerp(
          new THREE.Color('#3b2130'),
          0.48
        );
        this.scene.background = goldBg;
        this.scene.fog = new THREE.Fog(goldBg.getHex(), 44, 132);
        this.hemiLight.color.set('#fed7aa');
        this.hemiLight.groundColor.set('#31202b');
        this.hemiLight.intensity = 0.9;
        this.keyLight.color.set('#fb923c');
        this.keyLight.intensity = 2.2;
        this.fillLight.color.set('#c084fc');
        this.fillLight.intensity = 0.52;
        this.renderer.toneMappingExposure = 1.09;
      } else {
        // Crisp architectural daylight
        const bg = new THREE.Color(this.themeBaseBgHex);
        this.scene.background = bg;
        this.scene.fog = new THREE.Fog(bg.getHex(), 50, 145);
        this.hemiLight.color.set('#e2eeff');
        this.hemiLight.groundColor.set('#282d38');
        this.hemiLight.intensity = 1.06;
        this.keyLight.color.set('#fffbeb');
        this.keyLight.intensity = 2.05;
        this.fillLight.color.set('#9ec5ff');
        this.fillLight.intensity = 0.56;
        this.renderer.toneMappingExposure = 1.07;
      }
      return;
    }

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
    if (e.key === 'Escape' && this.studioMode === 'house') {
      this.cancelArchChain();
      return;
    }
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
    const currentFootY = currentEyeY - 1.65;
    if (this.studioMode === 'house') {
      const archElev = this.archEngine.sampleWalkthroughFloorElevation(
        x,
        z,
        currentFootY,
        this.floors
      );
      if (archElev !== null) {
        return archElev;
      }
    }

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

      const prevX = this.camera.position.x;
      const prevZ = this.camera.position.z;
      this.camera.position.addScaledVector(forwardVec, normF * speed);
      this.camera.position.addScaledVector(rightVec, normR * speed);

      if (this.studioMode === 'house') {
        const footY = this.camera.position.y - 1.65;
        const resolved = this.archEngine.resolveWalkthroughMovement(
          prevX,
          prevZ,
          this.camera.position.x,
          this.camera.position.z,
          footY,
          this.floors
        );
        this.camera.position.x = resolved.x;
        this.camera.position.z = resolved.z;
      }
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
    this.validationVisualizer.clear();
    this.clearRepeatPreview();
    this.selectedId = null;
    this.selectedIds = [];
    this.floorGhostedIds.clear();

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
        pointLight: item.pointLight ? { ...item.pointLight } : undefined,
      };
      const mesh = this.buildMeshFromData(cloned);
      this.objectGroup.add(mesh);
      this.meshMap.set(cloned.id, mesh);
    }

    this.updateSeamlessTouchFaces();
    this.applyFloorVisibilityAndGhosting();
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
      this.validationVisualizer.group.visible = false;
      this.repeatPreviewGroup.visible = false;
      this.gridSystem.updateSculptCursor(null);

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
      this.validationVisualizer.group.visible = true;
      this.repeatPreviewGroup.visible = true;

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

    if (this.selectedIds.length >= 2) {
      const selSet = new Set<string>(this.selectedIds);
      const groupSet = new Set<string>();
      for (const o of allObjs) {
        if (selSet.has(o.id) && o.groupId && !this.editSinglePartMode) {
          groupSet.add(o.groupId);
        }
      }
      targetObjs = allObjs.filter(
        (o) =>
          selSet.has(o.id) || (Boolean(o.groupId) && groupSet.has(o.groupId!))
      );
      defaultName = targetObjs[0]?.groupName || targetObjs[0]?.name || defaultName;
    } else if (this.selectedId) {
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
      proceduralPattern: o.proceduralPattern,
      patternScale: o.patternScale,
      modifiers: o.modifiers ? { ...o.modifiers } : undefined,
      subdivision: { ...o.subdivision },
      archRole: o.archRole ?? 'prop',
      modelAssetId: o.modelAssetId,
      modelFormat: o.modelFormat,
      modelThumbUrl: o.modelThumbUrl,
      useCustomMaterial: o.useCustomMaterial,
      pointLight: o.pointLight ? { ...o.pointLight } : undefined,
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
        this.clampPositionByAxisLock(rawPos);
        mesh.position.copy(rawPos);

        const companions = this.getGroupSiblings(mesh);
        const others = this.getNonSiblingMeshes(mesh);
        const groundY = this.gridSystem.sampleHeight(rawPos.x, rawPos.z);
        const effectiveGridStep = this.gridSettings.adaptive
          ? this.gridSystem.getEffectiveSpacing()
          : this.snapSettings.gridStep;

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
                ? effectiveGridStep
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
            this.clampPositionByAxisLock(mesh.position);
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
            groundY,
            {
              companionMeshes: companions,
              effectiveGridStep,
              storyElevations:
                this.studioMode === 'house'
                  ? this.floors.map((f) => f.elevation)
                  : undefined,
              isHouseMode: this.studioMode === 'house',
            }
          );
          mesh.position.copy(snapRes.snappedPosition);
          this.clampPositionByAxisLock(mesh.position);
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
    this.keyLight.shadow.bias = -0.00035;
    this.keyLight.shadow.normalBias = 0.022;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight('#9ec5ff', 0.55);
    this.fillLight.position.set(-12, 9, -10);
    this.scene.add(this.fillLight);

    // Subtle upward interior bounce fill light so house rooms stay softly lit without harsh dark corners
    this.bounceLight = new THREE.HemisphereLight('#f8fafc', '#fde68a', 0.28);
    this.bounceLight.position.set(0, 1.5, 0);
    this.scene.add(this.bounceLight);
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

  private raycastTerrainPoint(event: PointerEvent): THREE.Vector3 | null {
    const collider = this.gridSystem.getGroundCollider();
    if (!collider) return null;
    this.setPointerNDCFromEvent(event);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hits = this.raycaster.intersectObject(collider, false);
    if (hits.length > 0) return hits[0].point.clone();

    const plane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      -this.gridSettings.elevationY
    );
    const pt = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, pt) ? pt : null;
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

    // #3 Terrain Sculpting Stroke Start (`house` mode, primary pointer)
    if (
      this.studioMode === 'house' &&
      this.terrainSculpt.active &&
      event.button <= 0
    ) {
      const hitPt = this.raycastTerrainPoint(event);
      if (hitPt) {
        this.isSculptingStroke = true;
        this.orbitControls.enabled = false;
        this.renderer.domElement.setPointerCapture?.(event.pointerId);
        if (this.terrainSculpt.tool === 'flatten') {
          this.terrainSculpt.flattenHeight =
            Math.round(this.gridSystem.sampleHeight(hitPt.x, hitPt.z) * 20) / 20;
        }
        this.gridSystem.updateSculptCursor(
          hitPt,
          this.terrainSculpt.radius,
          this.terrainSculpt.tool
        );
        this.gridSystem.sculptTerrainAt(
          hitPt.x,
          hitPt.z,
          this.terrainSculpt.tool,
          this.terrainSculpt.radius,
          this.terrainSculpt.strength,
          this.terrainSculpt.flattenHeight
        );
      }
      return;
    }

    // Direct Viewport Architectural Drag (`house` mode, `select` tool)
    if (
      this.studioMode === 'house' &&
      this.archTool === 'select' &&
      this.paintMode === 'none' &&
      event.button <= 0 &&
      !this.transformControls.axis
    ) {
      this.setPointerNDCFromEvent(event);
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);

      // 1. Check Wall Corner Node Handles first (highest priority!)
      const handleHits = this.raycaster.intersectObjects(
        this.archEngine.handlesGroup.children,
        false
      );
      if (handleHits.length > 0) {
        const hm = handleHits[0].object;
        const floorId = hm.userData?.floorId as string | undefined;
        const nodeX = hm.userData?.nodeX as number | undefined;
        const nodeZ = hm.userData?.nodeZ as number | undefined;
        if (floorId && nodeX !== undefined && nodeZ !== undefined) {
          this.activeArchDrag = {
            kind: 'wall-node',
            floorId,
            curXZ: { x: nodeX, z: nodeZ },
            moved: false,
          };
          this.orbitControls.enabled = false;
          this.renderer.domElement.setPointerCapture?.(event.pointerId);
          return;
        }
      }

      // 2. Check Opening (slide along wall), Stair (move XZ), or Selected Roof (move XZ)
      const archHits = this.raycaster.intersectObjects(
        this.archEngine.structuralGroup.children,
        true
      );
      const clickXZ = this.raycastActiveFloorXZ(event);
      if (archHits.length > 0 && clickXZ) {
        let cur: THREE.Object3D | null = archHits[0].object;
        while (cur && cur !== this.archEngine.structuralGroup) {
          const kind = cur.userData?.archKind as string | undefined;
          const id = cur.userData?.archId as string | undefined;
          if (kind === 'opening' && id) {
            this.archEngine.setSelection({ kind: 'opening', id });
            this.activeArchDrag = {
              kind: 'opening-slide',
              openingId: id,
              moved: false,
            };
            this.orbitControls.enabled = false;
            this.renderer.domElement.setPointerCapture?.(event.pointerId);
            return;
          }
          if (kind === 'stair' && id) {
            const st = this.archEngine
              .getData()
              .stairs.find((s) => s.id === id);
            if (st) {
              this.archEngine.setSelection({ kind: 'stair', id });
              this.activeArchDrag = {
                kind: 'stair-move',
                stairId: id,
                offsetXZ: {
                  x: st.position.x - clickXZ.x,
                  z: st.position.z - clickXZ.z,
                },
                moved: false,
              };
              this.orbitControls.enabled = false;
              this.renderer.domElement.setPointerCapture?.(event.pointerId);
              return;
            }
          }
          if (
            kind === 'roof' &&
            id &&
            this.archEngine.getSelection()?.kind === 'roof' &&
            this.archEngine.getSelection()?.id === id
          ) {
            const rf = this.archEngine.getData().roofs.find((r) => r.id === id);
            if (rf) {
              this.activeArchDrag = {
                kind: 'roof-move',
                roofId: id,
                offsetXZ: {
                  x: rf.center.x - clickXZ.x,
                  z: rf.center.z - clickXZ.z,
                },
                moved: false,
              };
              this.orbitControls.enabled = false;
              this.renderer.domElement.setPointerCapture?.(event.pointerId);
              return;
            }
          }
          cur = cur.parent;
        }
      }
    }

    // #6 Box Marquee Selection Start (`select` mode + `box` sub-mode)
    if (
      this.transformMode === 'select' &&
      this.selectionSubMode === 'box' &&
      this.paintMode === 'none' &&
      event.button <= 0
    ) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.isBoxSelecting = true;
      this.boxSelectStart = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      this.orbitControls.enabled = false;
      this.renderer.domElement.setPointerCapture?.(event.pointerId);
      this.callbacks.onBoxSelectRect?.({
        x: this.boxSelectStart.x,
        y: this.boxSelectStart.y,
        width: 0,
        height: 0,
      });
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
          this.dragStartLeaderPos.copy(selMesh.position);
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

    // #3 Terrain Sculpting Hover Cursor + Continuous Brush Stroke
    if (this.studioMode === 'house' && this.terrainSculpt.active) {
      const hitPt = this.raycastTerrainPoint(event);
      if (hitPt) {
        this.gridSystem.updateSculptCursor(
          hitPt,
          this.terrainSculpt.radius,
          this.terrainSculpt.tool
        );
        if (this.isSculptingStroke) {
          this.gridSystem.sculptTerrainAt(
            hitPt.x,
            hitPt.z,
            this.terrainSculpt.tool,
            this.terrainSculpt.radius,
            this.terrainSculpt.strength * 0.65,
            this.terrainSculpt.flattenHeight
          );
        }
      } else {
        this.gridSystem.updateSculptCursor(null);
      }
      return;
    }

    // Direct Viewport Architectural Drag Move (`wall-node`, `opening-slide`, `stair-move`, `roof-move`)
    if (this.activeArchDrag) {
      const dx = event.clientX - this.pointerDownPos.x;
      const dy = event.clientY - this.pointerDownPos.y;
      if (!this.activeArchDrag.moved && Math.hypot(dx, dy) < 4) return;

      const rawXZ = this.raycastActiveFloorXZ(event);
      if (!rawXZ) return;

      const snapStep =
        this.snapSettings.enabled && this.snapSettings.grid
          ? Math.min(0.25, this.snapSettings.gridStep)
          : 0.05;
      const q = (v: number) => Math.round(v / snapStep) * snapStep;

      if (this.activeArchDrag.kind === 'wall-node') {
        const nextXZ: Vec2XZ = { x: q(rawXZ.x), z: q(rawXZ.z) };
        if (
          Math.hypot(
            nextXZ.x - this.activeArchDrag.curXZ.x,
            nextXZ.z - this.activeArchDrag.curXZ.z
          ) >= 0.02
        ) {
          this.archEngine.moveConnectedWallVertex(
            this.activeArchDrag.floorId,
            this.activeArchDrag.curXZ,
            nextXZ
          );
          this.activeArchDrag.curXZ = nextXZ;
          this.activeArchDrag.moved = true;
          this.rebuildArchitecture();
          this.emitState();
        }
      } else if (this.activeArchDrag.kind === 'opening-slide') {
        if (
          this.archEngine.slideOpeningToWorldXZ(
            this.activeArchDrag.openingId,
            rawXZ
          )
        ) {
          this.activeArchDrag.moved = true;
          this.rebuildArchitecture();
          this.emitState();
        }
      } else if (this.activeArchDrag.kind === 'stair-move') {
        const nx = q(rawXZ.x + this.activeArchDrag.offsetXZ.x);
        const nz = q(rawXZ.z + this.activeArchDrag.offsetXZ.z);
        const dragStairId = this.activeArchDrag.stairId;
        const curSt = this.archEngine
          .getData()
          .stairs.find((s) => s.id === dragStairId);
        if (curSt) {
          this.archEngine.updateStair(curSt.id, {
            position: { x: nx, y: curSt.position.y, z: nz },
          });
          this.activeArchDrag.moved = true;
          this.rebuildArchitecture();
          this.emitState();
        }
      } else if (this.activeArchDrag.kind === 'roof-move') {
        const nx = q(rawXZ.x + this.activeArchDrag.offsetXZ.x);
        const nz = q(rawXZ.z + this.activeArchDrag.offsetXZ.z);
        this.archEngine.updateRoof(this.activeArchDrag.roofId, {
          center: { x: nx, z: nz },
        });
        this.activeArchDrag.moved = true;
        this.rebuildArchitecture();
        this.emitState();
      }
      return;
    }

    // Architect Life × Blender Interactive Previews (`house` mode)
    if (this.studioMode === 'house' && this.archTool !== 'select') {
      const activeFl =
        this.floors.find((f) => f.id === this.activeFloorId) ?? this.floors[0];
      const baseY = activeFl ? activeFl.elevation : 0;

      if (this.archTool === 'draw-wall') {
        const rawXZ = this.raycastActiveFloorXZ(event);
        if (rawXZ) {
          const snapStep =
            this.snapSettings.enabled && this.snapSettings.grid
              ? Math.min(0.25, this.snapSettings.gridStep)
              : 0.1;
          const snapped = this.archEngine.snapWallPoint(
            rawXZ,
            this.activeFloorId,
            this.wallChainStart,
            this.wallDrawDefaults.angleSnap,
            snapStep
          );
          this.lastHoverWallXZ = snapped.point;
          this.archEngine.updateWallDrawPreview(
            this.wallChainStart,
            this.wallChainStart ? snapped.point : null,
            baseY,
            this.wallDrawDefaults,
            snapped.point
          );
        }
      } else if (this.archTool === 'place-opening') {
        const rawXZ = this.raycastActiveFloorXZ(event);
        if (rawXZ) {
          const hit = this.archEngine.findClosestWallForOpening(
            rawXZ,
            this.activeFloorId,
            0.95
          );
          this.archEngine.updateOpeningHoverPreview(
            hit ? hit.wall : null,
            hit ? hit.offsetRatio : 0.5,
            this.activeOpeningKind,
            baseY
          );
        }
      } else if (
        this.archTool === 'measure' &&
        this.measureStart &&
        !this.measureEnd
      ) {
        const hoverPt = this.raycastAnyScenePoint(event);
        if (hoverPt) {
          this.archEngine.updateMeasureOverlay(this.measureStart, hoverPt);
        }
      }
    }

    // #6 Box Marquee Selection Drag
    if (this.isBoxSelecting) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const curX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const curY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      const minX = Math.min(this.boxSelectStart.x, curX);
      const minY = Math.min(this.boxSelectStart.y, curY);
      const w = Math.abs(curX - this.boxSelectStart.x);
      const h = Math.abs(curY - this.boxSelectStart.y);
      this.callbacks.onBoxSelectRect?.({ x: minX, y: minY, width: w, height: h });
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

    const others = [
      ...this.getNonSiblingMeshes(selMesh),
      ...this.collectArchSurfaceMeshes(),
    ];
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
        ? this.gridSettings.adaptive
          ? this.gridSystem.getEffectiveSpacing()
          : this.snapSettings.gridStep
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
    this.clampPositionByAxisLock(selMesh.position);

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
      // Interactive Tap-to-Open/Close Doors while walking through your house!
      const wdx = event.clientX - this.pointerDownPos.x;
      const wdy = event.clientY - this.pointerDownPos.y;
      if (this.studioMode === 'house' && Math.hypot(wdx, wdy) <= 6) {
        this.setPointerNDCFromEvent(event);
        this.raycaster.setFromCamera(this.pointerNDC, this.camera);
        const hits = this.raycaster.intersectObjects(
          this.archEngine.structuralGroup.children,
          true
        );
        if (hits.length > 0 && hits[0].distance <= 3.8) {
          let cur: THREE.Object3D | null = hits[0].object;
          while (cur && cur !== this.archEngine.structuralGroup) {
            if (cur.userData?.archKind === 'opening' && cur.userData?.archId) {
              const toggled = this.archEngine.toggleDoorOpen(
                cur.userData.archId as string
              );
              if (toggled !== null) {
                this.rebuildArchitecture();
                this.emitState();
              }
              break;
            }
            cur = cur.parent;
          }
        }
      }
      return;
    }

    // Finalize Direct Architectural Viewport Drag
    if (this.activeArchDrag) {
      const wasMoved = this.activeArchDrag.moved;
      this.activeArchDrag = null;
      this.orbitControls.enabled = true;
      this.renderer.domElement.releasePointerCapture?.(event.pointerId);
      if (wasMoved) {
        this.pushHistorySnapshot();
        this.emitState();
        return;
      }
    }

    // #3 Finalize Terrain Sculpt Stroke
    if (this.isSculptingStroke) {
      this.isSculptingStroke = false;
      this.orbitControls.enabled = true;
      this.renderer.domElement.releasePointerCapture?.(event.pointerId);
      this.gridSettings = this.gridSystem.finalizeSculptStroke();
      this.pushHistorySnapshot();
      this.emitState();
      return;
    }

    // #6 Finalize Box Marquee Selection
    if (this.isBoxSelecting) {
      this.isBoxSelecting = false;
      this.orbitControls.enabled = true;
      this.renderer.domElement.releasePointerCapture?.(event.pointerId);
      this.callbacks.onBoxSelectRect?.(null);

      const rect = this.renderer.domElement.getBoundingClientRect();
      const endX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const endY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      const minX = Math.min(this.boxSelectStart.x, endX);
      const maxX = Math.max(this.boxSelectStart.x, endX);
      const minY = Math.min(this.boxSelectStart.y, endY);
      const maxY = Math.max(this.boxSelectStart.y, endY);

      if (maxX - minX >= 6 && maxY - minY >= 6) {
        const additive = event.shiftKey || event.ctrlKey || event.metaKey;
        const nextIds = new Set<string>(additive ? this.selectedIds : []);
        const proj = new THREE.Vector3();

        for (const [id, mesh] of this.meshMap.entries()) {
          if (
            !mesh.visible ||
            this.ghostedMeshIds.has(id) ||
            this.floorGhostedIds.has(id) ||
            this.isMeshFloorLocked(mesh)
          ) {
            continue;
          }
          const b = this.computeWorldBounds(mesh);
          const testPts = [
            mesh.position.clone(),
            new THREE.Vector3(b.min.x, b.min.y, b.min.z),
            new THREE.Vector3(b.max.x, b.max.y, b.max.z),
            new THREE.Vector3(b.min.x, b.max.y, b.max.z),
            new THREE.Vector3(b.max.x, b.min.y, b.min.z),
          ];
          for (const pt of testPts) {
            proj.copy(pt).project(this.camera);
            if (proj.z > 1) continue;
            const sx = (proj.x * 0.5 + 0.5) * rect.width;
            const sy = (-proj.y * 0.5 + 0.5) * rect.height;
            if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
              nextIds.add(id);
              break;
            }
          }
        }

        const arr = Array.from(nextIds);
        this.selectedIds = arr;
        this.selectedId = arr.length > 0 ? arr[arr.length - 1] : null;
        this.reattachTransformAfterSelectionChange();
        this.emitState();
        return;
      }
      // Small click in box mode falls through to normal single/multi click selection
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
    if (
      !this.isBlueprint2D &&
      localX > rect.width - 128 &&
      localY > rect.height - 128
    ) {
      if (this.viewHelper.handleClick(event)) {
        return;
      }
    }

    // Architect Life × Blender Viewport Tool Clicks (`house` mode)
    if (this.studioMode === 'house' && this.archTool !== 'select') {
      if (event.button === 2) {
        this.cancelArchChain();
        return;
      }
      const activeFl =
        this.floors.find((f) => f.id === this.activeFloorId) ?? this.floors[0];
      const baseY = activeFl ? activeFl.elevation : 0;

      if (this.archTool === 'draw-wall') {
        const rawXZ = this.raycastActiveFloorXZ(event);
        if (!rawXZ) return;
        const snapStep =
          this.snapSettings.enabled && this.snapSettings.grid
            ? Math.min(0.25, this.snapSettings.gridStep)
            : 0.1;
        const snapped = this.archEngine.snapWallPoint(
          rawXZ,
          this.activeFloorId,
          this.wallChainStart,
          this.wallDrawDefaults.angleSnap,
          snapStep
        );

        if (!this.wallChainStart) {
          this.wallChainStart = snapped.point;
          this.lastHoverWallXZ = snapped.point;
          this.archEngine.updateWallDrawPreview(
            snapped.point,
            null,
            baseY,
            this.wallDrawDefaults,
            snapped.point
          );
          this.emitState();
        } else {
          const created = this.archEngine.addWallSegment(
            this.activeFloorId,
            this.wallChainStart,
            snapped.point,
            this.wallDrawDefaults
          );
          if (created) {
            this.rebuildArchitecture();
            this.pushHistorySnapshot();
            this.emitState();
            // Auto-end chain when closing onto an existing wall corner!
            if (snapped.snappedEndpoint) {
              this.wallChainStart = null;
              this.archEngine.clearPreview();
            } else {
              this.wallChainStart = snapped.point;
            }
          }
        }
        return;
      }

      if (this.archTool === 'place-opening') {
        const rawXZ = this.raycastActiveFloorXZ(event);
        if (!rawXZ) return;
        const hit = this.archEngine.findClosestWallForOpening(
          rawXZ,
          this.activeFloorId,
          0.95
        );
        if (hit) {
          const op = this.archEngine.addOpeningOnWall(
            hit.wall.id,
            this.activeOpeningKind,
            hit.offsetRatio
          );
          if (op) {
            this.archEngine.clearPreview();
            this.rebuildArchitecture();
            this.pushHistorySnapshot();
            this.emitState();
          }
        }
        return;
      }

      if (this.archTool === 'measure') {
        const pt = this.raycastAnyScenePoint(event);
        if (!pt) return;
        if (!this.measureStart || this.measureEnd) {
          this.measureStart = pt;
          this.measureEnd = null;
          this.archEngine.updateMeasureOverlay(pt, null);
        } else {
          this.measureEnd = pt;
          this.archEngine.updateMeasureOverlay(this.measureStart, pt);
        }
        return;
      }
    }

    this.setPointerNDCFromEvent(event);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    const selectableMeshes = Array.from(this.meshMap.values()).filter(
      (m) =>
        m.visible &&
        !this.ghostedMeshIds.has(m.userData.objectId as string) &&
        !this.floorGhostedIds.has(m.userData.objectId as string) &&
        !this.isMeshFloorLocked(m)
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
              ? this.gridSettings.adaptive
                ? this.gridSystem.getEffectiveSpacing()
                : this.snapSettings.gridStep
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

    // 3. Normal / Multi-Select Object Selection (#6) + Smart Architectural Element Selection
    const isAdditiveClick =
      this.selectionSubMode === 'multi' ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey;

    let archHitSel: { sel: NonNullable<ArchSelection>; dist: number } | null =
      null;
    if (this.studioMode === 'house' && !isAdditiveClick) {
      const archHits = this.raycaster.intersectObjects(
        this.archEngine.structuralGroup.children,
        true
      );
      for (const ah of archHits) {
        let cur: THREE.Object3D | null = ah.object;
        while (cur && cur !== this.archEngine.structuralGroup) {
          const kind = cur.userData?.archKind as string | undefined;
          const id = cur.userData?.archId as string | undefined;
          if (
            id &&
            (kind === 'wall' ||
              kind === 'opening' ||
              kind === 'room' ||
              kind === 'stair' ||
              kind === 'roof')
          ) {
            archHitSel = {
              sel: { kind, id },
              dist: ah.distance,
            };
            break;
          }
          cur = cur.parent;
        }
        if (archHitSel) break;
      }
    }

    if (
      hits.length > 0 &&
      (!archHitSel || hits[0].distance <= archHitSel.dist + 0.02)
    ) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const hitId = hitMesh.userData.objectId as string | undefined;
      if (hitId) {
        if (this.archEngine.getSelection()) {
          this.archEngine.setSelection(null);
          this.rebuildArchitecture();
        }
        if (isAdditiveClick) {
          this.toggleSelectObject(hitId);
        } else {
          this.selectObject(hitId);
        }
      }
    } else if (archHitSel) {
      this.selectObject(null, false);
      this.archEngine.setSelection(archHitSel.sel);
      this.rebuildArchitecture();
      this.emitState();
    } else if (!isAdditiveClick) {
      if (this.archEngine.getSelection()) {
        this.archEngine.setSelection(null);
        this.rebuildArchitecture();
      }
      this.selectObject(null);
    }
  };

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.walkthroughEnabled) {
      this.updateWalkthroughStep(delta);
    } else if (!this.isBlueprint2D && this.viewHelper.animating) {
      this.orbitControls.enabled = false;
      this.viewHelper.update(delta);
    } else if (this.cameraTween?.active) {
      this.updateCameraTween(delta);
    } else if (
      !this.transformControls.dragging &&
      !this.isSurfaceSliding &&
      !this.isSculptingStroke &&
      !this.isBoxSelecting &&
      !this.activeArchDrag
    ) {
      this.orbitControls.enabled = true;
      this.orbitControls.update();
    }

    if (this.studioMode === 'house') {
      this.archEngine.updateSmartCeilingsVisibility(
        this.camera.position.y,
        this.walkthroughEnabled,
        this.interiorPeekEnabled
      );
    }

    // #8 Adaptive Grid Zoom Update
    if (!this.walkthroughEnabled && this.gridSettings.adaptive) {
      const camDist = this.camera.position.distanceTo(this.orbitControls.target);
      const changed = this.gridSystem.updateAdaptiveZoom(camDist);
      if (changed) {
        const eff = this.gridSystem.getEffectiveSpacing();
        if (Math.abs(eff - this.lastAdaptiveSpacing) > 1e-4) {
          this.lastAdaptiveSpacing = eff;
          if (this.gridSettings.syncSnap) {
            this.applyControlSnapConfig();
          }
          this.emitState();
        }
      }
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
        proceduralPattern: p.proceduralPattern,
        patternScale: p.patternScale,
        modifiers: p.modifiers ? { ...p.modifiers } : undefined,
        subdivision: { ...(p.subdivision ?? DEFAULT_SUBDIVISION_SETTINGS) },
        visible: true,
        groupId: gid,
        groupName: gid ? groupLabel : undefined,
        archRole: p.archRole ?? defaultRole,
        modelAssetId: p.modelAssetId,
        modelFormat: p.modelFormat,
        modelThumbUrl: p.modelThumbUrl,
        useCustomMaterial: p.useCustomMaterial,
        pointLight: p.pointLight ? { ...p.pointLight } : undefined,
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

  /**
   * Loads a saved Custom Asset onto the center `(0, 0, 0)` in Single-Part Edit Mode so the user
   * can tweak individual cushions/legs/lights and update the saved asset in place!
   */
  public loadCustomAssetPartsForEdit(
    parts: CustomAssetPart[],
    assetName: string
  ): string | null {
    if (parts.length === 0) return null;
    const groundY = this.gridSystem.sampleHeight(0, 0);
    const gid =
      parts.length > 1
        ? `grp_edit_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
        : null;

    let firstId: string | null = null;
    const newIds: string[] = [];

    parts.forEach((p, idx) => {
      const id = `editpart-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`;
      if (idx === 0) firstId = id;
      newIds.push(id);

      const data: SceneObjectData = {
        id,
        name: p.name || `${assetName} ${idx + 1}`,
        kind: p.kind,
        position: {
          x: round3(p.localPosition.x),
          y: round3(groundY + p.localPosition.y),
          z: round3(p.localPosition.z),
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
        proceduralPattern: p.proceduralPattern,
        patternScale: p.patternScale,
        modifiers: p.modifiers ? { ...p.modifiers } : undefined,
        subdivision: { ...(p.subdivision ?? DEFAULT_SUBDIVISION_SETTINGS) },
        visible: true,
        groupId: gid,
        groupName: gid ? assetName : undefined,
        archRole: p.archRole ?? 'prop',
        modelAssetId: p.modelAssetId,
        modelFormat: p.modelFormat,
        modelThumbUrl: p.modelThumbUrl,
        useCustomMaterial: p.useCustomMaterial,
        pointLight: p.pointLight ? { ...p.pointLight } : undefined,
      };

      const mesh = this.buildMeshFromData(data);
      this.objectGroup.add(mesh);
      this.meshMap.set(id, mesh);
    });

    this.editSinglePartMode = true;
    this.updateSeamlessTouchFaces();
    this.selectedIds = newIds;
    this.selectedId = firstId;
    this.reattachTransformAfterSelectionChange();
    this.pushHistorySnapshot();
    this.emitState();
    return firstId;
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
    const modifiers = normalizeModifierSettings(data.modifiers);
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
      geometry = applyGeometryDeformModifiers(built.geometry, modifiers);
      if (geometry !== built.geometry) {
        built.geometry.dispose();
      }
      gridLinesGeometry = built.gridLinesGeometry;
      stats = computeGeometryStats(baseGeo, geometry, subdiv, false);
    }

    const opacity = data.opacity !== undefined ? data.opacity : 1;
    const emissiveHex = data.emissive ?? '#000000';
    const emissiveIntensity = data.emissiveIntensity ?? 0;
    const flatShading = Boolean(data.flatShading);
    const procPattern = data.proceduralPattern ?? 'none';
    const patScale = data.patternScale ?? 1;

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
    if (procPattern !== 'none') {
      applyProceduralPatternToMaterial(
        baseMaterial,
        procPattern,
        patScale,
        patScale
      );
    }

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
      proceduralPattern: procPattern,
      patternScale: patScale,
      modifiers: { ...modifiers },
      subdivision: { ...subdiv },
      subdivStats: stats,
      groupId: data.groupId ?? null,
      groupName: data.groupName,
      archRole: data.archRole,
      surfaceRule: data.surfaceRule,
      floorId: data.floorId,
      modelAssetId: data.modelAssetId,
      modelFormat: data.modelFormat ?? importedEntry?.format,
      modelThumbUrl: data.modelThumbUrl ?? importedEntry?.thumbDataUrl,
      useCustomMaterial: Boolean(data.useCustomMaterial),
      pointLight: data.pointLight ? { ...data.pointLight } : undefined,
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

    this.syncMeshPointLight(mesh, data.pointLight);
    if (!importedEntry) {
      syncMeshMirrorTwins(mesh, modifiers, baseMaterial);
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

  private syncMeshPointLight(
    mesh: THREE.Mesh,
    cfg?: ObjectPointLightConfig
  ): void {
    const existing = mesh.getObjectByName('__customPointLight') as
      | THREE.PointLight
      | undefined;
    if (!cfg || !cfg.enabled) {
      if (existing) {
        mesh.remove(existing);
        existing.dispose();
      }
      mesh.userData.pointLight = cfg ? { ...cfg } : undefined;
      return;
    }

    mesh.userData.pointLight = { ...cfg };
    if (existing) {
      existing.color.set(cfg.color);
      existing.intensity = cfg.intensity;
      existing.distance = cfg.distance;
    } else {
      const light = new THREE.PointLight(
        new THREE.Color(cfg.color),
        cfg.intensity,
        cfg.distance,
        1.75
      );
      light.name = '__customPointLight';
      light.castShadow = false;
      mesh.add(light);
    }
  }

  public updateObjectPointLight(
    id: string,
    patch: Partial<ObjectPointLightConfig>,
    commitHistory = true
  ): void {
    const mesh = this.meshMap.get(id);
    if (!mesh) return;
    const prev = (mesh.userData.pointLight as ObjectPointLightConfig | undefined) ?? {
      enabled: false,
      color: '#fde68a',
      intensity: 2.2,
      distance: 7.5,
    };
    const next: ObjectPointLightConfig = { ...prev, ...patch };
    this.syncMeshPointLight(mesh, next);
    if (commitHistory) this.pushHistorySnapshot();
    this.emitState();
  }

  private updateSelectionHighlight(): void {
    const selectedSet = new Set(this.selectedIds);
    const selectedGroups = new Set<string>();
    if (!this.editSinglePartMode) {
      for (const sid of this.selectedIds) {
        const m = this.meshMap.get(sid);
        const gid = m?.userData.groupId as string | null | undefined;
        if (gid) selectedGroups.add(gid);
      }
    }

    for (const [id, mesh] of this.meshMap.entries()) {
      const mat = this.getBaseMaterial(mesh);
      const userEmissive = (mesh.userData.userEmissiveHex as string) ?? '#000000';
      const userIntensity = (mesh.userData.userEmissiveIntensity as number) ?? 0;

      const isPrimary = id === this.selectedId;
      const isSecondary =
        !isPrimary &&
        (selectedSet.has(id) ||
          (Boolean(mesh.userData.groupId) &&
            selectedGroups.has(mesh.userData.groupId as string)));

      if ((isPrimary || isSecondary) && userIntensity === 0) {
        mat.emissive.set(isPrimary ? '#241a08' : '#132338');
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
            if ((isPrimary || isSecondary) && userIntensity === 0) {
              std.emissive.set(isPrimary ? '#241a08' : '#132338');
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

  private reattachTransformAfterSelectionChange(): void {
    this.snapVisualizer.clear();
    this.protractorVisualizer.hide();
    this.surfaceNormalVisualizer.hide();
    this.updateSelectionHighlight();

    if (
      this.selectedId &&
      this.transformMode !== 'select' &&
      !this.walkthroughEnabled &&
      !this.terrainSculpt.active
    ) {
      const mesh = this.meshMap.get(this.selectedId);
      if (mesh && mesh.visible) {
        this.transformControls.attach(mesh);
        this.applyAxisLockToGizmo();
      } else {
        this.transformControls.detach();
      }
    } else {
      this.transformControls.detach();
    }
  }

  public selectObject(id: string | null, emit = true): void {
    if (id && !this.meshMap.has(id)) {
      id = null;
    }
    this.selectedId = id;
    this.selectedIds = id ? [id] : [];
    this.reattachTransformAfterSelectionChange();

    if (emit) {
      this.emitState();
    }
  }

  public toggleSelectObject(id: string, emit = true): void {
    if (!this.meshMap.has(id)) return;
    const idx = this.selectedIds.indexOf(id);
    if (idx !== -1) {
      this.selectedIds.splice(idx, 1);
      this.selectedId =
        this.selectedIds.length > 0
          ? this.selectedIds[this.selectedIds.length - 1]
          : null;
    } else {
      this.selectedIds.push(id);
      this.selectedId = id;
    }
    this.reattachTransformAfterSelectionChange();
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

    if (
      mode === 'select' ||
      this.walkthroughEnabled ||
      this.terrainSculpt.active
    ) {
      this.transformControls.detach();
    } else {
      this.transformControls.setMode(mode);
      this.applyAxisLockToGizmo();
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
        const curMods = normalizeModifierSettings(
          mesh.userData.modifiers as ObjectModifierSettings | undefined
        );
        const finalGeo = importedEntry
          ? built.geometry
          : applyGeometryDeformModifiers(built.geometry, curMods);
        if (finalGeo !== built.geometry) {
          built.geometry.dispose();
        }
        mesh.geometry.dispose();
        mesh.geometry = finalGeo;
        mesh.userData.subdivStats = computeGeometryStats(
          baseGeo,
          finalGeo,
          nextSubdiv,
          false
        );
        if (!importedEntry) {
          syncMeshMirrorTwins(mesh, curMods, this.getBaseMaterial(mesh));
        }
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
   * Non-Destructive Blender-Style Furniture Modifiers (`Bevel`, `Taper X/Z`, `Mirror X/Z`)
   */
  public updateObjectModifiers(
    id: string,
    patch: Partial<ObjectModifierSettings>,
    recordHistory = true
  ): void {
    const mesh = this.meshMap.get(id);
    if (!mesh || mesh.userData.modelAssetId) return;

    const currentMods = normalizeModifierSettings(
      mesh.userData.modifiers as ObjectModifierSettings | undefined
    );
    const nextMods = normalizeModifierSettings({ ...currentMods, ...patch });

    const deformChanged =
      Math.abs(nextMods.bevel - currentMods.bevel) > 0.001 ||
      Math.abs(nextMods.taperX - currentMods.taperX) > 0.002 ||
      Math.abs(nextMods.taperZ - currentMods.taperZ) > 0.002;

    if (deformChanged) {
      const baseGeo = this.getOrCreateBaseGeometry(
        mesh.userData.kind as PrimitiveKind
      );
      const curSubdiv = normalizeSubdivisionSettings(
        mesh.userData.subdivision as ObjectSubdivisionSettings | undefined
      );
      const built = buildSubdividedGeometry(baseGeo, curSubdiv);
      const finalGeo = applyGeometryDeformModifiers(built.geometry, nextMods);
      if (finalGeo !== built.geometry) {
        built.geometry.dispose();
      }
      if (built.gridLinesGeometry) {
        built.gridLinesGeometry.dispose();
      }
      mesh.geometry.dispose();
      mesh.geometry = finalGeo;
      mesh.userData.subdivStats = computeGeometryStats(
        baseGeo,
        finalGeo,
        curSubdiv,
        false
      );
    }

    mesh.userData.modifiers = nextMods;
    syncMeshMirrorTwins(mesh, nextMods, this.getBaseMaterial(mesh));
    this.updateSeamlessTouchFaces();

    if (recordHistory) {
      this.pushHistorySnapshot();
    }
    this.emitState();
  }

  /**
   * Converts live Mirror X/Z twins of the selected object into separate independent SceneObjects!
   */
  public bakeSelectedMirrorTwins(): number {
    if (!this.selectedId) return 0;
    const mesh = this.meshMap.get(this.selectedId);
    const ser = this.selectedId ? this.serializeObject(this.selectedId) : null;
    if (!mesh || !ser || !ser.modifiers) return 0;

    const mods = normalizeModifierSettings(ser.modifiers);
    if (!mods.mirrorX && !mods.mirrorZ) return 0;

    const twinChildren = mesh.children.filter((c) =>
      c.name.startsWith('__mirrorTwin_')
    ) as THREE.Mesh[];
    if (twinChildren.length === 0) return 0;

    const baseMods: ObjectModifierSettings = {
      ...mods,
      mirrorX: false,
      mirrorZ: false,
    };

    const createdIds: string[] = [ser.id];
    mesh.updateMatrixWorld(true);

    twinChildren.forEach((tw, idx) => {
      tw.updateMatrixWorld(true);
      const wp = new THREE.Vector3();
      const wq = new THREE.Quaternion();
      const ws = new THREE.Vector3();
      tw.matrixWorld.decompose(wp, wq, ws);
      const we = new THREE.Euler().setFromQuaternion(wq, 'XYZ');

      const newId = `${ser.kind}-twin-${Date.now()}-${idx}`;
      createdIds.push(newId);
      const twinData: SceneObjectData = {
        ...ser,
        id: newId,
        name: `${ser.name} • Twin ${idx + 1}`,
        position: { x: round3(wp.x), y: round3(wp.y), z: round3(wp.z) },
        rotation: {
          x: round3(we.x * RAD2DEG),
          y: round3(we.y * RAD2DEG),
          z: round3(we.z * RAD2DEG),
        },
        scale: {
          x: round3(Math.abs(ws.x)),
          y: round3(Math.abs(ws.y)),
          z: round3(Math.abs(ws.z)),
        },
        modifiers: { ...baseMods },
      };
      const newMesh = this.buildMeshFromData(twinData);
      this.objectGroup.add(newMesh);
      this.meshMap.set(newId, newMesh);
    });

    this.updateObjectModifiers(
      ser.id,
      { mirrorX: false, mirrorZ: false },
      false
    );
    this.selectedIds = createdIds;
    this.pushHistorySnapshot();
    this.emitState();
    return twinChildren.length;
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
      if (!mesh.userData.modelAssetId && mesh.userData.modifiers) {
        syncMeshMirrorTwins(
          mesh,
          normalizeModifierSettings(
            mesh.userData.modifiers as ObjectModifierSettings
          ),
          this.getBaseMaterial(mesh)
        );
      }
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
    const others = [
      ...this.getNonSiblingMeshes(mesh),
      ...this.collectArchSurfaceMeshes(),
    ];
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
      proceduralPattern: ProceduralPatternKind;
      patternScale: number;
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
    if (
      patch.proceduralPattern !== undefined ||
      patch.patternScale !== undefined
    ) {
      const nextPat =
        patch.proceduralPattern ??
        ((mesh.userData.proceduralPattern as ProceduralPatternKind) ?? 'none');
      const nextScale =
        patch.patternScale ?? ((mesh.userData.patternScale as number) ?? 1);
      mesh.userData.proceduralPattern = nextPat;
      mesh.userData.patternScale = nextScale;
      applyProceduralPatternToMaterial(mat, nextPat, nextScale, nextScale);
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

    const companions = this.getGroupSiblings(selMesh);
    if (companions.length > 0) {
      // Duplicate the entire Multi-Selection or Group cohesively!
      const allSourceMeshes = [selMesh, ...companions];
      const combinedBox = new THREE.Box3();
      for (const sm of allSourceMeshes) {
        combinedBox.union(this.computeWorldBounds(sm));
      }
      const spanX = Math.max(1.2, combinedBox.max.x - combinedBox.min.x + 0.35);
      const groupIdRemap = new Map<string, string>();
      const newSelectedIds: string[] = [];
      let newLeaderId: string | null = null;

      for (const sm of allSourceMeshes) {
        const ser = this.serializeObject(sm.userData.objectId as string);
        if (!ser) continue;

        let nextGid: string | null = null;
        if (ser.groupId && !this.editSinglePartMode) {
          let mapped = groupIdRemap.get(ser.groupId);
          if (!mapped) {
            mapped = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            groupIdRemap.set(ser.groupId, mapped);
          }
          nextGid = mapped;
        }

        const newId = `${ser.kind}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        if (ser.id === this.selectedId || !newLeaderId) {
          newLeaderId = newId;
        }
        if (this.selectedIds.includes(ser.id)) {
          newSelectedIds.push(newId);
        }

        const copyData: SceneObjectData = {
          ...ser,
          id: newId,
          groupId: nextGid,
          position: {
            x: round3(ser.position.x + spanX),
            y: ser.position.y,
            z: ser.position.z,
          },
          subdivision: { ...ser.subdivision },
        };
        const m = this.buildMeshFromData(copyData);
        this.objectGroup.add(m);
        this.meshMap.set(newId, m);
      }

      this.updateSeamlessTouchFaces();
      this.applyFloorVisibilityAndGhosting();
      this.selectedIds =
        newSelectedIds.length > 0
          ? newSelectedIds
          : newLeaderId
          ? [newLeaderId]
          : [];
      this.selectedId = newLeaderId;
      this.reattachTransformAfterSelectionChange();
      this.pushHistorySnapshot();
      this.emitState();
      return newLeaderId;
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
    this.applyFloorVisibilityAndGhosting();
    this.selectObject(newId, false);
    this.pushHistorySnapshot();
    this.emitState();
    return newId;
  }

  public deleteObject(id: string | null = this.selectedId): void {
    if (!id) return;
    const mesh = this.meshMap.get(id);
    if (!mesh) return;

    const deleteSet = new Set<string>();
    const seedIds =
      id === this.selectedId && this.selectedIds.length > 1
        ? [...this.selectedIds]
        : [id];

    for (const sid of seedIds) {
      deleteSet.add(sid);
      const sm = this.meshMap.get(sid);
      const gid = !this.editSinglePartMode
        ? (sm?.userData.groupId as string | null | undefined)
        : null;
      if (gid) {
        for (const [k, m] of this.meshMap.entries()) {
          if (m.userData.groupId === gid) deleteSet.add(k);
        }
      }
    }

    this.selectedIds = this.selectedIds.filter((sid) => !deleteSet.has(sid));
    if (this.selectedId && deleteSet.has(this.selectedId)) {
      this.selectedId =
        this.selectedIds.length > 0
          ? this.selectedIds[this.selectedIds.length - 1]
          : null;
    }
    this.reattachTransformAfterSelectionChange();

    for (const delId of deleteSet) {
      const m = this.meshMap.get(delId);
      if (m) {
        this.disposeMesh(m);
        this.objectGroup.remove(m);
        this.meshMap.delete(delId);
        this.ghostedMeshIds.delete(delId);
        this.floorGhostedIds.delete(delId);
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
    this.validationVisualizer.clear();
    this.clearRepeatPreview();
    this.selectedId = null;
    this.selectedIds = [];
    this.ghostedMeshIds.clear();
    this.floorGhostedIds.clear();

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
      for (const child of mesh.children) {
        if (
          (child as THREE.Mesh).isMesh &&
          child.name.startsWith('__mirrorTwin_')
        ) {
          const tw = child as THREE.Mesh;
          const twClone = new THREE.Mesh(tw.geometry.clone(), baseMat.clone());
          twClone.name = `${mesh.name}_${tw.name.replace('__', '')}`;
          twClone.position.copy(tw.position);
          twClone.scale.copy(tw.scale);
          cleanMesh.add(twClone);
        }
      }
      exportScene.add(cleanMesh);
    }

    // Export Architectural Structure (Smart Walls, Cutout Doors/Windows, Room Floors, Stairs, Roofs)
    if (
      this.studioMode === 'house' &&
      this.archEngine.structuralGroup.children.length > 0
    ) {
      const archExportRoot = this.archEngine.structuralGroup.clone(true);
      archExportRoot.visible = true;
      archExportRoot.traverse((node) => {
        if (node.userData?.archKind === 'ceiling') {
          node.visible = true;
        }
        if ((node as THREE.Mesh).isMesh) {
          const m = node as THREE.Mesh;
          m.geometry = m.geometry.clone();
          const resetArchMat = (mat: THREE.Material) => {
            const c = mat.clone() as THREE.MeshStandardMaterial;
            if (c.emissive) {
              c.emissive.set('#000000');
              c.emissiveIntensity = 0;
            }
            return c;
          };
          if (Array.isArray(m.material)) {
            m.material = m.material.map(resetArchMat);
          } else if (m.material) {
            m.material = resetArchMat(m.material);
          }
        }
      });
      exportScene.add(archExportRoot);
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
      proceduralPattern:
        (mesh.userData.proceduralPattern as ProceduralPatternKind | undefined) ??
        'none',
      patternScale:
        (mesh.userData.patternScale as number | undefined) ?? 1,
      modifiers: mesh.userData.modifiers
        ? { ...(mesh.userData.modifiers as ObjectModifierSettings) }
        : { ...DEFAULT_MODIFIER_SETTINGS },
      subdivision: { ...subdiv },
      visible: userVisible,
      groupId: (mesh.userData.groupId as string | null | undefined) ?? null,
      groupName: mesh.userData.groupName as string | undefined,
      archRole: mesh.userData.archRole as ArchitecturalRole | undefined,
      surfaceRule: mesh.userData.surfaceRule as SurfacePlacementRule | undefined,
      floorId: mesh.userData.floorId as string | undefined,
      modelAssetId: mesh.userData.modelAssetId as string | undefined,
      modelFormat: mesh.userData.modelFormat as string | undefined,
      modelThumbUrl: mesh.userData.modelThumbUrl as string | undefined,
      useCustomMaterial: mesh.userData.modelAssetId
        ? Boolean(mesh.userData.useCustomMaterial)
        : undefined,
      pointLight: mesh.userData.pointLight
        ? { ...(mesh.userData.pointLight as ObjectPointLightConfig) }
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
      selectedIds: [...this.selectedIds],
      sculptedHeightsB64: this.gridSystem.exportSculptedHeightsBase64(),
      floors: this.floors.map((f) => ({ ...f })),
      activeFloorId: this.activeFloorId,
      archData: this.archEngine.getData(),
      archSelection: this.archEngine.getSelection(),
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
    this.validationVisualizer.clear();
    this.clearRepeatPreview();
    this.ghostedMeshIds.clear();
    this.floorGhostedIds.clear();

    for (const mesh of this.meshMap.values()) {
      this.disposeMesh(mesh);
      this.objectGroup.remove(mesh);
    }
    this.meshMap.clear();

    this.gridSystem.importSculptedHeightsBase64(snapshot.sculptedHeightsB64 ?? null);
    if (snapshot.floors && snapshot.floors.length > 0) {
      this.floors = snapshot.floors.map((f) => ({ ...f }));
    }
    if (snapshot.activeFloorId) {
      this.activeFloorId = snapshot.activeFloorId;
    }
    if (snapshot.archData) {
      this.archEngine.setData(snapshot.archData);
      this.archEngine.setSelection(snapshot.archSelection ?? null);
    }

    for (const item of snapshot.objects) {
      const cloned: SceneObjectData = {
        ...item,
        position: { ...item.position },
        rotation: { ...item.rotation },
        scale: { ...item.scale },
        subdivision: { ...(item.subdivision ?? DEFAULT_SUBDIVISION_SETTINGS) },
        pointLight: item.pointLight ? { ...item.pointLight } : undefined,
      };
      const mesh = this.buildMeshFromData(cloned);
      this.objectGroup.add(mesh);
      this.meshMap.set(cloned.id, mesh);
    }

    this.updateSeamlessTouchFaces();
    this.applyFloorVisibilityAndGhosting();

    const restoredIds = (snapshot.selectedIds ?? []).filter((id) =>
      this.meshMap.has(id)
    );
    if (restoredIds.length > 0) {
      this.selectedIds = restoredIds;
      this.selectedId =
        snapshot.selectedId && this.meshMap.has(snapshot.selectedId)
          ? snapshot.selectedId
          : restoredIds[restoredIds.length - 1];
      this.reattachTransformAfterSelectionChange();
    } else {
      this.selectObject(snapshot.selectedId, false);
    }
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

  private computeSelectedCombinedBounds(): THREE.Box3 | null {
    if (!this.selectedId) return null;
    const selMesh = this.meshMap.get(this.selectedId);
    if (!selMesh || !selMesh.visible) return null;

    const companions = this.getGroupSiblings(selMesh);
    const box = this.computeWorldBounds(selMesh);
    for (const cm of companions) {
      if (cm.visible) {
        box.union(this.computeWorldBounds(cm));
      }
    }
    return box.isEmpty() ? null : box;
  }

  private refreshGridSelectionFootprint(): void {
    const box = this.computeSelectedCombinedBounds();
    this.gridSystem.updateSelectionFootprint(box);
  }

  private evaluateCurrentValidation(): PlacementValidationStatus | null {
    if (!this.placementValidationEnabled || !this.selectedId) {
      this.validationVisualizer.clear();
      return null;
    }
    const selMesh = this.meshMap.get(this.selectedId);
    if (!selMesh || !selMesh.visible) {
      this.validationVisualizer.clear();
      return null;
    }
    const activeMeshes = [selMesh, ...this.getGroupSiblings(selMesh)];
    const otherMeshes = this.getNonSiblingMeshes(selMesh);
    const status = this.placementValidator.evaluate(
      activeMeshes,
      otherMeshes,
      this.gridSystem,
      this.gridSettings,
      this.surfaceSettings,
      this.studioMode === 'house'
    );
    const combinedBox = this.computeSelectedCombinedBounds();
    this.validationVisualizer.update(
      combinedBox,
      status,
      this.placementValidationEnabled
    );
    return status;
  }

  private emitState(): void {
    this.refreshGridSelectionFootprint();
    const validationStatus = this.evaluateCurrentValidation();
    this.callbacks.onStateChange({
      objects: this.serializeAllObjects(),
      selectedId: this.selectedId,
      selectedIds: [...this.selectedIds],
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      selectedSubdivStats: this.getSelectedSubdivStats(),
      validationStatus,
      adaptiveSpacing: this.gridSystem.getEffectiveSpacing(),
      floors: this.floors.map((f) => ({ ...f })),
      activeFloorId: this.activeFloorId,
      floorViewMode: this.floorViewMode,
      sculptedHeightsB64: this.gridSystem.exportSculptedHeightsBase64(),
      archData: this.archEngine.getData(),
      detectedRooms: this.archEngine.getDetectedRooms(),
      archSelection: this.archEngine.getSelection(),
      archTool: this.archTool,
      isBlueprint2D: this.isBlueprint2D,
      cameraLensFov: this.cameraLensFov,
      wallChainActive: Boolean(this.wallChainStart),
    });
  }

  /**
   * Studio HD Photo / Render Snapshot (`1920x1080` or `2048x2048`, optional `.PNG` transparent background,
   * automatically hiding all editor gizmos, grids, badges, and selection emissive tint during capture!)
   */
  public captureStudioSnapshot(options: StudioSnapshotOptions): string {
    const targetW = options.resolution === '2k-square' ? 2048 : 1920;
    const targetH = options.resolution === '2k-square' ? 2048 : 1080;

    const prevSize = new THREE.Vector2();
    this.renderer.getSize(prevSize);
    const prevPixelRatio = this.renderer.getPixelRatio();
    const prevAspect = this.camera.aspect;
    const prevBg = this.scene.background;
    const prevFog = this.scene.fog;
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevClearColor = new THREE.Color();
    this.renderer.getClearColor(prevClearColor);

    const gizmoHelper = this.transformControls.getHelper();
    const prevStates = {
      grid: this.gridSystem.group.visible,
      gizmo: gizmoHelper.visible,
      archOverlay: this.archEngine.overlayGroup.visible,
      snapVis: this.snapVisualizer.group.visible,
      protVis: this.protractorVisualizer.group.visible,
      surfVis: this.surfaceNormalVisualizer.group.visible,
      valVis: this.validationVisualizer.group.visible,
    };

    // Temporarily clear selection emissive glow so renders look photo-clean
    const savedEmissives: Array<{
      mat: THREE.MeshStandardMaterial;
      hex: number;
      intensity: number;
    }> = [];
    for (const [id, mesh] of this.meshMap.entries()) {
      if (this.selectedIds.includes(id) || this.selectedId === id) {
        const mat = this.getBaseMaterial(mesh);
        savedEmissives.push({
          mat,
          hex: mat.emissive.getHex(),
          intensity: mat.emissiveIntensity,
        });
        const userHex = (mesh.userData.userEmissiveHex as string) ?? '#000000';
        const userInt = (mesh.userData.userEmissiveIntensity as number) ?? 0;
        mat.emissive.set(userHex);
        mat.emissiveIntensity = userInt;
      }
    }

    try {
      this.gridSystem.group.visible = false;
      gizmoHelper.visible = false;
      this.archEngine.overlayGroup.visible = false;
      this.snapVisualizer.group.visible = false;
      this.protractorVisualizer.group.visible = false;
      this.surfaceNormalVisualizer.group.visible = false;
      this.validationVisualizer.group.visible = false;

      if (options.transparentBg) {
        this.scene.background = null;
        this.scene.fog = null;
        this.renderer.setClearColor(0x000000, 0);
      }

      this.renderer.setPixelRatio(1);
      this.renderer.setSize(targetW, targetH, false);
      this.camera.aspect = targetW / targetH;
      this.camera.updateProjectionMatrix();

      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL('image/png');
    } finally {
      this.gridSystem.group.visible = prevStates.grid;
      gizmoHelper.visible = prevStates.gizmo;
      this.archEngine.overlayGroup.visible = prevStates.archOverlay;
      this.snapVisualizer.group.visible = prevStates.snapVis;
      this.protractorVisualizer.group.visible = prevStates.protVis;
      this.surfaceNormalVisualizer.group.visible = prevStates.surfVis;
      this.validationVisualizer.group.visible = prevStates.valVis;

      for (const item of savedEmissives) {
        item.mat.emissive.setHex(item.hex);
        item.mat.emissiveIntensity = item.intensity;
      }

      this.scene.background = prevBg;
      this.scene.fog = prevFog;
      this.renderer.setClearColor(prevClearColor, prevClearAlpha);
      this.renderer.setPixelRatio(prevPixelRatio);
      this.renderer.setSize(prevSize.x, prevSize.y, false);
      this.camera.aspect = prevAspect;
      this.camera.updateProjectionMatrix();
    }
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    const customLight = mesh.getObjectByName('__customPointLight') as
      | THREE.PointLight
      | undefined;
    if (customLight) {
      mesh.remove(customLight);
      customLight.dispose();
    }
    const mirrorTwins = mesh.children.filter((c) =>
      c.name.startsWith('__mirrorTwin_')
    ) as THREE.Mesh[];
    for (const tw of mirrorTwins) {
      mesh.remove(tw);
      tw.geometry.dispose();
    }
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
    this.validationVisualizer.dispose();
    this.archEngine.dispose();
    this.clearRepeatPreview();
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
