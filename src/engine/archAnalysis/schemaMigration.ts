import {
  ArchHouseData,
  BuildingFloorLayer,
  ConstructionMaterialDef,
  createDefaultBuildingFloors,
  createDefaultDocSettings,
  createDefaultProjectBrief,
  createDefaultSitePlanningData,
  CURRENT_PROJECT_SCHEMA_VERSION,
  DEFAULT_SUN_ENVIRONMENT,
  DesignAlternativeRecord,
  ProjectBriefData,
  SceneObjectData,
  SerializedProjectFile,
  SitePlanningData,
} from '../../types/studio';
import { createDefaultConstructionMaterialCatalog } from './materialTakeoff';

export function cloneProjectBrief(
  src?: Partial<ProjectBriefData>
): ProjectBriefData {
  const def = createDefaultProjectBrief();
  if (!src) return def;
  return {
    id: src.id || def.id,
    projectType: src.projectType ?? '',
    description: src.description ?? '',
    preferredStyle: src.preferredStyle ?? '',
    freeformNotes: src.freeformNotes ?? '',
    requirements: Array.isArray(src.requirements)
      ? src.requirements.map((r) => ({ ...r }))
      : [],
    targetBudget: src.targetBudget
      ? { ...def.targetBudget, ...src.targetBudget }
      : { ...def.targetBudget },
  };
}

export function cloneMaterialCatalog(
  src?: ConstructionMaterialDef[]
): ConstructionMaterialDef[] {
  if (!Array.isArray(src) || src.length === 0) {
    return createDefaultConstructionMaterialCatalog();
  }
  return src.map((m) => ({
    ...m,
    name: { ...m.name },
  }));
}

export function cloneSitePlanningData(
  src?: Partial<SitePlanningData>
): SitePlanningData {
  const def = createDefaultSitePlanningData();
  if (!src) return def;
  return {
    enabled: Boolean(src.enabled),
    width: typeof src.width === 'number' && src.width >= 1 ? src.width : def.width,
    depth: typeof src.depth === 'number' && src.depth >= 1 ? src.depth : def.depth,
    center: src.center
      ? { x: Number(src.center.x) || 0, z: Number(src.center.z) || 0 }
      : { ...def.center },
    shapePreset: src.shapePreset ?? 'rect',
    polygon: Array.isArray(src.polygon)
      ? src.polygon.map((p) => ({ x: Number(p.x) || 0, z: Number(p.z) || 0 }))
      : undefined,
    setbacksEnabled:
      src.setbacksEnabled !== undefined ? Boolean(src.setbacksEnabled) : true,
    setbacks: src.setbacks
      ? {
          front: Math.max(0, Number(src.setbacks.front) || 0),
          rear: Math.max(0, Number(src.setbacks.rear) || 0),
          left: Math.max(0, Number(src.setbacks.left) || 0),
          right: Math.max(0, Number(src.setbacks.right) || 0),
        }
      : { ...def.setbacks },
    entranceSide: src.entranceSide ?? 'front',
    snapToSite: Boolean(src.snapToSite),
    outdoorZones: Array.isArray(src.outdoorZones)
      ? src.outdoorZones.map((z) => ({
          ...z,
          center: { ...z.center },
        }))
      : [],
  };
}

/**
 * Deep-clones `ArchHouseData` completely so active model edits, Undo/Redo, and saved Design
 * Alternatives NEVER share mutable object references! Also seamlessly migrates legacy v1 data.
 */
export function cloneArchHouseData(
  src?: Partial<ArchHouseData> | null
): ArchHouseData {
  const defaultsDoc = createDefaultDocSettings();
  return {
    walls: Array.isArray(src?.walls)
      ? src!.walls.map((w) => ({
          ...w,
          start: { ...w.start },
          end: { ...w.end },
        }))
      : [],
    openings: Array.isArray(src?.openings)
      ? src!.openings.map((o) => ({ ...o }))
      : [],
    roomMetas: Array.isArray(src?.roomMetas)
      ? src!.roomMetas.map((r) => ({
          ...r,
          centroid: { ...r.centroid },
        }))
      : [],
    stairs: Array.isArray(src?.stairs)
      ? src!.stairs.map((s) => ({
          ...s,
          position: { ...s.position },
        }))
      : [],
    roofs: Array.isArray(src?.roofs)
      ? src!.roofs.map((rf) => ({
          ...rf,
          center: { ...rf.center },
        }))
      : [],
    sun: src?.sun
      ? { ...DEFAULT_SUN_ENVIRONMENT, ...src.sun }
      : { ...DEFAULT_SUN_ENVIRONMENT },
    brief: cloneProjectBrief(src?.brief),
    materialCatalog: cloneMaterialCatalog(src?.materialCatalog),
    site: cloneSitePlanningData(src?.site),
    docSettings: src?.docSettings
      ? { ...defaultsDoc, ...src.docSettings }
      : defaultsDoc,
  };
}

export function cloneSceneObjects(
  objects?: SceneObjectData[] | null
): SceneObjectData[] {
  if (!Array.isArray(objects)) return [];
  return objects.map((o) => ({
    ...o,
    position: { ...o.position },
    rotation: { ...o.rotation },
    scale: { ...o.scale },
    subdivision: { ...o.subdivision },
    modifiers: o.modifiers ? { ...o.modifiers } : undefined,
    pointLight: o.pointLight ? { ...o.pointLight } : undefined,
    csgOperations: Array.isArray(o.csgOperations)
      ? o.csgOperations.map((op) => ({
          ...op,
          relativeMatrix: [...op.relativeMatrix],
          subdivision: op.subdivision ? { ...op.subdivision } : undefined,
          modifiers: op.modifiers ? { ...op.modifiers } : undefined,
          customProfile: op.customProfile
            ? {
                ...op.customProfile,
                points: op.customProfile.points.map((pt) => ({ ...pt })),
              }
            : undefined,
        }))
      : undefined,
    customProfile: o.customProfile
      ? {
          ...o.customProfile,
          points: o.customProfile.points.map((pt) => ({ ...pt })),
        }
      : undefined,
  }));
}

export function cloneFloorLayers(
  floors?: BuildingFloorLayer[] | null
): BuildingFloorLayer[] {
  if (!Array.isArray(floors) || floors.length === 0) {
    return createDefaultBuildingFloors('id');
  }
  return floors.map((f) => ({ ...f }));
}

export function cloneDesignAlternativeRecord(
  alt: DesignAlternativeRecord
): DesignAlternativeRecord {
  return {
    ...alt,
    schemaVersion: alt.schemaVersion || CURRENT_PROJECT_SCHEMA_VERSION,
    snapshot: {
      objects: cloneSceneObjects(alt.snapshot?.objects),
      floors: cloneFloorLayers(alt.snapshot?.floors),
      activeFloorId: alt.snapshot?.activeFloorId || 'floor_1',
      floorViewMode: alt.snapshot?.floorViewMode || 'all',
      archData: cloneArchHouseData(alt.snapshot?.archData),
      gridSettings: alt.snapshot?.gridSettings
        ? { ...alt.snapshot.gridSettings }
        : undefined,
      sculptedHeightsB64: alt.snapshot?.sculptedHeightsB64 ?? null,
    },
  };
}

/**
 * Backward-compatible migration for older `.perabot` files and IndexedDB project records.
 * Preserves 100% of existing geometry/objects while ensuring all v2 architectural contracts exist.
 */
export function migrateSerializedProjectFile(
  raw: SerializedProjectFile
): SerializedProjectFile {
  const migratedArch =
    raw.mode === 'house' || raw.archData
      ? cloneArchHouseData(raw.archData)
      : undefined;

  const migratedAlts = Array.isArray(raw.designAlternatives)
    ? raw.designAlternatives.map(cloneDesignAlternativeRecord)
    : [];

  return {
    ...raw,
    format: 'perabot-project-v1',
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    objects: cloneSceneObjects(raw.objects),
    floors: raw.floors ? cloneFloorLayers(raw.floors) : undefined,
    archData: migratedArch,
    designAlternatives: migratedAlts,
  };
}
