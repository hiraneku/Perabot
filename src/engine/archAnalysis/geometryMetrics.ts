import {
  ArchDetectedRoom,
  ArchHouseData,
  ArchOpeningItem,
  ArchRoofItem,
  ArchWallSegment,
  BuildingFloorLayer,
  RoomSemanticType,
  SceneObjectData,
  SitePlanningData,
  Vec2XZ,
} from '../../types/studio';

const DEG2RAD = Math.PI / 180;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Resolves a semantic room type from explicit user metadata first, or from unambiguous
 * localized room preset names (`ID` / `EN` / `JA`). Never guesses from polygon geometry!
 */
export function resolveSemanticRoomType(
  explicitType: RoomSemanticType | undefined,
  roomName: string
): { roomType: RoomSemanticType; explicit: boolean } {
  if (explicitType && explicitType !== 'unassigned') {
    return { roomType: explicitType, explicit: true };
  }
  const n = roomName.trim().toLowerCase();
  if (!n) return { roomType: 'unassigned', explicit: false };

  if (
    /\b(kamar tidur|bedroom|bed room|master bed)\b/i.test(n) ||
    n.includes('寝室')
  ) {
    return { roomType: 'bedroom', explicit: false };
  }
  if (
    /\b(kamar mandi|bathroom|toilet|wc|restroom|lavatory)\b/i.test(n) ||
    n.includes('浴室') ||
    n.includes('トイレ')
  ) {
    return { roomType: 'bathroom', explicit: false };
  }
  if (/\b(dapur|kitchen|pantry)\b/i.test(n) || n.includes('キッチン') || n.includes('台所')) {
    return { roomType: 'kitchen', explicit: false };
  }
  if (
    /\b(r\.?\s*keluarga|ruang keluarga|ruang tamu|living|lounge|family room)\b/i.test(
      n
    ) ||
    n.includes('リビング') ||
    n.includes('居間')
  ) {
    return { roomType: 'living', explicit: false };
  }
  if (
    /\b(ruang makan|r\.?\s*makan|dining)\b/i.test(n) ||
    n.includes('ダイニング')
  ) {
    return { roomType: 'dining', explicit: false };
  }
  if (
    /\b(r\.?\s*kerja|ruang kerja|kerja|study|office|workspace)\b/i.test(n) ||
    n.includes('書斎')
  ) {
    return { roomType: 'study', explicit: false };
  }
  if (
    /\b(garasi|carport|garage)\b/i.test(n) ||
    n.includes('ガレージ') ||
    n.includes('車庫')
  ) {
    return { roomType: 'garage', explicit: false };
  }
  if (
    /\b(teras|balkon|patio|terrace|balcony|veranda|porch)\b/i.test(n) ||
    n.includes('テラス') ||
    n.includes('バルコニー')
  ) {
    return { roomType: 'terrace', explicit: false };
  }
  if (
    /\b(gudang|storage|laundry|utility)\b/i.test(n) ||
    n.includes('倉庫') ||
    n.includes('収納')
  ) {
    return { roomType: 'storage', explicit: false };
  }

  return { roomType: 'unassigned', explicit: false };
}

/**
 * Pure arc/chord wall centerline length in meters (handles straight & quadratic-curved walls).
 */
export function calcWallCenterlineLength(wall: ArchWallSegment): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const chord = Math.hypot(dx, dz);
  if (Math.abs(wall.curveBulge) < 0.04 || chord < 1e-5) {
    return chord;
  }
  const nx = -dz / chord;
  const nz = dx / chord;
  const mx = (wall.start.x + wall.end.x) * 0.5 + nx * wall.curveBulge * 2;
  const mz = (wall.start.z + wall.end.z) * 0.5 + nz * wall.curveBulge * 2;

  const steps = 20;
  let total = 0;
  let px = wall.start.x;
  let pz = wall.start.z;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const omt = 1 - t;
    const x = omt * omt * wall.start.x + 2 * omt * t * mx + t * t * wall.end.x;
    const z = omt * omt * wall.start.z + 2 * omt * t * mz + t * t * wall.end.z;
    total += Math.hypot(x - px, z - pz);
    px = x;
    pz = z;
  }
  return total;
}

export interface WallQuantityMetrics {
  wallId: string;
  floorId: string;
  lengthM: number;
  grossAreaSqm: number;
  deductedOpeningAreaSqm: number;
  netSingleSideAreaSqm: number;
  netVolumeM3: number;
  isCurvedApproximation: boolean;
}

/**
 * Calculates exact wall surface area and volume, deducting ONLY openings hosted on this wall,
 * clamped to valid wall bounds and merged horizontally/vertically so overlapping openings are
 * NEVER deducted twice!
 */
export function computeSingleWallQuantities(
  wall: ArchWallSegment,
  allOpenings: ArchOpeningItem[]
): WallQuantityMetrics {
  const lengthM = Math.max(0, calcWallCenterlineLength(wall));
  const wallH =
    wall.style === 'half'
      ? Math.min(wall.height, 1.1)
      : wall.style === 'railing'
      ? Math.max(0.85, wall.height)
      : Math.max(0, wall.height);

  const grossAreaSqm = lengthM * wallH;
  const hostedOps = allOpenings.filter((o) => o.wallId === wall.id);

  // Build clamped 2D rectangles [s0, s1] x [y0, y1] along the wall face and compute exact union area
  // via 1D coordinate compression on horizontal intervals so overlapping openings are never subtracted twice!
  interface ClampedRect {
    s0: number;
    s1: number;
    y0: number;
    y1: number;
  }
  const rects: ClampedRect[] = [];
  for (const op of hostedOps) {
    if (lengthM <= 0.01 || wallH <= 0.01) continue;
    const centerS = op.offsetRatio * lengthM;
    const s0 = Math.max(0, Math.min(lengthM, centerS - op.width * 0.5));
    const s1 = Math.max(0, Math.min(lengthM, centerS + op.width * 0.5));
    const y0 = Math.max(0, Math.min(wallH, op.sillHeight));
    const y1 = Math.max(0, Math.min(wallH, op.sillHeight + op.height));
    if (s1 - s0 > 1e-4 && y1 - y0 > 1e-4) {
      rects.push({ s0, s1, y0, y1 });
    }
  }

  let deductedArea = 0;
  if (rects.length === 1) {
    const r = rects[0];
    deductedArea = (r.s1 - r.s0) * (r.y1 - r.y0);
  } else if (rects.length > 1) {
    const sCoords = Array.from(
      new Set(rects.flatMap((r) => [r.s0, r.s1]))
    ).sort((a, b) => a - b);

    for (let i = 0; i < sCoords.length - 1; i++) {
      const a = sCoords[i];
      const b = sCoords[i + 1];
      const sliceW = b - a;
      if (sliceW <= 1e-5) continue;
      const midS = (a + b) * 0.5;

      // Merge vertical [y0, y1] intervals covering this horizontal slice
      const yIntervals = rects
        .filter((r) => r.s0 <= midS && r.s1 >= midS)
        .map((r) => [r.y0, r.y1] as [number, number])
        .sort((u, v) => u[0] - v[0]);

      let mergedY = 0;
      let curStart = -1;
      let curEnd = -1;
      for (const [y0, y1] of yIntervals) {
        if (curStart < 0) {
          curStart = y0;
          curEnd = y1;
        } else if (y0 <= curEnd + 1e-5) {
          curEnd = Math.max(curEnd, y1);
        } else {
          mergedY += curEnd - curStart;
          curStart = y0;
          curEnd = y1;
        }
      }
      if (curStart >= 0) {
        mergedY += curEnd - curStart;
      }
      deductedArea += sliceW * mergedY;
    }
  }

  deductedArea = Math.min(grossAreaSqm, Math.max(0, deductedArea));
  const netSingleSideAreaSqm = Math.max(0, grossAreaSqm - deductedArea);
  const netVolumeM3 = netSingleSideAreaSqm * Math.max(0.02, wall.thickness);

  return {
    wallId: wall.id,
    floorId: wall.floorId,
    lengthM: round3(lengthM),
    grossAreaSqm: round3(grossAreaSqm),
    deductedOpeningAreaSqm: round3(deductedArea),
    netSingleSideAreaSqm: round3(netSingleSideAreaSqm),
    netVolumeM3: round3(netVolumeM3),
    isCurvedApproximation: Math.abs(wall.curveBulge) >= 0.04,
  };
}

export interface RoofQuantityMetrics {
  roofId: string;
  floorId: string;
  horizontalFootprintSqm: number;
  slopedSurfaceAreaSqm: number;
  gableEndWallAreaSqm: number;
  skylightDeductedSqm: number;
  ridgeRiseM: number;
}

/**
 * Computes exact 3D sloped surface area matching `buildParametricRoofGroup` in `ArchBuilderEngine.ts`
 * (never merely horizontal footprint for sloped gable, hip, or shed roofs!).
 */
export function computeSingleRoofQuantities(
  roof: ArchRoofItem
): RoofQuantityMetrics {
  const oh = Math.max(0, roof.overhang);
  const hx = Math.max(0.6, Math.max(0.2, roof.width) * 0.5 + oh);
  const hz = Math.max(0.6, Math.max(0.2, roof.depth) * 0.5 + oh);
  const fullW = hx * 2;
  const fullD = hz * 2;
  const horizontalFootprintSqm = fullW * fullD;

  const clampedPitch = Math.max(8, Math.min(58, roof.pitchDeg));
  const slopeSpan = roof.ridgeAxis === 'x' ? hz : hx;
  const rise =
    roof.style === 'flat'
      ? 0
      : Math.max(0.25, Math.tan(clampedPitch * DEG2RAD) * slopeSpan);

  let slopedArea = horizontalFootprintSqm;
  let gableEndArea = 0;

  if (roof.style === 'gable') {
    if (roof.ridgeAxis === 'x') {
      const rafterLen = Math.hypot(hz, rise);
      slopedArea = 2 * fullW * rafterLen;
      gableEndArea = 2 * (0.5 * fullD * rise);
    } else {
      const rafterLen = Math.hypot(hx, rise);
      slopedArea = 2 * fullD * rafterLen;
      gableEndArea = 2 * (0.5 * fullW * rise);
    }
  } else if (roof.style === 'hip') {
    if (hx >= hz) {
      const ridgeHalf = Math.max(0, hx - hz);
      const mainSlant = Math.hypot(hz, rise);
      const hipSlant = Math.hypot(hx - ridgeHalf, rise);
      const twoTrapezoids = 2 * ((fullW + ridgeHalf * 2) * 0.5) * mainSlant;
      const twoEndTris = 2 * (0.5 * fullD * hipSlant);
      slopedArea = twoTrapezoids + twoEndTris;
    } else {
      const ridgeHalf = Math.max(0, hz - hx);
      const mainSlant = Math.hypot(hx, rise);
      const hipSlant = Math.hypot(hz - ridgeHalf, rise);
      const twoTrapezoids = 2 * ((fullD + ridgeHalf * 2) * 0.5) * mainSlant;
      const twoEndTris = 2 * (0.5 * fullW * hipSlant);
      slopedArea = twoTrapezoids + twoEndTris;
    }
  } else if (roof.style === 'shed') {
    const hHigh = Math.max(0.35, rise * 0.85);
    const monoSlant = Math.hypot(fullD, hHigh);
    slopedArea = fullW * monoSlant;
    gableEndArea = 2 * (0.5 * fullD * hHigh) + fullW * hHigh;
  }

  let skylightDeductedSqm = 0;
  if (roof.hasSkylight) {
    const sw = Math.min(hx * 1.35, Math.max(0.8, roof.skylightWidth ?? 1.8));
    const sd = Math.min(hz * 1.35, Math.max(0.8, roof.skylightDepth ?? 1.4));
    skylightDeductedSqm = Math.min(slopedArea * 0.65, sw * sd);
    slopedArea = Math.max(0, slopedArea - skylightDeductedSqm);
  }

  return {
    roofId: roof.id,
    floorId: roof.floorId,
    horizontalFootprintSqm: round3(horizontalFootprintSqm),
    slopedSurfaceAreaSqm: round3(slopedArea),
    gableEndWallAreaSqm: round3(gableEndArea),
    skylightDeductedSqm: round3(skylightDeductedSqm),
    ridgeRiseM: round3(rise),
  };
}

export interface BuildingFootprintEnvelope {
  hasBuilding: boolean;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  spanX: number;
  spanZ: number;
  center: Vec2XZ;
  footprintAreaSqm: number;
}

export interface SitePlacementMetrics {
  siteEnabled: boolean;
  siteAreaSqm: number;
  footprint: BuildingFootprintEnvelope;
  remainingSiteAreaSqm: number | null;
  /** Signed distances from building footprint outer edge to site boundary (positive = inside site, negative = outside/crossing!) */
  distancesToBoundary: {
    front: number | null; // to +Z site edge
    rear: number | null; // to -Z site edge
    left: number | null; // to -X site edge
    right: number | null; // to +X site edge
  };
  withinSiteBoundary: boolean;
  setbacksSatisfied: {
    front: boolean;
    rear: boolean;
    left: boolean;
    right: boolean;
    all: boolean;
  };
}

/**
 * Computes the building footprint envelope in World XZ meters and compares it against the
 * rectangular Site Definition (`+Z = Front`, `-Z = Rear`, `-X = Left`, `+X = Right`).
 */
export function computeSitePlacementMetrics(
  archData: ArchHouseData,
  objects: SceneObjectData[],
  detectedRooms: ArchDetectedRoom[],
  siteInput?: SitePlanningData
): SitePlacementMetrics {
  const site = siteInput ?? archData.site;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  const expandPt = (x: number, z: number, pad = 0) => {
    minX = Math.min(minX, x - pad);
    maxX = Math.max(maxX, x + pad);
    minZ = Math.min(minZ, z - pad);
    maxZ = Math.max(maxZ, z + pad);
  };

  for (const w of archData.walls) {
    const halfT = w.thickness * 0.5;
    expandPt(w.start.x, w.start.z, halfT);
    expandPt(w.end.x, w.end.z, halfT);
    if (Math.abs(w.curveBulge) >= 0.04) {
      const dx = w.end.x - w.start.x;
      const dz = w.end.z - w.start.z;
      const len = Math.max(0.01, Math.hypot(dx, dz));
      const nx = -dz / len;
      const nz = dx / len;
      expandPt(
        (w.start.x + w.end.x) * 0.5 + nx * w.curveBulge,
        (w.start.z + w.end.z) * 0.5 + nz * w.curveBulge,
        halfT
      );
    }
  }

  for (const st of archData.stairs) {
    const hw = st.width * 0.5;
    const hl = st.runLength * 0.5;
    const r = Math.max(hw, hl);
    expandPt(st.position.x, st.position.z, r);
  }

  // Include structural modular objects (`floor` / `wall` roles, e.g. stone foundations, decks, pillars)
  for (const obj of objects) {
    if (!obj.visible) continue;
    if (obj.archRole === 'floor' || obj.archRole === 'wall') {
      expandPt(obj.position.x, obj.position.z);
      minX = Math.min(minX, obj.position.x - Math.abs(obj.scale.x) * 0.5);
      maxX = Math.max(maxX, obj.position.x + Math.abs(obj.scale.x) * 0.5);
      minZ = Math.min(minZ, obj.position.z - Math.abs(obj.scale.z) * 0.5);
      maxZ = Math.max(maxZ, obj.position.z + Math.abs(obj.scale.z) * 0.5);
    }
  }

  const hasBuilding = Number.isFinite(minX) && Number.isFinite(maxX);

  // Ground-floor room union area if enclosed rooms exist on lowest floor, otherwise bounding envelope area
  let footprintAreaSqm = 0;
  if (hasBuilding) {
    const spanX = Math.max(0, maxX - minX);
    const spanZ = Math.max(0, maxZ - minZ);
    const groundFloorRooms = filterLowestFloorRooms(detectedRooms);
    const groundRoomSum = groundFloorRooms.reduce((s, r) => s + r.areaSqm, 0);
    // Bounding envelope area represents outer building footprint; use max of ground rooms and wall-enclosed envelope when walls form a closed hull
    footprintAreaSqm =
      groundRoomSum > 0
        ? round3(Math.min(spanX * spanZ, Math.max(groundRoomSum, spanX * spanZ)))
        : round3(spanX * spanZ);
  }

  const footprint: BuildingFootprintEnvelope = hasBuilding
    ? {
        hasBuilding: true,
        minX: round3(minX),
        maxX: round3(maxX),
        minZ: round3(minZ),
        maxZ: round3(maxZ),
        spanX: round3(maxX - minX),
        spanZ: round3(maxZ - minZ),
        center: {
          x: round3((minX + maxX) * 0.5),
          z: round3((minZ + maxZ) * 0.5),
        },
        footprintAreaSqm,
      }
    : {
        hasBuilding: false,
        minX: 0,
        maxX: 0,
        minZ: 0,
        maxZ: 0,
        spanX: 0,
        spanZ: 0,
        center: { x: 0, z: 0 },
        footprintAreaSqm: 0,
      };

  if (!site || !site.enabled) {
    return {
      siteEnabled: false,
      siteAreaSqm: site ? round3(Math.max(1, site.width) * Math.max(1, site.depth)) : 0,
      footprint,
      remainingSiteAreaSqm: null,
      distancesToBoundary: {
        front: null,
        rear: null,
        left: null,
        right: null,
      },
      withinSiteBoundary: true,
      setbacksSatisfied: {
        front: true,
        rear: true,
        left: true,
        right: true,
        all: true,
      },
    };
  }

  const sw = Math.max(1, site.width);
  const sd = Math.max(1, site.depth);
  const siteAreaSqm = round3(sw * sd);
  const siteMinX = site.center.x - sw * 0.5;
  const siteMaxX = site.center.x + sw * 0.5;
  const siteMinZ = site.center.z - sd * 0.5; // Rear (-Z)
  const siteMaxZ = site.center.z + sd * 0.5; // Front (+Z)

  if (!hasBuilding) {
    return {
      siteEnabled: true,
      siteAreaSqm,
      footprint,
      remainingSiteAreaSqm: siteAreaSqm,
      distancesToBoundary: {
        front: null,
        rear: null,
        left: null,
        right: null,
      },
      withinSiteBoundary: true,
      setbacksSatisfied: {
        front: true,
        rear: true,
        left: true,
        right: true,
        all: true,
      },
    };
  }

  const distFront = round3(siteMaxZ - footprint.maxZ);
  const distRear = round3(footprint.minZ - siteMinZ);
  const distLeft = round3(footprint.minX - siteMinX);
  const distRight = round3(siteMaxX - footprint.maxX);

  const EPS = -0.02;
  const withinSiteBoundary =
    distFront >= EPS &&
    distRear >= EPS &&
    distLeft >= EPS &&
    distRight >= EPS;

  const sb = site.setbacksEnabled
    ? site.setbacks
    : { front: 0, rear: 0, left: 0, right: 0 };

  const okFront = distFront >= sb.front - 0.02;
  const okRear = distRear >= sb.rear - 0.02;
  const okLeft = distLeft >= sb.left - 0.02;
  const okRight = distRight >= sb.right - 0.02;

  const remainingSiteAreaSqm = withinSiteBoundary
    ? round3(Math.max(0, siteAreaSqm - footprint.footprintAreaSqm))
    : null;

  return {
    siteEnabled: true,
    siteAreaSqm,
    footprint,
    remainingSiteAreaSqm,
    distancesToBoundary: {
      front: distFront,
      rear: distRear,
      left: distLeft,
      right: distRight,
    },
    withinSiteBoundary,
    setbacksSatisfied: {
      front: okFront,
      rear: okRear,
      left: okLeft,
      right: okRight,
      all: okFront && okRear && okLeft && okRight,
    },
  };
}

function filterLowestFloorRooms(rooms: ArchDetectedRoom[]): ArchDetectedRoom[] {
  if (rooms.length === 0) return [];
  const firstFloorId = rooms[0].floorId;
  return rooms.filter((r) => r.floorId === firstFloorId);
}

/**
 * Counts active building story levels that contain actual building elements (or total defined habitable floors).
 */
export function computeActiveBuildingFloorCount(
  floors: BuildingFloorLayer[],
  archData: ArchHouseData,
  objects: SceneObjectData[]
): { occupiedFloors: number; totalDefinedStories: number } {
  const habitable = floors.filter(
    (f) => !f.id.includes('roof') && !/atap|roof|屋根/i.test(f.name)
  );
  const totalDefinedStories = Math.max(1, habitable.length || floors.length);

  const usedIds = new Set<string>();
  for (const w of archData.walls) usedIds.add(w.floorId);
  for (const s of archData.stairs) usedIds.add(s.floorId);
  for (const o of objects) {
    if (o.visible && o.floorId) usedIds.add(o.floorId);
  }
  const occupiedHabitable = Array.from(usedIds).filter((fid) =>
    habitable.some((hf) => hf.id === fid)
  );

  return {
    occupiedFloors: occupiedHabitable.length,
    totalDefinedStories,
  };
}
