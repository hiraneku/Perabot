import React, { useMemo } from 'react';
import { getShapeThumbnails, PRIMITIVE_META } from '../engine/primitives';
import { PrimitiveKind } from '../types/studio';

export const CubeShapeIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M14 3.5L24 9.2V18.8L14 24.5L4 18.8V9.2L14 3.5Z" fill="#3B4559" />
    <path d="M14 3.5L24 9.2L14 14.9L4 9.2L14 3.5Z" fill="#E2E8F0" />
    <path d="M4 9.2L14 14.9V24.5L4 18.8V9.2Z" fill="#94A3B8" />
    <path d="M24 9.2L14 14.9V24.5L24 18.8V9.2Z" fill="#64748B" />
    <path
      d="M14 3.5L24 9.2V18.8L14 24.5L4 18.8V9.2L14 3.5Z"
      stroke="#F8FAFC"
      strokeOpacity="0.35"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

export const TriangleShapeIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M11.5 4.5L19.5 8.5L24.5 19.5L16.5 23.5L4 19.5L11.5 4.5Z" fill="#7C3A24" />
    <path d="M11.5 4.5L16.5 23.5L4 19.5L11.5 4.5Z" fill="#F08A65" />
    <path d="M11.5 4.5L19.5 8.5L24.5 19.5L16.5 23.5L11.5 4.5Z" fill="#C95E3B" />
    <path
      d="M11.5 4.5L19.5 8.5L24.5 19.5L16.5 23.5L4 19.5L11.5 4.5ZM11.5 4.5L16.5 23.5"
      stroke="#FFF1EB"
      strokeOpacity="0.4"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

export const CylinderShapeIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path
      d="M6 8.5V19.5C6 21.7 9.58 23.5 14 23.5C18.42 23.5 22 21.7 22 19.5V8.5H6Z"
      fill="#64748B"
    />
    <ellipse cx="14" cy="8.5" rx="8" ry="3.6" fill="#E2E8F0" />
  </svg>
);

export const PrimitiveShapePreview: React.FC<{
  kind: PrimitiveKind;
  size?: number;
  className?: string;
}> = ({ kind, size = 36, className }) => {
  const thumbnails = useMemo(() => getShapeThumbnails(), []);
  const src = thumbnails[kind];
  const meta = PRIMITIVE_META[kind];

  if (src) {
    return (
      <img
        src={src}
        alt={meta.label}
        width={size}
        height={size}
        draggable={false}
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    );
  }

  return <CubeShapeIcon size={size} />;
};

export const RgbGizmoIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3V21" stroke="#78E82C" strokeWidth="2.1" strokeLinecap="round" />
    <path
      d="M9.5 5.8L12 3L14.5 5.8"
      stroke="#78E82C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 12L21 16.8" stroke="#FF3B57" strokeWidth="2.1" strokeLinecap="round" />
    <path
      d="M19.8 13.6L21 16.8L17.6 17.5"
      stroke="#FF3B57"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 12L3 16.8" stroke="#3898FF" strokeWidth="2.1" strokeLinecap="round" />
    <path
      d="M6.4 17.5L3 16.8L4.2 13.6"
      stroke="#3898FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2.1" fill="#F8FAFC" />
  </svg>
);
