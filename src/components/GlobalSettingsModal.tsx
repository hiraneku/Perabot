import React from 'react';
import { Globe } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  GlobalAppSettings,
  GraphicsQuality,
  STUDIO_THEMES,
  StudioThemeId,
  UiDensity,
} from '../types/studio';

interface GlobalSettingsModalProps {
  open: boolean;
  settings: GlobalAppSettings;
  onUpdateSettings: (patch: Partial<GlobalAppSettings>) => void;
  onClose: () => void;
}

const LANGUAGE_OPTIONS: Array<{
  id: AppLanguage;
  code: string;
  label: string;
  sub: string;
}> = [
  { id: 'id', code: 'ID', label: 'Bahasa Indonesia', sub: 'Umum & santai' },
  { id: 'en', code: 'EN', label: 'English', sub: 'Everyday UI' },
  { id: 'ja', code: 'JA', label: '日本語', sub: '自然なアプリ表現' },
];

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
  open,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  if (!open) return null;
  const t = TRANSLATIONS[settings.language];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card global-settings-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="gs-title-wrap">
            <h2>{t.settingsTitle}</h2>
            <p>{t.settingsSubtitle}</p>
          </div>
          <button
            type="button"
            className="modal-close-plain"
            onClick={onClose}
            aria-label={t.done}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="gs-body">
          {/* 1. Language Switcher */}
          <div className="gs-section">
            <div className="gs-section-head">
              <Globe size={14} />
              <strong>{t.langSection}</strong>
            </div>
            <div className="gs-lang-grid">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`gs-lang-card ${
                    settings.language === opt.id ? 'active' : ''
                  }`}
                  onClick={() => onUpdateSettings({ language: opt.id })}
                >
                  <span className="gs-lang-code-badge">{opt.code}</span>
                  <span className="gs-lang-text">
                    <strong>{opt.label}</strong>
                    <small>{opt.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 5 Website Color Themes */}
          <div className="gs-section">
            <div className="gs-section-head">
              <strong>{t.themeSection}</strong>
            </div>
            <div className="gs-theme-grid">
              {STUDIO_THEMES.map((th) => {
                const active = settings.theme === th.id;
                const themeTitle = th.name[settings.language];
                return (
                  <button
                    key={th.id}
                    type="button"
                    className={`gs-theme-card ${active ? 'active' : ''}`}
                    onClick={() =>
                      onUpdateSettings({ theme: th.id as StudioThemeId })
                    }
                    title={th.desc[settings.language]}
                  >
                    <div
                      className="gs-theme-preview"
                      style={{ background: th.canvasBg }}
                    >
                      <span
                        className="gs-theme-panel-sample"
                        style={{ background: th.panelPreview }}
                      >
                        <span
                          className="gs-theme-accent-dot"
                          style={{ background: th.accentPreview }}
                        />
                      </span>
                    </div>
                    <span className="gs-theme-name">{themeTitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Graphics Quality */}
          <div className="gs-section">
            <div className="gs-section-head">
              <strong>{t.graphicsSection}</strong>
            </div>
            <div className="gs-seg-row">
              {(
                [
                  { id: 'light', label: t.gfxLight },
                  { id: 'balanced', label: t.gfxBalanced },
                  { id: 'ultra', label: t.gfxUltra },
                ] as Array<{ id: GraphicsQuality; label: string }>
              ).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  className={`gs-seg-btn ${
                    settings.graphicsQuality === q.id ? 'active' : ''
                  }`}
                  onClick={() => onUpdateSettings({ graphicsQuality: q.id })}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Camera Sensitivity & UI Density */}
          <div className="gs-two-col">
            <div className="gs-section compact">
              <div className="gs-section-head row">
                <strong>{t.orbitSpeed}</strong>
                <span className="gs-val-badge">
                  {settings.orbitSensitivity.toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                className="gs-range"
                value={settings.orbitSensitivity}
                onChange={(e) =>
                  onUpdateSettings({
                    orbitSensitivity: parseFloat(e.target.value),
                  })
                }
              />
            </div>

            <div className="gs-section compact">
              <div className="gs-section-head">
                <strong>{t.uiDensity}</strong>
              </div>
              <div className="gs-seg-row">
                {(
                  [
                    { id: 'comfortable', label: t.densityComfort },
                    { id: 'compact', label: t.densityCompact },
                  ] as Array<{ id: UiDensity; label: string }>
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`gs-seg-btn ${
                      settings.uiDensity === d.id ? 'active' : ''
                    }`}
                    onClick={() => onUpdateSettings({ uiDensity: d.id })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button type="button" className="modal-done-btn" onClick={onClose}>
          {t.done}
        </button>
      </div>
    </div>
  );
};
