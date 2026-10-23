import * as THREE from 'three';
import {
  ArchOpeningItem,
  ArchWallSegment,
  Vec2XZ,
  WallCornerStyleKind,
  WallEndCapKind,
} from '../types/studio';

const VERTEX_CLUSTER_EPS = 0.045;

export interface PathSample2D {
  x: number;
  z: number;
  tx: number;
  tz: number;
}

export interface WallEndTrimSpec {
  /** Signed offset along outgoing wall tangent for LEFT (+normal) face at this endpoint */
  leftTrim: number;
  /** Signed offset along outgoing wall tangent for RIGHT (-normal) face at this endpoint */
  rightTrim: number;
  /** Whether this endpoint meets >= 1 other walls at a shared vertex (wedges meet at V) */
  hasVertexApex: boolean;
  /** Exact snapped shared vertex position when `hasVertexApex === true` */
  apexXZ?: Vec2XZ;
  /** Uniform pullback along wall tangent when a smooth corner fillet bridges this joint */
  filletPullback: number;
  /** True when this endpoint is connected/butted into another wall (suppresses decorative free-end cap) */
  isConnected: boolean;
}

export interface FloorWallJunctionPlan {
  endTrims: Map<string, { start: WallEndTrimSpec; end: WallEndTrimSpec }>;
  filletPieces: CornerFilletSpec[];
}

export interface CornerFilletSpec {
  id: string;
  floorId: string;
  style: Exclude<WallCornerStyleKind, 'sharp'>;
  vertex: Vec2XZ;
  wallA: ArchWallSegment;
  wallB: ArchWallSegment;
  endA: 'start' | 'end';
  endB: 'start' | 'end';
  pullback: number;
  height: number;
  thickness: number;
}

function normalizeAngleSigned(rad: number): number {
  let a = rad;
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}

/**
 * High-precision path sampler supporting:
 * - Straight lines (`line`)
 * - Exact trigonometric circular arcs (`circular-arc` or any `|curveBulge| >= 0.015`, including exact 180° semicircles & 90° circle segments!)
 * - Serpentine cubic S-waves (`s-curve`)
 * - Straight body + C¹-continuous swept hook tip (`j-curve-end` for Curved End Wall)
 */
export function sampleAdvancedWallPath(
  wall: Pick<
    ArchWallSegment,
    'start' | 'end' | 'curveBulge' | 'pathMode' | 'sWaveAmp' | 'endCap'
  >,
  tRaw: number
): PathSample2D {
  const t = Math.max(0, Math.min(1, tRaw));
  const x0 = wall.start.x;
  const z0 = wall.start.z;
  const x1 = wall.end.x;
  const z1 = wall.end.z;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const chord = Math.max(0.001, Math.hypot(dx, dz));
  const ux = dx / chord;
  const uz = dz / chord;
  const nx = -uz;
  const nz = ux;

  const mode =
    wall.pathMode ??
    (wall.endCap === 'curved'
      ? 'j-curve-end'
      : Math.abs(wall.curveBulge) >= 0.015
      ? 'circular-arc'
      : 'line');

  // 1. Serpentine Cubic S-Curve (`s-shaped-wall`)
  if (mode === 's-curve') {
    const amp =
      wall.sWaveAmp !== undefined && Math.abs(wall.sWaveAmp) > 0.01
        ? wall.sWaveAmp
        : Math.abs(wall.curveBulge) > 0.02
        ? wall.curveBulge
        : Math.min(0.6, chord * 0.18);

    const p1x = x0 + ux * (chord * 0.34) + nx * (amp * 1.9);
    const p1z = z0 + uz * (chord * 0.34) + nz * (amp * 1.9);
    const p2x = x0 + ux * (chord * 0.66) - nx * (amp * 1.9);
    const p2z = z0 + uz * (chord * 0.66) - nz * (amp * 1.9);

    const omt = 1 - t;
    const omt2 = omt * omt;
    const t2 = t * t;
    const px =
      omt2 * omt * x0 +
      3 * omt2 * t * p1x +
      3 * omt * t2 * p2x +
      t2 * t * x1;
    const pz =
      omt2 * omt * z0 +
      3 * omt2 * t * p1z +
      3 * omt * t2 * p2z +
      t2 * t * z1;

    const dpx =
      3 * omt2 * (p1x - x0) +
      6 * omt * t * (p2x - p1x) +
      3 * t2 * (x1 - p2x);
    const dpz =
      3 * omt2 * (p1z - z0) +
      6 * omt * t * (p2z - p1z) +
      3 * t2 * (z1 - p2z);
    const dLen = Math.max(1e-5, Math.hypot(dpx, dpz));
    return { x: px, z: pz, tx: dpx / dLen, tz: dpz / dLen };
  }

  // 2. Straight Wall Body + C¹ Smooth Swept Hook Tip (`curved-end-wall`)
  if (mode === 'j-curve-end') {
    const tSplit = 0.68;
    // Slight counter-angle so straight 68% runs cleanly and final 32% sweeps smoothly into `wall.end`
    const sign = wall.curveBulge < 0 ? -1 : 1;
    const biasRad = -0.19 * sign;
    const cosB = Math.cos(biasRad);
    const sinB = Math.sin(biasRad);
    const dirX = ux * cosB - uz * sinB;
    const dirZ = ux * sinB + uz * cosB;

    const L1 = chord * 0.68;
    const L2 = chord * 0.2;
    const splitX = x0 + dirX * L1;
    const splitZ = z0 + dirZ * L1;
    const ctrlX = x0 + dirX * (L1 + L2);
    const ctrlZ = z0 + dirZ * (L1 + L2);

    if (t <= tSplit) {
      const uLin = t / tSplit;
      return {
        x: x0 + (splitX - x0) * uLin,
        z: z0 + (splitZ - z0) * uLin,
        tx: dirX,
        tz: dirZ,
      };
    }

    const uArc = (t - tSplit) / (1 - tSplit);
    const omu = 1 - uArc;
    const px = omu * omu * splitX + 2 * omu * uArc * ctrlX + uArc * uArc * x1;
    const pz = omu * omu * splitZ + 2 * omu * uArc * ctrlZ + uArc * uArc * z1;
    const dpx = 2 * omu * (ctrlX - splitX) + 2 * uArc * (x1 - ctrlX);
    const dpz = 2 * omu * (ctrlZ - splitZ) + 2 * uArc * (z1 - ctrlZ);
    const dLen = Math.max(1e-5, Math.hypot(dpx, dpz));
    return { x: px, z: pz, tx: dpx / dLen, tz: dpz / dLen };
  }

  // 3. Exact Trigonometric Circular Arc (`curved-wall`, `semi-circular-wall`, `circular-wall-segment`, etc.)
  const maxSag = chord * 0.98;
  const s = Math.max(-maxSag, Math.min(maxSag, wall.curveBulge));
  if (Math.abs(s) < 0.015) {
    return {
      x: x0 + dx * t,
      z: z0 + dz * t,
      tx: ux,
      tz: uz,
    };
  }

  const a = chord * 0.5;
  const absS = Math.abs(s);
  const R = (a * a + absS * absS) / (2 * absS);
  const mx = (x0 + x1) * 0.5;
  const mz = (z0 + z1) * 0.5;
  const centerOffset = s > 0 ? s - R : s + R;
  const cx = mx + nx * centerOffset;
  const cz = mz + nz * centerOffset;

  const midArcX = mx + nx * s;
  const midArcZ = mz + nz * s;

  const theta0 = Math.atan2(z0 - cz, x0 - cx);
  const thetaMid = Math.atan2(midArcZ - cz, midArcX - cx);
  const dHalf = normalizeAngleSigned(thetaMid - theta0);
  const sweep = dHalf * 2;
  const theta = theta0 + sweep * t;
  const dirSign = sweep >= 0 ? 1 : -1;

  return {
    x: cx + R * Math.cos(theta),
    z: cz + R * Math.sin(theta),
    tx: -Math.sin(theta) * dirSign,
    tz: Math.cos(theta) * dirSign,
  };
}

export function computeAdvancedWallLength(
  wall: Pick<
    ArchWallSegment,
    'start' | 'end' | 'curveBulge' | 'pathMode' | 'sWaveAmp' | 'endCap'
  >
): number {
  const chord = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  const isCurved =
    Math.abs(wall.curveBulge) >= 0.015 ||
    wall.pathMode === 's-curve' ||
    wall.pathMode === 'j-curve-end' ||
    wall.endCap === 'curved';
  if (!isCurved) return chord;

  const steps = 32;
  let sum = 0;
  let prev = sampleAdvancedWallPath(wall, 0);
  for (let i = 1; i <= steps; i++) {
    const cur = sampleAdvancedWallPath(wall, i / steps);
    sum += Math.hypot(cur.x - prev.x, cur.z - prev.z);
    prev = cur;
  }
  return sum;
}

function defaultEndTrim(): WallEndTrimSpec {
  return {
    leftTrim: 0,
    rightTrim: 0,
    hasVertexApex: false,
    filletPullback: 0,
    isConnected: false,
  };
}

/**
 * Intersects two 2D rays `P + sA * dA` and `Q + sB * dB`.
 * Returns `{ sA, sB }` or `null` if nearly parallel.
 */
function intersect2DLines(
  px: number,
  pz: number,
  dax: number,
  daz: number,
  qx: number,
  qz: number,
  dbx: number,
  dbz: number
): { sA: number; sB: number } | null {
  // P + sA * dA = Q + sB * dB  =>  sA * dA - sB * dB = Q - P
  const det = dax * -dbz - daz * -dbx; // -dax*dbz + daz*dbx
  if (Math.abs(det) < 0.075) return null;
  const rx = qx - px;
  const rz = qz - pz;
  const sA = (rx * -dbz - rz * -dbx) / det;
  const sB = (dax * rz - daz * rx) / det;
  return { sA, sB };
}

/**
 * Solves watertight architectural miter trims, T-butt trims, and smooth rounded corner fillets
 * across all solid walls on a given floor — eliminating cylinder patches and Z-fighting completely!
 */
export function computeFloorWallJunctions(
  floorWalls: ReadonlyArray<ArchWallSegment>
): FloorWallJunctionPlan {
  const endTrims = new Map<
    string,
    { start: WallEndTrimSpec; end: WallEndTrimSpec }
  >();
  const filletPieces: CornerFilletSpec[] = [];

  const solidWalls = floorWalls.filter((w) => w.style !== 'railing');
  for (const w of floorWalls) {
    endTrims.set(w.id, { start: defaultEndTrim(), end: defaultEndTrim() });
  }

  interface IncidentEntry {
    wall: ArchWallSegment;
    endpoint: 'start' | 'end';
    pt: Vec2XZ;
    /** Outgoing unit tangent pointing FROM vertex INTO the wall */
    tx: number;
    tz: number;
    angle: number;
    halfT: number;
    wallLen: number;
  }

  // 1. Cluster shared endpoints within VERTEX_CLUSTER_EPS
  const clusters: Array<{
    cx: number;
    cz: number;
    entries: IncidentEntry[];
  }> = [];

  for (const w of solidWalls) {
    const wallLen = Math.max(0.15, computeAdvancedWallLength(w));
    const s0 = sampleAdvancedWallPath(w, 0);
    const s1 = sampleAdvancedWallPath(w, 1);

    const endThicknessVal =
      w.endThickness !== undefined && w.endThickness > 0.03
        ? w.endThickness
        : w.thickness;

    const endpoints: Array<{
      ep: 'start' | 'end';
      pt: Vec2XZ;
      tx: number;
      tz: number;
      halfT: number;
    }> = [
      {
        ep: 'start',
        pt: w.start,
        tx: s0.tx,
        tz: s0.tz,
        halfT: w.thickness * 0.5,
      },
      {
        ep: 'end',
        pt: w.end,
        tx: -s1.tx,
        tz: -s1.tz,
        halfT: endThicknessVal * 0.5,
      },
    ];

    for (const item of endpoints) {
      let matched = clusters.find(
        (c) =>
          Math.hypot(c.cx - item.pt.x, c.cz - item.pt.z) <= VERTEX_CLUSTER_EPS
      );
      if (!matched) {
        matched = { cx: item.pt.x, cz: item.pt.z, entries: [] };
        clusters.push(matched);
      } else {
        const n = matched.entries.length;
        matched.cx = (matched.cx * n + item.pt.x) / (n + 1);
        matched.cz = (matched.cz * n + item.pt.z) / (n + 1);
      }
      matched.entries.push({
        wall: w,
        endpoint: item.ep,
        pt: item.pt,
        tx: item.tx,
        tz: item.tz,
        angle: Math.atan2(item.tz, item.tx),
        halfT: item.halfT,
        wallLen,
      });
    }
  }

  // 2. Solve N-way vertex miter or 2-way smooth corner fillet for each cluster
  for (let cIdx = 0; cIdx < clusters.length; cIdx++) {
    const cluster = clusters[cIdx];
    const k = cluster.entries.length;
    if (k < 2) continue;

    const vx = cluster.cx;
    const vz = cluster.cz;
    cluster.entries.sort((a, b) => a.angle - b.angle);

    // Check 2-way special smooth rounded / quoin corner
    if (k === 2) {
      const eA = cluster.entries[0];
      const eB = cluster.entries[1];
      const cStyle: WallCornerStyleKind =
        eA.wall.cornerStyle && eA.wall.cornerStyle !== 'sharp'
          ? eA.wall.cornerStyle
          : eB.wall.cornerStyle && eB.wall.cornerStyle !== 'sharp'
          ? eB.wall.cornerStyle
          : 'sharp';

      const dot = eA.tx * eB.tx + eA.tz * eB.tz;
      const betweenRad = Math.acos(Math.max(-1, Math.min(1, dot)));
      // Non-collinear corner between 35° and 150°
      if (
        (cStyle === 'rounded-inner' ||
          cStyle === 'rounded-outer' ||
          cStyle === 'outer-quoin') &&
        betweenRad >= (32 * Math.PI) / 180 &&
        betweenRad <= (152 * Math.PI) / 180
      ) {
        if (cStyle === 'rounded-inner' || cStyle === 'rounded-outer') {
          const avgT = (eA.halfT + eB.halfT);
          const reqRad =
            eA.wall.cornerRadius ??
            eB.wall.cornerRadius ??
            (cStyle === 'rounded-inner' ? 0.34 : 0.38);
          const maxPull = Math.min(eA.wallLen * 0.42, eB.wallLen * 0.42);
          const pullback = Math.max(
            avgT * 0.65,
            Math.min(maxPull, reqRad)
          );

          const specA = endTrims.get(eA.wall.id)![eA.endpoint];
          const specB = endTrims.get(eB.wall.id)![eB.endpoint];
          specA.filletPullback = pullback;
          specA.isConnected = true;
          specB.filletPullback = pullback;
          specB.isConnected = true;

          filletPieces.push({
            id: `fillet_${eA.wall.floorId}_${cIdx}`,
            floorId: eA.wall.floorId,
            style: cStyle,
            vertex: { x: vx, z: vz },
            wallA: eA.wall,
            wallB: eB.wall,
            endA: eA.endpoint,
            endB: eB.endpoint,
            pullback,
            height: Math.max(eA.wall.height, eB.wall.height),
            thickness: avgT,
          });
          continue;
        } else if (cStyle === 'outer-quoin') {
          filletPieces.push({
            id: `quoin_${eA.wall.floorId}_${cIdx}`,
            floorId: eA.wall.floorId,
            style: 'outer-quoin',
            vertex: { x: vx, z: vz },
            wallA: eA.wall,
            wallB: eB.wall,
            endA: eA.endpoint,
            endB: eB.endpoint,
            pullback: 0,
            height: Math.max(eA.wall.height, eB.wall.height),
            thickness: eA.halfT + eB.halfT,
          });
          // Fall through so the two walls STILL sharp-miter 100% cleanly behind the quoin trim!
        }
      }
    }

    // Standard exact N-way planar miter!
    // Note: in local outgoing frame `t = (tx, tz)`:
    // Left normal (+90° in XZ: `nL = (-tz, tx)`), Right normal (`nR = (tz, -tx)`).
    // When angles `atan2(tz, tx)` increase from `e_i` to `e_j`:
    // Turning from `t_i` toward `t_j` goes toward `nL_i = (-tz_i, tx_i)`!
    // Wait — let's verify! Suppose `t_0 = (1, 0)` (`angle = 0`) and `t_1 = (0, 1)` (`angle = +π/2`):
    // `nL_0 = (0, 1)` (points toward `t_1`!) and `nR_1 = (1, 0)` (points toward `t_0`!)!
    // YES! `e_i`'s LEFT offset line (`V + nL_i * h_i + s_i * t_i`) ALWAYS faces `e_j`'s RIGHT offset line (`V + nR_j * h_j + s_j * t_j`)!
    for (let i = 0; i < k; i++) {
      const eI = cluster.entries[i];
      const eJ = cluster.entries[(i + 1) % k];

      const nLiX = -eI.tz;
      const nLiZ = eI.tx;
      const nRjX = eJ.tz;
      const nRjZ = -eJ.tx;

      const pIx = vx + nLiX * eI.halfT;
      const pIz = vz + nLiZ * eI.halfT;
      const pJx = vx + nRjX * eJ.halfT;
      const pJz = vz + nRjZ * eJ.halfT;

      const hit = intersect2DLines(
        pIx,
        pIz,
        eI.tx,
        eI.tz,
        pJx,
        pJz,
        eJ.tx,
        eJ.tz
      );

      const maxExtI = Math.min(eI.wallLen * 0.45, Math.max(eI.halfT, eJ.halfT) * 2.6);
      const maxExtJ = Math.min(eJ.wallLen * 0.45, Math.max(eI.halfT, eJ.halfT) * 2.6);

      // Note: In our `intersect2DLines`, `sA` is measured FORWARD into wall I (`+t_I`).
      // Therefore:
      // - If `sA < 0`, the miter point extends BACKWARD past `V` (outer corner extension: `+extension = -sA`!).
      // - If `sA > 0`, the miter point is pulled INSIDE wall I from `V` (inner corner trim: `trim < 0`!).
      // To keep `WallEndTrimSpec` crystal-clear, let `leftTrim` / `rightTrim` be the signed distance ALONG `t_out` from `V` where the wall edge starts (`0` = at `V`, `< 0` = extends outward past `V` to close an outer corner, `> 0` = trims inward from `V` at an inner corner)!
      let startDistI = 0;
      let startDistJ = 0;
      if (hit) {
        startDistI = Math.max(-maxExtI, Math.min(maxExtI, hit.sA));
        startDistJ = Math.max(-maxExtJ, Math.min(maxExtJ, hit.sB));
      }

      const specI = endTrims.get(eI.wall.id)![eI.endpoint];
      const specJ = endTrims.get(eJ.wall.id)![eJ.endpoint];

      specI.leftTrim = startDistI;
      specI.hasVertexApex = k >= 3;
      specI.apexXZ = { x: vx, z: vz };
      specI.isConnected = true;

      specJ.rightTrim = startDistJ;
      specJ.hasVertexApex = k >= 3;
      specJ.apexXZ = { x: vx, z: vz };
      specJ.isConnected = true;
    }
  }

  // 3. T-Butt Body Trim: if a FREE endpoint (`!isConnected`) lands inside the body of another straight wall,
  // trim its left & right edges cleanly against that host wall's near face so zero Z-fighting occurs on top!
  for (const w of solidWalls) {
    const trims = endTrims.get(w.id)!;
    const wallLen = Math.max(0.15, computeAdvancedWallLength(w));
    const s0 = sampleAdvancedWallPath(w, 0);
    const s1 = sampleAdvancedWallPath(w, 1);

    const checkEndpoints: Array<{
      ep: 'start' | 'end';
      spec: WallEndTrimSpec;
      pt: Vec2XZ;
      tx: number;
      tz: number;
      halfT: number;
    }> = [
      {
        ep: 'start',
        spec: trims.start,
        pt: w.start,
        tx: s0.tx,
        tz: s0.tz,
        halfT: w.thickness * 0.5,
      },
      {
        ep: 'end',
        spec: trims.end,
        pt: w.end,
        tx: -s1.tx,
        tz: -s1.tz,
        halfT: (w.endThickness ?? w.thickness) * 0.5,
      },
    ];

    for (const ce of checkEndpoints) {
      if (ce.spec.isConnected) continue;

      for (const host of solidWalls) {
        if (host.id === w.id || Math.abs(host.curveBulge) >= 0.02) continue;
        const hdx = host.end.x - host.start.x;
        const hdz = host.end.z - host.start.z;
        const hLen = Math.hypot(hdx, hdz);
        if (hLen < 0.2) continue;
        const hux = hdx / hLen;
        const huz = hdz / hLen;
        const hnx = -huz;
        const hnz = hux;

        const relX = ce.pt.x - host.start.x;
        const relZ = ce.pt.z - host.start.z;
        const along = relX * hux + relZ * huz;
        const perp = relX * hnx + relZ * hnz;
        const hostHalfT = host.thickness * 0.5;

        if (
          along > VERTEX_CLUSTER_EPS &&
          along < hLen - VERTEX_CLUSTER_EPS &&
          Math.abs(perp) <= hostHalfT + VERTEX_CLUSTER_EPS
        ) {
          // Which face of `host` is `w` approaching from? Check `dot(ce.t, hn)`!
          const dotN = ce.tx * hnx + ce.tz * hnz;
          if (Math.abs(dotN) < 0.15) continue;
          const faceSign = dotN >= 0 ? 1 : -1;
          const faceOriginX = host.start.x + hnx * (faceSign * hostHalfT);
          const faceOriginZ = host.start.z + hnz * (faceSign * hostHalfT);

          const nLx = -ce.tz;
          const nLz = ce.tx;
          const pLx = ce.pt.x + nLx * ce.halfT;
          const pLz = ce.pt.z + nLz * ce.halfT;
          const pRx = ce.pt.x - nLx * ce.halfT;
          const pRz = ce.pt.z - nLz * ce.halfT;

          const hitL = intersect2DLines(
            pLx,
            pLz,
            ce.tx,
            ce.tz,
            faceOriginX,
            faceOriginZ,
            hux,
            huz
          );
          const hitR = intersect2DLines(
            pRx,
            pRz,
            ce.tx,
            ce.tz,
            faceOriginX,
            faceOriginZ,
            hux,
            huz
          );
          if (hitL && hitR) {
            const maxT = wallLen * 0.42;
            ce.spec.leftTrim = Math.max(-maxT, Math.min(maxT, hitL.sA));
            ce.spec.rightTrim = Math.max(-maxT, Math.min(maxT, hitR.sA));
            ce.spec.isConnected = true;
            break;
          }
        }
      }
    }
  }

  return { endTrims, filletPieces };
}

/* =========================================================
   Low-Level Multi-Material BufferGeometry Assembler
   Material Indices:
   - 0: Cap / Jamb / Top / Bottom / Trim
   - 4: Exterior (+normal / right or left consistent with BoxGeometry +Z)
   - 5: Interior (-normal)
   ========================================================= */
interface TriBucket {
  pos: number[];
  norm: number[];
  uv: number[];
}

class DualWallMeshCollector {
  private buckets: Record<0 | 4 | 5, TriBucket> = {
    0: { pos: [], norm: [], uv: [] },
    4: { pos: [], norm: [], uv: [] },
    5: { pos: [], norm: [], uv: [] },
  };

  public addTri(
    matIndex: 0 | 4 | 5,
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    uA = 0,
    vA = 0,
    uB = 1,
    vB = 0,
    uC = 1,
    vC = 1,
    customNormals?: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ]
  ): void {
    const b = this.buckets[matIndex];
    b.pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    b.uv.push(uA, vA, uB, vB, uC, vC);
    if (customNormals) {
      b.norm.push(...customNormals);
    } else {
      const ux = bx - ax;
      const uy = by - ay;
      const uz = bz - az;
      const vx = cx - ax;
      const vy = cy - ay;
      const vz = cz - az;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz);
      if (len > 1e-8) {
        nx /= len;
        ny /= len;
        nz /= len;
      } else {
        ny = 1;
      }
      b.norm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    }
  }

  /**
   * Adds a quad `(p0 -> p1 -> p2 -> p3)` in CCW outward order as seen from outside.
   */
  public addQuad(
    matIndex: 0 | 4 | 5,
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    u0 = 0,
    v0 = 0,
    u1 = 1,
    v1 = 1,
    n01?: [number, number, number],
    n23?: [number, number, number]
  ): void {
    const normsA:
      | [number, number, number, number, number, number, number, number, number]
      | undefined =
      n01 && n23
        ? [n01[0], n01[1], n01[2], n23[0], n23[1], n23[2], n23[0], n23[1], n23[2]]
        : undefined;
    const normsB:
      | [number, number, number, number, number, number, number, number, number]
      | undefined =
      n01 && n23
        ? [n01[0], n01[1], n01[2], n23[0], n23[1], n23[2], n01[0], n01[1], n01[2]]
        : undefined;

    this.addTri(
      matIndex,
      p0[0],
      p0[1],
      p0[2],
      p1[0],
      p1[1],
      p1[2],
      p2[0],
      p2[1],
      p2[2],
      u0,
      v0,
      u1,
      v0,
      u1,
      v1,
      normsA
    );
    this.addTri(
      matIndex,
      p0[0],
      p0[1],
      p0[2],
      p2[0],
      p2[1],
      p2[2],
      p3[0],
      p3[1],
      p3[2],
      u0,
      v0,
      u1,
      v1,
      u0,
      v1,
      normsB
    );
  }

  /**
   * Extrudes a simple convex/star-shaped 2D XZ polygon (CCW in standard math `(x, z)` where `nL = (-dz, dx)`)
   * vertically from `y0` to `y1`, with optional lateral lean `(leanX, leanZ)` proportional to `y`.
   */
  public addExtrudedPolygonBlock(
    ringCCW: Array<{ x: number; z: number; edgeMat: 0 | 4 | 5 }>,
    y0: number,
    y1: number,
    leanPerMeterX = 0,
    leanPerMeterZ = 0
  ): void {
    const m = ringCCW.length;
    if (m < 3 || y1 - y0 < 0.005) return;

    // Note on Three.js right-handed (X, Y, Z) winding:
    // If `(x_i, z_i)` is CCW in `(X, Z)` (`x0=(0,0), x1=(1,0), x2=(1,1)` -> cross `dx1*dz2 - dz1*dx2 = +1`),
    // then in 3D `(x, y, z)`: `(x1 - x0) × (x2 - x0) = (1,0,0) × (1,0,1) = (0, -1, 0)` (points DOWN -Y)!
    // So:
    // - TOP cap (+Y normal) uses REVERSED order `(0, i+1, i)`!
    // - BOTTOM cap (-Y normal) uses FORWARD order `(0, i, i+1)`!
    // - SIDE quad from `i` to `j = (i+1)%m`: `(B_i -> T_i -> T_j -> B_j)` has `(T_i - B_i) × (B_j - B_i) = (0,1,0) × (dx, 0, dz) = (dz, 0, -dx)` which points RIGHT/OUTWARD of a CCW `(x,z)` polygon!
    // Wait: let's double-check! For `B0=(0,0,0) -> B1=(1,0,0)` on the bottom edge of `[0,1]×[0,1]`, outward is `-Z = (0, 0, -1)`.
    // `(0, 1, 0) × (1, 0, 0) = (0, 0, -1)`! EXACT OUTWARD +100% VERIFIED!

    const botPts = ringCCW.map((p) => [
      p.x + leanPerMeterX * y0,
      y0,
      p.z + leanPerMeterZ * y0,
    ] as [number, number, number]);
    const topPts = ringCCW.map((p) => [
      p.x + leanPerMeterX * y1,
      y1,
      p.z + leanPerMeterZ * y1,
    ] as [number, number, number]);

    // Centroid fan works cleanly for all our convex / star-shaped wall slices & caps!
    let cxB = 0,
      czB = 0,
      cxT = 0,
      czT = 0;
    for (let i = 0; i < m; i++) {
      cxB += botPts[i][0];
      czB += botPts[i][2];
      cxT += topPts[i][0];
      czT += topPts[i][2];
    }
    cxB /= m;
    czB /= m;
    cxT /= m;
    czT /= m;

    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      // Top cap (+Y)
      this.addTri(
        0,
        cxT,
        y1,
        czT,
        topPts[j][0],
        y1,
        topPts[j][2],
        topPts[i][0],
        y1,
        topPts[i][2],
        cxT * 0.5,
        czT * 0.5,
        topPts[j][0] * 0.5,
        topPts[j][2] * 0.5,
        topPts[i][0] * 0.5,
        topPts[i][2] * 0.5
      );
      // Bottom cap (-Y)
      this.addTri(
        0,
        cxB,
        y0,
        czB,
        botPts[i][0],
        y0,
        botPts[i][2],
        botPts[j][0],
        y0,
        botPts[j][2],
        cxB * 0.5,
        czB * 0.5,
        botPts[i][0] * 0.5,
        botPts[i][2] * 0.5,
        botPts[j][0] * 0.5,
        botPts[j][2] * 0.5
      );
      // Outward vertical/slanted side quad `(B_i -> T_i -> T_j -> B_j)`
      const segLen = Math.hypot(
        ringCCW[j].x - ringCCW[i].x,
        ringCCW[j].z - ringCCW[i].z
      );
      if (segLen > 1e-5) {
        this.addQuad(
          ringCCW[i].edgeMat,
          botPts[i],
          topPts[i],
          topPts[j],
          botPts[j],
          0,
          y0 * 0.5,
          segLen * 0.5,
          y1 * 0.5
        );
      }
    }
  }

  public buildGeometry(): THREE.BufferGeometry {
    const allPos: number[] = [];
    const allNorm: number[] = [];
    const allUv: number[] = [];
    const geo = new THREE.BufferGeometry();

    const order: Array<0 | 4 | 5> = [0, 4, 5];
    let vertCursor = 0;

    for (const matIdx of order) {
      const b = this.buckets[matIdx];
      const vCount = b.pos.length / 3;
      if (vCount === 0) continue;
      for (let i = 0; i < b.pos.length; i++) allPos.push(b.pos[i]);
      for (let i = 0; i < b.norm.length; i++) allNorm.push(b.norm[i]);
      for (let i = 0; i < b.uv.length; i++) allUv.push(b.uv[i]);
      geo.addGroup(vertCursor, vCount, matIdx);
      vertCursor += vCount;
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(allNorm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(allUv, 2));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }
}

/**
 * Builds a single continuous, watertight manifold `BufferGeometry` for any Smart Wall:
 * - Supports exact mitered start & end trims + N-way junction wedges (ZERO cylinder patch, ZERO Z-fighting!)
 * - Supports all 10 Wall End profiles (`flat`, `angled`, `beveled`, `rounded`, `curved`, `tapered`, `pointed`, `stepped`, `pillar`, `cap`)
 * - Supports `slanted-wall` (inclined wall plane + optional sloped top `endHeight`), `tapered-wall` (gradual thickness),
 *   smooth `circular-arc` & `s-curve` walls, and live Door/Window cutouts!
 */
export function buildManifoldWallBodyGeometry(
  wall: ArchWallSegment,
  openingsOnWall: ReadonlyArray<ArchOpeningItem>,
  startTrim: WallEndTrimSpec = defaultEndTrim(),
  endTrim: WallEndTrimSpec = defaultEndTrim()
): {
  bodyGeo: THREE.BufferGeometry;
  copingGeo: THREE.BufferGeometry | null;
  trimExtrasGeo: THREE.BufferGeometry | null;
} {
  const collector = new DualWallMeshCollector();
  const copingCollector = new DualWallMeshCollector();
  const extrasCollector = new DualWallMeshCollector();

  const totalLen = Math.max(0.18, computeAdvancedWallLength(wall));
  const H0 = Math.max(0.25, wall.height);
  const H1 =
    wall.endHeight !== undefined && wall.endHeight > 0.2 ? wall.endHeight : H0;

  const T0 = Math.max(0.05, wall.thickness);
  const T1 =
    wall.endThickness !== undefined && wall.endThickness > 0.04
      ? wall.endThickness
      : T0;

  const isCurvedPath =
    Math.abs(wall.curveBulge) >= 0.015 ||
    wall.pathMode === 's-curve' ||
    wall.pathMode === 'j-curve-end' ||
    wall.endCap === 'curved';

  const startSample = sampleAdvancedWallPath(wall, 0);
  const baseNormalX = -startSample.tz;
  const baseNormalZ = startSample.tx;
  const leanOffset = wall.slantLean ?? 0;
  const leanPerMeterX =
    Math.abs(leanOffset) > 0.005 ? (baseNormalX * leanOffset) / H0 : 0;
  const leanPerMeterZ =
    Math.abs(leanOffset) > 0.005 ? (baseNormalZ * leanOffset) / H0 : 0;

  const endCap: WallEndCapKind = wall.endCap ?? 'none';
  const applyStartCap = Boolean(wall.endCapBothEnds) && !startTrim.isConnected;
  const applyEndCap = endCap !== 'none' && !endTrim.isConnected;

  // How much longitudinal span at free end(s) is reserved for sculpted end terminations
  const capSpanFor = (cap: WallEndCapKind, T: number): number => {
    switch (cap) {
      case 'beveled':
        return Math.min(totalLen * 0.25, T * 0.42);
      case 'rounded':
        return Math.min(totalLen * 0.25, T * 0.5);
      case 'tapered':
        return Math.min(totalLen * 0.34, Math.max(0.55, T * 2.4));
      case 'pointed':
        return Math.min(totalLen * 0.3, Math.max(0.22, T * 0.95));
      case 'stepped':
        return Math.min(totalLen * 0.42, 0.92);
      case 'pillar':
        return Math.min(totalLen * 0.22, T * 0.95);
      default:
        return 0;
    }
  };

  const sBodyStart = Math.max(
    startTrim.filletPullback,
    applyStartCap ? capSpanFor(endCap, T0) : 0
  );
  const sBodyEnd =
    totalLen -
    Math.max(
      endTrim.filletPullback,
      applyEndCap ? capSpanFor(endCap, T1) : 0
    );

  // Normalize & sort valid openings inside `[sBodyStart + 0.04, sBodyEnd - 0.04]`
  const ops = openingsOnWall
    .map((op) => {
      const half = op.width * 0.5;
      const centerS = Math.max(
        sBodyStart + half + 0.04,
        Math.min(sBodyEnd - half - 0.04, op.offsetRatio * totalLen)
      );
      const s0 = Math.max(sBodyStart + 0.03, centerS - half);
      const s1 = Math.min(sBodyEnd - 0.03, centerS + half);
      return { op, s0, s1 };
    })
    .filter((o) => o.s1 - o.s0 >= 0.18)
    .sort((a, b) => a.s0 - b.s0);

  // Helper: sample centerline, half-thickness, and top height at arc-length `s ∈ [0, totalLen]`
  const stationAtS = (s: number) => {
    const u = Math.max(0, Math.min(1, s / totalLen));
    const pt = sampleAdvancedWallPath(wall, u);
    const halfT = (T0 + (T1 - T0) * u) * 0.5;
    const hTop = H0 + (H1 - H0) * u;
    const nLx = -pt.tz;
    const nLz = pt.tx;
    return { u, ...pt, halfT, hTop, nLx, nLz };
  };

  /**
   * Emits a smooth swept span from `sA` to `sB` between vertical heights `[yBotFrac .. yTopFrac]` (or fixed meters).
   * At `sA === 0` or `sB === totalLen`, applies exact start/end miter trims & N-way junction apex wedges!
   */
  const emitSpanSegment = (
    sA: number,
    sB: number,
    yMode:
      | { kind: 'full' }
      | { kind: 'fixed'; y0: number; y1: number }
      | { kind: 'header'; y0: number },
    closeStartJamb: boolean,
    closeEndJamb: boolean,
    targetCollector: DualWallMeshCollector = collector,
    extraHalfT = 0,
    fixedYOverride?: { y0: number; y1: number }
  ) => {
    if (sB - sA < 0.008) return;

    const steps = isCurvedPath
      ? Math.max(4, Math.ceil(((sB - sA) / totalLen) * 40))
      : Math.abs(T1 - T0) > 0.005 || Math.abs(H1 - H0) > 0.005
      ? Math.max(2, Math.ceil(((sB - sA) / totalLen) * 8))
      : 1;

    interface CrossRing {
      s: number;
      lX: number;
      lZ: number;
      rX: number;
      rZ: number;
      nLx: number;
      nLz: number;
      y0: number;
      y1: number;
    }

    const rings: CrossRing[] = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const s = sA + (sB - sA) * f;
      const st = stationAtS(s);
      const h = st.halfT + extraHalfT;

      let lX = st.x + st.nLx * h;
      let lZ = st.z + st.nLz * h;
      let rX = st.x - st.nLx * h;
      let rZ = st.z - st.nLz * h;

      // Apply exact start miter / angled free-end trim at the very beginning of the wall
      if (i === 0 && sA <= 0.002) {
        let trimL = startTrim.leftTrim;
        let trimR = startTrim.rightTrim;
        if (!startTrim.isConnected && applyStartCap && endCap === 'angled') {
          trimL = h;
          trimR = -h;
        }
        lX += st.tx * trimL;
        lZ += st.tz * trimL;
        rX += st.tx * trimR;
        rZ += st.tz * trimR;
      }

      // Apply exact end miter / angled free-end trim at the very end of the wall
      if (i === steps && sB >= totalLen - 0.002) {
        // Outgoing tangent at `end` into the wall is `(-st.tx, -st.tz)`!
        // Note: in `computeFloorWallJunctions`, at `endpoint === 'end'`, outgoing tangent `t_end = (-st.tx, -st.tz)`.
        // Its LEFT normal `nL_end = (-t_end.z, t_end.x) = (st.tz, -st.tx) = -st.nL` (which is the wall's RIGHT side `-nL`!),
        // and its RIGHT normal `nR_end = +st.nL` (which is the wall's LEFT side `+nL`!)!
        let trimWallLeft = endTrim.rightTrim;
        let trimWallRight = endTrim.leftTrim;
        if (!endTrim.isConnected && applyEndCap && endCap === 'angled') {
          trimWallLeft = -h;
          trimWallRight = h;
        }
        lX += -st.tx * trimWallLeft;
        lZ += -st.tz * trimWallLeft;
        rX += -st.tx * trimWallRight;
        rZ += -st.tz * trimWallRight;
      }

      let y0 = 0;
      let y1 = st.hTop;
      if (fixedYOverride) {
        y0 = fixedYOverride.y0;
        y1 = fixedYOverride.y1;
      } else if (yMode.kind === 'fixed') {
        y0 = yMode.y0;
        y1 = Math.min(st.hTop, yMode.y1);
      } else if (yMode.kind === 'header') {
        y0 = Math.min(st.hTop - 0.02, yMode.y0);
        y1 = st.hTop;
      }

      rings.push({
        s,
        lX,
        lZ,
        rX,
        rZ,
        nLx: st.nLx,
        nLz: st.nLz,
        y0,
        y1,
      });
    }

    const pt3 = (x: number, y: number, z: number): [number, number, number] => [
      x + leanPerMeterX * y,
      y,
      z + leanPerMeterZ * y,
    ];

    // Note on Exterior (4) vs Interior (5) convention matching BoxGeometry(+X = along wall, +Z = right `-nL` or `+nL`):
    // In `ArchBuilderEngine`, `wallHolder.rotation.y = -atan2(dz, dx)`:
    // Local `+X` is `(ux, 0, uz)` and local `+Y` is `(0, 1, 0)`, so local `+Z = +X × +Y = (-uz, 0, ux) = +nL`!
    // In Three.js `BoxGeometry`, `+Z` is materialIndex `4` (`extMat`) and `-Z` is materialIndex `5` (`intMat`)!
    // Keeping `+nL` (`lX, lZ`) = `4` (`extMat`) and `-nL` (`rX, rZ`) = `5` (`intMat`) preserves 100% compatibility
    // with existing projects, dual-sided wall painting, and eyedropper!
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i];
      const B = rings[i + 1];
      if (A.y1 - A.y0 < 0.004 && B.y1 - B.y0 < 0.004) continue;

      const uA = A.s * 0.5;
      const uB = B.s * 0.5;

      const smoothNormL0: [number, number, number] | undefined = isCurvedPath
        ? [A.nLx, 0, A.nLz]
        : undefined;
      const smoothNormL1: [number, number, number] | undefined = isCurvedPath
        ? [B.nLx, 0, B.nLz]
        : undefined;
      const smoothNormR0: [number, number, number] | undefined = isCurvedPath
        ? [-A.nLx, 0, -A.nLz]
        : undefined;
      const smoothNormR1: [number, number, number] | undefined = isCurvedPath
        ? [-B.nLx, 0, -B.nLz]
        : undefined;

      // +nL Left / Exterior face (matIndex 4): outward normal is `+nL = (-tz, 0, tx)`.
      // From `A` to `B` (`+t`), `(B - A) × +Y = (+t) × +Y = -nL`, so `+Y × (+t) = +nL`!
      // Quad `(BL_A -> BL_B -> TL_B -> TL_A)`: `(BL_B - BL_A) × (TL_A - BL_A) = (+t) × (+Y) = -nL` -> wait!
      // Let's check `(1,0,0) × (0,1,0) = (0,0,1)`!
      // When `t = (1, 0)`, `nL = (-0, 1) = (0, +1)` (which IS `+Z`!).
      // And `(1, 0, 0) × (0, 1, 0) = (0, 0, +1) = +nL`!!
      // YES! `(BL_A -> BL_B -> TL_B -> TL_A)` has normal `(+t) × (+Y) = +nL` (OUTWARD on Left/+Z side)!
      targetCollector.addQuad(
        4,
        pt3(A.lX, A.y0, A.lZ),
        pt3(B.lX, B.y0, B.lZ),
        pt3(B.lX, B.y1, B.lZ),
        pt3(A.lX, A.y1, A.lZ),
        uA,
        A.y0 * 0.5,
        uB,
        B.y1 * 0.5,
        smoothNormL0,
        smoothNormL1
      );

      // -nL Right / Interior face (matIndex 5): outward normal is `-nL`.
      // Reverse order `(BR_B -> BR_A -> TR_A -> TR_B)` has normal `(-t) × (+Y) = -nL`!
      targetCollector.addQuad(
        5,
        pt3(B.rX, B.y0, B.rZ),
        pt3(A.rX, A.y0, A.rZ),
        pt3(A.rX, A.y1, A.rZ),
        pt3(B.rX, B.y1, B.rZ),
        uB,
        B.y0 * 0.5,
        uA,
        A.y1 * 0.5,
        smoothNormR1,
        smoothNormR0
      );

      // Top cap (+Y, matIndex 0): `(TL_A -> TL_B -> TR_B -> TR_A)`:
      // `(TL_B - TL_A) × (TR_A - TL_A) = (+t) × (-nL)`: `(1,0,0) × (0,0,-1) = (0, +1, 0) = +Y`!
      targetCollector.addQuad(
        0,
        pt3(A.lX, A.y1, A.lZ),
        pt3(B.lX, B.y1, B.lZ),
        pt3(B.rX, B.y1, B.rZ),
        pt3(A.rX, A.y1, A.rZ),
        uA,
        0,
        uB,
        0.2
      );

      // Bottom cap (-Y, matIndex 0): `(BR_A -> BR_B -> BL_B -> BL_A)` -> `(0, -1, 0) = -Y`!
      targetCollector.addQuad(
        0,
        pt3(A.rX, A.y0, A.rZ),
        pt3(B.rX, B.y0, B.rZ),
        pt3(B.lX, B.y0, B.lZ),
        pt3(A.lX, A.y0, A.lZ),
        uA,
        0,
        uB,
        0.2
      );
    }

    // Start cap / N-way apex wedge (`sA`)
    const first = rings[0];
    if (sA <= 0.002 && startTrim.hasVertexApex && startTrim.apexXZ) {
      // N-way junction (T or Cross): close cleanly with two non-overlapping triangles meeting at `apexXZ`!
      const vx = startTrim.apexXZ.x;
      const vz = startTrim.apexXZ.z;
      // Top wedge (+Y): `(Apex -> TL_0 -> TR_0)` -> let's check: from Apex `(0,0)` to `TL_0 (trim, +h)` to `TR_0 (trim, -h)`:
      // `(trim, 0, h) × (trim, 0, -h) = (0, 2*trim*h, 0)` — wait: use CCW check in XZ so +Y is ALWAYS upward!
      const crossXZ =
        (first.lX - vx) * (first.rZ - vz) - (first.lZ - vz) * (first.rX - vx);
      if (Math.abs(crossXZ) > 1e-6) {
        if (crossXZ < 0) {
          targetCollector.addTri(
            0,
            ...pt3(vx, first.y1, vz),
            ...pt3(first.lX, first.y1, first.lZ),
            ...pt3(first.rX, first.y1, first.rZ)
          );
          targetCollector.addTri(
            0,
            ...pt3(vx, first.y0, vz),
            ...pt3(first.rX, first.y0, first.rZ),
            ...pt3(first.lX, first.y0, first.lZ)
          );
        } else {
          targetCollector.addTri(
            0,
            ...pt3(vx, first.y1, vz),
            ...pt3(first.rX, first.y1, first.rZ),
            ...pt3(first.lX, first.y1, first.lZ)
          );
          targetCollector.addTri(
            0,
            ...pt3(vx, first.y0, vz),
            ...pt3(first.lX, first.y0, first.lZ),
            ...pt3(first.rX, first.y0, first.rZ)
          );
        }
      }
      targetCollector.addQuad(
        0,
        pt3(first.rX, first.y0, first.rZ),
        pt3(vx, first.y0, vz),
        pt3(vx, first.y1, vz),
        pt3(first.rX, first.y1, first.rZ)
      );
      targetCollector.addQuad(
        0,
        pt3(vx, first.y0, vz),
        pt3(first.lX, first.y0, first.lZ),
        pt3(first.lX, first.y1, first.lZ),
        pt3(vx, first.y1, vz)
      );
    } else if (closeStartJamb) {
      // Outward normal at start points `-t`: `(BR_0 -> BL_0 -> TL_0 -> TR_0)`:
      // `(BL_0 - BR_0) × (TR_0 - BR_0) = (+2h nL) × (+Y) = (0,0,1) × (0,1,0) = (-1, 0, 0) = -t`!
      targetCollector.addQuad(
        0,
        pt3(first.rX, first.y0, first.rZ),
        pt3(first.lX, first.y0, first.lZ),
        pt3(first.lX, first.y1, first.lZ),
        pt3(first.rX, first.y1, first.rZ)
      );
    }

    // End cap / N-way apex wedge (`sB`)
    const last = rings[rings.length - 1];
    if (sB >= totalLen - 0.002 && endTrim.hasVertexApex && endTrim.apexXZ) {
      const vx = endTrim.apexXZ.x;
      const vz = endTrim.apexXZ.z;
      const crossXZ =
        (last.lX - vx) * (last.rZ - vz) - (last.lZ - vz) * (last.rX - vx);
      if (Math.abs(crossXZ) > 1e-6) {
        if (crossXZ < 0) {
          targetCollector.addTri(
            0,
            ...pt3(vx, last.y1, vz),
            ...pt3(last.lX, last.y1, last.lZ),
            ...pt3(last.rX, last.y1, last.rZ)
          );
          targetCollector.addTri(
            0,
            ...pt3(vx, last.y0, vz),
            ...pt3(last.rX, last.y0, last.rZ),
            ...pt3(last.lX, last.y0, last.lZ)
          );
        } else {
          targetCollector.addTri(
            0,
            ...pt3(vx, last.y1, vz),
            ...pt3(last.rX, last.y1, last.rZ),
            ...pt3(last.lX, last.y1, last.lZ)
          );
          targetCollector.addTri(
            0,
            ...pt3(vx, last.y0, vz),
            ...pt3(last.lX, last.y0, last.lZ),
            ...pt3(last.rX, last.y0, last.rZ)
          );
        }
      }
      targetCollector.addQuad(
        0,
        pt3(last.lX, last.y0, last.lZ),
        pt3(vx, last.y0, vz),
        pt3(vx, last.y1, vz),
        pt3(last.lX, last.y1, last.lZ)
      );
      targetCollector.addQuad(
        0,
        pt3(vx, last.y0, vz),
        pt3(last.rX, last.y0, last.rZ),
        pt3(last.rX, last.y1, last.rZ),
        pt3(vx, last.y1, vz)
      );
    } else if (closeEndJamb) {
      // Outward normal at end points `+t`: `(BL_n -> BR_n -> TR_n -> TL_n)`!
      targetCollector.addQuad(
        0,
        pt3(last.lX, last.y0, last.lZ),
        pt3(last.rX, last.y0, last.rZ),
        pt3(last.rX, last.y1, last.rZ),
        pt3(last.lX, last.y1, last.lZ)
      );
    }
  };

  // Emit main wall body spans (with exact Door & Window cutouts!)
  let cursor = sBodyStart;
  for (let idx = 0; idx < ops.length; idx++) {
    const item = ops[idx];
    if (item.s0 - cursor > 0.01) {
      emitSpanSegment(
        cursor,
        item.s0,
        { kind: 'full' },
        cursor <= sBodyStart + 0.002 && !applyStartCap,
        true
      );
    }
    if (item.op.sillHeight > 0.025) {
      emitSpanSegment(
        item.s0,
        item.s1,
        { kind: 'fixed', y0: 0, y1: item.op.sillHeight },
        false,
        false
      );
    }
    const headerBottom = item.op.sillHeight + item.op.height;
    if (headerBottom < Math.max(H0, H1) - 0.025) {
      emitSpanSegment(
        item.s0,
        item.s1,
        { kind: 'header', y0: headerBottom },
        false,
        false
      );
    }
    cursor = item.s1;
  }

  if (sBodyEnd - cursor > 0.01) {
    emitSpanSegment(
      cursor,
      sBodyEnd,
      { kind: 'full' },
      cursor <= sBodyStart + 0.002 &&
        !(applyStartCap && capSpanFor(endCap, T0) > 0),
      !(applyEndCap && capSpanFor(endCap, T1) > 0)
    );
  }

  // Helper: Sculpt bespoke architectural Wall End Cap at `whichEnd` (`'start' | 'end'`)
  const buildSculptedEndCap = (whichEnd: 'start' | 'end') => {
    const isEnd = whichEnd === 'end';
    const span = capSpanFor(endCap, isEnd ? T1 : T0);
    const sBase = isEnd ? totalLen - span : span;
    const baseSt = stationAtS(sBase);
    const tipSt = stationAtS(isEnd ? totalLen : 0);
    // Outward tangent pointing FROM `sBase` TOWARD tip
    const dirX = isEnd ? baseSt.tx : -baseSt.tx;
    const dirZ = isEnd ? baseSt.tz : -baseSt.tz;
    // Left normal in `(X, Z)` CCW (`nL = (-dirZ, dirX)`):
    // Note: when `isEnd === true`, `nL = baseSt.nL` (mat 4 on left, mat 5 on right).
    // When `isEnd === false`, `dir = -baseSt.t`, so `(-dirZ, dirX) = -baseSt.nL` (mat 5 on its left, mat 4 on its right)!
    const leftX = -dirZ;
    const leftZ = dirX;
    const leftMat: 4 | 5 = isEnd ? 4 : 5;
    const rightMat: 4 | 5 = isEnd ? 5 : 4;
    const h = baseSt.halfT;
    const topY = tipSt.hTop;
    const bx = baseSt.x;
    const bz = baseSt.z;

    if (endCap === 'beveled' && span > 0.005) {
      // 3-facet symmetric chamfered end
      const noseH = h * 0.38;
      // Polygon in CCW `(X, Z)` order: BaseRight -> NoseRight -> NoseLeft -> BaseLeft
      // Wait: check CCW in `(X, Z)` where `+dir` is X' and `+left` is Z':
      // `BaseRight (0, -h) -> NoseRight (span, -noseH) -> NoseLeft (span, +noseH) -> BaseLeft (0, +h)`:
      // Signed area in `(dir, left)`: `(0*-noseH - -h*span) + (span*noseH - -noseH*span) + (span*h - noseH*0) + (0*-h - h*0) = h*span + 2*noseH*span + h*span > 0` (STRICTLY CCW!)
      collector.addExtrudedPolygonBlock(
        [
          {
            x: bx - leftX * h,
            z: bz - leftZ * h,
            edgeMat: rightMat,
          },
          {
            x: bx + dirX * span - leftX * noseH,
            z: bz + dirZ * span - leftZ * noseH,
            edgeMat: 0,
          },
          {
            x: bx + dirX * span + leftX * noseH,
            z: bz + dirZ * span + leftZ * noseH,
            edgeMat: leftMat,
          },
          {
            x: bx + leftX * h,
            z: bz + leftZ * h,
            edgeMat: 0,
          },
        ],
        0,
        topY,
        leanPerMeterX,
        leanPerMeterZ
      );
      return;
    }

    if (endCap === 'pointed' && span > 0.005) {
      // Crisp symmetric V-prow pointed arrow end
      collector.addExtrudedPolygonBlock(
        [
          {
            x: bx - leftX * h,
            z: bz - leftZ * h,
            edgeMat: rightMat,
          },
          {
            x: bx + dirX * span,
            z: bz + dirZ * span,
            edgeMat: leftMat,
          },
          {
            x: bx + leftX * h,
            z: bz + leftZ * h,
            edgeMat: 0,
          },
        ],
        0,
        topY,
        leanPerMeterX,
        leanPerMeterZ
      );
      return;
    }

    if (endCap === 'tapered' && span > 0.005) {
      const tipH = Math.max(0.022, h * 0.26);
      collector.addExtrudedPolygonBlock(
        [
          {
            x: bx - leftX * h,
            z: bz - leftZ * h,
            edgeMat: rightMat,
          },
          {
            x: bx + dirX * span - leftX * tipH,
            z: bz + dirZ * span - leftZ * tipH,
            edgeMat: 0,
          },
          {
            x: bx + dirX * span + leftX * tipH,
            z: bz + dirZ * span + leftZ * tipH,
            edgeMat: leftMat,
          },
          {
            x: bx + leftX * h,
            z: bz + leftZ * h,
            edgeMat: 0,
          },
        ],
        0,
        topY,
        leanPerMeterX,
        leanPerMeterZ
      );
      return;
    }

    if (endCap === 'rounded' && span > 0.005) {
      // Smooth 20-segment 180° semicircular bullnose centered at `(bx + dir*(span - h), bz + dir*(span - h))`
      const r = h;
      const cx = bx + dirX * Math.max(0, span - r);
      const cz = bz + dirZ * Math.max(0, span - r);
      const segs = 20;
      const ring: Array<{ x: number; z: number; edgeMat: 0 | 4 | 5 }> = [];
      if (span > r + 0.002) {
        ring.push({
          x: bx - leftX * h,
          z: bz - leftZ * h,
          edgeMat: rightMat,
        });
      }
      for (let k = 0; k <= segs; k++) {
        // Angle from `-π/2` (right `-left`) through `0` (`+dir` tip) to `+π/2` (`+left`) -> CCW in `(dir, left)`!
        const ang = -Math.PI * 0.5 + (Math.PI * k) / segs;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        ring.push({
          x: cx + dirX * (r * cosA) + leftX * (r * sinA),
          z: cz + dirZ * (r * cosA) + leftZ * (r * sinA),
          edgeMat: k < segs ? (sinA >= 0 ? leftMat : rightMat) : 0,
        });
      }
      if (span > r + 0.002) {
        ring.push({
          x: bx + leftX * h,
          z: bz + leftZ * h,
          edgeMat: 0,
        });
      }
      collector.addExtrudedPolygonBlock(
        ring,
        0,
        topY,
        leanPerMeterX,
        leanPerMeterZ
      );
      return;
    }

    if (endCap === 'stepped' && span > 0.01) {
      // 4 crisp architectural stepped terrace tiers (`100% -> 76% -> 52% -> 28%` height)
      const tiers = [0.82, 0.61, 0.4, 0.22];
      const stepW = span / tiers.length;
      for (let tIdx = 0; tIdx < tiers.length; tIdx++) {
        const xA = bx + dirX * (stepW * tIdx);
        const zA = bz + dirZ * (stepW * tIdx);
        const xB = bx + dirX * (stepW * (tIdx + 1));
        const zB = bz + dirZ * (stepW * (tIdx + 1));
        const tierH = Math.max(0.2, topY * tiers[tIdx]);
        collector.addExtrudedPolygonBlock(
          [
            { x: xA - leftX * h, z: zA - leftZ * h, edgeMat: rightMat },
            { x: xB - leftX * h, z: zB - leftZ * h, edgeMat: 0 },
            { x: xB + leftX * h, z: zB + leftZ * h, edgeMat: leftMat },
            { x: xA + leftX * h, z: zA + leftZ * h, edgeMat: 0 },
          ],
          0,
          tierH,
          leanPerMeterX,
          leanPerMeterZ
        );
      }
      return;
    }

    if (endCap === 'pillar') {
      // Integrated architectural square pier with molded base plinth & top capital
      const pierHalf = Math.max(h * 1.65, 0.14);
      const px = bx + dirX * Math.max(pierHalf * 0.55, span * 0.5);
      const pz = bz + dirZ * Math.max(pierHalf * 0.55, span * 0.5);
      const makeBoxRing = (
        cx: number,
        cz: number,
        hw: number,
        matSide: 0 | 4 | 5
      ) => [
        {
          x: cx - dirX * hw - leftX * hw,
          z: cz - dirZ * hw - leftZ * hw,
          edgeMat: matSide,
        },
        {
          x: cx + dirX * hw - leftX * hw,
          z: cz + dirZ * hw - leftZ * hw,
          edgeMat: matSide,
        },
        {
          x: cx + dirX * hw + leftX * hw,
          z: cz + dirZ * hw + leftZ * hw,
          edgeMat: matSide,
        },
        {
          x: cx - dirX * hw + leftX * hw,
          z: cz - dirZ * hw + leftZ * hw,
          edgeMat: matSide,
        },
      ];
      // Pier shaft
      collector.addExtrudedPolygonBlock(
        makeBoxRing(px, pz, pierHalf, 4),
        0,
        topY + 0.04,
        leanPerMeterX,
        leanPerMeterZ
      );
      // Plinth base & top capital in trim extras
      extrasCollector.addExtrudedPolygonBlock(
        makeBoxRing(px, pz, pierHalf + 0.024, 0),
        0,
        0.11,
        leanPerMeterX,
        leanPerMeterZ
      );
      extrasCollector.addExtrudedPolygonBlock(
        makeBoxRing(px, pz, pierHalf + 0.028, 0),
        topY + 0.04,
        topY + 0.1,
        leanPerMeterX,
        leanPerMeterZ
      );
      return;
    }

    if (endCap === 'cap') {
      // Crisp proud end-casing wrap around the free end face
      const capDepth = 0.055;
      const capHalf = h + 0.018;
      const ex = tipSt.x;
      const ez = tipSt.z;
      extrasCollector.addExtrudedPolygonBlock(
        [
          {
            x: ex - dirX * capDepth - leftX * capHalf,
            z: ez - dirZ * capDepth - leftZ * capHalf,
            edgeMat: 0,
          },
          {
            x: ex + dirX * 0.016 - leftX * capHalf,
            z: ez + dirZ * 0.016 - leftZ * capHalf,
            edgeMat: 0,
          },
          {
            x: ex + dirX * 0.016 + leftX * capHalf,
            z: ez + dirZ * 0.016 + leftZ * capHalf,
            edgeMat: 0,
          },
          {
            x: ex - dirX * capDepth + leftX * capHalf,
            z: ez - dirZ * capDepth + leftZ * capHalf,
            edgeMat: 0,
          },
        ],
        0,
        topY + 0.012,
        leanPerMeterX,
        leanPerMeterZ
      );
    }
  };

  if (applyStartCap) buildSculptedEndCap('start');
  if (applyEndCap) buildSculptedEndCap('end');

  // Mitered Baseboard along solid wall spans (full wall with `hasBaseboard`)
  if (wall.hasBaseboard && wall.style === 'full') {
    let bCur = sBodyStart;
    for (const item of ops) {
      if (item.op.sillHeight <= 0.08) {
        if (item.s0 - bCur > 0.04) {
          emitSpanSegment(
            bCur,
            item.s0,
            { kind: 'fixed', y0: 0, y1: 0.085 },
            true,
            true,
            extrasCollector,
            0.012,
            { y0: 0, y1: 0.085 }
          );
        }
        bCur = item.s1;
      }
    }
    if (sBodyEnd - bCur > 0.04) {
      emitSpanSegment(
        bCur,
        sBodyEnd,
        { kind: 'fixed', y0: 0, y1: 0.085 },
        bCur > sBodyStart + 0.01,
        false,
        extrasCollector,
        0.012,
        { y0: 0, y1: 0.085 }
      );
    }
  }

  // Mitered Top Coping Cap for Half Wall & Low Wall (`style === 'half'` or `templateId === 'low-wall'`)
  const needsCoping =
    wall.style === 'half' ||
    wall.templateId === 'half-wall' ||
    wall.templateId === 'low-wall';
  if (needsCoping && Math.abs(H1 - H0) < 0.02 && endCap !== 'stepped') {
    emitSpanSegment(
      sBodyStart,
      sBodyEnd,
      { kind: 'fixed', y0: H0, y1: H0 + 0.045 },
      !startTrim.isConnected,
      !endTrim.isConnected,
      copingCollector,
      0.016,
      { y0: H0, y1: H0 + 0.045 }
    );
  }

  const bodyGeo = collector.buildGeometry();
  const copingTest = copingCollector.buildGeometry();
  const copingGeo =
    copingTest.getAttribute('position').count > 0 ? copingTest : null;
  if (!copingGeo) copingTest.dispose();

  const extrasTest = extrasCollector.buildGeometry();
  const trimExtrasGeo =
    extrasTest.getAttribute('position').count > 0 ? extrasTest : null;
  if (!trimExtrasGeo) extrasTest.dispose();

  return { bodyGeo, copingGeo, trimExtrasGeo };
}

/**
 * Builds a watertight, tangent-continuous 24-segment Corner Fillet (`rounded-inner`, `rounded-outer`)
 * or Architectural Corner Quoin (`outer-quoin`) mesh at a 2-wall junction!
 */
export function buildCornerFilletGeometry(
  spec: CornerFilletSpec
): THREE.BufferGeometry | null {
  const collector = new DualWallMeshCollector();
  const { vertex, wallA, wallB, endA, endB, pullback, height } = spec;

  const sA0 = sampleAdvancedWallPath(wallA, endA === 'start' ? 0 : 1);
  const sB0 = sampleAdvancedWallPath(wallB, endB === 'start' ? 0 : 1);
  const tAx = endA === 'start' ? sA0.tx : -sA0.tx;
  const tAz = endA === 'start' ? sA0.tz : -sA0.tz;
  const tBx = endB === 'start' ? sB0.tx : -sB0.tx;
  const tBz = endB === 'start' ? sB0.tz : -sB0.tz;

  const hA = wallA.thickness * 0.5;
  const hB = wallB.thickness * 0.5;
  const h = (hA + hB) * 0.5;

  // Determine which side of A->B is concave (inner `< 180°`) vs convex (outer `> 180°`)!
  // Cross product `tA × tB` in 2D (`tAx * tBz - tAz * tBx`):
  // If `cross > 0`, `tB` is on the `+nL_A = (-tAz, tAx)` side of `tA` (so `+nL_A` and `-nL_B` face INSIDE the concave turn!).
  const cross = tAx * tBz - tAz * tBx;
  if (Math.abs(cross) < 0.08) return null;

  const inSignA = cross > 0 ? 1 : -1; // +1 means `+nL_A` is concave inner side
  const inSignB = cross > 0 ? -1 : 1; // -1 means `-nL_B` is concave inner side

  const nLAx = -tAz;
  const nLAz = tAx;
  const nLBx = -tBz;
  const nLBz = tBx;

  const inNormAx = nLAx * inSignA;
  const inNormAz = nLAz * inSignA;
  const inNormBx = nLBx * inSignB;
  const inNormBz = nLBz * inSignB;

  const outNormAx = -inNormAx;
  const outNormAz = -inNormAz;
  const outNormBx = -inNormBx;
  const outNormBz = -inNormBz;

  // Inner & outer miter intersections
  const hitIn = intersect2DLines(
    vertex.x + inNormAx * hA,
    vertex.z + inNormAz * hA,
    tAx,
    tAz,
    vertex.x + inNormBx * hB,
    vertex.z + inNormBz * hB,
    tBx,
    tBz
  );
  const hitOut = intersect2DLines(
    vertex.x + outNormAx * hA,
    vertex.z + outNormAz * hA,
    tAx,
    tAz,
    vertex.x + outNormBx * hB,
    vertex.z + outNormBz * hB,
    tBx,
    tBz
  );
  if (!hitIn || !hitOut) return null;

  const mInX = vertex.x + inNormAx * hA + tAx * hitIn.sA;
  const mInZ = vertex.z + inNormAz * hA + tAz * hitIn.sA;
  const mOutX = vertex.x + outNormAx * hA + tAx * hitOut.sA;
  const mOutZ = vertex.z + outNormAz * hA + tAz * hitOut.sA;

  if (spec.style === 'outer-quoin') {
    // Crisp architectural corner quoin / trim column hugging the outer corner!
    const qLen = Math.max(0.22, h * 2.1);
    const qOut = 0.022;
    const p0x = mOutX + outNormAx * qOut + outNormBx * qOut;
    const p0z = mOutZ + outNormAz * qOut + outNormBz * qOut;
    const pAx = p0x + tAx * qLen;
    const pAz = p0z + tAz * qLen;
    const pBx = p0x + tBx * qLen;
    const pBz = p0z + tBz * qLen;
    const thickQ = 0.042;

    const ringA =
      cross > 0
        ? [
            { x: p0x, z: p0z, edgeMat: 0 as const },
            { x: pBx, z: pBz, edgeMat: 0 as const },
            {
              x: pBx - outNormBx * thickQ,
              z: pBz - outNormBz * thickQ,
              edgeMat: 0 as const,
            },
            {
              x: p0x - outNormAx * thickQ - outNormBx * thickQ,
              z: p0z - outNormAz * thickQ - outNormBz * thickQ,
              edgeMat: 0 as const,
            },
            {
              x: pAx - outNormAx * thickQ,
              z: pAz - outNormAz * thickQ,
              edgeMat: 0 as const,
            },
            { x: pAx, z: pAz, edgeMat: 0 as const },
          ]
        : [
            { x: p0x, z: p0z, edgeMat: 0 as const },
            { x: pAx, z: pAz, edgeMat: 0 as const },
            {
              x: pAx - outNormAx * thickQ,
              z: pAz - outNormAz * thickQ,
              edgeMat: 0 as const,
            },
            {
              x: p0x - outNormAx * thickQ - outNormBx * thickQ,
              z: p0z - outNormAz * thickQ - outNormBz * thickQ,
              edgeMat: 0 as const,
            },
            {
              x: pBx - outNormBx * thickQ,
              z: pBz - outNormBz * thickQ,
              edgeMat: 0 as const,
            },
            { x: pBx, z: pBz, edgeMat: 0 as const },
          ];
    collector.addExtrudedPolygonBlock(ringA, 0, height + 0.015);
    return collector.buildGeometry();
  }

  // Endpoints on Wall A & Wall B at `pullback`
  const aInX = vertex.x + tAx * pullback + inNormAx * hA;
  const aInZ = vertex.z + tAz * pullback + inNormAz * hA;
  const aOutX = vertex.x + tAx * pullback + outNormAx * hA;
  const aOutZ = vertex.z + tAz * pullback + outNormAz * hA;

  const bInX = vertex.x + tBx * pullback + inNormBx * hB;
  const bInZ = vertex.z + tBz * pullback + inNormBz * hB;
  const bOutX = vertex.x + tBx * pullback + outNormBx * hB;
  const bOutZ = vertex.z + tBz * pullback + outNormBz * hB;

  // Material indices for inner vs outer sides of Wall A
  const innerMat: 4 | 5 =
    (endA === 'start' ? inSignA : -inSignA) > 0 ? 4 : 5;
  const outerMat: 4 | 5 = innerMat === 4 ? 5 : 4;

  const segs = 24;
  // Build polygon in CCW `(X, Z)` order by checking signed area!
  const rawPts: Array<{ x: number; z: number; edgeMat: 0 | 4 | 5 }> = [];

  if (spec.style === 'rounded-inner') {
    // Outer boundary stays sharp 90° (`aOut -> mOut -> bOut`), inner boundary sweeps quadratic/circular Bezier `bIn -> mIn -> aIn`!
    rawPts.push({ x: aOutX, z: aOutZ, edgeMat: outerMat });
    rawPts.push({ x: mOutX, z: mOutZ, edgeMat: outerMat });
    rawPts.push({ x: bOutX, z: bOutZ, edgeMat: 0 });
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const omu = 1 - u;
      // Exact rational quadratic Bezier with weight `w = cos(θ/2)` gives a 100% TRUE circular arc!
      const ux1 = bInX - mInX;
      const uz1 = bInZ - mInZ;
      const ux2 = aInX - mInX;
      const uz2 = aInZ - mInZ;
      const l1 = Math.max(1e-4, Math.hypot(ux1, uz1));
      const l2 = Math.max(1e-4, Math.hypot(ux2, uz2));
      const cosAng = Math.max(
        -0.98,
        Math.min(0.98, (ux1 * ux2 + uz1 * uz2) / (l1 * l2))
      );
      const w = Math.sqrt(Math.max(0.05, (1 + cosAng) * 0.5));
      const denom = omu * omu + 2 * w * omu * u + u * u;
      const px = (omu * omu * bInX + 2 * w * omu * u * mInX + u * u * aInX) / denom;
      const pz = (omu * omu * bInZ + 2 * w * omu * u * mInZ + u * u * aInZ) / denom;
      rawPts.push({
        x: px,
        z: pz,
        edgeMat: i < segs ? innerMat : 0,
      });
    }
  } else {
    // `rounded-outer`: Inner boundary stays sharp (`bIn -> mIn -> aIn`), outer boundary sweeps TRUE circular bullnose arc `aOut -> mOut -> bOut`!
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const omu = 1 - u;
      const ux1 = aOutX - mOutX;
      const uz1 = aOutZ - mOutZ;
      const ux2 = bOutX - mOutX;
      const uz2 = bOutZ - mOutZ;
      const l1 = Math.max(1e-4, Math.hypot(ux1, uz1));
      const l2 = Math.max(1e-4, Math.hypot(ux2, uz2));
      const cosAng = Math.max(
        -0.98,
        Math.min(0.98, (ux1 * ux2 + uz1 * uz2) / (l1 * l2))
      );
      const w = Math.sqrt(Math.max(0.05, (1 + cosAng) * 0.5));
      const denom = omu * omu + 2 * w * omu * u + u * u;
      const px =
        (omu * omu * aOutX + 2 * w * omu * u * mOutX + u * u * bOutX) / denom;
      const pz =
        (omu * omu * aOutZ + 2 * w * omu * u * mOutZ + u * u * bOutZ) / denom;
      rawPts.push({
        x: px,
        z: pz,
        edgeMat: i < segs ? outerMat : 0,
      });
    }
    rawPts.push({ x: bInX, z: bInZ, edgeMat: innerMat });
    rawPts.push({ x: mInX, z: mInZ, edgeMat: innerMat });
    rawPts.push({ x: aInX, z: aInZ, edgeMat: 0 });
  }

  // Ensure strictly CCW `(X, Z)` orientation (`signedArea > 0`)
  let area2 = 0;
  for (let i = 0; i < rawPts.length; i++) {
    const j = (i + 1) % rawPts.length;
    area2 += rawPts[i].x * rawPts[j].z - rawPts[j].x * rawPts[i].z;
  }
  if (area2 < 0) {
    // Reverse vertices and shift edgeMat indices so each edge keeps its original segment material!
    const n = rawPts.length;
    const rev: Array<{ x: number; z: number; edgeMat: 0 | 4 | 5 }> = [];
    for (let i = 0; i < n; i++) {
      const origIdx = (n - 1 - i + n) % n;
      const prevEdgeIdx = (origIdx - 1 + n) % n;
      rev.push({
        x: rawPts[origIdx].x,
        z: rawPts[origIdx].z,
        edgeMat: rawPts[prevEdgeIdx].edgeMat,
      });
    }
    collector.addExtrudedPolygonBlock(rev, 0, height);
  } else {
    collector.addExtrudedPolygonBlock(rawPts, 0, height);
  }

  return collector.buildGeometry();
}
