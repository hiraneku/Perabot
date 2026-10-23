import * as THREE from 'three';
import { CustomAssetPart, isModifierActive } from '../types/studio';
import { createPrimitiveGeometry } from './primitives';
import {
  applyGeometryDeformModifiers,
  syncMeshMirrorTwins,
} from './ModifierEngine';
import { applyProceduralPatternToMaterial } from './proceduralTextures';

/**
 * Renders a crisp 240x240 PNG thumbnail for user-created Custom Assets ("Koleksi Properti Saya")
 * with exact bounding-sphere framing, procedural surface patterns, emissive lamp glow & Blender modifiers!
 */
export function renderPartsThumbnailDataUrl(parts: CustomAssetPart[]): string {
  if (parts.length === 0) return '';

  try {
    const logicalSize = 120;
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
    renderer.toneMappingExposure = 1.16;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);

    scene.add(new THREE.HemisphereLight('#f8fafc', '#1e293b', 1.1));
    const key = new THREE.DirectionalLight('#fffbeb', 2.2);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#93c5fd', 0.95);
    rim.position.set(-5, 4, -5);
    scene.add(rim);

    const group = new THREE.Group();
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const DEG = Math.PI / 180;

    for (const p of parts) {
      if (p.modelAssetId) continue;
      let geo = createPrimitiveGeometry(p.kind);
      if (isModifierActive(p.modifiers)) {
        geo = applyGeometryDeformModifiers(geo, p.modifiers);
      }
      geos.push(geo);

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.color),
        roughness: p.roughness,
        metalness: p.metalness,
        transparent: p.opacity < 0.99,
        opacity: p.opacity,
        emissive: new THREE.Color(p.emissive || '#000000'),
        emissiveIntensity: p.emissiveIntensity || 0,
      });
      if (p.proceduralPattern && p.proceduralPattern !== 'none') {
        const rep = p.patternScale ?? 1;
        applyProceduralPatternToMaterial(mat, p.proceduralPattern, rep, rep);
      }
      mats.push(mat);

      const m = new THREE.Mesh(geo, mat);
      m.position.set(p.localPosition.x, p.localPosition.y, p.localPosition.z);
      m.rotation.set(
        p.rotation.x * DEG,
        p.rotation.y * DEG,
        p.rotation.z * DEG
      );
      m.scale.set(p.scale.x, p.scale.y, p.scale.z);
      if (p.modifiers?.mirrorX || p.modifiers?.mirrorZ) {
        syncMeshMirrorTwins(m, p.modifiers, mat);
      }
      group.add(m);
    }

    if (group.children.length === 0) {
      renderer.dispose();
      renderer.forceContextLoss();
      return '';
    }

    scene.add(group);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    group.position.set(-sphere.center.x, -sphere.center.y, -sphere.center.z);

    const halfFovSin = Math.sin(THREE.MathUtils.degToRad(17));
    const radius = Math.max(sphere.radius, 0.45);
    const dist = (radius / halfFovSin) * 1.28;

    camera.position
      .set(1.45, 1.12, 1.78)
      .normalize()
      .multiplyScalar(dist);
    camera.lookAt(0, 0, 0);

    renderer.clear();
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return dataUrl;
  } catch {
    return '';
  }
}
