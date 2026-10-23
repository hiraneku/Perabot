import { AppLanguage } from '../types/studio';

/**
 * Compiler-enforced UI dictionary (`StudioStrings`).
 * Adding any new UI string key here requires `id`, `en`, and `ja` translations
 * or TypeScript (`tsc`) will immediately catch the missing key at build time!
 */
export interface StudioStrings {
  // Main Menu
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  continueLast: string;
  lastEdited: string;
  modeModelingTitle: string;
  modeModelingDesc: string;
  modeModelingBtn: string;
  modeHouseTitle: string;
  modeHouseDesc: string;
  modeHouseBtn: string;
  openProjectFile: string;
  globalSettings: string;
  tabMyProjects: string;
  tabMyAssets: string;
  emptyProjectsTitle: string;
  emptyProjectsDesc: string;
  emptyAssetsTitle: string;
  emptyAssetsDesc: string;
  objectsUnit: string;
  partsUnit: string;
  rename: string;
  duplicate: string;
  exportBackup: string;
  delete: string;
  cancel: string;
  stageDragHint: string;
  moodMorning: string;
  moodSunset: string;
  moodNight: string;

  // Global Settings Modal
  settingsTitle: string;
  settingsSubtitle: string;
  langSection: string;
  themeSection: string;
  graphicsSection: string;
  gfxLight: string;
  gfxLightDesc: string;
  gfxBalanced: string;
  gfxBalancedDesc: string;
  gfxUltra: string;
  gfxUltraDesc: string;
  controlsSection: string;
  orbitSpeed: string;
  uiDensity: string;
  densityComfort: string;
  densityCompact: string;
  done: string;

  // TopBar Core & Save Status
  backHome: string;
  untitledProject: string;
  untitledHouse: string;
  savedAuto: string;
  unsavedChanges: string;
  savingNow: string;
  undo: string;
  redo: string;
  snap: string;
  surface: string;
  grid: string;
  focusBtn: string;
  cameraViewsBtn: string;
  peekInterior: string;
  walkthrough: string;
  exitWalkthrough: string;
  walkHint: string;
  import3DBtn: string;
  import3DHint: string;
  importing3DToast: string;
  import3DFailedToast: string;
  restoreOriginalMaterial: string;
  exportBtn: string;
  clearScene: string;
  clearSceneConfirm: string;
  fullscreen: string;
  toggleRightPanel: string;
  help: string;

  // TopBar: Snap Popover
  snapSystemTitle: string;
  activeState: string;
  inactiveState: string;
  snapMagnetTitle: string;
  snapMagnetDesc: string;
  strengthSubtle: string;
  strengthNormal: string;
  strengthStrong: string;
  snapAlignTitle: string;
  snapAlignDesc: string;
  snapGridTitle: string;
  snapGridDesc: string;

  // TopBar: Surface Popover
  surfaceSystemTitle: string;
  surfaceOrientSection: string;
  surfModeNormalTitle: string;
  surfModeNormalDesc: string;
  surfModeUprightTitle: string;
  surfModeUprightDesc: string;
  surfModeFoundationTitle: string;
  surfModeFoundationDesc: string;
  surfAttachFaceSection: string;
  surfAttachAuto: string;
  surfAttachBottom: string;
  surfAttachBack: string;
  surfAttachTop: string;
  surfAutoMoveTitle: string;
  surfAutoMoveDesc: string;
  surfClickPlaceTitle: string;
  surfClickPlaceDesc: string;
  surfSpinLabel: string;
  surfOffsetLabel: string;
  surfConformNowCta: string;

  // TopBar: Advanced Grid Popover
  gridSystemTitle: string;
  visibleState: string;
  hiddenState: string;
  gridCellSizeSection: string;
  gridSyncSnapBtn: string;
  gridSmartGuidesSection: string;
  gridRulerTitle: string;
  gridRulerDesc: string;
  gridFootprintTitle: string;
  gridFootprintDesc: string;
  gridVertSection: string;
  gridVertOff: string;
  gridVertBack: string;
  gridVertCorner: string;
  gridPlotTitle: string;
  gridPlotDesc: string;
  gridPlotPresetsLabel: string;
  gridPlotWidth: string;
  gridPlotDepth: string;
  gridStyleSection: string;
  gridStyleWire: string;
  gridStyleWireSub: string;
  gridStyleTile: string;
  gridStyleTileSub: string;
  gridStyleBlueprint: string;
  gridStyleBlueprintSub: string;
  gridStyleTerrain: string;
  gridStyleTerrainSub: string;
  terrainShapeSection: string;
  terrainHills: string;
  terrainValley: string;
  terrainTerraced: string;
  terrainFlat: string;
  terrainHeightLabel: string;
  gridWorldSizeLabel: string;
  gridElevationLabel: string;
  gridFitObjectBaseBtn: string;
  gridAxesOn: string;
  gridAxesOff: string;
  gridOpacityLabel: string;

  // TopBar: Camera & Export Popovers
  quickCameraHeader: string;
  camPerspective: string;
  camFront: string;
  camSide: string;
  camTop: string;
  exportFormatHeader: string;
  exportGlbTitle: string;
  exportGlbSub: string;
  exportGltfTitle: string;
  exportGltfSub: string;

  // Left Transform Toolbar & Rotation Bar
  select: string;
  move: string;
  rotate: string;
  scale: string;
  paint: string;
  worldAxis: string;
  localAxis: string;
  stickSurface: string;
  copy: string;
  showLeftToolbar: string;
  hideLeftToolbar: string;
  rotAxisHorizontal: string;
  rotAxisFront: string;
  rotAxisSide: string;
  rotSnapLabel: string;
  rotSnapFree: string;
  rotResetZero: string;

  // Spawn Docks & Catalog
  basicShapes: string;
  housePresets: string;
  shapesHint: string;
  presetsHint: string;
  searchShapes: string;
  searchPresets: string;
  noShapeMatch: string;
  lastUsed: string;
  properties: string;
  catAll: string;
  catCustom: string;

  // Inspector Panel & Outliner
  objectList: string;
  objectStudio: string;
  emptyOutlinerHint: string;
  emptyInspectorHint: string;
  hideObject: string;
  showObject: string;
  tabTransform: string;
  tabColor: string;
  tabSubdiv: string;
  objectNamePlaceholder: string;
  imported3DModelTag: string;
  positionLabel: string;
  rotationLabel: string;
  scaleLabel: string;
  resetBtn: string;
  uniformScaleLock: string;
  uniformScaleFree: string;
  groupAction: string;
  ungroupAction: string;
  editGroupParts: string;
  editingSinglePart: string;
  saveToAssets: string;
  savedToAssetsToast: string;
  groupedToast: string;
  ungroupedToast: string;

  // Revamped Subdivision Tab
  subdivHeaderTitle: string;
  subdivHeaderDesc: string;
  subdivCellsLabel: string;
  subdivTrianglesLabel: string;
  subdivVerticesLabel: string;
  subdivQuickPresets: string;
  subdivResetOriginal: string;
  subdivPerAxisTitle: string;
  subdivAxisX: string;
  subdivAxisY: string;
  subdivAxisZ: string;
  subdivShowLinesTitle: string;
  subdivShowLinesDesc: string;
  subdivGrooveLabel: string;
  subdivGrooveFlat: string;
  subdivSplitBlocksBtn: string;
  subdivSplitBlocksHint: string;
  subdivSplitToast: string;
  subdivCapNotice: string;

  // Color Wheel & Material Studio
  paintClickBtn: string;
  paintClickActive: string;
  eyedropperBtn: string;
  eyedropperActive: string;
  paintNoSelectionHint: string;
  saveSwatchBtn: string;
  brightnessLabel: string;
  autoHarmoniesTitle: string;
  savedPaletteTitle: string;
  archMaterialPresetsTitle: string;
  advancedPbrTitle: string;
  opacityGlassLabel: string;
  roughnessLabel: string;
  metalnessLabel: string;
  emissiveLampLabel: string;
  shadingStyleLabel: string;
  shadingSmooth: string;
  shadingFlat: string;

  // Help Modal & Live HUD
  helpModalTitle: string;
  helpCard1Title: string;
  helpCard1Item1: string;
  helpCard1Item2: string;
  helpCard2Title: string;
  helpCard2Item1: string;
  helpCard2Item2: string;
  helpCard3Title: string;
  helpCard3Item1: string;
  helpCard3Item2: string;
  helpCard4Title: string;
  helpCard4Item1: string;
  helpCard4Item2: string;
  helpShortcutsTitle: string;
  helpShortcutsLine: string;
  hudSurfaceAlign: string;
  hudMove: string;
  hudRotate: string;
  hudScale: string;

  // 12-Concept Expansion: Modular, Validation, Terrain Sculpt, Surface-Aware, Repeat, Multi-Select, Adaptive Grid, Axis Lock, Height Snap, Floor System
  snapModularSocketTitle: string;
  snapModularSocketDesc: string;
  snapHeightTitle: string;
  snapHeightDesc: string;

  validationBtn: string;
  validPositionBadge: string;
  warnCollisionWith: string;
  warnOutOfPlot: string;
  warnOutOfDomain: string;
  warnSteepSlope: string;
  warnWrongSurface: string;

  terrainSculptBtn: string;
  terrainSculptTitle: string;
  sculptRaise: string;
  sculptLower: string;
  sculptFlatten: string;
  sculptSmooth: string;
  sculptTerrace: string;
  sculptRadius: string;
  sculptStrength: string;
  sculptTargetHeight: string;
  sculptLevelPlotBtn: string;
  sculptResetFlatBtn: string;
  sculptHint: string;

  surfAwareTitle: string;
  surfAwareDesc: string;
  surfMaxSlopeLabel: string;
  surfRuleSection: string;
  surfRuleAny: string;
  surfRuleBuilding: string;
  surfRuleFoliage: string;
  surfRuleRock: string;
  surfRuleInterior: string;
  surfRuleOpening: string;

  repeatArrayBtn: string;
  repeatModalTitle: string;
  repeatModeLinear: string;
  repeatModeGrid: string;
  repeatModeRadial: string;
  repeatCountLabel: string;
  repeatCountZLabel: string;
  repeatDirectionLabel: string;
  repeatSpacingFlush: string;
  repeatSpacingFixed: string;
  repeatDistanceLabel: string;
  repeatRadiusLabel: string;
  repeatAngleLabel: string;
  repeatFollowTerrain: string;
  repeatGroupResult: string;
  repeatApplyBtn: string;
  repeatAppliedToast: string;

  selSingle: string;
  selMultiTap: string;
  selBoxDrag: string;
  selSelectAll: string;
  selClear: string;
  selGroupSelected: string;
  multiSelectedCount: string;
  boxSelectHint: string;

  modularKitTab: string;
  modularKitHint: string;
  modCatAll: string;
  modCatFloors: string;
  modCatWalls: string;
  modCatOpenings: string;
  modCatStairs: string;
  modCatRoofs: string;
  modCatLandscape: string;

  gridAdaptiveTitle: string;
  gridAdaptiveDesc: string;
  gridAdaptiveBadge: string;

  axisLockTitle: string;
  axisLockFree: string;
  axisLockX: string;
  axisLockY: string;
  axisLockZ: string;
  axisLockXZ: string;

  floorSystemTitle: string;
  floorAddBtn: string;
  floorViewAll: string;
  floorViewCutaway: string;
  floorViewGhost: string;
  floorAssignLabel: string;
  floorMoveSelectionBtn: string;

  // Architect Life x Blender House Studio
  archPhaseWalls: string;
  archPhaseOpenings: string;
  archPhaseRoofs: string;
  archPhaseFinishing: string;
  archPhaseEnv: string;
  archView2DBtn: string;
  archView3DBtn: string;
  archToolSelect: string;
  archToolDrawWall: string;
  archToolMeasure: string;
  archDrawWallHint: string;
  archPlaceOpeningHint: string;
  archMeasureHint: string;

  archWallStyleFull: string;
  archWallStyleHalf: string;
  archWallStyleRailing: string;
  archWallHeightLabel: string;
  archWallThickLabel: string;
  archWallLenLabel: string;
  archWallCurveLabel: string;
  archWallAngleSnap: string;
  archWallBaseboard: string;
  archSpawnWallTemplateBtn: string;
  archWallTemplateSub: string;
  archSelectedWallTitle: string;
  archBakeToMeshBtn: string;
  archBakeSuccessToast: string;

  archOpenDoorSingle: string;
  archOpenDoorDouble: string;
  archOpenWinStd: string;
  archOpenWinWide: string;
  archOpenWinTall: string;
  archOpenArchway: string;
  archOpenWidthLabel: string;
  archOpenHeightLabel: string;
  archOpenSillLabel: string;
  archOpenPosLabel: string;
  archOpenFlipSwing: string;
  archStairSectionTitle: string;
  archStairStraightBtn: string;
  archStairLShapeBtn: string;
  archStairAutoCutout: string;
  archStairPlacedToast: string;

  archRoofAutoBtn: string;
  archRoofCustomBtn: string;
  archRoofGable: string;
  archRoofHip: string;
  archRoofShed: string;
  archRoofFlat: string;
  archRoofPitchLabel: string;
  archRoofOverhangLabel: string;
  archRoofRidgeAxisLabel: string;
  archRoofWidthLabel: string;
  archRoofDepthLabel: string;
  archRoofAddedToast: string;

  archRoomsTitle: string;
  archNoRoomsHint: string;
  archRoomAreaUnit: string;
  archRoomFloorColor: string;
  archRoomAutoCeiling: string;
  archDualWallTitle: string;
  archWallExtColor: string;
  archWallIntColor: string;
  archApplyAllWallsBtn: string;
  archRoomPresetLiving: string;
  archRoomPresetBedroom: string;
  archRoomPresetKitchen: string;
  archRoomPresetBath: string;
  archRoomPresetStudy: string;
  archRoomPresetTerrace: string;

  archSunToggleTitle: string;
  archSunTimeLabel: string;
  archCompassNorthLabel: string;
  archLensSectionTitle: string;
  archLensStd: string;
  archLensWide: string;
  archLensUltra: string;
  archSummaryTitle: string;
  archTotalAreaLabel: string;
  archRoomCountLabel: string;
  archWallTotalLenLabel: string;
  archExportBlueprintBtn: string;
  archBlueprintExportedToast: string;

  pointLightCardTitle: string;
  pointLightCardDesc: string;
  pointLightIntensity: string;
  pointLightRange: string;

  // Procedural Surface Patterns (True RGB preserved)
  patternSectionTitle: string;
  patternNone: string;
  patternWood: string;
  patternTile: string;
  patternBrick: string;
  patternConcrete: string;
  patternMarble: string;
  patternFabric: string;
  patternRoofTile: string;
  patternScaleLabel: string;

  // Blender-Style Perabot Modifiers
  modifierSectionTitle: string;
  modifierSectionDesc: string;
  modifierBevelLabel: string;
  modifierTaperXLabel: string;
  modifierTaperZLabel: string;
  modifierMirrorX: string;
  modifierMirrorZ: string;
  modifierMirrorDist: string;
  modifierResetBtn: string;
  modifierBakeTwinsBtn: string;

  // Custom Asset Categories & Re-Edit
  assetCatAll: string;
  assetCatChair: string;
  assetCatTable: string;
  assetCatLamp: string;
  assetCatCabinet: string;
  assetCatDecor: string;
  assetCatOther: string;
  assetCategoryLabel: string;
  assetReEditBtn: string;
  assetUpdateSavedBtn: string;
  assetReEditLoadedToast: string;
  assetUpdatedToast: string;

  // Exact Length Input, Door Toggle, Multi-Wing Roof & Skylight, Studio Photo
  archExactLengthPlaceholder: string;
  archApplyLengthBtn: string;
  archDoorToggleOpenBtn: string;
  archDoorStateOpen: string;
  archDoorStateClosed: string;
  archWalkDoorHint: string;
  archRoofAddWingBtn: string;
  archRoofRotationLabel: string;
  archRoofSkylightToggle: string;
  archRoofSkylightSizeLabel: string;
  archDragNodeHint: string;

  photoStudioBtnTitle: string;
  photoModalTitle: string;
  photoModalDesc: string;
  photoRes1080p: string;
  photoRes2kSquare: string;
  photoTransparentBg: string;
  photoCaptureBtn: string;
  photoCapturedToast: string;

  modCatPillars: string;
  modCatFences: string;

  // 16-Upgrade Bundle: Smooth Wall/Room Drawing, Cutaway, Floor Trace, Align/Distribute, Lock, Exact BBox & Asset Pack
  archToolDrawRoom: string;
  archToolQuickErase: string;
  archDrawRoomHint: string;
  archEraseHint: string;
  archChainModeToggle: string;
  archSafeConfirmToggle: string;
  archConfirmPlaceBtn: string;
  archCancelPlaceBtn: string;
  archSoftAngleGuideLabel: string;
  archCopyLowerWallsBtn: string;
  archCopiedLowerWallsToast: string;
  archQuickRotate90: string;

  alignDistributeTitle: string;
  alignLeftX: string;
  alignCenterX: string;
  alignRightX: string;
  alignBottomY: string;
  alignTopY: string;
  alignFrontZ: string;
  alignCenterZ: string;
  alignBackZ: string;
  distributeEvenX: string;
  distributeEvenZ: string;
  alignedToast: string;

  lockObjectTip: string;
  unlockObjectTip: string;
  exactDimTitle: string;
  exactDimProportional: string;

  exportAssetsPackBtn: string;
  importAssetsPackBtn: string;
  assetsPackExportedToast: string;
  assetsPackImportedToast: string;

  // Integrated 6-System Architectural Project Workflow (`Buat Rumah`)
  archWorkflowBtn: string;
  archWorkflowTitle: string;
  archWorkflowUpdating: string;
  wfTabBrief: string;
  wfTabSite: string;
  wfTabMaterials: string;
  wfTabValidation: string;
  wfTabVersions: string;
  wfTabDocs: string;

  // System 1: Project Brief & Requirements
  briefTemplateLabel: string;
  briefTplSingleStorey: string;
  briefTplTwoStorey: string;
  briefTplMinimalist: string;
  briefTplGarage: string;
  briefTplBlank: string;
  briefProjectTypeLabel: string;
  briefStyleLabel: string;
  briefDescLabel: string;
  briefNotesLabel: string;
  briefBudgetTitle: string;
  briefBudgetScopeMaterials: string;
  briefBudgetScopeConstruction: string;
  briefBudgetScopeCustom: string;
  briefAddRequirementBtn: string;
  briefStatusMet: string;
  briefStatusUnmet: string;
  briefStatusReview: string;
  briefStatusNA: string;
  briefRoomTypeLabel: string;
  briefUnassignedRoomsTitle: string;
  briefFocusBtn: string;

  // System 2: Construction Materials & Cost Estimator
  constMatSectionTitle: string;
  constMatSeparatedHint: string;
  constMatStructLabel: string;
  constMatExtFinishLabel: string;
  constMatIntFinishLabel: string;
  constMatFloorLabel: string;
  constMatRoofLabel: string;
  constMatOpeningLabel: string;
  constMatStairLabel: string;
  constMatObjectLabel: string;
  constMatUnassignedOption: string;
  constMatAutoAssignBtn: string;
  constMatAutoAssignedToast: string;
  takeoffTotalEstLabel: string;
  takeoffMaterialOnlyBadge: string;
  takeoffScopeMismatchWarn: string;
  takeoffMissingAssignTitle: string;
  takeoffUnpricedTitle: string;
  takeoffEditCatalogTitle: string;
  takeoffAddCustomMatBtn: string;
  takeoffUnitPriceLabel: string;
  takeoffWastePctLabel: string;
  takeoffByFloorTitle: string;

  // System 3: Design Alternatives & Versioning
  altSaveNewBtn: string;
  altNamePlaceholder: string;
  altDescPlaceholder: string;
  altEmptyHint: string;
  altInspectBtn: string;
  altInspectingBanner: string;
  altCloseInspectBtn: string;
  altRestoreBtn: string;
  altRestoreConfirmMsg: string;
  altRestoredToast: string;
  altDuplicateProjectBtn: string;
  altCompareTitle: string;
  altActiveWorkingLabel: string;

  // System 4: Spatial & Design Validation
  valAllCategories: string;
  valCatGeometry: string;
  valCatOpening: string;
  valCatSpatial: string;
  valCatBrief: string;
  valCatSite: string;
  valSevError: string;
  valSevWarning: string;
  valSevInfo: string;
  valHealthyMsg: string;
  valAutoFixBtn: string;
  valAutoFixedToast: string;
  valRerunBtn: string;

  // System 5: Site & Terrain Planning
  siteEnableToggle: string;
  siteDimensionsLabel: string;
  siteSetbacksTitle: string;
  siteSetbackDisclaimer: string;
  siteFrontLabel: string;
  siteRearLabel: string;
  siteLeftLabel: string;
  siteRightLabel: string;
  siteEntranceLabel: string;
  siteNudgeBuildingTitle: string;
  siteRotate90Btn: string;
  siteCenterOnPlotBtn: string;
  siteOutdoorZonesTitle: string;
  siteAddZoneBtn: string;
  siteAreaSummaryLabel: string;
  siteFootprintLabel: string;
  siteOpenAreaLabel: string;

  // System 6: Live Design Documentation
  docSourceLabel: string;
  docKindFloorPlan: string;
  docKindSitePlan: string;
  docKindElevation: string;
  docKindSchedule: string;
  docKindMaterialReport: string;
  docKindValidationReport: string;
  docThemeDark: string;
  docThemeWhite: string;
  docExportPngBtn: string;
  docExportHtmlBtn: string;
  docSectionLimitationNote: string;

  // Next-Gen Studio, Modeling, Lighting, Walkthrough & Architectural Pro Upgrades
  outlinerSearchPlaceholder: string;
  outlinerFolderBadge: string;
  saveWholeScenePrefabBtn: string;
  prefabDimsBadgeLabel: string;
  exportObjLabel: string;
  exportSelectedGlbLabel: string;
  exportSelectedObjLabel: string;
  worldScaleTexLabel: string;
  patternRotateLabel: string;
  csgCardTitle: string;
  csgCardHint: string;
  csgSubtractBtn: string;
  csgUnionBtn: string;
  csgIntersectBtn: string;
  csgResetBtn: string;
  csgAppliedToast: string;
  profileStudioBtn: string;
  profileStudioTitle: string;
  profileStudioDesc: string;
  profileModeLathe: string;
  profileModeExtrude: string;
  profileSmoothLabel: string;
  profileHollowLabel: string;
  profileSegmentsLabel: string;
  profileDepthLabel: string;
  profileTemplateLabel: string;
  profileAddPointHint: string;
  profileApplyBtn: string;
  lightTypePoint: string;
  lightTypeSpot: string;
  lightConeAngleLabel: string;
  lightKelvinLabel: string;
  lightAutoNightLabel: string;
  walkLookPadLabel: string;
  walkGhostModeLabel: string;
  walkEyeStanding: string;
  walkEyeSeated: string;
  walkInteractOpenDoor: string;
  walkInteractCloseDoor: string;
  walkInteractToggleLight: string;
  roomVoidToggleLabel: string;
  roomVoidHint: string;
  siteShapeLabel: string;
  siteShapeRect: string;
  siteShapeTrapezoid: string;
  siteShapeHook: string;
  siteShapeLLot: string;
  docKindSection: string;
  docSectionAxisAA: string;
  docSectionAxisBB: string;
  docSectionOffsetLabel: string;
  shadingModeTitle: string;
  shadingModeShaded: string;
  shadingModeClay: string;
  shadingModeTech: string;
  sectionCut3dTitle: string;
  sectionCutEnable: string;
  sectionCutFlip: string;
  measure3dToolLabel: string;
  measure3dHint: string;
  quickDimEditTitle: string;
  quickDimApplyBtn: string;
  photoRes4kLabel: string;
  photoTwoPointLabel: string;
  touchLoupeSettingLabel: string;

  // 7-Point Architect Life × Blender Unification & Touch UX Fixes
  wallEditAngleLockLabel: string;
  wallEditAngleLockedBadge: string;
  wallEditAngleFreeBadge: string;
  archDrawModeBtn: string;
  archPanZoomModeBtn: string;
  archTwoFingerHint: string;
  zoomIn2DBtn: string;
  zoomOut2DBtn: string;
  zoomReset2DBtn: string;
  archOutlinerFolder: string;
  archSelectedOpeningTitle: string;
  archSelectedStairTitle: string;
  archSelectedRoofTitle: string;
  archSelectedRoomTitle: string;
  archBakeWallHint: string;
  photoRenderedResBadge: string;

  // Holistic Polish: Compact Draw Bar, Endpoint Snap Readout & Full HUD Localization
  archDrawModeCompact: string;
  archPanModeCompact: string;
  archEndpointSnappedBadge: string;
  wallInnerFaceLabel: string;
  wallOuterFaceLabel: string;
  angleLockHudOn: string;
  angleLockHudFree: string;
  freeRotateHud: string;
  gridScaleHud: string;
  roomVoidLabel: string;
}

export const TRANSLATIONS: Record<AppLanguage, StudioStrings> = {
  id: {
    heroBadge: 'Studio 3D Bangunan & Perabot',
    heroTitle: 'Wujudkan Ide Ruang & Bentuk 3D dengan Mudah',
    heroSubtitle:
      'Rakit bentuk bebas dari 75 komponen presisi atau bangun rumah lengkap beserta interiornya langsung dari browser & layar sentuh.',
    continueLast: 'Lanjut Edit Terakhir',
    lastEdited: 'Terakhir dibuka',
    modeModelingTitle: 'Mode Modeling',
    modeModelingDesc:
      'Kanvas kosong dengan 75 Basic Shapes presisi untuk merakit perabot, ornamen, atau objek 3D dari nol.',
    modeModelingBtn: '+ Proyek Baru',
    modeHouseTitle: 'Buat Rumah',
    modeHouseDesc:
      'Kanvas arsitektur luas untuk merancang rumah memakai Basic Shapes, Asetku, Impor 3D (.glb/dll), Intip Ruang & Jalan Kaki.',
    modeHouseBtn: '+ Mulai Buat Rumah',
    openProjectFile: 'Buka File (.perabot)',
    globalSettings: 'Pengaturan',
    tabMyProjects: 'Proyekku',
    tabMyAssets: 'Koleksi Propertiku',
    emptyProjectsTitle: 'Belum ada proyek tersimpan',
    emptyProjectsDesc:
      'Pilih Mode Modeling atau Buat Rumah di atas—pekerjaanmu tersimpan pintar otomatis lengkap dengan pratinjau 3D.',
    emptyAssetsTitle: 'Koleksi properti masih kosong',
    emptyAssetsDesc:
      'Rakit meja, kursi, atau dekorasi lalu klik "Simpan ke Asetku" agar bisa dipakai berulang kali di proyek lain!',
    objectsUnit: 'objek',
    partsUnit: 'bagian',
    rename: 'Ganti Nama',
    duplicate: 'Duplikat',
    exportBackup: 'Simpan File .perabot',
    delete: 'Hapus',
    cancel: 'Batal',
    stageDragHint: 'Geser panggung 3D untuk memutar tampilan',
    moodMorning: 'Pagi',
    moodSunset: 'Sore',
    moodNight: 'Malam',

    settingsTitle: 'Pengaturan Studio',
    settingsSubtitle: 'Sesuaikan bahasa, tema warna, dan kenyamanan kontrol',
    langSection: 'Bahasa Aplikasi',
    themeSection: 'Tema Warna Studio',
    graphicsSection: 'Kualitas Grafis & Performa',
    gfxLight: 'Ringan',
    gfxLightDesc: 'Hemat baterai & lancar untuk HP ringan',
    gfxBalanced: 'Seimbang',
    gfxBalancedDesc: 'Bayangan halus & tajam 60 FPS',
    gfxUltra: 'Tinggi (Ultra)',
    gfxUltraDesc: 'Resolusi penuh HiDPI & bayangan ekstra tajam',
    controlsSection: 'Kontrol & Tampilan UI',
    orbitSpeed: 'Kecepatan Putar Kamera',
    uiDensity: 'Ukuran Antarmuka',
    densityComfort: 'Nyaman',
    densityCompact: 'Ringkas',
    done: 'Selesai',

    backHome: 'Menu Utama',
    untitledProject: 'Proyek Modeling',
    untitledHouse: 'Rumah Impian',
    savedAuto: 'Tersimpan',
    unsavedChanges: 'Belum disimpan (klik untuk simpan sekarang)',
    savingNow: 'Menyimpan...',
    undo: 'Urungkan (Ctrl+Z)',
    redo: 'Ulangi (Ctrl+Y)',
    snap: 'Snap',
    surface: 'Surface',
    grid: 'Grid',
    focusBtn: 'Fokus',
    cameraViewsBtn: 'Sudut',
    peekInterior: 'Intip Ruang',
    walkthrough: 'Jalan Kaki',
    exitWalkthrough: 'Keluar Jalan Kaki',
    walkHint:
      'Gunakan joystick kiri untuk jalan & geser layar kanan untuk menengok (WASD di PC)',
    import3DBtn: 'Impor 3D',
    import3DHint:
      'Impor satu atau banyak file 3D (.glb, .gltf, .obj, .stl, .ply, .fbx) ke domain',
    importing3DToast: 'Memuat file 3D ke dalam domain...',
    import3DFailedToast:
      'Gagal memuat file 3D (gunakan .glb, .gltf, .obj, .stl, .ply, .fbx)',
    restoreOriginalMaterial: 'Kembalikan Tekstur / Material Asli',
    exportBtn: 'Ekspor',
    clearScene: 'Bersihkan Kanvas',
    clearSceneConfirm: 'Hapus semua objek di kanvas ini?',
    fullscreen: 'Layar Penuh',
    toggleRightPanel: 'Buka / Tutup Panel Properti',
    help: 'Panduan',

    snapSystemTitle: 'Sistem Snap Pintar',
    activeState: 'Aktif',
    inactiveState: 'Nonaktif',
    snapMagnetTitle: 'Magnet Blok & Sudut',
    snapMagnetDesc:
      'Tempel rapat permukaan, garis tepi & sudut otomatis saat blok berdekatan',
    strengthSubtle: 'Halus',
    strengthNormal: 'Normal',
    strengthStrong: 'Kuat',
    snapAlignTitle: 'Garis Sejajar (Alignment)',
    snapAlignDesc:
      'Garis bantu laser saat lurus tengah/tepi dengan objek lain',
    snapGridTitle: 'Snap Grid',
    snapGridDesc: 'Kunci langkah geser & skala ke ukuran petak grid',

    surfaceSystemTitle: 'Surface Alignment & Kontur',
    surfaceOrientSection: 'Mode Orientasi Permukaan',
    surfModeNormalTitle: 'Ikuti Kemiringan (Align Normal)',
    surfModeNormalDesc:
      'Miring presisi mengikuti kemiringan atap, dinding, kubah & bukit',
    surfModeUprightTitle: 'Tegak Ikuti Tinggi',
    surfModeUprightDesc:
      'Tetap berdiri tegak lurus sambil mengikuti tinggi permukaan di bawahnya',
    surfModeFoundationTitle: 'Fondasi Lereng (Anti-Melayang)',
    surfModeFoundationDesc:
      'Tanam sudut tapak terendah bangunan ke lereng miring',
    surfAttachFaceSection: 'Sisi Objek yang Menempel',
    surfAttachAuto: 'Pintar',
    surfAttachBottom: 'Alas (-Y)',
    surfAttachBack: 'Belakang (-Z)',
    surfAttachTop: 'Atas (+Y)',
    surfAutoMoveTitle: 'Ikuti Otomatis saat Geser',
    surfAutoMoveDesc:
      'Seret objek atau panah XZ untuk meluncur mengikuti permukaan',
    surfClickPlaceTitle: 'Klik Target Permukaan (1-Tap)',
    surfClickPlaceDesc:
      'Ketuk bidang atap/dinding/bukit mana saja untuk memindahkan objek terpilih ke sana',
    surfSpinLabel: 'Putar di Permukaan',
    surfOffsetLabel: 'Jarak Offset Normal',
    surfConformNowCta: 'Tempel Objek Terpilih ke Bawah Sekarang',

    gridSystemTitle: 'Grid Studio & Pengukur Arsitektur',
    visibleState: 'Tampil',
    hiddenState: 'Sembunyi',
    gridCellSizeSection: 'Ukuran Petak Presisi',
    gridSyncSnapBtn: 'Sinkron Snap',
    gridSmartGuidesSection: 'Alat Bantu Ukur & Kavling',
    gridRulerTitle: 'Penggaris Angka Meter (X / Z)',
    gridRulerDesc: 'Tampilkan angka jarak 1m, 2m, 5m langsung di lantai kerja',
    gridFootprintTitle: 'Bayangan Ukuran Objek Aktif',
    gridFootprintDesc:
      'Proyeksikan kotak tapak & ukuran P × L × T meter di bawah objek terpilih',
    gridVertSection: 'Grid Tinggi Dinding (Vertikal)',
    gridVertOff: 'Mati',
    gridVertBack: 'Dinding Belakang',
    gridVertCorner: 'Sudut Ruang 3D',
    gridPlotTitle: 'Batas Kavling / Ukuran Ruangan',
    gridPlotDesc:
      'Garis batas area bangun (mis. kamar 4×4m atau rumah 8×12m)',
    gridPlotPresetsLabel: 'Preset Ukuran Kavling / Ruang',
    gridPlotWidth: 'Lebar X (m)',
    gridPlotDepth: 'Panjang Z (m)',
    gridStyleSection: 'Gaya Visual Lantai',
    gridStyleWire: 'Garis Studio',
    gridStyleWireSub: 'Bersih & ringan',
    gridStyleTile: 'Ubin Keramik',
    gridStyleTileSub: 'Pola lantai interior',
    gridStyleBlueprint: 'Blueprint CAD',
    gridStyleBlueprintSub: 'Gambar kerja teknis',
    gridStyleTerrain: 'Kontur Tanah 3D',
    gridStyleTerrainSub: 'Bukit & terasering',
    terrainShapeSection: 'Bentuk Kontur Tanah',
    terrainHills: 'Bukit',
    terrainValley: 'Lembah',
    terrainTerraced: 'Terasering',
    terrainFlat: 'Datar',
    terrainHeightLabel: 'Tinggi Kontur',
    gridWorldSizeLabel: 'Luas Area Kanvas',
    gridElevationLabel: 'Elevasi Lantai Kerja',
    gridFitObjectBaseBtn: 'Pas ke Alas Objek',
    gridAxesOn: 'Sumbu X/Z Aktif',
    gridAxesOff: 'Sumbu X/Z Mati',
    gridOpacityLabel: 'Kejelasan Garis',

    quickCameraHeader: 'Sudut Kamera Cepat',
    camPerspective: 'Perspektif 3D',
    camFront: 'Tampak Depan (Z)',
    camSide: 'Tampak Samping (X)',
    camTop: 'Tampak Atas (Y)',
    exportFormatHeader: 'Format Ekspor 3D',
    exportGlbTitle: 'Ekspor .GLB',
    exportGlbSub: 'File biner tunggal (Blender, Godot, Unity)',
    exportGltfTitle: 'Ekspor .GLTF',
    exportGltfSub: 'Format JSON standar glTF 2.0',

    select: 'Pilih',
    move: 'Geser',
    rotate: 'Putar',
    scale: 'Skala',
    paint: 'Warna',
    worldAxis: 'Global',
    localAxis: 'Lokal',
    stickSurface: 'Tempel',
    copy: 'Salin',
    showLeftToolbar: 'Tampilkan Toolbar Kiri',
    hideLeftToolbar: 'Sembunyikan Toolbar Kiri',
    rotAxisHorizontal: 'Mendatar (Y)',
    rotAxisFront: 'Depan (X)',
    rotAxisSide: 'Samping (Z)',
    rotSnapLabel: 'Kunci:',
    rotSnapFree: 'Bebas',
    rotResetZero: 'Tegakkan 0°',

    basicShapes: 'Basic Shapes',
    housePresets: 'Preset Rumah',
    shapesHint: 'Ketuk untuk tambah • Tekan lama untuk info bentuk',
    presetsHint: 'Ketuk untuk pasang • Tekan lama untuk detail',
    searchShapes: 'Cari bentuk (kubus, tangga, lengkung, kusen)...',
    searchPresets: 'Cari properti...',
    noShapeMatch: 'Tidak ada bentuk yang cocok dengan pencarian',
    lastUsed: 'Terakhir dipakai',
    properties: 'Properti',
    catAll: 'Semua',
    catCustom: 'Asetku',

    objectList: 'Daftar Objek',
    objectStudio: 'Studio Objek',
    emptyOutlinerHint:
      'Belum ada objek. Buka Basic Shapes di bawah atau klik Impor 3D di atas.',
    emptyInspectorHint:
      'Ketuk salah satu objek 3D di kanvas untuk mengatur posisi, warna, dan pembagian bidangnya.',
    hideObject: 'Sembunyikan',
    showObject: 'Tampilkan',
    tabTransform: 'Transform',
    tabColor: 'Warna RGB',
    tabSubdiv: 'Subdiv',
    objectNamePlaceholder: 'Nama objek...',
    imported3DModelTag: 'Model 3D Impor',
    positionLabel: 'Posisi (Meter)',
    rotationLabel: 'Rotasi (Derajat °)',
    scaleLabel: 'Ukuran / Skala (Meter)',
    resetBtn: 'Reset',
    uniformScaleLock: 'Proporsional',
    uniformScaleFree: 'Bebas XYZ',
    groupAction: 'Gabung Grup',
    ungroupAction: 'Pisah Grup',
    editGroupParts: 'Edit per Bagian',
    editingSinglePart: 'Mode Bagian Aktif',
    saveToAssets: 'Simpan ke Asetku',
    savedToAssetsToast: 'Tersimpan di Koleksi Propertiku!',
    groupedToast: 'Objek digabung menjadi satu grup',
    ungroupedToast: 'Grup berhasil dipisah',

    subdivHeaderTitle: 'Pembagi Kotak & Bidang (Subdivide)',
    subdivHeaderDesc:
      'Bagi satu objek menjadi banyak kotak atau bidang permukaan yang lebih kecil secara presisi.',
    subdivCellsLabel: 'Bagian Kotak',
    subdivTrianglesLabel: 'Poligon',
    subdivVerticesLabel: 'Titik Sudut',
    subdivQuickPresets: 'Bagi Cepat Seragam',
    subdivResetOriginal: 'Reset Utuh (1×1×1)',
    subdivPerAxisTitle: 'Jumlah Pembagian per Sumbu (X × Y × Z)',
    subdivAxisX: 'Sumbu X (Lebar)',
    subdivAxisY: 'Sumbu Y (Tinggi)',
    subdivAxisZ: 'Sumbu Z (Dalam)',
    subdivShowLinesTitle: 'Tampilkan Garis Petak Bidang',
    subdivShowLinesDesc:
      'Garis pembatas kotak bersih di permukaan tanpa garis diagonal berantakan',
    subdivGrooveLabel: 'Celah Alur Panel / Nat Kotak',
    subdivGrooveFlat: 'Rapat',
    subdivSplitBlocksBtn: 'Pecah Jadi Kotak-Kotak Kecil Terpisah',
    subdivSplitBlocksHint:
      'Mengubah pembagian ini menjadi blok-blok kecil mandiri agar tiap kotak bisa dihapus, digeser, ditarik, atau diwarnai satu per satu.',
    subdivSplitToast: 'Berhasil dipecah menjadi kotak-kotak kecil!',
    subdivCapNotice:
      'Batas aman performa aktif agar kanvas tetap mulus 60 FPS.',

    paintClickBtn: 'Cat Klik Objek',
    paintClickActive: 'Cat Klik: AKTIF',
    eyedropperBtn: 'Pipet',
    eyedropperActive: 'Klik Objek...',
    paintNoSelectionHint:
      'Pilih objek terlebih dahulu atau aktifkan Cat Klik Objek untuk mewarnai langsung di kanvas.',
    saveSwatchBtn: 'Simpan',
    brightnessLabel: 'Kecerahan Warna',
    autoHarmoniesTitle: 'Harmoni Warna Otomatis',
    savedPaletteTitle: 'Palet Warna Tersimpan',
    archMaterialPresetsTitle: 'Preset Material Arsitektur',
    advancedPbrTitle: 'Permukaan & Material Lanjutan (PBR)',
    opacityGlassLabel: 'Opasitas / Transparansi (Kaca)',
    roughnessLabel: 'Kekasaran (Mengilap ↔ Doff)',
    metalnessLabel: 'Kesan Logam (Metalness)',
    emissiveLampLabel: 'Cahaya Pendar (Lampu)',
    shadingStyleLabel: 'Gaya Sudut Permukaan',
    shadingSmooth: 'Halus',
    shadingFlat: 'Tegas',

    helpModalTitle: 'Panduan Lengkap Perabot 3D Studio',
    helpCard1Title: '75 Basic Shapes & Impor 3D',
    helpCard1Item1:
      'Ketuk bentuk di Basic Shapes untuk menambahkan ke kanvas, atau tahan agak lama (~0.4 detik) untuk membaca fungsi bentuknya.',
    helpCard1Item2:
      'Gunakan tombol Impor 3D di bar atas untuk memuat satu atau banyak file .glb, .gltf, .obj, .stl, .ply, atau .fbx sekaligus ke dalam domain.',
    helpCard2Title: 'Warna Asli RGB & Subdivision Kotak',
    helpCard2Item1:
      'Roda Warna RGB langsung mengganti warna asli objek maupun model 3D impor (mis. kubus kuning diubah putih benar-benar menjadi putih bersih).',
    helpCard2Item2:
      'Di tab Subdiv, bagi 1 kotak menjadi banyak kotak/bidang kecil (X × Y × Z), lalu klik "Pecah Jadi Kotak Kecil" bila ingin mengedit atau melubangi per bagian.',
    helpCard3Title: 'Surface Alignment (Tempel Permukaan)',
    helpCard3Item1:
      'Aktifkan menu Surface (T) di bar atas agar objek otomatis menempel rata mengikuti kemiringan atap, dinding, kubah, atau kontur tanah.',
    helpCard3Item2:
      'Pilih sisi tempel (Alas -Y, Belakang -Z untuk jendela/pintu di dinding, atau Atas +Y) serta fitur Klik Target Permukaan.',
    helpCard4Title: 'Grid Arsitektur & Pengukur Pintar',
    helpCard4Item1:
      'Dilengkapi penggaris angka meter, bayangan ukuran P × L × T di bawah objek aktif, batas kavling (mis. 8×12m), dan grid tinggi dinding.',
    helpCard4Item2:
      'Penyimpanan otomatis pintar: hanya menyimpan secara tenang 5 detik setelah ada perubahan nyata tanpa mengganggu performa.',
    helpShortcutsTitle: 'Pintasan Keyboard Cepat',
    helpShortcutsLine:
      'G Geser • R Putar • S Skala • T Surface • C Warna RGB • F Fokus Kamera • Shift+D Salin • Del Hapus • Ctrl+Z/Y Undo/Redo',
    hudSurfaceAlign: 'TEMPEL PERMUKAAN',
    hudMove: 'GESER',
    hudRotate: 'PUTAR',
    hudScale: 'SKALA',

    snapModularSocketTitle: 'Koneksi Modular Bangunan',
    snapModularSocketDesc:
      'Kunci otomatis ujung dinding ke dinding, pintu/jendela ke tembok, tangga ke lantai & atap ke dinding',
    snapHeightTitle: 'Snap Ketinggian (Height Snap)',
    snapHeightDesc:
      'Kunci posisi vertikal Y ke tingkatan elevasi tertentu atau tinggi lantai bangunan',

    validationBtn: 'Validasi',
    validPositionBadge: 'Posisi Aman & Valid',
    warnCollisionWith: 'Peringatan: Bertabrakan dengan',
    warnOutOfPlot: 'Peringatan: Di luar batas kavling bangunan',
    warnOutOfDomain: 'Peringatan: Melewati batas area kanvas',
    warnSteepSlope: 'Peringatan: Kemiringan tanah terlalu curam untuk bangunan',
    warnWrongSurface: 'Peringatan: Permukaan tidak sesuai aturan objek',

    terrainSculptBtn: 'Bentuk Tanah',
    terrainSculptTitle: 'Terrain Sculpting (Pembentuk Permukaan Tanah)',
    sculptRaise: 'Naikkan',
    sculptLower: 'Turunkan',
    sculptFlatten: 'Ratakan',
    sculptSmooth: 'Haluskan',
    sculptTerrace: 'Terasering',
    sculptRadius: 'Radius Kuas',
    sculptStrength: 'Kekuatan',
    sculptTargetHeight: 'Tinggi Rata',
    sculptLevelPlotBtn: 'Ratakan Tapak Kavling',
    sculptResetFlatBtn: 'Reset Tanah Datar',
    sculptHint: 'Sapukan kuas langsung di tanah 3D untuk membentuk kontur lahan',

    surfAwareTitle: 'Penempatan Sadar-Permukaan (Surface-Aware)',
    surfAwareDesc:
      'Sesuaikan sikap & validasi objek berdasar jenis bidang (tanah, lereng, lantai, dinding, atap)',
    surfMaxSlopeLabel: 'Batas Lereng Bangunan Rata',
    surfRuleSection: 'Aturan Permukaan Objek Ini',
    surfRuleAny: 'Bebas (Semua Bidang)',
    surfRuleBuilding: 'Bangunan (Wajib Rata)',
    surfRuleFoliage: 'Rumput & Pohon (Hanya Tanah)',
    surfRuleRock: 'Batu Alam (Tanah & Lereng)',
    surfRuleInterior: 'Perabot (Atas Lantai/Slab)',
    surfRuleOpening: 'Pintu & Jendela (Dinding)',

    repeatArrayBtn: 'Deret',
    repeatModalTitle: 'Gandakan & Deret Berulang (Array)',
    repeatModeLinear: 'Garis Lurus',
    repeatModeGrid: 'Petak 2D',
    repeatModeRadial: 'Melingkar',
    repeatCountLabel: 'Jumlah',
    repeatCountZLabel: 'Baris Z',
    repeatDirectionLabel: 'Arah Deret',
    repeatSpacingFlush: 'Rapat Sambung',
    repeatSpacingFixed: 'Jarak Tetap',
    repeatDistanceLabel: 'Jarak Antar',
    repeatRadiusLabel: 'Radius Lingkar',
    repeatAngleLabel: 'Sudut Sebar',
    repeatFollowTerrain: 'Ikuti Tinggi Tanah / Kontur',
    repeatGroupResult: 'Gabung Hasil Jadi Grup',
    repeatApplyBtn: 'Terapkan Deretan',
    repeatAppliedToast: 'Deretan objek berhasil dibuat!',

    selSingle: 'Pilih Tunggal',
    selMultiTap: 'Multi-Pilih',
    selBoxDrag: 'Kotak Seleksi',
    selSelectAll: 'Semua',
    selClear: 'Lepas',
    selGroupSelected: 'Gabung Pilihan',
    multiSelectedCount: 'objek terpilih',
    boxSelectHint: 'Seret kotak di layar untuk memilih banyak objek sekaligus',

    modularKitTab: 'Konstruksi Modular',
    modularKitHint: 'Komponen rumah presisi yang saling klop (lantai, dinding, pintu, jendela, tangga & atap)',
    modCatAll: 'Semua Modul',
    modCatFloors: 'Lantai & Fondasi',
    modCatWalls: 'Dinding',
    modCatOpenings: 'Pintu & Jendela',
    modCatStairs: 'Tangga & Pilar',
    modCatRoofs: 'Atap',
    modCatLandscape: 'Taman & Pagar',

    gridAdaptiveTitle: 'Grid Adaptif Otomatis (Zoom & Skala)',
    gridAdaptiveDesc:
      'Kerapatan petak berubah halus menyesuaikan jarak zoom kamera & skala objek',
    gridAdaptiveBadge: 'Auto',

    axisLockTitle: 'Kunci Sumbu:',
    axisLockFree: 'Bebas XYZ',
    axisLockX: 'Sumbu X',
    axisLockY: 'Sumbu Y',
    axisLockZ: 'Sumbu Z',
    axisLockXZ: 'Datar XZ',

    floorSystemTitle: 'Lantai Bangunan',
    floorAddBtn: '+ Lantai',
    floorViewAll: 'Semua Lantai',
    floorViewCutaway: 'Potong Atas',
    floorViewGhost: 'Bayang Lain',
    floorAssignLabel: 'Tingkat Lantai Objek',
    floorMoveSelectionBtn: 'Pindah ke Lantai Aktif',

    archPhaseWalls: 'Denah & Dinding',
    archPhaseOpenings: 'Pintu & Tangga',
    archPhaseRoofs: 'Atap Pintar',
    archPhaseFinishing: 'Ruang & Cat',
    archPhaseEnv: 'Matahari & Info',
    archView2DBtn: '2D Denah',
    archView3DBtn: '3D Studio',
    archToolSelect: 'Pilih / Blender',
    archToolDrawWall: 'Tarik Dinding',
    archToolMeasure: 'Meteran',
    archDrawWallHint: 'Ketuk titik awal lalu ketuk titik tujuan untuk menggambar dinding (Esc selesai rantai)',
    archPlaceOpeningHint: 'Arahkan & ketuk pada dinding untuk melubangi pintu/jendela otomatis',
    archMeasureHint: 'Ketuk 2 titik di kanvas untuk mengukur jarak bersih dalam meter',

    archWallStyleFull: 'Dinding Penuh',
    archWallStyleHalf: 'Dinding Setengah',
    archWallStyleRailing: 'Pagar Balkon',
    archWallHeightLabel: 'Tinggi Dinding',
    archWallThickLabel: 'Tebal Dinding',
    archWallLenLabel: 'Lebar Template',
    archWallCurveLabel: 'Lengkung Dinding',
    archWallAngleSnap: 'Kunci Sudut 45°/90°',
    archWallBaseboard: 'Lis Kaki Dinding',
    archSpawnWallTemplateBtn: '+ Taruh Template Dinding',
    archWallTemplateSub: 'Ukuran rumah umum (Tinggi 3.0m × Lebar 3.0m × Tebal 15cm), bebas dikostum',
    archSelectedWallTitle: 'Dinding Arsitektur Terpilih',
    archBakeToMeshBtn: 'Ubah ke Objek 3D Bebas (Blender)',
    archBakeSuccessToast: 'Diubah menjadi objek 3D bebas siap diedit',

    archOpenDoorSingle: 'Pintu Tunggal',
    archOpenDoorDouble: 'Pintu Ganda',
    archOpenWinStd: 'Jendela Kamar',
    archOpenWinWide: 'Jendela Lebar',
    archOpenWinTall: 'Kaca Panorama',
    archOpenArchway: 'Lubang Lengkung',
    archOpenWidthLabel: 'Lebar Bukaan',
    archOpenHeightLabel: 'Tinggi Bukaan',
    archOpenSillLabel: 'Tinggi Ambang Bawah',
    archOpenPosLabel: 'Posisi di Dinding',
    archOpenFlipSwing: 'Balik Arah Bukaan',
    archStairSectionTitle: 'Tangga & Lubang Lantai Otomatis',
    archStairStraightBtn: '+ Tangga Lurus',
    archStairLShapeBtn: '+ Tangga L',
    archStairAutoCutout: 'Lubangi Lantai Atas Otomatis',
    archStairPlacedToast: 'Tangga & bukaan lantai atas dipasang',

    archRoofAutoBtn: 'Buat Atap Otomatis Ikuti Denah',
    archRoofCustomBtn: '+ Tambah Atap Kustom',
    archRoofGable: 'Pelana',
    archRoofHip: 'Limasan',
    archRoofShed: 'Miring Satu Sisi',
    archRoofFlat: 'Datar Modern',
    archRoofPitchLabel: 'Kemiringan Atap',
    archRoofOverhangLabel: 'Teritisan (Overhang)',
    archRoofRidgeAxisLabel: 'Arah Bubungan',
    archRoofWidthLabel: 'Bentang X',
    archRoofDepthLabel: 'Bentang Z',
    archRoofAddedToast: 'Atap pintar berhasil dibuat',

    archRoomsTitle: 'Ruangan Terdeteksi Otomatis',
    archNoRoomsHint: 'Hubungkan dinding hingga menutup area untuk mendeteksi ruangan & luas m² otomatis.',
    archRoomAreaUnit: 'm²',
    archRoomFloorColor: 'Warna Lantai Ruang',
    archRoomAutoCeiling: 'Plafon Pintar (Muncul saat Jalan Kaki)',
    archDualWallTitle: 'Cat Dinding 2 Sisi (Luar vs Dalam)',
    archWallExtColor: 'Sisi Luar (Eksterior)',
    archWallIntColor: 'Sisi Dalam (Interior)',
    archApplyAllWallsBtn: 'Terapkan ke Dinding Lantai Ini',
    archRoomPresetLiving: 'Ruang Tamu',
    archRoomPresetBedroom: 'Kamar Tidur',
    archRoomPresetKitchen: 'Dapur',
    archRoomPresetBath: 'Kamar Mandi',
    archRoomPresetStudy: 'Ruang Kerja',
    archRoomPresetTerrace: 'Teras',

    archSunToggleTitle: 'Simulasi Jam Matahari & Kompas',
    archSunTimeLabel: 'Jam Matahari',
    archCompassNorthLabel: 'Arah Utara Kompas',
    archLensSectionTitle: 'Lensa Kamera Ruang',
    archLensStd: 'Standar 46°',
    archLensWide: 'Lebar 64°',
    archLensUltra: 'Interior 78°',
    archSummaryTitle: 'Data Bangunan & Denah',
    archTotalAreaLabel: 'Total Luas Ruang',
    archRoomCountLabel: 'Jumlah Ruangan',
    archWallTotalLenLabel: 'Total Panjang Dinding',
    archExportBlueprintBtn: 'Unduh Gambar Denah 2D (.PNG)',
    archBlueprintExportedToast: 'Gambar Denah 2D berhasil diunduh',

    pointLightCardTitle: 'Sumber Cahaya Nyata (Lampu Kustom)',
    pointLightCardDesc: 'Nyalakan agar objek lampu rakitanmu memancarkan cahaya hangat ke ruangan sekitar',
    pointLightIntensity: 'Terang Cahaya',
    pointLightRange: 'Jangkauan Meter',

    patternSectionTitle: 'Motif Permukaan (Warna RGB Tetap Asli)',
    patternNone: 'Polos',
    patternWood: 'Serat Kayu',
    patternTile: 'Keramik Nat',
    patternBrick: 'Bata Ekspos',
    patternConcrete: 'Beton Halus',
    patternMarble: 'Marmer',
    patternFabric: 'Kain Sofa',
    patternRoofTile: 'Genteng',
    patternScaleLabel: 'Kerapatan Motif',

    modifierSectionTitle: 'Modifier Bentuk Perabot (Blender)',
    modifierSectionDesc: 'Haluskan sudut bantal/meja, runcingkan kaki kursi, atau cerminkan simetris otomatis.',
    modifierBevelLabel: 'Tepi Halus / Bevel',
    modifierTaperXLabel: 'Runcing Sumbu X (Taper)',
    modifierTaperZLabel: 'Runcing Sumbu Z (Taper)',
    modifierMirrorX: 'Cermin Sisi X',
    modifierMirrorZ: 'Cermin Sisi Z',
    modifierMirrorDist: 'Jarak Cermin (m)',
    modifierResetBtn: 'Reset Modifier',
    modifierBakeTwinsBtn: 'Pisahkan Cermin Jadi Objek Mandiri',

    assetCatAll: 'Semua',
    assetCatChair: 'Kursi & Sofa',
    assetCatTable: 'Meja',
    assetCatLamp: 'Lampu',
    assetCatCabinet: 'Lemari & Rak',
    assetCatDecor: 'Dekorasi',
    assetCatOther: 'Lainnya',
    assetCategoryLabel: 'Kategori Koleksi',
    assetReEditBtn: 'Edit Ulang',
    assetUpdateSavedBtn: 'Perbarui Aset Ini',
    assetReEditLoadedToast: 'Aset dimuat ke panggung untuk diedit ulang',
    assetUpdatedToast: 'Koleksi properti berhasil diperbarui',

    archExactLengthPlaceholder: 'Ketik m (mis. 4.5)',
    archApplyLengthBtn: 'Buat',
    archDoorToggleOpenBtn: 'Buka / Tutup Daun Pintu',
    archDoorStateOpen: 'Terbuka',
    archDoorStateClosed: 'Tertutup',
    archWalkDoorHint: 'Ketuk pintu di depanmu untuk membuka / menutup',
    archRoofAddWingBtn: '+ Tambah Sayap Atap (Rumah L / Teras)',
    archRoofRotationLabel: 'Putar Atap (°)',
    archRoofSkylightToggle: 'Jendela Atap Kaca (Skylight)',
    archRoofSkylightSizeLabel: 'Lebar Skylight',
    archDragNodeHint: 'Seret titik sudut biru di kanvas untuk mengubah bentuk dinding & ruang secara langsung',

    photoStudioBtnTitle: 'Foto Studio HD',
    photoModalTitle: 'Foto Studio & Render Snapshot',
    photoModalDesc: 'Potret hasil perabot atau rumahmu dalam resolusi tinggi tanpa garis bantu & gizmo.',
    photoRes1080p: 'Lanskap HD (1920×1080)',
    photoRes2kSquare: 'Persegi Katalog 2K (2048×2048)',
    photoTransparentBg: 'Latar Belakang Transparan (.PNG Alpha)',
    photoCaptureBtn: 'Ambil & Unduh Foto (.PNG)',
    photoCapturedToast: 'Foto Studio HD berhasil disimpan',

    modCatPillars: 'Pilar & Kanopi',
    modCatFences: 'Pagar & Gerbang',

    archToolDrawRoom: 'Kotak Ruangan',
    archToolQuickErase: 'Hapus Sentuh',
    archDrawRoomHint: 'Tahan & geser diagonal untuk membuat 4 tembok ruangan sekaligus',
    archEraseHint: 'Ketuk tembok, pintu/jendela, tangga, atau atap untuk menghapus cepat',
    archChainModeToggle: 'Sambung Beruntun',
    archSafeConfirmToggle: 'Konfirmasi Pasang',
    archConfirmPlaceBtn: 'Pasang',
    archCancelPlaceBtn: 'Batal',
    archSoftAngleGuideLabel: 'Magnet Sudut Halus (0°/45°/90°)',
    archCopyLowerWallsBtn: 'Jiplak Dinding Lantai Bawah',
    archCopiedLowerWallsToast: 'Dinding lantai bawah berhasil disalin',
    archQuickRotate90: 'Putar 90°',

    alignDistributeTitle: 'Ratakan & Susun Presisi',
    alignLeftX: 'Rata Kiri (X-)',
    alignCenterX: 'Tengah X',
    alignRightX: 'Rata Kanan (X+)',
    alignBottomY: 'Rata Alas (Y-)',
    alignTopY: 'Rata Atas (Y+)',
    alignFrontZ: 'Rata Depan (Z+)',
    alignCenterZ: 'Tengah Z',
    alignBackZ: 'Rata Belakang (Z-)',
    distributeEvenX: 'Jarak Sama X',
    distributeEvenZ: 'Jarak Sama Z',
    alignedToast: 'Posisi objek berhasil diratakan',

    lockObjectTip: 'Kunci objek agar tidak tergeser',
    unlockObjectTip: 'Buka kunci objek',
    exactDimTitle: 'Ukuran Asli (Meter P×T×L)',
    exactDimProportional: 'Kunci Rasio',

    exportAssetsPackBtn: 'Ekspor Koleksi',
    importAssetsPackBtn: 'Impor Koleksi',
    assetsPackExportedToast: 'Paket koleksi properti berhasil diekspor',
    assetsPackImportedToast: 'Koleksi properti berhasil diimpor',

    archWorkflowBtn: 'Studio Proyek',
    archWorkflowTitle: 'Alur Proyek Arsitektur Terpadu',
    archWorkflowUpdating: 'Memperbarui analisis...',
    wfTabBrief: 'Brief',
    wfTabSite: 'Tapak',
    wfTabMaterials: 'RAB & Material',
    wfTabValidation: 'Validasi',
    wfTabVersions: 'Versi',
    wfTabDocs: 'Dokumen',

    briefTemplateLabel: 'Templat Awal Brief (Dapat Diedit)',
    briefTplSingleStorey: 'Rumah 1 Lantai Kompak',
    briefTplTwoStorey: 'Rumah Keluarga 2 Lantai',
    briefTplMinimalist: 'Hunian Minimalis Modern',
    briefTplGarage: 'Rumah + Garasi Terpadu',
    briefTplBlank: 'Brief Kosong Kustom',
    briefProjectTypeLabel: 'Tipe Proyek',
    briefStyleLabel: 'Gaya Arsitektur',
    briefDescLabel: 'Deskripsi Singkat',
    briefNotesLabel: 'Catatan Perencanaan Bebas',
    briefBudgetTitle: 'Target Anggaran Opsional',
    briefBudgetScopeMaterials: 'Khusus Material Saja',
    briefBudgetScopeConstruction: 'Konstruksi Penuh',
    briefBudgetScopeCustom: 'Cakupan Kustom',
    briefAddRequirementBtn: '+ Tambah Kebutuhan Ruang/Target',
    briefStatusMet: 'Terpenuhi',
    briefStatusUnmet: 'Belum Terpenuhi',
    briefStatusReview: 'Perlu Tinjauan',
    briefStatusNA: 'Info',
    briefRoomTypeLabel: 'Fungsi Ruang',
    briefUnassignedRoomsTitle: 'Ruang Belum Dikategorikan (Klik untuk Pilih Fungsi)',
    briefFocusBtn: 'Fokus',

    constMatSectionTitle: 'Material Konstruksi (Terpisah dari Warna Visual)',
    constMatSeparatedHint:
      'Mengubah warna cat atau motif visual TIDAK mengubah penetapan material konstruksi maupun RAB.',
    constMatStructLabel: 'Struktur Inti Tembok',
    constMatExtFinishLabel: 'Finishing Luar',
    constMatIntFinishLabel: 'Finishing Dalam',
    constMatFloorLabel: 'Material Konstruksi Lantai',
    constMatRoofLabel: 'Material Penutup/Struktur Atap',
    constMatOpeningLabel: 'Material Unit Kusen/Daun',
    constMatStairLabel: 'Material Struktur Tangga',
    constMatObjectLabel: 'Material Konstruksi Blok',
    constMatUnassignedOption: '— Belum Dipilih (Unassigned) —',
    constMatAutoAssignBtn: 'Isi Standar ke Elemen Kosong',
    constMatAutoAssignedToast: 'Material konstruksi standar diterapkan pada elemen yang belum dipilih',
    takeoffTotalEstLabel: 'Estimasi Biaya Material',
    takeoffMaterialOnlyBadge: 'Cakupan Khusus Material (Material-Only)',
    takeoffScopeMismatchWarn:
      'Perhatian Cakupan: Target anggaran Anda disetel ke Konstruksi Penuh/Kustom, sedangkan hitungan ini hanya mencakup kuantitas Material Bangunan (belum termasuk upah tukang, MEP, izin, & pajak).',
    takeoffMissingAssignTitle: 'Elemen Belum Diberi Material Konstruksi',
    takeoffUnpricedTitle: 'Material Tanpa Harga Satuan',
    takeoffEditCatalogTitle: 'Katalog Material & Harga Satuan (Dapat Diedit)',
    takeoffAddCustomMatBtn: '+ Material Kustom',
    takeoffUnitPriceLabel: 'Harga Satuan (Rp)',
    takeoffWastePctLabel: 'Waste (%)',
    takeoffByFloorTitle: 'Rincian per Lantai',

    altSaveNewBtn: '+ Simpan Alternatif Desain',
    altNamePlaceholder: 'Nama opsi (mis. Opsi A - Atap Pelana)',
    altDescPlaceholder: 'Catatan perubahan opsi ini...',
    altEmptyHint:
      'Simpan snapshot independen dari model bangunan, material, brief, & tapak untuk membandingkan berbagai opsi desain secara berdampingan.',
    altInspectBtn: 'Inspeksi',
    altInspectingBanner: 'Mode Inspeksi Baca-Saja (Model Aktif Tidak Berubah)',
    altCloseInspectBtn: 'Tutup Inspeksi',
    altRestoreBtn: 'Pulihkan ke Aktif',
    altRestoreConfirmMsg:
      'Pulihkan opsi ini ke model kerja aktif? (Anda tetap dapat menekan Undo / Ctrl+Z jika berubah pikiran).',
    altRestoredToast: 'Alternatif desain dipulihkan ke model aktif',
    altDuplicateProjectBtn: 'Duplikat Opsi',
    altCompareTitle: 'Komparasi Berdampingan',
    altActiveWorkingLabel: 'Model Kerja Aktif (Live)',

    valAllCategories: 'Semua',
    valCatGeometry: 'Geometri',
    valCatOpening: 'Bukaan & Tembok',
    valCatSpatial: 'Kenyamanan Ruang',
    valCatBrief: 'Target Brief',
    valCatSite: 'Tapak & Sempadan',
    valSevError: 'Error',
    valSevWarning: 'Peringatan',
    valSevInfo: 'Info',
    valHealthyMsg: 'Tidak ada konflik geometri atau peringatan tata ruang yang terdeteksi.',
    valAutoFixBtn: 'Sesuaikan Otomatis',
    valAutoFixedToast: 'Penyesuaian otomatis diterapkan',
    valRerunBtn: 'Cek Ulang',

    siteEnableToggle: 'Aktifkan Batas Lahan & Garis Sempadan',
    siteDimensionsLabel: 'Ukuran Lahan Tapak (Lebar X × Panjang Z)',
    siteSetbacksTitle: 'Garis Sempadan Perencanaan (Meter)',
    siteSetbackDisclaimer:
      'Nilai sempadan ditentukan sendiri oleh pengguna sebagai panduan tata letak (bukan klaim kepatuhan hukum/GSB daerah).',
    siteFrontLabel: 'Depan (+Z)',
    siteRearLabel: 'Belakang (-Z)',
    siteLeftLabel: 'Kiri (-X)',
    siteRightLabel: 'Kanan (+X)',
    siteEntranceLabel: 'Sisi Akses Masuk Utama',
    siteNudgeBuildingTitle: 'Geser & Putar Posisi Bangunan di Lahan',
    siteRotate90Btn: 'Putar Bangunan 90°',
    siteCenterOnPlotBtn: 'Tengahkan di Lahan',
    siteOutdoorZonesTitle: 'Zona Ruang Luar Tapak',
    siteAddZoneBtn: '+ Tambah Zona Luar',
    siteAreaSummaryLabel: 'Luas Lahan',
    siteFootprintLabel: 'Jejak Bangunan',
    siteOpenAreaLabel: 'Sisa Area Terbuka',

    docSourceLabel: 'Sumber Dokumen',
    docKindFloorPlan: 'Denah Lantai 2D',
    docKindSitePlan: 'Rencana Tapak (Site Plan)',
    docKindElevation: 'Tampak Bangunan (4 Sisi)',
    docKindSchedule: 'Jadwal Pintu & Jendela',
    docKindMaterialReport: 'Laporan Kuantitas & RAB',
    docKindValidationReport: 'Ringkasan Validasi Desain',
    docThemeDark: 'Cetak Biru Gelap',
    docThemeWhite: 'Kertas Arsitek Putih',
    docExportPngBtn: 'Unduh Gambar .PNG',
    docExportHtmlBtn: 'Unduh Paket Laporan Cetak (.HTML/PDF)',
    docSectionLimitationNote:
      'Catatan Teknis: Denah lantai, rencana tapak, 4 tampak ortografis, dan potongan melintang A–A\' / B–B\' dihasilkan langsung dari irisan geometri model nyata.',

    outlinerSearchPlaceholder: 'Cari nama objek atau grup...',
    outlinerFolderBadge: 'Grup',
    saveWholeScenePrefabBtn: 'Simpan Rakitan Kanvas ke Katalog',
    prefabDimsBadgeLabel: 'Ukuran',
    exportObjLabel: 'Ekspor Model 3D (.OBJ)',
    exportSelectedGlbLabel: 'Ekspor Pilihan Saja (.GLB)',
    exportSelectedObjLabel: 'Ekspor Pilihan Saja (.OBJ)',
    worldScaleTexLabel: 'Skala Tekstur Meter Nyata (Anti-Melar)',
    patternRotateLabel: 'Rotasi Arah Serat / Pola',
    csgCardTitle: 'Operasi Boolean 3D (Potong / Gabung / Iris)',
    csgCardHint:
      'Pilih 2+ objek (Objek ke-1 = Target Utama, Objek ke-2+ = Pemotong) untuk melubangi wastafel, rak, atau ceruk dinding.',
    csgSubtractBtn: 'Potong (A - B)',
    csgUnionBtn: 'Gabung (A + B)',
    csgIntersectBtn: 'Iris (A ∩ B)',
    csgResetBtn: 'Pulihkan Bentuk Sebelum Boolean',
    csgAppliedToast: 'Operasi Boolean 3D berhasil diterapkan',
    profileStudioBtn: 'Studio Profil 2D ke 3D (Bubut / Extrude)',
    profileStudioTitle: 'Studio Profil Kustom 2D ke 3D',
    profileStudioDesc:
      'Geser titik kurva 2D untuk membentuk kaki meja bubut 360°, vas berongga, kap lampu, atau lis profil memanjang.',
    profileModeLathe: 'Putar Bubut 360° (Lathe)',
    profileModeExtrude: 'Tebalkan Memanjang (Extrude)',
    profileSmoothLabel: 'Haluskan Kurva (Spline)',
    profileHollowLabel: 'Tebal Dinding Berongga',
    profileSegmentsLabel: 'Kehalusan Segmen',
    profileDepthLabel: 'Panjang Ekstrusi',
    profileTemplateLabel: 'Kurva Dasar Awal',
    profileAddPointHint: 'Ketuk area kosong untuk tambah titik · Geser titik biru · Ketuk 2x titik untuk hapus',
    profileApplyBtn: 'Buat / Perbarui Bentuk 3D',
    lightTypePoint: 'Menyebar 360° (Bohlam)',
    lightTypeSpot: 'Sorot Bawah (Downlight / Spot)',
    lightConeAngleLabel: 'Sudut Sorot Lampu',
    lightKelvinLabel: 'Suhu Warna Kelvin',
    lightAutoNightLabel: 'Otomatis Menyala Saat Sore / Malam Saja',
    walkLookPadLabel: 'Geser untuk Menoleh',
    walkGhostModeLabel: 'Tembus Dinding',
    walkEyeStanding: 'Berdiri (1.65m)',
    walkEyeSeated: 'Duduk (1.10m)',
    walkInteractOpenDoor: 'Buka Pintu',
    walkInteractCloseDoor: 'Tutup Pintu',
    walkInteractToggleLight: 'Sakelar Lampu',
    roomVoidToggleLabel: 'Bukaan Void / Mezzanine Terbuka (2 Lantai)',
    roomVoidHint:
      'Membuka pelat lantai ruang atas & plafon di bawahnya untuk ruang keluarga plafon ganda (double-height).',
    siteShapeLabel: 'Bentuk Kavling Lahan',
    siteShapeRect: 'Persegi Panjang',
    siteShapeTrapezoid: 'Trapesium',
    siteShapeHook: 'Kavling Sudut (Hook)',
    siteShapeLLot: 'Kavling Bentuk L',
    docKindSection: 'Potongan Melintang (A–A\' / B–B\')',
    docSectionAxisAA: 'Potongan Melintang A–A\' (Sumbu X)',
    docSectionAxisBB: 'Potongan Memanjang B–B\' (Sumbu Z)',
    docSectionOffsetLabel: 'Posisi Garis Irisan (m)',
    shadingModeTitle: 'Gaya Visual Viewport',
    shadingModeShaded: 'Realistis PBR',
    shadingModeClay: 'Maket Putih (Clay)',
    shadingModeTech: 'Garis Teknik',
    sectionCut3dTitle: 'Irisan 3D Langsung (Section Box)',
    sectionCutEnable: 'Aktifkan Bidang Iris 3D',
    sectionCutFlip: 'Balik Arah Irisan',
    measure3dToolLabel: 'Meteran 3D',
    measure3dHint: 'Ketuk Titik A lalu Titik B pada objek/ruang (otomatis menempel ke sudut terdekat)',
    quickDimEditTitle: 'Ukuran Presisi Meter (P × T × L)',
    quickDimApplyBtn: 'Terapkan',
    photoRes4kLabel: '4K Ultra HD (3840 × 2160)',
    photoTwoPointLabel: 'Perspektif 2-Titik Arsitektur (Garis Dinding Tegak Lurus)',
    touchLoupeSettingLabel: 'Kaca Pembesar Presisi Sentuh Saat Geser Sudut',

    wallEditAngleLockLabel: 'Kunci Sudut Dinding (0°/45°/90°)',
    wallEditAngleLockedBadge: 'Kunci Sudut: Aktif',
    wallEditAngleFreeBadge: 'Kunci Sudut: Bebas',
    archDrawModeBtn: 'Mode Pasang',
    archPanZoomModeBtn: 'Geser & Zoom Layar',
    archTwoFingerHint: '2 jari untuk zoom & geser kapan saja',
    zoomIn2DBtn: 'Perbesar Denah (+)',
    zoomOut2DBtn: 'Perkecil Denah (-)',
    zoomReset2DBtn: 'Pusatkan Denah',
    archOutlinerFolder: 'Struktur Bangunan',
    archSelectedOpeningTitle: 'Pintu / Jendela',
    archSelectedStairTitle: 'Tangga Bangunan',
    archSelectedRoofTitle: 'Atap Bangunan',
    archSelectedRoomTitle: 'Ruangan Lantai',
    archBakeWallHint:
      'Ubah dinding ini menjadi blok 3D bebas jika ingin menerapkan Subdivisi panel atau pemotongan Boolean CSG.',
    photoRenderedResBadge: 'Resolusi Aktif',

    archDrawModeCompact: 'Pasang',
    archPanModeCompact: 'Geser Layar',
    archEndpointSnappedBadge: 'Ujung Terkunci',
    wallInnerFaceLabel: 'Dinding Dalam',
    wallOuterFaceLabel: 'Dinding Luar',
    angleLockHudOn: 'Kunci Sudut ON',
    angleLockHudFree: 'Sudut Bebas',
    freeRotateHud: 'Putar Sudut Bebas',
    gridScaleHud: 'Skala Grid',
    roomVoidLabel: 'Void Mezzanine (Lubang Lantai)',
  },

  en: {
    heroBadge: '3D Architecture & Furniture Studio',
    heroTitle: 'Design 3D Spaces & Custom Models Effortlessly',
    heroSubtitle:
      'Build custom furniture and buildings from 75 precision shapes or import external 3D models right in your browser & touch screen.',
    continueLast: 'Continue Editing',
    lastEdited: 'Edited',
    modeModelingTitle: '3D Modeling',
    modeModelingDesc:
      'Start on a clean canvas with 75 crisp Basic Shapes to craft custom furniture, props, or architectural details.',
    modeModelingBtn: '+ New Project',
    modeHouseTitle: 'House Builder',
    modeHouseDesc:
      'Spacious architectural domain to design homes with Basic Shapes, Saved Assets, 3D Import (.glb & more), Peek Inside & Walkthrough.',
    modeHouseBtn: '+ Build a House',
    openProjectFile: 'Open File (.perabot)',
    globalSettings: 'Settings',
    tabMyProjects: 'My Projects',
    tabMyAssets: 'Saved Assets',
    emptyProjectsTitle: 'No saved projects yet',
    emptyProjectsDesc:
      'Start in 3D Modeling or House Builder above—your work smart-saves automatically with live 3D previews.',
    emptyAssetsTitle: 'No custom assets yet',
    emptyAssetsDesc:
      'Build a chair, table, or decor piece and tap "Save as Asset" to reuse it across any project!',
    objectsUnit: 'items',
    partsUnit: 'parts',
    rename: 'Rename',
    duplicate: 'Duplicate',
    exportBackup: 'Save .perabot File',
    delete: 'Delete',
    cancel: 'Cancel',
    stageDragHint: 'Drag stage to orbit 3D showcase',
    moodMorning: 'Morning',
    moodSunset: 'Sunset',
    moodNight: 'Night',

    settingsTitle: 'Studio Settings',
    settingsSubtitle: 'Customize language, workspace theme, and touch feel',
    langSection: 'App Language',
    themeSection: 'Workspace Theme',
    graphicsSection: 'Graphics & Performance',
    gfxLight: 'Light',
    gfxLightDesc: 'Battery saver & smooth on entry phones',
    gfxBalanced: 'Balanced',
    gfxBalancedDesc: 'Soft shadows & crisp 60 FPS',
    gfxUltra: 'Ultra',
    gfxUltraDesc: 'Full HiDPI rendering & sharp shadows',
    controlsSection: 'Camera & UI Layout',
    orbitSpeed: 'Orbit Camera Speed',
    uiDensity: 'UI Sizing',
    densityComfort: 'Comfortable',
    densityCompact: 'Compact',
    done: 'Done',

    backHome: 'Home',
    untitledProject: 'Modeling Project',
    untitledHouse: 'Cozy House',
    savedAuto: 'Saved',
    unsavedChanges: 'Unsaved changes (click to save now)',
    savingNow: 'Saving...',
    undo: 'Undo (Ctrl+Z)',
    redo: 'Redo (Ctrl+Y)',
    snap: 'Snap',
    surface: 'Surface',
    grid: 'Grid',
    focusBtn: 'Focus',
    cameraViewsBtn: 'Views',
    peekInterior: 'Peek Inside',
    walkthrough: 'Walkthrough',
    exitWalkthrough: 'Exit Walk',
    walkHint:
      'Use left joystick to walk & drag screen to look around (WASD on desktop)',
    import3DBtn: 'Import 3D',
    import3DHint:
      'Import one or multiple 3D files (.glb, .gltf, .obj, .stl, .ply, .fbx) into domain',
    importing3DToast: 'Loading 3D files into domain...',
    import3DFailedToast:
      'Failed to load 3D file (use .glb, .gltf, .obj, .stl, .ply, or .fbx)',
    restoreOriginalMaterial: 'Restore Original Texture / Material',
    exportBtn: 'Export',
    clearScene: 'Clear Scene',
    clearSceneConfirm: 'Clear all objects in this canvas?',
    fullscreen: 'Fullscreen',
    toggleRightPanel: 'Toggle Inspector Sidebar',
    help: 'Guide',

    snapSystemTitle: 'Smart Snapping System',
    activeState: 'Active',
    inactiveState: 'Off',
    snapMagnetTitle: 'Block & Corner Magnet',
    snapMagnetDesc:
      'Snap faces, edges, and corners flush together when blocks get close',
    strengthSubtle: 'Subtle',
    strengthNormal: 'Normal',
    strengthStrong: 'Strong',
    snapAlignTitle: 'Laser Alignment Guides',
    snapAlignDesc:
      'Show alignment guide lines when centered or flush with distant objects',
    snapGridTitle: 'Grid Snap',
    snapGridDesc: 'Lock move and scale increments to the grid step size',

    surfaceSystemTitle: 'Surface Alignment & Terrain',
    surfaceOrientSection: 'Surface Orientation Mode',
    surfModeNormalTitle: 'Align to Surface Normal',
    surfModeNormalDesc:
      'Tilt flush against sloped roofs, walls, domes, ramps, and hills',
    surfModeUprightTitle: 'Stay Upright on Contour',
    surfModeUprightDesc:
      'Keep vertical posture while following ground or floor height beneath',
    surfModeFoundationTitle: 'Slope Foundation Seat',
    surfModeFoundationDesc:
      'Seat the lowest footprint corner into sloped terrain without floating',
    surfAttachFaceSection: 'Object Face to Attach',
    surfAttachAuto: 'Smart Auto',
    surfAttachBottom: 'Bottom (-Y)',
    surfAttachBack: 'Back (-Z)',
    surfAttachTop: 'Top (+Y)',
    surfAutoMoveTitle: 'Auto-Follow While Dragging',
    surfAutoMoveDesc:
      'Drag the object or XZ handles to glide smoothly across surfaces',
    surfClickPlaceTitle: '1-Tap Click Surface Target',
    surfClickPlaceDesc:
      'Tap any roof, wall, or hill face to place the selected object right there',
    surfSpinLabel: 'Spin on Surface',
    surfOffsetLabel: 'Surface Normal Offset',
    surfConformNowCta: 'Drop & Conform Selected Object Now',

    gridSystemTitle: 'Studio Grid & Architectural Guides',
    visibleState: 'Shown',
    hiddenState: 'Hidden',
    gridCellSizeSection: 'Precision Cell Spacing',
    gridSyncSnapBtn: 'Sync Snap',
    gridSmartGuidesSection: 'Measurement & Plot Guides',
    gridRulerTitle: 'Meter Coordinate Ruler (X / Z)',
    gridRulerDesc: 'Display 1m, 2m, 5m distance markers directly on the floor',
    gridFootprintTitle: 'Selected Object Footprint',
    gridFootprintDesc:
      'Project live W × D × H meter dimensions onto the floor beneath selection',
    gridVertSection: 'Vertical Height Grid (Walls)',
    gridVertOff: 'Off',
    gridVertBack: 'Back Wall',
    gridVertCorner: '3D Corner Box',
    gridPlotTitle: 'Plot / Room Boundary Frame',
    gridPlotDesc:
      'Show target room or land boundary rectangle (e.g. 4×4m room or 8×12m plot)',
    gridPlotPresetsLabel: 'Quick Plot / Room Sizes',
    gridPlotWidth: 'Width X (m)',
    gridPlotDepth: 'Depth Z (m)',
    gridStyleSection: 'Floor Visual Style',
    gridStyleWire: 'Studio Wire',
    gridStyleWireSub: 'Clean & minimal',
    gridStyleTile: 'Ceramic Tile',
    gridStyleTileSub: 'Architectural tiles',
    gridStyleBlueprint: 'CAD Blueprint',
    gridStyleBlueprintSub: 'Technical drafting',
    gridStyleTerrain: '3D Terrain',
    gridStyleTerrainSub: 'Hills & terraces',
    terrainShapeSection: '3D Terrain Landform',
    terrainHills: 'Hills',
    terrainValley: 'Valley',
    terrainTerraced: 'Terraced',
    terrainFlat: 'Flat',
    terrainHeightLabel: 'Contour Height',
    gridWorldSizeLabel: 'Canvas World Size',
    gridElevationLabel: 'Workplane Floor Elevation',
    gridFitObjectBaseBtn: 'Match Object Base',
    gridAxesOn: 'X/Z Axes ON',
    gridAxesOff: 'X/Z Axes OFF',
    gridOpacityLabel: 'Line Opacity',

    quickCameraHeader: 'Quick Camera Angles',
    camPerspective: '3D Perspective',
    camFront: 'Front View (Z)',
    camSide: 'Side View (X)',
    camTop: 'Top View (Y)',
    exportFormatHeader: '3D Export Format',
    exportGlbTitle: 'Export .GLB',
    exportGlbSub: 'Single binary file (Blender, Godot, Unity)',
    exportGltfTitle: 'Export .GLTF',
    exportGltfSub: 'Standard glTF 2.0 JSON format',

    select: 'Select',
    move: 'Move',
    rotate: 'Rotate',
    scale: 'Scale',
    paint: 'Color',
    worldAxis: 'World',
    localAxis: 'Local',
    stickSurface: 'Conform',
    copy: 'Clone',
    showLeftToolbar: 'Show Left Toolbar',
    hideLeftToolbar: 'Hide Left Toolbar',
    rotAxisHorizontal: 'Horizontal (Y)',
    rotAxisFront: 'Tilt Front (X)',
    rotAxisSide: 'Tilt Side (Z)',
    rotSnapLabel: 'Snap:',
    rotSnapFree: 'Free',
    rotResetZero: 'Reset 0°',

    basicShapes: 'Basic Shapes',
    housePresets: 'House Presets',
    shapesHint: 'Tap to add • Hold for shape details',
    presetsHint: 'Tap to place • Hold for details',
    searchShapes: 'Search shapes (cube, stair, arch, frame)...',
    searchPresets: 'Search assets...',
    noShapeMatch: 'No shapes match your search',
    lastUsed: 'Recent',
    properties: 'Inspector',
    catAll: 'All',
    catCustom: 'My Assets',

    objectList: 'Scene Objects',
    objectStudio: 'Object Studio',
    emptyOutlinerHint:
      'No objects yet. Open Basic Shapes below or click Import 3D in the top bar.',
    emptyInspectorHint:
      'Tap any 3D object on the canvas to edit its transform, color, or surface subdivisions.',
    hideObject: 'Hide',
    showObject: 'Show',
    tabTransform: 'Transform',
    tabColor: 'RGB Color',
    tabSubdiv: 'Subdivide',
    objectNamePlaceholder: 'Object name...',
    imported3DModelTag: 'Imported 3D Model',
    positionLabel: 'Position (Meters)',
    rotationLabel: 'Rotation (Degrees °)',
    scaleLabel: 'Size / Scale (Meters)',
    resetBtn: 'Reset',
    uniformScaleLock: 'Uniform',
    uniformScaleFree: 'Free XYZ',
    groupAction: 'Group All',
    ungroupAction: 'Ungroup',
    editGroupParts: 'Edit Single Part',
    editingSinglePart: 'Part Edit ON',
    saveToAssets: 'Save as Asset',
    savedToAssetsToast: 'Saved to your Custom Assets!',
    groupedToast: 'Grouped into a single unit',
    ungroupedToast: 'Group separated',

    subdivHeaderTitle: 'Box & Surface Subdivision',
    subdivHeaderDesc:
      'Divide a single block or surface into multiple smaller boxes or grid panels cleanly.',
    subdivCellsLabel: 'Sub-Boxes',
    subdivTrianglesLabel: 'Polygons',
    subdivVerticesLabel: 'Vertices',
    subdivQuickPresets: 'Quick Uniform Cuts',
    subdivResetOriginal: 'Reset Whole (1×1×1)',
    subdivPerAxisTitle: 'Divisions per Axis (X × Y × Z)',
    subdivAxisX: 'X Axis (Width)',
    subdivAxisY: 'Y Axis (Height)',
    subdivAxisZ: 'Z Axis (Depth)',
    subdivShowLinesTitle: 'Show Quad Partition Lines',
    subdivShowLinesDesc:
      'Clean grid cell borders on the surface with zero messy triangle diagonals',
    subdivGrooveLabel: 'Panel Seam / Tile Groove',
    subdivGrooveFlat: 'Flush',
    subdivSplitBlocksBtn: 'Split into Separate Editable Sub-Blocks',
    subdivSplitBlocksHint:
      'Converts these divisions into independent smaller 3D blocks so you can delete, move, extrude, or paint individual pieces.',
    subdivSplitToast: 'Split into editable sub-blocks!',
    subdivCapNotice:
      'Performance safety cap active to keep viewport smooth at 60 FPS.',

    paintClickBtn: 'Click-to-Paint',
    paintClickActive: 'Paint Mode: ON',
    eyedropperBtn: 'Eyedropper',
    eyedropperActive: 'Pick Object...',
    paintNoSelectionHint:
      'Select an object first or enable Click-to-Paint to color objects directly in the viewport.',
    saveSwatchBtn: 'Save',
    brightnessLabel: 'Brightness (Value)',
    autoHarmoniesTitle: 'Color Harmonies',
    savedPaletteTitle: 'Saved Swatches',
    archMaterialPresetsTitle: 'Architectural Materials',
    advancedPbrTitle: 'Surface & PBR Material',
    opacityGlassLabel: 'Opacity / Glass Transparency',
    roughnessLabel: 'Roughness (Glossy ↔ Matte)',
    metalnessLabel: 'Metalness',
    emissiveLampLabel: 'Emissive Light Glow',
    shadingStyleLabel: 'Surface Shading',
    shadingSmooth: 'Smooth',
    shadingFlat: 'Flat Facets',

    helpModalTitle: 'Perabot 3D Studio Complete Guide',
    helpCard1Title: '75 Basic Shapes & 3D Import',
    helpCard1Item1:
      'Tap any shape in Basic Shapes to spawn it, or press-and-hold (~0.4s) to inspect its architectural description.',
    helpCard1Item2:
      'Use Import 3D in the top bar to load one or multiple .glb, .gltf, .obj, .stl, .ply, or .fbx files right into the active domain.',
    helpCard2Title: 'True RGB Color & Box Subdivision',
    helpCard2Item1:
      'The RGB Color Wheel replaces actual surface colors directly—even on textured imported .glb models (e.g. painting a yellow cube white makes it pure white).',
    helpCard2Item2:
      'In the Subdivide tab, slice 1 box into smaller panels/boxes (X × Y × Z), and click "Split into Sub-Blocks" to edit, carve holes, or paint individual pieces.',
    helpCard3Title: 'Surface Alignment (Top Bar)',
    helpCard3Item1:
      'Enable Surface (T) in the top bar so objects automatically align flush against sloped roofs, walls, domes, and terrain.',
    helpCard3Item2:
      'Choose which face attaches (Bottom -Y, Back -Z for wall windows/doors, or Top +Y) or use 1-Tap Click Surface Target.',
    helpCard4Title: 'Architectural Grid & Smart Auto-Save',
    helpCard4Item1:
      'Features live meter rulers, selected object W × D × H floor footprints, room/plot boundary frames, and vertical wall height grids.',
    helpCard4Item2:
      'Smart Auto-Save quietly saves 5 seconds after real edits finish—never interrupting while you drag or orbit.',
    helpShortcutsTitle: 'Keyboard Shortcuts',
    helpShortcutsLine:
      'G Move • R Rotate • S Scale • T Surface • C RGB Color • F Focus • Shift+D Clone • Del Delete • Ctrl+Z/Y Undo/Redo',
    hudSurfaceAlign: 'SURFACE ALIGN',
    hudMove: 'MOVE',
    hudRotate: 'ROTATE',
    hudScale: 'SCALE',

    snapModularSocketTitle: 'Modular Building Sockets',
    snapModularSocketDesc:
      'Auto-connect wall ends, doors/windows into walls, stairs to slabs, and roofs onto walls',
    snapHeightTitle: 'Height Elevation Snap',
    snapHeightDesc:
      'Snap vertical Y movement to fixed elevation steps or building story levels',

    validationBtn: 'Validate',
    validPositionBadge: 'Valid Placement',
    warnCollisionWith: 'Warning: Overlapping with',
    warnOutOfPlot: 'Warning: Outside plot boundary',
    warnOutOfDomain: 'Warning: Outside workspace domain',
    warnSteepSlope: 'Warning: Slope too steep for flat building',
    warnWrongSurface: 'Warning: Surface does not match object rule',

    terrainSculptBtn: 'Sculpt Land',
    terrainSculptTitle: 'Terrain Sculpting Studio',
    sculptRaise: 'Raise',
    sculptLower: 'Lower',
    sculptFlatten: 'Flatten',
    sculptSmooth: 'Smooth',
    sculptTerrace: 'Terrace',
    sculptRadius: 'Brush Radius',
    sculptStrength: 'Strength',
    sculptTargetHeight: 'Target Y',
    sculptLevelPlotBtn: 'Level Plot Pad',
    sculptResetFlatBtn: 'Reset Flat',
    sculptHint: 'Paint directly across the 3D terrain to sculpt hills, pads, and slopes',

    surfAwareTitle: 'Surface-Aware Placement',
    surfAwareDesc:
      'Adapt posture & validate rules by surface kind (soil ground, slope, floor slab, wall, roof)',
    surfMaxSlopeLabel: 'Max Building Slope',
    surfRuleSection: 'Object Surface Rule',
    surfRuleAny: 'Any Surface',
    surfRuleBuilding: 'Building (Flat Pad Only)',
    surfRuleFoliage: 'Grass & Trees (Ground Only)',
    surfRuleRock: 'Rocks (Ground & Steep Slopes)',
    surfRuleInterior: 'Interior Prop (Floor Slab)',
    surfRuleOpening: 'Door & Window (Wall)',

    repeatArrayBtn: 'Repeat',
    repeatModalTitle: 'Duplicate & Repeat Array',
    repeatModeLinear: 'Linear Row',
    repeatModeGrid: '2D Grid',
    repeatModeRadial: 'Radial Ring',
    repeatCountLabel: 'Count',
    repeatCountZLabel: 'Rows Z',
    repeatDirectionLabel: 'Direction',
    repeatSpacingFlush: 'Flush Touching',
    repeatSpacingFixed: 'Fixed Step',
    repeatDistanceLabel: 'Step Spacing',
    repeatRadiusLabel: 'Ring Radius',
    repeatAngleLabel: 'Arc Angle',
    repeatFollowTerrain: 'Follow Ground / Terrain Height',
    repeatGroupResult: 'Group Generated Copies',
    repeatApplyBtn: 'Generate Array',
    repeatAppliedToast: 'Repeated array created!',

    selSingle: 'Single',
    selMultiTap: 'Multi-Select',
    selBoxDrag: 'Box Select',
    selSelectAll: 'All',
    selClear: 'Clear',
    selGroupSelected: 'Group Selected',
    multiSelectedCount: 'selected',
    boxSelectHint: 'Drag a marquee box on screen to select multiple objects at once',

    modularKitTab: 'Modular Build',
    modularKitHint: 'Compatible architectural modules (floors, walls, doors, windows, stairs & roofs)',
    modCatAll: 'All Modules',
    modCatFloors: 'Floors & Slabs',
    modCatWalls: 'Walls',
    modCatOpenings: 'Doors & Windows',
    modCatStairs: 'Stairs & Pillars',
    modCatRoofs: 'Roofs',
    modCatLandscape: 'Site & Fences',

    gridAdaptiveTitle: 'Adaptive Zoom & Scale Grid',
    gridAdaptiveDesc:
      'Automatically refines or coarsens grid density based on camera zoom & object scale',
    gridAdaptiveBadge: 'Auto',

    axisLockTitle: 'Axis Lock:',
    axisLockFree: 'Free XYZ',
    axisLockX: 'X Only',
    axisLockY: 'Y Only',
    axisLockZ: 'Z Only',
    axisLockXZ: 'XZ Plane',

    floorSystemTitle: 'Building Floors',
    floorAddBtn: '+ Floor',
    floorViewAll: 'All Floors',
    floorViewCutaway: 'Cut Above',
    floorViewGhost: 'Ghost Others',
    floorAssignLabel: 'Assigned Building Floor',
    floorMoveSelectionBtn: 'Move to Active Floor',

    archPhaseWalls: 'Plan & Walls',
    archPhaseOpenings: 'Doors & Stairs',
    archPhaseRoofs: 'Smart Roofs',
    archPhaseFinishing: 'Rooms & Paint',
    archPhaseEnv: 'Sun & Info',
    archView2DBtn: '2D Plan',
    archView3DBtn: '3D Studio',
    archToolSelect: 'Select / Blender',
    archToolDrawWall: 'Draw Wall',
    archToolMeasure: 'Measure',
    archDrawWallHint: 'Tap start point then tap end point to draw walls (Esc ends chain)',
    archPlaceOpeningHint: 'Hover & tap on any wall to cut an automatic door or window opening',
    archMeasureHint: 'Tap 2 points in the scene to measure exact meter clearance',

    archWallStyleFull: 'Full Wall',
    archWallStyleHalf: 'Half Wall',
    archWallStyleRailing: 'Balcony Railing',
    archWallHeightLabel: 'Wall Height',
    archWallThickLabel: 'Wall Thickness',
    archWallLenLabel: 'Template Width',
    archWallCurveLabel: 'Wall Curve Arc',
    archWallAngleSnap: '45°/90° Angle Lock',
    archWallBaseboard: 'Wall Baseboard Trim',
    archSpawnWallTemplateBtn: '+ Place Wall Template',
    archWallTemplateSub: 'Standard house wall (3.0m High × 3.0m Wide × 15cm Thick), customizable',
    archSelectedWallTitle: 'Selected Smart Wall',
    archBakeToMeshBtn: 'Convert to Free 3D Mesh (Blender)',
    archBakeSuccessToast: 'Converted to editable 3D mesh objects',

    archOpenDoorSingle: 'Single Door',
    archOpenDoorDouble: 'Double Door',
    archOpenWinStd: 'Room Window',
    archOpenWinWide: 'Wide Window',
    archOpenWinTall: 'Panoramic Glass',
    archOpenArchway: 'Archway Cutout',
    archOpenWidthLabel: 'Opening Width',
    archOpenHeightLabel: 'Opening Height',
    archOpenSillLabel: 'Sill Elevation',
    archOpenPosLabel: 'Position Along Wall',
    archOpenFlipSwing: 'Flip Swing Side',
    archStairSectionTitle: 'Stairs & Auto Floor Cutout',
    archStairStraightBtn: '+ Straight Stair',
    archStairLShapeBtn: '+ L-Stair',
    archStairAutoCutout: 'Auto Cut Upper Floor Slab',
    archStairPlacedToast: 'Staircase & upper stairwell cutout placed',

    archRoofAutoBtn: 'Auto-Generate Roof Over Plan',
    archRoofCustomBtn: '+ Add Custom Roof',
    archRoofGable: 'Gable',
    archRoofHip: 'Hipped',
    archRoofShed: 'Mono-Slope',
    archRoofFlat: 'Modern Flat',
    archRoofPitchLabel: 'Roof Pitch',
    archRoofOverhangLabel: 'Eave Overhang',
    archRoofRidgeAxisLabel: 'Ridge Direction',
    archRoofWidthLabel: 'Span X',
    archRoofDepthLabel: 'Span Z',
    archRoofAddedToast: 'Smart roof generated',

    archRoomsTitle: 'Auto-Detected Rooms',
    archNoRoomsHint: 'Connect walls into a closed loop to auto-detect rooms and calculate m² area.',
    archRoomAreaUnit: 'm²',
    archRoomFloorColor: 'Room Floor Color',
    archRoomAutoCeiling: 'Smart Ceiling (Shows in Walkthrough)',
    archDualWallTitle: 'Dual-Sided Wall Paint (Ext vs Int)',
    archWallExtColor: 'Exterior Face',
    archWallIntColor: 'Interior Face',
    archApplyAllWallsBtn: 'Apply to All Walls on This Floor',
    archRoomPresetLiving: 'Living Room',
    archRoomPresetBedroom: 'Bedroom',
    archRoomPresetKitchen: 'Kitchen',
    archRoomPresetBath: 'Bathroom',
    archRoomPresetStudy: 'Study Room',
    archRoomPresetTerrace: 'Terrace',

    archSunToggleTitle: 'Sun Time & Compass Simulator',
    archSunTimeLabel: 'Time of Day',
    archCompassNorthLabel: 'Compass North',
    archLensSectionTitle: 'Interior Camera Lens',
    archLensStd: 'Standard 46°',
    archLensWide: 'Wide 64°',
    archLensUltra: 'Interior 78°',
    archSummaryTitle: 'Building Metrics & Blueprint',
    archTotalAreaLabel: 'Total Room Area',
    archRoomCountLabel: 'Detected Rooms',
    archWallTotalLenLabel: 'Total Wall Length',
    archExportBlueprintBtn: 'Download 2D Blueprint (.PNG)',
    archBlueprintExportedToast: '2D Blueprint PNG downloaded',

    pointLightCardTitle: 'Real Light Source (Custom Lamp)',
    pointLightCardDesc: 'Enable so your custom-built lamp object illuminates nearby walls & rooms',
    pointLightIntensity: 'Light Intensity',
    pointLightRange: 'Light Reach (m)',

    patternSectionTitle: 'Surface Pattern (Keeps True RGB Color)',
    patternNone: 'Smooth',
    patternWood: 'Wood Grain',
    patternTile: 'Ceramic Tile',
    patternBrick: 'Brickwork',
    patternConcrete: 'Concrete',
    patternMarble: 'Marble Vein',
    patternFabric: 'Woven Fabric',
    patternRoofTile: 'Roof Tiles',
    patternScaleLabel: 'Pattern Density',

    modifierSectionTitle: 'Furniture Shape Modifiers (Blender)',
    modifierSectionDesc: 'Round cushion/table edges, taper legs & lampshades, or mirror parts symmetrically.',
    modifierBevelLabel: 'Smooth Bevel / Cushion',
    modifierTaperXLabel: 'Taper X Profile',
    modifierTaperZLabel: 'Taper Z Profile',
    modifierMirrorX: 'Mirror X Axis',
    modifierMirrorZ: 'Mirror Z Axis',
    modifierMirrorDist: 'Mirror Span (m)',
    modifierResetBtn: 'Reset Modifiers',
    modifierBakeTwinsBtn: 'Separate Mirrored Copies as Objects',

    assetCatAll: 'All',
    assetCatChair: 'Seating',
    assetCatTable: 'Tables',
    assetCatLamp: 'Lighting',
    assetCatCabinet: 'Storage',
    assetCatDecor: 'Decor',
    assetCatOther: 'Other',
    assetCategoryLabel: 'Asset Category',
    assetReEditBtn: 'Re-Edit',
    assetUpdateSavedBtn: 'Update Existing Asset',
    assetReEditLoadedToast: 'Asset placed on stage for re-editing',
    assetUpdatedToast: 'Saved custom asset updated',

    archExactLengthPlaceholder: 'Type m (e.g. 4.5)',
    archApplyLengthBtn: 'Place',
    archDoorToggleOpenBtn: 'Open / Close Door Leaf',
    archDoorStateOpen: 'Open',
    archDoorStateClosed: 'Closed',
    archWalkDoorHint: 'Tap any door ahead to swing it open or closed',
    archRoofAddWingBtn: '+ Add Roof Wing (L-Plan / Porch)',
    archRoofRotationLabel: 'Roof Rotation (°)',
    archRoofSkylightToggle: 'Glass Roof Skylight',
    archRoofSkylightSizeLabel: 'Skylight Span',
    archDragNodeHint: 'Drag blue corner nodes in the viewport to reshape connected walls & rooms live',

    photoStudioBtnTitle: 'HD Studio Photo',
    photoModalTitle: 'Studio Photo & Render Snapshot',
    photoModalDesc: 'Capture crisp high-resolution renders of your furniture or house with all helpers hidden.',
    photoRes1080p: 'HD Landscape (1920×1080)',
    photoRes2kSquare: '2K Catalog Square (2048×2048)',
    photoTransparentBg: 'Transparent Background (.PNG Alpha)',
    photoCaptureBtn: 'Capture & Download (.PNG)',
    photoCapturedToast: 'HD Studio Photo downloaded',

    modCatPillars: 'Pillars & Pergola',
    modCatFences: 'Fences & Gates',

    archToolDrawRoom: 'Room Box',
    archToolQuickErase: 'Quick Erase',
    archDrawRoomHint: 'Press & drag diagonally to create all 4 room walls in one stroke',
    archEraseHint: 'Tap any wall, door/window, stair, or roof to erase immediately',
    archChainModeToggle: 'Chain Mode',
    archSafeConfirmToggle: 'Confirm Placement',
    archConfirmPlaceBtn: 'Place',
    archCancelPlaceBtn: 'Cancel',
    archSoftAngleGuideLabel: 'Soft Magnetic Ortho Guide (0°/45°/90°)',
    archCopyLowerWallsBtn: 'Copy Lower Floor Walls',
    archCopiedLowerWallsToast: 'Lower floor walls copied to this level',
    archQuickRotate90: 'Rotate 90°',

    alignDistributeTitle: 'Align & Distribute',
    alignLeftX: 'Align Left (X-)',
    alignCenterX: 'Center X',
    alignRightX: 'Align Right (X+)',
    alignBottomY: 'Align Base (Y-)',
    alignTopY: 'Align Top (Y+)',
    alignFrontZ: 'Align Front (Z+)',
    alignCenterZ: 'Center Z',
    alignBackZ: 'Align Back (Z-)',
    distributeEvenX: 'Distribute X',
    distributeEvenZ: 'Distribute Z',
    alignedToast: 'Selected objects aligned',

    lockObjectTip: 'Lock object from accidental edits',
    unlockObjectTip: 'Unlock object',
    exactDimTitle: 'True Size (Meters W×H×D)',
    exactDimProportional: 'Lock Ratio',

    exportAssetsPackBtn: 'Export Pack',
    importAssetsPackBtn: 'Import Pack',
    assetsPackExportedToast: 'Custom asset pack exported',
    assetsPackImportedToast: 'Custom asset pack imported',

    archWorkflowBtn: 'Project Studio',
    archWorkflowTitle: 'Integrated Architectural Workflow',
    archWorkflowUpdating: 'Updating analysis...',
    wfTabBrief: 'Brief',
    wfTabSite: 'Site',
    wfTabMaterials: 'Takeoff & Cost',
    wfTabValidation: 'Validation',
    wfTabVersions: 'Versions',
    wfTabDocs: 'Docs',

    briefTemplateLabel: 'Editable Starter Brief Template',
    briefTplSingleStorey: 'Small Single-Storey Home',
    briefTplTwoStorey: 'Two-Storey Family Home',
    briefTplMinimalist: 'Modern Minimalist Home',
    briefTplGarage: 'Home with Garage',
    briefTplBlank: 'Blank Custom Brief',
    briefProjectTypeLabel: 'Project Type',
    briefStyleLabel: 'Preferred Style',
    briefDescLabel: 'Short Description',
    briefNotesLabel: 'Freeform Planning Notes',
    briefBudgetTitle: 'Optional Target Budget',
    briefBudgetScopeMaterials: 'Materials Only',
    briefBudgetScopeConstruction: 'Full Construction',
    briefBudgetScopeCustom: 'Custom Scope',
    briefAddRequirementBtn: '+ Add Room / Area Requirement',
    briefStatusMet: 'Met',
    briefStatusUnmet: 'Unmet',
    briefStatusReview: 'Needs Review',
    briefStatusNA: 'Info',
    briefRoomTypeLabel: 'Room Function',
    briefUnassignedRoomsTitle: 'Uncategorized Rooms (Assign Function)',
    briefFocusBtn: 'Focus',

    constMatSectionTitle: 'Construction Material (Separate from Visual Color)',
    constMatSeparatedHint:
      'Changing visual paint colors or surface patterns NEVER alters construction material assignments or cost.',
    constMatStructLabel: 'Core Wall Structure',
    constMatExtFinishLabel: 'Exterior Finish',
    constMatIntFinishLabel: 'Interior Finish',
    constMatFloorLabel: 'Floor Construction Material',
    constMatRoofLabel: 'Roof Construction Material',
    constMatOpeningLabel: 'Opening Unit Material',
    constMatStairLabel: 'Stair Structure Material',
    constMatObjectLabel: 'Block Construction Material',
    constMatUnassignedOption: '— Unassigned —',
    constMatAutoAssignBtn: 'Fill Defaults on Unassigned',
    constMatAutoAssignedToast: 'Assigned baseline construction materials to unassigned elements',
    takeoffTotalEstLabel: 'Estimated Material Cost',
    takeoffMaterialOnlyBadge: 'Material-Only Estimate Scope',
    takeoffScopeMismatchWarn:
      'Scope Notice: Your target budget uses Full Construction/Custom scope, whereas this takeoff estimates Building Materials only (excluding contractor labor, MEP, permits, & taxes).',
    takeoffMissingAssignTitle: 'Elements Missing Construction Material',
    takeoffUnpricedTitle: 'Unpriced Material Items',
    takeoffEditCatalogTitle: 'Editable Material Catalog & Unit Prices',
    takeoffAddCustomMatBtn: '+ Custom Material',
    takeoffUnitPriceLabel: 'Unit Price (IDR)',
    takeoffWastePctLabel: 'Waste (%)',
    takeoffByFloorTitle: 'Breakdown by Floor',

    altSaveNewBtn: '+ Save Design Alternative',
    altNamePlaceholder: 'Option name (e.g. Option A - Gable Roof)',
    altDescPlaceholder: 'Notes on what changed in this option...',
    altEmptyHint:
      'Save independent snapshots of geometry, materials, brief, and site to inspect or compare design options side by side.',
    altInspectBtn: 'Inspect',
    altInspectingBanner: 'Read-Only Inspection (Active Working Model Unchanged)',
    altCloseInspectBtn: 'Exit Inspect',
    altRestoreBtn: 'Restore to Active',
    altRestoreConfirmMsg:
      'Restore this alternative into the active working project? (You can still press Undo / Ctrl+Z to revert).',
    altRestoredToast: 'Design alternative restored into active project',
    altDuplicateProjectBtn: 'Duplicate Option',
    altCompareTitle: 'Side-by-Side Comparison',
    altActiveWorkingLabel: 'Active Working Model (Live)',

    valAllCategories: 'All',
    valCatGeometry: 'Geometry',
    valCatOpening: 'Openings & Walls',
    valCatSpatial: 'Spatial Usability',
    valCatBrief: 'Brief Targets',
    valCatSite: 'Site & Setbacks',
    valSevError: 'Error',
    valSevWarning: 'Warning',
    valSevInfo: 'Info',
    valHealthyMsg: 'No geometry conflicts or spatial planning warnings detected.',
    valAutoFixBtn: 'Auto-Clamp',
    valAutoFixedToast: 'Applied safe automatic adjustment',
    valRerunBtn: 'Re-Validate',

    siteEnableToggle: 'Enable Site Boundary & Setback Lines',
    siteDimensionsLabel: 'Site Plot Dimensions (Width X × Depth Z)',
    siteSetbacksTitle: 'User-Defined Setbacks (Meters)',
    siteSetbackDisclaimer:
      'Setback distances are user-defined planning guides and do not claim municipal zoning or legal code compliance.',
    siteFrontLabel: 'Front (+Z)',
    siteRearLabel: 'Rear (-Z)',
    siteLeftLabel: 'Left (-X)',
    siteRightLabel: 'Right (+X)',
    siteEntranceLabel: 'Primary Site Entrance Edge',
    siteNudgeBuildingTitle: 'Shift & Rotate Building on Site',
    siteRotate90Btn: 'Rotate Building 90°',
    siteCenterOnPlotBtn: 'Center on Plot',
    siteOutdoorZonesTitle: 'Outdoor Site Zones',
    siteAddZoneBtn: '+ Add Outdoor Zone',
    siteAreaSummaryLabel: 'Site Area',
    siteFootprintLabel: 'Building Footprint',
    siteOpenAreaLabel: 'Remaining Open Area',

    docSourceLabel: 'Document Source',
    docKindFloorPlan: '2D Floor Plan',
    docKindSitePlan: 'Site Plan',
    docKindElevation: 'Building Elevations (4 Sides)',
    docKindSchedule: 'Door & Window Schedule',
    docKindMaterialReport: 'Material Takeoff & Cost Report',
    docKindValidationReport: 'Validation Summary',
    docThemeDark: 'Dark Blueprint',
    docThemeWhite: 'Architect White',
    docExportPngBtn: 'Download .PNG Sheet',
    docExportHtmlBtn: 'Download Printable Report Package (.HTML/PDF)',
    docSectionLimitationNote:
      'Technical Note: Floor plans, site plans, 4-side orthographic elevations, and true cut-plane sections A–A\' / B–B\' are generated directly from live model geometry.',

    outlinerSearchPlaceholder: 'Search objects or groups...',
    outlinerFolderBadge: 'Group',
    saveWholeScenePrefabBtn: 'Save Canvas Assembly to Catalog',
    prefabDimsBadgeLabel: 'Size',
    exportObjLabel: 'Export 3D Model (.OBJ)',
    exportSelectedGlbLabel: 'Export Selection Only (.GLB)',
    exportSelectedObjLabel: 'Export Selection Only (.OBJ)',
    worldScaleTexLabel: 'Real-Meter Texture Scale (Non-Stretched)',
    patternRotateLabel: 'Grain / Pattern Rotation',
    csgCardTitle: '3D Boolean Operations (Cut / Union / Intersect)',
    csgCardHint:
      'Select 2+ objects (1st = Target, 2nd+ = Cutter) to carve sinks, shelves, hollow planters, or wall niches.',
    csgSubtractBtn: 'Subtract (A - B)',
    csgUnionBtn: 'Union (A + B)',
    csgIntersectBtn: 'Intersect (A ∩ B)',
    csgResetBtn: 'Restore Pre-Boolean Shape',
    csgAppliedToast: '3D Boolean operation applied cleanly',
    profileStudioBtn: '2D-to-3D Profile Studio (Lathe / Extrude)',
    profileStudioTitle: 'Custom 2D-to-3D Profile Studio',
    profileStudioDesc:
      'Drag 2D curve control points to revolve 360° turned legs, hollow vases, lamp shades, or extruded moldings.',
    profileModeLathe: '360° Revolve (Lathe)',
    profileModeExtrude: 'Linear Extrude',
    profileSmoothLabel: 'Smooth Spline Curve',
    profileHollowLabel: 'Hollow Wall Thickness',
    profileSegmentsLabel: 'Radial Segments',
    profileDepthLabel: 'Extrude Depth',
    profileTemplateLabel: 'Starter Curve',
    profileAddPointHint: 'Tap empty grid to add point · Drag blue nodes · Double-tap node to delete',
    profileApplyBtn: 'Build / Update 3D Shape',
    lightTypePoint: '360° Point Bulb',
    lightTypeSpot: 'Downlight / Spotlight',
    lightConeAngleLabel: 'Beam Cone Angle',
    lightKelvinLabel: 'Kelvin Color Temp',
    lightAutoNightLabel: 'Auto-Switch ON at Sunset / Night Only',
    walkLookPadLabel: 'Drag to Look Around',
    walkGhostModeLabel: 'No-Clip Walls',
    walkEyeStanding: 'Standing (1.65m)',
    walkEyeSeated: 'Seated (1.10m)',
    walkInteractOpenDoor: 'Open Door',
    walkInteractCloseDoor: 'Close Door',
    walkInteractToggleLight: 'Toggle Lamp',
    roomVoidToggleLabel: 'Double-Height Void / Open Mezzanine',
    roomVoidHint:
      'Opens this upper-floor slab and the ceiling below for double-height living rooms or mezzanines.',
    siteShapeLabel: 'Parcel Lot Shape',
    siteShapeRect: 'Rectangular',
    siteShapeTrapezoid: 'Trapezoid',
    siteShapeHook: 'Corner Chamfer (Hook)',
    siteShapeLLot: 'L-Shaped Lot',
    docKindSection: 'Building Section (A–A\' / B–B\')',
    docSectionAxisAA: 'Cross Section A–A\' (X Axis)',
    docSectionAxisBB: 'Longitudinal Section B–B\' (Z Axis)',
    docSectionOffsetLabel: 'Cut Plane Position (m)',
    shadingModeTitle: 'Viewport Visual Style',
    shadingModeShaded: 'Realistic PBR',
    shadingModeClay: 'White Clay Maquette',
    shadingModeTech: 'Technical Line',
    sectionCut3dTitle: 'Live 3D Section Cut',
    sectionCutEnable: 'Enable 3D Cut Plane',
    sectionCutFlip: 'Flip Cut Side',
    measure3dToolLabel: '3D Tape Measure',
    measure3dHint: 'Tap Point A then Point B on any object or room (auto-snaps to nearest vertex)',
    quickDimEditTitle: 'Exact Meter Size (W × H × D)',
    quickDimApplyBtn: 'Apply',
    photoRes4kLabel: '4K Ultra HD (3840 × 2160)',
    photoTwoPointLabel: 'Architectural 2-Point Perspective (Plumb Vertical Lines)',
    touchLoupeSettingLabel: 'Touch Precision Magnifier Loupe While Dragging',

    wallEditAngleLockLabel: 'Wall Angle Lock (0°/45°/90°)',
    wallEditAngleLockedBadge: 'Angle Lock: ON',
    wallEditAngleFreeBadge: 'Angle Lock: Free',
    archDrawModeBtn: 'Place Mode',
    archPanZoomModeBtn: 'Pan & Zoom View',
    archTwoFingerHint: '2 fingers to zoom & pan anytime',
    zoomIn2DBtn: 'Zoom In Plan (+)',
    zoomOut2DBtn: 'Zoom Out Plan (-)',
    zoomReset2DBtn: 'Reset Plan Zoom',
    archOutlinerFolder: 'Building Structure',
    archSelectedOpeningTitle: 'Door / Window',
    archSelectedStairTitle: 'Building Stair',
    archSelectedRoofTitle: 'Building Roof',
    archSelectedRoomTitle: 'Floor Room',
    archBakeWallHint:
      'Convert this smart wall into a freeform 3D mesh block to apply panel Subdivision or CSG Boolean cuts.',
    photoRenderedResBadge: 'Output Size',

    archDrawModeCompact: 'Place',
    archPanModeCompact: 'Pan View',
    archEndpointSnappedBadge: 'Corner Locked',
    wallInnerFaceLabel: 'Inner Wall',
    wallOuterFaceLabel: 'Outer Wall',
    angleLockHudOn: 'Angle Lock ON',
    angleLockHudFree: 'Free Angle',
    freeRotateHud: 'Free Rotation',
    gridScaleHud: 'Grid Scale',
    roomVoidLabel: 'Void Mezzanine (Open Floor)',
  },

  ja: {
    heroBadge: '3D建築＆インテリア制作スタジオ',
    heroTitle: '部屋づくりも3Dモデリングも、直感操作で',
    heroSubtitle:
      '75種類の精密シェイプでの家具・建築づくりも、外部3Dモデルの読み込み配置もブラウザ＆タッチ画面で快適に。',
    continueLast: '前回の続きから',
    lastEdited: '最終更新',
    modeModelingTitle: 'モデリング',
    modeModelingDesc:
      '空のキャンバスからスタート。75種類の基本シェイプを組み合わせてオリジナルの家具や小物を制作します。',
    modeModelingBtn: '+ 新規作成',
    modeHouseTitle: 'ハウス作成',
    modeHouseDesc:
      '広々とした建築ドメインで、基本シェイプ・マイアセット・3D読込(.glb等)・室内表示・ウォークスルーを使って家を設計します。',
    modeHouseBtn: '+ 家をつくる',
    openProjectFile: 'ファイルを開く (.perabot)',
    globalSettings: '設定',
    tabMyProjects: 'マイプロジェクト',
    tabMyAssets: 'マイアセット',
    emptyProjectsTitle: '保存されたプロジェクトはありません',
    emptyProjectsDesc:
      '上の「モデリング」または「ハウス作成」から始めると、変更時に自動でスマート保存されます。',
    emptyAssetsTitle: '登録アセットはまだありません',
    emptyAssetsDesc:
      '家具やパーツを作って「アセット登録」すると、他のプロジェクトでもいつでも呼び出せます！',
    objectsUnit: '個',
    partsUnit: 'パーツ',
    rename: '名前変更',
    duplicate: '複製',
    exportBackup: '.perabot保存',
    delete: '削除',
    cancel: 'キャンセル',
    stageDragHint: 'ドラッグで3Dステージを回転',
    moodMorning: '朝',
    moodSunset: '夕方',
    moodNight: '夜',

    settingsTitle: 'スタジオ設定',
    settingsSubtitle: '表示言語・カラーテーマ・カメラ操作をお好みに調整',
    langSection: '表示言語',
    themeSection: 'カラーテーマ',
    graphicsSection: 'グラフィック・動作優先度',
    gfxLight: '軽量',
    gfxLightDesc: '省電力・スマホでも軽快に動作',
    gfxBalanced: 'バランス',
    gfxBalancedDesc: '自然な影と滑らかな60FPS描画',
    gfxUltra: '高画質',
    gfxUltraDesc: '高精細HiDPI描画＆シャープな影',
    controlsSection: 'カメラ＆UIサイズ',
    orbitSpeed: 'カメラ回転スピード',
    uiDensity: 'ボタン・UIサイズ',
    densityComfort: '標準',
    densityCompact: 'コンパクト',
    done: '完了',

    backHome: 'ホーム',
    untitledProject: '新規モデリング',
    untitledHouse: 'マイホーム設計',
    savedAuto: '保存済み',
    unsavedChanges: '未保存の変更（クリックで今すぐ保存）',
    savingNow: '保存中...',
    undo: '元に戻す (Ctrl+Z)',
    redo: 'やり直す (Ctrl+Y)',
    snap: 'スナップ',
    surface: '面吸着',
    grid: 'グリッド',
    focusBtn: 'フォーカス',
    cameraViewsBtn: '視点',
    peekInterior: '室内表示',
    walkthrough: 'ウォークスルー',
    exitWalkthrough: '通常視点に戻る',
    walkHint:
      '左スティックで移動・画面ドラッグで見回す（PCはWASDキー対応）',
    import3DBtn: '3D読込',
    import3DHint:
      '1つまたは複数の3Dファイル (.glb, .gltf, .obj, .stl, .ply, .fbx) をドメインに配置',
    importing3DToast: '3Dファイルを読み込み中...',
    import3DFailedToast:
      '読み込み失敗（.glb, .gltf, .obj, .stl, .ply, .fbx に対応）',
    restoreOriginalMaterial: '元のテクスチャ・マテリアルに戻す',
    exportBtn: '書き出し',
    clearScene: '全消去',
    clearSceneConfirm: 'キャンバス上の全オブジェクトを消去しますか？',
    fullscreen: '全画面表示',
    toggleRightPanel: '右パネルを開閉',
    help: 'ガイド',

    snapSystemTitle: 'スマートスナップ設定',
    activeState: 'ON',
    inactiveState: 'OFF',
    snapMagnetTitle: 'ブロック＆角マグネット',
    snapMagnetDesc: '近づけたブロックの面・辺・角をピタッと吸着させます',
    strengthSubtle: '弱め',
    strengthNormal: '標準',
    strengthStrong: '強め',
    snapAlignTitle: '整列レーザーガイド',
    snapAlignDesc: '離れたオブジェクトとの中心・端の揃いをライン表示',
    snapGridTitle: 'グリッドスナップ',
    snapGridDesc: '移動・サイズ変更の単位をグリッド幅に固定します',

    surfaceSystemTitle: '面吸着（サーフェス整列）＆地形',
    surfaceOrientSection: '面の向きモード',
    surfModeNormalTitle: '面の傾きに合わせる（法線整列）',
    surfModeNormalDesc: '斜めの屋根・壁・ドーム・斜面にピタッと沿わせます',
    surfModeUprightTitle: '垂直を保って高さ追従',
    surfModeUprightDesc: 'まっすぐ立ったまま地面や床の高さに合わせます',
    surfModeFoundationTitle: '斜面への基礎接地（浮き防止）',
    surfModeFoundationDesc: '傾斜地で建物の底が浮かないよう最も低い角を接地',
    surfAttachFaceSection: '接地させる面',
    surfAttachAuto: '自動判定',
    surfAttachBottom: '底面 (-Y)',
    surfAttachBack: '背面 (-Z)',
    surfAttachTop: '上面 (+Y)',
    surfAutoMoveTitle: 'ドラッグ中に自動追従',
    surfAutoMoveDesc: '移動ハンドル操作中に下の面に沿ってスライドします',
    surfClickPlaceTitle: 'クリック先へ1タップ配置',
    surfClickPlaceDesc: '屋根や壁をタップすると選択中オブジェクトをそこへ配置',
    surfSpinLabel: '面上の回転角度',
    surfOffsetLabel: '面からのオフセット距離',
    surfConformNowCta: '選択オブジェクトを今すぐ下の面へ接地',

    gridSystemTitle: 'スタジオグリッド＆建築メジャー',
    visibleState: '表示',
    hiddenState: '非表示',
    gridCellSizeSection: 'マス目の間隔（精度）',
    gridSyncSnapBtn: 'スナップ連動',
    gridSmartGuidesSection: '寸法ルーラー＆敷地ガイド',
    gridRulerTitle: 'メートル目盛り表示 (X / Z)',
    gridRulerDesc: '1m・2m・5mの距離ラベルを床面に見やすく表示',
    gridFootprintTitle: '選択オブジェクトの床面寸法ガイド',
    gridFootprintDesc: '選択中の真下に投影枠と 幅×奥行×高さ(m) をリアルタイム表示',
    gridVertSection: '壁面・高さグリッド（垂直）',
    gridVertOff: 'なし',
    gridVertBack: '背面ウォール',
    gridVertCorner: '3Dコーナー枠',
    gridPlotTitle: '敷地・部屋サイズ枠ガイド',
    gridPlotDesc: '部屋や敷地の目安枠を表示（例：4×4mの部屋、8×12mの敷地）',
    gridPlotPresetsLabel: '敷地・部屋サイズプリセット',
    gridPlotWidth: '幅 X (m)',
    gridPlotDepth: '奥行 Z (m)',
    gridStyleSection: 'フロア表示スタイル',
    gridStyleWire: 'スタジオ線',
    gridStyleWireSub: 'シンプル＆軽量',
    gridStyleTile: 'タイル床',
    gridStyleTileSub: '建築フロア調',
    gridStyleBlueprint: '設計図ブルー',
    gridStyleBlueprintSub: 'CAD図面風',
    gridStyleTerrain: '3D地形',
    gridStyleTerrainSub: '丘・段々地形',
    terrainShapeSection: '3D地形の形状',
    terrainHills: '丘陵',
    terrainValley: '盆地',
    terrainTerraced: '段々畑・雛壇',
    terrainFlat: '平坦',
    terrainHeightLabel: '起伏の高さ',
    gridWorldSizeLabel: 'キャンバスの広さ',
    gridElevationLabel: '作業フロアの高さ',
    gridFitObjectBaseBtn: '選択物の底面に合わせる',
    gridAxesOn: 'X/Z軸 ON',
    gridAxesOff: 'X/Z軸 OFF',
    gridOpacityLabel: 'ラインの濃さ',

    quickCameraHeader: 'クイック視点切替',
    camPerspective: '3Dパース視点',
    camFront: '正面図 (Z)',
    camSide: '側面図 (X)',
    camTop: '上面図 (Y)',
    exportFormatHeader: '3D書き出し形式',
    exportGlbTitle: '.GLB 書き出し',
    exportGlbSub: '単一バイナリ（Blender・Unity・Godot向け）',
    exportGltfTitle: '.GLTF 書き出し',
    exportGltfSub: '標準 glTF 2.0 JSON形式',

    select: '選択',
    move: '移動',
    rotate: '回転',
    scale: 'サイズ',
    paint: 'カラー',
    worldAxis: 'ワールド',
    localAxis: 'ローカル',
    stickSurface: '接地',
    copy: '複製',
    showLeftToolbar: '左ツールバーを表示',
    hideLeftToolbar: '左ツールバーを隠す',
    rotAxisHorizontal: '水平回転 (Y)',
    rotAxisFront: '前後傾き (X)',
    rotAxisSide: '左右傾き (Z)',
    rotSnapLabel: '角度固定:',
    rotSnapFree: '自由',
    rotResetZero: '水平0°に戻す',

    basicShapes: '基本シェイプ',
    housePresets: 'ハウス素材',
    shapesHint: 'タップで配置・長押しでパーツ解説',
    presetsHint: 'タップで配置・長押しで詳細',
    searchShapes: 'シェイプを検索 (cube, 階段, アーチ, 窓)...',
    searchPresets: 'アセットを検索...',
    noShapeMatch: '一致するシェイプが見つかりません',
    lastUsed: '履歴',
    properties: 'プロパティ',
    catAll: 'すべて',
    catCustom: 'マイアセット',

    objectList: 'オブジェクト一覧',
    objectStudio: '編集スタジオ',
    emptyOutlinerHint:
      'まだオブジェクトがありません。下の「基本シェイプ」または上の「3D読込」から配置しましょう。',
    emptyInspectorHint:
      'キャンバス上の3Dオブジェクトをタップすると、位置・色・面分割を編集できます。',
    hideObject: '非表示にする',
    showObject: '表示する',
    tabTransform: '変形',
    tabColor: 'RGBカラー',
    tabSubdiv: '面・箱分割',
    objectNamePlaceholder: 'オブジェクト名...',
    imported3DModelTag: '読み込み3Dモデル',
    positionLabel: '位置 (m)',
    rotationLabel: '回転角度 (°)',
    scaleLabel: 'サイズ・スケール (m)',
    resetBtn: 'リセット',
    uniformScaleLock: '比率固定',
    uniformScaleFree: 'XYZ個別',
    groupAction: 'グループ化',
    ungroupAction: 'グループ解除',
    editGroupParts: 'パーツ個別編集',
    editingSinglePart: '個別編集中',
    saveToAssets: 'アセット登録',
    savedToAssetsToast: 'マイアセットに保存しました！',
    groupedToast: 'グループにまとめました',
    ungroupedToast: 'グループを解除しました',

    subdivHeaderTitle: 'ボックス＆サーフェス分割 (Subdivide)',
    subdivHeaderDesc:
      '1つの箱や面を複数の小さな四角・グリッド面へきれいに分割します。',
    subdivCellsLabel: '分割セル数',
    subdivTrianglesLabel: 'ポリゴン数',
    subdivVerticesLabel: '頂点数',
    subdivQuickPresets: '均等クイック分割',
    subdivResetOriginal: '分割なしに戻す (1×1×1)',
    subdivPerAxisTitle: '軸ごとの分割数 (X × Y × Z)',
    subdivAxisX: 'X軸（横幅）',
    subdivAxisY: 'Y軸（高さ）',
    subdivAxisZ: 'Z軸（奥行）',
    subdivShowLinesTitle: '四角グリッド分割線を表示',
    subdivShowLinesDesc:
      '斜め線のないスッキリした四角形の分割ラインを表面に表示します',
    subdivGrooveLabel: 'パネル溝・タイル目地の深さ',
    subdivGrooveFlat: 'フラット',
    subdivSplitBlocksBtn: '個別の小ブロックに分離する（個別編集）',
    subdivSplitBlocksHint:
      '分割マスごとに独立した小ブロックへ変換し、1マスだけ削除して窓を空けたり、押し出し・個別色塗りが可能になります。',
    subdivSplitToast: '個別の小ブロックに分離しました！',
    subdivCapNotice:
      '60FPSの快適動作を保つため安全上限が適用されています。',

    paintClickBtn: 'タップ塗り',
    paintClickActive: 'タップ塗り: ON',
    eyedropperBtn: 'スポイト',
    eyedropperActive: '対象をタップ...',
    paintNoSelectionHint:
      'オブジェクトを選択するか、「タップ塗り」をONにして直接色をつけられます。',
    saveSwatchBtn: '保存',
    brightnessLabel: '明るさ (明度)',
    autoHarmoniesTitle: '自動カラーハーモニー',
    savedPaletteTitle: '保存済みパレット',
    archMaterialPresetsTitle: '建築マテリアルプリセット',
    advancedPbrTitle: '質感・PBR詳細設定',
    opacityGlassLabel: '不透明度（ガラス表現）',
    roughnessLabel: '粗さ（光沢 ↔ マット）',
    metalnessLabel: '金属感 (Metalness)',
    emissiveLampLabel: '発光（ライト表現）',
    shadingStyleLabel: 'シェーディング表示',
    shadingSmooth: 'スムーズ',
    shadingFlat: 'フラット',

    helpModalTitle: 'Perabot 3D Studio 使い方ガイド',
    helpCard1Title: '75種類の基本シェイプ＆3D読み込み',
    helpCard1Item1:
      '「基本シェイプ」をタップして配置、長押し（約0.4秒）で詳しい用途カードを表示できます。',
    helpCard1Item2:
      '上部バーの「3D読込」から .glb / .gltf / .obj / .stl / .ply / .fbx ファイルを複数まとめてドメイン内に配置できます。',
    helpCard2Title: 'ダイレクトRGB色変更＆ボックス分割',
    helpCard2Item1:
      'RGBカラーホイールはテクスチャ付き読込モデルでも実際の表面色をダイレクトに置き換えます（黄色い箱を白にすると純白になります）。',
    helpCard2Item2:
      '「面・箱分割」タブでは1つの箱を細かいマス目（X×Y×Z）に割り、「個別の小ブロックに分離」で1マスずつの穴あけや色塗りができます。',
    helpCard3Title: '面吸着（サーフェス整列）機能',
    helpCard3Item1:
      '上部バーの「面吸着 (T)」をONにすると、斜めの屋根・壁・ドーム・地形の角度に合わせてピタッと配置できます。',
    helpCard3Item2:
      '接地させる面（底面 -Y、壁用の背面 -Z、上面 +Y）の切替や、1タップ配置モードも搭載しています。',
    helpCard4Title: '建築グリッド＆スマート自動保存',
    helpCard4Item1:
      'メートル目盛り、選択オブジェクトの床面サイズ投影、部屋・敷地枠ガイド、壁の高さグリッドを備えています。',
    helpCard4Item2:
      'スマート自動保存：操作中は邪魔せず、変更後5秒間落ち着いたタイミングで静かに保存します。',
    helpShortcutsTitle: 'キーボードショートカット',
    helpShortcutsLine:
      'G 移動 • R 回転 • S サイズ • T 面吸着 • C カラー • F フォーカス • Shift+D 複製 • Del 削除 • Ctrl+Z/Y 戻す/進む',
    hudSurfaceAlign: '面吸着移動',
    hudMove: '移動',
    hudRotate: '回転',
    hudScale: 'サイズ',

    snapModularSocketTitle: '建築モジュール接続スナップ',
    snapModularSocketDesc:
      '壁同士の端・ドアや窓と壁・階段と床・屋根と壁上端を自動でピタッと接続します',
    snapHeightTitle: '高さスナップ (Height Snap)',
    snapHeightDesc:
      '垂直(Y)の移動を指定した高さ間隔や階層フロア高さにスナップします',

    validationBtn: '配置判定',
    validPositionBadge: '配置OK（有効）',
    warnCollisionWith: '警告：干渉しています →',
    warnOutOfPlot: '警告：敷地ガイド枠の外側です',
    warnOutOfDomain: '警告：キャンバス範囲外です',
    warnSteepSlope: '警告：傾斜が急すぎるため建物配置に不向きです',
    warnWrongSurface: '警告：配置先の面の種類がルールと異なります',

    terrainSculptBtn: '地形編集',
    terrainSculptTitle: '地形スカルプト（土地の造成・起伏編集）',
    sculptRaise: '盛り上げ',
    sculptLower: '掘り下げ',
    sculptFlatten: '平坦化',
    sculptSmooth: 'ならす',
    sculptTerrace: '段々造成',
    sculptRadius: 'ブラシ半径',
    sculptStrength: '強さ',
    sculptTargetHeight: '基準高さ',
    sculptLevelPlotBtn: '敷地内を平坦に整地',
    sculptResetFlatBtn: '平坦にリセット',
    sculptHint: '3Dの地面をなぞって丘・池・建築用の平地を自由に造成できます',

    surfAwareTitle: 'サーフェス認識配置 (Surface-Aware)',
    surfAwareDesc:
      '地面・斜面・床・壁・屋根を判別し、草木・岩・建物の向きと適性を自動調整',
    surfMaxSlopeLabel: '建物の許容傾斜角',
    surfRuleSection: 'このオブジェクトの配置面ルール',
    surfRuleAny: '自由（すべての面）',
    surfRuleBuilding: '建物・基礎（平地のみ）',
    surfRuleFoliage: '草木・植栽（地面のみ）',
    surfRuleRock: '庭石・岩（地面・急斜面OK）',
    surfRuleInterior: '室内家具（床スラブ上）',
    surfRuleOpening: 'ドア・窓（壁面用）',

    repeatArrayBtn: '連続配置',
    repeatModalTitle: '複製＆連続配列（アレイ配置）',
    repeatModeLinear: '直線配列',
    repeatModeGrid: '2Dグリッド',
    repeatModeRadial: '円形配列',
    repeatCountLabel: '個数',
    repeatCountZLabel: 'Z列数',
    repeatDirectionLabel: '方向',
    repeatSpacingFlush: '隙間なく連結',
    repeatSpacingFixed: '等間隔',
    repeatDistanceLabel: '間隔 (m)',
    repeatRadiusLabel: '半径 (m)',
    repeatAngleLabel: '配置角度',
    repeatFollowTerrain: '地面・地形の高さに追従',
    repeatGroupResult: '結果をグループ化',
    repeatApplyBtn: '連続配置を実行',
    repeatAppliedToast: '連続配置を作成しました！',

    selSingle: '単一選択',
    selMultiTap: '複数選択',
    selBoxDrag: '枠ドラッグ選択',
    selSelectAll: '全選択',
    selClear: '解除',
    selGroupSelected: '選択をグループ化',
    multiSelectedCount: '個を選択中',
    boxSelectHint: '画面をドラッグして範囲内の複数オブジェクトを一括選択します',

    modularKitTab: '建築モジュール',
    modularKitHint: '規格が揃った床・壁・ドア・窓・階段・屋根パーツで素早く家を組み立て',
    modCatAll: 'すべて',
    modCatFloors: '床・基礎',
    modCatWalls: '壁パネル',
    modCatOpenings: 'ドア・窓壁',
    modCatStairs: '階段・柱',
    modCatRoofs: '屋根',
    modCatLandscape: '外構・柵・植栽',

    gridAdaptiveTitle: 'アダプティブ自動グリッド（ズーム連動）',
    gridAdaptiveDesc:
      'カメラのズーム距離やオブジェクト規模に応じてマス目密度を自動最適化',
    gridAdaptiveBadge: '自動',

    axisLockTitle: '軸ロック:',
    axisLockFree: '自由 XYZ',
    axisLockX: 'X軸のみ',
    axisLockY: 'Y軸のみ',
    axisLockZ: 'Z軸のみ',
    axisLockXZ: '水平 XZ',

    floorSystemTitle: '階層・フロア管理',
    floorAddBtn: '+ 階層追加',
    floorViewAll: '全フロア表示',
    floorViewCutaway: '上階カット',
    floorViewGhost: '他階を半透明',
    floorAssignLabel: '所属フロア階層',
    floorMoveSelectionBtn: '現在の階層へ移動',

    archPhaseWalls: '間取り・壁',
    archPhaseOpenings: 'ドア・階段',
    archPhaseRoofs: 'スマート屋根',
    archPhaseFinishing: '部屋・塗装',
    archPhaseEnv: '太陽・図面',
    archView2DBtn: '2D 図面',
    archView3DBtn: '3D 視点',
    archToolSelect: '選択 / Blender',
    archToolDrawWall: '壁を引く',
    archToolMeasure: 'メジャー計測',
    archDrawWallHint: '始点と終点をタップして壁を作成（Escで連続描画を終了）',
    archPlaceOpeningHint: '壁をタップするとドアや窓の開口部が自動でくり抜かれます',
    archMeasureHint: '2点をタップして正確なメートル距離を計測',

    archWallStyleFull: '標準壁',
    archWallStyleHalf: '腰壁・カウンター',
    archWallStyleRailing: 'バルコニー手すり',
    archWallHeightLabel: '壁の高さ',
    archWallThickLabel: '壁の厚み',
    archWallLenLabel: 'テンプレート幅',
    archWallCurveLabel: '曲面カーブ量',
    archWallAngleSnap: '45°/90° 角度固定',
    archWallBaseboard: '巾木モールディング',
    archSpawnWallTemplateBtn: '+ 標準壁テンプレート配置',
    archWallTemplateSub: '一般的な住宅寸法（高さ3.0m × 幅3.0m × 厚さ15cm）・自在に変更可能',
    archSelectedWallTitle: '選択中のスマート壁',
    archBakeToMeshBtn: '自由3Dメッシュへ変換 (Blender編集)',
    archBakeSuccessToast: '自由編集可能な3Dオブジェクトに変換しました',

    archOpenDoorSingle: '片開きドア',
    archOpenDoorDouble: '両開きドア',
    archOpenWinStd: '標準窓',
    archOpenWinWide: 'ワイド窓',
    archOpenWinTall: 'パノラマ窓',
    archOpenArchway: 'アーチ開口',
    archOpenWidthLabel: '開口幅',
    archOpenHeightLabel: '開口高さ',
    archOpenSillLabel: '窓台の高さ',
    archOpenPosLabel: '壁上の位置',
    archOpenFlipSwing: '開閉向き反転',
    archStairSectionTitle: '階段＆上階スラブ自動開口',
    archStairStraightBtn: '+ 直階段',
    archStairLShapeBtn: '+ L字階段',
    archStairAutoCutout: '上階の床を自動でくり抜く',
    archStairPlacedToast: '階段と上階の吹き抜け開口を配置しました',

    archRoofAutoBtn: '間取りに合わせて自動屋根生成',
    archRoofCustomBtn: '+ カスタム屋根追加',
    archRoofGable: '切妻屋根',
    archRoofHip: '寄棟屋根',
    archRoofShed: '片流れ屋根',
    archRoofFlat: '陸屋根(フラット)',
    archRoofPitchLabel: '屋根勾配',
    archRoofOverhangLabel: '軒の出',
    archRoofRidgeAxisLabel: '棟の方向',
    archRoofWidthLabel: 'X幅',
    archRoofDepthLabel: 'Z奥行',
    archRoofAddedToast: 'スマート屋根を生成しました',

    archRoomsTitle: '自動検出された部屋',
    archNoRoomsHint: '壁をつなげて囲むと、部屋と面積(m²)が自動認識されます。',
    archRoomAreaUnit: 'm²',
    archRoomFloorColor: '部屋の床カラー',
    archRoomAutoCeiling: 'スマート天井（ウォークスルー時に自動表示）',
    archDualWallTitle: '壁の両面ペイント（外壁・内壁）',
    archWallExtColor: '外側（外壁カラー）',
    archWallIntColor: '内側（室内壁カラー）',
    archApplyAllWallsBtn: 'この階の全壁に適用',
    archRoomPresetLiving: 'リビング',
    archRoomPresetBedroom: '寝室',
    archRoomPresetKitchen: 'キッチン',
    archRoomPresetBath: 'バス・洗面',
    archRoomPresetStudy: '書斎',
    archRoomPresetTerrace: 'テラス',

    archSunToggleTitle: '太陽時刻＆方位シミュレーター',
    archSunTimeLabel: '太陽の時刻',
    archCompassNorthLabel: '北の方位角',
    archLensSectionTitle: '室内カメラレンズ画角',
    archLensStd: '標準 46°',
    archLensWide: '広角 64°',
    archLensUltra: '超広角 78°',
    archSummaryTitle: '建築データ＆図面出力',
    archTotalAreaLabel: '延床面積（部屋合計）',
    archRoomCountLabel: '部屋数',
    archWallTotalLenLabel: '壁の総延長',
    archExportBlueprintBtn: '2D間取り図をダウンロード (.PNG)',
    archBlueprintExportedToast: '2D間取り図(PNG)を保存しました',

    pointLightCardTitle: 'リアル光源化（自作照明ライト）',
    pointLightCardDesc: 'ONにすると自作の照明オブジェクトから周囲の部屋へ光が灯ります',
    pointLightIntensity: '光の強さ',
    pointLightRange: '光の届く距離(m)',

    patternSectionTitle: '表面テクスチャ模様（RGBカラーはそのまま維持）',
    patternNone: 'フラット無地',
    patternWood: '木目・ウッド',
    patternTile: 'タイル目地',
    patternBrick: 'レンガ積み',
    patternConcrete: 'コンクリート',
    patternMarble: '大理石マーブル',
    patternFabric: 'ファブリック布地',
    patternRoofTile: '瓦・ルーフタイル',
    patternScaleLabel: '模様の細かさ',

    modifierSectionTitle: '家具シェイプ・モディファイア (Blender式)',
    modifierSectionDesc: '角の丸め(ベベル)、脚やシェードのテーパー加工、左右対称ミラーを自在に適用。',
    modifierBevelLabel: '角の丸み / ベベル',
    modifierTaperXLabel: 'X軸テーパー（先細り）',
    modifierTaperZLabel: 'Z軸テーパー（先細り）',
    modifierMirrorX: 'X軸ミラー対称',
    modifierMirrorZ: 'Z軸ミラー対称',
    modifierMirrorDist: 'ミラー間隔 (m)',
    modifierResetBtn: 'モディファイア解除',
    modifierBakeTwinsBtn: 'ミラー複製を独立オブジェクト化',

    assetCatAll: 'すべて',
    assetCatChair: 'チェア・ソファ',
    assetCatTable: 'テーブル',
    assetCatLamp: '照明ライト',
    assetCatCabinet: '収納・棚',
    assetCatDecor: 'デコレーション',
    assetCatOther: 'その他',
    assetCategoryLabel: '保存カテゴリ',
    assetReEditBtn: '再編集',
    assetUpdateSavedBtn: 'このアセットを上書き更新',
    assetReEditLoadedToast: '再編集用にステージへ配置しました',
    assetUpdatedToast: 'マイアセットを更新しました',

    archExactLengthPlaceholder: '数値m (例: 4.5)',
    archApplyLengthBtn: '確定',
    archDoorToggleOpenBtn: 'ドアの開閉切替',
    archDoorStateOpen: '開いている',
    archDoorStateClosed: '閉じている',
    archWalkDoorHint: '目の前のドアをタップすると開閉できます',
    archRoofAddWingBtn: '+ 屋根ウィング追加（L字間取り・ポーチ用）',
    archRoofRotationLabel: '屋根の回転角 (°)',
    archRoofSkylightToggle: 'ガラス天窓 (スカイライト)',
    archRoofSkylightSizeLabel: '天窓サイズ',
    archDragNodeHint: '青い角ノードをドラッグすると接続された壁と部屋面積がリアルタイム変形します',

    photoStudioBtnTitle: 'HDスタジオ撮影',
    photoModalTitle: 'スタジオ撮影＆高画質スナップショット',
    photoModalDesc: 'グリッドやギズモを自動非表示にして、家具や建築を高解像度PNGで書き出します。',
    photoRes1080p: 'HDワイド (1920×1080)',
    photoRes2kSquare: '2Kカタログ正方形 (2048×2048)',
    photoTransparentBg: '背景透過 (.PNG アルファ)',
    photoCaptureBtn: '撮影して保存 (.PNG)',
    photoCapturedToast: 'HDスタジオ写真を保存しました',

    modCatPillars: '柱・パーゴラ',
    modCatFences: 'フェンス・門扉',

    archToolDrawRoom: '部屋ボックス',
    archToolQuickErase: 'クイック消去',
    archDrawRoomHint: '対角線にドラッグして4面の壁と部屋を一度に作成',
    archEraseHint: '壁・ドア・窓・階段・屋根をタップして素早く削除',
    archChainModeToggle: '連続描画',
    archSafeConfirmToggle: '配置前に確認',
    archConfirmPlaceBtn: '配置する',
    archCancelPlaceBtn: 'キャンセル',
    archSoftAngleGuideLabel: 'ソフト角度マグネット (0°/45°/90°)',
    archCopyLowerWallsBtn: '下の階の壁をコピー',
    archCopiedLowerWallsToast: '下の階の壁をコピーしました',
    archQuickRotate90: '90°回転',

    alignDistributeTitle: '整列・均等配置',
    alignLeftX: '左揃え (X-)',
    alignCenterX: '中央 X',
    alignRightX: '右揃え (X+)',
    alignBottomY: '底面揃え (Y-)',
    alignTopY: '上面揃え (Y+)',
    alignFrontZ: '手前揃え (Z+)',
    alignCenterZ: '中央 Z',
    alignBackZ: '奥揃え (Z-)',
    distributeEvenX: 'X均等配置',
    distributeEvenZ: 'Z均等配置',
    alignedToast: 'オブジェクトを整列しました',

    lockObjectTip: '誤操作防止ロック',
    unlockObjectTip: 'ロック解除',
    exactDimTitle: '実寸サイズ (m 幅×高×奥行)',
    exactDimProportional: '比率固定',

    exportAssetsPackBtn: 'パック書き出し',
    importAssetsPackBtn: 'パック読み込み',
    assetsPackExportedToast: 'コレクションパックを書き出しました',
    assetsPackImportedToast: 'コレクションパックを読み込みました',

    archWorkflowBtn: '設計ワークフロー',
    archWorkflowTitle: '統合建築プロジェクト・ワークフロー',
    archWorkflowUpdating: '解析を更新中...',
    wfTabBrief: '要件',
    wfTabSite: '敷地',
    wfTabMaterials: '積算・材料',
    wfTabValidation: '検証',
    wfTabVersions: '案・比較',
    wfTabDocs: '図面・帳票',

    briefTemplateLabel: '編集可能な初期ブリーフテンプレート',
    briefTplSingleStorey: 'コンパクト平屋住宅',
    briefTplTwoStorey: '2階建てファミリー住宅',
    briefTplMinimalist: 'モダン・ミニマリスト住宅',
    briefTplGarage: 'ガレージ付き住宅',
    briefTplBlank: '白紙カスタムブリーフ',
    briefProjectTypeLabel: '建物タイプ',
    briefStyleLabel: '希望スタイル',
    briefDescLabel: 'プロジェクト概要',
    briefNotesLabel: '自由設計メモ',
    briefBudgetTitle: '目標予算（任意）',
    briefBudgetScopeMaterials: '建築資材のみ',
    briefBudgetScopeConstruction: '総工事費目安',
    briefBudgetScopeCustom: 'カスタム範囲',
    briefAddRequirementBtn: '+ 部屋・面積要件を追加',
    briefStatusMet: '達成',
    briefStatusUnmet: '未達',
    briefStatusReview: '要確認',
    briefStatusNA: '情報',
    briefRoomTypeLabel: '部屋の用途',
    briefUnassignedRoomsTitle: '用途未設定の部屋（クリックで分類）',
    briefFocusBtn: '表示',

    constMatSectionTitle: '建築構造・仕上げ材（表示色とは独立）',
    constMatSeparatedHint:
      'ペイント色や見た目パターンを変更しても、建築材料の割り当てや積算コストは勝手に変わりません。',
    constMatStructLabel: '壁の構造躯体材',
    constMatExtFinishLabel: '外装仕上げ材',
    constMatIntFinishLabel: '内装仕上げ材',
    constMatFloorLabel: '床の構成材',
    constMatRoofLabel: '屋根の構成材',
    constMatOpeningLabel: '建具ユニット材',
    constMatStairLabel: '階段の構造材',
    constMatObjectLabel: 'ブロック構造材',
    constMatUnassignedOption: '— 未設定 (Unassigned) —',
    constMatAutoAssignBtn: '未設定箇所に標準材を一括設定',
    constMatAutoAssignedToast: '未設定の要素に標準建築材料を割り当てました',
    takeoffTotalEstLabel: '概算資材コスト',
    takeoffMaterialOnlyBadge: '資材単体積算（Material-Only）',
    takeoffScopeMismatchWarn:
      '範囲の注意：目標予算が「総工事費／カスタム」ですが、本積算は建築資材費のみです（労務費・設備工事・許認可・税金は含みません）。',
    takeoffMissingAssignTitle: '建築材料が未設定の要素',
    takeoffUnpricedTitle: '単価未入力の材料',
    takeoffEditCatalogTitle: '材料カタログ＆単価編集',
    takeoffAddCustomMatBtn: '+ カスタム材料を追加',
    takeoffUnitPriceLabel: '単価 (IDR)',
    takeoffWastePctLabel: 'ロス率 (%)',
    takeoffByFloorTitle: '階別コスト内訳',

    altSaveNewBtn: '+ 現在の設計案を保存',
    altNamePlaceholder: '案の名称（例：A案 切妻屋根）',
    altDescPlaceholder: '変更点メモ...',
    altEmptyHint:
      '建物形状・材料・ブリーフ・敷地の独立スナップショットを保存し、設計案の比較や復元を行えます。',
    altInspectBtn: '確認',
    altInspectingBanner: '読み取り専用プレビュー中（作業中のモデルは変更されません）',
    altCloseInspectBtn: '確認を閉じる',
    altRestoreBtn: '作業モデルに復元',
    altRestoreConfirmMsg:
      'この設計案を現在の作業モデルに復元しますか？（復元後も元に戻す／Ctrl+Zが可能です）',
    altRestoredToast: '設計案を作業モデルに復元しました',
    altDuplicateProjectBtn: '案を複製',
    altCompareTitle: '並列メトリクス比較',
    altActiveWorkingLabel: '現在の作業モデル (Live)',

    valAllCategories: 'すべて',
    valCatGeometry: '形状エラー',
    valCatOpening: '建具・壁干渉',
    valCatSpatial: '空間使い勝手',
    valCatBrief: 'ブリーフ目標',
    valCatSite: '敷地・後退線',
    valSevError: 'エラー',
    valSevWarning: '警告',
    valSevInfo: '情報',
    valHealthyMsg: '形状の不整合や空間計画の警告は検出されませんでした。',
    valAutoFixBtn: '自動調整',
    valAutoFixedToast: '安全な自動調整を適用しました',
    valRerunBtn: '再検証',

    siteEnableToggle: '敷地境界線とセットバック表示を有効化',
    siteDimensionsLabel: '敷地寸法（幅 X × 奥行 Z m）',
    siteSetbacksTitle: 'ユーザー設定セットバック（m）',
    siteSetbackDisclaimer:
      'セットバック値は計画目安としてユーザーが任意に設定するものであり、法規制への適合を保証するものではありません。',
    siteFrontLabel: '前面 (+Z)',
    siteRearLabel: '背面 (-Z)',
    siteLeftLabel: '左側 (-X)',
    siteRightLabel: '右側 (+X)',
    siteEntranceLabel: '主な敷地アプローチ辺',
    siteNudgeBuildingTitle: '敷地内での建物移動・回転',
    siteRotate90Btn: '建物を90°回転',
    siteCenterOnPlotBtn: '敷地中央に配置',
    siteOutdoorZonesTitle: '屋外ゾーニング計画',
    siteAddZoneBtn: '+ 屋外ゾーン追加',
    siteAreaSummaryLabel: '敷地面積',
    siteFootprintLabel: '建築面積（フットプリント）',
    siteOpenAreaLabel: '残余空地面積',

    docSourceLabel: '図面の出力元',
    docKindFloorPlan: '2D 平面図',
    docKindSitePlan: '敷地配置図 (Site Plan)',
    docKindElevation: '立面図（4面正投影）',
    docKindSchedule: '建具表（ドア・窓）',
    docKindMaterialReport: '数量拾い出し＆概算見積書',
    docKindValidationReport: '設計検証サマリー',
    docThemeDark: 'ブループリント濃紺',
    docThemeWhite: '建築白紙シート',
    docExportPngBtn: '.PNG 図面を保存',
    docExportHtmlBtn: '印刷用レポート一式を保存 (.HTML/PDF)',
    docSectionLimitationNote:
      '技術注記：平面図・配置図・4面立面図および切断断面図（A–A\' / B–B\'）は実モデル形状から直接生成されます。',

    outlinerSearchPlaceholder: 'オブジェクト・グループを検索...',
    outlinerFolderBadge: 'グループ',
    saveWholeScenePrefabBtn: 'キャンバス全体をマイカタログに保存',
    prefabDimsBadgeLabel: '寸法',
    exportObjLabel: '3Dモデル書き出し (.OBJ)',
    exportSelectedGlbLabel: '選択項目のみ書き出し (.GLB)',
    exportSelectedObjLabel: '選択項目のみ書き出し (.OBJ)',
    worldScaleTexLabel: '実寸メートルUVスケール（引き伸ばし防止）',
    patternRotateLabel: '木目・パターン回転角',
    csgCardTitle: '3D ブーリアン演算（くり抜き・結合・交差）',
    csgCardHint:
      '2つ以上選択（1つ目＝対象、2つ目以降＝カッター）でシンクや棚穴、壁ニッチを正確に削り出せます。',
    csgSubtractBtn: '減算くり抜き (A - B)',
    csgUnionBtn: '結合 (A + B)',
    csgIntersectBtn: '交差 (A ∩ B)',
    csgResetBtn: 'ブーリアン前の形状に戻す',
    csgAppliedToast: '3Dブーリアン演算を適用しました',
    profileStudioBtn: '2D→3D 断面プロファイル作成（回転体 / 押し出し）',
    profileStudioTitle: 'カスタム 2D→3D プロファイルスタジオ',
    profileStudioDesc:
      '2Dカーブの制御点をドラッグして、ろくろ脚、中空の花瓶、ランプシェード、廻り縁を作成します。',
    profileModeLathe: '360° 回転体 (Lathe)',
    profileModeExtrude: '直線押し出し (Extrude)',
    profileSmoothLabel: '曲線を滑らかに補間 (Spline)',
    profileHollowLabel: '中空の肉厚',
    profileSegmentsLabel: '分割セグメント数',
    profileDepthLabel: '押し出し奥行き',
    profileTemplateLabel: 'ベース曲線テンプレート',
    profileAddPointHint: '空白タップで点追加・青丸ドラッグで移動・ダブルタップで削除',
    profileApplyBtn: '3D形状を生成 / 更新',
    lightTypePoint: '360° 全方向ライト',
    lightTypeSpot: 'ダウンライト / スポット照射',
    lightConeAngleLabel: '照射コーン角度',
    lightKelvinLabel: '色温度 (Kelvin)',
    lightAutoNightLabel: '夕方・夜間のみ自動点灯',
    walkLookPadLabel: 'ドラッグで視点回転',
    walkGhostModeLabel: '壁すり抜け',
    walkEyeStanding: '立ち目線 (1.65m)',
    walkEyeSeated: '座り目線 (1.10m)',
    walkInteractOpenDoor: 'ドアを開ける',
    walkInteractCloseDoor: 'ドアを閉める',
    walkInteractToggleLight: '照明スイッチ',
    roomVoidToggleLabel: '吹き抜け / オープンメザニン (2層貫通)',
    roomVoidHint:
      '上階床スラブと直下の天井をくり抜き、開放的な吹き抜け空間を作ります。',
    siteShapeLabel: '敷地形状プリセット',
    siteShapeRect: '長方形',
    siteShapeTrapezoid: '台形敷地',
    siteShapeHook: '角地（隅切り）',
    siteShapeLLot: '旗竿・L字敷地',
    docKindSection: '断面図 (A–A\' / B–B\')',
    docSectionAxisAA: '横断面図 A–A\' (X軸)',
    docSectionAxisBB: '縦断面図 B–B\' (Z軸)',
    docSectionOffsetLabel: '切断ライン位置 (m)',
    shadingModeTitle: 'ビューポート表示スタイル',
    shadingModeShaded: 'リアルPBR',
    shadingModeClay: '白模型 (クレイ)',
    shadingModeTech: 'テクニカル線画',
    sectionCut3dTitle: '3D ライブ断面カット',
    sectionCutEnable: '3D断面カットを有効化',
    sectionCutFlip: 'カット方向を反転',
    measure3dToolLabel: '3Dメジャー計測',
    measure3dHint: '2点をタップして正確な3D距離を計測（頂点へ自動スナップ）',
    quickDimEditTitle: '実寸メートル指定 (幅 × 高さ × 奥行)',
    quickDimApplyBtn: '適用',
    photoRes4kLabel: '4K Ultra HD (3840 × 2160)',
    photoTwoPointLabel: '建築2点透視補正（垂直ラインを真っ直ぐ保つ）',
    touchLoupeSettingLabel: 'タッチ移動時の精密拡大ルーペを表示',

    wallEditAngleLockLabel: '壁の角度ロック (0°/45°/90°)',
    wallEditAngleLockedBadge: '角度ロック: ON',
    wallEditAngleFreeBadge: '角度ロック: 自由',
    archDrawModeBtn: '配置モード',
    archPanZoomModeBtn: '画面移動・ズーム',
    archTwoFingerHint: '2本指でいつでもズーム＆移動',
    zoomIn2DBtn: '平面図を拡大 (+)',
    zoomOut2DBtn: '平面図を縮小 (-)',
    zoomReset2DBtn: '表示をリセット',
    archOutlinerFolder: '建築構造エレメント',
    archSelectedOpeningTitle: 'ドア・窓開口部',
    archSelectedStairTitle: '階段ユニット',
    archSelectedRoofTitle: '屋根ユニット',
    archSelectedRoomTitle: '部屋スラブ',
    archBakeWallHint:
      'このスマート壁を自由編集メッシュに変換すると、サブディビジョン分割やCSGブーリアンくり抜きを適用できます。',
    photoRenderedResBadge: '出力解像度',

    archDrawModeCompact: '配置',
    archPanModeCompact: '視点移動',
    archEndpointSnappedBadge: '端点ロック',
    wallInnerFaceLabel: '内壁',
    wallOuterFaceLabel: '外壁',
    angleLockHudOn: '角度ロック ON',
    angleLockHudFree: '自由角度',
    freeRotateHud: '自由回転',
    gridScaleHud: 'グリッド拡縮',
    roomVoidLabel: '吹き抜け（ボイド床）',
  },
};

export function formatRelativeTime(timestamp: number, lang: AppLanguage): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) {
    return lang === 'ja' ? 'たった今' : lang === 'en' ? 'Just now' : 'Baru saja';
  }
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) {
    return lang === 'ja'
      ? `${mins}分前`
      : lang === 'en'
      ? `${mins}m ago`
      : `${mins} menit lalu`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return lang === 'ja'
      ? `${hrs}時間前`
      : lang === 'en'
      ? `${hrs}h ago`
      : `${hrs} jam lalu`;
  }
  const days = Math.floor(hrs / 24);
  return lang === 'ja'
    ? `${days}日前`
    : lang === 'en'
    ? `${days}d ago`
    : `${days} hari lalu`;
}
