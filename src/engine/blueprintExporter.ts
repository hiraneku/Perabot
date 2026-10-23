import {
  AppLanguage,
  ArchDetectedRoom,
  ArchHouseData,
  ArchOpeningItem,
  ArchWallSegment,
  BuildingFloorLayer,
  ElevationViewDirection,
  SceneObjectData,
} from '../types/studio';
import { ROOM_TYPE_LABELS } from './archAnalysis/briefEvaluator';
import {
  calcWallCenterlineLength,
  computeSingleRoofQuantities,
  computeSitePlacementMetrics,
  resolveSiteBoundaryPolygon,
} from './archAnalysis/geometryMetrics';
import {
  createDefaultConstructionMaterialCatalog,
  getMaterialDisplayName,
} from './archAnalysis/materialTakeoff';
import { runIntegratedProjectAnalysis } from './archAnalysis/alternativesService';

const DEG2RAD = Math.PI / 180;

function sampleCurve(
  wall: ArchWallSegment,
  t: number
): { x: number; z: number; tx: number; tz: number } {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const chord = Math.hypot(dx, dz);
  if (Math.abs(wall.curveBulge) < 0.04 || chord < 1e-4) {
    const ux = chord > 1e-5 ? dx / chord : 1;
    const uz = chord > 1e-5 ? dz / chord : 0;
    return {
      x: wall.start.x + dx * t,
      z: wall.start.z + dz * t,
      tx: ux,
      tz: uz,
    };
  }
  const nx = -dz / chord;
  const nz = dx / chord;
  const mx = (wall.start.x + wall.end.x) * 0.5 + nx * wall.curveBulge * 2;
  const mz = (wall.start.z + wall.end.z) * 0.5 + nz * wall.curveBulge * 2;
  const omt = 1 - t;
  const x = omt * omt * wall.start.x + 2 * omt * t * mx + t * t * wall.end.x;
  const z = omt * omt * wall.start.z + 2 * omt * t * mz + t * t * wall.end.z;
  const dtx = 2 * omt * (mx - wall.start.x) + 2 * t * (wall.end.x - mx);
  const dtz = 2 * omt * (mz - wall.start.z) + 2 * t * (wall.end.z - mz);
  const tLen = Math.hypot(dtx, dtz) || 1;
  return { x, z, tx: dtx / tLen, tz: dtz / tLen };
}

function triggerDataUrlDownload(dataUrl: string, fileName: string): void {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}

function resolvePaperPalette(paperTheme: 'blueprint-dark' | 'architect-white') {
  if (paperTheme === 'architect-white') {
    return {
      bg: '#f8fafc',
      frameStroke: '#334155',
      gridMinor: 'rgba(100, 116, 139, 0.14)',
      gridMajor: 'rgba(51, 65, 85, 0.25)',
      roomFill: 'rgba(14, 116, 144, 0.08)',
      roomStroke: 'rgba(15, 23, 42, 0.45)',
      wallFill: '#0f172a',
      wallHalf: '#475569',
      doorColor: '#047857',
      windowColor: '#0284c7',
      dimBg: 'rgba(255, 255, 255, 0.94)',
      dimStroke: '#334155',
      dimText: '#0f172a',
      titleBg: '#ffffff',
      titlePrimary: '#0f172a',
      titleAccent: '#0369a1',
      titleSub: '#475569',
    };
  }
  return {
    bg: '#0c192c',
    frameStroke: 'rgba(125, 211, 252, 0.5)',
    gridMinor: 'rgba(56, 189, 248, 0.08)',
    gridMajor: 'rgba(56, 189, 248, 0.18)',
    roomFill: 'rgba(56, 189, 248, 0.12)',
    roomStroke: 'rgba(125, 211, 252, 0.45)',
    wallFill: '#f8fafc',
    wallHalf: '#94a3b8',
    doorColor: '#34d399',
    windowColor: '#38bdf8',
    dimBg: 'rgba(12, 25, 44, 0.92)',
    dimStroke: 'rgba(125, 211, 252, 0.55)',
    dimText: '#e0f2fe',
    titleBg: 'rgba(15, 23, 42, 0.94)',
    titlePrimary: '#f8fafc',
    titleAccent: '#38bdf8',
    titleSub: '#94a3b8',
  };
}

function drawGraphicScaleBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scalePxPerMeter: number,
  textColor: string,
  accentColor: string
): void {
  // Choose clean metric bar length (1m, 2m, 5m, or 10m)
  const candidates = [1, 2, 5, 10];
  let barMeters = 2;
  for (const c of candidates) {
    if (c * scalePxPerMeter >= 90 && c * scalePxPerMeter <= 280) {
      barMeters = c;
      break;
    }
  }
  const barPx = barMeters * scalePxPerMeter;
  ctx.save();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barPx, 10);
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y, barPx * 0.5, 10);

  ctx.fillStyle = textColor;
  ctx.font = '700 15px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('0', x, y - 6);
  ctx.textAlign = 'center';
  ctx.fillText(`${(barMeters * 0.5).toFixed(1)}m`, x + barPx * 0.5, y - 6);
  ctx.textAlign = 'right';
  ctx.fillText(`${barMeters}m`, x + barPx, y - 6);
  ctx.restore();
}

function drawCompassRose(
  ctx: CanvasRenderingContext2D,
  compX: number,
  compY: number,
  northDeg: number,
  strokeCol: string
): void {
  const compR = 46;
  ctx.save();
  ctx.translate(compX, compY);
  ctx.rotate(northDeg * DEG2RAD);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = strokeCol;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, compR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(0, -compR + 8);
  ctx.lineTo(11, 6);
  ctx.lineTo(-11, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -compR - 10);
  ctx.restore();
}

/**
 * 1. High-Resolution 2D Architectural Floor Plan Sheet Exporter (`.PNG`)
 */
export function exportFloorBlueprintPNG(params: {
  projectName: string;
  floor: BuildingFloorLayer;
  archData: ArchHouseData;
  detectedRooms: ArchDetectedRoom[];
  paperTheme?: 'blueprint-dark' | 'architect-white';
  showDimensions?: boolean;
  showRoomLabels?: boolean;
  sourceLabel?: string;
  lang?: AppLanguage;
  download?: boolean;
}): string {
  const {
    projectName,
    floor,
    archData,
    detectedRooms,
    paperTheme = 'blueprint-dark',
    showDimensions = true,
    showRoomLabels = true,
    sourceLabel,
    lang = 'id',
    download = true,
  } = params;

  const pal = resolvePaperPalette(paperTheme);
  const W = 2200;
  const H = 1560;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = pal.frameStroke;
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  const floorWalls = archData.walls.filter((w) => w.floorId === floor.id);
  const floorRooms = detectedRooms.filter((r) => r.floorId === floor.id);
  const floorOpenings = archData.openings.filter((o) => o.floorId === floor.id);
  const floorStairs = archData.stairs.filter((s) => s.floorId === floor.id);

  let minX = -6;
  let maxX = 6;
  let minZ = -5;
  let maxZ = 5;
  if (floorWalls.length > 0) {
    minX = Infinity;
    maxX = -Infinity;
    minZ = Infinity;
    maxZ = -Infinity;
    for (const w of floorWalls) {
      for (let i = 0; i <= 10; i++) {
        const pt = sampleCurve(w, i / 10);
        minX = Math.min(minX, pt.x - 1);
        maxX = Math.max(maxX, pt.x + 1);
        minZ = Math.min(minZ, pt.z - 1);
        maxZ = Math.max(maxZ, pt.z + 1);
      }
    }
  }

  const drawX0 = 90;
  const drawY0 = 90;
  const drawW = W - 180;
  const drawH = H - 300;
  const spanX = Math.max(4, maxX - minX);
  const spanZ = Math.max(4, maxZ - minZ);
  const scale = Math.min(drawW / spanX, drawH / spanZ);
  const cxWorld = (minX + maxX) * 0.5;
  const czWorld = (minZ + maxZ) * 0.5;

  const toPx = (wx: number, wz: number): [number, number] => [
    drawX0 + drawW * 0.5 + (wx - cxWorld) * scale,
    drawY0 + drawH * 0.5 + (wz - czWorld) * scale,
  ];

  // 1m Architectural Grid
  ctx.strokeStyle = pal.gridMinor;
  ctx.lineWidth = 1;
  for (let gx = Math.floor(minX) - 2; gx <= Math.ceil(maxX) + 2; gx++) {
    const [px] = toPx(gx, 0);
    if (px >= 40 && px <= W - 40) {
      ctx.beginPath();
      ctx.moveTo(px, 40);
      ctx.lineTo(px, H - 190);
      ctx.stroke();
    }
  }
  for (let gz = Math.floor(minZ) - 2; gz <= Math.ceil(maxZ) + 2; gz++) {
    const [, py] = toPx(0, gz);
    if (py >= 40 && py <= H - 190) {
      ctx.beginPath();
      ctx.moveTo(40, py);
      ctx.lineTo(W - 40, py);
      ctx.stroke();
    }
  }

  // Rooms
  for (const room of floorRooms) {
    if (room.polygon.length < 3) continue;
    ctx.beginPath();
    room.polygon.forEach((pt, idx) => {
      const [px, py] = toPx(pt.x, pt.z);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = pal.roomFill;
    ctx.fill();
    ctx.strokeStyle = pal.roomStroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Stairs
  for (const st of floorStairs) {
    const [sx, sy] = toPx(st.position.x, st.position.z);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-st.rotationY * DEG2RAD);
    const pw = st.width * scale;
    const pl = st.runLength * scale;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.20)';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-pw * 0.5, -pl * 0.5, pw, pl);
    ctx.strokeRect(-pw * 0.5, -pl * 0.5, pw, pl);
    const steps = 10;
    for (let i = 1; i < steps; i++) {
      const yy = -pl * 0.5 + (pl * i) / steps;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.5, yy);
      ctx.lineTo(pw * 0.5, yy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Walls
  for (const w of floorWalls) {
    const pxThick = Math.max(6, w.thickness * scale);
    ctx.strokeStyle = w.style === 'full' ? pal.wallFill : pal.wallHalf;
    ctx.lineWidth = pxThick;
    ctx.lineCap = 'square';
    ctx.beginPath();
    const segs = Math.abs(w.curveBulge) >= 0.04 ? 20 : 1;
    for (let i = 0; i <= segs; i++) {
      const pt = sampleCurve(w, i / segs);
      const [px, py] = toPx(pt.x, pt.z);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Doors & Windows
  for (const op of floorOpenings) {
    const host = floorWalls.find((w) => w.id === op.wallId);
    if (!host) continue;
    const pt = sampleCurve(host, op.offsetRatio);
    const [ox, oy] = toPx(pt.x, pt.z);
    const ang = Math.atan2(pt.tz, pt.tx);
    const pw = op.width * scale;
    const pThick = Math.max(8, host.thickness * scale + 4);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(ang);

    ctx.fillStyle = pal.bg;
    ctx.fillRect(-pw * 0.5, -pThick * 0.6, pw, pThick * 1.2);

    if (op.kind.startsWith('door')) {
      const sign = op.flipSwing ? -1 : 1;
      ctx.strokeStyle = pal.doorColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.5, 0);
      ctx.lineTo(-pw * 0.5, sign * pw * 0.85);
      ctx.stroke();

      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(
        -pw * 0.5,
        0,
        pw * 0.85,
        sign > 0 ? 0 : -Math.PI * 0.5,
        sign > 0 ? Math.PI * 0.5 : 0
      );
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (op.kind.startsWith('window')) {
      ctx.strokeStyle = pal.windowColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-pw * 0.5, -pThick * 0.35, pw, pThick * 0.7);
      ctx.beginPath();
      ctx.moveTo(-pw * 0.5, 0);
      ctx.lineTo(pw * 0.5, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Wall Dimensions
  if (showDimensions) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const w of floorWalls) {
      const len = calcWallCenterlineLength(w);
      if (len < 0.45) continue;
      const mid = sampleCurve(w, 0.5);
      const nx = -mid.tz;
      const nz = mid.tx;
      const [lx, ly] = toPx(mid.x + nx * 0.42, mid.z + nz * 0.42);
      const txt = `${len.toFixed(2)} m`;
      ctx.font = '700 18px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(txt).width + 16;

      ctx.fillStyle = pal.dimBg;
      ctx.strokeStyle = pal.dimStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(lx - tw * 0.5, ly - 14, tw, 28);
      ctx.strokeRect(lx - tw * 0.5, ly - 14, tw, 28);
      ctx.fillStyle = pal.dimText;
      ctx.fillText(txt, lx, ly + 1);
    }
  }

  // Room Name + Semantic Type + Area Labels
  if (showRoomLabels) {
    for (const room of floorRooms) {
      const [rx, ry] = toPx(room.centroid.x, room.centroid.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = pal.titlePrimary;
      ctx.font = '800 24px Inter, system-ui, sans-serif';
      ctx.fillText(room.name, rx, ry - 14);

      if (room.roomType !== 'unassigned') {
        ctx.fillStyle = pal.titleSub;
        ctx.font = '600 15px Inter, system-ui, sans-serif';
        ctx.fillText(ROOM_TYPE_LABELS[room.roomType][lang], rx, ry + 8);
      }

      ctx.fillStyle = pal.doorColor;
      ctx.font = '700 20px Inter, system-ui, sans-serif';
      ctx.fillText(
        `${room.areaSqm.toFixed(2)} m²`,
        rx,
        room.roomType !== 'unassigned' ? ry + 30 : ry + 14
      );
    }
  }

  drawCompassRose(ctx, W - 115, 115, archData.sun.northDeg, pal.frameStroke);

  // Title Block + Scale Bar
  const tbY = H - 166;
  ctx.fillStyle = pal.titleBg;
  ctx.strokeStyle = pal.frameStroke;
  ctx.lineWidth = 2.5;
  ctx.fillRect(42, tbY, W - 84, 124);
  ctx.strokeRect(42, tbY, W - 84, 124);

  const totalArea = floorRooms.reduce((s, r) => s + r.areaSqm, 0);
  ctx.textAlign = 'left';
  ctx.fillStyle = pal.titleAccent;
  ctx.font = '800 20px Inter, system-ui, sans-serif';
  ctx.fillText(
    sourceLabel
      ? `PERABOT ARCHITECTURAL SHEET · ${sourceLabel.toUpperCase()}`
      : 'PERABOT ARCHITECTURAL FLOOR PLAN',
    72,
    tbY + 38
  );

  ctx.fillStyle = pal.titlePrimary;
  ctx.font = '800 32px Inter, system-ui, sans-serif';
  ctx.fillText(
    `${projectName} — ${floor.name} (Elev +${floor.elevation.toFixed(2)}m)`,
    72,
    tbY + 84
  );

  drawGraphicScaleBar(
    ctx,
    W * 0.52,
    tbY + 74,
    scale,
    pal.titlePrimary,
    pal.titleAccent
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = pal.doorColor;
  ctx.font = '800 26px Inter, system-ui, sans-serif';
  ctx.fillText(
    `${floorRooms.length} Rooms · ${totalArea.toFixed(2)} m²`,
    W - 72,
    tbY + 50
  );
  ctx.fillStyle = pal.titleSub;
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.fillText(
    `Walls: ${floorWalls.length} · Openings: ${floorOpenings.length} · ${new Date().toISOString().slice(0, 10)}`,
    W - 72,
    tbY + 88
  );

  const dataUrl = canvas.toDataURL('image/png');
  if (download) {
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]+/g, '_');
    triggerDataUrlDownload(
      dataUrl,
      `${safeName}_${floor.name.replace(/\s+/g, '_')}_FloorPlan.png`
    );
  }
  return dataUrl;
}

/**
 * 2. Site Plan Drawing Exporter (`.PNG`) — System 5 & System 6 Integration
 */
export function exportSitePlanPNG(params: {
  projectName: string;
  archData: ArchHouseData;
  objects: SceneObjectData[];
  detectedRooms: ArchDetectedRoom[];
  paperTheme?: 'blueprint-dark' | 'architect-white';
  showSetbacks?: boolean;
  sourceLabel?: string;
  download?: boolean;
}): string {
  const {
    projectName,
    archData,
    objects,
    detectedRooms,
    paperTheme = 'blueprint-dark',
    showSetbacks = true,
    sourceLabel,
    download = true,
  } = params;

  const pal = resolvePaperPalette(paperTheme);
  const W = 2200;
  const H = 1560;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = pal.frameStroke;
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  const site = archData.site ?? {
    enabled: true,
    width: 15,
    depth: 20,
    center: { x: 0, z: 0 },
    setbacksEnabled: true,
    setbacks: { front: 3, rear: 2, left: 1.5, right: 1.5 },
    entranceSide: 'front' as const,
    snapToSite: false,
    outdoorZones: [],
  };

  const siteMetrics = computeSitePlacementMetrics(
    archData,
    objects,
    detectedRooms,
    { ...site, enabled: true }
  );

  const sw = Math.max(4, site.width);
  const sd = Math.max(4, site.depth);
  const sMinX = site.center.x - sw * 0.5;
  const sMaxX = site.center.x + sw * 0.5;
  const sMinZ = site.center.z - sd * 0.5;
  const sMaxZ = site.center.z + sd * 0.5;

  const fp = siteMetrics.footprint;
  const viewMinX = Math.min(sMinX, fp.hasBuilding ? fp.minX : sMinX) - 2.2;
  const viewMaxX = Math.max(sMaxX, fp.hasBuilding ? fp.maxX : sMaxX) + 2.2;
  const viewMinZ = Math.min(sMinZ, fp.hasBuilding ? fp.minZ : sMinZ) - 2.2;
  const viewMaxZ = Math.max(sMaxZ, fp.hasBuilding ? fp.maxZ : sMaxZ) + 2.2;

  const drawX0 = 110;
  const drawY0 = 100;
  const drawW = W - 220;
  const drawH = H - 320;
  const scale = Math.min(
    drawW / Math.max(4, viewMaxX - viewMinX),
    drawH / Math.max(4, viewMaxZ - viewMinZ)
  );
  const cxWorld = (viewMinX + viewMaxX) * 0.5;
  const czWorld = (viewMinZ + viewMaxZ) * 0.5;

  const toPx = (wx: number, wz: number): [number, number] => [
    drawX0 + drawW * 0.5 + (wx - cxWorld) * scale,
    drawY0 + drawH * 0.5 + (wz - czWorld) * scale,
  ];

  // Site Plot Boundary (supports Rectangular, Trapezoid, Hook Corner, L-Lot, & Custom Polygons!)
  const sitePoly = resolveSiteBoundaryPolygon(site);
  ctx.beginPath();
  sitePoly.forEach((pt, idx) => {
    const [px, py] = toPx(pt.x, pt.z);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.fill();
  ctx.stroke();

  // Setback Envelope
  if (showSetbacks && site.setbacksEnabled) {
    const [sb0x, sb0y] = toPx(
      sMinX + site.setbacks.left,
      sMinZ + site.setbacks.rear
    );
    const [sb1x, sb1y] = toPx(
      sMaxX - site.setbacks.right,
      sMaxZ - site.setbacks.front
    );
    if (sb1x > sb0x && sb1y > sb0y) {
      ctx.save();
      ctx.setLineDash([12, 8]);
      ctx.strokeStyle = siteMetrics.setbacksSatisfied.all
        ? '#10b981'
        : '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(sb0x, sb0y, sb1x - sb0x, sb1y - sb0y);
      ctx.restore();
    }
  }

  // Outdoor Zones
  for (const z of site.outdoorZones) {
    const [zx0, zy0] = toPx(z.center.x - z.width * 0.5, z.center.z - z.depth * 0.5);
    const zwPx = z.width * scale;
    const zdPx = z.depth * scale;
    ctx.fillStyle = `${z.color}44`;
    ctx.strokeStyle = z.color;
    ctx.lineWidth = 2.5;
    ctx.fillRect(zx0, zy0, zwPx, zdPx);
    ctx.strokeRect(zx0, zy0, zwPx, zdPx);

    ctx.fillStyle = pal.titlePrimary;
    ctx.font = '700 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${z.name} (${(z.width * z.depth).toFixed(1)} m²)`,
      zx0 + zwPx * 0.5,
      zy0 + zdPx * 0.5
    );
  }

  // Building Footprint & Ground Walls
  if (fp.hasBuilding) {
    const [bx0, by0] = toPx(fp.minX, fp.minZ);
    const [bx1, by1] = toPx(fp.maxX, fp.maxZ);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.20)';
    ctx.strokeStyle = pal.titleAccent;
    ctx.lineWidth = 3;
    ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);

    for (const w of archData.walls) {
      const [wx0, wy0] = toPx(w.start.x, w.start.z);
      const [wx1, wy1] = toPx(w.end.x, w.end.z);
      ctx.strokeStyle = pal.wallFill;
      ctx.lineWidth = Math.max(4, w.thickness * scale);
      ctx.beginPath();
      ctx.moveTo(wx0, wy0);
      ctx.lineTo(wx1, wy1);
      ctx.stroke();
    }

    // Distance callouts to Front (+Z), Rear (-Z), Left (-X), Right (+X)
    const d = siteMetrics.distancesToBoundary;
    const drawClearance = (
      ax: number,
      az: number,
      bx: number,
      bz: number,
      label: string
    ) => {
      const [pxA, pyA] = toPx(ax, az);
      const [pxB, pyB] = toPx(bx, bz);
      ctx.save();
      ctx.strokeStyle = pal.titleAccent;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pxA, pyA);
      ctx.lineTo(pxB, pyB);
      ctx.stroke();
      ctx.setLineDash([]);
      const mx = (pxA + pxB) * 0.5;
      const my = (pyA + pyB) * 0.5;
      ctx.fillStyle = pal.dimBg;
      ctx.fillRect(mx - 58, my - 14, 116, 28);
      ctx.strokeRect(mx - 58, my - 14, 116, 28);
      ctx.fillStyle = pal.dimText;
      ctx.font = '700 16px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, mx, my);
      ctx.restore();
    };

    if (d.front !== null) {
      drawClearance(
        fp.center.x,
        fp.maxZ,
        fp.center.x,
        sMaxZ,
        `Front ${d.front.toFixed(2)}m`
      );
    }
    if (d.rear !== null) {
      drawClearance(
        fp.center.x,
        fp.minZ,
        fp.center.x,
        sMinZ,
        `Rear ${d.rear.toFixed(2)}m`
      );
    }
    if (d.left !== null) {
      drawClearance(
        fp.minX,
        fp.center.z,
        sMinX,
        fp.center.z,
        `Left ${d.left.toFixed(2)}m`
      );
    }
    if (d.right !== null) {
      drawClearance(
        fp.maxX,
        fp.center.z,
        sMaxX,
        fp.center.z,
        `Right ${d.right.toFixed(2)}m`
      );
    }
  }

  // Entrance Label
  const [entX, entY] =
    site.entranceSide === 'rear'
      ? toPx(site.center.x, sMinZ)
      : site.entranceSide === 'left'
      ? toPx(sMinX, site.center.z)
      : site.entranceSide === 'right'
      ? toPx(sMaxX, site.center.z)
      : toPx(site.center.x, sMaxZ);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(entX - 66, entY + 10, 132, 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ENTRANCE (${site.entranceSide.toUpperCase()})`, entX, entY + 30);

  drawCompassRose(ctx, W - 115, 115, archData.sun.northDeg, pal.frameStroke);

  // Title Block
  const tbY = H - 166;
  ctx.fillStyle = pal.titleBg;
  ctx.strokeStyle = pal.frameStroke;
  ctx.lineWidth = 2.5;
  ctx.fillRect(42, tbY, W - 84, 124);
  ctx.strokeRect(42, tbY, W - 84, 124);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f59e0b';
  ctx.font = '800 20px Inter, system-ui, sans-serif';
  ctx.fillText(
    sourceLabel
      ? `PERABOT SITE PLAN · ${sourceLabel.toUpperCase()}`
      : 'PERABOT ARCHITECTURAL SITE PLAN (USER-DEFINED SETBACKS)',
    72,
    tbY + 38
  );
  ctx.fillStyle = pal.titlePrimary;
  ctx.font = '800 30px Inter, system-ui, sans-serif';
  ctx.fillText(
    `${projectName} — Plot ${sw.toFixed(1)} × ${sd.toFixed(1)} m (${siteMetrics.siteAreaSqm.toFixed(1)} m²)`,
    72,
    tbY + 84
  );

  drawGraphicScaleBar(
    ctx,
    W * 0.54,
    tbY + 74,
    scale,
    pal.titlePrimary,
    '#f59e0b'
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = pal.doorColor;
  ctx.font = '800 24px Inter, system-ui, sans-serif';
  ctx.fillText(
    `Footprint: ${fp.footprintAreaSqm.toFixed(1)} m² · Open Site: ${(siteMetrics.remainingSiteAreaSqm ?? 0).toFixed(1)} m²`,
    W - 72,
    tbY + 50
  );
  ctx.fillStyle = pal.titleSub;
  ctx.font = '600 17px Inter, system-ui, sans-serif';
  ctx.fillText(
    `Setbacks F:${site.setbacks.front}m R:${site.setbacks.rear}m L:${site.setbacks.left}m R:${site.setbacks.right}m (Advisory)`,
    W - 72,
    tbY + 88
  );

  const dataUrl = canvas.toDataURL('image/png');
  if (download) {
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]+/g, '_');
    triggerDataUrlDownload(dataUrl, `${safeName}_SitePlan.png`);
  }
  return dataUrl;
}

/**
 * 3. True Orthographic Architectural Elevation Exporter (`front`, `rear`, `left`, `right`)
 * Projects actual walls, doors/windows (with true sill heights), floor datum levels, and sloped roof silhouettes!
 */
export function exportElevationDrawingPNG(params: {
  projectName: string;
  direction: ElevationViewDirection;
  archData: ArchHouseData;
  floors: BuildingFloorLayer[];
  paperTheme?: 'blueprint-dark' | 'architect-white';
  sourceLabel?: string;
  download?: boolean;
}): string {
  const {
    projectName,
    direction,
    archData,
    floors,
    paperTheme = 'blueprint-dark',
    sourceLabel,
    download = true,
  } = params;

  const pal = resolvePaperPalette(paperTheme);
  const W = 2200;
  const H = 1480;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = pal.frameStroke;
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // Horizontal projection axis `u` and depth sorting axis `d` (larger `d` = closer to viewer!)
  const projectHoriz = (x: number, z: number): { u: number; depth: number } => {
    if (direction === 'front') return { u: x, depth: z }; // Looking toward -Z from +Z
    if (direction === 'rear') return { u: -x, depth: -z }; // Looking toward +Z from -Z
    if (direction === 'left') return { u: z, depth: -x }; // Looking toward +X from -X
    return { u: -z, depth: x }; // 'right': Looking toward -X from +X
  };

  const floorElevMap = new Map<string, number>();
  for (const fl of floors) floorElevMap.set(fl.id, fl.elevation);

  interface ProjectedBox {
    kind: 'wall' | 'roof';
    u0: number;
    u1: number;
    y0: number;
    y1: number;
    depth: number;
    wall?: ArchWallSegment;
    roofShape?: Array<[number, number]>; // (u, y) polygon
    color: string;
  }

  const items: ProjectedBox[] = [];
  let minU = -6;
  let maxU = 6;
  let maxY = 4.5;

  if (archData.walls.length > 0 || archData.roofs.length > 0) {
    minU = Infinity;
    maxU = -Infinity;
  }

  for (const w of archData.walls) {
    const baseY = floorElevMap.get(w.floorId) ?? 0;
    const effH = w.style === 'half' ? Math.min(w.height, 1.1) : w.height;
    const pA = projectHoriz(w.start.x, w.start.z);
    const pB = projectHoriz(w.end.x, w.end.z);
    const pad = w.thickness * 0.5;
    const u0 = Math.min(pA.u, pB.u) - pad;
    const u1 = Math.max(pA.u, pB.u) + pad;
    const depth = Math.max(pA.depth, pB.depth);

    minU = Math.min(minU, u0 - 1.2);
    maxU = Math.max(maxU, u1 + 1.2);
    maxY = Math.max(maxY, baseY + effH + 1.0);

    items.push({
      kind: 'wall',
      u0,
      u1,
      y0: baseY,
      y1: baseY + effH,
      depth,
      wall: w,
      color: w.exteriorColor,
    });
  }

  for (const rf of archData.roofs) {
    const rq = computeSingleRoofQuantities(rf);
    const oh = Math.max(0, rf.overhang);
    const hx = rf.width * 0.5 + oh;
    const hz = rf.depth * 0.5 + oh;
    const corners = [
      projectHoriz(rf.center.x - hx, rf.center.z - hz),
      projectHoriz(rf.center.x + hx, rf.center.z - hz),
      projectHoriz(rf.center.x + hx, rf.center.z + hz),
      projectHoriz(rf.center.x - hx, rf.center.z + hz),
    ];
    const u0 = Math.min(...corners.map((c) => c.u));
    const u1 = Math.max(...corners.map((c) => c.u));
    const depth = Math.max(...corners.map((c) => c.depth)) + 0.05;
    const topY = rf.baseY + (rf.style === 'flat' ? 0.24 : rq.ridgeRiseM);

    minU = Math.min(minU, u0 - 1.2);
    maxU = Math.max(maxU, u1 + 1.2);
    maxY = Math.max(maxY, topY + 1.0);

    let roofPoly: Array<[number, number]>;
    if (rf.style === 'flat') {
      roofPoly = [
        [u0, rf.baseY],
        [u1, rf.baseY],
        [u1, topY],
        [u0, topY],
      ];
    } else if (rf.style === 'shed') {
      roofPoly = [
        [u0, rf.baseY],
        [u1, rf.baseY],
        [u1, topY],
        [u0, rf.baseY + 0.22],
      ];
    } else if (rf.style === 'hip') {
      const inset = Math.min((u1 - u0) * 0.32, Math.max(0.4, rq.ridgeRiseM));
      roofPoly = [
        [u0, rf.baseY],
        [u1, rf.baseY],
        [u1 - inset, topY],
        [u0 + inset, topY],
      ];
    } else {
      // Gable: triangular profile when looking along ridge axis, trapezoidal/rectangular perpendicular
      const lookingAlongRidge =
        (rf.ridgeAxis === 'z' &&
          (direction === 'front' || direction === 'rear')) ||
        (rf.ridgeAxis === 'x' &&
          (direction === 'left' || direction === 'right'));
      roofPoly = lookingAlongRidge
        ? [
            [u0, rf.baseY],
            [u1, rf.baseY],
            [(u0 + u1) * 0.5, topY],
          ]
        : [
            [u0, rf.baseY],
            [u1, rf.baseY],
            [u1, topY],
            [u0, topY],
          ];
    }

    items.push({
      kind: 'roof',
      u0,
      u1,
      y0: rf.baseY,
      y1: topY,
      depth,
      roofShape: roofPoly,
      color: rf.color,
    });
  }

  if (!Number.isFinite(minU)) {
    minU = -6;
    maxU = 6;
  }

  // Painter's algorithm: back-to-front by `depth`
  items.sort((a, b) => a.depth - b.depth);

  const drawX0 = 160;
  const drawW = W - 320;
  const groundPxY = H - 250;
  const availH = groundPxY - 120;
  const scale = Math.min(drawW / Math.max(4, maxU - minU), availH / Math.max(3.5, maxY));
  const midU = (minU + maxU) * 0.5;

  const toElevPx = (u: number, y: number): [number, number] => [
    drawX0 + drawW * 0.5 + (u - midU) * scale,
    groundPxY - y * scale,
  ];

  // Floor Level Datum Lines
  for (const fl of floors) {
    const [, py] = toElevPx(0, fl.elevation);
    ctx.save();
    ctx.setLineDash([10, 7]);
    ctx.strokeStyle = pal.gridMajor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(80, py);
    ctx.lineTo(W - 80, py);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = pal.titleAccent;
    ctx.font = '700 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${fl.name} (+${fl.elevation.toFixed(2)}m)`, 84, py - 8);
    ctx.restore();
  }

  // Draw Projected Walls + Hosted Openings & Roofs
  for (const item of items) {
    if (item.kind === 'wall' && item.wall) {
      const [x0, y0] = toElevPx(item.u0, item.y1);
      const [x1, y1] = toElevPx(item.u1, item.y0);
      ctx.fillStyle =
        paperTheme === 'architect-white' ? '#e2e8f0' : 'rgba(226, 232, 240, 0.16)';
      ctx.strokeStyle = pal.wallFill;
      ctx.lineWidth = 2.5;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

      // Draw hosted Doors & Windows projected onto this wall face
      const w = item.wall;
      const hosted = archData.openings.filter((o) => o.wallId === w.id);
      for (const op of hosted) {
        const pt = sampleCurve(w, op.offsetRatio);
        const proj = projectHoriz(pt.x, pt.z);
        // Project opening horizontal width by wall orientation relative to view plane
        const pStart = projectHoriz(w.start.x, w.start.z);
        const pEnd = projectHoriz(w.end.x, w.end.z);
        const wallLen = Math.max(0.1, calcWallCenterlineLength(w));
        const cosFactor = Math.abs(pEnd.u - pStart.u) / wallLen;
        if (cosFactor < 0.15) continue; // Edge-on wall

        const halfW = op.width * 0.5 * cosFactor;
        const [ox0, oyTop] = toElevPx(
          proj.u - halfW,
          item.y0 + op.sillHeight + op.height
        );
        const [ox1, oyBot] = toElevPx(proj.u + halfW, item.y0 + op.sillHeight);

        ctx.fillStyle = op.kind.startsWith('window')
          ? 'rgba(56, 189, 248, 0.28)'
          : 'rgba(52, 211, 153, 0.22)';
        ctx.strokeStyle = op.kind.startsWith('window')
          ? pal.windowColor
          : pal.doorColor;
        ctx.lineWidth = 2.2;
        ctx.fillRect(ox0, oyTop, ox1 - ox0, oyBot - oyTop);
        ctx.strokeRect(ox0, oyTop, ox1 - ox0, oyBot - oyTop);

        // Mullion / door handle detail
        const midOx = (ox0 + ox1) * 0.5;
        if (op.kind.startsWith('window') || op.kind === 'door-double') {
          ctx.beginPath();
          ctx.moveTo(midOx, oyTop);
          ctx.lineTo(midOx, oyBot);
          ctx.stroke();
        }
      }
    } else if (item.kind === 'roof' && item.roofShape) {
      ctx.beginPath();
      item.roofShape.forEach(([ru, ry], idx) => {
        const [px, py] = toElevPx(ru, ry);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle =
        paperTheme === 'architect-white'
          ? 'rgba(184, 93, 59, 0.28)'
          : 'rgba(217, 107, 67, 0.34)';
      ctx.strokeStyle = pal.wallFill;
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();
    }
  }

  // Heavy Ground Datum Line
  ctx.strokeStyle = pal.titlePrimary;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(70, groundPxY);
  ctx.lineTo(W - 70, groundPxY);
  ctx.stroke();

  // Title Block
  const tbY = H - 166;
  ctx.fillStyle = pal.titleBg;
  ctx.strokeStyle = pal.frameStroke;
  ctx.lineWidth = 2.5;
  ctx.fillRect(42, tbY, W - 84, 124);
  ctx.strokeRect(42, tbY, W - 84, 124);

  ctx.textAlign = 'left';
  ctx.fillStyle = pal.titleAccent;
  ctx.font = '800 20px Inter, system-ui, sans-serif';
  ctx.fillText(
    sourceLabel
      ? `PERABOT ORTHOGRAPHIC ELEVATION · ${sourceLabel.toUpperCase()}`
      : 'PERABOT ORTHOGRAPHIC BUILDING ELEVATION',
    72,
    tbY + 38
  );
  ctx.fillStyle = pal.titlePrimary;
  ctx.font = '800 32px Inter, system-ui, sans-serif';
  ctx.fillText(
    `${projectName} — ${direction.toUpperCase()} ELEVATION`,
    72,
    tbY + 84
  );

  drawGraphicScaleBar(
    ctx,
    W * 0.54,
    tbY + 74,
    scale,
    pal.titlePrimary,
    pal.titleAccent
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = pal.titleSub;
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.fillText(
    `Peak Datum: +${(maxY - 1.0).toFixed(2)} m · Schematic Architectural Projection`,
    W - 72,
    tbY + 68
  );

  const dataUrl = canvas.toDataURL('image/png');
  if (download) {
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]+/g, '_');
    triggerDataUrlDownload(
      dataUrl,
      `${safeName}_Elevation_${direction.toUpperCase()}.png`
    );
  }
  return dataUrl;
}

/**
 * 3B. True Plane-Intersected Architectural Building Section Exporter (`.PNG`)
 * - `axis === 'x'` -> Cross Section A–A' along X at `Z = offsetMeters` (looking toward -Z)
 * - `axis === 'z'` -> Longitudinal Section B–B' along Z at `X = offsetMeters` (looking toward -X)
 */
export function exportBuildingSectionPNG(params: {
  projectName: string;
  archData: ArchHouseData;
  floors: BuildingFloorLayer[];
  detectedRooms?: ArchDetectedRoom[];
  axis?: 'x' | 'z';
  offsetMeters?: number;
  paperTheme?: 'blueprint-dark' | 'architect-white';
  sourceLabel?: string;
  download?: boolean;
}): string {
  const {
    projectName,
    archData,
    floors,
    detectedRooms = [],
    axis = 'x',
    offsetMeters = 0,
    paperTheme = 'blueprint-dark',
    sourceLabel,
    download = true,
  } = params;

  const pal = resolvePaperPalette(paperTheme);
  const W = 2200;
  const H = 1560;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = pal.frameStroke;
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  const floorElev = new Map<string, number>();
  const floorHeight = new Map<string, number>();
  for (const fl of floors) {
    floorElev.set(fl.id, fl.elevation);
    floorHeight.set(fl.id, fl.height);
  }

  // Coordinate mapping:
  // u = horizontal abscissa along the section cut (`x` when axis==='x', `z` when axis==='z')
  // v = depth perpendicular to cut (`z` when axis==='x', `x` when axis==='z').
  // Cut plane is `v === offsetMeters`, viewing into `v <= offsetMeters`.
  const toUV = (x: number, z: number): { u: number; v: number } =>
    axis === 'x' ? { u: x, v: z } : { u: z, v: x };

  let minU = Infinity;
  let maxU = -Infinity;
  let maxY = 4.2;

  for (const w of archData.walls) {
    const p0 = toUV(w.start.x, w.start.z);
    const p1 = toUV(w.end.x, w.end.z);
    minU = Math.min(minU, p0.u - 0.5, p1.u - 0.5);
    maxU = Math.max(maxU, p0.u + 0.5, p1.u + 0.5);
    const by = floorElev.get(w.floorId) ?? 0;
    maxY = Math.max(maxY, by + w.height + 0.8);
  }
  for (const rf of archData.roofs) {
    const rq = computeSingleRoofQuantities(rf);
    const span =
      (axis === 'x' ? rf.width : rf.depth) * 0.5 + rf.overhang;
    const centerU = axis === 'x' ? rf.center.x : rf.center.z;
    minU = Math.min(minU, centerU - span - 0.5);
    maxU = Math.max(maxU, centerU + span + 0.5);
    maxY = Math.max(maxY, rf.baseY + rq.ridgeRiseM + 1.0);
  }

  if (!Number.isFinite(minU)) {
    minU = -6;
    maxU = 6;
  }

  const drawX0 = 210;
  const drawW = W - 400;
  const groundPxY = H - 255;
  const availH = groundPxY - 125;
  const scale = Math.min(
    drawW / Math.max(4, maxU - minU),
    availH / Math.max(3.5, maxY)
  );
  const midU = (minU + maxU) * 0.5;

  const toSecPx = (u: number, y: number): [number, number] => [
    drawX0 + drawW * 0.5 + (u - midU) * scale,
    groundPxY - y * scale,
  ];

  // Helper: fill diagonal structural hatch inside cut elements
  const fillSectionHatch = (
    x0: number,
    y0: number,
    wPx: number,
    hPx: number,
    strokeCol: string
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, wPx, hPx);
    ctx.clip();
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 1.4;
    const step = 9;
    const minXRect = Math.min(x0, x0 + wPx);
    const maxXRect = Math.max(x0, x0 + wPx);
    const minYRect = Math.min(y0, y0 + hPx);
    const maxYRect = Math.max(y0, y0 + hPx);
    for (
      let d = minXRect - (maxYRect - minYRect);
      d <= maxXRect + (maxYRect - minYRect);
      d += step
    ) {
      ctx.beginPath();
      ctx.moveTo(d, maxYRect);
      ctx.lineTo(d + (maxYRect - minYRect), minYRect);
      ctx.stroke();
    }
    ctx.restore();
  };

  // 1. Floor Level Datum Lines + Triangular Architectural Level Markers
  const sortedFloors = [...floors].sort((a, b) => a.elevation - b.elevation);
  for (const fl of sortedFloors) {
    const [, py] = toSecPx(0, fl.elevation);
    ctx.save();
    ctx.setLineDash([10, 7]);
    ctx.strokeStyle = pal.gridMajor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(90, py);
    ctx.lineTo(W - 90, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Architectural Datum Triangle Symbol on Left Margin
    ctx.fillStyle = pal.titleAccent;
    ctx.beginPath();
    ctx.moveTo(118, py);
    ctx.lineTo(104, py - 12);
    ctx.lineTo(132, py - 12);
    ctx.closePath();
    ctx.fill();

    const signPrefix = fl.elevation === 0 ? '±' : '+';
    ctx.fillStyle = pal.titlePrimary;
    ctx.font = '800 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${signPrefix}${fl.elevation.toFixed(2)}m · ${fl.name}`,
      94,
      py - 18
    );
    ctx.restore();
  }

  // 2. Background Visible Walls & Openings Behind the Cut Plane (`v <= offsetMeters + 0.08`)
  for (const w of archData.walls) {
    const baseY = floorElev.get(w.floorId) ?? 0;
    const p0 = toUV(w.start.x, w.start.z);
    const p1 = toUV(w.end.x, w.end.z);
    if (p0.v > offsetMeters + 0.08 && p1.v > offsetMeters + 0.08) continue;

    // Clip segment to `v <= offsetMeters`
    let uA = p0.u,
      vA = p0.v,
      uB = p1.u,
      vB = p1.v;
    if (vA > offsetMeters && vB <= offsetMeters) {
      const t = (offsetMeters - vA) / (vB - vA);
      uA = uA + (uB - uA) * t;
      vA = offsetMeters;
    } else if (vB > offsetMeters && vA <= offsetMeters) {
      const t = (offsetMeters - vA) / (vB - vA);
      uB = uA + (uB - uA) * t;
      vB = offsetMeters;
    }

    if (Math.abs(uB - uA) > 0.12) {
      const [x0, yTop] = toSecPx(Math.min(uA, uB), baseY + w.height);
      const [x1, yBot] = toSecPx(Math.max(uA, uB), baseY);
      ctx.fillStyle =
        paperTheme === 'architect-white'
          ? 'rgba(226, 232, 240, 0.42)'
          : 'rgba(148, 163, 184, 0.09)';
      ctx.strokeStyle = pal.dimStroke;
      ctx.lineWidth = 1.6;
      ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
      ctx.strokeRect(x0, yTop, x1 - x0, yBot - yTop);

      // Background doors/windows on this wall
      const hosted = archData.openings.filter((o) => o.wallId === w.id);
      const wLen = Math.max(0.1, calcWallCenterlineLength(w));
      const cosProj = Math.abs(p1.u - p0.u) / wLen;
      if (cosProj > 0.2) {
        for (const op of hosted) {
          const opPt = sampleCurve(w, op.offsetRatio);
          const opUV = toUV(opPt.x, opPt.z);
          if (opUV.v > offsetMeters + 0.1) continue;
          const hw = op.width * 0.5 * cosProj;
          const [ox0, oy0] = toSecPx(
            opUV.u - hw,
            baseY + op.sillHeight + op.height
          );
          const [ox1, oy1] = toSecPx(opUV.u + hw, baseY + op.sillHeight);
          ctx.fillStyle = op.kind.startsWith('window')
            ? 'rgba(56, 189, 248, 0.22)'
            : 'rgba(52, 211, 153, 0.18)';
          ctx.strokeStyle = op.kind.startsWith('window')
            ? pal.windowColor
            : pal.doorColor;
          ctx.lineWidth = 2;
          ctx.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
          ctx.strokeRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
        }
      }
    }
  }

  // 3. Stepped Staircases Visible Behind or Cut by Section Plane
  for (const st of archData.stairs) {
    const stUV = toUV(st.position.x, st.position.z);
    if (stUV.v > offsetMeters + st.runLength * 0.6) continue;
    const steps = 12;
    const runU = st.runLength;
    const uStart = stUV.u - runU * 0.5;
    const stepU = runU / steps;
    const stepH = st.height / steps;

    ctx.beginPath();
    const [sx0, sy0] = toSecPx(uStart, st.position.y);
    ctx.moveTo(sx0, sy0);
    for (let i = 0; i < steps; i++) {
      const [pxRiser, pyRiser] = toSecPx(
        uStart + i * stepU,
        st.position.y + (i + 1) * stepH
      );
      const [pxTread, pyTread] = toSecPx(
        uStart + (i + 1) * stepU,
        st.position.y + (i + 1) * stepH
      );
      ctx.lineTo(pxRiser, pyRiser);
      ctx.lineTo(pxTread, pyTread);
    }
    const [sxEnd, syEnd] = toSecPx(
      uStart + runU,
      Math.max(st.position.y, st.position.y + st.height - 0.18)
    );
    ctx.lineTo(sxEnd, syEnd);
    ctx.lineTo(sx0, sy0);
    ctx.closePath();
    ctx.fillStyle =
      paperTheme === 'architect-white'
        ? 'rgba(180, 83, 9, 0.22)'
        : 'rgba(251, 191, 36, 0.24)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.4;
    ctx.fill();
    ctx.stroke();
  }

  // 4. Cut Structural Floor Slabs & Sliced Room Callouts (omitting Void & Stairwell openings!)
  for (const room of detectedRooms) {
    const baseY = floorElev.get(room.floorId) ?? 0;
    const storyH = floorHeight.get(room.floorId) ?? 3.0;
    // Intersect `v = offsetMeters` with room polygon edges
    const hitUs: number[] = [];
    for (let i = 0; i < room.polygon.length; i++) {
      const a = toUV(room.polygon[i].x, room.polygon[i].z);
      const b = toUV(
        room.polygon[(i + 1) % room.polygon.length].x,
        room.polygon[(i + 1) % room.polygon.length].z
      );
      if (
        (a.v <= offsetMeters && b.v > offsetMeters) ||
        (b.v <= offsetMeters && a.v > offsetMeters)
      ) {
        const t = (offsetMeters - a.v) / (b.v - a.v);
        hitUs.push(a.u + (b.u - a.u) * t);
      }
    }
    hitUs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < hitUs.length; k += 2) {
      const u0 = hitUs[k];
      const u1 = hitUs[k + 1];
      if (u1 - u0 < 0.2) continue;

      // Draw structural concrete floor slab unless upper room is marked `isVoid`
      if (!room.isVoid) {
        const slabThick = 0.16;
        const [sx0, syTop] = toSecPx(u0, baseY);
        const [sx1, syBot] = toSecPx(u1, baseY - slabThick);
        ctx.fillStyle =
          paperTheme === 'architect-white' ? '#cbd5e1' : '#334155';
        ctx.fillRect(sx0, syTop, sx1 - sx0, syBot - syTop);
        fillSectionHatch(
          sx0,
          syTop,
          sx1 - sx0,
          syBot - syTop,
          pal.frameStroke
        );
        ctx.strokeStyle = pal.wallFill;
        ctx.lineWidth = 3;
        ctx.strokeRect(sx0, syTop, sx1 - sx0, syBot - syTop);
      }

      // Room Section Label + Clear Ceiling Height inside sliced room cavity
      const [midPx, midPy] = toSecPx((u0 + u1) * 0.5, baseY + storyH * 0.46);
      ctx.textAlign = 'center';
      ctx.fillStyle = pal.titlePrimary;
      ctx.font = '800 20px Inter, system-ui, sans-serif';
      ctx.fillText(
        room.isVoid ? `${room.name} (VOID)` : room.name,
        midPx,
        midPy - 6
      );
      ctx.fillStyle = pal.doorColor;
      ctx.font = '700 15px Inter, system-ui, sans-serif';
      ctx.fillText(`CH ${storyH.toFixed(2)}m`, midPx, midPy + 16);
    }
  }

  // 5. Heavy Pochéd Section-Cut Walls (Pierced directly by `v = offsetMeters`!)
  for (const w of archData.walls) {
    const baseY = floorElev.get(w.floorId) ?? 0;
    const samples = Math.abs(w.curveBulge) >= 0.04 ? 16 : 1;
    const wallLen = Math.max(0.1, calcWallCenterlineLength(w));
    const hosted = archData.openings.filter((o) => o.wallId === w.id);

    for (let s = 0; s < samples; s++) {
      const t0 = s / samples;
      const t1 = (s + 1) / samples;
      const c0 = sampleCurve(w, t0);
      const c1 = sampleCurve(w, t1);
      const a = toUV(c0.x, c0.z);
      const b = toUV(c1.x, c1.z);

      // Case A: Wall runs nearly coplanar along the cut plane (`|v - offset| <= thickness`)
      const coplanarHit =
        Math.abs(a.v - offsetMeters) <= w.thickness * 0.65 &&
        Math.abs(b.v - offsetMeters) <= w.thickness * 0.65;

      // Case B: Wall crosses `v = offsetMeters` transversely
      const crossesPlane =
        (a.v - offsetMeters) * (b.v - offsetMeters) <= 0 &&
        Math.abs(a.v - b.v) > 0.04;

      if (coplanarHit) {
        const [x0, yTop] = toSecPx(Math.min(a.u, b.u), baseY + w.height);
        const [x1, yBot] = toSecPx(Math.max(a.u, b.u), baseY);
        ctx.fillStyle =
          paperTheme === 'architect-white' ? '#cbd5e1' : '#1e293b';
        ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
        fillSectionHatch(x0, yTop, x1 - x0, yBot - yTop, pal.titleAccent);
        ctx.strokeStyle = pal.wallFill;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(x0, yTop, x1 - x0, yBot - yTop);
      } else if (crossesPlane) {
        const frac = (offsetMeters - a.v) / (b.v - a.v);
        const uHit = a.u + (b.u - a.u) * frac;
        const sAlong = (t0 + (t1 - t0) * frac) * wallLen;
        const halfThick = Math.max(0.075, w.thickness * 0.5);

        // Check if cut plane passes right through a Door or Window opening!
        const slicedOp = hosted.find(
          (op) =>
            Math.abs(sAlong - op.offsetRatio * wallLen) <= op.width * 0.5
        );

        const drawWallSpanY = (yBottom: number, yTopVal: number) => {
          if (yTopVal - yBottom < 0.04) return;
          const [wx0, pyTop] = toSecPx(uHit - halfThick, yTopVal);
          const [wx1, pyBot] = toSecPx(uHit + halfThick, yBottom);
          const wPx = Math.max(8, wx1 - wx0);
          ctx.fillStyle =
            paperTheme === 'architect-white' ? '#94a3b8' : '#0f172a';
          ctx.fillRect(wx0, pyTop, wPx, pyBot - pyTop);
          fillSectionHatch(wx0, pyTop, wPx, pyBot - pyTop, pal.wallFill);
          ctx.strokeStyle = pal.wallFill;
          ctx.lineWidth = 3.5;
          ctx.strokeRect(wx0, pyTop, wPx, pyBot - pyTop);
        };

        if (slicedOp) {
          // Draw sill wall below opening + lintel header wall above opening + glass/door line inside!
          drawWallSpanY(baseY, baseY + slicedOp.sillHeight);
          drawWallSpanY(
            baseY + slicedOp.sillHeight + slicedOp.height,
            baseY + w.height
          );
          const [gx, gyTop] = toSecPx(
            uHit,
            baseY + slicedOp.sillHeight + slicedOp.height
          );
          const [, gyBot] = toSecPx(uHit, baseY + slicedOp.sillHeight);
          ctx.strokeStyle = slicedOp.kind.startsWith('window')
            ? pal.windowColor
            : pal.doorColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(gx, gyTop);
          ctx.lineTo(gx, gyBot);
          ctx.stroke();
        } else {
          drawWallSpanY(baseY, baseY + w.height);
        }
      }
    }
  }

  // 6. Intersected Roof Section Profile (Rafters + Ridge + Ceiling Tie)
  for (const rf of archData.roofs) {
    const rq = computeSingleRoofQuantities(rf);
    const rfCenter = toUV(rf.center.x, rf.center.z);
    const spanU = (axis === 'x' ? rf.width : rf.depth) * 0.5 + rf.overhang;
    const spanV = (axis === 'x' ? rf.depth : rf.width) * 0.5 + rf.overhang;
    if (Math.abs(rfCenter.v - offsetMeters) > spanV + 0.25) continue;

    const u0 = rfCenter.u - spanU;
    const u1 = rfCenter.u + spanU;
    const topY = rf.baseY + rq.ridgeRiseM;
    const rafterThick = 0.16;

    const pitchedCross =
      rf.style !== 'flat' &&
      ((axis === 'x' && rf.ridgeAxis === 'z') ||
        (axis === 'z' && rf.ridgeAxis === 'x') ||
        rf.style === 'hip');

    ctx.beginPath();
    if (pitchedCross) {
      const uMid = (u0 + u1) * 0.5;
      const [pL0x, pL0y] = toSecPx(u0, rf.baseY);
      const [pMx, pMy] = toSecPx(uMid, topY);
      const [pR0x, pR0y] = toSecPx(u1, rf.baseY);
      const [pR1x, pR1y] = toSecPx(u1, rf.baseY - rafterThick);
      const [pM1x, pM1y] = toSecPx(uMid, topY - rafterThick);
      const [pL1x, pL1y] = toSecPx(u0, rf.baseY - rafterThick);
      ctx.moveTo(pL0x, pL0y);
      ctx.lineTo(pMx, pMy);
      ctx.lineTo(pR0x, pR0y);
      ctx.lineTo(pR1x, pR1y);
      ctx.lineTo(pM1x, pM1y);
      ctx.lineTo(pL1x, pL1y);
    } else {
      const [p0x, p0y] = toSecPx(u0, topY);
      const [p1x, p1y] = toSecPx(u1, topY);
      const [p2x, p2y] = toSecPx(u1, rf.baseY);
      const [p3x, p3y] = toSecPx(u0, rf.baseY);
      ctx.moveTo(p0x, p0y);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
    }
    ctx.closePath();
    ctx.fillStyle =
      paperTheme === 'architect-white'
        ? 'rgba(184, 93, 59, 0.34)'
        : 'rgba(217, 107, 67, 0.42)';
    ctx.strokeStyle = pal.wallFill;
    ctx.lineWidth = 3.5;
    ctx.fill();
    ctx.stroke();
  }

  // 7. Heavy Earth Ground Line + Subgrade Hatch
  ctx.fillStyle =
    paperTheme === 'architect-white'
      ? 'rgba(100, 116, 139, 0.14)'
      : 'rgba(148, 163, 184, 0.12)';
  ctx.fillRect(70, groundPxY, W - 140, 26);
  fillSectionHatch(70, groundPxY, W - 140, 26, pal.dimStroke);
  ctx.strokeStyle = pal.titlePrimary;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(70, groundPxY);
  ctx.lineTo(W - 70, groundPxY);
  ctx.stroke();

  // 8. Title Block
  const tbY = H - 166;
  const secTag = axis === 'x' ? "SECTION A–A' (CROSS)" : "SECTION B–B' (LONGITUDINAL)";
  const coordTag =
    axis === 'x'
      ? `Cut Plane Z = ${offsetMeters >= 0 ? '+' : ''}${offsetMeters.toFixed(2)}m`
      : `Cut Plane X = ${offsetMeters >= 0 ? '+' : ''}${offsetMeters.toFixed(2)}m`;

  ctx.fillStyle = pal.titleBg;
  ctx.strokeStyle = pal.frameStroke;
  ctx.lineWidth = 2.5;
  ctx.fillRect(42, tbY, W - 84, 124);
  ctx.strokeRect(42, tbY, W - 84, 124);

  ctx.textAlign = 'left';
  ctx.fillStyle = pal.titleAccent;
  ctx.font = '800 20px Inter, system-ui, sans-serif';
  ctx.fillText(
    sourceLabel
      ? `PERABOT ARCHITECTURAL SECTION · ${sourceLabel.toUpperCase()}`
      : 'PERABOT TRUE CUT-PLANE BUILDING SECTION',
    72,
    tbY + 38
  );
  ctx.fillStyle = pal.titlePrimary;
  ctx.font = '800 32px Inter, system-ui, sans-serif';
  ctx.fillText(`${projectName} — ${secTag}`, 72, tbY + 84);

  drawGraphicScaleBar(
    ctx,
    W * 0.54,
    tbY + 74,
    scale,
    pal.titlePrimary,
    pal.titleAccent
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = pal.titleSub;
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.fillText(`${coordTag} · Peak +${(maxY - 0.8).toFixed(2)}m`, W - 72, tbY + 68);

  const dataUrl = canvas.toDataURL('image/png');
  if (download) {
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const code = axis === 'x' ? 'Section_AA' : 'Section_BB';
    triggerDataUrlDownload(dataUrl, `${safeName}_${code}.png`);
  }
  return dataUrl;
}

export interface DoorWindowScheduleRow {
  mark: string;
  openingId: string;
  kind: ArchOpeningItem['kind'];
  widthM: number;
  heightM: number;
  sillHeightM: number;
  floorName: string;
  hostWallLabel: string;
  materialName: string;
}

/**
 * 4. Door & Window Schedule Generator (derived directly from live `archData.openings`)
 */
export function generateDoorWindowSchedule(params: {
  archData: ArchHouseData;
  floors: BuildingFloorLayer[];
  lang: AppLanguage;
}): DoorWindowScheduleRow[] {
  const { archData, floors, lang } = params;
  const catalog =
    archData.materialCatalog && archData.materialCatalog.length > 0
      ? archData.materialCatalog
      : createDefaultConstructionMaterialCatalog();
  const matMap = new Map(catalog.map((m) => [m.id, m]));
  const floorMap = new Map(floors.map((f) => [f.id, f.name]));

  let dIdx = 1;
  let wIdx = 1;
  let aIdx = 1;

  return archData.openings.map((op) => {
    const isDoor = op.kind.startsWith('door');
    const isWin = op.kind.startsWith('window');
    const mark = isDoor ? `D-${dIdx++}` : isWin ? `W-${wIdx++}` : `A-${aIdx++}`;
    const mat = op.openingMaterialId ? matMap.get(op.openingMaterialId) : undefined;
    const unassignedLabel =
      lang === 'ja' ? '未設定' : lang === 'en' ? 'Unassigned' : 'Belum dipilih';

    return {
      mark,
      openingId: op.id,
      kind: op.kind,
      widthM: op.width,
      heightM: op.height,
      sillHeightM: op.sillHeight,
      floorName: floorMap.get(op.floorId) ?? op.floorId,
      hostWallLabel: op.wallId.slice(0, 12),
      materialName: mat ? getMaterialDisplayName(mat, lang) : unassignedLabel,
    };
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 5. Printable HTML Architectural Package Exporter (Door/Window Schedule, Material Takeoff & Cost Report, Validation Summary)
 */
export function exportPrintableArchitecturalReportHTML(params: {
  projectName: string;
  sourceLabel: string;
  archData: ArchHouseData;
  floors: BuildingFloorLayer[];
  objects: SceneObjectData[];
  lang: AppLanguage;
  download?: boolean;
}): string {
  const {
    projectName,
    sourceLabel,
    archData,
    floors,
    objects,
    lang,
    download = true,
  } = params;

  const bundle = runIntegratedProjectAnalysis({
    archData,
    floors,
    objects,
    lang,
  });
  const schedule = generateDoorWindowSchedule({ archData, floors, lang });
  const fmtIDR = (n: number) =>
    `Rp ${Math.round(n).toLocaleString('id-ID')}`;

  const scheduleRowsHtml =
    schedule.length === 0
      ? `<tr><td colspan="7" style="text-align:center;color:#64748b;">No doors or windows placed yet.</td></tr>`
      : schedule
          .map(
            (r) => `<tr>
          <td><strong>${escapeHtml(r.mark)}</strong></td>
          <td>${escapeHtml(r.kind)}</td>
          <td>${r.widthM.toFixed(2)} × ${r.heightM.toFixed(2)} m</td>
          <td>+${r.sillHeightM.toFixed(2)} m</td>
          <td>${escapeHtml(r.floorName)}</td>
          <td><code>${escapeHtml(r.hostWallLabel)}</code></td>
          <td>${escapeHtml(r.materialName)}</td>
        </tr>`
          )
          .join('');

  const takeoffRowsHtml =
    bundle.takeoff.lineItems.length === 0
      ? `<tr><td colspan="7" style="text-align:center;color:#64748b;">No construction material quantities calculated yet.</td></tr>`
      : bundle.takeoff.lineItems
          .map(
            (li) => `<tr>
          <td>${escapeHtml(li.materialName)}${li.isApproximate ? ' <em>(Approx.)</em>' : ''}</td>
          <td>${escapeHtml(li.category)}</td>
          <td>${li.baseQuantity.toFixed(2)} ${escapeHtml(li.unit)}</td>
          <td>${li.wastePercentageApplied}%</td>
          <td><strong>${li.finalQuantity.toFixed(2)} ${escapeHtml(li.unit)}</strong>${
              li.secondaryEstimateNote ? `<br/><small>${escapeHtml(li.secondaryEstimateNote)}</small>` : ''
            }</td>
          <td>${li.unitPrice !== undefined ? fmtIDR(li.unitPrice) : '<em>Unpriced</em>'}</td>
          <td><strong>${li.subtotalCost !== null ? fmtIDR(li.subtotalCost) : '—'}</strong></td>
        </tr>`
          )
          .join('');

  const validationRowsHtml =
    bundle.validation.findings.length === 0
      ? `<tr><td colspan="4" style="text-align:center;color:#059669;">0 findings — no geometry or planning conflicts detected.</td></tr>`
      : bundle.validation.findings
          .map(
            (f) => `<tr>
          <td><strong>${escapeHtml(f.severity.toUpperCase())}</strong></td>
          <td>${escapeHtml(f.category)}</td>
          <td>${escapeHtml(f.title)}</td>
          <td>${escapeHtml(f.explanation)}</td>
        </tr>`
          )
          .join('');

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(projectName)} — Perabot Architectural Report</title>
<style>
  body { font-family: Inter, system-ui, -apple-system, sans-serif; color: #0f172a; margin: 32px auto; max-width: 1060px; padding: 0 20px; line-height: 1.5; }
  h1 { margin: 0 0 4px; font-size: 26px; }
  h2 { margin-top: 28px; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; font-size: 18px; color: #0369a1; }
  .meta { color: #475569; font-size: 13px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
  .card .lbl { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .card .val { font-size: 20px; font-weight: 800; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 700; }
  .notice { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #92400e; margin-top: 12px; }
  @media print { .no-print { display: none; } body { margin: 12px; } }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 16px;font-weight:700;cursor:pointer;">Print / Save as PDF</button>
  </div>
  <h1>${escapeHtml(projectName)}</h1>
  <div class="meta">Source: <strong>${escapeHtml(sourceLabel)}</strong> · Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · Perabot Architectural Studio</div>

  <div class="grid">
    <div class="card"><div class="lbl">Enclosed Floor Area</div><div class="val">${bundle.briefEval.totalFloorAreaSqm.toFixed(2)} m²</div></div>
    <div class="card"><div class="lbl">Rooms / Stories</div><div class="val">${bundle.detectedRooms.length} / ${bundle.occupiedStories}</div></div>
    <div class="card"><div class="lbl">Est. Material Cost</div><div class="val">${fmtIDR(bundle.takeoff.totalEstimatedMaterialCost)}</div></div>
    <div class="card"><div class="lbl">Validation Findings</div><div class="val">${bundle.validation.errorCount}E · ${bundle.validation.warningCount}W</div></div>
  </div>

  <h2>1. Door & Window Schedule (${schedule.length})</h2>
  <table>
    <thead><tr><th>Mark</th><th>Type</th><th>W × H</th><th>Sill</th><th>Floor</th><th>Host Wall</th><th>Construction Material</th></tr></thead>
    <tbody>${scheduleRowsHtml}</tbody>
  </table>

  <h2>2. Material Takeoff & Cost Estimate (Material-Only Scope)</h2>
  <table>
    <thead><tr><th>Material</th><th>Category</th><th>Base Qty</th><th>Waste</th><th>Final Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
    <tbody>${takeoffRowsHtml}</tbody>
  </table>
  <div class="notice">
    <strong>Scope & Assumptions Notice:</strong> ${bundle.takeoff.excludedScopeNotes.map(escapeHtml).join(' ')}
    ${
      bundle.takeoff.missingAssignments.length > 0
        ? `<br/><strong>Incomplete Coverage:</strong> ${bundle.takeoff.missingAssignments.length} element(s) currently have no construction material assigned.`
        : ''
    }
    ${
      bundle.takeoff.unpricedItems.length > 0
        ? `<br/><strong>Unpriced Items:</strong> ${bundle.takeoff.unpricedItems.length} material line(s) lack a unit price and are excluded from currency subtotals.`
        : ''
    }
  </div>

  <h2>3. Spatial & Design Validation Summary</h2>
  <table>
    <thead><tr><th>Severity</th><th>Category</th><th>Finding</th><th>Details</th></tr></thead>
    <tbody>${validationRowsHtml}</tbody>
  </table>
</body>
</html>`;

  if (download && typeof document !== 'undefined') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]+/g, '_');
    triggerDataUrlDownload(url, `${safeName}_Architectural_Report.html`);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  return html;
}
