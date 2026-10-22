import React, { useRef, useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import { AppLanguage } from '../types/studio';

interface WalkthroughOverlayProps {
  active: boolean;
  language: AppLanguage;
  onJoystickChange: (x: number, y: number) => void;
  onExit: () => void;
}

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  active,
  language,
  onJoystickChange,
  onExit,
}) => {
  const t = TRANSLATIONS[language];
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  if (!active) return null;

  const MAX_RADIUS = 38;

  const updateFromPointer = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    setKnobOffset({ x: dx, y: dy });
    onJoystickChange(dx / MAX_RADIUS, -dy / MAX_RADIUS);
  };

  const resetStick = () => {
    draggingRef.current = false;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickChange(0, 0);
  };

  return (
    <div className="walkthrough-hud" aria-live="polite">
      <div className="walkthrough-top-banner">
        <span className="walk-live-dot" />
        <span className="walk-hint-text">{t.walkHint}</span>
        <button type="button" className="walk-exit-btn" onClick={onExit}>
          {t.exitWalkthrough}
        </button>
      </div>

      <div
        ref={padRef}
        className="walk-joystick-pad"
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          e.stopPropagation();
          updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          resetStick();
        }}
        onPointerCancel={resetStick}
      >
        <div
          className="walk-joystick-knob"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        />
      </div>
    </div>
  );
};
