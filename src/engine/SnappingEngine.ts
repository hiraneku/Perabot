import * as THREE from 'three';
import {
  PrimitiveKind,
  PROXIMITY_RADIUS_MAP,
  SnapSettings,
} from '../types/studio';

export interface GuideLineSpec {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
}

export interface ContactPatchSpec {
  center: THREE.Vector3;
  size: [number, number]; // width, height in local plane
  axis: 'x' | 'y' | 'z';
}

export interface SnapComputeResult {
  snappedPosition: THREE.Vector3;
  snapLabel: string | null;
  guides: GuideLineSpec[];
  points: THREE.Vector3[];
  contacts: ContactPatchSpec[];
}

interface ObjectSnapProfile {
  id: string;
  name: string;
  box: THREE.Box3;
  center: THREE.Vector3;
  points: THREE.Vector3[];
}

function getLocalStructuralPoints(kind: PrimitiveKind): THREE.Vector3[] {
  if (kind === 'cube') {
    const pts: THREE.Vector3[] = [];
    // 8 corners
    for (const sx of [-0.5, 0.5]) {
      for (const sy of [-0.5, 0.5]) {
        for (const sz of [-0.5, 0.5]) {
          pts.push(new THREE.Vector3(sx, sy, sz));
        }
      }
    }
    // 12 edge midpoints
    for (const sy of [-0.5, 0.5]) {
      for (const sz of [-0.5, 0.5]) pts.push(new THREE.Vector3(0, sy, sz));
    }
    for (const sx of [-0.5, 0.5]) {
      for (const sz of [-0.5, 0.5]) pts.push(new THREE.Vector3(sx, 0, sz));
    }
    for (const sx of [-0.5, 0.5]) {
      for (const sy of [-0.5, 0.5]) pts.push(new THREE.Vector3(sx, sy, 0));
    }
    return pts;
  }

  if (kind === 'triangle') {
    return [
      // 6 prism corners
      new THREE.Vector3(-0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, -0.5, 0.5),
      new THREE.Vector3(0, 0.5, 0.5),
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, -0.5, -0.5),
      new THREE.Vector3(0, 0.5, -0.5),
      // Key edge midpoints (ridge, slopes, base)
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(0.5, -0.5, 0),
      new THREE.Vector3(0, -0.5, 0.5),
      new THREE.Vector3(0, -0.5, -0.5),
      new THREE.Vector3(-0.25, 0, 0.5),
      new THREE.Vector3(0.25, 0, 0.5),
      new THREE.Vector3(-0.25, 0, -0.5),
      new THREE.Vector3(0.25, 0, -0.5),
    ];
  }

  // cylinder
  const pts: THREE.Vector3[] = [
    new THREE.Vector3(0, 0.5, 0),
    new THREE.Vector3(0, -0.5, 0),
  ];
  const segments = 12;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const cx = Math.cos(a) * 0.5;
    const cz = Math.sin(a) * 0.5;
    pts.push(new THREE.Vector3(cx, 0.5, cz));
    pts.push(new THREE.Vector3(cx, -0.5, cz));
    if (i % 3 === 0) {
      pts.push(new THREE.Vector3(cx, 0, cz));
    }
  }
  return pts;
}

function buildProfile(mesh: THREE.Mesh, overridePos?: THREE.Vector3): ObjectSnapProfile {
  const kind = (mesh.userData.kind as PrimitiveKind) || 'cube';
  const localPts = getLocalStructuralPoints(kind);

  const mat = new THREE.Matrix4().compose(
    overridePos ?? mesh.position,
    mesh.quaternion,
    mesh.scale
  );

  const box = new THREE.Box3();
  const worldPts: THREE.Vector3[] = [];

  for (const lp of localPts) {
    const wp = lp.clone().applyMatrix4(mat);
    box.expandByPoint(wp);
    worldPts.push(wp);
  }

  const center = new THREE.Vector3();
  box.getCenter(center);

  return {
    id: mesh.userData.objectId as string,
    name: mesh.name,
    box,
    center,
    points: worldPts,
  };
}

function axisGap1D(minA: number, maxA: number, minB: number, maxB: number): number {
  if (maxA < minB) return minB - maxA;
  if (maxB < minA) return minA - maxB;
  return 0;
}

function overlapCenter1D(minA: number, maxA: number, minB: number, maxB: number): {
  center: number;
  span: number;
} {
  const lo = Math.max(minA, minB);
  const hi = Math.min(maxA, maxB);
  if (hi >= lo) {
    return { center: (lo + hi) * 0.5, span: Math.max(0.25, hi - lo) };
  }
  return { center: (lo + hi) * 0.5, span: 0.45 };
}

export class SnappingEngine {
  public computeSnap(
    movingMesh: THREE.Mesh,
    rawPos: THREE.Vector3,
    dragAxis: string | null,
    otherMeshes: THREE.Mesh[],
    settings: SnapSettings
  ): SnapComputeResult {
    const result: SnapComputeResult = {
      snappedPosition: rawPos.clone(),
      snapLabel: null,
      guides: [],
      points: [],
      contacts: [],
    };

    if (!settings.enabled || !dragAxis) {
      return result;
    }

    const axisStr = dragAxis.toUpperCase();
    const allow = {
      x: axisStr.includes('X'),
      y: axisStr.includes('Y'),
      z: axisStr.includes('Z'),
    };

    const radius = settings.proximity
      ? PROXIMITY_RADIUS_MAP[settings.proximityStrength]
      : 0.18;

    const moving = buildProfile(movingMesh, rawPos);
    const targets = otherMeshes
      .filter((m) => m.visible && m !== movingMesh)
      .map((m) => buildProfile(m));

    const lockedAxes = { x: false, y: false, z: false };
    const labels: string[] = [];

    // 1. Multi-axis 3D Edge & Vertex Lock (when dragging in a plane or free XYZ)
    const activeAxisCount = (allow.x ? 1 : 0) + (allow.y ? 1 : 0) + (allow.z ? 1 : 0);
    if (settings.edge && activeAxisCount >= 2 && targets.length > 0) {
      let bestDist = radius * 0.92;
      let bestDelta: THREE.Vector3 | null = null;
      let bestTargetPt: THREE.Vector3 | null = null;
      let bestTargetName = '';

      for (const tar of targets) {
        // Quick proximity filter
        const boxGap = Math.hypot(
          axisGap1D(moving.box.min.x, moving.box.max.x, tar.box.min.x, tar.box.max.x),
          axisGap1D(moving.box.min.y, moving.box.max.y, tar.box.min.y, tar.box.max.y),
          axisGap1D(moving.box.min.z, moving.box.max.z, tar.box.min.z, tar.box.max.z)
        );
        if (boxGap > radius * 3.2) continue;

        for (const mp of moving.points) {
          for (const tp of tar.points) {
            const dx = allow.x ? tp.x - mp.x : 0;
            const dy = allow.y ? tp.y - mp.y : 0;
            const dz = allow.z ? tp.z - mp.z : 0;

            // Ensure non-dragged axis is also reasonably close so unrelated elevations don't false-lock
            const offAxisDist =
              (!allow.x ? Math.abs(tp.x - mp.x) : 0) +
              (!allow.y ? Math.abs(tp.y - mp.y) : 0) +
              (!allow.z ? Math.abs(tp.z - mp.z) : 0);
            if (offAxisDist > 1.25) continue;

            const d = Math.hypot(dx, dy, dz);
            if (d < bestDist) {
              bestDist = d;
              bestDelta = new THREE.Vector3(dx, dy, dz);
              bestTargetPt = tp.clone();
              bestTargetName = tar.name;
            }
          }
        }
      }

      if (bestDelta && bestTargetPt) {
        result.snappedPosition.add(bestDelta);
        if (allow.x) lockedAxes.x = true;
        if (allow.y) lockedAxes.y = true;
        if (allow.z) lockedAxes.z = true;
        result.points.push(bestTargetPt);
        labels.push(`Snap Sudut/Tepi • ${bestTargetName}`);
      }
    }

    // Recompute moving profile with any 3D vertex lock applied
    let currentMoving = buildProfile(movingMesh, result.snappedPosition);

    // 2. Per-Axis Smart Snapping: Magnetic Surface -> Edge -> Alignment -> Grid
    const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
    const otherAxesMap: Record<'x' | 'y' | 'z', ['x' | 'y' | 'z', 'x' | 'y' | 'z']> = {
      x: ['y', 'z'],
      y: ['x', 'z'],
      z: ['x', 'y'],
    };
    const guideColors: Record<'x' | 'y' | 'z', string> = {
      x: '#ff4d6d',
      y: '#78e82c',
      z: '#38bdf8',
    };

    for (const ax of axes) {
      if (!allow[ax] || lockedAxes[ax]) continue;

      const [perp1, perp2] = otherAxesMap[ax];
      let bestScore = Infinity;
      let chosenDelta: number | null = null;
      let chosenLabel: string | null = null;
      let chosenGuide: GuideLineSpec | null = null;
      let chosenPoint: THREE.Vector3 | null = null;
      let chosenContact: ContactPatchSpec | null = null;

      // 2A. Magnetic Floor Snap (Y = 0)
      if (settings.magnetic && ax === 'y') {
        const distFloor = Math.abs(currentMoving.box.min.y - 0);
        if (distFloor <= radius) {
          const score = distFloor * 0.78;
          if (score < bestScore) {
            bestScore = score;
            chosenDelta = -currentMoving.box.min.y;
            chosenLabel = 'Magnetik • Lantai (Y=0)';
            const sizeX = Math.max(0.3, currentMoving.box.max.x - currentMoving.box.min.x);
            const sizeZ = Math.max(0.3, currentMoving.box.max.z - currentMoving.box.min.z);
            chosenContact = {
              center: new THREE.Vector3(currentMoving.center.x, 0.004, currentMoving.center.z),
              size: [sizeX, sizeZ],
              axis: 'y',
            };
          }
        }
      }

      // 2B. Magnetic Object-to-Object Surface Contact
      if (settings.magnetic) {
        const maxPerpGap = settings.proximity ? radius * 2.5 : 0.65;
        for (const tar of targets) {
          const gap1 = axisGap1D(
            currentMoving.box.min[perp1],
            currentMoving.box.max[perp1],
            tar.box.min[perp1],
            tar.box.max[perp1]
          );
          const gap2 = axisGap1D(
            currentMoving.box.min[perp2],
            currentMoving.box.max[perp2],
            tar.box.min[perp2],
            tar.box.max[perp2]
          );

          if (gap1 > maxPerpGap || gap2 > maxPerpGap) continue;

          // Candidate 1: moving.min touches target.max
          const dMinToMax = tar.box.max[ax] - currentMoving.box.min[ax];
          if (Math.abs(dMinToMax) <= radius) {
            const score = Math.abs(dMinToMax) * 0.75;
            if (score < bestScore) {
              bestScore = score;
              chosenDelta = dMinToMax;
              chosenLabel =
                ax === 'y'
                  ? `Magnetik • Tumpuk di atas ${tar.name}`
                  : `Magnetik • Tempel Sisi ${tar.name}`;
              chosenContact = this.buildContactPatch(
                ax,
                tar.box.max[ax],
                currentMoving.box,
                tar.box
              );
              chosenGuide = null;
              chosenPoint = null;
            }
          }

          // Candidate 2: moving.max touches target.min
          const dMaxToMin = tar.box.min[ax] - currentMoving.box.max[ax];
          if (Math.abs(dMaxToMin) <= radius) {
            const score = Math.abs(dMaxToMin) * 0.75;
            if (score < bestScore) {
              bestScore = score;
              chosenDelta = dMaxToMin;
              chosenLabel = `Magnetik • Tempel Sisi ${tar.name}`;
              chosenContact = this.buildContactPatch(
                ax,
                tar.box.min[ax],
                currentMoving.box,
                tar.box
              );
              chosenGuide = null;
              chosenPoint = null;
            }
          }
        }
      }

      // 2C. Single-Axis Edge / Structural Point Snap (for nearby objects)
      if (settings.edge) {
        const edgeNeighborLimit = settings.proximity ? 2.4 : 4.5;
        for (const tar of targets) {
          const centerDist = currentMoving.center.distanceTo(tar.center);
          if (centerDist > edgeNeighborLimit) continue;

          for (const mp of currentMoving.points) {
            for (const tp of tar.points) {
              const delta = tp[ax] - mp[ax];
              if (Math.abs(delta) <= radius * 0.72) {
                const perpDist = Math.hypot(
                  tp[perp1] - mp[perp1],
                  tp[perp2] - mp[perp2]
                );
                if (perpDist > 1.8) continue;

                const score = Math.abs(delta) * 0.92;
                if (score < bestScore) {
                  bestScore = score;
                  chosenDelta = delta;
                  chosenLabel = `Snap Tepi • ${tar.name}`;
                  chosenPoint = tp.clone();
                  chosenContact = null;
                  chosenGuide = null;
                }
              }
            }
          }
        }
      }

      // 2D. Alignment Snapping (Center & Flush Bounds across the scene)
      if (settings.alignment) {
        const alignThreshold = radius * 0.75;
        for (const tar of targets) {
          if (currentMoving.center.distanceTo(tar.center) > 22) continue;

          const checks: Array<{
            movVal: number;
            tarVal: number;
            tag: string;
          }> = [
            {
              movVal: currentMoving.center[ax],
              tarVal: tar.center[ax],
              tag: `Sejajar Tengah ${ax.toUpperCase()} • ${tar.name}`,
            },
            {
              movVal: currentMoving.box.min[ax],
              tarVal: tar.box.min[ax],
              tag: `Rata Tepi ${ax.toUpperCase()} • ${tar.name}`,
            },
            {
              movVal: currentMoving.box.max[ax],
              tarVal: tar.box.max[ax],
              tag: `Rata Tepi ${ax.toUpperCase()} • ${tar.name}`,
            },
          ];

          for (const chk of checks) {
            const delta = chk.tarVal - chk.movVal;
            if (Math.abs(delta) <= alignThreshold) {
              const score = Math.abs(delta) * 0.96;
              if (score < bestScore) {
                bestScore = score;
                chosenDelta = delta;
                chosenLabel = chk.tag;
                chosenContact = null;
                chosenPoint = null;

                const fromPt = currentMoving.center.clone();
                fromPt[ax] = chk.tarVal;
                const toPt = tar.center.clone();
                toPt[ax] = chk.tarVal;
                chosenGuide = {
                  from: fromPt,
                  to: toPt,
                  color: guideColors[ax],
                };
              }
            }
          }
        }
      }

      // Apply winner if found, otherwise fallback to Grid Snap
      if (chosenDelta !== null) {
        result.snappedPosition[ax] += chosenDelta;
        if (chosenLabel && labels.length < 2) labels.push(chosenLabel);
        if (chosenGuide) result.guides.push(chosenGuide);
        if (chosenPoint) result.points.push(chosenPoint);
        if (chosenContact) result.contacts.push(chosenContact);
        currentMoving = buildProfile(movingMesh, result.snappedPosition);
      } else if (settings.grid && settings.gridStep > 0) {
        const step = settings.gridStep;
        if (ax === 'y') {
          // Snap bottom of object to grid elevation so blocks sit cleanly on floor steps
          const snappedMinY = Math.round(currentMoving.box.min.y / step) * step;
          const deltaY = snappedMinY - currentMoving.box.min.y;
          result.snappedPosition.y += deltaY;
        } else {
          result.snappedPosition[ax] =
            Math.round(result.snappedPosition[ax] / step) * step;
        }
        if (labels.length === 0) {
          labels.push(`Grid ${step}m`);
        }
        currentMoving = buildProfile(movingMesh, result.snappedPosition);
      }
    }

    result.snapLabel = labels.length > 0 ? labels.join('  |  ') : null;
    return result;
  }

  private buildContactPatch(
    ax: 'x' | 'y' | 'z',
    coordVal: number,
    movBox: THREE.Box3,
    tarBox: THREE.Box3
  ): ContactPatchSpec {
    if (ax === 'y') {
      const ox = overlapCenter1D(movBox.min.x, movBox.max.x, tarBox.min.x, tarBox.max.x);
      const oz = overlapCenter1D(movBox.min.z, movBox.max.z, tarBox.min.z, tarBox.max.z);
      return {
        center: new THREE.Vector3(ox.center, coordVal, oz.center),
        size: [ox.span, oz.span],
        axis: 'y',
      };
    }
    if (ax === 'x') {
      const oz = overlapCenter1D(movBox.min.z, movBox.max.z, tarBox.min.z, tarBox.max.z);
      const oy = overlapCenter1D(movBox.min.y, movBox.max.y, tarBox.min.y, tarBox.max.y);
      return {
        center: new THREE.Vector3(coordVal, oy.center, oz.center),
        size: [oz.span, oy.span],
        axis: 'x',
      };
    }
    const ox = overlapCenter1D(movBox.min.x, movBox.max.x, tarBox.min.x, tarBox.max.x);
    const oy = overlapCenter1D(movBox.min.y, movBox.max.y, tarBox.min.y, tarBox.max.y);
    return {
      center: new THREE.Vector3(ox.center, oy.center, coordVal),
      size: [ox.span, oy.span],
      axis: 'z',
    };
  }
}

/**
 * Renders live 3D visual snap indicators (Alignment Guide Lines, Vertex Diamonds,
 * and Magnetic Surface Contact Highlights) in the viewport during transforms.
 */
export class SnapVisualizer {
  public readonly group = new THREE.Group();
  private pointGeo = new THREE.OctahedronGeometry(0.065, 0);
  private endpointGeo = new THREE.SphereGeometry(0.04, 8, 8);
  private pointMat = new THREE.MeshBasicMaterial({
    color: '#facc15',
    depthTest: false,
    transparent: true,
    opacity: 0.95,
    toneMapped: false,
  });
  private contactFillMat = new THREE.MeshBasicMaterial({
    color: '#22d3ee',
    side: THREE.DoubleSide,
    depthTest: false,
    transparent: true,
    opacity: 0.24,
    toneMapped: false,
  });
  private contactBorderMat = new THREE.LineBasicMaterial({
    color: '#22d3ee',
    depthTest: false,
    transparent: true,
    opacity: 0.92,
    toneMapped: false,
  });

  constructor() {
    this.group.name = '__snapVisualizer';
    this.group.renderOrder = 999;
  }

  public update(snap: SnapComputeResult): void {
    this.clear();

    // 1. Alignment Guide Lines + Endpoint Dots
    for (const g of snap.guides) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([g.from, g.to]);
      const lineMat = new THREE.LineBasicMaterial({
        color: g.color,
        depthTest: false,
        transparent: true,
        opacity: 0.95,
        toneMapped: false,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.renderOrder = 999;
      line.userData.disposable = true;
      this.group.add(line);

      for (const pt of [g.from, g.to]) {
        const dotMat = new THREE.MeshBasicMaterial({
          color: g.color,
          depthTest: false,
          toneMapped: false,
        });
        const dot = new THREE.Mesh(this.endpointGeo, dotMat);
        dot.position.copy(pt);
        dot.renderOrder = 999;
        dot.userData.disposeMatOnly = true;
        this.group.add(dot);
      }
    }

    // 2. Edge / Corner Snap Diamonds
    for (const pt of snap.points) {
      const marker = new THREE.Mesh(this.pointGeo, this.pointMat);
      marker.position.copy(pt);
      marker.renderOrder = 1000;
      this.group.add(marker);
    }

    // 3. Magnetic Contact Surface Patches
    for (const c of snap.contacts) {
      const planeGeo = new THREE.PlaneGeometry(c.size[0], c.size[1]);
      if (c.axis === 'y') {
        planeGeo.rotateX(-Math.PI / 2);
      } else if (c.axis === 'x') {
        planeGeo.rotateY(Math.PI / 2);
      }
      const patch = new THREE.Mesh(planeGeo, this.contactFillMat);
      patch.position.copy(c.center);
      patch.renderOrder = 998;
      patch.userData.disposeGeoOnly = true;
      this.group.add(patch);

      const borderGeo = new THREE.EdgesGeometry(planeGeo);
      const border = new THREE.LineSegments(borderGeo, this.contactBorderMat);
      border.position.copy(c.center);
      border.renderOrder = 999;
      border.userData.disposeGeoOnly = true;
      this.group.add(border);
    }
  }

  public clear(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.userData.disposable) {
        (child as THREE.Line).geometry.dispose();
        ((child as THREE.Line).material as THREE.Material).dispose();
      } else if (child.userData.disposeGeoOnly) {
        (child as THREE.Mesh).geometry.dispose();
      } else if (child.userData.disposeMatOnly) {
        ((child as THREE.Mesh).material as THREE.Material).dispose();
      }
    }
  }

  public dispose(): void {
    this.clear();
    this.pointGeo.dispose();
    this.endpointGeo.dispose();
    this.pointMat.dispose();
    this.contactFillMat.dispose();
    this.contactBorderMat.dispose();
  }
}
