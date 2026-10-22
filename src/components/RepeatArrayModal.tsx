import React, { useEffect, useState } from 'react';
import {
  Check,
  CircleDot,
  Grid2x2,
  MoveRight,
  Repeat,
  X,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  DEFAULT_REPEAT_ARRAY_CONFIG,
  RepeatArrayConfig,
  RepeatArrayMode,
  StudioMode,
} from '../types/studio';

interface RepeatArrayModalProps {
  open: boolean;
  language: AppLanguage;
  studioMode: StudioMode;
  onPreview: (config: RepeatArrayConfig | null) => number;
  onApply: (config: RepeatArrayConfig) => void;
  onClose: () => void;
}

export const RepeatArrayModal: React.FC<RepeatArrayModalProps> = ({
  open,
  language,
  studioMode,
  onPreview,
  onApply,
  onClose,
}) => {
  const t = TRANSLATIONS[language];
  const [config, setConfig] = useState<RepeatArrayConfig>({
    ...DEFAULT_REPEAT_ARRAY_CONFIG,
  });
  const [previewCount, setPreviewCount] = useState(0);

  useEffect(() => {
    if (!open) {
      onPreview(null);
      return;
    }
    const n = onPreview(config);
    setPreviewCount(n);
    return () => {
      onPreview(null);
    };
  }, [open, config, onPreview]);

  if (!open) return null;

  const updatePatch = (patch: Partial<RepeatArrayConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const isFlush = config.spacingMode === 'flush';

  return (
    <div
      className="floating-tool-card repeat-array-card"
      role="dialog"
      aria-label={t.repeatModalTitle}
    >
      <div className="floating-card-head">
        <div className="floating-card-title">
          <span className="floating-card-badge">
            <Repeat size={15} />
          </span>
          <div>
            <strong>{t.repeatModalTitle}</strong>
            <small>{t.repeatArrayBtn}</small>
          </div>
        </div>
        <button
          type="button"
          className="icon-close-btn"
          onClick={onClose}
          aria-label={t.cancel}
        >
          <X size={17} />
        </button>
      </div>

      {/* Mode Tabs: Linear | Grid 2D | Radial */}
      <div className="repeat-mode-tabs">
        {(
          [
            {
              id: 'linear',
              label: t.repeatModeLinear,
              icon: <MoveRight size={13} />,
            },
            {
              id: 'grid',
              label: t.repeatModeGrid,
              icon: <Grid2x2 size={13} />,
            },
            {
              id: 'radial',
              label: t.repeatModeRadial,
              icon: <CircleDot size={13} />,
            },
          ] as Array<{ id: RepeatArrayMode; label: string; icon: React.ReactNode }>
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            className={`repeat-tab-btn ${config.mode === m.id ? 'active' : ''}`}
            onClick={() => updatePatch({ mode: m.id })}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      <div className="floating-card-body">
        {config.mode === 'linear' && (
          <>
            <div className="grid-slider-row">
              <div className="grid-slider-head">
                <span>{t.repeatCountLabel}</span>
                <strong>{config.count}×</strong>
              </div>
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={config.count}
                onChange={(e) =>
                  updatePatch({ count: parseInt(e.target.value, 10) })
                }
              />
            </div>

            <div className="grid-section-label">{t.repeatDirectionLabel}</div>
            <div className="snap-sub-chips" style={{ paddingLeft: 0 }}>
              {(['+x', '-x', '+z', '-z', '+y'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  className={`sub-chip ${config.axis === dir ? 'active' : ''}`}
                  onClick={() => updatePatch({ axis: dir })}
                >
                  {dir.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="snap-sub-chips" style={{ paddingLeft: 0 }}>
              <button
                type="button"
                className={`sub-chip ${isFlush ? 'active' : ''}`}
                onClick={() => updatePatch({ spacingMode: 'flush' })}
              >
                {t.repeatSpacingFlush}
              </button>
              <button
                type="button"
                className={`sub-chip ${!isFlush ? 'active' : ''}`}
                onClick={() => updatePatch({ spacingMode: 'fixed' })}
              >
                {t.repeatSpacingFixed}
              </button>
            </div>

            {!isFlush && (
              <div className="grid-slider-row">
                <div className="grid-slider-head">
                  <span>{t.repeatDistanceLabel}</span>
                  <strong>{config.stepDistance.toFixed(2)}m</strong>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={10}
                  step={0.25}
                  value={config.stepDistance}
                  onChange={(e) =>
                    updatePatch({ stepDistance: parseFloat(e.target.value) })
                  }
                />
              </div>
            )}

            {config.axis !== '+y' && (
              <div className="grid-slider-row">
                <div className="grid-slider-head">
                  <span>ΔY</span>
                  <strong>{config.stepElevationY.toFixed(2)}m</strong>
                </div>
                <input
                  type="range"
                  min={-1.5}
                  max={1.5}
                  step={0.1}
                  value={config.stepElevationY}
                  onChange={(e) =>
                    updatePatch({ stepElevationY: parseFloat(e.target.value) })
                  }
                />
              </div>
            )}
          </>
        )}

        {config.mode === 'grid' && (
          <>
            <div className="repeat-dual-row">
              <div className="grid-slider-row">
                <div className="grid-slider-head">
                  <span>
                    {t.repeatCountLabel} ({config.count})
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={config.count}
                  onChange={(e) =>
                    updatePatch({ count: parseInt(e.target.value, 10) })
                  }
                />
              </div>
              <div className="grid-slider-row">
                <div className="grid-slider-head">
                  <span>
                    {t.repeatCountZLabel} ({config.countZ})
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={config.countZ}
                  onChange={(e) =>
                    updatePatch({ countZ: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>

            <div className="snap-sub-chips" style={{ paddingLeft: 0 }}>
              <button
                type="button"
                className={`sub-chip ${isFlush ? 'active' : ''}`}
                onClick={() => updatePatch({ spacingMode: 'flush' })}
              >
                {t.repeatSpacingFlush}
              </button>
              <button
                type="button"
                className={`sub-chip ${!isFlush ? 'active' : ''}`}
                onClick={() => updatePatch({ spacingMode: 'fixed' })}
              >
                {t.repeatSpacingFixed}
              </button>
            </div>

            {!isFlush && (
              <div className="repeat-dual-row">
                <div className="grid-slider-row">
                  <div className="grid-slider-head">
                    <span>ΔX {config.stepDistance.toFixed(1)}m</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={8}
                    step={0.25}
                    value={config.stepDistance}
                    onChange={(e) =>
                      updatePatch({ stepDistance: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="grid-slider-row">
                  <div className="grid-slider-head">
                    <span>ΔZ {config.stepDistanceZ.toFixed(1)}m</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={8}
                    step={0.25}
                    value={config.stepDistanceZ}
                    onChange={(e) =>
                      updatePatch({ stepDistanceZ: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}

        {config.mode === 'radial' && (
          <>
            <div className="grid-slider-row">
              <div className="grid-slider-head">
                <span>{t.repeatCountLabel}</span>
                <strong>{config.count}×</strong>
              </div>
              <input
                type="range"
                min={3}
                max={24}
                step={1}
                value={config.count}
                onChange={(e) =>
                  updatePatch({ count: parseInt(e.target.value, 10) })
                }
              />
            </div>

            <div className="grid-slider-row">
              <div className="grid-slider-head">
                <span>{t.repeatRadiusLabel}</span>
                <strong>{config.radius.toFixed(1)}m</strong>
              </div>
              <input
                type="range"
                min={0.5}
                max={12}
                step={0.25}
                value={config.radius}
                onChange={(e) =>
                  updatePatch({ radius: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="grid-slider-row">
              <div className="grid-slider-head">
                <span>{t.repeatAngleLabel}</span>
                <strong>{config.fullAngleDeg}°</strong>
              </div>
              <input
                type="range"
                min={90}
                max={360}
                step={15}
                value={config.fullAngleDeg}
                onChange={(e) =>
                  updatePatch({ fullAngleDeg: parseInt(e.target.value, 10) })
                }
              />
            </div>
          </>
        )}

        {/* Option Pills */}
        <div className="repeat-options-row">
          {studioMode === 'house' && (
            <button
              type="button"
              className={`sub-chip ${config.followTerrain ? 'active' : ''}`}
              onClick={() =>
                updatePatch({ followTerrain: !config.followTerrain })
              }
            >
              {t.repeatFollowTerrain}
            </button>
          )}
          <button
            type="button"
            className={`sub-chip ${config.groupResult ? 'active' : ''}`}
            onClick={() => updatePatch({ groupResult: !config.groupResult })}
          >
            {t.repeatGroupResult}
          </button>
        </div>
      </div>

      <div className="floating-card-foot">
        <button type="button" className="ghost-action-btn" onClick={onClose}>
          {t.cancel}
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={previewCount <= 0}
          onClick={() => onApply(config)}
        >
          <Check size={14} />
          <span>
            {t.repeatApplyBtn} (+{previewCount})
          </span>
        </button>
      </div>
    </div>
  );
};
