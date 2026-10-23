import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

function sanitizeFileSlug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'perabot-3d-model'
  );
}

/**
 * Builds a clean, standalone `THREE.Group` containing only visible exportable `THREE.Mesh`
 * geometry with world transforms baked cleanly and editor gizmos/helper lines excluded.
 */
export function buildCleanExportGroup(roots: THREE.Object3D[]): THREE.Group {
  const exportRoot = new THREE.Group();
  exportRoot.name = 'PerabotScene';

  const normalMat = new THREE.Matrix3();

  for (const root of roots) {
    root.updateMatrixWorld(true);
    root.traverse((node) => {
      if (!node.visible) return;
      if (
        node.name === '__subdivQuadLines' ||
        node.name === '__doorSwingArc' ||
        node.name === '__customPointLight' ||
        node.name === '__archCornerHandles'
      ) {
        return;
      }

      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;

      // If this mesh is an invisible root collider wrapping an imported 3D model, skip collider
      // because traverse() will visit its visible `__importedVisualRoot` child meshes directly!
      if (
        mesh.userData?.modelAssetId &&
        mesh.children.some((c) => c.name === '__importedVisualRoot')
      ) {
        return;
      }

      const clonedGeo = mesh.geometry.clone();
      clonedGeo.applyMatrix4(mesh.matrixWorld);

      // Recompute normals accurately if non-uniformly scaled
      const normAttr = clonedGeo.getAttribute('normal');
      if (normAttr) {
        normalMat.getNormalMatrix(mesh.matrixWorld);
        const v = new THREE.Vector3();
        for (let i = 0; i < normAttr.count; i++) {
          v.set(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
          v.applyMatrix3(normalMat).normalize();
          normAttr.setXYZ(i, v.x, v.y, v.z);
        }
        normAttr.needsUpdate = true;
      } else {
        clonedGeo.computeVertexNormals();
      }

      const cloneCleanMat = (m: THREE.Material): THREE.Material => {
        const cm = m.clone();
        if ((cm as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const std = cm as THREE.MeshStandardMaterial;
          if (mesh.userData?.userEmissiveHex !== undefined) {
            std.emissive.set(mesh.userData.userEmissiveHex as string);
            std.emissiveIntensity =
              (mesh.userData.userEmissiveIntensity as number) ?? 0;
          }
          std.clippingPlanes = null;
        }
        return cm;
      };

      const exportedMat = Array.isArray(mesh.material)
        ? mesh.material.map(cloneCleanMat)
        : cloneCleanMat(mesh.material);

      const outMesh = new THREE.Mesh(clonedGeo, exportedMat);
      outMesh.name =
        (mesh.userData?.name as string) ||
        mesh.name ||
        (mesh.userData?.archKind as string) ||
        'Mesh';
      exportRoot.add(outMesh);
    });
  }

  return exportRoot;
}

export function serializeGroupToOBJString(exportGroup: THREE.Group): string {
  const lines: string[] = [
    '# Exported from Perabot 3D Studio',
    `# Meshes: ${exportGroup.children.length}`,
    '',
  ];

  let vertexOffset = 1;
  let uvOffset = 1;
  let normalOffset = 1;

  exportGroup.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;

    const geo = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry;
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    const uv = geo.getAttribute('uv');
    if (!pos || pos.count < 3) return;

    const safeName = (mesh.name || 'Object').replace(/\s+/g, '_');
    lines.push(`o ${safeName}`);

    for (let i = 0; i < pos.count; i++) {
      lines.push(
        `v ${pos.getX(i).toFixed(5)} ${pos.getY(i).toFixed(5)} ${pos
          .getZ(i)
          .toFixed(5)}`
      );
    }

    if (uv) {
      for (let i = 0; i < uv.count; i++) {
        lines.push(`vt ${uv.getX(i).toFixed(5)} ${uv.getY(i).toFixed(5)}`);
      }
    }

    if (norm) {
      for (let i = 0; i < norm.count; i++) {
        lines.push(
          `vn ${norm.getX(i).toFixed(5)} ${norm.getY(i).toFixed(5)} ${norm
            .getZ(i)
            .toFixed(5)}`
        );
      }
    }

    const triCount = Math.floor(pos.count / 3);
    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      if (uv && norm) {
        lines.push(
          `f ${vertexOffset + i0}/${uvOffset + i0}/${normalOffset + i0} ${
            vertexOffset + i1
          }/${uvOffset + i1}/${normalOffset + i1} ${vertexOffset + i2}/${
            uvOffset + i2
          }/${normalOffset + i2}`
        );
      } else if (norm) {
        lines.push(
          `f ${vertexOffset + i0}//${normalOffset + i0} ${
            vertexOffset + i1
          }//${normalOffset + i1} ${vertexOffset + i2}//${normalOffset + i2}`
        );
      } else {
        lines.push(
          `f ${vertexOffset + i0} ${vertexOffset + i1} ${vertexOffset + i2}`
        );
      }
    }

    vertexOffset += pos.count;
    if (uv) uvOffset += uv.count;
    if (norm) normalOffset += norm.count;
    lines.push('');

    if (geo !== mesh.geometry) {
      geo.dispose();
    }
  });

  return lines.join('\n');
}

export async function serializeGroupToGLBBuffer(
  exportGroup: THREE.Group
): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      exportGroup,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          const json = JSON.stringify(result);
          resolve(new TextEncoder().encode(json).buffer);
        }
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadGroupAsGLB(
  roots: THREE.Object3D[],
  projectName: string,
  suffix = ''
): Promise<boolean> {
  const group = buildCleanExportGroup(roots);
  try {
    if (group.children.length === 0) return false;
    const buffer = await serializeGroupToGLBBuffer(group);
    const slug = sanitizeFileSlug(projectName) + (suffix ? `-${suffix}` : '');
    triggerBlobDownload(
      new Blob([buffer], { type: 'model/gltf-binary' }),
      `${slug}.glb`
    );
    return true;
  } finally {
    group.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
      }
    });
  }
}

export function downloadGroupAsOBJ(
  roots: THREE.Object3D[],
  projectName: string,
  suffix = ''
): boolean {
  const group = buildCleanExportGroup(roots);
  try {
    if (group.children.length === 0) return false;
    const objText = serializeGroupToOBJString(group);
    const slug = sanitizeFileSlug(projectName) + (suffix ? `-${suffix}` : '');
    triggerBlobDownload(
      new Blob([objText], { type: 'text/plain;charset=utf-8' }),
      `${slug}.obj`
    );
    return true;
  } finally {
    group.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
      }
    });
  }
}
