import * as THREE from 'three';
import { ProceduralPatternKind } from '../types/studio';

interface BasePatternEntry {
  albedoSource: HTMLCanvasElement;
  bumpSource: HTMLCanvasElement;
}

const basePatternCache = new Map<ProceduralPatternKind, BasePatternEntry>();

function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function buildPatternCanvases(kind: ProceduralPatternKind): BasePatternEntry | null {
  if (kind === 'none' || typeof document === 'undefined') return null;
  const cached = basePatternCache.get(kind);
  if (cached) return cached;

  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const aCtx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  // Base neutral pure-white fill (R=G=B -> 100% faithful to user's RGB Wheel color!)
  aCtx.fillStyle = '#fafafa';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  if (kind === 'wood') {
    // Organic wood grain planks + subtle plank seam
    const imgA = aCtx.getImageData(0, 0, size, size);
    const imgB = bCtx.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const wave =
          Math.sin(x * 0.24 + Math.sin(y * 0.045) * 3.2) * 0.5 +
          Math.sin(x * 0.62 + y * 0.02) * 0.3 +
          (hash2D(x, y) - 0.5) * 0.2;
        const plankSeam = x % 64 === 0 || (y + Math.floor(x / 64) * 96) % 256 === 0;
        const lumA = plankSeam ? 208 : Math.round(244 + wave * 11);
        const lumB = plankSeam ? 60 : Math.round(135 + wave * 42);
        imgA.data[idx] = imgA.data[idx + 1] = imgA.data[idx + 2] = Math.max(195, Math.min(255, lumA));
        imgA.data[idx + 3] = 255;
        imgB.data[idx] = imgB.data[idx + 1] = imgB.data[idx + 2] = Math.max(30, Math.min(240, lumB));
        imgB.data[idx + 3] = 255;
      }
    }
    aCtx.putImageData(imgA, 0, 0);
    bCtx.putImageData(imgB, 0, 0);
  } else if (kind === 'tile') {
    // Crisp 4x4 ceramic tile grid with recessed neutral grout
    aCtx.fillStyle = '#fcfcfc';
    aCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#b8b8b8';
    bCtx.fillRect(0, 0, size, size);

    const step = 64;
    aCtx.strokeStyle = '#d4d4d4';
    aCtx.lineWidth = 3;
    bCtx.strokeStyle = '#383838';
    bCtx.lineWidth = 4;
    for (let p = 0; p <= size; p += step) {
      aCtx.beginPath();
      aCtx.moveTo(p, 0);
      aCtx.lineTo(p, size);
      aCtx.moveTo(0, p);
      aCtx.lineTo(size, p);
      aCtx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(p, 0);
      bCtx.lineTo(p, size);
      bCtx.moveTo(0, p);
      bCtx.lineTo(size, p);
      bCtx.stroke();
    }
  } else if (kind === 'brick') {
    // Running-bond architectural brick courses
    const rows = 8;
    const cols = 4;
    const rh = size / rows;
    const cw = size / cols;

    aCtx.fillStyle = '#d6d6d6';
    aCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#353535';
    bCtx.fillRect(0, 0, size, size);

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const bx = c * cw + offset + 2;
        const by = r * rh + 2;
        const shade = 240 + Math.round((hash2D(c + 10, r + 20) - 0.5) * 18);
        aCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
        aCtx.fillRect(bx, by, cw - 4, rh - 4);

        bCtx.fillStyle = '#c8c8c8';
        bCtx.fillRect(bx, by, cw - 4, rh - 4);
      }
    }
  } else if (kind === 'concrete') {
    // Architectural board-formed / micro-pitted concrete
    const imgA = aCtx.getImageData(0, 0, size, size);
    const imgB = bCtx.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const n1 = hash2D(Math.floor(x * 0.5), Math.floor(y * 0.5));
        const n2 = hash2D(x, y);
        const lumA = Math.round(240 + (n1 - 0.5) * 18 + (n2 - 0.5) * 8);
        const lumB = Math.round(128 + (n1 - 0.5) * 55 + (n2 - 0.5) * 35);
        imgA.data[idx] = imgA.data[idx + 1] = imgA.data[idx + 2] = Math.max(210, Math.min(255, lumA));
        imgA.data[idx + 3] = 255;
        imgB.data[idx] = imgB.data[idx + 1] = imgB.data[idx + 2] = Math.max(40, Math.min(220, lumB));
        imgB.data[idx + 3] = 255;
      }
    }
    aCtx.putImageData(imgA, 0, 0);
    bCtx.putImageData(imgB, 0, 0);
  } else if (kind === 'marble') {
    // Flowing neutral marble veins
    const imgA = aCtx.getImageData(0, 0, size, size);
    const imgB = bCtx.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const warp =
          Math.sin(x * 0.035 + y * 0.025) * 2.2 +
          Math.cos(x * 0.07 - y * 0.05) * 1.1;
        const vein = Math.pow(
          Math.abs(Math.sin((x + y) * 0.032 + warp)),
          0.32
        );
        const lumA = Math.round(216 + vein * 39);
        const lumB = Math.round(112 + vein * 30);
        imgA.data[idx] = imgA.data[idx + 1] = imgA.data[idx + 2] = lumA;
        imgA.data[idx + 3] = 255;
        imgB.data[idx] = imgB.data[idx + 1] = imgB.data[idx + 2] = lumB;
        imgB.data[idx + 3] = 255;
      }
    }
    aCtx.putImageData(imgA, 0, 0);
    bCtx.putImageData(imgB, 0, 0);
  } else if (kind === 'fabric') {
    // Fine woven upholstery cross-threads (great for user-built sofas, cushions, beds)
    const imgA = aCtx.getImageData(0, 0, size, size);
    const imgB = bCtx.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const warpThread = Math.sin(x * 1.05) * Math.cos(y * 0.35);
        const weftThread = Math.sin(y * 1.05) * Math.cos(x * 0.35);
        const weave = (warpThread + weftThread) * 0.5;
        const lumA = Math.round(242 + weave * 12);
        const lumB = Math.round(128 + weave * 56);
        imgA.data[idx] = imgA.data[idx + 1] = imgA.data[idx + 2] = lumA;
        imgA.data[idx + 3] = 255;
        imgB.data[idx] = imgB.data[idx + 1] = imgB.data[idx + 2] = lumB;
        imgB.data[idx + 3] = 255;
      }
    }
    aCtx.putImageData(imgA, 0, 0);
    bCtx.putImageData(imgB, 0, 0);
  } else if (kind === 'roof-tile') {
    // Architectural Spanish / Modern interlocking roof tile ribs
    const imgA = aCtx.getImageData(0, 0, size, size);
    const imgB = bCtx.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const rib = Math.sin((x / 32) * Math.PI * 2);
        const courseOverlap = y % 42 < 4 ? -1 : 1;
        const lumA =
          courseOverlap < 0 ? 205 : Math.round(238 + rib * 15);
        const lumB =
          courseOverlap < 0 ? 45 : Math.round(135 + rib * 65);
        imgA.data[idx] = imgA.data[idx + 1] = imgA.data[idx + 2] = lumA;
        imgA.data[idx + 3] = 255;
        imgB.data[idx] = imgB.data[idx + 1] = imgB.data[idx + 2] = lumB;
        imgB.data[idx + 3] = 255;
      }
    }
    aCtx.putImageData(imgA, 0, 0);
    bCtx.putImageData(imgB, 0, 0);
  }

  const entry = { albedoSource: albedo, bumpSource: bump };
  basePatternCache.set(kind, entry);
  return entry;
}

/**
 * Applies or clears a True-RGB-preserving procedural surface pattern on a MeshStandardMaterial.
 */
export function applyProceduralPatternToMaterial(
  mat: THREE.MeshStandardMaterial,
  kind: ProceduralPatternKind | undefined,
  repeatU = 2,
  repeatV = 2
): void {
  const disposeOldTex = () => {
    if (mat.map && mat.map.userData?.isProceduralPattern) {
      mat.map.dispose();
      mat.map = null;
    }
    if (mat.bumpMap && mat.bumpMap.userData?.isProceduralPattern) {
      mat.bumpMap.dispose();
      mat.bumpMap = null;
    }
  };

  if (!kind || kind === 'none') {
    disposeOldTex();
    mat.bumpScale = 0;
    mat.needsUpdate = true;
    return;
  }

  const entry = buildPatternCanvases(kind);
  if (!entry) return;

  disposeOldTex();

  const mapTex = new THREE.CanvasTexture(entry.albedoSource);
  mapTex.colorSpace = THREE.SRGBColorSpace;
  mapTex.wrapS = THREE.RepeatWrapping;
  mapTex.wrapT = THREE.RepeatWrapping;
  mapTex.repeat.set(Math.max(0.25, repeatU), Math.max(0.25, repeatV));
  mapTex.userData = { isProceduralPattern: true, kind };

  const bumpTex = new THREE.CanvasTexture(entry.bumpSource);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(Math.max(0.25, repeatU), Math.max(0.25, repeatV));
  bumpTex.userData = { isProceduralPattern: true, kind };

  mat.map = mapTex;
  mat.bumpMap = bumpTex;
  mat.bumpScale =
    kind === 'roof-tile' || kind === 'brick'
      ? 0.032
      : kind === 'tile'
      ? 0.024
      : 0.018;
  mat.needsUpdate = true;
}
