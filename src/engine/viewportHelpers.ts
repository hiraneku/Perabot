import * as THREE from 'three';
import {
  TransformControls,
  TransformControlsGizmo,
} from 'three/examples/jsm/controls/TransformControls.js';

export type CameraPresetType = 'perspective' | 'front' | 'right' | 'top';

/**
 * Creates a Blender-inspired studio floor with:
 * - Soft shadow catcher plane
 * - Dual-resolution architectural grid (0.5m subdivisions + 1m major grid)
 * - Colored origin axis lines: Red (X) & Blue (Z)
 */
export function createFloorGrid(): THREE.Group {
  const group = new THREE.Group();
  group.name = '__studioFloor';

  const shadowGeo = new THREE.PlaneGeometry(80, 80);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.ShadowMaterial({
    opacity: 0.28,
    color: '#05070a',
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.position.y = -0.002;
  shadowPlane.receiveShadow = true;
  group.add(shadowPlane);

  // Minor 0.5m grid
  const minorGrid = new THREE.GridHelper(40, 80, '#252a36', '#212631');
  minorGrid.position.y = -0.001;
  (minorGrid.material as THREE.Material).transparent = true;
  (minorGrid.material as THREE.Material).opacity = 0.55;
  group.add(minorGrid);

  // Major 1.0m grid
  const majorGrid = new THREE.GridHelper(40, 40, '#363f52', '#31394a');
  majorGrid.position.y = 0;
  (majorGrid.material as THREE.Material).transparent = true;
  (majorGrid.material as THREE.Material).opacity = 0.85;
  group.add(majorGrid);

  // Blender-style origin ground axis lines: Red (X) & Blue (Z)
  const xLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-20, 0.003, 0),
    new THREE.Vector3(20, 0.003, 0),
  ]);
  const xLineMat = new THREE.LineBasicMaterial({
    color: '#ff3b57',
    transparent: true,
    opacity: 0.85,
  });
  group.add(new THREE.Line(xLineGeo, xLineMat));

  const zLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.003, -20),
    new THREE.Vector3(0, 0.003, 20),
  ]);
  const zLineMat = new THREE.LineBasicMaterial({
    color: '#3898ff',
    transparent: true,
    opacity: 0.85,
  });
  group.add(new THREE.Line(zLineGeo, zLineMat));

  return group;
}

/**
 * Tunes Three.js TransformControls for comfortable mobile & desktop architecture work:
 * 1. Luminous Blender 4.x axis colors (#ff3b57 Red, #78e82c Green, #3898ff Blue)
 * 2. Bi-directional shafts on Move arrows (+ and - arrowheads connected cleanly)
 * 3. Controlled, non-chaotic Rotate Gizmo:
 *    - Removes free-trackball (XYZE) and diagonal screen-ring (E) that cause crooked tilts
 *    - Replaces half-arcs with clean full 360° X, Y, Z protractor rings + accurate touch pickers
 */
export function enhanceTransformGizmo(controls: TransformControls): void {
  const root = controls.getHelper();
  const gizmoObj = root.children.find(
    (c) => (c as TransformControlsGizmo).isTransformControlsGizmo
  ) as TransformControlsGizmo | undefined;

  if (!gizmoObj) return;

  const COLOR_X = new THREE.Color('#ff3b57');
  const COLOR_Y = new THREE.Color('#78e82c');
  const COLOR_Z = new THREE.Color('#3898ff');

  // 1. Remove chaotic XYZE (free trackball) and E (view-plane ring) from rotate gizmo & picker
  for (const rotContainer of [gizmoObj.gizmo.rotate, gizmoObj.picker.rotate]) {
    const toRemove = rotContainer.children.filter(
      (c) => c.name === 'XYZE' || c.name === 'E'
    );
    for (const item of toRemove) {
      rotContainer.remove(item);
      const m = item as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    }
  }

  // 2. Upgrade X, Y, Z rotate rings to crisp full 360° circles
  for (const child of gizmoObj.gizmo.rotate.children) {
    const mesh = child as THREE.Mesh;
    if (mesh.name === 'X' || mesh.name === 'Y' || mesh.name === 'Z') {
      const oldGeo = mesh.geometry;
      const fullRing = new THREE.TorusGeometry(0.5, 0.011, 8, 72, Math.PI * 2);
      if (mesh.name === 'X') {
        fullRing.rotateY(Math.PI / 2); // YZ plane
      } else if (mesh.name === 'Y') {
        fullRing.rotateX(Math.PI / 2); // XZ horizontal plane
      }
      // Z stays in XY plane
      mesh.geometry = fullRing;
      oldGeo.dispose();
    }
  }

  // Refine rotate touch pickers so X, Y, Z rings are easy to grab without overlapping
  for (const child of gizmoObj.picker.rotate.children) {
    const mesh = child as THREE.Mesh;
    if (mesh.name === 'X' || mesh.name === 'Y' || mesh.name === 'Z') {
      const oldGeo = mesh.geometry;
      const pickerRing = new THREE.TorusGeometry(0.5, 0.075, 6, 36, Math.PI * 2);
      if (mesh.name === 'X') {
        pickerRing.rotateY(Math.PI / 2);
      } else if (mesh.name === 'Y') {
        pickerRing.rotateX(Math.PI / 2);
      }
      mesh.geometry = pickerRing;
      oldGeo.dispose();
    }
  }

  // 3. Apply luminous Blender axis colors across translate, rotate, and scale
  const groups = [gizmoObj.gizmo.translate, gizmoObj.gizmo.rotate, gizmoObj.gizmo.scale];
  for (const grp of groups) {
    for (const child of grp.children) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial | undefined;
      if (!mat || !mat.color) continue;

      if (mesh.name === 'X' || mesh.name === 'YZ') {
        mat.color.copy(COLOR_X);
      } else if (mesh.name === 'Y' || mesh.name === 'XZ') {
        mat.color.copy(COLOR_Y);
      } else if (mesh.name === 'Z' || mesh.name === 'XY') {
        mat.color.copy(COLOR_Z);
      }
    }
  }

  // 4. Add negative-direction shafts on translate gizmo so both + and - arrows connect cleanly
  const translateGroup = gizmoObj.gizmo.translate;
  const findAxisMaterial = (axisName: 'X' | 'Y' | 'Z'): THREE.Material | null => {
    const found = translateGroup.children.find((c) => c.name === axisName) as
      | THREE.Mesh
      | undefined;
    return found ? (found.material as THREE.Material) : null;
  };

  const addNegativeShaft = (
    axisName: 'X' | 'Y' | 'Z',
    rotation: [number, number, number]
  ) => {
    const mat = findAxisMaterial(axisName);
    if (!mat) return;

    const shaftGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.5, 8);
    shaftGeo.translate(0, -0.25, 0);
    const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(rotation[0], rotation[1], rotation[2])
    );
    shaftGeo.applyMatrix4(rotMatrix);

    const shaftMesh = new THREE.Mesh(shaftGeo, mat);
    shaftMesh.name = axisName;
    shaftMesh.renderOrder = Infinity;
    translateGroup.add(shaftMesh);
  };

  addNegativeShaft('X', [0, 0, -Math.PI / 2]);
  addNegativeShaft('Y', [0, 0, 0]);
  addNegativeShaft('Z', [Math.PI / 2, 0, 0]);
}

/**
 * Live 3D Protractor Sector & Degree Ticks shown while rotating an object,
 * giving calm, clear visual feedback of exact swept rotation angle.
 */
export class RotationProtractorVisualizer {
  public readonly group = new THREE.Group();
  private tickLines: THREE.LineSegments;
  private sectorMesh: THREE.Mesh;

  constructor() {
    this.group.name = '__rotationProtractor';
    this.group.visible = false;
    this.group.renderOrder = 995;

    // Build 15° protractor ticks around a unit circle in XY plane
    const tickPts: number[] = [];
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      const isMajor = deg % 90 === 0;
      const isMid = deg % 45 === 0;
      const inner = isMajor ? 0.82 : isMid ? 0.87 : 0.92;
      const outer = 1.0;
      tickPts.push(
        Math.cos(rad) * inner,
        Math.sin(rad) * inner,
        0,
        Math.cos(rad) * outer,
        Math.sin(rad) * outer,
        0
      );
    }
    const tickGeo = new THREE.BufferGeometry();
    tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3));
    const tickMat = new THREE.LineBasicMaterial({
      color: '#f8fafc',
      transparent: true,
      opacity: 0.55,
      depthTest: false,
      toneMapped: false,
    });
    this.tickLines = new THREE.LineSegments(tickGeo, tickMat);
    this.tickLines.renderOrder = 996;
    this.group.add(this.tickLines);

    const sectorGeo = new THREE.RingGeometry(0.12, 0.98, 48, 1, 0, 0.001);
    const sectorMat = new THREE.MeshBasicMaterial({
      color: '#78e82c',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.26,
      depthTest: false,
      toneMapped: false,
    });
    this.sectorMesh = new THREE.Mesh(sectorGeo, sectorMat);
    this.sectorMesh.renderOrder = 995;
    this.group.add(this.sectorMesh);
  }

  public show(
    position: THREE.Vector3,
    axis: 'X' | 'Y' | 'Z',
    angleRad: number,
    radiusScale = 1.05
  ): void {
    this.group.visible = true;
    this.group.position.copy(position);
    this.group.scale.setScalar(radiusScale);

    // Orient XY-plane protractor perpendicular to active axis
    if (axis === 'X') {
      this.group.rotation.set(0, Math.PI / 2, 0);
      (this.sectorMesh.material as THREE.MeshBasicMaterial).color.set('#ff3b57');
    } else if (axis === 'Y') {
      this.group.rotation.set(-Math.PI / 2, 0, 0);
      (this.sectorMesh.material as THREE.MeshBasicMaterial).color.set('#78e82c');
    } else {
      this.group.rotation.set(0, 0, 0);
      (this.sectorMesh.material as THREE.MeshBasicMaterial).color.set('#3898ff');
    }

    // Update swept sector geometry cleanly
    const clamped = Math.max(-Math.PI * 2, Math.min(Math.PI * 2, angleRad));
    const start = clamped >= 0 ? 0 : clamped;
    const len = Math.max(0.002, Math.abs(clamped));
    this.sectorMesh.geometry.dispose();
    this.sectorMesh.geometry = new THREE.RingGeometry(0.12, 0.98, 48, 1, start, len);
  }

  public hide(): void {
    this.group.visible = false;
  }

  public dispose(): void {
    this.tickLines.geometry.dispose();
    (this.tickLines.material as THREE.Material).dispose();
    this.sectorMesh.geometry.dispose();
    (this.sectorMesh.material as THREE.Material).dispose();
  }
}

/**
 * Renders a glowing emerald contact ring + normal arrow when placing/sliding
 * objects on 3D surfaces or sloped terrain (Surface Alignment & Align to Normal).
 */
export class SurfaceNormalVisualizer {
  public readonly group = new THREE.Group();
  private ringMesh: THREE.Mesh;
  private shaftMesh: THREE.Mesh;
  private coneMesh: THREE.Mesh;

  constructor() {
    this.group.name = '__surfaceNormalVisualizer';
    this.group.visible = false;
    this.group.renderOrder = 997;

    const ringGeo = new THREE.RingGeometry(0.18, 0.24, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#34d399',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      toneMapped: false,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.renderOrder = 997;
    this.group.add(this.ringMesh);

    const shaftGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.55, 8);
    shaftGeo.translate(0, 0.275, 0);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: '#10b981',
      depthTest: false,
      toneMapped: false,
    });
    this.shaftMesh = new THREE.Mesh(shaftGeo, arrowMat);
    this.shaftMesh.renderOrder = 998;
    this.group.add(this.shaftMesh);

    const coneGeo = new THREE.ConeGeometry(0.055, 0.14, 12);
    coneGeo.translate(0, 0.6, 0);
    this.coneMesh = new THREE.Mesh(coneGeo, arrowMat);
    this.coneMesh.renderOrder = 998;
    this.group.add(this.coneMesh);
  }

  public show(point: THREE.Vector3, normal: THREE.Vector3): void {
    this.group.visible = true;
    this.group.position.copy(point);
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal.clone().normalize());
    this.group.quaternion.copy(q);
  }

  public hide(): void {
    this.group.visible = false;
  }

  public dispose(): void {
    this.ringMesh.geometry.dispose();
    (this.ringMesh.material as THREE.Material).dispose();
    this.shaftMesh.geometry.dispose();
    (this.shaftMesh.material as THREE.Material).dispose();
    this.coneMesh.geometry.dispose();
  }
}

