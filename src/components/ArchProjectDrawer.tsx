import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Compass,
  Copy,
  Crosshair,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Info,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sliders,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  ArchDocumentKind,
  ArchHouseData,
  ArchWorkflowTab,
  BriefTemplateId,
  BuildingFloorLayer,
  ConstructionMaterialCategory,
  ConstructionMaterialDef,
  createDefaultDocSettings,
  createDefaultProjectBrief,
  createDefaultSitePlanningData,
  DesignAlternativeRecord,
  DesignAlternativeSnapshot,
  DocumentationExportSettings,
  ElevationViewDirection,
  FloorViewMode,
  GridSettings,
  MaterialUnitKind,
  OutdoorZoneKind,
  ProjectBriefData,
  ProjectRequirementItem,
  RequirementKind,
  RequirementMetricTarget,
  RequirementPriority,
  RoomSemanticType,
  SceneObjectData,
  SiteEdgeSide,
  SiteOutdoorZone,
  SitePlanningData,
  ValidationAutoFixAction,
  ValidationCategory,
} from '../types/studio';
import { StudioStrings } from '../i18n/translations';
import {
  buildProjectBriefFromTemplate,
  ROOM_TYPE_LABELS,
} from '../engine/archAnalysis/briefEvaluator';
import {
  compareDesignStates,
  createDesignAlternative,
  duplicateDesignAlternative,
  IntegratedProjectAnalysisBundle,
  runIntegratedProjectAnalysis,
} from '../engine/archAnalysis/alternativesService';
import {
  createDefaultConstructionMaterialCatalog,
  getMaterialDisplayName,
} from '../engine/archAnalysis/materialTakeoff';
import {
  exportElevationDrawingPNG,
  exportFloorBlueprintPNG,
  exportPrintableArchitecturalReportHTML,
  exportSitePlanPNG,
  generateDoorWindowSchedule,
} from '../engine/blueprintExporter';

interface ArchProjectDrawerProps {
  open: boolean;
  activeTab: ArchWorkflowTab;
  onSelectTab: (tab: ArchWorkflowTab) => void;
  onClose: () => void;
  lang: AppLanguage;
  t: StudioStrings;
  projectName: string;
  archData: ArchHouseData;
  floors: BuildingFloorLayer[];
  activeFloorId: string;
  floorViewMode: FloorViewMode;
  objects: SceneObjectData[];
  gridSettings: GridSettings;
  sculptedHeightsB64: string | null;
  liveAnalysis: IntegratedProjectAnalysisBundle;
  isUpdatingAnalysis: boolean;
  alternatives: DesignAlternativeRecord[];
  onChangeAlternatives: (next: DesignAlternativeRecord[]) => void;
  onCaptureThumbnail?: () => string | undefined;
  onUpdateBrief: (next: ProjectBriefData) => void;
  onUpdateCatalog: (next: ConstructionMaterialDef[]) => void;
  onUpdateSite: (next: SitePlanningData) => void;
  onUpdateDocSettings: (next: DocumentationExportSettings) => void;
  onUpdateRoomType: (roomId: string, roomType: RoomSemanticType) => void;
  onAutoAssignDefaultMaterials: () => void;
  onShiftBuildingOnSite: (dx: number, dz: number) => void;
  onRotateBuilding90: () => void;
  onApplyAutoFix: (action: ValidationAutoFixAction) => void;
  onFocusElement: (
    domain: 'wall' | 'opening' | 'room' | 'stair' | 'roof' | 'object' | 'site' | 'brief',
    id: string
  ) => void;
  onRestoreAlternative: (snapshot: DesignAlternativeSnapshot) => void;
  onRerunValidation: () => void;
}

const ASSIGNABLE_ROOM_TYPES: Array<Exclude<RoomSemanticType, 'unassigned'>> = [
  'living',
  'bedroom',
  'bathroom',
  'kitchen',
  'dining',
  'study',
  'garage',
  'terrace',
  'storage',
  'other',
];

const OUTDOOR_ZONE_COLORS: Record<OutdoorZoneKind, string> = {
  garden: '#4ade80',
  driveway: '#94a3b8',
  patio: '#d97706',
  walkway: '#cbd5e1',
  parking: '#64748b',
  recreation: '#38bdf8',
};

function formatCurrencyIDR(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export const ArchProjectDrawer: React.FC<ArchProjectDrawerProps> = ({
  open,
  activeTab,
  onSelectTab,
  onClose,
  lang,
  t,
  projectName,
  archData,
  floors,
  activeFloorId,
  floorViewMode,
  objects,
  gridSettings,
  sculptedHeightsB64,
  liveAnalysis,
  isUpdatingAnalysis,
  alternatives,
  onChangeAlternatives,
  onCaptureThumbnail,
  onUpdateBrief,
  onUpdateCatalog,
  onUpdateSite,
  onUpdateDocSettings,
  onUpdateRoomType,
  onAutoAssignDefaultMaterials,
  onShiftBuildingOnSite,
  onRotateBuilding90,
  onApplyAutoFix,
  onFocusElement,
  onRestoreAlternative,
  onRerunValidation,
}) => {
  // Read-only Alternative Inspection state (System 3: inspect without overwriting active model!)
  const [inspectedAltId, setInspectedAltId] = useState<string | null>(null);

  // Validation filter state (System 4)
  const [valCategoryFilter, setValCategoryFilter] = useState<
    ValidationCategory | 'all'
  >('all');

  // New Alternative form state (System 3)
  const [newAltName, setNewAltName] = useState('');
  const [newAltDesc, setNewAltDesc] = useState('');
  const [compareLeftId, setCompareLeftId] = useState<string>('__active__');
  const [compareRightId, setCompareRightId] = useState<string>('');
  const [pendingRestoreAltId, setPendingRestoreAltId] = useState<string | null>(
    null
  );

  // Material Catalog editor toggle & custom material form (System 2)
  const [showCatalogEditor, setShowCatalogEditor] = useState(false);
  const [customMatName, setCustomMatName] = useState('');
  const [customMatCategory, setCustomMatCategory] =
    useState<ConstructionMaterialCategory>('finish-wall');
  const [customMatUnit, setCustomMatUnit] = useState<MaterialUnitKind>('m2');
  const [customMatPrice, setCustomMatPrice] = useState('120000');

  // Documentation source & floor selector (System 6)
  const [docSourceId, setDocSourceId] = useState<string>('__active__');
  const [docFloorId, setDocFloorId] = useState<string>(activeFloorId);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string>('');

  useEffect(() => {
    setDocFloorId(activeFloorId);
  }, [activeFloorId]);

  useEffect(() => {
    if (
      inspectedAltId &&
      !alternatives.some((a) => a.id === inspectedAltId)
    ) {
      setInspectedAltId(null);
    }
    if (
      compareRightId &&
      compareRightId !== '__active__' &&
      !alternatives.some((a) => a.id === compareRightId)
    ) {
      setCompareRightId(alternatives[0]?.id ?? '');
    } else if (!compareRightId && alternatives.length > 0) {
      setCompareRightId(alternatives[0].id);
    }
  }, [alternatives, inspectedAltId, compareRightId]);

  const inspectedAlt = useMemo(
    () => alternatives.find((a) => a.id === inspectedAltId) ?? null,
    [alternatives, inspectedAltId]
  );

  // If inspecting a saved alternative, run the identical analysis pipeline on its snapshot read-only!
  const effectiveAnalysis = useMemo<IntegratedProjectAnalysisBundle>(() => {
    if (!inspectedAlt) return liveAnalysis;
    return runIntegratedProjectAnalysis({
      archData: inspectedAlt.snapshot.archData,
      floors: inspectedAlt.snapshot.floors,
      objects: inspectedAlt.snapshot.objects,
      lang,
    });
  }, [inspectedAlt, liveAnalysis, lang]);

  const effectiveArchData = inspectedAlt
    ? inspectedAlt.snapshot.archData
    : archData;
  const brief = effectiveArchData.brief ?? createDefaultProjectBrief();
  const site = effectiveArchData.site ?? createDefaultSitePlanningData();
  const catalog =
    effectiveArchData.materialCatalog &&
    effectiveArchData.materialCatalog.length > 0
      ? effectiveArchData.materialCatalog
      : createDefaultConstructionMaterialCatalog();
  const docSettings = archData.docSettings ?? createDefaultDocSettings();

  // Comparison calculation (System 3)
  const comparisonReport = useMemo(() => {
    const resolveSide = (id: string) => {
      if (id === '__active__') {
        return {
          label: t.altActiveWorkingLabel,
          state: { archData, floors, objects },
        };
      }
      const found = alternatives.find((a) => a.id === id);
      if (!found) return null;
      return {
        label: found.name,
        state: {
          archData: found.snapshot.archData,
          floors: found.snapshot.floors,
          objects: found.snapshot.objects,
        },
      };
    };

    const left = resolveSide(compareLeftId);
    const right = resolveSide(compareRightId);
    if (!left || !right || compareLeftId === compareRightId) return null;

    return compareDesignStates({
      leftLabel: left.label,
      leftState: left.state,
      rightLabel: right.label,
      rightState: right.state,
      lang,
    });
  }, [compareLeftId, compareRightId, alternatives, archData, floors, objects, lang, t.altActiveWorkingLabel]);

  // Documentation source resolver (Active Working Model OR Selected Alternative!)
  const docTarget = useMemo(() => {
    if (docSourceId !== '__active__') {
      const alt = alternatives.find((a) => a.id === docSourceId);
      if (alt) {
        const analysis = runIntegratedProjectAnalysis({
          archData: alt.snapshot.archData,
          floors: alt.snapshot.floors,
          objects: alt.snapshot.objects,
          lang,
        });
        return {
          label: alt.name,
          archData: alt.snapshot.archData,
          floors: alt.snapshot.floors,
          objects: alt.snapshot.objects,
          analysis,
        };
      }
    }
    return {
      label: t.altActiveWorkingLabel,
      archData,
      floors,
      objects,
      analysis: liveAnalysis,
    };
  }, [docSourceId, alternatives, archData, floors, objects, liveAnalysis, lang, t.altActiveWorkingLabel]);

  // Generate Live Canvas Sheet Preview whenever Docs tab is open on a graphic sheet!
  useEffect(() => {
    if (!open || activeTab !== 'docs') return;
    const kind = docSettings.selectedDocKind;
    if (kind === 'floor-plan') {
      const fl =
        docTarget.floors.find((f) => f.id === docFloorId) ??
        docTarget.floors[0];
      if (!fl) return;
      const url = exportFloorBlueprintPNG({
        projectName,
        floor: fl,
        archData: docTarget.archData,
        detectedRooms: docTarget.analysis.detectedRooms,
        paperTheme: docSettings.paperTheme,
        showDimensions: docSettings.showDimensions,
        showRoomLabels: docSettings.showRoomLabels,
        sourceLabel: docTarget.label,
        lang,
        download: false,
      });
      setDocPreviewUrl(url);
    } else if (kind === 'site-plan') {
      const url = exportSitePlanPNG({
        projectName,
        archData: docTarget.archData,
        objects: docTarget.objects,
        detectedRooms: docTarget.analysis.detectedRooms,
        paperTheme: docSettings.paperTheme,
        showSetbacks: docSettings.showSetbacks,
        sourceLabel: docTarget.label,
        download: false,
      });
      setDocPreviewUrl(url);
    } else if (kind === 'elevation') {
      const url = exportElevationDrawingPNG({
        projectName,
        direction: docSettings.elevationDirection,
        archData: docTarget.archData,
        floors: docTarget.floors,
        paperTheme: docSettings.paperTheme,
        sourceLabel: docTarget.label,
        download: false,
      });
      setDocPreviewUrl(url);
    } else {
      setDocPreviewUrl('');
    }
  }, [
    open,
    activeTab,
    projectName,
    docFloorId,
    docSettings,
    docTarget,
    lang,
  ]);

  if (!open) return null;

  const isReadOnlyInspect = Boolean(inspectedAlt);
  const valSummary = effectiveAnalysis.validation;
  const filteredFindings =
    valCategoryFilter === 'all'
      ? valSummary.findings
      : valSummary.findings.filter((f) => f.category === valCategoryFilter);

  const scheduleRows =
    activeTab === 'docs' && docSettings.selectedDocKind === 'door-window-schedule'
      ? generateDoorWindowSchedule({
          archData: docTarget.archData,
          floors: docTarget.floors,
          lang,
        })
      : [];

  /* ---- Brief Handlers ---- */
  const handleApplyBriefTemplate = (tplId: BriefTemplateId) => {
    if (isReadOnlyInspect) return;
    onUpdateBrief(buildProjectBriefFromTemplate(tplId, lang));
  };

  const handleAddBriefRequirement = () => {
    if (isReadOnlyInspect) return;
    const item: ProjectRequirementItem = {
      id: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      kind: 'required',
      metric: 'room-count',
      label: ROOM_TYPE_LABELS.bedroom[lang],
      roomType: 'bedroom',
      targetCount: 1,
      minVal: 9,
      priority: 'normal',
      enabled: true,
    };
    onUpdateBrief({
      ...brief,
      requirements: [...brief.requirements, item],
    });
  };

  const handlePatchRequirement = (
    reqId: string,
    patch: Partial<ProjectRequirementItem>
  ) => {
    if (isReadOnlyInspect) return;
    onUpdateBrief({
      ...brief,
      requirements: brief.requirements.map((r) => {
        if (r.id !== reqId) return r;
        const merged = { ...r, ...patch };
        if (patch.roomType && merged.metric === 'room-count') {
          merged.label = ROOM_TYPE_LABELS[patch.roomType][lang];
        }
        return merged;
      }),
    });
  };

  const handleDeleteRequirement = (reqId: string) => {
    if (isReadOnlyInspect) return;
    onUpdateBrief({
      ...brief,
      requirements: brief.requirements.filter((r) => r.id !== reqId),
    });
  };

  /* ---- Site Handlers ---- */
  const handleCenterBuildingOnPlot = () => {
    if (isReadOnlyInspect) return;
    const fp = effectiveAnalysis.siteMetrics.footprint;
    if (!fp.hasBuilding) return;
    const dx = site.center.x - fp.center.x;
    const dz = site.center.z - fp.center.z;
    onShiftBuildingOnSite(dx, dz);
  };

  const handleAddOutdoorZone = (kind: OutdoorZoneKind = 'garden') => {
    if (isReadOnlyInspect) return;
    const zone: SiteOutdoorZone = {
      id: `zone_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      name:
        kind === 'garden'
          ? lang === 'ja'
            ? '庭・ガーデン'
            : lang === 'en'
            ? 'Garden'
            : 'Taman'
          : kind === 'driveway'
          ? lang === 'ja'
            ? 'アプローチ車路'
            : lang === 'en'
            ? 'Driveway'
            : 'Jalur Kendaraan'
          : kind === 'patio'
          ? 'Patio / Deck'
          : 'Outdoor Zone',
      kind,
      center: {
        x: site.center.x,
        z: site.center.z + site.depth * 0.28,
      },
      width: 4.5,
      depth: 3.0,
      color: OUTDOOR_ZONE_COLORS[kind],
      surfaceMaterialId:
        kind === 'patio'
          ? 'mat_timber_framing'
          : kind === 'driveway' || kind === 'walkway' || kind === 'parking'
          ? 'mat_outdoor_paving'
          : undefined,
    };
    onUpdateSite({
      ...site,
      enabled: true,
      outdoorZones: [...site.outdoorZones, zone],
    });
  };

  /* ---- Material Catalog Handlers ---- */
  const handlePatchMaterialDef = (
    matId: string,
    patch: Partial<ConstructionMaterialDef>
  ) => {
    if (isReadOnlyInspect) return;
    const next = catalog.map((m) =>
      m.id === matId ? { ...m, ...patch, sourceKind: 'user-defined' as const } : m
    );
    onUpdateCatalog(next);
  };

  const handleCreateCustomMaterial = () => {
    if (isReadOnlyInspect || !customMatName.trim()) return;
    const parsedPrice = Number(customMatPrice);
    const created: ConstructionMaterialDef = {
      id: `mat_custom_${Date.now().toString(36)}`,
      name: {
        id: customMatName.trim(),
        en: customMatName.trim(),
        ja: customMatName.trim(),
      },
      customName: customMatName.trim(),
      category: customMatCategory,
      unit: customMatUnit,
      unitPrice:
        customMatPrice.trim() === '' || !Number.isFinite(parsedPrice)
          ? undefined
          : Math.max(0, parsedPrice),
      currency: 'IDR',
      wastePercentage: customMatUnit === 'pcs' ? 0 : 5,
      supportsWaste: customMatUnit !== 'pcs',
      sourceKind: 'user-defined',
      priceDate: new Date().toISOString().slice(0, 10),
    };
    onUpdateCatalog([...catalog, created]);
    setCustomMatName('');
  };

  /* ---- Alternatives Handlers ---- */
  const handleSaveCurrentAsAlternative = () => {
    const defaultName =
      newAltName.trim() ||
      `${lang === 'ja' ? '設計案' : lang === 'en' ? 'Option' : 'Opsi'} ${
        alternatives.length + 1
      }`;
    const thumb = onCaptureThumbnail?.();
    const record = createDesignAlternative({
      name: defaultName,
      description: newAltDesc,
      thumbnailDataUrl: thumb,
      objects,
      floors,
      activeFloorId,
      floorViewMode,
      archData,
      gridSettings,
      sculptedHeightsB64,
    });
    const nextList = [record, ...alternatives];
    onChangeAlternatives(nextList);
    setCompareRightId(record.id);
    setNewAltName('');
    setNewAltDesc('');
  };

  /* ---- Documentation Download Handlers ---- */
  const handleDownloadCurrentDocPNG = () => {
    const kind = docSettings.selectedDocKind;
    if (kind === 'floor-plan') {
      const fl =
        docTarget.floors.find((f) => f.id === docFloorId) ??
        docTarget.floors[0];
      if (!fl) return;
      exportFloorBlueprintPNG({
        projectName,
        floor: fl,
        archData: docTarget.archData,
        detectedRooms: docTarget.analysis.detectedRooms,
        paperTheme: docSettings.paperTheme,
        showDimensions: docSettings.showDimensions,
        showRoomLabels: docSettings.showRoomLabels,
        sourceLabel: docTarget.label,
        lang,
        download: true,
      });
    } else if (kind === 'site-plan') {
      exportSitePlanPNG({
        projectName,
        archData: docTarget.archData,
        objects: docTarget.objects,
        detectedRooms: docTarget.analysis.detectedRooms,
        paperTheme: docSettings.paperTheme,
        showSetbacks: docSettings.showSetbacks,
        sourceLabel: docTarget.label,
        download: true,
      });
    } else if (kind === 'elevation') {
      exportElevationDrawingPNG({
        projectName,
        direction: docSettings.elevationDirection,
        archData: docTarget.archData,
        floors: docTarget.floors,
        paperTheme: docSettings.paperTheme,
        sourceLabel: docTarget.label,
        download: true,
      });
    }
  };

  const handleDownloadReportPackageHTML = () => {
    exportPrintableArchitecturalReportHTML({
      projectName,
      sourceLabel: docTarget.label,
      archData: docTarget.archData,
      floors: docTarget.floors,
      objects: docTarget.objects,
      lang,
      download: true,
    });
  };

  return (
    <aside className="arch-workflow-drawer" aria-label={t.archWorkflowTitle}>
      {/* Header */}
      <div className="arch-wf-header">
        <div className="arch-wf-header-title">
          <Layers size={16} />
          <span>{t.archWorkflowTitle}</span>
          {isUpdatingAnalysis && (
            <span className="arch-wf-updating-pill">{t.archWorkflowUpdating}</span>
          )}
        </div>
        <button
          type="button"
          className="frameless-close-btn"
          onClick={onClose}
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Read-Only Alternative Inspection Banner */}
      {inspectedAlt && (
        <div className="arch-wf-inspect-banner">
          <div className="arch-wf-inspect-info">
            <Eye size={14} />
            <span>
              <strong>{inspectedAlt.name}</strong> — {t.altInspectingBanner}
            </span>
          </div>
          <button
            type="button"
            className="arch-wf-mini-btn"
            onClick={() => setInspectedAltId(null)}
          >
            {t.altCloseInspectBtn}
          </button>
        </div>
      )}

      {/* 6 Integrated Workflow Tabs */}
      <div className="arch-wf-tabs" role="tablist">
        <button
          type="button"
          className={`arch-wf-tab ${activeTab === 'brief' ? 'active' : ''}`}
          onClick={() => onSelectTab('brief')}
        >
          <ClipboardList size={13} />
          <span>{t.wfTabBrief}</span>
          {effectiveAnalysis.briefEval.totalApplicableCount > 0 && (
            <span className="arch-wf-tab-badge">
              {effectiveAnalysis.briefEval.metCount}/
              {effectiveAnalysis.briefEval.totalApplicableCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`arch-wf-tab ${activeTab === 'site' ? 'active' : ''}`}
          onClick={() => onSelectTab('site')}
        >
          <Compass size={13} />
          <span>{t.wfTabSite}</span>
        </button>
        <button
          type="button"
          className={`arch-wf-tab ${activeTab === 'materials' ? 'active' : ''}`}
          onClick={() => onSelectTab('materials')}
        >
          <FileSpreadsheet size={13} />
          <span>{t.wfTabMaterials}</span>
        </button>
        <button
          type="button"
          className={`arch-wf-tab ${activeTab === 'validation' ? 'active' : ''}`}
          onClick={() => onSelectTab('validation')}
        >
          <ShieldCheck size={13} />
          <span>{t.wfTabValidation}</span>
          {(valSummary.errorCount > 0 || valSummary.warningCount > 0) && (
            <span
              className={`arch-wf-tab-badge ${
                valSummary.errorCount > 0 ? 'danger' : 'warn'
              }`}
            >
              {valSummary.errorCount + valSummary.warningCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`arch-wf-tab ${activeTab === 'versions' ? 'active' : ''}`}
          onClick={() => onSelectTab('versions')}
        >
          <GitBranch size={13} />
          <span>{t.wfTabVersions}</span>
          {alternatives.length > 0 && (
            <span className="arch-wf-tab-badge">{alternatives.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`arch-wf-tab ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => onSelectTab('docs')}
        >
          <FileText size={13} />
          <span>{t.wfTabDocs}</span>
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="arch-wf-body">
        {/* =====================================================
            TAB 1: PROJECT BRIEF & REQUIREMENTS (System 1)
            ===================================================== */}
        {activeTab === 'brief' && (
          <div className="arch-wf-section-stack">
            <div className="arch-wf-card">
              <div className="arch-wf-card-title">{t.briefTemplateLabel}</div>
              <div className="arch-wf-chip-wrap">
                {(
                  [
                    ['single-storey', t.briefTplSingleStorey],
                    ['two-storey-family', t.briefTplTwoStorey],
                    ['modern-minimalist', t.briefTplMinimalist],
                    ['home-with-garage', t.briefTplGarage],
                    ['blank-custom', t.briefTplBlank],
                  ] as Array<[BriefTemplateId, string]>
                ).map(([tplId, label]) => (
                  <button
                    key={tplId}
                    type="button"
                    disabled={isReadOnlyInspect}
                    className="arch-wf-chip-btn"
                    onClick={() => handleApplyBriefTemplate(tplId)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="arch-wf-form-grid">
                <label className="arch-wf-field">
                  <span>{t.briefProjectTypeLabel}</span>
                  <input
                    type="text"
                    disabled={isReadOnlyInspect}
                    value={brief.projectType}
                    onChange={(e) =>
                      onUpdateBrief({ ...brief, projectType: e.target.value })
                    }
                    placeholder="e.g. Rumah Keluarga 2 Lantai"
                  />
                </label>
                <label className="arch-wf-field">
                  <span>{t.briefStyleLabel}</span>
                  <input
                    type="text"
                    disabled={isReadOnlyInspect}
                    value={brief.preferredStyle}
                    onChange={(e) =>
                      onUpdateBrief({ ...brief, preferredStyle: e.target.value })
                    }
                    placeholder="e.g. Tropis Minimalis"
                  />
                </label>
              </div>
              <label className="arch-wf-field">
                <span>{t.briefDescLabel}</span>
                <textarea
                  rows={2}
                  disabled={isReadOnlyInspect}
                  value={brief.description}
                  onChange={(e) =>
                    onUpdateBrief({ ...brief, description: e.target.value })
                  }
                />
              </label>
              <label className="arch-wf-field">
                <span>{t.briefNotesLabel}</span>
                <textarea
                  rows={2}
                  disabled={isReadOnlyInspect}
                  value={brief.freeformNotes}
                  onChange={(e) =>
                    onUpdateBrief({ ...brief, freeformNotes: e.target.value })
                  }
                />
              </label>
            </div>

            {/* Optional Target Budget */}
            <div className="arch-wf-card">
              <div className="arch-wf-row-between">
                <span className="arch-wf-card-title">{t.briefBudgetTitle}</span>
                <input
                  type="checkbox"
                  disabled={isReadOnlyInspect}
                  checked={brief.targetBudget.enabled}
                  onChange={(e) =>
                    onUpdateBrief({
                      ...brief,
                      targetBudget: {
                        ...brief.targetBudget,
                        enabled: e.target.checked,
                      },
                    })
                  }
                />
              </div>
              {brief.targetBudget.enabled && (
                <div className="arch-wf-form-grid">
                  <label className="arch-wf-field">
                    <span>IDR</span>
                    <input
                      type="number"
                      min={0}
                      step={5000000}
                      disabled={isReadOnlyInspect}
                      value={brief.targetBudget.amount}
                      onChange={(e) =>
                        onUpdateBrief({
                          ...brief,
                          targetBudget: {
                            ...brief.targetBudget,
                            amount: Math.max(0, Number(e.target.value) || 0),
                          },
                        })
                      }
                    />
                  </label>
                  <label className="arch-wf-field">
                    <span>Scope</span>
                    <select
                      disabled={isReadOnlyInspect}
                      value={brief.targetBudget.scope}
                      onChange={(e) =>
                        onUpdateBrief({
                          ...brief,
                          targetBudget: {
                            ...brief.targetBudget,
                            scope: e.target.value as ProjectBriefData['targetBudget']['scope'],
                          },
                        })
                      }
                    >
                      <option value="materials">{t.briefBudgetScopeMaterials}</option>
                      <option value="construction">
                        {t.briefBudgetScopeConstruction}
                      </option>
                      <option value="custom">{t.briefBudgetScopeCustom}</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            {/* Explicit Room Categorizer when rooms exist */}
            {effectiveAnalysis.detectedRooms.length > 0 && (
              <div className="arch-wf-card">
                <div className="arch-wf-card-title">
                  {t.briefUnassignedRoomsTitle} ({effectiveAnalysis.detectedRooms.length})
                </div>
                <div className="arch-wf-room-assign-list">
                  {effectiveAnalysis.detectedRooms.map((rm) => (
                    <div key={rm.id} className="arch-wf-room-assign-row">
                      <div className="arch-wf-room-assign-meta">
                        <strong>{rm.name}</strong>
                        <span>{rm.areaSqm.toFixed(1)} m²</span>
                      </div>
                      <select
                        disabled={isReadOnlyInspect}
                        value={rm.roomType}
                        onChange={(e) =>
                          onUpdateRoomType(
                            rm.id,
                            e.target.value as RoomSemanticType
                          )
                        }
                      >
                        <option value="unassigned">
                          {ROOM_TYPE_LABELS.unassigned[lang]}
                        </option>
                        {ASSIGNABLE_ROOM_TYPES.map((rt) => (
                          <option key={rt} value={rt}>
                            {ROOM_TYPE_LABELS[rt][lang]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="arch-wf-mini-btn"
                        onClick={() => onFocusElement('room', rm.id)}
                      >
                        <Crosshair size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements Evaluation List */}
            <div className="arch-wf-card">
              <div className="arch-wf-row-between">
                <span className="arch-wf-card-title">
                  {t.wfTabBrief} ({effectiveAnalysis.briefEval.metCount}/
                  {effectiveAnalysis.briefEval.totalApplicableCount})
                </span>
                {!isReadOnlyInspect && (
                  <button
                    type="button"
                    className="arch-wf-primary-btn"
                    onClick={handleAddBriefRequirement}
                  >
                    {t.briefAddRequirementBtn}
                  </button>
                )}
              </div>

              <div className="arch-wf-req-list">
                {effectiveAnalysis.briefEval.results.map((res) => {
                  const req = res.item;
                  const statusLabel =
                    res.status === 'met'
                      ? t.briefStatusMet
                      : res.status === 'unmet'
                      ? t.briefStatusUnmet
                      : res.status === 'review'
                      ? t.briefStatusReview
                      : t.briefStatusNA;

                  return (
                    <div key={req.id} className={`arch-wf-req-card status-${res.status}`}>
                      <div className="arch-wf-row-between">
                        <span className={`arch-wf-status-pill ${res.status}`}>
                          {statusLabel}
                        </span>
                        <span className="arch-wf-req-actual">
                          {res.actualSummary} · <small>{res.targetSummary}</small>
                        </span>
                        <div className="arch-wf-inline-actions">
                          {res.matchedRoomIds[0] && (
                            <button
                              type="button"
                              className="arch-wf-mini-btn"
                              onClick={() =>
                                onFocusElement('room', res.matchedRoomIds[0])
                              }
                            >
                              <Crosshair size={12} /> {t.briefFocusBtn}
                            </button>
                          )}
                          {!isReadOnlyInspect && (
                            <button
                              type="button"
                              className="arch-wf-icon-danger"
                              onClick={() => handleDeleteRequirement(req.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {!isReadOnlyInspect && (
                        <div className="arch-wf-req-controls">
                          <select
                            value={req.kind}
                            onChange={(e) =>
                              handlePatchRequirement(req.id, {
                                kind: e.target.value as RequirementKind,
                              })
                            }
                          >
                            <option value="required">Required</option>
                            <option value="target">Target</option>
                            <option value="preference">Preference</option>
                            <option value="information">Info</option>
                          </select>

                          <select
                            value={req.metric}
                            onChange={(e) =>
                              handlePatchRequirement(req.id, {
                                metric: e.target.value as RequirementMetricTarget,
                              })
                            }
                          >
                            <option value="room-count">Room Count</option>
                            <option value="room-min-area">Room Min m²</option>
                            <option value="total-floor-area">Total m²</option>
                            <option value="floor-count">Stories</option>
                            <option value="site-min-area">Site Min m²</option>
                          </select>

                          {(req.metric === 'room-count' ||
                            req.metric === 'room-min-area') && (
                            <select
                              value={req.roomType ?? 'bedroom'}
                              onChange={(e) =>
                                handlePatchRequirement(req.id, {
                                  roomType: e.target.value as Exclude<
                                    RoomSemanticType,
                                    'unassigned'
                                  >,
                                })
                              }
                            >
                              {ASSIGNABLE_ROOM_TYPES.map((rt) => (
                                <option key={rt} value={rt}>
                                  {ROOM_TYPE_LABELS[rt][lang]}
                                </option>
                              ))}
                            </select>
                          )}

                          {req.metric === 'room-count' && (
                            <input
                              type="number"
                              min={1}
                              max={20}
                              title="Count"
                              value={req.targetCount ?? 1}
                              onChange={(e) =>
                                handlePatchRequirement(req.id, {
                                  targetCount: Math.max(
                                    1,
                                    Number(e.target.value) || 1
                                  ),
                                })
                              }
                            />
                          )}

                          <input
                            type="number"
                            min={0}
                            step={1}
                            title="Min"
                            placeholder="Min"
                            value={req.minVal ?? ''}
                            onChange={(e) =>
                              handlePatchRequirement(req.id, {
                                minVal:
                                  e.target.value === ''
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                          />

                          {req.metric === 'total-floor-area' && (
                            <input
                              type="number"
                              min={0}
                              step={5}
                              title="Max"
                              placeholder="Max"
                              value={req.maxVal ?? ''}
                              onChange={(e) =>
                                handlePatchRequirement(req.id, {
                                  maxVal:
                                    e.target.value === ''
                                      ? undefined
                                      : Number(e.target.value),
                                })
                              }
                            />
                          )}

                          <select
                            value={req.priority}
                            onChange={(e) =>
                              handlePatchRequirement(req.id, {
                                priority: e.target.value as RequirementPriority,
                              })
                            }
                          >
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            TAB 2: SITE & TERRAIN PLANNING (System 5)
            ===================================================== */}
        {activeTab === 'site' && (
          <div className="arch-wf-section-stack">
            <div className="arch-wf-card">
              <div className="arch-wf-row-between">
                <span className="arch-wf-card-title">{t.siteEnableToggle}</span>
                <input
                  type="checkbox"
                  disabled={isReadOnlyInspect}
                  checked={site.enabled}
                  onChange={(e) =>
                    onUpdateSite({ ...site, enabled: e.target.checked })
                  }
                />
              </div>

              <div className="arch-wf-stat-strip">
                <div className="arch-wf-stat-box">
                  <span>{t.siteAreaSummaryLabel}</span>
                  <strong>
                    {(site.width * site.depth).toFixed(1)} m²
                  </strong>
                </div>
                <div className="arch-wf-stat-box">
                  <span>{t.siteFootprintLabel}</span>
                  <strong>
                    {effectiveAnalysis.siteMetrics.footprint.footprintAreaSqm.toFixed(
                      1
                    )}{' '}
                    m²
                  </strong>
                </div>
                <div className="arch-wf-stat-box">
                  <span>{t.siteOpenAreaLabel}</span>
                  <strong>
                    {effectiveAnalysis.siteMetrics.remainingSiteAreaSqm !== null
                      ? `${effectiveAnalysis.siteMetrics.remainingSiteAreaSqm.toFixed(1)} m²`
                      : '—'}
                  </strong>
                </div>
              </div>

              <div className="arch-wf-form-grid">
                <label className="arch-wf-field">
                  <span>Width X (m)</span>
                  <input
                    type="number"
                    min={4}
                    max={120}
                    step={0.5}
                    disabled={isReadOnlyInspect}
                    value={site.width}
                    onChange={(e) =>
                      onUpdateSite({
                        ...site,
                        enabled: true,
                        width: Math.max(4, Number(e.target.value) || 12),
                      })
                    }
                  />
                </label>
                <label className="arch-wf-field">
                  <span>Depth Z (m)</span>
                  <input
                    type="number"
                    min={4}
                    max={120}
                    step={0.5}
                    disabled={isReadOnlyInspect}
                    value={site.depth}
                    onChange={(e) =>
                      onUpdateSite({
                        ...site,
                        enabled: true,
                        depth: Math.max(4, Number(e.target.value) || 15),
                      })
                    }
                  />
                </label>
                <label className="arch-wf-field">
                  <span>{t.siteEntranceLabel}</span>
                  <select
                    disabled={isReadOnlyInspect}
                    value={site.entranceSide}
                    onChange={(e) =>
                      onUpdateSite({
                        ...site,
                        entranceSide: e.target.value as SiteEdgeSide,
                      })
                    }
                  >
                    <option value="front">{t.siteFrontLabel}</option>
                    <option value="rear">{t.siteRearLabel}</option>
                    <option value="left">{t.siteLeftLabel}</option>
                    <option value="right">{t.siteRightLabel}</option>
                  </select>
                </label>
                <label className="arch-wf-field">
                  <span>Plot Center (X, Z)</span>
                  <div className="arch-wf-inline-pair">
                    <input
                      type="number"
                      step={0.5}
                      disabled={isReadOnlyInspect}
                      value={site.center.x}
                      onChange={(e) =>
                        onUpdateSite({
                          ...site,
                          center: {
                            ...site.center,
                            x: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                    <input
                      type="number"
                      step={0.5}
                      disabled={isReadOnlyInspect}
                      value={site.center.z}
                      onChange={(e) =>
                        onUpdateSite({
                          ...site,
                          center: {
                            ...site.center,
                            z: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* User-Defined Setbacks */}
            <div className="arch-wf-card">
              <div className="arch-wf-row-between">
                <span className="arch-wf-card-title">{t.siteSetbacksTitle}</span>
                <input
                  type="checkbox"
                  disabled={isReadOnlyInspect}
                  checked={site.setbacksEnabled}
                  onChange={(e) =>
                    onUpdateSite({ ...site, setbacksEnabled: e.target.checked })
                  }
                />
              </div>
              <p className="arch-wf-disclaimer">{t.siteSetbackDisclaimer}</p>

              <div className="arch-wf-form-grid">
                {(
                  [
                    ['front', t.siteFrontLabel],
                    ['rear', t.siteRearLabel],
                    ['left', t.siteLeftLabel],
                    ['right', t.siteRightLabel],
                  ] as Array<[SiteEdgeSide, string]>
                ).map(([side, label]) => {
                  const dist =
                    effectiveAnalysis.siteMetrics.distancesToBoundary[side];
                  const ok =
                    effectiveAnalysis.siteMetrics.setbacksSatisfied[side];
                  return (
                    <label key={side} className="arch-wf-field">
                      <span className="arch-wf-row-between">
                        <span>{label}</span>
                        {dist !== null && (
                          <b className={ok ? 'txt-emerald' : 'txt-rose'}>
                            {dist.toFixed(2)}m
                          </b>
                        )}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        step={0.25}
                        disabled={isReadOnlyInspect || !site.setbacksEnabled}
                        value={site.setbacks[side]}
                        onChange={(e) =>
                          onUpdateSite({
                            ...site,
                            setbacks: {
                              ...site.setbacks,
                              [side]: Math.max(0, Number(e.target.value) || 0),
                            },
                          })
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Explicit Building Shift & Rotate within Site */}
            {!isReadOnlyInspect && (
              <div className="arch-wf-card">
                <div className="arch-wf-card-title">{t.siteNudgeBuildingTitle}</div>
                <div className="arch-wf-nudge-bar">
                  <button
                    type="button"
                    className="arch-wf-mini-btn"
                    onClick={() => onShiftBuildingOnSite(-0.5, 0)}
                    title="-0.5m X"
                  >
                    <ArrowLeft size={14} /> 0.5m
                  </button>
                  <button
                    type="button"
                    className="arch-wf-mini-btn"
                    onClick={() => onShiftBuildingOnSite(0, -0.5)}
                    title="-0.5m Z (Rear)"
                  >
                    <ArrowUp size={14} /> 0.5m
                  </button>
                  <button
                    type="button"
                    className="arch-wf-mini-btn"
                    onClick={() => onShiftBuildingOnSite(0, 0.5)}
                    title="+0.5m Z (Front)"
                  >
                    <ArrowDown size={14} /> 0.5m
                  </button>
                  <button
                    type="button"
                    className="arch-wf-mini-btn"
                    onClick={() => onShiftBuildingOnSite(0.5, 0)}
                    title="+0.5m X"
                  >
                    <ArrowRight size={14} /> 0.5m
                  </button>
                </div>
                <div className="arch-wf-inline-actions" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="arch-wf-chip-btn"
                    onClick={onRotateBuilding90}
                  >
                    <RotateCw size={13} /> {t.siteRotate90Btn}
                  </button>
                  <button
                    type="button"
                    className="arch-wf-chip-btn"
                    onClick={handleCenterBuildingOnPlot}
                  >
                    <Crosshair size={13} /> {t.siteCenterOnPlotBtn}
                  </button>
                </div>
              </div>
            )}

            {/* Outdoor Site Zones */}
            <div className="arch-wf-card">
              <div className="arch-wf-row-between">
                <span className="arch-wf-card-title">
                  {t.siteOutdoorZonesTitle} ({site.outdoorZones.length})
                </span>
                {!isReadOnlyInspect && (
                  <button
                    type="button"
                    className="arch-wf-primary-btn"
                    onClick={() => handleAddOutdoorZone('garden')}
                  >
                    {t.siteAddZoneBtn}
                  </button>
                )}
              </div>
              <div className="arch-wf-req-list">
                {site.outdoorZones.map((z) => (
                  <div key={z.id} className="arch-wf-req-card">
                    <div className="arch-wf-row-between">
                      <input
                        type="text"
                        disabled={isReadOnlyInspect}
                        value={z.name}
                        onChange={(e) =>
                          onUpdateSite({
                            ...site,
                            outdoorZones: site.outdoorZones.map((oz) =>
                              oz.id === z.id ? { ...oz, name: e.target.value } : oz
                            ),
                          })
                        }
                      />
                      {!isReadOnlyInspect && (
                        <button
                          type="button"
                          className="arch-wf-icon-danger"
                          onClick={() =>
                            onUpdateSite({
                              ...site,
                              outdoorZones: site.outdoorZones.filter(
                                (oz) => oz.id !== z.id
                              ),
                            })
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="arch-wf-req-controls">
                      <select
                        disabled={isReadOnlyInspect}
                        value={z.kind}
                        onChange={(e) => {
                          const nk = e.target.value as OutdoorZoneKind;
                          onUpdateSite({
                            ...site,
                            outdoorZones: site.outdoorZones.map((oz) =>
                              oz.id === z.id
                                ? { ...oz, kind: nk, color: OUTDOOR_ZONE_COLORS[nk] }
                                : oz
                            ),
                          });
                        }}
                      >
                        <option value="garden">Garden</option>
                        <option value="driveway">Driveway</option>
                        <option value="patio">Patio</option>
                        <option value="walkway">Walkway</option>
                        <option value="parking">Parking</option>
                        <option value="recreation">Recreation</option>
                      </select>
                      <input
                        type="number"
                        step={0.5}
                        min={1}
                        disabled={isReadOnlyInspect}
                        title="Width (m)"
                        value={z.width}
                        onChange={(e) =>
                          onUpdateSite({
                            ...site,
                            outdoorZones: site.outdoorZones.map((oz) =>
                              oz.id === z.id
                                ? { ...oz, width: Math.max(0.5, Number(e.target.value) || 2) }
                                : oz
                            ),
                          })
                        }
                      />
                      <input
                        type="number"
                        step={0.5}
                        min={1}
                        disabled={isReadOnlyInspect}
                        title="Depth (m)"
                        value={z.depth}
                        onChange={(e) =>
                          onUpdateSite({
                            ...site,
                            outdoorZones: site.outdoorZones.map((oz) =>
                              oz.id === z.id
                                ? { ...oz, depth: Math.max(0.5, Number(e.target.value) || 2) }
                                : oz
                            ),
                          })
                        }
                      />
                      <select
                        disabled={isReadOnlyInspect}
                        value={z.surfaceMaterialId ?? ''}
                        onChange={(e) =>
                          onUpdateSite({
                            ...site,
                            outdoorZones: site.outdoorZones.map((oz) =>
                              oz.id === z.id
                                ? {
                                    ...oz,
                                    surfaceMaterialId: e.target.value || undefined,
                                  }
                                : oz
                            ),
                          })
                        }
                      >
                        <option value="">{t.constMatUnassignedOption}</option>
                        {catalog.map((m) => (
                          <option key={m.id} value={m.id}>
                            {getMaterialDisplayName(m, lang)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            TAB 3: MATERIAL TAKEOFF & COST ESTIMATOR (System 2)
            ===================================================== */}
        {activeTab === 'materials' && (
          <div className="arch-wf-section-stack">
            <div className="arch-wf-card">
              <div className="arch-wf-row-between">
                <span className="arch-wf-scope-badge">
                  {t.takeoffMaterialOnlyBadge}
                </span>
                {!isReadOnlyInspect &&
                  effectiveAnalysis.takeoff.missingAssignments.length > 0 && (
                    <button
                      type="button"
                      className="arch-wf-primary-btn"
                      onClick={onAutoAssignDefaultMaterials}
                    >
                      <Wand2 size={12} /> {t.constMatAutoAssignBtn}
                    </button>
                  )}
              </div>

              <div className="arch-wf-big-cost">
                <span>{t.takeoffTotalEstLabel}</span>
                <strong>
                  {formatCurrencyIDR(
                    effectiveAnalysis.takeoff.totalEstimatedMaterialCost
                  )}
                </strong>
              </div>
              <p className="arch-wf-disclaimer">{t.constMatSeparatedHint}</p>

              {/* Budget Comparison + Scope Warning */}
              {effectiveAnalysis.takeoff.budgetComparison && (
                <div className="arch-wf-budget-box">
                  <div className="arch-wf-row-between">
                    <span>
                      Target:{' '}
                      <strong>
                        {formatCurrencyIDR(
                          effectiveAnalysis.takeoff.budgetComparison.targetAmount
                        )}
                      </strong>
                    </span>
                    <span
                      className={
                        effectiveAnalysis.takeoff.budgetComparison
                          .differenceAmount >= 0
                          ? 'txt-emerald'
                          : 'txt-rose'
                      }
                    >
                      {effectiveAnalysis.takeoff.budgetComparison.ratioPercent.toFixed(
                        1
                      )}
                      % (
                      {effectiveAnalysis.takeoff.budgetComparison
                        .differenceAmount >= 0
                        ? '+'
                        : ''}
                      {formatCurrencyIDR(
                        effectiveAnalysis.takeoff.budgetComparison
                          .differenceAmount
                      )}
                      )
                    </span>
                  </div>
                  {effectiveAnalysis.takeoff.budgetComparison
                    .scopeMismatchWarning && (
                    <div className="arch-wf-warn-note">
                      <AlertTriangle size={14} />
                      <span>{t.takeoffScopeMismatchWarn}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Geometry Totals Strip */}
              <div className="arch-wf-stat-strip">
                <div className="arch-wf-stat-box">
                  <span>Net Wall</span>
                  <strong>
                    {effectiveAnalysis.takeoff.geometryTotals.wallNetSingleSideAreaSqm.toFixed(
                      1
                    )}{' '}
                    m²
                  </strong>
                </div>
                <div className="arch-wf-stat-box">
                  <span>Floor Rooms</span>
                  <strong>
                    {effectiveAnalysis.takeoff.geometryTotals.floorRoomAreaSqm.toFixed(
                      1
                    )}{' '}
                    m²
                  </strong>
                </div>
                <div className="arch-wf-stat-box">
                  <span>3D Roof</span>
                  <strong>
                    {effectiveAnalysis.takeoff.geometryTotals.roofSlopedAreaSqm.toFixed(
                      1
                    )}{' '}
                    m²
                  </strong>
                </div>
              </div>
            </div>

            {/* Missing Assignments Report */}
            {effectiveAnalysis.takeoff.missingAssignments.length > 0 && (
              <div className="arch-wf-card warn-border">
                <div className="arch-wf-card-title">
                  {t.takeoffMissingAssignTitle} (
                  {effectiveAnalysis.takeoff.missingAssignments.length})
                </div>
                <div className="arch-wf-compact-list">
                  {effectiveAnalysis.takeoff.missingAssignments
                    .slice(0, 12)
                    .map((ma) => (
                      <div
                        key={`${ma.domain}_${ma.elementId}`}
                        className="arch-wf-row-between"
                      >
                        <span>
                          <strong>{ma.elementLabel}</strong> · {ma.metricSummary}
                        </span>
                        <button
                          type="button"
                          className="arch-wf-mini-btn"
                          onClick={() =>
                            onFocusElement(
                              ma.domain === 'room-floor'
                                ? 'room'
                                : ma.domain === 'modular-object'
                                ? 'object'
                                : ma.domain,
                              ma.elementId
                            )
                          }
                        >
                          <Crosshair size={12} /> {t.briefFocusBtn}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Line Items Table */}
            <div className="arch-wf-card">
              <div className="arch-wf-card-title">{t.wfTabMaterials}</div>
              <div className="arch-wf-table-scroll">
                <table className="arch-wf-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Qty (+Waste)</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveAnalysis.takeoff.lineItems.map((li) => (
                      <tr key={li.materialId}>
                        <td>
                          <strong>{li.materialName}</strong>
                          <div className="arch-wf-subcell">
                            {li.category} · {li.sourceKind}
                            {li.secondaryEstimateNote
                              ? ` · ${li.secondaryEstimateNote}`
                              : ''}
                          </div>
                        </td>
                        <td>
                          {li.finalQuantity.toFixed(2)} {li.unit}
                          {li.wastePercentageApplied > 0 && (
                            <div className="arch-wf-subcell">
                              +{li.wastePercentageApplied}% waste
                            </div>
                          )}
                        </td>
                        <td>
                          {li.subtotalCost !== null ? (
                            <strong>{formatCurrencyIDR(li.subtotalCost)}</strong>
                          ) : (
                            <span className="txt-rose">Unpriced</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Per-Floor Breakdown */}
              <div className="arch-wf-subhead">{t.takeoffByFloorTitle}</div>
              <div className="arch-wf-compact-list">
                {effectiveAnalysis.takeoff.byFloor.map((bf) => (
                  <div key={bf.floorId} className="arch-wf-row-between">
                    <span>{bf.floorName}</span>
                    <strong>{formatCurrencyIDR(bf.subtotalCost)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Editable Material Catalog */}
            <div className="arch-wf-card">
              <div className="arch-wf-row-between">
                <span className="arch-wf-card-title">
                  {t.takeoffEditCatalogTitle}
                </span>
                <button
                  type="button"
                  className="arch-wf-mini-btn"
                  onClick={() => setShowCatalogEditor((v) => !v)}
                >
                  <Sliders size={12} /> {showCatalogEditor ? 'Hide' : 'Edit'}
                </button>
              </div>

              {showCatalogEditor && (
                <div className="arch-wf-catalog-editor">
                  {!isReadOnlyInspect && (
                    <div className="arch-wf-custom-mat-creator">
                      <input
                        type="text"
                        placeholder="Custom material name..."
                        value={customMatName}
                        onChange={(e) => setCustomMatName(e.target.value)}
                      />
                      <div className="arch-wf-req-controls">
                        <select
                          value={customMatCategory}
                          onChange={(e) =>
                            setCustomMatCategory(
                              e.target.value as ConstructionMaterialCategory
                            )
                          }
                        >
                          <option value="masonry">Masonry</option>
                          <option value="structure">Structure</option>
                          <option value="finish-wall">Wall Finish</option>
                          <option value="flooring">Flooring</option>
                          <option value="roofing">Roofing</option>
                          <option value="openings">Openings</option>
                          <option value="outdoor">Outdoor</option>
                        </select>
                        <select
                          value={customMatUnit}
                          onChange={(e) =>
                            setCustomMatUnit(e.target.value as MaterialUnitKind)
                          }
                        >
                          <option value="m2">m²</option>
                          <option value="m3">m³</option>
                          <option value="m">m</option>
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="L">L</option>
                        </select>
                        <input
                          type="number"
                          placeholder="IDR / unit"
                          value={customMatPrice}
                          onChange={(e) => setCustomMatPrice(e.target.value)}
                        />
                        <button
                          type="button"
                          className="arch-wf-primary-btn"
                          onClick={handleCreateCustomMaterial}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {catalog.map((m) => (
                    <div key={m.id} className="arch-wf-cat-item">
                      <div className="arch-wf-cat-item-head">
                        <strong>{getMaterialDisplayName(m, lang)}</strong>
                        <span>/{m.unit}</span>
                      </div>
                      <div className="arch-wf-inline-pair">
                        <label className="arch-wf-field">
                          <span>{t.takeoffUnitPriceLabel}</span>
                          <input
                            type="number"
                            min={0}
                            step={5000}
                            disabled={isReadOnlyInspect}
                            value={m.unitPrice ?? ''}
                            placeholder="Unpriced"
                            onChange={(e) =>
                              handlePatchMaterialDef(m.id, {
                                unitPrice:
                                  e.target.value === ''
                                    ? undefined
                                    : Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                          />
                        </label>
                        {m.supportsWaste && (
                          <label className="arch-wf-field">
                            <span>{t.takeoffWastePctLabel}</span>
                            <input
                              type="number"
                              min={0}
                              max={40}
                              step={1}
                              disabled={isReadOnlyInspect}
                              value={m.wastePercentage}
                              onChange={(e) =>
                                handlePatchMaterialDef(m.id, {
                                  wastePercentage: Math.max(
                                    0,
                                    Math.min(40, Number(e.target.value) || 0)
                                  ),
                                })
                              }
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="arch-wf-exclusions">
                {effectiveAnalysis.takeoff.excludedScopeNotes.map((note, idx) => (
                  <p key={idx}>{note}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            TAB 4: SPATIAL & DESIGN VALIDATION (System 4)
            ===================================================== */}
        {activeTab === 'validation' && (
          <div className="arch-wf-section-stack">
            <div className="arch-wf-card">
              <div className="arch-wf-row-between">
                <div className="arch-wf-inline-actions">
                  <span className="arch-wf-sev-pill error">
                    {valSummary.errorCount} {t.valSevError}
                  </span>
                  <span className="arch-wf-sev-pill warning">
                    {valSummary.warningCount} {t.valSevWarning}
                  </span>
                  <span className="arch-wf-sev-pill info">
                    {valSummary.infoCount} {t.valSevInfo}
                  </span>
                </div>
                <button
                  type="button"
                  className="arch-wf-mini-btn"
                  onClick={onRerunValidation}
                >
                  <RefreshCw size={12} /> {t.valRerunBtn}
                </button>
              </div>

              <div className="arch-wf-chip-wrap" style={{ marginTop: 8 }}>
                {(
                  [
                    ['all', t.valAllCategories],
                    ['geometry', t.valCatGeometry],
                    ['opening-conflict', t.valCatOpening],
                    ['spatial-usability', t.valCatSpatial],
                    ['project-requirement', t.valCatBrief],
                    ['site-planning', t.valCatSite],
                  ] as Array<[ValidationCategory | 'all', string]>
                ).map(([cat, lbl]) => (
                  <button
                    key={cat}
                    type="button"
                    className={`arch-wf-chip-btn ${
                      valCategoryFilter === cat ? 'active' : ''
                    }`}
                    onClick={() => setValCategoryFilter(cat)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="arch-wf-healthy-box">
                <CheckCircle2 size={20} />
                <span>{t.valHealthyMsg}</span>
              </div>
            ) : (
              <div className="arch-wf-req-list">
                {filteredFindings.map((f) => (
                  <div
                    key={f.id}
                    className={`arch-wf-finding-card sev-${f.severity}`}
                  >
                    <div className="arch-wf-finding-head">
                      {f.severity === 'error' ? (
                        <AlertCircle size={15} />
                      ) : f.severity === 'warning' ? (
                        <AlertTriangle size={15} />
                      ) : (
                        <Info size={15} />
                      )}
                      <strong>{f.title}</strong>
                    </div>
                    <p className="arch-wf-finding-desc">{f.explanation}</p>
                    {f.suggestion && (
                      <p className="arch-wf-finding-sug">{f.suggestion}</p>
                    )}
                    <div className="arch-wf-inline-actions">
                      {f.relatedElementIds[0] && (
                        <button
                          type="button"
                          className="arch-wf-mini-btn"
                          onClick={() =>
                            onFocusElement(
                              f.relatedElementIds[0].domain,
                              f.relatedElementIds[0].id
                            )
                          }
                        >
                          <Crosshair size={12} /> {t.briefFocusBtn}
                        </button>
                      )}
                      {!isReadOnlyInspect && f.autoFix && (
                        <button
                          type="button"
                          className="arch-wf-primary-btn"
                          onClick={() => onApplyAutoFix(f.autoFix!)}
                        >
                          <Wand2 size={12} /> {t.valAutoFixBtn}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            TAB 5: DESIGN ALTERNATIVES & VERSIONING (System 3)
            ===================================================== */}
        {activeTab === 'versions' && (
          <div className="arch-wf-section-stack">
            <div className="arch-wf-card">
              <div className="arch-wf-card-title">{t.altSaveNewBtn}</div>
              <input
                type="text"
                placeholder={t.altNamePlaceholder}
                value={newAltName}
                onChange={(e) => setNewAltName(e.target.value)}
                style={{ width: '100%', marginBottom: 6 }}
              />
              <input
                type="text"
                placeholder={t.altDescPlaceholder}
                value={newAltDesc}
                onChange={(e) => setNewAltDesc(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <button
                type="button"
                className="arch-wf-primary-btn full"
                onClick={handleSaveCurrentAsAlternative}
              >
                <Plus size={14} /> {t.altSaveNewBtn}
              </button>
            </div>

            {alternatives.length === 0 ? (
              <div className="arch-wf-card">
                <p className="arch-wf-disclaimer">{t.altEmptyHint}</p>
              </div>
            ) : (
              <div className="arch-wf-req-list">
                {alternatives.map((alt) => (
                  <div key={alt.id} className="arch-wf-alt-card">
                    <div className="arch-wf-row-between">
                      <input
                        type="text"
                        className="arch-wf-alt-title-input"
                        value={alt.name}
                        onChange={(e) =>
                          onChangeAlternatives(
                            alternatives.map((a) =>
                              a.id === alt.id
                                ? { ...a, name: e.target.value }
                                : a
                            )
                          )
                        }
                      />
                      <small>
                        {new Date(alt.createdAt)
                          .toISOString()
                          .slice(0, 16)
                          .replace('T', ' ')}
                      </small>
                    </div>
                    {alt.description && (
                      <p className="arch-wf-finding-desc">{alt.description}</p>
                    )}

                    {pendingRestoreAltId === alt.id ? (
                      <div className="arch-wf-restore-confirm">
                        <p>{t.altRestoreConfirmMsg}</p>
                        <div className="arch-wf-inline-actions">
                          <button
                            type="button"
                            className="arch-wf-primary-btn"
                            onClick={() => {
                              setInspectedAltId(null);
                              setPendingRestoreAltId(null);
                              onRestoreAlternative(alt.snapshot);
                            }}
                          >
                            <RotateCcw size={12} /> {t.altRestoreBtn}
                          </button>
                          <button
                            type="button"
                            className="arch-wf-mini-btn"
                            onClick={() => setPendingRestoreAltId(null)}
                          >
                            {t.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="arch-wf-inline-actions">
                        <button
                          type="button"
                          className={`arch-wf-mini-btn ${
                            inspectedAltId === alt.id ? 'active' : ''
                          }`}
                          onClick={() =>
                            setInspectedAltId(
                              inspectedAltId === alt.id ? null : alt.id
                            )
                          }
                        >
                          <Eye size={12} /> {t.altInspectBtn}
                        </button>
                        <button
                          type="button"
                          className="arch-wf-mini-btn"
                          onClick={() => setPendingRestoreAltId(alt.id)}
                        >
                          <RotateCcw size={12} /> {t.altRestoreBtn}
                        </button>
                        <button
                          type="button"
                          className="arch-wf-mini-btn"
                          onClick={() =>
                            onChangeAlternatives([
                              duplicateDesignAlternative(alt),
                              ...alternatives,
                            ])
                          }
                          title={t.altDuplicateProjectBtn}
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          className="arch-wf-icon-danger"
                          onClick={() =>
                            onChangeAlternatives(
                              alternatives.filter((a) => a.id !== alt.id)
                            )
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Side-by-Side Comparison Matrix */}
            {alternatives.length > 0 && (
              <div className="arch-wf-card">
                <div className="arch-wf-card-title">{t.altCompareTitle}</div>
                <div className="arch-wf-form-grid">
                  <select
                    value={compareLeftId}
                    onChange={(e) => setCompareLeftId(e.target.value)}
                  >
                    <option value="__active__">{t.altActiveWorkingLabel}</option>
                    {alternatives.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={compareRightId}
                    onChange={(e) => setCompareRightId(e.target.value)}
                  >
                    <option value="__active__">{t.altActiveWorkingLabel}</option>
                    {alternatives.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {comparisonReport && (
                  <div className="arch-wf-table-scroll" style={{ marginTop: 8 }}>
                    <table className="arch-wf-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>{comparisonReport.left.label}</th>
                          <th>{comparisonReport.right.label}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Floor Area</td>
                          <td>
                            {comparisonReport.left.totalFloorAreaSqm.toFixed(1)} m²
                          </td>
                          <td>
                            {comparisonReport.right.totalFloorAreaSqm.toFixed(1)} m²
                          </td>
                        </tr>
                        <tr>
                          <td>Rooms / Stories</td>
                          <td>
                            {comparisonReport.left.roomCount} /{' '}
                            {comparisonReport.left.occupiedStories}
                          </td>
                          <td>
                            {comparisonReport.right.roomCount} /{' '}
                            {comparisonReport.right.occupiedStories}
                          </td>
                        </tr>
                        <tr>
                          <td>Footprint / Roof</td>
                          <td>
                            {comparisonReport.left.footprintAreaSqm.toFixed(1)} /{' '}
                            {comparisonReport.left.roofSurfaceAreaSqm.toFixed(1)} m²
                          </td>
                          <td>
                            {comparisonReport.right.footprintAreaSqm.toFixed(1)} /{' '}
                            {comparisonReport.right.roofSurfaceAreaSqm.toFixed(1)} m²
                          </td>
                        </tr>
                        <tr>
                          <td>Doors / Windows</td>
                          <td>
                            {comparisonReport.left.doorCount}D ·{' '}
                            {comparisonReport.left.windowCount}W
                          </td>
                          <td>
                            {comparisonReport.right.doorCount}D ·{' '}
                            {comparisonReport.right.windowCount}W
                          </td>
                        </tr>
                        <tr>
                          <td>Est. Material Cost</td>
                          <td>
                            {formatCurrencyIDR(
                              comparisonReport.left.estimatedMaterialCost
                            )}
                          </td>
                          <td>
                            {formatCurrencyIDR(
                              comparisonReport.right.estimatedMaterialCost
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>Validation (E/W)</td>
                          <td>
                            {comparisonReport.left.validationErrors}E ·{' '}
                            {comparisonReport.left.validationWarnings}W
                          </td>
                          <td>
                            {comparisonReport.right.validationErrors}E ·{' '}
                            {comparisonReport.right.validationWarnings}W
                          </td>
                        </tr>
                        <tr>
                          <td>Site Setbacks</td>
                          <td>
                            {comparisonReport.left.siteCompliant === null
                              ? '—'
                              : comparisonReport.left.siteCompliant
                              ? 'OK'
                              : 'Violation'}
                          </td>
                          <td>
                            {comparisonReport.right.siteCompliant === null
                              ? '—'
                              : comparisonReport.right.siteCompliant
                              ? 'OK'
                              : 'Violation'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            TAB 6: LIVE DESIGN DOCUMENTATION (System 6)
            ===================================================== */}
        {activeTab === 'docs' && (
          <div className="arch-wf-section-stack">
            <div className="arch-wf-card">
              <label className="arch-wf-field">
                <span>{t.docSourceLabel}</span>
                <select
                  value={docSourceId}
                  onChange={(e) => setDocSourceId(e.target.value)}
                >
                  <option value="__active__">{t.altActiveWorkingLabel}</option>
                  {alternatives.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="arch-wf-chip-wrap" style={{ marginTop: 8 }}>
                {(
                  [
                    ['floor-plan', t.docKindFloorPlan],
                    ['site-plan', t.docKindSitePlan],
                    ['elevation', t.docKindElevation],
                    ['door-window-schedule', t.docKindSchedule],
                    ['material-report', t.docKindMaterialReport],
                    ['validation-report', t.docKindValidationReport],
                  ] as Array<[ArchDocumentKind, string]>
                ).map(([kind, lbl]) => (
                  <button
                    key={kind}
                    type="button"
                    className={`arch-wf-chip-btn ${
                      docSettings.selectedDocKind === kind ? 'active' : ''
                    }`}
                    onClick={() =>
                      onUpdateDocSettings({ ...docSettings, selectedDocKind: kind })
                    }
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Contextual Sheet Options */}
              <div className="arch-wf-form-grid" style={{ marginTop: 8 }}>
                {docSettings.selectedDocKind === 'floor-plan' && (
                  <label className="arch-wf-field">
                    <span>Floor</span>
                    <select
                      value={docFloorId}
                      onChange={(e) => setDocFloorId(e.target.value)}
                    >
                      {docTarget.floors.map((fl) => (
                        <option key={fl.id} value={fl.id}>
                          {fl.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {docSettings.selectedDocKind === 'elevation' && (
                  <label className="arch-wf-field">
                    <span>Direction</span>
                    <select
                      value={docSettings.elevationDirection}
                      onChange={(e) =>
                        onUpdateDocSettings({
                          ...docSettings,
                          elevationDirection:
                            e.target.value as ElevationViewDirection,
                        })
                      }
                    >
                      <option value="front">{t.siteFrontLabel}</option>
                      <option value="rear">{t.siteRearLabel}</option>
                      <option value="left">{t.siteLeftLabel}</option>
                      <option value="right">{t.siteRightLabel}</option>
                    </select>
                  </label>
                )}

                {(docSettings.selectedDocKind === 'floor-plan' ||
                  docSettings.selectedDocKind === 'site-plan' ||
                  docSettings.selectedDocKind === 'elevation') && (
                  <label className="arch-wf-field">
                    <span>Theme</span>
                    <select
                      value={docSettings.paperTheme}
                      onChange={(e) =>
                        onUpdateDocSettings({
                          ...docSettings,
                          paperTheme: e.target
                            .value as DocumentationExportSettings['paperTheme'],
                        })
                      }
                    >
                      <option value="blueprint-dark">{t.docThemeDark}</option>
                      <option value="architect-white">{t.docThemeWhite}</option>
                    </select>
                  </label>
                )}
              </div>

              {/* Live Drawing Preview OR Live Schedule Preview */}
              {docPreviewUrl && (
                <div className="arch-wf-doc-preview">
                  <img src={docPreviewUrl} alt="Architectural Sheet Preview" />
                </div>
              )}

              {docSettings.selectedDocKind === 'door-window-schedule' && (
                <div className="arch-wf-table-scroll" style={{ marginTop: 8 }}>
                  <table className="arch-wf-table">
                    <thead>
                      <tr>
                        <th>Mark</th>
                        <th>Type</th>
                        <th>W × H</th>
                        <th>Floor</th>
                        <th>Material</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.length === 0 ? (
                        <tr>
                          <td colSpan={5}>0 openings</td>
                        </tr>
                      ) : (
                        scheduleRows.map((r) => (
                          <tr key={r.openingId}>
                            <td>
                              <strong>{r.mark}</strong>
                            </td>
                            <td>{r.kind}</td>
                            <td>
                              {r.widthM.toFixed(2)}×{r.heightM.toFixed(2)}m
                            </td>
                            <td>{r.floorName}</td>
                            <td>{r.materialName}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {docSettings.selectedDocKind === 'material-report' && (
                <div className="arch-wf-stat-strip" style={{ marginTop: 8 }}>
                  <div className="arch-wf-stat-box">
                    <span>Items</span>
                    <strong>{docTarget.analysis.takeoff.lineItems.length}</strong>
                  </div>
                  <div className="arch-wf-stat-box">
                    <span>Unassigned</span>
                    <strong>
                      {docTarget.analysis.takeoff.missingAssignments.length}
                    </strong>
                  </div>
                  <div className="arch-wf-stat-box">
                    <span>Material Est.</span>
                    <strong>
                      {formatCurrencyIDR(
                        docTarget.analysis.takeoff.totalEstimatedMaterialCost
                      )}
                    </strong>
                  </div>
                </div>
              )}

              {docSettings.selectedDocKind === 'validation-report' && (
                <div className="arch-wf-stat-strip" style={{ marginTop: 8 }}>
                  <div className="arch-wf-stat-box">
                    <span>Errors</span>
                    <strong>{docTarget.analysis.validation.errorCount}</strong>
                  </div>
                  <div className="arch-wf-stat-box">
                    <span>Warnings</span>
                    <strong>{docTarget.analysis.validation.warningCount}</strong>
                  </div>
                  <div className="arch-wf-stat-box">
                    <span>Info</span>
                    <strong>{docTarget.analysis.validation.infoCount}</strong>
                  </div>
                </div>
              )}

              {/* Export Actions */}
              <div className="arch-wf-doc-actions">
                {docPreviewUrl && (
                  <button
                    type="button"
                    className="arch-wf-primary-btn full"
                    onClick={handleDownloadCurrentDocPNG}
                  >
                    <Download size={14} /> {t.docExportPngBtn}
                  </button>
                )}
                <button
                  type="button"
                  className="arch-wf-chip-btn full"
                  onClick={handleDownloadReportPackageHTML}
                >
                  <Printer size={14} /> {t.docExportHtmlBtn}
                </button>
              </div>

              <p className="arch-wf-disclaimer" style={{ marginTop: 10 }}>
                {t.docSectionLimitationNote}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
