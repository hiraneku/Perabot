import React from 'react';

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
    {/* 3D Triangular Prism (Roof / Wedge) */}
    <path d="M11.5 4.5L19.5 8.5L24.5 19.5L16.5 23.5L4 19.5L11.5 4.5Z" fill="#7C3A24" />
    {/* Front triangle */}
    <path d="M11.5 4.5L16.5 23.5L4 19.5L11.5 4.5Z" fill="#F08A65" />
    {/* Right sloped roof face */}
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
      fill="url(#cylGrad)"
    />
    <ellipse cx="14" cy="8.5" rx="8" ry="3.6" fill="#E2E8F0" />
    <path
      d="M22 8.5C22 10.49 18.42 12.1 14 12.1C9.58 12.1 6 10.49 6 8.5M22 8.5C22 6.51 18.42 4.9 14 4.9C9.58 4.9 6 6.51 6 8.5M22 8.5V19.5C22 21.49 18.42 23.1 14 23.1C9.58 23.1 6 21.49 6 19.5V8.5"
      stroke="#F8FAFC"
      strokeOpacity="0.38"
      strokeWidth="1"
    />
    <defs>
      <linearGradient id="cylGrad" x1="6" y1="16" x2="22" y2="16" gradientUnits="userSpaceOnUse">
        <stop stopColor="#CBD5E1" />
        <stop offset="0.55" stopColor="#94A3B8" />
        <stop offset="1" stopColor="#475569" />
      </linearGradient>
    </defs>
  </svg>
);

export const RgbGizmoIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* Green Y vertical up-down */}
    <path d="M12 3V21" stroke="#78E82C" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M9.5 5.8L12 3L14.5 5.8" stroke="#78E82C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Red X right */}
    <path d="M12 12L21 16.8" stroke="#FF3B57" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M19.8 13.6L21 16.8L17.6 17.5" stroke="#FF3B57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Blue Z left */}
    <path d="M12 12L3 16.8" stroke="#3898FF" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M6.4 17.5L3 16.8L4.2 13.6" stroke="#3898FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.1" fill="#F8FAFC" />
  </svg>
);
