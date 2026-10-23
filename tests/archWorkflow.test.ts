import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  ArchHouseData,
  ArchOpeningItem,
  ArchRoofItem,
  ArchWallSegment,
  createDefaultBuildingFloors,
  createDefaultSitePlanningData,
  createEmptyArchHouseData,
  CURRENT_PROJECT_SCHEMA_VERSION,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_SUBDIVISION_SETTINGS,
  SceneObjectData,
  SerializedProjectFile,
} from '../src/types/studio';
import { TRANSLATIONS } from '../src/i18n/translations';
import {
  ArchBuilderEngine,
  detectAllRoomsAcrossFloors,
  detectClosedRoomsOnFloor,
} from '../src/engine/ArchBuilderEngine';
import { performBooleanCSG } from '../src/engine/BooleanCSGEngine';
import {
  buildCustomProfileGeometry,
  PROFILE_STARTER_TEMPLATES,
} from '../src/engine/CustomProfileEngine';
import { serializeGroupToOBJString } from '../src/engine/modelExporter';
import { applyTriplanarWorldSpaceUVs } from '../src/engine/proceduralTextures';
import {
  calcWallCenterlineLength,
  computePolygonAreaXZ,
  computeSingleRoofQuantities,
  computeSingleWallQuantities,
  computeSitePlacementMetrics,
  resolveSiteBoundaryPolygon,
} from '../src/engine/archAnalysis/geometryMetrics';
import {
  buildProjectBriefFromTemplate,
  evaluateProjectBrief,
} from '../src/engine/archAnalysis/briefEvaluator';
import {
  createDefaultConstructionMaterialCatalog,
  evaluateMaterialTakeoff,
} from '../src/engine/archAnalysis/materialTakeoff';
import { evaluateSpatialValidation } from '../src/engine/archAnalysis/spatialValidator';
import {
  compareDesignStates,
  createDesignAlternative,
  duplicateDesignAlternative,
  runIntegratedProjectAnalysis,
} from '../src/engine/archAnalysis/alternativesService';
import { migrateSerializedProjectFile } from '../src/engine/archAnalysis/schemaMigration';
import {
  exportPrintableArchitecturalReportHTML,
  generateDoorWindowSchedule,
} from '../src/engine/blueprintExporter';

function makeWall(
  id: string,
  start: { x: number; z: number },
  end: { x: number; z: number },
  overrides: Partial<ArchWallSegment> = {}
): ArchWallSegment {
  return {
    id,
    floorId: 'floor_1',
    start,
    end,
    height: 3.0,
    thickness: 0.15,
    style: 'full',
    curveBulge: 0,
    exteriorColor: '#f1f5f9',
    interiorColor: '#f8efe2',
    roughness: 0.78,
    hasBaseboard: true,
    structuralMaterialId: 'mat_brick_masonry',
    exteriorFinishMaterialId: 'mat_paint_exterior',
    interiorFinishMaterialId: 'mat_paint_interior',
    ...overrides,
  };
}

/**
 * Helper: Builds a 2-room rectangular house on `floor_1` spanning X:[-4..4] (8m), Z:[-3..3] (6m),
 * divided by an interior partition at X = 0 into Left Room (4x6 = 24 m²) and Right Room (4x6 = 24 m²).
 */
function makeTwoRoomHouseData(): ArchHouseData {
  const base = createEmptyArchHouseData();
  base.walls = [
    makeWall('w_north', { x: -4, z: -3 }, { x: 0, z: -3 }),
    makeWall('w_north2', { x: 0, z: -3 }, { x: 4, z: -3 }),
    makeWall('w_east', { x: 4, z: -3 }, { x: 4, z: 3 }),
    makeWall('w_south1', { x: 4, z: 3 }, { x: 0, z: 3 }),
    makeWall('w_south2', { x: 0, z: 3 }, { x: -4, z: 3 }),
    makeWall('w_west', { x: -4, z: 3 }, { x: -4, z: -3 }),
    makeWall('w_mid', { x: 0, z: -3 }, { x: 0, z: 3 }),
  ];
  base.openings = [
    {
      id: 'op_front_door',
      wallId: 'w_south2',
      floorId: 'floor_1',
      kind: 'door-single',
      offsetRatio: 0.5,
      width: 0.92,
      height: 2.15,
      sillHeight: 0,
      frameColor: '#334155',
      openingMaterialId: 'mat_door_wood',
    },
    {
      id: 'op_mid_door',
      wallId: 'w_mid',
      floorId: 'floor_1',
      kind: 'door-single',
      offsetRatio: 0.5,
      width: 0.92,
      height: 2.15,
      sillHeight: 0,
      frameColor: '#334155',
      openingMaterialId: 'mat_door_wood',
    },
    {
      id: 'op_win_1',
      wallId: 'w_east',
      floorId: 'floor_1',
      kind: 'window-std',
      offsetRatio: 0.5,
      width: 1.25,
      height: 1.25,
      sillHeight: 0.9,
      frameColor: '#334155',
      openingMaterialId: 'mat_window_alu_glass',
    },
  ];
  return base;
}

describe('System 1: Project Brief & Requirements', () => {
  it('evaluates brief templates against empty vs populated rooms and tracks explicit room assignments', () => {
    const floors = createDefaultBuildingFloors('en');
    const emptyData = createEmptyArchHouseData();
    emptyData.brief = buildProjectBriefFromTemplate('single-storey', 'en');

    const emptyRooms = detectAllRoomsAcrossFloors(emptyData, floors, 'Room');
    const emptySite = computeSitePlacementMetrics(emptyData, [], emptyRooms);
    const emptyEval = evaluateProjectBrief({
      brief: emptyData.brief,
      archData: emptyData,
      floors,
      detectedRooms: emptyRooms,
      objects: [],
      siteMetrics: emptySite,
      lang: 'en',
    });

    assert.equal(emptyEval.hasActiveBrief, true);
    assert.ok(emptyEval.unmetCount > 0, 'Empty house should have unmet brief items');

    // Populate a 2-room house; initially generic names ("Room 1", "Room 2") are unassigned!
    const house = makeTwoRoomHouseData();
    house.brief = buildProjectBriefFromTemplate('single-storey', 'en');
    const rawRooms = detectAllRoomsAcrossFloors(house, floors, 'Room');
    assert.equal(rawRooms.length, 2);
    assert.equal(rawRooms[0].roomType, 'unassigned');

    // Explicitly assign semantic room types (`living` and `bedroom`)
    house.roomMetas = [
      {
        id: rawRooms[0].id,
        floorId: 'floor_1',
        centroid: rawRooms[0].centroid,
        name: 'Ruang Keluarga',
        roomType: 'living',
        floorColor: '#d6c7b2',
        floorMaterialId: 'mat_floor_ceramic',
        ceilingVisible: true,
      },
      {
        id: rawRooms[1].id,
        floorId: 'floor_1',
        centroid: rawRooms[1].centroid,
        name: 'Master Suite',
        roomType: 'bedroom',
        floorColor: '#d6c7b2',
        floorMaterialId: 'mat_floor_parquet',
        ceilingVisible: true,
      },
    ];

    const typedRooms = detectAllRoomsAcrossFloors(house, floors, 'Room');
    const siteMetrics = computeSitePlacementMetrics(house, [], typedRooms);
    const populatedEval = evaluateProjectBrief({
      brief: house.brief,
      archData: house,
      floors,
      detectedRooms: typedRooms,
      objects: [],
      siteMetrics,
      lang: 'en',
    });

    assert.equal(populatedEval.totalFloorAreaSqm, 48);
    assert.equal(populatedEval.roomsByType.living.length, 1);
    assert.equal(populatedEval.roomsByType.bedroom.length, 1);
    assert.equal(populatedEval.unassignedRooms.length, 0);
    // Floor count = 1, Total area 48m² in 45..95m², Living room >= 1 -> met!
    assert.ok(populatedEval.metCount >= 3);
  });
});

describe('System 2: Material Takeoff & Cost Estimator', () => {
  it('deducts host-wall openings accurately without double-subtraction on overlapping openings', () => {
    const wall = makeWall('w1', { x: 0, z: 0 }, { x: 4, z: 0 }); // 4m * 3m = 12 m² gross
    const singleOp: ArchOpeningItem = {
      id: 'op1',
      wallId: 'w1',
      floorId: 'floor_1',
      kind: 'door-single',
      offsetRatio: 0.5,
      width: 1.0,
      height: 2.0,
      sillHeight: 0,
      frameColor: '#333333',
    };
    const otherWallOp: ArchOpeningItem = {
      ...singleOp,
      id: 'op_other',
      wallId: 'w_unrelated',
    };

    const q1 = computeSingleWallQuantities(wall, [singleOp, otherWallOp]);
    assert.equal(q1.grossAreaSqm, 12);
    assert.equal(q1.deductedOpeningAreaSqm, 2);
    assert.equal(q1.netSingleSideAreaSqm, 10);

    // Add a second identical overlapping opening at the exact same position: union area must stay 2 m², NEVER 4 m²!
    const duplicateOverlapOp: ArchOpeningItem = {
      ...singleOp,
      id: 'op2_overlap',
    };
    const qOverlap = computeSingleWallQuantities(wall, [
      singleOp,
      duplicateOverlapOp,
    ]);
    assert.equal(qOverlap.deductedOpeningAreaSqm, 2);
    assert.equal(qOverlap.netSingleSideAreaSqm, 10);
  });

  it('computes curved wall arc length > straight chord and sloped roof 3D surface area > horizontal footprint', () => {
    const straight = makeWall('ws', { x: 0, z: 0 }, { x: 6, z: 0 });
    const curved = makeWall(
      'wc',
      { x: 0, z: 0 },
      { x: 6, z: 0 },
      { curveBulge: 1.5 }
    );
    assert.equal(calcWallCenterlineLength(straight), 6);
    assert.ok(calcWallCenterlineLength(curved) > 6.8);

    const flatRoof: ArchRoofItem = {
      id: 'rf_flat',
      floorId: 'floor_1',
      name: 'Flat',
      style: 'flat',
      center: { x: 0, z: 0 },
      width: 8,
      depth: 6,
      baseY: 3,
      pitchDeg: 32,
      overhang: 0.5,
      ridgeAxis: 'x',
      color: '#b85d3b',
      fasciaColor: '#ffffff',
      rotationY: 0,
    };
    const gableRoof: ArchRoofItem = { ...flatRoof, id: 'rf_gable', style: 'gable' };
    const hipRoof: ArchRoofItem = { ...flatRoof, id: 'rf_hip', style: 'hip' };

    const qFlat = computeSingleRoofQuantities(flatRoof);
    const qGable = computeSingleRoofQuantities(gableRoof);
    const qHip = computeSingleRoofQuantities(hipRoof);

    // With 0.5m overhang: fullW = 9m, fullD = 7m -> horizontal footprint = 63 m²
    assert.equal(qFlat.horizontalFootprintSqm, 63);
    assert.equal(qFlat.slopedSurfaceAreaSqm, 63);
    assert.ok(
      qGable.slopedSurfaceAreaSqm > qFlat.horizontalFootprintSqm + 8,
      'Sloped gable roof 3D surface area must strictly exceed horizontal footprint'
    );
    assert.ok(
      qHip.slopedSurfaceAreaSqm > qFlat.horizontalFootprintSqm + 8,
      'Sloped hip roof 3D surface area must strictly exceed horizontal footprint'
    );
  });

  it('strictly separates visual recoloring from construction material cost and flags missing/unpriced/scope mismatches', () => {
    const floors = createDefaultBuildingFloors('id');
    const house = makeTwoRoomHouseData();
    house.brief = buildProjectBriefFromTemplate('single-storey', 'id');
    // Set target budget scope to FULL CONSTRUCTION to test scopeMismatchWarning!
    house.brief.targetBudget = {
      enabled: true,
      amount: 500_000_000,
      currency: 'IDR',
      scope: 'construction',
    };

    const roomsBefore = detectAllRoomsAcrossFloors(house, floors, 'Ruang');
    const takeoffBefore = evaluateMaterialTakeoff({
      archData: house,
      floors,
      detectedRooms: roomsBefore,
      objects: [],
      lang: 'id',
    });

    // Rooms have no floorMaterialId yet -> reported in missingAssignments!
    assert.equal(takeoffBefore.missingAssignments.length, 2);
    assert.equal(takeoffBefore.budgetComparison?.scopeMismatchWarning, true);
    const costBefore = takeoffBefore.totalEstimatedMaterialCost;
    assert.ok(costBefore > 0);

    // Recolor ALL walls visually (bright red/blue + brick/marble visual pattern): cost MUST NOT change by a single Rupiah!
    for (const w of house.walls) {
      w.exteriorColor = '#ef4444';
      w.interiorColor = '#3b82f6';
      w.exteriorPattern = 'brick';
      w.interiorPattern = 'marble';
    }
    const takeoffAfterRecolor = evaluateMaterialTakeoff({
      archData: house,
      floors,
      detectedRooms: roomsBefore,
      objects: [],
      lang: 'id',
    });
    assert.equal(takeoffAfterRecolor.totalEstimatedMaterialCost, costBefore);

    // Mark a catalog material as unpriced (`unitPrice: undefined`): must be reported in `unpricedItems`, not treated as verified 0!
    const customCat = createDefaultConstructionMaterialCatalog().map((m) =>
      m.id === 'mat_door_wood' ? { ...m, unitPrice: undefined } : m
    );
    house.materialCatalog = customCat;
    const takeoffUnpriced = evaluateMaterialTakeoff({
      archData: house,
      floors,
      detectedRooms: roomsBefore,
      objects: [],
      lang: 'id',
    });
    assert.equal(takeoffUnpriced.unpricedItems.length, 1);
    assert.equal(takeoffUnpriced.unpricedItems[0].materialId, 'mat_door_wood');
    assert.equal(takeoffUnpriced.unpricedItems[0].subtotalCost, null);
  });
});

describe('System 3: Design Alternatives & Versioning', () => {
  it('creates deep-cloned independent snapshots and computes accurate side-by-side comparisons', () => {
    const floors = createDefaultBuildingFloors('en');
    const activeData = makeTwoRoomHouseData();
    const obj: SceneObjectData = {
      id: 'mod_deck_1',
      name: 'Wood Deck',
      kind: 'cube',
      position: { x: 0, y: 0.1, z: 5 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 3, y: 0.2, z: 2 },
      color: '#b77946',
      roughness: 0.6,
      metalness: 0.05,
      opacity: 1,
      emissive: '#000000',
      emissiveIntensity: 0,
      flatShading: false,
      subdivision: { ...DEFAULT_SUBDIVISION_SETTINGS },
      visible: true,
      archRole: 'floor',
      constructionMaterialId: 'mat_timber_framing',
    };

    const altA = createDesignAlternative({
      name: 'Option A - Compact',
      description: 'Baseline 8x6m layout',
      objects: [obj],
      floors,
      activeFloorId: 'floor_1',
      floorViewMode: 'all',
      archData: activeData,
    });

    // Mutate active working model heavily (expand East wall from X=4 to X=6 -> +12 m², add roof, mutate object)
    activeData.walls.find((w) => w.id === 'w_north2')!.end.x = 6;
    activeData.walls.find((w) => w.id === 'w_east')!.start.x = 6;
    activeData.walls.find((w) => w.id === 'w_east')!.end.x = 6;
    activeData.walls.find((w) => w.id === 'w_south1')!.start.x = 6;
    obj.scale.x = 8;

    // Verify Option A snapshot remained 100% untouched!
    assert.equal(
      altA.snapshot.archData.walls.find((w) => w.id === 'w_east')!.start.x,
      4
    );
    assert.equal(altA.snapshot.objects[0].scale.x, 3);

    const dupAlt = duplicateDesignAlternative(altA, ' (Copy)');
    assert.notEqual(dupAlt.id, altA.id);
    assert.equal(dupAlt.snapshot.objects[0].scale.x, 3);

    const cmp = compareDesignStates({
      leftLabel: altA.name,
      leftState: altA.snapshot,
      rightLabel: 'Active Expanded',
      rightState: { archData: activeData, floors, objects: [obj] },
      lang: 'en',
    });

    assert.equal(cmp.left.totalFloorAreaSqm, 48);
    assert.equal(cmp.right.totalFloorAreaSqm, 60);
    assert.equal(cmp.deltas.floorAreaDiffSqm, 12);
    assert.ok(cmp.deltas.costDiff > 0);
  });
});

describe('System 4 & System 5: Spatial Validation & Site Setback Planning', () => {
  it('validates openings, rooms, degenerate vs L/T-junction walls, and site boundaries/setbacks accurately', () => {
    const floors = createDefaultBuildingFloors('en');
    const house = makeTwoRoomHouseData();

    // 1. Clean baseline two-room house with doors: normal L & T junctions MUST NOT trigger geometry errors!
    const cleanBundle = runIntegratedProjectAnalysis({
      archData: house,
      floors,
      objects: [],
      lang: 'en',
    });
    assert.equal(
      cleanBundle.validation.byCategory.geometry,
      0,
      'Normal L and T wall junctions must never be flagged as geometry errors'
    );
    assert.equal(cleanBundle.validation.errorCount, 0);

    // 2. Make front door wider than host wall (width 5.0m on a 4.0m wall) & remove interior door so Room 2 loses access!
    house.openings[0].width = 5.0;
    house.openings = house.openings.filter((o) => o.id !== 'op_mid_door');
    // Enable a tight 10m x 8m site with 2.0m setbacks -> 8x6m building has only 1.0m clearance (< 2.0m setback)!
    house.site = {
      enabled: true,
      width: 10,
      depth: 8,
      center: { x: 0, z: 0 },
      setbacksEnabled: true,
      setbacks: { front: 2, rear: 2, left: 2, right: 2 },
      entranceSide: 'front',
      snapToSite: false,
      outdoorZones: [],
    };

    const conflictBundle = runIntegratedProjectAnalysis({
      archData: house,
      floors,
      objects: [],
      lang: 'en',
    });

    assert.ok(conflictBundle.validation.byCategory['opening-conflict'] >= 1);
    assert.ok(conflictBundle.validation.byCategory['spatial-usability'] >= 1);
    assert.ok(conflictBundle.validation.byCategory['site-planning'] >= 1);
    assert.equal(conflictBundle.siteMetrics.withinSiteBoundary, true);
    assert.equal(conflictBundle.siteMetrics.setbacksSatisfied.all, false);
    assert.equal(conflictBundle.siteMetrics.distancesToBoundary.front, 0.925);

    // Verify 1-click Auto-Fix clamps the oversized opening cleanly inside its 4.0m host wall!
    const opFinding = conflictBundle.validation.findings.find(
      (f) => f.ruleId === 'OPENING_EXCEEDS_WALL_LENGTH'
    );
    assert.ok(opFinding?.autoFix);
    if (opFinding?.autoFix?.kind === 'clamp-opening-to-wall') {
      house.openings[0].width = opFinding.autoFix.nextWidth;
      house.openings[0].offsetRatio = opFinding.autoFix.nextOffsetRatio;
    }

    const fixedBundle = runIntegratedProjectAnalysis({
      archData: house,
      floors,
      objects: [],
      lang: 'en',
    });
    assert.equal(fixedBundle.validation.byCategory['opening-conflict'], 0);

    // 3. Direct collinear duplicate wall + degenerate sliver wall + crossed site boundary check
    house.walls.push(
      makeWall('w_sliver', { x: 2, z: 2 }, { x: 2.1, z: 2 }), // 0.10m < 0.25m degenerate
      makeWall('w_dup_overlap', { x: -3.5, z: -3 }, { x: -0.5, z: -3 }) // collinear overlap on w_north
    );
    house.site.width = 4; // Building spanX=8m crosses outside 4m site!
    const crossedSite = computeSitePlacementMetrics(house, [], [], house.site);
    assert.equal(crossedSite.withinSiteBoundary, false);

    const directVal = evaluateSpatialValidation({
      archData: house,
      floors,
      detectedRooms: fixedBundle.detectedRooms,
      objects: [],
      briefEval: fixedBundle.briefEval,
      siteMetrics: crossedSite,
      lang: 'en',
    });
    assert.ok(
      directVal.findings.some((f) => f.ruleId === 'GEOM_DEGENERATE_WALL')
    );
    assert.ok(
      directVal.findings.some((f) => f.ruleId === 'GEOM_OVERLAPPING_WALLS')
    );
    assert.ok(
      directVal.findings.some((f) => f.ruleId === 'SITE_BOUNDARY_EXCEEDED')
    );
  });
});

describe('System 6 & Schema Migration / Regressions', () => {
  it('generates live Door/Window schedules & HTML reports from active or saved alternative states', () => {
    const floors = createDefaultBuildingFloors('en');
    const house = makeTwoRoomHouseData();

    const schedule = generateDoorWindowSchedule({
      archData: house,
      floors,
      lang: 'en',
    });
    assert.equal(schedule.length, 3);
    assert.equal(schedule[0].mark, 'D-1');
    assert.equal(schedule[2].mark, 'W-1');

    const html = exportPrintableArchitecturalReportHTML({
      projectName: 'Villa Nusantara',
      sourceLabel: 'Active Working Model',
      archData: house,
      floors,
      objects: [],
      lang: 'en',
      download: false,
    });
    assert.ok(html.includes('Villa Nusantara'));
    assert.ok(html.includes('Material-Only Scope'));
    assert.ok(html.includes('48.00 m²'));
  });

  it('migrates legacy v1 project files seamlessly and preserves standing Grid OFF defaults + all translations', () => {
    const legacyFile: SerializedProjectFile = {
      format: 'perabot-project-v1',
      id: 'proj_legacy_1',
      name: 'Old House v1',
      mode: 'house',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      objects: [],
      archData: {
        walls: [makeWall('w_old', { x: 0, z: 0 }, { x: 3, z: 0 })],
        openings: [],
        roomMetas: [],
        stairs: [],
        roofs: [],
        sun: { sunOverride: false, hour: 9.5, northDeg: 35, cameraFov: 46 },
      },
    };

    const migrated = migrateSerializedProjectFile(legacyFile);
    assert.equal(migrated.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION);
    assert.equal(migrated.archData?.walls.length, 1);
    assert.ok(migrated.archData?.brief);
    assert.ok(migrated.archData?.site);
    assert.ok(migrated.archData?.materialCatalog && migrated.archData.materialCatalog.length > 5);
    assert.deepEqual(migrated.designAlternatives, []);

    // Standing Regression Check: All 6 Grid feature checkboxes default to FALSE!
    assert.equal(DEFAULT_GRID_SETTINGS.visible, true);
    assert.equal(DEFAULT_GRID_SETTINGS.adaptive, false);
    assert.equal(DEFAULT_GRID_SETTINGS.showAxes, false);
    assert.equal(DEFAULT_GRID_SETTINGS.syncSnap, false);
    assert.equal(DEFAULT_GRID_SETTINGS.showRuler, false);
    assert.equal(DEFAULT_GRID_SETTINGS.showSelectionFootprint, false);
    assert.equal(DEFAULT_GRID_SETTINGS.showPlotBoundary, false);

    // Standing Regression Check: Complete ID / EN / JA parity
    const idKeys = Object.keys(TRANSLATIONS.id).sort();
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    const jaKeys = Object.keys(TRANSLATIONS.ja).sort();
    assert.deepEqual(idKeys, enKeys);
    assert.deepEqual(idKeys, jaKeys);

    // Closed room detection sanity check
    const rooms = detectClosedRoomsOnFloor(
      makeTwoRoomHouseData().walls,
      'floor_1',
      [],
      'Ruang'
    );
    assert.equal(rooms.length, 2);
  });

  it('9. executes 3D CSG Boolean operations (subtract, union, intersect) deterministically', () => {
    const targetGeo = new THREE.BoxGeometry(2, 1, 2);
    const cutterGeo = new THREE.BoxGeometry(1, 2, 1);
    const identity = new THREE.Matrix4();

    // Subtract central hole
    const carved = performBooleanCSG(targetGeo, cutterGeo, identity, 'subtract');
    carved.computeBoundingBox();
    assert.ok(carved.attributes.position.count >= 24);
    assert.ok(Math.abs((carved.boundingBox?.max.x ?? 0) - 1) < 1e-4);

    // Union offset box
    const shiftRight = new THREE.Matrix4().makeTranslation(1.5, 0, 0);
    const united = performBooleanCSG(targetGeo, cutterGeo, shiftRight, 'union');
    united.computeBoundingBox();
    assert.ok(Math.abs((united.boundingBox?.max.x ?? 0) - 2.0) < 1e-4);

    // Intersect overlap
    const intersected = performBooleanCSG(
      targetGeo,
      cutterGeo,
      identity,
      'intersect'
    );
    intersected.computeBoundingBox();
    assert.ok(Math.abs((intersected.boundingBox?.max.x ?? 0) - 0.5) < 1e-4);
    assert.ok(Math.abs((intersected.boundingBox?.max.y ?? 0) - 0.5) < 1e-4);
  });

  it('10. builds custom 2D-to-3D Lathe & Extrude profiles with outward normals and valid bounds', () => {
    // Hollow ceramic vase (Lathe)
    const vaseTpl = PROFILE_STARTER_TEMPLATES.find((t) => t.id === 'ceramic-vase')!;
    const vaseGeo = buildCustomProfileGeometry(vaseTpl.data);
    vaseGeo.computeBoundingBox();
    assert.ok(vaseGeo.attributes.position.count > 100);
    assert.ok(vaseGeo.attributes.normal.count === vaseGeo.attributes.position.count);
    assert.ok((vaseGeo.boundingBox?.max.y ?? 0) > 0.35);

    // Crown molding (Linear Extrude)
    const moldTpl = PROFILE_STARTER_TEMPLATES.find((t) => t.id === 'crown-molding')!;
    const moldGeo = buildCustomProfileGeometry(moldTpl.data);
    moldGeo.computeBoundingBox();
    const depthSpan =
      (moldGeo.boundingBox?.max.z ?? 0) - (moldGeo.boundingBox?.min.z ?? 0);
    assert.ok(Math.abs(depthSpan - moldTpl.data.depth) < 1e-3);
  });

  it('11. projects physical world-space UVs without stretching and exports valid Wavefront .OBJ', () => {
    const plank = new THREE.BoxGeometry(1, 1, 1);
    applyTriplanarWorldSpaceUVs(plank, new THREE.Vector3(4, 0.2, 1), 1.0);
    const uv = plank.getAttribute('uv');
    let maxU = -Infinity;
    let minU = Infinity;
    for (let i = 0; i < uv.count; i++) {
      maxU = Math.max(maxU, uv.getX(i));
      minU = Math.min(minU, uv.getX(i));
    }
    // 4m wide plank should span 4.0 UV units instead of 1.0!
    assert.ok(Math.abs(maxU - minU - 4.0) < 1e-3);

    const grp = new THREE.Group();
    const m = new THREE.Mesh(plank, new THREE.MeshStandardMaterial());
    m.name = 'Papan Kayu Jati';
    grp.add(m);
    const objStr = serializeGroupToOBJString(grp);
    assert.ok(objStr.includes('o Papan_Kayu_Jati'));
    assert.ok(objStr.includes('\nv '));
    assert.ok(objStr.includes('\nvt '));
    assert.ok(objStr.includes('\nvn '));
    assert.ok(objStr.includes('\nf '));
  });

  it('12. resolves polygon site parcels, multi-wing L-shaped Auto-Roof, and void room preservation', () => {
    const baseSite = createDefaultSitePlanningData();
    assert.equal(
      Math.round(computePolygonAreaXZ(resolveSiteBoundaryPolygon(baseSite))),
      Math.round(baseSite.width * baseSite.depth)
    );

    const trapArea = computePolygonAreaXZ(
      resolveSiteBoundaryPolygon({ ...baseSite, shapePreset: 'trapezoid' })
    );
    const lLotArea = computePolygonAreaXZ(
      resolveSiteBoundaryPolygon({ ...baseSite, shapePreset: 'l-lot' })
    );
    assert.ok(trapArea > 0 && trapArea < baseSite.width * baseSite.depth);
    assert.ok(lLotArea > 0 && lLotArea < baseSite.width * baseSite.depth);

    // Multi-wing Auto-Roof on L-shaped house + stairwell/void room preservation
    const floors = createDefaultBuildingFloors('id');
    floors.push({
      id: 'floor_2',
      name: 'Lantai 2',
      elevation: 3,
      height: 3,
      visible: true,
    });
    const lHouse = createEmptyArchHouseData();
    // L-shaped perimeter on floor_1: (0,0)->(8,0)->(8,4)->(4,4)->(4,8)->(0,8)->(0,0)
    lHouse.walls = [
      makeWall('lw1', { x: 0, z: 0 }, { x: 8, z: 0 }),
      makeWall('lw2', { x: 8, z: 0 }, { x: 8, z: 4 }),
      makeWall('lw3', { x: 8, z: 4 }, { x: 4, z: 4 }),
      makeWall('lw4', { x: 4, z: 4 }, { x: 4, z: 8 }),
      makeWall('lw5', { x: 4, z: 8 }, { x: 0, z: 8 }),
      makeWall('lw6', { x: 0, z: 8 }, { x: 0, z: 0 }),
    ];
    lHouse.roomMetas = [
      {
        id: 'rm_void_test',
        floorId: 'floor_2',
        centroid: { x: 2, z: 2 },
        name: 'Void Mezzanine',
        roomType: 'living',
        floorColor: '#cbd5e1',
        ceilingVisible: true,
        isVoid: true,
      },
    ];
    const eng = new ArchBuilderEngine(lHouse);
    const roof = eng.generateAutoRoof(floors, 'floor_1', 'gable', 'Atap L');
    assert.ok(roof !== null);
    // L-shape decomposes into >= 2 roof wings instead of 1 giant bounding box!
    assert.ok(eng.getData().roofs.length >= 2);
    assert.equal(eng.getData().roomMetas[0].isVoid, true);
  });
});

describe('System 7: Architect Life × Blender Unification & Existing-Wall Angle Lock', () => {
  it('snaps already-created wall corners to 0°/45°/90° when angleLock=true and allows free angles when angleLock=false', () => {
    const house = createEmptyArchHouseData();
    house.walls = [makeWall('w_edit_1', { x: 0, z: 0 }, { x: 4, z: 0 })];
    const eng = new ArchBuilderEngine(house);

    // Dragging endpoint (4, 0) slightly off-axis to (4.1, 0.35):
    // With angleLock = true -> locks cleanly to 0° (z === 0)!
    const locked = eng.snapExistingWallVertexDrag(
      'floor_1',
      { x: 4, z: 0 },
      { x: 4.1, z: 0.35 },
      true,
      0.1
    );
    assert.equal(locked.point.z, 0);
    assert.equal(locked.angleDeg, 0);

    // With angleLock = false -> preserves off-axis freeform z = 0.35 (snapped to 0.1m grid -> 0.4)!
    const freeform = eng.snapExistingWallVertexDrag(
      'floor_1',
      { x: 4, z: 0 },
      { x: 4.1, z: 0.38 },
      false,
      0.1
    );
    assert.equal(freeform.point.z, 0.4);
    assert.notEqual(freeform.angleDeg, 0);
  });

  it('supports multi-selection, translate, rotate, exact meter sizing, and wall+opening duplication', () => {
    const floors = createDefaultBuildingFloors('id');
    const house = createEmptyArchHouseData();
    house.walls = [
      makeWall('w_a', { x: 0, z: 0 }, { x: 3, z: 0 }),
      makeWall('w_b', { x: 3, z: 0 }, { x: 3, z: 3 }),
    ];
    const eng = new ArchBuilderEngine(house);
    eng.addOpeningOnWall('w_a', 'door-single', 0.5);

    eng.setSelections([
      { kind: 'wall', id: 'w_a' },
      { kind: 'wall', id: 'w_b' },
    ]);
    assert.equal(eng.getSelections().length, 2);
    assert.equal(eng.isElementSelected('wall', 'w_a').selected, true);
    assert.equal(eng.isElementSelected('wall', 'w_b').primary, true);

    // Exact meter dimensions on wall w_a: resize length from 3m to 5m, height to 3.4m, thickness to 0.2m
    const resized = eng.setArchElementExactDimensions(
      { kind: 'wall', id: 'w_a' },
      { x: 5, y: 3.4, z: 0.2 }
    );
    assert.equal(resized, true);
    const info = eng.getArchElementTransformInfo(
      { kind: 'wall', id: 'w_a' },
      floors
    );
    assert.ok(info !== null);
    assert.equal(info.dimensions.x, 5);
    assert.equal(info.dimensions.y, 3.4);
    assert.equal(info.dimensions.z, 0.2);

    // Duplicate wall w_a -> also clones its hosted door!
    const created = eng.duplicateArchElements(
      [{ kind: 'wall', id: 'w_a' }],
      { x: 1, y: 0, z: 2 }
    );
    assert.equal(created.length, 1);
    assert.equal(eng.getData().walls.length, 3);
    assert.equal(eng.getData().openings.length, 2);
  });
});

