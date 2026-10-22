import * as THREE from 'three';
import { TransformControls, TransformControlsGizmo } from 'three/examples/jsm/controls/TransformControls.js';

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

  // Soft shadow-receiving plane
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

  // Minor 0.5m grid (40m x 40m => 80 divisions)
  const minorGrid = new THREE.GridHelper(40, 80, '#252a36', '#212631');
  minorGrid.position.y = -0.001;
  (minorGrid.material as THREE.Material).transparent = true;
  (minorGrid.material as THREE.Material).opacity = 0.55;
  group.add(minorGrid);

  // Major 1.0m grid (40m x 40m => 40 divisions)
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
 * Tunes Three.js TransformControls to match Blender 4.x studio ergonomics:
 * - High-contrast luminous Red (#ff3b57), Green (#78e82c), Blue (#3898ff) axes
 * - Continuous bi-directional shafts connecting both positive & negative arrowheads
 *   (atas & bawah, kiri & kanan, depan & belakang)
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

  // Update colors across translate, rotate, and scale gizmos before first frame
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

  // Add matching negative-direction shafts on translate gizmo so both arrowheads
  // (+0.5 and -0.5) are connected through the origin for X, Y, and Z
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
    // Translate along -Y in local cylinder space, then bake axis rotation
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
