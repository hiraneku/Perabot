import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pipette, PaintBucket, Plus, Sparkles } from 'lucide-react';
import { MATERIAL_PRESETS, PaintInteractionMode } from '../types/studio';

// --- Color space helpers (HEX <-> RGB <-> HSV) ---
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return {
      r: Number.isFinite(r) ? r : 226,
      g: Number.isFinite(g) ? g : 232,
      b: Number.isFinite(b) ? b : 240,
    };
  }
  const num = parseInt(clean.slice(0, 6), 16);
  if (!Number.isFinite(num)) return { r: 226, g: 232, b: 240 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to2 = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function rgbToHsv(
  r: number,
  g: number,
  b: number
): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d > 1e-5) {
    if (max === rn) {
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    } else if (max === gn) {
      h = ((bn - rn) / d + 2) * 60;
    } else {
      h = ((rn - gn) / d + 4) * 60;
    }
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToRgb(
  h: number,
  s: number,
  v: number
): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh < 60) [r1, g1, b1] = [c, x, 0];
  else if (hh < 120) [r1, g1, b1] = [x, c, 0];
  else if (hh < 180) [r1, g1, b1] = [0, c, x];
  else if (hh < 240) [r1, g1, b1] = [0, x, c];
  else if (hh < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export interface AdvancedColorMaterialPatch {
  color?: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  flatShading?: boolean;
}

interface ColorWheelPickerProps {
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  flatShading: boolean;
  paintMode: PaintInteractionMode;
  hasSelection: boolean;
  compact?: boolean;
  onUpdateMaterial: (patch: AdvancedColorMaterialPatch, commitHistory: boolean) => void;
  onChangePaintMode: (mode: PaintInteractionMode) => void;
  onCommitHistory: () => void;
}

const WHEEL_SIZE = 168;

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  color,
  roughness,
  metalness,
  opacity,
  emissive,
  emissiveIntensity,
  flatShading,
  paintMode,
  hasSelection,
  compact = false,
  onUpdateMaterial,
  onChangePaintMode,
  onCommitHistory,
}) => {
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingWheelRef = useRef(false);

  const rgb = useMemo(() => hexToRgb(color), [color]);
  const [hsv, setHsv] = useState(() => rgbToHsv(rgb.r, rgb.g, rgb.b));
  const [hexDraft, setHexDraft] = useState(color.toUpperCase());
  const [savedSwatches, setSavedSwatches] = useState<string[]>([
    '#e2e8f0',
    '#d96b43',
    '#b77946',
    '#3b82f6',
    '#10b981',
    '#eab308',
    '#f43f5e',
    '#8b5cf6',
  ]);

  // Keep HSV synced when external object selection or eyedropper updates `color`
  useEffect(() => {
    const c = hexToRgb(color);
    const next = rgbToHsv(c.r, c.g, c.b);
    setHsv((prev) => {
      // Preserve hue when saturation is 0 so dragging slider doesn't jump hue to 0
      return {
        h: next.s < 0.005 ? prev.h : next.h,
        s: next.s,
        v: next.v,
      };
    });
    setHexDraft(color.toUpperCase());
  }, [color]);

  // Draw crisp HSV Hue-Saturation color wheel once (and tint brightness cleanly)
  useEffect(() => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = WHEEL_SIZE;
    const half = size / 2;
    const radius = half - 2;
    const img = ctx.createImageData(size, size);
    const data = img.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - half + 0.5;
        const dy = y - half + 0.5;
        const dist = Math.hypot(dx, dy);
        const idx = (y * size + x) * 4;

        if (dist > radius + 0.8) {
          data[idx + 3] = 0;
          continue;
        }

        const sat = clamp(dist / radius, 0, 1);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const hue = (angle + 360) % 360;
        const { r, g, b } = hsvToRgb(hue, sat, Math.max(0.18, hsv.v));

        // Smooth antialiased outer rim
        const alpha = dist > radius - 0.8 ? clamp(radius + 0.8 - dist, 0, 1) : 1;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [hsv.v]);

  const applyHsvChange = useCallback(
    (nextH: number, nextS: number, nextV: number, commit: boolean) => {
      const clampedH = ((nextH % 360) + 360) % 360;
      const clampedS = clamp(nextS, 0, 1);
      const clampedV = clamp(nextV, 0, 1);
      setHsv({ h: clampedH, s: clampedS, v: clampedV });
      const { r, g, b } = hsvToRgb(clampedH, clampedS, clampedV);
      const nextHex = rgbToHex(r, g, b);
      setHexDraft(nextHex.toUpperCase());
      onUpdateMaterial({ color: nextHex }, commit);
    },
    [onUpdateMaterial]
  );

  const pickWheelFromPointer = useCallback(
    (clientX: number, clientY: number, commit: boolean) => {
      const canvas = wheelCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = rect.width / 2 - 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const sat = clamp(dist / radius, 0, 1);
      const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      applyHsvChange(hue, sat, Math.max(0.05, hsv.v), commit);
    },
    [applyHsvChange, hsv.v]
  );

  // Indicator position on wheel
  const wheelKnobPos = useMemo(() => {
    const half = WHEEL_SIZE / 2;
    const radius = half - 3;
    const rad = (hsv.h * Math.PI) / 180;
    return {
      x: half + Math.cos(rad) * hsv.s * radius,
      y: half + Math.sin(rad) * hsv.s * radius,
    };
  }, [hsv.h, hsv.s]);

  // Live Color Harmonies (Complementary, Analogous, Triadic)
  const harmonies = useMemo(() => {
    const s = Math.max(0.35, hsv.s);
    const v = Math.max(0.45, hsv.v);
    const make = (dh: number, label: string) => {
      const c = hsvToRgb(hsv.h + dh, s, v);
      return { hex: rgbToHex(c.r, c.g, c.b), label };
    };
    return [
      make(180, 'Komplemen'),
      make(-32, 'Analog 1'),
      make(32, 'Analog 2'),
      make(120, 'Triadik 1'),
      make(240, 'Triadik 2'),
    ];
  }, [hsv.h, hsv.s, hsv.v]);

  const pureFullBrightnessHex = useMemo(() => {
    const c = hsvToRgb(hsv.h, hsv.s, 1);
    return rgbToHex(c.r, c.g, c.b);
  }, [hsv.h, hsv.s]);

  return (
    <div className={`color-studio-wrap ${compact ? 'compact' : ''}`}>
      {/* Interactive Paint / Eyedropper Toolbar */}
      <div className="paint-mode-bar">
        <button
          type="button"
          className={`paint-tool-chip ${paintMode === 'bucket' ? 'active' : ''}`}
          onClick={() =>
            onChangePaintMode(paintMode === 'bucket' ? 'none' : 'bucket')
          }
          title="Mode Kuas Cat: Klik bentuk mana pun di kanvas 3D untuk langsung mewarnainya!"
        >
          <PaintBucket size={14} />
          <span>{paintMode === 'bucket' ? 'Cat Klik: ON' : 'Cat Klik Objek'}</span>
        </button>

        <button
          type="button"
          className={`paint-tool-chip ${
            paintMode === 'eyedropper' ? 'active-amber' : ''
          }`}
          onClick={() =>
            onChangePaintMode(
              paintMode === 'eyedropper' ? 'none' : 'eyedropper'
            )
          }
          title="Pipet Warna: Klik objek di kanvas 3D untuk mengambil warna & materialnya"
        >
          <Pipette size={14} />
          <span>{paintMode === 'eyedropper' ? 'Pilih Objek...' : 'Pipet'}</span>
        </button>
      </div>

      {!hasSelection && paintMode === 'none' && (
        <div className="paint-hint-banner">
          Pilih objek terlebih dahulu atau aktifkan <b>Cat Klik Objek</b> untuk mewarnai langsung di kanvas.
        </div>
      )}

      {/* RGB Color Wheel + Current Color Preview */}
      <div className="wheel-center-stage">
        <div
          className="rgb-wheel-box"
          style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
          onPointerDown={(e) => {
            isDraggingWheelRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            pickWheelFromPointer(e.clientX, e.clientY, false);
          }}
          onPointerMove={(e) => {
            if (!isDraggingWheelRef.current) return;
            pickWheelFromPointer(e.clientX, e.clientY, false);
          }}
          onPointerUp={(e) => {
            if (!isDraggingWheelRef.current) return;
            isDraggingWheelRef.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
            onCommitHistory();
          }}
        >
          <canvas
            ref={wheelCanvasRef}
            width={WHEEL_SIZE}
            height={WHEEL_SIZE}
            className="rgb-wheel-canvas"
          />
          <span
            className="rgb-wheel-knob"
            style={{
              left: `${wheelKnobPos.x}px`,
              top: `${wheelKnobPos.y}px`,
              backgroundColor: color,
            }}
          />
        </div>

        {/* Brightness / Value Bar + Active Swatch + HEX */}
        <div className="wheel-side-readout">
          <div
            className="active-color-Orb"
            style={{
              backgroundColor: color,
              boxShadow:
                emissiveIntensity > 0
                  ? `0 0 16px ${emissive}`
                  : 'inset 0 0 0 1px rgba(255,255,255,0.28)',
            }}
            title={`Warna Aktif: ${color.toUpperCase()}`}
          />

          <label className="hex-box-label">
            <span>HEX</span>
            <input
              type="text"
              maxLength={7}
              value={hexDraft}
              onChange={(e) => {
                const v = e.target.value;
                setHexDraft(v);
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                  onUpdateMaterial({ color: v.toLowerCase() }, true);
                }
              }}
              onBlur={() => setHexDraft(color.toUpperCase())}
            />
          </label>

          <button
            type="button"
            className="save-swatch-btn"
            onClick={() => {
              const lower = color.toLowerCase();
              setSavedSwatches((prev) =>
                prev.includes(lower) ? prev : [lower, ...prev.slice(0, 11)]
              );
            }}
            title="Simpan warna ini ke palet favorit"
          >
            <Plus size={12} />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Brightness / Value Slider */}
      <div className="rgb-channel-block">
        <div className="slider-head">
          <span>Kecerahan (Value)</span>
          <span>{Math.round(hsv.v * 100)}%</span>
        </div>
        <input
          type="range"
          className="value-gradient-slider"
          min={0.02}
          max={1}
          step={0.01}
          value={hsv.v}
          style={{
            background: `linear-gradient(90deg, #050608 0%, ${pureFullBrightnessHex} 100%)`,
          }}
          onChange={(e) =>
            applyHsvChange(hsv.h, hsv.s, parseFloat(e.target.value), false)
          }
          onPointerUp={onCommitHistory}
        />
      </div>

      {/* Fine RGB Channel Sliders (0-255) */}
      <div className="rgb-sliders-card">
        {(
          [
            { key: 'r', label: 'R', val: rgb.r, cls: 'rgb-r' },
            { key: 'g', label: 'G', val: rgb.g, cls: 'rgb-g' },
            { key: 'b', label: 'B', val: rgb.b, cls: 'rgb-b' },
          ] as const
        ).map((ch) => (
          <div key={ch.key} className="rgb-channel-line">
            <span className={`rgb-badge ${ch.cls}`}>{ch.label}</span>
            <input
              type="range"
              min={0}
              max={255}
              step={1}
              value={ch.val}
              className={`rgb-range ${ch.cls}`}
              onChange={(e) => {
                const nextVal = parseInt(e.target.value, 10);
                const nr = ch.key === 'r' ? nextVal : rgb.r;
                const ng = ch.key === 'g' ? nextVal : rgb.g;
                const nb = ch.key === 'b' ? nextVal : rgb.b;
                onUpdateMaterial({ color: rgbToHex(nr, ng, nb) }, false);
              }}
              onPointerUp={onCommitHistory}
            />
            <span className="rgb-num">{ch.val}</span>
          </div>
        ))}
      </div>

      {/* Auto Color Harmonies */}
      <div className="harmonies-block">
        <div className="harmonies-title">
          <Sparkles size={12} />
          <span>Harmoni Warna Otomatis</span>
        </div>
        <div className="swatch-strip">
          {harmonies.map((h) => (
            <button
              key={h.label}
              type="button"
              className="mini-swatch"
              style={{ backgroundColor: h.hex }}
              title={`${h.label} (${h.hex.toUpperCase()})`}
              onClick={() => onUpdateMaterial({ color: h.hex }, true)}
            />
          ))}
        </div>
      </div>

      {/* Saved Custom Palette */}
      <div className="harmonies-block">
        <div className="harmonies-title">
          <span>Palet Tersimpan</span>
        </div>
        <div className="swatch-strip wrap">
          {savedSwatches.map((sw) => (
            <button
              key={sw}
              type="button"
              className={`mini-swatch ${
                sw.toLowerCase() === color.toLowerCase() ? 'selected' : ''
              }`}
              style={{ backgroundColor: sw }}
              title={sw.toUpperCase()}
              onClick={() => onUpdateMaterial({ color: sw }, true)}
            />
          ))}
        </div>
      </div>

      {/* Architectural PBR Material Presets */}
      <div className="harmonies-block">
        <div className="harmonies-title">
          <span>Preset Material Arsitektur</span>
        </div>
        <div className="preset-grid">
          {MATERIAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-swatch ${
                color.toLowerCase() === preset.color.toLowerCase()
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                onUpdateMaterial(
                  {
                    color: preset.color,
                    roughness: preset.roughness,
                    metalness: preset.metalness,
                    opacity: preset.opacity ?? 1,
                    emissive: preset.emissive ?? '#000000',
                    emissiveIntensity: preset.emissiveIntensity ?? 0,
                  },
                  true
                )
              }
            >
              <span
                className="preset-dot"
                style={{
                  backgroundColor: preset.color,
                  opacity: preset.opacity ?? 1,
                }}
              />
              <span className="preset-name">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced PBR Surface Controls */}
      <div className="advanced-pbr-box">
        <div className="harmonies-title">
          <span>Pengaturan Permukaan Lanjutan (PBR)</span>
        </div>

        <div className="slider-row">
          <div className="slider-head">
            <span>Opasitas / Transparansi (Kaca)</span>
            <span>{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.02}
            value={opacity}
            onChange={(e) =>
              onUpdateMaterial({ opacity: parseFloat(e.target.value) }, false)
            }
            onPointerUp={onCommitHistory}
          />
        </div>

        <div className="slider-row">
          <div className="slider-head">
            <span>Kekasaran (Mengilap ↔ Doff)</span>
            <span>{Math.round(roughness * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={roughness}
            onChange={(e) =>
              onUpdateMaterial({ roughness: parseFloat(e.target.value) }, false)
            }
            onPointerUp={onCommitHistory}
          />
        </div>

        <div className="slider-row">
          <div className="slider-head">
            <span>Kesan Logam (Metalness)</span>
            <span>{Math.round(metalness * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={metalness}
            onChange={(e) =>
              onUpdateMaterial({ metalness: parseFloat(e.target.value) }, false)
            }
            onPointerUp={onCommitHistory}
          />
        </div>

        <div className="slider-row">
          <div className="slider-head">
            <span>Cahaya Pendar (Emissive Lampu)</span>
            <span>{emissiveIntensity.toFixed(2)}×</span>
          </div>
          <div className="emissive-inline-row">
            <button
              type="button"
              className="mini-swatch"
              style={{
                backgroundColor:
                  emissiveIntensity > 0 && emissive !== '#000000'
                    ? emissive
                    : color,
              }}
              title="Samakan warna pendar dengan warna utama"
              onClick={() =>
                onUpdateMaterial(
                  {
                    emissive: color,
                    emissiveIntensity:
                      emissiveIntensity > 0 ? emissiveIntensity : 0.85,
                  },
                  true
                )
              }
            />
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={emissiveIntensity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateMaterial(
                  {
                    emissive:
                      val > 0 && emissive === '#000000' ? color : emissive,
                    emissiveIntensity: val,
                  },
                  false
                );
              }}
              onPointerUp={onCommitHistory}
            />
          </div>
        </div>

        <div className="shading-toggle-row">
          <span>Gaya Faset Shading</span>
          <div className="segmented-pills">
            <button
              type="button"
              className={`seg-pill ${!flatShading ? 'active' : ''}`}
              onClick={() => onUpdateMaterial({ flatShading: false }, true)}
            >
              Smooth Halus
            </button>
            <button
              type="button"
              className={`seg-pill ${flatShading ? 'active' : ''}`}
              onClick={() => onUpdateMaterial({ flatShading: true }, true)}
            >
              Flat Tegas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
