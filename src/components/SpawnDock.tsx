import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronUp,
  Info,
  Plus,
  Search,
  Shapes,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  BASIC_SHAPES_CATALOG,
  PRIMITIVE_META,
  PrimitiveMetaItem,
} from '../engine/primitives';
import { PrimitiveKind, ShapeSubcategory } from '../types/studio';
import { PrimitiveShapePreview } from './ShapeIcons';

const SHAPE_SUBCATEGORY_LABELS: Record<Exclude<ShapeSubcategory, 'all'>, string> = {
  blocks: 'Kubus & Bevel',
  wedges: 'Wedge & Atap',
  cylinders: 'Silinder, Cone & Bola',
  curved: 'Lengkung Cekung / Cembung',
};

const SUBCATEGORY_TABS: Array<{ id: ShapeSubcategory; label: string }> = [
  { id: 'all', label: 'Semua (24)' },
  { id: 'blocks', label: 'Kubus & Bevel' },
  { id: 'wedges', label: 'Wedge & Atap' },
  { id: 'cylinders', label: 'Silinder & Bola' },
  { id: 'curved', label: 'Lengkung' },
];

const LONG_PRESS_MS = 380;

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
      aria-label={`${meta.label} — Ketuk untuk tambah, tekan agak lama untuk penjelasan`}
    >
      <button
        type="button"
        className="shape-tile-info-dot"
        title={`Penjelasan ${meta.label}`}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onInspect(meta);
        }}
        aria-label={`Lihat penjelasan ${meta.label}`}
      >
        <Info size={12} />
      </button>

      <div className="basic-shape-thumb">
        <PrimitiveShapePreview kind={meta.kind} size={52} />
      </div>

      <div className="basic-shape-meta">
        <strong>{meta.label}</strong>
        <small>{meta.subtitle}</small>
      </div>
    </div>
  );
};

interface BasicShapesDrawerProps {
  open: boolean;
  recentKind: PrimitiveKind;
  onClose: () => void;
  onSpawnShape: (kind: PrimitiveKind, keepOpen?: boolean) => void;
}

const BasicShapesDrawer: React.FC<BasicShapesDrawerProps> = ({
  open,
  recentKind,
  onClose,
  onSpawnShape,
}) => {
  const [subcat, setSubcat] = useState<ShapeSubcategory>('all');
  const [query, setQuery] = useState('');
  const [inspected, setInspected] = useState<PrimitiveMetaItem | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setInspected(null);
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
        ref={panelRef}
        className="basic-shapes-panel"
        role="dialog"
        aria-label="Menu Kategori Basic Shapes"
      >
        {/* Header */}
        <div className="basic-shapes-header">
          <div className="basic-shapes-title">
            <span className="basic-shapes-badge-icon">
              <Shapes size={17} />
            </span>
            <div>
              <h3>Basic Shapes</h3>
              <p>Ketuk untuk tambah • Tekan agak lama untuk penjelasan bentuk</p>
            </div>
          </div>

          <button
            type="button"
            className="icon-close-btn"
            onClick={onClose}
            aria-label="Tutup Basic Shapes"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Subcategory Filter Bar */}
        <div className="basic-shapes-controls">
          <div className="basic-shapes-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari bentuk (mis. wedge, cylinder, concave, sphere)..."
              aria-label="Cari bentuk dasar"
            />
            {query && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setQuery('')}
                aria-label="Bersihkan pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="basic-shapes-tabs" role="tablist">
            {SUBCATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={subcat === tab.id}
                className={`basic-subcat-tab ${subcat === tab.id ? 'active' : ''}`}
                onClick={() => setSubcat(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 24 Shapes Grid */}
        <div className="basic-shapes-grid">
          {filteredShapes.length === 0 ? (
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
                onInspect={(m) => setInspected(m)}
              />
            ))
          )}
        </div>

        {/* Long-Press Shape Explanation Overlay Card */}
        {inspected && (
          <div
            className="shape-explain-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setInspected(null);
            }}
          >
            <div className="shape-explain-card" role="dialog" aria-live="polite">
              <div className="shape-explain-top">
                <div className="shape-explain-thumb-lg">
                  <PrimitiveShapePreview kind={inspected.kind} size={82} />
                </div>
                <div className="shape-explain-heading">
                  <span className="shape-explain-cat">
                    {SHAPE_SUBCATEGORY_LABELS[inspected.subcategory]}
                  </span>
                  <h4>{inspected.label}</h4>
                  <span className="shape-explain-sub">{inspected.subtitle}</span>
                </div>
                <button
                  type="button"
                  className="icon-close-btn"
                  onClick={() => setInspected(null)}
                  aria-label="Tutup penjelasan"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="shape-explain-desc">{inspected.description}</p>

              <div className="shape-explain-actions">
                <button
                  type="button"
                  className="shape-explain-secondary"
                  onClick={() => setInspected(null)}
                >
                  Kembali
                </button>
                <button
                  type="button"
                  className="shape-explain-primary"
                  onClick={() => {
                    onSpawnShape(inspected.kind, false);
                    setInspected(null);
                  }}
                >
                  <Plus size={15} />
                  <span>Tambahkan {inspected.label}</span>
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
  onSpawn: (kind: PrimitiveKind) => void;
}

export const DesktopSpawnDock: React.FC<SpawnDockProps> = ({ onSpawn }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentKind, setRecentKind] = useState<PrimitiveKind>('cube');

  const handleSpawnFromCatalog = (kind: PrimitiveKind, keepOpen = false) => {
    setRecentKind(kind);
    onSpawn(kind);
    if (!keepOpen) {
      setMenuOpen(false);
    }
  };

  const recentMeta = PRIMITIVE_META[recentKind];

  return (
    <>
      <div className="desktop-spawn-dock" role="toolbar" aria-label="Kategori Basic Shapes">
        <button
          type="button"
          className={`spawn-category-trigger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          title="Buka menu kategori Basic Shapes (24 Bentuk 3D)"
        >
          <span className="spawn-cat-icon-wrap">
            <Shapes size={20} />
          </span>
          <span className="spawn-card-text">
            <strong>Basic Shapes</strong>
            <small>24 Bentuk • Tekan lama info</small>
          </span>
          <span className="spawn-cat-pill">24</span>
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
          title={`Tambah cepat bentuk terakhir: ${recentMeta.label}`}
        >
          <span className="spawn-icon-wrap">
            <PrimitiveShapePreview kind={recentKind} size={28} />
          </span>
          <span className="spawn-card-text">
            <strong>+ {recentMeta.label}</strong>
            <small>Terakhir dipakai</small>
          </span>
        </button>
      </div>

      <BasicShapesDrawer
        open={menuOpen}
        recentKind={recentKind}
        onClose={() => setMenuOpen(false)}
        onSpawnShape={handleSpawnFromCatalog}
      />
    </>
  );
};

interface MobileBottomBarProps {
  onSpawn: (kind: PrimitiveKind) => void;
  objectCount: number;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  onSpawn,
  objectCount,
  drawerOpen,
  onToggleDrawer,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentKind, setRecentKind] = useState<PrimitiveKind>('cube');

  const handleSpawnFromCatalog = (kind: PrimitiveKind, keepOpen = false) => {
    setRecentKind(kind);
    onSpawn(kind);
    if (!keepOpen) {
      setMenuOpen(false);
    }
  };

  const recentMeta = PRIMITIVE_META[recentKind];

  return (
    <>
      <nav className="mobile-bottom-bar" aria-label="Basic Shapes & Properti">
        <button
          type="button"
          className={`mobile-basic-shapes-btn ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <div className="mobile-cat-row">
            <Shapes size={18} />
            <span className="mobile-cat-count">24</span>
          </div>
          <span>Basic Shapes</span>
        </button>

        <button
          type="button"
          className="mobile-spawn-btn recent-mobile-btn"
          onClick={() => onSpawn(recentKind)}
          title={`Tambah cepat ${recentMeta.label}`}
        >
          <PrimitiveShapePreview kind={recentKind} size={24} />
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
          <span>Properti</span>
        </button>
      </nav>

      <BasicShapesDrawer
        open={menuOpen}
        recentKind={recentKind}
        onClose={() => setMenuOpen(false)}
        onSpawnShape={handleSpawnFromCatalog}
      />
    </>
  );
};
