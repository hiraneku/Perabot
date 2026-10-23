import {
  AppLanguage,
  ArchDetectedRoom,
  ArchHouseData,
  BuildingFloorLayer,
  ConstructionMaterialCategory,
  ConstructionMaterialDef,
  MaterialUnitKind,
  ProjectBudgetTarget,
  SceneObjectData,
} from '../../types/studio';
import {
  computeSingleRoofQuantities,
  computeSingleWallQuantities,
} from './geometryMetrics';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Default Illustrative Construction Material Catalog (IDR baseline, user-editable).
 * All default entries are explicitly labeled `sourceKind: 'catalog-illustrative'`.
 */
export function createDefaultConstructionMaterialCatalog(): ConstructionMaterialDef[] {
  return [
    {
      id: 'mat_brick_masonry',
      name: {
        id: 'Pasangan Bata Merah / Bata Ringan',
        en: 'Brick / AAC Block Masonry',
        ja: 'レンガ・ALC組積壁',
      },
      category: 'masonry',
      unit: 'm2',
      unitPrice: 165_000,
      currency: 'IDR',
      wastePercentage: 5,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_concrete_struct',
      name: {
        id: 'Beton Bertulang Struktural (K-250)',
        en: 'Reinforced Structural Concrete',
        ja: '鉄筋コンクリート構造体',
      },
      category: 'structure',
      unit: 'm3',
      unitPrice: 1_250_000,
      currency: 'IDR',
      wastePercentage: 3,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_plaster_render',
      name: {
        id: 'Plester & Acian Semen Halus',
        en: 'Cement Plaster & Skim Coat',
        ja: 'セメント左官塗り仕上げ',
      },
      category: 'finish-wall',
      unit: 'm2',
      unitPrice: 78_000,
      currency: 'IDR',
      wastePercentage: 5,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_paint_interior',
      name: {
        id: 'Cat Tembok Interior Akrilik',
        en: 'Interior Acrylic Wall Paint',
        ja: '内装アクリル塗装',
      },
      category: 'finish-wall',
      unit: 'm2',
      unitPrice: 38_000,
      currency: 'IDR',
      wastePercentage: 7,
      supportsWaste: true,
      coveragePerUnit: 10, // ~10 m² per Liter (2 coats)
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_paint_exterior',
      name: {
        id: 'Cat Eksterior Tahan Cuaca',
        en: 'Weatherproof Exterior Paint',
        ja: '耐候性外装塗装',
      },
      category: 'finish-wall',
      unit: 'm2',
      unitPrice: 52_000,
      currency: 'IDR',
      wastePercentage: 7,
      supportsWaste: true,
      coveragePerUnit: 9, // ~9 m² per Liter (2 coats)
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_floor_ceramic',
      name: {
        id: 'Keramik / Granit Lantai 60×60',
        en: 'Porcelain / Ceramic Floor Tile 60×60',
        ja: '磁器質床タイル 60×60',
      },
      category: 'flooring',
      unit: 'm2',
      unitPrice: 195_000,
      currency: 'IDR',
      wastePercentage: 8,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_floor_parquet',
      name: {
        id: 'Parket Kayu / SPC Flooring',
        en: 'Engineered Wood / SPC Parquet',
        ja: '木質フローリング・SPC床材',
      },
      category: 'flooring',
      unit: 'm2',
      unitPrice: 265_000,
      currency: 'IDR',
      wastePercentage: 8,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_ceiling_gypsum',
      name: {
        id: 'Plafon Gypsum + Rangka Hollow',
        en: 'Gypsum Ceiling Board & Framing',
        ja: '石膏ボード天井＋軽量鉄骨下地',
      },
      category: 'finish-wall',
      unit: 'm2',
      unitPrice: 125_000,
      currency: 'IDR',
      wastePercentage: 6,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_roof_terracotta',
      name: {
        id: 'Genteng Keramik / Terakota + Rangka Baja Ringan',
        en: 'Ceramic Roof Tile + Light Steel Truss',
        ja: '陶器瓦＋軽量鉄骨小屋組',
      },
      category: 'roofing',
      unit: 'm2',
      unitPrice: 285_000,
      currency: 'IDR',
      wastePercentage: 7,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_roof_metal',
      name: {
        id: 'Atap Lembaran Metal / Spandek Pasir',
        en: 'Standing-Seam / Coated Metal Roofing',
        ja: 'ガルバリウム鋼板屋根',
      },
      category: 'roofing',
      unit: 'm2',
      unitPrice: 210_000,
      currency: 'IDR',
      wastePercentage: 6,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_roof_slab',
      name: {
        id: 'Dak Beton Atap Datar + Waterproofing',
        en: 'Flat Concrete Roof Slab + Waterproofing',
        ja: 'RC陸屋根スラブ＋防水層',
      },
      category: 'roofing',
      unit: 'm3',
      unitPrice: 1_450_000,
      currency: 'IDR',
      wastePercentage: 4,
      supportsWaste: true,
      thicknessAssumptionM: 0.14,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_door_wood',
      name: {
        id: 'Unit Pintu Kayu Solid + Kusen & Engsel',
        en: 'Solid Timber Door Unit & Frame',
        ja: '木製ドア枠セット一式',
      },
      category: 'openings',
      unit: 'pcs',
      unitPrice: 2_350_000,
      currency: 'IDR',
      wastePercentage: 0,
      supportsWaste: false,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_window_alu_glass',
      name: {
        id: 'Unit Jendela Aluminium + Kaca Tempered',
        en: 'Aluminum Frame + Tempered Glass Window',
        ja: 'アルミサッシ＋強化ガラス窓',
      },
      category: 'openings',
      unit: 'pcs',
      unitPrice: 1_750_000,
      currency: 'IDR',
      wastePercentage: 0,
      supportsWaste: false,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_timber_framing',
      name: {
        id: 'Kayu Konstruksi / Decking Eksterior',
        en: 'Structural Timber / Exterior Decking',
        ja: '構造用木材・外部ウッドデッキ',
      },
      category: 'outdoor',
      unit: 'm2',
      unitPrice: 340_000,
      currency: 'IDR',
      wastePercentage: 8,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
    {
      id: 'mat_outdoor_paving',
      name: {
        id: 'Paving Block / Batu Alam Tapak Luar',
        en: 'Outdoor Concrete Paver / Natural Stone',
        ja: '外部インターロッキング・自然石舗装',
      },
      category: 'outdoor',
      unit: 'm2',
      unitPrice: 160_000,
      currency: 'IDR',
      wastePercentage: 6,
      supportsWaste: true,
      priceSource: 'Illustrative residential catalog',
      priceDate: '2026',
      sourceKind: 'catalog-illustrative',
    },
  ];
}

export function getMaterialDisplayName(
  mat: ConstructionMaterialDef,
  lang: AppLanguage
): string {
  if (mat.customName && mat.customName.trim().length > 0) {
    return mat.customName.trim();
  }
  return mat.name[lang] || mat.name.en;
}

export interface TakeoffLineItem {
  materialId: string;
  materialName: string;
  category: ConstructionMaterialCategory;
  unit: MaterialUnitKind;
  baseQuantity: number;
  wastePercentageApplied: number;
  finalQuantity: number;
  secondaryEstimateNote?: string; // e.g. "~24.5 L (10 m²/L)"
  unitPrice?: number;
  subtotalCost: number | null; // null when unpriced!
  isUnpriced: boolean;
  isApproximate: boolean;
  sourceKind: ConstructionMaterialDef['sourceKind'];
  contributingElementCount: number;
}

export interface MissingMaterialAssignment {
  domain: 'wall' | 'room-floor' | 'roof' | 'opening' | 'stair' | 'modular-object';
  elementId: string;
  elementLabel: string;
  floorId?: string;
  roleDescription: string;
  metricSummary: string;
}

export interface FloorCostBreakdown {
  floorId: string;
  floorName: string;
  subtotalCost: number;
  elementCount: number;
}

export interface BudgetComparisonSummary {
  enabled: boolean;
  targetAmount: number;
  scope: ProjectBudgetTarget['scope'];
  estimatedMaterialCost: number;
  differenceAmount: number; // positive = remaining head-room, negative = over target
  ratioPercent: number;
  scopeMismatchWarning: boolean;
  hasIncompleteCoverage: boolean;
}

export interface MaterialTakeoffReport {
  lineItems: TakeoffLineItem[];
  byCategory: Record<ConstructionMaterialCategory, number>;
  byFloor: FloorCostBreakdown[];
  totalEstimatedMaterialCost: number;
  missingAssignments: MissingMaterialAssignment[];
  unpricedItems: TakeoffLineItem[];
  approximateNotes: string[];
  excludedScopeNotes: string[];
  budgetComparison: BudgetComparisonSummary | null;
  geometryTotals: {
    wallNetSingleSideAreaSqm: number;
    wallDeductedOpeningsSqm: number;
    floorRoomAreaSqm: number;
    roofSlopedAreaSqm: number;
    doorCount: number;
    windowCount: number;
  };
}

/**
 * Computes deterministic, real-time Material Quantity Takeoff & Cost Estimate directly from
 * shared building geometry and explicit construction material assignments.
 * Visual color/pattern fields (`exteriorColor`, `interiorColor`, `floorColor`, `proceduralPattern`)
 * are NEVER consulted here!
 */
export function evaluateMaterialTakeoff(params: {
  archData: ArchHouseData;
  floors: BuildingFloorLayer[];
  detectedRooms: ArchDetectedRoom[];
  objects: SceneObjectData[];
  lang: AppLanguage;
}): MaterialTakeoffReport {
  const { archData, floors, detectedRooms, objects, lang } = params;
  const catalog =
    archData.materialCatalog && archData.materialCatalog.length > 0
      ? archData.materialCatalog
      : createDefaultConstructionMaterialCatalog();

  const matMap = new Map<string, ConstructionMaterialDef>();
  for (const m of catalog) matMap.set(m.id, m);

  interface Accumulator {
    mat: ConstructionMaterialDef;
    baseQty: number;
    count: number;
    approx: boolean;
  }
  const accum = new Map<string, Accumulator>();
  const floorCosts = new Map<string, { cost: number; count: number }>();
  for (const fl of floors) {
    floorCosts.set(fl.id, { cost: 0, count: 0 });
  }

  const missingAssignments: MissingMaterialAssignment[] = [];
  const approximateNotesSet = new Set<string>();

  const addContribution = (
    matId: string | undefined,
    floorId: string | undefined,
    qtyForUnit: (unit: MaterialUnitKind, mat: ConstructionMaterialDef) => number,
    isApprox = false
  ) => {
    if (!matId) return false;
    const mat = matMap.get(matId);
    if (!mat) return false;
    const rawQty = Math.max(0, qtyForUnit(mat.unit, mat));
    if (rawQty <= 1e-5) return true;

    let entry = accum.get(mat.id);
    if (!entry) {
      entry = { mat, baseQty: 0, count: 0, approx: false };
      accum.set(mat.id, entry);
    }
    entry.baseQty += rawQty;
    entry.count += 1;
    if (isApprox) entry.approx = true;

    if (floorId && mat.unitPrice !== undefined) {
      const wasteMult =
        mat.supportsWaste && mat.wastePercentage > 0
          ? 1 + mat.wastePercentage / 100
          : 1;
      const itemCost = rawQty * wasteMult * mat.unitPrice;
      const prev = floorCosts.get(floorId) ?? { cost: 0, count: 0 };
      prev.cost += itemCost;
      prev.count += 1;
      floorCosts.set(floorId, prev);
    }
    return true;
  };

  let wallNetSingleSideAreaSqm = 0;
  let wallDeductedOpeningsSqm = 0;
  let floorRoomAreaSqm = 0;
  let roofSlopedAreaSqm = 0;
  let doorCount = 0;
  let windowCount = 0;

  // 1. Smart Walls (deducting hosted openings accurately once!)
  for (const wall of archData.walls) {
    const wq = computeSingleWallQuantities(wall, archData.openings);
    wallNetSingleSideAreaSqm += wq.netSingleSideAreaSqm;
    wallDeductedOpeningsSqm += wq.deductedOpeningAreaSqm;

    if (wq.isCurvedApproximation) {
      approximateNotesSet.add(
        lang === 'ja'
          ? '曲線壁の面積は20分割アーク積分による近似値です。'
          : lang === 'en'
          ? 'Curved wall quantities use 20-segment arc-length numerical integration.'
          : 'Kuantitas dinding lengkung dihitung memakai integrasi busur 20 segmen.'
      );
    }

    const hasStruct = addContribution(
      wall.structuralMaterialId,
      wall.floorId,
      (unit) => {
        if (unit === 'm3') return wq.netVolumeM3;
        if (unit === 'm') return wq.lengthM;
        return wq.netSingleSideAreaSqm;
      },
      wq.isCurvedApproximation
    );
    if (!hasStruct) {
      missingAssignments.push({
        domain: 'wall',
        elementId: wall.id,
        elementLabel: `Wall (${wq.lengthM.toFixed(2)}m)`,
        floorId: wall.floorId,
        roleDescription:
          lang === 'ja'
            ? '壁構造材が未設定'
            : lang === 'en'
            ? 'Unassigned wall structural material'
            : 'Material struktur inti tembok belum dipilih',
        metricSummary: `${wq.netSingleSideAreaSqm.toFixed(2)} m²`,
      });
    }

    if (wall.exteriorFinishMaterialId) {
      addContribution(
        wall.exteriorFinishMaterialId,
        wall.floorId,
        (unit) => (unit === 'm' ? wq.lengthM : wq.netSingleSideAreaSqm),
        wq.isCurvedApproximation
      );
    }
    if (wall.interiorFinishMaterialId) {
      addContribution(
        wall.interiorFinishMaterialId,
        wall.floorId,
        (unit) => (unit === 'm' ? wq.lengthM : wq.netSingleSideAreaSqm),
        wq.isCurvedApproximation
      );
    }
  }

  // 2. Detected Enclosed Rooms (Floor Slabs / Flooring + Ceilings)
  for (const room of detectedRooms) {
    floorRoomAreaSqm += room.areaSqm;
    const hasFloorMat = addContribution(
      room.floorMaterialId,
      room.floorId,
      (unit, mat) => {
        if (unit === 'm3') {
          return room.areaSqm * (mat.thicknessAssumptionM ?? 0.12);
        }
        return room.areaSqm;
      }
    );
    if (!hasFloorMat) {
      missingAssignments.push({
        domain: 'room-floor',
        elementId: room.id,
        elementLabel: room.name,
        floorId: room.floorId,
        roleDescription:
          lang === 'ja'
            ? '部屋の床構造・仕上げ材が未設定'
            : lang === 'en'
            ? 'Unassigned room floor construction material'
            : 'Material konstruksi lantai ruang belum dipilih',
        metricSummary: `${room.areaSqm.toFixed(2)} m²`,
      });
    }
  }

  // 3. Doors & Windows
  for (const op of archData.openings) {
    if (op.kind === 'archway') continue; // open wall archways do not consume door/window frame units
    const isDoor = op.kind.startsWith('door');
    if (isDoor) doorCount++;
    else windowCount++;

    const opArea = Math.max(0.1, op.width * op.height);
    const hasOpMat = addContribution(
      op.openingMaterialId,
      op.floorId,
      (unit) => {
        if (unit === 'pcs') return op.kind === 'door-double' ? 1.5 : 1;
        if (unit === 'm') return 2 * (op.width + op.height);
        return opArea;
      }
    );
    if (!hasOpMat) {
      missingAssignments.push({
        domain: 'opening',
        elementId: op.id,
        elementLabel: `${op.kind} (${op.width.toFixed(2)}×${op.height.toFixed(2)}m)`,
        floorId: op.floorId,
        roleDescription:
          lang === 'ja'
            ? '建具（ドア・窓）の部材が未設定'
            : lang === 'en'
            ? 'Unassigned door/window unit material'
            : 'Material kusen/unit bukaan belum dipilih',
        metricSummary: `${opArea.toFixed(2)} m²`,
      });
    }
  }

  // 4. Parametric Roofs (using true 3D sloped surface area!)
  for (const roof of archData.roofs) {
    const rq = computeSingleRoofQuantities(roof);
    roofSlopedAreaSqm += rq.slopedSurfaceAreaSqm;

    const hasRoofMat = addContribution(
      roof.roofMaterialId,
      roof.floorId,
      (unit, mat) => {
        if (unit === 'm3') {
          const thick = mat.thicknessAssumptionM ?? 0.14;
          return rq.slopedSurfaceAreaSqm * thick;
        }
        return rq.slopedSurfaceAreaSqm;
      }
    );
    if (!hasRoofMat) {
      missingAssignments.push({
        domain: 'roof',
        elementId: roof.id,
        elementLabel: roof.name,
        floorId: roof.floorId,
        roleDescription:
          lang === 'ja'
            ? '屋根材が未設定'
            : lang === 'en'
            ? 'Unassigned roof construction material'
            : 'Material penutup/struktur atap belum dipilih',
        metricSummary: `${rq.slopedSurfaceAreaSqm.toFixed(2)} m²`,
      });
    }
  }

  // 5. Stairs
  for (const st of archData.stairs) {
    const approxVol = Math.max(0.25, st.width * st.runLength * 0.22);
    const approxArea = Math.max(0.8, st.width * Math.hypot(st.runLength, st.height));
    const hasStairMat = addContribution(
      st.stairMaterialId,
      st.floorId,
      (unit) => {
        if (unit === 'm3') return approxVol;
        if (unit === 'pcs') return 1;
        return approxArea;
      },
      true
    );
    if (hasStairMat) {
      approximateNotesSet.add(
        lang === 'ja'
          ? '階段の体積は標準スラブ厚（0.22m）による概算です。'
          : lang === 'en'
          ? 'Stair concrete/timber volume uses a standard 0.22m waist-slab approximation.'
          : 'Volume tangga dihitung memakai pendekatan pelat tangga standar 0.22m.'
      );
    } else {
      missingAssignments.push({
        domain: 'stair',
        elementId: st.id,
        elementLabel: `Stair (${st.kind})`,
        floorId: st.floorId,
        roleDescription:
          lang === 'ja'
            ? '階段構造材が未設定'
            : lang === 'en'
            ? 'Unassigned stair construction material'
            : 'Material konstruksi tangga belum dipilih',
        metricSummary: `${approxVol.toFixed(2)} m³`,
      });
    }
  }

  // 6. Outdoor Site Zones (System 5 -> System 2 integration!)
  if (archData.site?.enabled) {
    for (const zone of archData.site.outdoorZones) {
      if (!zone.surfaceMaterialId) continue;
      const zArea = Math.max(0.1, zone.width * zone.depth);
      addContribution(zone.surfaceMaterialId, undefined, (unit, mat) => {
        if (unit === 'm3') return zArea * (mat.thicknessAssumptionM ?? 0.08);
        return zArea;
      });
    }
  }

  // 7. Modular Architectural Scene Objects (`archRole` or explicit `constructionMaterialId`)
  for (const obj of objects) {
    if (!obj.visible) continue;
    const sx = Math.abs(obj.scale.x);
    const sy = Math.abs(obj.scale.y);
    const sz = Math.abs(obj.scale.z);
    const planArea = sx * sz;
    const boxVol = sx * sy * sz;

    if (obj.constructionMaterialId) {
      addContribution(
        obj.constructionMaterialId,
        obj.floorId,
        (unit) => {
          if (unit === 'm3') return boxVol;
          if (unit === 'm') return Math.max(sx, sy, sz);
          if (unit === 'pcs') return 1;
          return planArea;
        },
        true
      );
    } else if (obj.modularId && (obj.archRole === 'floor' || obj.archRole === 'wall')) {
      missingAssignments.push({
        domain: 'modular-object',
        elementId: obj.id,
        elementLabel: obj.name,
        floorId: obj.floorId,
        roleDescription:
          lang === 'ja'
            ? 'モジュラー建築部材の材料が未設定'
            : lang === 'en'
            ? 'Unassigned modular architectural block material'
            : 'Material blok arsitektur modular belum dipilih',
        metricSummary: `${planArea.toFixed(2)} m²`,
      });
    }
  }

  // Assemble Line Items, Category Totals & Unpriced List
  const byCategory: Record<ConstructionMaterialCategory, number> = {
    structure: 0,
    masonry: 0,
    'finish-wall': 0,
    flooring: 0,
    roofing: 0,
    openings: 0,
    outdoor: 0,
  };

  const lineItems: TakeoffLineItem[] = [];
  const unpricedItems: TakeoffLineItem[] = [];
  let totalEstimatedMaterialCost = 0;

  for (const { mat, baseQty, count, approx } of accum.values()) {
    const wastePct =
      mat.supportsWaste && mat.wastePercentage > 0 ? mat.wastePercentage : 0;
    const finalQty = baseQty * (1 + wastePct / 100);
    const isUnpriced =
      mat.unitPrice === undefined ||
      !Number.isFinite(mat.unitPrice) ||
      mat.unitPrice < 0;
    const subtotalCost = isUnpriced ? null : round2(finalQty * (mat.unitPrice ?? 0));

    let secondaryEstimateNote: string | undefined;
    if (mat.coveragePerUnit && mat.coveragePerUnit > 0 && mat.unit === 'm2') {
      const liters = finalQty / mat.coveragePerUnit;
      secondaryEstimateNote = `≈ ${liters.toFixed(1)} L (${mat.coveragePerUnit} m²/L)`;
    }

    const item: TakeoffLineItem = {
      materialId: mat.id,
      materialName: getMaterialDisplayName(mat, lang),
      category: mat.category,
      unit: mat.unit,
      baseQuantity: round2(baseQty),
      wastePercentageApplied: wastePct,
      finalQuantity: round2(finalQty),
      secondaryEstimateNote,
      unitPrice: mat.unitPrice,
      subtotalCost,
      isUnpriced,
      isApproximate: approx,
      sourceKind: mat.sourceKind,
      contributingElementCount: count,
    };

    lineItems.push(item);
    if (isUnpriced) {
      unpricedItems.push(item);
    } else if (subtotalCost !== null) {
      byCategory[mat.category] = round2(byCategory[mat.category] + subtotalCost);
      totalEstimatedMaterialCost = round2(totalEstimatedMaterialCost + subtotalCost);
    }
  }

  lineItems.sort((a, b) => (b.subtotalCost ?? 0) - (a.subtotalCost ?? 0));

  const byFloor: FloorCostBreakdown[] = floors.map((fl) => {
    const fc = floorCosts.get(fl.id) ?? { cost: 0, count: 0 };
    return {
      floorId: fl.id,
      floorName: fl.name,
      subtotalCost: round2(fc.cost),
      elementCount: fc.count,
    };
  });

  const excludedScopeNotes =
    lang === 'ja'
      ? [
          '本見積は「建築資材（Material-Only）」の概算であり、施工労務費・設備工事（電気・給排水・空調）・基礎地盤改良・許認可費用・税金は含まれません。',
          '家具・インテリア小物（一般3Dオブジェクト）は建築資材集計から除外されています。',
        ]
      : lang === 'en'
      ? [
          'Material-Only Estimate: excludes contractor labor, MEP (electrical, plumbing, HVAC), deep foundation earthworks, permits, overhead, and taxes.',
          'Standalone decorative furniture objects are excluded unless explicitly assigned a construction material.',
        ]
      : [
          'Estimasi Khusus Material (Material-Only): belum mencakup upah tukang/kontraktor, MEP (listrik, pipa air, AC), galian fondasi dalam, izin IMB/PBG, dan pajak.',
          'Perabot dekoratif tidak dihitung ke dalam RAB material kecuali diberi penetapan material konstruksi secara eksplisit.',
        ];

  let budgetComparison: BudgetComparisonSummary | null = null;
  const tb = archData.brief?.targetBudget;
  if (tb && tb.enabled && tb.amount > 0) {
    const diff = round2(tb.amount - totalEstimatedMaterialCost);
    const ratio = round2((totalEstimatedMaterialCost / tb.amount) * 100);
    budgetComparison = {
      enabled: true,
      targetAmount: tb.amount,
      scope: tb.scope,
      estimatedMaterialCost: totalEstimatedMaterialCost,
      differenceAmount: diff,
      ratioPercent: ratio,
      // Warn clearly when comparing a Material-Only takeoff against a Full Construction budget!
      scopeMismatchWarning: tb.scope !== 'materials',
      hasIncompleteCoverage:
        missingAssignments.length > 0 || unpricedItems.length > 0,
    };
  }

  return {
    lineItems,
    byCategory,
    byFloor,
    totalEstimatedMaterialCost,
    missingAssignments,
    unpricedItems,
    approximateNotes: Array.from(approximateNotesSet),
    excludedScopeNotes,
    budgetComparison,
    geometryTotals: {
      wallNetSingleSideAreaSqm: round2(wallNetSingleSideAreaSqm),
      wallDeductedOpeningsSqm: round2(wallDeductedOpeningsSqm),
      floorRoomAreaSqm: round2(floorRoomAreaSqm),
      roofSlopedAreaSqm: round2(roofSlopedAreaSqm),
      doorCount,
      windowCount,
    },
  };
}
