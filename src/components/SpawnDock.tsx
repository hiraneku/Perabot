import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes,
  ChevronUp,
  Info,
  Plus,
  Search,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  BASIC_SHAPES_CATALOG,
  PRIMITIVE_META,
  PrimitiveMetaItem,
} from '../engine/primitives';
import {
  getLocalizedShapeMeta,
  getShapeSubcategoryLabel,
} from '../i18n/shapeTranslations';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
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
   Catalog Drawer (75 Basic Shapes + User Custom Assets)
   ========================================================= */
interface CatalogDrawerProps {
  open: boolean;
  language: AppLanguage;
  recentKind: PrimitiveKind;
  customAssets: CustomAssetRecord[];
  onClose: () => void;
  onSpawnShape: (kind: PrimitiveKind, keepOpen?: boolean) => void;
  onSpawnCustomAsset: (asset: CustomAssetRecord) => void;
  onDeleteCustomAsset?: (id: string) => void;
}

const CatalogDrawer: React.FC<CatalogDrawerProps> = ({
  open,
  language,
  recentKind,
  customAssets,
  onClose,
  onSpawnShape,
  onSpawnCustomAsset,
  onDeleteCustomAsset,
}) => {
  const t = TRANSLATIONS[language];
  const [catalogView, setCatalogView] = useState<'shapes' | 'custom'>('shapes');
  const [subcat, setSubcat] = useState<ShapeSubcategory>('all');
  const [query, setQuery] = useState('');
  const [inspectedShape, setInspectedShape] = useState<PrimitiveMetaItem | null>(
    null
  );

  useEffect(() => {
    if (!open) {
      setInspectedShape(null);
    }
  }, [open]);

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

  const filteredCustom = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customAssets;
    return customAssets.filter((a) => a.name.toLowerCase().includes(q));
  }, [customAssets, query]);

  if (!open) return null;

  const inspectedLocalized = inspectedShape
    ? getLocalizedShapeMeta(inspectedShape, language)
    : null;

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
        aria-label={catalogView === 'custom' ? t.catCustom : t.basicShapes}
      >
        <div className="basic-shapes-header">
          <div className="basic-shapes-title">
            <span className="basic-shapes-badge-icon">
              {catalogView === 'custom' ? <Boxes size={17} /> : <Shapes size={17} />}
            </span>
            <div>
              <h3>{catalogView === 'custom' ? t.catCustom : t.basicShapes}</h3>
              <p>{t.shapesHint}</p>
            </div>
          </div>

          <div className="catalog-header-right">
            <div className="catalog-mode-switch">
              <button
                type="button"
                className={`cat-switch-pill ${catalogView === 'shapes' ? 'active' : ''}`}
                onClick={() => setCatalogView('shapes')}
              >
                <Shapes size={13} />
                <span>{t.basicShapes}</span>
              </button>
              <button
                type="button"
                className={`cat-switch-pill ${catalogView === 'custom' ? 'active' : ''}`}
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
                catalogView === 'custom' ? t.searchPresets : t.searchShapes
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
  onSpawnCustomAsset: (asset: CustomAssetRecord) => void;
  onDeleteCustomAsset?: (id: string) => void;
}

export const DesktopSpawnDock: React.FC<SpawnDockProps> = ({
  language,
  customAssets,
  onSpawn,
  onSpawnCustomAsset,
  onDeleteCustomAsset,
}) => {
  const t = TRANSLATIONS[language];
  const [menuOpen, setMenuOpen] = useState(false);
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
          className={`spawn-category-trigger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
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
            className={`spawn-cat-chevron ${menuOpen ? 'open' : ''}`}
          />
        </button>

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
        language={language}
        recentKind={recentKind}
        customAssets={customAssets}
        onClose={() => setMenuOpen(false)}
        onSpawnShape={handleSpawnShape}
        onSpawnCustomAsset={onSpawnCustomAsset}
        onDeleteCustomAsset={onDeleteCustomAsset}
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
  language,
  customAssets,
  onSpawn,
  onSpawnCustomAsset,
  onDeleteCustomAsset,
  objectCount,
  drawerOpen,
  onToggleDrawer,
}) => {
  const t = TRANSLATIONS[language];
  const [menuOpen, setMenuOpen] = useState(false);
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
          className={`mobile-basic-shapes-btn ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <div className="mobile-cat-row">
            <Shapes size={18} />
            <span className="mobile-cat-count">{totalCount}</span>
          </div>
          <span>{t.basicShapes}</span>
        </button>

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
        language={language}
        recentKind={recentKind}
        customAssets={customAssets}
        onClose={() => setMenuOpen(false)}
        onSpawnShape={handleSpawnShape}
        onSpawnCustomAsset={onSpawnCustomAsset}
        onDeleteCustomAsset={onDeleteCustomAsset}
      />
    </>
  );
};
