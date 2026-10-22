import * as THREE from 'three';
import { DEFAULT_GRID_SETTINGS, GridSettings } from '../types/studio';

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
    ctx.roundRect(pad, pad, w, h, r);
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
  private settings: GridSettings = { ...DEFAULT_GRID_SETTINGS };
  private groundCollider: THREE.Mesh | null = null;
  private tileTexture: THREE.CanvasTexture | null = null;
  private lastFootprintBox: THREE.Box3 | null = null;

  constructor() {
    this.group.name = '__worldGridTerrainSystem';
    this.staticGroup.name = '__gridStaticLayer';
    this.footprintGroup.name = '__gridSelectionFootprint';
    this.group.add(this.staticGroup);
    this.group.add(this.footprintGroup);
    this.rebuild();
  }

  public getSettings(): GridSettings {
    return { ...this.settings };
  }

  public updateSettings(patch: Partial<GridSettings>): GridSettings {
    this.settings = {
      ...DEFAULT_GRID_SETTINGS,
      ...this.settings,
      ...patch,
    };
    this.rebuild();
    this.updateSelectionFootprint(this.lastFootprintBox);
    return { ...this.settings };
  }

  public getGroundCollider(): THREE.Mesh | null {
    return this.groundCollider;
  }

  /**
   * Computes exact ground/terrain height Y at world (x, z)
   */
  public sampleHeight(x: number, z: number): number {
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

    // 'terraced' stepped contours
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
   * Computes exact unit upward surface normal of the ground/terrain at world (x, z)
   */
  public sampleNormal(x: number, z: number): THREE.Vector3 {
    if (this.settings.style !== 'terrain' || this.settings.terrainPreset === 'flat') {
      return new THREE.Vector3(0, 1, 0);
    }
    const e = 0.05;
    const hL = this.sampleHeight(x - e, z);
    const hR = this.sampleHeight(x + e, z);
    const hD = this.sampleHeight(x, z - e);
    const hU = this.sampleHeight(x, z + e);
    return new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
  }

  public rebuild(): void {
    this.clearGroupChildren(this.staticGroup);
    this.groundCollider = null;
    this.group.visible = this.settings.visible;

    const size = Math.max(10, this.settings.worldSize);
    const half = size * 0.5;
    const spacing = Math.max(0.1, this.settings.spacing);
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
   * beneath the currently selected object!
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

    // 1. Soft translucent footprint pad
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

    // 2. Crisp footprint border + vertical drop lines from object bottom corners
    const borderPts: number[] = [
      minX, yFloor, minZ, maxX, yFloor, minZ,
      maxX, yFloor, minZ, maxX, yFloor, maxZ,
      maxX, yFloor, maxZ, minX, yFloor, maxZ,
      minX, yFloor, maxZ, minX, yFloor, minZ,
    ];

    // If object is floating above floor, draw subtle vertical plumb lines down to footprint!
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

    // 3. Live Dimension Badge right in front of the footprint
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
      spacing < 0.5 ? 1 : spacing <= 1 ? 1 : Math.max(2, Math.round(spacing));
    const maxRulerDist = Math.min(half - 0.5, 20);

    // Origin 0,0 badge
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
      // Skip cluttering intermediate ticks beyond 8m (keep every 2m or 5m further out)
      if (d > 6 && d % 2 !== 0 && d % 5 !== 0) continue;
      if (d > 12 && d % 5 !== 0) continue;

      // +X ruler
      const sxPos = makeBadgeSprite(`${d}m`, {
        bg: 'rgba(38, 14, 20, 0.82)',
        border: 'rgba(255, 59, 87, 0.5)',
        textColor: '#fda4af',
        scaleX: 0.54,
        scaleY: 0.24,
        fontSize: 27,
      });
      sxPos.position.set(d, this.sampleHeight(d, 0) + 0.05, 0.22);
      this.staticGroup.add(sxPos);

      // -X ruler
      const sxNeg = makeBadgeSprite(`-${d}m`, {
        bg: 'rgba(38, 14, 20, 0.68)',
        border: 'rgba(255, 59, 87, 0.32)',
        textColor: '#fecdd3',
        scaleX: 0.56,
        scaleY: 0.23,
        fontSize: 26,
      });
      sxNeg.position.set(-d, this.sampleHeight(-d, 0) + 0.05, 0.22);
      this.staticGroup.add(sxNeg);

      // +Z ruler
      const szPos = makeBadgeSprite(`${d}m`, {
        bg: 'rgba(12, 24, 46, 0.82)',
        border: 'rgba(56, 152, 255, 0.5)',
        textColor: '#93c5fd',
        scaleX: 0.54,
        scaleY: 0.24,
        fontSize: 27,
      });
      szPos.position.set(0.24, this.sampleHeight(0, d) + 0.05, d);
      this.staticGroup.add(szPos);

      // -Z ruler
      const szNeg = makeBadgeSprite(`-${d}m`, {
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
    const segs = 24;
    const pts: number[] = [];

    // Sample along all 4 plot edges so it even drapes cleanly on terrain!
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const x0 = -hw + width * t0;
      const x1 = -hw + width * t1;
      const z0 = -hd + depth * t0;
      const z1 = -hd + depth * t1;

      // Front & Back edges
      pts.push(
        x0, this.sampleHeight(x0, hd) + 0.02, hd,
        x1, this.sampleHeight(x1, hd) + 0.02, hd,
        x0, this.sampleHeight(x0, -hd) + 0.02, -hd,
        x1, this.sampleHeight(x1, -hd) + 0.02, -hd
      );
      // Left & Right edges
      pts.push(
        -hw, this.sampleHeight(-hw, z0) + 0.02, z0,
        -hw, this.sampleHeight(-hw, z1) + 0.02, z1,
        hw, this.sampleHeight(hw, z0) + 0.02, z0,
        hw, this.sampleHeight(hw, z1) + 0.02, z1
      );
    }

    // Corner vertical posts (0.45m tall architectural plot stakes!)
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

    // Back wall XY grid (at Z = -hd)
    for (let y = 0; y <= maxH + 0.001; y += step) {
      pts.push(-hw, elev + y, backZ, hw, elev + y, backZ);
    }
    for (let x = -hw; x <= hw + 0.001; x += step) {
      pts.push(x, elev, backZ, x, elev + maxH, backZ);
    }

    // Optional Side wall ZY grid (for 'corner' studio box mode)
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

    // Height meter badges (1m, 2m, 3m, 4m, 6m) along vertical edge
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
    const segs = Math.min(128, Math.max(64, Math.round(size * 2)));
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const lowCol = new THREE.Color('#23312d');
    const midCol = new THREE.Color('#33443c');
    const highCol = new THREE.Color('#525c65');
    const tmpCol = new THREE.Color();

    const amp = Math.max(0.4, this.settings.terrainAmplitude);
    const elev = this.settings.elevationY;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.sampleHeight(x, z);
      pos.setY(i, y);

      const rel = Math.max(0, Math.min(1, (y - elev + amp) / (amp * 2)));
      if (rel < 0.5) {
        tmpCol.copy(lowCol).lerp(midCol, rel * 2);
      } else {
        tmpCol.copy(midCol).lerp(highCol, (rel - 0.5) * 2);
      }
      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

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
    const maxIdx = Math.floor(half / spacing);
    const sampleStep = Math.max(0.25, size / 110);
    const linePts: number[] = [];

    for (let k = -maxIdx; k <= maxIdx; k++) {
      const coord = k * spacing;
      for (let x = -half; x < half; x += sampleStep) {
        const xNext = Math.min(half, x + sampleStep);
        linePts.push(
          x,
          this.sampleHeight(x, coord) + 0.008,
          coord,
          xNext,
          this.sampleHeight(xNext, coord) + 0.008,
          coord
        );
      }
      for (let z = -half; z < half; z += sampleStep) {
        const zNext = Math.min(half, z + sampleStep);
        linePts.push(
          coord,
          this.sampleHeight(coord, z) + 0.008,
          z,
          coord,
          this.sampleHeight(coord, zNext) + 0.008,
          zNext
        );
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: '#86efac',
      transparent: true,
      opacity: opacity * 0.36,
    });
    this.staticGroup.add(new THREE.LineSegments(lineGeo, lineMat));
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

    const minorStep = spacing / subdivs;
    const totalMinorSteps = Math.min(400, Math.floor(half / minorStep));
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
    this.clearGroupChildren(this.staticGroup);
    this.clearGroupChildren(this.footprintGroup);
    if (this.tileTexture) {
      this.tileTexture.dispose();
      this.tileTexture = null;
    }
  }
}
