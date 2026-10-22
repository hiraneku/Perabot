import {
  ArchDetectedRoom,
  ArchHouseData,
  BuildingFloorLayer,
} from '../types/studio';
import { computeWallLength } from './ArchBuilderEngine';

export function exportFloorBlueprintPNG(params: {
  projectName: string;
  floor: BuildingFloorLayer;
  archData: ArchHouseData;
  detectedRooms: ArchDetectedRoom[];
}): void {
  const { projectName, floor, archData, detectedRooms } = params;
  const floorWalls = archData.walls.filter((w) => w.floorId === floor.id);
  const floorOpenings = archData.openings.filter((o) => o.floorId === floor.id);
  const floorStairs = archData.stairs.filter((s) => s.floorId === floor.id);
  const floorRooms = detectedRooms.filter((r) => r.floorId === floor.id);

  const W = 1800;
  const H = 1320;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Crisp Architectural Drafting Sheet Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  // Compute plan bounding box in world meters
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
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.z, w.end.z);
      maxZ = Math.max(maxZ, w.start.z, w.end.z);
    }
    const pad = 2.2;
    minX -= pad;
    maxX += pad;
    minZ -= pad;
    maxZ += pad;
  }

  const drawLeft = 80;
  const drawTop = 90;
  const drawW = W - 160;
  const drawH = H - 250;

  const spanX = Math.max(4, maxX - minX);
  const spanZ = Math.max(4, maxZ - minZ);
  const pxPerMeter = Math.min(drawW / spanX, drawH / spanZ);
  const centerWorldX = (minX + maxX) * 0.5;
  const centerWorldZ = (minZ + maxZ) * 0.5;
  const centerPxX = drawLeft + drawW * 0.5;
  const centerPxY = drawTop + drawH * 0.5;

  const toPx = (wx: number, wz: number): [number, number] => [
    centerPxX + (wx - centerWorldX) * pxPerMeter,
    centerPxY + (wz - centerWorldZ) * pxPerMeter,
  ];

  // 2. Subtle 1.0m & 0.5m CAD Blueprint Grid inside sheet frame
  ctx.save();
  ctx.beginPath();
  ctx.rect(drawLeft, drawTop, drawW, drawH);
  ctx.clip();

  const gStartX = Math.floor(minX) - 2;
  const gEndX = Math.ceil(maxX) + 2;
  const gStartZ = Math.floor(minZ) - 2;
  const gEndZ = Math.ceil(maxZ) + 2;

  for (let gx = gStartX; gx <= gEndX; gx += 0.5) {
    const [px] = toPx(gx, 0);
    const isMajor = Math.abs(gx - Math.round(gx)) < 0.01;
    ctx.strokeStyle = isMajor
      ? 'rgba(56, 189, 248, 0.14)'
      : 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = isMajor ? 1.2 : 0.8;
    ctx.beginPath();
    ctx.moveTo(px, drawTop);
    ctx.lineTo(px, drawTop + drawH);
    ctx.stroke();
  }
  for (let gz = gStartZ; gz <= gEndZ; gz += 0.5) {
    const [, py] = toPx(0, gz);
    const isMajor = Math.abs(gz - Math.round(gz)) < 0.01;
    ctx.strokeStyle = isMajor
      ? 'rgba(56, 189, 248, 0.14)'
      : 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = isMajor ? 1.2 : 0.8;
    ctx.beginPath();
    ctx.moveTo(drawLeft, py);
    ctx.lineTo(drawLeft + drawW, py);
    ctx.stroke();
  }

  // 3. Draw Detected Room Polygons & Area Fill
  for (const room of floorRooms) {
    if (room.polygon.length < 3) continue;
    ctx.beginPath();
    room.polygon.forEach((pt, idx) => {
      const [px, py] = toPx(pt.x, pt.z);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = `${room.floorColor}38`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(110, 231, 183, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 4. Draw Stairs with Architectural Tread Lines + Direction Arrow
  for (const st of floorStairs) {
    const [sx, sy] = toPx(st.position.x, st.position.z);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate((-st.rotationY * Math.PI) / 180);
    const pw = st.width * pxPerMeter;
    const pl = st.runLength * pxPerMeter;
    ctx.fillStyle = 'rgba(183, 121, 70, 0.28)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.fillRect(-pw * 0.5, -pl * 0.5, pw, pl);
    ctx.strokeRect(-pw * 0.5, -pl * 0.5, pw, pl);

    const treads = 12;
    for (let i = 1; i < treads; i++) {
      const ty = -pl * 0.5 + (i / treads) * pl;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.5, ty);
      ctx.lineTo(pw * 0.5, ty);
      ctx.stroke();
    }
    // UP arrow
    ctx.strokeStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(0, pl * 0.35);
    ctx.lineTo(0, -pl * 0.35);
    ctx.lineTo(-8, -pl * 0.35 + 12);
    ctx.moveTo(0, -pl * 0.35);
    ctx.lineTo(8, -pl * 0.35 + 12);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Draw Walls + Door Swing Arcs + Window Symbols + Dimension Callouts
  for (const w of floorWalls) {
    const [x0, y0] = toPx(w.start.x, w.start.z);
    const [x1, y1] = toPx(w.end.x, w.end.z);
    const wallPxThick = Math.max(5, w.thickness * pxPerMeter);

    ctx.strokeStyle = w.style === 'railing' ? '#94a3b8' : '#f8fafc';
    ctx.lineWidth = wallPxThick;
    ctx.lineCap = 'square';
    ctx.beginPath();
    if (Math.abs(w.curveBulge) >= 0.04) {
      const dx = w.end.x - w.start.x;
      const dz = w.end.z - w.start.z;
      const len = Math.max(0.01, Math.hypot(dx, dz));
      const nx = -dz / len;
      const nz = dx / len;
      const [cx, cy] = toPx(
        (w.start.x + w.end.x) * 0.5 + nx * w.curveBulge * 2,
        (w.start.z + w.end.z) * 0.5 + nz * w.curveBulge * 2
      );
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
    } else {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();

    // Openings on this wall (CAD Door Arcs & Window Symbols)
    const wallOps = floorOpenings.filter((o) => o.wallId === w.id);
    for (const op of wallOps) {
      const ox = x0 + (x1 - x0) * op.offsetRatio;
      const oy = y0 + (y1 - y0) * op.offsetRatio;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const opPxW = op.width * pxPerMeter;

      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(ang);

      // Clear wall behind opening
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(
        -opPxW * 0.5,
        -wallPxThick * 0.65,
        opPxW,
        wallPxThick * 1.3
      );

      if (op.kind === 'door-single' || op.kind === 'door-double') {
        const swingSign = op.flipSwing ? -1 : 1;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        if (op.kind === 'door-single') {
          ctx.beginPath();
          ctx.moveTo(-opPxW * 0.5, 0);
          ctx.lineTo(-opPxW * 0.5, swingSign * opPxW);
          ctx.stroke();
          ctx.beginPath();
          ctx.setLineDash([5, 4]);
          ctx.arc(
            -opPxW * 0.5,
            0,
            opPxW,
            0,
            swingSign * Math.PI * 0.5,
            swingSign < 0
          );
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const hw = opPxW * 0.5;
          ctx.beginPath();
          ctx.moveTo(-hw, 0);
          ctx.lineTo(-hw, swingSign * hw);
          ctx.moveTo(hw, 0);
          ctx.lineTo(hw, swingSign * hw);
          ctx.stroke();
        }
      } else if (op.kind !== 'archway') {
        // Double-line CAD window symbol
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          -opPxW * 0.5,
          -wallPxThick * 0.35,
          opPxW,
          wallPxThick * 0.7
        );
        ctx.beginPath();
        ctx.moveTo(-opPxW * 0.5, 0);
        ctx.lineTo(opPxW * 0.5, 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Wall Length Dimension Callout
    const lenM = computeWallLength(w);
    if (lenM >= 0.5) {
      const mx = (x0 + x1) * 0.5;
      const my = (y0 + y1) * 0.5;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const segPx = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / segPx;
      const ny = dx / segPx;
      const lx = mx + nx * (wallPxThick * 0.5 + 18);
      const ly = my + ny * (wallPxThick * 0.5 + 18);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(lx - 34, ly - 11, 68, 22);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${lenM.toFixed(2)}m`, lx, ly);
    }
  }

  // 6. Room Name & Area m² Labels on Top
  for (const room of floorRooms) {
    const [cx, cy] = toPx(room.centroid.x, room.centroid.z);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cx - 72, cy - 24, 144, 48, 10);
    } else {
      ctx.rect(cx - 72, cy - 24, 144, 48);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 15px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.name, cx, cy - 7);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '700 14px Inter, system-ui, sans-serif';
    ctx.fillText(`${room.areaSqm.toFixed(1)} m²`, cx, cy + 12);
  }

  ctx.restore();

  // Sheet Border & Compass Rose
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(drawLeft, drawTop, drawW, drawH);

  // Compass North Indicator (top-right inside sheet)
  const compX = drawLeft + drawW - 56;
  const compY = drawTop + 56;
  ctx.save();
  ctx.translate(compX, compY);
  ctx.rotate((archData.sun.northDeg * Math.PI) / 180);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(-7, 6);
  ctx.lineTo(0, 1);
  ctx.lineTo(7, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -32);
  ctx.restore();

  // Architectural Title Block Footer
  const totalArea = floorRooms.reduce((s, r) => s + r.areaSqm, 0);
  const totalWallLen = floorWalls.reduce((s, w) => s + computeWallLength(w), 0);
  const footerY = H - 132;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.fillRect(drawLeft, footerY, drawW, 92);
  ctx.strokeRect(drawLeft, footerY, drawW, 92);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `${projectName} — ${floor.name}`,
    drawLeft + 26,
    footerY + 36
  );

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 16px Inter, system-ui, sans-serif';
  ctx.fillText(
    `PERABOT ARCHITECTURAL BLUEPRINT · Elev +${floor.elevation.toFixed(2)}m`,
    drawLeft + 26,
    footerY + 66
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#6ee7b7';
  ctx.font = '700 22px Inter, system-ui, sans-serif';
  ctx.fillText(
    `${totalArea.toFixed(1)} m²  (${floorRooms.length} Rooms)`,
    drawLeft + drawW - 26,
    footerY + 36
  );
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 15px Inter, system-ui, sans-serif';
  ctx.fillText(
    `Walls: ${totalWallLen.toFixed(1)}m · Scale Grid: 1.0m`,
    drawLeft + drawW - 26,
    footerY + 66
  );

  // Trigger download
  const safeName = projectName
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 40) || 'denah_rumah';
  const link = document.createElement('a');
  link.download = `${safeName}_${floor.id}_blueprint.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
