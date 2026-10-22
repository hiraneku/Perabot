import React from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Layers,
  MinusSquare,
  Mountain,
  RotateCcw,
  SquareDashedBottom,
  Waves,
  X,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  TerrainSculptSettings,
  TerrainSculptTool,
} from '../types/studio';

interface TerrainSculptBarProps {
  open: boolean;
  language: AppLanguage;
  settings: TerrainSculptSettings;
  onUpdate: (patch: Partial<TerrainSculptSettings>) => void;
  onLevelPlotPad: () => void;
  onResetTerrain: () => void;
  onClose: () => void;
}

export const TerrainSculptBar: React.FC<TerrainSculptBarProps> = ({
  open,
  language,
  settings,
  onUpdate,
  onLevelPlotPad,
  onResetTerrain,
  onClose,
}) => {
  const t = TRANSLATIONS[language];
  if (!open) return null;

  const tools: Array<{
    id: TerrainSculptTool;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'raise', label: t.sculptRaise, icon: <ArrowUpCircle size={15} /> },
    { id: 'lower', label: t.sculptLower, icon: <ArrowDownCircle size={15} /> },
    { id: 'flatten', label: t.sculptFlatten, icon: <MinusSquare size={15} /> },
    { id: 'smooth', label: t.sculptSmooth, icon: <Waves size={15} /> },
    { id: 'terrace', label: t.sculptTerrace, icon: <Layers size={15} /> },
  ];

  return (
    <div
      className="floating-tool-card terrain-sculpt-card"
      role="region"
      aria-label={t.terrainSculptTitle}
    >
      <div className="floating-card-head">
        <div className="floating-card-title">
          <span className="floating-card-badge emerald">
            <Mountain size={15} />
          </span>
          <div>
            <strong>{t.terrainSculptTitle}</strong>
            <small>{t.sculptHint}</small>
          </div>
        </div>
        <button
          type="button"
          className="icon-close-btn"
          onClick={onClose}
          aria-label={t.done}
        >
          <X size={17} />
        </button>
      </div>

      {/* 5 Brush Buttons */}
      <div className="sculpt-brush-grid">
        {tools.map((br) => (
          <button
            key={br.id}
            type="button"
            className={`sculpt-brush-btn ${
              settings.tool === br.id ? 'active' : ''
            }`}
            onClick={() => onUpdate({ tool: br.id })}
          >
            {br.icon}
            <span>{br.label}</span>
          </button>
        ))}
      </div>

      {/* Radius & Strength Sliders */}
      <div className="sculpt-sliders-row">
        <div className="grid-slider-row">
          <div className="grid-slider-head">
            <span>{t.sculptRadius}</span>
            <strong>{settings.radius.toFixed(1)}m</strong>
          </div>
          <input
            type="range"
            min={0.6}
            max={8.0}
            step={0.2}
            value={settings.radius}
            onChange={(e) =>
              onUpdate({ radius: parseFloat(e.target.value) })
            }
          />
        </div>

        <div className="grid-slider-row">
          <div className="grid-slider-head">
            <span>{t.sculptStrength}</span>
            <strong>{Math.round(settings.strength * 100)}%</strong>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={settings.strength}
            onChange={(e) =>
              onUpdate({ strength: parseFloat(e.target.value) })
            }
          />
        </div>
      </div>

      {/* Quick Pad Leveler & Reset */}
      <div className="sculpt-quick-actions">
        <button
          type="button"
          className="sub-chip active-hover"
          onClick={onLevelPlotPad}
        >
          <SquareDashedBottom size={13} />
          <span>{t.sculptLevelPlotBtn}</span>
        </button>

        <button
          type="button"
          className="sub-chip danger-hover"
          onClick={onResetTerrain}
        >
          <RotateCcw size={13} />
          <span>{t.sculptResetFlatBtn}</span>
        </button>
      </div>
    </div>
  );
};
