import * as THREE from 'three';
import { AppLanguage, CustomProfileData } from '../types/studio';

export interface ProfileTemplateOption {
  id: string;
  label: Record<AppLanguage, string>;
  data: CustomProfileData;
}

export const PROFILE_STARTER_TEMPLATES: ProfileTemplateOption[] = [
  {
    id: 'turned-leg',
    label: {
      id: 'Kaki Meja Klasik (Bubut)',
      en: 'Classic Turned Table Leg',
      ja: 'クラシック旋盤テーブル脚',
    },
    data: {
      mode: 'lathe',
      smooth: true,
      segments: 32,
      depth: 0.5,
      hollowThickness: 0,
      points: [
        { x: 0.12, y: -0.5 },
        { x: 0.16, y: -0.42 },
        { x: 0.09, y: -0.28 },
        { x: 0.22, y: -0.05 },
        { x: 0.14, y: 0.18 },
        { x: 0.26, y: 0.34 },
        { x: 0.24, y: 0.5 },
      ],
    },
  },
  {
    id: 'ceramic-vase',
    label: {
      id: 'Vas / Guci Berongga',
      en: 'Hollow Ceramic Vase',
      ja: '中空セラミック花瓶',
    },
    data: {
      mode: 'lathe',
      smooth: true,
      segments: 36,
      depth: 0.5,
      hollowThickness: 0.045,
      points: [
        { x: 0.22, y: -0.5 },
        { x: 0.42, y: -0.18 },
        { x: 0.38, y: 0.12 },
        { x: 0.18, y: 0.34 },
        { x: 0.25, y: 0.5 },
      ],
    },
  },
  {
    id: 'pendant-shade',
    label: {
      id: 'Kap Lampu Gantung',
      en: 'Pendant Lamp Shade',
      ja: 'ペンダントランプシェード',
    },
    data: {
      mode: 'lathe',
      smooth: true,
      segments: 36,
      depth: 0.5,
      hollowThickness: 0.03,
      points: [
        { x: 0.48, y: -0.5 },
        { x: 0.44, y: -0.15 },
        { x: 0.26, y: 0.22 },
        { x: 0.1, y: 0.42 },
        { x: 0.08, y: 0.5 },
      ],
    },
  },
  {
    id: 'pedestal-base',
    label: {
      id: 'Kaki Meja Pedestal Tulip',
      en: 'Tulip Pedestal Base',
      ja: 'チューリップ型台座脚',
    },
    data: {
      mode: 'lathe',
      smooth: true,
      segments: 36,
      depth: 0.5,
      hollowThickness: 0,
      points: [
        { x: 0.46, y: -0.5 },
        { x: 0.22, y: -0.42 },
        { x: 0.09, y: -0.1 },
        { x: 0.09, y: 0.25 },
        { x: 0.32, y: 0.5 },
      ],
    },
  },
  {
    id: 'crown-molding',
    label: {
      id: 'Lis Profil Plafon (Extrude)',
      en: 'Crown Molding Profile (Extrude)',
      ja: '廻り縁モールディング断面',
    },
    data: {
      mode: 'extrude',
      smooth: false,
      segments: 24,
      depth: 1.0,
      hollowThickness: 0,
      points: [
        { x: -0.5, y: -0.5 },
        { x: -0.25, y: -0.5 },
        { x: -0.25, y: -0.28 },
        { x: 0.05, y: -0.15 },
        { x: 0.22, y: 0.18 },
        { x: 0.5, y: 0.32 },
        { x: 0.5, y: 0.5 },
        { x: -0.5, y: 0.5 },
      ],
    },
  },
  {
    id: 'cantilever-frame',
    label: {
      id: 'Rangka Kursi / Meja C (Extrude)',
      en: 'Cantilever C-Frame (Extrude)',
      ja: 'キャンティレバーC字フレーム',
    },
    data: {
      mode: 'extrude',
      smooth: false,
      segments: 24,
      depth: 1.0,
      hollowThickness: 0,
      points: [
        { x: -0.45, y: -0.5 },
        { x: 0.45, y: -0.5 },
        { x: 0.45, y: -0.38 },
        { x: -0.32, y: -0.38 },
        { x: -0.32, y: 0.38 },
        { x: 0.45, y: 0.38 },
        { x: 0.45, y: 0.5 },
        { x: -0.45, y: 0.5 },
      ],
    },
  },
];

function stripZeroAreaTriangles(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIdx = src.index ? src.toNonIndexed() : src.clone();
  const pos = nonIdx.getAttribute('position');
  const uv = nonIdx.getAttribute('uv');
  const triCount = Math.floor(pos.count / 3);

  const outP: number[] = [];
  const outU: number[] = [];

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const i1 = i0 + 1;
    const i2 = i0 + 2;
    a.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
    b.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
    c.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2));
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    if (ab.cross(ac).lengthSq() < 1e-12) continue;

    outP.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    if (uv) {
      outU.push(
        uv.getX(i0),
        uv.getY(i0),
        uv.getX(i1),
        uv.getY(i1),
        uv.getX(i2),
        uv.getY(i2)
      );
    } else {
      outU.push(0, 0, 1, 0, 0, 1);
    }
  }

  nonIdx.dispose();
  const clean = new THREE.BufferGeometry();
  clean.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  clean.setAttribute('uv', new THREE.Float32BufferAttribute(outU, 2));
  clean.computeVertexNormals();
  clean.computeBoundingBox();
  clean.computeBoundingSphere();
  return clean;
}

export function cloneCustomProfileData(p: CustomProfileData): CustomProfileData {
  return {
    mode: p.mode,
    segments: p.segments,
    depth: p.depth,
    smooth: p.smooth,
    hollowThickness: p.hollowThickness ?? 0,
    points: p.points.map((pt) => ({ x: pt.x, y: pt.y })),
  };
}

/**
 * Builds a clean, outward-CCW `THREE.BufferGeometry` from a user's 2D Lathe or Extrude profile.
 */
export function buildCustomProfileGeometry(
  profile: CustomProfileData
): THREE.BufferGeometry {
  if (!profile || !Array.isArray(profile.points) || profile.points.length < 2) {
    return new THREE.BoxGeometry(1, 1, 1);
  }

  if (profile.mode === 'lathe') {
    const rawPts = profile.points.map(
      (p) =>
        new THREE.Vector2(
          Math.max(0.005, Math.min(0.5, Math.abs(p.x))),
          Math.max(-0.5, Math.min(0.5, p.y))
        )
    );
    // Ensure bottom-to-top (-Y -> +Y) trace so Three.js LatheGeometry produces outward CCW normals
    if (rawPts[0].y > rawPts[rawPts.length - 1].y) {
      rawPts.reverse();
    }

    let outerPts: THREE.Vector2[] = rawPts;
    if (profile.smooth && rawPts.length >= 3) {
      const spline = new THREE.SplineCurve(rawPts);
      outerPts = spline.getPoints(Math.max(16, rawPts.length * 6)).map(
        (pt) =>
          new THREE.Vector2(
            Math.max(0.004, Math.min(0.5, pt.x)),
            Math.max(-0.5, Math.min(0.5, pt.y))
          )
      );
    }

    const latheChain: THREE.Vector2[] = [];
    const hollow = Math.max(0, Math.min(0.18, profile.hollowThickness ?? 0));

    if (hollow > 0.008) {
      // Closed Bottom Center -> Outer wall up -> Lip -> Inner wall down -> Inner Floor Center
      latheChain.push(new THREE.Vector2(0, outerPts[0].y));
      for (const p of outerPts) {
        latheChain.push(p.clone());
      }
      const floorInnerY = Math.min(
        outerPts[outerPts.length - 1].y - hollow,
        outerPts[0].y + hollow
      );
      for (let i = outerPts.length - 1; i >= 0; i--) {
        const op = outerPts[i];
        const innerR = Math.max(0.008, op.x - hollow);
        const innerY = Math.max(floorInnerY, op.y);
        latheChain.push(new THREE.Vector2(innerR, innerY));
      }
      latheChain.push(new THREE.Vector2(0, floorInnerY));
    } else {
      // Watertight solid revolve: close bottom & top axis caps cleanly at x = 0
      latheChain.push(new THREE.Vector2(0, outerPts[0].y));
      for (const p of outerPts) {
        latheChain.push(p.clone());
      }
      latheChain.push(new THREE.Vector2(0, outerPts[outerPts.length - 1].y));
    }

    const segs = Math.max(12, Math.min(64, Math.round(profile.segments || 32)));
    const rawGeo = new THREE.LatheGeometry(latheChain, segs);
    const cleaned = stripZeroAreaTriangles(rawGeo);
    rawGeo.dispose();
    return cleaned;
  }

  // Extrude 2D closed profile along Z
  if (profile.points.length < 3) {
    return new THREE.BoxGeometry(1, 1, 1);
  }

  const vec2s = profile.points.map(
    (p) =>
      new THREE.Vector2(
        Math.max(-0.5, Math.min(0.5, p.x)),
        Math.max(-0.5, Math.min(0.5, p.y))
      )
  );

  // Ensure CCW winding in 2D XY so ExtrudeGeometry normals point outward
  let signedArea = 0;
  for (let i = 0; i < vec2s.length; i++) {
    const a = vec2s[i];
    const b = vec2s[(i + 1) % vec2s.length];
    signedArea += a.x * b.y - b.x * a.y;
  }
  if (signedArea < 0) {
    vec2s.reverse();
  }

  let polyPts = vec2s;
  if (profile.smooth && vec2s.length >= 3) {
    const closedPts = [...vec2s, vec2s[0].clone()];
    const curve = new THREE.SplineCurve(closedPts);
    polyPts = curve.getPoints(Math.max(24, vec2s.length * 6));
  }

  const shape = new THREE.Shape(polyPts);
  const depth = Math.max(0.05, Math.min(2.0, profile.depth || 1.0));
  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: Math.max(8, Math.min(32, Math.round(profile.segments || 16))),
  });
  extrudeGeo.translate(0, 0, -depth * 0.5);
  const cleaned = stripZeroAreaTriangles(extrudeGeo);
  extrudeGeo.dispose();
  return cleaned;
}
