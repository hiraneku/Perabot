import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PrimitiveKind, ShapeSubcategory } from '../types/studio';

export interface ArchPrimitiveMeta {
  kind: PrimitiveKind;
  label: string;
  subtitle: string;
  description: string;
  subcategory: Exclude<ShapeSubcategory, 'all'>;
  defaultColor: string;
  roughness: number;
  metalness: number;
}

function toNonIndexedSafe(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.index) return geo;
  const nonIdx = geo.toNonIndexed();
  geo.dispose();
  return nonIdx;
}

/**
 * Normalizes any indexed or non-indexed geometry into a clean BufferGeometry with
 * valid unit normals, UVs, and bounding box, stripping any degenerate 0-area triangles.
 */
function finalizeGeo(
  geo: THREE.BufferGeometry,
  flatShade = false
): THREE.BufferGeometry {
  const raw = flatShade ? toNonIndexedSafe(geo) : geo;

  // Strip degenerate zero-area triangles if non-indexed, or sanitize normals if indexed
  if (!raw.index) {
    const pos = raw.getAttribute('position');
    const hasNorm = Boolean(raw.getAttribute('normal')) && !flatShade;
    const oldNorm = raw.getAttribute('normal');
    const cleanPos: number[] = [];
    const cleanNorm: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const cross = new THREE.Vector3();

    for (let t = 0; t < pos.count; t += 3) {
      a.fromBufferAttribute(pos, t);
      b.fromBufferAttribute(pos, t + 1);
      c.fromBufferAttribute(pos, t + 2);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      cross.crossVectors(ab, ac);
      if (cross.lengthSq() < 1e-12) continue;

      cleanPos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      if (hasNorm && oldNorm) {
        for (let k = 0; k < 3; k++) {
          const nx = oldNorm.getX(t + k);
          const ny = oldNorm.getY(t + k);
          const nz = oldNorm.getZ(t + k);
          const len = Math.hypot(nx, ny, nz);
          if (len > 1e-4) {
            cleanNorm.push(nx / len, ny / len, nz / len);
          } else {
            cross.normalize();
            cleanNorm.push(cross.x, cross.y, cross.z);
          }
        }
      } else {
        cross.normalize();
        cleanNorm.push(
          cross.x, cross.y, cross.z,
          cross.x, cross.y, cross.z,
          cross.x, cross.y, cross.z
        );
      }
    }

    raw.dispose();
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(cleanPos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(cleanNorm, 3));
    const uvs = new Float32Array((cleanPos.length / 3) * 2);
    for (let i = 0; i < cleanPos.length / 3; i++) {
      uvs[i * 2] = cleanPos[i * 3] + 0.5;
      uvs[i * 2 + 1] = cleanPos[i * 3 + 1] + 0.5;
    }
    out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    out.computeBoundingBox();
    out.computeBoundingSphere();
    return out;
  }

  if (!raw.getAttribute('normal')) {
    raw.computeVertexNormals();
  }
  const norm = raw.getAttribute('normal');
  const pos = raw.getAttribute('position');
  for (let i = 0; i < norm.count; i++) {
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-4) {
      norm.setXYZ(i, nx / len, ny / len, nz / len);
    } else {
      // Polar apex fallback: point outward along Y or radial
      const py = pos.getY(i);
      norm.setXYZ(i, 0, py >= 0 ? 1 : -1, 0);
    }
  }

  if (!raw.getAttribute('uv')) {
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = pos.getX(i) + 0.5;
      uvs[i * 2 + 1] = pos.getY(i) + 0.5;
    }
    raw.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  raw.computeBoundingBox();
  raw.computeBoundingSphere();
  return raw;
}

/**
 * Extrudes a 2D THREE.Shape centered along Z in [-depth/2, +depth/2]
 */
function extrudeCenteredZ(
  shape: THREE.Shape,
  depth: number,
  curveSegments = 24,
  flatShade = false
): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments,
    steps: 1,
  });
  geo.translate(0, 0, -depth * 0.5);
  return finalizeGeo(geo, flatShade);
}

/**
 * Extrudes a 2D footprint in XZ upward along Y in [-height/2, +height/2]
 */
function extrudeFootprintY(
  shape: THREE.Shape,
  height = 1.0,
  curveSegments = 24,
  flatShade = false
): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments,
    steps: 1,
  });
  // Extrude is in XY extruded +Z -> rotateX(-pi/2) maps (x, y, z) -> (x, z, -y)
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -height * 0.5, 0);
  return finalizeGeo(geo, flatShade);
}

/**
 * Extrudes a YZ cross-section profile along X in [-width/2, +width/2]
 */
function extrudeProfileAlongX(
  shape: THREE.Shape,
  width = 1.0,
  curveSegments = 24,
  flatShade = false
): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: false,
    curveSegments,
    steps: 1,
  });
  // Rotate +Z extrusion to +X: (x_2d -> -z, y_2d -> y, z_ext -> x)
  geo.rotateY(Math.PI / 2);
  geo.translate(-width * 0.5, 0, 0);
  return finalizeGeo(geo, flatShade);
}

function createRegularPrism(sides: number, radius = 0.5, height = 1.0): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius, radius, height, sides, 1, false);
  // Align one flat edge parallel to Z/X nicely
  geo.rotateY(Math.PI / sides);
  return finalizeGeo(geo, true);
}

function createRegularPyramid(sides: number, radius = 0.52, height = 1.0): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(radius, height, sides, 1, false);
  geo.rotateY(Math.PI / sides);
  return finalizeGeo(geo, true);
}

function createPyramidFrustum(): THREE.BufferGeometry {
  // 4-sided truncated square pyramid: bottom 1.0x1.0 -> top 0.52x0.52
  const rBottom = 0.5 * Math.SQRT2;
  const rTop = 0.26 * Math.SQRT2;
  const geo = new THREE.CylinderGeometry(rTop, rBottom, 1.0, 4, 1, false);
  geo.rotateY(Math.PI / 4);
  return finalizeGeo(geo, true);
}

function createTrapezoidalPrism(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.26, 0.5);
  s.lineTo(-0.26, 0.5);
  s.closePath();
  return extrudeCenteredZ(s, 1.0, 4, true);
}

function createDomeGeometry(): THREE.BufferGeometry {
  // Lathe profile: sealed flat bottom center -> drum base -> high architectural dome -> apex
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0, -0.42),
    new THREE.Vector2(0.5, -0.42),
    new THREE.Vector2(0.5, -0.28),
  ];
  const segs = 22;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * (Math.PI / 2);
    const r = Math.cos(t) * 0.48;
    const y = -0.28 + Math.sin(t) * 0.7;
    pts.push(new THREE.Vector2(Math.max(0, r), y));
  }
  const geo = new THREE.LatheGeometry(pts, 40);
  return finalizeGeo(geo, false);
}

function createTorusGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(0.35, 0.15, 24, 44);
  geo.rotateX(Math.PI / 2);
  return finalizeGeo(geo, false);
}

function createTorusSegmentGeometry(): THREE.BufferGeometry {
  const R = 0.34;
  const r = 0.14;
  const arc = Math.PI * 0.75; // 135 deg elbow
  const radialSegs = 22;
  const tubularSegs = 28;

  const tube = new THREE.TorusGeometry(R, r, radialSegs, tubularSegs, arc);

  // Seal start cap at u = 0 (center (R, 0, 0), tangent points +Y, so outward normal points -Y)
  const capStart = new THREE.CircleGeometry(r, radialSegs);
  capStart.rotateX(Math.PI / 2); // default +Z -> -Y? rotateX(+pi/2) maps (0,0,1) -> (0,-1,0)!
  capStart.translate(R, 0, 0);

  // Seal end cap at u = arc (center (R*cos(arc), R*sin(arc), 0), outward tangent (+ -sin(arc), cos(arc), 0))
  const capEnd = new THREE.CircleGeometry(r, radialSegs);
  // Orient CircleGeometry (+Z normal) to tangent (-sin(arc), cos(arc), 0)
  const qEnd = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(-Math.sin(arc), Math.cos(arc), 0)
  );
  capEnd.applyQuaternion(qEnd);
  capEnd.translate(R * Math.cos(arc), R * Math.sin(arc), 0);

  const merged = mergeGeometries([tube.toNonIndexed(), capStart.toNonIndexed(), capEnd.toNonIndexed()], false);
  tube.dispose();
  capStart.dispose();
  capEnd.dispose();

  merged.rotateX(Math.PI / 2);
  merged.center();
  return finalizeGeo(merged, false);
}

function createQuarterCylinderGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.absarc(-0.5, -0.5, 1.0, 0, Math.PI / 2, false);
  s.closePath();
  return extrudeFootprintY(s, 1.0, 28, false);
}

function createQuarterSphereGeometry(): THREE.BufferGeometry {
  // 1/4 sphere: upper hemisphere front half (y >= 0, z >= 0), radius 0.5, shifted to center nicely
  const R = 0.5;
  const segW = 28;
  const segH = 18;

  // Spherical patch: phi in [0, pi] (front +Z half: x = -R cos phi, y = R cos theta, z = R sin theta sin phi)
  const dome = new THREE.SphereGeometry(R, segW, segH, 0, Math.PI, 0, Math.PI / 2);
  // Note: Three.js SphereGeometry(R, w, h, phiStart=0, phiLength=PI, thetaStart=0, thetaLength=PI/2):
  // x = -R * cos(phi) * sin(theta), y = R * cos(theta), z = R * sin(phi) * sin(theta)
  // For phi in [0, PI] and theta in [0, PI/2]: y in [0, R], z in [0, R], x in [-R, R]!

  // Flat bottom semicircular cap at y = 0 (z >= 0), outward normal (0, -1, 0)
  const bottomShape = new THREE.Shape();
  bottomShape.moveTo(-R, 0);
  bottomShape.absarc(0, 0, R, Math.PI, 0, true); // clockwise from (-R,0) via (0,+R) to (+R,0)
  bottomShape.closePath();
  // Build semicircle in XY with y_2d >= 0: absarc(0, 0, R, 0, PI, false) is CCW in XY (+Z normal)
  const semiBottom = new THREE.Shape();
  semiBottom.moveTo(R, 0);
  semiBottom.absarc(0, 0, R, 0, Math.PI, false);
  semiBottom.closePath();
  const bottomGeo = new THREE.ShapeGeometry(semiBottom, segW);
  // Rotate +Z normal to -Y normal while mapping (x, y_2d, 0) -> (x, 0, +y_2d):
  // rotateX(+PI/2) maps (x, y, z) -> (x, -z, y), so normal (0,0,1) -> (0,-1,0) and y_2d>=0 -> z>=0!
  bottomGeo.rotateX(Math.PI / 2);

  // Flat back semicircular wall at z = 0 (y >= 0), outward normal (0, 0, -1)
  const semiBack = new THREE.Shape();
  semiBack.moveTo(R, 0);
  semiBack.absarc(0, 0, R, 0, Math.PI, false);
  semiBack.closePath();
  const backGeo = new THREE.ShapeGeometry(semiBack, segW);
  // Currently in XY with y>=0 and normal (0,0,+1); rotateY(PI) maps (x,y,0) -> (-x,y,0) and normal -> (0,0,-1)!
  backGeo.rotateY(Math.PI);

  const merged = mergeGeometries(
    [dome.toNonIndexed(), bottomGeo.toNonIndexed(), backGeo.toNonIndexed()],
    false
  );
  dome.dispose();
  bottomGeo.dispose();
  backGeo.dispose();

  merged.translate(0, -0.25, -0.2);
  return finalizeGeo(merged, false);
}

function createAnnularCylinder(
  outerR: number,
  innerR: number,
  height: number,
  segs = 36
): THREE.BufferGeometry {
  const hh = height * 0.5;
  // Bottom-to-top around outer wall, then top-to-bottom down inner wall = outward CCW normals!
  const pts = [
    new THREE.Vector2(innerR, -hh),
    new THREE.Vector2(outerR, -hh),
    new THREE.Vector2(outerR, hh),
    new THREE.Vector2(innerR, hh),
    new THREE.Vector2(innerR, -hh),
  ];
  const geo = new THREE.LatheGeometry(pts, segs);
  return finalizeGeo(geo, false);
}

function createHollowBoxGeometry(): THREE.BufferGeometry {
  const outer = new THREE.Shape();
  outer.moveTo(-0.5, -0.5);
  outer.lineTo(0.5, -0.5);
  outer.lineTo(0.5, 0.5);
  outer.lineTo(-0.5, 0.5);
  outer.closePath();

  const inner = new THREE.Path();
  const r = 0.34;
  inner.moveTo(-r, -r);
  inner.lineTo(-r, r);
  inner.lineTo(r, r);
  inner.lineTo(r, -r);
  inner.closePath();
  outer.holes.push(inner);

  return extrudeFootprintY(outer, 1.0, 4, true);
}

function createArchGeometry(): THREE.BufferGeometry {
  // Roman semicircular arch block: width 1.0, height 1.0, depth 0.44, arch opening radius 0.30
  const s = new THREE.Shape();
  const r = 0.30;
  const springY = -0.06;
  s.moveTo(-0.5, -0.5);
  s.lineTo(-r, -0.5);
  s.lineTo(-r, springY);
  // Clockwise arc from PI to 0 goes OVER the top (-r -> 0,+r -> +r) keeping interior on left of CCW boundary!
  s.absarc(0, springY, r, Math.PI, 0, true);
  s.lineTo(r, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.5, 0.5);
  s.lineTo(-0.5, 0.5);
  s.closePath();
  return extrudeCenteredZ(s, 0.44, 28, false);
}

function createRoundedBoxGeometry(
  sx = 1.0,
  sy = 0.64,
  sz = 0.78,
  radius = 0.12
): THREE.BufferGeometry {
  const segs = 14;
  const geo = new THREE.BoxGeometry(sx, sy, sz, segs, segs, segs).toNonIndexed();
  const pos = geo.getAttribute('position');
  const norm = geo.getAttribute('normal');

  const hx = Math.max(0.01, sx * 0.5 - radius);
  const hy = Math.max(0.01, sy * 0.5 - radius);
  const hz = Math.max(0.01, sz * 0.5 - radius);
  const v = new THREE.Vector3();
  const core = new THREE.Vector3();
  const delta = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    core.set(
      Math.max(-hx, Math.min(hx, v.x)),
      Math.max(-hy, Math.min(hy, v.y)),
      Math.max(-hz, Math.min(hz, v.z))
    );
    delta.subVectors(v, core);
    if (delta.lengthSq() > 1e-10) {
      delta.normalize();
    } else {
      delta.set(0, 1, 0);
    }
    pos.setXYZ(
      i,
      core.x + delta.x * radius,
      core.y + delta.y * radius,
      core.z + delta.z * radius
    );
    norm.setXYZ(i, delta.x, delta.y, delta.z);
  }
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createBeveledRectPrismGeometry(): THREE.BufferGeometry {
  // Beveled rectangular prism 1.0 x 0.60 x 0.76 via chamfered octagonal-like 3D solid
  const ax = 0.5, ay = 0.30, az = 0.38;
  const b = 0.09;
  const bx = ax - b, by = ay - b, bz = az - b;

  const positions: number[] = [];
  const emitTri = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => {
    const cross = new THREE.Vector3().subVectors(p2, p1).cross(new THREE.Vector3().subVectors(p3, p1));
    if (cross.dot(p1) >= 0) {
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    } else {
      positions.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z);
    }
  };
  const emitQuad = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3) => {
    emitTri(p1, p2, p3);
    emitTri(p1, p3, p4);
  };

  // 6 Main Faces
  for (const s of [-1, 1]) {
    emitQuad(
      new THREE.Vector3(s * ax, -by, -bz),
      new THREE.Vector3(s * ax, by, -bz),
      new THREE.Vector3(s * ax, by, bz),
      new THREE.Vector3(s * ax, -by, bz)
    );
    emitQuad(
      new THREE.Vector3(-bx, s * ay, -bz),
      new THREE.Vector3(bx, s * ay, -bz),
      new THREE.Vector3(bx, s * ay, bz),
      new THREE.Vector3(-bx, s * ay, bz)
    );
    emitQuad(
      new THREE.Vector3(-bx, -by, s * az),
      new THREE.Vector3(bx, -by, s * az),
      new THREE.Vector3(bx, by, s * az),
      new THREE.Vector3(-bx, by, s * az)
    );
  }

  // 12 Edge Chamfers
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      emitQuad(
        new THREE.Vector3(-bx, sy * ay, sz * bz),
        new THREE.Vector3(bx, sy * ay, sz * bz),
        new THREE.Vector3(bx, sy * by, sz * az),
        new THREE.Vector3(-bx, sy * by, sz * az)
      );
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      emitQuad(
        new THREE.Vector3(sx * ax, -by, sz * bz),
        new THREE.Vector3(sx * ax, by, sz * bz),
        new THREE.Vector3(sx * bx, by, sz * az),
        new THREE.Vector3(sx * bx, -by, sz * az)
      );
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      emitQuad(
        new THREE.Vector3(sx * ax, sy * by, -bz),
        new THREE.Vector3(sx * ax, sy * by, bz),
        new THREE.Vector3(sx * bx, sy * ay, bz),
        new THREE.Vector3(sx * bx, sy * ay, -bz)
      );
    }
  }

  // 8 Corner Triangles
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        emitTri(
          new THREE.Vector3(sx * ax, sy * by, sz * bz),
          new THREE.Vector3(sx * bx, sy * ay, sz * bz),
          new THREE.Vector3(sx * bx, sy * by, sz * az)
        );
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return finalizeGeo(geo, true);
}

function createLShapedBlock(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const t = 0.4;
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.5, -0.5 + t);
  s.lineTo(-0.5 + t, -0.5 + t);
  s.lineTo(-0.5 + t, 0.5);
  s.lineTo(-0.5, 0.5);
  s.closePath();
  return extrudeFootprintY(s, 1.0, 4, true);
}

function createTShapedBlock(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const hw = 0.19;
  s.moveTo(-hw, -0.5);
  s.lineTo(hw, -0.5);
  s.lineTo(hw, 0.12);
  s.lineTo(0.5, 0.12);
  s.lineTo(0.5, 0.5);
  s.lineTo(-0.5, 0.5);
  s.lineTo(-0.5, 0.12);
  s.lineTo(-hw, 0.12);
  s.closePath();
  return extrudeFootprintY(s, 1.0, 4, true);
}

function createCrossShapedBlock(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const hw = 0.18;
  s.moveTo(-hw, -0.5);
  s.lineTo(hw, -0.5);
  s.lineTo(hw, -hw);
  s.lineTo(0.5, -hw);
  s.lineTo(0.5, hw);
  s.lineTo(hw, hw);
  s.lineTo(hw, 0.5);
  s.lineTo(-hw, 0.5);
  s.lineTo(-hw, hw);
  s.lineTo(-0.5, hw);
  s.lineTo(-0.5, -hw);
  s.lineTo(-hw, -hw);
  s.closePath();
  return extrudeFootprintY(s, 1.0, 4, true);
}

function createStairGeometry(steps = 4): THREE.BufferGeometry {
  // Side profile in YZ (x_2d -> -z, y_2d -> y)
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  const stepW = 1.0 / steps;
  const stepH = 1.0 / steps;
  for (let i = 0; i < steps; i++) {
    const xCurr = 0.5 - i * stepW;
    const yNext = -0.5 + (i + 1) * stepH;
    const xNext = 0.5 - (i + 1) * stepW;
    s.lineTo(xCurr, yNext);
    s.lineTo(xNext, yNext);
  }
  s.closePath();
  return extrudeProfileAlongX(s, 1.0, 4, true);
}

function createRampGeometry(): THREE.BufferGeometry {
  // Gentle 22-degree driveway/access ramp (height 0.40 over length 1.0)
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.2);
  s.lineTo(0.5, -0.2);
  s.lineTo(0.5, 0.2);
  s.lineTo(-0.5, -0.16);
  s.closePath();
  return extrudeProfileAlongX(s, 1.0, 4, true);
}

function createGutterGeometry(): THREE.BufferGeometry {
  // Thin-walled U-shaped trough open on top, extruded along X
  const outerR = 0.44;
  const innerR = 0.35;
  const s = new THREE.Shape();
  // Outer arc from (+outerR, +0.18) down around bottom to (-outerR, +0.18)
  s.moveTo(-outerR, 0.18);
  s.absarc(0, 0.08, outerR, Math.PI, Math.PI * 2, false);
  s.lineTo(outerR, 0.18);
  s.lineTo(innerR, 0.18);
  s.absarc(0, 0.08, innerR, Math.PI * 2, Math.PI, true);
  s.lineTo(-innerR, 0.18);
  s.closePath();
  return extrudeProfileAlongX(s, 1.0, 28, false);
}

function createHalfPipeGeometry(): THREE.BufferGeometry {
  // Solid block base with smooth semicircular concave channel on top
  const s = new THREE.Shape();
  const r = 0.36;
  s.moveTo(-0.5, -0.32);
  s.lineTo(0.5, -0.32);
  s.lineTo(0.5, 0.24);
  s.lineTo(r, 0.24);
  s.absarc(0, 0.24, r, 0, Math.PI, true); // CW dip down to (0, 0.24 - r = -0.12)
  s.lineTo(-0.5, 0.24);
  s.closePath();
  return extrudeProfileAlongX(s, 1.0, 28, false);
}

function createRoundedCylinderGeometry(): THREE.BufferGeometry {
  // Bottom-to-top Lathe profile for outward CCW normals
  const R = 0.5;
  const rf = 0.14;
  const hh = 0.5;
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -hh)];
  const arcSegs = 10;
  // Bottom fillet: angle from -PI/2 up to 0
  for (let i = 0; i <= arcSegs; i++) {
    const a = -(Math.PI / 2) * (1 - i / arcSegs);
    pts.push(new THREE.Vector2(R - rf + Math.cos(a) * rf, -hh + rf + Math.sin(a) * rf));
  }
  // Top fillet: angle from 0 up to +PI/2
  for (let i = 0; i <= arcSegs; i++) {
    const a = (Math.PI / 2) * (i / arcSegs);
    pts.push(new THREE.Vector2(R - rf + Math.cos(a) * rf, hh - rf + Math.sin(a) * rf));
  }
  pts.push(new THREE.Vector2(0, hh));
  const geo = new THREE.LatheGeometry(pts, 40);
  return finalizeGeo(geo, false);
}

function createEllipticalCylinderGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 36);
  geo.scale(1.0, 1.0, 0.62);
  geo.computeVertexNormals();
  return finalizeGeo(geo, false);
}

function createTriangularWedgeGeometry(): THREE.BufferGeometry {
  // Right-triangular corner tetrahedron: vertices (-0.5,-0.5,-0.5), (+0.5,-0.5,-0.5), (-0.5,-0.5,+0.5), (-0.5,+0.5,-0.5)
  const A = new THREE.Vector3(-0.5, -0.5, -0.5);
  const B = new THREE.Vector3(0.5, -0.5, -0.5);
  const C = new THREE.Vector3(-0.5, -0.5, 0.5);
  const D = new THREE.Vector3(-0.5, 0.5, -0.5);
  const interior = new THREE.Vector3(-0.25, -0.25, -0.25);

  const positions: number[] = [];
  const pushFace = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => {
    const cross = new THREE.Vector3().subVectors(p2, p1).cross(new THREE.Vector3().subVectors(p3, p1));
    const out = new THREE.Vector3().subVectors(p1, interior);
    if (cross.dot(out) >= 0) {
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    } else {
      positions.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z);
    }
  };

  pushFace(A, B, C); // bottom
  pushFace(A, B, D); // back -Z
  pushFace(A, C, D); // left -X
  pushFace(B, C, D); // sloped diagonal face

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return finalizeGeo(geo, true);
}

function createTrapezoidalWedgeGeometry(): THREE.BufferGeometry {
  // Sloped wedge rising to a flat top landing plateau
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.5, 0.5);
  s.lineTo(0.05, 0.5);
  s.closePath();
  return extrudeProfileAlongX(s, 1.0, 4, true);
}

function createCurvedWedgeGeometry(): THREE.BufferGeometry {
  // Smooth S-curve ogee ramp rising from (-0.5, -0.5) to (+0.5, +0.5)
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.5, 0.5);
  const segs = 24;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs; // 0 at top (+0.5,+0.5) -> 1 at toe (-0.5,-0.5)
    const x = 0.5 - t;
    const y = -0.5 + 0.5 * (1 + Math.cos(Math.PI * t));
    s.lineTo(x, y);
  }
  s.closePath();
  return extrudeProfileAlongX(s, 1.0, 24, false);
}

function createChamferedPrismGeometry(): THREE.BufferGeometry {
  const c = 0.2;
  const s = new THREE.Shape();
  s.moveTo(-0.5 + c, -0.5);
  s.lineTo(0.5 - c, -0.5);
  s.lineTo(0.5, -0.5 + c);
  s.lineTo(0.5, 0.5 - c);
  s.lineTo(0.5 - c, 0.5);
  s.lineTo(-0.5 + c, 0.5);
  s.lineTo(-0.5, 0.5 - c);
  s.lineTo(-0.5, -0.5 + c);
  s.closePath();
  return extrudeFootprintY(s, 1.0, 4, true);
}

function createMiteredCornerGeometry(): THREE.BufferGeometry {
  // 45-degree mitered frame/molding corner joint (two beveled legs meeting at 45 deg miter)
  const s = new THREE.Shape();
  const w = 0.30;
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.5 - w * 0.5, -0.5 + w);
  s.lineTo(-0.5 + w, -0.5 + w);
  s.lineTo(-0.5 + w, 0.5 - w * 0.5);
  s.lineTo(-0.5, 0.5);
  s.closePath();
  return extrudeFootprintY(s, 0.36, 4, true);
}

function createSpiralColumnGeometry(): THREE.BufferGeometry {
  // True Solomonic / Barley-Twist helical column with sealed caps
  const radialSegs = 28;
  const heightSegs = 56;
  const baseR = 0.30;
  const twistTurns = 2.5;
  const orbitR = 0.065;

  const positions: number[] = [];
  const uvs: number[] = [];

  const ringPoint = (iy: number, ir: number): THREE.Vector3 => {
    const v = iy / heightSegs;
    const y = -0.5 + v;
    const twist = v * twistTurns * Math.PI * 2;
    const theta = (ir / radialSegs) * Math.PI * 2;
    // Rope fluting + helical centerline offset
    const flute = 1 + 0.08 * Math.cos(4 * (theta - twist));
    const r = baseR * flute;
    const cx = orbitR * Math.cos(twist);
    const cz = orbitR * Math.sin(twist);
    return new THREE.Vector3(cx + r * Math.cos(theta), y, cz + r * Math.sin(theta));
  };

  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ir = 0; ir < radialSegs; ir++) {
      const p00 = ringPoint(iy, ir);
      const p10 = ringPoint(iy, ir + 1);
      const p01 = ringPoint(iy + 1, ir);
      const p11 = ringPoint(iy + 1, ir + 1);

      // Outward radial direction from column center at this height
      const vMid = (iy + 0.5) / heightSegs;
      const twMid = vMid * twistTurns * Math.PI * 2;
      const centerMid = new THREE.Vector3(
        orbitR * Math.cos(twMid),
        -0.5 + vMid,
        orbitR * Math.sin(twMid)
      );

      const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
        const cross = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
        const out = new THREE.Vector3().subVectors(a, centerMid);
        out.y = 0;
        if (cross.dot(out) >= 0) {
          positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        } else {
          positions.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
        }
        uvs.push(0, 0, 1, 0, 0.5, 1);
      };

      pushTri(p00, p10, p11);
      pushTri(p00, p11, p01);
    }
  }

  // Bottom cap (iy = 0, normal -Y) & Top cap (iy = heightSegs, normal +Y)
  const botCenter = new THREE.Vector3(orbitR, -0.5, 0);
  const topTwist = twistTurns * Math.PI * 2;
  const topCenter = new THREE.Vector3(
    orbitR * Math.cos(topTwist),
    0.5,
    orbitR * Math.sin(topTwist)
  );

  for (let ir = 0; ir < radialSegs; ir++) {
    const b0 = ringPoint(0, ir);
    const b1 = ringPoint(0, ir + 1);
    // For -Y outward normal: (b1 - botCenter) x (b0 - botCenter) check
    const cBot = new THREE.Vector3().subVectors(b0, botCenter).cross(new THREE.Vector3().subVectors(b1, botCenter));
    if (cBot.y <= 0) {
      positions.push(botCenter.x, botCenter.y, botCenter.z, b0.x, b0.y, b0.z, b1.x, b1.y, b1.z);
    } else {
      positions.push(botCenter.x, botCenter.y, botCenter.z, b1.x, b1.y, b1.z, b0.x, b0.y, b0.z);
    }
    uvs.push(0.5, 0.5, 0, 0, 1, 0);

    const t0 = ringPoint(heightSegs, ir);
    const t1 = ringPoint(heightSegs, ir + 1);
    const cTop = new THREE.Vector3().subVectors(t0, topCenter).cross(new THREE.Vector3().subVectors(t1, topCenter));
    if (cTop.y >= 0) {
      positions.push(topCenter.x, topCenter.y, topCenter.z, t0.x, t0.y, t0.z, t1.x, t1.y, t1.z);
    } else {
      positions.push(topCenter.x, topCenter.y, topCenter.z, t1.x, t1.y, t1.z, t0.x, t0.y, t0.z);
    }
    uvs.push(0.5, 0.5, 0, 0, 1, 0);
  }

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  indexed.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  indexed.computeVertexNormals();
  return finalizeGeo(indexed, false);
}

function createFlutedColumnGeometry(): THREE.BufferGeometry {
  // Classical Greek column with 16 concave vertical flutes
  const flutes = 16;
  const segsPerFlute = 4;
  const totalSegs = flutes * segsPerFlute;
  const s = new THREE.Shape();
  const baseR = 0.40;
  const fluteDepth = 0.032;

  for (let i = 0; i <= totalSegs; i++) {
    const theta = (i / totalSegs) * Math.PI * 2;
    const localPhase = ((i % segsPerFlute) / segsPerFlute) * Math.PI;
    const groove = Math.sin(localPhase) * fluteDepth;
    const r = baseR - groove;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return extrudeFootprintY(s, 1.0, totalSegs, false);
}

function createColumnBaseGeometry(): THREE.BufferGeometry {
  // Attic column base: square plinth + molded torus/scotia rings (bottom-to-top Lathe)
  const plinth = toNonIndexedSafe(new THREE.BoxGeometry(0.96, 0.14, 0.96));
  plinth.translate(0, -0.15, 0);

  const pts = [
    new THREE.Vector2(0, -0.08),
    new THREE.Vector2(0.43, -0.08),
    new THREE.Vector2(0.46, -0.02),
    new THREE.Vector2(0.45, 0.06),
    new THREE.Vector2(0.38, 0.12),
    new THREE.Vector2(0.41, 0.18),
    new THREE.Vector2(0.37, 0.22),
    new THREE.Vector2(0, 0.22),
  ];
  const molded = toNonIndexedSafe(new THREE.LatheGeometry(pts, 36));
  molded.computeVertexNormals();

  const merged = mergeGeometries([plinth, molded], false);
  plinth.dispose();
  molded.dispose();
  return finalizeGeo(merged, false);
}

function createColumnCapitalGeometry(): THREE.BufferGeometry {
  // Classical Doric/Tuscan capital: top square abacus + flaring echinus + necking ring (bottom-to-top Lathe)
  const abacus = toNonIndexedSafe(new THREE.BoxGeometry(0.96, 0.14, 0.96));
  abacus.translate(0, 0.16, 0);

  const pts = [
    new THREE.Vector2(0, -0.22),
    new THREE.Vector2(0.36, -0.22),
    new THREE.Vector2(0.36, -0.14),
    new THREE.Vector2(0.39, -0.10),
    new THREE.Vector2(0.37, -0.06),
    new THREE.Vector2(0.44, 0.02),
    new THREE.Vector2(0.46, 0.09),
    new THREE.Vector2(0, 0.09),
  ];
  const echinus = toNonIndexedSafe(new THREE.LatheGeometry(pts, 36));
  echinus.computeVertexNormals();

  const merged = mergeGeometries([abacus, echinus], false);
  abacus.dispose();
  echinus.dispose();
  return finalizeGeo(merged, false);
}

function createCorniceGeometry(): THREE.BufferGeometry {
  // Classical projecting crown cornice extruded along X
  const s = new THREE.Shape();
  s.moveTo(-0.24, -0.26); // back bottom
  s.lineTo(-0.08, -0.26);
  s.lineTo(-0.08, -0.16);
  s.lineTo(0.02, -0.12);
  // Cyma S-curve outward to top drip edge
  s.bezierCurveTo(0.06, -0.02, 0.18, 0.02, 0.22, 0.14);
  s.lineTo(0.26, 0.14);
  s.lineTo(0.26, 0.26); // top crown fascia
  s.lineTo(-0.24, 0.26); // back top
  s.closePath();
  return extrudeProfileAlongX(s, 1.0, 20, false);
}

function createMoldingProfileGeometry(): THREE.BufferGeometry {
  // Decorative baseboard / dado ogee molding extruded along X
  const s = new THREE.Shape();
  s.moveTo(-0.14, -0.25);
  s.lineTo(0.14, -0.25);
  s.lineTo(0.14, -0.06);
  s.bezierCurveTo(0.14, 0.04, 0.03, 0.06, 0.03, 0.15);
  s.absarc(-0.02, 0.18, 0.05, 0, Math.PI * 0.9, false);
  s.lineTo(-0.14, 0.25);
  s.closePath();
  return extrudeProfileAlongX(s, 1.0, 20, false);
}

function createWallNicheGeometry(): THREE.BufferGeometry {
  // Solid rear backing wall + front wall with arched alcove cutout
  const backWall = toNonIndexedSafe(new THREE.BoxGeometry(1.0, 1.0, 0.14));
  backWall.translate(0, 0, -0.16);

  const frontShape = new THREE.Shape();
  frontShape.moveTo(-0.5, -0.5);
  frontShape.lineTo(0.5, -0.5);
  frontShape.lineTo(0.5, 0.5);
  frontShape.lineTo(-0.5, 0.5);
  frontShape.closePath();

  // Arched alcove hole inside front wall
  const hole = new THREE.Path();
  const hr = 0.27;
  const sillY = -0.34;
  const springY = 0.08;
  hole.moveTo(-hr, sillY);
  hole.lineTo(-hr, springY);
  hole.absarc(0, springY, hr, Math.PI, 0, true);
  hole.lineTo(hr, sillY);
  hole.closePath();
  frontShape.holes.push(hole);

  const frontAlcove = toNonIndexedSafe(
    new THREE.ExtrudeGeometry(frontShape, {
      depth: 0.32,
      bevelEnabled: false,
      curveSegments: 24,
    })
  );
  frontAlcove.translate(0, 0, -0.09);
  frontAlcove.computeVertexNormals();

  const merged = mergeGeometries([backWall, frontAlcove], false);
  backWall.dispose();
  frontAlcove.dispose();
  return finalizeGeo(merged, false);
}

function createWindowFrameGeometry(): THREE.BufferGeometry {
  // Outer casement frame with 4 open window panes (cross mullions)
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.5, 0.5);
  s.lineTo(-0.5, 0.5);
  s.closePath();

  const f = 0.10; // outer frame width
  const m = 0.032; // half mullion thickness

  const addPaneHole = (x0: number, y0: number, x1: number, y1: number) => {
    const h = new THREE.Path();
    // CW hole
    h.moveTo(x0, y0);
    h.lineTo(x0, y1);
    h.lineTo(x1, y1);
    h.lineTo(x1, y0);
    h.closePath();
    s.holes.push(h);
  };

  addPaneHole(-0.5 + f, -0.5 + f, -m, -m);
  addPaneHole(m, -0.5 + f, 0.5 - f, -m);
  addPaneHole(-0.5 + f, m, -m, 0.5 - f);
  addPaneHole(m, m, 0.5 - f, 0.5 - f);

  return extrudeCenteredZ(s, 0.16, 4, true);
}

function createDoorFrameGeometry(): THREE.BufferGeometry {
  // Inverted-U door jamb + lintel header open at bottom
  const w = 0.88;
  const hw = w * 0.5;
  const jamb = 0.11;
  const header = 0.13;

  const s = new THREE.Shape();
  s.moveTo(-hw, -0.5);
  s.lineTo(-hw + jamb, -0.5);
  s.lineTo(-hw + jamb, 0.5 - header);
  s.lineTo(hw - jamb, 0.5 - header);
  s.lineTo(hw - jamb, -0.5);
  s.lineTo(hw, -0.5);
  s.lineTo(hw, 0.5);
  s.lineTo(-hw, 0.5);
  s.closePath();

  return extrudeCenteredZ(s, 0.20, 4, true);
}

export function createNewArchitecturalGeometry(
  kind: PrimitiveKind
): THREE.BufferGeometry | null {
  switch (kind) {
    case 'rectangular-prism':
      return finalizeGeo(new THREE.BoxGeometry(1.0, 0.56, 0.70), true);
    case 'triangular-prism':
      return createRegularPrism(3, 0.55, 1.0);
    case 'trapezoidal-prism':
      return createTrapezoidalPrism();
    case 'pentagonal-prism':
      return createRegularPrism(5, 0.50, 1.0);
    case 'hexagonal-prism':
      return createRegularPrism(6, 0.50, 1.0);
    case 'octagonal-prism':
      return createRegularPrism(8, 0.50, 1.0);
    case 'pyramid-frustum':
      return createPyramidFrustum();
    case 'triangular-pyramid':
      return createRegularPyramid(3, 0.56, 1.0);
    case 'pentagonal-pyramid':
      return createRegularPyramid(5, 0.52, 1.0);
    case 'hexagonal-pyramid':
      return createRegularPyramid(6, 0.52, 1.0);

    case 'dome':
      return createDomeGeometry();
    case 'torus':
      return createTorusGeometry();
    case 'torus-segment':
      return createTorusSegmentGeometry();
    case 'capsule':
      return finalizeGeo(new THREE.CapsuleGeometry(0.30, 0.40, 16, 32), false);
    case 'ellipsoid': {
      const g = new THREE.SphereGeometry(0.5, 36, 24);
      g.scale(1.0, 0.62, 0.76);
      g.computeVertexNormals();
      return finalizeGeo(g, false);
    }
    case 'quarter-cylinder':
      return createQuarterCylinderGeometry();
    case 'quarter-sphere':
      return createQuarterSphereGeometry();
    case 'hollow-cylinder':
      return createAnnularCylinder(0.50, 0.30, 1.0, 36);
    case 'hollow-box':
      return createHollowBoxGeometry();
    case 'pipe':
      return createAnnularCylinder(0.33, 0.26, 1.0, 36);
    case 'arch':
      return createArchGeometry();
    case 'rounded-box':
      return createRoundedBoxGeometry(1.0, 0.64, 0.78, 0.12);
    case 'l-shaped-block':
      return createLShapedBlock();
    case 't-shaped-block':
      return createTShapedBlock();
    case 'cross-shaped-block':
      return createCrossShapedBlock();
    case 'plane':
      return finalizeGeo(new THREE.BoxGeometry(1.0, 0.018, 1.0), true);
    case 'thin-slab':
      return finalizeGeo(new THREE.BoxGeometry(1.0, 0.12, 1.0), true);
    case 'stair':
      return createStairGeometry(4);
    case 'ramp':
      return createRampGeometry();
    case 'gutter':
      return createGutterGeometry();
    case 'half-pipe':
      return createHalfPipeGeometry();
    case 'octagonal-cylinder':
      return createRegularPrism(8, 0.40, 1.0);
    case 'beveled-rectangular-prism':
      return createBeveledRectPrismGeometry();
    case 'rounded-cylinder':
      return createRoundedCylinderGeometry();
    case 'elliptical-cylinder':
      return createEllipticalCylinderGeometry();
    case 'triangular-wedge':
      return createTriangularWedgeGeometry();
    case 'trapezoidal-wedge':
      return createTrapezoidalWedgeGeometry();
    case 'curved-wedge':
      return createCurvedWedgeGeometry();
    case 'chamfered-prism':
      return createChamferedPrismGeometry();
    case 'mitered-corner':
      return createMiteredCornerGeometry();
    case 'conical-frustum':
      return finalizeGeo(new THREE.CylinderGeometry(0.24, 0.50, 1.0, 36), false);
    case 'ring-cylinder':
      return createAnnularCylinder(0.50, 0.32, 0.24, 36);
    case 'spiral-column':
      return createSpiralColumnGeometry();
    case 'fluted-column':
      return createFlutedColumnGeometry();
    case 'column-base':
      return createColumnBaseGeometry();
    case 'column-capital':
      return createColumnCapitalGeometry();
    case 'cornice':
      return createCorniceGeometry();
    case 'molding-profile':
      return createMoldingProfileGeometry();
    case 'wall-niche':
      return createWallNicheGeometry();
    case 'window-frame':
      return createWindowFrameGeometry();
    case 'door-frame':
      return createDoorFrameGeometry();
    default:
      return null;
  }
}

export const ARCHITECTURAL_SHAPES_CATALOG: ArchPrimitiveMeta[] = [
  // --- Balok, Pelat & Blok Sambungan ---
  {
    kind: 'rectangular-prism',
    label: 'Rectangular Prism',
    subtitle: 'Balok persegi panjang',
    description:
      'Prisma balok memanjang proporsional untuk balok induk, batu bata besar, meja kopi, kasur, dan dinding pendek.',
    subcategory: 'blocks',
    defaultColor: '#e2e8f0',
    roughness: 0.72,
    metalness: 0.05,
  },
  {
    kind: 'rounded-box',
    label: 'Rounded Box',
    subtitle: 'Kotak panjang sudut halus',
    description:
      'Balok persegi panjang dengan rusuk dan sudut membulat lembut (fillet). Ideal untuk bantal sofa, kabinet modern, dan perangkat elektronik.',
    subcategory: 'blocks',
    defaultColor: '#93c5fd',
    roughness: 0.46,
    metalness: 0.08,
  },
  {
    kind: 'beveled-rectangular-prism',
    label: 'Beveled Rectangular Prism',
    subtitle: 'Balok panjang tepi chamfer',
    description:
      'Balok persegi panjang dengan ke-12 rusuk terpotong miring 45° (chamfer). Cocok untuk daun meja kayu, batu taman potongan, dan panel pintu.',
    subcategory: 'blocks',
    defaultColor: '#cbd5e1',
    roughness: 0.58,
    metalness: 0.12,
  },
  {
    kind: 'plane',
    label: 'Plane',
    subtitle: 'Bidang lembaran tipis',
    description:
      'Bidang datar super tipis untuk kaca jendela, karpet lantai, cermin dinding, permukaan air kolam, atau kanvas dekorasi.',
    subcategory: 'blocks',
    defaultColor: '#bae6fd',
    roughness: 0.25,
    metalness: 0.1,
  },
  {
    kind: 'thin-slab',
    label: 'Thin Slab',
    subtitle: 'Pelat dak / papan tipis',
    description:
      'Pelat beton atau papan kayu tipis untuk dak lantai bertingkat, ambalan rak dinding, kanopi teras, dan pijakan taman.',
    subcategory: 'blocks',
    defaultColor: '#cbd5e1',
    roughness: 0.75,
    metalness: 0.06,
  },
  {
    kind: 'hollow-box',
    label: 'Hollow Box',
    subtitle: 'Kotak berongga tembus',
    description:
      'Kotak empat dinding dengan rongga persegi tembus di tengah. Praktis untuk pot tanaman kotak, cerobong asap, sumur cahaya, atau bingkai rak.',
    subcategory: 'blocks',
    defaultColor: '#94a3b8',
    roughness: 0.74,
    metalness: 0.08,
  },
  {
    kind: 'l-shaped-block',
    label: 'L-Shaped Block',
    subtitle: 'Balok siku huruf L',
    description:
      'Blok sudut berbentuk huruf L untuk pertemuan dua dinding 90°, meja kerja sudut, dapur letter-L, dan sofa sudut.',
    subcategory: 'blocks',
    defaultColor: '#d6d3d1',
    roughness: 0.7,
    metalness: 0.05,
  },
  {
    kind: 't-shaped-block',
    label: 'T-Shaped Block',
    subtitle: 'Balok pertigaan huruf T',
    description:
      'Blok sambungan berbentuk huruf T untuk pertemuan dinding sekat ruangan dengan dinding utama atau struktur balok T.',
    subcategory: 'blocks',
    defaultColor: '#d6d3d1',
    roughness: 0.7,
    metalness: 0.05,
  },
  {
    kind: 'cross-shaped-block',
    label: 'Cross-Shaped Block',
    subtitle: 'Balok perempatan silang +',
    description:
      'Blok struktural berbentuk tanda tambah (+) untuk pilar kolom silang atau pertemuan empat sekat ruangan sekaligus.',
    subcategory: 'blocks',
    defaultColor: '#cbd5e1',
    roughness: 0.7,
    metalness: 0.06,
  },

  // --- Prisma & Limas ---
  {
    kind: 'triangular-prism',
    label: 'Triangular Prism',
    subtitle: 'Prisma segitiga tegak',
    description:
      'Prisma beralas segitiga sama sisi tegak untuk kolom sudut artistik, rangka kuda-kuda, dan meja segitiga.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#f59e0b',
    roughness: 0.64,
    metalness: 0.08,
  },
  {
    kind: 'trapezoidal-prism',
    label: 'Trapezoidal Prism',
    subtitle: 'Prisma penampang trapesium',
    description:
      'Prisma dengan alas lebar yang menyempit rata ke atas (trapesium). Cocok untuk tanggul, fondasi batu kali, atau atap mansard.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#d97706',
    roughness: 0.68,
    metalness: 0.06,
  },
  {
    kind: 'pentagonal-prism',
    label: 'Pentagonal Prism',
    subtitle: 'Prisma segi lima',
    description:
      'Prisma beraturan bersegi lima tegas untuk paviliun unik, pot geometris, dan elemen dekoratif modern.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#a78bfa',
    roughness: 0.62,
    metalness: 0.08,
  },
  {
    kind: 'hexagonal-prism',
    label: 'Hexagonal Prism',
    subtitle: 'Prisma segi enam',
    description:
      'Prisma segi enam (heksagonal) presisi untuk lantai gazebo, ubin sarang lebah, meja segi enam, dan pilar klasik.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#818cf8',
    roughness: 0.62,
    metalness: 0.08,
  },
  {
    kind: 'octagonal-prism',
    label: 'Octagonal Prism',
    subtitle: 'Prisma segi delapan',
    description:
      'Prisma segi delapan tegas untuk menara arsitektur, ruang segi delapan, dan umpak tiang besar.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#60a5fa',
    roughness: 0.62,
    metalness: 0.1,
  },
  {
    kind: 'chamfered-prism',
    label: 'Chamfered Prism',
    subtitle: 'Balok sudut vertikal potong 45°',
    description:
      'Balok tegak yang keempat sudut vertikalnya dipotong miring 45° sementara alas dan atasnya tetap rata. Sangat pas untuk kolom beton gedung.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#94a3b8',
    roughness: 0.66,
    metalness: 0.1,
  },
  {
    kind: 'pyramid-frustum',
    label: 'Pyramid Frustum',
    subtitle: 'Limas terpancung puncak rata',
    description:
      'Limas segi empat dengan bagian puncak terpotong datar. Ideal untuk umpak pondasi tiang rumah panggung, kap lampu, atau atap joglo/mansard.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#e07a5f',
    roughness: 0.66,
    metalness: 0.06,
  },
  {
    kind: 'triangular-pyramid',
    label: 'Triangular Pyramid',
    subtitle: 'Limas alas segitiga (Tetrahedron)',
    description:
      'Limas berwajah empat segitiga untuk aksen atap tajam, ornamen kristal geometris, dan penutup sudut.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#fb923c',
    roughness: 0.62,
    metalness: 0.08,
  },
  {
    kind: 'pentagonal-pyramid',
    label: 'Pentagonal Pyramid',
    subtitle: 'Limas segi lima',
    description:
      'Limas dengan alas segi lima beraturan untuk atap menara dan kubah faset dekoratif.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#f472b6',
    roughness: 0.64,
    metalness: 0.08,
  },
  {
    kind: 'hexagonal-pyramid',
    label: 'Hexagonal Pyramid',
    subtitle: 'Limas segi enam (Atap Gazebo)',
    description:
      'Limas segi enam beraturan yang langsung pas di atas Hexagonal Prism untuk membuat atap gazebo taman atau menara klasik.',
    subcategory: 'prisms-pyramids',
    defaultColor: '#e879f9',
    roughness: 0.64,
    metalness: 0.08,
  },

  // --- Wedge Tambahan, Tangga & Ramp ---
  {
    kind: 'stair',
    label: 'Stair',
    subtitle: 'Anak tangga 4 tingkat',
    description:
      'Modul anak tangga 4 pijakan utuh presisi. Susun berurutan ke atas untuk membuat tangga rumah, teras depan, atau tribun.',
    subcategory: 'wedges',
    defaultColor: '#d4a373',
    roughness: 0.65,
    metalness: 0.05,
  },
  {
    kind: 'ramp',
    label: 'Ramp',
    subtitle: 'Tanjakan landai garasi',
    description:
      'Bidang miring bersudut landai (~22°) yang nyaman untuk tanjakan mobil garasi, jalur kursi roda, atau akses teras.',
    subcategory: 'wedges',
    defaultColor: '#94a3b8',
    roughness: 0.78,
    metalness: 0.05,
  },
  {
    kind: 'triangular-wedge',
    label: 'Triangular Wedge',
    subtitle: 'Baji sudut segitiga siku',
    description:
      'Baji sudut beralas segitiga siku-siku dengan satu bidang miring diagonal untuk pengisi sudut atap atau penyangga siku (gusset).',
    subcategory: 'wedges',
    defaultColor: '#e07a5f',
    roughness: 0.66,
    metalness: 0.05,
  },
  {
    kind: 'trapezoidal-wedge',
    label: 'Trapezoidal Wedge',
    subtitle: 'Baji miring berpuncak datar',
    description:
      'Tanjakan miring yang berakhir pada dek datar di bagian atas. Cocok untuk atap kombinasi dak maupun sandaran sofa miring.',
    subcategory: 'wedges',
    defaultColor: '#f28482',
    roughness: 0.66,
    metalness: 0.05,
  },
  {
    kind: 'curved-wedge',
    label: 'Curved Wedge',
    subtitle: 'Baji tanjakan lengkung S',
    description:
      'Baji dengan profil lengkung gelombang mulus (kurva S). Ideal untuk kursi santai ergonomis, seluncuran, dan atap lengkung modern.',
    subcategory: 'wedges',
    defaultColor: '#38bdf8',
    roughness: 0.5,
    metalness: 0.1,
  },

  // --- Silinder, Pipa, Torus, Kubah & Elipsoid ---
  {
    kind: 'dome',
    label: 'Dome',
    subtitle: 'Kubah arsitektur dengan drum',
    description:
      'Kubah tinggi klasik lengkap dengan cincin dasar (drum) bundar untuk atap masjid, observatorium, gazebo mewah, atau lampu gantung.',
    subcategory: 'cylinders',
    defaultColor: '#fbbf24',
    roughness: 0.38,
    metalness: 0.35,
  },
  {
    kind: 'capsule',
    label: 'Capsule',
    subtitle: 'Kapsul ujung membulat',
    description:
      'Silinder mulus dengan penutup setengah bola di kedua ujungnya. Cocok untuk bantal guling, sandaran tangan, tangki, dan kaki perabot retro.',
    subcategory: 'cylinders',
    defaultColor: '#60a5fa',
    roughness: 0.44,
    metalness: 0.12,
  },
  {
    kind: 'ellipsoid',
    label: 'Ellipsoid',
    subtitle: 'Bola lonjong 3 dimensi',
    description:
      'Bentuk oval tiga dimensi mulus untuk batu taman alami, bantal dekoratif, wastafel oval, atau tajuk pohon.',
    subcategory: 'cylinders',
    defaultColor: '#4ade80',
    roughness: 0.62,
    metalness: 0.06,
  },
  {
    kind: 'torus',
    label: 'Torus',
    subtitle: 'Cincin donat penuh',
    description:
      'Cincin bundar melingkar penuh (donat) untuk pelampung, bingkai lampu gantung melingkar, ban, atau ornamen taman.',
    subcategory: 'cylinders',
    defaultColor: '#f472b6',
    roughness: 0.42,
    metalness: 0.2,
  },
  {
    kind: 'torus-segment',
    label: 'Torus Segment',
    subtitle: 'Busur pipa lengkung tertutup',
    description:
      'Potongan busur cincin torus untuk sambungan siku pipa melengkung, pegangan pintu lengkung, atau sandaran kursi pipa.',
    subcategory: 'cylinders',
    defaultColor: '#cbd5e1',
    roughness: 0.32,
    metalness: 0.65,
  },
  {
    kind: 'quarter-cylinder',
    label: 'Quarter Cylinder',
    subtitle: 'Seperempat tabung 90°',
    description:
      'Potongan seperempat silinder bersudut 90° rata di kedua sisi belakang. Sempurna untuk meja resepsionis melengkung dan sudut balkon bundar.',
    subcategory: 'cylinders',
    defaultColor: '#a5b4fc',
    roughness: 0.55,
    metalness: 0.1,
  },
  {
    kind: 'quarter-sphere',
    label: 'Quarter Sphere',
    subtitle: 'Seperempat bola kubah sudut',
    description:
      'Seperempat kubah bola dengan alas dan punggung datar untuk kanopi jendela (awning), kubah apsis dinding, atau pojok membulat.',
    subcategory: 'cylinders',
    defaultColor: '#fda4af',
    roughness: 0.5,
    metalness: 0.1,
  },
  {
    kind: 'hollow-cylinder',
    label: 'Hollow Cylinder',
    subtitle: 'Tabung berlubang dinding tebal',
    description:
      'Silinder berlubang tengah berdinding tebal untuk bibir sumur, pot tanaman bundar besar, cincin beton, atau kap lampu tabung.',
    subcategory: 'cylinders',
    defaultColor: '#94a3b8',
    roughness: 0.68,
    metalness: 0.12,
  },
  {
    kind: 'pipe',
    label: 'Pipe',
    subtitle: 'Pipa bundar dinding tipis',
    description:
      'Pipa silinder berdinding tipis berlubang tembus untuk instalasi pipa air, pagar besi industrial, tiang jemuran, dan knalpot.',
    subcategory: 'cylinders',
    defaultColor: '#cbd5e1',
    roughness: 0.28,
    metalness: 0.78,
  },
  {
    kind: 'ring-cylinder',
    label: 'Ring Cylinder',
    subtitle: 'Cincin silinder pipih',
    description:
      'Cincin bundar pipih berlubang tengah (flange/ring) untuk sabuk tiang, dudukan lampu plafon, atau bingkai jam dinding.',
    subcategory: 'cylinders',
    defaultColor: '#e2e8f0',
    roughness: 0.38,
    metalness: 0.5,
  },
  {
    kind: 'conical-frustum',
    label: 'Conical Frustum',
    subtitle: 'Kerucut terpancung rata',
    description:
      'Kerucut dengan puncak terpotong datar. Sangat serbaguna untuk kap lampu meja, pot bunga klasik, ember, dan kaki kursi meruncing.',
    subcategory: 'cylinders',
    defaultColor: '#fdba74',
    roughness: 0.58,
    metalness: 0.08,
  },
  {
    kind: 'rounded-cylinder',
    label: 'Rounded Cylinder',
    subtitle: 'Silinder tepi membulat halus',
    description:
      'Silinder dengan tepi atas dan bawah ber-fillet lengkung halus untuk kursi puff bundar, bantalan duduk, atau tombol besar.',
    subcategory: 'cylinders',
    defaultColor: '#7dd3fc',
    roughness: 0.48,
    metalness: 0.08,
  },
  {
    kind: 'elliptical-cylinder',
    label: 'Elliptical Cylinder',
    subtitle: 'Silinder penampang lonjong',
    description:
      'Tabung tegak berpenampang elips/oval untuk meja makan oval, pilar aerodinamis modern, dan bak mandi berdiri.',
    subcategory: 'cylinders',
    defaultColor: '#c4b5fd',
    roughness: 0.52,
    metalness: 0.1,
  },
  {
    kind: 'octagonal-cylinder',
    label: 'Octagonal Cylinder',
    subtitle: 'Tiang silinder segi delapan',
    description:
      'Batang tiang ramping bersegi delapan untuk kolom teras, tiang lampu jalan klasik, dan kaki meja ukir.',
    subcategory: 'cylinders',
    defaultColor: '#cbd5e1',
    roughness: 0.58,
    metalness: 0.15,
  },
  {
    kind: 'gutter',
    label: 'Gutter',
    subtitle: 'Talang air cekung U',
    description:
      'Saluran talang berbentuk huruf U berdinding tipis untuk talang air hujan di tepi atap, saluran drainase, atau wadah tanaman memanjang.',
    subcategory: 'cylinders',
    defaultColor: '#94a3b8',
    roughness: 0.4,
    metalness: 0.55,
  },
  {
    kind: 'half-pipe',
    label: 'Half Pipe',
    subtitle: 'Blok saluran setengah pipa',
    description:
      'Blok dasar padat dengan cekungan setengah silinder memanjang di atasnya untuk parit taman, dudukan pipa, atau arena skate.',
    subcategory: 'cylinders',
    defaultColor: '#94a3b8',
    roughness: 0.68,
    metalness: 0.08,
  },

  // --- Elemen Arsitektur Klasik, Kolom, Lis & Kusen ---
  {
    kind: 'arch',
    label: 'Arch',
    subtitle: 'Gerbang lengkung Romawi',
    description:
      'Blok dinding dengan terowongan lengkung setengah lingkaran di bawahnya. Langsung siap untuk pintu gerbang klasik, arkade teras, dan jembatan.',
    subcategory: 'architecture',
    defaultColor: '#e7e5e4',
    roughness: 0.72,
    metalness: 0.04,
  },
  {
    kind: 'window-frame',
    label: 'Window Frame',
    subtitle: 'Kusen jendela 4 kisi',
    description:
      'Bingkai kusen jendela lengkap dengan palang tengah (mullion) dan 4 lubang kaca terbuka. Padukan dengan Plane kaca transparan!',
    subcategory: 'architecture',
    defaultColor: '#b77946',
    roughness: 0.56,
    metalness: 0.06,
  },
  {
    kind: 'door-frame',
    label: 'Door Frame',
    subtitle: 'Kusen pintu bukaan bawah',
    description:
      'Kusen pintu berbentuk U terbalik (tiang kiri-kanan dan ambang atas) dengan bukaan jalan tembus hingga ke lantai.',
    subcategory: 'architecture',
    defaultColor: '#a16207',
    roughness: 0.56,
    metalness: 0.06,
  },
  {
    kind: 'wall-niche',
    label: 'Wall Niche',
    subtitle: 'Dinding ceruk relung lengkung',
    description:
      'Blok dinding dengan relung cekung melengkung di sisi depan (alcove) untuk meletakkan lampu hias, vas bunga, atau patung.',
    subcategory: 'architecture',
    defaultColor: '#f5f5f4',
    roughness: 0.74,
    metalness: 0.04,
  },
  {
    kind: 'fluted-column',
    label: 'Fluted Column',
    subtitle: 'Tiang kolom beralur klasik',
    description:
      'Batang kolom klasik bergaya Yunani/Romawi dengan 16 alur cekung vertikal (flutes) mengelilingi tiang.',
    subcategory: 'architecture',
    defaultColor: '#f1f5f9',
    roughness: 0.65,
    metalness: 0.05,
  },
  {
    kind: 'spiral-column',
    label: 'Spiral Column',
    subtitle: 'Tiang kolom ulir pilin',
    description:
      'Kolom dekoratif berpilin heliks (Solomonic / barley-twist) untuk pilar fasad klasik mewah, kaki meja ukir, dan tiang kanopi.',
    subcategory: 'architecture',
    defaultColor: '#e2e8f0',
    roughness: 0.58,
    metalness: 0.08,
  },
  {
    kind: 'column-base',
    label: 'Column Base',
    subtitle: 'Umpak dasar tiang kolom',
    description:
      'Umpak kaki kolom klasik (plinth persegi + cincin torus bertingkat). Letakkan tepat di bawah Fluted Column atau Spiral Column.',
    subcategory: 'architecture',
    defaultColor: '#e2e8f0',
    roughness: 0.68,
    metalness: 0.05,
  },
  {
    kind: 'column-capital',
    label: 'Column Capital',
    subtitle: 'Kepala mahkota puncak kolom',
    description:
      'Kepala mahkota tiang kolom klasik (leher bundar + mangkuk echinus + pelat abacus persegi) sebagai penyangga balok atap di puncak kolom.',
    subcategory: 'architecture',
    defaultColor: '#e2e8f0',
    roughness: 0.68,
    metalness: 0.05,
  },
  {
    kind: 'cornice',
    label: 'Cornice',
    subtitle: 'Lis mahkota plafon / atap',
    description:
      'Profil lis mahkota bertingkat dengan lekukan cyma klasik yang menonjol ke depan untuk pertemuan dinding atas dengan plafon atau tepi atap.',
    subcategory: 'architecture',
    defaultColor: '#f8fafc',
    roughness: 0.66,
    metalness: 0.05,
  },
  {
    kind: 'molding-profile',
    label: 'Molding Profile',
    subtitle: 'Lis dinding / plint lantai ogee',
    description:
      'Lis profil dekoratif berlekuk ogee untuk plint bawah dinding (skirting), bingkai panel pintu klasik, atau tepi meja.',
    subcategory: 'architecture',
    defaultColor: '#f1f5f9',
    roughness: 0.62,
    metalness: 0.05,
  },
  {
    kind: 'mitered-corner',
    label: 'Mitered Corner',
    subtitle: 'Sudut profil adu manis 45°',
    description:
      'Potongan siku 90° dengan sambungan adu manis 45° untuk menyambung sudut kusen, lis plafon, atau bingkai meja secara rapi.',
    subcategory: 'architecture',
    defaultColor: '#e2e8f0',
    roughness: 0.64,
    metalness: 0.06,
  },
];
