import * as THREE from 'three';
import { GridTerrainSystem } from './GridTerrainSystem';
import {
  ArchitecturalRole,
  GridSettings,
  PlacementValidationStatus,
  SurfacePlacementRule,
  SurfaceSettings,
} from '../types/studio';

const OVERLAP_TOLERANCE = 0.038;

function computeMeshWorldAABB(mesh: THREE.Mesh): THREE.Box3 {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const importedGroup = mesh.getObjectByName('__importedVisualGroup');
  if (importedGroup) {
    box.setFromObject(importedGroup);
    if (!box.isEmpty()) return box;
  }
  mesh.geometry.computeBoundingBox();
  if (mesh.geometry.boundingBox) {
    box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
  } else {
    box.setFromObject(mesh);
  }
  return box;
}

export class PlacementValidator {
  /**
   * Evaluates non-blocking placement validity (collisions, plot/domain bounds,
   * and #4 Surface-Aware Placement slope/surface rules).
   */
  public evaluate(
    activeMeshes: THREE.Mesh[],
    otherMeshes: THREE.Mesh[],
    gridSystem: GridTerrainSystem,
    gridSettings: GridSettings,
    surfaceSettings: SurfaceSettings,
    isHouseMode: boolean
  ): PlacementValidationStatus {
    if (activeMeshes.length === 0) {
      return { valid: true, issues: [] };
    }

    const combinedBox = new THREE.Box3();
    for (const m of activeMeshes) {
      combinedBox.union(computeMeshWorldAABB(m));
    }
    if (combinedBox.isEmpty()) {
      return { valid: true, issues: [] };
    }

    const issues: PlacementValidationStatus['issues'] = [];
    const primary = activeMeshes[0];
    const primaryRole = primary.userData.archRole as ArchitecturalRole | undefined;
    const surfaceRule: SurfacePlacementRule =
      (primary.userData.surfaceRule as SurfacePlacementRule | undefined) ??
      (primaryRole === 'floor' || primaryRole === 'wall'
        ? 'building-flat'
        : primaryRole === 'opening'
        ? 'wall-opening'
        : 'any');

    // 1. Check World Domain & Plot Boundary
    const halfWorld = Math.max(10, gridSettings.worldSize) * 0.5;
    if (
      combinedBox.min.x < -halfWorld - 0.05 ||
      combinedBox.max.x > halfWorld + 0.05 ||
      combinedBox.min.z < -halfWorld - 0.05 ||
      combinedBox.max.z > halfWorld + 0.05
    ) {
      issues.push({ kind: 'out-of-domain' });
    } else if (gridSettings.showPlotBoundary) {
      const hw = gridSettings.plotWidth * 0.5;
      const hd = gridSettings.plotDepth * 0.5;
      if (
        combinedBox.min.x < -hw - 0.08 ||
        combinedBox.max.x > hw + 0.08 ||
        combinedBox.min.z < -hd - 0.08 ||
        combinedBox.max.z > hd + 0.08
      ) {
        issues.push({ kind: 'out-of-plot' });
      }
    }

    // 2. Check Volumetric Overlap with Other Scene Objects (ignoring flush touching <= 3.8cm)
    const activeSet = new Set(activeMeshes);
    let supportSurfaceKind: 'ground' | 'floor' | 'wall' | 'roof' = 'ground';
    let bestSupportTopY = -Infinity;

    for (const other of otherMeshes) {
      if (!other.visible || activeSet.has(other)) continue;
      const otherBox = computeMeshWorldAABB(other);
      if (otherBox.isEmpty()) continue;

      const otherRole = other.userData.archRole as ArchitecturalRole | undefined;

      // Detect what object sits directly underneath `combinedBox` (within 10cm of min.y)
      const horizOverlap =
        Math.min(combinedBox.max.x, otherBox.max.x) -
          Math.max(combinedBox.min.x, otherBox.min.x) >
          0.08 &&
        Math.min(combinedBox.max.z, otherBox.max.z) -
          Math.max(combinedBox.min.z, otherBox.min.z) >
          0.08;
      if (
        horizOverlap &&
        Math.abs(combinedBox.min.y - otherBox.max.y) <= 0.14 &&
        otherBox.max.y > bestSupportTopY
      ) {
        bestSupportTopY = otherBox.max.y;
        supportSurfaceKind =
          otherRole === 'roof'
            ? 'roof'
            : otherRole === 'wall'
            ? 'wall'
            : 'floor';
      }

      // Allow openings (doors/windows) mounted into walls without false collision warning
      if (
        (primaryRole === 'opening' && otherRole === 'wall') ||
        (primaryRole === 'wall' && otherRole === 'opening')
      ) {
        if (surfaceRule === 'wall-opening') {
          const touchOrEmbed =
            Math.min(combinedBox.max.x, otherBox.max.x) >=
              Math.max(combinedBox.min.x, otherBox.min.x) - 0.05 &&
            Math.min(combinedBox.max.y, otherBox.max.y) >=
              Math.max(combinedBox.min.y, otherBox.min.y) - 0.05 &&
            Math.min(combinedBox.max.z, otherBox.max.z) >=
              Math.max(combinedBox.min.z, otherBox.min.z) - 0.05;
          if (touchOrEmbed) {
            supportSurfaceKind = 'wall';
          }
        }
        continue;
      }

      // Check per-part overlap so L-shaped or doorway groups don't trigger phantom AABB collisions!
      for (const actMesh of activeMeshes) {
        const actBox = computeMeshWorldAABB(actMesh);
        const ox =
          Math.min(actBox.max.x, otherBox.max.x) -
          Math.max(actBox.min.x, otherBox.min.x);
        const oy =
          Math.min(actBox.max.y, otherBox.max.y) -
          Math.max(actBox.min.y, otherBox.min.y);
        const oz =
          Math.min(actBox.max.z, otherBox.max.z) -
          Math.max(actBox.min.z, otherBox.min.z);

        if (
          ox > OVERLAP_TOLERANCE &&
          oy > OVERLAP_TOLERANCE &&
          oz > OVERLAP_TOLERANCE
        ) {
          const tName = other.userData.groupName || other.name;
          if (!issues.some((i) => i.kind === 'collision' && i.targetName === tName)) {
            issues.push({ kind: 'collision', targetName: tName });
          }
          break;
        }
      }
    }

    // 3. #4 Surface-Aware Placement Validation (in House Builder mode when enabled)
    if (isHouseMode && surfaceSettings.surfaceAware && surfaceRule !== 'any') {
      const cx = (combinedBox.min.x + combinedBox.max.x) * 0.5;
      const cz = (combinedBox.min.z + combinedBox.max.z) * 0.5;
      const groundY = gridSystem.sampleHeight(cx, cz);
      const nearGround = Math.abs(combinedBox.min.y - groundY) <= 0.35;
      const slopeDeg = gridSystem.sampleSlopeDegrees(cx, cz);

      if (surfaceRule === 'building-flat') {
        if (
          supportSurfaceKind === 'ground' &&
          nearGround &&
          slopeDeg > surfaceSettings.maxFlatSlopeDeg
        ) {
          issues.push({
            kind: 'steep-slope',
            slopeDeg: Math.round(slopeDeg),
          });
        } else if (supportSurfaceKind === 'roof') {
          issues.push({ kind: 'wrong-surface' });
        }
      } else if (surfaceRule === 'ground-foliage') {
        // Grass & Trees should only sit on natural Ground / Terrain, not on Roofs or Indoor Slabs!
        if (supportSurfaceKind !== 'ground' || !nearGround) {
          issues.push({ kind: 'wrong-surface' });
        } else if (slopeDeg > 42) {
          issues.push({ kind: 'steep-slope', slopeDeg: Math.round(slopeDeg) });
        }
      } else if (surfaceRule === 'slope-rock') {
        // Rocks belong on Ground or Steep Slopes (up to 72°), not perched on Roofs
        if (supportSurfaceKind === 'roof') {
          issues.push({ kind: 'wrong-surface' });
        }
      } else if (surfaceRule === 'floor-interior') {
        if (supportSurfaceKind === 'roof' || (supportSurfaceKind === 'ground' && slopeDeg > 10)) {
          issues.push({ kind: 'wrong-surface' });
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export class PlacementValidationVisualizer {
  public readonly group = new THREE.Group();

  constructor() {
    this.group.name = '__placementValidationVisualizer';
    this.group.renderOrder = 994;
  }

  public update(
    worldBox: THREE.Box3 | null,
    status: PlacementValidationStatus | null,
    enabled: boolean
  ): void {
    this.clear();
    if (!enabled || !worldBox || worldBox.isEmpty() || !status) return;

    const pad = 0.025;
    const min = worldBox.min.clone().subScalar(pad);
    const max = worldBox.max.clone().addScalar(pad);
    const sx = Math.max(0.05, max.x - min.x);
    const sy = Math.max(0.05, max.y - min.y);
    const sz = Math.max(0.05, max.z - min.z);
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);

    const colorHex = status.valid ? '#22c55e' : '#ef4444';

    // Crisp wireframe validation cage
    const boxGeo = new THREE.BoxGeometry(sx, sy, sz);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    boxGeo.dispose();

    const lineMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: status.valid ? 0.85 : 0.98,
      depthTest: false,
    });
    const frame = new THREE.LineSegments(edgesGeo, lineMat);
    frame.position.copy(center);
    frame.renderOrder = 996;
    frame.raycast = () => {};
    this.group.add(frame);

    // Subtle tinted translucent volume only when colliding/invalid so warning is unmistakable
    if (!status.valid) {
      const tintGeo = new THREE.BoxGeometry(sx, sy, sz);
      const tintMat = new THREE.MeshBasicMaterial({
        color: '#ef4444',
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const tintBox = new THREE.Mesh(tintGeo, tintMat);
      tintBox.position.copy(center);
      tintBox.renderOrder = 995;
      tintBox.raycast = () => {};
      this.group.add(tintBox);
    } else {
      // Subtle green base pad when valid
      const baseGeo = new THREE.PlaneGeometry(sx, sz);
      baseGeo.rotateX(-Math.PI / 2);
      const baseMat = new THREE.MeshBasicMaterial({
        color: '#22c55e',
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const basePad = new THREE.Mesh(baseGeo, baseMat);
      basePad.position.set(center.x, min.y + 0.015, center.z);
      basePad.renderOrder = 995;
      basePad.raycast = () => {};
      this.group.add(basePad);
    }
  }

  public clear(): void {
    while (this.group.children.length > 0) {
      const ch = this.group.children[0] as THREE.Mesh | THREE.LineSegments;
      this.group.remove(ch);
      ch.geometry?.dispose();
      (ch.material as THREE.Material)?.dispose();
    }
  }

  public dispose(): void {
    this.clear();
  }
}
