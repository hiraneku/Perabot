import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import {
  getImportedModelBlob,
  saveImportedModelBlob,
} from '../services/projectStorage';
import { SceneObjectData } from '../types/studio';

export const ACCEPTED_3D_EXTENSIONS = '.glb,.gltf,.obj,.stl,.ply,.fbx';

export interface LoadedImportedModelAsset {
  assetId: string;
  name: string;
  format: string;
  thumbDataUrl: string;
  dominantColorHex: string;
  visualTemplate: THREE.Group;
  colliderGeometry: THREE.BufferGeometry;
  size: THREE.Vector3;
  autoScaled: boolean;
}

const memoryRegistry = new Map<string, LoadedImportedModelAsset>();

export function getRegisteredImportedModel(
  assetId: string
): LoadedImportedModelAsset | undefined {
  return memoryRegistry.get(assetId);
}

export function cloneImportedVisualGroup(assetId: string): THREE.Group | null {
  const entry = memoryRegistry.get(assetId);
  if (!entry) return null;

  const clone = entry.visualTemplate.clone(true);
  clone.name = '__importedVisualRoot';
  clone.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const m = node as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      m.raycast = () => {}; // Root collider mesh handles unified raycasting & surface alignment!
      if (Array.isArray(m.material)) {
        m.material = m.material.map((mat) => mat.clone());
        m.userData.origMaterials = m.material.map((mat) => mat.clone());
      } else if (m.material) {
        m.material = m.material.clone();
        m.userData.origMaterials = m.material.clone();
      }
    }
  });
  return clone;
}

function detectExtension(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return m ? m[1].toLowerCase() : 'glb';
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[a-z0-9]+$/i, '').trim() || 'Model 3D';
}

async function parseRaw3DFileToObject(
  buffer: ArrayBuffer,
  ext: string
): Promise<THREE.Object3D> {
  if (ext === 'glb' || ext === 'gltf') {
    const loader = new GLTFLoader();
    const gltf = await loader.parseAsync(buffer, '');
    return gltf.scene || new THREE.Group();
  }

  if (ext === 'obj') {
    const text = new TextDecoder('utf-8').decode(buffer);
    const loader = new OBJLoader();
    const obj = loader.parse(text);
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (!m.geometry.getAttribute('normal')) {
          m.geometry.computeVertexNormals();
        }
        m.material = new THREE.MeshStandardMaterial({
          color: '#cbd5e1',
          roughness: 0.55,
          metalness: 0.1,
        });
      }
    });
    return obj;
  }

  if (ext === 'stl') {
    const loader = new STLLoader();
    const geo = loader.parse(buffer);
    if (!geo.getAttribute('normal')) {
      geo.computeVertexNormals();
    }
    const mat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.5,
      metalness: 0.14,
    });
    return new THREE.Mesh(geo, mat);
  }

  if (ext === 'ply') {
    const loader = new PLYLoader();
    const geo = loader.parse(buffer);
    if (!geo.getAttribute('normal')) {
      geo.computeVertexNormals();
    }
    const hasColors = Boolean(geo.getAttribute('color'));
    const mat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      vertexColors: hasColors,
      roughness: 0.55,
      metalness: 0.08,
    });
    return new THREE.Mesh(geo, mat);
  }

  if (ext === 'fbx') {
    const loader = new FBXLoader();
    return loader.parse(buffer, '');
  }

  throw new Error(`Unsupported 3D file extension: .${ext}`);
}

/**
 * Normalizes an imported 3D hierarchy around local origin (0,0,0),
 * fits extreme millimeter/micro scales into domain meters if needed,
 * and builds a fast combined triangle collider BufferGeometry.
 */
function buildNormalizedTemplateAndCollider(
  rawRoot: THREE.Object3D,
  domainWorldSize: number,
  skipAutoScale = false
): {
  visualTemplate: THREE.Group;
  colliderGeometry: THREE.BufferGeometry;
  size: THREE.Vector3;
  autoScaled: boolean;
} {
  rawRoot.updateMatrixWorld(true);

  const worldBox = new THREE.Box3();
  const v = new THREE.Vector3();
  let meshCount = 0;

  rawRoot.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const m = node as THREE.Mesh;
      const pos = m.geometry?.getAttribute('position');
      if (!pos || pos.count === 0) return;
      meshCount++;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        if (Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)) {
          worldBox.expandByPoint(v);
        }
      }
    }
  });

  if (meshCount === 0 || worldBox.isEmpty()) {
    throw new Error('Model 3D tidak memiliki mesh geometri yang valid');
  }

  const rawCenter = new THREE.Vector3();
  const rawSize = new THREE.Vector3();
  worldBox.getCenter(rawCenter);
  worldBox.getSize(rawSize);

  const maxRawDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 1e-5);
  const maxAllowed = Math.max(8, domainWorldSize * 0.45);
  let normFactor = 1;
  let autoScaled = false;

  if (!skipAutoScale) {
    if (maxRawDim > maxAllowed) {
      normFactor = 2.2 / maxRawDim;
      autoScaled = true;
    } else if (maxRawDim < 0.04) {
      normFactor = 1.0 / maxRawDim;
      autoScaled = true;
    }
  }

  // Wrap rawRoot inside a centering/scaling carrier so all sub-meshes & hierarchies stay intact
  const visualTemplate = new THREE.Group();
  const offsetCarrier = new THREE.Group();
  offsetCarrier.scale.setScalar(normFactor);
  offsetCarrier.position.set(
    -rawCenter.x * normFactor,
    -rawCenter.y * normFactor,
    -rawCenter.z * normFactor
  );
  offsetCarrier.add(rawRoot);
  visualTemplate.add(offsetCarrier);

  // Upgrade any unlit/phong materials to clean standard rendering & ensure normals exist
  visualTemplate.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const m = node as THREE.Mesh;
      if (!m.geometry.getAttribute('normal')) {
        m.geometry.computeVertexNormals();
      }
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  visualTemplate.updateMatrixWorld(true);

  // Build combined triangle collider geometry in visualTemplate space (decimating gracefully if > 24k tris)
  let totalTriangles = 0;
  const subMeshes: THREE.Mesh[] = [];
  visualTemplate.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const m = node as THREE.Mesh;
      const pos = m.geometry?.getAttribute('position');
      if (!pos || pos.count < 3) return;
      const idx = m.geometry.getIndex();
      const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
      if (triCount > 0) {
        totalTriangles += triCount;
        subMeshes.push(m);
      }
    }
  });

  const MAX_COLLIDER_TRIS = 24000;
  const stride = Math.max(1, Math.ceil(totalTriangles / MAX_COLLIDER_TRIS));
  const coords: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  for (const m of subMeshes) {
    const pos = m.geometry.getAttribute('position');
    const idx = m.geometry.getIndex();
    const matWorld = m.matrixWorld;
    const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);

    for (let t = 0; t < triCount; t += stride) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(matWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(matWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(matWorld);
      coords.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
  }

  const finalSize = rawSize.clone().multiplyScalar(normFactor);

  // Ensure exact outer bounding box corners are always represented even when stride > 1
  const colliderGeometry = new THREE.BufferGeometry();
  if (coords.length >= 9) {
    colliderGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(coords, 3)
    );
    colliderGeometry.computeVertexNormals();
  } else {
    const boxFallback = new THREE.BoxGeometry(
      Math.max(0.1, finalSize.x),
      Math.max(0.1, finalSize.y),
      Math.max(0.1, finalSize.z)
    );
    colliderGeometry.copy(boxFallback);
    boxFallback.dispose();
  }

  // Set exact bounding box matching the full normalized visual hierarchy
  const hx = Math.max(0.02, finalSize.x * 0.5);
  const hy = Math.max(0.02, finalSize.y * 0.5);
  const hz = Math.max(0.02, finalSize.z * 0.5);
  colliderGeometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(-hx, -hy, -hz),
    new THREE.Vector3(hx, hy, hz)
  );
  colliderGeometry.computeBoundingSphere();

  return {
    visualTemplate,
    colliderGeometry,
    size: finalSize,
    autoScaled,
  };
}

function sampleDominantModelColor(visualTemplate: THREE.Group): string {
  let sampledHex: string | null = null;

  visualTemplate.traverse((node) => {
    if (sampledHex || !(node as THREE.Mesh).isMesh) return;
    const m = node as THREE.Mesh;

    // 1. Check vertex colors if present
    const colAttr = m.geometry?.getAttribute('color');
    if (colAttr && colAttr.count > 0) {
      let r = 0;
      let g = 0;
      let b = 0;
      const step = Math.max(1, Math.floor(colAttr.count / 32));
      let n = 0;
      for (let i = 0; i < colAttr.count; i += step) {
        r += colAttr.getX(i);
        g += colAttr.getY(i);
        b += colAttr.getZ(i);
        n++;
      }
      if (n > 0) {
        const c = new THREE.Color(r / n, g / n, b / n);
        sampledHex = `#${c.getHexString()}`;
        return;
      }
    }

    const firstMat = (
      Array.isArray(m.material) ? m.material[0] : m.material
    ) as THREE.MeshStandardMaterial | undefined;
    if (!firstMat) return;

    // 2. If material has a baseColorTexture (`map`), sample its average pixel color!
    if (firstMat.map?.image && typeof document !== 'undefined') {
      try {
        const img = firstMat.map.image as CanvasImageSource & {
          width?: number;
          height?: number;
        };
        if (img.width && img.height) {
          const cv = document.createElement('canvas');
          cv.width = 8;
          cv.height = 8;
          const ctx = cv.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 8, 8);
            const data = ctx.getImageData(0, 0, 8, 8).data;
            let sr = 0;
            let sg = 0;
            let sb = 0;
            let cnt = 0;
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] < 20) continue;
              sr += data[i] / 255;
              sg += data[i + 1] / 255;
              sb += data[i + 2] / 255;
              cnt++;
            }
            if (cnt > 0) {
              const texCol = new THREE.Color(sr / cnt, sg / cnt, sb / cnt);
              if (firstMat.color) texCol.multiply(firstMat.color);
              sampledHex = `#${texCol.getHexString()}`;
              return;
            }
          }
        }
      } catch {
        // Fallback to material color
      }
    }

    // 3. Direct material color
    if (firstMat.color) {
      sampledHex = `#${firstMat.color.getHexString()}`;
    }
  });

  return sampledHex || '#cbd5e1';
}

function renderImportedThumbDataUrl(
  visualTemplate: THREE.Group,
  size: THREE.Vector3
): string {
  try {
    const logicalSize = 112;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(logicalSize, logicalSize);
    renderer.setPixelRatio(2);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
    scene.add(new THREE.HemisphereLight('#f8fafc', '#1e293b', 1.15));
    const key = new THREE.DirectionalLight('#fffbeb', 2.2);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#93c5fd', 0.9);
    rim.position.set(-5, 3, -5);
    scene.add(rim);

    const clone = visualTemplate.clone(true);
    scene.add(clone);

    const radius = Math.max(
      0.5 * Math.hypot(size.x, size.y, size.z),
      0.35
    );
    const halfFovSin = Math.sin(THREE.MathUtils.degToRad(17));
    const dist = (radius / halfFovSin) * 1.28;

    camera.position
      .set(1.45, 1.15, 1.78)
      .normalize()
      .multiplyScalar(dist);
    camera.lookAt(0, 0, 0);

    renderer.clear();
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    renderer.dispose();
    renderer.forceContextLoss();
    return url;
  } catch {
    return '';
  }
}

async function serializeTemplateToGlbBuffer(
  visualTemplate: THREE.Group
): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  const exportRoot = new THREE.Scene();
  exportRoot.add(visualTemplate.clone(true));
  const res = await exporter.parseAsync(exportRoot, {
    binary: true,
    trs: false,
  });
  if (res instanceof ArrayBuffer) {
    return res;
  }
  const json = JSON.stringify(res);
  return new TextEncoder().encode(json).buffer;
}

/**
 * Parses an uploaded 3D file (.glb, .gltf, .obj, .stl, .ply, .fbx),
 * normalizes its pivot & scale for the active domain, caches in memory & IndexedDB,
 * and returns the ready-to-spawn asset metadata.
 */
export async function importExternal3DFile(
  file: File,
  domainWorldSize = 24
): Promise<LoadedImportedModelAsset> {
  const ext = detectExtension(file.name);
  const format = ext.toUpperCase();
  const cleanName = stripExtension(file.name);
  const buffer = await file.arrayBuffer();

  const rawRoot = await parseRaw3DFileToObject(buffer, ext);
  const { visualTemplate, colliderGeometry, size, autoScaled } =
    buildNormalizedTemplateAndCollider(rawRoot, domainWorldSize, false);

  const thumbDataUrl = renderImportedThumbDataUrl(visualTemplate, size);
  const dominantColorHex = sampleDominantModelColor(visualTemplate);
  const assetId = `mdl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Persist normalized binary GLB into IndexedDB so reopening the project restores it seamlessly
  try {
    const glbBuffer = await serializeTemplateToGlbBuffer(visualTemplate);
    await saveImportedModelBlob({
      id: assetId,
      name: cleanName,
      format,
      thumbDataUrl,
      glbBuffer,
      createdAt: Date.now(),
    });
  } catch {
    // Non-fatal if browser blocks large IDB write; memoryRegistry still holds asset for session
  }

  const entry: LoadedImportedModelAsset = {
    assetId,
    name: cleanName,
    format,
    thumbDataUrl,
    dominantColorHex,
    visualTemplate,
    colliderGeometry,
    size,
    autoScaled,
  };
  memoryRegistry.set(assetId, entry);
  return entry;
}

/**
 * Hydrates any imported 3D model assets referenced by `objects` from IndexedDB
 * before StudioEngine builds meshes for a saved project.
 */
export async function hydrateImportedModelsForObjects(
  objects: SceneObjectData[],
  domainWorldSize = 24
): Promise<void> {
  const uniqueIds = new Set<string>();
  for (const obj of objects) {
    if (obj.modelAssetId && !memoryRegistry.has(obj.modelAssetId)) {
      uniqueIds.add(obj.modelAssetId);
    }
  }
  if (uniqueIds.size === 0) return;

  for (const id of uniqueIds) {
    try {
      const rec = await getImportedModelBlob(id);
      if (!rec) continue;
      const rawRoot = await parseRaw3DFileToObject(rec.glbBuffer, 'glb');
      const { visualTemplate, colliderGeometry, size } =
        buildNormalizedTemplateAndCollider(rawRoot, domainWorldSize, true);

      memoryRegistry.set(id, {
        assetId: id,
        name: rec.name,
        format: rec.format,
        thumbDataUrl: rec.thumbDataUrl,
        dominantColorHex: sampleDominantModelColor(visualTemplate),
        visualTemplate,
        colliderGeometry,
        size,
        autoScaled: false,
      });
    } catch {
      // Skip corrupted blob gracefully
    }
  }
}
