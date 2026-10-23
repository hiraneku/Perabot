import * as THREE from 'three';
import {
  DEFAULT_MODIFIER_SETTINGS,
  isModifierActive,
  ObjectModifierSettings,
} from '../types/studio';

export function normalizeModifierSettings(
  raw?: Partial<ObjectModifierSettings>
): ObjectModifierSettings {
  if (!raw) return { ...DEFAULT_MODIFIER_SETTINGS };
  return {
    bevel: Math.max(0, Math.min(0.45, Number(raw.bevel) || 0)),
    taperX: Math.max(-0.75, Math.min(0.75, Number(raw.taperX) || 0)),
    taperZ: Math.max(-0.75, Math.min(0.75, Number(raw.taperZ) || 0)),
    mirrorX: Boolean(raw.mirrorX),
    mirrorZ: Boolean(raw.mirrorZ),
    mirrorOffset: Math.max(0.2, Math.min(8.0, Number(raw.mirrorOffset) || 1.2)),
  };
}

/**
 * Subdivides each triangle into 4 coplanar sub-triangles (1 midpoint split per edge)
 * so low-poly primitives gain smooth edge loops for Rounded Bevel / Cushion deformation.
 */
function tessellateOnce(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIdx = src.index ? src.toNonIndexed() : src.clone();
  const pos = nonIdx.getAttribute('position');
  const uv = nonIdx.getAttribute('uv');
  const triCount = Math.floor(pos.count / 3);

  const outPos = new Float32Array(triCount * 12 * 3);
  const outUv = uv ? new Float32Array(triCount * 12 * 2) : null;

  let pOff = 0;
  let uOff = 0;

  const pushVert = (
    px: number,
    py: number,
    pz: number,
    ux = 0,
    uy = 0
  ) => {
    outPos[pOff++] = px;
    outPos[pOff++] = py;
    outPos[pOff++] = pz;
    if (outUv) {
      outUv[uOff++] = ux;
      outUv[uOff++] = uy;
    }
  };

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const i1 = i0 + 1;
    const i2 = i0 + 2;

    const ax = pos.getX(i0), ay = pos.getY(i0), az = pos.getZ(i0);
    const bx = pos.getX(i1), by = pos.getY(i1), bz = pos.getZ(i1);
    const cx = pos.getX(i2), cy = pos.getY(i2), cz = pos.getZ(i2);

    const abx = (ax + bx) * 0.5, aby = (ay + by) * 0.5, abz = (az + bz) * 0.5;
    const bcx = (bx + cx) * 0.5, bcy = (by + cy) * 0.5, bcz = (bz + cz) * 0.5;
    const cax = (cx + ax) * 0.5, cay = (cy + ay) * 0.5, caz = (cz + az) * 0.5;

    const u0x = uv ? uv.getX(i0) : 0, u0y = uv ? uv.getY(i0) : 0;
    const u1x = uv ? uv.getX(i1) : 0, u1y = uv ? uv.getY(i1) : 0;
    const u2x = uv ? uv.getX(i2) : 0, u2y = uv ? uv.getY(i2) : 0;

    const uabx = (u0x + u1x) * 0.5, uaby = (u0y + u1y) * 0.5;
    const ubcx = (u1x + u2x) * 0.5, ubcy = (u1y + u2y) * 0.5;
    const ucax = (u2x + u0x) * 0.5, ucay = (u2y + u0y) * 0.5;

    // 4 CCW sub-triangles preserving exact winding
    pushVert(ax, ay, az, u0x, u0y);
    pushVert(abx, aby, abz, uabx, uaby);
    pushVert(cax, cay, caz, ucax, ucay);

    pushVert(abx, aby, abz, uabx, uaby);
    pushVert(bx, by, bz, u1x, u1y);
    pushVert(bcx, bcy, bcz, ubcx, ubcy);

    pushVert(cax, cay, caz, ucax, ucay);
    pushVert(bcx, bcy, bcz, ubcx, ubcy);
    pushVert(cx, cy, cz, u2x, u2y);

    pushVert(abx, aby, abz, uabx, uaby);
    pushVert(bcx, bcy, bcz, ubcx, ubcy);
    pushVert(cax, cay, caz, ucax, ucay);
  }

  if (src.index) nonIdx.dispose();

  const res = new THREE.BufferGeometry();
  res.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
  if (outUv) {
    res.setAttribute('uv', new THREE.BufferAttribute(outUv, 2));
  }
  return res;
}

/**
 * Computes welded smooth vertex normals across coincident corner vertices so beveled edges look silky smooth.
 */
function computeWeldedSmoothNormals(geo: THREE.BufferGeometry): void {
  geo.computeVertexNormals();
  const pos = geo.getAttribute('position');
  const norm = geo.getAttribute('normal');
  if (!pos || !norm) return;

  const accum = new Map<string, [number, number, number]>();
  const keys = new Array<string>(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const kx = Math.round(pos.getX(i) * 2000);
    const ky = Math.round(pos.getY(i) * 2000);
    const kz = Math.round(pos.getZ(i) * 2000);
    const key = `${kx}:${ky}:${kz}`;
    keys[i] = key;
    const cur = accum.get(key);
    if (cur) {
      cur[0] += norm.getX(i);
      cur[1] += norm.getY(i);
      cur[2] += norm.getZ(i);
    } else {
      accum.set(key, [norm.getX(i), norm.getY(i), norm.getZ(i)]);
    }
  }

  for (let i = 0; i < pos.count; i++) {
    const sum = accum.get(keys[i])!;
    const len = Math.hypot(sum[0], sum[1], sum[2]);
    if (len > 1e-6) {
      norm.setXYZ(i, sum[0] / len, sum[1] / len, sum[2] / len);
    }
  }
  norm.needsUpdate = true;
}

/**
 * Applies Bevel (smooth cushion/edge rounding) and X/Z Taper deformation non-destructively.
 */
export function applyGeometryDeformModifiers(
  inputGeo: THREE.BufferGeometry,
  rawMod?: ObjectModifierSettings
): THREE.BufferGeometry {
  const mod = normalizeModifierSettings(rawMod);
  const hasBevel = mod.bevel > 0.005;
  const hasTaper =
    Math.abs(mod.taperX) > 0.005 || Math.abs(mod.taperZ) > 0.005;

  if (!hasBevel && !hasTaper) {
    return inputGeo;
  }

  let working = inputGeo.clone();

  // Ensure sufficient edge density when rounding corners on low-poly primitives
  if (hasBevel) {
    const vCount = working.getAttribute('position')?.count ?? 0;
    if (vCount > 0 && vCount <= 180) {
      const t1 = tessellateOnce(working);
      working.dispose();
      const t2 = tessellateOnce(t1);
      t1.dispose();
      working = t2;
    } else if (vCount > 180 && vCount <= 720) {
      const t1 = tessellateOnce(working);
      working.dispose();
      working = t1;
    }
  }

  working.computeBoundingBox();
  const bb = working.boundingBox!;
  const cx = (bb.min.x + bb.max.x) * 0.5;
  const cy = (bb.min.y + bb.max.y) * 0.5;
  const cz = (bb.min.z + bb.max.z) * 0.5;
  const hx = Math.max(0.001, (bb.max.x - bb.min.x) * 0.5);
  const hy = Math.max(0.001, (bb.max.y - bb.min.y) * 0.5);
  const hz = Math.max(0.001, (bb.max.z - bb.min.z) * 0.5);
  const spanY = Math.max(0.001, bb.max.y - bb.min.y);

  const pos = working.getAttribute('position');

  // 1. Smooth Rounded-Box Fillet / Cushion Bevel
  if (hasBevel) {
    const minHalf = Math.min(hx, hy, hz);
    const radius = Math.min(minHalf * 0.94, mod.bevel * 2.0 * minHalf);
    const ix = Math.max(0, hx - radius);
    const iy = Math.max(0, hy - radius);
    const iz = Math.max(0, hz - radius);

    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i) - cx;
      const py = pos.getY(i) - cy;
      const pz = pos.getZ(i) - cz;

      const qx = Math.max(-ix, Math.min(ix, px));
      const qy = Math.max(-iy, Math.min(iy, py));
      const qz = Math.max(-iz, Math.min(iz, pz));

      const dx = px - qx;
      const dy = py - qy;
      const dz = pz - qz;
      const dist = Math.hypot(dx, dy, dz);

      if (dist > radius && dist > 1e-6) {
        const scale = radius / dist;
        pos.setXYZ(
          i,
          cx + qx + dx * scale,
          cy + qy + dy * scale,
          cz + qz + dz * scale
        );
      }
    }
  }

  // 2. Vertical Profile Taper (X & Z)
  if (hasTaper) {
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i) - cx;
      const vy = pos.getY(i);
      const vz = pos.getZ(i) - cz;
      const tY = Math.max(0, Math.min(1, (vy - bb.min.y) / spanY)); // 0 bottom .. 1 top

      const factorX =
        mod.taperX >= 0
          ? 1 - mod.taperX * tY
          : 1 - Math.abs(mod.taperX) * (1 - tY);
      const factorZ =
        mod.taperZ >= 0
          ? 1 - mod.taperZ * tY
          : 1 - Math.abs(mod.taperZ) * (1 - tY);

      pos.setXYZ(i, cx + vx * factorX, vy, cz + vz * factorZ);
    }
  }

  pos.needsUpdate = true;
  if (hasBevel) {
    computeWeldedSmoothNormals(working);
  } else {
    working.computeVertexNormals();
  }
  working.computeBoundingBox();
  working.computeBoundingSphere();

  inputGeo.dispose();
  return working;
}

/**
 * Attaches or updates live symmetric Mirror X / Z twin child meshes on a parent mesh.
 */
export function syncMeshMirrorTwins(
  mesh: THREE.Mesh,
  rawMod: ObjectModifierSettings | undefined,
  material: THREE.Material
): void {
  const toRemove: THREE.Object3D[] = [];
  for (const ch of mesh.children) {
    if (ch.name.startsWith('__mirrorTwin_')) {
      toRemove.push(ch);
    }
  }
  for (const ch of toRemove) {
    mesh.remove(ch);
  }

  const mod = normalizeModifierSettings(rawMod);
  if (!mod.mirrorX && !mod.mirrorZ) return;

  const sx = Math.max(0.01, Math.abs(mesh.scale.x));
  const sz = Math.max(0.01, Math.abs(mesh.scale.z));
  const localOffX = mod.mirrorOffset / sx;
  const localOffZ = mod.mirrorOffset / sz;

  const offsets: Array<{ tag: string; lx: number; lz: number }> = [];
  if (mod.mirrorX) {
    offsets.push({ tag: 'X', lx: localOffX, lz: 0 });
  }
  if (mod.mirrorZ) {
    offsets.push({ tag: 'Z', lx: 0, lz: localOffZ });
  }
  if (mod.mirrorX && mod.mirrorZ) {
    offsets.push({ tag: 'XZ', lx: localOffX, lz: localOffZ });
  }

  for (const off of offsets) {
    const twin = new THREE.Mesh(mesh.geometry, material);
    twin.name = `__mirrorTwin_${off.tag}`;
    twin.position.set(off.lx, 0, off.lz);
    twin.castShadow = mesh.castShadow;
    twin.receiveShadow = mesh.receiveShadow;
    twin.raycast = () => {};
    mesh.add(twin);
  }
}

export { isModifierActive };
