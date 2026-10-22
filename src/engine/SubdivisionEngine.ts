import * as THREE from 'three';
import {
  ObjectSubdivisionSettings,
  SubdivisionStats,
} from '../types/studio';

const MAX_SUBDIV_TRIANGLES = 42000;

interface IndexedMesh {
  positions: Float32Array; // length = numVerts * 3
  indices: Uint32Array; // length = numTris * 3
  minY: number;
}

/**
 * Welds coincident vertices by spatial quantization into a watertight indexed mesh.
 */
function weldToIndexedMesh(geo: THREE.BufferGeometry): IndexedMesh {
  const posAttr = geo.getAttribute('position');
  const idxAttr = geo.getIndex();

  const vertMap = new Map<string, number>();
  const weldedPos: number[] = [];
  const rawVertexCount = idxAttr ? idxAttr.count : posAttr.count;
  const outIndices = new Uint32Array(rawVertexCount);
  let minY = Infinity;

  const getOrCreateVert = (rawIdx: number): number => {
    const x = posAttr.getX(rawIdx);
    const y = posAttr.getY(rawIdx);
    const z = posAttr.getZ(rawIdx);
    if (y < minY) minY = y;
    const key = `${Math.round(x * 100000)},${Math.round(y * 100000)},${Math.round(
      z * 100000
    )}`;
    const existing = vertMap.get(key);
    if (existing !== undefined) return existing;
    const nextId = weldedPos.length / 3;
    weldedPos.push(x, y, z);
    vertMap.set(key, nextId);
    return nextId;
  };

  let writePtr = 0;
  for (let i = 0; i < rawVertexCount; i += 3) {
    const i0 = getOrCreateVert(idxAttr ? idxAttr.getX(i) : i);
    const i1 = getOrCreateVert(idxAttr ? idxAttr.getX(i + 1) : i + 1);
    const i2 = getOrCreateVert(idxAttr ? idxAttr.getX(i + 2) : i + 2);
    if (i0 === i1 || i1 === i2 || i2 === i0) continue;
    outIndices[writePtr++] = i0;
    outIndices[writePtr++] = i1;
    outIndices[writePtr++] = i2;
  }

  return {
    positions: new Float32Array(weldedPos),
    indices: outIndices.slice(0, writePtr),
    minY: Number.isFinite(minY) ? minY : -0.5,
  };
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

interface EdgeInfo {
  u: number;
  v: number;
  faces: number[];
  opposites: number[];
  isSharp: boolean;
}

/**
 * Performs 1 step of 1-to-4 subdivision (either Simple linear midpoint or
 * Crease-Aware Charles Loop Smooth Subdivision).
 */
function subdivideStep(
  mesh: IndexedMesh,
  smooth: boolean,
  crease: number,
  lockBase: boolean
): IndexedMesh {
  const { positions, indices, minY } = mesh;
  const numVerts = positions.length / 3;
  const numTris = indices.length / 3;

  // Compute face normals for dihedral crease detection
  const faceNormals = new Float32Array(numTris * 3);
  for (let f = 0; f < numTris; f++) {
    const i0 = indices[f * 3] * 3;
    const i1 = indices[f * 3 + 1] * 3;
    const i2 = indices[f * 3 + 2] * 3;

    const abx = positions[i1] - positions[i0];
    const aby = positions[i1 + 1] - positions[i0 + 1];
    const abz = positions[i1 + 2] - positions[i0 + 2];

    const acx = positions[i2] - positions[i0];
    const acy = positions[i2 + 1] - positions[i0 + 1];
    const acz = positions[i2 + 2] - positions[i0 + 2];

    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz) || 1;
    faceNormals[f * 3] = nx / len;
    faceNormals[f * 3 + 1] = ny / len;
    faceNormals[f * 3 + 2] = nz / len;
  }

  // Build unique edge table + vertex adjacency
  const edgeMap = new Map<string, EdgeInfo>();
  const neighbors: Array<Set<number>> = Array.from(
    { length: numVerts },
    () => new Set<number>()
  );

  for (let f = 0; f < numTris; f++) {
    const v0 = indices[f * 3];
    const v1 = indices[f * 3 + 1];
    const v2 = indices[f * 3 + 2];

    neighbors[v0].add(v1);
    neighbors[v0].add(v2);
    neighbors[v1].add(v0);
    neighbors[v1].add(v2);
    neighbors[v2].add(v0);
    neighbors[v2].add(v1);

    const triEdges: Array<[number, number, number]> = [
      [v0, v1, v2],
      [v1, v2, v0],
      [v2, v0, v1],
    ];

    for (const [a, b, opp] of triEdges) {
      const k = edgeKey(a, b);
      let info = edgeMap.get(k);
      if (!info) {
        info = {
          u: Math.min(a, b),
          v: Math.max(a, b),
          faces: [f],
          opposites: [opp],
          isSharp: false,
        };
        edgeMap.set(k, info);
      } else {
        info.faces.push(f);
        info.opposites.push(opp);
      }
    }
  }

  // Determine sharp crease edges based on dihedral angle & crease slider
  // crease = 0 -> no dihedral creases (pure organic smooth);
  // crease >= 0.55 -> 90-degree edges lock crisp; crease = 1.0 -> >= 18-degree edges lock crisp
  const enableHardCrease = smooth && crease >= 0.55;
  const maxSharpAngleDeg = 165 - crease * 147; // at 0.55 -> ~84 deg (locks 90 deg!), at 1.0 -> 18 deg
  const cosThreshold = Math.cos((maxSharpAngleDeg * Math.PI) / 180);

  // Continuous semi-sharp blend factor (0 = full Loop smooth, 1 = linear sharp)
  const semiSharpBlend = smooth ? Math.pow(Math.max(0, Math.min(1, crease)), 1.6) * 0.72 : 1;

  const sharpNeighbors: Array<number[]> = Array.from({ length: numVerts }, () => []);

  for (const info of edgeMap.values()) {
    if (info.faces.length !== 2) {
      // Open boundary edge is always treated as a crease
      info.isSharp = true;
    } else if (enableHardCrease) {
      const fA = info.faces[0] * 3;
      const fB = info.faces[1] * 3;
      const dot =
        faceNormals[fA] * faceNormals[fB] +
        faceNormals[fA + 1] * faceNormals[fB + 1] +
        faceNormals[fA + 2] * faceNormals[fB + 2];
      if (dot < cosThreshold) {
        info.isSharp = true;
      }
    }

    // Lock base perimeter as sharp when lockBase is active
    if (
      lockBase &&
      Math.abs(positions[info.u * 3 + 1] - minY) < 0.008 &&
      Math.abs(positions[info.v * 3 + 1] - minY) < 0.008 &&
      info.faces.length === 2
    ) {
      const fA = info.faces[0] * 3;
      const fB = info.faces[1] * 3;
      const dot =
        faceNormals[fA] * faceNormals[fB] +
        faceNormals[fA + 1] * faceNormals[fB + 1] +
        faceNormals[fA + 2] * faceNormals[fB + 2];
      if (dot < 0.65) {
        info.isSharp = true;
      }
    }

    if (info.isSharp) {
      sharpNeighbors[info.u].push(info.v);
      sharpNeighbors[info.v].push(info.u);
    }
  }

  const totalOutVerts = numVerts + edgeMap.size;
  const nextPositions = new Float32Array(totalOutVerts * 3);

  // 1. Update EVEN (existing) vertices
  for (let v = 0; v < numVerts; v++) {
    const px = positions[v * 3];
    const py = positions[v * 3 + 1];
    const pz = positions[v * 3 + 2];

    if (!smooth) {
      nextPositions[v * 3] = px;
      nextPositions[v * 3 + 1] = py;
      nextPositions[v * 3 + 2] = pz;
      continue;
    }

    const sNbrs = sharpNeighbors[v];
    let sx = px;
    let sy = py;
    let sz = pz;

    if (sNbrs.length >= 3) {
      // Corner vertex where >= 3 sharp creases meet -> pinned
      sx = px;
      sy = py;
      sz = pz;
    } else if (sNbrs.length === 2) {
      // Crease rib rule: 3/4 * v + 1/8 * (c0 + c1)
      const c0 = sNbrs[0] * 3;
      const c1 = sNbrs[1] * 3;
      sx = 0.75 * px + 0.125 * (positions[c0] + positions[c1]);
      sy = 0.75 * py + 0.125 * (positions[c0 + 1] + positions[c1 + 1]);
      sz = 0.75 * pz + 0.125 * (positions[c0 + 2] + positions[c1 + 2]);
    } else {
      const nbrSet = neighbors[v];
      const k = nbrSet.size;
      if (k > 0) {
        const beta = k === 3 ? 3 / 16 : 3 / (8 * k);
        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;
        for (const nb of nbrSet) {
          sumX += positions[nb * 3];
          sumY += positions[nb * 3 + 1];
          sumZ += positions[nb * 3 + 2];
        }
        const loopX = (1 - k * beta) * px + beta * sumX;
        const loopY = (1 - k * beta) * py + beta * sumY;
        const loopZ = (1 - k * beta) * pz + beta * sumZ;

        sx = loopX + (px - loopX) * semiSharpBlend;
        sy = loopY + (py - loopY) * semiSharpBlend;
        sz = loopZ + (pz - loopZ) * semiSharpBlend;
      }
    }

    if (lockBase && Math.abs(py - minY) < 0.008) {
      sy = minY;
    }

    nextPositions[v * 3] = sx;
    nextPositions[v * 3 + 1] = sy;
    nextPositions[v * 3 + 2] = sz;
  }

  // 2. Compute ODD (edge midpoint) vertices
  const edgeMidIndex = new Map<string, number>();
  let nextVertCursor = numVerts;

  for (const [k, info] of edgeMap.entries()) {
    const midIdx = nextVertCursor++;
    edgeMidIndex.set(k, midIdx);

    const u3 = info.u * 3;
    const v3 = info.v * 3;
    const linX = 0.5 * (positions[u3] + positions[v3]);
    const linY = 0.5 * (positions[u3 + 1] + positions[v3 + 1]);
    const linZ = 0.5 * (positions[u3 + 2] + positions[v3 + 2]);

    let mx = linX;
    let my = linY;
    let mz = linZ;

    if (smooth && !info.isSharp && info.opposites.length === 2) {
      const o0 = info.opposites[0] * 3;
      const o1 = info.opposites[1] * 3;
      const loopX =
        0.375 * (positions[u3] + positions[v3]) +
        0.125 * (positions[o0] + positions[o1]);
      const loopY =
        0.375 * (positions[u3 + 1] + positions[v3 + 1]) +
        0.125 * (positions[o0 + 1] + positions[o1 + 1]);
      const loopZ =
        0.375 * (positions[u3 + 2] + positions[v3 + 2]) +
        0.125 * (positions[o0 + 2] + positions[o1 + 2]);

      mx = loopX + (linX - loopX) * semiSharpBlend;
      my = loopY + (linY - loopY) * semiSharpBlend;
      mz = loopZ + (linZ - loopZ) * semiSharpBlend;
    }

    if (
      lockBase &&
      Math.abs(positions[u3 + 1] - minY) < 0.008 &&
      Math.abs(positions[v3 + 1] - minY) < 0.008
    ) {
      my = minY;
    }

    nextPositions[midIdx * 3] = mx;
    nextPositions[midIdx * 3 + 1] = my;
    nextPositions[midIdx * 3 + 2] = mz;
  }

  // 3. Emit 4 sub-triangles per input triangle preserving winding!
  const nextIndices = new Uint32Array(numTris * 12);
  for (let f = 0; f < numTris; f++) {
    const v0 = indices[f * 3];
    const v1 = indices[f * 3 + 1];
    const v2 = indices[f * 3 + 2];

    const m01 = edgeMidIndex.get(edgeKey(v0, v1))!;
    const m12 = edgeMidIndex.get(edgeKey(v1, v2))!;
    const m20 = edgeMidIndex.get(edgeKey(v2, v0))!;

    const base = f * 12;
    nextIndices[base] = v0;
    nextIndices[base + 1] = m01;
    nextIndices[base + 2] = m20;

    nextIndices[base + 3] = v1;
    nextIndices[base + 4] = m12;
    nextIndices[base + 5] = m01;

    nextIndices[base + 6] = v2;
    nextIndices[base + 7] = m20;
    nextIndices[base + 8] = m12;

    nextIndices[base + 9] = m01;
    nextIndices[base + 10] = m12;
    nextIndices[base + 11] = m20;
  }

  return {
    positions: nextPositions,
    indices: nextIndices,
    minY,
  };
}

/**
 * Converts an IndexedMesh back into a Three.js BufferGeometry with crease-aware normals!
 */
function indexedMeshToBufferGeometry(
  mesh: IndexedMesh,
  smoothNormals: boolean,
  crease: number
): THREE.BufferGeometry {
  const { positions, indices } = mesh;
  const numTris = indices.length / 3;

  if (!smoothNormals) {
    // Crisp flat-shaded normals per triangle
    const outPos = new Float32Array(numTris * 9);
    const outUv = new Float32Array(numTris * 6);
    for (let f = 0; f < numTris; f++) {
      for (let k = 0; k < 3; k++) {
        const vi = indices[f * 3 + k] * 3;
        const dst = f * 9 + k * 3;
        outPos[dst] = positions[vi];
        outPos[dst + 1] = positions[vi + 1];
        outPos[dst + 2] = positions[vi + 2];
        outUv[f * 6 + k * 2] = positions[vi] + 0.5;
        outUv[f * 6 + k * 2 + 1] = positions[vi + 1] + 0.5;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(outUv, 2));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }

  // Smooth normals with optional crease-angle splitting when crease >= 0.55
  if (crease < 0.55) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    const uvs = new Float32Array((positions.length / 3) * 2);
    for (let i = 0; i < positions.length / 3; i++) {
      uvs[i * 2] = positions[i * 3] + 0.5;
      uvs[i * 2 + 1] = positions[i * 3 + 1] + 0.5;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }

  // Crease-angle aware normal computation: average adjacent face normals within crease angle
  const maxSmoothAngleDeg = 165 - crease * 130; // at 0.55 -> 93 deg, at 1.0 -> 35 deg
  const cosSplit = Math.cos((maxSmoothAngleDeg * Math.PI) / 180);

  const faceNormals = new Float32Array(numTris * 3);
  const vertFaces: Array<number[]> = Array.from(
    { length: positions.length / 3 },
    () => []
  );

  for (let f = 0; f < numTris; f++) {
    const v0 = indices[f * 3];
    const v1 = indices[f * 3 + 1];
    const v2 = indices[f * 3 + 2];
    vertFaces[v0].push(f);
    vertFaces[v1].push(f);
    vertFaces[v2].push(f);

    const i0 = v0 * 3;
    const i1 = v1 * 3;
    const i2 = v2 * 3;
    const abx = positions[i1] - positions[i0];
    const aby = positions[i1 + 1] - positions[i0 + 1];
    const abz = positions[i1 + 2] - positions[i0 + 2];
    const acx = positions[i2] - positions[i0];
    const acy = positions[i2 + 1] - positions[i0 + 1];
    const acz = positions[i2 + 2] - positions[i0 + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz) || 1;
    faceNormals[f * 3] = nx / len;
    faceNormals[f * 3 + 1] = ny / len;
    faceNormals[f * 3 + 2] = nz / len;
  }

  const outPos = new Float32Array(numTris * 9);
  const outNorm = new Float32Array(numTris * 9);
  const outUv = new Float32Array(numTris * 6);

  for (let f = 0; f < numTris; f++) {
    const fnx = faceNormals[f * 3];
    const fny = faceNormals[f * 3 + 1];
    const fnz = faceNormals[f * 3 + 2];

    for (let k = 0; k < 3; k++) {
      const vIdx = indices[f * 3 + k];
      const vi = vIdx * 3;
      const dst = f * 9 + k * 3;
      outPos[dst] = positions[vi];
      outPos[dst + 1] = positions[vi + 1];
      outPos[dst + 2] = positions[vi + 2];
      outUv[f * 6 + k * 2] = positions[vi] + 0.5;
      outUv[f * 6 + k * 2 + 1] = positions[vi + 1] + 0.5;

      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (const adjF of vertFaces[vIdx]) {
        const anx = faceNormals[adjF * 3];
        const any = faceNormals[adjF * 3 + 1];
        const anz = faceNormals[adjF * 3 + 2];
        if (fnx * anx + fny * any + fnz * anz >= cosSplit) {
          sx += anx;
          sy += any;
          sz += anz;
        }
      }
      const slen = Math.hypot(sx, sy, sz) || 1;
      outNorm[dst] = sx / slen;
      outNorm[dst + 1] = sy / slen;
      outNorm[dst + 2] = sz / slen;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(outNorm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(outUv, 2));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

export function computeGeometryStats(
  baseGeo: THREE.BufferGeometry,
  currentGeo: THREE.BufferGeometry,
  capped = false
): SubdivisionStats {
  const baseIdx = baseGeo.getIndex();
  const basePos = baseGeo.getAttribute('position');
  const baseTriangles = Math.round(
    (baseIdx ? baseIdx.count : basePos.count) / 3
  );

  const curIdx = currentGeo.getIndex();
  const curPos = currentGeo.getAttribute('position');
  const subdivTriangles = Math.round(
    (curIdx ? curIdx.count : curPos.count) / 3
  );

  return {
    baseTriangles,
    subdivTriangles,
    vertexCount: curPos.count,
    capped,
  };
}

/**
 * Applies non-destructive Subdivision Surface Modifier to a base geometry.
 */
export function buildSubdividedGeometry(
  baseGeo: THREE.BufferGeometry,
  settings: ObjectSubdivisionSettings
): { geometry: THREE.BufferGeometry; stats: SubdivisionStats } {
  if (settings.level <= 0) {
    const cloned = baseGeo.clone();
    cloned.computeBoundingBox();
    cloned.computeBoundingSphere();
    return {
      geometry: cloned,
      stats: computeGeometryStats(baseGeo, cloned, false),
    };
  }

  let current = weldToIndexedMesh(baseGeo);
  const smooth = settings.mode === 'smooth';
  let capped = false;

  for (let step = 0; step < settings.level; step++) {
    const currentTris = current.indices.length / 3;
    if (currentTris * 4 > MAX_SUBDIV_TRIANGLES) {
      capped = true;
      break;
    }
    current = subdivideStep(current, smooth, settings.crease, settings.lockBase);
  }

  const outGeo = indexedMeshToBufferGeometry(current, smooth, settings.crease);
  return {
    geometry: outGeo,
    stats: computeGeometryStats(baseGeo, outGeo, capped),
  };
}
