import * as THREE from 'three';
import {
  isSubdivisionActive,
  normalizeSubdivisionSettings,
  ObjectSubdivisionSettings,
  SubdivisionStats,
} from '../types/studio';

const MAX_SLICED_POLYGONS = 28000;
const EPS = 1e-5;

interface Pt3 {
  x: number;
  y: number;
  z: number;
}

function lerpPt(a: Pt3, b: Pt3, t: number): Pt3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/**
 * Splits a convex 3D polygon into two convex polygons along an axis-aligned plane `coord = cutVal`.
 */
function splitPolygonByAxisPlane(
  poly: Pt3[],
  axis: 'x' | 'y' | 'z',
  cutVal: number
): [Pt3[], Pt3[]] {
  const neg: Pt3[] = [];
  const pos: Pt3[] = [];
  const n = poly.length;
  if (n < 3) return [neg, pos];

  for (let i = 0; i < n; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % n];
    const dCur = cur[axis] - cutVal;
    const dNxt = nxt[axis] - cutVal;

    if (dCur <= EPS) neg.push(cur);
    if (dCur >= -EPS) pos.push(cur);

    if ((dCur < -EPS && dNxt > EPS) || (dCur > EPS && dNxt < -EPS)) {
      const t = dCur / (dCur - dNxt);
      const inter = lerpPt(cur, nxt, t);
      inter[axis] = cutVal;
      neg.push(inter);
      pos.push(inter);
    }
  }

  return [
    neg.length >= 3 ? neg : [],
    pos.length >= 3 ? pos : [],
  ];
}

function slicePolygonsAlongAxis(
  polygons: Pt3[][],
  axis: 'x' | 'y' | 'z',
  minVal: number,
  maxVal: number,
  cuts: number
): { polygons: Pt3[][]; cutValues: number[]; capped: boolean } {
  const cutValues: number[] = [];
  const span = maxVal - minVal;
  if (cuts <= 1 || span < 1e-4) {
    return { polygons, cutValues, capped: false };
  }

  for (let k = 1; k < cuts; k++) {
    cutValues.push(minVal + (span * k) / cuts);
  }

  let current = polygons;
  let capped = false;

  for (const cutVal of cutValues) {
    if (current.length >= MAX_SLICED_POLYGONS) {
      capped = true;
      break;
    }
    const nextList: Pt3[][] = [];
    for (const poly of current) {
      let pMin = Infinity;
      let pMax = -Infinity;
      for (const v of poly) {
        const val = v[axis];
        if (val < pMin) pMin = val;
        if (val > pMax) pMax = val;
      }
      if (cutVal <= pMin + EPS || cutVal >= pMax - EPS) {
        nextList.push(poly);
        continue;
      }
      const [leftPoly, rightPoly] = splitPolygonByAxisPlane(poly, axis, cutVal);
      if (leftPoly.length >= 3) nextList.push(leftPoly);
      if (rightPoly.length >= 3) nextList.push(rightPoly);
    }
    current = nextList;
  }

  return { polygons: current, cutValues, capped };
}

function segmentDedupKey(a: Pt3, b: Pt3): string {
  const ax = Math.round(a.x * 2000);
  const ay = Math.round(a.y * 2000);
  const az = Math.round(a.z * 2000);
  const bx = Math.round(b.x * 2000);
  const by = Math.round(b.y * 2000);
  const bz = Math.round(b.z * 2000);
  const k1 = `${ax},${ay},${az}`;
  const k2 = `${bx},${by},${bz}`;
  return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

export function computeGeometryStats(
  baseGeo: THREE.BufferGeometry,
  currentGeo: THREE.BufferGeometry,
  rawSettings?: Partial<ObjectSubdivisionSettings> | null,
  capped = false
): SubdivisionStats {
  const s = normalizeSubdivisionSettings(rawSettings);
  const basePos = baseGeo.getAttribute('position');
  const baseIdx = baseGeo.getIndex();
  const baseTriangles = Math.round(
    (baseIdx ? baseIdx.count : basePos ? basePos.count : 0) / 3
  );

  const curPos = currentGeo.getAttribute('position');
  const curIdx = currentGeo.getIndex();
  const subdivTriangles = Math.round(
    (curIdx ? curIdx.count : curPos ? curPos.count : 0) / 3
  );

  return {
    cellsTotal: s.cutsX * s.cutsY * s.cutsZ,
    cutsX: s.cutsX,
    cutsY: s.cutsY,
    cutsZ: s.cutsZ,
    baseTriangles,
    subdivTriangles,
    vertexCount: curPos ? curPos.count : 0,
    capped,
  };
}

/**
 * Slices a 3D mesh surface into smaller rectangular/planar sub-faces (`cutsX * cutsY * cutsZ`),
 * generating both the physically partitioned BufferGeometry AND clean quad grid lines
 * (free of diagonal triangle clutter) plus optional physical panel grooves!
 */
export function buildSubdividedGeometry(
  baseGeo: THREE.BufferGeometry,
  rawSettings?: Partial<ObjectSubdivisionSettings> | null
): {
  geometry: THREE.BufferGeometry;
  gridLinesGeometry: THREE.BufferGeometry | null;
  stats: SubdivisionStats;
} {
  const settings = normalizeSubdivisionSettings(rawSettings);

  if (!isSubdivisionActive(settings)) {
    const clean = baseGeo.clone();
    clean.computeBoundingBox();
    clean.computeBoundingSphere();
    return {
      geometry: clean,
      gridLinesGeometry: null,
      stats: computeGeometryStats(baseGeo, clean, settings, false),
    };
  }

  baseGeo.computeBoundingBox();
  const bb =
    baseGeo.boundingBox ??
    new THREE.Box3(
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, 0.5)
    );

  const posAttr = baseGeo.getAttribute('position');
  const normAttr = baseGeo.getAttribute('normal');
  const idxAttr = baseGeo.getIndex();
  const rawCount = idxAttr ? idxAttr.count : posAttr ? posAttr.count : 0;

  if (!posAttr || rawCount < 3) {
    const clean = baseGeo.clone();
    return {
      geometry: clean,
      gridLinesGeometry: null,
      stats: computeGeometryStats(baseGeo, clean, settings, false),
    };
  }

  // Extract base triangles with their original outward normals
  interface PolyItem {
    pts: Pt3[];
    nx: number;
    ny: number;
    nz: number;
  }

  const initialPolys: PolyItem[] = [];
  for (let i = 0; i < rawCount; i += 3) {
    const i0 = idxAttr ? idxAttr.getX(i) : i;
    const i1 = idxAttr ? idxAttr.getX(i + 1) : i + 1;
    const i2 = idxAttr ? idxAttr.getX(i + 2) : i + 2;

    const p0: Pt3 = {
      x: posAttr.getX(i0),
      y: posAttr.getY(i0),
      z: posAttr.getZ(i0),
    };
    const p1: Pt3 = {
      x: posAttr.getX(i1),
      y: posAttr.getY(i1),
      z: posAttr.getZ(i1),
    };
    const p2: Pt3 = {
      x: posAttr.getX(i2),
      y: posAttr.getY(i2),
      z: posAttr.getZ(i2),
    };

    const abx = p1.x - p0.x;
    const aby = p1.y - p0.y;
    const abz = p1.z - p0.z;
    const acx = p2.x - p0.x;
    const acy = p2.y - p0.y;
    const acz = p2.z - p0.z;

    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) continue;

    if (normAttr) {
      const avgNx =
        (normAttr.getX(i0) + normAttr.getX(i1) + normAttr.getX(i2)) / 3;
      const avgNy =
        (normAttr.getY(i0) + normAttr.getY(i1) + normAttr.getY(i2)) / 3;
      const avgNz =
        (normAttr.getZ(i0) + normAttr.getZ(i1) + normAttr.getZ(i2)) / 3;
      const aLen = Math.hypot(avgNx, avgNy, avgNz);
      if (aLen > 0.2) {
        nx = avgNx / aLen;
        ny = avgNy / aLen;
        nz = avgNz / aLen;
      } else {
        nx /= len;
        ny /= len;
        nz /= len;
      }
    } else {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    initialPolys.push({ pts: [p0, p1, p2], nx, ny, nz });
  }

  let allCapped = false;
  const xCutsAll = new Set<number>();
  const yCutsAll = new Set<number>();
  const zCutsAll = new Set<number>();
  const finalPolys: PolyItem[] = [];

  for (const item of initialPolys) {
    let polys: Pt3[][] = [item.pts];

    const sx = slicePolygonsAlongAxis(
      polys,
      'x',
      bb.min.x,
      bb.max.x,
      settings.cutsX
    );
    polys = sx.polygons;
    sx.cutValues.forEach((v) => xCutsAll.add(v));
    if (sx.capped) allCapped = true;

    const sy = slicePolygonsAlongAxis(
      polys,
      'y',
      bb.min.y,
      bb.max.y,
      settings.cutsY
    );
    polys = sy.polygons;
    sy.cutValues.forEach((v) => yCutsAll.add(v));
    if (sy.capped) allCapped = true;

    const sz = slicePolygonsAlongAxis(
      polys,
      'z',
      bb.min.z,
      bb.max.z,
      settings.cutsZ
    );
    polys = sz.polygons;
    sz.cutValues.forEach((v) => zCutsAll.add(v));
    if (sz.capped) allCapped = true;

    for (const p of polys) {
      finalPolys.push({ pts: p, nx: item.nx, ny: item.ny, nz: item.nz });
    }
  }

  const outPositions: number[] = [];
  const outNormals: number[] = [];
  const lineSegmentsCoords: number[] = [];
  const seenSegs = new Set<string>();

  const xCutArr = Array.from(xCutsAll);
  const yCutArr = Array.from(yCutsAll);
  const zCutArr = Array.from(zCutsAll);

  const isOnCutPlane = (a: Pt3, b: Pt3): boolean => {
    for (const cx of xCutArr) {
      if (Math.abs(a.x - cx) < 2e-4 && Math.abs(b.x - cx) < 2e-4) return true;
    }
    for (const cy of yCutArr) {
      if (Math.abs(a.y - cy) < 2e-4 && Math.abs(b.y - cy) < 2e-4) return true;
    }
    for (const cz of zCutArr) {
      if (Math.abs(a.z - cz) < 2e-4 && Math.abs(b.z - cz) < 2e-4) return true;
    }
    return false;
  };

  const groove = settings.panelGroove;

  for (const poly of finalPolys) {
    const pts = poly.pts;
    const m = pts.length;
    if (m < 3) continue;

    // Collect crisp planar cut lines along surface
    for (let i = 0; i < m; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % m];
      const distSq =
        (a.x - b.x) * (a.x - b.x) +
        (a.y - b.y) * (a.y - b.y) +
        (a.z - b.z) * (a.z - b.z);
      if (distSq < 1e-8) continue;
      if (isOnCutPlane(a, b)) {
        const key = segmentDedupKey(a, b);
        if (!seenSegs.has(key)) {
          seenSegs.add(key);
          // Slight outward bias along normal prevents z-fighting on flat faces
          const bias = 0.0012;
          lineSegmentsCoords.push(
            a.x + poly.nx * bias,
            a.y + poly.ny * bias,
            a.z + poly.nz * bias,
            b.x + poly.nx * bias,
            b.y + poly.ny * bias,
            b.z + poly.nz * bias
          );
        }
      }
    }

    // Optional physical 3D panel bevel / tile groove per cell!
    if (groove > 0.001) {
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (const p of pts) {
        cx += p.x;
        cy += p.y;
        cz += p.z;
      }
      cx /= m;
      cy /= m;
      cz /= m;

      const inset = Math.min(0.28, groove * 2.8);
      const bevelDepth = groove * 0.35;
      const innerPts: Pt3[] = pts.map((p) => ({
        x: p.x + (cx - p.x) * inset,
        y: p.y + (cy - p.y) * inset,
        z: p.z + (cz - p.z) * inset,
      }));
      const outerSunkPts: Pt3[] = pts.map((p) => ({
        x: p.x - poly.nx * bevelDepth,
        y: p.y - poly.ny * bevelDepth,
        z: p.z - poly.nz * bevelDepth,
      }));

      // Center raised panel face
      for (let i = 1; i < m - 1; i++) {
        outPositions.push(
          innerPts[0].x,
          innerPts[0].y,
          innerPts[0].z,
          innerPts[i].x,
          innerPts[i].y,
          innerPts[i].z,
          innerPts[i + 1].x,
          innerPts[i + 1].y,
          innerPts[i + 1].z
        );
        outNormals.push(
          poly.nx,
          poly.ny,
          poly.nz,
          poly.nx,
          poly.ny,
          poly.nz,
          poly.nx,
          poly.ny,
          poly.nz
        );
      }

      // Sloped bevel skirt around panel
      for (let i = 0; i < m; i++) {
        const nxt = (i + 1) % m;
        const o0 = outerSunkPts[i];
        const o1 = outerSunkPts[nxt];
        const i1 = innerPts[nxt];
        const i0 = innerPts[i];

        const e1x = o1.x - o0.x;
        const e1y = o1.y - o0.y;
        const e1z = o1.z - o0.z;
        const e2x = i0.x - o0.x;
        const e2y = i0.y - o0.y;
        const e2z = i0.z - o0.z;
        let bnx = e1y * e2z - e1z * e2y;
        let bny = e1z * e2x - e1x * e2z;
        let bnz = e1x * e2y - e1y * e2x;
        const bLen = Math.hypot(bnx, bny, bnz) || 1;
        bnx /= bLen;
        bny /= bLen;
        bnz /= bLen;

        outPositions.push(
          o0.x,
          o0.y,
          o0.z,
          o1.x,
          o1.y,
          o1.z,
          i1.x,
          i1.y,
          i1.z,
          o0.x,
          o0.y,
          o0.z,
          i1.x,
          i1.y,
          i1.z,
          i0.x,
          i0.y,
          i0.z
        );
        for (let k = 0; k < 6; k++) {
          outNormals.push(bnx, bny, bnz);
        }
      }
    } else {
      // Clean flat triangulation of convex sub-polygon
      for (let i = 1; i < m - 1; i++) {
        outPositions.push(
          pts[0].x,
          pts[0].y,
          pts[0].z,
          pts[i].x,
          pts[i].y,
          pts[i].z,
          pts[i + 1].x,
          pts[i + 1].y,
          pts[i + 1].z
        );
        outNormals.push(
          poly.nx,
          poly.ny,
          poly.nz,
          poly.nx,
          poly.ny,
          poly.nz,
          poly.nx,
          poly.ny,
          poly.nz
        );
      }
    }
  }

  // Also include sharp silhouette edges of baseGeo so outer borders match cut lines cleanly
  const outerEdges = new THREE.EdgesGeometry(baseGeo, 28);
  const outerPos = outerEdges.getAttribute('position');
  if (outerPos) {
    for (let i = 0; i < outerPos.count; i += 2) {
      const a: Pt3 = {
        x: outerPos.getX(i),
        y: outerPos.getY(i),
        z: outerPos.getZ(i),
      };
      const b: Pt3 = {
        x: outerPos.getX(i + 1),
        y: outerPos.getY(i + 1),
        z: outerPos.getZ(i + 1),
      };
      const key = segmentDedupKey(a, b);
      if (!seenSegs.has(key)) {
        seenSegs.add(key);
        lineSegmentsCoords.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }
  outerEdges.dispose();

  const outGeo = new THREE.BufferGeometry();
  outGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(outPositions, 3)
  );
  outGeo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(outNormals, 3)
  );
  outGeo.boundingBox = bb.clone();
  outGeo.computeBoundingSphere();

  let gridLinesGeometry: THREE.BufferGeometry | null = null;
  if (lineSegmentsCoords.length >= 6) {
    gridLinesGeometry = new THREE.BufferGeometry();
    gridLinesGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(lineSegmentsCoords, 3)
    );
  }

  return {
    geometry: outGeo,
    gridLinesGeometry,
    stats: computeGeometryStats(baseGeo, outGeo, settings, allCapped),
  };
}
