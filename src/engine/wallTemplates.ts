import * as THREE from 'three';
import {
  AppLanguage,
  ArchWallSegment,
  DEFAULT_WALL_DRAW,
  Vec2XZ,
  WallDrawDefaults,
  WallTemplateCategory,
  WallTemplateId,
} from '../types/studio';
import {
  buildCornerFilletGeometry,
  buildManifoldWallBodyGeometry,
  computeFloorWallJunctions,
} from './WallGeometryEngine';

export interface WallTemplateMeta {
  id: WallTemplateId;
  category: WallTemplateCategory;
  /** True when user can ALSO drag-draw custom A->B spans directly with this template */
  supportsDrawStroke: boolean;
  /** Default overall footprint label shown in Long-Press Inspect modal */
  dimensionsLabel: string;
  name: Record<AppLanguage, string>;
  subtitle: Record<AppLanguage, string>;
  description: Record<AppLanguage, string>;
}

export const WALL_TEMPLATE_CATEGORIES: Array<'all' | WallTemplateCategory> = [
  'all',
  'basic',
  'wall-end',
  'corner',
  'shape',
];

export const WALL_TEMPLATE_CATEGORY_LABELS: Record<
  'all' | WallTemplateCategory,
  Record<AppLanguage, string>
> = {
  all: {
    id: 'Semua (38)',
    en: 'All (38)',
    ja: 'すべて (38)',
  },
  basic: {
    id: 'Dinding Dasar',
    en: 'Basic Walls',
    ja: '基本ウォール',
  },
  'wall-end': {
    id: 'Ujung Dinding',
    en: 'Wall Ends',
    ja: '壁端プロファイル',
  },
  corner: {
    id: 'Sudut Dinding',
    en: 'Corner Walls',
    ja: 'コーナー壁',
  },
  shape: {
    id: 'Bentuk Dinding',
    en: 'Wall Shapes',
    ja: '形状ウォール',
  },
};

export const WALL_TEMPLATES_CATALOG: WallTemplateMeta[] = [
  /* =========================================================
     1. BASIC WALL TEMPLATES (8)
     ========================================================= */
  {
    id: 'straight-wall',
    category: 'basic',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.15m',
    name: {
      id: 'Dinding Lurus (Straight Wall)',
      en: 'Straight Wall',
      ja: 'ストレート壁 (Straight Wall)',
    },
    subtitle: {
      id: 'Dinding lurus standar rumah nyata',
      en: 'Standard straight architectural wall',
      ja: '標準的な直線壁',
    },
    description: {
      id: 'Dinding lurus standar ukuran rumah nyata (panjang 3.00m, tinggi 3.00m, tebal 15cm) dengan sambungan sudut miter presisi dan dukungan pintu/jendela otomatis.',
      en: 'Standard full-height straight residential wall (3.00m length, 3.00m height, 15cm thickness) with flush miter joints and live door/window cutouts.',
      ja: '標準的な住宅用直線壁（長さ3.00m・高さ3.00m・厚さ15cm）。精密なマイター接合とドア・窓の自動開口に対応します。',
    },
  },
  {
    id: 'half-wall',
    category: 'basic',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 1.15m × 0.15m',
    name: {
      id: 'Dinding Setengah (Half Wall)',
      en: 'Half Wall',
      ja: 'ハーフ壁 (Half Wall)',
    },
    subtitle: {
      id: 'Dinding setengah tinggi dengan topi penutup',
      en: 'Waist-high divider wall with coping cap',
      ja: '笠木付き腰高パーティション壁',
    },
    description: {
      id: 'Dinding setengah tinggi (1.15m) lengkap dengan topi beton/batu (coping) di bagian atas, ideal untuk pemisah dapur bersih, ruang makan, atau void mezzanine.',
      en: 'Half-height wall (1.15m) finished with an architectural top coping cap—ideal for open-plan kitchen counters, dining dividers, and mezzanines.',
      ja: '上部に笠木を備えた高さ1.15mの腰壁。対面キッチンやダイニングの間仕切り、吹き抜け周りに最適です。',
    },
  },
  {
    id: 'low-wall',
    category: 'basic',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 0.55m × 0.20m',
    name: {
      id: 'Dinding Rendah (Low Wall)',
      en: 'Low Wall',
      ja: 'ローウォール (Low Wall)',
    },
    subtitle: {
      id: 'Dinding rendah 55cm untuk pembatas teras & taman',
      en: 'Low 55cm boundary curb & terrace seating wall',
      ja: 'テラスや庭の高さ55cm低い境界壁',
    },
    description: {
      id: 'Dinding pembatas rendah (tinggi 55cm, tebal 20cm) untuk batas teras, taman depan, bangku taman permanen, atau pembeda zona ruang tanpa menghalangi pandangan.',
      en: 'Low 55cm boundary wall (20cm thick) for terrace perimeters, planter borders, built-in plinth seating, and unobstructed open-zone separation.',
      ja: '視線を遮らずに空間やテラス・花壇を区切る高さ55cm・厚さ20cmの低い境界壁です。',
    },
  },
  {
    id: 'tall-wall',
    category: 'basic',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 4.50m × 0.20m',
    name: {
      id: 'Dinding Tinggi (Tall Wall)',
      en: 'Tall Wall',
      ja: 'トール壁 (Tall Wall)',
    },
    subtitle: {
      id: 'Dinding tinggi ekstra 4.50m untuk ruang void/loft',
      en: 'Extra-tall 4.50m wall for double-volume & grand facades',
      ja: '吹き抜け・高天井用の高さ4.50m高壁',
    },
    description: {
      id: 'Dinding tinggi ekstra (4.50m, tebal 20cm) untuk ruang keluarga plafon tinggi (high-ceiling), fasad modern megah, aula, atau area tangga dan mezzanine.',
      en: 'Extra-tall 4.50m structural wall (20cm thick) crafted for grand high-ceiling living rooms, loft spaces, feature facades, and double-height halls.',
      ja: '高天井のリビングやロフト、堂々としたファサードに適した高さ4.50m・厚さ20cmのハイウォールです。',
    },
  },
  {
    id: 'thick-wall',
    category: 'basic',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.40m',
    name: {
      id: 'Dinding Tebal (Thick Wall)',
      en: 'Thick Wall',
      ja: '厚壁 (Thick Wall)',
    },
    subtitle: {
      id: 'Dinding ketebalan ekstra 40cm struktural/kedap suara',
      en: 'Heavy 40cm structural & acoustic masonry wall',
      ja: '厚さ40cmの構造・防音重厚壁',
    },
    description: {
      id: 'Dinding struktural ekstra tebal (40cm) untuk dinding pemikul utama, fasad tropis penahan panas matahari, ruang home-theater kedap suara, atau kusen jendela ceruk dalam.',
      en: 'Extra-thick 40cm masonry wall for primary load-bearing cores, deep-recessed window reveals, thermal-mass facades, and acoustic rooms.',
      ja: '深い窓枠の彫り込みや防音室、断熱性の高い重厚な外観をつくる厚さ40cmの構造壁です。',
    },
  },
  {
    id: 'thin-wall',
    category: 'basic',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.08m',
    name: {
      id: 'Dinding Tipis (Thin Wall)',
      en: 'Thin Wall',
      ja: '薄型パーティション壁 (Thin Wall)',
    },
    subtitle: {
      id: 'Dinding tipis 8cm hemat ruang untuk partisi dalam',
      en: 'Slim 8cm space-saving interior partition wall',
      ja: '省スペースな厚さ8cmの室内間仕切り壁',
    },
    description: {
      id: 'Dinding partisi tipis (8cm) bergaya gipsum/kalsiboard ringan untuk sekat kamar, ruang kerja, kloset pakaian, atau kabinet tanam tanpa memakan luas lantai.',
      en: 'Slim 8cm lightweight partition wall ideal for interior room dividers, walk-in closets, utility alcoves, and space-saving layouts.',
      ja: '床面積を圧迫しない厚さ8cmの軽量間仕切り壁。クローゼットや書斎の区画に最適です。',
    },
  },
  {
    id: 'slanted-wall',
    category: 'basic',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m · Kemiringan +0.55m',
    name: {
      id: 'Dinding Miring (Slanted Wall)',
      en: 'Slanted Wall',
      ja: '傾斜壁 (Slanted Wall)',
    },
    subtitle: {
      id: 'Dinding dengan bidang permukaan miring kontemporer',
      en: 'Inclined wall plane for bold contemporary architecture',
      ja: '現代建築向けの傾斜面ウォール',
    },
    description: {
      id: 'Dinding arsitektur modern dengan bidang permukaan miring (kemiringan lateral dapat diatur di Properti) serta alas dan penutup atas rata yang presisi.',
      en: 'Contemporary inclined wall whose vertical plane leans at an adjustable architectural angle while keeping flush horizontal floor and top caps.',
      ja: '床面と天端を水平に保ちつつ壁面全体を美しく傾けた現代的な傾斜ウォールです（傾き量はプロパティで調整可能）。',
    },
  },
  {
    id: 'tapered-wall',
    category: 'basic',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m · Tebal 36cm → 9cm',
    name: {
      id: 'Dinding Tirus Bertahap (Tapered Wall)',
      en: 'Tapered Wall',
      ja: 'テーパー壁 (Tapered Wall)',
    },
    subtitle: {
      id: 'Dinding yang menyempit atau melebar secara bertahap',
      en: 'Gradually narrowing or widening architectural wall',
      ja: '厚みが段階的に変化するテーパー壁',
    },
    description: {
      id: 'Dinding trapesium presisi yang ketebalannya menyempit secara halus dari 36cm di pangkal ke 9cm di ujung untuk sirip fasad dinamis dan aksen pintu masuk.',
      en: 'Smoothly transitioning wall whose thickness narrows gradually from 36cm at the base end to 9cm at the tip—great for dynamic facade fins and entryways.',
      ja: '始端36cmから終端9cmへと滑らかに厚みが変化する壁。外観フィンやエントランスの造形に最適です。',
    },
  },

  /* =========================================================
     2. WALL END TEMPLATES (10)
     ========================================================= */
  {
    id: 'flat-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.20m',
    name: {
      id: 'Ujung Rata (Flat End Wall)',
      en: 'Flat End Wall',
      ja: 'フラット端壁 (Flat End Wall)',
    },
    subtitle: {
      id: 'Dinding dengan penutup ujung siku rata bersih',
      en: 'Clean squared 90-degree flat stop-end wall',
      ja: '直角でフラットな端部仕上げの壁',
    },
    description: {
      id: 'Dinding dengan ujung potongan siku 90° rata sempurna untuk bukaan koridor bebas kusen dan akhiran dinding minimalis.',
      en: 'Wall featuring a crisp 90-degree squared stop-end for clean minimalist corridor openings and freestanding partitions.',
      ja: '廊下の開口部や独立壁に適した、シャープな90度フラット端部の壁です。',
    },
  },
  {
    id: 'angled-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.24m',
    name: {
      id: 'Ujung Diagonal (Angled End Wall)',
      en: 'Angled End Wall',
      ja: '斜めカット端壁 (Angled End Wall)',
    },
    subtitle: {
      id: 'Dinding dengan ujung potongan miring diagonal 45°',
      en: 'Wall with single-plane 45-degree diagonal cut end',
      ja: '45度斜めカット端部の壁',
    },
    description: {
      id: 'Dinding dengan bidang ujung dipotong diagonal 45° penuh dari sisi ke sisi untuk aksen bukaan ruang miring atau siap disambung sudut.',
      en: 'Wall terminated with a crisp single-plane 45-degree diagonal slash across its thickness for angled transitions and expressive fins.',
      ja: '壁厚全体を45度に斜めカットした端部を持つ壁。斜めの動線やアクセント壁に適しています。',
    },
  },
  {
    id: 'beveled-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.26m',
    name: {
      id: 'Ujung Chamfer Miring (Beveled End Wall)',
      en: 'Beveled End Wall',
      ja: '面取り端壁 (Beveled End Wall)',
    },
    subtitle: {
      id: 'Dinding dengan kedua sudut ujung dipotong miring simetris',
      en: 'Symmetric double-chamfered 3-facet wall end',
      ja: '両角を対称に面取りした端部の壁',
    },
    description: {
      id: 'Dinding dengan kedua rusuk vertikal ujungnya dipotong miring (chamfer 3 bidang) sehingga aman dari sudut tajam dan tampak elegan di area lalu-lalang.',
      en: 'Wall end sculpted with symmetric 45-degree chamfers on both vertical edges, softening sharp corners in high-traffic hallways.',
      ja: '端部の両角を対称に面取り（3面カット）し、安全性と上品な陰影を両立した壁です。',
    },
  },
  {
    id: 'rounded-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.26m',
    name: {
      id: 'Ujung Membulat (Rounded End Wall)',
      en: 'Rounded End Wall',
      ja: 'ラウンド端壁 (Rounded End Wall)',
    },
    subtitle: {
      id: 'Dinding dengan ujung setengah lingkaran halus (bullnose)',
      en: 'Smooth 180-degree bullnose semicircular wall end',
      ja: '滑らかな半円ブルノーズ端部の壁',
    },
    description: {
      id: 'Dinding dengan ujung membulat 180° mulus tanpa patahan (bullnose) yang menyatu tangensial ke sisi luar dan dalam dinding.',
      en: 'Wall terminated with a silky-smooth 20-segment semicircular bullnose cap tangent to both interior and exterior faces.',
      ja: '内外の壁面から滑らかに連続する180度半円（ブルノーズ）仕上げの端部を持つ壁です。',
    },
  },
  {
    id: 'curved-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.18m',
    name: {
      id: 'Ujung Melengkung (Curved End Wall)',
      en: 'Curved End Wall',
      ja: 'カーブ端壁 (Curved End Wall)',
    },
    subtitle: {
      id: 'Dinding lurus yang ujungnya berbelok melengkung halus',
      en: 'Straight wall sweeping smoothly into a curved tip',
      ja: '先端が滑らかにカーブする壁',
    },
    description: {
      id: 'Dinding lurus sepanjang badan utama yang bagian ujungnya melengkung anggun (J-sweep kontinu) untuk penyambut foyer atau partisi ruang tamu modern.',
      en: 'Straight primary wall body whose terminal span curves gracefully into a tangent-continuous J-hook wing for foyers and feature partitions.',
      ja: '直線部から先端にかけて滑らかなJ字カーブを描く、エントランスやリビング向けのデザイン壁です。',
    },
  },
  {
    id: 'tapered-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.24m',
    name: {
      id: 'Ujung Meruncing (Tapered End Wall)',
      en: 'Tapered End Wall',
      ja: '先細り端壁 (Tapered End Wall)',
    },
    subtitle: {
      id: 'Dinding lurus dengan bagian ujung menyempit ramping',
      en: 'Uniform wall narrowing smoothly at the terminal tip',
      ja: '先端部のみがスリムに絞られた壁',
    },
    description: {
      id: 'Dinding dengan ketebalan seragam pada badan utama lalu menyempit halus pada 65cm terakhir menjadi ujung sirip ramping yang ringan secara visual.',
      en: 'Uniform-thickness wall whose final 65cm tapers symmetrically down to a slender architectural fin nose.',
      ja: '本体は一定の厚みを保ち、先端65cmのみをスリムなフィン状に絞った軽快な印象の壁です。',
    },
  },
  {
    id: 'pointed-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.26m',
    name: {
      id: 'Ujung Lancip (Pointed End Wall)',
      en: 'Pointed End Wall',
      ja: '尖端壁 (Pointed End Wall)',
    },
    subtitle: {
      id: 'Dinding dengan ujung berbentuk lancip V tegas',
      en: 'Crisp symmetric V-prow pointed apex wall end',
      ja: 'シャープなV字型の先端を持つ壁',
    },
    description: {
      id: 'Dinding dengan ujung pertemuan dua bidang miring membentuk rusuk lancip simetris (V-prow) bergaya fasad brutalist dan sirip pemecah cahaya.',
      en: 'Wall terminating in a razor-crisp symmetric V-prow ridge—striking for modernist sun-breaker fins and monumental piers.',
      ja: '先端が対称なV字エッジに収束する造形壁。ルーバーフィンやモダンなファサードのアクセントに最適です。',
    },
  },
  {
    id: 'stepped-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m × 0.20m',
    name: {
      id: 'Ujung Bertingkat (Stepped End Wall)',
      en: 'Stepped End Wall',
      ja: '段差端壁 (Stepped End Wall)',
    },
    subtitle: {
      id: 'Dinding dengan ujung menurun bertingkat seperti anak tangga',
      en: 'Terraced 4-tier stair-stepped architectural wall end',
      ja: '階段状に高さが下がる段差端部の壁',
    },
    description: {
      id: 'Dinding dengan bagian ujung menurun dalam 4 tingkat horizontal presisi untuk pembatas tangga terbuka, teras taman modern, atau gerbang rumah.',
      en: 'Wall whose terminal section steps down in four crisp horizontal tiers—ideal alongside open staircases, courtyard entries, and garden walls.',
      ja: '端部が4段の美しいステップ状に下がる壁。オープン階段横やアプローチ門袖に最適です。',
    },
  },
  {
    id: 'pillar-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m + Pilar Ujung',
    name: {
      id: 'Ujung Pilar (Pillar End Wall)',
      en: 'Pillar End Wall',
      ja: 'ピラー端壁 (Pillar End Wall)',
    },
    subtitle: {
      id: 'Dinding dengan kolom pilar persegi menyatu di ujung',
      en: 'Wall integrated with a square column pier, plinth & cap',
      ja: '台座・笠木付き角柱を備えた端壁',
    },
    description: {
      id: 'Dinding yang berujung pada pilar kolom struktural persegi lengkap dengan umpak bawah (plinth) dan mahkota atas (pier cap) untuk gerbang, teras, atau bukaan ruang utama.',
      en: 'Wall anchored at its end by an integrated square architectural pier complete with base plinth and top capital.',
      ja: '端部に台座と笠木を備えた角柱（ピラー）が一体化した壁。門塀やポーチ、大開口の端部に最適です。',
    },
  },
  {
    id: 'cap-end-wall',
    category: 'wall-end',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m + Kusen Penutup',
    name: {
      id: 'Ujung Penutup Kusen (Cap End Wall)',
      en: 'Cap End Wall',
      ja: 'キャップ枠端壁 (Cap End Wall)',
    },
    subtitle: {
      id: 'Dinding dengan lis kusen penutup ujung yang rapi',
      en: 'Wall finished with a proud architectural end-casing trim',
      ja: '端部に化粧枠キャップを備えた壁',
    },
    description: {
      id: 'Dinding yang dilengkapi bingkai penutup ujung (end-cap jamb trim) timbul rapi untuk mempertegas batas partisi interior dan lorong.',
      en: 'Partition wall dressed with a proud wrap-around architectural end-cap trim for refined interior openings.',
      ja: '壁の切り口を美しく包む化粧見切りキャップ付きの室内パーティション壁です。',
    },
  },

  /* =========================================================
     3. CORNER WALL TEMPLATES (10)
     ========================================================= */
  {
    id: 'inner-corner-wall',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '1.60m × 1.60m × 3.00m',
    name: {
      id: 'Sudut Dalam (Inner Corner Wall)',
      en: 'Inner Corner Wall',
      ja: '内角コーナー壁 (Inner Corner)',
    },
    subtitle: {
      id: 'Modul dinding sudut dalam ruangan dengan plint lantai',
      en: 'Concave interior room corner with flush miter & baseboard',
      ja: '巾木付き室内側コーナー壁',
    },
    description: {
      id: 'Pasangan dinding sudut bagian dalam ruangan dengan sambungan miter rata sempurna dan lis plint bawah menyatu tanpa celah.',
      en: 'Interior-oriented corner wall module featuring a razor-flush inner miter joint and continuous interior baseboard return.',
      ja: '室内の入隅（内角）向けに巾木と精密なマイター接合を備えたコーナー壁モジュールです。',
    },
  },
  {
    id: 'outer-corner-wall',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '1.60m × 1.60m × 3.00m',
    name: {
      id: 'Sudut Luar (Outer Corner Wall)',
      en: 'Outer Corner Wall',
      ja: '外角コーナー壁 (Outer Corner)',
    },
    subtitle: {
      id: 'Modul dinding sudut luar fasad dengan lis profil sudut',
      en: 'Convex exterior facade corner with architectural quoin trim',
      ja: '外観コーナー化粧トリム付き外角壁',
    },
    description: {
      id: 'Modul dinding sudut luar bangunan yang dipertegas dengan lis profil sudut vertikal (corner quoin) rapi tanpa celah sambungan.',
      en: 'Exterior building corner reinforced with a crisp vertical corner quoin trim along the outer edge and watertight mitered wings.',
      ja: '建物の出隅（外角）を美しく際立たせるコーナートリム付きの外装コーナー壁です。',
    },
  },
  {
    id: 'corner-90-wall',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '2.00m × 2.00m · Siku 90°',
    name: {
      id: 'Sudut Siku 90° (90-Degree Corner)',
      en: '90-Degree Corner Wall',
      ja: '90度直角コーナー壁',
    },
    subtitle: {
      id: 'Dinding sudut siku-siku 90° simetris presisi',
      en: 'Symmetric right-angle 90° mitered corner wall',
      ja: '対称な90度直角マイター接合壁',
    },
    description: {
      id: 'Sudut dinding siku-siku 90° (2.00m × 2.00m) dengan potongan diagonal miter presisi tinggi sehingga sisi luar, dalam, dan atas menyatu 100% rata.',
      en: 'Precision 2.00m × 2.00m right-angle corner joined along an exact 45-degree miter plane with zero overlap or gap.',
      ja: '内外および天端が完全にフラットにつながる2.00m×2.00mの90度直角コーナー壁です。',
    },
  },
  {
    id: 'corner-45-wall',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '1.80m + 1.80m · Belokan 45°',
    name: {
      id: 'Sudut 45 Derajat (45-Degree Corner)',
      en: '45-Degree Corner Wall',
      ja: '45度アングルコーナー壁',
    },
    subtitle: {
      id: 'Dinding sudut belokan 45° untuk jendela teluk & fasad',
      en: 'Crisp 45-degree directional bend for bay windows & facades',
      ja: 'ベイウィンドウや多角形平面向け45度壁',
    },
    description: {
      id: 'Sambungan dinding sudut 45 derajat dengan bidang potong bisektor 22.5° akurat untuk membentuk ruang segi delapan, bay-window, atau koridor miring.',
      en: 'Exact 45-degree directional wall bend mitered cleanly along its 22.5-degree bisector—ideal for octagonal rooms and bay windows.',
      ja: '出窓（ベイウィンドウ）や八角形の部屋、斜め廊下を美しく構成する45度コーナー壁です。',
    },
  },
  {
    id: 'rounded-inner-corner',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '2.00m × 2.00m · Radius Dalam 45cm',
    name: {
      id: 'Sudut Dalam Membulat (Rounded Inner)',
      en: 'Rounded Inner Corner',
      ja: '内Rラウンドコーナー壁',
    },
    subtitle: {
      id: 'Sudut bagian dalam melengkung mulus, luar tetap siku',
      en: 'Smoothly coved concave inner corner with sharp outer edge',
      ja: '内側が滑らかな曲面・外側が直角のコーナー壁',
    },
    description: {
      id: 'Dinding sudut 90° dengan sisi cekung bagian dalam membulat mulus (cove fillet 24 segmen) sementara sudut luar tetap siku tegas 90°.',
      en: '90-degree corner whose concave interior sweeps a smooth 24-segment plaster cove arc while preserving a crisp square exterior corner.',
      ja: '室内の入隅のみを滑らかなアールの曲面で仕上げ、外角はシャープな直角を保つ高級感のあるコーナー壁です。',
    },
  },
  {
    id: 'rounded-outer-corner',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '2.00m × 2.00m · Radius Luar 48cm',
    name: {
      id: 'Sudut Luar Membulat (Rounded Outer)',
      en: 'Rounded Outer Corner',
      ja: '外Rブルノーズコーナー壁',
    },
    subtitle: {
      id: 'Sudut bagian luar membulat halus, dalam tetap siku',
      en: 'Smooth bullnose convex outer corner with square interior',
      ja: '外側が滑らかな丸角・内側が直角のコーナー壁',
    },
    description: {
      id: 'Dinding sudut 90° dengan rusuk cembung bagian luar membulat halus bergaya Art-Deco/Mediterania sementara sudut dalam ruangan tetap siku 90°.',
      en: '90-degree corner featuring a smooth 24-segment bullnose exterior curve paired with a crisp 90-degree interior room corner.',
      ja: '外側の角を優美なアール曲面に丸め、内側は家具を配置しやすい直角に保ったコーナー壁です。',
    },
  },
  {
    id: 'beveled-corner-wall',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '2.00m × 2.00m · Chamfer 45°',
    name: {
      id: 'Sudut Potong Diagonal (Beveled Corner)',
      en: 'Beveled Corner Wall',
      ja: '面取りチャンファーコーナー壁',
    },
    subtitle: {
      id: 'Sudut siku dengan bidang potongan diagonal 45° di tengah',
      en: '90-degree corner bridged by a 45-degree chamfered facet',
      ja: '角を45度斜め面でつないだコーナー壁',
    },
    description: {
      id: 'Sudut dinding 90° yang dihubungkan oleh bidang potong diagonal 45° rata dengan dua sambungan miter mulus untuk fasad klasik maupun modern.',
      en: 'Architectural splayed corner combining two orthogonal wings with a crisp 45-degree diagonal chamfer facet.',
      ja: '直交する2枚の壁を45度の斜め面（チャンファー）で滑らかに接続したコーナー壁です。',
    },
  },
  {
    id: 'curved-corner-wall',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '2.00m × 2.00m · Busur 90° Penuh',
    name: {
      id: 'Sudut Melengkung Penuh (Curved Corner)',
      en: 'Curved Corner Wall',
      ja: '全面カーブコーナー壁',
    },
    subtitle: {
      id: 'Sudut dinding dengan sisi luar & dalam melengkung sepusat',
      en: 'Concentric sweeping 90-degree curved corner wall',
      ja: '内外両面が同心円を描く90度カーブ壁',
    },
    description: {
      id: 'Berbeda dari sudut membulat satu sisi, kedua permukaan luar dan dalam dinding ini berbelok sepusat membentuk busur 90° mulus yang menyambung ke dua sayap lurus.',
      en: 'Full concentric 90-degree sweeping corner where both interior and exterior wall faces curve smoothly in parallel between two tangent wings.',
      ja: '内面・外面ともに平行な90度円弧を描いて直線の両翼へ滑らかに連続する曲面コーナー壁です。',
    },
  },
  {
    id: 'three-way-junction-wall',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '2.10m × 1.15m · Konektor Simpul 3 Arah',
    name: {
      id: 'Sambungan Tiga Arah (Three-Way Junction)',
      en: 'Three-Way Junction Wall',
      ja: '三方T字接合壁 (3-Way Junction)',
    },
    subtitle: {
      id: 'Konektor simpul 3 cabang ringkas bebas tumpang tindih',
      en: 'Compact 3-branch connector hub with flush top cap',
      ja: '天端の重なりがないコンパクトな三方接合ハブ',
    },
    description: {
      id: 'Modul konektor simpul tiga arah (2.10m × 1.15m) dengan inti baji miter 3 arah presisi tanpa tumpang tindih permukaan untuk menyambung tiga jalur dinding.',
      en: 'Compact three-branch junction connector (2.10m × 1.15m) engineered with non-overlapping 3-way miter wedges for clean intersections.',
      ja: '3方向の壁が重なりなく一点で美しく接合するコンパクトなT字ジャンクションハブです。',
    },
  },
  {
    id: 'four-way-junction-wall',
    category: 'corner',
    supportsDrawStroke: false,
    dimensionsLabel: '2.10m × 2.10m · Konektor Simpul 4 Arah',
    name: {
      id: 'Sambungan Empat Arah (Four-Way Junction)',
      en: 'Four-Way Junction Wall',
      ja: '四方十字接合壁 (4-Way Junction)',
    },
    subtitle: {
      id: 'Konektor persilangan 4 cabang ringkas menyatu rata',
      en: 'Compact 4-branch orthogonal intersection connector',
      ja: '4方向の壁が美しく交差するコンパクト十字ハブ',
    },
    description: {
      id: 'Modul konektor persilangan empat arah ringkas (2.10m × 2.10m) yang membagi titik pusat menjadi 4 baji diagonal presisi bebas celah.',
      en: 'Compact four-way orthogonal hub (2.10m × 2.10m) partitioning the central core into four exact 45-degree miter wedges.',
      ja: '中心を4つの精密なマイターウェッジで分割するコンパクトな十字ジャンクション接続モジュールです。',
    },
  },

  /* =========================================================
     4. WALL SHAPE TEMPLATES (10)
     ========================================================= */
  {
    id: 'l-shaped-wall',
    category: 'shape',
    supportsDrawStroke: false,
    dimensionsLabel: '3.60m × 1.65m × 3.00m',
    name: {
      id: 'Dinding Bentuk L (L-Shaped Wall)',
      en: 'L-Shaped Wall',
      ja: 'L字型ウォール (L-Shaped Wall)',
    },
    subtitle: {
      id: 'Dinding ruang asimetris bentuk L (utama 3.6m + sayap 1.65m)',
      en: 'Room-scale asymmetric L-wall (3.6m spine + 1.65m wing)',
      ja: '3.6m主壁＋1.65m袖壁の非対称L字ルーム壁',
    },
    description: {
      id: 'Rangkaian dinding bentuk L asimetris berskala ruangan (3.60m × 1.65m) lengkap dengan plint lantai untuk langsung membentuk sudut kamar, dapur L, atau area kerja.',
      en: 'Full room-scale asymmetric L-shaped wall assembly (3.60m × 1.65m) with mitered baseboards—ready to enclose bedrooms, L-kitchens, or foyers.',
      ja: 'ワンタップで部屋の角やL型キッチン、書斎コーナーを作れる3.60m×1.65mの非対称L字型壁です。',
    },
  },
  {
    id: 't-shaped-wall',
    category: 'shape',
    supportsDrawStroke: false,
    dimensionsLabel: '3.90m × 2.50m × 3.00m',
    name: {
      id: 'Dinding Bentuk T (T-Shaped Wall)',
      en: 'T-Shaped Wall',
      ja: 'T字型ウォール (T-Shaped Wall)',
    },
    subtitle: {
      id: 'Dinding tulang utama 3.9m dengan sekat kamar 2.5m',
      en: '3.9m main spine wall with 2.5m perpendicular room divider',
      ja: '3.9m主壁＋2.5m間仕切りのT字型ルーム壁',
    },
    description: {
      id: 'Dinding bentuk T skala ruangan penuh (3.90m × 2.50m) lengkap dengan plint lantai untuk membagi dua kamar bersebelahan sekaligus.',
      en: 'Full room-scale T-shaped partition combining a 3.90m main wall with a 2.50m perpendicular divider and mitered baseboards.',
      ja: '隣り合う2部屋を一度に仕切れる3.90m×2.50mのフルサイズT字型パーティション壁です。',
    },
  },
  {
    id: 'cross-shaped-wall',
    category: 'shape',
    supportsDrawStroke: false,
    dimensionsLabel: '4.10m × 3.10m × 3.00m',
    name: {
      id: 'Dinding Bentuk Silang (Cross-Shaped Wall)',
      en: 'Cross-Shaped Wall',
      ja: 'クロス十字ウォール (Cross-Shaped)',
    },
    subtitle: {
      id: 'Dinding penyekat silang bentang 4.1×3.1m pembagi 4 ruang',
      en: 'Wide 4.1×3.1m cruciform room divider creating 4 bays',
      ja: '4つのゾーンを同時に作る4.1×3.1m大型クロス壁',
    },
    description: {
      id: 'Dinding bentuk silang (+) bentang lebar (4.10m × 3.10m) lengkap dengan plint lantai untuk membagi area tengah bangunan menjadi empat zona ruang.',
      en: 'Wide-span 4.10m × 3.10m cruciform partition with mitered baseboards dividing floor plates into four distinct room quadrants.',
      ja: 'フロア中央を4つのゾーンへ一気に区画できる4.10m×3.10mの大型クロス間仕切り壁です。',
    },
  },
  {
    id: 'u-shaped-wall',
    category: 'shape',
    supportsDrawStroke: false,
    dimensionsLabel: '2.80m × 2.00m × 3.00m',
    name: {
      id: 'Dinding Bentuk U (U-Shaped Wall)',
      en: 'U-Shaped Wall',
      ja: 'U字型アルコーブ壁 (U-Shaped)',
    },
    subtitle: {
      id: 'Ceruk 3 sisi siap pakai untuk kamar mandi, dapur, atau kloset',
      en: 'Three-sided alcove enclosure for baths, kitchens & closets',
      ja: '浴室・キッチン・収納向けのコの字型壁',
    },
    description: {
      id: 'Rangkaian 3 dinding berbentuk U (lebar 2.80m, kedalaman 2.00m) dengan 2 sudut siku presisi untuk langsung membuat ceruk dapur, kamar mandi, atau walk-in closet.',
      en: 'Three-sided U-shaped enclosure (2.80m wide × 2.00m deep) with two flush 90-degree corners for instant kitchen bays, bathrooms, or walk-in closets.',
      ja: '幅2.80m×奥行2.00mのコの字（U字）型3面壁。キッチンやバスルーム、ウォークイン収納を即座に作れます。',
    },
  },
  {
    id: 'zigzag-wall',
    category: 'shape',
    supportsDrawStroke: false,
    dimensionsLabel: '3.60m × 0.90m (4 Segmen Lipat)',
    name: {
      id: 'Dinding Zigzag (Zigzag Wall)',
      en: 'Zigzag Wall',
      ja: 'ジグザグ折れ壁 (Zigzag Wall)',
    },
    subtitle: {
      id: 'Dinding lipat 4 segmen akustik & fasad artistik',
      en: '4-segment pleated sawtooth feature & acoustic wall',
      ja: '4連プリーツ構造のジグザグ装飾・音響壁',
    },
    description: {
      id: 'Dinding lipat 4 segmen berpola zigzag dengan seluruh puncak dan lembah tersambung miter tajam tanpa celah—cocok untuk dinding aksen galeri dan akustik.',
      en: 'Four-segment accordion zigzag wall with razor-clean mitered peaks and valleys for sculptural facades, galleries, and acoustic diffusion.',
      ja: '山と谷のすべてが隙間なくマイター接合された4連ジグザグ壁。ギャラリーのアクセントや音響壁に最適です。',
    },
  },
  {
    id: 'curved-wall',
    category: 'shape',
    supportsDrawStroke: true,
    dimensionsLabel: 'Bentang 3.40m · Tinggi Busur 0.34m',
    name: {
      id: 'Dinding Melengkung (Curved Wall)',
      en: 'Curved Wall',
      ja: 'カーブ壁 (Curved Wall)',
    },
    subtitle: {
      id: 'Dinding busur lengkung landai mulus beresolusi tinggi',
      en: 'Gentle sweeping circular-arc architectural facade wall',
      ja: '緩やかで滑らかな連続円弧メッシュの曲線壁',
    },
    description: {
      id: 'Dinding busur lengkung landai mulus (jaring kontinu tanpa kotak patah-patah) yang mendukung pemasangan pintu/jendela lengkung serta cat dua sisi.',
      en: 'Gentle, silky-smooth continuous circular-arc wall (zero faceted box seams) with full support for curved-wall openings and dual-sided finishes.',
      ja: '継ぎ目のない緩やかな連続円弧メッシュで構築された曲線壁。開口部の設置や表裏別塗装にも対応します。',
    },
  },
  {
    id: 'semi-circular-wall',
    category: 'shape',
    supportsDrawStroke: true,
    dimensionsLabel: 'Diameter 3.00m · Busur Penuh 180°',
    name: {
      id: 'Dinding Setengah Lingkaran (Semi-Circular)',
      en: 'Semi-Circular Wall',
      ja: '半円ウォール (Semi-Circular Wall)',
    },
    subtitle: {
      id: 'Dinding busur setengah lingkaran 180° presisi',
      en: 'Exact 180-degree semicircular apse & rotunda bay wall',
      ja: '正確な180度半円を描くロトンダ壁',
    },
    description: {
      id: 'Dinding setengah lingkaran 180° geometris murni (diameter 3.00m, radius 1.50m) untuk ruang makan melingkar, tangga putar megah, atau ceruk taman.',
      en: 'True geometric 180-degree semicircular wall (3.00m diameter, 1.50m radius) for grand spiral-stair bays, breakfast rotundas, and apses.',
      ja: '直径3.00m（半径1.50m）の正確な180度半円壁。螺旋階段ホールや円形ダイニングの造形に最適です。',
    },
  },
  {
    id: 'circular-wall-segment',
    category: 'shape',
    supportsDrawStroke: true,
    dimensionsLabel: 'Radius 1.85m · Sektor Busur 120°',
    name: {
      id: 'Segmen Dinding Lingkaran (Circular Segment)',
      en: 'Circular Wall Segment',
      ja: '円弧セグメント壁 (120° Sector)',
    },
    subtitle: {
      id: 'Segmen busur 120° (3 segmen membentuk lingkaran utuh)',
      en: 'Exact 120-degree circular sector (3 form a full circle)',
      ja: '3つ繋ぐと真円になる正確な120度円弧壁',
    },
    description: {
      id: 'Segmen dinding busur 120° presisi dengan radius 1.85m—sambungkan 3 segmen ujung ke ujung untuk membentuk ruangan bundar penuh berdiameter 3.70m.',
      en: 'Exact 120-degree circular sector (R = 1.85m)—snap three segments end-to-end to construct a seamless 3.70m-diameter round drum room.',
      ja: '半径1.85mの正確な120度円弧セグメント。3枚を端から順に繋ぐだけで直径3.70mの真円の部屋が完成します。',
    },
  },
  {
    id: 's-shaped-wall',
    category: 'shape',
    supportsDrawStroke: true,
    dimensionsLabel: 'Bentang 3.40m · Gelombang ±0.58m',
    name: {
      id: 'Dinding Bentuk S (S-Shaped Wall)',
      en: 'S-Shaped Wall',
      ja: 'S字ウェーブ壁 (S-Shaped Wall)',
    },
    subtitle: {
      id: 'Dinding gelombang S organik mengalir mulus',
      en: 'Flowing serpentine S-curve organic feature wall',
      ja: '優美な曲線を描くS字サーペンタイン壁',
    },
    description: {
      id: 'Dinding gelombang S (kurva kubik kontinu) untuk partisi lobi organik, pemisah ruang artistik, maupun tembok taman lanskap modern.',
      en: 'Continuous cubic serpentine S-wave wall for organic lobby dividers, sculptural interior partitions, and flowing garden walls.',
      ja: '滑らかな三次曲線で有機的なS字ラインを描くデザイン壁。ロビーの間仕切りやモダンな庭園壁に最適です。',
    },
  },
  {
    id: 'diagonal-wall',
    category: 'shape',
    supportsDrawStroke: true,
    dimensionsLabel: '3.00m × 3.00m · Sudut 45°',
    name: {
      id: 'Dinding Diagonal (Diagonal Wall)',
      en: 'Diagonal Wall',
      ja: 'ダイアゴナル斜め壁 (45° Wall)',
    },
    subtitle: {
      id: 'Dinding lurus berorientasi diagonal 45° presisi',
      en: 'Straight wall oriented on an exact 45-degree diagonal axis',
      ja: '45度対角線方向に配置される直線壁',
    },
    description: {
      id: 'Dinding lurus sepanjang 3.00m dengan orientasi diagonal 45° akurat untuk memotong sudut ruangan secara miring, koridor dinamis, atau fasad geometris.',
      en: '3.00m straight wall oriented at an exact 45-degree diagonal angle—ideal for chamfered room layouts, angled entries, and geometric plans.',
      ja: '正確な45度対角方向に配置される長さ3.00mの直線壁。斜めのアプローチや幾何学的な平面計画に便利です。',
    },
  },
];

export const WALL_TEMPLATES_BY_ID: Record<WallTemplateId, WallTemplateMeta> =
  WALL_TEMPLATES_CATALOG.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<WallTemplateId, WallTemplateMeta>
  );

function uidWall(): string {
  return `wall_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Applies a single-span Wall Template's structural profile onto an existing `ArchWallSegment`
 * non-destructively (preserving its `start`, `end`, `floorId`, colors, patterns, and openings!).
 */
export function applyWallTemplateProfileToWall(
  wall: ArchWallSegment,
  templateId: WallTemplateId
): void {
  const chord = Math.max(
    0.4,
    Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z)
  );

  // Reset template-specific modifiers cleanly before applying the chosen profile
  wall.templateId = templateId;
  wall.style = 'full';
  wall.endCap = 'none';
  wall.endCapBothEnds = false;
  wall.slantLean = 0;
  wall.endHeight = undefined;
  wall.endThickness = undefined;
  wall.pathMode = 'line';
  wall.curveBulge = 0;
  wall.sWaveAmp = undefined;
  wall.cornerStyle = 'sharp';
  wall.cornerRadius = undefined;

  switch (templateId) {
    case 'straight-wall':
      wall.height = 3.0;
      wall.thickness = 0.15;
      break;
    case 'half-wall':
      wall.style = 'half';
      wall.height = 1.15;
      wall.thickness = 0.15;
      break;
    case 'low-wall':
      wall.style = 'half';
      wall.height = 0.55;
      wall.thickness = 0.2;
      break;
    case 'tall-wall':
      wall.height = 4.5;
      wall.thickness = 0.2;
      break;
    case 'thick-wall':
      wall.height = 3.0;
      wall.thickness = 0.4;
      break;
    case 'thin-wall':
      wall.height = 3.0;
      wall.thickness = 0.08;
      break;
    case 'slanted-wall':
      wall.height = 3.0;
      wall.thickness = 0.2;
      wall.slantLean = 0.68;
      break;
    case 'tapered-wall':
      wall.height = 3.0;
      wall.thickness = 0.42;
      wall.endThickness = 0.08;
      break;

    // 2. Wall End Templates
    case 'flat-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.22;
      wall.endCap = 'flat';
      break;
    case 'angled-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.28;
      wall.endCap = 'angled';
      break;
    case 'beveled-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.3;
      wall.endCap = 'beveled';
      break;
    case 'rounded-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.3;
      wall.endCap = 'rounded';
      break;
    case 'curved-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.18;
      wall.endCap = 'curved';
      wall.pathMode = 'j-curve-end';
      wall.curveBulge = 0.58;
      break;
    case 'tapered-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.28;
      wall.endCap = 'tapered';
      break;
    case 'pointed-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.3;
      wall.endCap = 'pointed';
      break;
    case 'stepped-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.22;
      wall.endCap = 'stepped';
      break;
    case 'pillar-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.16;
      wall.endCap = 'pillar';
      break;
    case 'cap-end-wall':
      wall.height = 3.0;
      wall.thickness = 0.18;
      wall.endCap = 'cap';
      break;

    // 3. Corner style profiles when swapped onto an existing wall
    case 'inner-corner-wall':
      wall.cornerStyle = 'inner-trim';
      wall.hasBaseboard = true;
      break;
    case 'outer-corner-wall':
      wall.cornerStyle = 'outer-quoin';
      break;
    case 'rounded-inner-corner':
      wall.cornerStyle = 'rounded-inner';
      wall.cornerRadius = 0.52;
      break;
    case 'rounded-outer-corner':
      wall.cornerStyle = 'rounded-outer';
      wall.cornerRadius = 0.58;
      break;

    // 4. Curved / S / Diagonal Shape Profiles
    case 'curved-wall':
      wall.pathMode = 'circular-arc';
      wall.curveBulge = round3(Math.min(1.0, chord * 0.075));
      break;
    case 'semi-circular-wall':
      wall.pathMode = 'circular-arc';
      wall.curveBulge = round3(chord * 0.5);
      break;
    case 'circular-wall-segment':
      // Exact 120° circular sector: `sagitta / chord = (1 - cos 60°) / (2 sin 60°) = 0.5 / √3`
      wall.pathMode = 'circular-arc';
      wall.curveBulge = round3((chord * 0.5) / Math.sqrt(3));
      break;
    case 's-shaped-wall':
      wall.pathMode = 's-curve';
      wall.sWaveAmp = round3(Math.min(1.0, chord * 0.21));
      break;
    case 'diagonal-wall':
      wall.height = 3.0;
      wall.thickness = 0.15;
      break;
    default:
      break;
  }
}

/**
 * Returns updated `WallDrawDefaults` when the user activates a draw-compatible Wall Template!
 */
export function buildDrawDefaultsForWallTemplate(
  prev: WallDrawDefaults,
  templateId: WallTemplateId
): WallDrawDefaults {
  const probe: ArchWallSegment = {
    id: 'probe',
    floorId: 'floor_1',
    start: { x: 0, z: 0 },
    end: { x: 3, z: 0 },
    height: prev.height,
    thickness: prev.thickness,
    style: prev.style,
    curveBulge: 0,
    exteriorColor: prev.exteriorColor,
    interiorColor: prev.interiorColor,
    roughness: 0.78,
    hasBaseboard: prev.hasBaseboard,
  };
  applyWallTemplateProfileToWall(probe, templateId);
  return {
    ...prev,
    activeTemplateId: templateId,
    height: probe.height,
    thickness: probe.thickness,
    style: probe.style,
    curveBulge: probe.curveBulge,
  };
}

/**
 * Constructs 1 or more connected Smart `ArchWallSegment`s centered around `centerXZ`
 * for ANY of the 38 Phase-1 Wall Templates!
 *
 * Orientation Guarantee:
 * In `WallGeometryEngine`, for `start -> end` with tangent `t = (tx, tz)`:
 * - Left normal `+nL = (-tz, tx)` receives `exteriorColor` (`matIndex = 4`).
 * - Right normal `-nL = (tz, -tx)` receives `interiorColor` (`matIndex = 5`).
 * Therefore:
 * - Room-interior corners/enclosures wind `(+X, -Z) -> (-X, -Z) -> (-X, +Z)` so `-nL` (`interiorColor`) faces INWARD into `(+X, +Z)`!
 * - Building-exterior corners (`outer-corner-wall`, `rounded-outer-corner`) wind `(-X, +Z) -> (+X, +Z) -> (+X, -Z)` so `+nL` (`exteriorColor`) faces OUTWARD on the convex nose!
 * - Interior multi-room dividers (`T`, `Cross`, `3-Way` stem, `4-Way`, `Zigzag`) use unified partition face finishes so zero internal stems look half-exterior/half-interior!
 */
export function createWallSegmentsFromTemplate(
  templateId: WallTemplateId,
  floorId: string,
  centerXZ: Vec2XZ,
  defaults: WallDrawDefaults = DEFAULT_WALL_DRAW
): ArchWallSegment[] {
  const cx = centerXZ.x;
  const cz = centerXZ.z;
  const groupId = `wgrp_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 5)}`;

  const makeSeg = (
    sx: number,
    sz: number,
    ex: number,
    ez: number,
    extra?: Partial<ArchWallSegment>
  ): ArchWallSegment => {
    const seg: ArchWallSegment = {
      id: uidWall(),
      floorId,
      start: { x: round3(cx + sx), z: round3(cz + sz) },
      end: { x: round3(cx + ex), z: round3(cz + ez) },
      height: defaults.height || 3.0,
      thickness: defaults.thickness || 0.15,
      style: 'full',
      curveBulge: 0,
      exteriorColor: defaults.exteriorColor,
      interiorColor: defaults.interiorColor,
      exteriorPattern: defaults.exteriorPattern,
      interiorPattern: defaults.interiorPattern,
      roughness: 0.78,
      hasBaseboard: defaults.hasBaseboard,
      templateId,
      structuralMaterialId: 'mat_brick_masonry',
      exteriorFinishMaterialId: 'mat_paint_exterior',
      interiorFinishMaterialId: 'mat_paint_interior',
      ...extra,
    };
    return seg;
  };

  switch (templateId) {
    case 'curved-end-wall': {
      // Straight stem along X with smooth C¹ J-hook sweeping forward into `+Z` at the right end!
      const halfL = Math.max(0.75, (defaults.lengthTemplate || 3.0) * 0.5);
      const seg = makeSeg(-halfL, 0.08, halfL * 0.92, 0.24);
      applyWallTemplateProfileToWall(seg, templateId);
      return [seg];
    }

    case 'curved-wall': {
      // Gentle ~44° sweeping circular arc (`+1.70 -> -1.70` so `-nL` `interiorColor` faces concave bay `+Z`, `+nL` `exteriorColor` faces convex `-Z`!)
      const seg = makeSeg(1.7, 0.14, -1.7, 0.14);
      applyWallTemplateProfileToWall(seg, templateId);
      return [seg];
    }

    case 'semi-circular-wall': {
      // Exact 180° semicircular rotunda apse (`R = 1.50m`, `chord = 3.00m`, concave `interiorColor` opening toward `+Z`!)
      const seg = makeSeg(1.5, 0.55, -1.5, 0.55);
      applyWallTemplateProfileToWall(seg, templateId);
      return [seg];
    }

    case 'circular-wall-segment': {
      // Exact 120° circular sector (`R = 1.85m`, `chord = 2 * R * sin(60°) = 3.2043m`, 3 segments form a seamless 360° round room!)
      const halfC = 1.85 * Math.sin(Math.PI / 3); // 1.60215m
      const seg = makeSeg(halfC, 0.34, -halfC, 0.34);
      applyWallTemplateProfileToWall(seg, templateId);
      return [seg];
    }

    case 's-shaped-wall': {
      const seg = makeSeg(-1.75, 0, 1.75, 0, {
        exteriorColor: defaults.interiorColor,
        interiorColor: defaults.interiorColor,
      });
      applyWallTemplateProfileToWall(seg, templateId);
      return [seg];
    }

    case 'diagonal-wall': {
      // Exact 3.00m length at 45° (`3.0 / (2 * √2) = 1.06066m`), oriented so `-nL` faces `(+X, +Z)`!
      const d = 1.5 / Math.SQRT2;
      const seg = makeSeg(d, -d, -d, d);
      applyWallTemplateProfileToWall(seg, templateId);
      return [seg];
    }

    // 3. Corner Wall Templates (10)
    case 'inner-corner-wall':
      // Concave room interior corner opening toward `(+X, +Z)` with interior corner cove moulding + mitered baseboards!
      return [
        makeSeg(0.9, -0.9, -0.9, -0.9, {
          cornerStyle: 'inner-trim',
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
        makeSeg(-0.9, -0.9, -0.9, 0.9, {
          cornerStyle: 'inner-trim',
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
      ];

    case 'outer-corner-wall':
      // Convex exterior building corner jutting toward `(+X, +Z)` with bold L-quoin stone pilaster, plinth & crown!
      return [
        makeSeg(-1.05, 0.75, 0.75, 0.75, {
          cornerStyle: 'outer-quoin',
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0.75, 0.75, 0.75, -1.05, {
          cornerStyle: 'outer-quoin',
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];

    case 'corner-90-wall':
      // Clean 1:1 (`1.90m × 1.90m`) flush 90° mitered corner (`interiorColor` inside `(+X, +Z)`, `exteriorColor` outside `(-X, -Z)`)
      return [
        makeSeg(0.95, -0.95, -0.95, -0.95, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(-0.95, -0.95, -0.95, 0.95, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];

    case 'corner-45-wall':
      // Crisp 135° bay-window / corridor 45°-deflection corner (`interiorColor` facing `(+X, +Z)`)
      return [
        makeSeg(1.45, -0.58, -0.25, -0.58, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(-0.25, -0.58, -1.452, 0.622, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];

    case 'rounded-inner-corner':
      // Concave room corner with sweeping `R = 0.56m` smooth interior cove fillet while outer back corner stays sharp 90°!
      return [
        makeSeg(1.0, -1.0, -1.0, -1.0, {
          cornerStyle: 'rounded-inner',
          cornerRadius: 0.56,
          thickness: Math.max(0.2, defaults.thickness || 0.15),
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(-1.0, -1.0, -1.0, 1.0, {
          cornerStyle: 'rounded-inner',
          cornerRadius: 0.56,
          thickness: Math.max(0.2, defaults.thickness || 0.15),
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];

    case 'rounded-outer-corner':
      // Convex exterior facade corner jutting toward `(+X, +Z)` with sweeping `R = 0.54m` bullnose arc while interior corner stays sharp 90°!
      return [
        makeSeg(-1.1, 0.78, 0.78, 0.78, {
          cornerStyle: 'rounded-outer',
          cornerRadius: 0.54,
          thickness: Math.max(0.26, defaults.thickness || 0.15),
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0.78, 0.78, 0.78, -1.1, {
          cornerStyle: 'rounded-outer',
          cornerRadius: 0.54,
          thickness: Math.max(0.26, defaults.thickness || 0.15),
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];

    case 'beveled-corner-wall':
      // Orthogonal wings + wide 45° diagonal splayed corner facet (`0.72m` X & Z step = `1.02m` chamfer wall)
      return [
        makeSeg(1.05, -1.05, -0.33, -1.05, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(-0.33, -1.05, -1.05, -0.33, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(-1.05, -0.33, -1.05, 1.05, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];

    case 'curved-corner-wall': {
      // Two straight tangent wings + exact concentric 90° quarter-circle arc (`R = 1.15m`) where BOTH inner & outer faces curve in parallel!
      return [
        makeSeg(1.15, -1.05, 0.1, -1.05, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0.1, -1.05, -1.05, 0.1, {
          pathMode: 'circular-arc',
          curveBulge: 0.337,
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(-1.05, 0.1, -1.05, 1.15, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];
    }

    case 'three-way-junction-wall':
      // Compact 3-branch connector hub (`2.10m × 1.15m`): outer main wall along `-Z` + unified interior partition stem!
      return [
        makeSeg(1.05, -0.35, 0, -0.35, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0, -0.35, -1.05, -0.35, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0, -0.35, 0, 0.8, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];

    case 'four-way-junction-wall':
      // Compact 4-branch orthogonal hub (`2.10m × 2.10m`) with unified interior partition faces!
      return [
        makeSeg(-1.05, 0, 0, 0, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0, 0, 1.05, 0, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0, -1.05, 0, 0, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0, 0, 0, 1.05, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];

    // 4. Multi-Segment Wall Shape Templates
    case 'l-shaped-wall':
      // Room-scale asymmetric `3.60m × 1.65m` (`2.2 : 1`) L-wing with mitered baseboards & interior facing `(+X, +Z)`!
      return [
        makeSeg(1.8, -0.825, -1.8, -0.825, {
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
        makeSeg(-1.8, -0.825, -1.8, 0.825, {
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
      ];

    case 't-shaped-wall':
      // Full room-scale `3.90m × 2.50m` T-partition with mitered baseboards & unified interior room divider stem!
      return [
        makeSeg(1.95, -0.85, 0, -0.85, {
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
        makeSeg(0, -0.85, -1.95, -0.85, {
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
        makeSeg(0, -0.85, 0, 1.65, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
      ];

    case 'cross-shaped-wall':
      // Wide-span `4.10m × 3.10m` cruciform 4-room divider with mitered baseboards & unified interior finish!
      return [
        makeSeg(-2.05, 0, 0, 0, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
        makeSeg(0, 0, 2.05, 0, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
        makeSeg(0, -1.55, 0, 0, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
        makeSeg(0, 0, 0, 1.55, {
          exteriorColor: defaults.interiorColor,
          interiorColor: defaults.interiorColor,
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
      ];

    case 'u-shaped-wall':
      // Three-sided `2.80m × 2.00m` alcove enclosure with `interiorColor` on all 3 inner faces & `exteriorColor` on all 3 outer faces!
      return [
        makeSeg(1.4, 1.0, 1.4, -1.0, {
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
        makeSeg(1.4, -1.0, -1.4, -1.0, {
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
        makeSeg(-1.4, -1.0, -1.4, 1.0, {
          hasBaseboard: true,
          wallGroupId: groupId,
        }),
      ];

    case 'zigzag-wall':
      // Bold 4-pleat acoustic/gallery folded wall (`3.60m` span × `1.08m` deep pleats, ~60° dramatic folds!)
      return [
        makeSeg(1.8, -0.54, 0.9, 0.54, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0.9, 0.54, 0, -0.54, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(0, -0.54, -0.9, 0.54, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
        makeSeg(-0.9, 0.54, -1.8, -0.54, {
          hasBaseboard: false,
          wallGroupId: groupId,
        }),
      ];

    default: {
      // Standard single-span Basic & Wall-End templates centered on X (`-halfL .. +halfL`)
      const halfL = Math.max(0.5, (defaults.lengthTemplate || 3.0) * 0.5);
      const seg = makeSeg(-halfL, 0, halfL, 0, {
        hasBaseboard: false,
      });
      applyWallTemplateProfileToWall(seg, templateId);
      return [seg];
    }
  }
}

/* =========================================================
   Crisp Singleton Offscreen 3D WYSIWYG Thumbnail Generator
   Renders all 38 Wall Templates with genuine Manifold 3D Geometry,
   true-scale Basic comparison framing, close-up Wall-End focus,
   and exact bounding-sphere safety so zero cards ever clip!
   ========================================================= */
let cachedWallThumbs: Partial<Record<WallTemplateId, string>> | null = null;

export function getWallTemplateThumbnails(): Partial<
  Record<WallTemplateId, string>
> {
  if (cachedWallThumbs) return cachedWallThumbs;
  if (typeof document === 'undefined') return {};

  const out: Partial<Record<WallTemplateId, string>> = {};
  try {
    const logicalSize = 112;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(logicalSize, logicalSize);
    renderer.setPixelRatio(2);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);

    scene.add(new THREE.HemisphereLight('#f8fafc', '#1e293b', 1.18));
    const key = new THREE.DirectionalLight('#fffbeb', 2.3);
    key.position.set(5.5, 8.5, 6.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight('#93c5fd', 1.08);
    fill.position.set(-5, 5, -4.5);
    scene.add(fill);

    // Distinct architectural materials so Top Cap, Exterior Face, Interior Face & Sculpted Trim read clearly at 48px!
    const capMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.62,
      metalness: 0.06,
    });
    const extMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.72,
      metalness: 0.04,
    });
    const intMat = new THREE.MeshStandardMaterial({
      color: '#fde68a',
      roughness: 0.74,
      metalness: 0.03,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      roughness: 0.48,
      metalness: 0.14,
    });
    const refPadMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.36,
    });
    const dualMats = [capMat, capMat, capMat, capMat, extMat, intMat];

    for (const meta of WALL_TEMPLATES_CATALOG) {
      const isBasic = meta.category === 'basic';
      const isWallEnd = meta.category === 'wall-end';

      // Compact specimen span on `wall-end` (`1.75m`) so the sculpted `+X` termination fills the card clearly!
      const previewDefaults: WallDrawDefaults = {
        ...DEFAULT_WALL_DRAW,
        lengthTemplate: isWallEnd ? 1.75 : 2.6,
        exteriorColor: '#e2e8f0',
        interiorColor: '#fde68a',
        hasBaseboard: false,
      };
      const segs = createWallSegmentsFromTemplate(
        meta.id,
        'floor_1',
        { x: 0, z: 0 },
        previewDefaults
      );

      for (const s of segs) {
        if (isBasic) {
          // Preserve true height ratios across Low (0.55m), Half (1.15m), Normal (2.35m), Tall (3.65m)!
          if (meta.id === 'low-wall') s.height = 0.55;
          else if (meta.id === 'half-wall') s.height = 1.15;
          else if (meta.id === 'tall-wall') s.height = 3.65;
          else s.height = 2.35;
        } else if (isWallEnd) {
          s.height = 1.65;
        } else {
          s.height = 1.85;
        }
      }

      const plan = computeFloorWallJunctions(segs);
      const holder = new THREE.Group();
      const disposables: THREE.BufferGeometry[] = [];

      // Subtle architectural base scale strip on Basic walls (and orthogonal floor frame on Diagonal wall!)
      if (isBasic) {
        const padGeo = new THREE.BoxGeometry(2.85, 0.03, 0.95);
        disposables.push(padGeo);
        const padMesh = new THREE.Mesh(padGeo, refPadMat);
        padMesh.position.set(0, -0.016, 0);
        holder.add(padMesh);
      } else if (meta.id === 'diagonal-wall') {
        const padGeo = new THREE.BoxGeometry(2.45, 0.03, 2.45);
        disposables.push(padGeo);
        const padMesh = new THREE.Mesh(padGeo, refPadMat);
        padMesh.position.set(0, -0.016, 0);
        holder.add(padMesh);
      }

      for (const s of segs) {
        const trims = plan.endTrims.get(s.id);
        const built = buildManifoldWallBodyGeometry(
          s,
          [],
          trims?.start,
          trims?.end
        );
        disposables.push(built.bodyGeo);
        holder.add(new THREE.Mesh(built.bodyGeo, dualMats));
        if (built.copingGeo) {
          disposables.push(built.copingGeo);
          holder.add(new THREE.Mesh(built.copingGeo, trimMat));
        }
        if (built.trimExtrasGeo) {
          disposables.push(built.trimExtrasGeo);
          holder.add(new THREE.Mesh(built.trimExtrasGeo, trimMat));
        }
      }
      for (const fp of plan.filletPieces) {
        const fg = buildCornerFilletGeometry(fp);
        if (fg) {
          disposables.push(fg);
          const isTrimPiece =
            fp.style === 'outer-quoin' || fp.style === 'inner-trim';
          holder.add(new THREE.Mesh(fg, isTrimPiece ? trimMat : dualMats));
        }
      }

      scene.add(holder);
      holder.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(holder);
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);

      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const isCompactHub =
        meta.id === 'three-way-junction-wall' ||
        meta.id === 'four-way-junction-wall';
      const refMinRadius = isBasic
        ? 2.28
        : isCompactHub
        ? 2.35
        : isWallEnd
        ? 0.5
        : 1.5;
      const effectiveRadius = Math.max(refMinRadius, sphere.radius);
      const fitDist =
        (effectiveRadius / Math.sin(fovRad * 0.5)) * (isBasic ? 1.18 : 1.26);

      const targetCenter = isBasic
        ? new THREE.Vector3(0, Math.max(1.25, sphere.center.y), 0)
        : sphere.center;

      const viewDir =
        meta.id === 'diagonal-wall'
          ? new THREE.Vector3(0.14, 0.74, 0.88).normalize()
          : isWallEnd
          ? new THREE.Vector3(0.74, 0.58, 0.66).normalize()
          : meta.category === 'corner' || meta.category === 'shape'
          ? new THREE.Vector3(0.58, 0.78, 0.64).normalize()
          : new THREE.Vector3(0.56, 0.54, 0.74).normalize();

      camera.position
        .copy(targetCenter)
        .addScaledVector(viewDir, fitDist);
      camera.lookAt(targetCenter);
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
      out[meta.id] = renderer.domElement.toDataURL('image/png');

      scene.remove(holder);
      for (const g of disposables) g.dispose();
    }

    capMat.dispose();
    extMat.dispose();
    intMat.dispose();
    trimMat.dispose();
    refPadMat.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  } catch {
    // Graceful fallback in non-WebGL / headless test environments
  }

  cachedWallThumbs = out;
  return out;
}
