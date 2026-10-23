import {
  AppLanguage,
  ArchDetectedRoom,
  ArchHouseData,
  BuildingFloorLayer,
  CURRENT_PROJECT_SCHEMA_VERSION,
  DesignAlternativeRecord,
  DesignAlternativeSnapshot,
  FloorViewMode,
  GridSettings,
  RoomSemanticType,
  SceneObjectData,
} from '../../types/studio';
import { detectAllRoomsAcrossFloors } from '../ArchBuilderEngine';
import {
  evaluateProjectBrief,
  ProjectBriefEvaluation,
} from './briefEvaluator';
import {
  computeActiveBuildingFloorCount,
  computeSitePlacementMetrics,
  SitePlacementMetrics,
} from './geometryMetrics';
import {
  evaluateMaterialTakeoff,
  MaterialTakeoffReport,
} from './materialTakeoff';
import {
  cloneArchHouseData,
  cloneDesignAlternativeRecord,
  cloneFloorLayers,
  cloneSceneObjects,
} from './schemaMigration';
import {
  evaluateSpatialValidation,
  ValidationSummaryReport,
} from './spatialValidator';

export interface IntegratedProjectAnalysisBundle {
  detectedRooms: ArchDetectedRoom[];
  siteMetrics: SitePlacementMetrics;
  briefEval: ProjectBriefEvaluation;
  takeoff: MaterialTakeoffReport;
  validation: ValidationSummaryReport;
  occupiedStories: number;
}

/**
 * Single Shared Deterministic Evaluation Pipeline used identically for:
 * - Active Working Model
 * - Read-Only Alternative Inspection
 * - Side-by-Side Alternative Comparison
 * - Live Design Documentation Export
 */
export function runIntegratedProjectAnalysis(params: {
  archData: ArchHouseData;
  floors: BuildingFloorLayer[];
  objects: SceneObjectData[];
  detectedRoomsOverride?: ArchDetectedRoom[];
  lang: AppLanguage;
}): IntegratedProjectAnalysisBundle {
  const { archData, floors, objects, detectedRoomsOverride, lang } = params;
  const defaultRoomWord =
    lang === 'ja' ? '部屋' : lang === 'en' ? 'Room' : 'Ruang';

  const detectedRooms =
    detectedRoomsOverride ??
    detectAllRoomsAcrossFloors(archData, floors, defaultRoomWord);

  const siteMetrics = computeSitePlacementMetrics(
    archData,
    objects,
    detectedRooms,
    archData.site
  );

  const briefEval = evaluateProjectBrief({
    brief: archData.brief,
    archData,
    floors,
    detectedRooms,
    objects,
    siteMetrics,
    lang,
  });

  const takeoff = evaluateMaterialTakeoff({
    archData,
    floors,
    detectedRooms,
    objects,
    lang,
  });

  const validation = evaluateSpatialValidation({
    archData,
    floors,
    detectedRooms,
    objects,
    briefEval,
    siteMetrics,
    lang,
  });

  const { occupiedFloors } = computeActiveBuildingFloorCount(
    floors,
    archData,
    objects
  );

  return {
    detectedRooms,
    siteMetrics,
    briefEval,
    takeoff,
    validation,
    occupiedStories: occupiedFloors,
  };
}

/**
 * Captures a completely independent, deep-cloned Design Alternative snapshot.
 * Mutating the active scene later will NEVER mutate this saved alternative!
 */
export function createDesignAlternative(params: {
  name: string;
  description?: string;
  thumbnailDataUrl?: string;
  objects: SceneObjectData[];
  floors: BuildingFloorLayer[];
  activeFloorId: string;
  floorViewMode: FloorViewMode;
  archData: ArchHouseData;
  gridSettings?: GridSettings;
  sculptedHeightsB64?: string | null;
}): DesignAlternativeRecord {
  const snapshot: DesignAlternativeSnapshot = {
    objects: cloneSceneObjects(params.objects),
    floors: cloneFloorLayers(params.floors),
    activeFloorId: params.activeFloorId,
    floorViewMode: params.floorViewMode,
    archData: cloneArchHouseData(params.archData),
    gridSettings: params.gridSettings ? { ...params.gridSettings } : undefined,
    sculptedHeightsB64: params.sculptedHeightsB64 ?? null,
  };

  return {
    id: `alt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: params.name.trim() || 'Option',
    description: (params.description ?? '').trim(),
    createdAt: Date.now(),
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    thumbnailDataUrl: params.thumbnailDataUrl,
    snapshot,
  };
}

/**
 * Duplicates an existing Design Alternative as a fresh independent snapshot.
 */
export function duplicateDesignAlternative(
  source: DesignAlternativeRecord,
  copySuffix = ' (Copy)'
): DesignAlternativeRecord {
  const cloned = cloneDesignAlternativeRecord(source);
  return {
    ...cloned,
    id: `alt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${source.name}${copySuffix}`,
    createdAt: Date.now(),
  };
}

export interface AlternativeMetricsColumn {
  label: string;
  totalFloorAreaSqm: number;
  roomCount: number;
  roomCountsByType: Partial<Record<RoomSemanticType, number>>;
  occupiedStories: number;
  footprintAreaSqm: number;
  roofSurfaceAreaSqm: number;
  doorCount: number;
  windowCount: number;
  estimatedMaterialCost: number;
  incompleteCostCoverage: boolean;
  validationErrors: number;
  validationWarnings: number;
  briefMetCount: number;
  briefApplicableCount: number;
  siteCompliant: boolean | null; // null when site planning disabled
}

export interface AlternativeComparisonReport {
  left: AlternativeMetricsColumn;
  right: AlternativeMetricsColumn;
  deltas: {
    floorAreaDiffSqm: number; // right - left
    roomCountDiff: number;
    costDiff: number;
    errorDiff: number;
    warningDiff: number;
  };
}

function summarizeColumn(
  label: string,
  bundle: IntegratedProjectAnalysisBundle
): AlternativeMetricsColumn {
  const roomCountsByType: Partial<Record<RoomSemanticType, number>> = {};
  for (const r of bundle.detectedRooms) {
    roomCountsByType[r.roomType] = (roomCountsByType[r.roomType] ?? 0) + 1;
  }

  const siteCompliant = bundle.siteMetrics.siteEnabled
    ? bundle.siteMetrics.withinSiteBoundary &&
      bundle.siteMetrics.setbacksSatisfied.all
    : null;

  return {
    label,
    totalFloorAreaSqm: bundle.briefEval.totalFloorAreaSqm,
    roomCount: bundle.detectedRooms.length,
    roomCountsByType,
    occupiedStories: bundle.occupiedStories,
    footprintAreaSqm: bundle.siteMetrics.footprint.footprintAreaSqm,
    roofSurfaceAreaSqm: bundle.takeoff.geometryTotals.roofSlopedAreaSqm,
    doorCount: bundle.takeoff.geometryTotals.doorCount,
    windowCount: bundle.takeoff.geometryTotals.windowCount,
    estimatedMaterialCost: bundle.takeoff.totalEstimatedMaterialCost,
    incompleteCostCoverage:
      bundle.takeoff.missingAssignments.length > 0 ||
      bundle.takeoff.unpricedItems.length > 0,
    validationErrors: bundle.validation.errorCount,
    validationWarnings: bundle.validation.warningCount,
    briefMetCount: bundle.briefEval.metCount,
    briefApplicableCount: bundle.briefEval.totalApplicableCount,
    siteCompliant,
  };
}

/**
 * Compares any two states (e.g., Active Project vs Saved Alternative, or Alternative A vs Alternative B)
 * using the exact same metric definitions and rules.
 */
export function compareDesignStates(params: {
  leftLabel: string;
  leftState: Pick<DesignAlternativeSnapshot, 'archData' | 'floors' | 'objects'>;
  rightLabel: string;
  rightState: Pick<DesignAlternativeSnapshot, 'archData' | 'floors' | 'objects'>;
  lang: AppLanguage;
}): AlternativeComparisonReport {
  const leftBundle = runIntegratedProjectAnalysis({
    archData: params.leftState.archData,
    floors: params.leftState.floors,
    objects: params.leftState.objects,
    lang: params.lang,
  });
  const rightBundle = runIntegratedProjectAnalysis({
    archData: params.rightState.archData,
    floors: params.rightState.floors,
    objects: params.rightState.objects,
    lang: params.lang,
  });

  const left = summarizeColumn(params.leftLabel, leftBundle);
  const right = summarizeColumn(params.rightLabel, rightBundle);

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    left,
    right,
    deltas: {
      floorAreaDiffSqm: round2(
        right.totalFloorAreaSqm - left.totalFloorAreaSqm
      ),
      roomCountDiff: right.roomCount - left.roomCount,
      costDiff: round2(
        right.estimatedMaterialCost - left.estimatedMaterialCost
      ),
      errorDiff: right.validationErrors - left.validationErrors,
      warningDiff: right.validationWarnings - left.validationWarnings,
    },
  };
}
