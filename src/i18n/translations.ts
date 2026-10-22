import { AppLanguage } from '../types/studio';

export interface StudioStrings {
  // Main Menu
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  continueLast: string;
  lastEdited: string;
  modeModelingTitle: string;
  modeModelingDesc: string;
  modeModelingBtn: string;
  modeHouseTitle: string;
  modeHouseDesc: string;
  modeHouseBtn: string;
  openProjectFile: string;
  globalSettings: string;
  tabMyProjects: string;
  tabMyAssets: string;
  emptyProjectsTitle: string;
  emptyProjectsDesc: string;
  emptyAssetsTitle: string;
  emptyAssetsDesc: string;
  objectsUnit: string;
  partsUnit: string;
  rename: string;
  duplicate: string;
  exportBackup: string;
  delete: string;
  stageDragHint: string;
  moodMorning: string;
  moodSunset: string;
  moodNight: string;

  // Global Settings Modal
  settingsTitle: string;
  settingsSubtitle: string;
  langSection: string;
  themeSection: string;
  graphicsSection: string;
  gfxLight: string;
  gfxLightDesc: string;
  gfxBalanced: string;
  gfxBalancedDesc: string;
  gfxUltra: string;
  gfxUltraDesc: string;
  controlsSection: string;
  orbitSpeed: string;
  uiDensity: string;
  densityComfort: string;
  densityCompact: string;
  done: string;

  // Editor TopBar & Modes
  backHome: string;
  untitledProject: string;
  untitledHouse: string;
  savedAuto: string;
  snap: string;
  surface: string;
  grid: string;
  peekInterior: string;
  walkthrough: string;
  exitWalkthrough: string;
  walkHint: string;
  import3DBtn: string;
  import3DHint: string;
  importing3DToast: string;
  restoreOriginalMaterial: string;
  exportBtn: string;
  clearScene: string;
  help: string;

  // Left Toolbar
  select: string;
  move: string;
  rotate: string;
  scale: string;
  paint: string;
  worldAxis: string;
  localAxis: string;
  stickSurface: string;
  copy: string;

  // Spawn Docks (Modeling vs House Builder)
  basicShapes: string;
  housePresets: string;
  shapesHint: string;
  presetsHint: string;
  searchShapes: string;
  searchPresets: string;
  lastUsed: string;
  properties: string;
  catAll: string;
  catWalls: string;
  catFloors: string;
  catRoofs: string;
  catOpenings: string;
  catFurniture: string;
  catLighting: string;
  catCustom: string;

  // Inspector & Grouping / Custom Assets
  objectList: string;
  objectStudio: string;
  tabTransform: string;
  tabColor: string;
  tabSubdiv: string;
  positionLabel: string;
  rotationLabel: string;
  scaleLabel: string;
  groupAction: string;
  ungroupAction: string;
  editGroupParts: string;
  editingSinglePart: string;
  saveToAssets: string;
  savedToAssetsToast: string;
  groupedToast: string;
  ungroupedToast: string;
}

export const TRANSLATIONS: Record<AppLanguage, StudioStrings> = {
  id: {
    heroBadge: 'Studio 3D Bangunan & Perabot',
    heroTitle: 'Wujudkan Ide Ruang & Bentuk 3D dengan Mudah',
    heroSubtitle:
      'Rakit bentuk bebas dari 75 komponen presisi atau bangun rumah lengkap beserta interiornya langsung dari browser & layar sentuh.',
    continueLast: 'Lanjut Edit Terakhir',
    lastEdited: 'Terakhir dibuka',
    modeModelingTitle: 'Mode Modeling',
    modeModelingDesc:
      'Kanvas kosong dengan 75 Basic Shapes presisi untuk merakit perabot, ornamen, atau objek 3D dari nol.',
    modeModelingBtn: '+ Proyek Baru',
    modeHouseTitle: 'Buat Rumah',
    modeHouseDesc:
      'Kanvas arsitektur luas untuk merancang rumah dari nol memakai Basic Shapes, Asetku, Impor 3D (.glb/dll), Intip Ruang & Jalan Kaki.',
    modeHouseBtn: '+ Mulai Buat Rumah',
    openProjectFile: 'Buka File (.perabot)',
    globalSettings: 'Pengaturan',
    tabMyProjects: 'Proyekku',
    tabMyAssets: 'Koleksi Propertiku',
    emptyProjectsTitle: 'Belum ada proyek tersimpan',
    emptyProjectsDesc:
      'Pilih Mode Modeling atau Buat Rumah di atas—pekerjaanmu akan tersimpan otomatis di sini lengkap dengan gambar 3D-nya.',
    emptyAssetsTitle: 'Koleksi properti masih kosong',
    emptyAssetsDesc:
      'Rakit meja, kursi, atau dekorasi di Mode Modeling lalu klik "Simpan ke Asetku" agar bisa dipakai berulang kali saat Buat Rumah!',
    objectsUnit: 'objek',
    partsUnit: 'bagian',
    rename: 'Ganti Nama',
    duplicate: 'Duplikat',
    exportBackup: 'Simpan File .perabot',
    delete: 'Hapus',
    stageDragHint: 'Geser panggung 3D untuk memutar tampilan',
    moodMorning: 'Pagi',
    moodSunset: 'Sore',
    moodNight: 'Malam',

    settingsTitle: 'Pengaturan Studio',
    settingsSubtitle: 'Sesuaikan bahasa, tema warna, dan kenyamanan kontrol',
    langSection: 'Bahasa Aplikasi',
    themeSection: 'Tema Warna Studio',
    graphicsSection: 'Kualitas Grafis & Performa',
    gfxLight: 'Ringan',
    gfxLightDesc: 'Hemat baterai & lancar untuk HP ringan',
    gfxBalanced: 'Seimbang',
    gfxBalancedDesc: 'Bayangan halus & tajam 60 FPS',
    gfxUltra: 'Tinggi (Ultra)',
    gfxUltraDesc: 'Resolusi penuh HiDPI & bayangan ekstra tajam',
    controlsSection: 'Kontrol & Tampilan UI',
    orbitSpeed: 'Kecepatan Putar Kamera',
    uiDensity: 'Ukuran Antarmuka',
    densityComfort: 'Nyaman',
    densityCompact: 'Ringkas',
    done: 'Selesai',

    backHome: 'Menu Utama',
    untitledProject: 'Proyek Modeling',
    untitledHouse: 'Rumah Impian',
    savedAuto: 'Tersimpan',
    snap: 'Snap',
    surface: 'Surface',
    grid: 'Grid',
    peekInterior: 'Intip Ruang',
    walkthrough: 'Jalan Kaki',
    exitWalkthrough: 'Keluar Jalan Kaki',
    walkHint: 'Gunakan joystick kiri untuk jalan & geser layar kanan untuk menengok (WASD di PC)',
    import3DBtn: 'Impor 3D',
    import3DHint: 'Impor satu atau banyak file 3D (.glb, .gltf, .obj, .stl, .ply, .fbx) ke domain',
    importing3DToast: 'Memuat file 3D ke dalam domain...',
    restoreOriginalMaterial: 'Kembalikan Tekstur / Material Asli',
    exportBtn: 'Ekspor',
    clearScene: 'Bersihkan Kanvas',
    help: 'Panduan',

    select: 'Pilih',
    move: 'Geser',
    rotate: 'Putar',
    scale: 'Skala',
    paint: 'Warna',
    worldAxis: 'Global',
    localAxis: 'Lokal',
    stickSurface: 'Tempel',
    copy: 'Salin',

    basicShapes: 'Basic Shapes',
    housePresets: 'Preset Rumah',
    shapesHint: 'Ketuk untuk tambah • Tekan lama untuk info bentuk',
    presetsHint: 'Ketuk untuk pasang • Tekan lama untuk detail properti',
    searchShapes: 'Cari bentuk (cube, wedge, arch, kusen)...',
    searchPresets: 'Cari dinding, atap, pintu, sofa, kasur, lampu...',
    lastUsed: 'Terakhir dipakai',
    properties: 'Properti',
    catAll: 'Semua',
    catWalls: 'Dinding',
    catFloors: 'Lantai & Teras',
    catRoofs: 'Atap',
    catOpenings: 'Pintu, Jendela & Tangga',
    catFurniture: 'Perabot Ruang',
    catLighting: 'Lampu & Dekor',
    catCustom: 'Asetku',

    objectList: 'Daftar Objek',
    objectStudio: 'Studio Objek',
    tabTransform: 'Transform',
    tabColor: 'Warna RGB',
    tabSubdiv: 'Subdiv',
    positionLabel: 'Posisi (Meter)',
    rotationLabel: 'Rotasi (Derajat °)',
    scaleLabel: 'Ukuran / Skala (Meter)',
    groupAction: 'Gabung Grup',
    ungroupAction: 'Pisah Grup',
    editGroupParts: 'Edit per Bagian',
    editingSinglePart: 'Mode Bagian Aktif',
    saveToAssets: 'Simpan ke Asetku',
    savedToAssetsToast: 'Tersimpan di Koleksi Propertiku!',
    groupedToast: 'Objek digabung menjadi satu grup',
    ungroupedToast: 'Grup berhasil dipisah',
  },

  en: {
    heroBadge: '3D Architecture & Furniture Studio',
    heroTitle: 'Design 3D Spaces & Custom Props Effortlessly',
    heroSubtitle:
      'Craft custom models from 75 precision primitives or assemble cozy homes with ready-made rooms & furniture on any device.',
    continueLast: 'Continue Editing',
    lastEdited: 'Edited',
    modeModelingTitle: '3D Modeling',
    modeModelingDesc:
      'Start on a clean canvas with 75 crisp Basic Shapes to build custom furniture, props, or architectural details.',
    modeModelingBtn: '+ New Project',
    modeHouseTitle: 'House Builder',
    modeHouseDesc:
      'Spacious architectural domain to craft homes using Basic Shapes, Custom Assets, 3D Model Import (.glb & more), Peek Inside & Walkthrough.',
    modeHouseBtn: '+ Build a House',
    openProjectFile: 'Open File (.perabot)',
    globalSettings: 'Settings',
    tabMyProjects: 'My Projects',
    tabMyAssets: 'Saved Assets',
    emptyProjectsTitle: 'No projects yet',
    emptyProjectsDesc:
      'Start in 3D Modeling or House Builder above—your work auto-saves right here with live 3D previews.',
    emptyAssetsTitle: 'No custom assets yet',
    emptyAssetsDesc:
      'Craft a chair, table, or lamp in 3D Modeling and tap "Save as Asset" to reuse it anytime inside House Builder!',
    objectsUnit: 'items',
    partsUnit: 'parts',
    rename: 'Rename',
    duplicate: 'Duplicate',
    exportBackup: 'Save .perabot File',
    delete: 'Delete',
    stageDragHint: 'Drag stage to orbit 3D showcase',
    moodMorning: 'Morning',
    moodSunset: 'Sunset',
    moodNight: 'Night',

    settingsTitle: 'Studio Settings',
    settingsSubtitle: 'Customize language, workspace theme, and touch feel',
    langSection: 'App Language',
    themeSection: 'Workspace Theme',
    graphicsSection: 'Graphics & Performance',
    gfxLight: 'Light',
    gfxLightDesc: 'Battery saver & smooth on entry phones',
    gfxBalanced: 'Balanced',
    gfxBalancedDesc: 'Soft shadows & crisp 60 FPS',
    gfxUltra: 'Ultra',
    gfxUltraDesc: 'Full HiDPI rendering & sharp shadows',
    controlsSection: 'Camera & UI Layout',
    orbitSpeed: 'Orbit Camera Speed',
    uiDensity: 'UI Sizing',
    densityComfort: 'Comfortable',
    densityCompact: 'Compact',
    done: 'Done',

    backHome: 'Home',
    untitledProject: 'Modeling Project',
    untitledHouse: 'Cozy House',
    savedAuto: 'Saved',
    snap: 'Snap',
    surface: 'Surface',
    grid: 'Grid',
    peekInterior: 'Peek Inside',
    walkthrough: 'Walkthrough',
    exitWalkthrough: 'Exit Walk',
    walkHint: 'Use left joystick to walk & drag screen to look around (WASD on desktop)',
    import3DBtn: 'Import 3D',
    import3DHint: 'Import one or multiple 3D files (.glb, .gltf, .obj, .stl, .ply, .fbx) into domain',
    importing3DToast: 'Loading 3D files into domain...',
    restoreOriginalMaterial: 'Restore Original Texture / Material',
    exportBtn: 'Export',
    clearScene: 'Clear Scene',
    help: 'Guide',

    select: 'Select',
    move: 'Move',
    rotate: 'Rotate',
    scale: 'Scale',
    paint: 'Paint',
    worldAxis: 'World',
    localAxis: 'Local',
    stickSurface: 'Conform',
    copy: 'Clone',

    basicShapes: 'Basic Shapes',
    housePresets: 'House Presets',
    shapesHint: 'Tap to spawn • Hold for shape details',
    presetsHint: 'Tap to place • Hold for preset details',
    searchShapes: 'Search shapes (cube, wedge, arch, frame)...',
    searchPresets: 'Search walls, roofs, doors, sofa, bed, lamp...',
    lastUsed: 'Recent',
    properties: 'Inspector',
    catAll: 'All',
    catWalls: 'Walls',
    catFloors: 'Floors & Deck',
    catRoofs: 'Roofs',
    catOpenings: 'Doors, Windows & Stairs',
    catFurniture: 'Furniture',
    catLighting: 'Lights & Decor',
    catCustom: 'My Assets',

    objectList: 'Scene Objects',
    objectStudio: 'Object Studio',
    tabTransform: 'Transform',
    tabColor: 'RGB Color',
    tabSubdiv: 'Subdiv',
    positionLabel: 'Position (Meters)',
    rotationLabel: 'Rotation (Degrees °)',
    scaleLabel: 'Size / Scale (Meters)',
    groupAction: 'Group All',
    ungroupAction: 'Ungroup',
    editGroupParts: 'Edit Single Part',
    editingSinglePart: 'Part Edit ON',
    saveToAssets: 'Save as Asset',
    savedToAssetsToast: 'Saved to your Custom Assets!',
    groupedToast: 'Grouped into a single unit',
    ungroupedToast: 'Group separated',
  },

  ja: {
    heroBadge: '3D建築＆インテリア制作スタジオ',
    heroTitle: '部屋づくりも3Dモデリングも、直感操作で',
    heroSubtitle:
      '75種類の精密シェイプで自由な家具づくりも、壁・屋根・家具プリセットを使った家づくりもこれひとつで完結。',
    continueLast: '前回の続きから',
    lastEdited: '最終更新',
    modeModelingTitle: 'モデリング',
    modeModelingDesc:
      '空のキャンバスからスタート。75種類の基本シェイプを組み合わせてオリジナルの家具や小物を制作します。',
    modeModelingBtn: '+ 新規作成',
    modeHouseTitle: 'ハウス作成',
    modeHouseDesc:
      '広々とした建築ドメインで、基本シェイプ・マイアセット・3Dファイル読み込み(.glb等)・室内表示・ウォークスルーを使って家を設計します。',
    modeHouseBtn: '+ 家をつくる',
    openProjectFile: 'ファイルを開く (.perabot)',
    globalSettings: '設定',
    tabMyProjects: 'マイプロジェクト',
    tabMyAssets: 'マイアセット',
    emptyProjectsTitle: '保存されたプロジェクトはありません',
    emptyProjectsDesc:
      '上の「モデリング」または「ハウス作成」から始めると、3Dサムネイル付きでここに自動保存されます。',
    emptyAssetsTitle: '登録アセットはまだありません',
    emptyAssetsDesc:
      'モデリングで作った家具を「アセット登録」すると、ハウス作成モードでいつでも呼び出せます！',
    objectsUnit: 'オブジェクト',
    partsUnit: 'パーツ',
    rename: '名前を変更',
    duplicate: '複製',
    exportBackup: '.perabot形式で保存',
    delete: '削除',
    stageDragHint: 'ドラッグで3Dジオラマを回転',
    moodMorning: '朝',
    moodSunset: '夕方',
    moodNight: '夜',

    settingsTitle: 'スタジオ設定',
    settingsSubtitle: '言語・カラーテーマ・カメラ操作をお好みに調整',
    langSection: '表示言語',
    themeSection: 'カラーテーマ',
    graphicsSection: 'グラフィック・動作優先度',
    gfxLight: '軽量',
    gfxLightDesc: '省電力・スマホでも軽快に動作',
    gfxBalanced: 'バランス',
    gfxBalancedDesc: '自然な影と滑らかな60FPS描画',
    gfxUltra: '高画質',
    gfxUltraDesc: '高精細HiDPI描画＆シャープな影',
    controlsSection: 'カメラ＆UIサイズ',
    orbitSpeed: 'カメラ回転スピード',
    uiDensity: 'ボタン・UIサイズ',
    densityComfort: '標準',
    densityCompact: 'コンパクト',
    done: '完了',

    backHome: 'ホーム',
    untitledProject: '新規モデリング',
    untitledHouse: 'マイホーム設計',
    savedAuto: '自動保存済み',
    snap: 'スナップ',
    surface: '面吸着',
    grid: 'グリッド',
    peekInterior: '室内表示',
    walkthrough: 'ウォークスルー',
    exitWalkthrough: '通常視点に戻る',
    walkHint: '左スティックで移動・画面ドラッグで見回す（PCはWASD対応）',
    import3DBtn: '3D読込',
    import3DHint: '1つまたは複数の3Dファイル (.glb, .gltf, .obj, .stl, .ply, .fbx) を配置',
    importing3DToast: '3Dファイルをドメインに読み込み中...',
    restoreOriginalMaterial: '元のテクスチャ・マテリアルに戻す',
    exportBtn: '書き出し',
    clearScene: '全消去',
    help: 'ガイド',

    select: '選択',
    move: '移動',
    rotate: '回転',
    scale: 'スケール',
    paint: 'カラー',
    worldAxis: 'ワールド',
    localAxis: 'ローカル',
    stickSurface: '接地',
    copy: '複製',

    basicShapes: '基本シェイプ',
    housePresets: 'ハウス素材',
    shapesHint: 'タップで配置・長押しで解説を表示',
    presetsHint: 'タップで配置・長押しで詳細を表示',
    searchShapes: 'シェイプを検索 (cube, wedge, arch)...',
    searchPresets: '壁・屋根・窓・ソファ・照明を検索...',
    lastUsed: '履歴',
    properties: 'プロパティ',
    catAll: 'すべて',
    catWalls: '壁・フェンス',
    catFloors: '床・テラス',
    catRoofs: '屋根',
    catOpenings: 'ドア・窓・階段',
    catFurniture: '家具・インテリア',
    catLighting: '照明・小物',
    catCustom: 'マイアセット',

    objectList: 'オブジェクト一覧',
    objectStudio: '編集スタジオ',
    tabTransform: '変形',
    tabColor: 'RGBカラー',
    tabSubdiv: '細分化',
    positionLabel: '位置 (m)',
    rotationLabel: '回転 (°)',
    scaleLabel: 'サイズ・倍率 (m)',
    groupAction: '全体をグループ化',
    ungroupAction: 'グループ解除',
    editGroupParts: 'パーツ個別編集',
    editingSinglePart: '個別編集中',
    saveToAssets: 'アセット登録',
    savedToAssetsToast: 'マイアセットに登録しました！',
    groupedToast: 'グループにまとめました',
    ungroupedToast: 'グループを解除しました',
  },
};

export function formatRelativeTime(timestamp: number, lang: AppLanguage): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) {
    return lang === 'ja' ? 'たった今' : lang === 'en' ? 'Just now' : 'Baru saja';
  }
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) {
    return lang === 'ja'
      ? `${mins}分前`
      : lang === 'en'
      ? `${mins}m ago`
      : `${mins} menit lalu`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return lang === 'ja'
      ? `${hrs}時間前`
      : lang === 'en'
      ? `${hrs}h ago`
      : `${hrs} jam lalu`;
  }
  const days = Math.floor(hrs / 24);
  return lang === 'ja'
    ? `${days}日前`
    : lang === 'en'
    ? `${days}d ago`
    : `${days} hari lalu`;
}
