import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Download, Sparkles, X } from 'lucide-react';
import {
  StudioPhotoCaptureResult,
  StudioSnapshotOptions,
  ViewportShadingMode,
} from '../types/studio';
import { StudioStrings } from '../i18n/translations';

interface StudioPhotoModalProps {
  open: boolean;
  projectName: string;
  t: StudioStrings;
  onCapture: (options: StudioSnapshotOptions) => string;
  onCaptureAsync?: (
    options: StudioSnapshotOptions
  ) => Promise<StudioPhotoCaptureResult | null>;
  onClose: () => void;
  onSavedToast: (msg: string) => void;
}

export const StudioPhotoModal: React.FC<StudioPhotoModalProps> = ({
  open,
  projectName,
  t,
  onCapture,
  onCaptureAsync,
  onClose,
  onSavedToast,
}) => {
  const [resolution, setResolution] = useState<
    '1080p' | '2k-square' | '4k-uhd'
  >('4k-uhd');
  const [transparentBg, setTransparentBg] = useState(false);
  // Default OFF so opening Studio Photo matches the exact live camera view without jumping
  const [twoPointPerspective, setTwoPointPerspective] = useState(false);
  const [shadingOverride, setShadingOverride] =
    useState<ViewportShadingMode>('shaded');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [renderedSize, setRenderedSize] = useState<{ w: number; h: number }>({
    w: 3840,
    h: 2160,
  });
  const [isRendering, setIsRendering] = useState(false);
  const prevBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsRendering(true);

    const rafId = window.requestAnimationFrame(() => {
      const opts: StudioSnapshotOptions = {
        resolution,
        transparentBg,
        twoPointPerspective,
        shadingOverride,
      };

      if (onCaptureAsync) {
        void onCaptureAsync(opts).then((res) => {
          if (cancelled || !res) {
            setIsRendering(false);
            return;
          }
          if (
            prevBlobUrlRef.current &&
            prevBlobUrlRef.current !== res.previewUrl
          ) {
            URL.revokeObjectURL(prevBlobUrlRef.current);
          }
          prevBlobUrlRef.current = res.previewUrl.startsWith('blob:')
            ? res.previewUrl
            : null;
          setPreviewUrl(res.previewUrl);
          setRenderedSize({ w: res.width, h: res.height });
          setIsRendering(false);
        });
      } else {
        const url = onCapture(opts);
        setPreviewUrl(url);
        setRenderedSize(
          resolution === '4k-uhd'
            ? { w: 3840, h: 2160 }
            : resolution === '2k-square'
            ? { w: 2048, h: 2048 }
            : { w: 1920, h: 1080 }
        );
        setIsRendering(false);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [
    open,
    resolution,
    transparentBg,
    twoPointPerspective,
    shadingOverride,
    onCapture,
    onCaptureAsync,
  ]);

  if (!open) return null;

  const handleDownload = async () => {
    const safeTitle =
      projectName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'perabot-studio';

    let downloadHref = previewUrl;
    let outW = renderedSize.w;
    let outH = renderedSize.h;
    let tempUrlToRevoke: string | null = null;

    if (!downloadHref && onCaptureAsync) {
      const fresh = await onCaptureAsync({
        resolution,
        transparentBg,
        twoPointPerspective,
        shadingOverride,
      });
      if (fresh) {
        downloadHref = fresh.previewUrl;
        outW = fresh.width;
        outH = fresh.height;
        if (fresh.previewUrl.startsWith('blob:')) {
          tempUrlToRevoke = fresh.previewUrl;
        }
      }
    } else if (!downloadHref) {
      downloadHref = onCapture({
        resolution,
        transparentBg,
        twoPointPerspective,
        shadingOverride,
      });
    }

    if (!downloadHref) return;

    const resSlug = `${outW}x${outH}${resolution === '4k-uhd' ? '-4k' : ''}`;
    const link = document.createElement('a');
    link.href = downloadHref;
    link.download = `${safeTitle}-${resSlug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (tempUrlToRevoke) {
      window.setTimeout(() => URL.revokeObjectURL(tempUrlToRevoke!), 3000);
    }
    onSavedToast(`${t.photoCapturedToast} (${outW}×${outH})`);
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
          <span className="studio-photo-res-badge">
            {t.photoRenderedResBadge}: {renderedSize.w} × {renderedSize.h} px
          </span>
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
            disabled={isRendering}
            onClick={() => void handleDownload()}
          >
            <Download size={16} />
            <span>
              {t.photoCaptureBtn} ({renderedSize.w}×{renderedSize.h})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
