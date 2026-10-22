import { PrimitiveMetaItem } from '../engine/primitives';
import { AppLanguage, PrimitiveKind, ShapeSubcategory } from '../types/studio';

interface LocalizedShapeText {
  label: string;
  subtitle: string;
  description: string;
}

const SHAPE_EN: Record<PrimitiveKind, LocalizedShapeText> = {
  cube: {
    label: 'Cube',
    subtitle: 'Standard solid block',
    description: 'Fundamental 1×1×1 solid block for walls, floors, tabletops, pillars, and modular building.',
  },
  'beveled-cube': {
    label: 'Beveled Cube',
    subtitle: '45° chamfered block',
    description: 'Solid block with crisp 45° chamfered edges that catch realistic highlights for modern furniture and pillars.',
  },
  'smooth-cube': {
    label: 'Smooth Cube',
    subtitle: 'Soft rounded block',
    description: 'Cushioned block with smooth rounded corners, ideal for sofa cushions, mattresses, and soft seating.',
  },
  triangle: {
    label: 'Gable Triangle',
    subtitle: 'Pitched roof prism',
    description: 'Symmetric gable triangle prism ideal for classic pitched roofs and structural trusses.',
  },
  'vertical-wedge': {
    label: 'Vertical Wedge',
    subtitle: 'Upward sloped ramp',
    description: '45° sloped wedge for single-pitch roofs, stairs, and angled architectural transitions.',
  },
  'horizontal-wedge': {
    label: 'Horizontal Wedge',
    subtitle: '45° angled wall corner',
    description: 'Vertical right-triangle block for 45° diagonal bay walls and corner chamfers.',
  },
  'inverted-wedge': {
    label: 'Inverted Wedge',
    subtitle: 'Overhang corbel slope',
    description: 'Upside-down wedge with flat top, perfect for balcony overhangs, eaves, and cantilevered brackets.',
  },
  'corner-wedge': {
    label: 'Corner Wedge',
    subtitle: 'Outer hip roof corner',
    description: 'Outer hip roof corner block connecting two perpendicular sloped roof sections seamlessly.',
  },
  'inverted-corner-wedge': {
    label: 'Inverted Corner Wedge',
    subtitle: 'Inverted overhang corner',
    description: 'Upside-down corner wedge for outer ceiling coves, corbels, and overhanging eaves.',
  },
  pyramid: {
    label: 'Pyramid',
    subtitle: 'Pointed square pyramid',
    description: 'Centered four-sided pyramid for pavilion roofs, spire caps, and decorative finials.',
  },
  'convex-straight': {
    label: 'Convex Straight',
    subtitle: 'Outward quarter-round',
    description: 'Quarter-cylinder convex trim block for curved armrests, moldings, and rounded wall edges.',
  },
  'concave-straight': {
    label: 'Concave Straight',
    subtitle: 'Inward cove molding',
    description: 'Quarter-circle concave cove block for ceiling transitions, coves, and smooth inner fillets.',
  },
  'convex-outer-corner': {
    label: 'Convex Outer Corner',
    subtitle: 'Rounded outer corner',
    description: 'Rounded outer corner piece connecting two perpendicular convex straight moldings.',
  },
  'convex-inner-corner': {
    label: 'Convex Inner Corner',
    subtitle: 'Rounded inner corner',
    description: 'Inner corner adapter seamlessly joining two meeting convex profiles at 90°.',
  },
  'concave-outer-corner': {
    label: 'Concave Outer Corner',
    subtitle: 'Flared outer cove corner',
    description: 'Outer corner adapter wrapping concave cove moldings smoothly around exterior corners.',
  },
  'concave-inner-corner': {
    label: 'Concave Inner Corner',
    subtitle: 'Bowl-shaped inner corner',
    description: 'Smooth concave inner corner pocket ideal for sinks, tubs, and curved ceiling corners.',
  },
  cylinder: {
    label: 'Cylinder',
    subtitle: 'All-purpose round column',
    description: 'Classic circular cylinder for round pillars, table legs,stools, and bolsters.',
  },
  'vertical-cylinder': {
    label: 'Vertical Cylinder',
    subtitle: 'Smooth high-segment column',
    description: 'High-segment upright cylinder for sleek architectural columns and round pedestals.',
  },
  'horizontal-cylinder': {
    label: 'Horizontal Cylinder',
    subtitle: 'Sideways log / beam',
    description: 'Horizontally oriented cylinder ready for log beams, rollers, and bolster pillows.',
  },
  'beveled-vertical-cylinder': {
    label: 'Beveled Cylinder (V)',
    subtitle: 'Chamfered upright drum',
    description: 'Upright cylinder with beveled top and bottom rims, great for coffee tables, poufs, and lamps.',
  },
  'beveled-horizontal-cylinder': {
    label: 'Beveled Cylinder (H)',
    subtitle: 'Chamfered horizontal drum',
    description: 'Horizontal cylinder with clean chamfered ends for decorative bolsters and mechanical details.',
  },
  cone: {
    label: 'Cone',
    subtitle: 'Pointed circular cone',
    description: 'Circular cone for conical tower roofs, pendant lampshades, and tapered legs.',
  },
  sphere: {
    label: 'Sphere',
    subtitle: 'Full 3D globe',
    description: 'Smooth sphere for globe pendant lights, doorknobs, finials, and organic decor.',
  },
  'half-sphere': {
    label: 'Half Sphere',
    subtitle: 'Hemisphere dome',
    description: 'Flat-bottomed hemisphere for domes, bowls, pendant lamps, and rounded caps.',
  },
  'rectangular-prism': {
    label: 'Rectangular Beam',
    subtitle: 'Elongated solid block',
    description: 'Proportioned rectangular block ready for beams, lintels, benches, and cabinets.',
  },
  'rounded-box': {
    label: 'Rounded Box',
    subtitle: 'Soft-edged cushion box',
    description: 'Elongated box with smooth filleted edges for cushions, ottomans, and modern appliances.',
  },
  'beveled-rectangular-prism': {
    label: 'Beveled Beam',
    subtitle: 'Chamfered rectangular block',
    description: 'Rectangular beam with crisp 45° beveled edges for countertops, shelves, and trim.',
  },
  plane: {
    label: 'Flat Plane',
    subtitle: 'Thin surface sheet',
    description: 'Ultra-thin flat sheet for rugs, glass panes, wall art, and floor decals.',
  },
  'thin-slab': {
    label: 'Thin Slab',
    subtitle: 'Floor deck / shelf board',
    description: 'Architectural slab ideal for floor plates, flat roofs, shelves, and tabletops.',
  },
  'hollow-box': {
    label: 'Hollow Box',
    subtitle: 'Open-ended frame box',
    description: 'Four-walled hollow box frame for open cubbies, room shells, drawers, and planters.',
  },
  'l-shaped-block': {
    label: 'L-Shaped Block',
    subtitle: '90° corner wall / counter',
    description: 'One-piece 90° L-block for corner walls, L-desks, kitchen counters, and sectional sofas.',
  },
  't-shaped-block': {
    label: 'T-Shaped Block',
    subtitle: '3-way partition junction',
    description: 'T-junction block connecting three intersecting walls or structural beams cleanly.',
  },
  'cross-shaped-block': {
    label: 'Cross Block (+)',
    subtitle: '4-way pillar / junction',
    description: 'Symmetric cross-shaped block for 4-way wall intersections, table bases, and mullions.',
  },
  'triangular-prism': {
    label: 'Triangular Prism',
    subtitle: 'Upright 3-sided column',
    description: 'Equilateral upright triangular prism for modern louvers, corner columns, and geometric accents.',
  },
  'trapezoidal-prism': {
    label: 'Trapezoidal Block',
    subtitle: 'Tapered retaining profile',
    description: 'Trapezoidal cross-section block for tapered walls, range hoods, and angled pedestals.',
  },
  'pentagonal-prism': {
    label: 'Pentagonal Prism',
    subtitle: '5-sided column',
    description: 'Regular 5-sided prism for decorative pillars, planters, and faceted tables.',
  },
  'hexagonal-prism': {
    label: 'Hexagonal Prism',
    subtitle: '6-sided honeycomb block',
    description: 'Classic 6-sided hexagonal block for hex tiles, gazebo bases, and side tables.',
  },
  'octagonal-prism': {
    label: 'Octagonal Prism',
    subtitle: '8-sided classical pillar',
    description: '8-sided octagonal block for turret towers, classic columns, and dining pedestals.',
  },
  'chamfered-prism': {
    label: 'Chamfered Pillar',
    subtitle: 'Vertical bevel-corner block',
    description: 'Square pillar with 45° beveled vertical corners for safe, stylish interior columns.',
  },
  'pyramid-frustum': {
    label: 'Pyramid Frustum',
    subtitle: 'Flat-top tapered base',
    description: 'Truncated pyramid with flat top for column pedestals, mansard roofs, and lamp shades.',
  },
  'triangular-pyramid': {
    label: 'Tetrahedron',
    subtitle: '3-sided pyramid',
    description: 'Triangular-base pyramid for modern geometric sculptures and corner roof caps.',
  },
  'pentagonal-pyramid': {
    label: 'Pentagonal Pyramid',
    subtitle: '5-sided pointed roof',
    description: '5-sided pyramid cap matching pentagonal towers and decorative lanterns.',
  },
  'hexagonal-pyramid': {
    label: 'Hexagonal Roof',
    subtitle: '6-sided gazebo roof',
    description: '6-sided pointed roof ideal for garden gazebos, pavilions, and hexagonal turrets.',
  },
  stair: {
    label: 'Stair Block',
    subtitle: '4-step modular stair',
    description: 'Ready-made 4-step staircase unit—stack multiple blocks to reach upper floors effortlessly.',
  },
  ramp: {
    label: 'Gentle Ramp',
    subtitle: 'Low-angle driveway slope',
    description: 'Smooth low-incline ramp for driveways, wheelchair access, and sloped walkways.',
  },
  'triangular-wedge': {
    label: 'Corner Tri-Wedge',
    subtitle: 'Diagonal corner slope',
    description: 'Triangular-footprint wedge for faceted roofs, gussets, and modern angular facades.',
  },
  'trapezoidal-wedge': {
    label: 'Flat-Top Wedge',
    subtitle: 'Truncated slope block',
    description: 'Sloped wedge leading to a flat upper landing for stepped terraces and armrests.',
  },
  'curved-wedge': {
    label: 'S-Curve Wedge',
    subtitle: 'Smooth flowing ramp',
    description: 'Ergonomic S-curved slope for lounge chaises, wave roofs, and decorative transitions.',
  },
  dome: {
    label: 'Architectural Dome',
    subtitle: 'Cupola dome on drum base',
    description: 'Classical dome complete with cylindrical drum base for mosques, rotundas, and gazebos.',
  },
  capsule: {
    label: 'Capsule',
    subtitle: 'Pill-shaped rounded cylinder',
    description: 'Smooth pill capsule for modern mirrors, rounded bolsters, and futuristic props.',
  },
  ellipsoid: {
    label: 'Ellipsoid',
    subtitle: '3D oval pebble shape',
    description: 'Smooth 3D oval form for pebble cushions, organic lamps, and decorative stones.',
  },
  torus: {
    label: 'Torus Ring',
    subtitle: 'Full circular ring',
    description: 'Seamless ring chandelier frame, life buoy, circular molding, or round handle.',
  },
  'torus-segment': {
    label: 'Curved Pipe Elbow',
    subtitle: '90° bent tube arc',
    description: 'Capped curved tube segment for handrails, faucet spouts, and tubular chair frames.',
  },
  'quarter-cylinder': {
    label: 'Quarter Cylinder',
    subtitle: '90° pie-slice column',
    description: '90° sector cylinder for corner shelves, curved reception desks, and rounded steps.',
  },
  'quarter-sphere': {
    label: 'Quarter Dome',
    subtitle: '90° corner apse dome',
    description: 'Quarter-dome corner cap for niches, alcoves, and rounded roof corners.',
  },
  'hollow-cylinder': {
    label: 'Thick Tube',
    subtitle: 'Hollow cylindrical wall',
    description: 'Thick-walled hollow cylinder for planters, wells, round skylights, and lamp shades.',
  },
  pipe: {
    label: 'Thin Pipe',
    subtitle: 'Hollow conduit / rail',
    description: 'Thin-walled hollow pipe for plumbing details, curtain rods, and industrial frames.',
  },
  'ring-cylinder': {
    label: 'Flat Ring',
    subtitle: 'Circular washer / rim',
    description: 'Low-profile circular ring for ceiling medallions, table rims, and recessed lights.',
  },
  'conical-frustum': {
    label: 'Tapered Cylinder',
    subtitle: 'Truncated cone / lampshade',
    description: 'Flat-topped tapered cone perfect for pendant lampshades, flower pots, and mid-century legs.',
  },
  'rounded-cylinder': {
    label: 'Filleted Cylinder',
    subtitle: 'Soft-rimmed round pad',
    description: 'Cylinder with smoothly rounded top and bottom edges for barstool seats and round cushions.',
  },
  'elliptical-cylinder': {
    label: 'Oval Cylinder',
    subtitle: 'Elliptical column / table',
    description: 'Elliptical cross-section cylinder for oval dining tables, pillars, and mirrors.',
  },
  'octagonal-cylinder': {
    label: 'Faceted Octa-Column',
    subtitle: '8-faceted column shaft',
    description: 'Crisp 8-faceted column shaft blending classical geometry with low-poly clarity.',
  },
  gutter: {
    label: 'U-Channel Gutter',
    subtitle: 'Open U-shaped trough',
    description: 'Open U-channel trough for roof gutters, LED strip channels, and planter boxes.',
  },
  'half-pipe': {
    label: 'Half-Pipe Vault',
    subtitle: 'Semicircular arch tunnel',
    description: 'Hollow semicircular vault for barrel ceilings, arched canopies, and cradles.',
  },
  arch: {
    label: 'Roman Arch',
    subtitle: 'Arched wall doorway',
    description: 'Solid wall block with a clean semicircular arch opening for doorways, arcades, and windows.',
  },
  'window-frame': {
    label: 'Window Frame',
    subtitle: '4-pane mullion frame',
    description: 'Ready-made window frame with outer casing and central crossbars—pairs great with glass panes.',
  },
  'door-frame': {
    label: 'Door Frame',
    subtitle: 'Open bottom doorway',
    description: 'U-shaped door casing open at the floor level so walkthrough characters pass cleanly.',
  },
  'wall-niche': {
    label: 'Arched Wall Niche',
    subtitle: 'Recessed display alcove',
    description: 'Recessed arched alcove block for displaying vases, lamps, or bathroom shelves.',
  },
  'fluted-column': {
    label: 'Fluted Column',
    subtitle: 'Grooved classical shaft',
    description: 'Classical Greek/Roman column shaft carved with vertical flutes around its circumference.',
  },
  'spiral-column': {
    label: 'Spiral Column',
    subtitle: 'Twisted Solomonic pillar',
    description: 'Decorative twisted column shaft for ornate porches, balusters, and statement legs.',
  },
  'column-base': {
    label: 'Column Base',
    subtitle: 'Stepped plinth & torus',
    description: 'Classical stepped pedestal base supporting upright or fluted columns cleanly.',
  },
  'column-capital': {
    label: 'Column Capital',
    subtitle: 'Flared crown molding cap',
    description: 'Classical flared capital crowning the top of columns beneath roof beams.',
  },
  cornice: {
    label: 'Crown Cornice',
    subtitle: 'Stepped ceiling / eave trim',
    description: 'Architectural cornice profile for roofline eaves and interior ceiling crown molding.',
  },
  'molding-profile': {
    label: 'Ogee Baseboard',
    subtitle: 'S-curve wall trim',
    description: 'Classic S-profile molding for floor baseboards, door casings, and wainscot rails.',
  },
  'mitered-corner': {
    label: 'Mitered 45° Corner',
    subtitle: '90° trim corner joint',
    description: 'Pre-mitered 90° corner molding block joining horizontal trim runs neatly.',
  },
};

const SUBCAT_LABELS: Record<
  AppLanguage,
  Record<ShapeSubcategory, string>
> = {
  id: {
    all: 'Semua',
    blocks: 'Balok & Pelat',
    'prisms-pyramids': 'Prisma & Limas',
    wedges: 'Wedge & Tangga',
    cylinders: 'Silinder & Kubah',
    curved: 'Lengkung',
    architecture: 'Arsitektur & Kusen',
  },
  en: {
    all: 'All',
    blocks: 'Blocks & Slabs',
    'prisms-pyramids': 'Prisms & Pyramids',
    wedges: 'Wedges & Stairs',
    cylinders: 'Cylinders & Domes',
    curved: 'Curved Trim',
    architecture: 'Architecture & Frames',
  },
  ja: {
    all: 'すべて',
    blocks: 'ブロック・板',
    'prisms-pyramids': '角柱・ピラミッド',
    wedges: 'スロープ・階段',
    cylinders: '円柱・ドーム',
    curved: '曲面パーツ',
    architecture: '建築枠・柱',
  },
};

const JA_SHAPE_NAMES: Partial<Record<PrimitiveKind, { label: string; subtitle: string }>> = {
  cube: { label: 'キューブ (立方体)', subtitle: '基本の四角ブロック' },
  'beveled-cube': { label: '面取りキューブ', subtitle: '45°エッジ面取りブロック' },
  'smooth-cube': { label: '丸角キューブ', subtitle: 'なめらかな角丸ブロック' },
  triangle: { label: '三角プリズム', subtitle: '切妻屋根ブロック' },
  'vertical-wedge': { label: '縦スロープ', subtitle: '45°傾斜ウェッジ' },
  'horizontal-wedge': { label: '横コーナーウェッジ', subtitle: '45°斜め壁ブロック' },
  'inverted-wedge': { label: '逆スロープ', subtitle: 'オーバーハング用傾斜' },
  'corner-wedge': { label: '寄棟コーナー', subtitle: '屋根の外角パーツ' },
  'inverted-corner-wedge': { label: '逆コーナーウェッジ', subtitle: '軒下コーナーパーツ' },
  pyramid: { label: 'ピラミッド', subtitle: '四角錐パーツ' },
  cylinder: { label: 'シリンダー (円柱)', subtitle: '基本の丸柱パーツ' },
  cone: { label: 'コーン (円錐)', subtitle: '先端の尖った円錐' },
  sphere: { label: 'スフィア (球体)', subtitle: 'なめらかな球体' },
  'half-sphere': { label: '半球ドーム', subtitle: '底面が平らな半球' },
  'rectangular-prism': { label: '長方形ブロック', subtitle: '梁・カウンター用角材' },
  'rounded-box': { label: '角丸ボックス', subtitle: 'クッション・家具向け' },
  plane: { label: 'フラット平面', subtitle: 'ラグ・ガラス用薄板' },
  'thin-slab': { label: '薄スラブ板', subtitle: '床・棚板・フラット屋根' },
  'hollow-box': { label: '中空ボックス', subtitle: '枠型オープンボックス' },
  'l-shaped-block': { label: 'L字ブロック', subtitle: '直角コーナー壁・机' },
  't-shaped-block': { label: 'T字ブロック', subtitle: '三方分岐ブロック' },
  'cross-shaped-block': { label: '十字ブロック', subtitle: '四方交差ブロック' },
  stair: { label: '階段 (4段)', subtitle: 'そのまま使える階段パーツ' },
  ramp: { label: '緩やかスロープ', subtitle: 'ガレージ・玄関スロープ' },
  dome: { label: '建築ドーム', subtitle: '台座付きドーム屋根' },
  capsule: { label: 'カプセル', subtitle: '両端が丸い円柱' },
  torus: { label: 'トーラス (リング)', subtitle: '円形リングパーツ' },
  arch: { label: 'アーチ開口壁', subtitle: '半円アーチの出入口' },
  'window-frame': { label: '窓フレーム', subtitle: '十字格子付き窓枠' },
  'door-frame': { label: 'ドアフレーム', subtitle: '通り抜け可能な扉枠' },
  'wall-niche': { label: '壁ニッチ (飾り棚)', subtitle: 'アーチ型の壁面くぼみ' },
  'fluted-column': { label: 'フルーティング柱', subtitle: '溝彫りの古典円柱' },
  'spiral-column': { label: 'スパイラル柱', subtitle: 'ねじれ装飾柱' },
};

export function getShapeSubcategoryLabel(
  subcat: ShapeSubcategory,
  lang: AppLanguage
): string {
  return SUBCAT_LABELS[lang]?.[subcat] ?? SUBCAT_LABELS.id[subcat];
}

export function getLocalizedShapeMeta(
  meta: PrimitiveMetaItem,
  lang: AppLanguage
): { label: string; subtitle: string; description: string } {
  if (lang === 'id') {
    return {
      label: meta.label,
      subtitle: meta.subtitle,
      description: meta.description,
    };
  }

  const en = SHAPE_EN[meta.kind];
  if (lang === 'en') {
    return (
      en ?? {
        label: meta.label,
        subtitle: meta.subtitle,
        description: meta.description,
      }
    );
  }

  // Japanese ('ja') — natural Japanese label, subtitle, and architectural usage description
  const jaOverride = JA_SHAPE_NAMES[meta.kind];
  const labelJa = jaOverride?.label ?? en?.label ?? meta.label;
  const subJa = jaOverride?.subtitle ?? en?.subtitle ?? meta.subtitle;
  const subcatJa = getShapeSubcategoryLabel(meta.subcategory, 'ja');
  return {
    label: labelJa,
    subtitle: subJa,
    description: `「${labelJa}」（${subJa}）— ${subcatJa}カテゴリ対応の3Dパーツ。サイズ調整・面吸着・RGB色変更・ボックス分割と組み合わせて自由な建築・家具制作に使えます。`,
  };
}
