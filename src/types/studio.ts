export type PrimitiveKind = 'cube' | 'triangle' | 'cylinder';

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';

export type TransformSpace = 'world' | 'local';

export type MagnetStrength = 'subtle' | 'normal' | 'strong';

export type RotationSnapStep = 0 | 5 | 15 | 45 | 90;

export interface SnapSettings {
  enabled: boolean; // Master Smart Snap switch
  /**
   * Unified Object Magnet: combines Magnetic Surface Contact + Edge/Corner Snap + Proximity Pull
   * so nearby blocks lock flush together seamlessly without gaps.
   */
  objectMagnet: boolean;
  magnetStrength: MagnetStrength;
  /**
   * Distant Alignment Guides: aligns centers/edges across the room with laser guide lines.
   */
  alignment: boolean;
  /**
   * Floor Grid Snap: steps movement & scale to meter grid increments in open space.
   */
  grid: boolean;
  gridStep: number; // 0.1 | 0.25 | 0.5 | 1.0 (meters)
  /**
   * Controlled Rotation Angle Snap step in degrees (0 = free smooth).
   */
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
  mode: 'translate' | 'rotate' | 'scale';
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  deltaAngleDeg?: number;
  snapLabel?: string | null;
}

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
  { id: 'slate', label: 'Batu Alam', color: '#475569', roughness: 0.72, metalness: 0.12 },
  { id: 'steel', label: 'Baja / Logam', color: '#cbd5e1', roughness: 0.26, metalness: 0.82 },
  { id: 'glass-tint', label: 'Biru Kaca', color: '#60a5fa', roughness: 0.16, metalness: 0.25 },
  { id: 'foliage', label: 'Hijau Taman', color: '#4ade80', roughness: 0.75, metalness: 0.04 },
];
