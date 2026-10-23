import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, RotateCw, Sparkles, Trash2, X } from 'lucide-react';
import {
  cloneCustomProfileData,
  PROFILE_STARTER_TEMPLATES,
} from '../engine/CustomProfileEngine';
import { StudioStrings } from '../i18n/translations';
import { AppLanguage, CustomProfileData } from '../types/studio';

interface CustomProfileModalProps {
  open: boolean;
  language: AppLanguage;
  t: StudioStrings;
  initialProfile?: CustomProfileData | null;
  initialName?: string;
  isUpdatingExisting?: boolean;
  onApply: (profile: CustomProfileData, customName?: string) => void;
  onClose: () => void;
}

export const CustomProfileModal: React.FC<CustomProfileModalProps> = ({
  open,
  language,
  t,
  initialProfile,
  initialName = '',
  isUpdatingExisting = false,
  onApply,
  onClose,
}) => {
  const [profile, setProfile] = useState<CustomProfileData>(() =>
    initialProfile
      ? cloneCustomProfileData(initialProfile)
      : cloneCustomProfileData(PROFILE_STARTER_TEMPLATES[0].data)
  );
  const [nameDraft, setNameDraft] = useState(initialName);
  const [selectedPtIdx, setSelectedPtIdx] = useState<number>(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragIdxRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setProfile(
      initialProfile
        ? cloneCustomProfileData(initialProfile)
        : cloneCustomProfileData(PROFILE_STARTER_TEMPLATES[0].data)
    );
    setNameDraft(initialName);
    setSelectedPtIdx(0);
  }, [open, initialProfile, initialName]);

  if (!open) return null;

  const VIEW_SIZE = 280;
  const PAD = 24;
  const INNER = VIEW_SIZE - PAD * 2;

  // Map normalized profile coords (x in [-0.5..0.5], y in [-0.5..0.5]) <-> SVG px
  const toSvg = (px: number, py: number): { sx: number; sy: number } => ({
    sx: PAD + (px + 0.5) * INNER,
    sy: PAD + (0.5 - py) * INNER,
  });

  const fromSvg = (sx: number, sy: number): { x: number; y: number } => {
    const rawX = (sx - PAD) / INNER - 0.5;
    const rawY = 0.5 - (sy - PAD) / INNER;
    const clampedX =
      profile.mode === 'lathe'
        ? Math.max(0.01, Math.min(0.5, rawX))
        : Math.max(-0.5, Math.min(0.5, rawX));
    const clampedY = Math.max(-0.5, Math.min(0.5, rawY));
    return {
      x: Math.round(clampedX * 1000) / 1000,
      y: Math.round(clampedY * 1000) / 1000,
    };
  };

  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { sx: VIEW_SIZE * 0.5, sy: VIEW_SIZE * 0.5 };
    const rect = svg.getBoundingClientRect();
    return {
      sx: ((clientX - rect.left) / Math.max(1, rect.width)) * VIEW_SIZE,
      sy: ((clientY - rect.top) / Math.max(1, rect.height)) * VIEW_SIZE,
    };
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).getAttribute('data-node-idx') !== null) return;
    const { sx, sy } = clientToSvg(e.clientX, e.clientY);
    const pt = fromSvg(sx, sy);

    // Insert point at best segment position
    setProfile((prev) => {
      const pts = [...prev.points];
      if (prev.mode === 'lathe') {
        pts.push(pt);
        pts.sort((a, b) => a.y - b.y);
        const insertedIdx = pts.indexOf(pt);
        setSelectedPtIdx(Math.max(0, insertedIdx));
      } else {
        // Insert along closest polygon edge
        let bestEdge = pts.length - 1;
        let bestDist = Infinity;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          const mx = (a.x + b.x) * 0.5;
          const my = (a.y + b.y) * 0.5;
          const d = Math.hypot(pt.x - mx, pt.y - my);
          if (d < bestDist) {
            bestDist = d;
            bestEdge = i;
          }
        }
        pts.splice(bestEdge + 1, 0, pt);
        setSelectedPtIdx(bestEdge + 1);
      }
      return { ...prev, points: pts };
    });
  };

  const handleNodePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const idx = dragIdxRef.current;
    if (idx === null) return;
    const { sx, sy } = clientToSvg(e.clientX, e.clientY);
    const nextPt = fromSvg(sx, sy);
    setProfile((prev) => {
      if (idx < 0 || idx >= prev.points.length) return prev;
      const pts = prev.points.map((p, i) => (i === idx ? nextPt : p));
      return { ...prev, points: pts };
    });
  };

  const deletePointAt = (idx: number) => {
    const minPts = profile.mode === 'lathe' ? 2 : 3;
    if (profile.points.length <= minPts) return;
    setProfile((prev) => ({
      ...prev,
      points: prev.points.filter((_, i) => i !== idx),
    }));
    setSelectedPtIdx(0);
  };

  const polyPointsStr = profile.points
    .map((p) => {
      const { sx, sy } = toSvg(p.x, p.y);
      return `${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(' ');

  const mirroredLathePointsStr =
    profile.mode === 'lathe'
      ? [
          ...profile.points.map((p) => toSvg(p.x, p.y)),
          ...[...profile.points].reverse().map((p) => toSvg(-p.x, p.y)),
        ]
          .map((s) => `${s.sx.toFixed(1)},${s.sy.toFixed(1)}`)
          .join(' ')
      : '';

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card custom-profile-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-badge">
              <RotateCw size={17} />
            </span>
            <div>
              <h3>{t.profileStudioTitle}</h3>
              <p className="modal-subtitle">{t.profileStudioDesc}</p>
            </div>
          </div>
          <button
            type="button"
            className="frameless-close-btn"
            onClick={onClose}
            aria-label={t.done}
          >
            <X size={18} />
          </button>
        </div>

        <div className="profile-studio-body">
          {/* Left: Interactive 2D Profile Grid Canvas */}
          <div className="profile-canvas-col">
            <div className="segmented-tabs" style={{ marginBottom: 8 }}>
              <button
                type="button"
                className={`seg-btn ${profile.mode === 'lathe' ? 'active' : ''}`}
                onClick={() =>
                  setProfile((prev) => ({
                    ...prev,
                    mode: 'lathe',
                    points: prev.points.map((p) => ({
                      x: Math.max(0.04, Math.abs(p.x)),
                      y: p.y,
                    })),
                  }))
                }
              >
                {t.profileModeLathe}
              </button>
              <button
                type="button"
                className={`seg-btn ${profile.mode === 'extrude' ? 'active' : ''}`}
                onClick={() =>
                  setProfile((prev) =>
                    prev.points.length >= 3
                      ? { ...prev, mode: 'extrude' }
                      : cloneCustomProfileData(PROFILE_STARTER_TEMPLATES[4].data)
                  )
                }
              >
                {t.profileModeExtrude}
              </button>
            </div>

            <div className="profile-svg-frame">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
                className="profile-editor-svg"
                onPointerDown={handleSvgPointerDown}
                onPointerMove={handleNodePointerMove}
                onPointerUp={() => {
                  dragIdxRef.current = null;
                }}
                onPointerCancel={() => {
                  dragIdxRef.current = null;
                }}
              >
                {/* Minor Grid */}
                {[0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9].map((g) => {
                  const pos = PAD + g * INNER;
                  return (
                    <g key={g}>
                      <line
                        x1={pos}
                        y1={PAD}
                        x2={pos}
                        y2={VIEW_SIZE - PAD}
                        stroke="rgba(148,163,184,0.12)"
                        strokeWidth={1}
                      />
                      <line
                        x1={PAD}
                        y1={pos}
                        x2={VIEW_SIZE - PAD}
                        y2={pos}
                        stroke="rgba(148,163,184,0.12)"
                        strokeWidth={1}
                      />
                    </g>
                  );
                })}

                {/* Center Axis Lines */}
                <line
                  x1={VIEW_SIZE * 0.5}
                  y1={PAD}
                  x2={VIEW_SIZE * 0.5}
                  y2={VIEW_SIZE - PAD}
                  stroke={
                    profile.mode === 'lathe'
                      ? 'rgba(56,189,248,0.65)'
                      : 'rgba(148,163,184,0.3)'
                  }
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <line
                  x1={PAD}
                  y1={VIEW_SIZE * 0.5}
                  x2={VIEW_SIZE - PAD}
                  y2={VIEW_SIZE * 0.5}
                  stroke="rgba(148,163,184,0.28)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />

                {/* Silhouette Fill */}
                {profile.mode === 'lathe' ? (
                  <>
                    <polygon
                      points={mirroredLathePointsStr}
                      fill="rgba(59, 130, 246, 0.18)"
                      stroke="rgba(59, 130, 246, 0.35)"
                      strokeWidth={1.2}
                    />
                    <polyline
                      points={polyPointsStr}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={2.6}
                    />
                  </>
                ) : (
                  <polygon
                    points={polyPointsStr}
                    fill="rgba(52, 211, 153, 0.18)"
                    stroke="#34d399"
                    strokeWidth={2.5}
                  />
                )}

                {/* Draggable Control Nodes */}
                {profile.points.map((pt, idx) => {
                  const { sx, sy } = toSvg(pt.x, pt.y);
                  const isSel = idx === selectedPtIdx;
                  return (
                    <circle
                      key={idx}
                      data-node-idx={idx}
                      cx={sx}
                      cy={sy}
                      r={isSel ? 7.5 : 6}
                      fill={isSel ? '#facc15' : '#38bdf8'}
                      stroke="#0f172a"
                      strokeWidth={2}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget as Element).setPointerCapture?.(
                          e.pointerId
                        );
                        dragIdxRef.current = idx;
                        setSelectedPtIdx(idx);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        deletePointAt(idx);
                      }}
                    />
                  );
                })}
              </svg>
            </div>
            <p className="profile-canvas-hint">{t.profileAddPointHint}</p>
          </div>

          {/* Right: Templates & Parametric Sliders */}
          <div className="profile-controls-col">
            <label className="arch-wf-field">
              <span>{t.objectNamePlaceholder}</span>
              <input
                type="text"
                className="arch-wf-input"
                placeholder={
                  profile.mode === 'lathe'
                    ? 'Profil Bubut 360°'
                    : 'Profil Extrude 3D'
                }
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
              />
            </label>

            <div className="arch-wf-field">
              <span>{t.profileTemplateLabel}</span>
              <div className="profile-template-grid">
                {PROFILE_STARTER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="pattern-chip-btn"
                    onClick={() => {
                      setProfile(cloneCustomProfileData(tpl.data));
                      if (!isUpdatingExisting) {
                        setNameDraft(tpl.label[language]);
                      }
                      setSelectedPtIdx(0);
                    }}
                  >
                    <Sparkles size={12} />
                    <span>{tpl.label[language]}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="arch-wf-checkbox-row">
              <input
                type="checkbox"
                checked={profile.smooth}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, smooth: e.target.checked }))
                }
              />
              <span>{t.profileSmoothLabel}</span>
            </label>

            <div className="slider-row">
              <div className="slider-head">
                <span>{t.profileSegmentsLabel}</span>
                <strong>{profile.segments}</strong>
              </div>
              <input
                type="range"
                min={12}
                max={64}
                step={4}
                value={profile.segments}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    segments: parseInt(e.target.value, 10),
                  }))
                }
              />
            </div>

            {profile.mode === 'lathe' ? (
              <div className="slider-row">
                <div className="slider-head">
                  <span>{t.profileHollowLabel}</span>
                  <strong>
                    {((profile.hollowThickness ?? 0) * 100).toFixed(1)}%
                  </strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.16}
                  step={0.01}
                  value={profile.hollowThickness ?? 0}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      hollowThickness: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
            ) : (
              <div className="slider-row">
                <div className="slider-head">
                  <span>{t.profileDepthLabel}</span>
                  <strong>{profile.depth.toFixed(2)} m</strong>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={2.0}
                  step={0.05}
                  value={profile.depth}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      depth: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
            )}

            <div className="profile-pt-toolbar">
              <span>
                Node #{selectedPtIdx + 1} / {profile.points.length}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="outliner-mini-btn"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      points: [...prev.points, { x: 0.25, y: 0 }],
                    }))
                  }
                >
                  <Plus size={12} />
                </button>
                <button
                  type="button"
                  className="outliner-mini-btn"
                  disabled={
                    profile.points.length <=
                    (profile.mode === 'lathe' ? 2 : 3)
                  }
                  onClick={() => deletePointAt(selectedPtIdx)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onApply(profile, nameDraft.trim() || undefined);
              onClose();
            }}
          >
            <Check size={15} />
            <span>{t.profileApplyBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
