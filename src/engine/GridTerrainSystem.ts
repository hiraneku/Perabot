import * as THREE from 'three';
import {
  DEFAULT_GRID_SETTINGS,
  GridSettings,
  TerrainSculptTool,
} from '../types/studio';

const SCULPT_GRID_RES = 65;

function encodeFloat32ToBase64(arr: Float32Array): string {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === 'function' ? btoa(binary) : '';
}

function decodeBase64ToFloat32(b64: string, expectedLen: number): Float32Array | null {
  try {
    if (!b64 || typeof atob !== 'function') return null;
    const binary = atob(b64);
    if (binary.length !== expectedLen * 4) return null;
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Float32Array(bytes.buffer);
  } catch {
    return null;
  }
}

function makeBadgeSprite(
  text: string,
  opts: {
    bg?: string;
    border?: string;
    textColor?: string;
    scaleX?: number;
    scaleY?: number;
    fontSize?: number;
  } = {}
): THREE.Sprite {
  const {
    bg = 'rgba(15, 23, 42, 0.84)',
    border = 'rgba(148, 163, 184, 0.45)',
    textColor = '#e2e8f0',
    scaleX = 0.82,
    scaleY = 0.34,
    fontSize = 30,
  } = opts;

  if (typeof document === 'undefined') {
    return new THREE.Sprite();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pad = 8;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;
    const r = 22;

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(pad, pad, w, h, r);
    } else {
      ctx.rect(pad, pad, w, h);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.52);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.raycast = () => {};
  return sprite;
}

export class GridTerrainSystem {
  public readonly group = new THREE.Group();
  private readonly staticGroup = new THREE.Group();
  private readonly footprintGroup = new THREE.Group();
  private readonly sculptCursorGroup = new THREE.Group();

  private settings: GridSettings = { ...DEFAULT_GRID_SETTINGS };
  private adaptiveSpacing = 1.0;
  private groundCollider: THREE.Mesh | null = null;
  private terrainGridLines: THREE.LineSegments | null = null;
  private tileTexture: THREE.CanvasTexture | null = null;
  private lastFootprintBox: THREE.Box3 | null = null;

  /** Sculptable heightmap offsets (65x65) layered seamlessly onto terrain */
  private sculptOffsets = new Float32Array(SCULPT_GRID_RES * SCULPT_GRID_RES);
  private hasCustomSculpt = false;

  constructor() {
    this.group.name = '__worldGridTerrainSystem';
    this.staticGroup.name = '__gridStaticLayer';
    this.footprintGroup.name = '__gridSelectionFootprint';
    this.sculptCursorGroup.name = '__terrainSculptCursor';
    this.group.add(this.staticGroup);
    this.group.add(this.footprintGroup);
    this.group.add(this.sculptCursorGroup);
    this.adaptiveSpacing = this.settings.spacing;
    this.rebuild();
  }

  public getSettings(): GridSettings {
    return {
      ...this.settings,
      terrainHeightmapB64: this.hasCustomSculpt
        ? encodeFloat32ToBase64(this.sculptOffsets)
        : undefined,
      terrainGridRes: this.hasCustomSculpt ? SCULPT_GRID_RES : undefined,
    };
  }

  public getEffectiveSpacing(): number {
    return this.settings.adaptive ? this.adaptiveSpacing : this.settings.spacing;
  }

  /**
   * #8 Adaptive Grid: Dynamically adjusts cell density based on camera zoom distance
   * & selected object scale, with hysteresis so transitions never flicker.
   * Returns `true` if effective spacing changed.
   */
  public updateAdaptiveZoom(
    cameraDistToTarget: number,
    selectedMaxSpan = 0
  ): boolean {
    if (!this.settings.adaptive || !this.settings.visible) return false;

    // Blend camera distance with small-object focus when zoomed in on fine details
    const refDist =
      selectedMaxSpan > 0 && selectedMaxSpan < 0.8 && cameraDistToTarget < 4
        ? Math.min(cameraDistToTarget, selectedMaxSpan * 4.5)
        : cameraDistToTarget;

    let desired = this.adaptiveSpacing;
    if (refDist < 2.4) desired = 0.1;
    else if (refDist < 5.8) desired = 0.25;
    else if (refDist < 12.5) desired = 0.5;
    else if (refDist < 28) desired = 1.0;
    else if (refDist < 55) desired = 2.0;
    else desired = 5.0;

    if (Math.abs(desired - this.adaptiveSpacing) < 0.001) return false;

    // 12% hysteresis band around boundaries to prevent oscillation while orbiting
    const ratio = desired / this.adaptiveSpacing;
    if (ratio > 1 && refDist < this.thresholdFor(desired) * 1.08) return false;
    if (ratio < 1 && refDist > this.thresholdFor(this.adaptiveSpacing) * 0.92) {
      return false;
    }

    this.adaptiveSpacing = desired;
    this.rebuild();
    this.updateSelectionFootprint(this.lastFootprintBox);
    return true;
  }

  private thresholdFor(step: number): number {
    if (step <= 0.1) return 2.4;
    if (step <= 0.25) return 5.8;
    if (step <= 0.5) return 12.5;
    if (step <= 1.0) return 28;
    if (step <= 2.0) return 55;
    return 90;
  }

  public updateSettings(patch: Partial<GridSettings>): GridSettings {
    const prevB64 = this.settings.terrainHeightmapB64;
    this.settings = {
      ...DEFAULT_GRID_SETTINGS,
      ...this.settings,
      ...patch,
    };

    if ('terrainHeightmapB64' in patch) {
      if (patch.terrainHeightmapB64) {
        const decoded = decodeBase64ToFloat32(
          patch.terrainHeightmapB64,
          SCULPT_GRID_RES * SCULPT_GRID_RES
        );
        if (decoded) {
          this.sculptOffsets.set(decoded);
          this.hasCustomSculpt = true;
        }
      } else if (patch.terrainHeightmapB64 === undefined && prevB64) {
        this.sculptOffsets.fill(0);
        this.hasCustomSculpt = false;
      }
    }

    if (!this.settings.adaptive) {
      this.adaptiveSpacing = this.settings.spacing;
    }

    this.rebuild();
    this.updateSelectionFootprint(this.lastFootprintBox);
    return this.getSettings();
  }

  public getGroundCollider(): THREE.Mesh | null {
    return this.groundCollider;
  }

  /**
   * Bilinearly samples sculpted height offset at world (x, z)
   */
  private sampleSculptOffset(x: number, z: number): number {
    if (!this.hasCustomSculpt) return 0;
    const size = Math.max(10, this.settings.worldSize);
    const half = size * 0.5;
    const u = ((x + half) / size) * (SCULPT_GRID_RES - 1);
    const v = ((z + half) / size) * (SCULPT_GRID_RES - 1);
    const uClamped = Math.max(0, Math.min(SCULPT_GRID_RES - 1.0001, u));
    const vClamped = Math.max(0, Math.min(SCULPT_GRID_RES - 1.0001, v));

    const i0 = Math.floor(uClamped);
    const j0 = Math.floor(vClamped);
    const i1 = Math.min(SCULPT_GRID_RES - 1, i0 + 1);
    const j1 = Math.min(SCULPT_GRID_RES - 1, j0 + 1);
    const fx = uClamped - i0;
    const fz = vClamped - j0;

    const h00 = this.sculptOffsets[j0 * SCULPT_GRID_RES + i0];
    const h10 = this.sculptOffsets[j0 * SCULPT_GRID_RES + i1];
    const h01 = this.sculptOffsets[j1 * SCULPT_GRID_RES + i0];
    const h11 = this.sculptOffsets[j1 * SCULPT_GRID_RES + i1];

    const hx0 = h00 + (h10 - h00) * fx;
    const hx1 = h01 + (h11 - h01) * fx;
    return hx0 + (hx1 - hx0) * fz;
  }

  private sampleBaseProceduralHeight(x: number, z: number): number {
    const base = this.settings.elevationY;
    if (this.settings.style !== 'terrain' || this.settings.terrainPreset === 'flat') {
      return base;
    }

    const amp = this.settings.terrainAmplitude;
    const preset = this.settings.terrainPreset;

    if (preset === 'hills') {
      const h =
        amp *
        (0.52 * Math.sin(x * 0.21) * Math.cos(z * 0.19) +
          0.28 * Math.sin((x + z) * 0.31 + 0.6) +
          0.16 * Math.cos(x * 0.52 - z * 0.46));
      return base + h;
    }

    if (preset === 'valley') {
      const dist = Math.hypot(x, z);
      const t = Math.max(0, Math.min(1, (dist - 3.2) / 11));
      const smooth = t * t * (3 - 2 * t);
      const wave = 0.85 + 0.35 * Math.sin(x * 0.26) * Math.cos(z * 0.26);
      return base + smooth * amp * wave;
    }

    const raw =
      amp *
      (0.58 * Math.sin(x * 0.18) * Math.cos(z * 0.18) +
        0.25 * Math.sin(x * 0.33 - z * 0.27) +
        0.65);
    const stepSize = 0.5;
    const idx = Math.floor(raw / stepSize);
    const frac = raw / stepSize - idx;
    const riser = frac < 0.78 ? 0 : (frac - 0.78) / 0.22;
    const smoothRiser = riser * riser * (3 - 2 * riser);
    return base + (idx + smoothRiser) * stepSize - amp * 0.35;
  }

  /**
   * Computes exact ground/terrain height Y at world (x, z) including sculpted contours!
   */
  public sampleHeight(x: number, z: number): number {
    const base = this.sampleBaseProceduralHeight(x, z);
    if (this.settings.style !== 'terrain') {
      return base;
    }
    return base + this.sampleSculptOffset(x, z);
  }

  /**
   * Computes exact unit upward surface normal of the ground/terrain at world (x, z)
   */
  public sampleNormal(x: number, z: number): THREE.Vector3 {
    if (
      this.settings.style !== 'terrain' ||
      (this.settings.terrainPreset === 'flat' && !this.hasCustomSculpt)
    ) {
      return new THREE.Vector3(0, 1, 0);
    }
    const e = 0.12;
    const hL = this.sampleHeight(x - e, z);
    const hR = this.sampleHeight(x + e, z);
    const hD = this.sampleHeight(x, z - e);
    const hU = this.sampleHeight(x, z + e);
    return new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
  }

  /**
   * Computes local terrain slope angle in degrees (0° = dead flat, 90° = vertical cliff)
   */
  public sampleSlopeDegrees(x: number, z: number): number {
    const n = this.sampleNormal(x, z);
    return (Math.acos(Math.max(-1, Math.min(1, n.y))) * 180) / Math.PI;
  }

  /* =========================================================
     #3 Interactive Terrain Sculpting Engine
     ========================================================= */
  public ensureTerrainStyleActive(): void {
    if (this.settings.style !== 'terrain') {
      this.settings.style = 'terrain';
      this.settings.terrainPreset = 'flat';
      this.rebuild();
    }
  }

  public sculptTerrainAt(
    worldX: number,
    worldZ: number,
    tool: TerrainSculptTool,
    radius: number,
    strength: number,
    flattenHeight = 0
  ): void {
    this.ensureTerrainStyleActive();

    const size = Math.max(10, this.settings.worldSize);
    const half = size * 0.5;
    const cellSpan = size / (SCULPT_GRID_RES - 1);
    const rSafe = Math.max(0.4, radius);
    const power = Math.max(0.05, Math.min(1, strength));

    const minI = Math.max(
      0,
      Math.floor((worldX - rSafe + half) / cellSpan)
    );
    const maxI = Math.min(
      SCULPT_GRID_RES - 1,
      Math.ceil((worldX + rSafe + half) / cellSpan)
    );
    const minJ = Math.max(
      0,
      Math.floor((worldZ - rSafe + half) / cellSpan)
    );
    const maxJ = Math.min(
      SCULPT_GRID_RES - 1,
      Math.ceil((worldZ + rSafe + half) / cellSpan)
    );

    // Pre-snapshot neighbor heights for Laplacian smooth brush
    let copyForSmooth: Float32Array | null = null;
    if (tool === 'smooth') {
      copyForSmooth = new Float32Array(this.sculptOffsets);
    }

    for (let j = minJ; j <= maxJ; j++) {
      const vz = -half + j * cellSpan;
      for (let i = minI; i <= maxI; i++) {
        const vx = -half + i * cellSpan;
        const dist = Math.hypot(vx - worldX, vz - worldZ);
        if (dist > rSafe) continue;

        // Smooth cosine bell falloff (1 at center -> 0 at edge)
        const falloff = 0.5 * (1 + Math.cos((Math.PI * dist) / rSafe));
        const idx = j * SCULPT_GRID_RES + i;
        const procBase = this.sampleBaseProceduralHeight(vx, vz);
        const curTotalY = procBase + this.sculptOffsets[idx];

        let nextTotalY = curTotalY;

        if (tool === 'raise') {
          nextTotalY = curTotalY + falloff * power * 0.22;
        } else if (tool === 'lower') {
          nextTotalY = curTotalY - falloff * power * 0.22;
        } else if (tool === 'flatten') {
          const blend = Math.min(1, falloff * power * 0.42);
          nextTotalY = curTotalY + (flattenHeight - curTotalY) * blend;
        } else if (tool === 'smooth' && copyForSmooth) {
          let sum = 0;
          let count = 0;
          for (let dj = -1; dj <= 1; dj++) {
            const nj = j + dj;
            if (nj < 0 || nj >= SCULPT_GRID_RES) continue;
            for (let di = -1; di <= 1; di++) {
              const ni = i + di;
              if (ni < 0 || ni >= SCULPT_GRID_RES) continue;
              const nx = -half + ni * cellSpan;
              const nz = -half + nj * cellSpan;
              sum +=
                this.sampleBaseProceduralHeight(nx, nz) +
                copyForSmooth[nj * SCULPT_GRID_RES + ni];
              count++;
            }
          }
          const avgY = count > 0 ? sum / count : curTotalY;
          nextTotalY = curTotalY + (avgY - curTotalY) * falloff * power * 0.55;
        } else if (tool === 'terrace') {
          const stepH = 0.5;
          const terracedY = Math.round(curTotalY / stepH) * stepH;
          nextTotalY =
            curTotalY + (terracedY - curTotalY) * falloff * power * 0.45;
        }

        const clampedOffset = Math.max(-6, Math.min(9, nextTotalY - procBase));
        this.sculptOffsets[idx] = clampedOffset;
      }
    }

    this.hasCustomSculpt = true;
    this.updateTerrainVerticesFast();
  }

  /**
   * 1-Click Architectural Site Grading: Flattens the Plot/Kavling rectangle to `targetY`
   * with a smooth natural embankment apron around its perimeter!
   */
  public levelPlotPad(
    plotW = this.settings.plotWidth,
    plotD = this.settings.plotDepth,
    targetY = this.settings.elevationY
  ): GridSettings {
    this.ensureTerrainStyleActive();
    const size = Math.max(10, this.settings.worldSize);
    const half = size * 0.5;
    const cellSpan = size / (SCULPT_GRID_RES - 1);
    const hw = Math.max(1, plotW * 0.5);
    const hd = Math.max(1, plotD * 0.5);
    const apron = 2.4;

    for (let j = 0; j < SCULPT_GRID_RES; j++) {
      const vz = -half + j * cellSpan;
      for (let i = 0; i < SCULPT_GRID_RES; i++) {
        const vx = -half + i * cellSpan;
        const dx = Math.max(0, Math.abs(vx) - hw);
        const dz = Math.max(0, Math.abs(vz) - hd);
        const distOutside = Math.hypot(dx, dz);
        if (distOutside > apron) continue;

        const idx = j * SCULPT_GRID_RES + i;
        const procBase = this.sampleBaseProceduralHeight(vx, vz);
        const curY = procBase + this.sculptOffsets[idx];
        const t = distOutside <= 0.01 ? 1 : 0.5 * (1 + Math.cos((Math.PI * distOutside) / apron));
        const nextY = curY + (targetY - curY) * t;
        this.sculptOffsets[idx] = nextY - procBase;
      }
    }

    this.hasCustomSculpt = true;
    this.settings.terrainHeightmapB64 = encodeFloat32ToBase64(
      this.sculptOffsets
    );
    this.settings.terrainGridRes = SCULPT_GRID_RES;
    this.rebuild();
    return this.getSettings();
  }

  public exportSculptedHeightsBase64(): string | null {
    if (!this.hasCustomSculpt) return null;
    return encodeFloat32ToBase64(this.sculptOffsets);
  }

  public importSculptedHeightsBase64(b64: string | null | undefined): void {
    if (b64) {
      const decoded = decodeBase64ToFloat32(
        b64,
        SCULPT_GRID_RES * SCULPT_GRID_RES
      );
      if (decoded) {
        this.sculptOffsets.set(decoded);
        this.hasCustomSculpt = true;
        this.settings.terrainHeightmapB64 = b64;
        this.settings.terrainGridRes = SCULPT_GRID_RES;
        this.rebuild();
        return;
      }
    }
    this.sculptOffsets.fill(0);
    this.hasCustomSculpt = false;
    this.settings.terrainHeightmapB64 = undefined;
    this.rebuild();
  }

  public resetSculptedTerrain(): GridSettings {
    this.sculptOffsets.fill(0);
    this.hasCustomSculpt = false;
    this.settings.terrainHeightmapB64 = undefined;
    if (this.settings.style === 'terrain') {
      this.settings.terrainPreset = 'flat';
    }
    this.rebuild();
    return this.getSettings();
  }

  /**
   * Updates the 3D terrain mesh vertices, slope/biome colors, and draped contour lines
   * in < 0.8ms during live pointer dragging without recreating sprites!
   */
  private updateTerrainVerticesFast(): void {
    if (!this.groundCollider || this.settings.style !== 'terrain') return;
    const geo = this.groundCollider.geometry;
    const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
    const col = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (!pos || !col) return;

    const elev = this.settings.elevationY;
    const soilLow = new THREE.Color('#3b3328');
    const grassMid = new THREE.Color('#2f4c39');
    const grassHigh = new THREE.Color('#426646');
    const rockSlope = new THREE.Color('#5a6470');
    const tmpCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.sampleHeight(x, z);
      pos.setY(i, y);

      const relH = y - elev;
      const slopeDeg = this.sampleSlopeDegrees(x, z);
      const rockBlend = Math.max(0, Math.min(1, (slopeDeg - 20) / 24));

      if (relH < -0.2) {
        const t = Math.max(0, Math.min(1, (relH + 1.4) / 1.2));
        tmpCol.copy(soilLow).lerp(grassMid, t);
      } else {
        const t = Math.max(0, Math.min(1, relH / 2.6));
        tmpCol.copy(grassMid).lerp(grassHigh, t);
      }

      if (rockBlend > 0.01) {
        tmpCol.lerp(rockSlope, rockBlend * 0.88);
      }

      col.setXYZ(i, tmpCol.r, tmpCol.g, tmpCol.b);
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    // Update draped grid lines on terrain if present
    if (this.terrainGridLines) {
      const lPos = this.terrainGridLines.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute | undefined;
      if (lPos) {
        for (let k = 0; k < lPos.count; k++) {
          const lx = lPos.getX(k);
          const lz = lPos.getZ(k);
          lPos.setY(k, this.sampleHeight(lx, lz) + 0.01);
        }
        lPos.needsUpdate = true;
      }
    }
  }

  public finalizeSculptStroke(): GridSettings {
    if (this.hasCustomSculpt) {
      this.settings.terrainHeightmapB64 = encodeFloat32ToBase64(
        this.sculptOffsets
      );
      this.settings.terrainGridRes = SCULPT_GRID_RES;
    }
    this.rebuild();
    this.updateSelectionFootprint(this.lastFootprintBox);
    return this.getSettings();
  }

  /**
   * Renders a crisp 3D Terrain Sculpt Brush Ring draped directly over the terrain contour!
   */
  public updateSculptCursor(
    worldPoint: THREE.Vector3 | null,
    radius = 2.5,
    tool: TerrainSculptTool = 'raise'
  ): void {
    this.clearGroupChildren(this.sculptCursorGroup);
    if (!worldPoint) return;

    const colorHex =
      tool === 'lower'
        ? '#f97316'
        : tool === 'flatten'
        ? '#38bdf8'
        : tool === 'smooth'
        ? '#c084fc'
        : tool === 'terrace'
        ? '#facc15'
        : '#4ade80';

    const segs = 48;
    const outerPts: THREE.Vector3[] = [];
    const innerPts: THREE.Vector3[] = [];
    const rOuter = Math.max(0.3, radius);
    const rInner = rOuter * 0.45;

    for (let i = 0; i <= segs; i++) {
      const ang = (i / segs) * Math.PI * 2;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);

      const ox = worldPoint.x + cos * rOuter;
      const oz = worldPoint.z + sin * rOuter;
      outerPts.push(new THREE.Vector3(ox, this.sampleHeight(ox, oz) + 0.035, oz));

      const ix = worldPoint.x + cos * rInner;
      const iz = worldPoint.z + sin * rInner;
      innerPts.push(new THREE.Vector3(ix, this.sampleHeight(ix, iz) + 0.035, iz));
    }

    const outerGeo = new THREE.BufferGeometry().setFromPoints(outerPts);
    const outerMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const outerLoop = new THREE.Line(outerGeo, outerMat);
    outerLoop.renderOrder = 995;
    outerLoop.raycast = () => {};
    this.sculptCursorGroup.add(outerLoop);

    const innerGeo = new THREE.BufferGeometry().setFromPoints(innerPts);
    const innerMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.48,
      depthTest: false,
    });
    const innerLoop = new THREE.Line(innerGeo, innerMat);
    innerLoop.renderOrder = 995;
    innerLoop.raycast = () => {};
    this.sculptCursorGroup.add(innerLoop);
  }

  public rebuild(): void {
    this.clearGroupChildren(this.staticGroup);
    this.groundCollider = null;
    this.terrainGridLines = null;
    this.group.visible = this.settings.visible;

    const size = Math.max(10, this.settings.worldSize);
    const half = size * 0.5;
    const spacing = Math.max(0.05, this.getEffectiveSpacing());
    const subdivs = Math.max(1, Math.round(this.settings.subdivisions));
    const elev = this.settings.elevationY;
    const opacity = this.settings.opacity;

    if (this.settings.style === 'terrain') {
      this.buildTerrainGround(size, spacing, opacity);
    } else if (this.settings.style === 'tile') {
      this.buildTileGround(size, spacing, subdivs, elev, opacity);
    } else if (this.settings.style === 'blueprint') {
      this.buildBlueprintGround(size, spacing, subdivs, elev, opacity);
    } else {
      this.buildWireGround(size, spacing, subdivs, elev, opacity);
    }

    if (this.settings.showAxes) {
      this.buildOriginAxes(half);
    }

    if (this.settings.showRuler) {
      this.buildMeterRuler(half, spacing);
    }

    if (this.settings.showPlotBoundary) {
      this.buildPlotBoundary(
        Math.max(1, this.settings.plotWidth),
        Math.max(1, this.settings.plotDepth)
      );
    }

    if (this.settings.verticalGrid !== 'none') {
      this.buildVerticalReferenceGrid(spacing, elev, opacity);
    }
  }

  /**
   * Projects a live glowing footprint + W x D x H meter callout onto the grid
   * beneath the currently selected object(s)!
   */
  public updateSelectionFootprint(worldBox: THREE.Box3 | null): void {
    this.lastFootprintBox = worldBox ? worldBox.clone() : null;
    this.clearGroupChildren(this.footprintGroup);

    if (
      !worldBox ||
      worldBox.isEmpty() ||
      !this.settings.visible ||
      !this.settings.showSelectionFootprint
    ) {
      return;
    }

    const minX = worldBox.min.x;
    const maxX = worldBox.max.x;
    const minZ = worldBox.min.z;
    const maxZ = worldBox.max.z;
    const sizeX = Math.max(0.01, maxX - minX);
    const sizeY = Math.max(0.01, worldBox.max.y - worldBox.min.y);
    const sizeZ = Math.max(0.01, maxZ - minZ);
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const yFloor = this.sampleHeight(cx, cz) + 0.014;

    const padGeo = new THREE.PlaneGeometry(sizeX, sizeZ);
    padGeo.rotateX(-Math.PI / 2);
    const padMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(cx, yFloor - 0.004, cz);
    padMesh.raycast = () => {};
    this.footprintGroup.add(padMesh);

    const borderPts: number[] = [
      minX, yFloor, minZ, maxX, yFloor, minZ,
      maxX, yFloor, minZ, maxX, yFloor, maxZ,
      maxX, yFloor, maxZ, minX, yFloor, maxZ,
      minX, yFloor, maxZ, minX, yFloor, minZ,
    ];

    if (Math.abs(worldBox.min.y - yFloor) > 0.06) {
      const objY = worldBox.min.y;
      borderPts.push(
        minX, objY, minZ, minX, yFloor, minZ,
        maxX, objY, minZ, maxX, yFloor, minZ,
        maxX, objY, maxZ, maxX, yFloor, maxZ,
        minX, objY, maxZ, minX, yFloor, maxZ
      );
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderPts, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.92,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.raycast = () => {};
    this.footprintGroup.add(lines);

    const dimText = `${sizeX.toFixed(2)}m × ${sizeZ.toFixed(2)}m • H ${sizeY.toFixed(2)}m`;
    const badge = makeBadgeSprite(dimText, {
      bg: 'rgba(8, 25, 44, 0.9)',
      border: 'rgba(56, 189, 248, 0.75)',
      textColor: '#7dd3fc',
      scaleX: 1.55,
      scaleY: 0.36,
      fontSize: 23,
    });
    badge.position.set(cx, yFloor + 0.14, maxZ + 0.32);
    this.footprintGroup.add(badge);
  }

  private buildMeterRuler(half: number, spacing: number): void {
    const labelInterval =
      spacing <= 0.25 ? 0.5 : spacing <= 1 ? 1 : Math.max(2, Math.round(spacing));
    const maxRulerDist = Math.min(half - 0.5, 25);

    const originSprite = makeBadgeSprite('0m', {
      bg: 'rgba(15, 23, 42, 0.85)',
      border: 'rgba(248, 250, 252, 0.4)',
      textColor: '#f8fafc',
      scaleX: 0.48,
      scaleY: 0.24,
      fontSize: 28,
    });
    originSprite.position.set(0.24, this.sampleHeight(0, 0) + 0.06, 0.24);
    this.staticGroup.add(originSprite);

    for (let d = labelInterval; d <= maxRulerDist; d += labelInterval) {
      if (labelInterval >= 1 && d > 6 && d % 2 !== 0 && d % 5 !== 0) continue;
      if (labelInterval >= 1 && d > 12 && d % 5 !== 0) continue;
      if (labelInterval < 1 && d > 4 && Math.abs(d % 1) > 0.01) continue;

      const txt = Number.isInteger(d) ? `${d}m` : `${d.toFixed(1)}m`;

      const sxPos = makeBadgeSprite(txt, {
        bg: 'rgba(38, 14, 20, 0.82)',
        border: 'rgba(255, 59, 87, 0.5)',
        textColor: '#fda4af',
        scaleX: 0.54,
        scaleY: 0.24,
        fontSize: 27,
      });
      sxPos.position.set(d, this.sampleHeight(d, 0) + 0.05, 0.22);
      this.staticGroup.add(sxPos);

      const sxNeg = makeBadgeSprite(`-${txt}`, {
        bg: 'rgba(38, 14, 20, 0.68)',
        border: 'rgba(255, 59, 87, 0.32)',
        textColor: '#fecdd3',
        scaleX: 0.56,
        scaleY: 0.23,
        fontSize: 26,
      });
      sxNeg.position.set(-d, this.sampleHeight(-d, 0) + 0.05, 0.22);
      this.staticGroup.add(sxNeg);

      const szPos = makeBadgeSprite(txt, {
        bg: 'rgba(12, 24, 46, 0.82)',
        border: 'rgba(56, 152, 255, 0.5)',
        textColor: '#93c5fd',
        scaleX: 0.54,
        scaleY: 0.24,
        fontSize: 27,
      });
      szPos.position.set(0.24, this.sampleHeight(0, d) + 0.05, d);
      this.staticGroup.add(szPos);

      const szNeg = makeBadgeSprite(`-${txt}`, {
        bg: 'rgba(12, 24, 46, 0.68)',
        border: 'rgba(56, 152, 255, 0.32)',
        textColor: '#bfdbfe',
        scaleX: 0.56,
        scaleY: 0.23,
        fontSize: 26,
      });
      szNeg.position.set(0.24, this.sampleHeight(0, -d) + 0.05, -d);
      this.staticGroup.add(szNeg);
    }
  }

  private buildPlotBoundary(width: number, depth: number): void {
    const hw = width * 0.5;
    const hd = depth * 0.5;
    const segs = 28;
    const pts: number[] = [];

    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const x0 = -hw + width * t0;
      const x1 = -hw + width * t1;
      const z0 = -hd + depth * t0;
      const z1 = -hd + depth * t1;

      pts.push(
        x0, this.sampleHeight(x0, hd) + 0.02, hd,
        x1, this.sampleHeight(x1, hd) + 0.02, hd,
        x0, this.sampleHeight(x0, -hd) + 0.02, -hd,
        x1, this.sampleHeight(x1, -hd) + 0.02, -hd
      );
      pts.push(
        -hw, this.sampleHeight(-hw, z0) + 0.02, z0,
        -hw, this.sampleHeight(-hw, z1) + 0.02, z1,
        hw, this.sampleHeight(hw, z0) + 0.02, z0,
        hw, this.sampleHeight(hw, z1) + 0.02, z1
      );
    }

    const corners: Array<[number, number]> = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ];
    for (const [cx, cz] of corners) {
      const gy = this.sampleHeight(cx, cz);
      pts.push(cx, gy, cz, cx, gy + 0.45, cz);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.95,
    });
    const plotLines = new THREE.LineSegments(geo, mat);
    plotLines.raycast = () => {};
    this.staticGroup.add(plotLines);

    const area = Math.round(width * depth * 10) / 10;
    const plotLabel = makeBadgeSprite(
      `${width}m × ${depth}m (${area} m²)`,
      {
        bg: 'rgba(42, 28, 6, 0.9)',
        border: 'rgba(251, 191, 36, 0.8)',
        textColor: '#fde68a',
        scaleX: 1.55,
        scaleY: 0.36,
        fontSize: 24,
      }
    );
    plotLabel.position.set(0, this.sampleHeight(0, -hd) + 0.35, -hd);
    this.staticGroup.add(plotLabel);
  }

  private buildVerticalReferenceGrid(
    spacing: number,
    elev: number,
    opacity: number
  ): void {
    const spanW = this.settings.showPlotBoundary
      ? Math.max(4, this.settings.plotWidth)
      : 12;
    const spanD = this.settings.showPlotBoundary
      ? Math.max(4, this.settings.plotDepth)
      : 12;
    const maxH = 6;
    const hw = spanW * 0.5;
    const hd = spanD * 0.5;
    const backZ = -hd;
    const leftX = -hw;

    const pts: number[] = [];
    const step = Math.max(0.5, spacing);

    for (let y = 0; y <= maxH + 0.001; y += step) {
      pts.push(-hw, elev + y, backZ, hw, elev + y, backZ);
    }
    for (let x = -hw; x <= hw + 0.001; x += step) {
      pts.push(x, elev, backZ, x, elev + maxH, backZ);
    }

    if (this.settings.verticalGrid === 'corner') {
      for (let y = 0; y <= maxH + 0.001; y += step) {
        pts.push(leftX, elev + y, -hd, leftX, elev + y, hd);
      }
      for (let z = -hd; z <= hd + 0.001; z += step) {
        pts.push(leftX, elev, z, leftX, elev + maxH, z);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#4ade80',
      transparent: true,
      opacity: opacity * 0.32,
    });
    const vLines = new THREE.LineSegments(geo, mat);
    vLines.raycast = () => {};
    this.staticGroup.add(vLines);

    for (const h of [1, 2, 3, 4, 6]) {
      const hSprite = makeBadgeSprite(`Y ${h}m`, {
        bg: 'rgba(10, 36, 22, 0.85)',
        border: 'rgba(74, 222, 128, 0.55)',
        textColor: '#86efac',
        scaleX: 0.62,
        scaleY: 0.25,
        fontSize: 25,
      });
      hSprite.position.set(-hw - 0.38, elev + h, backZ);
      this.staticGroup.add(hSprite);
    }
  }

  private buildWireGround(
    size: number,
    spacing: number,
    subdivs: number,
    elev: number,
    opacity: number
  ): void {
    const planeGeo = new THREE.PlaneGeometry(size, size);
    planeGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.28,
      color: '#05070a',
    });
    const plane = new THREE.Mesh(planeGeo, shadowMat);
    plane.position.y = elev - 0.002;
    plane.receiveShadow = true;
    plane.name = '__groundSurface';
    this.groundCollider = plane;
    this.staticGroup.add(plane);

    const { zoneLines, majorLines, minorLines } = this.createFlatGridLines(
      size,
      spacing,
      subdivs,
      elev,
      '#64748b',
      '#394357',
      '#232936',
      opacity
    );
    if (minorLines) this.staticGroup.add(minorLines);
    this.staticGroup.add(majorLines);
    if (zoneLines) this.staticGroup.add(zoneLines);
  }

  private buildTileGround(
    size: number,
    spacing: number,
    subdivs: number,
    elev: number,
    opacity: number
  ): void {
    const tex = this.createCheckerTileTexture(subdivs);
    const repeats = size / (spacing * 2);
    tex.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(size, size);
    planeGeo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.88,
      metalness: 0.04,
      transparent: opacity < 0.99,
      opacity,
    });
    const plane = new THREE.Mesh(planeGeo, mat);
    plane.position.y = elev - 0.002;
    plane.receiveShadow = true;
    plane.name = '__groundSurface';
    this.groundCollider = plane;
    this.staticGroup.add(plane);
  }

  private buildBlueprintGround(
    size: number,
    spacing: number,
    subdivs: number,
    elev: number,
    opacity: number
  ): void {
    const planeGeo = new THREE.PlaneGeometry(size, size);
    planeGeo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: '#0e2238',
      roughness: 0.9,
      metalness: 0.05,
      transparent: opacity < 0.99,
      opacity: Math.min(1, opacity * 0.95),
    });
    const plane = new THREE.Mesh(planeGeo, mat);
    plane.position.y = elev - 0.003;
    plane.receiveShadow = true;
    plane.name = '__groundSurface';
    this.groundCollider = plane;
    this.staticGroup.add(plane);

    const { zoneLines, majorLines, minorLines } = this.createFlatGridLines(
      size,
      spacing,
      subdivs,
      elev,
      '#7dd3fc',
      '#38bdf8',
      '#1d4f7a',
      opacity
    );
    if (minorLines) this.staticGroup.add(minorLines);
    this.staticGroup.add(majorLines);
    if (zoneLines) this.staticGroup.add(zoneLines);
  }

  private buildTerrainGround(
    size: number,
    spacing: number,
    opacity: number
  ): void {
    const segs = SCULPT_GRID_RES - 1;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
    });

    const terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.receiveShadow = true;
    terrainMesh.name = '__groundSurface';
    this.groundCollider = terrainMesh;
    this.staticGroup.add(terrainMesh);

    const half = size * 0.5;
    const lineSpacing = Math.max(0.5, spacing);
    const maxIdx = Math.min(48, Math.floor(half / lineSpacing));
    const sampleStep = Math.max(0.4, size / 72);
    const linePts: number[] = [];

    for (let k = -maxIdx; k <= maxIdx; k++) {
      const coord = k * lineSpacing;
      for (let x = -half; x < half; x += sampleStep) {
        const xNext = Math.min(half, x + sampleStep);
        linePts.push(
          x,
          this.sampleHeight(x, coord) + 0.01,
          coord,
          xNext,
          this.sampleHeight(xNext, coord) + 0.01,
          coord
        );
      }
      for (let z = -half; z < half; z += sampleStep) {
        const zNext = Math.min(half, z + sampleStep);
        linePts.push(
          coord,
          this.sampleHeight(coord, z) + 0.01,
          z,
          coord,
          this.sampleHeight(coord, zNext) + 0.01,
          zNext
        );
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: '#86efac',
      transparent: true,
      opacity: opacity * 0.34,
    });
    const tLines = new THREE.LineSegments(lineGeo, lineMat);
    tLines.raycast = () => {};
    this.terrainGridLines = tLines;
    this.staticGroup.add(tLines);

    // Populate vertex heights & slope/biome colors
    this.updateTerrainVerticesFast();
  }

  private createFlatGridLines(
    size: number,
    spacing: number,
    subdivs: number,
    elev: number,
    zoneHex: string,
    majorHex: string,
    minorHex: string,
    opacity: number
  ): {
    zoneLines: THREE.LineSegments | null;
    majorLines: THREE.LineSegments;
    minorLines: THREE.LineSegments | null;
  } {
    const half = size * 0.5;
    const zonePts: number[] = [];
    const majorPts: number[] = [];
    const minorPts: number[] = [];

    const minorStep = Math.max(0.025, spacing / subdivs);
    const totalMinorSteps = Math.min(420, Math.floor(half / minorStep));
    const zoneEveryMajor = 5;

    for (let i = -totalMinorSteps; i <= totalMinorSteps; i++) {
      const c = i * minorStep;
      const isMajor = i % subdivs === 0;
      const majorIndex = isMajor ? Math.round(i / subdivs) : 0;
      const isZone = isMajor && majorIndex !== 0 && majorIndex % zoneEveryMajor === 0;

      const target = isZone ? zonePts : isMajor ? majorPts : minorPts;
      const y = isZone ? elev + 0.0008 : isMajor ? elev : elev - 0.0008;

      target.push(-half, y, c, half, y, c);
      target.push(c, y, -half, c, y, half);
    }

    const majorGeo = new THREE.BufferGeometry();
    majorGeo.setAttribute('position', new THREE.Float32BufferAttribute(majorPts, 3));
    const majorMat = new THREE.LineBasicMaterial({
      color: majorHex,
      transparent: true,
      opacity: Math.min(1, opacity * 0.88),
    });
    const majorLines = new THREE.LineSegments(majorGeo, majorMat);
    majorLines.raycast = () => {};

    let zoneLines: THREE.LineSegments | null = null;
    if (zonePts.length > 0) {
      const zoneGeo = new THREE.BufferGeometry();
      zoneGeo.setAttribute('position', new THREE.Float32BufferAttribute(zonePts, 3));
      const zoneMat = new THREE.LineBasicMaterial({
        color: zoneHex,
        transparent: true,
        opacity: Math.min(1, opacity),
      });
      zoneLines = new THREE.LineSegments(zoneGeo, zoneMat);
      zoneLines.raycast = () => {};
    }

    let minorLines: THREE.LineSegments | null = null;
    if (minorPts.length > 0) {
      const minorGeo = new THREE.BufferGeometry();
      minorGeo.setAttribute('position', new THREE.Float32BufferAttribute(minorPts, 3));
      const minorMat = new THREE.LineBasicMaterial({
        color: minorHex,
        transparent: true,
        opacity: Math.min(1, opacity * 0.52),
      });
      minorLines = new THREE.LineSegments(minorGeo, minorMat);
      minorLines.raycast = () => {};
    }

    return { zoneLines, majorLines, minorLines };
  }

  private buildOriginAxes(half: number): void {
    const segStep = this.settings.style === 'terrain' ? 0.35 : half * 2;

    const xPts: THREE.Vector3[] = [];
    for (let x = -half; x <= half + 0.001; x += segStep) {
      const clampedX = Math.min(half, x);
      xPts.push(
        new THREE.Vector3(clampedX, this.sampleHeight(clampedX, 0) + 0.012, 0)
      );
    }
    const xGeo = new THREE.BufferGeometry().setFromPoints(xPts);
    const xMat = new THREE.LineBasicMaterial({
      color: '#ff3b57',
      transparent: true,
      opacity: 0.92,
    });
    const xLine = new THREE.Line(xGeo, xMat);
    xLine.raycast = () => {};
    this.staticGroup.add(xLine);

    const zPts: THREE.Vector3[] = [];
    for (let z = -half; z <= half + 0.001; z += segStep) {
      const clampedZ = Math.min(half, z);
      zPts.push(
        new THREE.Vector3(0, this.sampleHeight(0, clampedZ) + 0.012, clampedZ)
      );
    }
    const zGeo = new THREE.BufferGeometry().setFromPoints(zPts);
    const zMat = new THREE.LineBasicMaterial({
      color: '#3898ff',
      transparent: true,
      opacity: 0.92,
    });
    const zLine = new THREE.Line(zGeo, zMat);
    zLine.raycast = () => {};
    this.staticGroup.add(zLine);
  }

  private createCheckerTileTexture(subdivs: number): THREE.CanvasTexture {
    if (this.tileTexture) {
      this.tileTexture.dispose();
    }
    const res = 256;
    const half = res / 2;
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1c212c';
    ctx.fillRect(0, 0, res, res);
    ctx.fillStyle = '#242b38';
    ctx.fillRect(0, 0, half, half);
    ctx.fillRect(half, half, half, half);

    if (subdivs > 1 && subdivs <= 10) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = 1;
      const stepPx = half / subdivs;
      ctx.beginPath();
      for (let i = 1; i < subdivs * 2; i++) {
        const p = i * stepPx;
        ctx.moveTo(p, 0);
        ctx.lineTo(p, res);
        ctx.moveTo(0, p);
        ctx.lineTo(res, p);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(res, 0);
    ctx.moveTo(0, half);
    ctx.lineTo(res, half);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, res);
    ctx.moveTo(half, 0);
    ctx.lineTo(half, res);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    this.tileTexture = tex;
    return tex;
  }

  private clearGroupChildren(target: THREE.Group): void {
    while (target.children.length > 0) {
      const child = target.children[0];
      target.remove(child);
      const m = child as THREE.Mesh | THREE.LineSegments | THREE.Line | THREE.Sprite;
      if ('geometry' in m && m.geometry) {
        m.geometry.dispose();
      }
      if ('material' in m && m.material) {
        const disposeMat = (mat: THREE.Material) => {
          const sp = mat as THREE.SpriteMaterial;
          if (sp.map) sp.map.dispose();
          mat.dispose();
        };
        if (Array.isArray(m.material)) {
          m.material.forEach(disposeMat);
        } else {
          disposeMat(m.material);
        }
      }
    }
  }

  public dispose(): void {
    this.groundCollider = null;
    this.terrainGridLines = null;
    this.clearGroupChildren(this.staticGroup);
    this.clearGroupChildren(this.footprintGroup);
    this.clearGroupChildren(this.sculptCursorGroup);
    if (this.tileTexture) {
      this.tileTexture.dispose();
      this.tileTexture = null;
    }
  }
}
