import * as THREE from 'three';
import {
  ArchDetectedRoom,
  ArchHouseData,
  ArchOpeningItem,
  ArchOpeningKind,
  ArchRoofItem,
  ArchRoofStyle,
  ArchRoomMeta,
  ArchSelection,
  ArchStairItem,
  ArchStairKind,
  ArchWallSegment,
  BuildingFloorLayer,
  CustomAssetPart,
  DEFAULT_SUBDIVISION_SETTINGS,
  DEFAULT_WALL_DRAW,
  FloorViewMode,
  ProceduralPatternKind,
  Vec2XZ,
  WallDrawDefaults,
} from '../types/studio';
import { applyProceduralPatternToMaterial } from './proceduralTextures';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export const OPENING_PRESETS: Record<
  ArchOpeningKind,
  { width: number; height: number; sillHeight: number }
> = {
  'door-single': { width: 0.92, height: 2.15, sillHeight: 0.0 },
  'door-double': { width: 1.65, height: 2.18, sillHeight: 0.0 },
  'window-std': { width: 1.25, height: 1.25, sillHeight: 0.9 },
  'window-wide': { width: 2.1, height: 1.3, sillHeight: 0.85 },
  'window-tall': { width: 1.8, height: 2.25, sillHeight: 0.12 },
  archway: { width: 1.45, height: 2.32, sillHeight: 0.0 },
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function makeLabelSprite(
  title: string,
  subtitle?: string,
  opts: {
    bg?: string;
    border?: string;
    titleColor?: string;
    subColor?: string;
    scale?: number;
  } = {}
): THREE.Sprite {
  if (typeof document === 'undefined') {
    return new THREE.Sprite();
  }
  const {
    bg = 'rgba(15, 23, 42, 0.86)',
    border = 'rgba(56, 189, 248, 0.65)',
    titleColor = '#f8fafc',
    subColor = '#7dd3fc',
    scale = 1.0,
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = subtitle ? 128 : 88;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pad = 8;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;
    const r = 22;

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(pad, pad, w, h, r);
    } else {
      ctx.rect(pad, pad, w, h);
    }
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (subtitle) {
      ctx.fillStyle = titleColor;
      ctx.font = '700 28px Inter, system-ui, sans-serif';
      ctx.fillText(title, canvas.width * 0.5, canvas.height * 0.37);
      ctx.fillStyle = subColor;
      ctx.font = '700 24px Inter, system-ui, sans-serif';
      ctx.fillText(subtitle, canvas.width * 0.5, canvas.height * 0.7);
    } else {
      ctx.fillStyle = titleColor;
      ctx.font = '700 29px Inter, system-ui, sans-serif';
      ctx.fillText(title, canvas.width * 0.5, canvas.height * 0.52);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.width / canvas.height;
  const sy = (subtitle ? 0.54 : 0.38) * scale;
  sprite.scale.set(sy * aspect, sy, 1);
  sprite.renderOrder = 25;
  sprite.raycast = () => {};
  return sprite;
}

function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
    const disposeSingleMat = (m: THREE.Material) => {
      const spriteMat = m as THREE.SpriteMaterial;
      if (spriteMat.map) spriteMat.map.dispose();
      m.dispose();
    };
    if (Array.isArray(mat)) {
      mat.forEach(disposeSingleMat);
    } else if (mat) {
      disposeSingleMat(mat);
    }
  });
}

function sampleWallCurvePoint(
  wall: ArchWallSegment,
  t: number
): { x: number; z: number; tx: number; tz: number } {
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

  if (Math.abs(wall.curveBulge) < 0.02) {
    return {
      x: x0 + dx * t,
      z: z0 + dz * t,
      tx: ux,
      tz: uz,
    };
  }

  // Quadratic Bezier control point so curve(0.5) has exact midpoint sagitta = curveBulge
  const cx = (x0 + x1) * 0.5 + nx * (wall.curveBulge * 2);
  const cz = (z0 + z1) * 0.5 + nz * (wall.curveBulge * 2);
  const omt = 1 - t;
  const px = omt * omt * x0 + 2 * omt * t * cx + t * t * x1;
  const pz = omt * omt * z0 + 2 * omt * t * cz + t * t * z1;
  const dpx = 2 * omt * (cx - x0) + 2 * t * (x1 - cx);
  const dpz = 2 * omt * (cz - z0) + 2 * t * (z1 - cz);
  const dLen = Math.max(0.001, Math.hypot(dpx, dpz));
  return { x: px, z: pz, tx: dpx / dLen, tz: dpz / dLen };
}

export function computeWallLength(wall: ArchWallSegment): number {
  const chord = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  if (Math.abs(wall.curveBulge) < 0.02) return chord;
  let sum = 0;
  const steps = 16;
  let prev = sampleWallCurvePoint(wall, 0);
  for (let i = 1; i <= steps; i++) {
    const cur = sampleWallCurvePoint(wall, i / steps);
    sum += Math.hypot(cur.x - prev.x, cur.z - prev.z);
    prev = cur;
  }
  return sum;
}

/**
 * Planar Half-Edge Closed-Room Detection with T-Junction & Crossing Splitting
 */
function detectClosedRoomsOnFloor(
  walls: ArchWallSegment[],
  floorId: string,
  roomMetas: ArchRoomMeta[],
  defaultNamePrefix: string
): ArchDetectedRoom[] {
  const floorWalls = walls.filter((w) => w.floorId === floorId);
  if (floorWalls.length < 3) return [];

  // 1. Expand straight & curved walls into polyline segments in XZ
  interface RawSeg {
    ax: number;
    az: number;
    bx: number;
    bz: number;
  }
  const rawSegs: RawSeg[] = [];
  for (const w of floorWalls) {
    const chord = Math.hypot(w.end.x - w.start.x, w.end.z - w.start.z);
    if (chord < 0.15) continue;
    const steps = Math.abs(w.curveBulge) >= 0.04 ? 10 : 1;
    let prev = sampleWallCurvePoint(w, 0);
    for (let s = 1; s <= steps; s++) {
      const cur = sampleWallCurvePoint(w, s / steps);
      rawSegs.push({ ax: prev.x, az: prev.z, bx: cur.x, bz: cur.z });
      prev = cur;
    }
  }
  if (rawSegs.length < 3) return [];

  // 2. Split segments at T-junctions & intersections so interior partition walls split rooms cleanly!
  const splitParams: number[][] = rawSegs.map(() => [0, 1]);
  const SNAP_EPS = 0.09;

  const projectPointOnSeg = (
    px: number,
    pz: number,
    s: RawSeg
  ): { t: number; dist: number } => {
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 1e-6) return { t: 0, dist: Infinity };
    const t = ((px - s.ax) * dx + (pz - s.az) * dz) / lenSq;
    if (t <= 0.01 || t >= 0.99) return { t, dist: Infinity };
    const qx = s.ax + dx * t;
    const qz = s.az + dz * t;
    return { t, dist: Math.hypot(px - qx, pz - qz) };
  };

  for (let i = 0; i < rawSegs.length; i++) {
    const si = rawSegs[i];
    for (let j = 0; j < rawSegs.length; j++) {
      if (i === j) continue;
      const sj = rawSegs[j];

      // Check T-junctions of sj endpoints onto si
      const pA = projectPointOnSeg(sj.ax, sj.az, si);
      if (pA.dist <= SNAP_EPS) splitParams[i].push(pA.t);
      const pB = projectPointOnSeg(sj.bx, sj.bz, si);
      if (pB.dist <= SNAP_EPS) splitParams[i].push(pB.t);

      // Check proper segment-segment intersection
      if (j > i) {
        const d1x = si.bx - si.ax;
        const d1z = si.bz - si.az;
        const d2x = sj.bx - sj.ax;
        const d2z = sj.bz - sj.az;
        const denom = d1x * d2z - d1z * d2x;
        if (Math.abs(denom) > 1e-5) {
          const rx = sj.ax - si.ax;
          const rz = sj.az - si.az;
          const ti = (rx * d2z - rz * d2x) / denom;
          const tj = (rx * d1z - rz * d1x) / denom;
          if (ti > 0.01 && ti < 0.99 && tj > 0.01 && tj < 0.99) {
            splitParams[i].push(ti);
            splitParams[j].push(tj);
          }
        }
      }
    }
  }

  // 3. Build welded planar vertex & undirected edge graph
  const nodes: Vec2XZ[] = [];
  const findOrAddNode = (x: number, z: number): number => {
    for (let k = 0; k < nodes.length; k++) {
      if (Math.hypot(nodes[k].x - x, nodes[k].z - z) <= SNAP_EPS) {
        return k;
      }
    }
    nodes.push({ x, z });
    return nodes.length - 1;
  };

  const adj = new Map<number, Set<number>>();
  const addEdge = (u: number, v: number) => {
    if (u === v) return;
    if (!adj.has(u)) adj.set(u, new Set());
    if (!adj.has(v)) adj.set(v, new Set());
    adj.get(u)!.add(v);
    adj.get(v)!.add(u);
  };

  for (let i = 0; i < rawSegs.length; i++) {
    const s = rawSegs[i];
    const ts = splitParams[i].slice().sort((a, b) => a - b);
    const uniqueTs: number[] = [];
    for (const t of ts) {
      if (
        uniqueTs.length === 0 ||
        Math.abs(t - uniqueTs[uniqueTs.length - 1]) > 0.015
      ) {
        uniqueTs.push(t);
      }
    }
    for (let k = 0; k < uniqueTs.length - 1; k++) {
      const t0 = uniqueTs[k];
      const t1 = uniqueTs[k + 1];
      const u = findOrAddNode(
        s.ax + (s.bx - s.ax) * t0,
        s.az + (s.bz - s.az) * t0
      );
      const v = findOrAddNode(
        s.ax + (s.bx - s.ax) * t1,
        s.az + (s.bz - s.az) * t1
      );
      addEdge(u, v);
    }
  }

  // 4. Iteratively prune dead-end spurs (degree < 2)
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const [u, nbrs] of adj.entries()) {
      if (nbrs.size < 2) {
        for (const v of nbrs) {
          adj.get(v)?.delete(u);
        }
        adj.delete(u);
        pruned = true;
      }
    }
  }
  if (adj.size < 3) return [];

  // 5. Sort outgoing half-edges by angle at each vertex
  const sortedNbrs = new Map<number, number[]>();
  for (const [u, nbrs] of adj.entries()) {
    const pu = nodes[u];
    const arr = Array.from(nbrs).sort((a, b) => {
      const angA = Math.atan2(nodes[a].z - pu.z, nodes[a].x - pu.x);
      const angB = Math.atan2(nodes[b].z - pu.z, nodes[b].x - pu.x);
      return angA - angB;
    });
    sortedNbrs.set(u, arr);
  }

  // 6. Traverse minimal faces via half-edge rotation system
  const visitedHalfEdges = new Set<string>();
  const keyHE = (u: number, v: number) => `${u}->${v}`;
  const rawFaces: Array<{ poly: Vec2XZ[]; signedArea: number }> = [];

  for (const [u, nbrList] of sortedNbrs.entries()) {
    for (const v of nbrList) {
      const startKey = keyHE(u, v);
      if (visitedHalfEdges.has(startKey)) continue;

      const cycle: number[] = [];
      let curU = u;
      let curV = v;
      let guard = 0;
      let valid = true;

      while (guard++ < 256) {
        const hk = keyHE(curU, curV);
        if (visitedHalfEdges.has(hk)) {
          valid = curU === u && curV === v;
          break;
        }
        visitedHalfEdges.add(hk);
        cycle.push(curU);

        const nextCandidates = sortedNbrs.get(curV);
        if (!nextCandidates || nextCandidates.length < 2) {
          valid = false;
          break;
        }
        // Incoming edge at curV is `curV -> curU`; pick previous in CCW list to hug minimal left/interior face
        const idxBack = nextCandidates.indexOf(curU);
        if (idxBack === -1) {
          valid = false;
          break;
        }
        const nextW =
          nextCandidates[
            (idxBack - 1 + nextCandidates.length) % nextCandidates.length
          ];
        curU = curV;
        curV = nextW;
        if (curU === u && curV === v) {
          break;
        }
      }

      if (valid && cycle.length >= 3) {
        const poly = cycle.map((nid) => nodes[nid]);
        let twoArea = 0;
        for (let i = 0; i < poly.length; i++) {
          const p0 = poly[i];
          const p1 = poly[(i + 1) % poly.length];
          twoArea += p0.x * p1.z - p1.x * p0.z;
        }
        const signedArea = twoArea * 0.5;
        // Interior faces in this rotation rule have signedArea > 0 (unbounded outer boundary has < 0)
        if (signedArea > 0.55) {
          rawFaces.push({ poly, signedArea });
        }
      }
    }
  }

  // 7. Compute centroids, perimeters, and match persistent Room Meta (name + floor color)
  const rooms: ArchDetectedRoom[] = [];
  const usedMetaIds = new Set<string>();

  rawFaces.forEach((face, idx) => {
    const poly = face.poly;
    let cx = 0;
    let cz = 0;
    let twoA = 0;
    let perimeter = 0;
    for (let i = 0; i < poly.length; i++) {
      const p0 = poly[i];
      const p1 = poly[(i + 1) % poly.length];
      const cross = p0.x * p1.z - p1.x * p0.z;
      twoA += cross;
      cx += (p0.x + p1.x) * cross;
      cz += (p0.z + p1.z) * cross;
      perimeter += Math.hypot(p1.x - p0.x, p1.z - p0.z);
    }
    const area = Math.abs(twoA * 0.5);
    if (area > 1e-4) {
      cx /= 3 * twoA;
      cz /= 3 * twoA;
    } else {
      cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
      cz = poly.reduce((s, p) => s + p.z, 0) / poly.length;
    }

    // Match closest saved roomMeta on this floor
    let matched: ArchRoomMeta | undefined;
    let bestDist = 2.4;
    for (const rm of roomMetas) {
      if (rm.floorId !== floorId || usedMetaIds.has(rm.id)) continue;
      const d = Math.hypot(rm.centroid.x - cx, rm.centroid.z - cz);
      if (d < bestDist) {
        bestDist = d;
        matched = rm;
      }
    }
    if (matched) usedMetaIds.add(matched.id);

    rooms.push({
      id: matched?.id ?? `room_${floorId}_${idx + 1}`,
      floorId,
      name: matched?.name ?? `${defaultNamePrefix} ${idx + 1}`,
      polygon: poly,
      centroid: { x: round3(cx), z: round3(cz) },
      areaSqm: Math.round(area * 100) / 100,
      perimeterM: Math.round(perimeter * 100) / 100,
      floorColor: matched?.floorColor ?? '#d6c7b2',
      floorPattern: matched?.floorPattern ?? 'wood',
      ceilingVisible: matched?.ceilingVisible !== false,
    });
  });

  return rooms;
}

/**
 * Builds a clean outward-normal parametric 3D Roof mesh (`gable`, `hip`, `shed`, `flat`)
 */
function buildParametricRoofGroup(
  roof: ArchRoofItem,
  isSelected: boolean
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(roof.center.x, roof.baseY, roof.center.z);
  grp.rotation.y = roof.rotationY * DEG2RAD;
  grp.userData = { archKind: 'roof', archId: roof.id, floorId: roof.floorId };

  const oh = Math.max(0, roof.overhang);
  const hx = Math.max(0.6, roof.width * 0.5 + oh);
  const hz = Math.max(0.6, roof.depth * 0.5 + oh);
  const slopeSpan = roof.ridgeAxis === 'x' ? hz : hx;
  const rise = Math.max(
    0.25,
    Math.tan(Math.max(8, Math.min(58, roof.pitchDeg)) * DEG2RAD) * slopeSpan
  );

  const roofMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(roof.color),
    roughness: 0.68,
    metalness: 0.08,
    emissive: isSelected ? new THREE.Color('#2563eb') : new THREE.Color('#000000'),
    emissiveIntensity: isSelected ? 0.22 : 0,
  });
  const effRoofPat =
    roof.roofPattern ?? (roof.style === 'flat' ? 'concrete' : 'roof-tile');
  applyProceduralPatternToMaterial(
    roofMat,
    effRoofPat,
    Math.max(1.5, roof.width * 0.65),
    Math.max(1.5, roof.depth * 0.65)
  );

  const fasciaMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(roof.fasciaColor || '#e2e8f0'),
    roughness: 0.76,
    metalness: 0.05,
  });

  const appendSkylightFrame = (skyY: number, tiltXRad = 0) => {
    if (!roof.hasSkylight) return;
    const sw = Math.min(hx * 1.35, Math.max(0.8, roof.skylightWidth ?? 1.8));
    const sd = Math.min(hz * 1.35, Math.max(0.8, roof.skylightDepth ?? 1.4));
    const skyHolder = new THREE.Group();
    skyHolder.position.set(0, skyY, tiltXRad !== 0 ? hz * 0.34 : 0);
    skyHolder.rotation.x = tiltXRad;

    const frameM = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.72,
      roughness: 0.28,
    });
    const skyGlassM = new THREE.MeshStandardMaterial({
      color: '#bae6fd',
      roughness: 0.06,
      metalness: 0.18,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });

    const fThick = 0.07;
    const fH = 0.14;
    const bN = new THREE.Mesh(new THREE.BoxGeometry(sw, fH, fThick), frameM);
    bN.position.set(0, fH * 0.5, -sd * 0.5);
    const bS = bN.clone();
    bS.position.z = sd * 0.5;
    const bW = new THREE.Mesh(new THREE.BoxGeometry(fThick, fH, sd), frameM);
    bW.position.set(-sw * 0.5, fH * 0.5, 0);
    const bE = bW.clone();
    bE.position.x = sw * 0.5;
    const midBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, fH * 0.85, sd),
      frameM
    );
    midBar.position.set(0, fH * 0.5, 0);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(sw - fThick, 0.025, sd - fThick),
      skyGlassM
    );
    glass.position.set(0, fH * 0.72, 0);

    [bN, bS, bW, bE, midBar, glass].forEach((m) => {
      m.userData = { archKind: 'roof', archId: roof.id };
      skyHolder.add(m);
    });
    grp.add(skyHolder);
  };

  const pushTri = (
    positions: number[],
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number]
  ) => {
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };

  const pushQuad = (
    positions: number[],
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number]
  ) => {
    pushTri(positions, a, b, c);
    pushTri(positions, a, c, d);
  };

  if (roof.style === 'flat') {
    const slabH = 0.22;
    const parapetH = 0.42;
    const pThick = 0.16;
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(hx * 2, slabH, hz * 2),
      roofMat
    );
    deck.position.y = slabH * 0.5;
    deck.castShadow = true;
    deck.receiveShadow = true;
    deck.userData = { archKind: 'roof', archId: roof.id };
    grp.add(deck);

    // 4 Perimeter Parapet Walls
    const pN = new THREE.Mesh(
      new THREE.BoxGeometry(hx * 2, parapetH, pThick),
      fasciaMat
    );
    pN.position.set(0, slabH + parapetH * 0.5, -hz + pThick * 0.5);
    const pS = pN.clone();
    pS.position.z = hz - pThick * 0.5;
    const pW = new THREE.Mesh(
      new THREE.BoxGeometry(pThick, parapetH, hz * 2 - pThick * 2),
      fasciaMat
    );
    pW.position.set(-hx + pThick * 0.5, slabH + parapetH * 0.5, 0);
    const pE = pW.clone();
    pE.position.x = hx - pThick * 0.5;
    [pN, pS, pW, pE].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData = { archKind: 'roof', archId: roof.id };
      grp.add(m);
    });
    appendSkylightFrame(slabH + 0.02, 0);
    return grp;
  }

  const roofVerts: number[] = [];
  const gableVerts: number[] = [];

  if (roof.style === 'gable') {
    if (roof.ridgeAxis === 'x') {
      const fl: [number, number, number] = [-hx, 0, hz];
      const fr: [number, number, number] = [hx, 0, hz];
      const bl: [number, number, number] = [-hx, 0, -hz];
      const br: [number, number, number] = [hx, 0, -hz];
      const rl: [number, number, number] = [-hx, rise, 0];
      const rr: [number, number, number] = [hx, rise, 0];

      // Front slope (+Z), Back slope (-Z), Bottom soffit (-Y)
      pushQuad(roofVerts, fl, fr, rr, rl);
      pushQuad(roofVerts, br, bl, rl, rr);
      pushQuad(gableVerts, bl, br, fr, fl);
      // Left (-X) & Right (+X) gable triangles
      pushTri(gableVerts, bl, fl, rl);
      pushTri(gableVerts, fr, br, rr);
    } else {
      const fl: [number, number, number] = [-hx, 0, hz];
      const fr: [number, number, number] = [hx, 0, hz];
      const bl: [number, number, number] = [-hx, 0, -hz];
      const br: [number, number, number] = [hx, 0, -hz];
      const rf: [number, number, number] = [0, rise, hz];
      const rb: [number, number, number] = [0, rise, -hz];

      // Right slope (+X), Left slope (-X), Bottom soffit
      pushQuad(roofVerts, fr, br, rb, rf);
      pushQuad(roofVerts, bl, fl, rf, rb);
      pushQuad(gableVerts, bl, br, fr, fl);
      // Front (+Z) & Back (-Z) gable triangles
      pushTri(gableVerts, fl, fr, rf);
      pushTri(gableVerts, br, bl, rb);
    }
  } else if (roof.style === 'hip') {
    const fl: [number, number, number] = [-hx, 0, hz];
    const fr: [number, number, number] = [hx, 0, hz];
    const bl: [number, number, number] = [-hx, 0, -hz];
    const br: [number, number, number] = [hx, 0, -hz];

    if (hx >= hz) {
      const ridgeHalf = Math.max(0, hx - hz);
      const rl: [number, number, number] = [-ridgeHalf, rise, 0];
      const rr: [number, number, number] = [ridgeHalf, rise, 0];
      pushQuad(roofVerts, fl, fr, rr, rl);
      pushQuad(roofVerts, br, bl, rl, rr);
      pushTri(roofVerts, bl, fl, rl);
      pushTri(roofVerts, fr, br, rr);
    } else {
      const ridgeHalf = Math.max(0, hz - hx);
      const rf: [number, number, number] = [0, rise, ridgeHalf];
      const rb: [number, number, number] = [0, rise, -ridgeHalf];
      pushQuad(roofVerts, fr, br, rb, rf);
      pushQuad(roofVerts, bl, fl, rf, rb);
      pushTri(roofVerts, fl, fr, rf);
      pushTri(roofVerts, br, bl, rb);
    }
    pushQuad(gableVerts, bl, br, fr, fl);
  } else {
    // Mono-slope ('shed')
    const hHigh = Math.max(0.35, rise * 0.85);
    const fl: [number, number, number] = [-hx, 0, hz];
    const fr: [number, number, number] = [hx, 0, hz];
    const bl: [number, number, number] = [-hx, 0, -hz];
    const br: [number, number, number] = [hx, 0, -hz];
    const tl: [number, number, number] = [-hx, hHigh, -hz];
    const tr: [number, number, number] = [hx, hHigh, -hz];

    pushQuad(roofVerts, fl, fr, tr, tl);
    pushQuad(gableVerts, br, bl, tl, tr);
    pushTri(gableVerts, bl, fl, tl);
    pushTri(gableVerts, fr, br, tr);
    pushQuad(gableVerts, bl, br, fr, fl);
  }

  if (roofVerts.length > 0) {
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofVerts, 3));
    rGeo.computeVertexNormals();
    const rMesh = new THREE.Mesh(rGeo, roofMat);
    rMesh.castShadow = true;
    rMesh.receiveShadow = true;
    rMesh.userData = { archKind: 'roof', archId: roof.id };
    grp.add(rMesh);
  }

  if (gableVerts.length > 0) {
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.Float32BufferAttribute(gableVerts, 3));
    gGeo.computeVertexNormals();
    const gMesh = new THREE.Mesh(gGeo, fasciaMat);
    gMesh.castShadow = true;
    gMesh.receiveShadow = true;
    gMesh.userData = { archKind: 'roof', archId: roof.id };
    grp.add(gMesh);
  }

  // Crisp Eave Fascia Rim
  const fasciaRim = new THREE.Mesh(
    new THREE.BoxGeometry(hx * 2 + 0.04, 0.14, hz * 2 + 0.04),
    fasciaMat
  );
  fasciaRim.position.y = -0.05;
  fasciaRim.castShadow = true;
  fasciaRim.userData = { archKind: 'roof', archId: roof.id };
  grp.add(fasciaRim);

  if (roof.hasSkylight) {
    const slopeTilt = Math.atan2(rise, hz);
    appendSkylightFrame(rise * 0.62, slopeTilt);
  }

  return grp;
}

/**
 * Builds an Opening 3D assembly (Single Door, Double Door, Windows, Archway) inside a Wall Cutout
 */
function buildOpeningAssembly(
  op: ArchOpeningItem,
  wallThick: number,
  isSelected: boolean
): THREE.Group {
  const grp = new THREE.Group();
  const w = op.width;
  const h = op.height;
  const depth = wallThick + 0.036;
  const frameT = 0.055;

  const frameMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(op.frameColor || '#475569'),
    roughness: 0.48,
    metalness: 0.18,
    emissive: isSelected ? new THREE.Color('#38bdf8') : new THREE.Color('#000000'),
    emissiveIntensity: isSelected ? 0.3 : 0,
  });
  const woodLeafMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#9a6b43'),
    roughness: 0.56,
    metalness: 0.06,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#bae6fd'),
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#eab308'),
    roughness: 0.25,
    metalness: 0.85,
  });

  const addBox = (
    sx: number,
    sy: number,
    sz: number,
    px: number,
    py: number,
    pz: number,
    mat: THREE.Material,
    castShadow = true
  ): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(px, py, pz);
    m.castShadow = castShadow;
    m.receiveShadow = true;
    m.userData = { archKind: 'opening', archId: op.id, wallId: op.wallId };
    grp.add(m);
    return m;
  };

  // Left, Right & Top Jamb Frame
  addBox(frameT, h, depth, -w * 0.5 + frameT * 0.5, h * 0.5, 0, frameMat);
  addBox(frameT, h, depth, w * 0.5 - frameT * 0.5, h * 0.5, 0, frameMat);
  addBox(w, frameT, depth, 0, h - frameT * 0.5, 0, frameMat);

  if (op.kind === 'archway') {
    // Decorative upper corner corbels to suggest a clean architectural pass-through arch
    addBox(0.22, 0.18, depth * 0.92, -w * 0.5 + 0.14, h - 0.12, 0, frameMat);
    addBox(0.22, 0.18, depth * 0.92, w * 0.5 - 0.14, h - 0.12, 0, frameMat);
    return grp;
  }

  const innerW = Math.max(0.2, w - frameT * 2);
  const innerH = Math.max(0.2, h - frameT);
  const isDoorOpen = op.isOpen !== false;

    if (op.kind === 'door-single') {
    // Interactive door leaf: swings open 76 deg when isOpen !== false, or 0 deg flush when closed!
    const pivot = new THREE.Group();
    const dir = op.flipSwing ? -1 : 1;
    pivot.position.set((-innerW * 0.5) * dir, 0, 0);
    pivot.rotation.y = dir * (isDoorOpen ? 76 : 0) * DEG2RAD;
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(innerW, innerH - 0.02, 0.045),
      woodLeafMat
    );
    applyProceduralPatternToMaterial(woodLeafMat, 'wood', 1.2, 2.2);
    leaf.position.set((innerW * 0.5) * dir, (innerH - 0.02) * 0.5, 0);
    leaf.castShadow = true;
    leaf.userData = { archKind: 'opening', archId: op.id, wallId: op.wallId };
    pivot.add(leaf);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.03, 0.12),
      handleMat
    );
    handle.position.set((innerW - 0.12) * dir, 1.0, 0);
    handle.userData = { archKind: 'opening', archId: op.id, wallId: op.wallId };
    pivot.add(handle);
    grp.add(pivot);

    // Architectural 2D/3D Floor Door Swing Arc
    const arcPts: THREE.Vector3[] = [];
    const hingeX = (-innerW * 0.5) * dir;
    for (let i = 0; i <= 16; i++) {
      const ang = (i / 16) * (Math.PI * 0.45);
      const ax = hingeX + dir * Math.cos(ang) * innerW;
      const az = -Math.sin(ang) * innerW * dir;
      arcPts.push(new THREE.Vector3(ax, 0.025, az));
    }
    const arcLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(arcPts),
      new THREE.LineBasicMaterial({
        color: isSelected ? '#38bdf8' : '#94a3b8',
        transparent: true,
        opacity: 0.72,
      })
    );
    arcLine.name = '__doorSwingArc';
    arcLine.raycast = () => {};
    grp.add(arcLine);
  } else if (op.kind === 'door-double') {
    applyProceduralPatternToMaterial(woodLeafMat, 'wood', 1.2, 2.2);
    const halfLeafW = innerW * 0.5 - 0.008;
    const openDeg = isDoorOpen ? 72 : 0;
    for (const side of [-1, 1] as const) {
      const pivot = new THREE.Group();
      pivot.position.set(side * (innerW * 0.5), 0, 0);
      pivot.rotation.y = -side * (op.flipSwing ? -openDeg : openDeg) * DEG2RAD;
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(halfLeafW, innerH - 0.02, 0.045),
        woodLeafMat
      );
      leaf.position.set(-side * (halfLeafW * 0.5), (innerH - 0.02) * 0.5, 0);
      leaf.castShadow = true;
      leaf.userData = { archKind: 'opening', archId: op.id, wallId: op.wallId };
      pivot.add(leaf);
      grp.add(pivot);

      const swingDir = op.flipSwing ? -1 : 1;
      const arcPts: THREE.Vector3[] = [];
      const hingeX = side * (innerW * 0.5);
      for (let i = 0; i <= 12; i++) {
        const ang = (i / 12) * (Math.PI * 0.44);
        arcPts.push(
          new THREE.Vector3(
            hingeX - side * Math.cos(ang) * halfLeafW,
            0.025,
            -Math.sin(ang) * halfLeafW * swingDir
          )
        );
      }
      const arcLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(arcPts),
        new THREE.LineBasicMaterial({
          color: isSelected ? '#38bdf8' : '#94a3b8',
          transparent: true,
          opacity: 0.72,
        })
      );
      arcLine.name = '__doorSwingArc';
      arcLine.raycast = () => {};
      grp.add(arcLine);
    }
  } else {
    // Window sill + mullion + sunlight-permeable clear glass!
    addBox(w + 0.06, frameT, depth + 0.04, 0, frameT * 0.5, 0, frameMat);
    addBox(
      innerW,
      innerH - frameT,
      0.018,
      0,
      frameT + (innerH - frameT) * 0.5,
      0,
      glassMat,
      false
    );
    // Vertical center mullion
    addBox(
      0.035,
      innerH - frameT,
      0.045,
      0,
      frameT + (innerH - frameT) * 0.5,
      0,
      frameMat
    );
    if (op.kind === 'window-wide' || op.kind === 'window-tall') {
      addBox(
        innerW,
        0.032,
        0.042,
        0,
        frameT + (innerH - frameT) * 0.55,
        0,
        frameMat
      );
    }
  }

  return grp;
}

/**
 * Builds a Parametric Staircase (`straight` or `l-shape`)
 */
function buildStaircaseGroup(
  stair: ArchStairItem,
  isSelected: boolean
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(stair.position.x, stair.position.y, stair.position.z);
  grp.rotation.y = stair.rotationY * DEG2RAD;
  grp.userData = { archKind: 'stair', archId: stair.id, floorId: stair.floorId };

  const treadMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(stair.color || '#b77946'),
    roughness: 0.58,
    metalness: 0.06,
    emissive: isSelected ? new THREE.Color('#2563eb') : new THREE.Color('#000000'),
    emissiveIntensity: isSelected ? 0.22 : 0,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#334155'),
    roughness: 0.35,
    metalness: 0.65,
  });

  const totalH = Math.max(1.2, stair.height);
  const w = Math.max(0.75, stair.width);
  const run = Math.max(1.6, stair.runLength);
  const stepCount = Math.max(8, Math.round(totalH / 0.1875));
  const stepH = totalH / stepCount;

  if (stair.kind === 'straight') {
    const treadD = run / stepCount;
    for (let i = 0; i < stepCount; i++) {
      const y = (i + 1) * stepH;
      const z = -run * 0.5 + (i + 0.5) * treadD;
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.065, treadD + 0.03),
        treadMat
      );
      stepMesh.position.set(0, y - 0.032, z);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      stepMesh.userData = { archKind: 'stair', archId: stair.id };
      grp.add(stepMesh);

      if (i % 3 === 0 || i === stepCount - 1) {
        for (const side of [-1, 1] as const) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.035, 0.92, 0.035),
            railMat
          );
          post.position.set(side * (w * 0.5 - 0.03), y + 0.44, z);
          post.userData = { archKind: 'stair', archId: stair.id };
          grp.add(post);
        }
      }
    }
    // Sloped Handrails
    const slopeLen = Math.hypot(run, totalH);
    const pitch = Math.atan2(totalH, run);
    for (const side of [-1, 1] as const) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.045, slopeLen),
        railMat
      );
      rail.position.set(side * (w * 0.5 - 0.03), totalH * 0.5 + 0.9, 0);
      rail.rotation.x = -pitch;
      rail.userData = { archKind: 'stair', archId: stair.id };
      grp.add(rail);
    }
  } else {
    // L-Shaped Stair with Quarter-Turn Landing
    const halfSteps = Math.floor(stepCount * 0.5);
    const remSteps = stepCount - halfSteps;
    const leg1Run = run * 0.55;
    const leg2Run = run * 0.55;
    const d1 = leg1Run / halfSteps;
    const d2 = leg2Run / remSteps;

    for (let i = 0; i < halfSteps; i++) {
      const y = (i + 1) * stepH;
      const z = -leg1Run + (i + 0.5) * d1;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.065, d1 + 0.025),
        treadMat
      );
      m.position.set(-w * 0.5, y - 0.032, z);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData = { archKind: 'stair', archId: stair.id };
      grp.add(m);
    }

    const landingY = halfSteps * stepH;
    const landing = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, w),
      treadMat
    );
    landing.position.set(-w * 0.5, landingY - 0.04, w * 0.5);
    landing.castShadow = true;
    landing.receiveShadow = true;
    landing.userData = { archKind: 'stair', archId: stair.id };
    grp.add(landing);

    for (let j = 0; j < remSteps; j++) {
      const y = landingY + (j + 1) * stepH;
      const x = (j + 0.5) * d2;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(d2 + 0.025, 0.065, w),
        treadMat
      );
      m.position.set(x, y - 0.032, w * 0.5);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData = { archKind: 'stair', archId: stair.id };
      grp.add(m);
    }
  }

  return grp;
}

export class ArchBuilderEngine {
  /** Exportable 3D architectural meshes (Walls, Cutout Doors/Windows, Room Floors, Stairs, Roofs) */
  public readonly structuralGroup = new THREE.Group();
  /** Non-exported editor HUD overlays (Room m² badges, 2D wall dimensions, wall draw ghost, measure line) */
  public readonly overlayGroup = new THREE.Group();
  private readonly previewGroup = new THREE.Group();
  private readonly measureGroup = new THREE.Group();
  private readonly labelsGroup = new THREE.Group();
  public readonly handlesGroup = new THREE.Group();

  private data: ArchHouseData;
  private detectedRooms: ArchDetectedRoom[] = [];
  private ceilingMeshes: Array<{ mesh: THREE.Mesh; ceilingY: number; floorId: string }> = [];
  private selection: ArchSelection = null;
  private isBlueprint2D = false;

  constructor(initialData: ArchHouseData) {
    this.structuralGroup.name = 'PerabotArchitecturalStructure';
    this.overlayGroup.name = '__archStudioOverlays';
    this.handlesGroup.name = '__archCornerHandles';
    this.data = initialData;
    this.overlayGroup.add(this.labelsGroup);
    this.overlayGroup.add(this.handlesGroup);
    this.overlayGroup.add(this.previewGroup);
    this.overlayGroup.add(this.measureGroup);
  }

  public getData(): ArchHouseData {
    return {
      walls: this.data.walls.map((w) => ({
        ...w,
        start: { ...w.start },
        end: { ...w.end },
      })),
      openings: this.data.openings.map((o) => ({ ...o })),
      roomMetas: this.data.roomMetas.map((r) => ({
        ...r,
        centroid: { ...r.centroid },
      })),
      stairs: this.data.stairs.map((s) => ({
        ...s,
        position: { ...s.position },
      })),
      roofs: this.data.roofs.map((rf) => ({
        ...rf,
        center: { ...rf.center },
      })),
      sun: { ...this.data.sun },
    };
  }

  public setData(next: ArchHouseData): void {
    this.data = {
      walls: (next.walls ?? []).map((w) => ({
        ...w,
        start: { ...w.start },
        end: { ...w.end },
      })),
      openings: (next.openings ?? []).map((o) => ({ ...o })),
      roomMetas: (next.roomMetas ?? []).map((r) => ({
        ...r,
        centroid: { ...r.centroid },
      })),
      stairs: (next.stairs ?? []).map((s) => ({
        ...s,
        position: { ...s.position },
      })),
      roofs: (next.roofs ?? []).map((rf) => ({
        ...rf,
        center: { ...rf.center },
      })),
      sun: { ...next.sun },
    };
  }

  public getDetectedRooms(): ArchDetectedRoom[] {
    return this.detectedRooms;
  }

  public getSelection(): ArchSelection {
    return this.selection;
  }

  public setSelection(sel: ArchSelection): void {
    this.selection = sel;
  }

  public setBlueprint2DMode(active: boolean): void {
    this.isBlueprint2D = active;
  }

  public getBuildingSummary(): {
    totalAreaSqm: number;
    roomCount: number;
    totalWallLengthM: number;
  } {
    const totalAreaSqm =
      Math.round(
        this.detectedRooms.reduce((sum, r) => sum + r.areaSqm, 0) * 100
      ) / 100;
    const totalWallLengthM =
      Math.round(
        this.data.walls.reduce((sum, w) => sum + computeWallLength(w), 0) * 100
      ) / 100;
    return {
      totalAreaSqm,
      roomCount: this.detectedRooms.length,
      totalWallLengthM,
    };
  }

  /**
   * Smart Soft-Magnetic Wall Point Snapper v2:
   * 1) Snaps to existing wall corners (`0.32m` magnet)
   * 2) Snaps to existing straight wall bodies for T-Junction room splits (`0.26m` magnet)
   * 3) Soft Magnetic Ortho Guide (`±8.5°` around 0°/90°/180°/270°, `±5°` around 45° diagonals) — NEVER stiff jumps!
   * 4) Corner Alignment Guides (`alignX` / `alignZ`) with existing room corners!
   */
  public snapWallPoint(
    rawXZ: Vec2XZ,
    floorId: string,
    anchorStart: Vec2XZ | null,
    angleSnap: boolean,
    gridStep: number
  ): {
    point: Vec2XZ;
    snappedEndpoint: boolean;
    snappedWallBody: boolean;
    guideLines: Array<{ from: Vec2XZ; to: Vec2XZ }>;
    lengthM: number;
    angleDeg: number;
  } {
    let x = rawXZ.x;
    let z = rawXZ.z;
    let snappedEndpoint = false;
    let snappedWallBody = false;
    const guideLines: Array<{ from: Vec2XZ; to: Vec2XZ }> = [];

    // 1. Endpoint Magnet on the active floor
    const ENDPOINT_RADIUS = 0.32;
    let bestDist = ENDPOINT_RADIUS;
    for (const w of this.data.walls) {
      if (w.floorId !== floorId) continue;
      for (const pt of [w.start, w.end]) {
        if (
          anchorStart &&
          Math.hypot(pt.x - anchorStart.x, pt.z - anchorStart.z) < 0.05
        ) {
          continue;
        }
        const d = Math.hypot(pt.x - rawXZ.x, pt.z - rawXZ.z);
        if (d < bestDist) {
          bestDist = d;
          x = pt.x;
          z = pt.z;
          snappedEndpoint = true;
        }
      }
    }

    // 2. Soft Ortho Angle Magnet (before T-junction check so orthogonal partition walls hit host walls squarely!)
    if (!snappedEndpoint && anchorStart) {
      const dx = x - anchorStart.x;
      const dz = z - anchorStart.z;
      const rawLen = Math.hypot(dx, dz);
      if (rawLen > 0.08) {
        let ang = Math.atan2(dz, dx);
        if (angleSnap) {
          const deg = ((ang * RAD2DEG) % 360 + 360) % 360;
          const cardinals = [0, 90, 180, 270, 360];
          const diagonals = [45, 135, 225, 315];
          let snappedDeg: number | null = null;
          for (const c of cardinals) {
            if (Math.abs(deg - c) <= 8.5) {
              snappedDeg = c % 360;
              break;
            }
          }
          if (snappedDeg === null) {
            for (const d of diagonals) {
              if (Math.abs(deg - d) <= 5.0) {
                snappedDeg = d;
                break;
              }
            }
          }
          if (snappedDeg !== null) {
            ang = snappedDeg * DEG2RAD;
          }
        }
        const fineStep = gridStep > 0 ? Math.min(0.1, gridStep) : 0.05;
        const cleanLen = Math.max(
          fineStep,
          Math.round(rawLen / fineStep) * fineStep
        );
        x = anchorStart.x + Math.cos(ang) * cleanLen;
        z = anchorStart.z + Math.sin(ang) * cleanLen;
      }
    } else if (!snappedEndpoint && !anchorStart && gridStep > 0) {
      const fineStep = Math.min(0.25, gridStep);
      x = Math.round(x / fineStep) * fineStep;
      z = Math.round(z / fineStep) * fineStep;
    }

    // 3. T-Junction Wall Body Magnet (snaps cleanly onto interior span of any straight wall on this floor!)
    if (!snappedEndpoint) {
      let bestBodyDist = 0.26;
      for (const w of this.data.walls) {
        if (w.floorId !== floorId || Math.abs(w.curveBulge) >= 0.04) continue;
        const wx = w.end.x - w.start.x;
        const wz = w.end.z - w.start.z;
        const wLenSq = wx * wx + wz * wz;
        if (wLenSq < 0.16) continue;
        const t = ((x - w.start.x) * wx + (z - w.start.z) * wz) / wLenSq;
        if (t <= 0.06 || t >= 0.94) continue;
        const projX = w.start.x + wx * t;
        const projZ = w.start.z + wz * t;
        if (
          anchorStart &&
          Math.hypot(projX - anchorStart.x, projZ - anchorStart.z) < 0.12
        ) {
          continue;
        }
        const d = Math.hypot(x - projX, z - projZ);
        if (d < bestBodyDist) {
          bestBodyDist = d;
          x = projX;
          z = projZ;
          snappedWallBody = true;
        }
      }
    }

    // 4. Smart Alignment Guides with Existing Wall Corners (helps close rooms into crisp rectangles!)
    if (!snappedEndpoint && !snappedWallBody) {
      let alignedX = false;
      let alignedZ = false;
      for (const w of this.data.walls) {
        if (w.floorId !== floorId) continue;
        for (const pt of [w.start, w.end]) {
          if (
            anchorStart &&
            Math.hypot(pt.x - anchorStart.x, pt.z - anchorStart.z) < 0.06
          ) {
            continue;
          }
          if (!alignedX && Math.abs(x - pt.x) <= 0.16) {
            x = pt.x;
            alignedX = true;
            guideLines.push({ from: { x: pt.x, z: pt.z }, to: { x, z } });
          }
          if (!alignedZ && Math.abs(z - pt.z) <= 0.16) {
            z = pt.z;
            alignedZ = true;
            guideLines.push({ from: { x: pt.x, z: pt.z }, to: { x, z } });
          }
        }
      }
    }

    const lengthM = anchorStart
      ? Math.round(Math.hypot(x - anchorStart.x, z - anchorStart.z) * 100) / 100
      : 0;
    const angleDeg = anchorStart
      ? Math.round(
          ((Math.atan2(z - anchorStart.z, x - anchorStart.x) * RAD2DEG + 360) %
            360)
        )
      : 0;

    return {
      point: { x: round3(x), z: round3(z) },
      snappedEndpoint,
      snappedWallBody,
      guideLines,
      lengthM,
      angleDeg,
    };
  }

  /**
   * Finds the closest wall on `floorId` to `pointXZ` for placing a live-cutout Door / Window / Arch
   */
  public findClosestWallForOpening(
    pointXZ: Vec2XZ,
    floorId: string,
    maxDist = 0.85
  ): { wall: ArchWallSegment; offsetRatio: number; worldXZ: Vec2XZ } | null {
    let best: {
      wall: ArchWallSegment;
      offsetRatio: number;
      worldXZ: Vec2XZ;
      dist: number;
    } | null = null;

    for (const w of this.data.walls) {
      if (w.floorId !== floorId || w.style === 'railing') continue;
      const len = computeWallLength(w);
      if (len < 0.65) continue;

      const samples = Math.abs(w.curveBulge) >= 0.04 ? 24 : 1;
      for (let s = 0; s < samples; s++) {
        const t0 = s / samples;
        const t1 = (s + 1) / samples;
        const p0 = sampleWallCurvePoint(w, t0);
        const p1 = sampleWallCurvePoint(w, t1);
        const dx = p1.x - p0.x;
        const dz = p1.z - p0.z;
        const segLenSq = dx * dx + dz * dz;
        if (segLenSq < 1e-6) continue;
        const localT = Math.max(
          0,
          Math.min(1, ((pointXZ.x - p0.x) * dx + (pointXZ.z - p0.z) * dz) / segLenSq)
        );
        const px = p0.x + dx * localT;
        const pz = p0.z + dz * localT;
        const d = Math.hypot(pointXZ.x - px, pointXZ.z - pz);
        if (d <= maxDist && (!best || d < best.dist)) {
          const globalT = Math.max(0.1, Math.min(0.9, t0 + (t1 - t0) * localT));
          best = {
            wall: w,
            offsetRatio: round3(globalT),
            worldXZ: { x: px, z: pz },
            dist: d,
          };
        }
      }
    }

    return best
      ? { wall: best.wall, offsetRatio: best.offsetRatio, worldXZ: best.worldXZ }
      : null;
  }

  /**
   * Splits any straight wall on `floorId` if `pt` lies strictly along its interior span (`0.05 < t < 0.95`),
   * remapping any hosted doors/windows proportionally so room partitions form closed loops automatically!
   */
  private splitWallsContainingPoint(floorId: string, pt: Vec2XZ): void {
    const SNAP_TOL = 0.08;
    const snapshot = [...this.data.walls];
    for (const w of snapshot) {
      if (w.floorId !== floorId || Math.abs(w.curveBulge) >= 0.04) continue;
      const dx = w.end.x - w.start.x;
      const dz = w.end.z - w.start.z;
      const lenSq = dx * dx + dz * dz;
      const len = Math.sqrt(lenSq);
      if (len < 0.5) continue;

      const t = ((pt.x - w.start.x) * dx + (pt.z - w.start.z) * dz) / lenSq;
      if (t <= 0.06 || t >= 0.94) continue;
      if (t * len < 0.22 || (1 - t) * len < 0.22) continue;

      const projX = w.start.x + dx * t;
      const projZ = w.start.z + dz * t;
      if (Math.hypot(pt.x - projX, pt.z - projZ) > SNAP_TOL) continue;

      const splitPt: Vec2XZ = { x: round3(projX), z: round3(projZ) };
      const origEnd: Vec2XZ = { ...w.end };
      w.end = { ...splitPt };

      const w2: ArchWallSegment = {
        ...w,
        id: `wall_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        start: { ...splitPt },
        end: origEnd,
      };
      this.data.walls.push(w2);

      // Re-assign openings along the two sub-walls
      for (const op of this.data.openings) {
        if (op.wallId !== w.id) continue;
        if (op.offsetRatio < t) {
          op.offsetRatio = round3(
            Math.max(0.12, Math.min(0.88, op.offsetRatio / t))
          );
        } else {
          op.wallId = w2.id;
          op.offsetRatio = round3(
            Math.max(0.12, Math.min(0.88, (op.offsetRatio - t) / (1 - t)))
          );
        }
      }
    }
  }

  public addWallSegment(
    floorId: string,
    start: Vec2XZ,
    end: Vec2XZ,
    defaults: WallDrawDefaults = DEFAULT_WALL_DRAW
  ): ArchWallSegment | null {
    const cleanStart = { x: round3(start.x), z: round3(start.z) };
    const cleanEnd = { x: round3(end.x), z: round3(end.z) };
    const len = Math.hypot(cleanEnd.x - cleanStart.x, cleanEnd.z - cleanStart.z);
    if (len < 0.2) return null;

    // Avoid exact duplicate overlapping wall on the same floor
    const dup = this.data.walls.find(
      (w) =>
        w.floorId === floorId &&
        ((Math.hypot(w.start.x - cleanStart.x, w.start.z - cleanStart.z) < 0.08 &&
          Math.hypot(w.end.x - cleanEnd.x, w.end.z - cleanEnd.z) < 0.08) ||
          (Math.hypot(w.start.x - cleanEnd.x, w.start.z - cleanEnd.z) < 0.08 &&
            Math.hypot(w.end.x - cleanStart.x, w.end.z - cleanStart.z) < 0.08))
    );
    if (dup) {
      this.selection = { kind: 'wall', id: dup.id };
      return dup;
    }

    // Auto-split any existing walls at T-junction start / end (and X-crossings for straight walls!)
    if (Math.abs(defaults.curveBulge) < 0.04) {
      this.splitWallsContainingPoint(floorId, cleanStart);
      this.splitWallsContainingPoint(floorId, cleanEnd);

      // Check interior X-intersections with existing straight walls so crossing walls split cleanly!
      const crossPts: Vec2XZ[] = [];
      const dx1 = cleanEnd.x - cleanStart.x;
      const dz1 = cleanEnd.z - cleanStart.z;
      for (const ew of [...this.data.walls]) {
        if (ew.floorId !== floorId || Math.abs(ew.curveBulge) >= 0.04) continue;
        const dx2 = ew.end.x - ew.start.x;
        const dz2 = ew.end.z - ew.start.z;
        const denom = dx1 * dz2 - dz1 * dx2;
        if (Math.abs(denom) < 1e-5) continue;
        const rx = ew.start.x - cleanStart.x;
        const rz = ew.start.z - cleanStart.z;
        const t = (rx * dz2 - rz * dx2) / denom;
        const u = (rx * dz1 - rz * dx1) / denom;
        if (t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95) {
          const ix = round3(cleanStart.x + t * dx1);
          const iz = round3(cleanStart.z + t * dz1);
          this.splitWallsContainingPoint(floorId, { x: ix, z: iz });
          crossPts.push({ x: ix, z: iz });
        }
      }

      if (crossPts.length > 0) {
        crossPts.sort(
          (a, b) =>
            Math.hypot(a.x - cleanStart.x, a.z - cleanStart.z) -
            Math.hypot(b.x - cleanStart.x, b.z - cleanStart.z)
        );
        const chain = [cleanStart, ...crossPts, cleanEnd];
        let lastCreated: ArchWallSegment | null = null;
        for (let i = 0; i < chain.length - 1; i++) {
          const segLen = Math.hypot(
            chain[i + 1].x - chain[i].x,
            chain[i + 1].z - chain[i].z
          );
          if (segLen < 0.2) continue;
          const subW: ArchWallSegment = {
            id: `wall_${Date.now().toString(36)}_${i}_${Math.random()
              .toString(36)
              .slice(2, 5)}`,
            floorId,
            start: chain[i],
            end: chain[i + 1],
            height:
              defaults.style === 'half'
                ? Math.min(defaults.height, 1.1)
                : defaults.style === 'railing'
                ? 1.0
                : defaults.height,
            thickness: defaults.thickness,
            style: defaults.style,
            curveBulge: 0,
            exteriorColor: defaults.exteriorColor,
            interiorColor: defaults.interiorColor,
            exteriorPattern: defaults.exteriorPattern,
            interiorPattern: defaults.interiorPattern,
            roughness: 0.78,
            hasBaseboard: defaults.hasBaseboard,
          };
          this.data.walls.push(subW);
          lastCreated = subW;
        }
        if (lastCreated) {
          this.selection = { kind: 'wall', id: lastCreated.id };
        }
        return lastCreated;
      }
    }

    const wall: ArchWallSegment = {
      id: `wall_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      floorId,
      start: cleanStart,
      end: cleanEnd,
      height:
        defaults.style === 'half'
          ? Math.min(defaults.height, 1.1)
          : defaults.style === 'railing'
          ? 1.0
          : defaults.height,
      thickness: defaults.thickness,
      style: defaults.style,
      curveBulge: defaults.curveBulge,
      exteriorColor: defaults.exteriorColor,
      interiorColor: defaults.interiorColor,
      exteriorPattern: defaults.exteriorPattern,
      interiorPattern: defaults.interiorPattern,
      roughness: 0.78,
      hasBaseboard: defaults.hasBaseboard,
    };
    this.data.walls.push(wall);
    this.selection = { kind: 'wall', id: wall.id };
    return wall;
  }

  /**
   * 1-Drag Room Box Builder: creates all 4 connected walls of a rectangular room in one stroke!
   */
  public addRoomBox(
    floorId: string,
    cornerA: Vec2XZ,
    cornerB: Vec2XZ,
    defaults: WallDrawDefaults = DEFAULT_WALL_DRAW
  ): number {
    const minX = round3(Math.min(cornerA.x, cornerB.x));
    const maxX = round3(Math.max(cornerA.x, cornerB.x));
    const minZ = round3(Math.min(cornerA.z, cornerB.z));
    const maxZ = round3(Math.max(cornerA.z, cornerB.z));
    if (maxX - minX < 0.4 || maxZ - minZ < 0.4) return 0;

    const straightDefaults: WallDrawDefaults = { ...defaults, curveBulge: 0 };
    const p1: Vec2XZ = { x: minX, z: minZ };
    const p2: Vec2XZ = { x: maxX, z: minZ };
    const p3: Vec2XZ = { x: maxX, z: maxZ };
    const p4: Vec2XZ = { x: minX, z: maxZ };

    let count = 0;
    if (this.addWallSegment(floorId, p1, p2, straightDefaults)) count++;
    if (this.addWallSegment(floorId, p2, p3, straightDefaults)) count++;
    if (this.addWallSegment(floorId, p3, p4, straightDefaults)) count++;
    if (this.addWallSegment(floorId, p4, p1, straightDefaults)) count++;
    return count;
  }

  /**
   * Copies all walls from `sourceFloorId` onto `targetFloorId` (1-Click Multi-Story Wall Trace!)
   */
  public copyWallsFromFloor(sourceFloorId: string, targetFloorId: string): number {
    if (sourceFloorId === targetFloorId) return 0;
    const srcWalls = this.data.walls.filter((w) => w.floorId === sourceFloorId);
    let copied = 0;
    for (const sw of srcWalls) {
      const exists = this.data.walls.some(
        (tw) =>
          tw.floorId === targetFloorId &&
          Math.hypot(tw.start.x - sw.start.x, tw.start.z - sw.start.z) < 0.08 &&
          Math.hypot(tw.end.x - sw.end.x, tw.end.z - sw.end.z) < 0.08
      );
      if (exists) continue;
      this.data.walls.push({
        ...sw,
        id: `wall_${Date.now().toString(36)}_${copied}_${Math.random()
          .toString(36)
          .slice(2, 5)}`,
        floorId: targetFloorId,
        start: { ...sw.start },
        end: { ...sw.end },
      });
      copied++;
    }
    return copied;
  }

  /**
   * Cleans up all architectural elements belonging to a deleted floor
   */
  public removeFloorData(floorId: string): void {
    this.data.walls = this.data.walls.filter((w) => w.floorId !== floorId);
    this.data.openings = this.data.openings.filter((o) => o.floorId !== floorId);
    this.data.stairs = this.data.stairs.filter((s) => s.floorId !== floorId);
    this.data.roofs = this.data.roofs.filter((r) => r.floorId !== floorId);
    this.data.roomMetas = this.data.roomMetas.filter((m) => m.floorId !== floorId);
  }

  public deleteArchElementByKindAndId(kind: string, id: string): boolean {
    if (kind === 'wall') {
      const before = this.data.walls.length;
      this.removeWallById(id);
      return this.data.walls.length < before;
    }
    if (kind === 'opening') {
      const before = this.data.openings.length;
      this.data.openings = this.data.openings.filter((o) => o.id !== id);
      if (this.selection?.kind === 'opening' && this.selection.id === id) {
        this.selection = null;
      }
      return this.data.openings.length < before;
    }
    if (kind === 'stair') {
      const before = this.data.stairs.length;
      this.data.stairs = this.data.stairs.filter((s) => s.id !== id);
      if (this.selection?.kind === 'stair' && this.selection.id === id) {
        this.selection = null;
      }
      return this.data.stairs.length < before;
    }
    if (kind === 'roof') {
      const before = this.data.roofs.length;
      this.data.roofs = this.data.roofs.filter((r) => r.id !== id);
      if (this.selection?.kind === 'roof' && this.selection.id === id) {
        this.selection = null;
      }
      return this.data.roofs.length < before;
    }
    return false;
  }

  public spawnWallTemplate(
    floorId: string,
    centerXZ: Vec2XZ,
    defaults: WallDrawDefaults = DEFAULT_WALL_DRAW
  ): ArchWallSegment | null {
    const halfW = Math.max(0.25, defaults.lengthTemplate * 0.5);
    return this.addWallSegment(
      floorId,
      { x: centerXZ.x - halfW, z: centerXZ.z },
      { x: centerXZ.x + halfW, z: centerXZ.z },
      defaults
    );
  }

  public updateWall(id: string, patch: Partial<ArchWallSegment>): boolean {
    const w = this.data.walls.find((x) => x.id === id);
    if (!w) return false;
    Object.assign(w, patch);
    return true;
  }

  public applyWallColorsOnFloor(
    floorId: string,
    exteriorColor: string,
    interiorColor: string,
    exteriorPattern?: ProceduralPatternKind,
    interiorPattern?: ProceduralPatternKind
  ): number {
    let count = 0;
    for (const w of this.data.walls) {
      if (w.floorId === floorId) {
        w.exteriorColor = exteriorColor;
        w.interiorColor = interiorColor;
        if (exteriorPattern !== undefined) w.exteriorPattern = exteriorPattern;
        if (interiorPattern !== undefined) w.interiorPattern = interiorPattern;
        count++;
      }
    }
    return count;
  }

  /**
   * Moves ALL wall endpoints connected to `oldXZ` on `floorId` simultaneously (Direct Viewport Node Drag!)
   */
  public moveConnectedWallVertex(
    floorId: string,
    oldXZ: Vec2XZ,
    newXZ: Vec2XZ
  ): number {
    const EPS = 0.08;
    let moved = 0;
    for (const w of this.data.walls) {
      if (w.floorId !== floorId) continue;
      if (Math.hypot(w.start.x - oldXZ.x, w.start.z - oldXZ.z) <= EPS) {
        w.start = { x: round3(newXZ.x), z: round3(newXZ.z) };
        moved++;
      } else if (Math.hypot(w.end.x - oldXZ.x, w.end.z - oldXZ.z) <= EPS) {
        w.end = { x: round3(newXZ.x), z: round3(newXZ.z) };
        moved++;
      }
    }
    return moved;
  }

  /**
   * Commits a wall segment of an exact typed meter length from `start` toward `aimPoint` (or +X)
   */
  public commitWallByExactLength(
    floorId: string,
    start: Vec2XZ,
    aimPoint: Vec2XZ | null,
    exactLengthM: number,
    defaults: WallDrawDefaults = DEFAULT_WALL_DRAW
  ): { wall: ArchWallSegment; endPoint: Vec2XZ } | null {
    const cleanLen = Math.max(0.25, Math.min(40, exactLengthM));
    let dx = aimPoint ? aimPoint.x - start.x : 1;
    let dz = aimPoint ? aimPoint.z - start.z : 0;
    if (Math.hypot(dx, dz) < 0.04) {
      dx = 1;
      dz = 0;
    }
    let ang = Math.atan2(dz, dx);
    if (defaults.angleSnap) {
      const step = Math.PI / 4;
      ang = Math.round(ang / step) * step;
    }
    const endPoint: Vec2XZ = {
      x: round3(start.x + Math.cos(ang) * cleanLen),
      z: round3(start.z + Math.sin(ang) * cleanLen),
    };
    const wall = this.addWallSegment(floorId, start, endPoint, defaults);
    return wall ? { wall, endPoint } : null;
  }

  /**
   * Slides an existing Door / Window / Archway smoothly along its host wall during viewport drag
   */
  public slideOpeningToWorldXZ(openingId: string, pointXZ: Vec2XZ): boolean {
    const op = this.data.openings.find((o) => o.id === openingId);
    if (!op) return false;
    const wall = this.data.walls.find((w) => w.id === op.wallId);
    if (!wall) return false;

    const totalLen = Math.max(0.4, computeWallLength(wall));
    const minRatio = Math.min(0.45, (op.width * 0.5 + 0.08) / totalLen);
    const maxRatio = Math.max(0.55, 1 - minRatio);

    const samples = Math.abs(wall.curveBulge) >= 0.04 ? 24 : 1;
    let bestT = op.offsetRatio;
    let bestDist = Infinity;

    for (let s = 0; s < samples; s++) {
      const t0 = s / samples;
      const t1 = (s + 1) / samples;
      const p0 = sampleWallCurvePoint(wall, t0);
      const p1 = sampleWallCurvePoint(wall, t1);
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const segSq = dx * dx + dz * dz;
      if (segSq < 1e-6) continue;
      const lt = Math.max(
        0,
        Math.min(1, ((pointXZ.x - p0.x) * dx + (pointXZ.z - p0.z) * dz) / segSq)
      );
      const px = p0.x + dx * lt;
      const pz = p0.z + dz * lt;
      const d = Math.hypot(pointXZ.x - px, pointXZ.z - pz);
      if (d < bestDist) {
        bestDist = d;
        bestT = t0 + (t1 - t0) * lt;
      }
    }

    op.offsetRatio = round3(Math.max(minRatio, Math.min(maxRatio, bestT)));
    return true;
  }

  public toggleDoorOpen(openingId: string): boolean | null {
    const op = this.data.openings.find((o) => o.id === openingId);
    if (!op || (!op.kind.startsWith('door'))) return null;
    op.isOpen = op.isOpen === false ? true : false;
    return op.isOpen;
  }

  public addOpeningOnWall(
    wallId: string,
    kind: ArchOpeningKind,
    offsetRatio: number
  ): ArchOpeningItem | null {
    const wall = this.data.walls.find((w) => w.id === wallId);
    if (!wall) return null;
    const preset = OPENING_PRESETS[kind];
    const wallLen = computeWallLength(wall);
    const maxW = Math.max(0.45, wallLen - 0.24);
    const width = Math.min(preset.width, maxW);
    const height = Math.min(preset.height, Math.max(0.5, wall.height - 0.15));
    const sill =
      preset.sillHeight > 0
        ? Math.min(preset.sillHeight, Math.max(0, wall.height - height - 0.1))
        : 0;

    const item: ArchOpeningItem = {
      id: `open_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      wallId: wall.id,
      floorId: wall.floorId,
      kind,
      offsetRatio: Math.max(0.12, Math.min(0.88, offsetRatio)),
      width: round3(width),
      height: round3(height),
      sillHeight: round3(sill),
      frameColor: '#334155',
      flipSwing: false,
    };
    this.data.openings.push(item);
    this.selection = { kind: 'opening', id: item.id };
    return item;
  }

  public updateOpening(id: string, patch: Partial<ArchOpeningItem>): boolean {
    const op = this.data.openings.find((x) => x.id === id);
    if (!op) return false;
    Object.assign(op, patch);
    return true;
  }

  public updateRoomMeta(
    roomId: string,
    patch: Partial<
      Pick<ArchRoomMeta, 'name' | 'floorColor' | 'floorPattern' | 'ceilingVisible'>
    >
  ): boolean {
    const detected = this.detectedRooms.find((r) => r.id === roomId);
    if (!detected) return false;

    let meta = this.data.roomMetas.find((m) => m.id === roomId);
    if (!meta) {
      meta = {
        id: detected.id,
        floorId: detected.floorId,
        centroid: { ...detected.centroid },
        name: detected.name,
        floorColor: detected.floorColor,
        floorPattern: detected.floorPattern ?? 'wood',
        ceilingVisible: detected.ceilingVisible,
      };
      this.data.roomMetas.push(meta);
    }
    Object.assign(meta, patch);
    meta.centroid = { ...detected.centroid };
    return true;
  }

  public addStaircase(
    floorId: string,
    kind: ArchStairKind,
    pos: { x: number; y: number; z: number },
    storyHeight = 3.0
  ): ArchStairItem {
    const stair: ArchStairItem = {
      id: `stair_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      floorId,
      kind,
      position: { x: round3(pos.x), y: round3(pos.y), z: round3(pos.z) },
      rotationY: 0,
      width: 1.15,
      height: storyHeight,
      runLength: 2.85,
      color: '#b77946',
      autoCutoutUpper: true,
    };
    this.data.stairs.push(stair);
    this.selection = { kind: 'stair', id: stair.id };
    return stair;
  }

  public updateStair(id: string, patch: Partial<ArchStairItem>): boolean {
    const st = this.data.stairs.find((s) => s.id === id);
    if (!st) return false;
    Object.assign(st, patch);
    return true;
  }

  public generateAutoRoof(
    floors: BuildingFloorLayer[],
    activeFloorId: string,
    style: ArchRoofStyle = 'gable',
    roofName = 'Atap Pintar'
  ): ArchRoofItem {
    const sortedFloors = [...floors].sort((a, b) => a.elevation - b.elevation);
    const activeFl =
      floors.find((f) => f.id === activeFloorId) ?? sortedFloors[0];

    // Prefer walls on active floor; if empty (e.g. user clicked Roof floor), inspect floor right below!
    let refWalls = this.data.walls.filter((w) => w.floorId === activeFl.id);
    let baseY = activeFl.elevation + activeFl.height;
    if (refWalls.length === 0) {
      for (let i = sortedFloors.length - 1; i >= 0; i--) {
        const candidate = this.data.walls.filter(
          (w) => w.floorId === sortedFloors[i].id
        );
        if (candidate.length > 0) {
          refWalls = candidate;
          const maxWallH = Math.max(...candidate.map((w) => w.height));
          baseY = sortedFloors[i].elevation + maxWallH;
          break;
        }
      }
    } else {
      const maxWallH = Math.max(...refWalls.map((w) => w.height));
      baseY = activeFl.elevation + maxWallH;
    }

    let minX = -3.5;
    let maxX = 3.5;
    let minZ = -3.5;
    let maxZ = 3.5;

    if (refWalls.length > 0) {
      minX = Infinity;
      maxX = -Infinity;
      minZ = Infinity;
      maxZ = -Infinity;
      for (const w of refWalls) {
        for (let s = 0; s <= 8; s++) {
          const pt = sampleWallCurvePoint(w, s / 8);
          minX = Math.min(minX, pt.x - w.thickness * 0.5);
          maxX = Math.max(maxX, pt.x + w.thickness * 0.5);
          minZ = Math.min(minZ, pt.z - w.thickness * 0.5);
          maxZ = Math.max(maxZ, pt.z + w.thickness * 0.5);
        }
      }
    }

    const width = Math.max(2.0, round3(maxX - minX));
    const depth = Math.max(2.0, round3(maxZ - minZ));
    const cx = round3((minX + maxX) * 0.5);
    const cz = round3((minZ + maxZ) * 0.5);

    const roof: ArchRoofItem = {
      id: `roof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      floorId: activeFl.id,
      name: roofName,
      style,
      center: { x: cx, z: cz },
      width,
      depth,
      baseY: round3(baseY),
      pitchDeg: style === 'shed' ? 18 : 30,
      overhang: 0.45,
      ridgeAxis: width >= depth ? 'x' : 'z',
      color: '#b85d3b',
      fasciaColor: '#e2e8f0',
      rotationY: 0,
    };
    this.data.roofs.push(roof);
    this.selection = { kind: 'roof', id: roof.id };
    return roof;
  }

  public addCustomRoofWing(
    floors: BuildingFloorLayer[],
    activeFloorId: string,
    style: ArchRoofStyle = 'gable',
    roofName = 'Sayap Atap'
  ): ArchRoofItem {
    const activeFl =
      floors.find((f) => f.id === activeFloorId) ?? floors[0];
    const existingCount = this.data.roofs.length;
    const offset = (existingCount % 4) * 1.6;
    const baseY = activeFl ? activeFl.elevation + activeFl.height : 3.0;

    const roof: ArchRoofItem = {
      id: `roof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      floorId: activeFl ? activeFl.id : 'floor_1',
      name: `${roofName} #${existingCount + 1}`,
      style,
      center: { x: round3(offset), z: round3(offset * 0.6) },
      width: 4.5,
      depth: 4.0,
      baseY: round3(baseY),
      pitchDeg: style === 'shed' ? 18 : 28,
      overhang: 0.4,
      ridgeAxis: existingCount % 2 === 1 ? 'z' : 'x',
      color: '#b85d3b',
      fasciaColor: '#e2e8f0',
      rotationY: 0,
      roofPattern: style === 'flat' ? 'concrete' : 'roof-tile',
      hasSkylight: false,
      skylightWidth: 1.8,
      skylightDepth: 1.4,
    };
    this.data.roofs.push(roof);
    this.selection = { kind: 'roof', id: roof.id };
    return roof;
  }

  public updateRoof(id: string, patch: Partial<ArchRoofItem>): boolean {
    const rf = this.data.roofs.find((r) => r.id === id);
    if (!rf) return false;
    Object.assign(rf, patch);
    return true;
  }

  public deleteSelectedArchElement(): boolean {
    if (!this.selection) return false;
    const { kind, id } = this.selection;
    if (kind === 'wall') {
      this.data.walls = this.data.walls.filter((w) => w.id !== id);
      this.data.openings = this.data.openings.filter((o) => o.wallId !== id);
    } else if (kind === 'opening') {
      this.data.openings = this.data.openings.filter((o) => o.id !== id);
    } else if (kind === 'stair') {
      this.data.stairs = this.data.stairs.filter((s) => s.id !== id);
    } else if (kind === 'roof') {
      this.data.roofs = this.data.roofs.filter((r) => r.id !== id);
    } else {
      return false;
    }
    this.selection = null;
    return true;
  }

  /**
   * Converts a Smart Wall (with its doorway/window spans) or Smart Roof into free Blender-editable CustomAssetPart[]
   */
  public extractSelectedWallAsParts(floors: BuildingFloorLayer[]): {
    wallId: string;
    name: string;
    parts: CustomAssetPart[];
    center: { x: number; y: number; z: number };
  } | null {
    if (!this.selection || this.selection.kind !== 'wall') return null;
    const wall = this.data.walls.find((w) => w.id === this.selection!.id);
    if (!wall) return null;
    const fl = floors.find((f) => f.id === wall.floorId);
    const baseY = fl ? fl.elevation : 0;

    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const L = Math.max(0.2, Math.hypot(dx, dz));
    const yawDeg = -Math.atan2(dz, dx) * RAD2DEG;
    const cx = (wall.start.x + wall.end.x) * 0.5;
    const cz = (wall.start.z + wall.end.z) * 0.5;

    const ops = this.data.openings
      .filter((o) => o.wallId === wall.id)
      .map((o) => {
        const centerS = o.offsetRatio * L;
        return {
          s0: Math.max(0.06, centerS - o.width * 0.5),
          s1: Math.min(L - 0.06, centerS + o.width * 0.5),
          sill: o.sillHeight,
          top: Math.min(wall.height, o.sillHeight + o.height),
        };
      })
      .sort((a, b) => a.s0 - b.s0);

    const parts: CustomAssetPart[] = [];
    const pushLocalBox = (sStart: number, sEnd: number, y0: number, y1: number) => {
      const wSpan = sEnd - sStart;
      const hSpan = y1 - y0;
      if (wSpan < 0.03 || hSpan < 0.03) return;
      const localS = (sStart + sEnd) * 0.5 - L * 0.5;
      const cos = Math.cos(-yawDeg * DEG2RAD);
      const sin = Math.sin(-yawDeg * DEG2RAD);
      parts.push({
        name: 'Wall Span',
        kind: 'cube',
        localPosition: {
          x: round3(localS * cos),
          y: round3((y0 + y1) * 0.5),
          z: round3(localS * sin),
        },
        rotation: { x: 0, y: round3(yawDeg), z: 0 },
        scale: { x: round3(wSpan), y: round3(hSpan), z: wall.thickness },
        color: wall.exteriorColor,
        roughness: wall.roughness,
        metalness: 0.04,
        opacity: 1,
        emissive: '#000000',
        emissiveIntensity: 0,
        flatShading: false,
        subdivision: { ...DEFAULT_SUBDIVISION_SETTINGS },
        archRole: 'wall',
      });
    };

    let cursor = 0;
    for (const op of ops) {
      if (op.s0 > cursor + 0.03) {
        pushLocalBox(cursor, op.s0, 0, wall.height);
      }
      if (op.sill > 0.03) {
        pushLocalBox(op.s0, op.s1, 0, op.sill);
      }
      if (op.top < wall.height - 0.03) {
        pushLocalBox(op.s0, op.s1, op.top, wall.height);
      }
      cursor = Math.max(cursor, op.s1);
    }
    if (cursor < L - 0.03) {
      pushLocalBox(cursor, L, 0, wall.height);
    }

    return {
      wallId: wall.id,
      name: `Wall ${L.toFixed(1)}m`,
      parts,
      center: { x: cx, y: baseY, z: cz },
    };
  }

  public removeWallById(wallId: string): void {
    this.data.walls = this.data.walls.filter((w) => w.id !== wallId);
    this.data.openings = this.data.openings.filter((o) => o.wallId !== wallId);
    if (this.selection?.kind === 'wall' && this.selection.id === wallId) {
      this.selection = null;
    }
  }

  /**
   * Walkthrough Sliding Wall Collision Solver:
   * Blocks passing through solid wall spans while letting walker glide smoothly along walls
   * and walk freely through Archways & Open Doors!
   */
  public resolveWalkthroughMovement(
    prevX: number,
    prevZ: number,
    desiredX: number,
    desiredZ: number,
    currentFootY: number,
    floors: BuildingFloorLayer[]
  ): Vec2XZ {
    let rx = desiredX;
    let rz = desiredZ;
    const PLAYER_RADIUS = 0.28;

    for (const w of this.data.walls) {
      const fl = floors.find((f) => f.id === w.floorId);
      const baseY = fl ? fl.elevation : 0;
      if (currentFootY < baseY - 0.35 || currentFootY > baseY + w.height - 0.25) {
        continue;
      }

      const wallLen = computeWallLength(w);
      if (wallLen < 0.2) continue;
      const wallOps = this.data.openings.filter((o) => o.wallId === w.id);

      const steps = Math.abs(w.curveBulge) >= 0.04 ? 12 : 1;
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps;
        const t1 = (s + 1) / steps;
        const p0 = sampleWallCurvePoint(w, t0);
        const p1 = sampleWallCurvePoint(w, t1);
        const segDx = p1.x - p0.x;
        const segDz = p1.z - p0.z;
        const segLenSq = segDx * segDx + segDz * segDz;
        if (segLenSq < 1e-6) continue;

        const lt = Math.max(
          0,
          Math.min(1, ((rx - p0.x) * segDx + (rz - p0.z) * segDz) / segLenSq)
        );
        const cx = p0.x + segDx * lt;
        const cz = p0.z + segDz * lt;
        const dist = Math.hypot(rx - cx, rz - cz);
        const minClearance = w.thickness * 0.5 + PLAYER_RADIUS;

        if (dist < minClearance) {
          // Check if player is passing through an Archway or an Open Door!
          const sAlong = (t0 + (t1 - t0) * lt) * wallLen;
          const passable = wallOps.some((op) => {
            const isDoorPassable =
              op.kind === 'archway' ||
              (op.kind.startsWith('door') && op.isOpen !== false);
            if (!isDoorPassable) return false;
            const opCenterS = op.offsetRatio * wallLen;
            return Math.abs(sAlong - opCenterS) <= Math.max(0.22, op.width * 0.5 - 0.14);
          });

          if (!passable) {
            let nx = rx - cx;
            let nz = rz - cz;
            let nLen = Math.hypot(nx, nz);
            if (nLen < 1e-4) {
              nx = prevX - cx;
              nz = prevZ - cz;
              nLen = Math.max(1e-4, Math.hypot(nx, nz));
            }
            nx /= nLen;
            nz /= nLen;
            const push = minClearance - dist;
            rx += nx * push;
            rz += nz * push;
          }
        }
      }
    }

    return { x: rx, z: rz };
  }

  /**
   * Walkthrough Stair Elevation Solver (`straight` AND `l-shape` stairs!)
   */
  public sampleWalkthroughFloorElevation(
    x: number,
    z: number,
    currentFootY: number,
    floors: BuildingFloorLayer[]
  ): number | null {
    // 1. Check if walker is on any Staircase ramp (`straight` or `l-shape`)!
    for (const st of this.data.stairs) {
      const dx = x - st.position.x;
      const dz = z - st.position.z;
      const cos = Math.cos(-st.rotationY * DEG2RAD);
      const sin = Math.sin(-st.rotationY * DEG2RAD);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;

      if (st.kind === 'straight') {
        if (Math.abs(lx) <= st.width * 0.55 && Math.abs(lz) <= st.runLength * 0.56) {
          const t = Math.max(
            0,
            Math.min(1, (lz + st.runLength * 0.5) / st.runLength)
          );
          const rampY = st.position.y + t * st.height;
          if (Math.abs(rampY - currentFootY) <= 1.35) {
            return rampY;
          }
        }
      } else {
        // L-shape stair: Leg 1 (-Z -> 0 at X in [-w, 0]), Landing (X in [-w, 0], Z in [0, w]), Leg 2 (X in [0, leg2Run], Z in [0, w])
        const w = Math.max(0.75, st.width);
        const legRun = Math.max(1.6, st.runLength) * 0.55;
        const halfH = st.height * 0.5;

        if (lx >= -w * 1.05 && lx <= 0.08 && lz >= -legRun - 0.1 && lz <= 0.05) {
          const t1 = Math.max(0, Math.min(1, (lz + legRun) / legRun));
          const y1 = st.position.y + t1 * halfH;
          if (Math.abs(y1 - currentFootY) <= 1.35) return y1;
        }
        if (lx >= -w * 1.05 && lx <= 0.1 && lz >= -0.05 && lz <= w * 1.05) {
          const yLand = st.position.y + halfH;
          if (Math.abs(yLand - currentFootY) <= 1.35) return yLand;
        }
        if (lx >= -0.05 && lx <= legRun + 0.15 && lz >= -0.05 && lz <= w * 1.05) {
          const t2 = Math.max(0, Math.min(1, lx / legRun));
          const y2 = st.position.y + halfH + t2 * halfH;
          if (Math.abs(y2 - currentFootY) <= 1.35) return y2;
        }
      }
    }

    // 2. Check if walker is standing on a detected upper-story Room Floor Slab (unless inside a stairwell hole!)
    let bestSlabY: number | null = null;
    for (const rm of this.detectedRooms) {
      const fl = floors.find((f) => f.id === rm.floorId);
      if (!fl || fl.elevation <= 0.05) continue;
      if (Math.abs(fl.elevation - currentFootY) > 1.2) continue;

      if (this.pointInPolygonXZ(x, z, rm.polygon)) {
        if (!this.isInsideStairwellCutout(x, z, fl.elevation)) {
          if (bestSlabY === null || fl.elevation > bestSlabY) {
            bestSlabY = fl.elevation;
          }
        }
      }
    }
    return bestSlabY;
  }

  private isInsideStairwellCutout(x: number, z: number, upperFloorY: number): boolean {
    for (const st of this.data.stairs) {
      if (!st.autoCutoutUpper) continue;
      const topY = st.position.y + st.height;
      if (Math.abs(topY - upperFloorY) > 0.45) continue;

      const dx = x - st.position.x;
      const dz = z - st.position.z;
      const cos = Math.cos(-st.rotationY * DEG2RAD);
      const sin = Math.sin(-st.rotationY * DEG2RAD);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;

      if (
        Math.abs(lx) <= st.width * 0.52 &&
        Math.abs(lz) <= st.runLength * 0.52
      ) {
        return true;
      }
    }
    return false;
  }

  private pointInPolygonXZ(x: number, z: number, poly: Vec2XZ[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const zi = poly[i].z;
      const xj = poly[j].x;
      const zj = poly[j].z;
      const intersect =
        zi > z !== zj > z &&
        x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Smart Auto-Hide Ceiling visibility:
   * - Hidden when looking down from above or in 2D Blueprint mode
   * - Shown when in Walkthrough or when camera eye is below ceiling height!
   */
  public updateSmartCeilingsVisibility(
    cameraY: number,
    walkthroughEnabled: boolean,
    interiorPeekEnabled: boolean
  ): void {
    for (const item of this.ceilingMeshes) {
      if (this.isBlueprint2D || interiorPeekEnabled) {
        item.mesh.visible = false;
      } else if (walkthroughEnabled) {
        item.mesh.visible = true;
      } else {
        item.mesh.visible = cameraY < item.ceilingY + 0.15;
      }
    }
  }

  /**
   * Rebuilds all 3D Walls (with live cutouts & dual-sided materials), Corner Joins,
   * Detected Room Slabs (with stairwell holes), Smart Ceilings, Stairs, Roofs & Dimension Labels!
   */
  public rebuildAll(
    floors: BuildingFloorLayer[],
    activeFloorId: string,
    floorViewMode: FloorViewMode,
    isHouseMode: boolean,
    defaultRoomPrefix = 'Ruang'
  ): ArchDetectedRoom[] {
    disposeObjectTree(this.structuralGroup);
    this.structuralGroup.clear();
    disposeObjectTree(this.labelsGroup);
    this.labelsGroup.clear();
    disposeObjectTree(this.handlesGroup);
    this.handlesGroup.clear();
    this.ceilingMeshes = [];

    if (!isHouseMode) {
      this.detectedRooms = [];
      return [];
    }

    const activeFl =
      floors.find((f) => f.id === activeFloorId) ?? floors[0];

    // 1. Detect Closed Rooms on Every Floor
    const allRooms: ArchDetectedRoom[] = [];
    for (const fl of floors) {
      const detected = detectClosedRoomsOnFloor(
        this.data.walls,
        fl.id,
        this.data.roomMetas,
        defaultRoomPrefix
      );
      allRooms.push(...detected);
    }
    this.detectedRooms = allRooms;

    const resolveFloorDrawStyle = (
      floorId: string
    ): { visible: boolean; ghost: boolean; baseY: number; storyH: number } => {
      const fl = floors.find((f) => f.id === floorId);
      if (!fl) return { visible: true, ghost: false, baseY: 0, storyH: 3.0 };
      if (!fl.visible) {
        return { visible: false, ghost: false, baseY: fl.elevation, storyH: fl.height };
      }
      if (
        floorViewMode === 'cutaway-above' &&
        activeFl &&
        fl.elevation > activeFl.elevation + 0.08
      ) {
        return { visible: false, ghost: false, baseY: fl.elevation, storyH: fl.height };
      }
      const ghost =
        floorViewMode === 'ghost-others' &&
        Boolean(activeFl && fl.id !== activeFl.id);
      return { visible: true, ghost, baseY: fl.elevation, storyH: fl.height };
    };

    // 2. Build Room Floor Slabs (with Automatic Stairwell Cutout Holes!) & Smart Auto-Hide Ceilings
    for (const room of allRooms) {
      const fStyle = resolveFloorDrawStyle(room.floorId);
      if (!fStyle.visible || room.polygon.length < 3) continue;

      const shape = new THREE.Shape();
      room.polygon.forEach((pt, idx) => {
        // Shape is in XY, rotated +90° around X so (x, y_shape) -> (x, 0, y_shape)
        if (idx === 0) shape.moveTo(pt.x, pt.z);
        else shape.lineTo(pt.x, pt.z);
      });
      shape.closePath();

      // Punch Stairwell Cutout Holes from stairs rising up into this floor elevation!
      for (const st of this.data.stairs) {
        if (!st.autoCutoutUpper) continue;
        const stairTopY = st.position.y + st.height;
        if (Math.abs(stairTopY - fStyle.baseY) > 0.45) continue;

        const hw = st.width * 0.5;
        const hl = st.runLength * 0.5;
        const cos = Math.cos(st.rotationY * DEG2RAD);
        const sin = Math.sin(st.rotationY * DEG2RAD);
        const cornersLocal: Array<[number, number]> = [
          [-hw, -hl],
          [hw, -hl],
          [hw, hl],
          [-hw, hl],
        ];
        const cornersWorld = cornersLocal.map(([lx, lz]) => ({
          x: st.position.x + lx * cos + lz * sin,
          z: st.position.z - lx * sin + lz * cos,
        }));
        if (
          this.pointInPolygonXZ(
            st.position.x,
            st.position.z,
            room.polygon
          )
        ) {
          const hole = new THREE.Path();
          cornersWorld.forEach((c, idx) => {
            if (idx === 0) hole.moveTo(c.x, c.z);
            else hole.lineTo(c.x, c.z);
          });
          hole.closePath();
          shape.holes.push(hole);
        }
      }

      const isRoomSelected =
        this.selection?.kind === 'room' && this.selection.id === room.id;

      const floorGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.06,
        bevelEnabled: false,
      });
      floorGeo.rotateX(Math.PI * 0.5);

      const floorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(room.floorColor),
        roughness: 0.65,
        metalness: 0.04,
        transparent: fStyle.ghost,
        opacity: fStyle.ghost ? 0.2 : 1,
        emissive: isRoomSelected
          ? new THREE.Color('#3b82f6')
          : new THREE.Color('#000000'),
        emissiveIntensity: isRoomSelected ? 0.18 : 0,
      });
      if (!fStyle.ghost && room.floorPattern && room.floorPattern !== 'none') {
        applyProceduralPatternToMaterial(floorMat, room.floorPattern, 0.75, 0.75);
      }

      const slabMesh = new THREE.Mesh(floorGeo, floorMat);
      slabMesh.position.y = fStyle.baseY + 0.062;
      slabMesh.receiveShadow = true;
      slabMesh.castShadow = fStyle.baseY > 0.1;
      slabMesh.userData = {
        archKind: 'room',
        archId: room.id,
        floorId: room.floorId,
      };
      this.structuralGroup.add(slabMesh);

      // Smart Auto-Hide Ceiling (with automatic Skylight hole when a Skylight Roof sits overhead!)
      if (room.ceilingVisible && !fStyle.ghost) {
        const ceilShape = shape.clone();
        const ceilingY = fStyle.baseY + fStyle.storyH;
        for (const rf of this.data.roofs) {
          if (!rf.hasSkylight) continue;
          if (Math.abs(rf.baseY - ceilingY) > 0.85) continue;
          if (this.pointInPolygonXZ(rf.center.x, rf.center.z, room.polygon)) {
            const shw = (rf.skylightWidth ?? 1.8) * 0.5;
            const shd = (rf.skylightDepth ?? 1.4) * 0.5;
            const skyHole = new THREE.Path();
            skyHole.moveTo(rf.center.x - shw, rf.center.z - shd);
            skyHole.lineTo(rf.center.x + shw, rf.center.z - shd);
            skyHole.lineTo(rf.center.x + shw, rf.center.z + shd);
            skyHole.lineTo(rf.center.x - shw, rf.center.z + shd);
            skyHole.closePath();
            ceilShape.holes.push(skyHole);
          }
        }
        const ceilGeo = new THREE.ShapeGeometry(ceilShape);
        ceilGeo.rotateX(Math.PI * 0.5);
        const ceilMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#f8fafc'),
          roughness: 0.85,
          metalness: 0.02,
          side: THREE.DoubleSide,
        });
        const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
        ceilMesh.position.y = ceilingY - 0.01;
        ceilMesh.visible = false;
        ceilMesh.receiveShadow = true;
        ceilMesh.userData = { archKind: 'ceiling', archId: room.id };
        this.structuralGroup.add(ceilMesh);
        this.ceilingMeshes.push({
          mesh: ceilMesh,
          ceilingY,
          floorId: room.floorId,
        });
      }

      // Room Name + Area m² Badge on Active Floor
      if (activeFl && room.floorId === activeFl.id) {
        const badge = makeLabelSprite(
          room.name,
          `${room.areaSqm.toFixed(1)} m²`,
          {
            bg: isRoomSelected
              ? 'rgba(30, 58, 138, 0.92)'
              : 'rgba(15, 23, 42, 0.82)',
            border: isRoomSelected
              ? 'rgba(96, 165, 250, 0.95)'
              : 'rgba(52, 211, 153, 0.65)',
            subColor: '#6ee7b7',
            scale: this.isBlueprint2D ? 1.15 : 0.95,
          }
        );
        badge.position.set(
          room.centroid.x,
          fStyle.baseY + (this.isBlueprint2D ? 0.35 : 0.25),
          room.centroid.z
        );
        this.labelsGroup.add(badge);
      }
    }

    // 3. Build Dual-Sided Walls with Live Cutouts & Baseboards + Corner Junction Columns
    const vertexJunctionMap = new Map<
      string,
      { x: number; z: number; baseY: number; maxH: number; maxT: number; color: string; count: number; ghost: boolean }
    >();

    for (const wall of this.data.walls) {
      const fStyle = resolveFloorDrawStyle(wall.floorId);
      if (!fStyle.visible) continue;

      const isWallSel =
        this.selection?.kind === 'wall' && this.selection.id === wall.id;
      const wallGroup = this.buildSingleWallWithCutouts(
        wall,
        fStyle.baseY,
        fStyle.ghost,
        isWallSel
      );
      const midSample = sampleWallCurvePoint(wall, 0.5);
      wallGroup.userData.wallMidX = midSample.x;
      wallGroup.userData.wallMidZ = midSample.z;
      wallGroup.userData.baseY = fStyle.baseY;
      wallGroup.userData.fullH = wall.height;
      this.structuralGroup.add(wallGroup);

      // Register endpoints for watertight corner joins (full & half walls)
      if (wall.style !== 'railing') {
        for (const pt of [wall.start, wall.end]) {
          const qx = Math.round(pt.x * 20) / 20;
          const qz = Math.round(pt.z * 20) / 20;
          const key = `${wall.floorId}:${qx}:${qz}`;
          const prev = vertexJunctionMap.get(key);
          if (prev) {
            prev.count++;
            prev.maxH = Math.max(prev.maxH, wall.height);
            prev.maxT = Math.max(prev.maxT, wall.thickness);
          } else {
            vertexJunctionMap.set(key, {
              x: pt.x,
              z: pt.z,
              baseY: fStyle.baseY,
              maxH: wall.height,
              maxT: wall.thickness,
              color: wall.exteriorColor,
              count: 1,
              ghost: fStyle.ghost,
            });
          }
        }
      }

      // 2D Blueprint Architectural Wall Length Dimension Label
      if (this.isBlueprint2D && activeFl && wall.floorId === activeFl.id) {
        const lenM = computeWallLength(wall);
        if (lenM >= 0.4) {
          const mid = sampleWallCurvePoint(wall, 0.5);
          const nx = -mid.tz;
          const nz = mid.tx;
          const dimSprite = makeLabelSprite(`${lenM.toFixed(2)} m`, undefined, {
            bg: 'rgba(15, 23, 42, 0.88)',
            border: 'rgba(148, 163, 184, 0.55)',
            titleColor: '#e2e8f0',
            scale: 0.78,
          });
          dimSprite.position.set(
            mid.x + nx * 0.28,
            fStyle.baseY + wall.height + 0.25,
            mid.z + nz * 0.28
          );
          this.labelsGroup.add(dimSprite);
        }
      }
    }

    // Add seamless Corner Junction Columns + Draggable Blue Corner Node Handles on Active Floor!
    const handleAddedKeys = new Set<string>();
    for (const w of this.data.walls) {
      if (!activeFl || w.floorId !== activeFl.id) continue;
      for (const pt of [w.start, w.end]) {
        const hk = `${Math.round(pt.x * 20)}:${Math.round(pt.z * 20)}`;
        if (handleAddedKeys.has(hk)) continue;
        handleAddedKeys.add(hk);

        const handleRadius = this.isBlueprint2D ? 0.2 : 0.15;
        const hGeo = new THREE.CylinderGeometry(
          handleRadius,
          handleRadius,
          0.12,
          18
        );
        const hMat = new THREE.MeshBasicMaterial({
          color: '#38bdf8',
          transparent: true,
          opacity: 0.9,
          depthTest: false,
        });
        const hMesh = new THREE.Mesh(hGeo, hMat);
        hMesh.position.set(
          pt.x,
          activeFl.elevation + (this.isBlueprint2D ? w.height + 0.15 : 0.08),
          pt.z
        );
        hMesh.renderOrder = 22;
        hMesh.userData = {
          archHandleKind: 'wall-node',
          floorId: activeFl.id,
          nodeX: pt.x,
          nodeZ: pt.z,
        };
        this.handlesGroup.add(hMesh);
      }
    }

    for (const jn of vertexJunctionMap.values()) {
      if (jn.count < 2) continue;
      const colGeo = new THREE.CylinderGeometry(
        jn.maxT * 0.502,
        jn.maxT * 0.502,
        jn.maxH,
        14
      );
      const colMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(jn.color),
        roughness: 0.78,
        metalness: 0.04,
        transparent: jn.ghost,
        opacity: jn.ghost ? 0.22 : 1,
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.set(jn.x, jn.baseY + jn.maxH * 0.5, jn.z);
      colMesh.castShadow = true;
      colMesh.receiveShadow = true;
      colMesh.userData = {
        archKind: 'corner-col',
        colX: jn.x,
        colZ: jn.z,
        baseY: jn.baseY,
        fullH: jn.maxH,
      };
      this.structuralGroup.add(colMesh);
    }

    // Multi-Story Onion-Skin Lower Floor Trace (subtle cyan guide on Lantai 2+ showing Lantai bawah walls!)
    if (activeFl && activeFl.elevation > 0.1) {
      const sortedFl = [...floors].sort((a, b) => a.elevation - b.elevation);
      const activeIdx = sortedFl.findIndex((f) => f.id === activeFl.id);
      const lowerFl = activeIdx > 0 ? sortedFl[activeIdx - 1] : null;
      if (lowerFl) {
        const lowerWalls = this.data.walls.filter(
          (w) => w.floorId === lowerFl.id
        );
        if (lowerWalls.length > 0) {
          const tracePts: THREE.Vector3[] = [];
          const traceY = activeFl.elevation + 0.018;
          for (const lw of lowerWalls) {
            tracePts.push(new THREE.Vector3(lw.start.x, traceY, lw.start.z));
            tracePts.push(new THREE.Vector3(lw.end.x, traceY, lw.end.z));
          }
          const traceGeo = new THREE.BufferGeometry().setFromPoints(tracePts);
          const traceMat = new THREE.LineBasicMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.34,
            depthTest: false,
          });
          const traceSegs = new THREE.LineSegments(traceGeo, traceMat);
          traceSegs.raycast = () => {};
          this.labelsGroup.add(traceSegs);
        }
      }
    }

    // 4. Build Parametric Stairs (+ Upper Floor Safety Guardrail around cutout)
    for (const stair of this.data.stairs) {
      const fStyle = resolveFloorDrawStyle(stair.floorId);
      if (!fStyle.visible) continue;
      const isSel =
        this.selection?.kind === 'stair' && this.selection.id === stair.id;
      const sGrp = buildStaircaseGroup(stair, isSel);
      this.structuralGroup.add(sGrp);
    }

    // 5. Build Parametric Smart Roofs (hidden in 2D Blueprint so rooms stay clearly visible!)
    if (!this.isBlueprint2D) {
      for (const roof of this.data.roofs) {
        const fStyle = resolveFloorDrawStyle(roof.floorId);
        if (!fStyle.visible) continue;
        const isSel =
          this.selection?.kind === 'roof' && this.selection.id === roof.id;
        const rGrp = buildParametricRoofGroup(roof, isSel);
        this.structuralGroup.add(rGrp);
      }
    }

    return allRooms;
  }

  /**
   * #8 Sims / Architect Life Interior Peek Cutaway:
   * Hides Smart Roofs and lowers camera-blocking Smart Walls to a crisp 32cm cutaway plinth!
   */
  public applyInteriorPeekCutaway(
    cameraPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    enabled: boolean
  ): void {
    const camDistXZ = Math.hypot(
      cameraPos.x - targetPos.x,
      cameraPos.z - targetPos.z
    );
    const toTargetXZ = new THREE.Vector2(
      targetPos.x - cameraPos.x,
      targetPos.z - cameraPos.z
    );
    if (toTargetXZ.lengthSq() > 1e-5) toTargetXZ.normalize();

    for (const child of this.structuralGroup.children) {
      const kind = child.userData?.archKind as string | undefined;

      if (kind === 'roof') {
        child.visible = !enabled;
        continue;
      }

      if (kind === 'wall') {
        const mx = (child.userData.wallMidX as number | undefined) ?? 0;
        const mz = (child.userData.wallMidZ as number | undefined) ?? 0;
        const fullH = (child.userData.fullH as number | undefined) ?? 3.0;
        const dWallXZ = Math.hypot(mx - cameraPos.x, mz - cameraPos.z);
        const toWallXZ = new THREE.Vector2(mx - cameraPos.x, mz - cameraPos.z);
        const dot =
          toWallXZ.lengthSq() > 1e-5
            ? toWallXZ.clone().normalize().dot(toTargetXZ)
            : 0;

        const shouldCut =
          enabled &&
          !this.isBlueprint2D &&
          dWallXZ < camDistXZ + 0.35 &&
          dot > 0.32;

        const cutRatio = shouldCut
          ? Math.min(1, 0.32 / Math.max(0.4, fullH))
          : 1;

        for (const sub of child.children) {
          // wallHolder for straight walls sits at local y = baseY!
          if (sub.type === 'Group') {
            sub.scale.y = cutRatio;
            for (const opChild of sub.children) {
              if (opChild.type === 'Group') {
                // Opening assembly: hide tall 3D frame/leaf when cutaway, keep floor swing arc!
                for (const piece of opChild.children) {
                  if (piece.name !== '__doorSwingArc') {
                    piece.visible = !shouldCut;
                  }
                }
              }
            }
          }
        }
        continue;
      }

      if (kind === 'corner-col') {
        const cx = (child.userData.colX as number | undefined) ?? 0;
        const cz = (child.userData.colZ as number | undefined) ?? 0;
        const baseY = (child.userData.baseY as number | undefined) ?? 0;
        const fullH = (child.userData.fullH as number | undefined) ?? 3.0;
        const dColXZ = Math.hypot(cx - cameraPos.x, cz - cameraPos.z);
        const toColXZ = new THREE.Vector2(cx - cameraPos.x, cz - cameraPos.z);
        const dot =
          toColXZ.lengthSq() > 1e-5
            ? toColXZ.clone().normalize().dot(toTargetXZ)
            : 0;
        const shouldCut =
          enabled &&
          !this.isBlueprint2D &&
          dColXZ < camDistXZ + 0.35 &&
          dot > 0.32;
        const ratio = shouldCut ? Math.min(1, 0.32 / Math.max(0.4, fullH)) : 1;
        child.scale.y = ratio;
        child.position.y = baseY + fullH * ratio * 0.5;
      }
    }
  }

  private buildSingleWallWithCutouts(
    wall: ArchWallSegment,
    baseY: number,
    ghost: boolean,
    isSelected: boolean
  ): THREE.Group {
    const grp = new THREE.Group();
    grp.userData = { archKind: 'wall', archId: wall.id, floorId: wall.floorId };

    const emissiveCol = isSelected
      ? new THREE.Color('#2563eb')
      : new THREE.Color('#000000');
    const emissiveInt = isSelected ? 0.22 : 0;

    const LTotal = Math.max(0.5, computeWallLength(wall));
    const extMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(wall.exteriorColor),
      roughness: wall.roughness,
      metalness: 0.04,
      transparent: ghost,
      opacity: ghost ? 0.22 : 1,
      emissive: emissiveCol,
      emissiveIntensity: emissiveInt,
    });
    if (!ghost && wall.exteriorPattern && wall.exteriorPattern !== 'none') {
      applyProceduralPatternToMaterial(
        extMat,
        wall.exteriorPattern,
        Math.max(1, LTotal * 0.7),
        Math.max(1, wall.height * 0.7)
      );
    }

    const intMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(wall.interiorColor),
      roughness: wall.roughness,
      metalness: 0.03,
      transparent: ghost,
      opacity: ghost ? 0.22 : 1,
      emissive: emissiveCol,
      emissiveIntensity: emissiveInt,
    });
    if (!ghost && wall.interiorPattern && wall.interiorPattern !== 'none') {
      applyProceduralPatternToMaterial(
        intMat,
        wall.interiorPattern,
        Math.max(1, LTotal * 0.7),
        Math.max(1, wall.height * 0.7)
      );
    }
    const trimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e2e8f0'),
      roughness: 0.72,
      metalness: 0.05,
      transparent: ghost,
      opacity: ghost ? 0.22 : 1,
      emissive: emissiveCol,
      emissiveIntensity: emissiveInt * 0.6,
    });

    // BoxGeometry material order: [+X, -X, +Y, -Y, +Z (Exterior), -Z (Interior)]
    const dualMaterials = [trimMat, trimMat, trimMat, trimMat, extMat, intMat];

    // Special Balcony Railing Mode
    if (wall.style === 'railing') {
      const totalLen = computeWallLength(wall);
      const subSteps = Math.abs(wall.curveBulge) >= 0.04 ? 12 : 1;
      const railH = Math.max(0.85, wall.height);
      const glassMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#bae6fd'),
        roughness: 0.1,
        metalness: 0.15,
        transparent: true,
        opacity: ghost ? 0.12 : 0.34,
        depthWrite: false,
      });
      const metalMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#334155'),
        roughness: 0.32,
        metalness: 0.72,
        emissive: emissiveCol,
        emissiveIntensity: emissiveInt,
      });

      for (let i = 0; i < subSteps; i++) {
        const p0 = sampleWallCurvePoint(wall, i / subSteps);
        const p1 = sampleWallCurvePoint(wall, (i + 1) / subSteps);
        const segLen = Math.hypot(p1.x - p0.x, p1.z - p0.z);
        if (segLen < 0.02) continue;
        const yaw = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
        const mx = (p0.x + p1.x) * 0.5;
        const mz = (p0.z + p1.z) * 0.5;

        const segHolder = new THREE.Group();
        segHolder.position.set(mx, baseY, mz);
        segHolder.rotation.y = yaw;

        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(segLen + 0.01, 0.12, wall.thickness),
          trimMat
        );
        curb.position.y = 0.06;
        curb.userData = { archKind: 'wall', archId: wall.id };
        segHolder.add(curb);

        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.05, segLen - 0.04), railH - 0.2, 0.02),
          glassMat
        );
        glass.position.y = 0.12 + (railH - 0.2) * 0.5;
        glass.userData = { archKind: 'wall', archId: wall.id };
        segHolder.add(glass);

        const topBar = new THREE.Mesh(
          new THREE.BoxGeometry(segLen + 0.02, 0.05, 0.07),
          metalMat
        );
        topBar.position.y = railH - 0.025;
        topBar.castShadow = true;
        topBar.userData = { archKind: 'wall', archId: wall.id };
        segHolder.add(topBar);

        grp.add(segHolder);
      }

      const postCount = Math.max(2, Math.round(totalLen / 1.2) + 1);
      for (let k = 0; k < postCount; k++) {
        const pt = sampleWallCurvePoint(wall, k / (postCount - 1));
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, railH, 0.055),
          metalMat
        );
        post.position.set(pt.x, baseY + railH * 0.5, pt.z);
        post.castShadow = true;
        post.userData = { archKind: 'wall', archId: wall.id };
        grp.add(post);
      }
      return grp;
    }

    // Curved Wall Path (with live opening support along arc parameter t!)
    if (Math.abs(wall.curveBulge) >= 0.04) {
      const arcSteps = 16;
      const totalLen = computeWallLength(wall);
      const wallOps = this.data.openings.filter((o) => o.wallId === wall.id);
      const curvedHolder = new THREE.Group();
      curvedHolder.position.set(0, baseY, 0);
      grp.add(curvedHolder);

      for (let i = 0; i < arcSteps; i++) {
        const t0 = i / arcSteps;
        const t1 = (i + 1) / arcSteps;
        const tMid = (t0 + t1) * 0.5;
        const sMid = tMid * totalLen;

        const p0 = sampleWallCurvePoint(wall, t0);
        const p1 = sampleWallCurvePoint(wall, t1);
        const segLen = Math.hypot(p1.x - p0.x, p1.z - p0.z) + wall.thickness * 0.16;
        const yaw = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
        const mx = (p0.x + p1.x) * 0.5;
        const mz = (p0.z + p1.z) * 0.5;

        // Check if an opening overlaps this arc slice
        const hitOp = wallOps.find(
          (op) => Math.abs(sMid - op.offsetRatio * totalLen) < op.width * 0.5
        );

        const addArcSlice = (yBottom: number, yTop: number) => {
          const hSlice = yTop - yBottom;
          if (hSlice < 0.03) return;
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(segLen, hSlice, wall.thickness),
            dualMaterials
          );
          m.position.set(mx, yBottom + hSlice * 0.5, mz);
          m.rotation.y = yaw;
          m.castShadow = true;
          m.receiveShadow = true;
          m.userData = {
            archKind: 'wall',
            archId: wall.id,
            hasDualWallFaces: true,
          };
          curvedHolder.add(m);
        };

        if (!hitOp) {
          addArcSlice(0, wall.height);
        } else {
          if (hitOp.sillHeight > 0.03) addArcSlice(0, hitOp.sillHeight);
          const topOpen = hitOp.sillHeight + hitOp.height;
          if (topOpen < wall.height - 0.03) addArcSlice(topOpen, wall.height);
        }
      }

      for (const op of wallOps) {
        const pt = sampleWallCurvePoint(wall, op.offsetRatio);
        const isOpSel =
          this.selection?.kind === 'opening' && this.selection.id === op.id;
        const opGrp = buildOpeningAssembly(op, wall.thickness, isOpSel);
        opGrp.position.set(pt.x, op.sillHeight, pt.z);
        opGrp.rotation.y = -Math.atan2(pt.tz, pt.tx);
        curvedHolder.add(opGrp);
      }

      return grp;
    }

    // Straight Wall with Exact Live Boolean Cutouts
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const L = Math.max(0.15, Math.hypot(dx, dz));
    const yaw = -Math.atan2(dz, dx);

    const wallHolder = new THREE.Group();
    wallHolder.position.set(wall.start.x, baseY, wall.start.z);
    wallHolder.rotation.y = yaw;
    grp.add(wallHolder);

    const ops = this.data.openings
      .filter((o) => o.wallId === wall.id)
      .map((op) => {
        const half = op.width * 0.5;
        const centerS = Math.max(
          half + 0.05,
          Math.min(L - half - 0.05, op.offsetRatio * L)
        );
        return {
          op,
          s0: Math.max(0.04, centerS - half),
          s1: Math.min(L - 0.04, centerS + half),
          centerS,
        };
      })
      .sort((a, b) => a.s0 - b.s0);

    const addSpanBox = (s0: number, s1: number, y0: number, y1: number) => {
      const spanW = s1 - s0;
      const spanH = y1 - y0;
      if (spanW < 0.02 || spanH < 0.02) return;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(spanW, spanH, wall.thickness),
        dualMaterials
      );
      box.position.set((s0 + s1) * 0.5, (y0 + y1) * 0.5, 0);
      box.castShadow = true;
      box.receiveShadow = true;
      box.userData = {
        archKind: 'wall',
        archId: wall.id,
        hasDualWallFaces: true,
      };
      wallHolder.add(box);

      // Optional Baseboard Skirting along full-ground spans
      if (wall.hasBaseboard && y0 <= 0.01 && !ghost) {
        const bb = new THREE.Mesh(
          new THREE.BoxGeometry(spanW, 0.085, wall.thickness + 0.022),
          trimMat
        );
        bb.position.set((s0 + s1) * 0.5, 0.0425, 0);
        bb.userData = { archKind: 'wall', archId: wall.id };
        wallHolder.add(bb);
      }
    };

    let cursor = 0;
    for (const item of ops) {
      if (item.s0 > cursor + 0.02) {
        addSpanBox(cursor, item.s0, 0, wall.height);
      }
      // Sill below window
      if (item.op.sillHeight > 0.02) {
        addSpanBox(item.s0, item.s1, 0, item.op.sillHeight);
      }
      // Header lintel above door/window
      const topY = item.op.sillHeight + item.op.height;
      if (topY < wall.height - 0.02) {
        addSpanBox(item.s0, item.s1, topY, wall.height);
      }

      // Mount 3D Door / Window / Archway inside the cutout!
      const isOpSel =
        this.selection?.kind === 'opening' && this.selection.id === item.op.id;
      const opMeshGrp = buildOpeningAssembly(item.op, wall.thickness, isOpSel);
      opMeshGrp.position.set(item.centerS, item.op.sillHeight, 0);
      wallHolder.add(opMeshGrp);

      cursor = Math.max(cursor, item.s1);
    }

    if (cursor < L - 0.02) {
      addSpanBox(cursor, L, 0, wall.height);
    }

    // Half-wall stone/wood top coping ledge
    if (wall.style === 'half') {
      const coping = new THREE.Mesh(
        new THREE.BoxGeometry(L + 0.02, 0.04, wall.thickness + 0.05),
        trimMat
      );
      coping.position.set(L * 0.5, wall.height + 0.02, 0);
      coping.castShadow = true;
      coping.userData = { archKind: 'wall', archId: wall.id };
      wallHolder.add(coping);
    }

    return grp;
  }

  /**
   * Live Ghost Preview while Drawing a Wall or Hovering an Opening on a Wall
   */
  public updateWallDrawPreview(
    start: Vec2XZ | null,
    end: Vec2XZ | null,
    baseY: number,
    defaults: WallDrawDefaults,
    hoverPoint: Vec2XZ | null,
    guideLines?: Array<{ from: Vec2XZ; to: Vec2XZ }>
  ): void {
    disposeObjectTree(this.previewGroup);
    this.previewGroup.clear();

    if (guideLines && guideLines.length > 0) {
      const gPts: THREE.Vector3[] = [];
      for (const gl of guideLines) {
        gPts.push(new THREE.Vector3(gl.from.x, baseY + 0.04, gl.from.z));
        gPts.push(new THREE.Vector3(gl.to.x, baseY + 0.04, gl.to.z));
      }
      const gLine = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(gPts),
        new THREE.LineBasicMaterial({
          color: '#34d399',
          transparent: true,
          opacity: 0.85,
          depthTest: false,
        })
      );
      gLine.renderOrder = 25;
      gLine.raycast = () => {};
      this.previewGroup.add(gLine);
    }

    if (hoverPoint) {
      const ringGeo = new THREE.RingGeometry(0.11, 0.17, 24);
      ringGeo.rotateX(-Math.PI * 0.5);
      const ringMat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(hoverPoint.x, baseY + 0.03, hoverPoint.z);
      ring.raycast = () => {};
      this.previewGroup.add(ring);
    }

    if (!start || !end) return;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.08) return;

    const previewWall: ArchWallSegment = {
      id: '__preview',
      floorId: '__preview',
      start,
      end,
      height:
        defaults.style === 'half'
          ? Math.min(defaults.height, 1.1)
          : defaults.style === 'railing'
          ? 1.0
          : defaults.height,
      thickness: defaults.thickness,
      style: defaults.style,
      curveBulge: defaults.curveBulge,
      exteriorColor: '#38bdf8',
      interiorColor: '#38bdf8',
      roughness: 0.5,
      hasBaseboard: false,
    };

    const steps = Math.abs(defaults.curveBulge) >= 0.04 ? 14 : 1;
    const ghostMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    for (let i = 0; i < steps; i++) {
      const p0 = sampleWallCurvePoint(previewWall, i / steps);
      const p1 = sampleWallCurvePoint(previewWall, (i + 1) / steps);
      const sLen = Math.hypot(p1.x - p0.x, p1.z - p0.z);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(sLen, previewWall.height, previewWall.thickness),
        ghostMat
      );
      box.position.set(
        (p0.x + p1.x) * 0.5,
        baseY + previewWall.height * 0.5,
        (p0.z + p1.z) * 0.5
      );
      box.rotation.y = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
      box.raycast = () => {};
      this.previewGroup.add(box);
    }

    const trueLen = computeWallLength(previewWall);
    const mid = sampleWallCurvePoint(previewWall, 0.5);
    const badge = makeLabelSprite(
      `${trueLen.toFixed(2)} m`,
      `H ${previewWall.height.toFixed(1)}m · T ${(previewWall.thickness * 100).toFixed(0)}cm`,
      {
        bg: 'rgba(12, 74, 110, 0.92)',
        border: '#38bdf8',
        scale: 1.0,
      }
    );
    badge.position.set(mid.x, baseY + previewWall.height + 0.45, mid.z);
    this.previewGroup.add(badge);
  }

  /**
   * Live Ghost Preview for 1-Drag Room Box (`W × D m · Area m²`)
   */
  public updateRoomBoxPreview(
    cornerA: Vec2XZ | null,
    cornerB: Vec2XZ | null,
    baseY: number,
    defaults: WallDrawDefaults,
    hoverPoint: Vec2XZ | null
  ): void {
    disposeObjectTree(this.previewGroup);
    this.previewGroup.clear();

    if (hoverPoint && (!cornerA || !cornerB)) {
      const ringGeo = new THREE.RingGeometry(0.11, 0.17, 24);
      ringGeo.rotateX(-Math.PI * 0.5);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: '#34d399',
          transparent: true,
          opacity: 0.9,
          depthTest: false,
        })
      );
      ring.position.set(hoverPoint.x, baseY + 0.03, hoverPoint.z);
      ring.raycast = () => {};
      this.previewGroup.add(ring);
    }

    if (!cornerA || !cornerB) return;
    const minX = Math.min(cornerA.x, cornerB.x);
    const maxX = Math.max(cornerA.x, cornerB.x);
    const minZ = Math.min(cornerA.z, cornerB.z);
    const maxZ = Math.max(cornerA.z, cornerB.z);
    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    if (spanX < 0.2 || spanZ < 0.2) return;

    const h =
      defaults.style === 'half'
        ? Math.min(defaults.height, 1.1)
        : defaults.style === 'railing'
        ? 1.0
        : defaults.height;
    const t = defaults.thickness;
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;

    const ghostMat = new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    const floorGhost = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX, spanZ),
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    floorGhost.rotation.x = -Math.PI * 0.5;
    floorGhost.position.set(cx, baseY + 0.025, cz);
    floorGhost.raycast = () => {};
    this.previewGroup.add(floorGhost);

    const segs: Array<[number, number, number, number, number]> = [
      [spanX, h, t, cx, minZ],
      [spanX, h, t, cx, maxZ],
      [t, h, spanZ, minX, cz],
      [t, h, spanZ, maxX, cz],
    ];
    for (const [sx, sy, sz, px, pz] of segs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), ghostMat);
      m.position.set(px, baseY + sy * 0.5, pz);
      m.raycast = () => {};
      this.previewGroup.add(m);
    }

    const area = spanX * spanZ;
    const badge = makeLabelSprite(
      `${spanX.toFixed(2)} × ${spanZ.toFixed(2)} m`,
      `${area.toFixed(1)} m²`,
      {
        bg: 'rgba(6, 78, 59, 0.92)',
        border: '#34d399',
        subColor: '#a7f3d0',
      }
    );
    badge.position.set(cx, baseY + h + 0.45, cz);
    this.previewGroup.add(badge);
  }

  /**
   * #12 Live Adjacent Wall Length Labels shown while dragging a Corner Node!
   */
  public updateCornerDragDimensions(
    floorId: string,
    nodeXZ: Vec2XZ,
    baseY: number
  ): void {
    disposeObjectTree(this.previewGroup);
    this.previewGroup.clear();

    for (const w of this.data.walls) {
      if (w.floorId !== floorId) continue;
      const hitStart = Math.hypot(w.start.x - nodeXZ.x, w.start.z - nodeXZ.z) < 0.1;
      const hitEnd = Math.hypot(w.end.x - nodeXZ.x, w.end.z - nodeXZ.z) < 0.1;
      if (!hitStart && !hitEnd) continue;

      const len = computeWallLength(w);
      const mid = sampleWallCurvePoint(w, 0.5);
      const badge = makeLabelSprite(`${len.toFixed(2)} m`, undefined, {
        bg: 'rgba(12, 74, 110, 0.94)',
        border: '#38bdf8',
        scale: 0.88,
      });
      badge.position.set(mid.x, baseY + w.height + 0.32, mid.z);
      this.previewGroup.add(badge);
    }
  }

  public updateOpeningHoverPreview(
    wall: ArchWallSegment | null,
    offsetRatio: number,
    kind: ArchOpeningKind,
    baseY: number
  ): void {
    disposeObjectTree(this.previewGroup);
    this.previewGroup.clear();
    if (!wall) return;

    const preset = OPENING_PRESETS[kind];
    const pt = sampleWallCurvePoint(wall, offsetRatio);
    const yaw = -Math.atan2(pt.tz, pt.tx);

    const ghost = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.min(preset.width, computeWallLength(wall) - 0.2),
        Math.min(preset.height, wall.height - 0.1),
        wall.thickness + 0.08
      ),
      new THREE.MeshBasicMaterial({
        color: '#34d399',
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      })
    );
    ghost.position.set(
      pt.x,
      baseY + preset.sillHeight + preset.height * 0.5,
      pt.z
    );
    ghost.rotation.y = yaw;
    ghost.raycast = () => {};
    this.previewGroup.add(ghost);

    // Live 2D Door Swing Arc Preview while sliding/placing a door!
    if (kind.startsWith('door')) {
      const effW = Math.min(preset.width, computeWallLength(wall) - 0.2);
      const arcHolder = new THREE.Group();
      arcHolder.position.set(pt.x, baseY + 0.04, pt.z);
      arcHolder.rotation.y = yaw;

      const pts: THREE.Vector3[] = [];
      const radius = kind === 'door-double' ? effW * 0.5 : effW;
      const hingeX = -effW * 0.5;
      pts.push(new THREE.Vector3(hingeX, 0, 0));
      for (let i = 0; i <= 16; i++) {
        const ang = (i / 16) * (Math.PI * 0.48);
        pts.push(
          new THREE.Vector3(
            hingeX + Math.cos(ang) * radius,
            0,
            -Math.sin(ang) * radius
          )
        );
      }
      const arcLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: '#34d399',
          depthTest: false,
        })
      );
      arcLine.renderOrder = 25;
      arcLine.raycast = () => {};
      arcHolder.add(arcLine);
      this.previewGroup.add(arcHolder);
    }
  }

  public clearPreview(): void {
    disposeObjectTree(this.previewGroup);
    this.previewGroup.clear();
  }

  /**
   * Laser Tape Measure Visualizer (`Meteran`)
   */
  public updateMeasureOverlay(p1: THREE.Vector3 | null, p2: THREE.Vector3 | null): void {
    disposeObjectTree(this.measureGroup);
    this.measureGroup.clear();
    if (!p1) return;

    const dotGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({
      color: '#facc15',
      depthTest: false,
    });
    const d1 = new THREE.Mesh(dotGeo, dotMat);
    d1.position.copy(p1);
    d1.raycast = () => {};
    this.measureGroup.add(d1);

    if (!p2) return;
    const d2 = new THREE.Mesh(dotGeo.clone(), dotMat.clone());
    d2.position.copy(p2);
    d2.raycast = () => {};
    this.measureGroup.add(d2);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMat = new THREE.LineBasicMaterial({
      color: '#facc15',
      depthTest: false,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    line.renderOrder = 24;
    line.raycast = () => {};
    this.measureGroup.add(line);

    const dist = p1.distanceTo(p2);
    const dx = Math.abs(p2.x - p1.x);
    const dz = Math.abs(p2.z - p1.z);
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    const badge = makeLabelSprite(
      `${dist.toFixed(2)} m`,
      `ΔX ${dx.toFixed(2)}m · ΔZ ${dz.toFixed(2)}m`,
      {
        bg: 'rgba(66, 32, 6, 0.92)',
        border: '#facc15',
        titleColor: '#fef08a',
        subColor: '#fde047',
      }
    );
    badge.position.set(mid.x, mid.y + 0.35, mid.z);
    this.measureGroup.add(badge);
  }

  public dispose(): void {
    disposeObjectTree(this.structuralGroup);
    this.structuralGroup.clear();
    disposeObjectTree(this.overlayGroup);
    this.overlayGroup.clear();
  }
}
