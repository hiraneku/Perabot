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
  computeWallLength,
  detectAllRoomsAcrossFloors,
  detectClosedRoomsOnFloor,
  sampleWallCurvePoint,
} from '../src/engine/ArchBuilderEngine';
import {
  buildCornerFilletGeometry,
  buildManifoldWallBodyGeometry,
  computeFloorWallJunctions,
} from '../src/engine/WallGeometryEngine';
import {
  WALL_TEMPLATES_CATALOG,
} from '../src/engine/wallTemplates';
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

describe('Wave 1 & Wave 2 Precision Architecture Mechanics', () => {
  it('prevents bystander wall-kidnapping mid-drag and detaches single selected wall cleanly from shared corners', () => {
    const house = createEmptyArchHouseData();
    house.walls = [
      makeWall('w_drag', { x: 0, z: 0 }, { x: 2, z: 0 }),
      makeWall('w_bystander', { x: 4, z: 0 }, { x: 4, z: 3 }),
      makeWall('w_shared_other', { x: 2, z: 0 }, { x: 2, z: 3 }),
    ];
    const eng = new ArchBuilderEngine(house);

    // Select ONLY `w_drag` at shared corner (2, 0)
    eng.setSelection({ kind: 'wall', id: 'w_drag' });
    const bindings = eng.captureWallVertexBindings('floor_1', { x: 2, z: 0 });
    assert.equal(
      bindings.length,
      1,
      'Selecting only w_drag must bind ONLY w_drag (never w_shared_other)'
    );
    assert.equal(bindings[0].wallId, 'w_drag');
    assert.equal(bindings[0].endpoint, 'end');

    // Drag w_drag.end DIRECTLY onto w_bystander.start (4, 0), then away to (6, 2)!
    eng.applyWallVertexBindings(bindings, { x: 4, z: 0 });
    eng.applyWallVertexBindings(bindings, { x: 6, z: 2 });

    const walls = eng.getData().walls;
    const wDrag = walls.find((w) => w.id === 'w_drag')!;
    const wBystander = walls.find((w) => w.id === 'w_bystander')!;
    const wSharedOther = walls.find((w) => w.id === 'w_shared_other')!;

    assert.deepEqual(wDrag.end, { x: 6, z: 2 });
    assert.deepEqual(
      wBystander.start,
      { x: 4, z: 0 },
      'Bystander wall crossed mid-drag must NEVER be kidnapped!'
    );
    assert.deepEqual(
      wSharedOther.start,
      { x: 2, z: 0 },
      'Unselected wall at original shared corner must stay undisturbed!'
    );
  });

  it('locks onto forcedEndpointSnap and aligns wall Move Gizmo magnetically without merging wall IDs', () => {
    const house = createEmptyArchHouseData();
    house.walls = [
      makeWall('w_target', { x: 0, z: 0 }, { x: 3, z: 0 }),
      makeWall('w_moving', { x: 5, z: 2 }, { x: 8, z: 2 }),
    ];
    const eng = new ArchBuilderEngine(house);

    // Screen-space forcedEndpointSnap overrides floor raycast offset in 3D perspective
    const snapped = eng.snapWallPoint(
      { x: 3.65, z: 0.55 },
      'floor_1',
      null,
      true,
      0.1,
      { x: 3, z: 0 },
      0.8
    );
    assert.deepEqual(snapped.point, { x: 3, z: 0 });
    assert.equal(snapped.snappedEndpoint, true);

    // Move Gizmo near w_target.end (3, 0): moving w_moving.start (5, 2) by (-1.88, -1.92) -> (3.12, 0.08) within 0.26m!
    const gizmoSnap = eng.computeWallTranslateSnapDelta(
      [{ kind: 'wall', id: 'w_moving' }],
      -1.88,
      -1.92,
      0.26
    );
    assert.deepEqual(gizmoSnap.snappedPoint, { x: 3, z: 0 });
    assert.equal(gizmoSnap.dx, -2);
    assert.equal(gizmoSnap.dz, -2);
    assert.equal(eng.getData().walls.length, 2);
  });

  it('prevents overlapping duplicate openings and clamps openings safely when shortening a wall', () => {
    const house = createEmptyArchHouseData();
    house.walls = [makeWall('w_host', { x: 0, z: 0 }, { x: 3.4, z: 0 })];
    const eng = new ArchBuilderEngine(house);

    const op1 = eng.addOpeningOnWall('w_host', 'door-single', 0.35);
    assert.ok(op1 !== null);

    // 1. Accidental double-tap at the exact same spot (0.35) selects & returns existing op1 without duplicating!
    const dupTap = eng.addOpeningOnWall('w_host', 'door-single', 0.35);
    assert.equal(dupTap?.id, op1!.id);
    assert.equal(eng.getData().openings.length, 1);

    // 2. Placing a window partially overlapping op1 (at 0.45 on 3.4m wall) nudges cleanly into a non-overlapping slot!
    const op2 = eng.addOpeningOnWall('w_host', 'window-std', 0.45);
    assert.ok(op2 !== null);
    assert.notEqual(op2!.id, op1!.id);
    assert.equal(eng.getData().openings.length, 2);
    assert.ok(
      Math.abs(op2!.offsetRatio - op1!.offsetRatio) * 3.4 >=
        (op1!.width + op2!.width) * 0.5 - 0.01,
      'Second opening must nudge clear of first opening without overlapping'
    );

    // 3. Shortening a single-door wall clamps the door safely inside the new wall span
    eng.deleteArchElementByKindAndId('opening', op2!.id);
    eng.updateOpening(op1!.id, { width: 1.8, offsetRatio: 0.85 });
    eng.setArchElementExactDimensions(
      { kind: 'wall', id: 'w_host' },
      { x: 1.5, y: 3.0, z: 0.15 }
    );
    const clampedOp = eng.getData().openings.find((o) => o.id === op1!.id)!;
    assert.ok(clampedOp.width <= 1.28);
    assert.ok(clampedOp.offsetRatio >= 0.3 && clampedOp.offsetRatio <= 0.7);
  });
});

describe('Phase 1 Smart Wall Templates (38) & Watertight Corner/Curve Engine', () => {
  it('defines all 38 Phase-1 templates across exact 4 categories (8+10+10+10) with complete ID/EN/JA translations and valid manifold 3D geometry', () => {
    assert.equal(WALL_TEMPLATES_CATALOG.length, 38);
    assert.equal(
      WALL_TEMPLATES_CATALOG.filter((w) => w.category === 'basic').length,
      8
    );
    assert.equal(
      WALL_TEMPLATES_CATALOG.filter((w) => w.category === 'wall-end').length,
      10
    );
    assert.equal(
      WALL_TEMPLATES_CATALOG.filter((w) => w.category === 'corner').length,
      10
    );
    assert.equal(
      WALL_TEMPLATES_CATALOG.filter((w) => w.category === 'shape').length,
      10
    );

    const uniqueIds = new Set(WALL_TEMPLATES_CATALOG.map((w) => w.id));
    assert.equal(uniqueIds.size, 38);

    const floors = createDefaultBuildingFloors('id');
    for (const meta of WALL_TEMPLATES_CATALOG) {
      for (const lang of ['id', 'en', 'ja'] as const) {
        assert.ok(meta.name[lang].trim().length > 2);
        assert.ok(meta.subtitle[lang].trim().length > 3);
        assert.ok(meta.description[lang].trim().length > 10);
      }

      const house = createEmptyArchHouseData();
      const eng = new ArchBuilderEngine(house);
      const spawned = eng.spawnWallFromTemplateId(meta.id, 'floor_1', {
        x: 0,
        z: 0,
      });
      assert.ok(
        spawned.length >= 1,
        `Template ${meta.id} must spawn at least 1 wall segment`
      );
      assert.equal(
        eng.getSelections().length,
        spawned.length,
        `Template ${meta.id} must auto-select all spawned segments for Blender gizmos`
      );

      eng.rebuildAll(floors, 'floor_1', 'all', true, 'Ruang');

      let totalVerts = 0;
      let foundObsoleteCornerCol = false;
      eng.structuralGroup.traverse((node) => {
        if (node.userData?.archKind === 'corner-col') {
          foundObsoleteCornerCol = true;
        }
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh && node.userData?.archKind === 'wall') {
          const pos = mesh.geometry.getAttribute('position');
          assert.ok(pos && pos.count >= 6, `${meta.id} mesh must have triangles`);
          totalVerts += pos.count;
          for (let i = 0; i < pos.count; i++) {
            assert.ok(
              Number.isFinite(pos.getX(i)) &&
                Number.isFinite(pos.getY(i)) &&
                Number.isFinite(pos.getZ(i)),
              `Finite vertices required for ${meta.id}`
            );
          }
        }
      });
      assert.equal(
        foundObsoleteCornerCol,
        false,
        `Zero protruding 14-gon corner cylinder columns allowed for ${meta.id}`
      );
      assert.ok(totalVerts > 0);
    }
  });

  it('computes exact planar miter trims at 90°/45°/3-way/4-way corners and generates smooth 24-segment rounded corner fillets', () => {
    // 1. 90-degree corner at (0,0) with thickness 0.20m -> trims must be exact ±0.10m!
    const w1 = makeWall('w_a', { x: 0, z: 0 }, { x: 3, z: 0 });
    const w2 = makeWall('w_b', { x: 0, z: 0 }, { x: 0, z: 3 });
    w1.thickness = 0.2;
    w2.thickness = 0.2;

    const plan90 = computeFloorWallJunctions([w1, w2]);
    const tA = plan90.endTrims.get('w_a')!.start;
    const tB = plan90.endTrims.get('w_b')!.start;
    assert.equal(tA.isConnected, true);
    assert.equal(tB.isConnected, true);
    // Outgoing w1 = (+1, 0), left normal nL = (-tz, tx) = (0, +1) [inner], right normal = (0, -1) [outer]
    // Inner corner meets at (+0.10, +0.10) -> leftTrim = +0.10; Outer corner meets at (-0.10, -0.10) -> rightTrim = -0.10
    assert.ok(Math.abs(tA.leftTrim - 0.1) < 1e-4);
    assert.ok(Math.abs(tA.rightTrim - -0.1) < 1e-4);

    // 2. Rounded Outer Corner emits dedicated curved fillet geometry with positive pullback
    w1.cornerStyle = 'rounded-outer';
    w1.cornerRadius = 0.45;
    w2.cornerStyle = 'rounded-outer';
    w2.cornerRadius = 0.45;
    const planFillet = computeFloorWallJunctions([w1, w2]);
    assert.equal(planFillet.filletPieces.length, 1);
    assert.ok(planFillet.filletPieces[0].pullback > 0.2);
    const filletGeo = buildCornerFilletGeometry(planFillet.filletPieces[0]);
    assert.ok(filletGeo !== null);
    assert.ok(filletGeo!.getAttribute('position').count > 100);

    // 3. 4-Way intersection sets hasVertexApex = true on all 4 arms (Z-fight-free central hub)
    const house4 = createEmptyArchHouseData();
    const eng4 = new ArchBuilderEngine(house4);
    const segs4 = eng4.spawnWallFromTemplateId(
      'four-way-junction-wall',
      'floor_1',
      { x: 0, z: 0 }
    );
    assert.equal(segs4.length, 4);
    const plan4 = computeFloorWallJunctions(segs4);
    for (const s of segs4) {
      const tr = plan4.endTrims.get(s.id)!;
      assert.ok(tr.start.hasVertexApex || tr.end.hasVertexApex);
    }
  });

  it('produces exact true circular arcs for Semi-Circular & Circular-Segment walls and preserves doors across non-destructive template swaps', () => {
    const house = createEmptyArchHouseData();
    const eng = new ArchBuilderEngine(house);

    // 1. Exact 180° Semi-Circular Wall (`chord = 3.00m` -> `R = 1.50m`, arc length `π * 1.50 = 4.7124m`)
    const [semi] = eng.spawnWallFromTemplateId(
      'semi-circular-wall',
      'floor_1',
      { x: 0, z: 0 }
    );
    const center = {
      x: (semi.start.x + semi.end.x) * 0.5,
      z: (semi.start.z + semi.end.z) * 0.5,
    };
    for (let i = 0; i <= 10; i++) {
      const pt = sampleWallCurvePoint(semi, i / 10);
      const r = Math.hypot(pt.x - center.x, pt.z - center.z);
      assert.ok(
        Math.abs(r - 1.5) < 0.005,
        `Sample t=${i / 10} must lie on true circle R=1.50m (got ${r})`
      );
    }
    const arcLen = computeWallLength(semi);
    assert.ok(Math.abs(arcLen - Math.PI * 1.5) < 0.03);

    // 2. Non-destructive template swap preserves hosted Door & produces valid cutout mesh
    const houseSwap = createEmptyArchHouseData();
    const engSwap = new ArchBuilderEngine(houseSwap);
    const w = engSwap.addWallSegment('floor_1', { x: -2, z: 0 }, { x: 2, z: 0 })!;
    const door = engSwap.addOpeningOnWall(w.id, 'door-single', 0.5);
    assert.ok(door !== null);

    for (const nextTpl of [
      'tall-wall',
      'rounded-end-wall',
      'slanted-wall',
      'tapered-wall',
      'curved-wall',
      's-shaped-wall',
    ] as const) {
      assert.equal(engSwap.applyTemplateToWall(w.id, nextTpl), true);
      const curWall = engSwap.getData().walls.find((x) => x.id === w.id)!;
      const curOps = engSwap.getData().openings.filter((o) => o.wallId === w.id);
      assert.equal(curOps.length, 1);
      const built = buildManifoldWallBodyGeometry(curWall, curOps);
      assert.ok(built.bodyGeo.getAttribute('position').count >= 24);
    }
  });

  it('guarantees zero inverted cap/face normals, proper interior/exterior winding, and distinct profiles across all 38 templates', () => {
    const checkGeoNormals = (geo: THREE.BufferGeometry, label: string) => {
      const pos = geo.getAttribute('position');
      const nrm = geo.getAttribute('normal');
      const idx = geo.getIndex();
      const triCount = idx ? idx.count / 3 : pos.count / 3;
      assert.ok(triCount >= 2, `${label} must contain triangles`);

      for (let t = 0; t < triCount; t++) {
        const ia = idx ? idx.getX(t * 3) : t * 3;
        const ib = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
        const ic = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        const a = new THREE.Vector3().fromBufferAttribute(pos, ia);
        const b = new THREE.Vector3().fromBufferAttribute(pos, ib);
        const c = new THREE.Vector3().fromBufferAttribute(pos, ic);
        const faceN = new THREE.Vector3()
          .subVectors(b, a)
          .cross(new THREE.Vector3().subVectors(c, a));
        if (faceN.lengthSq() < 1e-11) continue;
        faceN.normalize();

        // Horizontal cap triangles at y=0 must point -Y, and horizontal top caps (y > 0.05) must point +Y!
        const sameY =
          Math.abs(a.y - b.y) < 1e-4 && Math.abs(b.y - c.y) < 1e-4;
        if (sameY && Math.abs(a.y) < 1e-4) {
          assert.ok(
            faceN.y < -0.99,
            `${label} bottom cap triangle must point -Y (got ny=${faceN.y})`
          );
        } else if (sameY && a.y > 0.05) {
          // Note: overhanging plinth/coping undersides sit at y > 0.08, so check stored vertex normal matches geometric normal!
          const vnA = new THREE.Vector3().fromBufferAttribute(nrm, ia);
          assert.ok(
            faceN.dot(vnA) > 0.85,
            `${label} horizontal cap normal mismatch at y=${a.y}`
          );
        }

        // Stored vertex normals must agree with geometric triangle winding (even across smooth arcs!)
        for (const iv of [ia, ib, ic]) {
          const vn = new THREE.Vector3().fromBufferAttribute(nrm, iv);
          assert.ok(vn.length() > 0.95, `${label} normal must be unit length`);
          assert.ok(
            faceN.dot(vn) > 0.25,
            `${label} vertex normal opposes geometric face normal (dot=${faceN.dot(vn)})`
          );
        }
      }
    };

    for (const meta of WALL_TEMPLATES_CATALOG) {
      const house = createEmptyArchHouseData();
      const eng = new ArchBuilderEngine(house);
      const segs = eng.spawnWallFromTemplateId(meta.id, 'floor_1', {
        x: 0,
        z: 0,
      });
      const plan = computeFloorWallJunctions(segs);
      for (const s of segs) {
        const trims = plan.endTrims.get(s.id);
        const built = buildManifoldWallBodyGeometry(
          s,
          [],
          trims?.start,
          trims?.end
        );
        checkGeoNormals(built.bodyGeo, `${meta.id}:body`);
        if (built.copingGeo) checkGeoNormals(built.copingGeo, `${meta.id}:coping`);
        if (built.trimExtrasGeo)
          checkGeoNormals(built.trimExtrasGeo, `${meta.id}:extras`);
      }
      for (const fp of plan.filletPieces) {
        const fg = buildCornerFilletGeometry(fp);
        assert.ok(fg !== null, `${meta.id} fillet piece must build`);
        checkGeoNormals(fg!, `${meta.id}:fillet(${fp.style})`);
      }
    }

    // Verify room-interior corners face inward `(+X, +Z)` with `-nL` (`interiorColor`),
    // while exterior corners face outward `(+X, +Z)` with `+nL` (`exteriorColor`)!
    const spawnOf = (id: (typeof WALL_TEMPLATES_CATALOG)[number]['id']) => {
      const eng = new ArchBuilderEngine(createEmptyArchHouseData());
      return eng.spawnWallFromTemplateId(id, 'floor_1', { x: 0, z: 0 });
    };

    for (const roomCornerId of [
      'inner-corner-wall',
      'corner-90-wall',
      'rounded-inner-corner',
      'l-shaped-wall',
    ] as const) {
      for (const seg of spawnOf(roomCornerId)) {
        const mid = sampleWallCurvePoint(seg, 0.5);
        // Right normal `-nL = (tz, -tx)` (`interiorColor`) must point toward `(+1, +1)` room interior!
        const intNx = mid.tz;
        const intNz = -mid.tx;
        assert.ok(
          intNx + intNz > 0.5,
          `${roomCornerId} interior face (-nL) must face inward (+X,+Z)`
        );
      }
    }

    for (const extCornerId of [
      'outer-corner-wall',
      'rounded-outer-corner',
    ] as const) {
      for (const seg of spawnOf(extCornerId)) {
        const mid = sampleWallCurvePoint(seg, 0.5);
        // Left normal `+nL = (-tz, tx)` (`exteriorColor`) must point outward `(+X, +Z)` on the convex facade nose!
        const extNx = -mid.tz;
        const extNz = mid.tx;
        assert.ok(
          extNx + extNz > 0.5,
          `${extCornerId} exterior face (+nL) must face outward (+X,+Z)`
        );
      }
    }

    // Verify strict separation across related template families
    const [lowW] = spawnOf('low-wall');
    const [halfW] = spawnOf('half-wall');
    const [strW] = spawnOf('straight-wall');
    const [tallW] = spawnOf('tall-wall');
    assert.ok(
      lowW.height < halfW.height &&
        halfW.height < strW.height &&
        strW.height < tallW.height
    );

    const [thinW] = spawnOf('thin-wall');
    const [thickW] = spawnOf('thick-wall');
    assert.ok(thinW.thickness < strW.thickness && strW.thickness < thickW.thickness);

    const [curvW] = spawnOf('curved-wall');
    const [segW] = spawnOf('circular-wall-segment');
    const [semiW] = spawnOf('semi-circular-wall');
    const sagRatio = (w: typeof curvW) =>
      Math.abs(w.curveBulge) /
      Math.hypot(w.end.x - w.start.x, w.end.z - w.start.z);
    assert.ok(
      sagRatio(curvW) < sagRatio(segW) * 0.55 &&
        sagRatio(segW) < sagRatio(semiW) * 0.72,
      'Curved < Circular-Segment (120°) < Semi-Circular (180°) sagitta ratios must be strictly separated'
    );

    const c90 = spawnOf('corner-90-wall');
    const lShape = spawnOf('l-shaped-wall');
    const ratio90 = computeWallLength(c90[0]) / computeWallLength(c90[1]);
    const ratioL =
      Math.max(computeWallLength(lShape[0]), computeWallLength(lShape[1])) /
      Math.min(computeWallLength(lShape[0]), computeWallLength(lShape[1]));
    assert.ok(Math.abs(ratio90 - 1) < 0.02 && ratioL > 2.0);
  });
});



