import * as THREE from 'three';
import { PrimitiveKind } from '../types/studio';

/**
 * Builds a clean 1m x 1m x 1m Triangular Prism (Prisma Segitiga / Atap)
 * centered at (0, 0, 0) with a flat 1x1 base at y = -0.5 and ridge at y = +0.5.
 * Matches a 1x1x1 Cube footprint seamlessly for building roofs, ramps, and wedges.
 */
export function createTriangularPrismGeometry(): THREE.BufferGeometry {
  const fbl = [-0.5, -0.5, 0.5] as const;
  const fbr = [0.5, -0.5, 0.5] as const;
  const ft = [0.0, 0.5, 0.5] as const;

  const bbl = [-0.5, -0.5, -0.5] as const;
  const bbr = [0.5, -0.5, -0.5] as const;
  const bt = [0.0, 0.5, -0.5] as const;

  // Non-indexed per-face triangles for crisp architectural normals & clean glTF export
  const positions = new Float32Array([
    // Front triangle (+Z)
    ...fbl, ...fbr, ...ft,
    // Back triangle (-Z)
    ...bbr, ...bbl, ...bt,
    // Bottom quad (-Y)
    ...bbl, ...bbr, ...fbr,
    ...bbl, ...fbr, ...fbl,
    // Right slope (+X, +Y)
    ...fbr, ...bbr, ...bt,
    ...fbr, ...bt, ...ft,
    // Left slope (-X, +Y)
    ...bbl, ...fbl, ...ft,
    ...bbl, ...ft, ...bt,
  ]);

  const uvs = new Float32Array([
    // Front triangle
    0, 0, 1, 0, 0.5, 1,
    // Back triangle
    0, 0, 1, 0, 0.5, 1,
    // Bottom
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1,
    // Right slope
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1,
    // Left slope
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

export function createPrimitiveGeometry(kind: PrimitiveKind): THREE.BufferGeometry {
  switch (kind) {
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'triangle':
      return createTriangularPrismGeometry();
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
  }
}

export const PRIMITIVE_META: Record<
  PrimitiveKind,
  {
    label: string;
    subtitle: string;
    defaultColor: string;
    roughness: number;
    metalness: number;
  }
> = {
  cube: {
    label: 'Kubus',
    subtitle: 'Dinding, lantai & balok',
    defaultColor: '#e2e8f0',
    roughness: 0.72,
    metalness: 0.05,
  },
  triangle: {
    label: 'Segitiga',
    subtitle: 'Atap & prisma sudut',
    defaultColor: '#e07a54',
    roughness: 0.68,
    metalness: 0.05,
  },
  cylinder: {
    label: 'Silinder',
    subtitle: 'Tiang, pilar & tabung',
    defaultColor: '#94a3b8',
    roughness: 0.55,
    metalness: 0.12,
  },
};
