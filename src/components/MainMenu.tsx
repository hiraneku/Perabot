import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Boxes,
  Copy,
  Download,
  FolderOpen,
  Moon,
  Pencil,
  Sun,
  Sunset,
  Trash2,
  X,
} from 'lucide-react';
import { createPrimitiveGeometry } from '../engine/primitives';
import { formatRelativeTime, TRANSLATIONS } from '../i18n/translations';
import {
  AppLanguage,
  CustomAssetRecord,
  GlobalAppSettings,
  LightingMood,
  PrimitiveKind,
  SavedProjectRecord,
  StudioMode,
  STUDIO_THEMES,
} from '../types/studio';

interface MainMenuProps {
  settings: GlobalAppSettings;
  projects: SavedProjectRecord[];
  customAssets: CustomAssetRecord[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
  onChangeLanguage: (lang: AppLanguage) => void;
  onChangeLightingMood: (mood: LightingMood) => void;
  onCreateNewProject: (mode: StudioMode) => void;
  onOpenProject: (project: SavedProjectRecord) => void;
  onRenameProject: (project: SavedProjectRecord, newName: string) => void;
  onDuplicateProject: (project: SavedProjectRecord) => void;
  onExportProjectBackup: (project: SavedProjectRecord) => void;
  onDeleteProject: (id: string) => void;
  onImportProjectFile: (file: File) => void;
  onDeleteCustomAsset: (id: string) => void;
  onUseAssetInHouseMode: (asset: CustomAssetRecord) => void;
}

interface DioramaPartSpec {
  kind: PrimitiveKind;
  pos: [number, number, number];
  rot?: [number, number, number];
  scale: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  isWindowGlow?: boolean;
  isLampGlow?: boolean;
}

const DIORAMA_PARTS: DioramaPartSpec[] = [
  // Floating island base & warm wooden patio deck
  { kind: 'beveled-cube', pos: [0, -0.22, 0], scale: [6.4, 0.44, 5.4], color: '#334155', roughness: 0.8 },
  { kind: 'thin-slab', pos: [0, 0.04, 0], scale: [5.9, 1.0, 4.9], color: '#cbd5e1', roughness: 0.72 },
  { kind: 'cube', pos: [0.55, 0.14, 0.55], scale: [4.2, 0.14, 3.3], color: '#b07d4f', roughness: 0.62 },
  { kind: 'stair', pos: [0.8, 0.11, 2.42], scale: [1.3, 0.22, 0.52], color: '#e2e8f0', roughness: 0.7 },

  // Main architectural house walls
  { kind: 'cube', pos: [-0.45, 1.32, -1.05], scale: [3.6, 2.4, 0.22], color: '#f8fafc', roughness: 0.78 },
  { kind: 'cube', pos: [-2.14, 1.32, 0.25], rot: [0, 90, 0], scale: [2.8, 2.4, 0.22], color: '#f1f5f9', roughness: 0.78 },
  { kind: 'window-frame', pos: [-0.45, 1.35, -0.92], scale: [1.55, 1.35, 1.0], color: '#334155', roughness: 0.42, metalness: 0.3 },
  { kind: 'cube', pos: [-0.45, 1.35, -0.92], scale: [1.35, 1.15, 0.05], color: '#bae6fd', roughness: 0.1, metalness: 0.2, opacity: 0.62, isWindowGlow: true },

  // Side accent stone column & modern pillar
  { kind: 'cube', pos: [1.32, 1.32, -1.02], scale: [0.38, 2.42, 0.38], color: '#64748b', roughness: 0.85 },
  { kind: 'fluted-column', pos: [2.25, 1.32, 1.85], scale: [0.24, 2.4, 0.24], color: '#334155', roughness: 0.4, metalness: 0.35 },

  // Modern overhanging flat roof + warm soffit + gable accent
  { kind: 'cube', pos: [0.1, 2.6, 0.35], scale: [4.95, 0.22, 3.65], color: '#1e293b', roughness: 0.55 },
  { kind: 'cube', pos: [0.1, 2.46, 0.35], scale: [4.65, 0.08, 3.35], color: '#d9a066', roughness: 0.62 },
  { kind: 'triangular-prism', pos: [-0.95, 3.05, -0.25], scale: [2.3, 0.75, 2.2], color: '#b45309', roughness: 0.68 },

  // Cozy interior / terrace furniture (sofa + rug + coffee table + floor lamp)
  { kind: 'thin-slab', pos: [-0.35, 0.22, 0.55], scale: [2.4, 0.45, 1.85], color: '#475569', roughness: 0.92 },
  { kind: 'rounded-box', pos: [-0.55, 0.38, -0.15], scale: [1.75, 0.32, 0.72], color: '#3b82f6', roughness: 0.82 },
  { kind: 'rounded-box', pos: [-0.55, 0.66, -0.42], scale: [1.75, 0.42, 0.2], color: '#2563eb', roughness: 0.84 },
  { kind: 'smooth-cube', pos: [-0.95, 0.62, -0.24], rot: [-16, 8, 0], scale: [0.38, 0.32, 0.16], color: '#f8fafc', roughness: 0.88 },
  { kind: 'smooth-cube', pos: [-0.15, 0.62, -0.24], rot: [-16, -8, 0], scale: [0.38, 0.32, 0.16], color: '#fbbf24', roughness: 0.88 },

  // Coffee table
  { kind: 'cylinder', pos: [-0.35, 0.44, 0.78], scale: [0.85, 0.06, 0.85], color: '#f8fafc', roughness: 0.3 },
  { kind: 'cylinder', pos: [-0.35, 0.29, 0.78], scale: [0.16, 0.26, 0.16], color: '#334155', roughness: 0.4, metalness: 0.4 },

  // Warm standing lamp
  { kind: 'cylinder', pos: [0.78, 0.85, -0.28], scale: [0.05, 1.28, 0.05], color: '#1e293b', roughness: 0.35, metalness: 0.6 },
  { kind: 'conical-frustum', pos: [0.78, 1.52, -0.28], scale: [0.42, 0.32, 0.42], color: '#fef3c7', roughness: 0.5, isLampGlow: true },

  // Courtyard greenery (planter + tree)
  { kind: 'conical-frustum', pos: [-2.18, 0.35, 1.85], rot: [180, 0, 0], scale: [0.52, 0.46, 0.52], color: '#c26d43', roughness: 0.75 },
  { kind: 'cylinder', pos: [-2.18, 0.78, 1.85], scale: [0.12, 0.55, 0.12], color: '#6b4423', roughness: 0.85 },
  { kind: 'sphere', pos: [-2.18, 1.28, 1.85], scale: [0.78, 0.92, 0.78], color: '#16a34a', roughness: 0.78 },
  { kind: 'sphere', pos: [-1.88, 1.06, 1.65], scale: [0.48, 0.52, 0.48], color: '#22c55e', roughness: 0.78 },

  // Warm courtyard bollard light
  { kind: 'cylinder', pos: [1.85, 0.38, 2.02], scale: [0.12, 0.48, 0.12], color: '#1e293b', roughness: 0.4, metalness: 0.5 },
  { kind: 'sphere', pos: [1.85, 0.68, 2.02], scale: [0.2, 0.2, 0.2], color: '#fde68a', roughness: 0.3, isLampGlow: true },
];

export const MainMenu: React.FC<MainMenuProps> = ({
  settings,
  projects,
  customAssets,
  isFullscreen,
  onToggleFullscreen,
  onOpenSettings,
  onChangeLanguage,
  onChangeLightingMood,
  onCreateNewProject,
  onOpenProject,
  onRenameProject,
  onDuplicateProject,
  onExportProjectBackup,
  onDeleteProject,
  onImportProjectFile,
  onDeleteCustomAsset,
  onUseAssetInHouseMode,
}) => {
  const t = TRANSLATIONS[settings.language];
  const showcaseRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [libraryTab, setLibraryTab] = useState<'projects' | 'assets'>('projects');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sceneObjsRef = useRef<{
    scene: THREE.Scene;
    hemi: THREE.HemisphereLight;
    sun: THREE.DirectionalLight;
    warmPoint: THREE.PointLight;
    windowMats: THREE.MeshStandardMaterial[];
    lampMats: THREE.MeshStandardMaterial[];
  } | null>(null);

  useEffect(() => {
    const container = showcaseRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 280);
    const height = Math.max(container.clientHeight, 220);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(6.8, 4.5, 7.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = settings.graphicsQuality !== 'light';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.85;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0, 1.05, 0.1);

    const hemi = new THREE.HemisphereLight('#e2eeff', '#1e293b', 1.05);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff7ed', 2.0);
    sun.position.set(9, 13, 8);
    sun.castShadow = settings.graphicsQuality !== 'light';
    sun.shadow.mapSize.set(1024, 1024);
    const sd = 6.5;
    sun.shadow.camera.left = -sd;
    sun.shadow.camera.right = sd;
    sun.shadow.camera.top = sd;
    sun.shadow.camera.bottom = -sd;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const warmPoint = new THREE.PointLight('#fbbf24', 0.6, 9);
    warmPoint.position.set(0.4, 1.7, 0.2);
    scene.add(warmPoint);

    const dioramaGroup = new THREE.Group();
    scene.add(dioramaGroup);

    const geoCache = new Map<PrimitiveKind, THREE.BufferGeometry>();
    const matsToDispose: THREE.Material[] = [];
    const windowMats: THREE.MeshStandardMaterial[] = [];
    const lampMats: THREE.MeshStandardMaterial[] = [];
    const DEG = Math.PI / 180;

    for (const spec of DIORAMA_PARTS) {
      let geo = geoCache.get(spec.kind);
      if (!geo) {
        geo = createPrimitiveGeometry(spec.kind);
        geoCache.set(spec.kind, geo);
      }
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(spec.color),
        roughness: spec.roughness ?? 0.65,
        metalness: spec.metalness ?? 0.08,
        transparent: (spec.opacity ?? 1) < 0.99,
        opacity: spec.opacity ?? 1,
      });
      matsToDispose.push(mat);
      if (spec.isWindowGlow) windowMats.push(mat);
      if (spec.isLampGlow) lampMats.push(mat);

      const m = new THREE.Mesh(geo, mat);
      m.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      if (spec.rot) {
        m.rotation.set(spec.rot[0] * DEG, spec.rot[1] * DEG, spec.rot[2] * DEG);
      }
      m.scale.set(spec.scale[0], spec.scale[1], spec.scale[2]);
      m.castShadow = (spec.opacity ?? 1) > 0.7;
      m.receiveShadow = true;
      dioramaGroup.add(m);
    }

    sceneObjsRef.current = {
      scene,
      hemi,
      sun,
      warmPoint,
      windowMats,
      lampMats,
    };

    const ro = new ResizeObserver(() => {
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    let rafId = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const elapsed = clock.getElapsedTime();
      dioramaGroup.position.y = Math.sin(elapsed * 1.15) * 0.045;
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      for (const g of geoCache.values()) g.dispose();
      for (const m of matsToDispose) m.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      sceneObjsRef.current = null;
    };
  }, [settings.graphicsQuality]);

  useEffect(() => {
    const ctx = sceneObjsRef.current;
    if (!ctx) return;

    const mood = settings.lightingMood;
    if (mood === 'sunset') {
      ctx.hemi.color.set('#fed7aa');
      ctx.hemi.groundColor.set('#311b2c');
      ctx.hemi.intensity = 0.9;
      ctx.sun.color.set('#fb923c');
      ctx.sun.intensity = 2.25;
      ctx.sun.position.set(12, 5.5, 8);
      ctx.warmPoint.intensity = 1.9;
      for (const m of ctx.windowMats) {
        m.emissive.set('#f59e0b');
        m.emissiveIntensity = 0.55;
      }
      for (const m of ctx.lampMats) {
        m.emissive.set('#fbbf24');
        m.emissiveIntensity = 1.3;
      }
    } else if (mood === 'night') {
      ctx.hemi.color.set('#3b82f6');
      ctx.hemi.groundColor.set('#0f172a');
      ctx.hemi.intensity = 0.42;
      ctx.sun.color.set('#93c5fd');
      ctx.sun.intensity = 0.55;
      ctx.sun.position.set(-8, 12, -6);
      ctx.warmPoint.intensity = 3.4;
      for (const m of ctx.windowMats) {
        m.emissive.set('#fbbf24');
        m.emissiveIntensity = 1.45;
      }
      for (const m of ctx.lampMats) {
        m.emissive.set('#fde047');
        m.emissiveIntensity = 2.1;
      }
    } else {
      const themeSpec =
        STUDIO_THEMES.find((th) => th.id === settings.theme) ?? STUDIO_THEMES[0];
      ctx.hemi.color.set(themeSpec.isLight ? '#ffffff' : '#e2eeff');
      ctx.hemi.groundColor.set(themeSpec.isLight ? '#cbd5e1' : '#1e293b');
      ctx.hemi.intensity = 1.1;
      ctx.sun.color.set('#fff8ed');
      ctx.sun.intensity = 2.05;
      ctx.sun.position.set(9, 13, 8);
      ctx.warmPoint.intensity = 0.55;
      for (const m of ctx.windowMats) {
        m.emissive.set('#38bdf8');
        m.emissiveIntensity = 0.12;
      }
      for (const m of ctx.lampMats) {
        m.emissive.set('#fef08a');
        m.emissiveIntensity = 0.35;
      }
    }
  }, [settings.lightingMood, settings.theme]);

  const latestProject = projects.length > 0 ? projects[0] : null;

  const startRename = (proj: SavedProjectRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(proj.id);
    setRenameDraft(proj.name);
  };

  const commitRename = (proj: SavedProjectRecord) => {
    const trimmed = renameDraft.trim();
    if (trimmed) {
      onRenameProject(proj, trimmed);
    }
    setRenamingId(null);
  };

  return (
    <div className="main-menu-shell">
      {/* Top Navigation Header */}
      <header className="mm-header">
        <div className="mm-brand">
          <span className="mm-brand-logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 22V12M12 12L21 7M12 12L3 7"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          <div className="mm-brand-copy">
            <span className="mm-brand-name">Perabot</span>
            <span className="mm-brand-badge">{t.heroBadge}</span>
          </div>
        </div>

        <div className="mm-header-actions">
          <div className="mm-lang-pills" role="group" aria-label={t.langSection}>
            {(['id', 'en', 'ja'] as AppLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                className={`mm-lang-btn ${settings.language === lang ? 'active' : ''}`}
                onClick={() => onChangeLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`mm-icon-btn ${isFullscreen ? 'active' : ''}`}
            onClick={onToggleFullscreen}
            title={t.fullscreen}
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="mm-settings-btn"
            onClick={onOpenSettings}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>{t.globalSettings}</span>
          </button>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <div className="mm-scroll-body">
        <section className="mm-hero-grid">
          <div className="mm-hero-left">
            <div className="mm-hero-copy">
              <h1>{t.heroTitle}</h1>
            </div>

            {latestProject && (
              <button
                type="button"
                className="mm-continue-card"
                onClick={() => onOpenProject(latestProject)}
              >
                <div className="mm-continue-thumb">
                  {latestProject.thumbnailDataUrl ? (
                    <img src={latestProject.thumbnailDataUrl} alt={latestProject.name} />
                  ) : (
                    <span className="mm-thumb-placeholder">3D</span>
                  )}
                </div>
                <div className="mm-continue-info">
                  <span className="mm-continue-eyebrow">{t.continueLast}</span>
                  <strong>{latestProject.name}</strong>
                  <span className="mm-continue-meta">
                    <span className={`mm-mode-tag ${latestProject.mode}`}>
                      {latestProject.mode === 'house'
                        ? t.modeHouseTitle
                        : t.modeModelingTitle}
                    </span>
                    <span>•</span>
                    <span>
                      {latestProject.objectCount} {t.objectsUnit}
                    </span>
                    <span>•</span>
                    <span>
                      {formatRelativeTime(latestProject.updatedAt, settings.language)}
                    </span>
                  </span>
                </div>
                <span className="mm-continue-arrow" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            )}

            <div className="mm-mode-cards">
              <button
                type="button"
                className="mm-mode-card modeling"
                onClick={() => onCreateNewProject('modeling')}
              >
                <div className="mm-mode-card-top">
                  <span className="mm-mode-icon modeling">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" />
                      <path d="M12 22V12M12 12L21 7M12 12L3 7" />
                    </svg>
                  </span>
                  <span className="mm-mode-pill">
                    {settings.language === 'ja'
                      ? '75シェイプ'
                      : settings.language === 'en'
                      ? '75 Shapes'
                      : '75 Bentuk'}
                  </span>
                </div>
                <h2>{t.modeModelingTitle}</h2>
                <p>{t.modeModelingDesc}</p>
                <span className="mm-mode-cta">
                  <span>{t.modeModelingBtn}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </button>

              <button
                type="button"
                className="mm-mode-card house"
                onClick={() => onCreateNewProject('house')}
              >
                <div className="mm-mode-card-top">
                  <span className="mm-mode-icon house">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 10.5L12 3l9 7.5" />
                      <path d="M5 9.5V20h14V9.5" />
                      <path d="M9.5 20v-6h5v6" />
                    </svg>
                  </span>
                  <span className="mm-mode-pill accent">
                    {settings.language === 'ja'
                      ? '3D読込＆空間'
                      : settings.language === 'en'
                      ? '3D Import & Walk'
                      : 'Impor 3D & Ruang'}
                  </span>
                </div>
                <h2>{t.modeHouseTitle}</h2>
                <p>{t.modeHouseDesc}</p>
                <span className="mm-mode-cta">
                  <span>{t.modeHouseBtn}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>
          </div>

          <div className="mm-showcase-card" data-mood={settings.lightingMood}>
            <div ref={showcaseRef} className="mm-showcase-canvas" />

            <div className="mm-showcase-overlay-top">
              <span className="mm-showcase-hint">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2a10 10 0 1 0 10 10" />
                  <path d="M12 8v4l3 3" />
                </svg>
                {t.stageDragHint}
              </span>
            </div>

            <div className="mm-showcase-mood-bar" role="group" aria-label="Lighting Mood">
              {(
                [
                  { id: 'morning', icon: <Sun size={13} />, label: t.moodMorning },
                  { id: 'sunset', icon: <Sunset size={13} />, label: t.moodSunset },
                  { id: 'night', icon: <Moon size={13} />, label: t.moodNight },
                ] as Array<{ id: LightingMood; icon: React.ReactNode; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`mm-mood-chip ${
                    settings.lightingMood === m.id ? 'active' : ''
                  }`}
                  onClick={() => onChangeLightingMood(m.id)}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Saved Projects & Custom Assets Section */}
        <section className="mm-library-section">
          <div className="mm-library-header">
            <div className="mm-library-tabs">
              <button
                type="button"
                className={`mm-lib-tab ${libraryTab === 'projects' ? 'active' : ''}`}
                onClick={() => setLibraryTab('projects')}
              >
                <span>{t.tabMyProjects}</span>
                <span className="mm-count-pill">{projects.length}</span>
              </button>
              <button
                type="button"
                className={`mm-lib-tab ${libraryTab === 'assets' ? 'active' : ''}`}
                onClick={() => setLibraryTab('assets')}
              >
                <span>{t.tabMyAssets}</span>
                <span className="mm-count-pill">{customAssets.length}</span>
              </button>
            </div>

            {libraryTab === 'projects' && (
              <div className="mm-library-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".perabot,.json,application/json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportProjectFile(file);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  className="mm-import-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>{t.openProjectFile}</span>
                </button>
              </div>
            )}
          </div>

          {libraryTab === 'projects' ? (
            projects.length === 0 ? (
              <div className="mm-empty-card">
                <span className="mm-empty-icon">
                  <FolderOpen size={28} strokeWidth={1.75} />
                </span>
                <strong>{t.emptyProjectsTitle}</strong>
                <p>{t.emptyProjectsDesc}</p>
              </div>
            ) : (
              <div className="mm-project-grid">
                {projects.map((proj) => {
                  const isRenaming = renamingId === proj.id;
                  const isConfirmingDel = confirmDeleteId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      className="mm-project-card"
                      onClick={() => {
                        if (!isRenaming) onOpenProject(proj);
                      }}
                    >
                      <div className="mm-project-thumb">
                        {proj.thumbnailDataUrl ? (
                          <img src={proj.thumbnailDataUrl} alt={proj.name} loading="lazy" />
                        ) : (
                          <div className="mm-project-thumb-empty">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" />
                              <path d="M12 22V12M12 12L21 7M12 12L3 7" />
                            </svg>
                          </div>
                        )}
                        <span className={`mm-project-badge ${proj.mode}`}>
                          {proj.mode === 'house'
                            ? t.modeHouseTitle
                            : t.modeModelingTitle}
                        </span>
                      </div>

                      <div className="mm-project-body">
                        {isRenaming ? (
                          <input
                            type="text"
                            className="mm-rename-input"
                            value={renameDraft}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => commitRename(proj)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(proj);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                          />
                        ) : (
                          <strong className="mm-project-title">{proj.name}</strong>
                        )}

                        <div className="mm-project-meta">
                          <span>
                            {proj.objectCount} {t.objectsUnit}
                          </span>
                          <span>•</span>
                          <span>
                            {formatRelativeTime(proj.updatedAt, settings.language)}
                          </span>
                        </div>

                        <div
                          className="mm-project-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="mm-card-act"
                            title={t.rename}
                            aria-label={t.rename}
                            onClick={(e) => startRename(proj, e)}
                          >
                            <Pencil size={13} strokeWidth={2.1} />
                          </button>
                          <button
                            type="button"
                            className="mm-card-act"
                            title={t.duplicate}
                            aria-label={t.duplicate}
                            onClick={() => onDuplicateProject(proj)}
                          >
                            <Copy size={13} strokeWidth={2.1} />
                          </button>
                          <button
                            type="button"
                            className="mm-card-act"
                            title={t.exportBackup}
                            aria-label={t.exportBackup}
                            onClick={() => onExportProjectBackup(proj)}
                          >
                            <Download size={13} strokeWidth={2.1} />
                          </button>
                          {isConfirmingDel ? (
                            <div className="mm-confirm-del-group">
                              <button
                                type="button"
                                className="mm-card-act danger-confirm"
                                onClick={() => {
                                  onDeleteProject(proj.id);
                                  setConfirmDeleteId(null);
                                }}
                              >
                                <Trash2 size={12} strokeWidth={2.2} />
                                <span>{t.delete}?</span>
                              </button>
                              <button
                                type="button"
                                className="mm-card-act"
                                title={t.cancel}
                                aria-label={t.cancel}
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                <X size={12} strokeWidth={2.3} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="mm-card-act danger"
                              title={t.delete}
                              aria-label={t.delete}
                              onClick={() => setConfirmDeleteId(proj.id)}
                            >
                              <Trash2 size={13.5} strokeWidth={2.1} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : customAssets.length === 0 ? (
            <div className="mm-empty-card">
              <span className="mm-empty-icon">
                <Boxes size={28} strokeWidth={1.75} />
              </span>
              <strong>{t.emptyAssetsTitle}</strong>
              <p>{t.emptyAssetsDesc}</p>
            </div>
          ) : (
            <div className="mm-asset-grid">
              {customAssets.map((asset) => (
                <div key={asset.id} className="mm-asset-card">
                  <div className="mm-asset-thumb">
                    {asset.thumbnailDataUrl ? (
                      <img src={asset.thumbnailDataUrl} alt={asset.name} />
                    ) : (
                      <Boxes size={22} />
                    )}
                  </div>
                  <div className="mm-asset-info">
                    <strong>{asset.name}</strong>
                    <span>
                      {asset.parts.length} {t.partsUnit}
                    </span>
                  </div>
                  <div className="mm-asset-actions">
                    <button
                      type="button"
                      className="mm-asset-use-btn"
                      onClick={() => onUseAssetInHouseMode(asset)}
                    >
                      + {t.modeHouseTitle}
                    </button>
                    <button
                      type="button"
                      className="mm-card-act danger"
                      title={t.delete}
                      aria-label={t.delete}
                      onClick={() => onDeleteCustomAsset(asset.id)}
                    >
                      <Trash2 size={13.5} strokeWidth={2.1} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
