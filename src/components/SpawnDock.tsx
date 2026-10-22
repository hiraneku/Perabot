import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes,
  ChevronUp,
  FileUp,
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
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  CustomAssetRecord,
  PrimitiveKind,
  ShapeSubcategory,
  StudioMode,
} from '../types/studio';
import { PrimitiveShapePreview } from './ShapeIcons';

const SHAPE_SUBCATEGORY_LABELS: Record<Exclude<ShapeSubcategory, 'all'>, string> = {
  blocks: 'Balok, Pelat & Sambungan',
  'prisms-pyramids': 'Prisma & Limas',
  wedges: 'Wedge, Tangga & Atap',
  cylinders: 'Silinder, Pipa & Kubah',
  curved: 'Lengkung Cekung / Cembung',
  architecture: 'Arsitektur, Kolom & Kusen',
};

const SUBCATEGORY_TABS: Array<{ id: ShapeSubcategory; label: string }> = [
  { id: 'all', label: `Semua (${BASIC_SHAPES_CATALOG.length})` },
  { id: 'blocks', label: 'Balok & Pelat' },
  { id: 'prisms-pyramids', label: 'Prisma & Limas' },
  { id: 'wedges', label: 'Wedge & Tangga' },
  { id: 'cylinders', label: 'Silinder & Kubah' },
  { id: 'curved', label: 'Lengkung' },
  { id: 'architecture', label: 'Arsitektur & Kusen' },
];

const LONG_PRESS_MS = 380;

/* =========================================================
   Basic Shape Tile (Properly framed 48px inside 58px frame + long press)
   ========================================================= */
interface ShapeTileProps {
  meta: PrimitiveMetaItem;
  isRecent: boolean;
  onQuickSpawn: (kind: PrimitiveKind) => void;
  onInspect: (meta: PrimitiveMetaItem) => void;
}

const BasicShapeTile: React.FC<ShapeTileProps> = ({
  meta,
  isRecent,
  onQuickSpawn,
  onInspect,
}) => {
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
        title={`Info ${meta.label}`}
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
        <strong>{meta.label}</strong>
        <small>{meta.subtitle}</small>
      </div>
    </div>
  );
};

/* =========================================================
   Catalog Drawer (75 Basic Shapes + User Custom Assets + 3D File Import)
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
  onTriggerImport3D: () => void;
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
  onTriggerImport3D,
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
      return (
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.kind.toLowerCase().includes(q)
      );
    });
  }, [subcat, query]);

  const filteredCustom = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customAssets;
    return customAssets.filter((a) => a.name.toLowerCase().includes(q));
  }, [customAssets, query]);

  if (!open) return null;

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
        {/* Header with frameless close button + Shapes / Custom Assets / Import 3D */}
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
              className="catalog-import-btn"
              onClick={() => {
                onClose();
                onTriggerImport3D();
              }}
              title={t.import3DHint}
            >
              <FileUp size={14} />
              <span>{t.import3DBtn}</span>
            </button>

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
              placeholder={t.searchShapes}
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
              {SUBCATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={subcat === tab.id}
                  className={`basic-subcat-tab ${
                    subcat === tab.id ? 'active' : ''
                  }`}
                  onClick={() => setSubcat(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid Body */}
        <div className="basic-shapes-grid">
          {catalogView === 'shapes' ? (
            filteredShapes.length === 0 ? (
              <div className="basic-shapes-empty">
                Tidak ada bentuk yang cocok dengan "{query}".
              </div>
            ) : (
              filteredShapes.map((meta) => (
                <BasicShapeTile
                  key={meta.kind}
                  meta={meta}
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
        {inspectedShape && (
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
                    {SHAPE_SUBCATEGORY_LABELS[inspectedShape.subcategory]}
                  </span>
                  <h4>{inspectedShape.label}</h4>
                  <span className="shape-explain-sub">{inspectedShape.subtitle}</span>
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

              <p className="shape-explain-desc">{inspectedShape.description}</p>

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
                  <span>{inspectedShape.label}</span>
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
  onTriggerImport3D: () => void;
}

export const DesktopSpawnDock: React.FC<SpawnDockProps> = ({
  language,
  customAssets,
  onSpawn,
  onSpawnCustomAsset,
  onDeleteCustomAsset,
  onTriggerImport3D,
}) => {
  const t = TRANSLATIONS[language];
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentKind, setRecentKind] = useState<PrimitiveKind>('cube');

  const handleSpawnShape = (kind: PrimitiveKind, keepOpen = false) => {
    setRecentKind(kind);
    onSpawn(kind);
    if (!keepOpen) setMenuOpen(false);
  };

  const recentMeta = PRIMITIVE_META[recentKind];
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

        <div className="spawn-dock-divider" />

        <button
          type="button"
          className="spawn-card dock-import-3d-btn"
          onClick={onTriggerImport3D}
          title={t.import3DHint}
        >
          <span className="spawn-icon-wrap import-icon-accent">
            <FileUp size={18} />
          </span>
          <span className="spawn-card-text">
            <strong>{t.import3DBtn}</strong>
            <small>.GLB / .OBJ / .STL</small>
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
        onTriggerImport3D={onTriggerImport3D}
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
  onTriggerImport3D,
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

  const recentMeta = PRIMITIVE_META[recentKind];
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

        <button
          type="button"
          className="mobile-import-3d-btn"
          onClick={onTriggerImport3D}
          title={t.import3DHint}
        >
          <FileUp size={18} />
          <span>{t.import3DBtn}</span>
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
        onTriggerImport3D={onTriggerImport3D}
      />
    </>
  );
};
