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
  | 'pillars'
  | 'fences'
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
    proceduralPattern: p.proceduralPattern,
    patternScale: p.patternScale,
    subdivision: p.subdivision ?? { ...DEFAULT_SUBDIVISION_SETTINGS },
    archRole: p.archRole,
  };
}

/**
 * Complementary Architectural Structural & Exterior Landscape Catalog (`Buat Rumah` only).
 * Smart Walls, Live Cutout Doors/Windows, Stairs & Roofs live in the top ArchStudioBar,
 * so this dock focuses purely on Foundations/Decks, Columns/Pergolas, Plot Fences/Gates, and Garden Landscape!
 */
export const MODULAR_CONSTRUCTION_CATALOG: ModularModuleItem[] = [
  /* =========================================================
     1. EXTERIOR DECKS, CARPORT PADS & FOUNDATIONS (`floors`)
     ========================================================= */
  {
    id: 'mod-foundation-3x3',
    category: 'floors',
    archRole: 'floor',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 0.45, z: 3.0 },
    name: {
      id: 'Fondasi Batu 3×3m',
      en: 'Stone Foundation 3×3m',
      ja: '石積み基礎 3×3m',
    },
    subtitle: {
      id: 'Fondasi rumah tinggi 45cm anti-lembap',
      en: '45cm raised plinth foundation block',
      ja: '高さ45cmの住宅基礎ブロック',
    },
    parts: [
      part({
        kind: 'beveled-cube',
        name: 'Foundation Plinth',
        scale: { x: 3.0, y: 0.45, z: 3.0 },
        localPosition: { x: 0, y: 0.225, z: 0 },
        color: '#64748b',
        roughness: 0.88,
        proceduralPattern: 'concrete',
        archRole: 'floor',
      }),
    ],
  },
  {
    id: 'mod-deck-wood',
    category: 'floors',
    archRole: 'floor',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 0.16, z: 3.0 },
    name: {
      id: 'Deck Kayu Teras 3×3m',
      en: 'Wood Patio Deck 3×3m',
      ja: 'ウッドデッキ 3×3m',
    },
    subtitle: {
      id: 'Lantai kayu serat hangat untuk teras & balkon',
      en: 'Timber deck module with wood grain',
      ja: '木目調のテラス・デッキ床パネル',
    },
    parts: [
      part({
        kind: 'beveled-cube',
        name: 'Timber Deck',
        scale: { x: 3.0, y: 0.16, z: 3.0 },
        localPosition: { x: 0, y: 0.08, z: 0 },
        color: '#b77946',
        roughness: 0.6,
        proceduralPattern: 'wood',
        archRole: 'floor',
      }),
    ],
  },
  {
    id: 'mod-porch-steps',
    category: 'floors',
    archRole: 'floor',
    surfaceRule: 'building-flat',
    moduleSize: { x: 2.0, y: 0.45, z: 1.1 },
    name: {
      id: 'Undakan Teras Depan',
      en: 'Front Porch Steps',
      ja: '玄関ポーチ階段',
    },
    subtitle: {
      id: '3 anak tangga lebar menuju pintu utama',
      en: '3-step wide entry porch stair',
      ja: '玄関アプローチ用の3段ステップ',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Step 1',
        scale: { x: 2.0, y: 0.15, z: 1.05 },
        localPosition: { x: 0, y: 0.075, z: 0 },
        color: '#cbd5e1',
        proceduralPattern: 'concrete',
        archRole: 'floor',
      }),
      part({
        kind: 'cube',
        name: 'Step 2',
        scale: { x: 1.88, y: 0.15, z: 0.7 },
        localPosition: { x: 0, y: 0.225, z: -0.175 },
        color: '#e2e8f0',
        proceduralPattern: 'concrete',
        archRole: 'floor',
      }),
      part({
        kind: 'cube',
        name: 'Step 3',
        scale: { x: 1.76, y: 0.15, z: 0.35 },
        localPosition: { x: 0, y: 0.375, z: -0.35 },
        color: '#f1f5f9',
        proceduralPattern: 'concrete',
        archRole: 'floor',
      }),
    ],
  },

  /* =========================================================
     2. STRUCTURAL PILLARS, BEAMS & PERGOLA CANOPIES (`pillars`)
     ========================================================= */
  {
    id: 'mod-pillar-3m',
    category: 'pillars',
    archRole: 'wall',
    surfaceRule: 'building-flat',
    moduleSize: { x: 0.3, y: 3.0, z: 0.3 },
    name: {
      id: 'Kolom Pilar 3m',
      en: 'Structural Pillar 3m',
      ja: '構造角柱 3m',
    },
    subtitle: {
      id: 'Tiang penyangga teras, carport & balkon 3.0m',
      en: '3.0m column for porches, carports & balconies',
      ja: 'ポーチやバルコニーを支える高さ3.0m柱',
    },
    parts: [
      part({
        kind: 'beveled-cube',
        name: 'Column Shaft',
        scale: { x: 0.28, y: 3.0, z: 0.28 },
        localPosition: { x: 0, y: 1.5, z: 0 },
        color: '#e2e8f0',
        roughness: 0.72,
        archRole: 'wall',
      }),
      part({
        kind: 'beveled-cube',
        name: 'Column Plinth',
        scale: { x: 0.36, y: 0.18, z: 0.36 },
        localPosition: { x: 0, y: 0.09, z: 0 },
        color: '#94a3b8',
        roughness: 0.8,
        archRole: 'wall',
      }),
    ],
  },
  {
    id: 'mod-pergola-3x3',
    category: 'pillars',
    archRole: 'roof',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 2.85, z: 3.0 },
    name: {
      id: 'Kanopi Pergola Kayu 3×3m',
      en: 'Timber Pergola 3×3m',
      ja: '木製パーゴラキャノピー 3×3m',
    },
    subtitle: {
      id: 'Peneduh teras & carport dengan kisi bayangan matahari',
      en: 'Slatted timber pergola casting crisp sun shadows',
      ja: '美しい日陰をつくるルーバーパーゴラ',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Post FL',
        scale: { x: 0.14, y: 2.75, z: 0.14 },
        localPosition: { x: -1.38, y: 1.375, z: 1.38 },
        color: '#334155',
        metalness: 0.55,
        roughness: 0.35,
      }),
      part({
        kind: 'cube',
        name: 'Post FR',
        scale: { x: 0.14, y: 2.75, z: 0.14 },
        localPosition: { x: 1.38, y: 1.375, z: 1.38 },
        color: '#334155',
        metalness: 0.55,
        roughness: 0.35,
      }),
      part({
        kind: 'cube',
        name: 'Post BL',
        scale: { x: 0.14, y: 2.75, z: 0.14 },
        localPosition: { x: -1.38, y: 1.375, z: -1.38 },
        color: '#334155',
        metalness: 0.55,
        roughness: 0.35,
      }),
      part({
        kind: 'cube',
        name: 'Post BR',
        scale: { x: 0.14, y: 2.75, z: 0.14 },
        localPosition: { x: 1.38, y: 1.375, z: -1.38 },
        color: '#334155',
        metalness: 0.55,
        roughness: 0.35,
      }),
      part({
        kind: 'hollow-box',
        name: 'Perimeter Beam',
        scale: { x: 3.0, y: 3.0, z: 0.16 },
        localPosition: { x: 0, y: 2.76, z: 0 },
        color: '#1e293b',
        metalness: 0.6,
        roughness: 0.32,
      }),
      ...[-1.0, -0.5, 0, 0.5, 1.0].map((zOff, i) =>
        part({
          kind: 'cube',
          name: `Timber Slat ${i + 1}`,
          scale: { x: 2.86, y: 0.12, z: 0.08 },
          localPosition: { x: 0, y: 2.84, z: zOff },
          color: '#b77946',
          proceduralPattern: 'wood',
          roughness: 0.55,
        })
      ),
    ],
  },
  {
    id: 'mod-glass-awning',
    category: 'pillars',
    archRole: 'roof',
    surfaceRule: 'any',
    moduleSize: { x: 2.4, y: 0.4, z: 1.2 },
    name: {
      id: 'Kanopi Kaca Gantung 2.4m',
      en: 'Cantilever Glass Awning',
      ja: 'ガラス庇（ひさし）2.4m',
    },
    subtitle: {
      id: 'Tempel di atas pintu masuk atau jendela luar',
      en: 'Mounts cleanly above entry doors & windows',
      ja: '玄関ドアや窓の上に取り付けるモダン庇',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Frame Rear',
        scale: { x: 2.4, y: 0.1, z: 0.1 },
        localPosition: { x: 0, y: 0.06, z: -0.55 },
        color: '#1e293b',
        metalness: 0.7,
        roughness: 0.3,
      }),
      part({
        kind: 'cube',
        name: 'Tempered Canopy Glass',
        scale: { x: 2.36, y: 0.04, z: 1.15 },
        localPosition: { x: 0, y: 0.06, z: 0.02 },
        color: '#bae6fd',
        opacity: 0.44,
        roughness: 0.08,
      }),
    ],
  },

  /* =========================================================
     3. PLOT FENCES & DRIVEWAY GATES (`fences`)
     ========================================================= */
  {
    id: 'mod-fence-slat-3m',
    category: 'fences',
    archRole: 'wall',
    surfaceRule: 'any',
    moduleSize: { x: 3.0, y: 1.5, z: 0.16 },
    name: {
      id: 'Pagar Besi & Bata 3m',
      en: 'Modern Iron & Masonry Fence',
      ja: 'モダン外構フェンス 3m',
    },
    subtitle: {
      id: 'Pagar kavling rumah tinggi 1.5m siap di-Array',
      en: '1.5m perimeter fence ready for Repeat Array',
      ja: '敷地境界に並べて使える高さ1.5mフェンス',
    },
    parts: [
      part({
        kind: 'cube',
        name: 'Low Masonry Curb',
        scale: { x: 3.0, y: 0.55, z: 0.16 },
        localPosition: { x: 0, y: 0.275, z: 0 },
        color: '#cbd5e1',
        proceduralPattern: 'concrete',
      }),
      part({
        kind: 'cube',
        name: 'Left Pier',
        scale: { x: 0.24, y: 1.5, z: 0.24 },
        localPosition: { x: -1.38, y: 0.75, z: 0 },
        color: '#e2e8f0',
      }),
      part({
        kind: 'cube',
        name: 'Top Iron Rail',
        scale: { x: 2.76, y: 0.06, z: 0.06 },
        localPosition: { x: 0.12, y: 1.42, z: 0 },
        color: '#1e293b',
        metalness: 0.65,
        roughness: 0.32,
      }),
      ...[-0.9, -0.45, 0, 0.45, 0.9, 1.32].map((xOff, idx) =>
        part({
          kind: 'cube',
          name: `Vertical Slat ${idx + 1}`,
          scale: { x: 0.05, y: 0.86, z: 0.05 },
          localPosition: { x: xOff, y: 0.98, z: 0 },
          color: '#1e293b',
          metalness: 0.65,
          roughness: 0.32,
        })
      ),
    ],
  },
  {
    id: 'mod-driveway-gate',
    category: 'fences',
    archRole: 'opening',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.2, y: 1.6, z: 0.14 },
    name: {
      id: 'Gerbang Geser Kayu & Besi',
      en: 'Sliding Driveway Gate 3.2m',
      ja: 'スライド車庫ゲート 3.2m',
    },
    subtitle: {
      id: 'Pintu gerbang carport modern lebar 3.2m',
      en: '3.2m modern timber-and-steel driveway gate',
      ja: '木目ルーバーと黒鉄フレームの車庫門扉',
    },
    parts: [
      part({
        kind: 'hollow-box',
        name: 'Steel Gate Frame',
        scale: { x: 3.2, y: 1.55, z: 0.1 },
        localPosition: { x: 0, y: 0.82, z: 0 },
        rotation: { x: 90, y: 0, z: 0 },
        color: '#1e293b',
        metalness: 0.7,
        roughness: 0.3,
      }),
      part({
        kind: 'cube',
        name: 'Timber Infill Panel',
        scale: { x: 3.04, y: 1.38, z: 0.05 },
        localPosition: { x: 0, y: 0.82, z: 0 },
        color: '#9a5b2d',
        proceduralPattern: 'wood',
        roughness: 0.58,
      }),
    ],
  },

  /* =========================================================
     4. GARDEN, COURTYARD WATER & TERRAIN LANDSCAPE (`landscape`)
     ========================================================= */
  {
    id: 'mod-stepping-path',
    category: 'landscape',
    archRole: 'floor',
    surfaceRule: 'any',
    moduleSize: { x: 1.2, y: 0.08, z: 3.0 },
    name: {
      id: 'Jalan Setapak Taman 3m',
      en: 'Garden Stepping Stones 3m',
      ja: '飛び石ガーデンパス 3m',
    },
    subtitle: {
      id: 'Batu pijakan taman menuju teras rumah',
      en: 'Architectural slate pavers for garden walkways',
      ja: '庭から玄関へ続くモダン飛び石アプローチ',
    },
    parts: [-1.05, -0.35, 0.35, 1.05].map((zOff, i) =>
      part({
        kind: 'beveled-cube',
        name: `Paver ${i + 1}`,
        scale: { x: 0.92, y: 0.07, z: 0.52 },
        localPosition: { x: (i % 2 === 0 ? -1 : 1) * 0.06, y: 0.035, z: zOff },
        color: '#94a3b8',
        proceduralPattern: 'concrete',
        roughness: 0.82,
        archRole: 'floor',
      })
    ),
  },
  {
    id: 'mod-reflecting-pool',
    category: 'landscape',
    archRole: 'prop',
    surfaceRule: 'building-flat',
    moduleSize: { x: 3.0, y: 0.32, z: 2.0 },
    name: {
      id: 'Kolam Taman / Koi 3×2m',
      en: 'Courtyard Water Pool 3×2m',
      ja: '中庭ウォータープール 3×2m',
    },
    subtitle: {
      id: 'Kolam air bening dengan bibir batu marmer',
      en: 'Tranquil courtyard pool with stone coping',
      ja: '石枠付きの透明感のあるガーデン水盤',
    },
    parts: [
      part({
        kind: 'hollow-box',
        name: 'Pool Stone Rim',
        scale: { x: 3.0, y: 2.0, z: 0.32 },
        localPosition: { x: 0, y: 0.16, z: 0 },
        color: '#cbd5e1',
        proceduralPattern: 'marble',
        roughness: 0.4,
      }),
      part({
        kind: 'cube',
        name: 'Pool Basin Floor',
        scale: { x: 2.76, y: 0.06, z: 1.76 },
        localPosition: { x: 0, y: 0.03, z: 0 },
        color: '#0f766e',
        proceduralPattern: 'tile',
        roughness: 0.35,
      }),
      part({
        kind: 'cube',
        name: 'Clear Water Surface',
        scale: { x: 2.74, y: 0.18, z: 1.74 },
        localPosition: { x: 0, y: 0.16, z: 0 },
        color: '#38bdf8',
        opacity: 0.58,
        roughness: 0.06,
        metalness: 0.18,
      }),
    ],
  },
  {
    id: 'mod-garden-bush',
    category: 'landscape',
    archRole: 'prop',
    surfaceRule: 'ground-foliage',
    moduleSize: { x: 1.2, y: 0.65, z: 1.2 },
    name: {
      id: 'Semak Taman Hijau',
      en: 'Ornamental Garden Bush',
      ja: 'ガーデン低木シュラブ',
    },
    subtitle: {
      id: 'Otomatis tegak mengikuti kontur tanah & lereng',
      en: 'Adapts naturally to sculpted garden terrain',
      ja: '地形スカルプトに合わせて自然に配置',
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
