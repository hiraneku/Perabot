export type PrimitiveKind = 'cube' | 'triangle' | 'cylinder';

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';

export type TransformSpace = 'world' | 'local';

export type ProximityStrength = 'subtle' | 'normal' | 'strong';

export type RotationSnapStep = 0 | 5 | 15 | 45 | 90;

export interface SnapSettings {
  enabled: boolean; // Master Smart Snap switch
  grid: boolean; // Snap to Grid
  gridStep: number; // 0.1 | 0.25 | 0.5 | 1.0 (meters)
  magnetic: boolean; // Surface-to-surface flush contact & floor magnet
  edge: boolean; // Corner vertex & edge midpoint snapping
  alignment: boolean; // Smart alignment guides (center & flush bounds)
  proximity: boolean; // Proximity threshold filtering & magnetic pull
  proximityStrength: ProximityStrength;
  rotationSnapDeg: RotationSnapStep; // Controlled rotation angle step
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
  grid: true,
  gridStep: 0.25,
  magnetic: true,
  edge: true,
  alignment: true,
  proximity: true,
  proximityStrength: 'normal',
  rotationSnapDeg: 15,
};

export const PROXIMITY_RADIUS_MAP: Record<ProximityStrength, number> = {
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
