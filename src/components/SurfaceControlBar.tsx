import React from 'react';
import { ArrowDownToLine, Compass, Mountain, MoveVertical } from 'lucide-react';
import { SurfaceConformMode } from '../types/studio';

interface SurfaceControlBarProps {
  visible: boolean;
  conformMode: SurfaceConformMode;
  surfaceOffset: number;
  onChangeConformMode: (mode: SurfaceConformMode) => void;
  onChangeOffset: (offset: number) => void;
  onConformNow: () => void;
}

export const SurfaceControlBar: React.FC<SurfaceControlBarProps> = ({
  visible,
  conformMode,
  surfaceOffset,
  onChangeConformMode,
  onChangeOffset,
  onConformNow,
}) => {
  if (!visible) return null;

  return (
    <div
      className="rotation-control-bar surface-control-bar"
      role="region"
      aria-label="Kontrol Surface Alignment & Terrain Conforming"
    >
      <div className="rot-bar-group">
        <span className="rot-bar-label">Mode:</span>
        <button
          type="button"
          className={`surf-mode-pill ${
            conformMode === 'align-normal' ? 'active' : ''
          }`}
          onClick={() => onChangeConformMode('align-normal')}
          title="Align to Surface Normal — Miringkan objek mengikuti kemiringan atap, dinding, kubah, atau bukit"
        >
          <Compass size={13} />
          <span>Ikuti Normal</span>
        </button>

        <button
          type="button"
          className={`surf-mode-pill ${
            conformMode === 'upright-follow' ? 'active' : ''
          }`}
          onClick={() => onChangeConformMode('upright-follow')}
          title="Surface & Terrain Follow — Objek tetap tegak vertikal mengikuti tinggi permukaan / kontur tanah"
        >
          <MoveVertical size={13} />
          <span>Tegak Kontur</span>
        </button>

        <button
          type="button"
          className={`surf-mode-pill ${
            conformMode === 'foundation-seat' ? 'active' : ''
          }`}
          onClick={() => onChangeConformMode('foundation-seat')}
          title="Terrain Conforming Fondasi — Tanam sudut terendah bangunan ke lereng bukit agar tidak melayang"
        >
          <Mountain size={13} />
          <span>Fondasi Lereng</span>
        </button>
      </div>

      <div className="rot-bar-divider" />

      <div className="rot-bar-group">
        <span className="rot-bar-label">Offset:</span>
        {[-0.05, 0, 0.05].map((off) => (
          <button
            key={off}
            type="button"
            className={`rot-snap-pill ${
              Math.abs(surfaceOffset - off) < 0.001 ? 'active' : ''
            }`}
            onClick={() => onChangeOffset(off)}
          >
            {off > 0 ? `+${off}m` : `${off}m`}
          </button>
        ))}

        <button
          type="button"
          className="surf-conform-action-btn"
          onClick={onConformNow}
          title="Turunkan & sesuaikan objek terpilih ke permukaan/terrain tepat di bawahnya"
        >
          <ArrowDownToLine size={13} />
          <span>Tempel Bawah</span>
        </button>
      </div>
    </div>
  );
};
