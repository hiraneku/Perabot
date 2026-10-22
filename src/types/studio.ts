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
}

export interface SnapSettings {
  enabled: boolean;
  objectMagnet: boolean;
  magnetStrength: MagnetStrength;
  alignment: boolean;
  grid: boolean;
  gridStep: number;
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
  subdivision: ObjectSubdivisionSettings;
  visible: boolean;
  groupId?: string | null;
  groupName?: string;
  archRole?: ArchitecturalRole;
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
  subdivision: ObjectSubdivisionSettings;
  archRole?: ArchitecturalRole;
  modelAssetId?: string;
  modelFormat?: string;
  modelThumbUrl?: string;
  useCustomMaterial?: boolean;
}

export interface CustomAssetRecord {
  id: string;
  name: string;
  thumbnailDataUrl: string;
  createdAt: number;
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
};

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  visible: true,
  style: 'wire',
  spacing: 1.0,
  subdivisions: 4,
  worldSize: 40,
  elevationY: 0,
  opacity: 0.88,
  showAxes: true,
  syncSnap: true,
  showRuler: true,
  showSelectionFootprint: true,
  verticalGrid: 'none',
  showPlotBoundary: false,
  plotWidth: 8,
  plotDepth: 12,
  terrainPreset: 'hills',
  terrainAmplitude: 1.4,
};

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  objectMagnet: true,
  magnetStrength: 'normal',
  alignment: true,
  grid: true,
  gridStep: 0.25,
  rotationSnapDeg: 15,
};

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
