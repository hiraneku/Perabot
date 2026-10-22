import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronUp,
  Home,
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
  HOUSE_PRESETS_CATALOG,
  HousePresetItem,
} from '../engine/housePresets';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  CustomAssetRecord,
  HousePresetCategory,
  PrimitiveKind,
  ShapeSubcategory,
  StudioMode,
} from '../types/studio';
import { HousePresetPreview, PrimitiveShapePreview } from './ShapeIcons';

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

function getPresetLabel(p: HousePresetItem, lang: AppLanguage): string {
  return p.title[lang];
}

function getPresetSub(p: HousePresetItem, lang: AppLanguage): string {
  return p.subtitle[lang];
}

function getPresetDesc(p: HousePresetItem, lang: AppLanguage): string {
  return p.description[lang];
}

/* =========================================================
   Basic Shape Tile (HiDPI 60px crisp preview + long press)
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
        <PrimitiveShapePreview kind={meta.kind} size={60} />
      </div>

      <div className="basic-shape-meta">
        <strong>{meta.label}</strong>
        <small>{meta.subtitle}</small>
      </div>
    </div>
  );
};

/* =========================================================
   House Preset Tile (HiDPI 66px crisp preview + long press)
   ========================================================= */
interface HousePresetTileProps {
  preset: HousePresetItem;
  language: AppLanguage;
  isRecent: boolean;
  onQuickSpawn: (preset: HousePresetItem) => void;
  onInspect: (preset: HousePresetItem) => void;
}

const HousePresetTile: React.FC<HousePresetTileProps> = ({
  preset,
  language,
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
      onInspect(preset);
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
      onQuickSpawn(preset);
    }
  };

  const title = getPresetLabel(preset, language);
  const sub = getPresetSub(preset, language);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`basic-shape-tile house-preset-tile ${pressing ? 'pressing' : ''} ${
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
        onInspect(preset);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onQuickSpawn(preset);
        }
      }}
    >
      <button
        type="button"
        className="shape-tile-info-dot"
        title={`Info ${title}`}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onInspect(preset);
        }}
      >
        <Info size={12} />
      </button>

      <div className="basic-shape-thumb">
        <HousePresetPreview presetId={preset.id} size={64} />
      </div>

      <div className="basic-shape-meta">
        <strong>{title}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
};

/* =========================================================
   Unified Catalog Drawer (Supports Both Basic Shapes & House Presets)
   ========================================================= */
interface CatalogDrawerProps {
  open: boolean;
  studioMode: StudioMode;
  language: AppLanguage;
  recentKind: PrimitiveKind;
  recentPresetId: string;
  customAssets: CustomAssetRecord[];
  onClose: () => void;
  onSpawnShape: (kind: PrimitiveKind, keepOpen?: boolean) => void;
  onSpawnHousePreset: (preset: HousePresetItem, keepOpen?: boolean) => void;
  onSpawnCustomAsset: (asset: CustomAssetRecord) => void;
  onDeleteCustomAsset?: (id: string) => void;
}

const CatalogDrawer: React.FC<CatalogDrawerProps> = ({
  open,
  studioMode,
  language,
  recentKind,
  recentPresetId,
  customAssets,
  onClose,
  onSpawnShape,
  onSpawnHousePreset,
  onSpawnCustomAsset,
  onDeleteCustomAsset,
}) => {
  const t = TRANSLATIONS[language];
  const [catalogView, setCatalogView] = useState<'shapes' | 'house'>(
    studioMode === 'house' ? 'house' : 'shapes'
  );
  const [subcat, setSubcat] = useState<ShapeSubcategory>('all');
  const [houseCat, setHouseCat] = useState<HousePresetCategory>('all');
  const [query, setQuery] = useState('');
  const [inspectedShape, setInspectedShape] = useState<PrimitiveMetaItem | null>(
    null
  );
  const [inspectedPreset, setInspectedPreset] = useState<HousePresetItem | null>(
    null
  );

  useEffect(() => {
    setCatalogView(studioMode === 'house' ? 'house' : 'shapes');
  }, [studioMode]);

  useEffect(() => {
    if (!open) {
      setInspectedShape(null);
      setInspectedPreset(null);
    }
  }, [open]);

  const houseCategoryTabs: Array<{ id: HousePresetCategory; label: string }> = [
    { id: 'all', label: `${t.catAll} (${HOUSE_PRESETS_CATALOG.length})` },
    { id: 'walls', label: t.catWalls },
    { id: 'floors', label: t.catFloors },
    { id: 'roofs', label: t.catRoofs },
    { id: 'openings', label: t.catOpenings },
    { id: 'furniture', label: t.catFurniture },
    { id: 'lighting', label: t.catLighting },
    { id: 'custom', label: `★ ${t.catCustom} (${customAssets.length})` },
  ];

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

  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HOUSE_PRESETS_CATALOG.filter((p) => {
      if (houseCat !== 'all' && houseCat !== 'custom' && p.category !== houseCat) {
        return false;
      }
      if (!q) return true;
      return (
        p.title.id.toLowerCase().includes(q) ||
        p.title.en.toLowerCase().includes(q) ||
        p.title.ja.toLowerCase().includes(q) ||
        p.subtitle.id.toLowerCase().includes(q) ||
        p.subtitle.en.toLowerCase().includes(q)
      );
    });
  }, [houseCat, query]);

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
        aria-label={catalogView === 'house' ? t.housePresets : t.basicShapes}
      >
        {/* Header with frameless close button & optional House/Shapes switcher */}
        <div className="basic-shapes-header">
          <div className="basic-shapes-title">
            <span className="basic-shapes-badge-icon">
              {catalogView === 'house' ? <Home size={17} /> : <Shapes size={17} />}
            </span>
            <div>
              <h3>{catalogView === 'house' ? t.housePresets : t.basicShapes}</h3>
              <p>{catalogView === 'house' ? t.presetsHint : t.shapesHint}</p>
            </div>
          </div>

          <div className="catalog-header-right">
            <div className="catalog-mode-switch">
              <button
                type="button"
                className={`cat-switch-pill ${catalogView === 'house' ? 'active' : ''}`}
                onClick={() => setCatalogView('house')}
              >
                <Home size={13} />
                <span>{t.housePresets}</span>
              </button>
              <button
                type="button"
                className={`cat-switch-pill ${catalogView === 'shapes' ? 'active' : ''}`}
                onClick={() => setCatalogView('shapes')}
              >
                <Shapes size={13} />
                <span>{t.basicShapes}</span>
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

        {/* Search & Category Filter Bar */}
        <div className="basic-shapes-controls">
          <div className="basic-shapes-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                catalogView === 'house' ? t.searchPresets : t.searchShapes
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

          <div className="basic-shapes-tabs" role="tablist">
            {catalogView === 'house'
              ? houseCategoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={houseCat === tab.id}
                    className={`basic-subcat-tab ${
                      houseCat === tab.id ? 'active' : ''
                    }`}
                    onClick={() => setHouseCat(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))
              : SUBCATEGORY_TABS.map((tab) => (
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
          ) : houseCat === 'custom' ? (
            customAssets.length === 0 ? (
              <div className="basic-shapes-empty">
                <Sparkles size={22} />
                <strong>{t.emptyAssetsTitle}</strong>
                <span>{t.emptyAssetsDesc}</span>
              </div>
            ) : (
              customAssets.map((asset) => (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  className="basic-shape-tile house-preset-tile"
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
                        style={{ width: 64, height: 64 }}
                      />
                    ) : (
                      <Sparkles size={26} />
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
            )
          ) : filteredPresets.length === 0 ? (
            <div className="basic-shapes-empty">
              Tidak ditemukan untuk "{query}".
            </div>
          ) : (
            <>
              {/* Show user's saved Custom Assets first when viewing 'all' */}
              {houseCat === 'all' &&
                !query &&
                customAssets.map((asset) => (
                  <div
                    key={asset.id}
                    role="button"
                    tabIndex={0}
                    className="basic-shape-tile house-preset-tile custom-highlight"
                    onClick={() => {
                      onSpawnCustomAsset(asset);
                      onClose();
                    }}
                  >
                    <span className="custom-star-tag">★</span>
                    <div className="basic-shape-thumb">
                      {asset.thumbnailDataUrl ? (
                        <img
                          src={asset.thumbnailDataUrl}
                          alt={asset.name}
                          className="primitive-3d-thumb"
                          style={{ width: 64, height: 64 }}
                        />
                      ) : (
                        <Sparkles size={26} />
                      )}
                    </div>
                    <div className="basic-shape-meta">
                      <strong>{asset.name}</strong>
                      <small>{t.catCustom}</small>
                    </div>
                  </div>
                ))}

              {filteredPresets.map((preset) => (
                <HousePresetTile
                  key={preset.id}
                  preset={preset}
                  language={language}
                  isRecent={preset.id === recentPresetId}
                  onQuickSpawn={(p) => onSpawnHousePreset(p, false)}
                  onInspect={(p) => setInspectedPreset(p)}
                />
              ))}
            </>
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
                  <PrimitiveShapePreview kind={inspectedShape.kind} size={86} />
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
                  <span>+ {inspectedShape.label}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Long-Press House Preset Explanation Card */}
        {inspectedPreset && (
          <div
            className="shape-explain-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setInspectedPreset(null);
            }}
          >
            <div className="shape-explain-card" role="dialog" aria-live="polite">
              <div className="shape-explain-top">
                <div className="shape-explain-thumb-lg">
                  <HousePresetPreview presetId={inspectedPreset.id} size={88} />
                </div>
                <div className="shape-explain-heading">
                  <span className="shape-explain-cat">{t.housePresets}</span>
                  <h4>{getPresetLabel(inspectedPreset, language)}</h4>
                  <span className="shape-explain-sub">
                    {getPresetSub(inspectedPreset, language)}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-close-btn"
                  onClick={() => setInspectedPreset(null)}
                  aria-label={t.done}
                >
                  <X size={17} />
                </button>
              </div>

              <p className="shape-explain-desc">
                {getPresetDesc(inspectedPreset, language)}
              </p>

              <div className="shape-explain-actions">
                <button
                  type="button"
                  className="shape-explain-secondary"
                  onClick={() => setInspectedPreset(null)}
                >
                  {t.done}
                </button>
                <button
                  type="button"
                  className="shape-explain-primary"
                  onClick={() => {
                    onSpawnHousePreset(inspectedPreset, false);
                    setInspectedPreset(null);
                  }}
                >
                  <Plus size={15} />
                  <span>+ {getPresetLabel(inspectedPreset, language)}</span>
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
  onSpawnHousePreset: (preset: HousePresetItem) => void;
  onSpawnCustomAsset: (asset: CustomAssetRecord) => void;
  onDeleteCustomAsset?: (id: string) => void;
}

export const DesktopSpawnDock: React.FC<SpawnDockProps> = ({
  studioMode,
  language,
  customAssets,
  onSpawn,
  onSpawnHousePreset,
  onSpawnCustomAsset,
  onDeleteCustomAsset,
}) => {
  const t = TRANSLATIONS[language];
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentKind, setRecentKind] = useState<PrimitiveKind>('cube');
  const [recentPresetId, setRecentPresetId] = useState<string>(
    HOUSE_PRESETS_CATALOG[0].id
  );

  const handleSpawnShape = (kind: PrimitiveKind, keepOpen = false) => {
    setRecentKind(kind);
    onSpawn(kind);
    if (!keepOpen) setMenuOpen(false);
  };

  const handleSpawnPreset = (preset: HousePresetItem, keepOpen = false) => {
    setRecentPresetId(preset.id);
    onSpawnHousePreset(preset);
    if (!keepOpen) setMenuOpen(false);
  };

  const recentMeta = PRIMITIVE_META[recentKind];
  const recentPreset =
    HOUSE_PRESETS_CATALOG.find((p) => p.id === recentPresetId) ??
    HOUSE_PRESETS_CATALOG[0];

  const isHouse = studioMode === 'house';
  const totalCount = isHouse
    ? HOUSE_PRESETS_CATALOG.length + customAssets.length
    : BASIC_SHAPES_CATALOG.length;

  return (
    <>
      <div className="desktop-spawn-dock" role="toolbar">
        <button
          type="button"
          className={`spawn-category-trigger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className="spawn-cat-icon-wrap">
            {isHouse ? <Home size={20} /> : <Shapes size={20} />}
          </span>
          <span className="spawn-card-text">
            <strong>{isHouse ? t.housePresets : t.basicShapes}</strong>
            <small>{isHouse ? t.presetsHint : t.shapesHint}</small>
          </span>
          <span className="spawn-cat-pill">{totalCount}</span>
          <ChevronUp
            size={15}
            className={`spawn-cat-chevron ${menuOpen ? 'open' : ''}`}
          />
        </button>

        <div className="spawn-dock-divider" />

        {isHouse ? (
          <button
            type="button"
            className="spawn-card quick-recent-card"
            onClick={() => onSpawnHousePreset(recentPreset)}
          >
            <span className="spawn-icon-wrap">
              <HousePresetPreview presetId={recentPreset.id} size={32} />
            </span>
            <span className="spawn-card-text">
              <strong>+ {getPresetLabel(recentPreset, language)}</strong>
              <small>{t.lastUsed}</small>
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="spawn-card quick-recent-card"
            onClick={() => onSpawn(recentKind)}
          >
            <span className="spawn-icon-wrap">
              <PrimitiveShapePreview kind={recentKind} size={32} />
            </span>
            <span className="spawn-card-text">
              <strong>+ {recentMeta.label}</strong>
              <small>{t.lastUsed}</small>
            </span>
          </button>
        )}
      </div>

      <CatalogDrawer
        open={menuOpen}
        studioMode={studioMode}
        language={language}
        recentKind={recentKind}
        recentPresetId={recentPresetId}
        customAssets={customAssets}
        onClose={() => setMenuOpen(false)}
        onSpawnShape={handleSpawnShape}
        onSpawnHousePreset={handleSpawnPreset}
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
  studioMode,
  language,
  customAssets,
  onSpawn,
  onSpawnHousePreset,
  onSpawnCustomAsset,
  onDeleteCustomAsset,
  objectCount,
  drawerOpen,
  onToggleDrawer,
}) => {
  const t = TRANSLATIONS[language];
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentKind, setRecentKind] = useState<PrimitiveKind>('cube');
  const [recentPresetId, setRecentPresetId] = useState<string>(
    HOUSE_PRESETS_CATALOG[0].id
  );

  const handleSpawnShape = (kind: PrimitiveKind, keepOpen = false) => {
    setRecentKind(kind);
    onSpawn(kind);
    if (!keepOpen) setMenuOpen(false);
  };

  const handleSpawnPreset = (preset: HousePresetItem, keepOpen = false) => {
    setRecentPresetId(preset.id);
    onSpawnHousePreset(preset);
    if (!keepOpen) setMenuOpen(false);
  };

  const recentMeta = PRIMITIVE_META[recentKind];
  const recentPreset =
    HOUSE_PRESETS_CATALOG.find((p) => p.id === recentPresetId) ??
    HOUSE_PRESETS_CATALOG[0];

  const isHouse = studioMode === 'house';
  const totalCount = isHouse
    ? HOUSE_PRESETS_CATALOG.length + customAssets.length
    : BASIC_SHAPES_CATALOG.length;

  return (
    <>
      <nav className="mobile-bottom-bar">
        <button
          type="button"
          className={`mobile-basic-shapes-btn ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <div className="mobile-cat-row">
            {isHouse ? <Home size={18} /> : <Shapes size={18} />}
            <span className="mobile-cat-count">{totalCount}</span>
          </div>
          <span>{isHouse ? t.housePresets : t.basicShapes}</span>
        </button>

        {isHouse ? (
          <button
            type="button"
            className="mobile-spawn-btn recent-mobile-btn"
            onClick={() => onSpawnHousePreset(recentPreset)}
          >
            <HousePresetPreview presetId={recentPreset.id} size={28} />
            <span className="truncate-mobile-label">
              + {getPresetLabel(recentPreset, language)}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="mobile-spawn-btn recent-mobile-btn"
            onClick={() => onSpawn(recentKind)}
          >
            <PrimitiveShapePreview kind={recentKind} size={28} />
            <span className="truncate-mobile-label">+ {recentMeta.label}</span>
          </button>
        )}

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
        studioMode={studioMode}
        language={language}
        recentKind={recentKind}
        recentPresetId={recentPresetId}
        customAssets={customAssets}
        onClose={() => setMenuOpen(false)}
        onSpawnShape={handleSpawnShape}
        onSpawnHousePreset={handleSpawnPreset}
        onSpawnCustomAsset={onSpawnCustomAsset}
        onDeleteCustomAsset={onDeleteCustomAsset}
      />
    </>
  );
};
