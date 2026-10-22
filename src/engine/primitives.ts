import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PrimitiveKind, ShapeSubcategory } from '../types/studio';
import {
  ARCHITECTURAL_SHAPES_CATALOG,
  createNewArchitecturalGeometry,
} from './architecturalPrimitives';

export interface PrimitiveMetaItem {
  kind: PrimitiveKind;
  label: string;
  subtitle: string;
  description: string;
  subcategory: Exclude<ShapeSubcategory, 'all'>;
  defaultColor: string;
  roughness: number;
  metalness: number;
}

/**
 * Emits a flat-shaded triangle whose winding is guaranteed outward-facing relative
 * to either an explicit expected normal or an interior reference point.
 */
function pushTriOutward(
  positions: number[],
  uvs: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  refDirOrInterior: THREE.Vector3,
  isExpectedNormal = false
): void {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ac = new THREE.Vector3().subVectors(c, a);
  const cross = new THREE.Vector3().crossVectors(ab, ac);
  if (cross.lengthSq() < 1e-11) {
    return;
  }

  const dir = isExpectedNormal
    ? refDirOrInterior
    : new THREE.Vector3().subVectors(a, refDirOrInterior);

  const v1 = a;
  let v2 = b;
  let v3 = c;
  if (cross.dot(dir) < 0) {
    v2 = c;
    v3 = b;
  }

  positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
  uvs.push(0, 0, 1, 0, 0.5, 1);
}

function pushQuadOutward(
  positions: number[],
  uvs: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
  refDirOrInterior: THREE.Vector3,
  isExpectedNormal = false
): void {
  pushTriOutward(positions, uvs, a, b, c, refDirOrInterior, isExpectedNormal);
  pushTriOutward(positions, uvs, a, c, d, refDirOrInterior, isExpectedNormal);
}

function buildBufferGeo(positions: number[], uvs: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/** 1. Symmetrical Gable Triangle Prism (Segitiga) */
function createTriangularPrismGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const inside = new THREE.Vector3(0, -0.15, 0);

  const fbl = new THREE.Vector3(-0.5, -0.5, 0.5);
  const fbr = new THREE.Vector3(0.5, -0.5, 0.5);
  const ft = new THREE.Vector3(0, 0.5, 0.5);
  const bbl = new THREE.Vector3(-0.5, -0.5, -0.5);
  const bbr = new THREE.Vector3(0.5, -0.5, -0.5);
  const bt = new THREE.Vector3(0, 0.5, -0.5);

  pushTriOutward(pos, uvs, fbl, fbr, ft, inside);
  pushTriOutward(pos, uvs, bbl, bbr, bt, inside);
  pushQuadOutward(pos, uvs, bbl, bbr, fbr, fbl, inside);
  pushQuadOutward(pos, uvs, fbr, bbr, bt, ft, inside);
  pushQuadOutward(pos, uvs, bbl, fbl, ft, bt, inside);

  return buildBufferGeo(pos, uvs);
}

/** 2. Vertical Wedge (Right-angled ramp rising toward -Z) */
function createVerticalWedgeGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const inside = new THREE.Vector3(0, -0.25, -0.25);

  const blf = new THREE.Vector3(-0.5, -0.5, 0.5);
  const brf = new THREE.Vector3(0.5, -0.5, 0.5);
  const blb = new THREE.Vector3(-0.5, -0.5, -0.5);
  const brb = new THREE.Vector3(0.5, -0.5, -0.5);
  const tlb = new THREE.Vector3(-0.5, 0.5, -0.5);
  const trb = new THREE.Vector3(0.5, 0.5, -0.5);

  // Bottom, Back vertical wall, Sloped ramp, Left & Right triangles
  pushQuadOutward(pos, uvs, blb, brb, brf, blf, inside);
  pushQuadOutward(pos, uvs, blb, brb, trb, tlb, inside);
  pushQuadOutward(pos, uvs, blf, brf, trb, tlb, inside);
  pushTriOutward(pos, uvs, blb, blf, tlb, inside);
  pushTriOutward(pos, uvs, brb, trb, brf, inside);

  return buildBufferGeo(pos, uvs);
}

/** 3. Horizontal Wedge (Right-angled vertical wall corner wedge in XZ plane) */
function createHorizontalWedgeGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const inside = new THREE.Vector3(-0.22, 0, -0.22);

  // 90° corner at (-0.5, y, -0.5), diagonal from (-0.5, y, +0.5) to (+0.5, y, -0.5)
  const b0 = new THREE.Vector3(-0.5, -0.5, -0.5);
  const bX = new THREE.Vector3(0.5, -0.5, -0.5);
  const bZ = new THREE.Vector3(-0.5, -0.5, 0.5);

  const t0 = new THREE.Vector3(-0.5, 0.5, -0.5);
  const tX = new THREE.Vector3(0.5, 0.5, -0.5);
  const tZ = new THREE.Vector3(-0.5, 0.5, 0.5);

  pushTriOutward(pos, uvs, b0, bX, bZ, inside);
  pushTriOutward(pos, uvs, t0, tZ, tX, inside);
  pushQuadOutward(pos, uvs, b0, bX, tX, t0, inside); // -Z wall
  pushQuadOutward(pos, uvs, b0, t0, tZ, bZ, inside); // -X wall
  pushQuadOutward(pos, uvs, bX, bZ, tZ, tX, inside); // 45° diagonal wall

  return buildBufferGeo(pos, uvs);
}

/** 4. Inverted Wedge (Flat ceiling on top y=+0.5, sloped overhang underneath) */
function createInvertedWedgeGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const inside = new THREE.Vector3(0, 0.25, -0.25);

  const tlf = new THREE.Vector3(-0.5, 0.5, 0.5);
  const trf = new THREE.Vector3(0.5, 0.5, 0.5);
  const tlb = new THREE.Vector3(-0.5, 0.5, -0.5);
  const trb = new THREE.Vector3(0.5, 0.5, -0.5);
  const blb = new THREE.Vector3(-0.5, -0.5, -0.5);
  const brb = new THREE.Vector3(0.5, -0.5, -0.5);

  pushQuadOutward(pos, uvs, tlb, trb, trf, tlf, inside); // Flat top
  pushQuadOutward(pos, uvs, blb, brb, trb, tlb, inside); // Back vertical wall
  pushQuadOutward(pos, uvs, blb, brb, trf, tlf, inside); // Underside slope
  pushTriOutward(pos, uvs, blb, tlb, tlf, inside);
  pushTriOutward(pos, uvs, brb, trf, trb, inside);

  return buildBufferGeo(pos, uvs);
}

/** 5. Corner Wedge (Hip roof outer corner mating with two Vertical Wedges) */
function createCornerWedgeGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const inside = new THREE.Vector3(-0.25, -0.25, -0.25);

  const blb = new THREE.Vector3(-0.5, -0.5, -0.5);
  const brb = new THREE.Vector3(0.5, -0.5, -0.5);
  const brf = new THREE.Vector3(0.5, -0.5, 0.5);
  const blf = new THREE.Vector3(-0.5, -0.5, 0.5);
  const peak = new THREE.Vector3(-0.5, 0.5, -0.5);

  pushQuadOutward(pos, uvs, blb, brb, brf, blf, inside); // Base
  pushTriOutward(pos, uvs, blb, brb, peak, inside); // -Z right triangle
  pushTriOutward(pos, uvs, blb, peak, blf, inside); // -X right triangle
  pushTriOutward(pos, uvs, peak, brb, brf, inside); // Slope 1
  pushTriOutward(pos, uvs, peak, brf, blf, inside); // Slope 2

  return buildBufferGeo(pos, uvs);
}

/** 6. Inverted Corner Wedge (Upside-down corner overhang mating with two Inverted Wedges) */
function createInvertedCornerWedgeGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const inside = new THREE.Vector3(-0.25, 0.25, -0.25);

  const tlb = new THREE.Vector3(-0.5, 0.5, -0.5);
  const trb = new THREE.Vector3(0.5, 0.5, -0.5);
  const trf = new THREE.Vector3(0.5, 0.5, 0.5);
  const tlf = new THREE.Vector3(-0.5, 0.5, 0.5);
  const bottomTip = new THREE.Vector3(-0.5, -0.5, -0.5);

  pushQuadOutward(pos, uvs, tlb, trb, trf, tlf, inside); // Flat ceiling square
  pushTriOutward(pos, uvs, tlb, trb, bottomTip, inside); // -Z wall
  pushTriOutward(pos, uvs, tlb, bottomTip, tlf, inside); // -X wall
  pushTriOutward(pos, uvs, bottomTip, trb, trf, inside); // Underside slope 1
  pushTriOutward(pos, uvs, bottomTip, trf, tlf, inside); // Underside slope 2

  return buildBufferGeo(pos, uvs);
}

/** 7. Square Pyramid */
function createPyramidGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const inside = new THREE.Vector3(0, -0.25, 0);

  const blb = new THREE.Vector3(-0.5, -0.5, -0.5);
  const brb = new THREE.Vector3(0.5, -0.5, -0.5);
  const brf = new THREE.Vector3(0.5, -0.5, 0.5);
  const blf = new THREE.Vector3(-0.5, -0.5, 0.5);
  const apex = new THREE.Vector3(0, 0.5, 0);

  pushQuadOutward(pos, uvs, blb, brb, brf, blf, inside);
  pushTriOutward(pos, uvs, blf, brf, apex, inside);
  pushTriOutward(pos, uvs, brf, brb, apex, inside);
  pushTriOutward(pos, uvs, brb, blb, apex, inside);
  pushTriOutward(pos, uvs, blb, blf, apex, inside);

  return buildBufferGeo(pos, uvs);
}

/** 8. Beveled Cube (Flat 45° chamfers on all 12 edges + 8 corner triangles) */
function createBeveledCubeGeometry(bevel = 0.12): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const origin = new THREE.Vector3(0, 0, 0);
  const a = 0.5;
  const b = 0.5 - bevel;

  // 6 Main Faces
  pushQuadOutward(
    pos, uvs,
    new THREE.Vector3(-b, a, -b), new THREE.Vector3(b, a, -b),
    new THREE.Vector3(b, a, b), new THREE.Vector3(-b, a, b), origin
  );
  pushQuadOutward(
    pos, uvs,
    new THREE.Vector3(-b, -a, -b), new THREE.Vector3(b, -a, -b),
    new THREE.Vector3(b, -a, b), new THREE.Vector3(-b, -a, b), origin
  );
  pushQuadOutward(
    pos, uvs,
    new THREE.Vector3(a, -b, -b), new THREE.Vector3(a, b, -b),
    new THREE.Vector3(a, b, b), new THREE.Vector3(a, -b, b), origin
  );
  pushQuadOutward(
    pos, uvs,
    new THREE.Vector3(-a, -b, -b), new THREE.Vector3(-a, b, -b),
    new THREE.Vector3(-a, b, b), new THREE.Vector3(-a, -b, b), origin
  );
  pushQuadOutward(
    pos, uvs,
    new THREE.Vector3(-b, -b, a), new THREE.Vector3(b, -b, a),
    new THREE.Vector3(b, b, a), new THREE.Vector3(-b, b, a), origin
  );
  pushQuadOutward(
    pos, uvs,
    new THREE.Vector3(-b, -b, -a), new THREE.Vector3(b, -b, -a),
    new THREE.Vector3(b, b, -a), new THREE.Vector3(-b, b, -a), origin
  );

  // 12 Edge Chamfer Quads
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pushQuadOutward(
        pos, uvs,
        new THREE.Vector3(-b, sy * a, sz * b),
        new THREE.Vector3(b, sy * a, sz * b),
        new THREE.Vector3(b, sy * b, sz * a),
        new THREE.Vector3(-b, sy * b, sz * a),
        origin
      );
    }
    for (const sx of [-1, 1]) {
      pushQuadOutward(
        pos, uvs,
        new THREE.Vector3(sx * b, sy * a, -b),
        new THREE.Vector3(sx * b, sy * a, b),
        new THREE.Vector3(sx * a, sy * b, b),
        new THREE.Vector3(sx * a, sy * b, -b),
        origin
      );
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pushQuadOutward(
        pos, uvs,
        new THREE.Vector3(sx * a, -b, sz * b),
        new THREE.Vector3(sx * a, b, sz * b),
        new THREE.Vector3(sx * b, b, sz * a),
        new THREE.Vector3(sx * b, -b, sz * a),
        origin
      );
    }
  }

  // 8 Corner Triangles
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pushTriOutward(
          pos, uvs,
          new THREE.Vector3(sx * a, sy * b, sz * b),
          new THREE.Vector3(sx * b, sy * a, sz * b),
          new THREE.Vector3(sx * b, sy * b, sz * a),
          origin
        );
      }
    }
  }

  return buildBufferGeo(pos, uvs);
}

/** 9. Smooth Rounded Cube (Continuous filleted edges & spherical corners) */
function createSmoothCubeGeometry(radius = 0.16, segs = 18): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, 1, 1, segs, segs, segs);
  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const h = 0.5 - radius;

  const p = new THREE.Vector3();
  const core = new THREE.Vector3();
  const diff = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    p.fromBufferAttribute(posAttr, i);
    core.set(
      Math.max(-h, Math.min(h, p.x)),
      Math.max(-h, Math.min(h, p.y)),
      Math.max(-h, Math.min(h, p.z))
    );
    diff.subVectors(p, core);
    if (diff.lengthSq() > 1e-8) {
      diff.normalize();
      normAttr.setXYZ(i, diff.x, diff.y, diff.z);
      p.copy(core).addScaledVector(diff, radius);
      posAttr.setXYZ(i, p.x, p.y, p.z);
    }
  }

  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/** 10. Half Sphere (Architectural Dome with sealed flat circular bottom cap) */
function createHalfSphereGeometry(): THREE.BufferGeometry {
  const dome = new THREE.SphereGeometry(0.5, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.translate(0, -0.25, 0);

  const cap = new THREE.CircleGeometry(0.5, 36);
  cap.rotateX(Math.PI / 2);
  cap.translate(0, -0.25, 0);

  const merged = mergeGeometries([dome.toNonIndexed(), cap.toNonIndexed()], false);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  dome.dispose();
  cap.dispose();
  return merged;
}

/** 11. Beveled Cylinder (Smooth chamfered top/bottom circular rims + crisp end caps) */
function createBeveledCylinderGeometry(horizontal = false): THREE.BufferGeometry {
  const bevel = 0.1;
  const rInner = 0.5 - bevel;
  const yInner = 0.5 - bevel;
  const pts: THREE.Vector2[] = [];

  // Bottom fillet arc from (rInner, -0.5) to (0.5, -yInner)
  const arcSegs = 6;
  for (let i = 0; i <= arcSegs; i++) {
    const a = -Math.PI / 2 + (i / arcSegs) * (Math.PI / 2);
    pts.push(
      new THREE.Vector2(rInner + Math.cos(a) * bevel, -yInner + Math.sin(a) * bevel)
    );
  }
  // Top fillet arc from (0.5, +yInner) to (rInner, +0.5)
  for (let i = 0; i <= arcSegs; i++) {
    const a = (i / arcSegs) * (Math.PI / 2);
    pts.push(
      new THREE.Vector2(rInner + Math.cos(a) * bevel, yInner + Math.sin(a) * bevel)
    );
  }

  const radialSegs = 40;
  const body = new THREE.LatheGeometry(pts, radialSegs);
  body.computeVertexNormals();

  const topCap = new THREE.CircleGeometry(rInner, radialSegs);
  topCap.rotateX(-Math.PI / 2);
  topCap.translate(0, 0.5, 0);

  const botCap = new THREE.CircleGeometry(rInner, radialSegs);
  botCap.rotateX(Math.PI / 2);
  botCap.translate(0, -0.5, 0);

  const merged = mergeGeometries(
    [body.toNonIndexed(), topCap.toNonIndexed(), botCap.toNonIndexed()],
    false
  );
  body.dispose();
  topCap.dispose();
  botCap.dispose();

  if (horizontal) {
    merged.rotateZ(Math.PI / 2);
  }

  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * 12–13. Straight Curved Profile Extrusion along X ∈ [-0.5, +0.5]
 * convex = true -> Quarter-cylinder bulging outward
 * convex = false -> Quarter-pipe scooped inward
 */
function createCurvedStraightGeometry(convex: boolean, segs = 24): THREE.BufferGeometry {
  // Profile in YZ plane: back wall z = -0.5 (y: -0.5..+0.5), bottom y = -0.5 (z: -0.5..+0.5)
  const curvePts: Array<{ y: number; z: number; ny: number; nz: number }> = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const theta = t * (Math.PI / 2);
    if (convex) {
      // Center at (y=-0.5, z=-0.5), radius 1.0: from (y=+0.5, z=-0.5) to (y=-0.5, z=+0.5)
      const ny = Math.cos(theta);
      const nz = Math.sin(theta);
      curvePts.push({
        y: -0.5 + ny,
        z: -0.5 + nz,
        ny,
        nz,
      });
    } else {
      // Center at (y=+0.5, z=+0.5), radius 1.0: from (y=+0.5, z=-0.5) to (y=-0.5, z=+0.5)
      const cy = Math.sin(theta);
      const cz = Math.cos(theta);
      curvePts.push({
        y: 0.5 - cy,
        z: 0.5 - cz,
        ny: cy,
        nz: cz,
      });
    }
  }

  // Smooth curved top sheet
  const curvedPos: number[] = [];
  const curvedNorm: number[] = [];
  const curvedUv: number[] = [];

  for (let i = 0; i < segs; i++) {
    const p0 = curvePts[i];
    const p1 = curvePts[i + 1];
    // Quad from x = -0.5 to x = +0.5; outward normal has +Y, +Z
    // Vertices: A(-0.5, p0), B(-0.5, p1), C(+0.5, p1), D(+0.5, p0)
    // (B - A) = (0, dy, dz), (D - A) = (1, 0, 0) -> (B-A) x (D-A) = (0, dz, -dy)
    // Check dot with (+ny, +nz): at p0->p1, dy < 0, dz > 0 => dz*ny + (-dy)*nz > 0! Outward!
    const u0 = i / segs;
    const u1 = (i + 1) / segs;

    // Tri 1: A, B, C
    curvedPos.push(-0.5, p0.y, p0.z, -0.5, p1.y, p1.z, 0.5, p1.y, p1.z);
    curvedNorm.push(0, p0.ny, p0.nz, 0, p1.ny, p1.nz, 0, p1.ny, p1.nz);
    curvedUv.push(0, u0, 0, u1, 1, u1);

    // Tri 2: A, C, D
    curvedPos.push(-0.5, p0.y, p0.z, 0.5, p1.y, p1.z, 0.5, p0.y, p0.z);
    curvedNorm.push(0, p0.ny, p0.nz, 0, p1.ny, p1.nz, 0, p0.ny, p0.nz);
    curvedUv.push(0, u0, 1, u1, 1, u0);
  }

  const smoothSheet = new THREE.BufferGeometry();
  smoothSheet.setAttribute('position', new THREE.Float32BufferAttribute(curvedPos, 3));
  smoothSheet.setAttribute('normal', new THREE.Float32BufferAttribute(curvedNorm, 3));
  smoothSheet.setAttribute('uv', new THREE.Float32BufferAttribute(curvedUv, 2));

  // Flat walls: Back (-Z), Bottom (-Y), Left (-X), Right (+X)
  const flatPos: number[] = [];
  const flatUv: number[] = [];

  // Back wall (-Z)
  pushQuadOutward(
    flatPos, flatUv,
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, 0.5, -0.5),
    new THREE.Vector3(-0.5, 0.5, -0.5),
    new THREE.Vector3(0, 0, -1),
    true
  );

  // Bottom wall (-Y)
  pushQuadOutward(
    flatPos, flatUv,
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, -0.5, 0.5),
    new THREE.Vector3(-0.5, -0.5, 0.5),
    new THREE.Vector3(0, -1, 0),
    true
  );

  // Left (-X) and Right (+X) profile fans anchored at (-0.5, -0.5)
  for (const sx of [-0.5, 0.5]) {
    const nDir = new THREE.Vector3(sx < 0 ? -1 : 1, 0, 0);
    const corner = new THREE.Vector3(sx, -0.5, -0.5);
    for (let i = 0; i < segs; i++) {
      const p0 = curvePts[i];
      const p1 = curvePts[i + 1];
      pushTriOutward(
        flatPos, flatUv,
        corner,
        new THREE.Vector3(sx, p0.y, p0.z),
        new THREE.Vector3(sx, p1.y, p1.z),
        nDir,
        true
      );
    }
  }

  const flatWalls = buildBufferGeo(flatPos, flatUv);
  const merged = mergeGeometries([smoothSheet, flatWalls], false);
  smoothSheet.dispose();
  flatWalls.dispose();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * 14–15. Outer Curved Corners (Polar revolve around back-left post u=0, w=0)
 * convex = true -> 1/8th sphere (Convex Outer Corner)
 * convex = false -> Cove outer horn (Concave Outer Corner)
 */
function createCurvedOuterCornerGeometry(
  convex: boolean,
  segs = 22
): THREE.BufferGeometry {
  // Polar parameterization around (-0.5, y, -0.5): u = t cos(phi), w = t sin(phi), t ∈ [0, 1], phi ∈ [0, pi/2]
  const gridPts: THREE.Vector3[][] = [];
  const gridNorms: THREE.Vector3[][] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const rowP: THREE.Vector3[] = [];
    const rowN: THREE.Vector3[] = [];

    // Profile v(t) and slope dv/dt
    const theta = t * (Math.PI / 2);
    const v = convex ? Math.cos(theta) : 1 - Math.sin(theta);

    for (let j = 0; j <= segs; j++) {
      const phi = (j / segs) * (Math.PI / 2);
      const cu = Math.cos(phi);
      const sw = Math.sin(phi);
      const u = Math.sin(theta) * cu;
      const w = Math.sin(theta) * sw;

      if (convex) {
        // Sphere octant centered at (-0.5, -0.5, -0.5)
        rowP.push(new THREE.Vector3(-0.5 + u, -0.5 + v, -0.5 + w));
        rowN.push(new THREE.Vector3(u, v, w).normalize());
      } else {
        // Concave outer revolve: r = 1 - cos(alpha), v = 1 - sin(alpha)
        // t=0 -> alpha=0 (top apex r=0, vy=1); t=1 -> alpha=pi/2 (bottom arc r=1, vy=0)
        const alpha = t * (Math.PI / 2);
        const r = 1 - Math.cos(alpha);
        const vy = 1 - Math.sin(alpha);
        rowP.push(new THREE.Vector3(-0.5 + r * cu, -0.5 + vy, -0.5 + r * sw));
        // Outward normal points (+cos(alpha)*cu, +sin(alpha), +cos(alpha)*sw)
        rowN.push(
          new THREE.Vector3(
            Math.cos(alpha) * cu,
            Math.sin(alpha),
            Math.cos(alpha) * sw
          ).normalize()
        );
      }
    }
    gridPts.push(rowP);
    gridNorms.push(rowN);
  }

  const curvedPos: number[] = [];
  const curvedNorm: number[] = [];
  const curvedUv: number[] = [];

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < segs; j++) {
      const p00 = gridPts[i][j];
      const p10 = gridPts[i + 1][j];
      const p01 = gridPts[i][j + 1];
      const p11 = gridPts[i + 1][j + 1];

      const n00 = gridNorms[i][j];
      const n10 = gridNorms[i + 1][j];
      const n01 = gridNorms[i][j + 1];
      const n11 = gridNorms[i + 1][j + 1];

      // Ensure outward winding using average normal
      const avgN = new THREE.Vector3().add(n00).add(n10).add(n11).add(n01);

      const emitSmoothTri = (
        a: THREE.Vector3, na: THREE.Vector3,
        b: THREE.Vector3, nb: THREE.Vector3,
        c: THREE.Vector3, nc: THREE.Vector3
      ) => {
        const cross = new THREE.Vector3()
          .subVectors(b, a)
          .cross(new THREE.Vector3().subVectors(c, a));
        if (cross.lengthSq() < 1e-11) return;
        if (cross.dot(avgN) >= 0) {
          curvedPos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
          curvedNorm.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z);
        } else {
          curvedPos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
          curvedNorm.push(na.x, na.y, na.z, nc.x, nc.y, nc.z, nb.x, nb.y, nb.z);
        }
        curvedUv.push(0, 0, 1, 0, 0.5, 1);
      };

      emitSmoothTri(p00, n00, p10, n10, p11, n11);
      emitSmoothTri(p00, n00, p11, n11, p01, n01);
    }
  }

  const smoothSheet = new THREE.BufferGeometry();
  smoothSheet.setAttribute('position', new THREE.Float32BufferAttribute(curvedPos, 3));
  smoothSheet.setAttribute('normal', new THREE.Float32BufferAttribute(curvedNorm, 3));
  smoothSheet.setAttribute('uv', new THREE.Float32BufferAttribute(curvedUv, 2));

  // Flat caps: -Z side (j=0), -X side (j=segs), Bottom quarter-disk (y=-0.5)
  const flatPos: number[] = [];
  const flatUv: number[] = [];
  const originCorner = new THREE.Vector3(-0.5, -0.5, -0.5);

  // -Z side fan
  const normNegZ = new THREE.Vector3(0, 0, -1);
  for (let i = 0; i < segs; i++) {
    pushTriOutward(
      flatPos, flatUv,
      originCorner,
      gridPts[i][0],
      gridPts[i + 1][0],
      normNegZ,
      true
    );
  }

  // -X side fan
  const normNegX = new THREE.Vector3(-1, 0, 0);
  for (let i = 0; i < segs; i++) {
    pushTriOutward(
      flatPos, flatUv,
      originCorner,
      gridPts[i][segs],
      gridPts[i + 1][segs],
      normNegX,
      true
    );
  }

  // Bottom quarter-circle fan at i = segs (y = -0.5)
  const normNegY = new THREE.Vector3(0, -1, 0);
  for (let j = 0; j < segs; j++) {
    pushTriOutward(
      flatPos, flatUv,
      originCorner,
      gridPts[segs][j],
      gridPts[segs][j + 1],
      normNegY,
      true
    );
  }

  const flatWalls = buildBufferGeo(flatPos, flatUv);
  const merged = mergeGeometries([smoothSheet, flatWalls], false);
  smoothSheet.dispose();
  flatWalls.dispose();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * 16–17. Inner Curved Corners (Polar revolve around front-right corner u=1, w=1 + flat corner plateau)
 * convex = true -> Convex Inner Corner
 * convex = false -> Concave Inner Corner
 */
function createCurvedInnerCornerGeometry(
  convex: boolean,
  segs = 22
): THREE.BufferGeometry {
  // Polar rays from front-right (u=1, w=1) toward back-left: u = 1 - rho*cos(phi), w = 1 - rho*sin(phi)
  const curvedPos: number[] = [];
  const curvedNorm: number[] = [];
  const curvedUv: number[] = [];

  const gridPts: THREE.Vector3[][] = [];
  const gridNorms: THREE.Vector3[][] = [];

  for (let i = 0; i <= segs; i++) {
    const s = i / segs; // 0 at (u=1,w=1, v=0) -> 1 at R=1 arc (v=1)
    const alpha = s * (Math.PI / 2);
    const rowP: THREE.Vector3[] = [];
    const rowN: THREE.Vector3[] = [];

    for (let j = 0; j <= segs; j++) {
      const phi = (j / segs) * (Math.PI / 2);
      const cPhi = Math.cos(phi);
      const sPhi = Math.sin(phi);

      let rho: number;
      let v: number;
      let nx: number;
      let ny: number;
      let nz: number;

      if (convex) {
        // v = sin(alpha), 1 - rho = cos(alpha) => rho = 1 - cos(alpha)
        rho = 1 - Math.cos(alpha);
        v = Math.sin(alpha);
        // Surface bulges upward/forward (+X, +Y, +Z)
        nx = Math.cos(alpha) * cPhi;
        ny = Math.sin(alpha);
        nz = Math.cos(alpha) * sPhi;
      } else {
        // Concave bowl carved at (1, 1, 1): rho = sin(alpha), v = 1 - cos(alpha)
        rho = Math.sin(alpha);
        v = 1 - Math.cos(alpha);
        nx = Math.sin(alpha) * cPhi;
        ny = Math.cos(alpha);
        nz = Math.sin(alpha) * sPhi;
      }

      const u = 1 - rho * cPhi;
      const w = 1 - rho * sPhi;
      rowP.push(new THREE.Vector3(-0.5 + u, -0.5 + v, -0.5 + w));
      rowN.push(new THREE.Vector3(nx, ny, nz).normalize());
    }
    gridPts.push(rowP);
    gridNorms.push(rowN);
  }

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < segs; j++) {
      const p00 = gridPts[i][j];
      const p10 = gridPts[i + 1][j];
      const p01 = gridPts[i][j + 1];
      const p11 = gridPts[i + 1][j + 1];

      const n00 = gridNorms[i][j];
      const n10 = gridNorms[i + 1][j];
      const n01 = gridNorms[i][j + 1];
      const n11 = gridNorms[i + 1][j + 1];

      const avgN = new THREE.Vector3().add(n00).add(n10).add(n11).add(n01);

      const emitSmoothTri = (
        a: THREE.Vector3, na: THREE.Vector3,
        b: THREE.Vector3, nb: THREE.Vector3,
        c: THREE.Vector3, nc: THREE.Vector3
      ) => {
        const cross = new THREE.Vector3()
          .subVectors(b, a)
          .cross(new THREE.Vector3().subVectors(c, a));
        if (cross.lengthSq() < 1e-11) return;
        if (cross.dot(avgN) >= 0) {
          curvedPos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
          curvedNorm.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z);
        } else {
          curvedPos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
          curvedNorm.push(na.x, na.y, na.z, nc.x, nc.y, nc.z, nb.x, nb.y, nb.z);
        }
        curvedUv.push(0, 0, 1, 0, 0.5, 1);
      };

      emitSmoothTri(p00, n00, p10, n10, p11, n11);
      emitSmoothTri(p00, n00, p11, n11, p01, n01);
    }
  }

  const smoothSheet = new THREE.BufferGeometry();
  smoothSheet.setAttribute('position', new THREE.Float32BufferAttribute(curvedPos, 3));
  smoothSheet.setAttribute('normal', new THREE.Float32BufferAttribute(curvedNorm, 3));
  smoothSheet.setAttribute('uv', new THREE.Float32BufferAttribute(curvedUv, 2));

  // Flat surfaces: Top corner plateau (y=+0.5), Back (-Z), Left (-X), Bottom (-Y), +X profile, +Z profile
  const flatPos: number[] = [];
  const flatUv: number[] = [];

  // Top plateau connecting the R=1 arc (gridPts[segs][j]) back to (-0.5, +0.5, -0.5)
  const topBackLeft = new THREE.Vector3(-0.5, 0.5, -0.5);
  const normPosY = new THREE.Vector3(0, 1, 0);
  for (let j = 0; j < segs; j++) {
    pushTriOutward(
      flatPos, flatUv,
      topBackLeft,
      gridPts[segs][j],
      gridPts[segs][j + 1],
      normPosY,
      true
    );
  }

  // Full Back wall (-Z: z = -0.5)
  pushQuadOutward(
    flatPos, flatUv,
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, 0.5, -0.5),
    new THREE.Vector3(-0.5, 0.5, -0.5),
    new THREE.Vector3(0, 0, -1),
    true
  );

  // Full Left wall (-X: x = -0.5)
  pushQuadOutward(
    flatPos, flatUv,
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(-0.5, 0.5, -0.5),
    new THREE.Vector3(-0.5, 0.5, 0.5),
    new THREE.Vector3(-0.5, -0.5, 0.5),
    new THREE.Vector3(-1, 0, 0),
    true
  );

  // Full Bottom base (-Y: y = -0.5)
  pushQuadOutward(
    flatPos, flatUv,
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, -0.5, 0.5),
    new THREE.Vector3(-0.5, -0.5, 0.5),
    new THREE.Vector3(0, -1, 0),
    true
  );

  // +Z front face profile (j = 0 -> phi = 0 -> z = +0.5, x goes from +0.5 to -0.5)
  const anchorPosZ = new THREE.Vector3(-0.5, -0.5, 0.5);
  const normPosZ = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < segs; i++) {
    pushTriOutward(
      flatPos, flatUv,
      anchorPosZ,
      gridPts[i][0],
      gridPts[i + 1][0],
      normPosZ,
      true
    );
  }

  // +X right face profile (j = segs -> phi = pi/2 -> x = +0.5, z goes from +0.5 to -0.5)
  const anchorPosX = new THREE.Vector3(0.5, -0.5, -0.5);
  const normPosX = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < segs; i++) {
    pushTriOutward(
      flatPos, flatUv,
      anchorPosX,
      gridPts[i][segs],
      gridPts[i + 1][segs],
      normPosX,
      true
    );
  }

  const flatWalls = buildBufferGeo(flatPos, flatUv);
  const merged = mergeGeometries([smoothSheet, flatWalls], false);
  smoothSheet.dispose();
  flatWalls.dispose();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function createPrimitiveGeometry(kind: PrimitiveKind): THREE.BufferGeometry {
  switch (kind) {
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'beveled-cube':
      return createBeveledCubeGeometry(0.12);
    case 'smooth-cube':
      return createSmoothCubeGeometry(0.16, 16);

    case 'triangle':
      return createTriangularPrismGeometry();
    case 'vertical-wedge':
      return createVerticalWedgeGeometry();
    case 'horizontal-wedge':
      return createHorizontalWedgeGeometry();
    case 'inverted-wedge':
      return createInvertedWedgeGeometry();
    case 'corner-wedge':
      return createCornerWedgeGeometry();
    case 'inverted-corner-wedge':
      return createInvertedCornerWedgeGeometry();
    case 'pyramid':
      return createPyramidGeometry();

    case 'convex-straight':
      return createCurvedStraightGeometry(true, 24);
    case 'concave-straight':
      return createCurvedStraightGeometry(false, 24);
    case 'convex-outer-corner':
      return createCurvedOuterCornerGeometry(true, 22);
    case 'concave-outer-corner':
      return createCurvedOuterCornerGeometry(false, 22);
    case 'convex-inner-corner':
      return createCurvedInnerCornerGeometry(true, 22);
    case 'concave-inner-corner':
      return createCurvedInnerCornerGeometry(false, 22);

    case 'cylinder':
    case 'vertical-cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 36);
    case 'horizontal-cylinder': {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 36);
      g.rotateZ(Math.PI / 2);
      g.computeBoundingBox();
      return g;
    }
    case 'beveled-vertical-cylinder':
      return createBeveledCylinderGeometry(false);
    case 'beveled-horizontal-cylinder':
      return createBeveledCylinderGeometry(true);
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, 36);
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 36, 24);
    case 'half-sphere':
      return createHalfSphereGeometry();
    default: {
      const archGeo = createNewArchitecturalGeometry(kind);
      if (archGeo) return archGeo;
      return new THREE.BoxGeometry(1, 1, 1);
    }
  }
}

export const BASIC_SHAPES_CATALOG: PrimitiveMetaItem[] = [
  // --- Balok & Sudut Halus ---
  {
    kind: 'cube',
    label: 'Cube (Kubus)',
    subtitle: 'Balok siku dasar',
    description:
      'Balok 1×1×1 bersudut tegas. Fondasi utama untuk membuat dinding, lantai, meja, lemari, dan struktur bangunan.',
    subcategory: 'blocks',
    defaultColor: '#e2e8f0',
    roughness: 0.72,
    metalness: 0.05,
  },
  {
    kind: 'beveled-cube',
    label: 'Beveled Cube',
    subtitle: 'Kubus tepi miring 45°',
    description:
      'Kubus dengan ke-12 rusuk dan 8 sudut yang dipotong miring tegas (chamfer 45°). Cocok untuk pilar modern, meja perabot, dan blok mekanis.',
    subcategory: 'blocks',
    defaultColor: '#cbd5e1',
    roughness: 0.58,
    metalness: 0.14,
  },
  {
    kind: 'smooth-cube',
    label: 'Smooth Cube',
    subtitle: 'Kubus sudut membulat',
    description:
      'Kubus dengan rusuk dan sudut lengkung halus (fillet). Sangat pas untuk bantalan sofa, kasur, kursi modern, dan perabot ergonomis.',
    subcategory: 'blocks',
    defaultColor: '#93c5fd',
    roughness: 0.48,
    metalness: 0.08,
  },

  // --- Wedge, Atap & Limas ---
  {
    kind: 'triangle',
    label: 'Triangle (Segitiga)',
    subtitle: 'Prisma atap pelana',
    description:
      'Prisma segitiga simetris (atap pelana dua sisi). Tepat ditumpuk di atas kubus untuk membentuk atap rumah klasik.',
    subcategory: 'wedges',
    defaultColor: '#e07a54',
    roughness: 0.68,
    metalness: 0.05,
  },
  {
    kind: 'vertical-wedge',
    label: 'Vertical Wedge',
    subtitle: 'Bidang miring ke atas',
    description:
      'Prisma siku-siku miring vertikal (ramp). Digunakan untuk jalur landai, anak tangga, atap miring satu arah, dan penyangga dinding.',
    subcategory: 'wedges',
    defaultColor: '#f59e0b',
    roughness: 0.65,
    metalness: 0.06,
  },
  {
    kind: 'horizontal-wedge',
    label: 'Horizontal Wedge',
    subtitle: 'Sudut dinding 45° mendatar',
    description:
      'Prisma siku-siku berdiri mendatar (potongan diagonal dilihat dari atas). Ideal untuk membuat belokan dinding 45° atau sudut ruangan miring.',
    subcategory: 'wedges',
    defaultColor: '#fbbf24',
    roughness: 0.66,
    metalness: 0.06,
  },
  {
    kind: 'inverted-wedge',
    label: 'Inverted Wedge',
    subtitle: 'Wedge terbalik gantung',
    description:
      'Kebalikan Vertical Wedge dengan bidang datar di atas dan kemiringan di bawah. Cocok untuk konsol balkon, tritisan atap, dan kolong tangga.',
    subcategory: 'wedges',
    defaultColor: '#fb923c',
    roughness: 0.66,
    metalness: 0.06,
  },
  {
    kind: 'corner-wedge',
    label: 'Corner Wedge',
    subtitle: 'Sudut luar atap miring',
    description:
      'Potongan sudut luar miring yang menyambungkan dua Vertical Wedge secara presisi untuk membentuk sudut atap limasan (hip roof).',
    subcategory: 'wedges',
    defaultColor: '#ea580c',
    roughness: 0.66,
    metalness: 0.06,
  },
  {
    kind: 'inverted-corner-wedge',
    label: 'Inverted Corner Wedge',
    subtitle: 'Sudut gantung terbalik',
    description:
      'Pasangan terbalik dari Corner Wedge dengan permukaan atas rata penuh, menyambungkan dua Inverted Wedge pada sudut plafon atau balkon.',
    subcategory: 'wedges',
    defaultColor: '#f97316',
    roughness: 0.66,
    metalness: 0.06,
  },
  {
    kind: 'pyramid',
    label: 'Pyramid',
    subtitle: 'Limas segiempat lancip',
    description:
      'Limas beralas persegi dengan puncak tepat di tengah. Cocok untuk atap menara, gazebo, monumen, dan penutup tiang pagar.',
    subcategory: 'wedges',
    defaultColor: '#eab308',
    roughness: 0.62,
    metalness: 0.08,
  },

  // --- Lengkung Arsitektur (Concave & Convex) ---
  {
    kind: 'convex-straight',
    label: 'Convex Straight',
    subtitle: 'Lengkung cembung lurus',
    description:
      'Blok seperempat tabung cembung memanjang. Cocok untuk pinggiran atap melengkung, tepi meja bulat, sandaran sofa, dan lengkungan gerbang.',
    subcategory: 'curved',
    defaultColor: '#38bdf8',
    roughness: 0.52,
    metalness: 0.1,
  },
  {
    kind: 'concave-straight',
    label: 'Concave Straight',
    subtitle: 'Lengkung cekung lurus',
    description:
      'Blok dengan cekungan seperempat lingkaran ke dalam (cove). Pas untuk lis plafon melengkung, talang, kolam, dan transisi lantai ke dinding.',
    subcategory: 'curved',
    defaultColor: '#2dd4bf',
    roughness: 0.52,
    metalness: 0.1,
  },
  {
    kind: 'convex-outer-corner',
    label: 'Convex Outer Corner',
    subtitle: 'Sudut luar cembung',
    description:
      'Seperdelapan bola cembung yang mempertemukan dua Convex Straight di sudut luar 90° secara mulus tanpa patahan.',
    subcategory: 'curved',
    defaultColor: '#60a5fa',
    roughness: 0.52,
    metalness: 0.1,
  },
  {
    kind: 'convex-inner-corner',
    label: 'Convex Inner Corner',
    subtitle: 'Sudut dalam cembung',
    description:
      'Penyambung sudut dalam 90° untuk dua blok Convex Straight sehingga pertemuan lengkung cembung di sudut ruangan tetap mulus.',
    subcategory: 'curved',
    defaultColor: '#818cf8',
    roughness: 0.52,
    metalness: 0.1,
  },
  {
    kind: 'concave-outer-corner',
    label: 'Concave Outer Corner',
    subtitle: 'Sudut luar cekung',
    description:
      'Penyambung sudut luar 90° untuk dua blok Concave Straight yang melingkari tiang atau sudut luar bangunan dengan lekukan cekung.',
    subcategory: 'curved',
    defaultColor: '#34d399',
    roughness: 0.52,
    metalness: 0.1,
  },
  {
    kind: 'concave-inner-corner',
    label: 'Concave Inner Corner',
    subtitle: 'Sudut dalam cekung (mangkuk)',
    description:
      'Sudut dalam cekung seperempat mangkuk yang menyatukan dua Concave Straight di pojok dalam ruangan, plafon, atau kolam.',
    subcategory: 'curved',
    defaultColor: '#22d3ee',
    roughness: 0.52,
    metalness: 0.1,
  },

  // --- Silinder, Kerucut & Bola ---
  {
    kind: 'cylinder',
    label: 'Silinder (Dasar)',
    subtitle: 'Tabung serbaguna',
    description:
      'Silinder standar serbaguna untuk tiang rumah, kaki meja, pot tanaman, dan elemen bulat umum.',
    subcategory: 'cylinders',
    defaultColor: '#94a3b8',
    roughness: 0.55,
    metalness: 0.12,
  },
  {
    kind: 'vertical-cylinder',
    label: 'Vertical Cylinder',
    subtitle: 'Tabung tegak vertikal',
    description:
      'Silinder tegak lurus sepanjang sumbu Y untuk kolom arsitektur, pilar teras, menara bundar, dan kaki perabot.',
    subcategory: 'cylinders',
    defaultColor: '#cbd5e1',
    roughness: 0.54,
    metalness: 0.12,
  },
  {
    kind: 'horizontal-cylinder',
    label: 'Horizontal Cylinder',
    subtitle: 'Tabung rebah mendatar',
    description:
      'Silinder mendatar sepanjang sumbu X. Praktis langsung dipakai untuk balok kayu bulat, pipa, atap lengkung terowongan, atau bantal guling.',
    subcategory: 'cylinders',
    defaultColor: '#a8a29e',
    roughness: 0.56,
    metalness: 0.12,
  },
  {
    kind: 'beveled-vertical-cylinder',
    label: 'Beveled Vertical Cylinder',
    subtitle: 'Tabung tegak tepi tumpul',
    description:
      'Silinder vertikal dengan bibir atas dan bawah melengkung halus (bevel). Cocok untuk puff sofa, meja bundar mewah, dan tombol/pilar.',
    subcategory: 'cylinders',
    defaultColor: '#c4b5fd',
    roughness: 0.45,
    metalness: 0.15,
  },
  {
    kind: 'beveled-horizontal-cylinder',
    label: 'Beveled Horizontal Cylinder',
    subtitle: 'Tabung mendatar tepi tumpul',
    description:
      'Silinder mendatar dengan kedua ujung membulat rapi (bevel). Ideal untuk tangki, lengan kursi sofa, kapsul pendek, dan dekorasi modern.',
    subcategory: 'cylinders',
    defaultColor: '#f0abfc',
    roughness: 0.45,
    metalness: 0.15,
  },
  {
    kind: 'cone',
    label: 'Cone',
    subtitle: 'Kerucut bundar lancip',
    description:
      'Kerucut beralas lingkaran yang meruncing ke puncak. Bagus untuk atap menara kastil, kap lampu gantung, pohon cemara, dan ornamen.',
    subcategory: 'cylinders',
    defaultColor: '#fb7185',
    roughness: 0.58,
    metalness: 0.08,
  },
  {
    kind: 'sphere',
    label: 'Sphere',
    subtitle: 'Bola penuh utuh',
    description:
      'Bola 3D mulus berdiameter 1 meter untuk lampu taman bulat, bola hias, dedaunan pohon, sendi perabot, dan bentuk organik.',
    subcategory: 'cylinders',
    defaultColor: '#f472b6',
    roughness: 0.42,
    metalness: 0.12,
  },
  {
    kind: 'half-sphere',
    label: 'Half Sphere',
    subtitle: 'Kubah setengah bola',
    description:
      'Setengah bola (hemisphere) dengan alas lingkaran datar tertutup rapat. Sangat cocok untuk kubah bangunan, atap observatorium, dan kap lampu.',
    subcategory: 'cylinders',
    defaultColor: '#a78bfa',
    roughness: 0.46,
    metalness: 0.1,
  },
  ...ARCHITECTURAL_SHAPES_CATALOG,
];

export const PRIMITIVE_META: Record<PrimitiveKind, PrimitiveMetaItem> =
  Object.fromEntries(
    BASIC_SHAPES_CATALOG.map((item) => [item.kind, item])
  ) as Record<PrimitiveKind, PrimitiveMetaItem>;

/**
 * Generates and caches razor-sharp HiDPI 240x240 supersampled 3D studio thumbnails
 * for all 75 Basic Shapes with per-shape auto-framing and 4-point rim lighting.
 */
let cachedThumbnails: Record<PrimitiveKind, string> | null = null;

const FRONTAL_PREVIEW_KINDS = new Set<PrimitiveKind>([
  'window-frame',
  'door-frame',
  'arch',
  'wall-niche',
  'cornice',
  'molding-profile',
]);

export function getShapeThumbnails(): Record<PrimitiveKind, string> {
  if (cachedThumbnails) return cachedThumbnails;

  const result = {} as Record<PrimitiveKind, string>;
  try {
    const logicalSize = 120;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(logicalSize, logicalSize);
    renderer.setPixelRatio(2); // 240x240 crisp Retina resolution!
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 30);

    const hemi = new THREE.HemisphereLight('#f8fafc', '#1e293b', 1.05);
    scene.add(hemi);
    const key = new THREE.DirectionalLight('#fffbeb', 2.35);
    key.position.set(3.4, 5.2, 4.1);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#93c5fd', 1.15);
    rim.position.set(-4.2, 2.8, -3.4);
    scene.add(rim);
    const bounce = new THREE.DirectionalLight('#cbd5e1', 0.45);
    bounce.position.set(0, -3, 3);
    scene.add(bounce);

    const center = new THREE.Vector3();
    const vTmp = new THREE.Vector3();
    const baseDir = new THREE.Vector3(1.48, 1.2, 1.74).normalize();
    const frontalDir = new THREE.Vector3(1.05, 0.72, 1.96).normalize();
    const halfFovSin = Math.sin(THREE.MathUtils.degToRad(34 * 0.5));

    for (const item of BASIC_SHAPES_CATALOG) {
      const geo = createPrimitiveGeometry(item.kind);
      geo.computeBoundingBox();
      const bb =
        geo.boundingBox ??
        new THREE.Box3(
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, 0.5)
        );
      bb.getCenter(center);

      // Compute exact bounding sphere radius around `center` so diagonal corners NEVER clip!
      const posAttr = geo.getAttribute('position');
      let maxRadiusSq = 0;
      if (posAttr) {
        for (let i = 0; i < posAttr.count; i++) {
          vTmp.fromBufferAttribute(posAttr, i).sub(center);
          const dSq = vTmp.lengthSq();
          if (dSq > maxRadiusSq) maxRadiusSq = dSq;
        }
      }
      const radius = Math.max(Math.sqrt(maxRadiusSq), 0.42);

      const mat = new THREE.MeshStandardMaterial({
        color: item.defaultColor,
        roughness: Math.min(0.5, Math.max(0.28, item.roughness * 0.82)),
        metalness: Math.max(0.12, item.metalness),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(-center.x, -center.y, -center.z);
      scene.add(mesh);

      // Guaranteed full-frustum fit with 28% breathing margin around the outermost corner
      const dist = (radius / halfFovSin) * 1.28;
      const viewDir = FRONTAL_PREVIEW_KINDS.has(item.kind) ? frontalDir : baseDir;
      camera.position.copy(viewDir).multiplyScalar(dist);
      camera.lookAt(0, 0, 0);

      renderer.clear();
      renderer.render(scene, camera);
      result[item.kind] = renderer.domElement.toDataURL('image/png');

      scene.remove(mesh);
      geo.dispose();
      mat.dispose();
    }

    renderer.dispose();
    renderer.forceContextLoss();
  } catch {
    // Graceful empty fallback if WebGL context unavailable
  }

  cachedThumbnails = result;
  return result;
}
