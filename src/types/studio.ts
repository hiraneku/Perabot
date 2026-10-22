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

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';

export type PaintInteractionMode = 'none' | 'eyedropper' | 'bucket';

export type TransformSpace = 'world' | 'local';

export type MagnetStrength = 'subtle' | 'normal' | 'strong';

export type RotationSnapStep = 0 | 5 | 15 | 45 | 90;

export type SurfaceConformMode =
  | 'align-normal' // Align attach axis perpendicular to target surface/terrain normal
  | 'upright-follow' // Keep upright (world Y) while riding surface/terrain height
  | 'foundation-seat'; // Keep upright and seat lowest base corner into sloped terrain/surface

export type SurfaceAttachAxis = '-y' | '-z' | '+y';

export interface SurfaceSettings {
  enabled: boolean;
  conformMode: SurfaceConformMode;
  attachAxis: SurfaceAttachAxis;
  autoOnMove: boolean; // Automatically project onto surfaces/terrain while moving XZ or dragging object
  clickToPlace: boolean; // Click any surface face on scene/terrain to place & align selected object
  spinDeg: number; // Rotation around surface normal (-180..180)
  offset: number; // Offset along surface normal (-0.25..0.5m)
}

export type SubdivisionMode = 'smooth' | 'simple';

export interface ObjectSubdivisionSettings {
  level: 0 | 1 | 2 | 3;
  mode: SubdivisionMode;
  crease: number; // 0..1 (0 = full organic rounding, 1 = preserve sharp edges)
  lockBase: boolean; // Keep bottom contact plane flat when smoothing
  wireframe: boolean; // Show subdivided polygon mesh overlay
}

export interface SubdivisionStats {
  baseTriangles: number;
  subdivTriangles: number;
  vertexCount: number;
  capped: boolean;
}

export type GridStyle = 'wire' | 'tile' | 'blueprint' | 'terrain';

export type TerrainPreset = 'hills' | 'valley' | 'terraced' | 'flat';

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

export const DEFAULT_SUBDIVISION_SETTINGS: ObjectSubdivisionSettings = {
  level: 0,
  mode: 'smooth',
  crease: 0.35,
  lockBase: false,
  wireframe: false,
};

export const DEFAULT_SURFACE_SETTINGS: SurfaceSettings = {
  enabled: false,
  conformMode: 'align-normal',
  attachAxis: '-y',
  autoOnMove: true,
  clickToPlace: false,
  spinDeg: 0,
  offset: 0,
};

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  visible: true,
  style: 'wire',
  spacing: 1.0,
  subdivisions: 2,
  worldSize: 40,
  elevationY: 0,
  opacity: 0.85,
  showAxes: true,
  syncSnap: false,
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
  { id: 'plaster', label: 'Dinding Putih', color: '#e5e7eb', roughness: 0.78, metalness: 0.04 },
  { id: 'concrete', label: 'Beton Ekspos', color: '#94a3b8', roughness: 0.85, metalness: 0.06 },
  { id: 'terracotta', label: 'Atap Terakota', color: '#d96b43', roughness: 0.68, metalness: 0.05 },
  { id: 'wood-oak', label: 'Kayu Jati', color: '#b77946', roughness: 0.58, metalness: 0.06 },
  { id: 'marble', label: 'Marmer Krem', color: '#f3efe6', roughness: 0.22, metalness: 0.08 },
  { id: 'slate', label: 'Batu Alam', color: '#475569', roughness: 0.72, metalness: 0.12 },
  { id: 'steel', label: 'Baja / Krom', color: '#cbd5e1', roughness: 0.2, metalness: 0.88 },
  { id: 'gold', label: 'Kuningan / Emas', color: '#eab308', roughness: 0.25, metalness: 0.85 },
  { id: 'glass-tint', label: 'Kaca Jendela', color: '#7dd3fc', roughness: 0.08, metalness: 0.15, opacity: 0.42 },
  { id: 'frosted-glass', label: 'Kaca Buram', color: '#e0f2fe', roughness: 0.45, metalness: 0.05, opacity: 0.62 },
  { id: 'warm-lamp', label: 'Lampu Hangat', color: '#fef08a', roughness: 0.3, metalness: 0.0, emissive: '#f59e0b', emissiveIntensity: 0.95 },
  { id: 'foliage', label: 'Hijau Taman', color: '#4ade80', roughness: 0.75, metalness: 0.04 },
];
