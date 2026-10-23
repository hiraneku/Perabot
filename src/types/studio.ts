export type PrimitiveKind =
  // Original 24 shapes
  | 'cube'
  | 'triangle'
  | 'cylinder'
  | 'horizontal-wedge'
  | 'vertical-wedge'
  | 'inverted-wedge'
  | 'corner-wedge'
  | 'inverted-corner-wedge'
  | 'pyramid'
  | 'horizontal-cylinder'
  | 'vertical-cylinder'
  | 'concave-straight'
  | 'smooth-cube'
  | 'convex-straight'
  | 'concave-inner-corner'
  | 'half-sphere'
  | 'convex-inner-corner'
  | 'concave-outer-corner'
  | 'sphere'
  | 'beveled-cube'
  | 'convex-outer-corner'
  | 'cone'
  | 'beveled-horizontal-cylinder'
  | 'beveled-vertical-cylinder'
  // 51 newly added shapes
  | 'rectangular-prism'
  | 'triangular-prism'
  | 'trapezoidal-prism'
  | 'pentagonal-prism'
  | 'hexagonal-prism'
  | 'octagonal-prism'
  | 'pyramid-frustum'
  | 'triangular-pyramid'
  | 'pentagonal-pyramid'
  | 'hexagonal-pyramid'
  | 'dome'
  | 'torus'
  | 'torus-segment'
  | 'capsule'
  | 'ellipsoid'
  | 'quarter-cylinder'
  | 'quarter-sphere'
  | 'hollow-cylinder'
  | 'hollow-box'
  | 'pipe'
  | 'arch'
  | 'rounded-box'
  | 'l-shaped-block'
  | 't-shaped-block'
  | 'cross-shaped-block'
  | 'plane'
  | 'thin-slab'
  | 'stair'
  | 'ramp'
  | 'gutter'
  | 'half-pipe'
  | 'octagonal-cylinder'
  | 'beveled-rectangular-prism'
  | 'rounded-cylinder'
  | 'elliptical-cylinder'
  | 'triangular-wedge'
  | 'trapezoidal-wedge'
  | 'curved-wedge'
  | 'chamfered-prism'
  | 'mitered-corner'
  | 'conical-frustum'
  | 'ring-cylinder'
  | 'spiral-column'
  | 'fluted-column'
  | 'column-base'
  | 'column-capital'
  | 'cornice'
  | 'molding-profile'
  | 'wall-niche'
  | 'window-frame'
  | 'door-frame';

export type ShapeSubcategory =
  | 'all'
  | 'blocks'
  | 'prisms-pyramids'
  | 'wedges'
  | 'cylinders'
  | 'curved'
  | 'architecture';

export type AppScreen = 'home' | 'editor';

export type StudioMode = 'modeling' | 'house';

export type AppLanguage = 'id' | 'en' | 'ja';

export type StudioThemeId =
  | 'midnight'
  | 'obsidian'
  | 'espresso'
  | 'daylight'
  | 'indigo';

export type LightingMood = 'morning' | 'sunset' | 'night';

export type GraphicsQuality = 'light' | 'balanced' | 'ultra';

export type UiDensity = 'comfortable' | 'compact';

export interface GlobalAppSettings {
  language: AppLanguage;
  theme: StudioThemeId;
  graphicsQuality: GraphicsQuality;
  orbitSensitivity: number; // 0.5 .. 2.0
  uiDensity: UiDensity;
  lightingMood: LightingMood;
}

export type ArchitecturalRole = 'wall' | 'floor' | 'roof' | 'opening' | 'prop';

export type HousePresetCategory =
  | 'all'
  | 'walls'
  | 'floors'
  | 'roofs'
  | 'openings'
  | 'furniture'
  | 'lighting'
  | 'custom';

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';

export type SelectionSubMode = 'single' | 'multi' | 'box';

export type AxisLockMode = 'free' | 'x' | 'y' | 'z' | 'xz';

export type SurfacePlacementRule =
  | 'any'
  | 'building-flat'
  | 'ground-foliage'
  | 'slope-rock'
  | 'floor-interior'
  | 'wall-opening';

export type PlacementValidationIssueKind =
  | 'collision'
  | 'out-of-plot'
  | 'out-of-domain'
  | 'steep-slope'
  | 'wrong-surface';

export interface PlacementValidationStatus {
  valid: boolean;
  issues: Array<{
    kind: PlacementValidationIssueKind;
    targetName?: string;
    slopeDeg?: number;
  }>;
}

export type TerrainSculptTool =
  | 'raise'
  | 'lower'
  | 'flatten'
  | 'smooth'
  | 'terrace';

export interface TerrainSculptSettings {
  active: boolean;
  tool: TerrainSculptTool;
  radius: number; // 0.6 .. 10m
  strength: number; // 0.1 .. 1.0
  flattenHeight: number; // Target Y when tool === 'flatten'
}

export interface BuildingFloorLayer {
  id: string;
  name: string;
  elevation: number; // Base Y in meters (e.g. 0, 3, 6)
  height: number; // Story height in meters (default 3.0)
  visible: boolean;
  locked?: boolean;
}

export type FloorViewMode = 'all' | 'cutaway-above' | 'ghost-others';

export type RepeatArrayMode = 'linear' | 'grid' | 'radial';

export interface RepeatArrayConfig {
  mode: RepeatArrayMode;
  count: number; // 2..24
  countZ: number; // 2..12 (for 'grid' 2D mode)
  axis: '+x' | '-x' | '+z' | '-z' | '+y';
  spacingMode: 'flush' | 'fixed';
  stepDistance: number; // meters when spacingMode === 'fixed'
  stepDistanceZ: number;
  stepElevationY: number; // meters elevation step per item (stairs / sloped fence)
  rotationStepYDeg: number; // optional yaw curve per item
  radius: number; // meters for 'radial'
  fullAngleDeg: number; // 45..360 for 'radial'
  followTerrain: boolean;
  groupResult: boolean;
}

export type PaintInteractionMode = 'none' | 'eyedropper' | 'bucket';

export type TransformSpace = 'world' | 'local';

export type MagnetStrength = 'subtle' | 'normal' | 'strong';

export type RotationSnapStep = 0 | 5 | 15 | 45 | 90;

export type SurfaceConformMode =
  | 'align-normal'
  | 'upright-follow'
  | 'foundation-seat';

export type SurfaceAttachAxis = 'auto' | '-y' | '-z' | '+y';

export interface SurfaceSettings {
  enabled: boolean;
  conformMode: SurfaceConformMode;
  attachAxis: SurfaceAttachAxis;
  autoOnMove: boolean;
  clickToPlace: boolean;
  spinDeg: number;
  offset: number;
  surfaceAware: boolean;
  maxFlatSlopeDeg: number;
}

export interface ObjectSubdivisionSettings {
  cutsX: number; // 1..10 divisions along X
  cutsY: number; // 1..10 divisions along Y
  cutsZ: number; // 1..10 divisions along Z
  showGridLines: boolean; // Crisp quad partition lines on surface
  panelGroove: number; // 0..0.08 physical bevel/groove depth per divided cell
  // Legacy optional fields kept for seamless migration of saved v1 projects
  level?: number;
  mode?: string;
  crease?: number;
  lockBase?: boolean;
  wireframe?: boolean;
}

export interface SubdivisionStats {
  cellsTotal: number;
  cutsX: number;
  cutsY: number;
  cutsZ: number;
  baseTriangles: number;
  subdivTriangles: number;
  vertexCount: number;
  capped: boolean;
}

export type GridStyle = 'wire' | 'tile' | 'blueprint' | 'terrain';

export type TerrainPreset = 'hills' | 'valley' | 'terraced' | 'flat';

export type GridVerticalMode = 'none' | 'back' | 'corner';

export interface GridSettings {
  visible: boolean;
  adaptive: boolean;
  style: GridStyle;
  spacing: number;
  subdivisions: number;
  worldSize: number;
  elevationY: number;
  opacity: number;
  showAxes: boolean;
  syncSnap: boolean;
  showRuler: boolean;
  showSelectionFootprint: boolean;
  verticalGrid: GridVerticalMode;
  showPlotBoundary: boolean;
  plotWidth: number;
  plotDepth: number;
  terrainPreset: TerrainPreset;
  terrainAmplitude: number;
  terrainHeightmapB64?: string;
  terrainGridRes?: number;
}

export interface SnapSettings {
  enabled: boolean;
  objectMagnet: boolean;
  modularSocket: boolean;
  magnetStrength: MagnetStrength;
  alignment: boolean;
  grid: boolean;
  gridStep: number;
  heightSnap: boolean;
  heightStep: number;
  rotationSnapDeg: RotationSnapStep;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface MaterialPreset {
  id: string;
  label: string;
  labelEn: string;
  labelJa: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export type ProceduralPatternKind =
  | 'none'
  | 'wood'
  | 'tile'
  | 'brick'
  | 'concrete'
  | 'marble'
  | 'fabric'
  | 'roof-tile';

export interface ObjectModifierSettings {
  bevel: number; // 0 .. 0.42 smooth cushion/fillet edge rounding
  taperX: number; // -0.75 .. +0.75 top vs bottom X taper
  taperZ: number; // -0.75 .. +0.75 top vs bottom Z taper
  mirrorX: boolean; // symmetric twin across X
  mirrorZ: boolean; // symmetric twin across Z
  mirrorOffset: number; // 0.3 .. 6.0m center-to-center distance
}

export const DEFAULT_MODIFIER_SETTINGS: ObjectModifierSettings = {
  bevel: 0,
  taperX: 0,
  taperZ: 0,
  mirrorX: false,
  mirrorZ: false,
  mirrorOffset: 1.2,
};

export function isModifierActive(mod?: ObjectModifierSettings): boolean {
  if (!mod) return false;
  return (
    mod.bevel > 0.005 ||
    Math.abs(mod.taperX) > 0.005 ||
    Math.abs(mod.taperZ) > 0.005 ||
    Boolean(mod.mirrorX) ||
    Boolean(mod.mirrorZ)
  );
}

export type CustomAssetCategory =
  | 'chair'
  | 'table'
  | 'lamp'
  | 'cabinet'
  | 'decor'
  | 'other';

export interface StudioSnapshotOptions {
  resolution: '1080p' | '2k-square';
  transparentBg: boolean;
}

export interface ObjectPointLightConfig {
  enabled: boolean;
  color: string;
  intensity: number; // 0.3 .. 6.0
  distance: number; // 2 .. 20m
}

export type ArchBuildPhase =
  | 'none'
  | 'walls'
  | 'openings'
  | 'roofs'
  | 'finishing'
  | 'environment';

export type ArchSubTool =
  | 'select'
  | 'draw-wall'
  | 'place-opening'
  | 'measure';

export type ArchWallStyle = 'full' | 'half' | 'railing';

export type ArchOpeningKind =
  | 'door-single'
  | 'door-double'
  | 'window-std'
  | 'window-wide'
  | 'window-tall'
  | 'archway';

export type ArchStairKind = 'straight' | 'l-shape';

export type ArchRoofStyle = 'gable' | 'hip' | 'shed' | 'flat';

export interface Vec2XZ {
  x: number;
  z: number;
}

export interface ArchWallSegment {
  id: string;
  floorId: string;
  start: Vec2XZ;
  end: Vec2XZ;
  height: number; // default 3.0m
  thickness: number; // default 0.15m
  style: ArchWallStyle;
  curveBulge: number; // 0 = straight, -3..+3m sagitta offset for curved walls
  exteriorColor: string;
  interiorColor: string;
  exteriorPattern?: ProceduralPatternKind;
  interiorPattern?: ProceduralPatternKind;
  roughness: number;
  hasBaseboard: boolean;
}

export interface ArchOpeningItem {
  id: string;
  wallId: string;
  floorId: string;
  kind: ArchOpeningKind;
  offsetRatio: number; // 0.08 .. 0.92 along wall centerline
  width: number;
  height: number;
  sillHeight: number;
  frameColor: string;
  flipSwing?: boolean;
  isOpen?: boolean; // interactive door swing state in Walkthrough & editor
}

export interface ArchRoomMeta {
  id: string;
  floorId: string;
  centroid: Vec2XZ;
  name: string;
  floorColor: string;
  floorPattern?: ProceduralPatternKind;
  ceilingVisible: boolean;
}

export interface ArchDetectedRoom {
  id: string;
  floorId: string;
  name: string;
  polygon: Vec2XZ[];
  centroid: Vec2XZ;
  areaSqm: number;
  perimeterM: number;
  floorColor: string;
  floorPattern?: ProceduralPatternKind;
  ceilingVisible: boolean;
}

export interface ArchStairItem {
  id: string;
  floorId: string;
  kind: ArchStairKind;
  position: Vec3;
  rotationY: number; // degrees
  width: number; // default 1.1m
  height: number; // default 3.0m (story height)
  runLength: number; // default 2.8m
  color: string;
  autoCutoutUpper: boolean;
}

export interface ArchRoofItem {
  id: string;
  floorId: string;
  name: string;
  style: ArchRoofStyle;
  center: Vec2XZ;
  width: number;
  depth: number;
  baseY: number;
  pitchDeg: number; // 12 .. 50
  overhang: number; // 0 .. 1.0m
  ridgeAxis: 'x' | 'z';
  color: string;
  fasciaColor: string;
  rotationY: number;
  roofPattern?: ProceduralPatternKind;
  hasSkylight?: boolean;
  skylightWidth?: number;
  skylightDepth?: number;
}

export interface SunEnvironmentSettings {
  sunOverride: boolean;
  hour: number; // 5.5 .. 20.5 (e.g. 9.5 = 09:30)
  northDeg: number; // 0 .. 360 compass azimuth
  cameraFov: number; // 46 (standard) | 64 (wide) | 78 (ultra interior)
}

export interface ArchHouseData {
  walls: ArchWallSegment[];
  openings: ArchOpeningItem[];
  roomMetas: ArchRoomMeta[];
  stairs: ArchStairItem[];
  roofs: ArchRoofItem[];
  sun: SunEnvironmentSettings;
}

export type ArchSelection =
  | { kind: 'wall'; id: string }
  | { kind: 'opening'; id: string }
  | { kind: 'room'; id: string }
  | { kind: 'stair'; id: string }
  | { kind: 'roof'; id: string }
  | null;

export interface WallDrawDefaults {
  height: number; // default 3.00m
  thickness: number; // default 0.15m
  lengthTemplate: number; // default 3.00m
  style: ArchWallStyle;
  curveBulge: number;
  angleSnap: boolean;
  exteriorColor: string;
  interiorColor: string;
  exteriorPattern?: ProceduralPatternKind;
  interiorPattern?: ProceduralPatternKind;
  hasBaseboard: boolean;
}

export interface SceneObjectData {
  id: string;
  name: string;
  kind: PrimitiveKind;
  position: Vec3;
  rotation: Vec3; // Euler degrees
  scale: Vec3;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  flatShading: boolean;
  proceduralPattern?: ProceduralPatternKind;
  patternScale?: number;
  subdivision: ObjectSubdivisionSettings;
  modifiers?: ObjectModifierSettings;
  visible: boolean;
  groupId?: string | null;
  groupName?: string;
  archRole?: ArchitecturalRole;
  modularId?: string;
  surfaceRule?: SurfacePlacementRule;
  floorId?: string;
  pointLight?: ObjectPointLightConfig;
  modelAssetId?: string;
  modelFormat?: string;
  modelThumbUrl?: string;
  useCustomMaterial?: boolean;
}

export interface ImportedModelBlobRecord {
  id: string;
  name: string;
  format: string;
  thumbDataUrl: string;
  glbBuffer: ArrayBuffer;
  createdAt: number;
}

export interface SerializedProjectFile {
  format: 'perabot-project-v1';
  id: string;
  name: string;
  mode: StudioMode;
  createdAt: number;
  updatedAt: number;
  objects: SceneObjectData[];
  gridSettings?: GridSettings;
  snapSettings?: SnapSettings;
  surfaceSettings?: SurfaceSettings;
  lightingMood?: LightingMood;
  sculptedHeightsB64?: string | null;
  floors?: BuildingFloorLayer[];
  activeFloorId?: string;
  floorViewMode?: FloorViewMode;
  placementValidation?: boolean;
  archData?: ArchHouseData;
  embeddedModels?: Record<
    string,
    { name: string; format: string; thumbDataUrl: string; base64Glb: string }
  >;
}

export interface SavedProjectRecord {
  id: string;
  name: string;
  mode: StudioMode;
  thumbnailDataUrl: string;
  objectCount: number;
  createdAt: number;
  updatedAt: number;
  scene: SerializedProjectFile;
}

export interface CustomAssetPart {
  name: string;
  kind: PrimitiveKind;
  localPosition: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  flatShading: boolean;
  proceduralPattern?: ProceduralPatternKind;
  patternScale?: number;
  subdivision: ObjectSubdivisionSettings;
  modifiers?: ObjectModifierSettings;
  pointLight?: ObjectPointLightConfig;
  archRole?: ArchitecturalRole;
  modelAssetId?: string;
  modelFormat?: string;
  modelThumbUrl?: string;
  useCustomMaterial?: boolean;
}

export interface CustomAssetRecord {
  id: string;
  name: string;
  category?: CustomAssetCategory;
  thumbnailDataUrl: string;
  createdAt: number;
  updatedAt?: number;
  parts: CustomAssetPart[];
}

export interface DragFeedback {
  active: boolean;
  axis: string | null;
  mode: TransformMode | 'surface';
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  deltaAngleDeg?: number;
  snapLabel?: string | null;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalAppSettings = {
  language: 'id',
  theme: 'midnight',
  graphicsQuality: 'balanced',
  orbitSensitivity: 1.0,
  uiDensity: 'comfortable',
  lightingMood: 'morning',
};

export const STUDIO_THEMES: Array<{
  id: StudioThemeId;
  name: Record<AppLanguage, string>;
  desc: Record<AppLanguage, string>;
  canvasBg: string;
  panelPreview: string;
  accentPreview: string;
  isLight?: boolean;
}> = [
  {
    id: 'midnight',
    name: {
      id: 'Midnight Slate',
      en: 'Midnight Slate',
      ja: 'ミッドナイト・スレート',
    },
    desc: {
      id: 'Gelap biru-abu khas studio 3D modern',
      en: 'Classic dark slate 3D studio look',
      ja: '定番のダークブルー系3Dスタジオ',
    },
    canvasBg: '#151821',
    panelPreview: '#191d26',
    accentPreview: '#3b82f6',
  },
  {
    id: 'obsidian',
    name: {
      id: 'Obsidian OLED',
      en: 'Obsidian OLED',
      ja: 'オブシディアン・OLED',
    },
    desc: {
      id: 'Hitam pekat kontras tinggi dengan aksen zamrud',
      en: 'Deep pitch black with emerald highlights',
      ja: '有機EL向けの漆黒＆エメラルド配色',
    },
    canvasBg: '#090b10',
    panelPreview: '#0e1117',
    accentPreview: '#10b981',
  },
  {
    id: 'espresso',
    name: {
      id: 'Warm Espresso',
      en: 'Warm Espresso',
      ja: 'ウォーム・エスプレッソ',
    },
    desc: {
      id: 'Gelap hangat bernuansa kayu & interior',
      en: 'Cozy warm dark tone for interior design',
      ja: '建築・インテリアに馴染む暖色ダーク',
    },
    canvasBg: '#1c1815',
    panelPreview: '#241e1a',
    accentPreview: '#f59e0b',
  },
  {
    id: 'indigo',
    name: {
      id: 'Indigo Creative',
      en: 'Indigo Creative',
      ja: 'インディゴ・クリエイティブ',
    },
    desc: {
      id: 'Ungu-nila elegan bergaya aplikasi desain',
      en: 'Sleek violet-indigo creative workspace',
      ja: '洗練されたバイオレット系ワークスペース',
    },
    canvasBg: '#161426',
    panelPreview: '#1d1a30',
    accentPreview: '#8b5cf6',
  },
  {
    id: 'daylight',
    name: {
      id: 'Nordic Daylight',
      en: 'Nordic Daylight',
      ja: 'ノルディック・デイライト',
    },
    desc: {
      id: 'Terang bersih seperti meja gambar arsitek',
      en: 'Clean, bright architectural drafting table',
      ja: '明るく見やすい建築スタジオ風ライトテーマ',
    },
    canvasBg: '#e2e8f0',
    panelPreview: '#f8fafc',
    accentPreview: '#2563eb',
    isLight: true,
  },
];

export const DEFAULT_SUBDIVISION_SETTINGS: ObjectSubdivisionSettings = {
  cutsX: 1,
  cutsY: 1,
  cutsZ: 1,
  showGridLines: true,
  panelGroove: 0,
};

export function normalizeSubdivisionSettings(
  raw?: Partial<ObjectSubdivisionSettings> | null
): ObjectSubdivisionSettings {
  if (!raw) return { ...DEFAULT_SUBDIVISION_SETTINGS };
  if (
    typeof raw.cutsX === 'number' &&
    typeof raw.cutsY === 'number' &&
    typeof raw.cutsZ === 'number'
  ) {
    return {
      cutsX: Math.max(1, Math.min(10, Math.round(raw.cutsX))),
      cutsY: Math.max(1, Math.min(10, Math.round(raw.cutsY))),
      cutsZ: Math.max(1, Math.min(10, Math.round(raw.cutsZ))),
      showGridLines: raw.showGridLines !== false,
      panelGroove: Math.max(0, Math.min(0.08, Number(raw.panelGroove ?? 0))),
    };
  }
  // Migrate legacy v1 `level` (0..3 -> 1, 2, 4, 8 divisions)
  const lv = typeof raw.level === 'number' ? raw.level : 0;
  const legacyCuts = lv > 0 ? Math.min(8, Math.pow(2, lv)) : 1;
  return {
    cutsX: legacyCuts,
    cutsY: legacyCuts,
    cutsZ: legacyCuts,
    showGridLines: true,
    panelGroove: 0,
  };
}

export function isSubdivisionActive(s?: ObjectSubdivisionSettings | null): boolean {
  if (!s) return false;
  return (s.cutsX ?? 1) > 1 || (s.cutsY ?? 1) > 1 || (s.cutsZ ?? 1) > 1;
}

export const DEFAULT_SURFACE_SETTINGS: SurfaceSettings = {
  enabled: false,
  conformMode: 'align-normal',
  attachAxis: 'auto',
  autoOnMove: true,
  clickToPlace: false,
  spinDeg: 0,
  offset: 0,
  surfaceAware: true,
  maxFlatSlopeDeg: 14,
};

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  visible: true,
  adaptive: false,
  style: 'wire',
  spacing: 1.0,
  subdivisions: 4,
  worldSize: 40,
  elevationY: 0,
  opacity: 0.88,
  showAxes: false,
  syncSnap: false,
  showRuler: false,
  showSelectionFootprint: false,
  verticalGrid: 'none',
  showPlotBoundary: false,
  plotWidth: 8,
  plotDepth: 12,
  terrainPreset: 'hills',
  terrainAmplitude: 1.4,
};

export const DEFAULT_WALL_DRAW: WallDrawDefaults = {
  height: 3.0,
  thickness: 0.15,
  lengthTemplate: 3.0,
  style: 'full',
  curveBulge: 0,
  angleSnap: true,
  exteriorColor: '#f1f5f9',
  interiorColor: '#f8efe2',
  hasBaseboard: true,
};

export const DEFAULT_SUN_ENVIRONMENT: SunEnvironmentSettings = {
  sunOverride: false,
  hour: 9.5,
  northDeg: 35,
  cameraFov: 46,
};

export function createEmptyArchHouseData(): ArchHouseData {
  return {
    walls: [],
    openings: [],
    roomMetas: [],
    stairs: [],
    roofs: [],
    sun: { ...DEFAULT_SUN_ENVIRONMENT },
  };
}

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  objectMagnet: true,
  modularSocket: true,
  magnetStrength: 'normal',
  alignment: true,
  grid: true,
  gridStep: 0.25,
  heightSnap: false,
  heightStep: 0.5,
  rotationSnapDeg: 15,
};

export const DEFAULT_TERRAIN_SCULPT_SETTINGS: TerrainSculptSettings = {
  active: false,
  tool: 'raise',
  radius: 2.5,
  strength: 0.45,
  flattenHeight: 0,
};

export const DEFAULT_REPEAT_ARRAY_CONFIG: RepeatArrayConfig = {
  mode: 'linear',
  count: 4,
  countZ: 3,
  axis: '+x',
  spacingMode: 'flush',
  stepDistance: 1.5,
  stepDistanceZ: 1.5,
  stepElevationY: 0,
  rotationStepYDeg: 0,
  radius: 3.0,
  fullAngleDeg: 360,
  followTerrain: true,
  groupResult: true,
};

export function createDefaultBuildingFloors(lang: AppLanguage = 'id'): BuildingFloorLayer[] {
  const f1 = lang === 'ja' ? '1階' : lang === 'en' ? 'Floor 1' : 'Lantai 1';
  const f2 = lang === 'ja' ? '2階' : lang === 'en' ? 'Floor 2' : 'Lantai 2';
  const roof = lang === 'ja' ? '屋上・屋根' : lang === 'en' ? 'Roof Level' : 'Atap';
  return [
    { id: 'floor_1', name: f1, elevation: 0, height: 3.0, visible: true },
    { id: 'floor_2', name: f2, elevation: 3.0, height: 3.0, visible: true },
    { id: 'floor_roof', name: roof, elevation: 6.0, height: 2.6, visible: true },
  ];
}

export const DEFAULT_BUILDING_FLOORS: BuildingFloorLayer[] =
  createDefaultBuildingFloors('id');

export const MAGNET_RADIUS_MAP: Record<MagnetStrength, number> = {
  subtle: 0.12,
  normal: 0.22,
  strong: 0.36,
};

export const MATERIAL_PRESETS: MaterialPreset[] = [
  { id: 'plaster', label: 'Dinding Putih', labelEn: 'White Wall', labelJa: 'ホワイト壁', color: '#e5e7eb', roughness: 0.78, metalness: 0.04 },
  { id: 'concrete', label: 'Beton Ekspos', labelEn: 'Raw Concrete', labelJa: 'コンクリート', color: '#94a3b8', roughness: 0.85, metalness: 0.06 },
  { id: 'terracotta', label: 'Atap Terakota', labelEn: 'Terracotta Roof', labelJa: 'テラコッタ屋根', color: '#d96b43', roughness: 0.68, metalness: 0.05 },
  { id: 'wood-oak', label: 'Kayu Jati', labelEn: 'Warm Teak Wood', labelJa: 'チーク木材', color: '#b77946', roughness: 0.58, metalness: 0.06 },
  { id: 'marble', label: 'Marmer Krem', labelEn: 'Cream Marble', labelJa: 'クリーム大理石', color: '#f3efe6', roughness: 0.22, metalness: 0.08 },
  { id: 'slate', label: 'Batu Alam', labelEn: 'Dark Slate', labelJa: '天然スレート石', color: '#475569', roughness: 0.72, metalness: 0.12 },
  { id: 'steel', label: 'Baja / Krom', labelEn: 'Brushed Steel', labelJa: 'スチール金属', color: '#cbd5e1', roughness: 0.2, metalness: 0.88 },
  { id: 'gold', label: 'Kuningan / Emas', labelEn: 'Warm Brass', labelJa: '真鍮・ゴールド', color: '#eab308', roughness: 0.25, metalness: 0.85 },
  { id: 'glass-tint', label: 'Kaca Jendela', labelEn: 'Clear Glass', labelJa: '窓ガラス', color: '#7dd3fc', roughness: 0.08, metalness: 0.15, opacity: 0.42 },
  { id: 'frosted-glass', label: 'Kaca Buram', labelEn: 'Frosted Glass', labelJa: 'すりガラス', color: '#e0f2fe', roughness: 0.45, metalness: 0.05, opacity: 0.62 },
  { id: 'warm-lamp', label: 'Lampu Hangat', labelEn: 'Warm Lamp', labelJa: '暖色ライト', color: '#fef08a', roughness: 0.3, metalness: 0.0, emissive: '#f59e0b', emissiveIntensity: 0.95 },
  { id: 'foliage', label: 'Hijau Taman', labelEn: 'Garden Green', labelJa: 'ガーデングリーン', color: '#4ade80', roughness: 0.75, metalness: 0.04 },
];
