import {
  AppLanguage,
  ArchDetectedRoom,
  ArchHouseData,
  BriefTemplateId,
  BuildingFloorLayer,
  ProjectBriefData,
  ProjectRequirementItem,
  RequirementStatus,
  RoomSemanticType,
  SceneObjectData,
} from '../../types/studio';
import {
  computeActiveBuildingFloorCount,
  SitePlacementMetrics,
} from './geometryMetrics';

export const ROOM_TYPE_LABELS: Record<
  RoomSemanticType,
  Record<AppLanguage, string>
> = {
  living: {
    id: 'R. Keluarga / Tamu',
    en: 'Living Room',
    ja: 'リビング・居間',
  },
  bedroom: {
    id: 'Kamar Tidur',
    en: 'Bedroom',
    ja: '寝室',
  },
  bathroom: {
    id: 'Kamar Mandi',
    en: 'Bathroom',
    ja: '浴室・トイレ',
  },
  kitchen: {
    id: 'Dapur',
    en: 'Kitchen',
    ja: 'キッチン',
  },
  dining: {
    id: 'Ruang Makan',
    en: 'Dining Room',
    ja: 'ダイニング',
  },
  study: {
    id: 'Ruang Kerja',
    en: 'Study / Office',
    ja: '書斎・ワークスペース',
  },
  garage: {
    id: 'Garasi / Carport',
    en: 'Garage / Carport',
    ja: 'ガレージ・車庫',
  },
  terrace: {
    id: 'Teras / Balkon',
    en: 'Terrace / Balcony',
    ja: 'テラス・バルコニー',
  },
  storage: {
    id: 'Gudang / Utilitas',
    en: 'Storage / Utility',
    ja: '収納・ユーティリティ',
  },
  other: {
    id: 'Ruang Lainnya',
    en: 'Other Room',
    ja: 'その他の部屋',
  },
  unassigned: {
    id: 'Belum Dikategorikan',
    en: 'Unassigned Type',
    ja: '部屋種別未設定',
  },
};

/**
 * Editable Project Brief Starter Templates (Non-gamified architectural planning guides).
 * Never spawns preset 3D geometry or interior furniture!
 */
export function buildProjectBriefFromTemplate(
  templateId: BriefTemplateId,
  lang: AppLanguage
): ProjectBriefData {
  const uid = () =>
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  if (templateId === 'single-storey') {
    return {
      id: `brief_${Date.now().toString(36)}`,
      projectType:
        lang === 'ja'
          ? 'コンパクト平屋住宅'
          : lang === 'en'
          ? 'Small Single-Storey House'
          : 'Rumah Tapak 1 Lantai Kompak',
      description:
        lang === 'ja'
          ? '小家族・夫婦向けの機能的な1階建て住宅プログラム。'
          : lang === 'en'
          ? 'Efficient single-level layout with 2 bedrooms, living area, kitchen, and bathroom.'
          : 'Program ruang hunian 1 lantai efisien dengan 2 kamar tidur, ruang keluarga, dapur, dan kamar mandi.',
      preferredStyle:
        lang === 'ja' ? 'トロピカル・コンテンポラリー' : lang === 'en' ? 'Tropical Contemporary' : 'Tropis Kontemporer',
      freeformNotes: '',
      requirements: [
        {
          id: uid(),
          kind: 'target',
          metric: 'floor-count',
          label: lang === 'ja' ? '階数ターゲット' : lang === 'en' ? 'Target Stories' : 'Target Jumlah Lantai',
          minVal: 1,
          maxVal: 1,
          priority: 'normal',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'target',
          metric: 'total-floor-area',
          label: lang === 'ja' ? '延床面積レンジ' : lang === 'en' ? 'Total Floor Area Range' : 'Rentang Luas Lantai Total',
          minVal: 45,
          maxVal: 95,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.bedroom[lang],
          roomType: 'bedroom',
          targetCount: 2,
          minVal: 9,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.bathroom[lang],
          roomType: 'bathroom',
          targetCount: 1,
          minVal: 3,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.living[lang],
          roomType: 'living',
          targetCount: 1,
          minVal: 12,
          priority: 'normal',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'target',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.kitchen[lang],
          roomType: 'kitchen',
          targetCount: 1,
          minVal: 5,
          priority: 'normal',
          enabled: true,
        },
      ],
      targetBudget: {
        enabled: true,
        amount: 220_000_000,
        currency: 'IDR',
        scope: 'materials',
      },
    };
  }

  if (templateId === 'two-storey-family') {
    return {
      id: `brief_${Date.now().toString(36)}`,
      projectType:
        lang === 'ja'
          ? '2階建てファミリー住宅'
          : lang === 'en'
          ? 'Two-Storey Family Home'
          : 'Rumah Keluarga 2 Lantai',
      description:
        lang === 'ja'
          ? 'パブリック空間を1階、プライベート寝室群を2階に配置する家族向け住宅。'
          : lang === 'en'
          ? 'Spacious two-storey family layout separating ground-floor social spaces and upper bedrooms.'
          : 'Hunian keluarga 2 lantai dengan pemisahan zona publik di lantai dasar dan kamar privat di lantai atas.',
      preferredStyle:
        lang === 'ja' ? 'モダン・ファミリー' : lang === 'en' ? 'Modern Warm Family' : 'Modern Hangat Keluarga',
      freeformNotes: '',
      requirements: [
        {
          id: uid(),
          kind: 'target',
          metric: 'floor-count',
          label: lang === 'ja' ? '階数ターゲット' : lang === 'en' ? 'Target Stories' : 'Target Jumlah Lantai',
          minVal: 2,
          maxVal: 2,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'target',
          metric: 'total-floor-area',
          label: lang === 'ja' ? '延床面積レンジ' : lang === 'en' ? 'Total Floor Area Range' : 'Rentang Luas Bangunan',
          minVal: 110,
          maxVal: 220,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.bedroom[lang],
          roomType: 'bedroom',
          targetCount: 3,
          minVal: 10,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.bathroom[lang],
          roomType: 'bathroom',
          targetCount: 2,
          minVal: 3.5,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.living[lang],
          roomType: 'living',
          targetCount: 1,
          minVal: 16,
          priority: 'normal',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'target',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.kitchen[lang],
          roomType: 'kitchen',
          targetCount: 1,
          minVal: 7,
          priority: 'normal',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'preference',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.study[lang],
          roomType: 'study',
          targetCount: 1,
          minVal: 6,
          priority: 'low',
          enabled: true,
        },
      ],
      targetBudget: {
        enabled: true,
        amount: 550_000_000,
        currency: 'IDR',
        scope: 'materials',
      },
    };
  }

  if (templateId === 'modern-minimalist') {
    return {
      id: `brief_${Date.now().toString(36)}`,
      projectType:
        lang === 'ja'
          ? 'モダン・ミニマリスト住宅'
          : lang === 'en'
          ? 'Modern Minimalist Residence'
          : 'Hunian Minimalis Modern',
      description:
        lang === 'ja'
          ? 'オープンリビングと屋外テラスをつなぐクリーンな幾何学構成。'
          : lang === 'en'
          ? 'Clean orthogonal geometry featuring open-plan living, study nook, and outdoor terrace.'
          : ' Tata ruang geometris bersih dengan area keluarga terbuka, ruang kerja, dan teras.',
      preferredStyle:
        lang === 'ja' ? 'ミニマリスト・モノトーン' : lang === 'en' ? 'Architectural Minimalist' : 'Minimalis Arsitektural',
      freeformNotes: '',
      requirements: [
        {
          id: uid(),
          kind: 'target',
          metric: 'total-floor-area',
          label: lang === 'ja' ? '延床面積レンジ' : lang === 'en' ? 'Total Floor Area Range' : 'Rentang Luas Lantai Total',
          minVal: 70,
          maxVal: 150,
          priority: 'normal',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.living[lang],
          roomType: 'living',
          targetCount: 1,
          minVal: 18,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.bedroom[lang],
          roomType: 'bedroom',
          targetCount: 2,
          minVal: 10,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'preference',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.terrace[lang],
          roomType: 'terrace',
          targetCount: 1,
          minVal: 6,
          priority: 'low',
          enabled: true,
        },
      ],
      targetBudget: {
        enabled: true,
        amount: 340_000_000,
        currency: 'IDR',
        scope: 'materials',
      },
    };
  }

  if (templateId === 'home-with-garage') {
    return {
      id: `brief_${Date.now().toString(36)}`,
      projectType:
        lang === 'ja'
          ? 'ビルトインガレージ付き住宅'
          : lang === 'en'
          ? 'Home with Integrated Garage'
          : 'Rumah dengan Garasi Terpadu',
      description:
        lang === 'ja'
          ? '車両スペースと十分な前庭セットバックを備えた都市型住宅。'
          : lang === 'en'
          ? 'Suburban/urban residence accommodating dedicated vehicle garage and driveway access.'
          : 'Hunian dengan ruang garasi kendaraan terintegrasi serta akses jalur masuk tapak.',
      preferredStyle:
        lang === 'ja' ? 'アーバン・コンテンポラリー' : lang === 'en' ? 'Urban Contemporary' : 'Kontemporer Urban',
      freeformNotes: '',
      requirements: [
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.garage[lang],
          roomType: 'garage',
          targetCount: 1,
          minVal: 15,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.bedroom[lang],
          roomType: 'bedroom',
          targetCount: 2,
          minVal: 9,
          priority: 'high',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'required',
          metric: 'room-count',
          label: ROOM_TYPE_LABELS.bathroom[lang],
          roomType: 'bathroom',
          targetCount: 1,
          minVal: 3,
          priority: 'normal',
          enabled: true,
        },
        {
          id: uid(),
          kind: 'target',
          metric: 'site-min-area',
          label: lang === 'ja' ? '推奨敷地面積' : lang === 'en' ? 'Recommended Site Area' : 'Target Luas Lahan Tapak',
          minVal: 120,
          priority: 'normal',
          enabled: true,
        },
      ],
      targetBudget: {
        enabled: true,
        amount: 390_000_000,
        currency: 'IDR',
        scope: 'materials',
      },
    };
  }

  return {
    id: `brief_${Date.now().toString(36)}`,
    projectType: '',
    description: '',
    preferredStyle: '',
    freeformNotes: '',
    requirements: [],
    targetBudget: {
      enabled: false,
      amount: 350_000_000,
      currency: 'IDR',
      scope: 'materials',
    },
  };
}

export interface EvaluatedRequirementResult {
  item: ProjectRequirementItem;
  status: RequirementStatus;
  actualSummary: string;
  targetSummary: string;
  matchedRoomIds: string[];
  undersizedRoomIds: string[];
}

export interface ProjectBriefEvaluation {
  hasActiveBrief: boolean;
  results: EvaluatedRequirementResult[];
  metCount: number;
  unmetCount: number;
  reviewCount: number;
  totalApplicableCount: number;
  totalFloorAreaSqm: number;
  occupiedStories: number;
  roomsByType: Record<RoomSemanticType, ArchDetectedRoom[]>;
  unassignedRooms: ArchDetectedRoom[];
}

/**
 * Evaluates the user's Project Brief deterministically against live building state.
 * Advisory only — never blocks building or imposes gamified scores!
 */
export function evaluateProjectBrief(params: {
  brief: ProjectBriefData | undefined;
  archData: ArchHouseData;
  floors: BuildingFloorLayer[];
  detectedRooms: ArchDetectedRoom[];
  objects: SceneObjectData[];
  siteMetrics: SitePlacementMetrics;
  lang: AppLanguage;
}): ProjectBriefEvaluation {
  const { brief, archData, floors, detectedRooms, objects, siteMetrics, lang } =
    params;

  const roomsByType: Record<RoomSemanticType, ArchDetectedRoom[]> = {
    living: [],
    bedroom: [],
    bathroom: [],
    kitchen: [],
    dining: [],
    study: [],
    garage: [],
    terrace: [],
    storage: [],
    other: [],
    unassigned: [],
  };

  let totalFloorAreaSqm = 0;
  for (const r of detectedRooms) {
    totalFloorAreaSqm += r.areaSqm;
    roomsByType[r.roomType].push(r);
  }
  totalFloorAreaSqm = Math.round(totalFloorAreaSqm * 100) / 100;

  const { occupiedFloors, totalDefinedStories } = computeActiveBuildingFloorCount(
    floors,
    archData,
    objects
  );
  const effectiveStories = occupiedFloors > 0 ? occupiedFloors : totalDefinedStories;

  if (!brief) {
    return {
      hasActiveBrief: false,
      results: [],
      metCount: 0,
      unmetCount: 0,
      reviewCount: 0,
      totalApplicableCount: 0,
      totalFloorAreaSqm,
      occupiedStories: effectiveStories,
      roomsByType,
      unassignedRooms: roomsByType.unassigned,
    };
  }

  const results: EvaluatedRequirementResult[] = [];
  let metCount = 0;
  let unmetCount = 0;
  let reviewCount = 0;
  let totalApplicableCount = 0;

  for (const req of brief.requirements) {
    if (!req.enabled) {
      results.push({
        item: req,
        status: 'not-applicable',
        actualSummary: '—',
        targetSummary: '—',
        matchedRoomIds: [],
        undersizedRoomIds: [],
      });
      continue;
    }

    if (req.kind === 'information' || req.metric === 'style-note') {
      results.push({
        item: req,
        status: 'not-applicable',
        actualSummary: req.noteValue || brief.preferredStyle || '—',
        targetSummary:
          lang === 'ja' ? '参考メモ' : lang === 'en' ? 'Info note' : 'Catatan info',
        matchedRoomIds: [],
        undersizedRoomIds: [],
      });
      continue;
    }

    totalApplicableCount++;

    if (req.metric === 'room-count' && req.roomType) {
      const matched = roomsByType[req.roomType] ?? [];
      const targetCnt = Math.max(1, req.targetCount ?? 1);
      const minArea = req.minVal ?? 0;
      const undersized =
        minArea > 0 ? matched.filter((r) => r.areaSqm + 0.05 < minArea) : [];

      let status: RequirementStatus = 'met';
      if (matched.length < targetCnt) {
        status =
          roomsByType.unassigned.length > 0 && req.kind === 'preference'
            ? 'review'
            : 'unmet';
      } else if (undersized.length > 0) {
        status = 'review';
      }

      const unitWord = lang === 'ja' ? '室' : lang === 'en' ? 'rooms' : 'ruang';
      const actualSummary =
        undersized.length > 0
          ? `${matched.length}/${targetCnt} ${unitWord} (${undersized.length} < ${minArea}m²)`
          : `${matched.length} / ${targetCnt} ${unitWord}`;
      const targetSummary =
        minArea > 0
          ? `≥ ${targetCnt} (${minArea} m²+)`
          : `≥ ${targetCnt} ${unitWord}`;

      results.push({
        item: req,
        status,
        actualSummary,
        targetSummary,
        matchedRoomIds: matched.map((r) => r.id),
        undersizedRoomIds: undersized.map((r) => r.id),
      });

      if (status === 'met') metCount++;
      else if (status === 'review') reviewCount++;
      else unmetCount++;
      continue;
    }

    if (req.metric === 'room-min-area' && req.roomType) {
      const matched = roomsByType[req.roomType] ?? [];
      const minArea = Math.max(1, req.minVal ?? 6);
      const undersized = matched.filter((r) => r.areaSqm + 0.05 < minArea);
      const status: RequirementStatus =
        matched.length === 0
          ? 'unmet'
          : undersized.length > 0
          ? 'unmet'
          : 'met';
      const maxActual =
        matched.length > 0
          ? Math.max(...matched.map((r) => r.areaSqm)).toFixed(1)
          : '0';

      results.push({
        item: req,
        status,
        actualSummary: `${maxActual} m²`,
        targetSummary: `≥ ${minArea} m²`,
        matchedRoomIds: matched.map((r) => r.id),
        undersizedRoomIds: undersized.map((r) => r.id),
      });

      if (status === 'met') metCount++;
      else unmetCount++;
      continue;
    }

    if (req.metric === 'total-floor-area') {
      const minA = req.minVal ?? 0;
      const maxA = req.maxVal;
      const meetsMin = totalFloorAreaSqm + 0.05 >= minA;
      const meetsMax = maxA === undefined || maxA <= 0 || totalFloorAreaSqm - 0.05 <= maxA;
      const status: RequirementStatus =
        meetsMin && meetsMax
          ? 'met'
          : !meetsMin
          ? 'unmet'
          : 'review';

      const targetSummary =
        maxA && maxA > 0 ? `${minA}–${maxA} m²` : `≥ ${minA} m²`;
      results.push({
        item: req,
        status,
        actualSummary: `${totalFloorAreaSqm.toFixed(1)} m²`,
        targetSummary,
        matchedRoomIds: detectedRooms.map((r) => r.id),
        undersizedRoomIds: [],
      });

      if (status === 'met') metCount++;
      else if (status === 'review') reviewCount++;
      else unmetCount++;
      continue;
    }

    if (req.metric === 'floor-count') {
      const minF = req.minVal ?? 1;
      const maxF = req.maxVal ?? minF;
      const actualF = occupiedFloors;
      const status: RequirementStatus =
        actualF >= minF && actualF <= maxF
          ? 'met'
          : actualF === 0
          ? 'unmet'
          : actualF > maxF
          ? 'review'
          : 'unmet';

      results.push({
        item: req,
        status,
        actualSummary: `${actualF}`,
        targetSummary: minF === maxF ? `${minF}` : `${minF}–${maxF}`,
        matchedRoomIds: [],
        undersizedRoomIds: [],
      });

      if (status === 'met') metCount++;
      else if (status === 'review') reviewCount++;
      else unmetCount++;
      continue;
    }

    if (req.metric === 'site-min-area') {
      const minS = req.minVal ?? 60;
      if (!siteMetrics.siteEnabled) {
        results.push({
          item: req,
          status: 'review',
          actualSummary:
            lang === 'ja' ? '敷地未有効' : lang === 'en' ? 'Site disabled' : 'Tapak belum aktif',
          targetSummary: `≥ ${minS} m²`,
          matchedRoomIds: [],
          undersizedRoomIds: [],
        });
        reviewCount++;
        continue;
      }
      const status: RequirementStatus =
        siteMetrics.siteAreaSqm + 0.05 >= minS ? 'met' : 'unmet';
      results.push({
        item: req,
        status,
        actualSummary: `${siteMetrics.siteAreaSqm.toFixed(1)} m²`,
        targetSummary: `≥ ${minS} m²`,
        matchedRoomIds: [],
        undersizedRoomIds: [],
      });
      if (status === 'met') metCount++;
      else unmetCount++;
    }
  }

  const hasActiveBrief =
    brief.projectType.trim().length > 0 ||
    brief.description.trim().length > 0 ||
    brief.requirements.some((r) => r.enabled) ||
    brief.targetBudget.enabled;

  return {
    hasActiveBrief,
    results,
    metCount,
    unmetCount,
    reviewCount,
    totalApplicableCount,
    totalFloorAreaSqm,
    occupiedStories: effectiveStories,
    roomsByType,
    unassignedRooms: roomsByType.unassigned,
  };
}
