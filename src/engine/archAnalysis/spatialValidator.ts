import {
  AppLanguage,
  ArchDetectedRoom,
  ArchHouseData,
  ArchOpeningItem,
  ArchWallSegment,
  BuildingFloorLayer,
  DesignValidationFinding,
  SceneObjectData,
  ValidationCategory,
  ValidationSeverity,
} from '../../types/studio';
import { ProjectBriefEvaluation } from './briefEvaluator';
import {
  calcWallCenterlineLength,
  SitePlacementMetrics,
} from './geometryMetrics';

export interface ValidationSummaryReport {
  findings: DesignValidationFinding[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  byCategory: Record<ValidationCategory, number>;
  evaluatedAt: number;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function pointToSegmentDist2D(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) return Math.hypot(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

/**
 * Deterministic, advisory-only Spatial & Design Validation Engine across all 5 categories.
 * Never blocks user edits, never flags normal L/T/X wall junctions, and never invents fake legal codes.
 */
export function evaluateSpatialValidation(params: {
  archData: ArchHouseData;
  floors: BuildingFloorLayer[];
  detectedRooms: ArchDetectedRoom[];
  objects: SceneObjectData[];
  briefEval: ProjectBriefEvaluation;
  siteMetrics: SitePlacementMetrics;
  lang: AppLanguage;
}): ValidationSummaryReport {
  const {
    archData,
    floors,
    detectedRooms,
    objects,
    briefEval,
    siteMetrics,
    lang,
  } = params;

  const findings: DesignValidationFinding[] = [];
  const seenIds = new Set<string>();

  const pushFinding = (f: DesignValidationFinding) => {
    if (seenIds.has(f.id)) return;
    seenIds.add(f.id);
    findings.push(f);
  };

  const wallMap = new Map<string, ArchWallSegment>();
  const wallLengths = new Map<string, number>();
  for (const w of archData.walls) {
    wallMap.set(w.id, w);
    wallLengths.set(w.id, calcWallCenterlineLength(w));
  }

  // =========================================================
  // A. GEOMETRY ERRORS & OVERLAPS
  // =========================================================
  for (const w of archData.walls) {
    const len = wallLengths.get(w.id) ?? 0;
    if (len < 0.25) {
      pushFinding({
        id: `geom_degen_wall_${w.id}`,
        ruleId: 'GEOM_DEGENERATE_WALL',
        category: 'geometry',
        severity: 'error',
        title:
          lang === 'ja'
            ? '極端に短い壁セグメント（< 0.25m）'
            : lang === 'en'
            ? 'Degenerate tiny wall segment (< 0.25m)'
            : 'Segmen tembok terlalu pendek (< 0,25 m)',
        explanation:
          lang === 'ja'
            ? `壁 (${len.toFixed(2)} m) が最小有効長 0.25 m 未満です。`
            : lang === 'en'
            ? `Wall length (${len.toFixed(2)} m) is below the 0.25 m minimum valid threshold.`
            : `Panjang tembok (${len.toFixed(2)} m) berada di bawah batas wajar 0,25 m.`,
        suggestion:
          lang === 'ja'
            ? '不要な微小壁を削除するか、端点を延長してください。'
            : lang === 'en'
            ? 'Remove this stray wall sliver or drag its endpoint to extend it.'
            : 'Hapus serpihan tembok ini atau tarik titik sudutnya agar lebih panjang.',
        relatedElementIds: [{ domain: 'wall', id: w.id, label: `${len.toFixed(2)}m` }],
        autoFix: { kind: 'delete-degenerate-wall', wallId: w.id },
      });
    }

    if (w.height < 0.35 || w.thickness < 0.04) {
      pushFinding({
        id: `geom_invalid_wall_dim_${w.id}`,
        ruleId: 'GEOM_INVALID_WALL_DIM',
        category: 'geometry',
        severity: 'error',
        title:
          lang === 'ja'
            ? '壁の高さまたは厚みが無効です'
            : lang === 'en'
            ? 'Invalid wall height or thickness'
            : 'Tinggi atau ketebalan tembok tidak valid',
        explanation: `H=${w.height.toFixed(2)}m, T=${w.thickness.toFixed(2)}m`,
        relatedElementIds: [{ domain: 'wall', id: w.id }],
      });
    }
  }

  // Collinear overlapping duplicate straight walls on the same floor (ignores normal endpoint junctions!)
  for (let i = 0; i < archData.walls.length; i++) {
    const a = archData.walls[i];
    if (Math.abs(a.curveBulge) >= 0.04) continue;
    const ax = a.end.x - a.start.x;
    const az = a.end.z - a.start.z;
    const lenA = Math.hypot(ax, az);
    if (lenA < 0.3) continue;
    const ux = ax / lenA;
    const uz = az / lenA;

    for (let j = i + 1; j < archData.walls.length; j++) {
      const b = archData.walls[j];
      if (b.floorId !== a.floorId || Math.abs(b.curveBulge) >= 0.04) continue;
      const bx = b.end.x - b.start.x;
      const bz = b.end.z - b.start.z;
      const lenB = Math.hypot(bx, bz);
      if (lenB < 0.3) continue;

      // Parallel check: |cross| / lenB < sin(3.5°)
      const cross = Math.abs(ux * bz - uz * bx) / lenB;
      if (cross > 0.06) continue;

      // Perpendicular offset between centerlines
      const relX = b.start.x - a.start.x;
      const relZ = b.start.z - a.start.z;
      const perpDist = Math.abs(relX * -uz + relZ * ux);
      if (perpDist > (a.thickness + b.thickness) * 0.42) continue;

      // Project B's endpoints onto A's axis [0, lenA]
      const sB0 = relX * ux + relZ * uz;
      const sB1 = (b.end.x - a.start.x) * ux + (b.end.z - a.start.z) * uz;
      const minB = Math.min(sB0, sB1);
      const maxB = Math.max(sB0, sB1);
      const overlap = Math.min(lenA, maxB) - Math.max(0, minB);

      // Strictly require > 0.22m interior body overlap so touching endpoints (overlap ≈ 0) are NEVER flagged!
      if (overlap > 0.22) {
        pushFinding({
          id: `geom_collinear_overlap_${a.id}_${b.id}`,
          ruleId: 'GEOM_OVERLAPPING_WALLS',
          category: 'geometry',
          severity: 'warning',
          title:
            lang === 'ja'
              ? '同一線上で重なり合う重複壁'
              : lang === 'en'
              ? 'Overlapping collinear wall segments'
              : 'Dua segmen tembok bertumpuk pada garis yang sama',
          explanation:
            lang === 'ja'
              ? `2つの壁が約 ${overlap.toFixed(2)} m 重複しています（材料集計が二重になる原因になります）。`
              : lang === 'en'
              ? `Two walls overlap along ${overlap.toFixed(2)} m, which can double material quantities.`
              : `Dua tembok bertumpuk sepanjang ${overlap.toFixed(2)} m sehingga dapat menggandakan hitungan material.`,
          suggestion:
            lang === 'ja'
              ? '重複している片方の壁を削除または調整してください。'
              : lang === 'en'
              ? 'Delete or trim one of the overlapping wall segments.'
              : 'Hapus atau rapikan salah satu segmen tembok yang bertumpuk.',
          relatedElementIds: [
            { domain: 'wall', id: a.id },
            { domain: 'wall', id: b.id },
          ],
        });
      }
    }
  }

  for (const rf of archData.roofs) {
    if (rf.width <= 0.2 || rf.depth <= 0.2) {
      pushFinding({
        id: `geom_invalid_roof_${rf.id}`,
        ruleId: 'GEOM_INVALID_ROOF',
        category: 'geometry',
        severity: 'error',
        title:
          lang === 'ja'
            ? '屋根寸法が無効です'
            : lang === 'en'
            ? 'Invalid roof footprint dimensions'
            : 'Dimensi atap tidak valid',
        explanation: `${rf.width.toFixed(2)} × ${rf.depth.toFixed(2)} m`,
        relatedElementIds: [{ domain: 'roof', id: rf.id, label: rf.name }],
      });
    }
  }

  // =========================================================
  // B. OPENING & WALL CONFLICTS (+ Safe Optional Auto-Fix!)
  // =========================================================
  const openingsByWall = new Map<string, ArchOpeningItem[]>();

  for (const op of archData.openings) {
    const wall = wallMap.get(op.wallId);
    if (!wall) {
      pushFinding({
        id: `open_orphan_${op.id}`,
        ruleId: 'OPENING_MISSING_HOST_WALL',
        category: 'opening-conflict',
        severity: 'error',
        title:
          lang === 'ja'
            ? 'ホスト壁が存在しないドア／窓'
            : lang === 'en'
            ? 'Opening has no valid host wall'
            : 'Pintu/jendela kehilangan tembok induk',
        explanation:
          lang === 'ja'
            ? 'この建具が参照する壁が見つかりません。'
            : lang === 'en'
            ? 'This opening references a wall ID that no longer exists.'
            : 'Bukaan ini merujuk pada ID tembok yang sudah tidak ada.',
        relatedElementIds: [{ domain: 'opening', id: op.id, label: op.kind }],
      });
      continue;
    }

    const list = openingsByWall.get(wall.id) ?? [];
    list.push(op);
    openingsByWall.set(wall.id, list);

    const wallLen = wallLengths.get(wall.id) ?? 0;
    const wallH =
      wall.style === 'half' ? Math.min(wall.height, 1.1) : wall.height;

    if (op.width <= 0.15 || op.height <= 0.15 || op.sillHeight < -0.001) {
      pushFinding({
        id: `open_invalid_dim_${op.id}`,
        ruleId: 'OPENING_INVALID_DIMENSIONS',
        category: 'opening-conflict',
        severity: 'error',
        title:
          lang === 'ja'
            ? '建具の寸法が無効です'
            : lang === 'en'
            ? 'Invalid opening width, height, or sill'
            : 'Ukuran lebar/tinggi bukaan tidak valid',
        explanation: `W=${op.width.toFixed(2)}m, H=${op.height.toFixed(2)}m`,
        relatedElementIds: [
          { domain: 'opening', id: op.id, label: op.kind },
          { domain: 'wall', id: wall.id },
        ],
      });
      continue;
    }

    const centerS = op.offsetRatio * wallLen;
    const leftEdge = centerS - op.width * 0.5;
    const rightEdge = centerS + op.width * 0.5;
    const topEdge = op.sillHeight + op.height;

    const outHoriz = leftEdge < 0.03 || rightEdge > wallLen - 0.03;
    const outVert = topEdge > wallH - 0.03;

    if (outHoriz || outVert) {
      // Compute safe clamped parameters so the user can fix in 1 click if desired
      const safeW = round3(Math.max(0.45, Math.min(op.width, wallLen - 0.16)));
      const safeH = round3(Math.max(0.45, Math.min(op.height, wallH - 0.12)));
      const safeSill = round3(
        Math.max(0, Math.min(op.sillHeight, wallH - safeH - 0.06))
      );
      const minRatio =
        wallLen > 0.2 ? Math.min(0.5, (safeW * 0.5 + 0.06) / wallLen) : 0.5;
      const maxRatio = Math.max(0.5, 1 - minRatio);
      const safeRatio = round3(
        Math.max(minRatio, Math.min(maxRatio, op.offsetRatio))
      );

      pushFinding({
        id: `open_bounds_${op.id}`,
        ruleId: outHoriz
          ? 'OPENING_EXCEEDS_WALL_LENGTH'
          : 'OPENING_EXCEEDS_WALL_HEIGHT',
        category: 'opening-conflict',
        severity: 'error',
        title: outHoriz
          ? lang === 'ja'
            ? 'ドア／窓が壁の端からはみ出しています'
            : lang === 'en'
            ? 'Opening extends past host wall ends'
            : 'Pintu/jendela melewati batas ujung tembok'
          : lang === 'ja'
          ? 'ドア／窓の上端が壁高を超えています'
          : lang === 'en'
          ? 'Opening top exceeds host wall height'
          : 'Tinggi bukaan melampaui tinggi tembok induk',
        explanation: outHoriz
          ? `${op.kind} (${op.width.toFixed(2)}m) vs Wall (${wallLen.toFixed(2)}m)`
          : `Sill+H (${topEdge.toFixed(2)}m) > Wall H (${wallH.toFixed(2)}m)`,
        suggestion:
          lang === 'ja'
            ? '建具の幅・位置を壁内に収める（自動調整ボタンも利用可能）。'
            : lang === 'en'
            ? 'Slide or resize the opening to fit inside its host wall (1-click clamp available).'
            : 'Geser atau sesuaikan ukuran bukaan agar pas di dalam tembok (tersedia tombol sesuaikan otomatis).',
        relatedElementIds: [
          { domain: 'opening', id: op.id, label: op.kind },
          { domain: 'wall', id: wall.id },
        ],
        autoFix:
          wallLen >= 0.6 && wallH >= 0.7
            ? {
                kind: 'clamp-opening-to-wall',
                openingId: op.id,
                nextOffsetRatio: safeRatio,
                nextWidth: safeW,
                nextHeight: safeH,
                nextSillHeight: safeSill,
              }
            : undefined,
      });
    }
  }

  // Overlapping openings on the same wall
  for (const [wallId, ops] of openingsByWall.entries()) {
    if (ops.length < 2) continue;
    const wallLen = wallLengths.get(wallId) ?? 0;
    for (let i = 0; i < ops.length; i++) {
      for (let j = i + 1; j < ops.length; j++) {
        const a = ops[i];
        const b = ops[j];
        const ca = a.offsetRatio * wallLen;
        const cb = b.offsetRatio * wallLen;
        const hOverlap =
          Math.min(ca + a.width * 0.5, cb + b.width * 0.5) -
          Math.max(ca - a.width * 0.5, cb - b.width * 0.5);
        const vOverlap =
          Math.min(a.sillHeight + a.height, b.sillHeight + b.height) -
          Math.max(a.sillHeight, b.sillHeight);
        if (hOverlap > 0.02 && vOverlap > 0.02) {
          pushFinding({
            id: `open_overlap_${a.id}_${b.id}`,
            ruleId: 'OPENING_OVERLAP_SAME_WALL',
            category: 'opening-conflict',
            severity: 'error',
            title:
              lang === 'ja'
                ? '同一壁上で建具同士が重なっています'
                : lang === 'en'
                ? 'Overlapping openings on the same wall'
                : 'Dua bukaan (pintu/jendela) bertabrakan di tembok yang sama',
            explanation: `${a.kind} & ${b.kind} (${hOverlap.toFixed(2)}m overlap)`,
            suggestion:
              lang === 'ja'
                ? '片方の建具をスライドさせるか削除してください。'
                : lang === 'en'
                ? 'Slide one opening along the wall or adjust widths.'
                : 'Geser salah satu bukaan di sepanjang tembok atau kecilkan lebarnya.',
            relatedElementIds: [
              { domain: 'opening', id: a.id, label: a.kind },
              { domain: 'opening', id: b.id, label: b.kind },
              { domain: 'wall', id: wallId },
            ],
          });
        }
      }
    }
  }

  // =========================================================
  // C. SPATIAL USABILITY WARNINGS
  // =========================================================
  // 1. Enclosed room without any door or archway access
  for (const room of detectedRooms) {
    if (room.areaSqm < 2.0) continue;
    const floorWalls = archData.walls.filter((w) => w.floorId === room.floorId);

    // Find walls bordering this room polygon
    const borderingWallIds = new Set<string>();
    for (const w of floorWalls) {
      if (w.style === 'half' || w.style === 'railing') {
        // Half-walls / railings are open-access partitions (e.g. balcony/kitchen bar)
        const midX = (w.start.x + w.end.x) * 0.5;
        const midZ = (w.start.z + w.end.z) * 0.5;
        for (let k = 0; k < room.polygon.length; k++) {
          const p0 = room.polygon[k];
          const p1 = room.polygon[(k + 1) % room.polygon.length];
          if (pointToSegmentDist2D(midX, midZ, p0.x, p0.z, p1.x, p1.z) < 0.22) {
            borderingWallIds.add(`__open_partition_${w.id}`);
          }
        }
        continue;
      }

      const midX = (w.start.x + w.end.x) * 0.5;
      const midZ = (w.start.z + w.end.z) * 0.5;
      for (let k = 0; k < room.polygon.length; k++) {
        const p0 = room.polygon[k];
        const p1 = room.polygon[(k + 1) % room.polygon.length];
        if (pointToSegmentDist2D(midX, midZ, p0.x, p0.z, p1.x, p1.z) < 0.22) {
          borderingWallIds.add(w.id);
          break;
        }
      }
    }

    const hasOpenPartition = Array.from(borderingWallIds).some((id) =>
      id.startsWith('__open_partition_')
    );
    const hasAccessDoor =
      hasOpenPartition ||
      archData.openings.some(
        (op) =>
          borderingWallIds.has(op.wallId) &&
          (op.kind.startsWith('door') || op.kind === 'archway')
      );

    if (!hasAccessDoor && borderingWallIds.size >= 3) {
      pushFinding({
        id: `usability_no_door_${room.id}`,
        ruleId: 'ROOM_NO_ACCESS_OPENING',
        category: 'spatial-usability',
        severity: 'warning',
        title:
          lang === 'ja'
            ? `部屋「${room.name}」に出入口（ドア／アーチ）がありません`
            : lang === 'en'
            ? `Room "${room.name}" has no door or archway access`
            : `Ruang "${room.name}" belum memiliki akses pintu / lengkung`,
        explanation:
          lang === 'ja'
            ? `四方を壁で囲まれた部屋（${room.areaSqm.toFixed(1)} m²）に出入口が配置されていません。`
            : lang === 'en'
            ? `Enclosed room (${room.areaSqm.toFixed(1)} m²) has no door or open archway on its perimeter walls.`
            : `Ruang tertutup (${room.areaSqm.toFixed(1)} m²) belum memiliki pintu atau bukaan akses pada dinding kelilingnya.`,
        suggestion:
          lang === 'ja'
            ? '「ドア・窓」ツールで境界壁にドアを追加してください。'
            : lang === 'en'
            ? 'Place a door or archway on one of the room perimeter walls.'
            : 'Pasang pintu atau lengkung (archway) pada salah satu dinding ruang ini.',
        relatedElementIds: [{ domain: 'room', id: room.id, label: room.name }],
      });
    }
  }

  // 2. Furniture / object blocking door swing zone
  for (const op of archData.openings) {
    if (!op.kind.startsWith('door')) continue;
    const wall = wallMap.get(op.wallId);
    if (!wall) continue;
    const fl = floors.find((f) => f.id === wall.floorId);
    const baseY = fl?.elevation ?? 0;

    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const len = Math.max(0.01, Math.hypot(dx, dz));
    const ux = dx / len;
    const uz = dz / len;
    const nx = -uz * (op.flipSwing ? -1 : 1);
    const nz = ux * (op.flipSwing ? -1 : 1);

    const cx = wall.start.x + dx * op.offsetRatio;
    const cz = wall.start.z + dz * op.offsetRatio;
    const swingRadius = op.kind === 'door-double' ? op.width * 0.55 : op.width * 0.85;
    const zoneCenterX = cx + nx * (swingRadius * 0.55 + wall.thickness * 0.5);
    const zoneCenterZ = cz + nz * (swingRadius * 0.55 + wall.thickness * 0.5);

    for (const obj of objects) {
      if (!obj.visible || obj.archRole === 'floor' || obj.archRole === 'roof') {
        continue;
      }
      // Check vertical floor match
      if (obj.position.y < baseY - 0.2 || obj.position.y > baseY + 2.1) continue;

      const objHalfR = Math.min(Math.abs(obj.scale.x), Math.abs(obj.scale.z)) * 0.42;
      const dist = Math.hypot(
        obj.position.x - zoneCenterX,
        obj.position.z - zoneCenterZ
      );
      if (dist < swingRadius * 0.5 + objHalfR) {
        pushFinding({
          id: `usability_door_block_${op.id}_${obj.id}`,
          ruleId: 'DOOR_SWING_OBSTRUCTED',
          category: 'spatial-usability',
          severity: 'warning',
          title:
            lang === 'ja'
              ? `ドアの開閉クリアランスに「${obj.name}」が干渉`
              : lang === 'en'
              ? `"${obj.name}" may obstruct door swing clearance`
              : `Objek "${obj.name}" berpotensi menghalangi ayunan pintu`,
          explanation:
            lang === 'ja'
              ? 'ドア開閉ゾーン内にオブジェクトが配置されています。'
              : lang === 'en'
              ? 'An object sits inside the estimated swing arc of this door.'
              : 'Posisi objek berada di area ayunan daun pintu.',
          suggestion:
            lang === 'ja'
              ? 'オブジェクトを移動するか、ドアの開き勝手を反転してください。'
              : lang === 'en'
              ? 'Move the object slightly or flip the door swing direction.'
              : 'Geser objek sedikit atau gunakan tombol Balik Arah ayunan pintu.',
          relatedElementIds: [
            { domain: 'opening', id: op.id, label: op.kind },
            { domain: 'object', id: obj.id, label: obj.name },
          ],
        });
      }
    }
  }

  // 3. Upper-floor walls exist without any staircase
  const upperWalls = archData.walls.filter((w) => {
    const fl = floors.find((f) => f.id === w.floorId);
    return fl && fl.elevation >= 1.5;
  });
  if (upperWalls.length > 0 && archData.stairs.length === 0) {
    pushFinding({
      id: 'usability_upper_floor_no_stair',
      ruleId: 'UPPER_FLOOR_MISSING_STAIR',
      category: 'spatial-usability',
      severity: 'warning',
      title:
        lang === 'ja'
          ? '上階がありますが階段が配置されていません'
          : lang === 'en'
          ? 'Upper floor has walls/rooms without a staircase'
          : 'Lantai atas memiliki ruang/tembok tetapi belum ada tangga',
      explanation:
        lang === 'ja'
          ? '上階への縦動線（階段）がまだモデル内にありません。'
          : lang === 'en'
          ? 'Vertical circulation between stories has not been placed yet.'
          : 'Sirkulasi vertikal (tangga) antar lantai belum ditempatkan.',
      suggestion:
        lang === 'ja'
          ? '「階段」ツールから直階段・L字階段・螺旋階段を追加できます。'
          : lang === 'en'
          ? 'Use the Stairs tool to add a straight, L-shaped, or spiral stair.'
          : 'Gunakan menu Tangga untuk menambahkan tangga lurus, L, atau putar.',
      relatedElementIds: [{ domain: 'wall', id: upperWalls[0].id }],
    });
  }

  // =========================================================
  // D. PROJECT REQUIREMENT FINDINGS (Separated from Geometry!)
  // =========================================================
  for (const res of briefEval.results) {
    if (res.status !== 'unmet' && res.status !== 'review') continue;
    const sev: ValidationSeverity =
      res.item.kind === 'required' && res.status === 'unmet'
        ? 'warning'
        : 'info';

    pushFinding({
      id: `brief_req_${res.item.id}`,
      ruleId: 'BRIEF_REQUIREMENT_GAP',
      category: 'project-requirement',
      severity: sev,
      title:
        lang === 'ja'
          ? `ブリーフ目標未達: ${res.item.label}`
          : lang === 'en'
          ? `Brief target pending: ${res.item.label}`
          : `Target Brief belum terpenuhi: ${res.item.label}`,
      explanation: `${res.actualSummary} (Target: ${res.targetSummary})`,
      suggestion:
        res.undersizedRoomIds.length > 0
          ? lang === 'ja'
            ? '対象の部屋の面積を広げるか、目標値を見直してください。'
            : lang === 'en'
            ? 'Expand the undersized room walls or adjust the brief target.'
            : 'Perluas dinding ruang terkait atau sesuaikan angka target pada Brief.'
          : undefined,
      relatedElementIds:
        res.undersizedRoomIds.length > 0
          ? res.undersizedRoomIds.map((rid) => ({ domain: 'room', id: rid }))
          : res.matchedRoomIds.length > 0
          ? res.matchedRoomIds.map((rid) => ({ domain: 'room', id: rid }))
          : [{ domain: 'brief', id: res.item.id, label: res.item.label }],
    });
  }

  if (
    briefEval.unassignedRooms.length > 0 &&
    briefEval.results.some((r) => r.item.metric === 'room-count')
  ) {
    pushFinding({
      id: 'brief_unassigned_rooms',
      ruleId: 'BRIEF_AMBIGUOUS_ROOM_TYPES',
      category: 'project-requirement',
      severity: 'info',
      title:
        lang === 'ja'
          ? `${briefEval.unassignedRooms.length} 室の部屋種別が未割り当てです`
          : lang === 'en'
          ? `${briefEval.unassignedRooms.length} room(s) need explicit room-type assignment`
          : `${briefEval.unassignedRooms.length} ruang belum dikategorikan jenis fungsinya`,
      explanation:
        lang === 'ja'
          ? '「Ruang 1」などの汎用名の部屋は、寝室・浴室などの種別を選択するとブリーフ集計に反映されます。'
          : lang === 'en'
          ? 'Assigning room types (Bedroom, Bathroom, Kitchen, etc.) lets Brief evaluation count them accurately.'
          : 'Pilih kategori ruang (Kamar Tidur, Kamar Mandi, Dapur, dll.) agar dihitung otomatis dalam Brief.',
      relatedElementIds: briefEval.unassignedRooms.map((r) => ({
        domain: 'room',
        id: r.id,
        label: r.name,
      })),
    });
  }

  // =========================================================
  // E. SITE-RELATED FINDINGS (User-Defined Setbacks Only!)
  // =========================================================
  if (siteMetrics.siteEnabled && siteMetrics.footprint.hasBuilding) {
    if (!siteMetrics.withinSiteBoundary) {
      pushFinding({
        id: 'site_boundary_exceeded',
        ruleId: 'SITE_BOUNDARY_EXCEEDED',
        category: 'site-planning',
        severity: 'error',
        title:
          lang === 'ja'
            ? '建物フットプリントが敷地境界線を越えています'
            : lang === 'en'
            ? 'Building footprint crosses outside the site boundary'
            : 'Jejak bangunan melewati batas lahan tapak',
        explanation:
          lang === 'ja'
            ? '建物の一部が設定された敷地外にはみ出しています。'
            : lang === 'en'
            ? 'One or more building edges extend past the defined plot boundary.'
            : 'Sebagian dinding/struktur bangunan melampaui garis batas lahan.',
        suggestion:
          lang === 'ja'
            ? '「敷地計画」タブで建物位置を移動するか、敷地寸法を広げてください。'
            : lang === 'en'
            ? 'Shift the building within the site or enlarge plot dimensions in the Site tab.'
            : 'Geser posisi bangunan ke dalam lahan atau perbesar ukuran lahan di tab Tapak.',
        relatedElementIds: [{ domain: 'site', id: 'site_boundary' }],
      });
    } else if (
      archData.site?.setbacksEnabled &&
      !siteMetrics.setbacksSatisfied.all
    ) {
      const violatedSides: string[] = [];
      const sb = archData.site.setbacks;
      const d = siteMetrics.distancesToBoundary;
      if (!siteMetrics.setbacksSatisfied.front && d.front !== null) {
        violatedSides.push(`Front ${d.front.toFixed(2)}m < ${sb.front}m`);
      }
      if (!siteMetrics.setbacksSatisfied.rear && d.rear !== null) {
        violatedSides.push(`Rear ${d.rear.toFixed(2)}m < ${sb.rear}m`);
      }
      if (!siteMetrics.setbacksSatisfied.left && d.left !== null) {
        violatedSides.push(`Left ${d.left.toFixed(2)}m < ${sb.left}m`);
      }
      if (!siteMetrics.setbacksSatisfied.right && d.right !== null) {
        violatedSides.push(`Right ${d.right.toFixed(2)}m < ${sb.right}m`);
      }

      pushFinding({
        id: 'site_setback_encroachment',
        ruleId: 'SITE_USER_SETBACK_VIOLATION',
        category: 'site-planning',
        severity: 'warning',
        title:
          lang === 'ja'
            ? 'ユーザー設定のセットバック線（壁面後退）に干渉'
            : lang === 'en'
            ? 'Building encroaches into user-defined site setbacks'
            : 'Bangunan melewati garis sempadan kustom pengguna',
        explanation: `${violatedSides.join(' · ')} (${
          lang === 'ja'
            ? '※法的建築基準ではなくユーザー定義の目安値です'
            : lang === 'en'
            ? 'User-defined planning setback, not municipal legal code'
            : 'Garis sempadan perencanaan pengguna, bukan klaim regulasi hukum daerah'
        })`,
        suggestion:
          lang === 'ja'
            ? '建物を敷地内でシフトするか、セットバック設定値を調整してください。'
            : lang === 'en'
            ? 'Nudge building position on the site or adjust your custom setback distances.'
            : 'Geser posisi bangunan di tapak atau sesuaikan jarak sempadan kustom Anda.',
        relatedElementIds: [{ domain: 'site', id: 'site_setbacks' }],
      });
    }
  }

  // Outdoor zones outside site bounds
  if (archData.site?.enabled) {
    const halfW = archData.site.width * 0.5;
    const halfD = archData.site.depth * 0.5;
    const sc = archData.site.center;
    for (const z of archData.site.outdoorZones) {
      const outX =
        z.center.x - z.width * 0.5 < sc.x - halfW - 0.05 ||
        z.center.x + z.width * 0.5 > sc.x + halfW + 0.05;
      const outZ =
        z.center.z - z.depth * 0.5 < sc.z - halfD - 0.05 ||
        z.center.z + z.depth * 0.5 > sc.z + halfD + 0.05;
      if (outX || outZ) {
        pushFinding({
          id: `site_zone_out_${z.id}`,
          ruleId: 'SITE_OUTDOOR_ZONE_OUTSIDE',
          category: 'site-planning',
          severity: 'warning',
          title:
            lang === 'ja'
              ? `屋外ゾーン「${z.name}」が敷地外にはみ出しています`
              : lang === 'en'
              ? `Outdoor zone "${z.name}" extends past site boundary`
              : `Zona luar "${z.name}" melewati batas lahan`,
          explanation: `${z.width.toFixed(1)} × ${z.depth.toFixed(1)} m`,
          relatedElementIds: [{ domain: 'site', id: z.id, label: z.name }],
        });
      }
    }
  }

  const byCategory: Record<ValidationCategory, number> = {
    geometry: 0,
    'opening-conflict': 0,
    'spatial-usability': 0,
    'project-requirement': 0,
    'site-planning': 0,
  };
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const f of findings) {
    byCategory[f.category]++;
    if (f.severity === 'error') errorCount++;
    else if (f.severity === 'warning') warningCount++;
    else infoCount++;
  }

  return {
    findings,
    errorCount,
    warningCount,
    infoCount,
    byCategory,
    evaluatedAt: Date.now(),
  };
}
