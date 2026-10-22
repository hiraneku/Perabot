import React from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Layers,
  Grid3x3,
  Palette,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { AppLanguage } from '../types/studio';

interface HelpModalProps {
  language: AppLanguage;
  open: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  language,
  open,
  onClose,
}) => {
  if (!open) return null;
  const t = TRANSLATIONS[language];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t.helpModalTitle}
      >
        <div className="modal-header">
          <h3>{t.helpModalTitle}</h3>
          <button
            type="button"
            className="icon-close-btn"
            onClick={onClose}
            aria-label={t.done}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-grid">
          <div className="help-box">
            <div className="help-box-title">
              <Smartphone size={16} />
              <span>{t.helpCard1Title}</span>
            </div>
            <ul className="help-list">
              <li>{t.helpCard1Item1}</li>
              <li>{t.helpCard1Item2}</li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Palette size={16} />
              <span>{t.helpCard2Title}</span>
            </div>
            <ul className="help-list">
              <li>{t.helpCard2Item1}</li>
              <li>{t.helpCard2Item2}</li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Layers size={16} />
              <span>{t.helpCard3Title}</span>
            </div>
            <ul className="help-list">
              <li>{t.helpCard3Item1}</li>
              <li>{t.helpCard3Item2}</li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Grid3x3 size={16} />
              <span>{t.helpCard4Title}</span>
            </div>
            <ul className="help-list">
              <li>{t.helpCard4Item1}</li>
              <li>{t.helpCard4Item2}</li>
            </ul>
          </div>

          <div className="help-box help-box-full">
            <div className="help-box-title">
              <Monitor size={16} />
              <span>{t.helpShortcutsTitle}</span>
            </div>
            <ul className="help-list">
              <li>{t.helpShortcutsLine}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
