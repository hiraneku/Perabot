import React, { useRef, useState } from 'react';
import { DoorOpen, Eye, Ghost, Lightbulb, Move } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  BuildingFloorLayer,
  WalkthroughInteractPrompt,
} from '../types/studio';

interface WalkthroughOverlayProps {
  active: boolean;
  language: AppLanguage;
  floors?: BuildingFloorLayer[];
  walkPrompt?: WalkthroughInteractPrompt | null;
  ghostMode?: boolean;
  eyeHeight?: number;
  onJoystickChange: (x: number, y: number) => void;
  onLookVelocityChange?: (yawRate: number, pitchRate: number) => void;
  onToggleGhostMode?: (enabled: boolean) => void;
  onChangeEyeHeight?: (meters: number) => void;
  onTeleportToFloor?: (floorId: string) => void;
  onTriggerInteract?: () => void;
  onExit: () => void;
}

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  active,
  language,
  floors = [],
  walkPrompt = null,
  ghostMode = false,
  eyeHeight = 1.65,
  onJoystickChange,
  onLookVelocityChange,
  onToggleGhostMode,
  onChangeEyeHeight,
  onTeleportToFloor,
  onTriggerInteract,
  onExit,
}) => {
  const t = TRANSLATIONS[language];
  const padRef = useRef<HTMLDivElement | null>(null);
  const lookPadRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const lookDraggingRef = useRef(false);

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

  const updateLookFromPointer = (clientX: number, clientY: number) => {
    const pad = lookPadRef.current;
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
    setLookOffset({ x: dx, y: dy });
    onLookVelocityChange?.(dx / MAX_RADIUS, -dy / MAX_RADIUS);
  };

  const resetLookStick = () => {
    lookDraggingRef.current = false;
    setLookOffset({ x: 0, y: 0 });
    onLookVelocityChange?.(0, 0);
  };

  const isSeated = eyeHeight < 1.35;

  return (
    <div className="walkthrough-hud" aria-live="polite">
      <div className="walkthrough-top-banner">
        <span className="walk-live-dot" />
        <span className="walk-hint-text">{t.walkHint}</span>

        <div className="walk-top-pills">
          {onChangeEyeHeight && (
            <button
              type="button"
              className={`walk-mini-pill ${isSeated ? 'active' : ''}`}
              onClick={() => onChangeEyeHeight(isSeated ? 1.65 : 1.1)}
            >
              <Eye size={13} />
              <span>{isSeated ? t.walkEyeSeated : t.walkEyeStanding}</span>
            </button>
          )}

          {onToggleGhostMode && (
            <button
              type="button"
              className={`walk-mini-pill ${ghostMode ? 'active' : ''}`}
              onClick={() => onToggleGhostMode(!ghostMode)}
            >
              <Ghost size={13} />
              <span>{t.walkGhostModeLabel}</span>
            </button>
          )}

          {floors.length > 1 &&
            onTeleportToFloor &&
            floors.map((fl, idx) => (
              <button
                key={fl.id}
                type="button"
                className="walk-mini-pill"
                onClick={() => onTeleportToFloor(fl.id)}
              >
                Lt.{idx + 1}
              </button>
            ))}
        </div>

        <button type="button" className="walk-exit-btn" onClick={onExit}>
          {t.exitWalkthrough}
        </button>
      </div>

      {/* Interactive Door / Lamp Proximity Action Pill */}
      {walkPrompt && onTriggerInteract && (
        <button
          type="button"
          className="walk-interact-pill"
          onClick={onTriggerInteract}
        >
          {walkPrompt.kind === 'door' ? (
            <DoorOpen size={16} />
          ) : (
            <Lightbulb size={16} />
          )}
          <span>
            {walkPrompt.kind === 'door'
              ? walkPrompt.isOpenOrOn
                ? t.walkInteractCloseDoor
                : t.walkInteractOpenDoor
              : t.walkInteractToggleLight}{' '}
            — <strong>{walkPrompt.label}</strong>
          </span>
          <kbd>E</kbd>
        </button>
      )}

      {/* Left Movement Joystick */}
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

      {/* Right Look Joystick (Dual-Thumb Mobile Walkthrough) */}
      <div
        ref={lookPadRef}
        className="walk-joystick-pad right-look-pad"
        onPointerDown={(e) => {
          e.stopPropagation();
          lookDraggingRef.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          updateLookFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!lookDraggingRef.current) return;
          e.stopPropagation();
          updateLookFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          resetLookStick();
        }}
        onPointerCancel={resetLookStick}
      >
        <div
          className="walk-joystick-knob look-knob"
          style={{
            transform: `translate(${lookOffset.x}px, ${lookOffset.y}px)`,
          }}
        >
          <Move size={13} />
        </div>
      </div>
    </div>
  );
};
