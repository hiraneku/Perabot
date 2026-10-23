import React, { useEffect, useRef } from 'react';

interface TouchLoupeOverlayProps {
  enabled: boolean;
  active: boolean;
  clientX: number;
  clientY: number;
  targetX?: number;
  targetY?: number;
  snapped?: boolean;
  label?: string | null;
  getSourceCanvas: () => HTMLCanvasElement | null;
}

/**
 * Floating 2.8x Retina Touch Precision Magnifier Loupe locked onto the exact 3D snapped
 * target point (`targetX`, `targetY`) while floating safely clear of the user's thumb and HUD bars.
 */
export const TouchLoupeOverlay: React.FC<TouchLoupeOverlayProps> = ({
  enabled,
  active,
  clientX,
  clientY,
  targetX,
  targetY,
  snapped = false,
  label = null,
  getSourceCanvas,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const focusX = targetX !== undefined && targetX > 0 ? targetX : clientX;
  const focusY = targetY !== undefined && targetY > 0 ? targetY : clientY;

  useEffect(() => {
    if (!enabled || !active) return;
    let rafId = 0;

    const LOUPE_CSS_PX = 118;
    const ZOOM = 2.8;

    const renderPatch = () => {
      const dst = canvasRef.current;
      const src = getSourceCanvas();
      if (dst && src) {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const bufPx = Math.round(LOUPE_CSS_PX * dpr);
        if (dst.width !== bufPx || dst.height !== bufPx) {
          dst.width = bufPx;
          dst.height = bufPx;
        }

        const ctx = dst.getContext('2d');
        const rect = src.getBoundingClientRect();
        if (ctx && rect.width > 0 && rect.height > 0) {
          const dprX = src.width / rect.width;
          const dprY = src.height / rect.height;
          const srcX = (focusX - rect.left) * dprX;
          const srcY = (focusY - rect.top) * dprY;

          const sampleW = (LOUPE_CSS_PX / ZOOM) * dprX;
          const sampleH = (LOUPE_CSS_PX / ZOOM) * dprY;

          ctx.save();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, bufPx, bufPx);
          ctx.drawImage(
            src,
            srcX - sampleW * 0.5,
            srcY - sampleH * 0.5,
            sampleW,
            sampleH,
            0,
            0,
            bufPx,
            bufPx
          );

          // Precision Retina Crosshair & Magnetic Lock Reticle
          const mid = bufPx * 0.5;
          const accent = snapped
            ? 'rgba(16, 185, 129, 0.96)'
            : 'rgba(56, 189, 248, 0.92)';

          ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
          ctx.lineWidth = 3.2 * dpr;
          ctx.beginPath();
          ctx.moveTo(mid - 16 * dpr, mid);
          ctx.lineTo(mid - 4.5 * dpr, mid);
          ctx.moveTo(mid + 4.5 * dpr, mid);
          ctx.lineTo(mid + 16 * dpr, mid);
          ctx.moveTo(mid, mid - 16 * dpr);
          ctx.lineTo(mid, mid - 4.5 * dpr);
          ctx.moveTo(mid, mid + 4.5 * dpr);
          ctx.lineTo(mid, mid + 16 * dpr);
          ctx.stroke();

          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.6 * dpr;
          ctx.beginPath();
          ctx.moveTo(mid - 16 * dpr, mid);
          ctx.lineTo(mid - 4.5 * dpr, mid);
          ctx.moveTo(mid + 4.5 * dpr, mid);
          ctx.lineTo(mid + 16 * dpr, mid);
          ctx.moveTo(mid, mid - 16 * dpr);
          ctx.lineTo(mid, mid - 4.5 * dpr);
          ctx.moveTo(mid, mid + 4.5 * dpr);
          ctx.lineTo(mid, mid + 16 * dpr);
          ctx.stroke();

          // Center target ring (tightens & glows emerald when locked onto an endpoint!)
          ctx.beginPath();
          ctx.arc(mid, mid, (snapped ? 5.5 : 3.5) * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = accent;
          ctx.lineWidth = (snapped ? 2.0 : 1.3) * dpr;
          ctx.stroke();
          ctx.restore();
        }
      }
      rafId = window.requestAnimationFrame(renderPatch);
    };

    rafId = window.requestAnimationFrame(renderPatch);
    return () => window.cancelAnimationFrame(rafId);
  }, [enabled, active, focusX, focusY, snapped, getSourceCanvas]);

  if (!enabled || !active) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 760;
  const clampedLeft = Math.max(76, Math.min(vw - 70, focusX));
  const minSafeTopY = Math.min(clientY, focusY);
  const maxSafeBotY = Math.max(clientY, focusY);
  // Float 98px above finger/target; if near top HUD (< 176px), float cleanly below instead!
  const rawTop = minSafeTopY < 176 ? maxSafeBotY + 88 : minSafeTopY - 98;
  const clampedTop = Math.max(72, Math.min(vh - 76, rawTop));

  return (
    <div
      className={`touch-precision-loupe ${snapped ? 'is-snapped' : ''}`}
      style={{
        left: `${clampedLeft}px`,
        top: `${clampedTop}px`,
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} width={236} height={236} />
      {label && <span className="touch-loupe-tag">{label}</span>}
    </div>
  );
};
