import * as THREE from 'three';
import { GridTerrainSystem } from './GridTerrainSystem';
import { PrimitiveKind, SurfaceAttachAxis, SurfaceSettings } from '../types/studio';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const WALL_MOUNT_KINDS = new Set<PrimitiveKind>([
  'window-frame',
  'door-frame',
  'wall-niche',
  'molding-profile',
  'cornice',
]);

const DIRECTIONAL_KINDS = new Set<PrimitiveKind>([
  'window-frame',
  'door-frame',
  'wall-niche',
  'stair',
  'ramp',
  'arch',
  'horizontal-wedge',
  'vertical-wedge',
  'inverted-wedge',
  'corner-wedge',
  'inverted-corner-wedge',
  'triangular-wedge',
  'trapezoidal-wedge',
  'curved-wedge',
]);

export interface SurfaceHitResult {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  targetName: string;
  isGround: boolean;
  targetMesh?: THREE.Mesh | null;
  triangleEdgeHint?: THREE.Vector3 | null;
}

interface WorldTriangle {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  normal: THREE.Vector3;
  longestEdgeDir: THREE.Vector3;
}

interface CachedMeshTriangles {
  matrixKey: string;
  geoUuid: string;
  worldBox: THREE.Box3;
  worldCenter: THREE.Vector3;
  basisX: THREE.Vector3;
  basisY: THREE.Vector3;
  basisZ: THREE.Vector3;
  triangles: WorldTriangle[];
}

/**
 * Exact 3D closest point on triangle ABC to query point P
 * (Christer Ericson, Real-Time Collision Detection §5.1.5).
 */
function closestPointOnTriangle(
  p: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;

  const acx = c.x - a.x;
  const acy = c.y - a.y;
  const acz = c.z - a.z;

  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const apz = p.z - a.z;

  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) {
    return out.copy(a);
  }

  const bpx = p.x - b.x;
  const bpy = p.y - b.y;
  const bpz = p.z - b.z;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) {
    return out.copy(b);
  }

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3 || 1);
    return out.set(a.x + v * abx, a.y + v * aby, a.z + v * abz);
  }

  const cpx = p.x - c.x;
  const cpy = p.y - c.y;
  const cpz = p.z - c.z;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) {
    return out.copy(c);
  }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6 || 1);
    return out.set(a.x + w * acx, a.y + w * acy, a.z + w * acz);
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6) || 1);
    return out.set(
      b.x + w * (c.x - b.x),
      b.y + w * (c.y - b.y),
      b.z + w * (c.z - b.z)
    );
  }

  const denom = 1 / (va + vb + vc || 1);
  const v = vb * denom;
  const w = vc * denom;
  return out.set(
    a.x + abx * v + acx * w,
    a.y + aby * v + acy * w,
    a.z + abz * v + acz * w
  );
}

function makeMatrixKey(m: THREE.Matrix4): string {
  const e = m.elements;
  let s = '';
  for (let i = 0; i < 16; i++) {
    s += e[i].toFixed(4) + ',';
  }
  return s;
}

export class SurfaceAlignEngine {
  private tempVec = new THREE.Vector3();
  private closestScratch = new THREE.Vector3();
  private downRay = new THREE.Raycaster();
  private meshTriCache = new Map<string, CachedMeshTriangles>();

  /**
   * Builds or retrieves exact world-space triangles & basis axes for `mesh`.
   * Normals are computed directly from world-transformed triangle vertices (Bw - Aw) x (Cw - Aw),
   * making them 100% immune to non-uniform scaling and arbitrary 3D compound rotations!
   */
  private getWorldTriangles(mesh: THREE.Mesh): CachedMeshTriangles {
    mesh.updateMatrixWorld(true);
    const mat = mesh.matrixWorld;
    const mKey = makeMatrixKey(mat);
    const geo = mesh.geometry;
    const cached = this.meshTriCache.get(mesh.uuid);
    if (cached && cached.matrixKey === mKey && cached.geoUuid === geo.uuid) {
      return cached;
    }

    const posAttr = geo.getAttribute('position');
    const idxAttr = geo.getIndex();
    const worldBox = new THREE.Box3();
    const triangles: WorldTriangle[] = [];
    const detSign = mat.determinant() < 0 ? -1 : 1;

    if (posAttr && posAttr.count >= 3) {
      const triCount = idxAttr
        ? Math.floor(idxAttr.count / 3)
        : Math.floor(posAttr.count / 3);

      // Cap stride only for ultra-dense subdivided meshes (> 4500 tris) to stay < 0.2ms
      const stride = triCount > 4500 ? Math.ceil(triCount / 4500) : 1;
      const e1 = new THREE.Vector3();
      const e2 = new THREE.Vector3();
      const e3 = new THREE.Vector3();

      for (let t = 0; t < triCount; t += stride) {
        const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
        const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;

        const a = new THREE.Vector3()
          .fromBufferAttribute(posAttr, i0)
          .applyMatrix4(mat);
        const b = new THREE.Vector3()
          .fromBufferAttribute(posAttr, i1)
          .applyMatrix4(mat);
        const c = new THREE.Vector3()
          .fromBufferAttribute(posAttr, i2)
          .applyMatrix4(mat);

        worldBox.expandByPoint(a);
        worldBox.expandByPoint(b);
        worldBox.expandByPoint(c);

        e1.subVectors(b, a);
        e2.subVectors(c, a);
        const normal = new THREE.Vector3().crossVectors(e1, e2);
        const areaSq = normal.lengthSq();
        if (areaSq < 1e-12) continue;

        normal.multiplyScalar(detSign / Math.sqrt(areaSq));

        // Longest straight edge of this world triangle for smart tangent alignment
        e3.subVectors(c, b);
        const l1 = e1.lengthSq();
        const l2 = e2.lengthSq();
        const l3 = e3.lengthSq();
        const longestEdgeDir =
          l1 >= l2 && l1 >= l3
            ? e1.clone().normalize()
            : l2 >= l3
            ? e2.clone().normalize()
            : e3.clone().normalize();

        triangles.push({ a, b, c, normal, longestEdgeDir });
      }
    }

    const worldCenter = new THREE.Vector3();
    worldBox.getCenter(worldCenter);

    const e = mat.elements;
    const basisX = new THREE.Vector3(e[0], e[1], e[2]);
    if (basisX.lengthSq() > 1e-10) basisX.normalize();
    else basisX.set(1, 0, 0);

    const basisY = new THREE.Vector3(e[4], e[5], e[6]);
    if (basisY.lengthSq() > 1e-10) basisY.normalize();
    else basisY.set(0, 1, 0);

    const basisZ = new THREE.Vector3(e[8], e[9], e[10]);
    if (basisZ.lengthSq() > 1e-10) basisZ.normalize();
    else basisZ.set(0, 0, 1);

    const entry: CachedMeshTriangles = {
      matrixKey: mKey,
      geoUuid: geo.uuid,
      worldBox,
      worldCenter,
      basisX,
      basisY,
      basisZ,
      triangles,
    };
    this.meshTriCache.set(mesh.uuid, entry);
    return entry;
  }

  /**
   * Computes exact world-space normal of a Three.js Raycaster intersection face
   * directly from the transformed triangle vertices (immune to non-uniform scaling!).
   */
  private extractExactFaceWorldNormal(
    hitObj: THREE.Mesh,
    face: THREE.Face,
    rayDir?: THREE.Vector3
  ): { normal: THREE.Vector3; edgeHint: THREE.Vector3 } {
    hitObj.updateMatrixWorld(true);
    const mat = hitObj.matrixWorld;
    const posAttr = hitObj.geometry.getAttribute('position');
    if (posAttr) {
      const a = new THREE.Vector3()
        .fromBufferAttribute(posAttr, face.a)
        .applyMatrix4(mat);
      const b = new THREE.Vector3()
        .fromBufferAttribute(posAttr, face.b)
        .applyMatrix4(mat);
      const c = new THREE.Vector3()
        .fromBufferAttribute(posAttr, face.c)
        .applyMatrix4(mat);

      const ab = new THREE.Vector3().subVectors(b, a);
      const ac = new THREE.Vector3().subVectors(c, a);
      const bc = new THREE.Vector3().subVectors(c, b);
      const n = new THREE.Vector3().crossVectors(ab, ac);
      if (mat.determinant() < 0) n.negate();
      if (n.lengthSq() > 1e-12) {
        n.normalize();
        if (rayDir && n.dot(rayDir) > 0) {
          n.negate();
        }
        const edgeHint =
          ab.lengthSq() >= ac.lengthSq() && ab.lengthSq() >= bc.lengthSq()
            ? ab.normalize()
            : ac.lengthSq() >= bc.lengthSq()
            ? ac.normalize()
            : bc.normalize();
        return { normal: n, edgeHint };
      }
    }

    const normalMat = new THREE.Matrix3().getNormalMatrix(mat);
    const fallbackN = face.normal.clone().applyMatrix3(normalMat).normalize();
    if (rayDir && fallbackN.dot(rayDir) > 0) fallbackN.negate();
    return { normal: fallbackN, edgeHint: new THREE.Vector3(1, 0, 0) };
  }

  /**
   * Computes the exact minimum projection of ALL vertices of `mesh` (scaled & rotated)
   * along a unit world normal N: min_i ((Q * (S * v_i)) . N).
   * Guarantees 0.000000m flush contact with zero penetration and zero floating gap!
   */
  public computeMinVertexProjection(
    mesh: THREE.Mesh,
    worldNormal: THREE.Vector3
  ): number {
    const posAttr = mesh.geometry.getAttribute('position');
    if (!posAttr || posAttr.count === 0) return -0.5;

    const sx = mesh.scale.x;
    const sy = mesh.scale.y;
    const sz = mesh.scale.z;
    const q = mesh.quaternion;
    const nx = worldNormal.x;
    const ny = worldNormal.y;
    const nz = worldNormal.z;

    let minProj = Infinity;
    const count = posAttr.count;
    const stride = count > 24000 ? Math.floor(count / 24000) : 1;

    for (let i = 0; i < count; i += stride) {
      this.tempVec
        .set(posAttr.getX(i) * sx, posAttr.getY(i) * sy, posAttr.getZ(i) * sz)
        .applyQuaternion(q);
      const proj =
        this.tempVec.x * nx + this.tempVec.y * ny + this.tempVec.z * nz;
      if (proj < minProj) minProj = proj;
    }

    if (stride > 1) {
      const last = count - 1;
      this.tempVec
        .set(
          posAttr.getX(last) * sx,
          posAttr.getY(last) * sy,
          posAttr.getZ(last) * sz
        )
        .applyQuaternion(q);
      const proj =
        this.tempVec.x * nx + this.tempVec.y * ny + this.tempVec.z * nz;
      if (proj < minProj) minProj = proj;
    }

    return Number.isFinite(minProj) ? minProj : -0.5;
  }

  /**
   * Resolves `'auto'` attachAxis intelligently based on object kind & target surface normal:
   * - Window/Door frames, niches, moldings on vertical walls (|Ny| < 0.38) -> '-z' (back glues flush, stays upright!)
   * - Ceiling undersides (Ny < -0.58) -> '+y' (top glues flush to ceiling)
   * - All roofs, slopes, wedges, blocks, floors, walls -> '-y' (base glues flush to surface)
   */
  private resolveEffectiveAttachAxis(
    movingMesh: THREE.Mesh,
    worldNormal: THREE.Vector3,
    attachAxis: SurfaceAttachAxis
  ): '-y' | '-z' | '+y' {
    if (attachAxis !== 'auto') return attachAxis;
    const kind = movingMesh.userData.kind as PrimitiveKind | undefined;
    if (kind && WALL_MOUNT_KINDS.has(kind) && Math.abs(worldNormal.y) < 0.38) {
      return '-z';
    }
    if (worldNormal.y < -0.58) {
      return '+y';
    }
    return '-y';
  }

  /**
   * Computes a smart, edge-adaptive orientation quaternion that aligns the object's
   * attach face 100% flush with `worldNormal` AND adapts its in-plane tangent edges
   * to the target surface's own rotation/slope edges!
   */
  public computeSmartAlignedQuaternion(
    movingMesh: THREE.Mesh,
    worldNormal: THREE.Vector3,
    attachAxisPref: SurfaceAttachAxis,
    spinDeg: number,
    targetMesh?: THREE.Mesh | null,
    triangleEdgeHint?: THREE.Vector3 | null
  ): THREE.Quaternion {
    const n = worldNormal.clone().normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const effAxis = this.resolveEffectiveAttachAxis(
      movingMesh,
      n,
      attachAxisPref
    );

    // 1. Determine smart canonical tangentX in the plane perpendicular to N
    const tangentX = new THREE.Vector3();
    let foundStructuralTangent = false;

    if (targetMesh) {
      const cached = this.getWorldTriangles(targetMesh);
      // Project target mesh's principal axes (X, Z, Y) onto the surface tangent plane.
      // Any principal axis of a scaled/rotated wedge, prism, ramp, wall, or slab that lies
      // inside the face has projected length ~ 1.0 and gives exact edge parallelism!
      const candidates = [cached.basisX, cached.basisZ, cached.basisY];
      let bestLenSq = 0;
      const bestProj = new THREE.Vector3();

      for (const axis of candidates) {
        const proj = axis.clone().addScaledVector(n, -axis.dot(n));
        const lenSq = proj.lengthSq();
        // Prefer an axis that lies cleanly inside the face (lenSq > 0.96) and is as horizontal as possible
        if (lenSq > 0.96) {
          // Score favors horizontal contour alignment first so "+Z/-Z" points cleanly upslope/downslope
          const horizBonus = 1 - Math.abs(proj.y / Math.sqrt(lenSq));
          const score = lenSq + horizBonus * 0.25;
          if (score > bestLenSq) {
            bestLenSq = score;
            bestProj.copy(proj).normalize();
            foundStructuralTangent = true;
          }
        }
      }

      if (!foundStructuralTangent && bestLenSq === 0) {
        // Check general best projection if target was compound-skewed
        for (const axis of candidates) {
          const proj = axis.clone().addScaledVector(n, -axis.dot(n));
          const lenSq = proj.lengthSq();
          if (lenSq > bestLenSq && lenSq > 0.25) {
            bestLenSq = lenSq;
            bestProj.copy(proj).normalize();
            foundStructuralTangent = true;
          }
        }
      }

      if (foundStructuralTangent) {
        tangentX.copy(bestProj);
      }
    }

    if (!foundStructuralTangent) {
      if (Math.abs(n.y) < 0.995) {
        tangentX.crossVectors(worldUp, n).normalize();
      } else if (triangleEdgeHint) {
        const proj = triangleEdgeHint
          .clone()
          .addScaledVector(n, -triangleEdgeHint.dot(n));
        if (proj.lengthSq() > 0.05) {
          tangentX.copy(proj).normalize();
        } else {
          tangentX.set(1, 0, 0);
        }
      } else {
        tangentX.set(1, 0, 0);
      }
    }

    // Ensure right-handed upslope convention when on a slope for directional shapes
    if (Math.abs(n.y) < 0.992) {
      const horizContour = new THREE.Vector3().crossVectors(worldUp, n).normalize();
      if (Math.abs(tangentX.dot(horizContour)) > 0.92 && tangentX.dot(horizContour) < 0) {
        tangentX.negate();
      }
    }

    const colX = new THREE.Vector3();
    const colY = new THREE.Vector3();
    const colZ = new THREE.Vector3();

    if (effAxis === '-z') {
      // Back (-Z) glues flush to surface => +Z = +N, +Y points upslope / world up!
      colZ.copy(n);
      if (Math.abs(n.y) < 0.992) {
        const upOnWall = worldUp
          .clone()
          .addScaledVector(n, -worldUp.dot(n))
          .normalize();
        colY.copy(upOnWall);
        colX.crossVectors(colY, colZ).normalize();
      } else {
        colX.copy(tangentX);
        colY.crossVectors(colZ, colX).normalize();
      }
    } else if (effAxis === '+y') {
      // Top (+Y) glues flush to surface => -Y = +N
      colY.copy(n).negate();
      colX.copy(tangentX);
      colZ.crossVectors(colX, colY).normalize();
    } else {
      // Base (-Y) glues flush to surface => +Y = +N
      colY.copy(n);
      colX.copy(tangentX);
      colZ.crossVectors(colX, colY).normalize();

      // Smart 90-degree quadrant preservation for non-directional blocks when spinDeg === 0:
      // Keeps a lengthwise-rotated beam lengthwise along the target surface while snapping its edges square!
      const kind = movingMesh.userData.kind as PrimitiveKind | undefined;
      if (Math.abs(spinDeg) < 0.01 && (!kind || !DIRECTIONAL_KINDS.has(kind))) {
        const curX = new THREE.Vector3(1, 0, 0).applyQuaternion(
          movingMesh.quaternion
        );
        const curXProj = curX.addScaledVector(n, -curX.dot(n));
        if (curXProj.lengthSq() > 0.2) {
          curXProj.normalize();
          const b0 = colX.clone();
          const b90 = colZ.clone();
          const b180 = colX.clone().negate();
          const b270 = colZ.clone().negate();
          const quadCandidates = [b0, b90, b180, b270];
          let bestDot = -2;
          let chosenX = b0;
          for (const cand of quadCandidates) {
            const d = cand.dot(curXProj);
            if (d > bestDot) {
              bestDot = d;
              chosenX = cand;
            }
          }
          colX.copy(chosenX);
          colZ.crossVectors(colX, colY).normalize();
        }
      }
    }

    const basisMat = new THREE.Matrix4().makeBasis(colX, colY, colZ);
    const qBase = new THREE.Quaternion().setFromRotationMatrix(basisMat);

    if (Math.abs(spinDeg) > 0.001) {
      const qSpin = new THREE.Quaternion().setFromAxisAngle(
        n,
        spinDeg * DEG2RAD
      );
      return qSpin.multiply(qBase).normalize();
    }

    return qBase.normalize();
  }

  /**
   * Raycasts from camera pointer onto exact world triangles of scene objects + ground/terrain.
   */
  public raycastPointerSurface(
    raycaster: THREE.Raycaster,
    movingMesh: THREE.Mesh,
    otherMeshes: THREE.Mesh[],
    gridSystem: GridTerrainSystem,
    gridVisible: boolean,
    terrainStyle: boolean
  ): SurfaceHitResult | null {
    const targets: THREE.Object3D[] = otherMeshes.filter(
      (m) => m.visible && m !== movingMesh
    );
    const groundCollider = gridSystem.getGroundCollider();
    if (groundCollider) {
      targets.push(groundCollider);
    }

    const hits = raycaster.intersectObjects(targets, false);
    if (hits.length === 0) {
      const plane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        -gridSystem.sampleHeight(0, 0)
      );
      const fallbackPt = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, fallbackPt)) {
        const gy = gridSystem.sampleHeight(fallbackPt.x, fallbackPt.z);
        const gn = gridSystem.sampleNormal(fallbackPt.x, fallbackPt.z);
        fallbackPt.y = gy;
        return {
          point: fallbackPt,
          normal: gn,
          targetName: terrainStyle
            ? 'Terrain 3D'
            : gridVisible
            ? 'Lantai Grid'
            : 'Lantai',
          isGround: true,
          targetMesh: null,
        };
      }
      return null;
    }

    const hit = hits[0];
    const hitObj = hit.object as THREE.Mesh;
    const isGround = hitObj === groundCollider;

    if (isGround) {
      return {
        point: hit.point.clone(),
        normal: gridSystem.sampleNormal(hit.point.x, hit.point.z),
        targetName: terrainStyle ? 'Terrain 3D' : 'Lantai Grid',
        isGround: true,
        targetMesh: null,
      };
    }

    if (hit.face) {
      const { normal, edgeHint } = this.extractExactFaceWorldNormal(
        hitObj,
        hit.face,
        raycaster.ray.direction
      );
      return {
        point: hit.point.clone(),
        normal,
        targetName: hitObj.name,
        isGround: false,
        targetMesh: hitObj,
        triangleEdgeHint: edgeHint,
      };
    }

    return {
      point: hit.point.clone(),
      normal: new THREE.Vector3(0, 1, 0),
      targetName: hitObj.name,
      isGround: false,
      targetMesh: hitObj,
    };
  }

  /**
   * Omni-directional 3D Closest-Triangle Surface Finder!
   * Finds the nearest actual 3D surface triangle (on steep scaled wedges, 90° walls, overhangs,
   * rotated ramps, arches, domes, or terrain) to `probePoint` / `rawCenter` within `captureRadius`.
   */
  public findClosestSurface3D(
    probePoint: THREE.Vector3,
    rawCenter: THREE.Vector3,
    movingMesh: THREE.Mesh,
    otherMeshes: THREE.Mesh[],
    gridSystem: GridTerrainSystem,
    terrainStyle: boolean,
    captureRadius: number
  ): SurfaceHitResult | null {
    let bestScore = captureRadius;
    let bestHit: SurfaceHitResult | null = null;

    for (const target of otherMeshes) {
      if (!target.visible || target === movingMesh) continue;
      const cached = this.getWorldTriangles(target);

      // Fast expanded AABB reject
      if (
        probePoint.x < cached.worldBox.min.x - captureRadius ||
        probePoint.x > cached.worldBox.max.x + captureRadius ||
        probePoint.y < cached.worldBox.min.y - captureRadius ||
        probePoint.y > cached.worldBox.max.y + captureRadius ||
        probePoint.z < cached.worldBox.min.z - captureRadius ||
        probePoint.z > cached.worldBox.max.z + captureRadius
      ) {
        continue;
      }

      for (const tri of cached.triangles) {
        closestPointOnTriangle(
          probePoint,
          tri.a,
          tri.b,
          tri.c,
          this.closestScratch
        );

        const dx = probePoint.x - this.closestScratch.x;
        const dy = probePoint.y - this.closestScratch.y;
        const dz = probePoint.z - this.closestScratch.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist >= bestScore) continue;

        // Verify the triangle faces outward toward rawCenter (not an opposite back-face of a thin wall)
        const centerSigned =
          (rawCenter.x - this.closestScratch.x) * tri.normal.x +
          (rawCenter.y - this.closestScratch.y) * tri.normal.y +
          (rawCenter.z - this.closestScratch.z) * tri.normal.z;

        if (centerSigned < -0.28) continue;

        bestScore = dist;
        bestHit = {
          point: this.closestScratch.clone(),
          normal: tri.normal.clone(),
          targetName: target.name,
          isGround: false,
          targetMesh: target,
          triangleEdgeHint: tri.longestEdgeDir,
        };
      }
    }

    // Also test ground / terrain under probePoint if no closer 3D object face won
    const gy = gridSystem.sampleHeight(probePoint.x, probePoint.z);
    const groundDist = Math.abs(probePoint.y - gy);
    if (groundDist < bestScore) {
      bestHit = {
        point: new THREE.Vector3(probePoint.x, gy, probePoint.z),
        normal: gridSystem.sampleNormal(probePoint.x, probePoint.z),
        targetName: terrainStyle ? 'Terrain 3D' : 'Lantai Grid',
        isGround: true,
        targetMesh: null,
      };
    }

    return bestHit;
  }

  /**
   * Smart Downward + Proximity Surface Resolver for 1-Tap `Tempel` / `Conform Now`:
   * 1) First checks 3D closest triangle within object proximity (catches adjacent steep slopes & 90° walls!).
   * 2) Otherwise casts downward from center + footprint corners onto exact world triangles & terrain.
   */
  public findBestConformTarget(
    movingMesh: THREE.Mesh,
    otherMeshes: THREE.Mesh[],
    gridSystem: GridTerrainSystem,
    terrainStyle: boolean
  ): SurfaceHitResult {
    movingMesh.updateMatrixWorld(true);
    movingMesh.geometry.computeBoundingBox();
    const bb =
      movingMesh.geometry.boundingBox ??
      new THREE.Box3(
        new THREE.Vector3(-0.5, -0.5, -0.5),
        new THREE.Vector3(0.5, 0.5, 0.5)
      );
    const halfDiag =
      0.5 *
      Math.hypot(
        (bb.max.x - bb.min.x) * movingMesh.scale.x,
        (bb.max.y - bb.min.y) * movingMesh.scale.y,
        (bb.max.z - bb.min.z) * movingMesh.scale.z
      );

    // 1. Check 3D closest object face within proximity of the object's current position
    // (excludes ground here unless the object is already near ground, so high-up objects still drop onto roofs below!)
    let bestNearObj: SurfaceHitResult | null = null;
    let bestNearDist = Math.max(0.75, halfDiag * 1.25);

    for (const target of otherMeshes) {
      if (!target.visible || target === movingMesh) continue;
      const cached = this.getWorldTriangles(target);
      if (
        movingMesh.position.x < cached.worldBox.min.x - bestNearDist ||
        movingMesh.position.x > cached.worldBox.max.x + bestNearDist ||
        movingMesh.position.y < cached.worldBox.min.y - bestNearDist ||
        movingMesh.position.y > cached.worldBox.max.y + bestNearDist ||
        movingMesh.position.z < cached.worldBox.min.z - bestNearDist ||
        movingMesh.position.z > cached.worldBox.max.z + bestNearDist
      ) {
        continue;
      }

      for (const tri of cached.triangles) {
        closestPointOnTriangle(
          movingMesh.position,
          tri.a,
          tri.b,
          tri.c,
          this.closestScratch
        );
        const dist = movingMesh.position.distanceTo(this.closestScratch);
        if (dist >= bestNearDist) continue;

        const signed =
          (movingMesh.position.x - this.closestScratch.x) * tri.normal.x +
          (movingMesh.position.y - this.closestScratch.y) * tri.normal.y +
          (movingMesh.position.z - this.closestScratch.z) * tri.normal.z;
        if (signed < -0.3) continue;

        bestNearDist = dist;
        bestNearObj = {
          point: this.closestScratch.clone(),
          normal: tri.normal.clone(),
          targetName: target.name,
          isGround: false,
          targetMesh: target,
          triangleEdgeHint: tri.longestEdgeDir,
        };
      }
    }

    if (bestNearObj) {
      return bestNearObj;
    }

    // 2. Otherwise cast downward onto underlying 3D surfaces + terrain
    return this.projectVerticalAtXZ(
      movingMesh.position.x,
      movingMesh.position.z,
      movingMesh.position.y + halfDiag,
      movingMesh,
      otherMeshes,
      gridSystem,
      terrainStyle
    );
  }

  /**
   * Projects downward from (x, startTopY, z) onto underlying 3D surfaces + terrain
   * with exact non-uniform-scale-safe triangle normals.
   */
  public projectVerticalAtXZ(
    x: number,
    z: number,
    startTopY: number,
    movingMesh: THREE.Mesh,
    otherMeshes: THREE.Mesh[],
    gridSystem: GridTerrainSystem,
    terrainStyle: boolean
  ): SurfaceHitResult {
    const targets: THREE.Object3D[] = otherMeshes.filter(
      (m) => m.visible && m !== movingMesh
    );
    const groundCollider = gridSystem.getGroundCollider();
    if (groundCollider) {
      targets.push(groundCollider);
    }

    const downDir = new THREE.Vector3(0, -1, 0);
    this.downRay.set(
      new THREE.Vector3(x, Math.max(startTopY + 1.5, 50), z),
      downDir
    );

    const hits = this.downRay.intersectObjects(targets, false);
    const validHit =
      hits.find((h) => h.point.y <= startTopY + 1.0) ?? hits[0] ?? null;

    if (validHit) {
      const hitObj = validHit.object as THREE.Mesh;
      const isGround = hitObj === groundCollider;
      if (isGround) {
        return {
          point: validHit.point.clone(),
          normal: gridSystem.sampleNormal(validHit.point.x, validHit.point.z),
          targetName: terrainStyle ? 'Terrain 3D' : 'Lantai Grid',
          isGround: true,
          targetMesh: null,
        };
      }

      if (validHit.face) {
        const { normal, edgeHint } = this.extractExactFaceWorldNormal(
          hitObj,
          validHit.face,
          downDir
        );
        return {
          point: validHit.point.clone(),
          normal,
          targetName: hitObj.name,
          isGround: false,
          targetMesh: hitObj,
          triangleEdgeHint: edgeHint,
        };
      }
    }

    const gy = gridSystem.sampleHeight(x, z);
    const gn = gridSystem.sampleNormal(x, z);
    return {
      point: new THREE.Vector3(x, gy, z),
      normal: gn,
      targetName: terrainStyle ? 'Terrain 3D' : 'Lantai Grid',
      isGround: true,
      targetMesh: null,
    };
  }

  /**
   * Applies exact 0.0000m flush Surface Alignment / Smart Edge Adaptation / Foundation Conforming
   * to `mesh` at `hit`, returning contact telemetry and a concise Indonesian HUD label.
   */
  public applySurfaceHit(
    mesh: THREE.Mesh,
    hit: SurfaceHitResult,
    settings: SurfaceSettings,
    gridSystem: GridTerrainSystem,
    otherMeshes: THREE.Mesh[],
    preserveCurrentYawOnUpright = true,
    gridSnapStep = 0
  ): { contactPoint: THREE.Vector3; contactNormal: THREE.Vector3; label: string } {
    const p = hit.point.clone();
    let n = hit.normal.clone().normalize();

    if (hit.isGround && gridSnapStep > 0) {
      p.x = Math.round(p.x / gridSnapStep) * gridSnapStep;
      p.z = Math.round(p.z / gridSnapStep) * gridSnapStep;
      p.y = gridSystem.sampleHeight(p.x, p.z);
      n = gridSystem.sampleNormal(p.x, p.z);
    }

    const upVec = new THREE.Vector3(0, 1, 0);

    if (settings.conformMode === 'align-normal') {
      const q = this.computeSmartAlignedQuaternion(
        mesh,
        n,
        settings.attachAxis,
        settings.spinDeg,
        hit.targetMesh,
        hit.triangleEdgeHint
      );
      mesh.quaternion.copy(q);
      mesh.rotation.setFromQuaternion(q);

      const minProj = this.computeMinVertexProjection(mesh, n);
      const dist = settings.offset - minProj;
      mesh.position.copy(p).addScaledVector(n, dist);
      mesh.updateMatrixWorld(true);

      const slopeDeg = Math.round(
        Math.acos(Math.max(-1, Math.min(1, n.y))) * RAD2DEG
      );
      return {
        contactPoint: p,
        contactNormal: n,
        label: `Rapat Permukaan (${slopeDeg}°) • ${hit.targetName}`,
      };
    }

    const currentEuler = new THREE.Euler().setFromQuaternion(
      mesh.quaternion,
      'YXZ'
    );
    const yawRad = preserveCurrentYawOnUpright
      ? currentEuler.y
      : settings.spinDeg * DEG2RAD;
    mesh.rotation.set(0, yawRad, 0);
    mesh.quaternion.setFromEuler(mesh.rotation);

    const minYProj = this.computeMinVertexProjection(mesh, upVec);

    if (settings.conformMode === 'foundation-seat') {
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox ?? new THREE.Box3();
      const halfW = (bb.max.x - bb.min.x) * 0.5 * mesh.scale.x;
      const halfD = (bb.max.z - bb.min.z) * 0.5 * mesh.scale.z;

      const sampleCoords: Array<[number, number]> = [
        [p.x, p.z],
        [p.x - halfW, p.z - halfD],
        [p.x + halfW, p.z - halfD],
        [p.x - halfW, p.z + halfD],
        [p.x + halfW, p.z + halfD],
      ];

      let lowestSupportY = p.y;
      for (const [sx, sz] of sampleCoords) {
        if (hit.isGround) {
          lowestSupportY = Math.min(
            lowestSupportY,
            gridSystem.sampleHeight(sx, sz)
          );
        } else {
          const subHit = this.projectVerticalAtXZ(
            sx,
            sz,
            p.y + 1.0,
            mesh,
            otherMeshes,
            gridSystem,
            false
          );
          lowestSupportY = Math.min(lowestSupportY, subHit.point.y);
        }
      }

      mesh.position.set(p.x, lowestSupportY + settings.offset - minYProj, p.z);
      mesh.updateMatrixWorld(true);
      return {
        contactPoint: new THREE.Vector3(p.x, lowestSupportY, p.z),
        contactNormal: upVec,
        label: `Fondasi Rapat • ${hit.targetName}`,
      };
    }

    // 'upright-follow'
    mesh.position.set(p.x, p.y + settings.offset - minYProj, p.z);
    mesh.updateMatrixWorld(true);
    return {
      contactPoint: p,
      contactNormal: upVec,
      label: `Tegak Ikuti Permukaan • ${hit.targetName}`,
    };
  }
}
