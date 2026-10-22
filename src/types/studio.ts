export type PrimitiveKind = 'cube' | 'triangle' | 'cylinder';

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';

export type TransformSpace = 'world' | 'local';

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
}

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
