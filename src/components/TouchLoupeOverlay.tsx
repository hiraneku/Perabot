import React, { useEffect, useRef } from 'react';

interface TouchLoupeOverlayProps {
  enabled: boolean;
  active: boolean;
  clientX: number;
  clientY: number;
  getSourceCanvas: () => HTMLCanvasElement | null;
}

/**
 * Floating 2.2x Touch Precision Magnifier Loupe positioned above the user's thumb
 * so exact corner/grid/surface snapping is clearly visible on mobile touchscreens.
 */
export const TouchLoupeOverlay: React.FC<TouchLoupeOverlayProps> = ({
  enabled,
  active,
  clientX,
  clientY,
  getSourceCanvas,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled || !active) return;
    let rafId = 0;

    const renderPatch = () => {
      const dst = canvasRef.current;
      const src = getSourceCanvas();
      if (dst && src) {
        const ctx = dst.getContext('2d');
        const rect = src.getBoundingClientRect();
        if (ctx && rect.width > 0 && rect.height > 0) {
          const dprX = src.width / rect.width;
          const dprY = src.height / rect.height;
          const srcX = (clientX - rect.left) * dprX;
          const srcY = (clientY - rect.top) * dprY;

          const LOUPE_PX = 108;
          const ZOOM = 2.2;
          const sampleW = (LOUPE_PX / ZOOM) * dprX;
          const sampleH = (LOUPE_PX / ZOOM) * dprY;

          ctx.clearRect(0, 0, LOUPE_PX, LOUPE_PX);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, LOUPE_PX, LOUPE_PX);
          ctx.drawImage(
            src,
            srcX - sampleW * 0.5,
            srcY - sampleH * 0.5,
            sampleW,
            sampleH,
            0,
            0,
            LOUPE_PX,
            LOUPE_PX
          );

          // Precision Emerald Crosshair
          const mid = LOUPE_PX * 0.5;
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.92)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mid - 14, mid);
          ctx.lineTo(mid - 4, mid);
          ctx.moveTo(mid + 4, mid);
          ctx.lineTo(mid + 14, mid);
          ctx.moveTo(mid, mid - 14);
          ctx.lineTo(mid, mid - 4);
          ctx.moveTo(mid, mid + 4);
          ctx.lineTo(mid, mid + 14);
          ctx.stroke();
        }
      }
      rafId = window.requestAnimationFrame(renderPatch);
    };

    rafId = window.requestAnimationFrame(renderPatch);
    return () => window.cancelAnimationFrame(rafId);
  }, [enabled, active, clientX, clientY, getSourceCanvas]);

  if (!enabled || !active) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const clampedLeft = Math.max(64, Math.min(vw - 64, clientX));
  // Float 86px above thumb; if finger is near top bar (< 148px), place below finger instead!
  const topPos = clientY < 148 ? clientY + 76 : clientY - 88;

  return (
    <div
      className="touch-precision-loupe"
      style={{
        left: `${clampedLeft}px`,
        top: `${topPos}px`,
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} width={108} height={108} />
    </div>
  );
};
