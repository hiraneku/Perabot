import { AppLanguage } from '../types/studio';

/**
 * Compiler-enforced UI dictionary (`StudioStrings`).
 * Adding any new UI string key here requires `id`, `en`, and `ja` translations
 * or TypeScript (`tsc`) will immediately catch the missing key at build time!
 */
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
  cancel: string;
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

  // TopBar Core & Save Status
  backHome: string;
  untitledProject: string;
  untitledHouse: string;
  savedAuto: string;
  unsavedChanges: string;
  savingNow: string;
  undo: string;
  redo: string;
  snap: string;
  surface: string;
  grid: string;
  focusBtn: string;
  cameraViewsBtn: string;
  peekInterior: string;
  walkthrough: string;
  exitWalkthrough: string;
  walkHint: string;
  import3DBtn: string;
  import3DHint: string;
  importing3DToast: string;
  import3DFailedToast: string;
  restoreOriginalMaterial: string;
  exportBtn: string;
  clearScene: string;
  clearSceneConfirm: string;
  fullscreen: string;
  toggleRightPanel: string;
  help: string;

  // TopBar: Snap Popover
  snapSystemTitle: string;
  activeState: string;
  inactiveState: string;
  snapMagnetTitle: string;
  snapMagnetDesc: string;
  strengthSubtle: string;
  strengthNormal: string;
  strengthStrong: string;
  snapAlignTitle: string;
  snapAlignDesc: string;
  snapGridTitle: string;
  snapGridDesc: string;

  // TopBar: Surface Popover
  surfaceSystemTitle: string;
  surfaceOrientSection: string;
  surfModeNormalTitle: string;
  surfModeNormalDesc: string;
  surfModeUprightTitle: string;
  surfModeUprightDesc: string;
  surfModeFoundationTitle: string;
  surfModeFoundationDesc: string;
  surfAttachFaceSection: string;
  surfAttachAuto: string;
  surfAttachBottom: string;
  surfAttachBack: string;
  surfAttachTop: string;
  surfAutoMoveTitle: string;
  surfAutoMoveDesc: string;
  surfClickPlaceTitle: string;
  surfClickPlaceDesc: string;
  surfSpinLabel: string;
  surfOffsetLabel: string;
  surfConformNowCta: string;

  // TopBar: Advanced Grid Popover
  gridSystemTitle: string;
  visibleState: string;
  hiddenState: string;
  gridCellSizeSection: string;
  gridSyncSnapBtn: string;
  gridSmartGuidesSection: string;
  gridRulerTitle: string;
  gridRulerDesc: string;
  gridFootprintTitle: string;
  gridFootprintDesc: string;
  gridVertSection: string;
  gridVertOff: string;
  gridVertBack: string;
  gridVertCorner: string;
  gridPlotTitle: string;
  gridPlotDesc: string;
  gridPlotPresetsLabel: string;
  gridPlotWidth: string;
  gridPlotDepth: string;
  gridStyleSection: string;
  gridStyleWire: string;
  gridStyleWireSub: string;
  gridStyleTile: string;
  gridStyleTileSub: string;
  gridStyleBlueprint: string;
  gridStyleBlueprintSub: string;
  gridStyleTerrain: string;
  gridStyleTerrainSub: string;
  terrainShapeSection: string;
  terrainHills: string;
  terrainValley: string;
  terrainTerraced: string;
  terrainFlat: string;
  terrainHeightLabel: string;
  gridWorldSizeLabel: string;
  gridElevationLabel: string;
  gridFitObjectBaseBtn: string;
  gridAxesOn: string;
  gridAxesOff: string;
  gridOpacityLabel: string;

  // TopBar: Camera & Export Popovers
  quickCameraHeader: string;
  camPerspective: string;
  camFront: string;
  camSide: string;
  camTop: string;
  exportFormatHeader: string;
  exportGlbTitle: string;
  exportGlbSub: string;
  exportGltfTitle: string;
  exportGltfSub: string;

  // Left Transform Toolbar & Rotation Bar
  select: string;
  move: string;
  rotate: string;
  scale: string;
  paint: string;
  worldAxis: string;
  localAxis: string;
  stickSurface: string;
  copy: string;
  showLeftToolbar: string;
  hideLeftToolbar: string;
  rotAxisHorizontal: string;
  rotAxisFront: string;
  rotAxisSide: string;
  rotSnapLabel: string;
  rotSnapFree: string;
  rotResetZero: string;

  // Spawn Docks & Catalog
  basicShapes: string;
  housePresets: string;
  shapesHint: string;
  presetsHint: string;
  searchShapes: string;
  searchPresets: string;
  noShapeMatch: string;
  lastUsed: string;
  properties: string;
  catAll: string;
  catCustom: string;

  // Inspector Panel & Outliner
  objectList: string;
  objectStudio: string;
  emptyOutlinerHint: string;
  emptyInspectorHint: string;
  hideObject: string;
  showObject: string;
  tabTransform: string;
  tabColor: string;
  tabSubdiv: string;
  objectNamePlaceholder: string;
  imported3DModelTag: string;
  positionLabel: string;
  rotationLabel: string;
  scaleLabel: string;
  resetBtn: string;
  uniformScaleLock: string;
  uniformScaleFree: string;
  groupAction: string;
  ungroupAction: string;
  editGroupParts: string;
  editingSinglePart: string;
  saveToAssets: string;
  savedToAssetsToast: string;
  groupedToast: string;
  ungroupedToast: string;

  // Revamped Subdivision Tab
  subdivHeaderTitle: string;
  subdivHeaderDesc: string;
  subdivCellsLabel: string;
  subdivTrianglesLabel: string;
  subdivVerticesLabel: string;
  subdivQuickPresets: string;
  subdivResetOriginal: string;
  subdivPerAxisTitle: string;
  subdivAxisX: string;
  subdivAxisY: string;
  subdivAxisZ: string;
  subdivShowLinesTitle: string;
  subdivShowLinesDesc: string;
  subdivGrooveLabel: string;
  subdivGrooveFlat: string;
  subdivSplitBlocksBtn: string;
  subdivSplitBlocksHint: string;
  subdivSplitToast: string;
  subdivCapNotice: string;

  // Color Wheel & Material Studio
  paintClickBtn: string;
  paintClickActive: string;
  eyedropperBtn: string;
  eyedropperActive: string;
  paintNoSelectionHint: string;
  saveSwatchBtn: string;
  brightnessLabel: string;
  autoHarmoniesTitle: string;
  savedPaletteTitle: string;
  archMaterialPresetsTitle: string;
  advancedPbrTitle: string;
  opacityGlassLabel: string;
  roughnessLabel: string;
  metalnessLabel: string;
  emissiveLampLabel: string;
  shadingStyleLabel: string;
  shadingSmooth: string;
  shadingFlat: string;

  // Help Modal & Live HUD
  helpModalTitle: string;
  helpCard1Title: string;
  helpCard1Item1: string;
  helpCard1Item2: string;
  helpCard2Title: string;
  helpCard2Item1: string;
  helpCard2Item2: string;
  helpCard3Title: string;
  helpCard3Item1: string;
  helpCard3Item2: string;
  helpCard4Title: string;
  helpCard4Item1: string;
  helpCard4Item2: string;
  helpShortcutsTitle: string;
  helpShortcutsLine: string;
  hudSurfaceAlign: string;
  hudMove: string;
  hudRotate: string;
  hudScale: string;
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
      'Kanvas arsitektur luas untuk merancang rumah memakai Basic Shapes, Asetku, Impor 3D (.glb/dll), Intip Ruang & Jalan Kaki.',
    modeHouseBtn: '+ Mulai Buat Rumah',
    openProjectFile: 'Buka File (.perabot)',
    globalSettings: 'Pengaturan',
    tabMyProjects: 'Proyekku',
    tabMyAssets: 'Koleksi Propertiku',
    emptyProjectsTitle: 'Belum ada proyek tersimpan',
    emptyProjectsDesc:
      'Pilih Mode Modeling atau Buat Rumah di atas—pekerjaanmu tersimpan pintar otomatis lengkap dengan pratinjau 3D.',
    emptyAssetsTitle: 'Koleksi properti masih kosong',
    emptyAssetsDesc:
      'Rakit meja, kursi, atau dekorasi lalu klik "Simpan ke Asetku" agar bisa dipakai berulang kali di proyek lain!',
    objectsUnit: 'objek',
    partsUnit: 'bagian',
    rename: 'Ganti Nama',
    duplicate: 'Duplikat',
    exportBackup: 'Simpan File .perabot',
    delete: 'Hapus',
    cancel: 'Batal',
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
    unsavedChanges: 'Belum disimpan (klik untuk simpan sekarang)',
    savingNow: 'Menyimpan...',
    undo: 'Urungkan (Ctrl+Z)',
    redo: 'Ulangi (Ctrl+Y)',
    snap: 'Snap',
    surface: 'Surface',
    grid: 'Grid',
    focusBtn: 'Fokus',
    cameraViewsBtn: 'Sudut',
    peekInterior: 'Intip Ruang',
    walkthrough: 'Jalan Kaki',
    exitWalkthrough: 'Keluar Jalan Kaki',
    walkHint:
      'Gunakan joystick kiri untuk jalan & geser layar kanan untuk menengok (WASD di PC)',
    import3DBtn: 'Impor 3D',
    import3DHint:
      'Impor satu atau banyak file 3D (.glb, .gltf, .obj, .stl, .ply, .fbx) ke domain',
    importing3DToast: 'Memuat file 3D ke dalam domain...',
    import3DFailedToast:
      'Gagal memuat file 3D (gunakan .glb, .gltf, .obj, .stl, .ply, .fbx)',
    restoreOriginalMaterial: 'Kembalikan Tekstur / Material Asli',
    exportBtn: 'Ekspor',
    clearScene: 'Bersihkan Kanvas',
    clearSceneConfirm: 'Hapus semua objek di kanvas ini?',
    fullscreen: 'Layar Penuh',
    toggleRightPanel: 'Buka / Tutup Panel Properti',
    help: 'Panduan',

    snapSystemTitle: 'Sistem Snap Pintar',
    activeState: 'Aktif',
    inactiveState: 'Nonaktif',
    snapMagnetTitle: 'Magnet Blok & Sudut',
    snapMagnetDesc:
      'Tempel rapat permukaan, garis tepi & sudut otomatis saat blok berdekatan',
    strengthSubtle: 'Halus',
    strengthNormal: 'Normal',
    strengthStrong: 'Kuat',
    snapAlignTitle: 'Garis Sejajar (Alignment)',
    snapAlignDesc:
      'Garis bantu laser saat lurus tengah/tepi dengan objek lain',
    snapGridTitle: 'Snap Grid',
    snapGridDesc: 'Kunci langkah geser & skala ke ukuran petak grid',

    surfaceSystemTitle: 'Surface Alignment & Kontur',
    surfaceOrientSection: 'Mode Orientasi Permukaan',
    surfModeNormalTitle: 'Ikuti Kemiringan (Align Normal)',
    surfModeNormalDesc:
      'Miring presisi mengikuti kemiringan atap, dinding, kubah & bukit',
    surfModeUprightTitle: 'Tegak Ikuti Tinggi',
    surfModeUprightDesc:
      'Tetap berdiri tegak lurus sambil mengikuti tinggi permukaan di bawahnya',
    surfModeFoundationTitle: 'Fondasi Lereng (Anti-Melayang)',
    surfModeFoundationDesc:
      'Tanam sudut tapak terendah bangunan ke lereng miring',
    surfAttachFaceSection: 'Sisi Objek yang Menempel',
    surfAttachAuto: 'Pintar',
    surfAttachBottom: 'Alas (-Y)',
    surfAttachBack: 'Belakang (-Z)',
    surfAttachTop: 'Atas (+Y)',
    surfAutoMoveTitle: 'Ikuti Otomatis saat Geser',
    surfAutoMoveDesc:
      'Seret objek atau panah XZ untuk meluncur mengikuti permukaan',
    surfClickPlaceTitle: 'Klik Target Permukaan (1-Tap)',
    surfClickPlaceDesc:
      'Ketuk bidang atap/dinding/bukit mana saja untuk memindahkan objek terpilih ke sana',
    surfSpinLabel: 'Putar di Permukaan',
    surfOffsetLabel: 'Jarak Offset Normal',
    surfConformNowCta: 'Tempel Objek Terpilih ke Bawah Sekarang',

    gridSystemTitle: 'Grid Studio & Pengukur Arsitektur',
    visibleState: 'Tampil',
    hiddenState: 'Sembunyi',
    gridCellSizeSection: 'Ukuran Petak Presisi',
    gridSyncSnapBtn: 'Sinkron Snap',
    gridSmartGuidesSection: 'Alat Bantu Ukur & Kavling',
    gridRulerTitle: 'Penggaris Angka Meter (X / Z)',
    gridRulerDesc: 'Tampilkan angka jarak 1m, 2m, 5m langsung di lantai kerja',
    gridFootprintTitle: 'Bayangan Ukuran Objek Aktif',
    gridFootprintDesc:
      'Proyeksikan kotak tapak & ukuran P × L × T meter di bawah objek terpilih',
    gridVertSection: 'Grid Tinggi Dinding (Vertikal)',
    gridVertOff: 'Mati',
    gridVertBack: 'Dinding Belakang',
    gridVertCorner: 'Sudut Ruang 3D',
    gridPlotTitle: 'Batas Kavling / Ukuran Ruangan',
    gridPlotDesc:
      'Garis batas area bangun (mis. kamar 4×4m atau rumah 8×12m)',
    gridPlotPresetsLabel: 'Preset Ukuran Kavling / Ruang',
    gridPlotWidth: 'Lebar X (m)',
    gridPlotDepth: 'Panjang Z (m)',
    gridStyleSection: 'Gaya Visual Lantai',
    gridStyleWire: 'Garis Studio',
    gridStyleWireSub: 'Bersih & ringan',
    gridStyleTile: 'Ubin Keramik',
    gridStyleTileSub: 'Pola lantai interior',
    gridStyleBlueprint: 'Blueprint CAD',
    gridStyleBlueprintSub: 'Gambar kerja teknis',
    gridStyleTerrain: 'Kontur Tanah 3D',
    gridStyleTerrainSub: 'Bukit & terasering',
    terrainShapeSection: 'Bentuk Kontur Tanah',
    terrainHills: 'Bukit',
    terrainValley: 'Lembah',
    terrainTerraced: 'Terasering',
    terrainFlat: 'Datar',
    terrainHeightLabel: 'Tinggi Kontur',
    gridWorldSizeLabel: 'Luas Area Kanvas',
    gridElevationLabel: 'Elevasi Lantai Kerja',
    gridFitObjectBaseBtn: 'Pas ke Alas Objek',
    gridAxesOn: 'Sumbu X/Z Aktif',
    gridAxesOff: 'Sumbu X/Z Mati',
    gridOpacityLabel: 'Kejelasan Garis',

    quickCameraHeader: 'Sudut Kamera Cepat',
    camPerspective: 'Perspektif 3D',
    camFront: 'Tampak Depan (Z)',
    camSide: 'Tampak Samping (X)',
    camTop: 'Tampak Atas (Y)',
    exportFormatHeader: 'Format Ekspor 3D',
    exportGlbTitle: 'Ekspor .GLB',
    exportGlbSub: 'File biner tunggal (Blender, Godot, Unity)',
    exportGltfTitle: 'Ekspor .GLTF',
    exportGltfSub: 'Format JSON standar glTF 2.0',

    select: 'Pilih',
    move: 'Geser',
    rotate: 'Putar',
    scale: 'Skala',
    paint: 'Warna',
    worldAxis: 'Global',
    localAxis: 'Lokal',
    stickSurface: 'Tempel',
    copy: 'Salin',
    showLeftToolbar: 'Tampilkan Toolbar Kiri',
    hideLeftToolbar: 'Sembunyikan Toolbar Kiri',
    rotAxisHorizontal: 'Mendatar (Y)',
    rotAxisFront: 'Depan (X)',
    rotAxisSide: 'Samping (Z)',
    rotSnapLabel: 'Kunci:',
    rotSnapFree: 'Bebas',
    rotResetZero: 'Tegakkan 0°',

    basicShapes: 'Basic Shapes',
    housePresets: 'Preset Rumah',
    shapesHint: 'Ketuk untuk tambah • Tekan lama untuk info bentuk',
    presetsHint: 'Ketuk untuk pasang • Tekan lama untuk detail',
    searchShapes: 'Cari bentuk (kubus, tangga, lengkung, kusen)...',
    searchPresets: 'Cari properti...',
    noShapeMatch: 'Tidak ada bentuk yang cocok dengan pencarian',
    lastUsed: 'Terakhir dipakai',
    properties: 'Properti',
    catAll: 'Semua',
    catCustom: 'Asetku',

    objectList: 'Daftar Objek',
    objectStudio: 'Studio Objek',
    emptyOutlinerHint:
      'Belum ada objek. Buka Basic Shapes di bawah atau klik Impor 3D di atas.',
    emptyInspectorHint:
      'Ketuk salah satu objek 3D di kanvas untuk mengatur posisi, warna, dan pembagian bidangnya.',
    hideObject: 'Sembunyikan',
    showObject: 'Tampilkan',
    tabTransform: 'Transform',
    tabColor: 'Warna RGB',
    tabSubdiv: 'Subdiv',
    objectNamePlaceholder: 'Nama objek...',
    imported3DModelTag: 'Model 3D Impor',
    positionLabel: 'Posisi (Meter)',
    rotationLabel: 'Rotasi (Derajat °)',
    scaleLabel: 'Ukuran / Skala (Meter)',
    resetBtn: 'Reset',
    uniformScaleLock: 'Proporsional',
    uniformScaleFree: 'Bebas XYZ',
    groupAction: 'Gabung Grup',
    ungroupAction: 'Pisah Grup',
    editGroupParts: 'Edit per Bagian',
    editingSinglePart: 'Mode Bagian Aktif',
    saveToAssets: 'Simpan ke Asetku',
    savedToAssetsToast: 'Tersimpan di Koleksi Propertiku!',
    groupedToast: 'Objek digabung menjadi satu grup',
    ungroupedToast: 'Grup berhasil dipisah',

    subdivHeaderTitle: 'Pembagi Kotak & Bidang (Subdivide)',
    subdivHeaderDesc:
      'Bagi satu objek menjadi banyak kotak atau bidang permukaan yang lebih kecil secara presisi.',
    subdivCellsLabel: 'Bagian Kotak',
    subdivTrianglesLabel: 'Poligon',
    subdivVerticesLabel: 'Titik Sudut',
    subdivQuickPresets: 'Bagi Cepat Seragam',
    subdivResetOriginal: 'Reset Utuh (1×1×1)',
    subdivPerAxisTitle: 'Jumlah Pembagian per Sumbu (X × Y × Z)',
    subdivAxisX: 'Sumbu X (Lebar)',
    subdivAxisY: 'Sumbu Y (Tinggi)',
    subdivAxisZ: 'Sumbu Z (Dalam)',
    subdivShowLinesTitle: 'Tampilkan Garis Petak Bidang',
    subdivShowLinesDesc:
      'Garis pembatas kotak bersih di permukaan tanpa garis diagonal berantakan',
    subdivGrooveLabel: 'Celah Alur Panel / Nat Kotak',
    subdivGrooveFlat: 'Rapat',
    subdivSplitBlocksBtn: 'Pecah Jadi Kotak-Kotak Kecil Terpisah',
    subdivSplitBlocksHint:
      'Mengubah pembagian ini menjadi blok-blok kecil mandiri agar tiap kotak bisa dihapus, digeser, ditarik, atau diwarnai satu per satu.',
    subdivSplitToast: 'Berhasil dipecah menjadi kotak-kotak kecil!',
    subdivCapNotice:
      'Batas aman performa aktif agar kanvas tetap mulus 60 FPS.',

    paintClickBtn: 'Cat Klik Objek',
    paintClickActive: 'Cat Klik: AKTIF',
    eyedropperBtn: 'Pipet',
    eyedropperActive: 'Klik Objek...',
    paintNoSelectionHint:
      'Pilih objek terlebih dahulu atau aktifkan Cat Klik Objek untuk mewarnai langsung di kanvas.',
    saveSwatchBtn: 'Simpan',
    brightnessLabel: 'Kecerahan Warna',
    autoHarmoniesTitle: 'Harmoni Warna Otomatis',
    savedPaletteTitle: 'Palet Warna Tersimpan',
    archMaterialPresetsTitle: 'Preset Material Arsitektur',
    advancedPbrTitle: 'Permukaan & Material Lanjutan (PBR)',
    opacityGlassLabel: 'Opasitas / Transparansi (Kaca)',
    roughnessLabel: 'Kekasaran (Mengilap ↔ Doff)',
    metalnessLabel: 'Kesan Logam (Metalness)',
    emissiveLampLabel: 'Cahaya Pendar (Lampu)',
    shadingStyleLabel: 'Gaya Sudut Permukaan',
    shadingSmooth: 'Halus',
    shadingFlat: 'Tegas',

    helpModalTitle: 'Panduan Lengkap Perabot 3D Studio',
    helpCard1Title: '75 Basic Shapes & Impor 3D',
    helpCard1Item1:
      'Ketuk bentuk di Basic Shapes untuk menambahkan ke kanvas, atau tahan agak lama (~0.4 detik) untuk membaca fungsi bentuknya.',
    helpCard1Item2:
      'Gunakan tombol Impor 3D di bar atas untuk memuat satu atau banyak file .glb, .gltf, .obj, .stl, .ply, atau .fbx sekaligus ke dalam domain.',
    helpCard2Title: 'Warna Asli RGB & Subdivision Kotak',
    helpCard2Item1:
      'Roda Warna RGB langsung mengganti warna asli objek maupun model 3D impor (mis. kubus kuning diubah putih benar-benar menjadi putih bersih).',
    helpCard2Item2:
      'Di tab Subdiv, bagi 1 kotak menjadi banyak kotak/bidang kecil (X × Y × Z), lalu klik "Pecah Jadi Kotak Kecil" bila ingin mengedit atau melubangi per bagian.',
    helpCard3Title: 'Surface Alignment (Tempel Permukaan)',
    helpCard3Item1:
      'Aktifkan menu Surface (T) di bar atas agar objek otomatis menempel rata mengikuti kemiringan atap, dinding, kubah, atau kontur tanah.',
    helpCard3Item2:
      'Pilih sisi tempel (Alas -Y, Belakang -Z untuk jendela/pintu di dinding, atau Atas +Y) serta fitur Klik Target Permukaan.',
    helpCard4Title: 'Grid Arsitektur & Pengukur Pintar',
    helpCard4Item1:
      'Dilengkapi penggaris angka meter, bayangan ukuran P × L × T di bawah objek aktif, batas kavling (mis. 8×12m), dan grid tinggi dinding.',
    helpCard4Item2:
      'Penyimpanan otomatis pintar: hanya menyimpan secara tenang 5 detik setelah ada perubahan nyata tanpa mengganggu performa.',
    helpShortcutsTitle: 'Pintasan Keyboard Cepat',
    helpShortcutsLine:
      'G Geser • R Putar • S Skala • T Surface • C Warna RGB • F Fokus Kamera • Shift+D Salin • Del Hapus • Ctrl+Z/Y Undo/Redo',
    hudSurfaceAlign: 'TEMPEL PERMUKAAN',
    hudMove: 'GESER',
    hudRotate: 'PUTAR',
    hudScale: 'SKALA',
  },

  en: {
    heroBadge: '3D Architecture & Furniture Studio',
    heroTitle: 'Design 3D Spaces & Custom Models Effortlessly',
    heroSubtitle:
      'Build custom furniture and buildings from 75 precision shapes or import external 3D models right in your browser & touch screen.',
    continueLast: 'Continue Editing',
    lastEdited: 'Edited',
    modeModelingTitle: '3D Modeling',
    modeModelingDesc:
      'Start on a clean canvas with 75 crisp Basic Shapes to craft custom furniture, props, or architectural details.',
    modeModelingBtn: '+ New Project',
    modeHouseTitle: 'House Builder',
    modeHouseDesc:
      'Spacious architectural domain to design homes with Basic Shapes, Saved Assets, 3D Import (.glb & more), Peek Inside & Walkthrough.',
    modeHouseBtn: '+ Build a House',
    openProjectFile: 'Open File (.perabot)',
    globalSettings: 'Settings',
    tabMyProjects: 'My Projects',
    tabMyAssets: 'Saved Assets',
    emptyProjectsTitle: 'No saved projects yet',
    emptyProjectsDesc:
      'Start in 3D Modeling or House Builder above—your work smart-saves automatically with live 3D previews.',
    emptyAssetsTitle: 'No custom assets yet',
    emptyAssetsDesc:
      'Build a chair, table, or decor piece and tap "Save as Asset" to reuse it across any project!',
    objectsUnit: 'items',
    partsUnit: 'parts',
    rename: 'Rename',
    duplicate: 'Duplicate',
    exportBackup: 'Save .perabot File',
    delete: 'Delete',
    cancel: 'Cancel',
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
    unsavedChanges: 'Unsaved changes (click to save now)',
    savingNow: 'Saving...',
    undo: 'Undo (Ctrl+Z)',
    redo: 'Redo (Ctrl+Y)',
    snap: 'Snap',
    surface: 'Surface',
    grid: 'Grid',
    focusBtn: 'Focus',
    cameraViewsBtn: 'Views',
    peekInterior: 'Peek Inside',
    walkthrough: 'Walkthrough',
    exitWalkthrough: 'Exit Walk',
    walkHint:
      'Use left joystick to walk & drag screen to look around (WASD on desktop)',
    import3DBtn: 'Import 3D',
    import3DHint:
      'Import one or multiple 3D files (.glb, .gltf, .obj, .stl, .ply, .fbx) into domain',
    importing3DToast: 'Loading 3D files into domain...',
    import3DFailedToast:
      'Failed to load 3D file (use .glb, .gltf, .obj, .stl, .ply, or .fbx)',
    restoreOriginalMaterial: 'Restore Original Texture / Material',
    exportBtn: 'Export',
    clearScene: 'Clear Scene',
    clearSceneConfirm: 'Clear all objects in this canvas?',
    fullscreen: 'Fullscreen',
    toggleRightPanel: 'Toggle Inspector Sidebar',
    help: 'Guide',

    snapSystemTitle: 'Smart Snapping System',
    activeState: 'Active',
    inactiveState: 'Off',
    snapMagnetTitle: 'Block & Corner Magnet',
    snapMagnetDesc:
      'Snap faces, edges, and corners flush together when blocks get close',
    strengthSubtle: 'Subtle',
    strengthNormal: 'Normal',
    strengthStrong: 'Strong',
    snapAlignTitle: 'Laser Alignment Guides',
    snapAlignDesc:
      'Show alignment guide lines when centered or flush with distant objects',
    snapGridTitle: 'Grid Snap',
    snapGridDesc: 'Lock move and scale increments to the grid step size',

    surfaceSystemTitle: 'Surface Alignment & Terrain',
    surfaceOrientSection: 'Surface Orientation Mode',
    surfModeNormalTitle: 'Align to Surface Normal',
    surfModeNormalDesc:
      'Tilt flush against sloped roofs, walls, domes, ramps, and hills',
    surfModeUprightTitle: 'Stay Upright on Contour',
    surfModeUprightDesc:
      'Keep vertical posture while following ground or floor height beneath',
    surfModeFoundationTitle: 'Slope Foundation Seat',
    surfModeFoundationDesc:
      'Seat the lowest footprint corner into sloped terrain without floating',
    surfAttachFaceSection: 'Object Face to Attach',
    surfAttachAuto: 'Smart Auto',
    surfAttachBottom: 'Bottom (-Y)',
    surfAttachBack: 'Back (-Z)',
    surfAttachTop: 'Top (+Y)',
    surfAutoMoveTitle: 'Auto-Follow While Dragging',
    surfAutoMoveDesc:
      'Drag the object or XZ handles to glide smoothly across surfaces',
    surfClickPlaceTitle: '1-Tap Click Surface Target',
    surfClickPlaceDesc:
      'Tap any roof, wall, or hill face to place the selected object right there',
    surfSpinLabel: 'Spin on Surface',
    surfOffsetLabel: 'Surface Normal Offset',
    surfConformNowCta: 'Drop & Conform Selected Object Now',

    gridSystemTitle: 'Studio Grid & Architectural Guides',
    visibleState: 'Shown',
    hiddenState: 'Hidden',
    gridCellSizeSection: 'Precision Cell Spacing',
    gridSyncSnapBtn: 'Sync Snap',
    gridSmartGuidesSection: 'Measurement & Plot Guides',
    gridRulerTitle: 'Meter Coordinate Ruler (X / Z)',
    gridRulerDesc: 'Display 1m, 2m, 5m distance markers directly on the floor',
    gridFootprintTitle: 'Selected Object Footprint',
    gridFootprintDesc:
      'Project live W × D × H meter dimensions onto the floor beneath selection',
    gridVertSection: 'Vertical Height Grid (Walls)',
    gridVertOff: 'Off',
    gridVertBack: 'Back Wall',
    gridVertCorner: '3D Corner Box',
    gridPlotTitle: 'Plot / Room Boundary Frame',
    gridPlotDesc:
      'Show target room or land boundary rectangle (e.g. 4×4m room or 8×12m plot)',
    gridPlotPresetsLabel: 'Quick Plot / Room Sizes',
    gridPlotWidth: 'Width X (m)',
    gridPlotDepth: 'Depth Z (m)',
    gridStyleSection: 'Floor Visual Style',
    gridStyleWire: 'Studio Wire',
    gridStyleWireSub: 'Clean & minimal',
    gridStyleTile: 'Ceramic Tile',
    gridStyleTileSub: 'Architectural tiles',
    gridStyleBlueprint: 'CAD Blueprint',
    gridStyleBlueprintSub: 'Technical drafting',
    gridStyleTerrain: '3D Terrain',
    gridStyleTerrainSub: 'Hills & terraces',
    terrainShapeSection: '3D Terrain Landform',
    terrainHills: 'Hills',
    terrainValley: 'Valley',
    terrainTerraced: 'Terraced',
    terrainFlat: 'Flat',
    terrainHeightLabel: 'Contour Height',
    gridWorldSizeLabel: 'Canvas World Size',
    gridElevationLabel: 'Workplane Floor Elevation',
    gridFitObjectBaseBtn: 'Match Object Base',
    gridAxesOn: 'X/Z Axes ON',
    gridAxesOff: 'X/Z Axes OFF',
    gridOpacityLabel: 'Line Opacity',

    quickCameraHeader: 'Quick Camera Angles',
    camPerspective: '3D Perspective',
    camFront: 'Front View (Z)',
    camSide: 'Side View (X)',
    camTop: 'Top View (Y)',
    exportFormatHeader: '3D Export Format',
    exportGlbTitle: 'Export .GLB',
    exportGlbSub: 'Single binary file (Blender, Godot, Unity)',
    exportGltfTitle: 'Export .GLTF',
    exportGltfSub: 'Standard glTF 2.0 JSON format',

    select: 'Select',
    move: 'Move',
    rotate: 'Rotate',
    scale: 'Scale',
    paint: 'Color',
    worldAxis: 'World',
    localAxis: 'Local',
    stickSurface: 'Conform',
    copy: 'Clone',
    showLeftToolbar: 'Show Left Toolbar',
    hideLeftToolbar: 'Hide Left Toolbar',
    rotAxisHorizontal: 'Horizontal (Y)',
    rotAxisFront: 'Tilt Front (X)',
    rotAxisSide: 'Tilt Side (Z)',
    rotSnapLabel: 'Snap:',
    rotSnapFree: 'Free',
    rotResetZero: 'Reset 0°',

    basicShapes: 'Basic Shapes',
    housePresets: 'House Presets',
    shapesHint: 'Tap to add • Hold for shape details',
    presetsHint: 'Tap to place • Hold for details',
    searchShapes: 'Search shapes (cube, stair, arch, frame)...',
    searchPresets: 'Search assets...',
    noShapeMatch: 'No shapes match your search',
    lastUsed: 'Recent',
    properties: 'Inspector',
    catAll: 'All',
    catCustom: 'My Assets',

    objectList: 'Scene Objects',
    objectStudio: 'Object Studio',
    emptyOutlinerHint:
      'No objects yet. Open Basic Shapes below or click Import 3D in the top bar.',
    emptyInspectorHint:
      'Tap any 3D object on the canvas to edit its transform, color, or surface subdivisions.',
    hideObject: 'Hide',
    showObject: 'Show',
    tabTransform: 'Transform',
    tabColor: 'RGB Color',
    tabSubdiv: 'Subdivide',
    objectNamePlaceholder: 'Object name...',
    imported3DModelTag: 'Imported 3D Model',
    positionLabel: 'Position (Meters)',
    rotationLabel: 'Rotation (Degrees °)',
    scaleLabel: 'Size / Scale (Meters)',
    resetBtn: 'Reset',
    uniformScaleLock: 'Uniform',
    uniformScaleFree: 'Free XYZ',
    groupAction: 'Group All',
    ungroupAction: 'Ungroup',
    editGroupParts: 'Edit Single Part',
    editingSinglePart: 'Part Edit ON',
    saveToAssets: 'Save as Asset',
    savedToAssetsToast: 'Saved to your Custom Assets!',
    groupedToast: 'Grouped into a single unit',
    ungroupedToast: 'Group separated',

    subdivHeaderTitle: 'Box & Surface Subdivision',
    subdivHeaderDesc:
      'Divide a single block or surface into multiple smaller boxes or grid panels cleanly.',
    subdivCellsLabel: 'Sub-Boxes',
    subdivTrianglesLabel: 'Polygons',
    subdivVerticesLabel: 'Vertices',
    subdivQuickPresets: 'Quick Uniform Cuts',
    subdivResetOriginal: 'Reset Whole (1×1×1)',
    subdivPerAxisTitle: 'Divisions per Axis (X × Y × Z)',
    subdivAxisX: 'X Axis (Width)',
    subdivAxisY: 'Y Axis (Height)',
    subdivAxisZ: 'Z Axis (Depth)',
    subdivShowLinesTitle: 'Show Quad Partition Lines',
    subdivShowLinesDesc:
      'Clean grid cell borders on the surface with zero messy triangle diagonals',
    subdivGrooveLabel: 'Panel Seam / Tile Groove',
    subdivGrooveFlat: 'Flush',
    subdivSplitBlocksBtn: 'Split into Separate Editable Sub-Blocks',
    subdivSplitBlocksHint:
      'Converts these divisions into independent smaller 3D blocks so you can delete, move, extrude, or paint individual pieces.',
    subdivSplitToast: 'Split into editable sub-blocks!',
    subdivCapNotice:
      'Performance safety cap active to keep viewport smooth at 60 FPS.',

    paintClickBtn: 'Click-to-Paint',
    paintClickActive: 'Paint Mode: ON',
    eyedropperBtn: 'Eyedropper',
    eyedropperActive: 'Pick Object...',
    paintNoSelectionHint:
      'Select an object first or enable Click-to-Paint to color objects directly in the viewport.',
    saveSwatchBtn: 'Save',
    brightnessLabel: 'Brightness (Value)',
    autoHarmoniesTitle: 'Color Harmonies',
    savedPaletteTitle: 'Saved Swatches',
    archMaterialPresetsTitle: 'Architectural Materials',
    advancedPbrTitle: 'Surface & PBR Material',
    opacityGlassLabel: 'Opacity / Glass Transparency',
    roughnessLabel: 'Roughness (Glossy ↔ Matte)',
    metalnessLabel: 'Metalness',
    emissiveLampLabel: 'Emissive Light Glow',
    shadingStyleLabel: 'Surface Shading',
    shadingSmooth: 'Smooth',
    shadingFlat: 'Flat Facets',

    helpModalTitle: 'Perabot 3D Studio Complete Guide',
    helpCard1Title: '75 Basic Shapes & 3D Import',
    helpCard1Item1:
      'Tap any shape in Basic Shapes to spawn it, or press-and-hold (~0.4s) to inspect its architectural description.',
    helpCard1Item2:
      'Use Import 3D in the top bar to load one or multiple .glb, .gltf, .obj, .stl, .ply, or .fbx files right into the active domain.',
    helpCard2Title: 'True RGB Color & Box Subdivision',
    helpCard2Item1:
      'The RGB Color Wheel replaces actual surface colors directly—even on textured imported .glb models (e.g. painting a yellow cube white makes it pure white).',
    helpCard2Item2:
      'In the Subdivide tab, slice 1 box into smaller panels/boxes (X × Y × Z), and click "Split into Sub-Blocks" to edit, carve holes, or paint individual pieces.',
    helpCard3Title: 'Surface Alignment (Top Bar)',
    helpCard3Item1:
      'Enable Surface (T) in the top bar so objects automatically align flush against sloped roofs, walls, domes, and terrain.',
    helpCard3Item2:
      'Choose which face attaches (Bottom -Y, Back -Z for wall windows/doors, or Top +Y) or use 1-Tap Click Surface Target.',
    helpCard4Title: 'Architectural Grid & Smart Auto-Save',
    helpCard4Item1:
      'Features live meter rulers, selected object W × D × H floor footprints, room/plot boundary frames, and vertical wall height grids.',
    helpCard4Item2:
      'Smart Auto-Save quietly saves 5 seconds after real edits finish—never interrupting while you drag or orbit.',
    helpShortcutsTitle: 'Keyboard Shortcuts',
    helpShortcutsLine:
      'G Move • R Rotate • S Scale • T Surface • C RGB Color • F Focus • Shift+D Clone • Del Delete • Ctrl+Z/Y Undo/Redo',
    hudSurfaceAlign: 'SURFACE ALIGN',
    hudMove: 'MOVE',
    hudRotate: 'ROTATE',
    hudScale: 'SCALE',
  },

  ja: {
    heroBadge: '3D建築＆インテリア制作スタジオ',
    heroTitle: '部屋づくりも3Dモデリングも、直感操作で',
    heroSubtitle:
      '75種類の精密シェイプでの家具・建築づくりも、外部3Dモデルの読み込み配置もブラウザ＆タッチ画面で快適に。',
    continueLast: '前回の続きから',
    lastEdited: '最終更新',
    modeModelingTitle: 'モデリング',
    modeModelingDesc:
      '空のキャンバスからスタート。75種類の基本シェイプを組み合わせてオリジナルの家具や小物を制作します。',
    modeModelingBtn: '+ 新規作成',
    modeHouseTitle: 'ハウス作成',
    modeHouseDesc:
      '広々とした建築ドメインで、基本シェイプ・マイアセット・3D読込(.glb等)・室内表示・ウォークスルーを使って家を設計します。',
    modeHouseBtn: '+ 家をつくる',
    openProjectFile: 'ファイルを開く (.perabot)',
    globalSettings: '設定',
    tabMyProjects: 'マイプロジェクト',
    tabMyAssets: 'マイアセット',
    emptyProjectsTitle: '保存されたプロジェクトはありません',
    emptyProjectsDesc:
      '上の「モデリング」または「ハウス作成」から始めると、変更時に自動でスマート保存されます。',
    emptyAssetsTitle: '登録アセットはまだありません',
    emptyAssetsDesc:
      '家具やパーツを作って「アセット登録」すると、他のプロジェクトでもいつでも呼び出せます！',
    objectsUnit: '個',
    partsUnit: 'パーツ',
    rename: '名前変更',
    duplicate: '複製',
    exportBackup: '.perabot保存',
    delete: '削除',
    cancel: 'キャンセル',
    stageDragHint: 'ドラッグで3Dステージを回転',
    moodMorning: '朝',
    moodSunset: '夕方',
    moodNight: '夜',

    settingsTitle: 'スタジオ設定',
    settingsSubtitle: '表示言語・カラーテーマ・カメラ操作をお好みに調整',
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
    savedAuto: '保存済み',
    unsavedChanges: '未保存の変更（クリックで今すぐ保存）',
    savingNow: '保存中...',
    undo: '元に戻す (Ctrl+Z)',
    redo: 'やり直す (Ctrl+Y)',
    snap: 'スナップ',
    surface: '面吸着',
    grid: 'グリッド',
    focusBtn: 'フォーカス',
    cameraViewsBtn: '視点',
    peekInterior: '室内表示',
    walkthrough: 'ウォークスルー',
    exitWalkthrough: '通常視点に戻る',
    walkHint:
      '左スティックで移動・画面ドラッグで見回す（PCはWASDキー対応）',
    import3DBtn: '3D読込',
    import3DHint:
      '1つまたは複数の3Dファイル (.glb, .gltf, .obj, .stl, .ply, .fbx) をドメインに配置',
    importing3DToast: '3Dファイルを読み込み中...',
    import3DFailedToast:
      '読み込み失敗（.glb, .gltf, .obj, .stl, .ply, .fbx に対応）',
    restoreOriginalMaterial: '元のテクスチャ・マテリアルに戻す',
    exportBtn: '書き出し',
    clearScene: '全消去',
    clearSceneConfirm: 'キャンバス上の全オブジェクトを消去しますか？',
    fullscreen: '全画面表示',
    toggleRightPanel: '右パネルを開閉',
    help: 'ガイド',

    snapSystemTitle: 'スマートスナップ設定',
    activeState: 'ON',
    inactiveState: 'OFF',
    snapMagnetTitle: 'ブロック＆角マグネット',
    snapMagnetDesc: '近づけたブロックの面・辺・角をピタッと吸着させます',
    strengthSubtle: '弱め',
    strengthNormal: '標準',
    strengthStrong: '強め',
    snapAlignTitle: '整列レーザーガイド',
    snapAlignDesc: '離れたオブジェクトとの中心・端の揃いをライン表示',
    snapGridTitle: 'グリッドスナップ',
    snapGridDesc: '移動・サイズ変更の単位をグリッド幅に固定します',

    surfaceSystemTitle: '面吸着（サーフェス整列）＆地形',
    surfaceOrientSection: '面の向きモード',
    surfModeNormalTitle: '面の傾きに合わせる（法線整列）',
    surfModeNormalDesc: '斜めの屋根・壁・ドーム・斜面にピタッと沿わせます',
    surfModeUprightTitle: '垂直を保って高さ追従',
    surfModeUprightDesc: 'まっすぐ立ったまま地面や床の高さに合わせます',
    surfModeFoundationTitle: '斜面への基礎接地（浮き防止）',
    surfModeFoundationDesc: '傾斜地で建物の底が浮かないよう最も低い角を接地',
    surfAttachFaceSection: '接地させる面',
    surfAttachAuto: '自動判定',
    surfAttachBottom: '底面 (-Y)',
    surfAttachBack: '背面 (-Z)',
    surfAttachTop: '上面 (+Y)',
    surfAutoMoveTitle: 'ドラッグ中に自動追従',
    surfAutoMoveDesc: '移動ハンドル操作中に下の面に沿ってスライドします',
    surfClickPlaceTitle: 'クリック先へ1タップ配置',
    surfClickPlaceDesc: '屋根や壁をタップすると選択中オブジェクトをそこへ配置',
    surfSpinLabel: '面上の回転角度',
    surfOffsetLabel: '面からのオフセット距離',
    surfConformNowCta: '選択オブジェクトを今すぐ下の面へ接地',

    gridSystemTitle: 'スタジオグリッド＆建築メジャー',
    visibleState: '表示',
    hiddenState: '非表示',
    gridCellSizeSection: 'マス目の間隔（精度）',
    gridSyncSnapBtn: 'スナップ連動',
    gridSmartGuidesSection: '寸法ルーラー＆敷地ガイド',
    gridRulerTitle: 'メートル目盛り表示 (X / Z)',
    gridRulerDesc: '1m・2m・5mの距離ラベルを床面に見やすく表示',
    gridFootprintTitle: '選択オブジェクトの床面寸法ガイド',
    gridFootprintDesc: '選択中の真下に投影枠と 幅×奥行×高さ(m) をリアルタイム表示',
    gridVertSection: '壁面・高さグリッド（垂直）',
    gridVertOff: 'なし',
    gridVertBack: '背面ウォール',
    gridVertCorner: '3Dコーナー枠',
    gridPlotTitle: '敷地・部屋サイズ枠ガイド',
    gridPlotDesc: '部屋や敷地の目安枠を表示（例：4×4mの部屋、8×12mの敷地）',
    gridPlotPresetsLabel: '敷地・部屋サイズプリセット',
    gridPlotWidth: '幅 X (m)',
    gridPlotDepth: '奥行 Z (m)',
    gridStyleSection: 'フロア表示スタイル',
    gridStyleWire: 'スタジオ線',
    gridStyleWireSub: 'シンプル＆軽量',
    gridStyleTile: 'タイル床',
    gridStyleTileSub: '建築フロア調',
    gridStyleBlueprint: '設計図ブルー',
    gridStyleBlueprintSub: 'CAD図面風',
    gridStyleTerrain: '3D地形',
    gridStyleTerrainSub: '丘・段々地形',
    terrainShapeSection: '3D地形の形状',
    terrainHills: '丘陵',
    terrainValley: '盆地',
    terrainTerraced: '段々畑・雛壇',
    terrainFlat: '平坦',
    terrainHeightLabel: '起伏の高さ',
    gridWorldSizeLabel: 'キャンバスの広さ',
    gridElevationLabel: '作業フロアの高さ',
    gridFitObjectBaseBtn: '選択物の底面に合わせる',
    gridAxesOn: 'X/Z軸 ON',
    gridAxesOff: 'X/Z軸 OFF',
    gridOpacityLabel: 'ラインの濃さ',

    quickCameraHeader: 'クイック視点切替',
    camPerspective: '3Dパース視点',
    camFront: '正面図 (Z)',
    camSide: '側面図 (X)',
    camTop: '上面図 (Y)',
    exportFormatHeader: '3D書き出し形式',
    exportGlbTitle: '.GLB 書き出し',
    exportGlbSub: '単一バイナリ（Blender・Unity・Godot向け）',
    exportGltfTitle: '.GLTF 書き出し',
    exportGltfSub: '標準 glTF 2.0 JSON形式',

    select: '選択',
    move: '移動',
    rotate: '回転',
    scale: 'サイズ',
    paint: 'カラー',
    worldAxis: 'ワールド',
    localAxis: 'ローカル',
    stickSurface: '接地',
    copy: '複製',
    showLeftToolbar: '左ツールバーを表示',
    hideLeftToolbar: '左ツールバーを隠す',
    rotAxisHorizontal: '水平回転 (Y)',
    rotAxisFront: '前後傾き (X)',
    rotAxisSide: '左右傾き (Z)',
    rotSnapLabel: '角度固定:',
    rotSnapFree: '自由',
    rotResetZero: '水平0°に戻す',

    basicShapes: '基本シェイプ',
    housePresets: 'ハウス素材',
    shapesHint: 'タップで配置・長押しでパーツ解説',
    presetsHint: 'タップで配置・長押しで詳細',
    searchShapes: 'シェイプを検索 (cube, 階段, アーチ, 窓)...',
    searchPresets: 'アセットを検索...',
    noShapeMatch: '一致するシェイプが見つかりません',
    lastUsed: '履歴',
    properties: 'プロパティ',
    catAll: 'すべて',
    catCustom: 'マイアセット',

    objectList: 'オブジェクト一覧',
    objectStudio: '編集スタジオ',
    emptyOutlinerHint:
      'まだオブジェクトがありません。下の「基本シェイプ」または上の「3D読込」から配置しましょう。',
    emptyInspectorHint:
      'キャンバス上の3Dオブジェクトをタップすると、位置・色・面分割を編集できます。',
    hideObject: '非表示にする',
    showObject: '表示する',
    tabTransform: '変形',
    tabColor: 'RGBカラー',
    tabSubdiv: '面・箱分割',
    objectNamePlaceholder: 'オブジェクト名...',
    imported3DModelTag: '読み込み3Dモデル',
    positionLabel: '位置 (m)',
    rotationLabel: '回転角度 (°)',
    scaleLabel: 'サイズ・スケール (m)',
    resetBtn: 'リセット',
    uniformScaleLock: '比率固定',
    uniformScaleFree: 'XYZ個別',
    groupAction: 'グループ化',
    ungroupAction: 'グループ解除',
    editGroupParts: 'パーツ個別編集',
    editingSinglePart: '個別編集中',
    saveToAssets: 'アセット登録',
    savedToAssetsToast: 'マイアセットに保存しました！',
    groupedToast: 'グループにまとめました',
    ungroupedToast: 'グループを解除しました',

    subdivHeaderTitle: 'ボックス＆サーフェス分割 (Subdivide)',
    subdivHeaderDesc:
      '1つの箱や面を複数の小さな四角・グリッド面へきれいに分割します。',
    subdivCellsLabel: '分割セル数',
    subdivTrianglesLabel: 'ポリゴン数',
    subdivVerticesLabel: '頂点数',
    subdivQuickPresets: '均等クイック分割',
    subdivResetOriginal: '分割なしに戻す (1×1×1)',
    subdivPerAxisTitle: '軸ごとの分割数 (X × Y × Z)',
    subdivAxisX: 'X軸（横幅）',
    subdivAxisY: 'Y軸（高さ）',
    subdivAxisZ: 'Z軸（奥行）',
    subdivShowLinesTitle: '四角グリッド分割線を表示',
    subdivShowLinesDesc:
      '斜め線のないスッキリした四角形の分割ラインを表面に表示します',
    subdivGrooveLabel: 'パネル溝・タイル目地の深さ',
    subdivGrooveFlat: 'フラット',
    subdivSplitBlocksBtn: '個別の小ブロックに分離する（個別編集）',
    subdivSplitBlocksHint:
      '分割マスごとに独立した小ブロックへ変換し、1マスだけ削除して窓を空けたり、押し出し・個別色塗りが可能になります。',
    subdivSplitToast: '個別の小ブロックに分離しました！',
    subdivCapNotice:
      '60FPSの快適動作を保つため安全上限が適用されています。',

    paintClickBtn: 'タップ塗り',
    paintClickActive: 'タップ塗り: ON',
    eyedropperBtn: 'スポイト',
    eyedropperActive: '対象をタップ...',
    paintNoSelectionHint:
      'オブジェクトを選択するか、「タップ塗り」をONにして直接色をつけられます。',
    saveSwatchBtn: '保存',
    brightnessLabel: '明るさ (明度)',
    autoHarmoniesTitle: '自動カラーハーモニー',
    savedPaletteTitle: '保存済みパレット',
    archMaterialPresetsTitle: '建築マテリアルプリセット',
    advancedPbrTitle: '質感・PBR詳細設定',
    opacityGlassLabel: '不透明度（ガラス表現）',
    roughnessLabel: '粗さ（光沢 ↔ マット）',
    metalnessLabel: '金属感 (Metalness)',
    emissiveLampLabel: '発光（ライト表現）',
    shadingStyleLabel: 'シェーディング表示',
    shadingSmooth: 'スムーズ',
    shadingFlat: 'フラット',

    helpModalTitle: 'Perabot 3D Studio 使い方ガイド',
    helpCard1Title: '75種類の基本シェイプ＆3D読み込み',
    helpCard1Item1:
      '「基本シェイプ」をタップして配置、長押し（約0.4秒）で詳しい用途カードを表示できます。',
    helpCard1Item2:
      '上部バーの「3D読込」から .glb / .gltf / .obj / .stl / .ply / .fbx ファイルを複数まとめてドメイン内に配置できます。',
    helpCard2Title: 'ダイレクトRGB色変更＆ボックス分割',
    helpCard2Item1:
      'RGBカラーホイールはテクスチャ付き読込モデルでも実際の表面色をダイレクトに置き換えます（黄色い箱を白にすると純白になります）。',
    helpCard2Item2:
      '「面・箱分割」タブでは1つの箱を細かいマス目（X×Y×Z）に割り、「個別の小ブロックに分離」で1マスずつの穴あけや色塗りができます。',
    helpCard3Title: '面吸着（サーフェス整列）機能',
    helpCard3Item1:
      '上部バーの「面吸着 (T)」をONにすると、斜めの屋根・壁・ドーム・地形の角度に合わせてピタッと配置できます。',
    helpCard3Item2:
      '接地させる面（底面 -Y、壁用の背面 -Z、上面 +Y）の切替や、1タップ配置モードも搭載しています。',
    helpCard4Title: '建築グリッド＆スマート自動保存',
    helpCard4Item1:
      'メートル目盛り、選択オブジェクトの床面サイズ投影、部屋・敷地枠ガイド、壁の高さグリッドを備えています。',
    helpCard4Item2:
      'スマート自動保存：操作中は邪魔せず、変更後5秒間落ち着いたタイミングで静かに保存します。',
    helpShortcutsTitle: 'キーボードショートカット',
    helpShortcutsLine:
      'G 移動 • R 回転 • S サイズ • T 面吸着 • C カラー • F フォーカス • Shift+D 複製 • Del 削除 • Ctrl+Z/Y 戻す/進む',
    hudSurfaceAlign: '面吸着移動',
    hudMove: '移動',
    hudRotate: '回転',
    hudScale: 'サイズ',
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
