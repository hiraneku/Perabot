import * as THREE from 'three';
import { CsgBooleanMode } from '../types/studio';

const CSG_EPSILON = 1e-5;
const MAX_BSP_DEPTH = 44;

const COPLANAR = 0;
const FRONT = 1;
const BACK = 2;
const SPANNING = 3;

interface CSGVertex {
  pos: THREE.Vector3;
  normal: THREE.Vector3;
  uv: THREE.Vector2;
}

interface CSGPlane {
  normal: THREE.Vector3;
  w: number;
}

interface CSGPolygon {
  vertices: CSGVertex[];
  plane: CSGPlane;
}

function cloneVertex(v: CSGVertex): CSGVertex {
  return {
    pos: v.pos.clone(),
    normal: v.normal.clone(),
    uv: v.uv.clone(),
  };
}

function flipVertex(v: CSGVertex): CSGVertex {
  return {
    pos: v.pos.clone(),
    normal: v.normal.clone().negate(),
    uv: v.uv.clone(),
  };
}

function interpolateVertex(a: CSGVertex, b: CSGVertex, t: number): CSGVertex {
  const pos = a.pos.clone().lerp(b.pos, t);
  const normal = a.normal.clone().lerp(b.normal, t);
  if (normal.lengthSq() > 1e-10) {
    normal.normalize();
  }
  const uv = a.uv.clone().lerp(b.uv, t);
  return { pos, normal, uv };
}

function planeFromPoints(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3
): CSGPlane | null {
  const ab = b.clone().sub(a);
  const ac = c.clone().sub(a);
  const n = ab.cross(ac);
  const lenSq = n.lengthSq();
  if (lenSq < 1e-12) return null;
  n.multiplyScalar(1 / Math.sqrt(lenSq));
  return {
    normal: n,
    w: n.dot(a),
  };
}

function clonePolygon(p: CSGPolygon): CSGPolygon {
  return {
    vertices: p.vertices.map(cloneVertex),
    plane: {
      normal: p.plane.normal.clone(),
      w: p.plane.w,
    },
  };
}

function flipPolygon(p: CSGPolygon): void {
  p.vertices.reverse();
  for (let i = 0; i < p.vertices.length; i++) {
    p.vertices[i] = flipVertex(p.vertices[i]);
  }
  p.plane.normal.negate();
  p.plane.w = -p.plane.w;
}

function splitPolygonByPlane(
  plane: CSGPlane,
  polygon: CSGPolygon,
  coplanarFront: CSGPolygon[],
  coplanarBack: CSGPolygon[],
  front: CSGPolygon[],
  back: CSGPolygon[]
): void {
  let polygonType = 0;
  const types: number[] = [];

  for (let i = 0; i < polygon.vertices.length; i++) {
    const t = plane.normal.dot(polygon.vertices[i].pos) - plane.w;
    const type =
      t < -CSG_EPSILON ? BACK : t > CSG_EPSILON ? FRONT : COPLANAR;
    polygonType |= type;
    types.push(type);
  }

  switch (polygonType) {
    case COPLANAR: {
      if (plane.normal.dot(polygon.plane.normal) > 0) {
        coplanarFront.push(polygon);
      } else {
        coplanarBack.push(polygon);
      }
      break;
    }
    case FRONT: {
      front.push(polygon);
      break;
    }
    case BACK: {
      back.push(polygon);
      break;
    }
    case SPANNING: {
      const f: CSGVertex[] = [];
      const b: CSGVertex[] = [];
      const len = polygon.vertices.length;
      for (let i = 0; i < len; i++) {
        const j = (i + 1) % len;
        const ti = types[i];
        const tj = types[j];
        const vi = polygon.vertices[i];
        const vj = polygon.vertices[j];
        if (ti !== BACK) f.push(cloneVertex(vi));
        if (ti !== FRONT) b.push(cloneVertex(vi));
        if ((ti | tj) === SPANNING) {
          const edge = vj.pos.clone().sub(vi.pos);
          const denom = plane.normal.dot(edge);
          if (Math.abs(denom) > 1e-12) {
            const t = Math.max(
              0,
              Math.min(1, (plane.w - plane.normal.dot(vi.pos)) / denom)
            );
            const vMid = interpolateVertex(vi, vj, t);
            f.push(vMid);
            b.push(cloneVertex(vMid));
          }
        }
      }
      if (f.length >= 3) {
        const pf = planeFromPoints(f[0].pos, f[1].pos, f[2].pos) ?? {
          normal: polygon.plane.normal.clone(),
          w: polygon.plane.w,
        };
        front.push({ vertices: f, plane: pf });
      }
      if (b.length >= 3) {
        const pb = planeFromPoints(b[0].pos, b[1].pos, b[2].pos) ?? {
          normal: polygon.plane.normal.clone(),
          w: polygon.plane.w,
        };
        back.push({ vertices: b, plane: pb });
      }
      break;
    }
  }
}

class BSPNode {
  public plane: CSGPlane | null = null;
  public front: BSPNode | null = null;
  public back: BSPNode | null = null;
  public polygons: CSGPolygon[] = [];

  constructor(polygons?: CSGPolygon[], depth = 0) {
    if (polygons && polygons.length > 0) {
      this.build(polygons, depth);
    }
  }

  public clone(): BSPNode {
    const node = new BSPNode();
    node.plane = this.plane
      ? { normal: this.plane.normal.clone(), w: this.plane.w }
      : null;
    node.front = this.front ? this.front.clone() : null;
    node.back = this.back ? this.back.clone() : null;
    node.polygons = this.polygons.map(clonePolygon);
    return node;
  }

  public invert(): void {
    for (let i = 0; i < this.polygons.length; i++) {
      flipPolygon(this.polygons[i]);
    }
    if (this.plane) {
      this.plane.normal.negate();
      this.plane.w = -this.plane.w;
    }
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    const tmp = this.front;
    this.front = this.back;
    this.back = tmp;
  }

  public clipPolygons(polygons: CSGPolygon[]): CSGPolygon[] {
    if (!this.plane) return polygons.slice();
    let front: CSGPolygon[] = [];
    let back: CSGPolygon[] = [];
    for (let i = 0; i < polygons.length; i++) {
      splitPolygonByPlane(
        this.plane,
        polygons[i],
        front,
        back,
        front,
        back
      );
    }
    if (this.front) {
      front = this.front.clipPolygons(front);
    }
    if (this.back) {
      back = this.back.clipPolygons(back);
    } else {
      back = [];
    }
    return front.concat(back);
  }

  public clipTo(bsp: BSPNode): void {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back) this.back.clipTo(bsp);
  }

  public allPolygons(): CSGPolygon[] {
    let list = this.polygons.slice();
    if (this.front) list = list.concat(this.front.allPolygons());
    if (this.back) list = list.concat(this.back.allPolygons());
    return list;
  }

  public build(polygons: CSGPolygon[], depth = 0): void {
    if (polygons.length === 0) return;
    if (depth >= MAX_BSP_DEPTH) {
      for (const p of polygons) this.polygons.push(p);
      return;
    }

    if (!this.plane) {
      // Pick midpoint polygon as splitter to keep BSP balanced on curved meshes
      const midIdx = Math.floor(polygons.length * 0.5);
      this.plane = {
        normal: polygons[midIdx].plane.normal.clone(),
        w: polygons[midIdx].plane.w,
      };
    }

    const front: CSGPolygon[] = [];
    const back: CSGPolygon[] = [];
    for (let i = 0; i < polygons.length; i++) {
      splitPolygonByPlane(
        this.plane,
        polygons[i],
        this.polygons,
        this.polygons,
        front,
        back
      );
    }

    if (front.length > 0) {
      if (!this.front) this.front = new BSPNode();
      this.front.build(front, depth + 1);
    }
    if (back.length > 0) {
      if (!this.back) this.back = new BSPNode();
      this.back.build(back, depth + 1);
    }
  }
}

function geometryToCSGPolygons(
  geometry: THREE.BufferGeometry,
  matrix?: THREE.Matrix4
): CSGPolygon[] {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  if (matrix) {
    nonIndexed.applyMatrix4(matrix);
  }
  if (!nonIndexed.getAttribute('normal')) {
    nonIndexed.computeVertexNormals();
  }

  const pos = nonIndexed.getAttribute('position');
  const norm = nonIndexed.getAttribute('normal');
  const uv = nonIndexed.getAttribute('uv');
  const triCount = Math.floor(pos.count / 3);
  const polygons: CSGPolygon[] = [];

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const i1 = i0 + 1;
    const i2 = i0 + 2;

    const p0 = new THREE.Vector3(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
    const p1 = new THREE.Vector3(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
    const p2 = new THREE.Vector3(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

    const plane = planeFromPoints(p0, p1, p2);
    if (!plane) continue;

    const n0 = norm
      ? new THREE.Vector3(norm.getX(i0), norm.getY(i0), norm.getZ(i0)).normalize()
      : plane.normal.clone();
    const n1 = norm
      ? new THREE.Vector3(norm.getX(i1), norm.getY(i1), norm.getZ(i1)).normalize()
      : plane.normal.clone();
    const n2 = norm
      ? new THREE.Vector3(norm.getX(i2), norm.getY(i2), norm.getZ(i2)).normalize()
      : plane.normal.clone();

    const u0 = uv ? new THREE.Vector2(uv.getX(i0), uv.getY(i0)) : new THREE.Vector2(0, 0);
    const u1 = uv ? new THREE.Vector2(uv.getX(i1), uv.getY(i1)) : new THREE.Vector2(1, 0);
    const u2 = uv ? new THREE.Vector2(uv.getX(i2), uv.getY(i2)) : new THREE.Vector2(0, 1);

    polygons.push({
      vertices: [
        { pos: p0, normal: n0, uv: u0 },
        { pos: p1, normal: n1, uv: u1 },
        { pos: p2, normal: n2, uv: u2 },
      ],
      plane,
    });
  }

  nonIndexed.dispose();
  return polygons;
}

function csgPolygonsToGeometry(polygons: CSGPolygon[]): THREE.BufferGeometry {
  let triCount = 0;
  for (const poly of polygons) {
    if (poly.vertices.length >= 3) {
      triCount += poly.vertices.length - 2;
    }
  }

  const positions = new Float32Array(triCount * 9);
  const normals = new Float32Array(triCount * 9);
  const uvs = new Float32Array(triCount * 6);

  let pIdx = 0;
  let nIdx = 0;
  let uIdx = 0;

  for (const poly of polygons) {
    const verts = poly.vertices;
    if (verts.length < 3) continue;
    const v0 = verts[0];
    for (let i = 1; i < verts.length - 1; i++) {
      const v1 = verts[i];
      const v2 = verts[i + 1];

      // Skip zero-area sliver triangles
      const areaCheck = v1.pos
        .clone()
        .sub(v0.pos)
        .cross(v2.pos.clone().sub(v0.pos))
        .lengthSq();
      if (areaCheck < 1e-12) continue;

      for (const v of [v0, v1, v2]) {
        positions[pIdx++] = v.pos.x;
        positions[pIdx++] = v.pos.y;
        positions[pIdx++] = v.pos.z;

        normals[nIdx++] = v.normal.x;
        normals[nIdx++] = v.normal.y;
        normals[nIdx++] = v.normal.z;

        uvs[uIdx++] = v.uv.x;
        uvs[uIdx++] = v.uv.y;
      }
    }
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute(
    'position',
    new THREE.BufferAttribute(positions.subarray(0, pIdx), 3)
  );
  out.setAttribute(
    'normal',
    new THREE.BufferAttribute(normals.subarray(0, nIdx), 3)
  );
  out.setAttribute(
    'uv',
    new THREE.BufferAttribute(uvs.subarray(0, uIdx), 2)
  );
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/**
 * Executes a deterministic 3D solid Boolean CSG operation (`subtract`, `union`, or `intersect`)
 * between `geomA` (in local coordinates) and `geomB` (transformed by `relativeMatrixB` into A's local space).
 */
export function performBooleanCSG(
  geomA: THREE.BufferGeometry,
  geomB: THREE.BufferGeometry,
  relativeMatrixB: THREE.Matrix4,
  mode: CsgBooleanMode
): THREE.BufferGeometry {
  const polysA = geometryToCSGPolygons(geomA);
  const polysB = geometryToCSGPolygons(geomB, relativeMatrixB);

  if (polysA.length === 0) return geomA.clone();
  if (polysB.length === 0) return geomA.clone();

  const a = new BSPNode(polysA);
  const b = new BSPNode(polysB);

  let resultPolys: CSGPolygon[];

  if (mode === 'union') {
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    resultPolys = a.allPolygons();
  } else if (mode === 'subtract') {
    a.invert();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    a.invert();
    resultPolys = a.allPolygons();
  } else {
    // 'intersect'
    a.invert();
    b.clipTo(a);
    b.invert();
    a.clipTo(b);
    b.clipTo(a);
    a.build(b.allPolygons());
    a.invert();
    resultPolys = a.allPolygons();
  }

  if (resultPolys.length === 0) {
    // Fallback if user subtracted/intersected disjoint volume that emptied everything:
    // return an empty minimal geometry or keep non-crashing empty BufferGeometry
    const empty = new THREE.BufferGeometry();
    empty.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    empty.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(0), 3));
    empty.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(0), 2));
    return empty;
  }

  return csgPolygonsToGeometry(resultPolys);
}
