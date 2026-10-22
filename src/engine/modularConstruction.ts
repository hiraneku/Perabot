import {
  AppLanguage,
  ArchitecturalRole,
  CustomAssetPart,
  DEFAULT_SUBDIVISION_SETTINGS,
  SurfacePlacementRule,
} from '../types/studio';
import { renderPartsThumbnailDataUrl } from './housePresets';

export type ModularCategory =
  | 'all'
  | 'floors'
  | 'walls'
  | 'openings'
  | 'stairs'
  | 'roofs'
  | 'landscape';

export interface ModularModuleItem {
  id: string;
  category: Exclude<ModularCategory, 'all'>;
  archRole: ArchitecturalRole;
  surfaceRule: SurfacePlacementRule;
  /** Standard footprint / connection dimensions in meters for socket snapping */
  moduleSize: { x: number; y: number; z: number };
  name: Record<AppLanguage, string>;
  subtitle: Record<AppLanguage, string>;
  parts: CustomAssetPart[];
}

export type ModularConstructionItem = ModularModuleItem;

function part(
  p: Partial<CustomAssetPart> & Pick<CustomAssetPart, 'kind' | 'scale'>
): CustomAssetPart {
  return {
    kind: p.kind,
    name: p.name ?? 'Part',
    localPosition: p.localPosition ?? { x: 0, y: p.scale.y * 0.5, z: 0 },
    rotation: p.rotation ?? { x: 0, y: 0, z: 0 },
    scale: p.scale,
    color: p.color ?? '#e5e7eb',
    roughness: p.roughness ?? 0.76,
    metalness: p.metalness ?? 0.05,
    opacity: p.opacity ?? 1,
    emissive: p.emissive ?? '#000000',
    emissiveIntensity: p.emissiveIntensity ?? 0,
    flatShading: p.flatShading ?? false,
    subdivision: p.subdivision ?? { ...DEFAULT_SUBDIVISION_SETTINGS },
    archRole: p.archRole,
  };
}

export const MODULAR_CONSTRUCTION_CATALOG: ModularModuleItem[] = [
  /* =========================================================
     1. FLOORS & FOUNDATIONS (Standard 3.0m Grid)
     ========================================================= */
  {
    id: 'mod-floor-3x3',
    category: 'floors',
    archRole: 'floor',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 0.2, z: 3.0 },
    name: {
      id: 'Lantai Modular 3×3m',
      en: 'Floor Slab 3×3m',
      ja: 'モジュラー床 3×3m',
    },
    subtitle: {
      id: 'Plat lantai standar tebal 20cm',
      en: 'Standard 20cm structural floor slab',
      ja: '標準厚さ20cmの床スラブ',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Floor Slab 3x3',
        scale: { x: 3.0, y: 0.2, z: 3.0 },
        localPosition: { x: 0, y: 0.1, z: 0 },
        color: '#e2e8f0',
        roughness: 0.72,
        archRole: 'floor',
      }),
    ],
  },
  {
    id: 'mod-floor-15x3',
    category: 'floors',
    archRole: 'floor',
    surfaceRule: 'building-flat',
    moduleSize: { x: 1.5, y: 0.2, z: 3.0 },
    name: {
      id: 'Lantai Koridor 1.5×3m',
      en: 'Corridor Slab 1.5×3m',
      ja: '廊下・バルコニー床 1.5×3m',
    },
    subtitle: {
      id: 'Setengah modul untuk selasar & balkon',
      en: 'Half-width slab for hallways & balconies',
      ja: '廊下やベランダ用の半幅床パネル',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Corridor Slab',
        scale: { x: 1.5, y: 0.2, z: 3.0 },
        localPosition: { x: 0, y: 0.1, z: 0 },
        color: '#cbd5e1',
        roughness: 0.74,
        archRole: 'floor',
      }),
    ],
  },
  {
    id: 'mod-foundation-3x3',
    category: 'floors',
    archRole: 'floor',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 0.5, z: 3.0 },
    name: {
      id: 'Fondasi Batu 3×3m',
      en: 'Stone Foundation 3×3m',
      ja: '石積み基礎 3×3m',
    },
    subtitle: {
      id: 'Fondasi rumah tinggi 50cm anti-lembap',
      en: '50cm raised plinth foundation block',
      ja: '高さ50cmの住宅基礎ブロック',
    },
    parts: [
      part({
        kind: 'beveled-cube',
        name: 'Foundation Plinth',
        scale: { x: 3.0, y: 0.5, z: 3.0 },
        localPosition: { x: 0, y: 0.25, z: 0 },
        color: '#64748b',
        roughness: 0.88,
        archRole: 'floor',
      }),
    ],
  },
  {
    id: 'mod-deck-wood',
    category: 'floors',
    archRole: 'floor',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 0.18, z: 3.0 },
    name: {
      id: 'Deck Kayu Teras 3×3m',
      en: 'Wood Patio Deck 3×3m',
      ja: 'ウッドデッキ 3×3m',
    },
    subtitle: {
      id: 'Lantai kayu hangat untuk teras & taman',
      en: 'Warm timber deck module for patios',
      ja: 'テラスや庭向けの木製デッキ床',
    },
    parts: [
      part({
        kind: 'beveled-cube',
        name: 'Timber Deck',
        scale: { x: 3.0, y: 0.18, z: 3.0 },
        localPosition: { x: 0, y: 0.09, z: 0 },
        color: '#b77946',
        roughness: 0.6,
        archRole: 'floor',
      }),
    ],
  },

  /* =========================================================
     2. COMPATIBLE WALLS (Height 3.0m, Width 3.0m, Thickness 0.15m)
     ========================================================= */
  {
    id: 'mod-wall-3m',
    category: 'walls',
    archRole: 'wall',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 3.0, z: 0.15 },
    name: {
      id: 'Dinding Rumah 3×3m (15cm)',
      en: 'House Wall 3×3m (15cm)',
      ja: '標準住宅壁 3×3m (15cm)',
    },
    subtitle: {
      id: 'Tinggi rumah 3.0m • Lebar 3.0m • Tebal 15cm',
      en: '3.0m story height • 3.0m wide • 15cm thick',
      ja: '階高3.0m・幅3.0m・厚さ15cmの標準住宅壁',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Wall 3m',
        scale: { x: 3.0, y: 3.0, z: 0.15 },
        localPosition: { x: 0, y: 1.5, z: 0 },
        color: '#f1f5f9',
        roughness: 0.78,
        archRole: 'wall',
      }),
    ],
  },
  {
    id: 'mod-wall-15m',
    category: 'walls',
    archRole: 'wall',
    surfaceRule: 'building-flat',
    moduleSize: { x: 1.5, y: 3.0, z: 0.15 },
    name: {
      id: 'Dinding Sekat 1.5×3m (15cm)',
      en: 'Partition Wall 1.5×3m (15cm)',
      ja: '間仕切り壁 1.5×3m (15cm)',
    },
    subtitle: {
      id: 'Modul sekat 1.5m • Tinggi 3.0m • Tebal 15cm',
      en: '1.5m wide • 3.0m high • 15cm thick',
      ja: '幅1.5m・高さ3.0m・厚さ15cmの間仕切り壁',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Wall 1.5m',
        scale: { x: 1.5, y: 3.0, z: 0.15 },
        localPosition: { x: 0, y: 1.5, z: 0 },
        color: '#f1f5f9',
        roughness: 0.78,
        archRole: 'wall',
      }),
    ],
  },
  {
    id: 'mod-wall-glass',
    category: 'walls',
    archRole: 'wall',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 3.0, z: 0.15 },
    name: {
      id: 'Dinding Kaca Penuh 3m',
      en: 'Curtain Glass Wall 3m',
      ja: '全面ガラス壁 3m',
    },
    subtitle: {
      id: 'Kaca fasad modern dengan kusen hitam',
      en: 'Modern full-height glazed wall',
      ja: 'スリム黒枠のモダン全面ガラス壁',
    },
    parts: [
      part({
        kind: 'hollow-box',
        name: 'Mullion Frame',
        scale: { x: 3.0, y: 3.0, z: 0.15 },
        localPosition: { x: 0, y: 1.5, z: 0 },
        rotation: { x: 90, y: 0, z: 0 },
        color: '#1e293b',
        roughness: 0.35,
        metalness: 0.65,
        archRole: 'wall',
      }),
      part({
        kind: 'cube',
        name: 'Glass Pane',
        scale: { x: 2.76, y: 2.76, z: 0.05 },
        localPosition: { x: 0, y: 1.5, z: 0 },
        color: '#7dd3fc',
        roughness: 0.08,
        metalness: 0.15,
        opacity: 0.38,
        archRole: 'opening',
      }),
    ],
  },
  {
    id: 'mod-balcony-railing',
    category: 'walls',
    archRole: 'wall',
    surfaceRule: 'any',
    moduleSize: { x: 3.0, y: 1.05, z: 0.16 },
    name: {
      id: 'Railing Balkon Kaca 3m',
      en: 'Glass Balcony Railing 3m',
      ja: 'ガラス手すり 3m',
    },
    subtitle: {
      id: 'Pengaman balkon lantai atas tinggi 1.05m',
      en: '1.05m upper-floor safety railing',
      ja: '2階バルコニー・吹き抜け用安全手すり',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Top Handrail',
        scale: { x: 3.0, y: 0.07, z: 0.12 },
        localPosition: { x: 0, y: 1.015, z: 0 },
        color: '#334155',
        roughness: 0.3,
        metalness: 0.7,
        archRole: 'wall',
      }),
      part({
        kind: 'cube',
        name: 'Post L',
        scale: { x: 0.08, y: 1.0, z: 0.08 },
        localPosition: { x: -1.44, y: 0.5, z: 0 },
        color: '#334155',
        roughness: 0.3,
        metalness: 0.7,
        archRole: 'wall',
      }),
      part({
        kind: 'cube',
        name: 'Post R',
        scale: { x: 0.08, y: 1.0, z: 0.08 },
        localPosition: { x: 1.44, y: 0.5, z: 0 },
        color: '#334155',
        roughness: 0.3,
        metalness: 0.7,
        archRole: 'wall',
      }),
      part({
        kind: 'cube',
        name: 'Tempered Glass',
        scale: { x: 2.8, y: 0.86, z: 0.03 },
        localPosition: { x: 0, y: 0.5, z: 0 },
        color: '#bae6fd',
        roughness: 0.08,
        opacity: 0.42,
        archRole: 'opening',
      }),
    ],
  },

  /* =========================================================
     3. DOOR & WINDOW WALL MODULES (Seamless 3.0m x 3.0m x 0.15m)
     ========================================================= */
  {
    id: 'mod-door-wall',
    category: 'openings',
    archRole: 'wall',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 3.0, z: 0.15 },
    name: {
      id: 'Dinding + Pintu Kayu 3m',
      en: 'Doorway Wall Module 3m',
      ja: 'ドア付き壁パネル 3m',
    },
    subtitle: {
      id: 'Klop dengan Dinding 3m (15cm) & bisa dilewati',
      en: 'Matches 3m (15cm) walls flush with walk-through doorway',
      ja: '3m標準壁(15cm)とピタッと繋がる出入口パネル',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Left Pier',
        scale: { x: 0.95, y: 3.0, z: 0.15 },
        localPosition: { x: -1.025, y: 1.5, z: 0 },
        color: '#f1f5f9',
        archRole: 'wall',
      }),
      part({
        kind: 'cube',
        name: 'Right Pier',
        scale: { x: 0.95, y: 3.0, z: 0.15 },
        localPosition: { x: 1.025, y: 1.5, z: 0 },
        color: '#f1f5f9',
        archRole: 'wall',
      }),
      part({
        kind: 'cube',
        name: 'Door Header',
        scale: { x: 1.1, y: 0.8, z: 0.15 },
        localPosition: { x: 0, y: 2.6, z: 0 },
        color: '#f1f5f9',
        archRole: 'wall',
      }),
      part({
        kind: 'door-frame',
        name: 'Timber Jamb',
        scale: { x: 1.14, y: 2.22, z: 0.19 },
        localPosition: { x: 0, y: 1.11, z: 0 },
        color: '#9a5b2d',
        roughness: 0.55,
        archRole: 'opening',
      }),
    ],
  },
  {
    id: 'mod-window-wall',
    category: 'openings',
    archRole: 'wall',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 3.0, z: 0.15 },
    name: {
      id: 'Dinding + Jendela Lebar 3m',
      en: 'Window Wall Module 3m',
      ja: '大型窓付き壁パネル 3m',
    },
    subtitle: {
      id: 'Lubang jendela sejati + kusen & kaca bening (15cm)',
      en: 'True framed window opening with clear glass (15cm)',
      ja: '採光ガラスと窓枠付きの3m壁モジュール(15cm)',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Sill Wall',
        scale: { x: 3.0, y: 0.9, z: 0.15 },
        localPosition: { x: 0, y: 0.45, z: 0 },
        color: '#f1f5f9',
        archRole: 'wall',
      }),
      part({
        kind: 'cube',
        name: 'Lintel Wall',
        scale: { x: 3.0, y: 0.7, z: 0.15 },
        localPosition: { x: 0, y: 2.65, z: 0 },
        color: '#f1f5f9',
        archRole: 'wall',
      }),
      part({
        kind: 'cube',
        name: 'Left Jamb Wall',
        scale: { x: 0.6, y: 1.4, z: 0.15 },
        localPosition: { x: -1.2, y: 1.6, z: 0 },
        color: '#f1f5f9',
        archRole: 'wall',
      }),
      part({
        kind: 'cube',
        name: 'Right Jamb Wall',
        scale: { x: 0.6, y: 1.4, z: 0.15 },
        localPosition: { x: 1.2, y: 1.6, z: 0 },
        color: '#f1f5f9',
        archRole: 'wall',
      }),
      part({
        kind: 'window-frame',
        name: 'Window Mullion',
        scale: { x: 1.82, y: 1.42, z: 0.18 },
        localPosition: { x: 0, y: 1.6, z: 0 },
        color: '#334155',
        roughness: 0.38,
        metalness: 0.5,
        archRole: 'opening',
      }),
      part({
        kind: 'cube',
        name: 'Window Glass',
        scale: { x: 1.76, y: 1.36, z: 0.04 },
        localPosition: { x: 0, y: 1.6, z: 0 },
        color: '#7dd3fc',
        roughness: 0.08,
        opacity: 0.36,
        archRole: 'opening',
      }),
    ],
  },
  {
    id: 'mod-arch-wall',
    category: 'openings',
    archRole: 'wall',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 3.0, z: 0.15 },
    name: {
      id: 'Dinding Gerbang Lengkung 3m',
      en: 'Archway Wall Module 3m',
      ja: 'アーチ開口壁 3m',
    },
    subtitle: {
      id: 'Bukaan melengkung elegan antar ruang tamu (15cm)',
      en: 'Graceful arched pass-through wall module (15cm)',
      ja: '部屋同士を優雅につなぐアーチ開口壁(15cm)',
    },
    parts: [
      part({
        kind: 'arch',
        name: 'Archway Wall',
        scale: { x: 3.0, y: 3.0, z: 0.15 },
        localPosition: { x: 0, y: 1.5, z: 0 },
        color: '#f1f5f9',
        roughness: 0.76,
        archRole: 'wall',
      }),
    ],
  },

  /* =========================================================
     4. STAIRS & COLUMNS (Exact 3.0m Story Rise!)
     ========================================================= */
  {
    id: 'mod-stair-3m',
    category: 'stairs',
    archRole: 'floor',
    surfaceRule: 'any',
    moduleSize: { x: 1.2, y: 3.0, z: 3.0 },
    name: {
      id: 'Tangga Lantai 3m Presisi',
      en: 'Story Staircase (3.0m Rise)',
      ja: '階層階段（階高3.0m対応）',
    },
    subtitle: {
      id: 'Naik pas dari Lantai 1 (0m) ke Lantai 2 (3m)',
      en: 'Connects Floor 1 (0m) cleanly to Floor 2 (3.0m)',
      ja: '1階(0m)から2階(3.0m)へぴったり繋がる階段',
    },
    parts: [
      part({
        kind: 'stair',
        name: 'Lower Flight',
        scale: { x: 1.2, y: 1.5, z: 1.5 },
        localPosition: { x: 0, y: 0.75, z: 0.75 },
        color: '#b77946',
        roughness: 0.58,
        archRole: 'floor',
      }),
      part({
        kind: 'stair',
        name: 'Upper Flight',
        scale: { x: 1.2, y: 1.5, z: 1.5 },
        localPosition: { x: 0, y: 2.25, z: -0.75 },
        color: '#b77946',
        roughness: 0.58,
        archRole: 'floor',
      }),
      part({
        kind: 'cube',
        name: 'Support Spine',
        scale: { x: 0.9, y: 1.5, z: 1.48 },
        localPosition: { x: 0, y: 0.75, z: -0.75 },
        color: '#cbd5e1',
        roughness: 0.8,
        archRole: 'floor',
      }),
    ],
  },
  {
    id: 'mod-pillar-3m',
    category: 'stairs',
    archRole: 'wall',
    surfaceRule: 'building-flat',
    moduleSize: { x: 0.32, y: 3.0, z: 0.32 },
    name: {
      id: 'Kolom Pilar 3m',
      en: 'Structural Pillar 3m',
      ja: '構造角柱 3m',
    },
    subtitle: {
      id: 'Tiang penyangga teras & balkon tinggi 3m',
      en: '3.0m column for porches, carports & corners',
      ja: 'ポーチやバルコニーを支える3m柱',
    },
    parts: [
      part({
        kind: 'beveled-cube',
        name: 'Column Shaft',
        scale: { x: 0.3, y: 3.0, z: 0.3 },
        localPosition: { x: 0, y: 1.5, z: 0 },
        color: '#e2e8f0',
        roughness: 0.7,
        archRole: 'wall',
      }),
    ],
  },

  /* =========================================================
     5. COMPATIBLE ROOFS (Crowning 3x3m Modules with Overhang)
     ========================================================= */
  {
    id: 'mod-roof-gable',
    category: 'roofs',
    archRole: 'roof',
    surfaceRule: 'any',
    moduleSize: { x: 3.3, y: 1.35, z: 3.2 },
    name: {
      id: 'Atap Pelana 3m (Gable)',
      en: 'Gable Roof Module 3m',
      ja: '切妻屋根モジュール 3m',
    },
    subtitle: {
      id: 'Atap segitiga klasik dengan tritisan rapi',
      en: 'Classic pitched gable roof with eave overhang',
      ja: '軒の出を備えた定番の切妻屋根パーツ',
    },
    parts: [
      part({
        kind: 'triangle',
        name: 'Gable Roof',
        scale: { x: 3.35, y: 1.35, z: 3.15 },
        localPosition: { x: 0, y: 0.675, z: 0 },
        color: '#d96b43',
        roughness: 0.68,
        archRole: 'roof',
      }),
    ],
  },
  {
    id: 'mod-roof-hip',
    category: 'roofs',
    archRole: 'roof',
    surfaceRule: 'any',
    moduleSize: { x: 3.35, y: 1.4, z: 3.35 },
    name: {
      id: 'Atap Limas 3×3m (Hip)',
      en: 'Hip Pyramid Roof 3×3m',
      ja: '寄棟・方形屋根 3×3m',
    },
    subtitle: {
      id: 'Atap tropis empat sisi miring untuk rumah 3×3m',
      en: 'Four-sided tropical hip roof module',
      ja: '四方に傾斜した住宅・東屋向け屋根',
    },
    parts: [
      part({
        kind: 'pyramid',
        name: 'Hip Roof',
        scale: { x: 3.4, y: 1.4, z: 3.4 },
        localPosition: { x: 0, y: 0.7, z: 0 },
        color: '#c25934',
        roughness: 0.68,
        archRole: 'roof',
      }),
    ],
  },
  {
    id: 'mod-roof-shed',
    category: 'roofs',
    archRole: 'roof',
    surfaceRule: 'any',
    moduleSize: { x: 3.3, y: 0.9, z: 3.3 },
    name: {
      id: 'Atap Miring Modern (Shed)',
      en: 'Modern Mono-Pitch Roof',
      ja: '片流れモダン屋根 3m',
    },
    subtitle: {
      id: 'Atap satu arah bergaya rumah minimalis modern',
      en: 'Minimalist single-slope architectural roof',
      ja: '現代住宅に映えるシンプルな片流れ屋根',
    },
    parts: [
      part({
        kind: 'vertical-wedge',
        name: 'Mono Pitch Roof',
        scale: { x: 3.3, y: 0.9, z: 3.3 },
        localPosition: { x: 0, y: 0.45, z: 0 },
        color: '#475569',
        roughness: 0.62,
        archRole: 'roof',
      }),
    ],
  },

  /* =========================================================
     6. SITE, FENCES & SURFACE-AWARE LANDSCAPE
     ========================================================= */
  {
    id: 'mod-fence-2m',
    category: 'landscape',
    archRole: 'prop',
    surfaceRule: 'any',
    moduleSize: { x: 2.0, y: 1.1, z: 0.12 },
    name: {
      id: 'Pagar Halaman 2m',
      en: 'Garden Fence Panel 2m',
      ja: 'ガーデンフェンス 2m',
    },
    subtitle: {
      id: 'Cocok digandakan memanjang dengan fitur Deret!',
      en: 'Ideal for continuous fences with Repeat Array!',
      ja: '「連続配置」機能で長い柵を一瞬で作成可能',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Fence Post L',
        scale: { x: 0.1, y: 1.1, z: 0.1 },
        localPosition: { x: -0.95, y: 0.55, z: 0 },
        color: '#334155',
        roughness: 0.5,
      }),
      part({
        kind: 'cube',
        name: 'Fence Post R',
        scale: { x: 0.1, y: 1.1, z: 0.1 },
        localPosition: { x: 0.95, y: 0.55, z: 0 },
        color: '#334155',
        roughness: 0.5,
      }),
      part({
        kind: 'cube',
        name: 'Upper Rail',
        scale: { x: 1.9, y: 0.08, z: 0.05 },
        localPosition: { x: 0, y: 0.92, z: 0 },
        color: '#b77946',
        roughness: 0.6,
      }),
      part({
        kind: 'cube',
        name: 'Mid Rail',
        scale: { x: 1.9, y: 0.08, z: 0.05 },
        localPosition: { x: 0, y: 0.6, z: 0 },
        color: '#b77946',
        roughness: 0.6,
      }),
      part({
        kind: 'cube',
        name: 'Lower Rail',
        scale: { x: 1.9, y: 0.08, z: 0.05 },
        localPosition: { x: 0, y: 0.28, z: 0 },
        color: '#b77946',
        roughness: 0.6,
      }),
    ],
  },
  {
    id: 'mod-grass-tuft',
    category: 'landscape',
    archRole: 'prop',
    surfaceRule: 'ground-foliage',
    moduleSize: { x: 1.2, y: 0.35, z: 1.2 },
    name: {
      id: 'Hamparan Rumput & Semak',
      en: 'Garden Grass & Shrub',
      ja: '芝生＆ガーデン低木',
    },
    subtitle: {
      id: 'Aturan Permukaan: Hanya tumbuh di Tanah',
      en: 'Surface-Aware: Placed on Ground / Soil only',
      ja: 'サーフェス認識：地面（土・地形）専用',
    },
    parts: [
      part({
        kind: 'half-sphere',
        name: 'Bush Main',
        scale: { x: 0.95, y: 0.42, z: 0.95 },
        localPosition: { x: -0.1, y: 0.21, z: 0 },
        color: '#22c55e',
        roughness: 0.85,
      }),
      part({
        kind: 'half-sphere',
        name: 'Bush Accent',
        scale: { x: 0.62, y: 0.3, z: 0.62 },
        localPosition: { x: 0.32, y: 0.15, z: 0.2 },
        color: '#4ade80',
        roughness: 0.85,
      }),
    ],
  },
  {
    id: 'mod-garden-tree',
    category: 'landscape',
    archRole: 'prop',
    surfaceRule: 'ground-foliage',
    moduleSize: { x: 1.8, y: 3.2, z: 1.8 },
    name: {
      id: 'Pohon Taman Rindang',
      en: 'Garden Shade Tree',
      ja: 'シンボルツリー（庭木）',
    },
    subtitle: {
      id: 'Tegak otomatis di kontur tanah & bukit',
      en: 'Stays upright naturally on sculpted terrain',
      ja: '傾斜した地面でもまっすぐ立つ庭木',
    },
    parts: [
      part({
        kind: 'cylinder',
        name: 'Tree Trunk',
        scale: { x: 0.28, y: 1.4, z: 0.28 },
        localPosition: { x: 0, y: 0.7, z: 0 },
        color: '#784c2a',
        roughness: 0.88,
      }),
      part({
        kind: 'ellipsoid',
        name: 'Canopy Lower',
        scale: { x: 1.75, y: 1.5, z: 1.75 },
        localPosition: { x: 0, y: 1.95, z: 0 },
        color: '#16a34a',
        roughness: 0.82,
        flatShading: true,
      }),
      part({
        kind: 'ellipsoid',
        name: 'Canopy Crown',
        scale: { x: 1.15, y: 1.05, z: 1.15 },
        localPosition: { x: 0.12, y: 2.72, z: -0.08 },
        color: '#22c55e',
        roughness: 0.82,
        flatShading: true,
      }),
    ],
  },
  {
    id: 'mod-slope-boulder',
    category: 'landscape',
    archRole: 'prop',
    surfaceRule: 'slope-rock',
    moduleSize: { x: 1.3, y: 0.75, z: 1.1 },
    name: {
      id: 'Batu Alam Lereng',
      en: 'Natural Slope Boulder',
      ja: '自然岩（法面・傾斜対応）',
    },
    subtitle: {
      id: 'Aturan Permukaan: Bebas menempel di lereng curam',
      en: 'Surface-Aware: Adapts to steep hills & slopes',
      ja: 'サーフェス認識：急斜面にも自然に密着',
    },
    parts: [
      part({
        kind: 'octagonal-prism',
        name: 'Main Boulder',
        scale: { x: 1.1, y: 0.72, z: 0.95 },
        localPosition: { x: -0.08, y: 0.32, z: 0 },
        color: '#64748b',
        roughness: 0.9,
        flatShading: true,
      }),
      part({
        kind: 'octagonal-prism',
        name: 'Side Rock',
        scale: { x: 0.58, y: 0.42, z: 0.55 },
        localPosition: { x: 0.42, y: 0.19, z: 0.22 },
        color: '#475569',
        roughness: 0.9,
        flatShading: true,
      }),
    ],
  },
];

const modularThumbCache = new Map<string, string>();

export function getModularItemThumbnail(item: ModularModuleItem): string {
  const hit = modularThumbCache.get(item.id);
  if (hit !== undefined) return hit;
  const url = renderPartsThumbnailDataUrl(item.parts);
  modularThumbCache.set(item.id, url);
  return url;
}
