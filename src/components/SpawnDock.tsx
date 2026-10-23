import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes,
  Building2,
  ChevronUp,
  Download,
  Info,
  Pencil,
  Plus,
  Search,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BASIC_SHAPES_CATALOG,
  PRIMITIVE_META,
  PrimitiveMetaItem,
} from '../engine/primitives';
import {
  getModularItemThumbnail,
  MODULAR_CONSTRUCTION_CATALOG,
  ModularCategory,
  ModularConstructionItem,
} from '../engine/modularConstruction';
import {
  getLocalizedShapeMeta,
  getShapeSubcategoryLabel,
} from '../i18n/shapeTranslations';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  CustomAssetCategory,
  CustomAssetRecord,
  PrimitiveKind,
  ShapeSubcategory,
  StudioMode,
} from '../types/studio';
import { PrimitiveShapePreview } from './ShapeIcons';

const SUBCATEGORY_ORDER: ShapeSubcategory[] = [
  'all',
  'blocks',
  'prisms-pyramids',
  'wedges',
  'cylinders',
  'curved',
  'architecture',
];

const MODULAR_CATEGORY_ORDER: Array<'all' | ModularCategory> = [
  'all',
  'floors',
  'pillars',
  'fences',
  'landscape',
];

const ASSET_CATEGORY_ORDER: Array<'all' | CustomAssetCategory> = [
  'all',
  'chair',
  'table',
  'lamp',
  'cabinet',
  'decor',
  'other',
];

const LONG_PRESS_MS = 380;

/* =========================================================
   Basic Shape Tile (Properly framed 48px inside 58px frame + long press)
   ========================================================= */
interface ShapeTileProps {
  meta: PrimitiveMetaItem;
  language: AppLanguage;
  isRecent: boolean;
  onQuickSpawn: (kind: PrimitiveKind) => void;
  onInspect: (meta: PrimitiveMetaItem) => void;
}

const BasicShapeTile: React.FC<ShapeTileProps> = ({
  meta,
  language,
  isRecent,
  onQuickSpawn,
  onInspect,
}) => {
  const localized = getLocalizedShapeMeta(meta, language);
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startPtRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const longTriggeredRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPressing(false);
  };

  useEffect(() => clearTimer, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button > 0) return;
    startPtRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    longTriggeredRef.current = false;
    setPressing(true);

    timerRef.current = window.setTimeout(() => {
      longTriggeredRef.current = true;
      setPressing(false);
      navigator.vibrate?.(16);
      onInspect(meta);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!timerRef.current) return;
    const dx = e.clientX - startPtRef.current.x;
    const dy = e.clientY - startPtRef.current.y;
    if (Math.hypot(dx, dy) > 9) {
      movedRef.current = true;
      clearTimer();
    }
  };

  const handlePointerUp = () => {
    const wasLong = longTriggeredRef.current;
    const wasMoved = movedRef.current;
    clearTimer();
    if (!wasLong && !wasMoved) {
      onQuickSpawn(meta.kind);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`basic-shape-tile ${pressing ? 'pressing' : ''} ${
        isRecent ? 'recent' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={clearTimer}
      onPointerLeave={clearTimer}
      onContextMenu={(e) => {
        e.preventDefault();
        clearTimer();
        onInspect(meta);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onQuickSpawn(meta.kind);
        }
      }}
    >
      <button
        type="button"
        className="shape-tile-info-dot"
        title={localized.label}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onInspect(meta);
        }}
      >
        <Info size={12} />
      </button>

      <div className="basic-shape-thumb">
        <PrimitiveShapePreview kind={meta.kind} size={48} />
      </div>

      <div className="basic-shape-meta">
        <strong>{localized.label}</strong>
        <small>{localized.subtitle}</small>
      </div>
    </div>
  );
};

/* =========================================================
   Catalog Drawer (75 Basic Shapes + House Modular Parts + User Custom Assets)
   ========================================================= */
type CatalogTabMode = 'shapes' | 'modular' | 'custom';

interface CatalogDrawerProps {
  open: boolean;
  initialTab: CatalogTabMode;
  studioMode: StudioMode;
  language: AppLanguage;
  recentKind: PrimitiveKind;
  customAssets: CustomAssetRecord[];
  onClose: () => void;
  onSpawnShape: (kind: PrimitiveKind, keepOpen?: boolean) => void;
  onSpawnModularItem?: (item: ModularConstructionItem, label: string) => void;
  onSpawnCustomAsset: (asset: CustomAssetRecord) => void;
  onEditCustomAsset?: (asset: CustomAssetRecord) => void;
  onDeleteCustomAsset?: (id: string) => void;
  onExportAssetsPack?: () => void;
  onImportAssetsPackFile?: (file: File) => void;
}

const CatalogDrawer: React.FC<CatalogDrawerProps> = ({
  open,
  initialTab,
  studioMode,
  language,
  recentKind,
  customAssets,
  onClose,
  onSpawnShape,
  onSpawnModularItem,
  onSpawnCustomAsset,
  onEditCustomAsset,
  onDeleteCustomAsset,
  onExportAssetsPack,
  onImportAssetsPackFile,
}) => {
  const t = TRANSLATIONS[language];
  const isHouse = studioMode === 'house';
  const packInputRef = useRef<HTMLInputElement | null>(null);
  const [catalogView, setCatalogView] = useState<CatalogTabMode>(initialTab);
  const [subcat, setSubcat] = useState<ShapeSubcategory>('all');
  const [modCat, setModCat] = useState<'all' | ModularCategory>('all');
  const [assetCat, setAssetCat] = useState<'all' | CustomAssetCategory>('all');
  const [query, setQuery] = useState('');
  const [inspectedShape, setInspectedShape] = useState<PrimitiveMetaItem | null>(
    null
  );

  useEffect(() => {
    if (open) {
      setCatalogView(
        !isHouse && initialTab === 'modular' ? 'shapes' : initialTab
      );
    } else {
      setInspectedShape(null);
    }
  }, [open, initialTab, isHouse]);

  const filteredShapes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BASIC_SHAPES_CATALOG.filter((item) => {
      if (subcat !== 'all' && item.subcategory !== subcat) return false;
      if (!q) return true;
      const loc = getLocalizedShapeMeta(item, language);
      return (
        loc.label.toLowerCase().includes(q) ||
        loc.subtitle.toLowerCase().includes(q) ||
        loc.description.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.kind.toLowerCase().includes(q)
      );
    });
  }, [subcat, query, language]);

  const filteredModular = useMemo(() => {
    if (!isHouse) return [];
    const q = query.trim().toLowerCase();
    return MODULAR_CONSTRUCTION_CATALOG.filter((item) => {
      if (modCat !== 'all' && item.category !== modCat) return false;
      if (!q) return true;
      return (
        item.name[language].toLowerCase().includes(q) ||
        item.subtitle[language].toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [isHouse, modCat, query, language]);

  const filteredCustom = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customAssets.filter((a) => {
      const cat = a.category ?? 'other';
      if (assetCat !== 'all' && cat !== assetCat) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q);
    });
  }, [customAssets, assetCat, query]);

  if (!open) return null;

  const inspectedLocalized = inspectedShape
    ? getLocalizedShapeMeta(inspectedShape, language)
    : null;

  const getModCategoryLabel = (cat: 'all' | ModularCategory): string => {
    switch (cat) {
      case 'all':
        return `${t.modCatAll} (${MODULAR_CONSTRUCTION_CATALOG.length})`;
      case 'floors':
        return t.modCatFloors;
      case 'pillars':
        return t.modCatPillars;
      case 'fences':
        return t.modCatFences;
      case 'landscape':
        return t.modCatLandscape;
    }
  };

  const getAssetCategoryLabel = (cat: 'all' | CustomAssetCategory): string => {
    switch (cat) {
      case 'all':
        return `${t.assetCatAll} (${customAssets.length})`;
      case 'chair':
        return t.assetCatChair;
      case 'table':
        return t.assetCatTable;
      case 'lamp':
        return t.assetCatLamp;
      case 'cabinet':
        return t.assetCatCabinet;
      case 'decor':
        return t.assetCatDecor;
      case 'other':
        return t.assetCatOther;
    }
  };

  const headerTitle =
    catalogView === 'modular'
      ? t.modularKitTab
      : catalogView === 'custom'
      ? t.catCustom
      : t.basicShapes;

  const headerHint =
    catalogView === 'modular' ? t.modularKitHint : t.shapesHint;

  return (
    <div
      className="basic-shapes-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="basic-shapes-panel"
        role="dialog"
        aria-label={headerTitle}
      >
        <div className="basic-shapes-header">
          <div className="basic-shapes-title">
            <span className="basic-shapes-badge-icon">
              {catalogView === 'modular' ? (
                <Building2 size={17} />
              ) : catalogView === 'custom' ? (
                <Boxes size={17} />
              ) : (
                <Shapes size={17} />
              )}
            </span>
            <div>
              <h3>{headerTitle}</h3>
              <p>{headerHint}</p>
            </div>
          </div>

          <div className="catalog-header-right">
            <div className="catalog-mode-switch">
              <button
                type="button"
                className={`cat-switch-pill ${
                  catalogView === 'shapes' ? 'active' : ''
                }`}
                onClick={() => setCatalogView('shapes')}
              >
                <Shapes size={13} />
                <span>{t.basicShapes}</span>
              </button>

              {/* #7 Modular Construction Tab — Buat Rumah ONLY */}
              {isHouse && (
                <button
                  type="button"
                  className={`cat-switch-pill ${
                    catalogView === 'modular' ? 'active' : ''
                  }`}
                  onClick={() => setCatalogView('modular')}
                >
                  <Building2 size={13} />
                  <span>
                    {t.modularKitTab} ({MODULAR_CONSTRUCTION_CATALOG.length})
                  </span>
                </button>
              )}

              <button
                type="button"
                className={`cat-switch-pill ${
                  catalogView === 'custom' ? 'active' : ''
                }`}
                onClick={() => setCatalogView('custom')}
              >
                <Boxes size={13} />
                <span>
                  {t.catCustom} ({customAssets.length})
                </span>
              </button>
            </div>

            <button
              type="button"
              className="icon-close-btn"
              onClick={onClose}
              aria-label={t.done}
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Search & Subcategory Filter Bar */}
        <div className="basic-shapes-controls">
          <div className="basic-shapes-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                catalogView === 'shapes' ? t.searchShapes : t.searchPresets
              }
            />
            {query && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setQuery('')}
                aria-label={t.done}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {catalogView === 'shapes' && (
            <div className="basic-shapes-tabs" role="tablist">
              {SUBCATEGORY_ORDER.map((tabId) => {
                const label =
                  tabId === 'all'
                    ? `${getShapeSubcategoryLabel('all', language)} (${BASIC_SHAPES_CATALOG.length})`
                    : getShapeSubcategoryLabel(tabId, language);
                return (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={subcat === tabId}
                    className={`basic-subcat-tab ${
                      subcat === tabId ? 'active' : ''
                    }`}
                    onClick={() => setSubcat(tabId)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {catalogView === 'modular' && isHouse && (
            <div className="basic-shapes-tabs" role="tablist">
              {MODULAR_CATEGORY_ORDER.map((mc) => (
                <button
                  key={mc}
                  type="button"
                  role="tab"
                  aria-selected={modCat === mc}
                  className={`basic-subcat-tab ${
                    modCat === mc ? 'active' : ''
                  }`}
                  onClick={() => setModCat(mc)}
                >
                  {getModCategoryLabel(mc)}
                </button>
              ))}
            </div>
          )}

          {catalogView === 'custom' && (
            <div className="custom-assets-toolbar">
              <div className="basic-shapes-tabs" role="tablist">
                {ASSET_CATEGORY_ORDER.map((ac) => (
                  <button
                    key={ac}
                    type="button"
                    role="tab"
                    aria-selected={assetCat === ac}
                    className={`basic-subcat-tab ${
                      assetCat === ac ? 'active' : ''
                    }`}
                    onClick={() => setAssetCat(ac)}
                  >
                    {getAssetCategoryLabel(ac)}
                  </button>
                ))}
              </div>

              <div className="custom-pack-actions">
                <input
                  ref={packInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && onImportAssetsPackFile) {
                      onImportAssetsPackFile(f);
                    }
                    e.target.value = '';
                  }}
                />
                {onImportAssetsPackFile && (
                  <button
                    type="button"
                    className="custom-pack-btn"
                    onClick={() => packInputRef.current?.click()}
                  >
                    <Upload size={13} />
                    <span>{t.importAssetsPackBtn}</span>
                  </button>
                )}
                {onExportAssetsPack && customAssets.length > 0 && (
                  <button
                    type="button"
                    className="custom-pack-btn primary"
                    onClick={onExportAssetsPack}
                  >
                    <Download size={13} />
                    <span>{t.exportAssetsPackBtn}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grid Body */}
        <div className="basic-shapes-grid">
          {catalogView === 'shapes' ? (
            filteredShapes.length === 0 ? (
              <div className="basic-shapes-empty">{t.noShapeMatch}</div>
            ) : (
              filteredShapes.map((meta) => (
                <BasicShapeTile
                  key={meta.kind}
                  meta={meta}
                  language={language}
                  isRecent={meta.kind === recentKind}
                  onQuickSpawn={(k) => onSpawnShape(k, false)}
                  onInspect={(m) => setInspectedShape(m)}
                />
              ))
            )
          ) : catalogView === 'modular' ? (
            filteredModular.length === 0 ? (
              <div className="basic-shapes-empty">{t.noShapeMatch}</div>
            ) : (
              filteredModular.map((mod) => {
                const thumb = getModularItemThumbnail(mod);
                const locLabel = mod.name[language];
                return (
                  <div
                    key={mod.id}
                    role="button"
                    tabIndex={0}
                    className="basic-shape-tile modular-tile"
                    onClick={() => {
                      onSpawnModularItem?.(mod, locLabel);
                      onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSpawnModularItem?.(mod, locLabel);
                        onClose();
                      }
                    }}
                  >
                    <div className="basic-shape-thumb">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={locLabel}
                          className="primitive-3d-thumb"
                          style={{ width: 48, height: 48 }}
                        />
                      ) : (
                        <Building2 size={24} />
                      )}
                    </div>
                    <div className="basic-shape-meta">
                      <strong>{locLabel}</strong>
                      <small>{mod.subtitle[language]}</small>
                    </div>
                  </div>
                );
              })
            )
          ) : filteredCustom.length === 0 ? (
            <div className="basic-shapes-empty">
              <Sparkles size={22} />
              <strong>{t.emptyAssetsTitle}</strong>
              <span>{t.emptyAssetsDesc}</span>
            </div>
          ) : (
            filteredCustom.map((asset) => (
              <div
                key={asset.id}
                role="button"
                tabIndex={0}
                className="basic-shape-tile"
                onClick={() => {
                  onSpawnCustomAsset(asset);
                  onClose();
                }}
              >
                {onEditCustomAsset && (
                  <button
                    type="button"
                    className="shape-tile-info-dot edit-asset-dot"
                    title={t.assetReEditBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCustomAsset(asset);
                      onClose();
                    }}
                  >
                    <Pencil size={11} />
                  </button>
                )}
                {onDeleteCustomAsset && (
                  <button
                    type="button"
                    className="shape-tile-info-dot danger"
                    title={t.delete}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomAsset(asset.id);
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
                <div className="basic-shape-thumb">
                  {asset.thumbnailDataUrl ? (
                    <img
                      src={asset.thumbnailDataUrl}
                      alt={asset.name}
                      className="primitive-3d-thumb"
                      style={{ width: 48, height: 48 }}
                    />
                  ) : (
                    <Boxes size={24} />
                  )}
                </div>
                <div className="basic-shape-meta">
                  <strong>{asset.name}</strong>
                  <small>
                    {asset.parts.length} {t.partsUnit}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Long-Press Basic Shape Explanation Card */}
        {inspectedShape && inspectedLocalized && (
          <div
            className="shape-explain-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setInspectedShape(null);
            }}
          >
            <div className="shape-explain-card" role="dialog" aria-live="polite">
              <div className="shape-explain-top">
                <div className="shape-explain-thumb-lg">
                  <PrimitiveShapePreview kind={inspectedShape.kind} size={78} />
                </div>
                <div className="shape-explain-heading">
                  <span className="shape-explain-cat">
                    {getShapeSubcategoryLabel(
                      inspectedShape.subcategory,
                      language
                    )}
                  </span>
                  <h4>{inspectedLocalized.label}</h4>
                  <span className="shape-explain-sub">
                    {inspectedLocalized.subtitle}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-close-btn"
                  onClick={() => setInspectedShape(null)}
                  aria-label={t.done}
                >
                  <X size={17} />
                </button>
              </div>

              <p className="shape-explain-desc">
                {inspectedLocalized.description}
              </p>

              <div className="shape-explain-actions">
                <button
                  type="button"
                  className="shape-explain-secondary"
                  onClick={() => setInspectedShape(null)}
                >
                  {t.done}
                </button>
                <button
                  type="button"
                  className="shape-explain-primary"
                  onClick={() => {
                    onSpawnShape(inspectedShape.kind, false);
                    setInspectedShape(null);
                  }}
                >
                  <Plus size={15} />
                  <span>{inspectedLocalized.label}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SpawnDockProps {
  studioMode: StudioMode;
  language: AppLanguage;
  customAssets: CustomAssetRecord[];
  onSpawn: (kind: PrimitiveKind) => void;
  onSpawnModularItem?: (item: ModularConstructionItem, label: string) => void;
  onSpawnCustomAsset: (asset: CustomAssetRecord) => void;
  onEditCustomAsset?: (asset: CustomAssetRecord) => void;
  onDeleteCustomAsset?: (id: string) => void;
  onExportAssetsPack?: () => void;
  onImportAssetsPackFile?: (file: File) => void;
}

export const DesktopSpawnDock: React.FC<SpawnDockProps> = ({
  studioMode,
  language,
  customAssets,
  onSpawn,
  onSpawnModularItem,
  onSpawnCustomAsset,
  onEditCustomAsset,
  onDeleteCustomAsset,
  onExportAssetsPack,
  onImportAssetsPackFile,
}) => {
  const t = TRANSLATIONS[language];
  const isHouse = studioMode === 'house';
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CatalogTabMode>('shapes');
  const [recentKind, setRecentKind] = useState<PrimitiveKind>('cube');

  const handleSpawnShape = (kind: PrimitiveKind, keepOpen = false) => {
    setRecentKind(kind);
    onSpawn(kind);
    if (!keepOpen) setMenuOpen(false);
  };

  const recentMeta = getLocalizedShapeMeta(PRIMITIVE_META[recentKind], language);
  const totalCount = BASIC_SHAPES_CATALOG.length;

  return (
    <>
      <div className="desktop-spawn-dock" role="toolbar">
        <button
          type="button"
          className={`spawn-category-trigger ${
            menuOpen && activeTab === 'shapes' ? 'active' : ''
          }`}
          onClick={() => {
            if (menuOpen && activeTab === 'shapes') {
              setMenuOpen(false);
            } else {
              setActiveTab('shapes');
              setMenuOpen(true);
            }
          }}
        >
          <span className="spawn-cat-icon-wrap">
            <Shapes size={20} />
          </span>
          <span className="spawn-card-text">
            <strong>{t.basicShapes}</strong>
            <small>{t.shapesHint}</small>
          </span>
          <span className="spawn-cat-pill">{totalCount}</span>
          <ChevronUp
            size={15}
            className={`spawn-cat-chevron ${
              menuOpen && activeTab === 'shapes' ? 'open' : ''
            }`}
          />
        </button>

        {/* #7 Modular Construction Trigger — Buat Rumah ONLY */}
        {isHouse && (
          <>
            <div className="spawn-dock-divider" />
            <button
              type="button"
              className={`spawn-category-trigger modular-trigger ${
                menuOpen && activeTab === 'modular' ? 'active' : ''
              }`}
              onClick={() => {
                if (menuOpen && activeTab === 'modular') {
                  setMenuOpen(false);
                } else {
                  setActiveTab('modular');
                  setMenuOpen(true);
                }
              }}
            >
              <span className="spawn-cat-icon-wrap modular">
                <Building2 size={20} />
              </span>
              <span className="spawn-card-text">
                <strong>{t.modularKitTab}</strong>
                <small>3.0m</small>
              </span>
              <span className="spawn-cat-pill">
                {MODULAR_CONSTRUCTION_CATALOG.length}
              </span>
            </button>
          </>
        )}

        <div className="spawn-dock-divider" />

        <button
          type="button"
          className="spawn-card quick-recent-card"
          onClick={() => onSpawn(recentKind)}
        >
          <span className="spawn-icon-wrap">
            <PrimitiveShapePreview kind={recentKind} size={28} />
          </span>
          <span className="spawn-card-text">
            <strong>+ {recentMeta.label}</strong>
            <small>{t.lastUsed}</small>
          </span>
        </button>
      </div>

      <CatalogDrawer
        open={menuOpen}
        initialTab={activeTab}
        studioMode={studioMode}
        language={language}
        recentKind={recentKind}
        customAssets={customAssets}
        onClose={() => setMenuOpen(false)}
        onSpawnShape={handleSpawnShape}
        onSpawnModularItem={onSpawnModularItem}
        onSpawnCustomAsset={onSpawnCustomAsset}
        onEditCustomAsset={onEditCustomAsset}
        onDeleteCustomAsset={onDeleteCustomAsset}
        onExportAssetsPack={onExportAssetsPack}
        onImportAssetsPackFile={onImportAssetsPackFile}
      />
    </>
  );
};

interface MobileBottomBarProps extends SpawnDockProps {
  objectCount: number;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  studioMode,
  language,
  customAssets,
  onSpawn,
  onSpawnModularItem,
  onSpawnCustomAsset,
  onEditCustomAsset,
  onDeleteCustomAsset,
  onExportAssetsPack,
  onImportAssetsPackFile,
  objectCount,
  drawerOpen,
  onToggleDrawer,
}) => {
  const t = TRANSLATIONS[language];
  const isHouse = studioMode === 'house';
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CatalogTabMode>('shapes');
  const [recentKind, setRecentKind] = useState<PrimitiveKind>('cube');

  const handleSpawnShape = (kind: PrimitiveKind, keepOpen = false) => {
    setRecentKind(kind);
    onSpawn(kind);
    if (!keepOpen) setMenuOpen(false);
  };

  const recentMeta = getLocalizedShapeMeta(PRIMITIVE_META[recentKind], language);
  const totalCount = BASIC_SHAPES_CATALOG.length;

  return (
    <>
      <nav className="mobile-bottom-bar">
        <button
          type="button"
          className={`mobile-basic-shapes-btn ${
            menuOpen && activeTab === 'shapes' ? 'active' : ''
          }`}
          onClick={() => {
            if (menuOpen && activeTab === 'shapes') setMenuOpen(false);
            else {
              setActiveTab('shapes');
              setMenuOpen(true);
            }
          }}
        >
          <div className="mobile-cat-row">
            <Shapes size={18} />
            <span className="mobile-cat-count">{totalCount}</span>
          </div>
          <span>{t.basicShapes}</span>
        </button>

        {isHouse && (
          <button
            type="button"
            className={`mobile-basic-shapes-btn modular-mobile-btn ${
              menuOpen && activeTab === 'modular' ? 'active' : ''
            }`}
            onClick={() => {
              if (menuOpen && activeTab === 'modular') setMenuOpen(false);
              else {
                setActiveTab('modular');
                setMenuOpen(true);
              }
            }}
          >
            <div className="mobile-cat-row">
              <Building2 size={18} />
              <span className="mobile-cat-count">
                {MODULAR_CONSTRUCTION_CATALOG.length}
              </span>
            </div>
            <span>{t.modularKitTab}</span>
          </button>
        )}

        <button
          type="button"
          className="mobile-spawn-btn recent-mobile-btn"
          onClick={() => onSpawn(recentKind)}
        >
          <PrimitiveShapePreview kind={recentKind} size={25} />
          <span className="truncate-mobile-label">+ {recentMeta.label}</span>
        </button>

        <div className="mobile-bar-sep" />

        <button
          type="button"
          className={`mobile-drawer-btn ${drawerOpen ? 'active' : ''}`}
          onClick={onToggleDrawer}
        >
          <div className="drawer-icon-badge">
            <SlidersHorizontal size={19} />
            <span className="obj-count-pill">{objectCount}</span>
          </div>
          <span>{t.properties}</span>
        </button>
      </nav>

      <CatalogDrawer
        open={menuOpen}
        initialTab={activeTab}
        studioMode={studioMode}
        language={language}
        recentKind={recentKind}
        customAssets={customAssets}
        onClose={() => setMenuOpen(false)}
        onSpawnShape={handleSpawnShape}
        onSpawnModularItem={onSpawnModularItem}
        onSpawnCustomAsset={onSpawnCustomAsset}
        onEditCustomAsset={onEditCustomAsset}
        onDeleteCustomAsset={onDeleteCustomAsset}
        onExportAssetsPack={onExportAssetsPack}
        onImportAssetsPackFile={onImportAssetsPackFile}
      />
    </>
  );
};
