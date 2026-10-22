import * as THREE from 'three';
import {
  AppLanguage,
  ArchitecturalRole,
  CustomAssetPart,
  DEFAULT_SUBDIVISION_SETTINGS,
  HousePresetCategory,
  PrimitiveKind,
  Vec3,
} from '../types/studio';
import { createPrimitiveGeometry } from './primitives';

export interface HousePresetItem {
  id: string;
  category: Exclude<HousePresetCategory, 'all' | 'custom'>;
  archRole: ArchitecturalRole;
  title: Record<AppLanguage, string>;
  subtitle: Record<AppLanguage, string>;
  description: Record<AppLanguage, string>;
  parts: CustomAssetPart[];
}

function part(
  name: string,
  kind: PrimitiveKind,
  pos: [number, number, number],
  scale: [number, number, number],
  color: string,
  opts: Partial<{
    rot: [number, number, number];
    roughness: number;
    metalness: number;
    opacity: number;
    emissive: string;
    emissiveIntensity: number;
    archRole: ArchitecturalRole;
  }> = {}
): CustomAssetPart {
  const r = opts.rot ?? [0, 0, 0];
  return {
    name,
    kind,
    localPosition: { x: pos[0], y: pos[1], z: pos[2] },
    rotation: { x: r[0], y: r[1], z: r[2] },
    scale: { x: scale[0], y: scale[1], z: scale[2] },
    color,
    roughness: opts.roughness ?? 0.65,
    metalness: opts.metalness ?? 0.06,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    flatShading: false,
    subdivision: { ...DEFAULT_SUBDIVISION_SETTINGS },
    archRole: opts.archRole,
  };
}

export const HOUSE_PRESETS_CATALOG: HousePresetItem[] = [
  // ==================== 1. WALLS ====================
  {
    id: 'wall-straight-3m',
    category: 'walls',
    archRole: 'wall',
    title: {
      id: 'Dinding Lurus 3m',
      en: 'Straight Wall 3m',
      ja: 'ストレート壁 (3m)',
    },
    subtitle: {
      id: 'Tembok plester + lis bawah',
      en: 'Plaster wall + baseboard',
      ja: '巾木付きの標準壁パネル',
    },
    description: {
      id: 'Dinding bangunan panjang 3 meter dan tinggi 2,8 meter lengkap dengan lis kayu bawah (plint). Mudah disambung menggunakan Snap.',
      en: '3m wide × 2.8m tall plaster wall panel with wooden baseboard trim. Snaps cleanly edge-to-edge.',
      ja: '幅3m・高さ2.8mの標準的な壁パネル。木製の巾木付きでスナップ接続に最適です。',
    },
    parts: [
      part('Tembok Utama', 'cube', [0, 1.4, 0], [3.0, 2.8, 0.2], '#f1f5f9', {
        roughness: 0.82,
        archRole: 'wall',
      }),
      part('Lis Bawah', 'cube', [0, 0.07, 0], [3.02, 0.14, 0.23], '#8b5e3c', {
        roughness: 0.55,
        archRole: 'wall',
      }),
    ],
  },
  {
    id: 'wall-corner-l',
    category: 'walls',
    archRole: 'wall',
    title: {
      id: 'Dinding Sudut L',
      en: 'L-Corner Wall',
      ja: 'L字コーナー壁',
    },
    subtitle: {
      id: 'Sudut ruangan siku 90°',
      en: '90° room corner module',
      ja: '部屋の角を作る直角壁',
    },
    description: {
      id: 'Modul sudut ruangan 90° siap pakai agar pertemuan dua sisi dinding luar maupun dalam langsung rapi tanpa celah.',
      en: 'Ready-made 90° corner wall module for crisp interior and exterior room corners.',
      ja: '部屋の角を隙間なくきれいに作れる90度L字壁モジュールです。',
    },
    parts: [
      part('Dinding Sisi A', 'cube', [0, 1.4, -1.4], [3.0, 2.8, 0.2], '#f1f5f9', {
        roughness: 0.82,
        archRole: 'wall',
      }),
      part('Dinding Sisi B', 'cube', [-1.4, 1.4, 0.1], [0.2, 2.8, 2.8], '#f1f5f9', {
        roughness: 0.82,
        archRole: 'wall',
      }),
    ],
  },
  {
    id: 'wall-doorway',
    category: 'walls',
    archRole: 'wall',
    title: {
      id: 'Dinding + Kusen Pintu',
      en: 'Doorway Wall',
      ja: 'ドア枠付き壁',
    },
    subtitle: {
      id: 'Tembok 3m berlubang pintu',
      en: '3m wall with door opening',
      ja: '出入り口付きの3m壁',
    },
    description: {
      id: 'Dinding 3 meter dengan bukaan pintu tengah lengkap beserta kusen kayu jati, siap dilewati saat mode Jalan Kaki.',
      en: '3m wall featuring a walk-through center doorway framed in warm teak wood.',
      ja: '中央に木製ドア枠を備えた壁モジュール。ウォークスルーで通り抜け可能です。',
    },
    parts: [
      part('Tembok Kiri', 'cube', [-1.025, 1.4, 0], [0.95, 2.8, 0.2], '#f1f5f9', {
        archRole: 'wall',
      }),
      part('Tembok Kanan', 'cube', [1.025, 1.4, 0], [0.95, 2.8, 0.2], '#f1f5f9', {
        archRole: 'wall',
      }),
      part('Tembok Atas Pintu', 'cube', [0, 2.475, 0], [1.1, 0.65, 0.2], '#f1f5f9', {
        archRole: 'wall',
      }),
      part('Kusen Pintu', 'door-frame', [0, 1.08, 0], [1.14, 2.16, 0.25], '#9a5b32', {
        roughness: 0.52,
        archRole: 'opening',
      }),
    ],
  },
  {
    id: 'wall-window',
    category: 'walls',
    archRole: 'wall',
    title: {
      id: 'Dinding + Jendela Kaca',
      en: 'Window Wall',
      ja: 'ガラス窓付き壁',
    },
    subtitle: {
      id: 'Tembok berjendela bening',
      en: 'Wall with framed glass window',
      ja: '透明ガラス窓付きの3m壁',
    },
    description: {
      id: 'Dinding 3 meter lengkap dengan lubang jendela, kusen kayu 4 kisi, dan kaca biru bening yang tembus pandang ke dalam rumah.',
      en: '3m wall module with a 4-pane wooden window and clear tinted glass.',
      ja: '4分割の木製窓枠と半透明ガラスが組み込まれた明るい壁パネルです。',
    },
    parts: [
      part('Tembok Bawah', 'cube', [0, 0.45, 0], [3.0, 0.9, 0.2], '#f1f5f9', {
        archRole: 'wall',
      }),
      part('Tembok Atas', 'cube', [0, 2.45, 0], [3.0, 0.7, 0.2], '#f1f5f9', {
        archRole: 'wall',
      }),
      part('Tembok Samping Kiri', 'cube', [-1.1, 1.5, 0], [0.8, 1.2, 0.2], '#f1f5f9', {
        archRole: 'wall',
      }),
      part('Tembok Samping Kanan', 'cube', [1.1, 1.5, 0], [0.8, 1.2, 0.2], '#f1f5f9', {
        archRole: 'wall',
      }),
      part('Kusen Jendela', 'window-frame', [0, 1.5, 0], [1.42, 1.22, 0.25], '#8b5e3c', {
        roughness: 0.5,
        archRole: 'opening',
      }),
      part('Kaca Jendela', 'cube', [0, 1.5, 0], [1.32, 1.12, 0.04], '#7dd3fc', {
        roughness: 0.08,
        metalness: 0.2,
        opacity: 0.36,
        archRole: 'opening',
      }),
    ],
  },
  {
    id: 'wall-glass-partition',
    category: 'walls',
    archRole: 'wall',
    title: {
      id: 'Partisi Kaca Modern',
      en: 'Modern Glass Wall',
      ja: 'モダンガラス壁',
    },
    subtitle: {
      id: 'Bingkai hitam + kaca penuh',
      en: 'Black aluminum frame + glass',
      ja: '黒フレームの全面ガラス壁',
    },
    description: {
      id: 'Dinding kaca penuh bergaya vila modern dengan bingkai aluminium hitam matte.',
      en: 'Full-height modern villa glass wall with sleek matte-black framing.',
      ja: 'モダン建築やリビングに映える黒フレームの全面ガラスパーティション。',
    },
    parts: [
      part('Bingkai Luar', 'hollow-box', [0, 1.4, 0], [3.0, 2.8, 0.14], '#1e293b', {
        rot: [90, 0, 0],
        roughness: 0.35,
        metalness: 0.65,
        archRole: 'wall',
      }),
      part('Tiang Tengah', 'cube', [0, 1.4, 0], [0.06, 2.72, 0.12], '#1e293b', {
        roughness: 0.35,
        metalness: 0.65,
        archRole: 'wall',
      }),
      part('Panel Kaca Lebar', 'cube', [0, 1.4, 0], [2.86, 2.68, 0.04], '#93c5fd', {
        roughness: 0.06,
        metalness: 0.2,
        opacity: 0.34,
        archRole: 'wall',
      }),
    ],
  },
  {
    id: 'wall-balcony-railing',
    category: 'walls',
    archRole: 'prop',
    title: {
      id: 'Pagar Balkon Kaca',
      en: 'Glass Balcony Railing',
      ja: 'ガラス手すり・フェンス',
    },
    subtitle: {
      id: 'Tiang baja + kaca + kayu',
      en: 'Steel posts + glass + handrail',
      ja: 'テラスや吹き抜け用の手すり',
    },
    description: {
      id: 'Pagar pengaman balkon atau teras lantai dua dengan kaca bening dan pegangan kayu hangat.',
      en: 'Modern balcony safety railing with tempered glass and warm wooden top rail.',
      ja: 'バルコニーや2階ホールに最適なガラスパネル付き手すりです。',
    },
    parts: [
      part('Tiang Kiri', 'cube', [-1.42, 0.5, 0], [0.08, 1.0, 0.08], '#334155', {
        metalness: 0.7,
        roughness: 0.3,
      }),
      part('Tiang Kanan', 'cube', [1.42, 0.5, 0], [0.08, 1.0, 0.08], '#334155', {
        metalness: 0.7,
        roughness: 0.3,
      }),
      part('Pegangan Atas', 'rounded-box', [0, 1.02, 0], [3.0, 0.07, 0.12], '#a16207', {
        roughness: 0.48,
      }),
      part('Kaca Pagar', 'cube', [0, 0.52, 0], [2.76, 0.82, 0.03], '#bae6fd', {
        opacity: 0.38,
        roughness: 0.08,
      }),
    ],
  },

  // ==================== 2. FLOORS & DECK ====================
  {
    id: 'floor-tile-4x4',
    category: 'floors',
    archRole: 'floor',
    title: {
      id: 'Lantai Keramik 4×4m',
      en: 'Ceramic Floor 4×4m',
      ja: 'タイル床パネル (4×4m)',
    },
    subtitle: {
      id: 'Pelat lantai marmer terang',
      en: 'Polished cream floor slab',
      ja: '明るい大理石調の床スラブ',
    },
    description: {
      id: 'Pelat lantai bangunan ukuran 4×4 meter bertekstur marmer krem halus. Mudah dijajarkan untuk membentuk denah ruangan.',
      en: '4×4m polished cream marble floor slab. Tile multiple slabs side-by-side to form any room layout.',
      ja: '4×4mの使いやすい床パネル。並べるだけで部屋の間取りを素早く作れます。',
    },
    parts: [
      part('Pelat Lantai', 'cube', [0, 0.08, 0], [4.0, 0.16, 4.0], '#ede9fe', {
        roughness: 0.28,
        metalness: 0.06,
        archRole: 'floor',
      }),
    ],
  },
  {
    id: 'floor-wood-4x4',
    category: 'floors',
    archRole: 'floor',
    title: {
      id: 'Lantai Kayu Parket 4×4m',
      en: 'Wood Parquet Floor 4×4m',
      ja: 'フローリング床 (4×4m)',
    },
    subtitle: {
      id: 'Lantai kayu hangat ruang dalam',
      en: 'Warm oak interior flooring',
      ja: '温かみのある木目調フロア',
    },
    description: {
      id: 'Pelat lantai kayu jati hangat berukuran 4×4 meter untuk kamar tidur, ruang keluarga, atau lantai dua.',
      en: '4×4m warm oak flooring slab ideal for bedrooms, living rooms, and upper floors.',
      ja: '寝室やリビングにぴったりな4×4mのナチュラルウッド床パネルです。',
    },
    parts: [
      part('Lantai Kayu', 'cube', [0, 0.08, 0], [4.0, 0.16, 4.0], '#b77946', {
        roughness: 0.52,
        metalness: 0.05,
        archRole: 'floor',
      }),
    ],
  },
  {
    id: 'floor-deck-steps',
    category: 'floors',
    archRole: 'floor',
    title: {
      id: 'Teras Depan + Anak Tangga',
      en: 'Front Porch + Steps',
      ja: '玄関ポーチ＆ステップ',
    },
    subtitle: {
      id: 'Dek teras rumah + undakan',
      en: 'Raised entry deck with stairs',
      ja: '階段付きの玄関デッキ',
    },
    description: {
      id: 'Panggung teras depan rumah lengkap dengan dua undakan tangga sambutan yang elegan.',
      en: 'Welcoming front entry porch deck with wide two-step stairs.',
      ja: '家の入り口を華やかにする階段付きの玄関テラスデッキです。',
    },
    parts: [
      part('Dek Utama', 'cube', [0, 0.18, -0.25], [3.2, 0.36, 2.0], '#78716c', {
        roughness: 0.78,
        archRole: 'floor',
      }),
      part('Undakan Tengah', 'cube', [0, 0.12, 0.95], [2.0, 0.24, 0.42], '#a8a29e', {
        roughness: 0.72,
        archRole: 'floor',
      }),
      part('Undakan Bawah', 'cube', [0, 0.06, 1.35], [2.0, 0.12, 0.42], '#d6d3d1', {
        roughness: 0.72,
        archRole: 'floor',
      }),
    ],
  },
  {
    id: 'floor-pillar-classic',
    category: 'floors',
    archRole: 'prop',
    title: {
      id: 'Tiang Pilar Teras 2.8m',
      en: 'Porch Pillar 2.8m',
      ja: 'テラス円柱ピラー (2.8m)',
    },
    subtitle: {
      id: 'Umpak + kolom alur + mahkota',
      en: 'Base + fluted shaft + capital',
      ja: '台座と柱頭付きの装飾柱',
    },
    description: {
      id: 'Tiang penyangga teras atau balkon setinggi 2,8 meter lengkap dengan umpak bawah dan mahkota atas.',
      en: '2.8m architectural support column complete with plinth base, fluted shaft, and capital.',
      ja: '玄関ポーチや吹き抜けを支える高さ2.8mのクラシカルな装飾柱です。',
    },
    parts: [
      part('Umpak Dasar', 'column-base', [0, 0.18, 0], [0.52, 0.36, 0.52], '#e2e8f0', {
        roughness: 0.65,
      }),
      part('Batang Kolom', 'fluted-column', [0, 1.4, 0], [0.36, 2.1, 0.36], '#f8fafc', {
        roughness: 0.6,
      }),
      part('Mahkota Kolom', 'column-capital', [0, 2.62, 0], [0.54, 0.36, 0.54], '#e2e8f0', {
        roughness: 0.65,
      }),
    ],
  },

  // ==================== 3. ROOFS ====================
  {
    id: 'roof-gable-4m',
    category: 'roofs',
    archRole: 'roof',
    title: {
      id: 'Atap Pelana (Gable) 4.4m',
      en: 'Gable Roof 4.4m',
      ja: '切妻屋根 (4.4m)',
    },
    subtitle: {
      id: 'Atap segitiga klasik + bubungan',
      en: 'Classic pitched roof + ridge',
      ja: '定番の三角屋根＋棟飾り',
    },
    description: {
      id: 'Atap pelana terakota lebar 4,4 meter lengkap dengan balok bubungan atas dan lisplang putih. Otomatis disembunyikan saat fitur Intip Ruang aktif!',
      en: '4.4m wide terracotta gable roof with ridge cap and fascia trim. Automatically hides during Peek Inside mode!',
      ja: '幅4.4mの定番切妻屋根。「室内表示」オンで自動的に非表示になり部屋の中を編集しやすくなります。',
    },
    parts: [
      part('Atap Utama', 'triangular-prism', [0, 0.78, 0], [4.4, 1.45, 4.4], '#c85a32', {
        roughness: 0.68,
        archRole: 'roof',
      }),
      part('Lisplang Dasar', 'cube', [0, 0.04, 0], [4.52, 0.08, 4.52], '#f8fafc', {
        roughness: 0.6,
        archRole: 'roof',
      }),
      part('Bubungan Atas', 'cylinder', [0, 1.5, 0], [0.16, 4.46, 0.16], '#7c2d12', {
        rot: [90, 0, 0],
        roughness: 0.62,
        archRole: 'roof',
      }),
    ],
  },
  {
    id: 'roof-hip-4m',
    category: 'roofs',
    archRole: 'roof',
    title: {
      id: 'Atap Limas / Perisai',
      en: 'Hip Pyramid Roof',
      ja: '寄棟・ピラミッド屋根',
    },
    subtitle: {
      id: 'Atap 4 sisi miring elegan',
      en: '4-sided sloped villa roof',
      ja: '4方向に傾斜したモダン屋根',
    },
    description: {
      id: 'Atap perisai empat sisi bergaya rumah tropis Indonesia lengkap dengan tritisan lebar penahan hujan.',
      en: 'Tropical 4-sided hip roof with wide overhanging eaves.',
      ja: '南国ヴィラや住宅に似合う、軒の深い4方向傾斜屋根です。',
    },
    parts: [
      part('Limas Atap', 'pyramid-frustum', [0, 0.72, 0], [4.5, 1.32, 4.5], '#475569', {
        roughness: 0.64,
        archRole: 'roof',
      }),
      part('Puncak Bubungan', 'pyramid', [0, 1.52, 0], [2.25, 0.32, 2.25], '#334155', {
        roughness: 0.64,
        archRole: 'roof',
      }),
      part('Lis Eaves', 'cube', [0, 0.04, 0], [4.62, 0.08, 4.62], '#e2e8f0', {
        archRole: 'roof',
      }),
    ],
  },
  {
    id: 'roof-modern-mono',
    category: 'roofs',
    archRole: 'roof',
    title: {
      id: 'Atap Miring Modern',
      en: 'Modern Shed Roof',
      ja: '片流れモダン屋根',
    },
    subtitle: {
      id: 'Atap minimalis satu kemiringan',
      en: 'Minimalist single-slope roof',
      ja: 'スタイリッシュな片流れ屋根',
    },
    description: {
      id: 'Atap satu kemiringan bergaya arsitektur minimalis kontemporer.',
      en: 'Sleek single-pitch architectural roof for contemporary homes.',
      ja: '現代住宅で人気のシャープな片流れ屋根モジュールです。',
    },
    parts: [
      part('Pelat Atap Miring', 'cube', [0, 0.48, 0], [4.5, 0.16, 4.6], '#334155', {
        rot: [11, 0, 0],
        roughness: 0.55,
        archRole: 'roof',
      }),
    ],
  },
  {
    id: 'roof-glass-canopy',
    category: 'roofs',
    archRole: 'roof',
    title: {
      id: 'Kanopi Kaca Teras',
      en: 'Glass Patio Canopy',
      ja: 'ガラス庇・キャノピー',
    },
    subtitle: {
      id: 'Rangka baja + atap kaca teduh',
      en: 'Steel frame + tinted glass',
      ja: '玄関やテラス用のガラス屋根',
    },
    description: {
      id: 'Kanopi peneduh teras atau carport dengan rangka baja hitam dan atap kaca bening.',
      en: 'Sleek steel-framed glass canopy for patios, balconies, and carports.',
      ja: 'テラスや玄関先をおしゃれに彩るスチール枠のガラスキャノピー。',
    },
    parts: [
      part('Rangka Kiri', 'cube', [-1.35, 0.06, 0], [0.09, 0.1, 1.8], '#1e293b', {
        metalness: 0.7,
        archRole: 'roof',
      }),
      part('Rangka Kanan', 'cube', [1.35, 0.06, 0], [0.09, 0.1, 1.8], '#1e293b', {
        metalness: 0.7,
        archRole: 'roof',
      }),
      part('Kaca Kanopi', 'cube', [0, 0.11, 0], [2.9, 0.04, 1.85], '#7dd3fc', {
        opacity: 0.44,
        roughness: 0.08,
        archRole: 'roof',
      }),
    ],
  },

  // ==================== 4. DOORS, WINDOWS & STAIRS ====================
  {
    id: 'open-front-door',
    category: 'openings',
    archRole: 'opening',
    title: {
      id: 'Pintu Kayu + Gagang Emas',
      en: 'Wood Door + Brass Handle',
      ja: '木製ドア（真鍮ハンドル付）',
    },
    subtitle: {
      id: 'Kusen + daun pintu + gagang',
      en: 'Framed door leaf with hardware',
      ja: '枠・ドアパネル・取っ手セット',
    },
    description: {
      id: 'Set pintu lengkap dengan kusen kayu jati, daun pintu panel, dan gagang kuningan emas berkilau.',
      en: 'Complete wooden entry door with frame, recessed panel detailing, and polished brass handle.',
      ja: '木製フレームにドア本体とゴールドのドアノブを組み合わせた完成ドアセット。',
    },
    parts: [
      part('Kusen Pintu', 'door-frame', [0, 1.08, 0], [1.1, 2.16, 0.18], '#7c4728', {
        roughness: 0.5,
      }),
      part('Daun Pintu', 'cube', [0, 1.03, 0], [0.88, 2.04, 0.07], '#a16236', {
        roughness: 0.46,
      }),
      part('Gagang Kuningan', 'sphere', [0.33, 1.0, 0.07], [0.07, 0.07, 0.09], '#facc15', {
        metalness: 0.88,
        roughness: 0.2,
      }),
    ],
  },
  {
    id: 'open-casement-window',
    category: 'openings',
    archRole: 'opening',
    title: {
      id: 'Jendela Kaca Lengkap',
      en: 'Framed Glass Window',
      ja: 'ガラス入り木製窓',
    },
    subtitle: {
      id: 'Kusen 4 kisi + kaca + ambang',
      en: '4-pane frame + glass + sill',
      ja: '窓台付きの4分割ガラス窓',
    },
    description: {
      id: 'Jendela rumah siap tempel ke dinding mana pun (otomatis berdiri tegak bila memakai fitur Surface!).',
      en: 'Complete 4-pane window with clear glass and projecting sill. Snaps upright onto walls with Surface ON!',
      ja: '窓枠・透明ガラス・窓台のセット。「面吸着」を使えば壁にピタッと垂直配置できます。',
    },
    parts: [
      part('Kusen 4 Kisi', 'window-frame', [0, 0.65, 0], [1.3, 1.2, 0.16], '#8b5e3c', {
        roughness: 0.48,
      }),
      part('Kaca Bening', 'cube', [0, 0.65, 0], [1.2, 1.1, 0.03], '#7dd3fc', {
        opacity: 0.38,
        roughness: 0.06,
      }),
      part('Ambang Bawah', 'cube', [0, 0.03, 0.04], [1.42, 0.06, 0.24], '#e2e8f0', {
        roughness: 0.6,
      }),
    ],
  },
  {
    id: 'open-stairs-flight',
    category: 'openings',
    archRole: 'opening',
    title: {
      id: 'Tangga Lantai 2 + Railing',
      en: 'Staircase + Handrail',
      ja: '室内階段（手すり付き）',
    },
    subtitle: {
      id: 'Tangga kayu naik ke lantai atas',
      en: 'Full flight stairs with railing',
      ja: '2階へつながる手すり付き階段',
    },
    description: {
      id: 'Tangga penghubung antar lantai setinggi 2,8 meter lengkap dengan tiang dan pegangan samping.',
      en: 'Full-height staircase connecting ground floor to a 2.8m upper story, complete with side handrail.',
      ja: '高さ2.8mの上階へスムーズにつながる手すり付き階段ユニットです。',
    },
    parts: [
      part('Undakan Bawah', 'stair', [0, 0.7, 0.9], [1.15, 1.4, 1.6], '#b77946', {
        roughness: 0.52,
      }),
      part('Undakan Atas', 'stair', [0, 2.1, -0.7], [1.15, 1.4, 1.6], '#b77946', {
        roughness: 0.52,
      }),
      part('Tiang Bawah', 'cube', [0.54, 0.55, 1.62], [0.07, 1.1, 0.07], '#334155', {
        metalness: 0.6,
      }),
      part('Tiang Atas', 'cube', [0.54, 3.25, -1.42], [0.07, 1.1, 0.07], '#334155', {
        metalness: 0.6,
      }),
      part('Pegangan Miring', 'cube', [0.54, 2.02, 0.1], [0.06, 0.07, 3.65], '#7c4728', {
        rot: [41, 0, 0],
        roughness: 0.45,
      }),
    ],
  },
  {
    id: 'open-arch-portal',
    category: 'openings',
    archRole: 'opening',
    title: {
      id: 'Gerbang Lengkung',
      en: 'Archway Portal',
      ja: 'アーチ開口ゲート',
    },
    subtitle: {
      id: 'Lorong lengkung ruang tengah',
      en: 'Classic interior/patio arch',
      ja: '空間を優雅につなぐアーチ門',
    },
    description: {
      id: 'Bukaan lorong lengkung elegan untuk pemisah ruang keluarga dan ruang makan atau gerbang taman.',
      en: 'Graceful arched portal for open-plan living rooms, hallways, or garden entrances.',
      ja: 'リビングとダイニングの間仕切りや庭の入り口に映えるアーチゲート。',
    },
    parts: [
      part('Gerbang Utama', 'arch', [0, 1.25, 0], [1.8, 2.5, 0.28], '#f1f5f9', {
        roughness: 0.75,
      }),
    ],
  },

  // ==================== 5. FURNITURE ====================
  {
    id: 'furn-sofa-modern',
    category: 'furniture',
    archRole: 'prop',
    title: {
      id: 'Sofa Ruang Tamu + Bantal',
      en: 'Living Room Sofa + Cushions',
      ja: '3人掛けソファ（クッション付）',
    },
    subtitle: {
      id: 'Sofa 3 dudukan empuk modern',
      en: 'Plush 3-seater fabric sofa',
      ja: 'ふっくら座面とクッション付き',
    },
    description: {
      id: 'Sofa ruang keluarga tiga dudukan dengan sandaran empuk, kaki kayu, dan dua bantal aksen.',
      en: 'Comfortable 3-seater modern sofa with rounded cushions, wooden legs, and throw pillows.',
      ja: '丸みのある座面と木脚、アクセントクッションを備えた3人掛けソファ。',
    },
    parts: [
      part('Dudukan Sofa', 'rounded-box', [0, 0.28, 0.04], [2.1, 0.32, 0.86], '#475569', {
        roughness: 0.85,
      }),
      part('Sandaran Belakang', 'rounded-box', [0, 0.62, -0.32], [2.1, 0.56, 0.22], '#334155', {
        roughness: 0.85,
      }),
      part('Lengan Kiri', 'rounded-box', [-0.98, 0.45, 0.02], [0.18, 0.52, 0.88], '#334155', {
        roughness: 0.85,
      }),
      part('Lengan Kanan', 'rounded-box', [0.98, 0.45, 0.02], [0.18, 0.52, 0.88], '#334155', {
        roughness: 0.85,
      }),
      part('Bantal Kiri', 'beveled-cube', [-0.66, 0.56, -0.1], [0.34, 0.32, 0.16], '#f59e0b', {
        rot: [-12, 10, 0],
        roughness: 0.78,
      }),
      part('Bantal Kanan', 'beveled-cube', [0.66, 0.56, -0.1], [0.34, 0.32, 0.16], '#38bdf8', {
        rot: [-12, -10, 0],
        roughness: 0.78,
      }),
    ],
  },
  {
    id: 'furn-coffee-table',
    category: 'furniture',
    archRole: 'prop',
    title: {
      id: 'Meja Tamu Kaca & Kayu',
      en: 'Glass & Wood Coffee Table',
      ja: 'ガラスローテーブル',
    },
    subtitle: {
      id: 'Rangka kayu jati + meja kaca',
      en: 'Teak base + clear glass top',
      ja: '木製フレーム＋強化ガラス天板',
    },
    description: {
      id: 'Meja kopi ruang tamu rendah dengan rangka kayu jati hangat dan permukaan kaca bening.',
      en: 'Low-profile living room coffee table combining warm teak wood with a sleek glass top.',
      ja: 'ソファの前にぴったり収まる木枠と透明ガラス天板のローテーブル。',
    },
    parts: [
      part('Rak Bawah Kayu', 'rounded-box', [0, 0.14, 0], [1.12, 0.05, 0.62], '#9a5b32', {
        roughness: 0.5,
      }),
      part('Kaki Kiri', 'hollow-box', [-0.5, 0.22, 0], [0.06, 0.42, 0.62], '#7c4728', {
        roughness: 0.5,
      }),
      part('Kaki Kanan', 'hollow-box', [0.5, 0.22, 0], [0.06, 0.42, 0.62], '#7c4728', {
        roughness: 0.5,
      }),
      part('Permukaan Kaca', 'rounded-box', [0, 0.44, 0], [1.24, 0.04, 0.7], '#bae6fd', {
        opacity: 0.48,
        roughness: 0.08,
        metalness: 0.18,
      }),
    ],
  },
  {
    id: 'furn-dining-set',
    category: 'furniture',
    archRole: 'prop',
    title: {
      id: 'Meja Makan + 4 Kursi',
      en: 'Dining Table + 4 Chairs',
      ja: 'ダイニングテーブル＆椅子4脚',
    },
    subtitle: {
      id: 'Set ruang makan keluarga lengkap',
      en: 'Complete 4-person dining set',
      ja: '食卓とチェア4脚のフルセット',
    },
    description: {
      id: 'Satu set meja makan kayu beserta empat kursi bersandaran nyaman—langsung jadi ruang makan utuh dalam 1 ketukan!',
      en: 'Complete family dining table paired with four matching chairs in a single tap.',
      ja: 'ワンタップでダイニング空間が完成するテーブル＆チェア4脚セットです。',
    },
    parts: [
      part('Daun Meja', 'rounded-box', [0, 0.75, 0], [1.6, 0.07, 0.95], '#a16236', {
        roughness: 0.44,
      }),
      part('Kaki Meja 1', 'cylinder', [-0.68, 0.37, -0.38], [0.07, 0.74, 0.07], '#334155'),
      part('Kaki Meja 2', 'cylinder', [0.68, 0.37, -0.38], [0.07, 0.74, 0.07], '#334155'),
      part('Kaki Meja 3', 'cylinder', [-0.68, 0.37, 0.38], [0.07, 0.74, 0.07], '#334155'),
      part('Kaki Meja 4', 'cylinder', [0.68, 0.37, 0.38], [0.07, 0.74, 0.07], '#334155'),
      part('Kursi Depan Kiri', 'rounded-box', [-0.42, 0.44, 0.62], [0.44, 0.07, 0.44], '#e2e8f0'),
      part('Sandaran Depan Kiri', 'rounded-box', [-0.42, 0.7, 0.82], [0.44, 0.48, 0.06], '#cbd5e1'),
      part('Kursi Depan Kanan', 'rounded-box', [0.42, 0.44, 0.62], [0.44, 0.07, 0.44], '#e2e8f0'),
      part('Sandaran Depan Kanan', 'rounded-box', [0.42, 0.7, 0.82], [0.44, 0.48, 0.06], '#cbd5e1'),
      part('Kursi Belakang Kiri', 'rounded-box', [-0.42, 0.44, -0.62], [0.44, 0.07, 0.44], '#e2e8f0'),
      part('Sandaran Belakang Kiri', 'rounded-box', [-0.42, 0.7, -0.82], [0.44, 0.48, 0.06], '#cbd5e1'),
      part('Kursi Belakang Kanan', 'rounded-box', [0.42, 0.44, -0.62], [0.44, 0.07, 0.44], '#e2e8f0'),
      part('Sandaran Belakang Kanan', 'rounded-box', [0.42, 0.7, -0.82], [0.44, 0.48, 0.06], '#cbd5e1'),
    ],
  },
  {
    id: 'furn-double-bed',
    category: 'furniture',
    archRole: 'prop',
    title: {
      id: 'Tempat Tidur + Bantal',
      en: 'Queen Bed + Pillows',
      ja: 'ダブルベッド（枕・布団付）',
    },
    subtitle: {
      id: 'Dipan kayu + kasur + selimut',
      en: 'Wood frame, mattress & duvet',
      ja: 'ヘッドボード＆寝具一式',
    },
    description: {
      id: 'Tempat tidur utama ukuran Queen lengkap dengan dipan kayu, sandaran kepala, kasur empuk, selimut biru, dan sepasang bantal.',
      en: 'Cozy Queen-size bed featuring wooden frame, headboard, plush mattress, duvet, and twin pillows.',
      ja: '木製フレームにマットレス、掛け布団、枕2つを揃えたメインベッドです。',
    },
    parts: [
      part('Dipan Kayu', 'rounded-box', [0, 0.16, 0], [1.74, 0.24, 2.12], '#8b5e3c', {
        roughness: 0.52,
      }),
      part('Sandaran Kepala', 'rounded-box', [0, 0.58, -1.0], [1.76, 0.92, 0.12], '#7c4728', {
        roughness: 0.5,
      }),
      part('Kasur Putih', 'rounded-box', [0, 0.38, 0.02], [1.62, 0.24, 1.96], '#f8fafc', {
        roughness: 0.85,
      }),
      part('Selimut Duvet', 'rounded-box', [0, 0.41, 0.32], [1.65, 0.25, 1.32], '#3b82f6', {
        roughness: 0.82,
      }),
      part('Bantal Kiri', 'beveled-cube', [-0.42, 0.56, -0.68], [0.58, 0.14, 0.38], '#ffffff', {
        roughness: 0.8,
      }),
      part('Bantal Kanan', 'beveled-cube', [0.42, 0.56, -0.68], [0.58, 0.14, 0.38], '#ffffff', {
        roughness: 0.8,
      }),
    ],
  },
  {
    id: 'furn-wardrobe',
    category: 'furniture',
    archRole: 'prop',
    title: {
      id: 'Lemari Pakaian 2 Pintu',
      en: '2-Door Wardrobe',
      ja: '2扉クローゼット・衣装棚',
    },
    subtitle: {
      id: 'Lemari tinggi kayu & kuningan',
      en: 'Tall wooden closet + handles',
      ja: '寝室用の大型木製ワードローブ',
    },
    description: {
      id: 'Lemari pakaian tinggi dua pintu dengan gagang kuningan elegan untuk kamar tidur.',
      en: 'Full-height two-door wooden wardrobe cabinet with sleek brass handles.',
      ja: '収納力のある2枚扉の木製ワードローブ。ゴールドの取っ手がアクセントです。',
    },
    parts: [
      part('Bodi Lemari', 'rounded-box', [0, 1.05, 0], [1.24, 2.1, 0.58], '#9a5b32', {
        roughness: 0.48,
      }),
      part('Pintu Kiri', 'cube', [-0.29, 1.06, 0.29], [0.56, 1.96, 0.03], '#f1f5f9', {
        roughness: 0.55,
      }),
      part('Pintu Kanan', 'cube', [0.29, 1.06, 0.29], [0.56, 1.96, 0.03], '#f1f5f9', {
        roughness: 0.55,
      }),
      part('Gagang Kiri', 'cube', [-0.05, 1.06, 0.32], [0.025, 0.32, 0.03], '#eab308', {
        metalness: 0.85,
      }),
      part('Gagang Kanan', 'cube', [0.05, 1.06, 0.32], [0.025, 0.32, 0.03], '#eab308', {
        metalness: 0.85,
      }),
    ],
  },
  {
    id: 'furn-kitchen-counter',
    category: 'furniture',
    archRole: 'prop',
    title: {
      id: 'Meja Dapur + Wastafel',
      en: 'Kitchen Counter + Sink',
      ja: 'システムキッチン（水栓付）',
    },
    subtitle: {
      id: 'Kabinet bawah + marmer + keran',
      en: 'Cabinet, marble top & faucet',
      ja: '大理石トップと蛇口付きキッチン',
    },
    description: {
      id: 'Kabinet dapur modern dengan meja marmer putih, bak cuci piring, dan keran air krom.',
      en: 'Modern kitchen island/counter unit with marble top, basin, and chrome gooseneck faucet.',
      ja: 'マーブル天板・シンク・クローム水栓を備えたモダンなキッチンカウンター。',
    },
    parts: [
      part('Kabinet Bawah', 'cube', [0, 0.43, 0], [1.8, 0.86, 0.65], '#334155', {
        roughness: 0.55,
      }),
      part('Meja Marmer', 'rounded-box', [0, 0.89, 0.01], [1.86, 0.06, 0.69], '#f8fafc', {
        roughness: 0.22,
      }),
      part('Bak Wastafel', 'hollow-box', [0.38, 0.89, 0], [0.58, 0.12, 0.44], '#cbd5e1', {
        metalness: 0.82,
        roughness: 0.22,
      }),
      part('Keran Air', 'torus-segment', [0.38, 1.04, -0.16], [0.16, 0.22, 0.16], '#e2e8f0', {
        rot: [0, 90, 0],
        metalness: 0.9,
        roughness: 0.18,
      }),
    ],
  },

  // ==================== 6. LIGHTING & DECOR ====================
  {
    id: 'light-floor-lamp',
    category: 'lighting',
    archRole: 'prop',
    title: {
      id: 'Lampu Berdiri (Menyala)',
      en: 'Warm Floor Lamp (Glowing)',
      ja: 'フロアスタンド照明（発光）',
    },
    subtitle: {
      id: 'Cahaya hangat ruang keluarga',
      en: 'Brass stand + warm emissive shade',
      ja: '夜モードで美しく光る間接照明',
    },
    description: {
      id: 'Lampu sudut ruangan dengan tiang kuningan dan kap lampu berpendar hangat—terlihat sangat dramatis saat suasana Malam!',
      en: 'Tall floor lamp with brass stem and warm glowing shade—looks magical in Sunset & Night lighting!',
      ja: '真鍮スタンドのフロアランプ。夕方・夜モードにすると温かな光が際立ちます。',
    },
    parts: [
      part('Alas Lampu', 'cylinder', [0, 0.025, 0], [0.34, 0.05, 0.34], '#eab308', {
        metalness: 0.85,
        roughness: 0.24,
      }),
      part('Tiang Lampu', 'cylinder', [0, 0.78, 0], [0.035, 1.5, 0.035], '#eab308', {
        metalness: 0.85,
        roughness: 0.24,
      }),
      part('Kap Lampu Menyala', 'conical-frustum', [0, 1.56, 0], [0.42, 0.32, 0.42], '#fef08a', {
        roughness: 0.35,
        emissive: '#f59e0b',
        emissiveIntensity: 1.05,
      }),
    ],
  },
  {
    id: 'light-ceiling-pendant',
    category: 'lighting',
    archRole: 'prop',
    title: {
      id: 'Lampu Gantung Plafon',
      en: 'Pendant Ceiling Light',
      ja: 'ペンダントライト（天井照明）',
    },
    subtitle: {
      id: 'Bola cahaya hangat gantung',
      en: 'Hanging warm globe chandelier',
      ja: '天井に吸着できる球体ライト',
    },
    description: {
      id: 'Lampu gantung bola kaca hangat untuk meja makan atau ruang tamu. Bisa langsung ditempelkan ke plafon dengan Surface!',
      en: 'Warm glowing glass globe pendant light. Attach directly under ceilings using Surface mode!',
      ja: 'ダイニングや吹き抜けに最適なペンダント照明。天井面への吸着にも対応。',
    },
    parts: [
      part('Dudukan Plafon', 'cylinder', [0, 0.72, 0], [0.16, 0.04, 0.16], '#1e293b', {
        metalness: 0.7,
      }),
      part('Kabel Gantung', 'cylinder', [0, 0.46, 0], [0.018, 0.5, 0.018], '#1e293b'),
      part('Bola Lampu', 'sphere', [0, 0.18, 0], [0.32, 0.32, 0.32], '#fef9c3', {
        roughness: 0.2,
        emissive: '#fbbf24',
        emissiveIntensity: 1.15,
      }),
    ],
  },
  {
    id: 'decor-potted-tree',
    category: 'lighting',
    archRole: 'prop',
    title: {
      id: 'Tanaman Hias Pot',
      en: 'Indoor Potted Tree',
      ja: '観葉植物ポット',
    },
    subtitle: {
      id: 'Pot terakota + pohon hijau segar',
      en: 'Terracotta pot + lush foliage',
      ja: '部屋に彩りを添えるグリーン',
    },
    description: {
      id: 'Tanaman hias dalam pot terakota untuk menyegarkan sudut ruang tamu, balkon, atau halaman depan rumah.',
      en: 'Lush decorative plant in a terracotta pot to brighten living corners, balconies, or gardens.',
      ja: 'リビングの隅や玄関テラスを爽やかに演出するテラコッタ鉢の観葉植物。',
    },
    parts: [
      part('Pot Terakota', 'conical-frustum', [0, 0.22, 0], [0.42, 0.44, 0.42], '#c85a32', {
        rot: [180, 0, 0],
        roughness: 0.72,
      }),
      part('Batang Kayu', 'cylinder', [0, 0.68, 0], [0.06, 0.65, 0.06], '#7c4728'),
      part('Daun Utama', 'sphere', [0, 1.12, 0], [0.58, 0.54, 0.58], '#22c55e', {
        roughness: 0.75,
      }),
      part('Daun Samping', 'sphere', [0.18, 0.95, 0.12], [0.4, 0.38, 0.4], '#4ade80', {
        roughness: 0.75,
      }),
    ],
  },
  {
    id: 'decor-living-rug',
    category: 'lighting',
    archRole: 'prop',
    title: {
      id: 'Karpet Ruang Tamu',
      en: 'Woven Area Rug',
      ja: 'リビングラグ・カーペット',
    },
    subtitle: {
      id: 'Karpet tipis lembut 2.6×1.8m',
      en: 'Soft 2.6×1.8m textured rug',
      ja: 'ソファ下に敷ける2.6×1.8mラグ',
    },
    description: {
      id: 'Karpet tenun lembut berukuran 2,6×1,8 meter untuk diletakkan di bawah sofa dan meja tamu.',
      en: '2.6×1.8m woven area rug with subtle border trim for living rooms and bedrooms.',
      ja: 'ソファとローテーブルの下にぴったり収まる上品な縁取りラグマットです。',
    },
    parts: [
      part('Tepi Karpet', 'rounded-box', [0, 0.012, 0], [2.6, 0.024, 1.8], '#cbd5e1', {
        roughness: 0.92,
      }),
      part('Tengah Karpet', 'rounded-box', [0, 0.016, 0], [2.42, 0.024, 1.62], '#475569', {
        roughness: 0.94,
      }),
    ],
  },
];

let cachedPresetThumbs: Record<string, string> | null = null;

/**
 * Renders a razor-sharp 240x240 HiDPI studio thumbnail for any multi-part compound preset
 * (used both for built-in House Presets AND user-saved Custom Assets!).
 */
export function renderPartsThumbnailDataUrl(parts: CustomAssetPart[]): string {
  try {
    const logicalSize = 120;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(logicalSize, logicalSize);
    renderer.setPixelRatio(2);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 50);

    scene.add(new THREE.HemisphereLight('#f8fafc', '#1e293b', 1.1));
    const key = new THREE.DirectionalLight('#fffbeb', 2.3);
    key.position.set(4, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#93c5fd', 1.1);
    rim.position.set(-4, 3, -4);
    scene.add(rim);

    const group = new THREE.Group();
    const disposables: Array<{ geo: THREE.BufferGeometry; mat: THREE.Material }> = [];

    for (const p of parts) {
      const geo = createPrimitiveGeometry(p.kind);
      const mat = new THREE.MeshStandardMaterial({
        color: p.color,
        roughness: p.roughness,
        metalness: p.metalness,
        transparent: p.opacity < 0.99,
        opacity: p.opacity,
        emissive: new THREE.Color(p.emissive || '#000000'),
        emissiveIntensity: p.emissiveIntensity || 0,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(p.localPosition.x, p.localPosition.y, p.localPosition.z);
      m.rotation.set(
        (p.rotation.x * Math.PI) / 180,
        (p.rotation.y * Math.PI) / 180,
        (p.rotation.z * Math.PI) / 180
      );
      m.scale.set(p.scale.x, p.scale.y, p.scale.z);
      group.add(m);
      disposables.push({ geo, mat });
    }

    scene.add(group);
    group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    group.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.6);
    const dist = maxDim * 1.95;
    camera.position
      .set(1.42, 1.08, 1.78)
      .normalize()
      .multiplyScalar(dist);
    camera.lookAt(0, 0, 0);

    renderer.clear();
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    for (const d of disposables) {
      d.geo.dispose();
      d.mat.dispose();
    }
    renderer.dispose();
    renderer.forceContextLoss();
    return dataUrl;
  } catch {
    return '';
  }
}

export function getHousePresetThumbnails(): Record<string, string> {
  if (cachedPresetThumbs) return cachedPresetThumbs;

  const out: Record<string, string> = {};
  try {
    const logicalSize = 120;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(logicalSize, logicalSize);
    renderer.setPixelRatio(2); // 240x240 crisp Retina!
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);

    scene.add(new THREE.HemisphereLight('#f8fafc', '#1e293b', 1.1));
    const key = new THREE.DirectionalLight('#fffbeb', 2.35);
    key.position.set(4.5, 6.5, 5.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#93c5fd', 1.15);
    rim.position.set(-4.5, 3.2, -4.2);
    scene.add(rim);

    const geoCache = new Map<PrimitiveKind, THREE.BufferGeometry>();
    const getGeo = (k: PrimitiveKind) => {
      let g = geoCache.get(k);
      if (!g) {
        g = createPrimitiveGeometry(k);
        geoCache.set(k, g);
      }
      return g;
    };

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    for (const preset of HOUSE_PRESETS_CATALOG) {
      const group = new THREE.Group();
      const mats: THREE.Material[] = [];

      for (const p of preset.parts) {
        const mat = new THREE.MeshStandardMaterial({
          color: p.color,
          roughness: p.roughness,
          metalness: p.metalness,
          transparent: p.opacity < 0.99,
          opacity: p.opacity,
          emissive: new THREE.Color(p.emissive || '#000000'),
          emissiveIntensity: p.emissiveIntensity || 0,
        });
        mats.push(mat);
        const m = new THREE.Mesh(getGeo(p.kind), mat);
        m.position.set(p.localPosition.x, p.localPosition.y, p.localPosition.z);
        m.rotation.set(
          (p.rotation.x * Math.PI) / 180,
          (p.rotation.y * Math.PI) / 180,
          (p.rotation.z * Math.PI) / 180
        );
        m.scale.set(p.scale.x, p.scale.y, p.scale.z);
        group.add(m);
      }

      scene.add(group);
      group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(group);
      box.getCenter(center);
      box.getSize(size);
      group.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z, 0.7);
      const dist = maxDim * 1.88;
      camera.position
        .set(1.4, 1.05, 1.78)
        .normalize()
        .multiplyScalar(dist);
      camera.lookAt(0, 0, 0);

      renderer.clear();
      renderer.render(scene, camera);
      out[preset.id] = renderer.domElement.toDataURL('image/png');

      scene.remove(group);
      for (const m of mats) m.dispose();
    }

    for (const g of geoCache.values()) g.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  } catch {
    // Graceful fallback
  }

  cachedPresetThumbs = out;
  return out;
}

export function computeSpawnOffsetParts(
  parts: CustomAssetPart[],
  spawnXZ: [number, number],
  groundY: number
): Array<{ part: CustomAssetPart; worldPosition: Vec3 }> {
  return parts.map((p) => ({
    part: p,
    worldPosition: {
      x: Number((spawnXZ[0] + p.localPosition.x).toFixed(3)),
      y: Number((groundY + p.localPosition.y).toFixed(3)),
      z: Number((spawnXZ[1] + p.localPosition.z).toFixed(3)),
    },
  }));
}
