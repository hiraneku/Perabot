import React from 'react';
import {
  MousePointer2,
  RotateCw,
  Maximize2,
  Globe,
  Compass,
  ArrowDownToLine,
  Copy,
  Trash2,
  Layers,
} from 'lucide-react';
import { TransformMode, TransformSpace } from '../types/studio';
import { RgbGizmoIcon } from './ShapeIcons';

interface TransformToolbarProps {
  mode: TransformMode;
  space: TransformSpace;
  hasSelection: boolean;
  onChangeMode: (mode: TransformMode) => void;
  onToggleSpace: () => void;
  onDropToFloor: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const TransformToolbar: React.FC<TransformToolbarProps> = ({
  mode,
  space,
  hasSelection,
  onChangeMode,
  onToggleSpace,
  onDropToFloor,
  onDuplicate,
  onDelete,
}) => {
  return (
    <aside className="left-toolbar" aria-label="Alat Transformasi">
      <button
        type="button"
        className={`tool-btn ${mode === 'select' ? 'active' : ''}`}
        onClick={() => onChangeMode('select')}
        title="Pilih Objek (Q)"
      >
        <MousePointer2 size={18} />
        <span className="tool-label">Pilih</span>
      </button>

      <button
        type="button"
        className={`tool-btn ${mode === 'translate' ? 'active' : ''}`}
        onClick={() => onChangeMode('translate')}
        title="Geser dengan Panah Merah/Hijau/Biru (G)"
      >
        <RgbGizmoIcon size={19} />
        <span className="tool-label">Geser</span>
      </button>

      <button
        type="button"
        className={`tool-btn ${mode === 'rotate' ? 'active' : ''}`}
        onClick={() => onChangeMode('rotate')}
        title="Putar Objek (R)"
      >
        <RotateCw size={18} />
        <span className="tool-label">Putar</span>
      </button>

      <button
        type="button"
        className={`tool-btn ${mode === 'scale' ? 'active' : ''}`}
        onClick={() => onChangeMode('scale')}
        title="Ubah Ukuran / Skala (S)"
      >
        <Maximize2 size={17} />
        <span className="tool-label">Skala</span>
      </button>

      <button
        type="button"
        className={`tool-btn surface-tool ${mode === 'surface' ? 'active' : ''}`}
        onClick={() => onChangeMode('surface')}
        title="Surface Alignment & Terrain Conforming — Seret objek mengikuti permukaan / kemiringan (T)"
      >
        <Layers size={17} />
        <span className="tool-label">Tempel</span>
      </button>

      <div className="toolbar-sep" />

      <button
        type="button"
        className="tool-btn"
        onClick={onToggleSpace}
        title={
          space === 'world'
            ? 'Sumbu Global (Klik untuk Lokal)'
            : 'Sumbu Lokal Objek (Klik untuk Global)'
        }
      >
        {space === 'world' ? <Globe size={17} /> : <Compass size={17} />}
        <span className="tool-label">{space === 'world' ? 'Global' : 'Lokal'}</span>
      </button>

      <button
        type="button"
        className="tool-btn"
        disabled={!hasSelection}
        onClick={onDropToFloor}
        title="Turunkan & Sesuaikan ke Permukaan / Terrain di Bawahnya"
      >
        <ArrowDownToLine size={17} />
        <span className="tool-label">Conform</span>
      </button>

      <button
        type="button"
        className="tool-btn"
        disabled={!hasSelection}
        onClick={onDuplicate}
        title="Duplikat Objek (Shift+D)"
      >
        <Copy size={17} />
        <span className="tool-label">Salin</span>
      </button>

      <button
        type="button"
        className="tool-btn danger"
        disabled={!hasSelection}
        onClick={onDelete}
        title="Hapus Objek (Delete / X)"
      >
        <Trash2 size={17} />
        <span className="tool-label">Hapus</span>
      </button>
    </aside>
  );
};
