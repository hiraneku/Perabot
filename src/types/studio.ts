export type PrimitiveKind =
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
  | 'beveled-vertical-cylinder';

export type ShapeSubcategory =
  | 'all'
  | 'blocks'
  | 'wedges'
  | 'curved'
  | 'cylinders';

export type TransformMode =
  | 'select'
  | 'translate'
  | 'rotate'
  | 'scale'
  | 'surface';

export type TransformSpace = 'world' | 'local';

export type MagnetStrength = 'subtle' | 'normal' | 'strong';

export type RotationSnapStep = 0 | 5 | 15 | 45 | 90;

export type SurfaceConformMode =
  | 'align-normal' // Align object's Up vector to target surface/terrain normal
  | 'upright-follow' // Keep upright (world Y) while riding surface/terrain height
  | 'foundation-seat'; // Keep upright and seat lowest base corner into sloped terrain

export type GridStyle = 'wire' | 'tile' | 'blueprint' | 'terrain';

export type TerrainPreset = 'hills' | 'valley' | 'terraced' | 'flat';

export interface GridSettings {
  visible: boolean;
  style: GridStyle;
  spacing: number; // Major grid spacing in meters (0.25 .. 4.0)
  subdivisions: number; // 2 | 4 | 5 | 10
  worldSize: number; // 20 | 40 | 80 | 120
  elevationY: number; // Workplane / ground height (-2 .. 10)
  opacity: number; // 0.2 .. 1.0
  showAxes: boolean;
  syncSnap: boolean;
  terrainPreset: TerrainPreset;
  terrainAmplitude: number; // 0.3 .. 4.0 meters
}

export interface SnapSettings {
  enabled: boolean;
  objectMagnet: boolean;
  magnetStrength: MagnetStrength;
  alignment: boolean;
  grid: boolean;
  gridStep: number;
  rotationSnapDeg: RotationSnapStep;
  surfaceConformMode: SurfaceConformMode;
  surfaceOffset: number; // Optional offset along surface normal (default 0)
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
  visible: boolean;
}

export interface DragFeedback {
  active: boolean;
  axis: string | null;
  mode: TransformMode;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  deltaAngleDeg?: number;
  snapLabel?: string | null;
}

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
  surfaceConformMode: 'align-normal',
  surfaceOffset: 0,
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
  { id: 'slate', label: 'Batu Alam', color: '#475569', roughness: 0.72, metalness: 0.12 },
  { id: 'steel', label: 'Baja / Logam', color: '#cbd5e1', roughness: 0.26, metalness: 0.82 },
  { id: 'glass-tint', label: 'Biru Kaca', color: '#60a5fa', roughness: 0.16, metalness: 0.25 },
  { id: 'foliage', label: 'Hijau Taman', color: '#4ade80', roughness: 0.75, metalness: 0.04 },
];
