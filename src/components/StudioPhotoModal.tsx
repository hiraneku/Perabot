import React, { useEffect, useState } from 'react';
import { Camera, Check, Download, Sparkles, X } from 'lucide-react';
import { StudioSnapshotOptions, ViewportShadingMode } from '../types/studio';
import { StudioStrings } from '../i18n/translations';

interface StudioPhotoModalProps {
  open: boolean;
  projectName: string;
  t: StudioStrings;
  onCapture: (options: StudioSnapshotOptions) => string;
  onClose: () => void;
  onSavedToast: (msg: string) => void;
}

export const StudioPhotoModal: React.FC<StudioPhotoModalProps> = ({
  open,
  projectName,
  t,
  onCapture,
  onClose,
  onSavedToast,
}) => {
  const [resolution, setResolution] = useState<
    '1080p' | '2k-square' | '4k-uhd'
  >('1080p');
  const [transparentBg, setTransparentBg] = useState(false);
  const [twoPointPerspective, setTwoPointPerspective] = useState(true);
  const [shadingOverride, setShadingOverride] =
    useState<ViewportShadingMode>('shaded');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      // Render fast 1080p/2k preview, and full 4k on capture/preview cleanly
      const url = onCapture({
        resolution,
        transparentBg,
        twoPointPerspective,
        shadingOverride,
      });
      setPreviewUrl(url);
    });
    return () => window.cancelAnimationFrame(id);
  }, [
    open,
    resolution,
    transparentBg,
    twoPointPerspective,
    shadingOverride,
    onCapture,
  ]);

  if (!open) return null;

  const handleDownload = () => {
    const url =
      previewUrl ||
      onCapture({
        resolution,
        transparentBg,
        twoPointPerspective,
        shadingOverride,
      });
    if (!url) return;
    const safeTitle =
      projectName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'perabot-studio';
    const resSlug =
      resolution === '4k-uhd'
        ? '3840x2160-4k'
        : resolution === '2k-square'
        ? '2048x2048'
        : '1920x1080';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle}-${resSlug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onSavedToast(t.photoCapturedToast);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card studio-photo-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-badge">
              <Camera size={17} />
            </span>
            <div>
              <h3>{t.photoModalTitle}</h3>
              <p className="modal-subtitle">{t.photoModalDesc}</p>
            </div>
          </div>
          <button
            type="button"
            className="panel-close-icon"
            onClick={onClose}
            aria-label={t.done}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={`studio-photo-preview-frame ${
            transparentBg ? 'checker-alpha' : ''
          } ${resolution === '2k-square' ? 'aspect-square' : 'aspect-wide'}`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={t.photoModalTitle}
              className="studio-photo-preview-img"
            />
          ) : null}
        </div>

        <div className="studio-photo-controls">
          <div className="studio-photo-aspect-row">
            <button
              type="button"
              className={`studio-photo-pill ${
                resolution === '1080p' ? 'active' : ''
              }`}
              onClick={() => setResolution('1080p')}
            >
              <Sparkles size={13} />
              <span>{t.photoRes1080p}</span>
            </button>
            <button
              type="button"
              className={`studio-photo-pill ${
                resolution === '2k-square' ? 'active' : ''
              }`}
              onClick={() => setResolution('2k-square')}
            >
              <Sparkles size={13} />
              <span>{t.photoRes2kSquare}</span>
            </button>
            <button
              type="button"
              className={`studio-photo-pill ${
                resolution === '4k-uhd' ? 'active' : ''
              }`}
              onClick={() => setResolution('4k-uhd')}
            >
              <Sparkles size={13} />
              <span>{t.photoRes4kLabel}</span>
            </button>
          </div>

          <div className="segmented-tabs">
            {(
              [
                { id: 'shaded', label: t.shadingModeShaded },
                { id: 'clay', label: t.shadingModeClay },
                { id: 'technical', label: t.shadingModeTech },
              ] as const
            ).map((sm) => (
              <button
                key={sm.id}
                type="button"
                className={`seg-btn ${
                  shadingOverride === sm.id ? 'active' : ''
                }`}
                onClick={() => setShadingOverride(sm.id)}
              >
                {sm.label}
              </button>
            ))}
          </div>

          <label className="studio-photo-check">
            <input
              type="checkbox"
              checked={twoPointPerspective}
              onChange={(e) => setTwoPointPerspective(e.target.checked)}
            />
            <span className="studio-photo-check-box">
              {twoPointPerspective && <Check size={12} />}
            </span>
            <span>{t.photoTwoPointLabel}</span>
          </label>

          <label className="studio-photo-check">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => setTransparentBg(e.target.checked)}
            />
            <span className="studio-photo-check-box">
              {transparentBg && <Check size={12} />}
            </span>
            <span>{t.photoTransparentBg}</span>
          </label>
        </div>

        <div className="modal-actions-row">
          <button
            type="button"
            className="studio-primary-action-btn"
            onClick={handleDownload}
          >
            <Download size={16} />
            <span>{t.photoCaptureBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
