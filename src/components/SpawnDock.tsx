import React from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { PrimitiveKind } from '../types/studio';
import {
  CubeShapeIcon,
  TriangleShapeIcon,
  CylinderShapeIcon,
} from './ShapeIcons';

interface SpawnDockProps {
  onSpawn: (kind: PrimitiveKind) => void;
}

export const DesktopSpawnDock: React.FC<SpawnDockProps> = ({ onSpawn }) => {
  return (
    <div className="desktop-spawn-dock" role="toolbar" aria-label="Tambah Bentuk 3D">
      <div className="spawn-dock-caption">
        <Plus size={14} />
        <span>Tambah</span>
      </div>

      <button
        type="button"
        className="spawn-card"
        onClick={() => onSpawn('cube')}
        title="Spawn Kubus 3D di Scene (Angka 1 / Shift+1)"
      >
        <span className="spawn-icon-wrap">
          <CubeShapeIcon size={28} />
        </span>
        <span className="spawn-card-text">
          <strong>Kubus</strong>
          <small>Balok & dinding</small>
        </span>
      </button>

      <button
        type="button"
        className="spawn-card"
        onClick={() => onSpawn('triangle')}
        title="Spawn Segitiga / Prisma Atap 3D"
      >
        <span className="spawn-icon-wrap">
          <TriangleShapeIcon size={28} />
        </span>
        <span className="spawn-card-text">
          <strong>Segitiga</strong>
          <small>Prisma & atap</small>
        </span>
      </button>

      <button
        type="button"
        className="spawn-card"
        onClick={() => onSpawn('cylinder')}
        title="Spawn Silinder 3D"
      >
        <span className="spawn-icon-wrap">
          <CylinderShapeIcon size={28} />
        </span>
        <span className="spawn-card-text">
          <strong>Silinder</strong>
          <small>Tiang & tabung</small>
        </span>
      </button>
    </div>
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
  return (
    <nav className="mobile-bottom-bar" aria-label="Tambah Bentuk & Properti">
      <button
        type="button"
        className="mobile-spawn-btn"
        onClick={() => onSpawn('cube')}
      >
        <CubeShapeIcon size={24} />
        <span>+ Kubus</span>
      </button>

      <button
        type="button"
        className="mobile-spawn-btn"
        onClick={() => onSpawn('triangle')}
      >
        <TriangleShapeIcon size={24} />
        <span>+ Segitiga</span>
      </button>

      <button
        type="button"
        className="mobile-spawn-btn"
        onClick={() => onSpawn('cylinder')}
      >
        <CylinderShapeIcon size={24} />
        <span>+ Silinder</span>
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
  );
};
