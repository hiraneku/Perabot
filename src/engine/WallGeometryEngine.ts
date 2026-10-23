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
    | 'start'
    | 'end'
    | 'curveBulge'
    | 'pathMode'
    | 'sWaveAmp'
    | 'bezierControl1Along'
    | 'bezierControl1Offset'
    | 'bezierControl2Along'
    | 'bezierControl2Offset'
    | 'endCap'
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
  if (mode === 'cubic-bezier') {
    const c1Along = Math.max(0, Math.min(1, wall.bezierControl1Along ?? 0.25));
    const c2Along = Math.max(0, Math.min(1, wall.bezierControl2Along ?? 0.75));
    const c1Offset = Math.max(-3, Math.min(3, wall.bezierControl1Offset ?? 0));
    const c2Offset = Math.max(-3, Math.min(3, wall.bezierControl2Offset ?? 0));
    const p1x = x0 + ux * chord * c1Along + nx * c1Offset;
    const p1z = z0 + uz * chord * c1Along + nz * c1Offset;
    const p2x = x0 + ux * chord * c2Along + nx * c2Offset;
    const p2z = z0 + uz * chord * c2Along + nz * c2Offset;
    const omt = 1 - t;
    const omt2 = omt * omt;
    const t2 = t * t;
    const px = omt2 * omt * x0 + 3 * omt2 * t * p1x + 3 * omt * t2 * p2x + t2 * t * x1;
    const pz = omt2 * omt * z0 + 3 * omt2 * t * p1z + 3 * omt * t2 * p2z + t2 * t * z1;
    const dpx = 3 * omt2 * (p1x - x0) + 6 * omt * t * (p2x - p1x) + 3 * t2 * (x1 - p2x);
    const dpz = 3 * omt2 * (p1z - z0) + 6 * omt * t * (p2z - p1z) + 3 * t2 * (z1 - p2z);
    const dLen = Math.max(1e-5, Math.hypot(dpx, dpz));
    return { x: px, z: pz, tx: dpx / dLen, tz: dpz / dLen };
  }

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

  // 2. Straight Wall Body + C¹ Smooth 85° J-Hook Tip (`curved-end-wall`)
  if (mode === 'j-curve-end') {
    const tSplit = 0.6;
    const sign = wall.curveBulge < 0 ? -1 : 1;
    const mag = Math.min(
      1.35,
      Math.max(0.75, Math.abs(wall.curveBulge || 0.55) / 0.55)
    );
    const biasRad = -0.33 * mag * sign;
    const cosB = Math.cos(biasRad);
    const sinB = Math.sin(biasRad);
    const dirX = ux * cosB - uz * sinB;
    const dirZ = ux * sinB + uz * cosB;

    const L1 = chord * 0.64;
    const L2 = chord * 0.41 * mag;
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

const WALL_ARC_LENGTH_SAMPLES = 96;

/** Maps normalized physical distance along the path to its native curve parameter.
 * Curve parameters are not generally proportional to arc length (notably cubic Béziers),
 * while openings, thickness transitions and swept geometry are specified in metres.
 */
export function createAdvancedWallDistanceSampler(
  wall: Parameters<typeof sampleAdvancedWallPath>[0]
): (distanceRatio: number) => PathSample2D {
  const isCurved = Math.abs(wall.curveBulge) >= 0.015 ||
    wall.pathMode === 's-curve' || wall.pathMode === 'j-curve-end' ||
    wall.pathMode === 'cubic-bezier' || wall.endCap === 'curved';
  if (!isCurved) {
    return (distanceRatio: number) =>
      sampleAdvancedWallPath(wall, Math.max(0, Math.min(1, distanceRatio)));
  }
  const points: PathSample2D[] = [sampleAdvancedWallPath(wall, 0)];
  const cumulative = [0];
  for (let i = 1; i <= WALL_ARC_LENGTH_SAMPLES; i++) {
    const point = sampleAdvancedWallPath(wall, i / WALL_ARC_LENGTH_SAMPLES);
    const prev = points[i - 1];
    cumulative.push(cumulative[i - 1] + Math.hypot(point.x - prev.x, point.z - prev.z));
    points.push(point);
  }
  const total = cumulative[WALL_ARC_LENGTH_SAMPLES];
  return (distanceRatio: number) => {
    const target = Math.max(0, Math.min(1, distanceRatio)) * total;
    let upper = 1;
    while (upper < cumulative.length - 1 && cumulative[upper] < target) upper++;
    const lower = upper - 1;
    const segment = cumulative[upper] - cumulative[lower];
    const fraction = segment > 1e-10 ? (target - cumulative[lower]) / segment : 0;
    const t = (lower + fraction) / WALL_ARC_LENGTH_SAMPLES;
    return sampleAdvancedWallPath(wall, t);
  };
}

export function sampleAdvancedWallPathAtDistance(
  wall: Parameters<typeof sampleAdvancedWallPath>[0],
  distanceRatio: number
): PathSample2D {
  return createAdvancedWallDistanceSampler(wall)(distanceRatio);
}

export function computeAdvancedWallLength(
  wall: Pick<
    ArchWallSegment,
    | 'start'
    | 'end'
    | 'curveBulge'
    | 'pathMode'
    | 'sWaveAmp'
    | 'bezierControl1Along'
    | 'bezierControl1Offset'
    | 'bezierControl2Along'
    | 'bezierControl2Offset'
    | 'endCap'
  >
): number {
  const chord = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  const isCurved =
    Math.abs(wall.curveBulge) >= 0.015 ||
    wall.pathMode === 's-curve' ||
    wall.pathMode === 'j-curve-end' ||
    wall.pathMode === 'cubic-bezier' ||
    wall.endCap === 'curved';
  if (!isCurved) return chord;

  let sum = 0;
  let prev = sampleAdvancedWallPath(wall, 0);
  for (let i = 1; i <= WALL_ARC_LENGTH_SAMPLES; i++) {
    const cur = sampleAdvancedWallPath(wall, i / WALL_ARC_LENGTH_SAMPLES);
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
          cStyle === 'outer-quoin' ||
          cStyle === 'inner-trim') &&
        betweenRad >= (32 * Math.PI) / 180 &&
        betweenRad <= (152 * Math.PI) / 180
      ) {
        if (cStyle === 'rounded-inner' || cStyle === 'rounded-outer') {
          const avgT = eA.halfT + eB.halfT;
          const reqRad =
            eA.wall.cornerRadius ??
            eB.wall.cornerRadius ??
            (cStyle === 'rounded-inner' ? 0.52 : 0.52);
          let maxPull = Math.min(eA.wallLen * 0.45, eB.wallLen * 0.45);
          if (cStyle === 'rounded-outer') {
            // Analytical throat-thickness guard: ensure outer bullnose arc never crosses sharp inner miter `mIn`!
            const beta = Math.max(0.28, Math.min(1.4, betweenRad * 0.5));
            const sinB = Math.sin(beta);
            const tanB = Math.tan(beta);
            const denomFactor = (tanB * (1 - sinB)) / Math.max(1e-4, sinB);
            if (denomFactor > 1e-4) {
              const maxDtan =
                ((1 / sinB - 0.34) * avgT) / denomFactor;
              const safeOuterPull = maxDtan - (avgT * 0.5) / tanB;
              maxPull = Math.min(maxPull, Math.max(avgT * 0.65, safeOuterPull));
            }
          }
          const pullback = Math.min(
            maxPull,
            Math.max(avgT * 0.65, reqRad)
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
        } else if (cStyle === 'outer-quoin' || cStyle === 'inner-trim') {
          filletPieces.push({
            id: `${cStyle}_${eA.wall.floorId}_${cIdx}`,
            floorId: eA.wall.floorId,
            style: cStyle,
            vertex: { x: vx, z: vz },
            wallA: eA.wall,
            wallB: eB.wall,
            endA: eA.endpoint,
            endB: eB.endpoint,
            pullback: 0,
            height: Math.max(eA.wall.height, eB.wall.height),
            thickness: eA.halfT + eB.halfT,
          });
          // Fall through so the two walls STILL sharp-miter 100% cleanly behind the corner trim!
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
   * Extrudes ANY simple 2D XZ polygon (convex OR concave — using `THREE.ShapeUtils.triangulateShape` ear-clipping!)
   * vertically from `y0` to `y1`, with optional lateral lean `(leanX, leanZ)` proportional to `y`.
   */
  public addExtrudedPolygonBlock(
    ringInput: Array<{
      x: number;
      z: number;
      edgeMat: 0 | 4 | 5;
      skipSide?: boolean;
    }>,
    y0: number,
    y1: number,
    leanPerMeterX = 0,
    leanPerMeterZ = 0
  ): void {
    const m = ringInput.length;
    if (m < 3 || y1 - y0 < 0.004) return;

    // Ensure ring is oriented strictly CCW in 2D `(X, Z)` (`signedArea2D > 0`)!
    let area2 = 0;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      area2 += ringInput[i].x * ringInput[j].z - ringInput[j].x * ringInput[i].z;
    }
    if (Math.abs(area2) < 1e-8) return;

    const ringCCW =
      area2 > 0
        ? ringInput
        : ringInput.map((_, idx) => {
            const origIdx = (m - 1 - idx + m) % m;
            const prevEdgeIdx = (origIdx - 1 + m) % m;
            return {
              x: ringInput[origIdx].x,
              z: ringInput[origIdx].z,
              edgeMat: ringInput[prevEdgeIdx].edgeMat,
              skipSide: ringInput[prevEdgeIdx].skipSide,
            };
          });

    const botPts = ringCCW.map(
      (p) =>
        [p.x + leanPerMeterX * y0, y0, p.z + leanPerMeterZ * y0] as [
          number,
          number,
          number,
        ]
    );
    const topPts = ringCCW.map(
      (p) =>
        [p.x + leanPerMeterX * y1, y1, p.z + leanPerMeterZ * y1] as [
          number,
          number,
          number,
        ]
    );

    // Ear-clipping triangulation handles ALL concave & convex polygons cleanly!
    const contour2D = ringCCW.map((p) => new THREE.Vector2(p.x, p.z));
    const triIndices = THREE.ShapeUtils.triangulateShape(contour2D, []);

    for (const [ia, ib, ic] of triIndices) {
      const tA = topPts[ia];
      const tB = topPts[ib];
      const tC = topPts[ic];
      // Verify 3D Y-normal sign of `(B - A) × (C - A)`: `ny = (bz - az)*(cx - ax) - (bx - ax)*(cz - az)`
      const ny =
        (tB[2] - tA[2]) * (tC[0] - tA[0]) - (tB[0] - tA[0]) * (tC[2] - tA[2]);
      if (Math.abs(ny) < 1e-10) continue;

      if (ny > 0) {
        // `(ia, ib, ic)` already points +Y (TOP), so `(ia, ic, ib)` points -Y (BOTTOM)
        this.addTri(
          0,
          tA[0],
          y1,
          tA[2],
          tB[0],
          y1,
          tB[2],
          tC[0],
          y1,
          tC[2],
          tA[0] * 0.5,
          tA[2] * 0.5,
          tB[0] * 0.5,
          tB[2] * 0.5,
          tC[0] * 0.5,
          tC[2] * 0.5
        );
        const bA = botPts[ia];
        const bB = botPts[ib];
        const bC = botPts[ic];
        this.addTri(
          0,
          bA[0],
          y0,
          bA[2],
          bC[0],
          y0,
          bC[2],
          bB[0],
          y0,
          bB[2],
          bA[0] * 0.5,
          bA[2] * 0.5,
          bC[0] * 0.5,
          bC[2] * 0.5,
          bB[0] * 0.5,
          bB[2] * 0.5
        );
      } else {
        // `(ia, ic, ib)` points +Y (TOP), `(ia, ib, ic)` points -Y (BOTTOM)
        this.addTri(
          0,
          tA[0],
          y1,
          tA[2],
          tC[0],
          y1,
          tC[2],
          tB[0],
          y1,
          tB[2],
          tA[0] * 0.5,
          tA[2] * 0.5,
          tC[0] * 0.5,
          tC[2] * 0.5,
          tB[0] * 0.5,
          tB[2] * 0.5
        );
        const bA = botPts[ia];
        const bB = botPts[ib];
        const bC = botPts[ic];
        this.addTri(
          0,
          bA[0],
          y0,
          bA[2],
          bB[0],
          y0,
          bB[2],
          bC[0],
          y0,
          bC[2],
          bA[0] * 0.5,
          bA[2] * 0.5,
          bB[0] * 0.5,
          bB[2] * 0.5,
          bC[0] * 0.5,
          bC[2] * 0.5
        );
      }
    }

    // Outward vertical/slanted side quads `(B_i -> T_i -> T_j -> B_j)`
    for (let i = 0; i < m; i++) {
      if (ringCCW[i].skipSide) continue;
      const j = (i + 1) % m;
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
    wall.pathMode === 'cubic-bezier' ||
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
      case 'angled':
        return Math.min(totalLen * 0.34, Math.max(0.32, T * 1.55));
      case 'beveled':
        return Math.min(totalLen * 0.3, Math.max(0.14, T * 0.62));
      case 'rounded':
        return Math.min(totalLen * 0.28, T * 0.5);
      case 'tapered':
        return Math.min(totalLen * 0.38, Math.max(0.95, T * 3.8));
      case 'pointed':
        return Math.min(totalLen * 0.34, Math.max(0.32, T * 1.35));
      case 'stepped':
        return Math.min(totalLen * 0.46, 1.24);
      case 'pillar':
        return Math.min(totalLen * 0.32, Math.max(0.38, T * 2.1));
      case 'cap':
        return Math.min(totalLen * 0.16, 0.055);
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

  // Reuse one arc-length lookup for every geometry station; cubic curve parameter t is non-linear in metres.
  const sampleAtDistance = createAdvancedWallDistanceSampler(wall);

  // Helper: sample centerline, half-thickness, and top height at arc-length `s ∈ [0, totalLen]`
  const stationAtS = (s: number) => {
    const u = Math.max(0, Math.min(1, s / totalLen));
    const pt = sampleAtDistance(u);
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

      // Apply exact start miter trim at the very beginning of the wall (scaled for `extraHalfT` trims!)
      if (i === 0 && sA <= 0.002) {
        const miterScale = st.halfT > 1e-4 ? h / st.halfT : 1;
        const trimL = startTrim.leftTrim * miterScale;
        const trimR = startTrim.rightTrim * miterScale;
        lX += st.tx * trimL;
        lZ += st.tz * trimL;
        rX += st.tx * trimR;
        rZ += st.tz * trimR;
      }

      // Apply exact end miter trim at the very end of the wall (scaled for `extraHalfT` trims!)
      if (i === steps && sB >= totalLen - 0.002) {
        const miterScale = st.halfT > 1e-4 ? h / st.halfT : 1;
        const trimWallLeft = endTrim.rightTrim * miterScale;
        const trimWallRight = endTrim.leftTrim * miterScale;
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
  const closeStartBodyJamb =
    startTrim.filletPullback <= 0.001 &&
    !(applyStartCap && capSpanFor(endCap, T0) > 0);
  const closeEndBodyJamb =
    endTrim.filletPullback <= 0.001 &&
    !(applyEndCap && capSpanFor(endCap, T1) > 0);

  let cursor = sBodyStart;
  for (let idx = 0; idx < ops.length; idx++) {
    const item = ops[idx];
    if (item.s0 - cursor > 0.01) {
      emitSpanSegment(
        cursor,
        item.s0,
        { kind: 'full' },
        cursor <= sBodyStart + 0.002 && closeStartBodyJamb,
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
      cursor <= sBodyStart + 0.002 && closeStartBodyJamb,
      closeEndBodyJamb
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
    // Left normal in `(X, Z)` CCW (`nL = (-dirZ, dirX)`)
    const leftX = -dirZ;
    const leftZ = dirX;
    const leftMat: 4 | 5 = isEnd ? 4 : 5;
    const rightMat: 4 | 5 = isEnd ? 5 : 4;
    const h = baseSt.halfT;
    const topY = tipSt.hTop;
    const bx = baseSt.x;
    const bz = baseSt.z;

    const pt3Cap = (
      x: number,
      y: number,
      z: number
    ): [number, number, number] => [
      x + leanPerMeterX * y,
      y,
      z + leanPerMeterZ * y,
    ];

    if (endCap === 'angled' && span > 0.005) {
      // Bold architectural diagonal slash end (`(0, -h) -> (span, -h) -> (0, +h)` in `(dir, left)`):
      // Diagonal face points toward `(+dir, +left)` so it catches light dramatically in 3D & isometric previews!
      collector.addExtrudedPolygonBlock(
        [
          {
            x: bx - leftX * h,
            z: bz - leftZ * h,
            edgeMat: rightMat,
          },
          {
            x: bx + dirX * span - leftX * h,
            z: bz + dirZ * span - leftZ * h,
            edgeMat: 0,
          },
          {
            x: bx + leftX * h,
            z: bz + leftZ * h,
            edgeMat: 0,
            skipSide: true,
          },
        ],
        0,
        topY,
        leanPerMeterX,
        leanPerMeterZ
      );
      return;
    }

    if (endCap === 'beveled' && span > 0.005) {
      // Crisp 3-facet symmetric chamfered architectural end
      const noseH = h * 0.28;
      collector.addExtrudedPolygonBlock(
        [
          {
            x: bx - leftX * h,
            z: bz - leftZ * h,
            edgeMat: 0,
          },
          {
            x: bx + dirX * span - leftX * noseH,
            z: bz + dirZ * span - leftZ * noseH,
            edgeMat: 0,
          },
          {
            x: bx + dirX * span + leftX * noseH,
            z: bz + dirZ * span + leftZ * noseH,
            edgeMat: 0,
          },
          {
            x: bx + leftX * h,
            z: bz + leftZ * h,
            edgeMat: 0,
            skipSide: true,
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
      // Crisp symmetric V-prow pointed arrow end (coherent trim facets with zero tip color seam!)
      collector.addExtrudedPolygonBlock(
        [
          {
            x: bx - leftX * h,
            z: bz - leftZ * h,
            edgeMat: 0,
          },
          {
            x: bx + dirX * span,
            z: bz + dirZ * span,
            edgeMat: 0,
          },
          {
            x: bx + leftX * h,
            z: bz + leftZ * h,
            edgeMat: 0,
            skipSide: true,
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
      const tipH = Math.max(0.022, h * 0.2);
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
            skipSide: true,
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
      // Smooth 24-segment 180° semicircular bullnose with analytical radial vertex normals!
      const r = h;
      const cx = bx + dirX * Math.max(0, span - r);
      const cz = bz + dirZ * Math.max(0, span - r);
      const segs = 24;
      const capRing: Array<{
        x: number;
        z: number;
        edgeMat: 0 | 4 | 5;
        skipSide?: boolean;
      }> = [];

      if (span > r + 0.002) {
        capRing.push({
          x: bx - leftX * h,
          z: bz - leftZ * h,
          edgeMat: rightMat,
        });
      }

      const arcPts: Array<{
        x: number;
        z: number;
        nx: number;
        nz: number;
      }> = [];
      for (let k = 0; k <= segs; k++) {
        const ang = -Math.PI * 0.5 + (Math.PI * k) / segs;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        const nx = dirX * cosA + leftX * sinA;
        const nz = dirZ * cosA + leftZ * sinA;
        const px = cx + nx * r;
        const pz = cz + nz * r;
        arcPts.push({ x: px, z: pz, nx, nz });
        capRing.push({
          x: px,
          z: pz,
          edgeMat: 0,
          skipSide: true,
        });
      }

      if (span > r + 0.002) {
        // Need side edge from `arcPts[segs]` back to `(bx + left*h)`!
        capRing[capRing.length - 1].skipSide = false;
        capRing[capRing.length - 1].edgeMat = leftMat;
        capRing.push({
          x: bx + leftX * h,
          z: bz + leftZ * h,
          edgeMat: 0,
          skipSide: true,
        });
      }

      // Emit exact ear-clipped top (+Y) & bottom (-Y) caps (plus any straight extension shoulders)
      collector.addExtrudedPolygonBlock(
        capRing,
        0,
        topY,
        leanPerMeterX,
        leanPerMeterZ
      );

      // Emit smooth radial-normal semicircular bullnose cylinder wall (`p0=botB, p1=botA, p2=topA, p3=topB` -> outward normal!)
      for (let k = 0; k < segs; k++) {
        const A = arcPts[k];
        const B = arcPts[k + 1];
        const u0 = (Math.PI * r * k) / segs * 0.5;
        const u1 = (Math.PI * r * (k + 1)) / segs * 0.5;
        collector.addQuad(
          0,
          pt3Cap(B.x, 0, B.z),
          pt3Cap(A.x, 0, A.z),
          pt3Cap(A.x, topY, A.z),
          pt3Cap(B.x, topY, B.z),
          u1,
          0,
          u0,
          topY * 0.5,
          [B.nx, 0, B.nz],
          [A.nx, 0, A.nz]
        );
      }
      return;
    }

    if (endCap === 'stepped' && span > 0.01) {
      // 4 watertight architectural stepped terrace tiers (`80% -> 60% -> 40% -> 22%`) with closed upper risers & stone tread caps!
      const tiers = [0.8, 0.6, 0.4, 0.22];
      const stepW = span / tiers.length;
      const tierHeights = tiers.map((f) => Math.max(0.2, topY * f));

      // 1. Close the upper riser at `sBase` between `tierHeights[0]` and `topY` (`BL -> BR -> TR -> TL` points `+dir`!)
      collector.addQuad(
        0,
        pt3Cap(bx + leftX * h, tierHeights[0], bz + leftZ * h),
        pt3Cap(bx - leftX * h, tierHeights[0], bz - leftZ * h),
        pt3Cap(bx - leftX * h, topY, bz - leftZ * h),
        pt3Cap(bx + leftX * h, topY, bz + leftZ * h),
        0,
        tierHeights[0] * 0.5,
        h,
        topY * 0.5
      );

      for (let tIdx = 0; tIdx < tiers.length; tIdx++) {
        const xA = bx + dirX * (stepW * tIdx);
        const zA = bz + dirZ * (stepW * tIdx);
        const xB = bx + dirX * (stepW * (tIdx + 1));
        const zB = bz + dirZ * (stepW * (tIdx + 1));
        const tierH = tierHeights[tIdx];
        const isLastStep = tIdx === tiers.length - 1;

        collector.addExtrudedPolygonBlock(
          [
            { x: xA - leftX * h, z: zA - leftZ * h, edgeMat: rightMat },
            {
              x: xB - leftX * h,
              z: zB - leftZ * h,
              edgeMat: 0,
              skipSide: !isLastStep,
            },
            { x: xB + leftX * h, z: zB + leftZ * h, edgeMat: leftMat },
            {
              x: xA + leftX * h,
              z: zA + leftZ * h,
              edgeMat: 0,
              skipSide: true,
            },
          ],
          0,
          tierH,
          leanPerMeterX,
          leanPerMeterZ
        );

        // Close exposed riser `[tierHeights[tIdx + 1] .. tierH]` at `xB` for non-final steps!
        if (!isLastStep) {
          const nextH = tierHeights[tIdx + 1];
          collector.addQuad(
            0,
            pt3Cap(xB + leftX * h, nextH, zB + leftZ * h),
            pt3Cap(xB - leftX * h, nextH, zB - leftZ * h),
            pt3Cap(xB - leftX * h, tierH, zB - leftZ * h),
            pt3Cap(xB + leftX * h, tierH, zB + leftZ * h),
            0,
            nextH * 0.5,
            h,
            tierH * 0.5
          );
        }

        // Crisp overhanging stone coping tread on top of each step!
        const treadHalf = h + 0.016;
        const txA = xA + dirX * 0.002;
        const tzA = zA + dirZ * 0.002;
        const txB = xB + dirX * 0.016;
        const tzB = zB + dirZ * 0.016;
        copingCollector.addExtrudedPolygonBlock(
          [
            {
              x: txA - leftX * treadHalf,
              z: tzA - leftZ * treadHalf,
              edgeMat: 0,
            },
            {
              x: txB - leftX * treadHalf,
              z: tzB - leftZ * treadHalf,
              edgeMat: 0,
            },
            {
              x: txB + leftX * treadHalf,
              z: tzB + leftZ * treadHalf,
              edgeMat: 0,
            },
            {
              x: txA + leftX * treadHalf,
              z: tzA + leftZ * treadHalf,
              edgeMat: 0,
            },
          ],
          tierH,
          tierH + 0.034,
          leanPerMeterX,
          leanPerMeterZ
        );
      }
      return;
    }

    if (endCap === 'pillar' && span > 0.01) {
      // Bold integrated square structural end-column rising proud above wall top, flush against `sBase`!
      const pierHalfDepth = span * 0.5;
      const pierHalfWidth = Math.max(h * 1.95, pierHalfDepth);
      const px = bx + dirX * pierHalfDepth;
      const pz = bz + dirZ * pierHalfDepth;
      const makeRectRing = (
        cx: number,
        cz: number,
        hd: number,
        hw: number,
        matSide: 0 | 4 | 5
      ) => [
        {
          x: cx - dirX * hd - leftX * hw,
          z: cz - dirZ * hd - leftZ * hw,
          edgeMat: matSide,
        },
        {
          x: cx + dirX * hd - leftX * hw,
          z: cz + dirZ * hd - leftZ * hw,
          edgeMat: matSide,
        },
        {
          x: cx + dirX * hd + leftX * hw,
          z: cz + dirZ * hd + leftZ * hw,
          edgeMat: matSide,
        },
        {
          x: cx - dirX * hd + leftX * hw,
          z: cz - dirZ * hd + leftZ * hw,
          edgeMat: matSide,
        },
      ];
      // Pier shaft rising `+0.09m` above wall crest
      collector.addExtrudedPolygonBlock(
        makeRectRing(px, pz, pierHalfDepth, pierHalfWidth, 4),
        0,
        topY + 0.09,
        leanPerMeterX,
        leanPerMeterZ
      );
      // Molded plinth base
      extrasCollector.addExtrudedPolygonBlock(
        makeRectRing(
          px,
          pz,
          pierHalfDepth + 0.028,
          pierHalfWidth + 0.028,
          0
        ),
        0,
        0.14,
        leanPerMeterX,
        leanPerMeterZ
      );
      // Proud overhanging capital crown
      copingCollector.addExtrudedPolygonBlock(
        makeRectRing(
          px,
          pz,
          pierHalfDepth + 0.036,
          pierHalfWidth + 0.036,
          0
        ),
        topY + 0.09,
        topY + 0.16,
        leanPerMeterX,
        leanPerMeterZ
      );
      return;
    }

    if (endCap === 'cap') {
      // Non-overlapping U-wrap architectural door-jamb / pilaster end casing hugging `sBase .. tipSt`!
      const retDepth = Math.min(0.055, Math.max(0.02, totalLen * 0.1));
      const cOut = h + 0.028;
      const cIn = h + 0.001;
      extrasCollector.addExtrudedPolygonBlock(
        [
          {
            x: bx - dirX * retDepth - leftX * cOut,
            z: bz - dirZ * retDepth - leftZ * cOut,
            edgeMat: 0,
          },
          {
            x: bx + dirX * span - leftX * cOut,
            z: bz + dirZ * span - leftZ * cOut,
            edgeMat: 0,
          },
          {
            x: bx + dirX * span + leftX * cOut,
            z: bz + dirZ * span + leftZ * cOut,
            edgeMat: 0,
          },
          {
            x: bx - dirX * retDepth + leftX * cOut,
            z: bz - dirZ * retDepth + leftZ * cOut,
            edgeMat: 0,
          },
          {
            x: bx - dirX * retDepth + leftX * cIn,
            z: bz - dirZ * retDepth + leftZ * cIn,
            edgeMat: 0,
          },
          {
            x: bx + leftX * cIn,
            z: bz + leftZ * cIn,
            edgeMat: 0,
            skipSide: true,
          },
          {
            x: bx - leftX * cIn,
            z: bz - leftZ * cIn,
            edgeMat: 0,
          },
          {
            x: bx - dirX * retDepth - leftX * cIn,
            z: bz - dirZ * retDepth - leftZ * cIn,
            edgeMat: 0,
          },
        ],
        0,
        topY + 0.022,
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
        bCur > sBodyStart + 0.01 ||
          (!startTrim.isConnected && startTrim.filletPullback <= 0.001),
        !endTrim.isConnected && endTrim.filletPullback <= 0.001,
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
    // Crisp architectural exterior corner pilaster / quoin column with base plinth & crown cap!
    const buildQuoinRing = (qOut: number, thickQ: number, qLen: number) => {
      const p0x = mOutX + outNormAx * qOut + outNormBx * qOut;
      const p0z = mOutZ + outNormAz * qOut + outNormBz * qOut;
      const pAx = p0x + tAx * qLen;
      const pAz = p0z + tAz * qLen;
      const pBx = p0x + tBx * qLen;
      const pBz = p0z + tBz * qLen;
      return [
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
      ];
    };

    const qLen = Math.max(0.3, h * 2.8);
    // Pilaster shaft
    collector.addExtrudedPolygonBlock(
      buildQuoinRing(0.036, 0.04, qLen),
      0,
      height + 0.025
    );
    // Grounded corner plinth
    collector.addExtrudedPolygonBlock(
      buildQuoinRing(0.052, 0.056, qLen + 0.024),
      0,
      0.14
    );
    // Proud corner crown cap
    collector.addExtrudedPolygonBlock(
      buildQuoinRing(0.056, 0.06, qLen + 0.028),
      height + 0.025,
      height + 0.08
    );
    return collector.buildGeometry();
  }

  if (spec.style === 'inner-trim') {
    // Crisp interior corner cove / pilaster moulding hugging the concave room corner `mIn`!
    const buildInnerTrimRing = (iOut: number, iLen: number) => {
      const c0x = mInX - inNormAx * 0.002 - inNormBx * 0.002;
      const c0z = mInZ - inNormAz * 0.002 - inNormBz * 0.002;
      return [
        { x: c0x, z: c0z, edgeMat: 0 as const },
        { x: c0x + tAx * iLen, z: c0z + tAz * iLen, edgeMat: 0 as const },
        {
          x: mInX + tAx * iLen + inNormAx * iOut,
          z: mInZ + tAz * iLen + inNormAz * iOut,
          edgeMat: 0 as const,
        },
        {
          x: mInX + inNormAx * iOut + inNormBx * iOut,
          z: mInZ + inNormAz * iOut + inNormBz * iOut,
          edgeMat: 0 as const,
        },
        {
          x: mInX + tBx * iLen + inNormBx * iOut,
          z: mInZ + tBz * iLen + inNormBz * iOut,
          edgeMat: 0 as const,
        },
        { x: c0x + tBx * iLen, z: c0z + tBz * iLen, edgeMat: 0 as const },
      ];
    };

    const iLen = Math.max(0.22, h * 2.2);
    collector.addExtrudedPolygonBlock(
      buildInnerTrimRing(0.032, iLen),
      0,
      height
    );
    // Subtle top interior corner crown block
    collector.addExtrudedPolygonBlock(
      buildInnerTrimRing(0.044, iLen + 0.018),
      Math.max(0, height - 0.075),
      height + 0.01
    );
    return collector.buildGeometry();
  }

  // Endpoints on Wall A & Wall B at `pullback`
  const centerAX = vertex.x + tAx * pullback;
  const centerAZ = vertex.z + tAz * pullback;
  const centerBX = vertex.x + tBx * pullback;
  const centerBZ = vertex.z + tBz * pullback;
  const aInX = centerAX + inNormAx * hA;
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

  const segs = 28;
  const rawPts: Array<{
    x: number;
    z: number;
    edgeMat: 0 | 4 | 5;
    skipSide?: boolean;
  }> = [];

  if (spec.style === 'rounded-inner') {
    // Outer boundary stays sharp 90° (`aOut -> mOut -> bOut`), inner boundary sweeps TRUE circular arc `bIn -> mIn -> aIn`!
    rawPts.push({ x: aOutX, z: aOutZ, edgeMat: outerMat });
    rawPts.push({ x: mOutX, z: mOutZ, edgeMat: outerMat });
    // Close the fillet's B-end cross-section. The adjoining swept wall deliberately omits
    // its end jamb at a rounded joint, so leaving this edge open exposes a hairline raster gap.
    rawPts.push({ x: bOutX, z: bOutZ, edgeMat: 0 });
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
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const omu = 1 - u;
      const denom = omu * omu + 2 * w * omu * u + u * u;
      const px =
        (omu * omu * bInX + 2 * w * omu * u * mInX + u * u * aInX) / denom;
      const pz =
        (omu * omu * bInZ + 2 * w * omu * u * mInZ + u * u * aInZ) / denom;
      rawPts.push({
        x: px,
        z: pz,
        edgeMat: i < segs ? innerMat : 0,
      });
    }
  } else {
    // `rounded-outer`: Inner boundary stays sharp (`bIn -> mIn -> aIn`), outer boundary sweeps TRUE circular bullnose arc `aOut -> mOut -> bOut`!
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
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const omu = 1 - u;
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

  // Continue the raised skirting through the rounded junction. The wall-side strips end
  // at the fillet pullbacks, so this narrow, slightly proud shoe masks their open ends and
  // gives the lower trim one uninterrupted path around the inside/outside bend.
  if (
    (spec.style === 'rounded-inner' || spec.style === 'rounded-outer') &&
    wallA.hasBaseboard && wallB.hasBaseboard &&
    wallA.style === 'full' && wallB.style === 'full'
  ) {
    const offset = 0.012;
    let rawArea2 = 0;
    for (let i = 0; i < rawPts.length; i++) {
      const next = rawPts[(i + 1) % rawPts.length];
      rawArea2 += rawPts[i].x * next.z - next.x * rawPts[i].z;
    }
    // The inside/outside fillet rings do not share a guaranteed winding; choose the
    // geometric exterior per-ring so the shoe expands outwards for BOTH profiles.
    const outwardSign = rawArea2 >= 0 ? 1 : -1;
    const skirtingRing = rawPts.map((point, i) => {
      const prev = rawPts[(i - 1 + rawPts.length) % rawPts.length];
      const next = rawPts[(i + 1) % rawPts.length];
      const pnx = point.x - prev.x;
      const pnz = point.z - prev.z;
      const nnx = next.x - point.x;
      const nnz = next.z - point.z;
      const plen = Math.max(1e-8, Math.hypot(pnx, pnz));
      const nlen = Math.max(1e-8, Math.hypot(nnx, nnz));
      const prevNx = outwardSign * pnz / plen;
      const prevNz = outwardSign * -pnx / plen;
      const nextNx = outwardSign * nnz / nlen;
      const nextNz = outwardSign * -nnx / nlen;
      let mx = prevNx + nextNx;
      let mz = prevNz + nextNz;
      const mlen = Math.hypot(mx, mz);
      if (mlen < 1e-6) {
        mx = nextNx;
        mz = nextNz;
      } else {
        mx /= mlen;
        mz /= mlen;
      }
      const projection = Math.max(0.25, Math.abs(mx * prevNx + mz * prevNz));
      // Bound the miter at tight/near-collinear vertices to prevent spikes.
      const distance = Math.min(offset / projection, offset * 2.5);
      return {
        x: point.x + mx * distance,
        z: point.z + mz * distance,
        edgeMat: 0 as const,
      };
    });
    // Pin the four endpoint vertices to the exact outward-offset cross-sections used by
    // emitSpanSegment(extraHalfT), so the bridge meets both wall baseboards flush.
    const endpointPins = [
      { source: { x: aOutX, z: aOutZ }, target: { x: centerAX + outNormAx * (hA + offset), z: centerAZ + outNormAz * (hA + offset) } },
      { source: { x: aInX, z: aInZ }, target: { x: centerAX + inNormAx * (hA + offset), z: centerAZ + inNormAz * (hA + offset) } },
      { source: { x: bOutX, z: bOutZ }, target: { x: centerBX + outNormBx * (hB + offset), z: centerBZ + outNormBz * (hB + offset) } },
      { source: { x: bInX, z: bInZ }, target: { x: centerBX + inNormBx * (hB + offset), z: centerBZ + inNormBz * (hB + offset) } },
    ];
    for (let i = 0; i < rawPts.length; i++) {
      for (const pin of endpointPins) {
        if (Math.hypot(rawPts[i].x - pin.source.x, rawPts[i].z - pin.source.z) < 1e-6) {
          skirtingRing[i].x = pin.target.x;
          skirtingRing[i].z = pin.target.z;
          break;
        }
      }
    }
    collector.addExtrudedPolygonBlock(skirtingRing, 0, 0.085);
  }

  collector.addExtrudedPolygonBlock(rawPts, 0, height);

  return collector.buildGeometry();
}
